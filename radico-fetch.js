class AbortableFetch extends WXLogger {
	
	static {
		
		this.$ac = Symbol('AbortableFetch.ac'),
		
		this[Logger.$nameBody] = '🚨-📥';
		
	}
	
	constructor() { super(); }
	
	abort() {
		
		this[AbortableFetch.$ac]?.abort?.();
		
	}
	
	fetch(url, option) {
		
		return fetch(url, this.setSignal(option));
		
	}
	
	getSignal() {
		
		const { $ac } = AbortableFetch, signal = this?.[$ac]?.signal;
		
		return !signal || signal.aborted ? (this[$ac] = new AbortController()).signal : signal;
		
	}
	
	setSignal(option) {
		
		option && typeof option === 'object' ?
			option.signal instanceof AbortSignal || (option.signal = this.getSignal()) :
			(option = { signal: option instanceof AbortSignal ? option : this.getSignal() });
		
		return option;
		
	}
	
}
class RadicoSession extends WXLogger {
	
	static {
		
		this.rxTargetRequestURL = /^https:\/\/radiko.jp\/v2\/api\/auth1$/,
		
		this.filter = { urls: [ '*://radiko.jp/*' ] },
		this.reqExtraInfoSpec = [ 'requestHeaders' ],
		this.resExtraInfoSpec = [ 'responseHeaders' ],
		
		this[Logger.$nameBody] = '📻-📡';
		
	}
	
	// 未使用
	static convertEntriesToArray(entries) {
		
		const array = [];
		let i;
		
		i = -1;
		for (const v of entries) array[++i] = { ...v };
		
		return array;
		
	}
	
	//issue: auth2が二回要求される
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
		
		this.maxChunkLength = 300,
		
		this.urlPlaylist = 'https://tf-f-rpaa-radiko.smartstream.ne.jp/tf/playlist.m3u8',
		this.urlStationDate = 'https://radiko.jp/v3/program/station/date/',
		
		this.filter = { urls: [ '*://radiko.jp/*' ] },
		this.reqExtraInfoSpec = [ 'requestHeaders' ],
		this.resExtraInfoSpec = [ 'responseHeaders' ],
		
		this.dlOption = { saveAs: true },
		this.metaBlobOption = { type: 'application/json' },
		
		this[Logger.$nameBody] = '📻-📥';
		
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
		
		const hours = date.getHours(), isMidnight = hours > 0 && hours < 5;
		
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
	
	//static async _listener(details) {
	//	
	//	if (details.method === 'GET') {
	//		
	//		const url = new URL(details.url), { pathname, searchParams } = url;
	//		
	//		if (
	//			RadicoFetch.rxUrlPathname.test(pathname) &&
	//			searchParams.has('end_at') &&
	//			searchParams.has('l') &&
	//			searchParams.has('seek') &&
	//			searchParams.has('start_at')
	//		) {
	//			
	//			const	{ uids } = this, _uid_ = searchParams.get('_uid_');
	//			
	//			if (uids[_uid_]) {
	//				
	//				delete uids[_uid_];
	//				return;
	//				
	//			} else {
	//				
	//				const	{ maxChunkLength, composeURL, getDate, getDateStr, responsedStreamText, rxM3U8Url } = RadicoFetch,
	//						{ requestHeaders } = details,
	//						{ uids } = this,
	//						_uid_ = searchParams.get('_uid_'),
	//						startAt = searchParams.get('start_at'),
	//						startTime = getDate(startAt).getTime(),
	//						endAt = searchParams.get('end_at'),
	//						totalLength = parseInt((getDate(endAt).getTime() - startTime) / 1000),
	//						requestLength = parseInt(totalLength / maxChunkLength),
	//						headers = {},
	//						dlUrls = [];
	//				let i, chunk, length, seek;
	//				
	//				for (const { name, value } of requestHeaders) headers[name] = value;
	//				
	//				hi(details, headers, composeURL(url) + '?' + searchParams);
	//				
	//				i = -1;
	//				while (++i < requestLength) {
	//					
	//					length = (chunk = totalLength - i * maxChunkLength) < maxChunkLength ? chunk : maxChunkLength,
	//					seek = getDateStr(startTime + (i ? (i - 1) * maxChunkLength + chunk : 0) * 1000);
	//					
	//					if (!length) break;
	//					
	//					searchParams.set('l', length);
	//					searchParams.set('seek', seek),
	//					hi(i, totalLength - i * maxChunkLength, searchParams.get('l'), searchParams.get('seek'), endAt);
	//					await	this.getURLsFromM3U8(composeURL(url) + '?' + searchParams, { headers }).
	//								then(urls => this.getURLsFromM3U8(urls[0])).then(urls => dlUrls.push(...urls));
	//					
	//				}
	//				
	//				const { downloads } = browser, dlOption = { saveAs: true }, dlUrlsLength = dlUrls.length;
	//				let dlUrl, pathname;
	//				
	//				hi(dlUrls);
	//				
	//				i = -1;
	//				while (++i < 3) {
	//					
	//					dlOption.filename =
	//						(pathname = new URL(dlUrl = dlUrls[i]).pathname).substring(pathname.lastIndexOf('/') + 1),
	//					
	//					await fetch(dlUrl).then(response => response.blob()).
	//						then(blob => (dlOption.url = URL.createObjectURL(blob), downloads.download(dlOption)));
	//					
	//				}
	//				
	//			}
	//			
	//		}
	//		
	//	}
	//	
	//}
	
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
		
		this.uids = {};
		
	}
	
	async request(sessionData) {
		
		const	{ getCookie, getDate, getProgramDate, urlPlaylist, urlStationDate } = RadicoFetch,
				{ ft, stationId, reqHeaders: reqHeadersRaw, resHeaders: resHeadersRaw } = sessionData,
				prgFt = getProgramDate(ft),
				reqHeaders = new KV(reqHeadersRaw, 'name', 'value'),
				resHeaders = new KV(resHeadersRaw, 'name', 'value'),
				cookie = getCookie(reqHeaders.get('Cookie'));
		let prg;
		
		this.sessionData = sessionData;
		
		await	this.fetch(urlStationDate + prgFt + '/' + stationId + '.xml').then(response => response.text()).
					then(text => (prg = new DOMParser().parseFromString(text, 'text/xml').querySelector(`prog[ft="${ft}"]`)));
		
		if (prg) {
			
			const	{ createObjectURL } = URL,
					{ dlOption, DOMToObject, getDateStr, maxChunkLength, metaBlobOption } = RadicoFetch,
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
					prgCoverFileName = prgFileName + '.' + new URL(prgCoverURL)?.pathname?.split?.('.')?.at?.(-1),
					zip = new JSZip(),
					prgFolder = zip.folder(prgFileName);
			let i, length, remained, dlUrl, pathname, concat,concatPath;
			
			for (const { k, v } of playlistParam) playlistURLParam.append(k, v);
			
			//this.fetch(urlPlaylist + '?' + playlistURLParam, playlistOption).then(hi);
			
			i = -1;
			while (++i <= requestLength && (remained = totalDuration - i * maxChunkLength) > 0) {
				
				playlistURLParam.set('l', length = remained < maxChunkLength ? remained : maxChunkLength),
				playlistURLParam.set('seek', getDateStr(startTime + (remained < maxChunkLength ? totalDuration - length : length * i) * 1000)),
				this.log(i, requestLength, remained < maxChunkLength, remained, playlistURLParam.get('l'), playlistURLParam.get('seek'), startTime, totalDuration, remained < maxChunkLength ? totalDuration - length : length * i);
				
				await	this.getURLsFromM3U8(urlPlaylist + '?' + playlistURLParam, playlistOption).
							then(urls => this.getURLsFromM3U8(urls[0])).then(urls => dlUrls.push(...urls));
				
			}
			
			const	dlUrlsLength = dlUrls.length;
			
			this.log(dlUrls);
			
			prgFolder.file(prgFileName + '.json', JSON.stringify(DOMToObject(prg), null, '\t')),
			prgCoverURL &&	await fetch(prgCoverURL).then(response => response.arrayBuffer()).
									then(ab => prgFolder.file(prgCoverFileName, ab)),
			
			await	fetch(browser.runtime.getURL('concat.bat')).then(response => response.text()).
						then(text => prgFolder.file('concat.bat', text));
			
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
									),
				concat += `file '.\\aac\\${concatPath}'\n`;
				
			}
			
			prgFolder.file(prgFileName + '.txt', concat),
			
			await	zip.generateAsync({ type: 'base64' }).
						then(base64 => (location.href = 'data:application/zip;base64,' + base64));
			
			//await downloads.download({ filename: prgFileName + '.json', url: createObjectURL(new Blob([ JSON.stringify(DOMToObject(prg), null, '\t') ], metaBlobOption)) }),
			//prgCoverURL && await downloads.download({ filename: prgCoverFileName, url: prgCoverURL });
			//
			//i = -1;
			//while (++i < dlUrlsLength) {
			//	
			//	dlOption.filename =
			//		(pathname = new URL(dlUrl = dlUrls[i]).pathname).substring(pathname.lastIndexOf('/') + 1),
			//	hi(dlUrl, dlOption.filename);
			//	await this.fetch(dlUrl).then(response => response.blob()).
			//		then(blob => (dlOption.url = createObjectURL(blob), downloads.download(dlOption)));
			//	
			//}
			
		}
		
		return;
		
		if (details.method === 'GET') {
			
			const url = new URL(details.url), { pathname, searchParams } = url;
			
			if (
				RadicoFetch.rxUrlPathname.test(pathname) &&
				searchParams.has('end_at') &&
				searchParams.has('l') &&
				searchParams.has('seek') &&
				searchParams.has('start_at')
			) {
				
				const	{ uids } = this, _uid_ = searchParams.get('_uid_');
				
				if (uids[_uid_]) {
					
					delete uids[_uid_];
					return;
					
				} else {
					
					const	{ maxChunkLength, composeURL, getDate, getDateStr, responsedStreamText, rxM3U8Url } = RadicoFetch,
							{ requestHeaders } = details,
							{ uids } = this,
							_uid_ = searchParams.get('_uid_'),
							startAt = searchParams.get('start_at'),
							startTime = getDate(startAt).getTime(),
							endAt = searchParams.get('end_at'),
							totalLength = parseInt((getDate(endAt).getTime() - startTime) / 1000),
							requestLength = parseInt(totalLength / maxChunkLength),
							headers = {},
							dlUrls = [];
					let i, chunk, length, seek;
					
					for (const { name, value } of requestHeaders) headers[name] = value;
					
					this.log(details, headers, composeURL(url) + '?' + searchParams);
					
					i = -1;
					while (++i < requestLength) {
						
						length = (chunk = totalLength - i * maxChunkLength) < maxChunkLength ? chunk : maxChunkLength,
						seek = getDateStr(startTime + (i ? (i - 1) * maxChunkLength + chunk : 0) * 1000);
						
						if (!length) break;
						
						searchParams.set('l', length);
						searchParams.set('seek', seek),
						this.log(i, totalLength - i * maxChunkLength, searchParams.get('l'), searchParams.get('seek'), endAt);
						await	this.getURLsFromM3U8(composeURL(url) + '?' + searchParams, { headers }).
									then(urls => this.getURLsFromM3U8(urls[0])).then(urls => dlUrls.push(...urls));
						
					}
					
					const { downloads } = browser, dlOption = { saveAs: true }, dlUrlsLength = dlUrls.length;
					let dlUrl, pathname;
					
					this.log(dlUrls);
					
					i = -1;
					while (++i < 3) {
						
						dlOption.filename =
							(pathname = new URL(dlUrl = dlUrls[i]).pathname).substring(pathname.lastIndexOf('/') + 1),
						
						await fetch(dlUrl).then(response => response.blob()).
							then(blob => (dlOption.url = URL.createObjectURL(blob), downloads.download(dlOption)));
						
					}
					this.log(2);
				}
				
			}
			
		}
		
	}
	
	getURLsFromM3U8(urlStr, option) {
		
		const { getURLsFromM3U8, responsedStreamText } = RadicoFetch;
		
		return this.uniqueFetch(urlStr, option).then(responsedStreamText).then(getURLsFromM3U8);
		
	}
	
	uniqueFetch(url, option, uid = Math.random() + '-' + Date.now()) {
		
		const search = new URL(url).searchParams;
		
		search.append('_uid_', this.uids[uid] = uid);
		
		return this.fetch(RadicoFetch.composeURL(url) + '?' + search, option);
		
	}
	
}