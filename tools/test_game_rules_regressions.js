"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const root = path.resolve(__dirname === "." ? process.cwd() : path.join(__dirname, ".."));
const sourceArgument = process.argv.find(argument => argument.startsWith("--source-root="));
const sourceRoot = sourceArgument ? path.resolve(sourceArgument.slice("--source-root=".length)) : root;
const gamePath = path.join(sourceRoot, "Server/lib/Game/games");
let passed = 0;

function load(file, dependencies, globals) {
	const context = Object.assign({ exports: {}, require: name => dependencies[name], console }, globals);
	vm.runInNewContext(fs.readFileSync(file, "utf8"), context, { filename: file });
	return context.exports;
}
const Const = load(path.join(root, "Server/lib/const.js"), { "./sub/global.json": { ADMIN: [] } });
const Lizard = load(path.join(root, "Server/lib/sub/lizard.js"), {});

function matches(row, queries) {
	return queries.filter(Boolean).every(([key, value]) => {
		if(value && typeof value.test === "function") return value.test(String(row[key] || ""));
		if(value && typeof value === "object") {
			if(value.$nin) return !value.$nin.includes(row[key]);
			if(value.$in) return value.$in.includes(row[key]);
			if(value.$nand !== undefined) return !(row[key] & value.$nand);
			if(value.$lte !== undefined) return row[key] <= value.$lte;
			if(value.$gte !== undefined) return row[key] >= value.$gte;
		}
		return row[key] === value;
	});
}
function environment(name, rows) {
	const timers = new Map();
	const pending = [];
	const env = { timers, pending, queries: 0, deferOne: false, deferMany: false };
	let nextTimer = 1;
	function table(items) {
		function pointer(queries, one) {
			env.queries++;
			const result = items.filter(row => matches(row, queries));
			return {
				limit() { return this; },
				on(callback) {
					const respond = () => callback(one ? result[0] || null : result.slice());
					if(one ? env.deferOne : env.deferMany) pending.push(respond);
					else respond();
				}
			};
		}
		return {
			find: (...queries) => pointer(queries, false),
			findOne: (...queries) => pointer(queries, true),
			update: () => ({ set: () => ({ on() {} }) })
		};
	}
	const manner = {
		findOne: () => ({ on: callback => callback(env.mannerRow || null) }),
		upsert: () => ({ set: () => ({ on() {} }) })
	};
	env.db = {
		kkutu: { en: table(rows || []), ko: table(rows || []) },
		kkutu_manner: { en: manner, ko: manner },
		kkutu_cw: { ko: table([]) }
	};
	env.table = table;
	env.rule = load(path.join(gamePath, name + ".js"), {
		"../../const": Const,
		"../../sub/lizard": Lizard,
		"./typing_const": { PROVERBS: { en: ["hello"], ko: ["가나"] } }
	}, {
		Math: Object.assign(Object.create(Math), { random: () => 0 }),
		setTimeout(fn, delay, ...args) {
			const id = nextTimer++;
			timers.set(id, { fn, delay, args });
			return id;
		},
		clearTimeout: id => timers.delete(id)
	});
	env.rule.init(env.db, {});
	env.respond = () => { assert(pending.length, "expected a pending dictionary lookup"); pending.shift()(); };
	env.fire = id => {
		const timer = timers.get(id);
		assert(timer, "expected a tracked timer");
		timers.delete(id);
		timer.fn(...timer.args);
	};
	return env;
}
function client(id, robot) {
	return {
		id, robot: !!robot, level: 2, _done: [], events: [], chats: [], pieces: [],
		game: { score: 0, semi: 0, chars: 0, index: 0, miss: 0 },
		publish(type, data) { this.events.push({ type, data }); },
		send(type, data) { this.events.push({ type, data }); },
		chat(text) { this.chats.push(text); },
		invokeWordPiece(text) { this.pieces.push(text); }
	};
}
function room(env, code, actor) {
	const r = {
		gaming: true, mode: Const.GAME_TYPE.indexOf(code), rule: Const.RULE[code], opts: {},
		round: 3, time: 60, events: [], ended: [], nextTurns: 0,
		game: {
			seq: [actor.robot ? actor : actor.id], robots: actor.robot ? [actor] : [],
			turn: 0, turnToken: 1, round: 1, late: false, loading: false,
			char: "a", theme: code === "HUN" ? "ᄀᄂ" : "LOL", chain: ["previous"], dic: {},
			turnAt: Date.now(), turnTime: 15000, roundTime: 60000, mission: null
		},
		byMaster(type, data) { this.events.push({ type, data }); },
		getTurnSpeed() { return 0; },
		roundEnd(data) { this.ended.push(data); this.gaming = false; },
		roundReady() {},
		turnNext() { this.nextTurns++; }
	};
	r.getScore = (...args) => env.rule.getScore.apply(r, args);
	r.turnStart = () => env.rule.turnStart.call(r);
	r.turnEnd = () => env.rule.turnEnd.call(r);
	r.readyRobot = robot => env.rule.readyRobot.call(r, robot);
	r.turnRobot = (robot, text) => env.rule.submit.call(r, robot, text);
	return r;
}
function test(name, callback) {
	callback();
	passed++;
	console.log("PASS " + name);
}
const definitions = [
	{ name: "classic", code: "ESH", word: "apple", theme: "LOL", type: "n" },
	{ name: "daneo", code: "EDA", word: "null sphere", theme: "LOL", type: "n" },
	{ name: "hunmin", code: "HUN", word: "가나", theme: "LOL", type: "1" }
];
for(const item of definitions) {
	const row = { _id: item.word, theme: item.theme, type: item.type, mean: "meaning", flag: 0, hit: 10 };
	test(item.name + " enforces robot turn ownership and accepts the current robot", () => {
		const env = environment(item.name, [row]);
		const bot = client("bot", true), human = client("human");
		const r = room(env, item.code, bot);
		r.game.seq.push(human.id);
		env.rule.submit.call(r, human, item.word);
		assert.strictEqual(env.queries, 0);
		assert.strictEqual(human.game.score, 0);
		env.rule.submit.call(r, bot, item.word);
		assert(bot.game.score > 0);
		assert.strictEqual(r.game.chain[1], item.word);
	});
	test(item.name + " accepts valid human submissions and rejects late submissions", () => {
		const env = environment(item.name, [row]);
		const human = client("human");
		const r = room(env, item.code, human);
		env.rule.submit.call(r, human, item.word);
		assert(human.game.score > 0);
		assert.strictEqual(r.game.loading, false);
		const late = room(env, item.code, human);
		late.game.late = true;
		const before = env.queries;
		env.rule.submit.call(late, human, item.word);
		assert.strictEqual(env.queries, before);
		assert.strictEqual(late.game.loading, false);
	});
	test(item.name + " cancels robot timers and ignores expired callbacks", () => {
		const env = environment(item.name, [row]);
		const bot = client("bot", true), r = room(env, item.code, bot);
		r.readyRobot(bot);
		const timerId = r.game.robotTimer;
		const timer = env.timers.get(timerId);
		assert(timer, "robot submission must be cancellable");
		r.turnEnd();
		assert(!env.timers.has(timerId));
		timer.fn(...timer.args);
		assert.strictEqual(bot.game.score, 0);
		assert.strictEqual(r.game.loading, false);
	});
	test(item.name + " schedules and scores a valid robot choice", () => {
		const env = environment(item.name, [row]);
		const bot = client("bot", true), r = room(env, item.code, bot);
		if(item.name === "classic") r.opts = { caps: true, mirror: true };
		r.readyRobot(bot);
		env.fire(r.game.robotTimer);
		assert(bot.game.score > 0);
		assert.strictEqual(r.game.chain[1], item.word);
		assert.strictEqual(r.game.loading, false);
	});
	test(item.name + " ignores stale async robot choices and dictionary responses", () => {
		const env = environment(item.name, [row]);
		const bot = client("bot", true), r = room(env, item.code, bot);
		env.deferMany = true;
		r.readyRobot(bot);
		r.game.late = true;
		env.respond();
		assert.strictEqual(env.timers.size, 0);
		env.deferMany = false;
		env.deferOne = true;
		r.game.late = false;
		env.rule.submit.call(r, bot, item.word);
		assert.strictEqual(r.game.loading, true);
		r.game.turnToken++;
		r.game.loading = true;
		env.respond();
		assert.strictEqual(bot.game.score, 0);
		assert.strictEqual(r.game.loading, true, "old query must not unlock a new turn's query");
	});
}
test("Daneo rejects null themes and preserves disabled missions", () => {
	const env = environment("daneo", [{ _id: "ivana trump", theme: null }]);
	const human = client("human"), r = room(env, "EDA", human);
	env.rule.submit.call(r, human, "ivana trump");
	assert.strictEqual(human.events[0].data.code, 407);
	assert.strictEqual(r.game.loading, false);
	assert.strictEqual(r.getScore("null sphere", 1000), r.getScore("null sphere", 1000, true));
	assert.strictEqual(r.game.mission, null);
	r.opts.mission = true;
	r.game.mission = "n";
	assert(r.getScore("null sphere", 1000) > r.getScore("null sphere", 1000, true));
});
test("Classic preserves mirror, caps, hidden words, double missions, and double shot turns", () => {
	const env = environment("classic", [{ _id: "apple", theme: "LOL", type: "n", mean: "fruit", flag: 0, hit: 10 }]);
	const human = client("human"), r = room(env, "ESH", human);
	r.opts = { caps: true, mirror: true, hidden: true, doublemission: true, doubleshot: true };
	r.game.mission = ["a", "p"];
	r.game.shotsRemaining = 2;
	env.rule.submit.call(r, human, "ELPPA");
	assert.strictEqual(human.events[0].data.value, "?????");
	assert.strictEqual(human.events[0].data.mean, "");
	assert(human.events[0].data.bonus > 0);
	assert.strictEqual(r.game.shotsRemaining, 1);
	assert.strictEqual(r.game.doubleShotContinue, true);
	env.fire(r.game.turnTimer);
	assert.strictEqual(r.events[r.events.length - 1].data.shotIndex, 2);
	assert.strictEqual(r.nextTurns, 0);
});
test("Classic preserves reverse chaining and special word rejection rules", () => {
	const env = environment("classic", [{ _id: "banana", theme: "LOL", type: "n", mean: "fruit", flag: 0, hit: 10 }]);
	const human = client("human"), reverse = room(env, "EAP", human);
	env.rule.submit.call(reverse, human, "banana");
	assert(human.game.score > 0);
	assert.strictEqual(reverse.game.char, "b");
	for(const options of [{ long: true }, { short: true }, { banletter: true }, { noreset: true }]) {
		const r = room(env, "ESH", human);
		r.game.char = "b";
		r.opts = options;
		r.game.banLetters = options.banletter ? ["n"] : [];
		r.game.dic = options.noreset ? { banana: 1 } : {};
		const previousScore = human.game.score;
		env.rule.submit.call(r, human, "banana");
		assert.strictEqual(human.game.score, previousScore);
		assert.strictEqual(r.game.loading, false);
	}
});
test("Classic first moves recompute missing manner cache columns", () => {
	const rows = ["apple", "eagle"].map(word => ({ _id: word, theme: "LOL", type: "n", mean: "meaning", flag: 0, hit: 10 }));
	const env = environment("classic", rows), human = client("human"), r = room(env, "ESH", human);
	env.mannerRow = { _id: "e" };
	r.game.chain = [];
	r.opts.manner = true;
	env.rule.submit.call(r, human, "apple");
	assert(human.game.score > 0);
	assert.strictEqual(r.game.loading, false);
	assert.strictEqual(r.game.chain[0], "apple");
});
test("Jaqwi retries empty themes and ends safely when no answers exist", () => {
	const env = environment("jaqwi", []), r = room(env, "CSQ", client("human"));
	r.game.round = 0;
	r.game.done = [];
	r.opts.injpick = ["LOL", "KPO"];
	env.rule.roundReady.call(r);
	assert.strictEqual(r.ended.length, 1);
	assert.strictEqual(r.ended[0].reason, "noWords");
	assert.strictEqual(r.game.answer, null);
	assert.strictEqual(env.queries, 2);
	const played = room(env, "CSQ", client("human"));
	played.opts.injpick = ["LOL"];
	played.game.done = ["previous answer"];
	env.rule.roundReady.call(played);
	assert.strictEqual(played.ended.length, 1);
	assert.strictEqual(played.ended[0], undefined, "completed rounds must retain their rewards");
});
test("Jaqwi normal rounds preserve hints and prevent winner give-up double counting", () => {
	const answer = { _id: "가나", type: "1", flag: 0, theme: "LOL", mean: "A sufficiently long definition for quiz testing." };
	const env = environment("jaqwi", [answer]), a = client("a"), b = client("b"), r = room(env, "CSQ", a);
	r.game.round = 0;
	r.game.done = [];
	r.game.hum = 2;
	r.game.seq.push(b.id);
	r.opts.injpick = ["EMPTY", "LOL"];
	env.rule.roundReady.call(r);
	assert.strictEqual(r.game.answer, answer);
	assert.strictEqual(r.game.late, true);
	env.fire(r.game.turnTimer);
	assert.strictEqual(r.game.late, false);
	const secondHint = r.game.hintTimer2;
	env.rule.submit.call(r, a, answer._id);
	assert(a.game.score > 0);
	assert(!env.timers.has(secondHint));
	env.rule.submit.call(r, a, "gg");
	assert.strictEqual(r.game.giveup.length, 0);
	assert.strictEqual(r.game.late, false);
	env.rule.submit.call(r, b, answer._id);
	assert.strictEqual(r.game.late, true);
	r.game.hum = 1;
	r.game.primary = 8;
	assert(Number.isFinite(r.getScore(answer._id, 1000)));
});
test("Jaqwi scheduled robots can answer while expired robot callbacks cannot", () => {
	const answer = { _id: "가나", type: "1", flag: 0, theme: "LOL", mean: "A sufficiently long definition for quiz testing." };
	const env = environment("jaqwi", [answer]), human = client("human"), bot = client("bot", true), r = room(env, "CSQ", human);
	r.game.round = 0;
	r.game.done = [];
	r.game.hum = 1;
	r.game.seq.push(bot);
	r.game.robots = [bot];
	r.opts.injpick = ["LOL"];
	env.rule.roundReady.call(r);
	env.fire(r.game.turnTimer);
	const timer = env.timers.get(bot._timer);
	env.fire(bot._timer);
	assert(bot.game.score > 0);
	const score = bot.game.score;
	r.game = {};
	timer.fn(...timer.args);
	assert.strictEqual(bot.game.score, score);
});
test("Sock awards a word once despite concurrent lookup results and ignores expired rounds", () => {
	const env = environment("sock", [{ _id: "apple" }]), a = client("a"), b = client("b"), r = room(env, "ESS", a);
	r.game.seq.push(b.id);
	r.game.words = [];
	r.game.board = "appleapple";
	env.deferOne = true;
	env.rule.submit.call(r, a, "apple");
	env.rule.submit.call(r, b, "apple");
	env.respond();
	env.respond();
	assert(a.game.score > 0);
	assert.strictEqual(b.game.score, 0);
	assert.strictEqual(r.game.board, "apple");
	assert.strictEqual(r.game.words.length, 1);
	r.game.words = [];
	env.rule.submit.call(r, b, "apple");
	r.game.late = true;
	env.respond();
	assert.strictEqual(b.game.score, 0);
	assert.strictEqual(r.game.board, "apple");
});
test("Sock aborts an empty board before play and creates playable boards normally", () => {
	const empty = environment("sock", []), a = client("a"), aborted = room(empty, "ESS", a);
	aborted.game.round = 0;
	empty.rule.roundReady.call(aborted);
	assert.strictEqual(aborted.ended[0].reason, "noWords");
	const env = environment("sock", [{ _id: "apple", hit: 10 }]), r = room(env, "ESS", a);
	r.game.round = 0;
	env.rule.roundReady.call(r);
	assert.strictEqual(r.ended.length, 0);
	assert(r.game.board.includes("apple"));
	assert.strictEqual(r.game.late, true);
	env.fire(r.game.turnTimer);
	assert.strictEqual(r.game.late, false);
});
test("Typing scores participants, excludes observers, and handles empty word lists", () => {
	const env = environment("typing", []), a = client("a"), observer = client("observer"), r = room(env, "ETY", a);
	r.game.clist = ["hello"];
	env.rule.submit.call(r, observer, "hello");
	assert.strictEqual(observer.game.score, 0);
	assert.strictEqual(observer.game.index, 0);
	env.rule.submit.call(r, a, "hello");
	assert.strictEqual(a.game.score, 5);
	assert.strictEqual(a.game.chars, 5);
	r.game.round = 0;
	r.game.lists = [[undefined]];
	env.rule.roundReady.call(r);
	assert.strictEqual(r.ended[0].reason, "noWords");
});
test("Crossword completes title selection with insufficient or no maps", () => {
	const env = environment("crossword", [{ _id: "가나", mean: "meaning", type: "1", theme: "LOL" }]);
	const r = room(env, "KCW", client("a"));
	let title;
	env.rule.getTitle.call(r).then(value => { title = value; });
	assert(title);
	env.rule.roundReady.call(r);
	assert.strictEqual(r.ended[0].reason, "noWords");
	env.db.kkutu_cw.ko = env.table([{ map: "one", data: "0,0,0,2,가나" }]);
	const partial = room(env, "KCW", client("a"));
	env.rule.getTitle.call(partial).then(value => { title = value; });
	assert.strictEqual(partial.game.boards.length, 1);
	assert.strictEqual(partial.game.numQ, 1);
	env.rule.roundReady.call(partial);
	assert.strictEqual(partial.ended.length, 0);
	partial.game.numQ = 0;
	env.rule.roundReady.call(partial);
	assert.strictEqual(partial.ended.length, 1);
	assert.strictEqual(partial.ended[0], undefined, "completed puzzles must retain their rewards");
});
test("Crossword completes valid crossing words and excludes observers", () => {
	const env = environment("crossword", []), human = client("a"), r = room(env, "KCW", human);
	const crossing = { x: 0, y: 0, dir: 1, len: 2, count: 0 };
	r.game.boards = [[]];
	r.game.answers = { "0,0,0,0": "ab", "0,0,1,0": "de", "0,0,0,1": "ad" };
	r.game.mdb = [{ "0,0": [crossing], "0,1": [crossing] }];
	r.game.prisoners = {};
	r.game.numQ = 3;
	r.submit = (...args) => env.rule.submit.apply(r, args);
	const observer = client("observer");
	env.rule.submit.call(r, observer, "ab", [0, 0, 0, 0]);
	assert.strictEqual(observer.game.score, 0);
	env.rule.submit.call(r, human, "ab", [0, 0, 0, 0]);
	assert.strictEqual(crossing.count, 1);
	assert.strictEqual(r.game.answers["0,0,0,1"], "ad");
	assert.strictEqual(env.timers.size, 0);
	env.rule.submit.call(r, human, "de", [0, 0, 1, 0]);
	assert.strictEqual(crossing.count, 2);
	const completion = Array.from(env.timers.keys())[0];
	env.fire(completion);
	assert.strictEqual(r.game.answers["0,0,0,1"], false);
	assert.strictEqual(human.game.score, 60);
});
test("Async quiz, board, and title lookups cannot change a replacement game", () => {
	for(const name of ["jaqwi", "sock", "typing", "crossword", "classic"]) {
		const env = environment(name, [{ _id: "apple", theme: "LOL", type: "1", flag: 0, hit: 10, mean: "meaning" }]);
		const code = { jaqwi: "CSQ", sock: "ESS", typing: "ETY", crossword: "KCW", classic: "ESH" }[name];
		const r = room(env, code, client("human"));
		env.deferMany = true;
		r.game.round = 0;
		r.game.done = [];
		r.opts.injpick = ["LOL"];
		if(name === "jaqwi" || name === "sock") env.rule.roundReady.call(r);
		else env.rule.getTitle.call(r);
		const replacement = { untouched: true };
		r.game = replacement;
		env.respond();
		assert.deepStrictEqual(replacement, { untouched: true }, name + " must ignore obsolete query results");
		assert.strictEqual(env.timers.size, 0);
	}
});
console.log("Validated " + passed + " game rule regression cases without external services.");
