(() => {

const path = /\/#!\/ts\/(.*?)\/(\d{14})(?:$|\/|\?)/.exec(location.href);

if (path) {
	
	const { runtime } = browser, uid = Date.now() + '-' + Math.random();
	let session;
	
	addEventListener('pagehide', () => runtime.sendMessage(false)),
	
	runtime.onMessage.addListener((message, sender, sendResponse) => {
		
		hi(message, sender);
		
		if (message && typeof message === 'object') {
			
			switch (message.type) {
				
				case 'received':
				if (message.uid === uid) {
					(session = message.session).stationId = path[1],
					session.tabId = message.tabId,
					session.ft = path[2],
					session.cookie = document.cookie,
					sendResponse();
				}
				return true;
				break;
				
				case 'identify':
				hi(session);
				message.tabId === session?.tabId && runtime.sendMessage({ session, type: 'identified' });
				break;
				
			}
			
		}
		
	}),
	
	runtime.sendMessage(uid)
	
}

})();