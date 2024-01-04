const
hi = console.log.bind(console, '📍');

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
// bind と少し似ているが、bind は実行時に関数の各種実行コンテキストを動的に変化させられないため柔軟性に欠ける。
class Mirror {
	
	constructor(target, thisArgument, ...argumentsList) {
		
		this.target = target,
		this.thisArgument = thisArgument,
		this.argumentsList = argumentsList;
		
	}
	
	// 引数に与えられたプロパティを優先して使い Reflet.apply() を実行する。
	// 引数が与えられない時はインスタンスの、対応するプロパティで代替して実行する。
	reflect(target = this.target, thisArgument = this.thisArgument, ...argumentsList) {
		
		argumentsList.length || (argumentsList = this.argumentsList);
		
		return Reflect.apply(target, thisArgument, argumentsList);
		
	}
	
	// このメソッドに与えられた引数よりも、インスタンスのプロパティに設定された値を優先して Reflect.apply() を実行する。
	// 引数に対応するインスタンスのプロパティに値が設定されていなければ、引数の値を使って Reflect.apply() を行なう。
	// そうでなければ引数の指定を無視してインスタンスのプロパティを使って Reflect.apply() を実行する。
	weakReflect(target, thisArgument, ...argumentsList) {
		
		const { target: t = target, thisArgument: ta = thisArgument, argumentsList: al = argumentsList } = this;
		
		return Reflect.apply(t, ta, al);
		
	}
	
}
class Logger {
	
	static {
		
		this.$args = Symbol('Logger.args'),
		this.$info = Symbol('Logger.info'),
		this.$log = Symbol('Logger.log'),
		this.$name = Symbol('Logger.name'),
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
		
		return (typeof (method = console[method]) === 'function' ? method : console.log).bind(console, ...args);
		
	}
	
	static getLogName() {
		
		const { $name, $namePrefix, $nameSuffix } = Logger;
		
		return this[$namePrefix] + this[$name] + this[$nameSuffix];
		
	}
	
	constructor() {
		
		const { $info, $log, $warn, getConsole } = Logger;
		
		this.info = getConsole('info', ...this.getLogArgs($info)),
		this.log = getConsole('log', ...this.getLogArgs($log)),
		this.warn = getConsole('warn', ...this.getLogArgs($warn));
		
	}
	
	getLogName() {
		
		const { $name, $namePrefix, $nameSuffix } = Logger, { constructor } = this;
		
		return constructor[$namePrefix] + constructor[$name] + constructor[$nameSuffix];
		
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
				args[i] = typeof value === 'function' ?
					value.call(this) : value instanceof Mirror ? value.weakReflect(undefined, this) : value;
			
			return args;
			
		}
		
	}
	
}
Logger[Logger.$args] = [
	{ target: Logger.$name, value: new Mirror(Logger.prototype.getLogName) }
],
Logger[Logger.$namePrefix] = '/',
Logger[Logger.$nameSuffix] = Logger[Logger.$namePrefix],
Logger[Logger.$name] = 'LOGGER',
Logger[Logger.$info] = Logger[Logger.$log] = Logger[Logger.$warn] = [ Logger.$name ];

class WXLogger extends Logger {
	
	static {
		
		this.$icon = Symbol('WXLogger.icon'),
		this.$logPad = Symbol('WXLogger.logPad'),
		
		this[Logger.$namePrefix] = '<',
		this[Logger.$nameSuffix] = '>',
		this[Logger.$name] = 'WX';
		
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