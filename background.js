// 現在は視聴開始後のリクエストを傍聴してプレイリストを要求しているが、
// ページを読み込んだ段階で行なわれる auth1 への応答ヘッダーに含まれる x-radiko-authtoken を使えば恐らく任意のタイミングでプレイリストを要求できる。

const
{ pageAction, runtime, tabs } = browser,
rss = {},
messageFromContent = (message, sender, sendResponse) => {
	
	hi(message, sender);
	
	switch (typeof message) {
		
		case 'boolean':
		message || (rss[sender.tab.id]?.abort(), delete rss[sender.tab.id]);
		break;
		
		case 'string':
		const tabId = sender.tab.id;
		//todo Radikoのauth2が取得できないなど、例外に遭遇した場合の停止処理やタイムアウト処理
		(rss[tabId] = new RadicoSession(tabId)).session.
			then(session => tabs.sendMessage(tabId, { session, tabId, type: 'received', uid: message }).
				then(() => browser.pageAction.show(tabId)));
		break;
		
		case 'object':
		if (message) {
			
			switch (message.type) {
				
				case 'identified':
				hi(message);
				new RadicoFetch().request(message.session);
				break;
				
			}
			
		}
		break;
		
	}
	
},
interactedPageAction = event => {
	
	hi(event),
	
	tabs.sendMessage(event.id, { type: 'identify', tabId: event.id });
	
};

pageAction.onClicked.addListener(interactedPageAction),
runtime.onMessage.addListener(messageFromContent),

hi(Date.now());