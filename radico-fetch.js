// このオブジェクトを使うにはオブジェクト KV が必須です。
class Basement extends WXLogger {
	
	static {
		
		this.$actionIcon = Symbol('Basement.actionIcon'),
		this.$actionTitle = Symbol('Basement.actionTitle');
		
	}
	
	static DOMToObject(dom) {
		
		const { DOMToObject } = Basement;
		
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
	
	static getCookie(str, cookie = new KV()) {
		
		const splitted = str.split(';'), length = splitted.length;
		let i, v;
		
		i = -1, cookie instanceof KV || (cookie = new KV());
		while (++i < length) cookie.append((v = splitted[i].split('='))[0].trim(), v[1].trim());
		
		return cookie;
		
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
		
		this.log('"Fetching was borted."', event);
		
	}
	
	static throwError() {
		
		throw new Error(...arguments);
		
	}
	
	static toAB(response) {
		
		return response.arrayBuffer();
		
	}
	static toText(response) {
		
		return response.text();
		
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
		
		this.$cookie = Symbol('RadicoFetch.cookie'),
		this.$reqHeaders = Symbol('RadicoFetch.reqHeaders'),
		this.$resHeaders = Symbol('RadicoFetch.resHeaders'),
		
		this.rxM3U8Url = /^(https:\/\/.*?)$/gm,
		this.rxPicExt = /(set picext=)/gm,
		
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
	
	static getLastPathFromURL(url) {
		
		url instanceof URL || (url = new URL(url));
		
		const { pathname } = url;
		
		return pathname.substring(pathname.lastIndexOf('/') + 1);
		
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
	
	constructor(session) {
		
		super();
		
		this.setSession(session);
		
	}
	
	getPrgDateLabel(prg) {
		
		const { ftl, ftPrgDateStr, tol } = prg instanceof RadicoPrgFetch ? prg : this.getPrgByFt(ft);
		
		return	ftPrgDateStr.substring(0, 4) + '-' +
					ftPrgDateStr.substring(4, 6) + '-' +
					ftPrgDateStr.substring(6, 8) + ' ' +
					ftl + '-' + tol;
		
	}
	
	getPrgFileName(prg) {
		
		return	this.getPrgLabel(prg = prg instanceof RadicoPrgFetch ? prg : this.getPrgByFt(ft)) + ' – ' +
					this.getPrgDateLabel(prg);
		
	}
	
	getPrgLabel(prg) {
		
		return this.getStLabel() + ' ' + (prg instanceof RadicoPrgFetch ? prg : this.getPrgByFt(ft)).title;
		
	}
	
	getStLabel() {
		
		return '[' + this.stationId + ']';
		
	}
	
	getURLsFromM3U8(url, option) {
		
		const { getURLsFromM3U8, responsedStreamText } = RadicoFetch;
		
		return this.fetch(url, option).then(responsedStreamText).then(getURLsFromM3U8);
		
	}
	
	async request(prg) {
		
		if (prg instanceof RadicoPrgFetch ? prg : (prg = this.getPrgByFt(prg))) {
			
			const	{ dlOption, getLastPathFromURL, maxChunkLength, metaBlobOption, rxPicExt, throwError, toAB, toText, urlPlaylist } = RadicoFetch,
					{ downloads } = browser,
					{ duration, ft, ftl, ftPrgDateStr, imgExt, imgURL, prgDateStr, startTime, title, to, tol } = prg,
					{ cookie, log, reqHeaders, resHeaders, stationId, tabId } = this,
					playlistURLParam = new URLSearchParams(''),
					playlistParam =	[
												{ k: 'station_id', v: stationId },
												{ k: 'start_at', v: ft },
												{ k: 'ft', v: ft },
												{ k: 'end_at', v: to },
												{ k: 'to', v: to },
												{ k: 'l', v: maxChunkLength },
												{ k: 'lsid', v: cookie.get('a_exp') },
												{ k: 'type', v: 'b' }
											],
					playlistOption =	{
												headers: {
													'X-Radiko-AreaId': cookie.get('default_area_id'),
													'X-Radiko-AuthToken': resHeaders.get('x-radiko-authtoken')
												}
											},
					requestLength = parseInt(duration / maxChunkLength),
					dlUrls = [],
					stLabel = this.getStLabel(),
					prgFileName = stLabel + ' ' + title + ' – ' + this.getPrgDateLabel(prg),
					prgImgFileName = prgFileName + '.' + imgExt,
					zip = new JSZip(),
					prgFolder = zip.folder(prgFileName);
			let i, length, remained, exceeds, dlUrl, pathname, concat,concatPath, currentDuration;
			
			for (const { k, v } of new KV(playlistParam)) playlistURLParam.append(k, v);
			
			this.setActionTitle(`${stLabel} ダウンロード情報を収集中... – ${title}`, tabId),
			
			i = -1, this.groupCollapsed(`"📤 Extracting URLs from ${urlPlaylist}."`), currentDuration = 0;
			while (++i <= requestLength && (remained = duration - i * maxChunkLength) > 0) {
				
				playlistURLParam.set('l', length = (exceeds = remained < maxChunkLength) ? remained : maxChunkLength),
				playlistURLParam.set('seek', new RadicoDate(startTime + (exceeds ? duration - length : length * i) * 1000).toString()),
				
				log(`"${exceeds ? '⌛' : '⏳'} ${i}/${requestLength} [Seek: ${playlistURLParam.get('seek')}, Duration(sec.): [Accumulation: ${currentDuration += length}/${duration}, Length: ${length})]]"`),
				
				await	this.getURLsFromM3U8(urlPlaylist + '?' + playlistURLParam, playlistOption).
							then(urls => this.getURLsFromM3U8(urls[0])).then(urls => dlUrls.push(...urls)).catch(throwError);
				
			}
			this.groupEnd();
			
			const	dlUrlsLength = dlUrls.length;
			
			this.setActionTitle(`${stLabel} ダウンロード中... 時間がかかる場合があります – ${title}`, tabId),
			
			prgFolder.file(prgFileName + '.json', JSON.stringify(prg.toJSON(), null, '\t')),
			
			prgImgFileName &&
				await	this.fetch(imgURL).then(toAB).then(ab => prgFolder.file(prgImgFileName, ab)).catch(throwError),
			
			await	this.fetch(browser.runtime.getURL('resources/concat.bat')).then(toText).
						then(text => prgFolder.file('concat.bat', text.replaceAll(rxPicExt, `$1${imgExt}`))).catch(throwError);
			
			i = -1, concat = '', this.groupCollapsed(`"📥 Downloading ${dlUrlsLength} files... (${getLastPathFromURL(dlUrls[0])} – ${getLastPathFromURL(dlUrls[dlUrlsLength - 1])})"`);
			while (++i < dlUrlsLength) {
				
				log(`📥 ${i + 1}/${dlUrlsLength}. `, dlUrls[i]),
				
				await	this.fetch(dlUrl = dlUrls[i]).then(toAB).
							then(ab => prgFolder.file('aac/' + (concatPath = getLastPathFromURL(dlUrl)), ab)).catch(throwError),
				
				concat += `file '.\\aac\\${concatPath}'\n`;
				
			}
			this.groupEnd();
			
			prgFolder.file(prgFileName + '.txt', concat),
			
			log(`"📁 Zipping files into <${prgFileName}.zip>..."`, ),
			
			await	zip.generateAsync	(
												{ type: 'blob' },
												({ currentFile, percent }) =>
													this.setActionTitle(`${stLabel} ${percent|0}% 圧縮...  – ${title}`, tabId)
											).
						then	(
									blob =>	(
													downloads.download({ filename: prgFileName + '.zip', saveAs: true, url: URL.createObjectURL(blob) })
												)
								).catch(throwError);
			
		}
		
	}
	
	setSession(session) {
		
		if (session && typeof session === 'object') {
			
			const { cookie, ft, reqHeaders, resHeaders, stationId, tabId } = this.session = { ...session };
			
			this.cookie = cookie,
			this.date = new RadicoDate(this.ft = ft),
			this.reqHeaders = reqHeaders,
			this.resHeaders = resHeaders,
			this.stationId = stationId,
			this.tabId = tabId;
			
		}
		
		return this.session ??= {};
		
	}
	
	getPrgByFt(ft) {
		
		const v = this.querySelector(`prog[ft="${ft}"]`);
		
		return v instanceof Node ? new RadicoPrgFetch(v) : null;
		
	}
	
	querySelector(selector) {
		
		return this.dom?.querySelector(selector);
		
	}
	
	// 以下の this.url が返す値は継承先で任意に実装する必要がある。
	// つまりこのオブジェクト単体では、第二引数 url に任意の値を指定しない限り、通常は機能しない。
	update(session, url = this.url) {
		
		session && this.setSession(session);
		
		return	this.fetch(url).then(AbortableFetch.toText).
						then(text => (this.dom = new DOMParser().parseFromString(this.xml = text, 'text/xml'))).
							catch(AbortableFetch.throwError);
		
	}
	
	get cookie() {
		
		return Basement.getCookie(this[RadicoFetch.$cookie]);
		
	}
	set cookie(v) {
		
		this[RadicoFetch.$cookie] = v;
		
	}
	
	get reqHeaders() {
		
		const v = this[RadicoFetch.$reqHeaders];
		
		return new KV(v && typeof v === 'object' ? v : {}, 'name', 'value');
		
	}
	set reqHeaders(v) {
		
		this[RadicoFetch.$reqHeaders] = v;
		
	}
	
	get resHeaders() {
		
		const v = this[RadicoFetch.$resHeaders];
		
		return new KV(v && typeof v === 'object' ? v : {}, 'name', 'value');
		
	}
	set resHeaders(v) {
		
		this[RadicoFetch.$resHeaders] = v;
		
	}
	
}
class RadicoDate extends Date {
	
	static {
		
		this.URL = 'https://radiko.jp/v3/program/station/date/';
		
		this[Logger.$name] = '📻-⏰';
		
	}
	
	static {
		
		this.rxRadicoDateStr = /(\d{4})([01]\d)([0-3]\d)([0-2]\d)([0-5][0-9])([0-5][0-9])/;
		
	}
	
	static createFromRadicoDateStr(rds) {
		
		return new RadicoDate(RadicoDate.createFromRadicoDateStr(rds));
		
	}
	
	static getDateStrByRadicoDateStr(rds) {
		
		return	typeof rds === 'string' && RadicoDate.rxRadicoDateStr.test(rds) ?
						`${rds.substr(0,4)}-${rds.substr(4,2)}-${rds.substr(6,2)} ${rds.substr(8,2)}:${rds.substr(10,2)}:${rds.substr(12,2)}` : rds;
		
	}
	
	constructor(v) {
		
		arguments.length === 1 ?
			super(v instanceof Date ? v.getTime() : RadicoDate.getDateStrByRadicoDateStr(v)) :
			super(...arguments);
		
	}
	
	setRadicoDateStr(rds) {
		
		return this.setTime(Date.parse(RadicoDate.getDateStrByRadicoDateStr(rds)));
		
	}
	
	toDateString() {
		
		return this.toString().substring(0,8);
		
	}
	
	toProgramDate() {
		
		const hours = this.getHours();
		
		return (hours > -1 && hours < 5 ? new RadicoDate(this.getTime() - 86400000) : this).toDateString();
		
	}
	
	toString() {
		
		return `${this.getFullYear()}${(this.getMonth() + 1 + '').padStart(2, '0')}${(this.getDate()+'').padStart(2, '0')}${(this.getHours()+'').padStart(2, '0')}${(this.getMinutes()+'').padStart(2, '0')}${(this.getSeconds()+'').padStart(2, '0')}`;
		
	}
	
}
class RadicoDailyTableFetch extends RadicoFetch {
	
	static {
		
		this.URL = 'https://radiko.jp/v3/program/station/date/';
		
		this[Logger.$name] = '📻-📆';
		
	}
	
	constructor() {
		
		super(...arguments);
		
	}
	
	get url() {
		
		const { date, stationId } = this;
		
		return RadicoDailyTableFetch.URL + date.toDateString() + '/' + stationId + '.xml';
		
	}
	
}
class RadicoPrgFetch extends AbortableFetch {
	
	static {
		
		this.$ftDate = Symbol('RadicoPrgFetch.ftDate'),
		this.$toDate = Symbol('RadicoPrgFetch.toDate'),
		
		this[Logger.$name] = '📻-🎙️';
		
	}
	
	constructor(dom) {
		
		super();
		
		const { $ftDate, $toDate } = RadicoPrgFetch;
		
		this[$ftDate] = new RadicoDate(),
		this[$toDate] = new RadicoDate(),
		
		this.setDOM(dom);
		
	}
	
	setDOM(dom) {
		
		return dom instanceof Node ? (this.dom = dom) : this.dom;
		
	}
	
	toObject() {
		
		return Basement.DOMToObject(this.dom);
		
	}
	
	toJSON() {
		
		let json;
		
		try {
			
			json = JSON.stringify(this.toObject());
			
		} catch (error) {
			
			json = `"${error.toString()}"`, this.error(error);
			
		}
		
		return json;
		
	}
	
	get duration() {
		
		return parseInt(this.durationMs / 1000);
		
	}
	get durationMs() {
		
		return this.endTime - this.startTime;
		
	}
	get endTime() {
		
		return this.toDate.getTime();
		
	}
	get ft() {
		
		return this.dom?.getAttribute?.('ft') ?? '';
		
	}
	get ftDate() {
		
		const v = this.dom?.getAttribute?.('ft'), date = v && this[RadicoPrgFetch.$ftDate];
		
		return date ? (date.setRadicoDateStr(v), date) : '';
		
	}
	get ftPrgDateStr() {
		
		return this.ftDate.toProgramDate();
		
	}
	get ftl() {
		
		return this.dom?.getAttribute?.('ftl') ?? '';
		
	}
	get imgURL() {
		
		return this.dom?.querySelector?.('img').textContent ?? null;
		
	}
	get imgExt() {
		
		return new URL(this.imgURL)?.pathname?.split?.('.')?.at?.(-1);
		
	}
	get startTime() {
		
		return this.ftDate.getTime();
		
	}
	get to() {
		
		return this.dom?.getAttribute?.('to') ?? '';
		
	}
	get toDate() {
		
		const v = this.dom?.getAttribute?.('to'), date = v && this[RadicoPrgFetch.$toDate];
		
		return date ? (date.setRadicoDateStr(v), date) : '';
		
	}
	get tol() {
		
		return this.dom?.getAttribute?.('tol') ?? '';
		
	}
	get prgDateStr() {
		
		return this.toDate.toProgramDate();
		
	}
	get title() {
		
		return this.dom?.querySelector?.('title')?.textContent ?? '';
		
	}
	
}