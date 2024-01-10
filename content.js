(() => {

class Content extends WXLogger {
	
	static {
		
		this.pathRx = /\/#!\/ts\/(.*?)\/(\d{14})(?:$|\/|\?)/,
		
		this[Logger.$name] = 'Page',
		this[Logger.$namePrefix] = '@',
		this[Logger.$nameSuffix] = '';
		
	}
	
	static bound = {
		
		hidPage() {
			
			this.log('"A tab was hidden."'),
			
			browser.runtime.sendMessage(false);
			
		},
		
		onMessage(message, sender, sendResponse) {
			
			const { log } = this;
			
			log('"Received a message."', message, sender);
			
			if (message && typeof message === 'object') {
				
				const { ft, messenger, stationId, storedSession } = this, { tabId, type } = message;
				
				return this.messenger[type]?.(message, tabId, stationId, ft, storedSession, sender, sendResponse, log);
				
			}
			
		}
		
	};
	
	static messenger = {
		
		identify(message, tabId, stationId, ft, storedSession, sender, sendResponse, log) {
			
			log('"Making inquire a tabId."', storedSession),
			
			tabId === storedSession?.tabId && browser.runtime.sendMessage({ session: storedSession, type: 'identified' });
			
		},
		
		received(message, tabId, stationId, ft, storedSession, sender, sendResponse, log) {
			
			if (message.uid === this.uid) {
				
				const { session } = message;
				
				(this.storedSession = session).stationId = stationId,
				session.tabId = tabId,
				session.ft = ft,
				session.cookie = document.cookie,
				
				log('"Responsed a session data."', session),
				
				sendResponse();
				
			}
			
			return true;
			
		},
		
		updated(message, tabId, stationId, ft, storedSession, sender, sendResponse, log) {
			
			tabId === storedSession?.tabId && this.exec();
			
		}
		
	};
	
	constructor(url) {
		
		super();
		
		if (this.match(url)) {
			
			const { bound, messenger } = Content;
			
			Object.assign(this, this.getBound(bound)),
			Object.assign(this.messenger = {}, this.getBound(messenger)),
			
			addEventListener('pagehide', this.hidPage),
			browser.runtime.onMessage.addListener(this.onMessage);
			
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