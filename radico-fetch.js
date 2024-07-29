class RadicoDate extends Date {
	
	static {
		
		this.rxRadicoDateStr = /(\d{4})([01]\d)([0-3]\d)([0-2]\d)([0-5][0-9])([0-5][0-9])/;
		
		this[Logger.$name] = '📻-⏰';
		
	}
	
	static convertToLocaleISODateString(z, date) {
		
		date = date instanceof Date ? new Date(date.getTime()) : new Date(...Array.from(arguments).slice(1)),
		
		Number.isNaN(z = parseInt(z)) && (z = date.getTimezoneOffset()),
		
		date.setTime(date.getTime() - z * 60000);
		
		const { abs } = Math, zH = parseInt(z / -60);
		
		return	date.toISOString().substring(0,19) + (z > 0 ? '-' : '+') +
						zH.toString().padStart(2, '0') + ':' + (abs(z) - abs(zH * 60)).toString().padStart(2, '0');
		
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
	
	toLocaleISODateString(z = this.getTimezoneOffset(), date = this, ...args) {
		//https://api.radiko.jp/music/api/v1/noas/INT?start_time_gte=2024-01-23T02:54:00+09:00&end_time_lt=2024-01-23T03:00:00+09:00
		// 2024-01-23T02:54:00+09:00
		hi(date,arguments);
		return RadicoDate.convertToLocaleISODateString(z, date, ...args);
		
	}
	
	toProgramDate() {
		
		const hours = this.getHours();
		
		return (hours > -1 && hours < 5 ? new RadicoDate(this.getTime() - 86400000) : this).toDateString();
		
	}
	
	toString() {
		
		return `${this.getFullYear()}${(this.getMonth() + 1 + '').padStart(2, '0')}${(this.getDate()+'').padStart(2, '0')}${(this.getHours()+'').padStart(2, '0')}${(this.getMinutes()+'').padStart(2, '0')}${(this.getSeconds()+'').padStart(2, '0')}`;
		
	}
	
}

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
	
	static composeURL(url) {
		
		if (url instanceof URL || (url = URL.canParse(url) && (url = new URL(url)))) {
			
			const	{ host, password, pathname, port, protocol, username } = url;
			
			return url && `${protocol}\/\/${username || password ? `${username}:${password}@` : ''}${host}${pathname}`;
			
		}
		
		return null;
		
	}
	
	static getExtensionFromURL(url) {
		
		return (url instanceof URL ? url : new URL(url))?.pathname?.split?.('.')?.at?.(-1);
		
	}
	
	static getLastPathFromURL(url) {
		
		const endOfURL = (typeof url === 'string' ? url : (url = url.toString())).indexOf('?');
		
		return endOfURL === -1 ?	url.substring(url.lastIndexOf('/') + 1) :
											url.slice(url.lastIndexOf('/') + 1, endOfURL - 1);
		
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
class RadicoSessionFetch extends Action {
	
	static {
		
		this.$cookie = Symbol('RadicoSessionFetch.cookie'),
		this.$ftDate = Symbol('RadicoSessionFetch.ftDate'),
		this.$reqHeaders = Symbol('RadicoSessionFetch.reqHeaders'),
		this.$resHeaders = Symbol('RadicoSessionFetch.resHeaders'),
		this.$session = Symbol('RadicoSessionFetch.$session'),
		
		this[Logger.$name] = '📻-🎟️',
		
		Object.defineProperty(
			this.prototype,
			this.$session,
			{
				get() {
					
					return this;
					
				},
				set(v) {
					
					v && typeof v === 'object' && Object.assign(this, v);
					
				}
			}
		);
		
	}
	
	constructor(session, ...args) {
		
		super(...args);
		
		const { $cookie, $reqHeaders, $resHeaders, $session } = RadicoSessionFetch;
		
		this[$cookie] = new KV(),
		this[$reqHeaders] = new KV(),
		this[$resHeaders] = new KV(),
		
		this[$session] = session;
		
	}
	
	get cookie() {
		
		return this[RadicoSessionFetch.$cookie];
		
	}
	set cookie(v) {
		
		if (v && typeof v === 'string') {
			
			const cookie = this[RadicoSessionFetch.$cookie];
			
			cookie.length = 0,
			
			Binder.getCookie(v, cookie);
			
		}
		
	}
	get ft() {
		
		return this[RadicoSessionFetch.$ft];
		
	}
	set ft(v) {
		
		this[RadicoSessionFetch.$ft] === v || (this.ftDate = v);
		
	}
	get ftDate() {
		
		return this[RadicoSessionFetch.$ftDate];
		
	}
	set ftDate(v) {
		
		this[RadicoSessionFetch.$ft] =
			(this[RadicoSessionFetch.$ftDate] = Array.isArray(v) ? new RadicoDate(...v) : new RadicoDate(v)).toString();
		
	}
	get reqHeaders() {
		
		return this[RadicoSessionFetch.$reqHeaders];
		
	}
	set reqHeaders(v) {
		
		typeof v[Symbol.iterator] === 'function' && this[RadicoSessionFetch.$reqHeaders].addAll(v, 'name', 'value');
		
	}
	get resHeaders() {
		
		return this[RadicoSessionFetch.$resHeaders];
		
	}
	set resHeaders(v) {
		
		typeof v[Symbol.iterator] === 'function' && this[RadicoSessionFetch.$resHeaders].addAll(v, 'name', 'value');
		
	}
	
}
class RadicoStationFetch extends AbortableFetch {
	
	static {
		
		this.$session = Symbol('RadicoStationFetch.session'),
		
		this[Logger.$name] = '📻-🚉';
		
	}
	
	constructor(session, ...args) {
		
		super(...args);
		
		this.session = session;
		
	}
	
	update(session, url, option, throws) {
		
		this.session = session;
		
		return this.fetch(url ?? this.url, option, throws).then(AbortableFetch.toJSON).then(json => (this.json = json));
		
	}
	
	get session() {
		
		return this[RadicoStationFetch.$session];
		
	}
	set session(v) {
		
		v && typeof v === 'object' &&
			(this[RadicoStationFetch.$session] = v instanceof RadicoSessionFetch ? v : new RadicoSessionFetch(v));
		
	}
	
	get station() {
		
		const { json: { stations }, session: { stationId } } = this, stationsLength = stations.length;
		let i, v;
		
		i = -1;
		while (++i < stationsLength && (v = stations[i]).station_id !== stationId);
		
		return i === stationsLength ? null : v;
		
	}
	
	get url() {
		
		const { session: { ftDate, stationId } } = this, dateStr = ftDate?.toProgramDate?.();
		hi(this.session, ftDate, dateStr, stationId);
		// 以下の this.constructor.url が返す値は継承先で任意に実装する必要がある。
		// つまりこのオブジェクト単体では、第二引数 url に任意の値を指定しない限り、通常は機能しない。
		return dateStr && stationId ? this.constructor.URL + dateStr + '/' + stationId + '.json' : '';
		
	}
	
}
class RadicoTableFetch extends RadicoStationFetch {
	
	static {
		
		this[Logger.$name] = '📻-🧮';
		
	}
	
	constructor() {
		
		super(...arguments);
		
	}
	
	getProgramByFt(ft) {
		
		const { station: { programs: { program } } } = this;
		
		if (Array.isArray(program)) {
			
			const programLength = program.length;
			let i, v;
			
			i = -1;
			while (++i < programLength && (v = program[i]).ft !== ft);
			
			return i === programLength ? null : new RadicoPrgFetch(v);
			
		}
		
		return null;
		
	}
	
	toPrg(prg) {
		
		return prg instanceof RadicoPrgFetch ? prg : this.getProgramByFt(prg);
		
	}
	
	get tableDate() {
		
		const v = this.station?.date;
		
		return v && new RadicoDate(v.padEnd(14, '0'));
		
	}
	
}
class RadicoPlaylistFetch extends RadicoTableFetch {
	
	static {
		
		this.rxM3U8Url = /^(https:\/\/.*?)$/gm,
		
		this.maxChunkLength = 300,
		
		this.urlPlaylist = 'https://tf-f-rpaa-radiko.smartstream.ne.jp/tf/playlist.m3u8',
		
		this[Logger.$name] = '📻-🎼';
		
	}
	
	static extractURLsFromM3U8(m3u8) {
		
		const urls = [];
		let i;
		
		i = -1;
		for (const v of m3u8.matchAll(RadicoPlaylistFetch.rxM3U8Url)) urls[++i] = v[1];
		
		return urls;
		
	}
	
	constructor() {
		
		super(...arguments);
		
	}
	
	createPlaylistFetchParam(prg) {
		
		const { session: { cookie, stationId } } = this, { ft, to } = prg;
		
		return	[
						{ k: 'station_id', v: stationId },
						{ k: 'start_at', v: ft },
						{ k: 'ft', v: ft },
						{ k: 'end_at', v: to },
						{ k: 'to', v: to },
						{ k: 'l', v: RadicoPlaylistFetch.maxChunkLength },
						{ k: 'lsid', v: cookie?.get?.('a_exp') },
						// この値の定義は不明。
						{ k: 'type', v: 'b' }
					];
		
	}
	
	createPlaylistURLFromPrg(prg) {
		
		if (prg = this.toPrg(prg)) {
			
			const { urlPlaylist } = RadicoPlaylistFetch, param = new URLSearchParams('');
			
			for (const { k, v } of this.createPlaylistFetchParam(prg)) v && param.set(k, v);
			
			return new URL(urlPlaylist + '?' + param);
			
		}
		
		return null;
		
	}
	
	extractURLsFromM3U8(url, option, throws) {
		
		return this.fetchStreamText(url, option, throws).then(RadicoPlaylistFetch.extractURLsFromM3U8);
		
	}
	
	async fetchPlaylist(prg, pingTabId) {
		
		if (prg = this.toPrg(prg)) {
			
			const	{ maxChunkLength } = RadicoPlaylistFetch,
					{ duration, startTime, to } = prg,
					{ groupCollapsed, groupEnd, log, playlistFetchOption: option } = this,
					url = this.createPlaylistURLFromPrg(prg),
					param = url.searchParams,
					l = parseInt(duration / maxChunkLength),
					rd = new RadicoDate(),
					fetched = [];
			let i, length, remains, exceeds, currentDuration;
			
			i = -1, this.ping(pingTabId, `"📤 Extracting URLs from ${url}."`, true), currentDuration = 0;
			while (++i <= l && (remains = duration - i * maxChunkLength) > 0) {
				
				param.set('l', length = (exceeds = remains < maxChunkLength) ? remains : maxChunkLength),
				rd.setTime(startTime + (exceeds ? duration - length : length * i) * 1000),
				param.set('seek', rd.toString()),
				
				this.ping(pingTabId, `"${exceeds ? '⌛' : '⏳'} ${i}/${l} [Seek: ${param.get('seek')}, Duration(sec.): [Accumulation: ${currentDuration += length}/${duration}, Length: ${length})]]"`),
				
				await	this.extractURLsFromM3U8(url, option).then(urls => this.extractURLsFromM3U8(urls[0])).
							then(urls => fetched.push(...urls));
				
			}
			this.ping(pingTabId, undefined, false);
			
			return fetched;
			
		}
		
	}
	
	get playlistFetchOption() {
		
		const	{ session: { cookie, resHeaders } } = this,
				defaultAreaId = cookie?.get?.('default_area_id'),
				authtoken = resHeaders?.get?.('x-radiko-authtoken');
		
		return	defaultAreaId && authtoken ?
						{ headers: { 'X-Radiko-AreaId': defaultAreaId, 'X-Radiko-AuthToken': authtoken } } : null;
		
	}
	
}
class RadicoFetch extends RadicoPlaylistFetch {
	
	static {
		
		this.rxPicExt = /(set picext=)/gm,
		this.zipOption = { type: 'blob' },
		this.tuneListURL = 'https://api.radiko.jp/music/api/v1/noas/',
		
		this[Logger.$name] = '📻-📥';
		
	}
	
	constructor() {
		
		super(...arguments);
		
	}
	
	getPrgLabel(prg, withDate) {
		
		const { stLabel } = this;
		
		if (arguments.length > 1) {
			
			const title = (prg = this.toPrg(prg)) === false ? prg : prg.title, label = stLabel + (title ? ' ' + title : '');
			
			return title ?	label + (typeof withDate === 'string' ? withDate : ' – ') + prg.dateLabel :
								label + (typeof withDate === 'string' ? withDate : ' ') + prg.dateLabel;
			
		} else return stLabel + ((prg = (prg === false ? '' : this.toPrg(prg)?.title)) ? '' : ' ' + prg);
		
	}
	
	async request(prg = this.session?.ft, pingTabId) {
		
		const	{ createObjectURL, revokeObjectURL } = URL,
				{ getLastPathFromURL, throwError } = AbortableFetch,
				{ rxPicExt, tuneListURL, zipOption } = RadicoFetch,
				{ downloads, runtime, tabs } = browser,
				{ dateLabel, duration, ftDate, imgExt, imgURL, toDate } = (prg = this.toPrg(prg)),
				{ error, groupCollapsed, groupEnd, log, session: { stationId, tabId }, stLabel } = this,
				label = this.getPrgLabel(prg, true),
				name = ' – ' + this.getPrgLabel(prg),
				zip = new JSZip(),
				prgFolder = zip.folder(label);
		let i, url, filName, concat, zipped;
		
		this.setActionTitle(`📤 プレイリストから情報を抽出中...${name}`, tabId);
		
		const playlist = await this.fetchPlaylist(prg, pingTabId), playlistLength = playlist.length;
		
		this.setActionTitle(`⏳ ダウンロード中... 時間がかかる場合があります${name}`, tabId),
		
		i = -1, concat = '',
		this.ping(pingTabId, `"📥 Downloading ${playlistLength} files... (${getLastPathFromURL(playlist[0])} – ${getLastPathFromURL(playlist[playlistLength - 1])})"`, true);
		while (++i < playlistLength)	this.ping(pingTabId, `📥 ${i + 1}/${playlistLength}. `, playlist[i]),
											await	this.fetchAB(url = playlist[i], undefined, false).
												then(ab => prgFolder.file('aac/' + (filName = getLastPathFromURL(url)), ab)).
													catch(throwError),
											concat += `file '.\\aac\\${filName}'\n`;
		this.ping(pingTabId, undefined, false),
		
		this.setActionTitle(`📂 ファイルの作成中...${name}`, tabId);
		
		//https://api.radiko.jp/music/api/v1/noas/INT?start_time_gte=2024-01-23T02:54:00+09:00&end_time_lt=2024-01-23T03:00:00+09:00
		await	this.fetchJSON(`${tuneListURL}${stationId}?start_time_gte=${ftDate.toLocaleISODateString(-540).replace('+', '%2B')}&end_time_lt=${toDate.toLocaleISODateString(-540).replace('+', '%2B')}`).
					then	(
								async json =>	{
													
													const { data } = json, dataLength = data.length;
													
													if (dataLength) {
														
														const	{ getExtensionFromURL } = AbortableFetch,
																list = prgFolder.folder('tune-list');
														let i,k, current, datum, id, fn, image, url;
														
														i = -1;
														while (++i < dataLength) {
															
															current =
																list.folder(id = stLabel + ' ' + (datum = data[i]).id.replace('T', ' ').replaceAll(':', '-')),
															fn = datum.title + ' – ' + datum.artist_name;
															
															for (k in (image = datum.music.image))
																await	this.fetchAB(url = image[k]).
																			then(ab => current.file(`${fn}.${k}.${getExtensionFromURL(url)}`, ab));
															
															current.file(id + '.json', JSON.stringify(datum, null, '\t'));
															
														}
														
														list.file(label + '.tune-list.json', JSON.stringify(json, null, '\t'));
														
													}
													
												}
							),
		
		
		// metadata
		prgFolder.file(label + '.json', prg.toJSON(null, '\t')),
		
		// img
		await	prg.fetchImg(undefined, false).then(ab => prgFolder.file(label + '.' + imgExt, ab)).catch(error),
		
		// batch file
		await this.fetchText(runtime.getURL('resources/concat.bat'), undefined, false).
			then(text => prgFolder.file('concat.bat', text.replaceAll(rxPicExt, `$1${imgExt}`))).catch(error)
		
		prgFolder.file(label + '.txt', concat),
		
		this.ping(pingTabId, `Starting Compression... "${name}"`, true),
		await	zip.generateAsync(zipOption, ({ percent }) => (this.setActionTitle(`${percent|0}% 圧縮...${name}`, this.ping(pingTabId, `${percent|0}% compressed...`)), tabId)).
					then(blob => (zipped = blob)).catch(throwError);
		this.ping(pingTabId, undefined, false);
		
		return	downloads.download({ filename: label + '.zip', saveAs: true, url: createObjectURL(zipped) }).
						catch(error).finally(() => (revokeObjectURL(zipped), zipped));
		
	}
	
	get stLabel() {
		
		return '[' + this.session.stationId + ']';
		
	}
	
}
class RadicoDailyTableFetch extends RadicoFetch {
	
	static {
		
		this.URL = 'https://radiko.jp/v4/program/station/date/',
		
		this[Logger.$name] = '📻-📆';
		
	}
	
	constructor() { super(...arguments); }
	
}

class RadicoPrgFetch extends AbortableFetch {
	
	static {
		
		this.$ftDate = Symbol('RadicoPrgFetch.ftDate'),
		this.$json = Symbol('RadicoPrgFetch.json'),
		this.$toDate = Symbol('RadicoPrgFetch.toDate'),
		
		this[Logger.$name] = '📻-🎙️';
		
	}
	
	constructor(json, ...args) {
		
		super(...args);
		
		const { $ftDate, $toDate } = RadicoPrgFetch;
		
		this[$ftDate] = new RadicoDate(),
		this[$toDate] = new RadicoDate(),
		
		this.json = json;
		
	}
	
	async fetchImg(option, throws) {
		
		let imgAB;
		
		await this.fetchAB(this.imgURL, option, throws).then(ab => (imgAB = ab));
		
		return imgAB;
		
	}
	
	toJSON(replacer, space) {
		
		let json;
		
		try {
			
			json = JSON.stringify(this.json, replacer, space);
			
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
		
		return this.json?.ft ?? '';
		
	}
	get ftDate() {
		
		const v = this.ft, date = v && this[RadicoPrgFetch.$ftDate];
		
		return date ? (date.setRadicoDateStr(v), date) : '';
		
	}
	get ftPrgDateStr() {
		
		return this.ftDate?.toProgramDate?.();
		
	}
	get ftl() {
		
		return this.json?.ftl ?? '';
		
	}
	get imgURL() {
		
		return this.json?.img ?? null;
		
	}
	get imgExt() {
		
		return AbortableFetch.getExtensionFromURL(this.imgURL);
		
	}
	get json() {
		
		const v = this[RadicoPrgFetch.$json];
		
		return v && typeof v === 'object' ? v : null;
		
	}
	set json(json) {
		
		if (typeof json === 'string') {
			
			try {
				
				json = JSON.parse(json);
				
			} catch (error) {
				
				this.error(error);
				
				return;
				
			}
			
		}
		
		json && typeof json === 'object' && (this[RadicoPrgFetch.$json] = json);
		
	}
	get startTime() {
		
		return this.ftDate.getTime();
		
	}
	get to() {
		
		return this.json?.to ?? '';
		
	}
	get toDate() {
		
		const v = this.to, date = v && this[RadicoPrgFetch.$toDate];
		
		return date ? (date.setRadicoDateStr(v), date) : '';
		
	}
	get tol() {
		
		return this.json?.tol ?? '';
		
	}
	get prgDateStr() {
		
		return this.toDate.toProgramDate();
		
	}
	get title() {
		
		return this.json?.title ?? '';
		
	}
	
}