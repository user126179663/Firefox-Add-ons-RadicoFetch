(() => {

class Content extends WXLogger {
	
	static {
		
		this.pathRx = /\/#!\/ts\/(.*?)\/(\d{14})(?:$|\/|\?)/,
		
		this[WXLogger.$namePrefix] = '@',
		this[WXLogger.$name] = 'Page',
		this[WXLogger.$nameSuffix] = '';
		
	}
	
	static onMessage(message, sender, sendResponse) {
		
		this.log(message, sender);
		
		if (message && typeof message === 'object') {
			
			const { ft, log, stationId } = this;
			
			switch (message.type) {
				
				case 'received':
				if (message.uid === this.uid) {
					
					const { session } = message;
					
					(this.session = session).stationId = stationId,
					session.tabId = message.tabId,
					session.ft = ft,
					session.cookie = document.cookie,
					sendResponse();
					
				}
				return true;
				
				case 'identify':
				
				const { session } = this;
				
				log(session),
				
				message.tabId === session?.tabId && browser.runtime.sendMessage({ session, type: 'identified' });
				
				break;
				
			}
			
		}
		
	}
	
	static hidPage() {
		
		browser.runtime.sendMessage(false);
		
	}
	
	constructor(url = location.href) {
		
		super();
		
		const { pathRx } = Content, path = pathRx.exec(url);
		
		if (path) {
			
			const { runtime } = browser, { onMessage, hidPage } = Content;
			
			this.stationId = path[1],
			this.ft = path[2],
			
			addEventListener('pagehide', this.hidPage = hidPage.bind(this)),
			runtime.onMessage.addListener(this.onMessage = onMessage.bind(this)),
			
			runtime.sendMessage(this.uid = Date.now() + '-' + Math.random());
			
		}
		
	}
	
}

new Content();

})();