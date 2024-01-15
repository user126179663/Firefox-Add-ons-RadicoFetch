(() => {

class Content extends WXLogger {
	
	static {
		
		this.pathRx = /\/#!\/ts\/(.*?)\/(\d{14})(?:$|\/|\?)/,
		
		this[Logger.$name] = 'Page',
		this[Logger.$namePrefix] = '@',
		this[Logger.$nameSuffix] = '';
		
	}
	
	static bound = {
		
		downloaded() {
			
			browser.runtime.sendMessage({ type: (this.detect() ? '' : 'de') + 'activate', url: location.href });
			
		},
		
		hidPage() {
			
			this.log('"A tab was hidden."'),
			
			browser.runtime.sendMessage(false);
			
		},
		
		onMessage(message, sender, sendResponse) {
			
			const { log } = this;
			
			log('"Received a message."', message, sender);
			
			if (message && typeof message === 'object') {
				
				const { ft, stationId, storedSession } = this, { tabId, type } = message;
				
				return	Content.messenger[type]?.
								call?.(this, message, tabId, stationId, ft, storedSession, sender, sendResponse, log);
				
			}
			
		}
		
	};
	
	static messenger = {
		
		authenticated(message, tabId, stationId, ft, storedSession, sender, sendResponse, log) {
			
			if (message.uid === this.uid) {
				
				const { session } = message;
				
				session.stationId = stationId,
				session.tabId = tabId,
				session.ft = ft,
				session.cookie = document.cookie,
				
				log('"Authenticated."', Object.assign(storedSession, session)),
				
				sendResponse();
				
			}
			
			return true;
			
		},
		
		detect(message, tabId, stationId, ft, storedSession, sender, sendResponse, log) {
			
			log(`"Background required a detection."`),
			
			this.sendActivation();
			
		},
		
		downloaded(message, tabId, stationId, ft, storedSession, sender, sendResponse, log) {
			
			log("Finished the downloading."),
			
			this.resolveDownloading?.();
			
		},
		
		identify(message, tabId, stationId, ft, storedSession, sender, sendResponse, log) {
			
			log('"Making inquire a tabId."', storedSession),
			
			//coco ダウンロード中に別ページに移動した時に別ページが番組ではない場合、ページアクションをダウンロード処理が完了するまで表示させ、完了後に消す処理
			tabId === storedSession?.tabId &&
				(
					this.downloading = new Promise((rs, rj) =>  {
						
						this.resolveDownloading = rs,
						this.rejectDownloading = rj,
						
						browser.runtime.sendMessage({ session: storedSession, type: 'identified' });
						
					})
				);
			
		},
		
		updated(message, tabId, stationId, ft, storedSession, sender, sendResponse, log) {
			
			tabId === storedSession?.tabId &&
				(
					this.log(`"Updated the URL for this tab#${tabId}."`),
					this.sendActivation()
				);
			
		}
		
	};
	
	constructor(url) {
		
		super();
		
		const { assign } = Object, { bound } = Content;
		
		this.uid = crypto.randomUUID(),
		
		this.storedSession = {},
		
		assign(this, this.getBound(bound)),
		
		this.downloading = Promise.resolve(),
		
		addEventListener('pagehide', this.hidPage),
		browser.runtime.onMessage.addListener(this.onMessage);
		
	}
	
	match(url = location.href) {
		
		return Content.pathRx.exec(url);
		
	}
	
	detect(url) {
		
		const { log } = this, pathParts = this.match(url);
		
		if (pathParts) {
			
			const { storedSession } = this;
			
			this.updateLogger(this.stationId = storedSession.stationId = pathParts[1]),
			this.ft = storedSession.ft = pathParts[2],
			
			this.log('"Detected a program."', location.href, pathParts);
			
		} else this.log('"There seems not to be a page for a program."', pathParts);
		
		return !!pathParts;
		
	}
	
	contact(url) {
		
		browser.runtime.sendMessage(this.uid),
		
		this.log('"Contact with background."');
		
	}
	
	async sendActivation() {
		
		const { downloaded, downloading } = this;
		
		downloading?.then?.(downloaded);
		
	}
	
}

new Content().contact();

})();