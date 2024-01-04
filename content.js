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
		
		log('"Received a message."', message, sender);
		
		if (message && typeof message === 'object') {
			
			const { ft, stationId } = this;
			
			switch (message.type) {
				
				case 'identify':
				
				const { session } = this;
				
				log('"Making inquire a tabId."', session),
				
				message.tabId === session?.tabId && browser.runtime.sendMessage({ session, type: 'identified' });
				
				break;
				
				case 'received':
				if (message.uid === this.uid) {
					
					const { session } = message;
					
					(this.session = session).stationId = stationId,
					session.tabId = message.tabId,
					session.ft = ft,
					session.cookie = document.cookie,
					
					log('"Responsed a session data."', session),
					
					sendResponse();
					
				}
				return true;
				
				case 'updated':
				message.tabId === this.session?.tabId && this.exec();
				break;
				
			}
			
		}
		
	}
	
	static hidPage() {
		
		this.log('"The tab was hidden."'),
		
		browser.runtime.sendMessage(false);
		
	}
	
	constructor(url) {
		
		super();
		
		if (this.match(url)) {
			
			const { onMessage, hidPage } = Content;
			
			addEventListener('pagehide', this.hidPage = hidPage.bind(this)),
			browser.runtime.onMessage.addListener(this.onMessage = onMessage.bind(this));
			
		}
		
	}
	
	match(url = location.href) {
		
		return Content.pathRx.exec(url);
		
	}
	
	exec(url) {
		
		const pathParts = this.match(url);
		
		//this.log(location.href);
		
		if (pathParts) {
			
			this.stationId = pathParts[1],
			this.ft = pathParts[2],
			
			browser.runtime.sendMessage(this.uid ??= crypto.randomUUID()),
			
			this.log('"Detected a program."', location.href);
			
		}
		
	}
	
}

new Content().exec();

})();