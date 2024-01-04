browser.tabs.onUpdated.addListener(
	(tabId, event)=> {
		hi(tabId, event);
		browser.tabs.sendMessage(tabId, { type: 'updated', tabId });
	},
	{ urls: [ '*://radiko.jp/*' ], properties: [ 'url' ] }
);

class Background extends WXLogger {
	
	static {
		
		this.icon = {
			downloadable: null,
			requesting: 'resources/23F3.svg'
		},
		
		this[WXLogger.$namePrefix] = '@',
		this[WXLogger.$nameSuffix] = '',
		this[WXLogger.$name] = 'BG';
		
	}
	
	static interactedPageAction(event) {
		
		const { log, requesting } = this, { id: tabId } = event;
		
		tabId in requesting ||
			(log('"Interacted page action."', event), browser.tabs.sendMessage(tabId, { type: 'identify', tabId }));
		
	}
	
	static messageFromContent(message, sender, sendResponse) {
		
		const { pageAction, tabs } = browser, { log, radicoSession } = this, { tab: { id: tabId } } = sender;
		
		log('"Received a message."', message, sender);
		
		switch (typeof message) {
			
			case 'boolean':
			message || (radicoSession[tabId]?.abort(), delete radicoSession[tabId]);
			break;
			
			case 'string':
			//todo ダウンロード中にページ遷移をしたり、Radikoのauth2が取得できないなど、例外に遭遇した場合の停止処理やタイムアウト処理
			(radicoSession[tabId] = radicoSession[tabId] ??= new RadicoSession(tabId)).session.
				then(session => tabs.sendMessage(tabId, { session, tabId, type: 'received', uid: message }).
					then(() => pageAction.show(tabId)));
			break;
			
			case 'object':
			if (message) {
				
				switch (message.type) {
					
					case 'identified':
					const	{ icon: { downloadable, requesting } } = Background,
							{ log, requesting: req } = this,
							iconDetails = { tabId: tabId };
					
					req[tabId] = true,
					iconDetails.path = requesting,
					pageAction.setIcon(iconDetails),
					
					new RadicoFetch().request(message.session).
						finally(result => (log(result), iconDetails.path = downloadable, pageAction.setIcon(iconDetails), delete req[tabId])),
					
					log('"Tried a request."', message);
					
					break;
					
				}
				
			}
			break;
			
		}
		
	}
	
	constructor() {
		
		super();
		
		const { pageAction, runtime } = browser, { interactedPageAction, messageFromContent } = Background;
		
		this.radicoSession = {},
		this.requesting = {},
		
		pageAction.onClicked.addListener(this.interactedPageAction = interactedPageAction.bind(this)),
		runtime.onMessage.addListener(this.messageFromContent = messageFromContent.bind(this)),
		
		this.log(new Date().toString());
		
	}
	
}

new Background();