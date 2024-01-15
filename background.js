class Background extends Basement {
	
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
			
			if (tabId in requesting) {
				
				const { storedFetch } = this;
				let k;
				
				for (k in storedFetch)
					storedFetch[k].abort(), log(`"Aborted fetching in a tab#${k}"`), delete storedFetch[k];
				
				this.setActionIcon(undefined, tabId);
				
			} else {
				
				log('"Interacted page action."', event),
				
				browser.tabs.sendMessage(tabId, { type: 'identify', tabId });
				
			}
			
		},
		
		messageFromContent(message, sender, sendResponse) {
			
			const { connection, log, storedFetch, storedSession } = this, { tab: { id: tabId } } = sender;
			
			log('"Received a message."', message, sender);
			
			Background.connection[typeof message]?.
				call?.(this, message, tabId, sender, sendResponse, storedFetch, storedSession, log);
			
		}
		
	};
	
	static connection = {
		
		// ダウンロードなどの中止の受け付け。message が false だと進行中のダウンロードを中止するが、後続のダウンロードを始めるなどその後の処理が未実装。
		boolean(message, tabId, sender, sendResponse, storedFetch, storedSession, log) {
			
			message || (storedSession[tabId]?.abort?.(), storedSession[tabId]?.abort?.(), delete storedSession[tabId]);
			
		},
		
		// タブやセッションの情報を交換し終えたあとのタブとの個別の通信。
		object(message, tabId, sender, sendResponse, storedFetch, storedSession, log) {
			
			message && Background.messenger[message.type]?.apply?.(this, arguments);
			
		},
		
		// content_page からの通信のオファー。オファーとともに送られてくるタブの情報に基づき background がウェブサイトとの通信を試行する。
		// 通信が成功した場合、得られたセッション情報やタブの ID を content_page に送ってそこに保存される。
		// これによって background が時間経過で停止しても、pageAction を通じて content_page からセッション情報を取得できる。
		string(message, tabId, sender, sendResponse, storedFetch, storedSession, log) {
			
			const { tabs } = browser;
			
			(storedSession[tabId] ??= new RadicoSession()).session.
				then(session => tabs.sendMessage(tabId, { session, tabId, type: 'authenticated', uid: message }).
					then(() => tabs.sendMessage(tabId, { type: 'detect' })));
			
		}
		
	};
	
	static messenger = {
		
		activate(message, tabId, sender, sendResponse, storedFetch, storedSession, log) {
			
			this.showActionIcon(tabId),
			
			log(`"Showed a location bar button for a tab#${tabId}."`);
			
		},
		
		deactivate(message, tabId, sender, sendResponse, storedFetch, storedSession, log) {
			
			this.hideAction(tabId),
			
			log(`"Hid a location bar button for a tab#${tabId}."`);
			
		},
		
		async identified(message, tabId, sender, sendResponse, storedFetch, storedSession, log) {
			
			const	{ icon: { downloadable, requesting } } = Background,
					{ requesting: req } = this,
					finalize = result =>	{
													
													this.setActionIcon(downloadable, tabId),
													this.setActionTitle('ダウンロードする', tabId),
													
													delete req[tabId],
													
													this.groupCollapsed('"✅ Finished downloading."'),
													log(message),
													this.groupEnd(),
													
													browser.tabs.sendMessage(tabId, { type: 'downloaded' });
													
												},
					table = new RadicoDailyTableFetch(message.session);
			
			req[tabId] = true,
			this.setActionIcon(requesting, tabId),
			this.setActionTitle('ダウンロード準備中...', tabId),
			
			await table.update(),
			
			log('"Attempting to request."', message),
			
			table.request(message.session.ft).finally(finalize);
			
		}
		
	};
	
	constructor() {
		
		super();
		
		const { assign } = Object, { pageAction, runtime } = browser;
		
		this.storedSession = {},
		this.storedFetch = {},
		this.requesting = {},
		
		assign(this, this.getBound(Background.bound)),
		
		pageAction.onClicked.addListener(this.interactedPageAction),
		runtime.onMessage.addListener(this.messageFromContent),
		
		this.log(new Date().toString());
		
	}
	
}

const
background = new Background(),
tabUpdated = (tabId, event) => {
	
	background.log(`"Updated a tab#${tabId}."`, event),
	
	browser.tabs.sendMessage(tabId, { type: 'updated', tabId });
	
};

browser.tabs.onUpdated.addListener(tabUpdated, { urls: [ '*://radiko.jp/*' ], properties: [ 'url' ] });