class Basement extends WXLogger {
	
	static {
		
		this.$actionIcon = Symbol('Basement.actionIcon'),
		this.$actionTitle = Symbol('Basement.actionTitle');
		
	}
	
	static typeofIconSrc(src) {
		
		switch (typeof src) {
			
			case 'string':
			return 'path';
			
			case 'object':
			if (src instanceof ImageData) return 'imageData';
			else if (src) for (const v of src) return Basement.typeofIconSrc(v);
			
		}
		
		return 'invalid';
		
	}
	
	constructor() {
		
		super(...arguments);
		
		const { $actionIcon, $actionTitle } = Basement;
		
		this[$actionIcon] = {},
		this[$actionTitle] = {};
		
	}
	
	hideAction(tabId) {
		
		browser.pageAction.hide(tabId);
		
	}
	
	setActionIcon(src, tabId) {
		
		const { $actionIcon, typeofIconSrc } = Basement, detail = this[$actionIcon], current = typeofIconSrc(src);
		
		current === 'invalid' ?
			(delete detail.path, delete detail.imageData) :
			(detail[current] = src, delete detail[current === 'path' ? 'imageData' : 'path']),
		tabId === undefined || (detail.tabId = tabId),
		
		browser.pageAction.setIcon(detail);
		
	}
	setActionTitle(title, tabId) {
		
		const detail = this[Basement.$actionTitle];
		
		title === undefined || (detail.title = title),
		tabId === undefined || (detail.tabId = tabId),
		
		browser.pageAction.setTitle(detail);
		
	}
	
	showActionIcon(tabId) {
		
		browser.pageAction.show(tabId);
		
	}
	
}
class AbortableFetch extends Basement {
	
	static {
		
		this.$ac = Symbol('AbortableFetch.ac'),
		this.$afAbortedOption = Symbol('AbortableFetch.afAbortedOption'),
		
		this[this.$afAbortedOption] = { once: true },
		
		this[Logger.$name] = '🚨-📥';
		
	}
	
	static aborted(event) {
		
		this.log("Fetching was borted.", event);
		
	}
	
	constructor() {
		
		super();
		
		this.aborted = this.constructor.aborted.bind(this);
		
	}
	
	abort() {
		
		this[AbortableFetch.$ac]?.abort?.();
		
	}
	
	fetch(url, option) {
		
		return fetch(url, this.setSignal(option));
		
	}
	
	getSignal() {
		
		const { $ac } = AbortableFetch, signal = this?.[$ac]?.signal;
		let ac;
		
		(!signal || signal.aborted) ?
			(ac = this[$ac] = new AbortController()).signal.
				addEventListener('aborted', this.aborted, this.constructor[AbortableFetch.$afAbortedOption]) :
			(ac = this[$ac]);
		
		return ac.signal;
		
	}
	
	setSignal(option) {
		
		option && typeof option === 'object' ?
			option.signal instanceof AbortSignal || (option.signal = this.getSignal()) :
			(option = { signal: option instanceof AbortSignal ? option : this.getSignal() });
		
		return option;
		
	}
	
}
class RadicoSession extends Basement {
	
	static {
		
		this.rxTargetRequestURL = /^https:\/\/radiko.jp\/v2\/api\/auth1$/,
		
		this.filter = { urls: [ '*://radiko.jp/*' ] },
		this.reqExtraInfoSpec = [ 'requestHeaders' ],
		this.resExtraInfoSpec = [ 'responseHeaders' ],
		
		this[Logger.$name] = '📻-📡';
		
	}
	
	static auth2(details) {
		
		details.method === 'GET' && RadicoSession.rxTargetRequestURL.test(details.url) &&
			this[details.requestHeaders ? 'beforeSend' : 'received'](details);
		
	}
	
	constructor() {
		
		super();
		
		const { webRequest } = browser, { constructor: { auth2, filter, reqExtraInfoSpec, resExtraInfoSpec } } = this;
		
		this.session = new Promise((rs,rj) => (this.rs = rs, this.rj = rj)),
		
		webRequest.onBeforeSendHeaders.addListener(this.auth2 = auth2.bind(this), filter, reqExtraInfoSpec);
		
	}
	
	beforeSend(details) {
		
		const	{ convertEntriesToArray, filter, resExtraInfoSpec } = RadicoSession,
				{ webRequest } = browser,
				{ requestHeaders } = details;
		
		requestHeaders &&	(
									webRequest.onBeforeSendHeaders.removeListener(this.auth2),
									this.auth2ReqHeaders = requestHeaders,
									webRequest.onResponseStarted.addListener(this.auth2, filter, resExtraInfoSpec)
								);
		
	}
	
	received(details) {
		
		const { responseHeaders } = details;
		
		responseHeaders &&
			(
				browser.webRequest.onResponseStarted.removeListener(this.auth2),
				this.rs({ reqHeaders: this.auth2ReqHeaders, resHeaders: (this.auth2ResHeaders = responseHeaders) })
			);
		
	}
	
}
class RadicoFetch extends AbortableFetch {
	
	static {
		
		this.rxTargetRequestURL = /^https:\/\/radiko.jp\/v2\/api\/auth1$/,
		this.rxUrlPathname = /\/tf\/playlist.m3u8$/,
		this.rxM3U8Url = /^(https:\/\/.*?)$/gm,
		this.rxPicExt = /(.*?)(set picext=)(.*?)/m,
		
		this.maxChunkLength = 300,
		
		this.urlPlaylist = 'https://tf-f-rpaa-radiko.smartstream.ne.jp/tf/playlist.m3u8',
		this.urlStationDate = 'https://radiko.jp/v3/program/station/date/',
		
		this.filter = { urls: [ '*://radiko.jp/*' ] },
		this.reqExtraInfoSpec = [ 'requestHeaders' ],
		this.resExtraInfoSpec = [ 'responseHeaders' ],
		
		this.dlOption = { saveAs: true },
		this.metaBlobOption = { type: 'application/json' },
		
		this[Logger.$name] = '📻-📥';
		
	}
	
	static getCookie(str, cookie = new KV()) {
		
		const splitted = str.split(';'), length = splitted.length;
		let i, v;
		
		i = -1, cookie instanceof KV || (cookie = new KV());
		while (++i < length) cookie.append((v = splitted[i].split('='))[0].trim(), v[1].trim());
		
		return cookie;
		
	}
	
	static getDate(str) {
		
		return new Date(`${str.substr(0,4)}-${str.substr(4,2)}-${str.substr(6,2)} ${str.substr(8,2)}:${str.substr(10,2)}:${str.substr(12,2)}`);
		
	}
	
	static getDateStr() {
		
		const date = arguments[0] instanceof Date ? arguments[0] : new Date(...arguments);
		
		return `${date.getFullYear()}${(date.getMonth() + 1 + '').padStart(2, '0')}${(date.getDate()+'').padStart(2, '0')}${(date.getHours()+'').padStart(2, '0')}${(date.getMinutes()+'').padStart(2, '0')}${(date.getSeconds()+'').padStart(2, '0')}`;
		
	}
	
	static getProgramDate(date) {
		
		const { getDate, getDateStr } = RadicoFetch;
		
		date instanceof Date || (date = getDate(date));
		
		const hours = date.getHours(), isMidnight = hours > -1 && hours < 5;
		
		return getDateStr(isMidnight ? date.setTime(date.getTime() - 86400000) : date).substring(0,8);
		
	}
	
	static getURLsFromM3U8(m3u8) {
		
		const urls = [];
		let i;
		
		i = -1;
		for (const v of m3u8.matchAll(RadicoFetch.rxM3U8Url)) urls[++i] = v[1];
		
		return urls;
		
	}
	
	static composeURL(url) {
		
		if (url instanceof URL || (url = URL.canParse(url) && (url = new URL(url)))) {
			
			const	{ host, password, pathname, port, protocol, username } = url;
			
			return url && `${protocol}\/\/${username || password ? `${username}:${password}@` : ''}${host}${pathname}`;
			
		}
		
		return null;
		
	}
	
	static async responsedStreamText({ body }) {
		
		const td = new TextDecoder();
		let text;
		
		text = '';
		for await (const chunk of body) text += td.decode(chunk);
		
		return text;
		
	}
	
	static throwError() {
		
		throw new Error(...arguments);
		
	}
	
	static DOMToObject(dom) {
		
		const { DOMToObject } = RadicoFetch;
		
		if (typeof dom?.[Symbol.iterator] === 'function') {
			
			const domLength = dom.length, array = [];
			let i;
			
			i = -1;
			while (++i < domLength) array[i] = DOMToObject(dom[i]);
			
			return array;
			
		} else if (dom instanceof Element) {
			
			const { attributes, children, tagName } = dom, object = { tagName }, attrs = object.attributes = {};
			
			for (const { name, value } of attributes) attrs[name] = value;
			
			Object.keys(attrs).length || delete object.attributes,
			
			children.length ? (object.children = DOMToObject(children)) : (object.textContent = dom.textContent);
			
			return object;
			
		}
		
	}
	
	constructor() {
		
		super();
		
		//this.uids = {};
		
	}
	
	getURLsFromM3U8(urlStr, option) {
		
		const { getURLsFromM3U8, responsedStreamText } = RadicoFetch;
		
		return this.fetch(urlStr, option).then(responsedStreamText).then(getURLsFromM3U8);
		
	}
	
	async request(sessionData) {
		
		const	{ getCookie, getDate, getProgramDate, throwError, urlPlaylist, urlStationDate } = RadicoFetch,
				{ ft, reqHeaders: reqHeadersRaw, resHeaders: resHeadersRaw, stationId, tabId } = sessionData,
				prgFt = getProgramDate(ft),
				reqHeaders = new KV(reqHeadersRaw, 'name', 'value'),
				resHeaders = new KV(resHeadersRaw, 'name', 'value'),
				cookie = getCookie(reqHeaders.get('Cookie'));
		let prg;
		
		this.sessionData = sessionData;
		
		await	this.fetch(urlStationDate + prgFt + '/' + stationId + '.xml').then(response => response.text()).
					then(text => (prg = new DOMParser().parseFromString(text, 'text/xml').querySelector(`prog[ft="${ft}"]`))).
						catch(throwError);
		
		if (prg) {
			
			const	{ createObjectURL } = URL,
					{ setPageActionTitle } = Background,
					{ rxPicExt, dlOption, DOMToObject, getDateStr, maxChunkLength, metaBlobOption } = RadicoFetch,
					{ downloads } = browser,
					to = prg.getAttribute('to'),
					playlistURLParam = new URLSearchParams(''),
					playlistParam =	new KV(
														[
															{ k: 'station_id', v: stationId },
															{ k: 'start_at', v: ft },
															{ k: 'ft', v: ft },
															{ k: 'end_at', v: to },
															{ k: 'to', v: to },
															{ k: 'l', v: maxChunkLength },
															{ k: 'lsid', v: cookie.get('a_exp') },
															{ k: 'type', v: 'b' }
														]
													),
					playlistOption =	{
												headers: {
													'X-Radiko-AreaId': cookie.get('default_area_id'),
													'X-Radiko-AuthToken': resHeaders.get('x-radiko-authtoken')
												}
											},
					startTime = getDate(ft).getTime(),
					totalDuration = parseInt((getDate(to).getTime() - startTime) / 1000),
					requestLength = parseInt(totalDuration / maxChunkLength),
					dlUrls = [],
					prgFileName =	'[' + stationId + '] ' +
										prg.querySelector('title').textContent + ' – ' +
										prgFt.substring(0, 4).padStart(2, '0') + '-' +
										prgFt.substring(4, 6).padStart(2, '0') + '-' +
										prgFt.substring(6, 8).padStart(2, '0') + ' ' +
										prg.getAttribute('ftl') + '-' + prg.getAttribute('tol'),
					prgCoverURL = prg.querySelector('img').textContent,
					prgCoverExt = new URL(prgCoverURL)?.pathname?.split?.('.')?.at?.(-1),
					prgCoverFileName = prgFileName + '.' + prgCoverExt,
					zip = new JSZip(),
					prgFolder = zip.folder(prgFileName);
			let i, length, remained, dlUrl, pathname, concat,concatPath;
			
			for (const { k, v } of playlistParam) playlistURLParam.append(k, v);
			
			this.setActionTitle('ダウンロード情報を収集中...', tabId),
			
			i = -1;
			while (++i <= requestLength && (remained = totalDuration - i * maxChunkLength) > 0) {
				
				playlistURLParam.set('l', length = remained < maxChunkLength ? remained : maxChunkLength),
				playlistURLParam.set('seek', getDateStr(startTime + (remained < maxChunkLength ? totalDuration - length : length * i) * 1000)),
				this.log(i, requestLength, remained < maxChunkLength, remained, playlistURLParam.get('l'), playlistURLParam.get('seek'), startTime, totalDuration, remained < maxChunkLength ? totalDuration - length : length * i);
				
				await	this.getURLsFromM3U8(urlPlaylist + '?' + playlistURLParam, playlistOption).
							then(urls => this.getURLsFromM3U8(urls[0])).then(urls => dlUrls.push(...urls)).catch(throwError);
				
			}
			
			const	dlUrlsLength = dlUrls.length;
			
			this.log(dlUrls),
			
			this.setActionTitle('ダウンロード中...', tabId),
			
			prgFolder.file(prgFileName + '.json', JSON.stringify(DOMToObject(prg), null, '\t')),
			prgCoverURL &&	await fetch(prgCoverURL).then(response => response.arrayBuffer()).
									then(ab => prgFolder.file(prgCoverFileName, ab)),
			
			await	fetch(browser.runtime.getURL('resources/concat.bat')).then(response => response.text()).
						then(text => prgFolder.file('concat.bat', text.replace(rxPicExt, `$1$2${prgCoverExt}$3`))).
							catch(throwError);
			
			i = -1, concat = '';
			while (++i < dlUrlsLength) {
				
				await	this.fetch(dlUrl = dlUrls[i]).then(response => response.arrayBuffer()).
							then	(
										ab =>	prgFolder.file	(
																		'aac/' +
																			(
																				concatPath = (pathname = new URL(dlUrl).pathname).
																					substring(pathname.lastIndexOf('/') + 1)
																			),
																		ab
																	)
									).catch(throwError),
				concat += `file '.\\aac\\${concatPath}'\n`;
				
			}
			
			prgFolder.file(prgFileName + '.txt', concat),
			
			//await	zip.generateAsync({ type: 'base64' }).
			//			then(base64 => (location.href = 'data:application/zip;base64,' + base64));
			
			await	zip.generateAsync	(
												{ type: 'blob' },
												({ currentFile, percent }) =>
													this.setActionTitle(`ファイル作成中(${percent|0}% – ${currentFile})...`, tabId)
											).
						then	(
									blob =>	(
													downloads.download({ filename: prgFileName + '.zip', saveAs: true, url: createObjectURL(blob) })
												)
								);
			
		}
		
	}
	
	//uniqueFetch(url, option, uid = crypto.randomUUID()) {
	//	
	//	const search = new URL(url).searchParams;
	//	
	//	search.append('_uid_', this.uids[uid] = uid);
	//	
	//	return this.fetch(RadicoFetch.composeURL(url) + '?' + search, option);
	//	
	//}
	
}