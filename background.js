class Background extends WXLogger {
	
	static {
		
		this.icon = {
			downloadable: null,
			requesting: 'resources/23F3.svg'
		},
		
		this[Logger.$name] = 'BG',
		this[Logger.$namePrefix] = '@',
		this[Logger.$nameSuffix] = '';
		
	}
	
	static bound = {
		
		interactedPageAction(event) {
			
			const { log, requesting } = this, { id: tabId } = event;
			
			tabId in requesting ||
				(log('"Interacted page action."', event), browser.tabs.sendMessage(tabId, { type: 'identify', tabId }));
			
		},
		
		messageFromContent(message, sender, sendResponse) {
			
			const { connection, log, radicoSession } = this, { tab: { id: tabId } } = sender;
			
			log('"Received a message."', message, sender);
			
			connection[typeof message]?.(message, tabId, sender, sendResponse, radicoSession, log);
			
		}
		
	};
	
	static connection = {
		
		// ダウンロードなどの中止の受け付け。message が false だと進行中のダウンロードを中止するが、後続のダウンロードを始めるなどその後の処理が未実装。
		boolean(message, tabId, sender, sendResponse, radicoSession, log) {
			
			message || (radicoSession[tabId]?.abort(), delete radicoSession[tabId]);
			
		},
		
		// タブやセッションの情報を交換し終えたあとのタブとの個別の通信。
		object(message, tabId, sender, sendResponse, radicoSession, log) {
			
			message && this.messenger[message.type]?.(message, tabId, sender, sendResponse, radicoSession, log);
			
		},
		
		// todo: 各種例外処理が未実装。
		// content_page からの通信のオファー。オファーとともに送られてくるタブの情報に基づき background がウェブサイトとの通信を試行する。
		// 通信が成功した場合、得られたセッション情報やタブの ID を content_page に送ってそこに保存される。
		// これによって background が時間経過で停止しても、pageAction を通じて content_page からセッション情報を取得できる。
		string(message, tabId, sender, sendResponse, radicoSession, log) {
			
			const { pageAction, tabs } = browser;
			
			(radicoSession[tabId] = radicoSession[tabId] ??= new RadicoSession(tabId)).session.
				then(session => tabs.sendMessage(tabId, { session, tabId, type: 'received', uid: message }).
					then(() => pageAction.show(tabId)));
			
		}
		
	};
	
	static messenger = {
		
		identified(message, tabId, sender, sendResponse, radicoSession, log) {
			
			const	{ pageAction } = browser,
					{ icon: { downloadable, requesting } } = Background,
					{ requesting: req } = this,
					iconDetails = { tabId },
					finalize = result =>	{
													
													iconDetails.path = downloadable,
													pageAction.setIcon(iconDetails),
													delete req[tabId],
													
													log('"Finished downloading."', result ?? '✅', message.session);
													
												};
			
			req[tabId] = true,
			iconDetails.path = requesting,
			pageAction.setIcon(iconDetails),
			
			new RadicoFetch().request(message.session).finally(finalize),
			
			log('"Tried a request."', message);
			
		}
		
	};
	
	constructor() {
		
		super();
		
		const { assign } = Object, { pageAction, runtime } = browser, { bound, connection, messenger } = Background;
		
		this.radicoSession = {},
		this.requesting = {},
		
		assign(this, this.getBound(bound)),
		assign(this.connection = {}, this.getBound(connection)),
		assign(this.messenger = {}, this.getBound(messenger)),
		
		pageAction.onClicked.addListener(this.interactedPageAction),
		runtime.onMessage.addListener(this.messageFromContent),
		
		this.log(new Date().toString());
		
	}
	
}

const
background = new Background(),
tabUpdated = (tabId, event) => {
	
	background.log(`"Updated a tab: ${tabId}."`, event),
	browser.tabs.sendMessage(tabId, { type: 'updated', tabId });
	
};

browser.tabs.onUpdated.addListener(tabUpdated, { urls: [ '*://radiko.jp/*' ], properties: [ 'url' ] });