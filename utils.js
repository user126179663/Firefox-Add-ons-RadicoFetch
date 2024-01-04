const
hi = console.log.bind(console, '📍');

class KV extends Array {
	
	static {
		
		this.$k = Symbol('KV.$k'),
		this.$v = Symbol('KV.$v');
		
	}
	
	static get(element) {
		
		return element?.[KV.$v];
		
	}
	
	static set(element, v) {
		
		element && typeof element === 'object' && (element[KV.$k] = v);
		
	}
	
	constructor(values, kName, vName) {
		
		super();
		
		this.addAll(values, kName, vName);
		
	}
	
	*[Symbol.iterator]() {
		
		const { $k, $v } = KV, l = this.length;
		let i;
		
		i = -1;
		while (++i < l) yield { k: this[i][$k], v: this[i][$v] };
		
	}
	
	add(k, v) {
		
		this.replace(k, v);
		
	}
	
	addAll(values, kName = 'k', vName = 'v', replaces) {
		
		if (typeof values?.[Symbol.iterator] === 'function') {
			
			const { $v } = KV, l = values.length;
			let i,i0, v;
			
			i = -1, i0 = this.length;
			while (++i < l)	this[replaces ? 'replace' : 'append']
										((v = (v = values[i]) && typeof v === 'object' ? { ...v } : { v })[kName], v[vName]);
			
		}
		
	}
	
	append(k, v) {
		
		this.replace(k, v, true);
		
	}
	
	delete(k) {
		
		return (k = this.indexOf(k)) === -1 ? undefined : this.splice(k, 1);
		
	}
	
	get(k, asElement) {
		
		return (k = this.indexOf(k)) === -1 ? undefined : asElement ? this[k] : this[k][KV.$v];
		
	}
	
	has(k) {
		
		return this.indexOf(k) !== -1;
		
	}
	
	indexOf(k) {
		
		const { $k } = KV, l = this.length;
		let i;
		
		i = -1;
		while (++i < l && this[i][$k] !== k);
		
		return i === l ? -1 : i;
		
	}
	
	replace(k = Symbol(), v, offset) {
		
		const { $k, $v } = KV, index = this.indexOf(k);
		let element;
		
		index === -1 ?
			(this[offset !== true && typeof offset === 'number' ? offset : this.length] = { [$k]: k, [$v]: v }) :
			offset !== true && (typeof offset !== 'number' || index === offset) ?
				(element[$v] = v) :
				(
					(element = this.splice(index, 1)[0])[$v] = v,
					offset === true && (offset = this.length),
					offset < this.length ? this.splice(offset, 0, element) : (this[offset] = element)
				);
		
		return element;
		
	}
	
}
class Mirror {
	
	constructor(target, thisArgument, ...argumentsList) {
		
		this.target = target,
		this.thisArgument = thisArgument,
		this.argumentsList = argumentsList;
		
	}
	
	reflect(target = this.target, thisArgument = this.thisArgument, ...argumentsList) {
		
		argumentsList.length || (argumentsList = this.argumentsList);
		
		return Reflect.apply(target, thisArgument, argumentsList);
		
	}
	
}
class Logger {
	
	static {
		
		this.$args = Symbol('Logger.args'),
		this.$info = Symbol('Logger.info'),
		this.$log = Symbol('Logger.log'),
		this.$name = Symbol('Logger.name'),
		this.$nameBody = Symbol('Logger.nameBody'),
		this.$namePrefix = Symbol('Logger.namePrefix'),
		this.$nameSuffix = Symbol('Logger.nameSuffix'),
		this.$warn = Symbol('Logger.warn');
		
	}
	
	static *[Symbol.iterator]() {
		
		const { getPrototypeOf } = Object;
		let constructor;
		
		yield (constructor = this);
		
		while (constructor = getPrototypeOf(constructor)) yield constructor;
		
	}
	
	static getConsole(method, ...args) {
		
		return console[method]?.bind?.(console, ...args);
		
	}
	
	static getLogName() {
		
		const { $nameBody, $namePrefix, $nameSuffix } = Logger;
		
		return this[$namePrefix] + this[$nameBody] + this[$nameSuffix];
		
	}
	
	constructor() {
		
		const { $info, $log, $name, $warn, getConsole } = Logger;
		
		this.info = getConsole('info', ...this.getLogArgs($info)),
		this.log = getConsole('log', ...this.getLogArgs($log)),
		this.warn = getConsole('warn', ...this.getLogArgs($warn));
		
	}
	
	getLogName() {
		
		const { $nameBody, $namePrefix, $nameSuffix } = Logger, { constructor } = this;
		
		return constructor[$namePrefix] + constructor[$nameBody] + constructor[$nameSuffix];
		
	}
	
	getLogArgs(args) {
		
		const { $args } = Logger;
		let kv;
		
		for (const constructor of this.constructor) {
			
			if ((kv = constructor[$args]) instanceof Array) {
				
				for (const { target, value } of kv) args = this.replaceLogValue(args, target, value) ?? args;
				
			}
			
		}
		
		return args;
		
	}
	
	replaceLogValue(args, target, value) {
		
		if (Array.isArray(typeof args === 'symbol' ? (args = this.constructor[args]) : args)) {
			
			let i;
			
			i = -1, args = [ ...args ];
			while ((i = args.indexOf(target, i + 1)) !== -1)
				args[i] = typeof value === 'function' ? value.call(this) :
					value instanceof Mirror ? value.reflect(undefined, value.thisArgument ?? this) : value;
			
			return args;
			
		}
		
	}
	
}
Logger[Logger.$args] = [
	{ target: Logger.$name, value: new Mirror(Logger.prototype.getLogName) }
],
Logger[Logger.$namePrefix] = '/',
Logger[Logger.$nameSuffix] = Logger[Logger.$namePrefix],
Logger[Logger.$nameBody] = 'LOGGER',
Logger[Logger.$info] = [ Logger.$name ],
Logger[Logger.$log] = [ Logger.$name ],
Logger[Logger.$warn] = [ Logger.$name ];

class WXLogger extends Logger {
	
	static {
		
		this.$icon = Symbol('WXLogger.icon'),
		this.$logPad = Symbol('WXLogger.logPad'),
		
		this[Logger.$namePrefix] = '<',
		this[Logger.$nameSuffix] = '>',
		this[Logger.$nameBody] = 'WX';
		
	}
	
	constructor() {
		
		super();
		
	}
	
	getWXLogIcon() {
		
		return this.constructor[WXLogger.$icon];
		
	}
	
}
WXLogger[Logger.$args] = [
	{ target: WXLogger.$icon, value: new Mirror(WXLogger.prototype.getWXLogIcon) }
],
WXLogger[WXLogger.$icon] = '󠁪󠁪󠁪󠀽🧩',
WXLogger[WXLogger.$logPad] = '󠁪󠁪󠁪󠀽▫️',
WXLogger[Logger.$info] = WXLogger[Logger.$log] = WXLogger[Logger.$warn] = [ WXLogger.$icon, Logger.$name ];