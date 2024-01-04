(() => {

class Content extends WXLogger {
	
	static {
		
		this.pathRx = /\/#!\/ts\/(.*?)\/(\d{14})(?:$|\/|\?)/,
		
		this[WXLogger.$namePrefix] = '@',
		this[WXLogger.$name] = 'Page',
		this[WXLogger.$nameSuffix] = '';
		
	}
	
	static onMessage(message, sender, sendResponse) {
		
		const { log } = this;
		
		log("Received a message.", message, sender);
		
		if (message && typeof message === 'object') {
			
			const { ft, stationId } = this;
			
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
				
				log("Making inquire a tabId.", session),
				
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
		
		const pathParts = Content.pathRx.exec(url);
		
		if (pathParts) {
			
			const { runtime } = browser, { onMessage, hidPage } = Content;
			
			this.stationId = pathParts[1],
			this.ft = pathParts[2],
			
			addEventListener('pagehide', this.hidPage = hidPage.bind(this)),
			runtime.onMessage.addListener(this.onMessage = onMessage.bind(this)),
			
			runtime.sendMessage(this.uid = crypto.randomUUID());
			
		}
		
	}
	
}

new Content();

})();