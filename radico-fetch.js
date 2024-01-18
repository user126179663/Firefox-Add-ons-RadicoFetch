// このオブジェクトを使うには utils.js で定義されているオブジェクト KV が必須です。
class Action extends WXLogger {
	
	static {
		
		this.$actionIcon = Symbol('Action.actionIcon'),
		this.$actionTitle = Symbol('Action.actionTitle');
		
	}
	
	static typeofIconSrc(src) {
		
		switch (typeof src) {
			
			case 'string':
			return 'path';
			
			case 'object':
			if (src instanceof ImageData) return 'imageData';
			else if (src) for (const v of src) return Action.typeofIconSrc(v);
			
		}
		
		return 'invalid';
		
	}
	
	constructor() {
		
		super(...arguments);
		
		const { $actionIcon, $actionTitle } = Action;
		
		this[$actionIcon] = {},
		this[$actionTitle] = {};
		
	}
	
	hideAction(tabId) {
		
		browser.pageAction.hide(tabId);
		
	}
	
	setActionIcon(src, tabId) {
		
		const { $actionIcon, typeofIconSrc } = Action, detail = this[$actionIcon], current = typeofIconSrc(src);
		
		current === 'invalid' ?
			(delete detail.path, delete detail.imageData) :
			(detail[current] = src, delete detail[current === 'path' ? 'imageData' : 'path']),
		tabId === undefined || (detail.tabId = tabId),
		
		browser.pageAction.setIcon(detail);
		
	}
	setActionTitle(title, tabId) {
		
		const detail = this[Action.$actionTitle];
		
		title === undefined || (detail.title = title),
		tabId === undefined || (detail.tabId = tabId),
		
		browser.pageAction.setTitle(detail);
		
	}
	
	showActionIcon(tabId) {
		
		browser.pageAction.show(tabId);
		
	}
	
}
class AbortableFetch extends Action {
	
	static {
		
		this.$ac = Symbol('AbortableFetch.ac'),
		this.$afAbortedOption = Symbol('AbortableFetch.afAbortedOption'),
		
		this[this.$afAbortedOption] = { once: true },
		
		this[Logger.$name] = '🚨-📥';
		
	}
	
	static aborted(event) {
		
		this.log('"Fetching was aborted."', event);
		
	}
	
	static async toTextFromStream({ body }) {
		
		const td = new TextDecoder();
		let text;
		
		text = '';
		for await (const chunk of body) text += td.decode(chunk);
		
		return text;
		
	}
	
	static throwError() {
		
		throw new Error(...arguments);
		
	}
	
	static toAB(response) {
		
		return response.arrayBuffer();
		
	}
	static toJSON(response) {
		
		return response.json();
		
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
	fetchAB(url, option, throws) {
		
		return this.fetchWith(url, option, throws, AbortableFetch.toAB);
		
	}
	fetchJSON(url, option, throws) {
		
		return this.fetchWith(url, option, throws, AbortableFetch.toJSON);
		
	}
	fetchStreamText(url, option, throws) {
		
		return this.fetchWith(url, option, throws, AbortableFetch.toTextFromStream);
		
	}
	fetchText(url, option, throws) {
		
		return this.fetchWith(url, option, throws, AbortableFetch.toText);
		
	}
	fetchWith(url, option, throws = true, handler) {
		
		const { throwError } = AbortableFetch, fetching = this.fetch(url, option).then(handler);
		
		return throws ? fetching.catch(AbortableFetch.throwError) : fetching;
		
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
class RadicoSession extends Action {
	
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
class RadicoPlaylistFetch extends AbortableFetch {
	
	static {
		
		this.$cookie = Symbol('RadicoPlaylistFetch.cookie'),
		this.$reqHeaders = Symbol('RadicoPlaylistFetch.reqHeaders'),
		this.$resHeaders = Symbol('RadicoPlaylistFetch.resHeaders'),
		
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
		
		this[Logger.$name] = '📻-🎼';
		
	}
	
	static composeURL(url) {
		
		if (url instanceof URL || (url = URL.canParse(url) && (url = new URL(url)))) {
			
			const	{ host, password, pathname, port, protocol, username } = url;
			
			return url && `${protocol}\/\/${username || password ? `${username}:${password}@` : ''}${host}${pathname}`;
			
		}
		
		return null;
		
	}
	
	static extractURLsFromM3U8(m3u8) {
		
		const urls = [];
		let i;
		
		i = -1;
		for (const v of m3u8.matchAll(RadicoPlaylistFetch.rxM3U8Url)) urls[++i] = v[1];
		
		return urls;
		
	}
	
	static getLastPathFromURL(url) {
		
		const endOfURL = (typeof url === 'string' ? url : (url = url.toString())).indexOf('?');
		
		return endOfURL === -1 ?	url.substring(url.lastIndexOf('/') + 1) :
											url.slice(url.lastIndexOf('/') + 1, endOfURL - 1);
		
	}
	//static getLastPathFromURL(url) {
	//	
	//	url instanceof URL || (url = new URL(url));
	//	
	//	const { pathname } = url;
	//	
	//	return pathname.substring(pathname.lastIndexOf('/') + 1);
	//	
	//}
	
	constructor(session) {
		
		super();
		
		this.setSession(session);
		
	}
	
	//convertToXmlDate() {
	//	
	//	const { tableDate } = this, rd = new RadicoDate(...arguments), hours = rd.getHours();
	//	
	//	tableDate === rd.toDateString().substring(0, 7) && hours > -1 && hours < 5 &&
	//		rd.setTime(rd.getTime() + 86400000);
	//	
	//	//const hours = (rd instanceof RadicoDate ? rd : (rd = new RadicoDate(...arguments))).getHours();
	//	//
	//	//(hours > -1 || hours < 5) && rd.setTime(rd.getTime() + 86400000);
	//	
	//	return rd;
	//	
	//}
	//convertToXmlDate(rd) {
	//	
	//	const hours = (rd instanceof RadicoDate ? rd : (rd = new RadicoDate(...arguments))).getHours();
	//	
	//	(hours > -1 || hours < 5) && rd.setTime(rd.getTime() + 86400000);
	//	
	//	return rd;
	//	
	//}
	
	createPlaylistURLFromPrg(prg) {
		
		if (prg = this.isPrg(prg)) {
			
			const { cookie } = this, a_exp = cookie?.get?.('a_exp');
			
			if (a_exp) {
				
				const	{ maxChunkLength, urlPlaylist } = RadicoPlaylistFetch,
						{ ft, to } = prg,
						param = new URLSearchParams(''),
						values =	[
										{ k: 'station_id', v: this.stationId },
										{ k: 'start_at', v: ft },
										{ k: 'ft', v: ft },
										{ k: 'end_at', v: to },
										{ k: 'to', v: to },
										{ k: 'l', v: maxChunkLength },
										{ k: 'lsid', v: cookie?.get?.('a_exp') },
										{ k: 'type', v: 'b' }
									];
				
				for (const { k, v } of new KV(values)) param.set(k, v);
				
				return new URL(urlPlaylist + '?' + param);
				
			}
			
		}
		
		return null;
		
	}
	
	extractURLsFromM3U8(url, option, throws) {
		
		return this.fetchStreamText(url, option, throws).then(RadicoPlaylistFetch.extractURLsFromM3U8);
		
	}
	
	getPlaylistFetchOption() {
		
		const	{ cookie, resHeaders } = this,
				defaultAreaId = cookie?.get?.('default_area_id'),
				authtoken = resHeaders?.get?.('x-radiko-authtoken');
		
		return	defaultAreaId && authtoken ?
						{ headers: { 'X-Radiko-AreaId': defaultAreaId, 'X-Radiko-AuthToken': authtoken } } : null;
		
	}
	
	async fetchPlaylist(prg) {
		
		if (prg = this.isPrg(prg)) {
			
			const	{ maxChunkLength } = RadicoPlaylistFetch,
					{ duration, startTime, to } = prg,
					{ groupCollapsed, groupEnd, log } = this,
					url = this.createPlaylistURLFromPrg(prg),
					param = url.searchParams,
					option =	this.getPlaylistFetchOption(),
					l = parseInt(duration / maxChunkLength),
					rd = new RadicoDate(),
					fetched = [];
			let i, length, remains, exceeds, currentDuration;
			
			i = -1, groupCollapsed(`"📤 Extracting URLs from ${url}."`), currentDuration = 0;
			while (++i <= l && (remains = duration - i * maxChunkLength) > 0) {
				
				param.set('l', length = (exceeds = remains < maxChunkLength) ? remains : maxChunkLength),
				rd.setTime(startTime + (exceeds ? duration - length : length * i) * 1000),
				param.set('seek', rd.toString()),
				
				log(`"${exceeds ? '⌛' : '⏳'} ${i}/${l} [Seek: ${param.get('seek')}, Duration(sec.): [Accumulation: ${currentDuration += length}/${duration}, Length: ${length})]]"`),
				
				await	this.extractURLsFromM3U8(url, option).then(urls => this.extractURLsFromM3U8(urls[0])).
							then(urls => fetched.push(...urls));
				
			}
			groupEnd();
			
			return fetched;
			
		}
		
	}
	
	//async request(prg) {
	//	
	//	if (prg instanceof RadicoPrgFetch ? prg : (prg = this.getPrgByFt(prg))) {
	//		
	//		const	{ throwError } = AbortableFetch,
	//				{ getLastPathFromURL, maxChunkLength, metaBlobOption, rxPicExt } = RadicoPlaylistFetch,
	//				{ dateLabel, duration, ft, ftl, imgExt, imgURL, prgDateStr, startTime, title, to, tol } = prg,
	//				{ cookie, log, reqHeaders, resHeaders, stationId, tabId } = this,
	//				stLabel = this.getStLabel(),
	//				prgFileName = stLabel + ' ' + title + ' – ' + dateLabel,
	//				prgImgFileName = prgFileName + '.' + imgExt,
	//				current =	{
	//									dateLabel, duration, ft, ftl, imgExt, imgURL, prgDateStr, startTime, title, to, tol,
	//									cookie, log, reqHeaders, resHeaders, stationId, tabId
	//								};
	//		let i, length, remained, exceeds, dlUrl, pathname, concat,concatPath, currentDuration, url, zipped;
	//		
	//		const playlist = await this.fetchPlaylist(prg), playlistLength = playlist.length;
	//		
	//		i = -1, this.groupCollapsed(`"📥 Downloading ${playlistLength} files... (${getLastPathFromURL(dlUrls[0])} – ${getLastPathFromURL(dlUrls[playlistLength - 1])})"`);
	//		while (++i < playlistLength)	log(`📥 ${i + 1}/${playlistLength}. `, playlist[i]),
	//												await	this.fetchAB(url = playlist[i]);
	//		this.groupEnd(),
	//		
	//		log(`"📁 Zipping files into <${prgFileName}.zip>..."`, );
	//		
	//	}
	//	
	//	return Promise.reject();
	//	
	//}
	
	getPrgByFt(ft) {
		
		return new RadicoPrgFetch(this.querySelector(`prog[ft="${ft}"]`) ?? ft);
		
	}
	
	isPrg(prg) {
		
		return prg instanceof RadicoPrgFetch ? prg : this.getPrgByFt(prg);
		
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
	
	querySelector(selector) {
		
		return this.dom?.querySelector?.(selector);
		
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
		
		return Binder.getCookie(this[RadicoPlaylistFetch.$cookie]);
		
	}
	set cookie(v) {
		
		this[RadicoPlaylistFetch.$cookie] = v;
		
	}
	get tableDate() {
		
		return this.dom?.querySelector?.('date')?.textContent ?? '';
		
	}
	get reqHeaders() {
		
		const v = this[RadicoPlaylistFetch.$reqHeaders];
		
		return new KV(v && typeof v === 'object' ? v : {}, 'name', 'value');
		
	}
	set reqHeaders(v) {
		
		this[RadicoPlaylistFetch.$reqHeaders] = v;
		
	}
	
	get resHeaders() {
		
		const v = this[RadicoPlaylistFetch.$resHeaders];
		
		return new KV(v && typeof v === 'object' ? v : {}, 'name', 'value');
		
	}
	set resHeaders(v) {
		
		this[RadicoPlaylistFetch.$resHeaders] = v;
		
	}
	
}
class RadicoFetch extends RadicoPlaylistFetch {
	
	static {
		
		this[Logger.$name] = '📻-📥';
		
	}
	
	constructor(session) {
		
		super(session);
		
	}
	
	getPrgLabel(prg, withDate) {
		
		const { stLabel } = this;
		
		if (arguments.length > 1) {
			
			const title = (prg = this.isPrg(prg)) === false ? prg : prg.title, label = stLabel + (title ? ' ' + title : '');
			
			return title ?	label + (typeof withDate === 'string' ? withDate : ' – ') + prg.dateLabel :
								label + (typeof withDate === 'string' ? withDate : ' ') + prg.dateLabel;
			
		} else return stLabel + ((prg = (prg === false ? '' : this.isPrg(prg).title)) ? '' : ' ' + prg);
		
	}
	
	async request(prg) {
		
		const	{ createObjectURL, revokeObjectURL } = URL,
				{ throwError } = AbortableFetch,
				{ getLastPathFromURL, rxPicExt } = RadicoPlaylistFetch,
				{ downloads, runtime } = browser,
				{ dateLabel, duration, imgExt, imgURL } = (prg = this.isPrg(prg)),
				{ error, groupCollapsed, groupEnd, log, tabId } = this,
				label = this.getPrgLabel(prg, true),
				name = ' – ' + this.getPrgLabel(prg),
				zip = new JSZip(),
				prgFolder = zip.folder(label);
		let i, url, filName, concat, zipped;
		
		this.setActionTitle(`📤 プレイリストから情報を抽出中...${name}`, tabId);
		
		const playlist = await this.fetchPlaylist(prg), playlistLength = playlist.length;
		
		this.setActionTitle(`⏳ ダウンロード中... 時間がかかる場合があります${name}`, tabId),
		
		i = -1, concat = '',
		groupCollapsed(`"📥 Downloading ${playlistLength} files... (${getLastPathFromURL(playlist[0])} – ${getLastPathFromURL(playlist[playlistLength - 1])})"`);
		while (++i < playlistLength) log(`📥 ${i + 1}/${playlistLength}. `, playlist[i]),
												await	this.fetchAB(url = playlist[i], undefined, false).
													then(ab => prgFolder.file('aac/' + (filName = getLastPathFromURL(url)), ab)).
														catch(throwError),
												concat += `file '.\\aac\\${filName}'\n`;
		groupEnd(),
		
		this.setActionTitle(`📂 ファイルの作成中...${name}`, tabId);
		
		// metadata
		prgFolder.file(label + '.json', prg.toJSON(null, '\t')),
		
		// img
		await	prg.fetchImg(undefined, false).then(ab => prgFolder.file(label + '.' + imgExt, ab)).catch(error),
		
		// bat
		await this.fetchText(runtime.getURL('resources/concat.bat'), undefined, false).
			then(text => prgFolder.file('concat.bat', text.replaceAll(rxPicExt, `$1${imgExt}`))).catch(error)
		
		prgFolder.file(label + '.txt', concat),
		
		await zip.generateAsync
			(
				{ type: 'blob' },
				({ percent }) => this.setActionTitle(`${percent|0}% 圧縮...${name}`, tabId)
			).then(blob => (zipped = blob)).catch(throwError);
		
		return	downloads.download({ filename: label + '.zip', saveAs: true, url: createObjectURL(zipped) }).
						catch(error).finally(() => (revokeURLObject(zipped), zipped));
		
	}
	
	get stLabel() {
		
		return '[' + this.stationId + ']';
		
	}
	
}
class RadicoDate extends Date {
	
	static {
		
		this.URL = 'https://radiko.jp/v3/program/station/date/',
		
		this[Logger.$name] = '📻-⏰';
		
	}
	
	static {
		
		this.rxRadicoDateStr = /(\d{4})([01]\d)([0-3]\d)([0-2]\d)([0-5][0-9])([0-5][0-9])/;
		
	}
	
	static convertToRadicoPrgDate() {
		
		return new RadicoDate(...arguments).toProgramDate();
		
	}
	
	static createFromRadicoDateStr(rds) {
		
		return new RadicoDate(RadicoDate.createFromRadicoDateStr(rds));
		
	}
	
	static getDateStrByRadicoDateStr(rds) {
		
		return	typeof (rds instanceof RadicoDate ? (rds = ''+rds) : rds) === 'string' &&
						RadicoDate.rxRadicoDateStr.test(rds) ?
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
		
		return RadicoDailyTableFetch.URL + date.toProgramDate() + '/' + stationId + '.xml';
		
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
	
	async fetchImg(option, throws) {
		
		let imgAB;
		
		await this.fetchAB(this.imgURL, option, throws).then(ab => (imgAB = ab));
		
		return imgAB;
		
	}
	
	setDOM(dom) {
		
		return dom instanceof Node ? (this.dom = dom) : this.dom;
		
	}
	
	toObject() {
		
		return Binder.DOMToObject(this.dom);
		
	}
	
	toJSON(replacer, space) {
		
		let json;
		
		try {
			
			json = JSON.stringify(this.toObject(), replacer, space);
			
		} catch (error) {
			
			json = `"${error.toString()}"`, this.error(error);
			
		}
		
		return json;
		
	}
	
	get dateLabel() {
		
		const { ftl, ftPrgDateStr, tol } = this;
		
		return	ftPrgDateStr.substring(0, 4) + '-' +
					ftPrgDateStr.substring(4, 6) + '-' +
					ftPrgDateStr.substring(6, 8) + ' ' +
					ftl + '-' + tol;
		
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
		
		return this.ftDate?.toProgramDate?.();
		
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