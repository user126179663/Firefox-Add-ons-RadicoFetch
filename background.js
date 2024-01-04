// 現在は視聴開始後のリクエストを傍聴してプレイリストを要求しているが、
// ページを読み込んだ段階で行なわれる auth1 への応答ヘッダーに含まれる x-radiko-authtoken を使えば恐らく任意のタイミングでプレイリストを要求できる。

class Background extends WXLogger {
	
	static {
		
		this[WXLogger.$namePrefix] = '@',
		this[WXLogger.$nameSuffix] = '',
		this[WXLogger.$name] = 'BG';
		
	}
	
	static interactedPageAction(event) {
		
		this.log(event),
		
		browser.tabs.sendMessage(event.id, { type: 'identify', tabId: event.id });
		
	}
	
	static messageFromContent(message, sender, sendResponse) {
		
		const { pageAction, tabs } = browser, { log, rss } = this;
		
		log(message, sender);
		
		switch (typeof message) {
			
			case 'boolean':
			message || (rss[sender.tab.id]?.abort(), delete rss[sender.tab.id]);
			break;
			
			case 'string':
			const tabId = sender.tab.id;
			//todo Radikoのauth2が取得できないなど、例外に遭遇した場合の停止処理やタイムアウト処理
			(rss[tabId] = new RadicoSession(tabId)).session.
				then(session => tabs.sendMessage(tabId, { session, tabId, type: 'received', uid: message }).
					then(() => pageAction.show(tabId)));
			break;
			
			case 'object':
			if (message) {
				
				switch (message.type) {
					
					case 'identified':
					log(message), new RadicoFetch().request(message.session);
					break;
					
				}
				
			}
			break;
			
		}
		
	}
	
	constructor() {
		
		super();
		
		const { pageAction, runtime } = browser, { interactedPageAction, messageFromContent } = Background;
		
		this.rss = {},
		
		pageAction.onClicked.addListener(this.interactedPageAction = interactedPageAction.bind(this)),
		runtime.onMessage.addListener(this.messageFromContent = messageFromContent.bind(this)),
		
		this.log(Date.now());
		
	}
	
}

new Background();