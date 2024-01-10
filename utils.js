const hi = console.log.bind(console, '📍');

// 同一の記述子であることが期待される Object を列挙した Array を自身にコピーし
// 任意のプロパティ名とその値をペアとして、その値を取り出す仕組みを提供する。
// const descriptors = [ { key: 'a', value: 0 }, { key: 'b', value: 1 } ]
// const kv = new KV(descriptors, 'key', 'value');
// kv.addAll([ { name: 'c', data: 2, value: 2.1 }, { name: 'd', data: 3, value: 3.1 } ], 'name', 'data');
// kv.get('b') // 1
// kv.get('c') // 2
// このオブジェクトは Array を継承するが、メソッド @@Symbol.iterator() を上書きする。
// このオブジェクトをイテレーターとして実行した場合、要素の記述子のプロパティをすべてコピーした Object を順次返す。
// その際、その記述子のプロパティ名と値をそれぞれ Object のプロパティ k, v に設定する。
// そのため、仮に記述子に k, v と同名のプロパティが存在する場合、その値は上書きされる。
// ただし、この上書きはあくまでイテレーターが返す、記述子をコピーした Object に対してであり、元の記述子の同名プロパティは保たれる。
// for (const v of kv) console.log(v.k, v.v, v.value);
// // "'a', 0, 0", "'b', 1, 1", "'c', 2, 2.1", "'d', 3, 3.1" の順で表示される。
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
		let i, v;
		
		i = -1;
		while (++i < l) yield { ...(v = this[i]), k: v[$k], v: v[$v] };
		
	}
	
	// k に指定した値と同名のプロパティが存在した場合、それを v の値で上書きする。
	add(k, v) {
		
		this.replace(k, v);
		
	}
	
	addAll(values, kName = 'k', vName = 'v', replaces) {
		
		if (typeof values?.[Symbol.iterator] === 'function') {
			
			const { $v } = KV, l = values.length, offset = !replaces;
			let i,i0, v;
			
			i = -1, i0 = this.length;
			while (++i < l)
				this.replace((v = (v = values[i]) && typeof v === 'object' ? { ...v } : { v })[kName], v[vName], offset);
			
		}
		
	}
	
	// k に指定した値と同名のプロパティが存在した場合、それを削除して、最後尾に k の名前で v の値を持つプロパティを新規に追加する。
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
	
	// offset が任意の数字の時、その数字に対応する位置に要素を追加する。
	// ただし、k を持つプロパティが存在していた場合、それを削除したあとの位置の要素が置換される。
	// つまり、例えば二番目の要素の名前が k で、offset が 1 の時、
	// 二番目の要素はいったん削除され、三番目以降の要素ひとつずつ順番を詰める。
	// その後、offset が示す 1 に対応する位置の要素の前に { k, v } が追加される。
	// （上記説明は恐らく不正確で、offset の動作はあまり直感的でないことを踏まえておく必要がある）
	// offset が true の時、要素は常に最後尾に追加される。
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

// Reflect.apply() を値として指定するためのオブジェクト。
// 例えばある記述子のプロパティに関数を指定したい時、それに thisArgument や argumentsList を設定しようとすると、
// その記述子は以下のような形を取ることが考えられる。
// const descriptor = { value: { callback: doSomething, thisArgument: something, argumentsList: [ 0, 1, 2 ] } }
// この記述そのものに問題ないが、プロパティ value に関数以外の値も指定可能にするならば、
// 通常の Object と上記の関数指定記述子の Object を区別する処理を書く必要が生まれる。
// const definedValue =	descriptor.value && typeof descriptor.value === 'object' &&
// 								typeof descriptor.value.callback === 'function' ?
// 									descriptor.value.callback.apply(descriptor.value.thisArgument, descriptor.value.argumentList) : descriptor.value;
// 極端ではあるが、上記のようなコードは煩雑かつ冗長で可読性も低く、また value の値が通常の Object の時、
// 関数記述子が持つプロパティ名と重複するプロパティを設定できなくなると言う実用上の制約が強いられる。
// そのため、関数記述子の代替としてこの Mirror を使うと、上記の問題を緩和することができる。例えば上記のコードは以下のように短縮できる。
// const descriptor = { value: new Mirror(doSomething, something, [ 0, 1, 2 ]) };
// ...
// const definedValue = descriptor.value instanceof Mirror ? descriptor.value.reflect() : descriptor.value;
// // or: const definedValue = Mirror.isMirror(descriptor.value) ? descriptor.value.reflect() : descriptor.value;
// bind と少し似ているが、bind は実行時に関数の各種実行コンテキストを動的に変化させられないため柔軟性に欠ける。
class Mirror {
	
	static {
		
		this.$target = Symbol('Mirror.target'),
		this.$thisArgument = Symbol('Mirror.thisArgument'),
		this.$argumentsList = Symbol('Mirror.argumentsList');
		
	}
	
	static isMirror(target) {
		
		return target?.__proto__ === Mirror.prototype;
		
	}
	
	constructor() {
		
		this.set(...arguments);
		
	}
	
	set(target, thisArgument, argumentsList) {
		
		this.target = target,
		this.thisArgument = thisArgument,
		this.argumentsList = argumentsList;
		
	}
	
	// 引数に与えられたプロパティを優先して使い Reflet.apply() を実行する。
	// 引数が与えられない時はインスタンスの、対応するプロパティで代替して実行する。
	reflect(target = this.target, thisArgument = this.thisArgument, argumentsList, ...args) {
		
		argumentsList.length || (argumentsList = this.argumentsList);
		
		return Reflect.apply(target, thisArgument, [ ...args, ...argumentsList ]);
		
	}
	
	// このメソッドに与えられた引数よりも、インスタンスのプロパティに設定された値を優先して Reflect.apply() を実行する。
	// 引数に対応するインスタンスのプロパティに値が設定されていなければ、引数の値を使って Reflect.apply() を行なう。
	// そうでなければ引数の指定を無視してインスタンスのプロパティを使って Reflect.apply() を実行する。
	weakReflect(target, thisArgument, argumentsList, ...args) {
		
		const { target: t = target, thisArgument: ta = thisArgument, argumentsList: al = argumentsList } = this;
		
		return Reflect.apply(t, ta, [ ...args, ...al ]);
		
	}
	
	get target() {
		
		const v = this[Mirror.$target];
		
		return typeof v === 'function' ? v : null;
		
	}
	set target(v) {
		
		this[Mirror.$target] = typeof v === 'function' ? v : null;
		
	}
	get thisArgument() {
		
		return this[Mirror.$thisArgument];
		
	}
	set thisArgument(v) {
		
		this[Mirror.$thisArgument] = v;
		
	}
	get argumentsList() {
		
		const v = this[Mirror.$argumentsList];
		
		return Array.isArray(v) ? v : [ v ];
		
	}
	set argumentsList(v) {
		
		v === undefined || (this[Mirror.$argumentsList] = Array.isArray(v) ? v : [ v ]);
		
	}
	
}
class Binder {
	
	static *[Symbol.iterator]() {
		
		for (const prototype of Binder.getPrototypes(this)) yield prototype;
		
	}
	
	static getPrototypes(constructor = this) {
		
		const { getPrototypeOf } = Object, prototypes = [];
		let i;
		
		prototypes[i = 0] = constructor.prototype ? constructor : constructor.constructor;
		while (constructor = getPrototypeOf(constructor)) prototypes[++i] = constructor;
		
		return prototypes.reverse();
		
	}
	
	static getBound(target, thisArgument) {
		
		if (target && typeof target === 'object') {
			
			const { isArray } = Array, keys = Binder.ownKeys(target), keysLength = keys.length, bound = {};
			let i, k,v, thisArgument0, argumentsList;
			
			i = -1;
			while (++i < keysLength) {
				
				(v = target[k = keys[i]]) && typeof v === 'object' ?
					(thisArgument0 = v.thisArgument, argumentsList = v.argumentsList, v = v.target) :
					(thisArgument0 = thisArgument, argumentsList = undefined),
				
				typeof v === 'function' &&
					(
						bound[k] = isArray(argumentsList) ?	v.bind(thisArgument0, ...argumentsList) :
																		v.bind(thisArgument0)
					); 
				
			}
			
			return bound;
			
		}
		
	}
	
	static merge(constructor, propertyName) {
		
		if (Binder.isPrototypeOf(constructor)) {
			
			const { assign } = Object, merged = {};
			let v;
			
			for (const prototype of constructor)
				(v = prototype[propertyName]) && typeof v === 'object' && assign(merged, v);
			
			return merged;
			
		}
		
	}
	
	static ownKeys(object) {
		
		const { getOwnPropertySymbols, keys } = Object;
		
		return object && typeof object === 'object' ? [ ...getOwnPropertySymbols(object), ...keys(object) ] : [];
		
	}
	
	constructor() {}
	
	getBound(target) {
		
		return this.constructor.getBound(target, this);
		
	}
	
}
class Logger extends Binder {
	
	static {
		
		this.$args = Symbol('Logger.args'),
		this.$avoids = Symbol('Logger.avoids'),
		this.$default = Symbol('Logger.default'),
		this.$defaultLoggerArgs = Symbol('Logger.defaultLoggerArgs'),
		this.$icon = Symbol('Logger.icon'),
		this.$id = Symbol('Logger.id'),
		this.$idPrefix = Symbol('Logger.idPrefix'),
		this.$idSuffix = Symbol('Logger.idSuffix'),
		this.$label = Symbol('Logger.label'),
		this.$logger = Symbol('Logger.logger'),
		this.$name = Symbol('Logger.name'),
		this.$namePrefix = Symbol('Logger.namePrefix'),
		this.$nameSuffix = Symbol('Logger.nameSuffix'),
		this.$replacer = Symbol('Logger.replacer'),
		
		this[this.$defaultLoggerArgs] = [ this.$icon, this.$label ],
		
		this[this.$namePrefix] = this[this.$nameSuffix] = '',
		this[this.$name] = '✍',
		
		this[this.$idPrefix] = '🏷️',
		
		this[this.$label] = [ this.$namePrefix, this.$name, this.$id, this.$nameSuffix ],
		
		this[this.$replacer] = {
			
			[this.$icon](key) {
				
				return this.loggerIcon || Logger.$avoids;
				
			},
			
			[this.$id](key) {
				
				let id;
				
				if ((id = this.loggerId) !== undefined) {
					
					const { $idPrefix, $idSuffix } = Logger;
					
					id = this.getReplacedLoggerValue([ $idPrefix, id, $idSuffix ])
					
				}
				
				return id === undefined ? Logger.$avoids : id;
				
			},
			
			[this.$label](key) {
				
				return this.getReplacedLoggerValue(this.constructor[Logger.$label]);
				
			},
			
			[this.$default](key) {
				
				const v = (typeof key === 'symbol' ? this.getLoggerStrFrom(key) : key) ?? Logger.$avoids;
				
				return v instanceof Mirror ?	v.weakReflect(undefined, this, [ key ]) :
														typeof v === 'function' ? v.call(this, key) : v;
				
			}
			
		},
		
		this[this.$logger] = {
			
			dir: { args: this[this.$defaultLoggerArgs], methodName: 'dir' },
			info: { args: this[this.$defaultLoggerArgs], methodName: 'info' },
			log: { args: this[this.$defaultLoggerArgs], methodName: 'log' },
			trace: { args: this[this.$defaultLoggerArgs], methodName: 'trace' },
			warn: { args: this[this.$defaultLoggerArgs], methodName: 'warn' }
			
		};
		
	}
	
	static bindLogger(method, ...args) {
		
		return (typeof (method = console[method]) === 'function' ? method : console.log).bind(console, ...args);
		
	}
	
	static getLogger(constructor = this) {
		
		return Binder.merge(constructor, Logger.$logger);
		
	}
	
	static getReplacedLoggerValue(values, replacer) {
		
		return Logger.replaceLoggerValues(values, replacer)?.join?.('') ?? '';
		
	}
	
	static replaceLoggerValues(values, replacer) {
		
		if (Array.isArray(values) && replacer && typeof replacer === 'object') {
			
			const	{ $avoids } = Logger,
					valuesLength = values.length,
					defaultLabeler = replacer[Logger.$default],
					replaced = [];
			let i,i0, k, v;
			
			i = i0 = -1;
			while (++i < valuesLength)
				(v = typeof (v = replacer[k = values[i]] ?? defaultLabeler) === 'function' ? v(k) : v) === $avoids ||
					(replaced[i] = v);
			
			return replaced;
			
		}
		
	}
	
	constructor(id) {
		
		super();
		
		const { $replacer } = Logger;
		
		Object.assign(this[$replacer] = {}, this.getBound(Binder.merge(this.constructor, Logger.$replacer))),
		
		this.updateLogger(id);
		
	}
	
	*[Symbol.iterator]() {
		
		for (const k in this.constructor.getLogger()) yield { logger: this[k], name: k };
		
	}
	
	bindLogger(methodName, args) {
		
		const { bindLogger } = Logger;
		
		return Logger.bindLogger(methodName, ...this.replaceLoggerValues(args));
		
	}
	
	getLoggerStrFrom(propertyName) {
		
		const v = this[propertyName] ?? this.constructor[propertyName];
		
		return v === undefined ? undefined : '' + v;
		
	}
	
	getReplacedLoggerValue(values) {
		
		const { $replacer, getReplacedLoggerValue } = Logger;
		
		return getReplacedLoggerValue(values, this[$replacer]);
		
	}
	
	replaceLoggerValues(values) {
		
		const { $replacer, replaceLoggerValues } = Logger;
		
		return replaceLoggerValues(values, this[$replacer]);
		
	}
	
	updateLogger(id, ...targets) {
		
		const logger = this.constructor.getLogger(), targetsLength = targets.length;
		let k,v;
		
		this.loggerId = id;
		
		targetsLength && (Array.isArray(targets) || (targets = [ targets ]));
		for (k in logger)	(!targetsLength || targets.indexOf(k) !== -1) &&
									(this[k] = this.bindLogger((v = logger[k]).methodName, v.args));
		
	}
	
	get loggerIcon() {
		
		return this.getLoggerStrFrom(Logger.$icon);
		
	}
	set loggerIcon(v) {
		
		this[Logger.$icon] = v;
		
	}
	get loggerId() {
		
		return this.getLoggerStrFrom(Logger.$id);
		
	}
	set loggerId(v) {
		
		this[Logger.$id] = v;
		
	}
	get loggerIdPrefix() {
		
		return this.getLoggerStrFrom(Logger.$idPrefix);
		
	}
	set loggerIdPrefix(id) {
		
		this[Logger.$idPrefix] = v;
		
	}
	get loggerIdSuffix() {
		
		return this.getLoggerStrFrom(Logger.$idSuffix);
		
	}
	set loggerIdSuffix(id) {
		
		this[Logger.$idSuffix] = v;
		
	}
	get loggerName() {
		
		return this.getLoggerStrFrom(Logger.$name);
		
	}
	set loggerName(id) {
		
		this[Logger.$name] = v;
		
	}
	get loggerNamePrefix() {
		
		return this.getLoggerStrFrom(Logger.$namePrefix);
		
	}
	set loggerNamePrefix(id) {
		
		this[Logger.$namePrefix] = v;
		
	}
	get loggerNameSuffix() {
		
		return this.getLoggerStrFrom(Logger.$nameSuffix);
		
	}
	set loggerNameSuffix(id) {
		
		this[Logger.$nameSuffix] = v;
		
	}
	
}

class WXLogger extends Logger {
	
	static {
		
		this[Logger.$namePrefix] = '[',
		this[Logger.$nameSuffix] = ']',
		this[Logger.$name] = 'WX',
		
		this[Logger.$icon] = '󠁪󠁪󠁪󠀽🧩';
		
	}
	
	constructor() { super(...arguments); }
	
}