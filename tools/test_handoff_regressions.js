"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const EventEmitter = require("events");
const root = path.resolve(__dirname === "." ? process.cwd() : path.join(__dirname, ".."));
const argument = process.argv.find(value => value.startsWith("--source-root="));
const sourceRoot = argument ? path.resolve(argument.slice("--source-root=".length)) : root;
let passed = 0;

function load(relative, dependencies, globals, suffix, base) {
	const filename = path.join(base || sourceRoot, relative);
	const context = Object.assign({ exports: {}, require: name => dependencies[name], console, global: {} }, globals);
	vm.runInNewContext(fs.readFileSync(filename, "utf8") + (suffix || ""), context, { filename });
	return context;
}
const Const = load("Server/lib/const.js", {
	"./sub/global.json": { ADMIN: [], MAIN_PORTS: [8080] }
}).exports;
const Lizard = load("Server/lib/sub/lizard.js", {}).exports;
const Inventory = load("Server/lib/sub/inventory.js", {}, {}, "", root).exports;
const log = new Proxy({}, { get: () => () => {} });
function test(name, callback) {
	callback();
	passed++;
	console.log("PASS " + name);
}
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function socket() {
	const s = new EventEmitter();
	s.readyState = 1;
	s.messages = [];
	s.send = raw => s.messages.push(JSON.parse(raw));
	s.close = () => { s.readyState = 3; s.emit("close", 1000); };
	return s;
}
function setField(object, key, value) {
	const parts = key.split(".");
	let cursor = object;
	while(parts.length > 1) {
		const part = parts.shift();
		if(!cursor[part] || typeof cursor[part] !== "object") cursor[part] = {};
		cursor = cursor[part];
	}
	cursor[parts[0]] = clone(value);
}
function getField(object, key) {
	return key.split(".").reduce((cursor, part) => cursor && cursor[part], object);
}
function core(worker, processStub) {
	const rules = {};
	Object.keys(Const.RULE).forEach(key => { rules["./games/" + Const.RULE[key].rule.toLowerCase()] = { init() {} }; });
	return load("Server/lib/Game/kkutu.js", Object.assign({
		cluster: { isMaster: !worker, isWorker: worker },
		"../const": Const, "../sub/lizard": Lizard, "../sub/jjlog": log, "../sub/inventory": Inventory
	}, rules), { process: processStub, setTimeout: () => 1, clearTimeout() {} }).exports;
}
function environment() {
	const env = { pendingWrites: [], pendingRedis: [], reservations: [], userReads: 0, records: {
		p: { _id: "p", money: 100, kkutu: { score: 1000, name: "Player" }, box: {}, equip: {} }
	} };
	function resolved(value, defer) {
		const tail = new Lizard.Tail();
		if(defer) env.pendingRedis.push(() => tail.go(value));
		else tail.go(value);
		return tail;
	}
	function query(filters, defer) {
		const id = filters[0][1];
		const operations = [];
		return {
			set(...pairs) { operations.push(...pairs.filter(Boolean).map(pair => ["set", clone(pair)])); return this; },
			inc(...pairs) { operations.push(...pairs.filter(Boolean).map(pair => ["inc", clone(pair)])); return this; },
			on(callback) {
				const finish = error => {
					if(error) return callback(null, error, { rowCount: 0 });
					const row = env.records[id] || (env.records[id] = { _id: id });
					operations.forEach(([kind, pair]) => {
						if(kind === "inc") setField(row, pair[0], (Number(getField(row, pair[0])) || 0) + pair[1]);
						else setField(row, pair[0], pair[1]);
					});
					if(callback) callback(clone(row), null, { rowCount: 1 });
				};
				if(defer) env.pendingWrites.push(finish); else finish();
			}
		};
	}
	const db = env.db = {
		kkutu_shop: { find: () => ({ on: callback => callback([]) }) },
		users: {
			upsert: (...filters) => query(filters, true),
			update: (...filters) => query(filters, false),
			findOne: (...filters) => {
				env.userReads++;
				return { limit() { return this; }, on: callback => callback(clone(env.records[filters[0][1]] || null)) };
			}
		},
		session: { update: (...filters) => query(filters, false) },
		redis: { getGlobal: () => resolved(0, true), putGlobal: () => resolved(0, true) }
	};
	const channels = { 1: { send: msg => env.reservations.push(clone(msg)) }, 2: { send: msg => env.reservations.push(clone(msg)) } };
	const masterCore = env.masterCore = core(false, { env: {}, send() {} });
	let ipc;
	const master = load("Server/lib/Game/master.js", {
		cluster: { on: (event, callback) => { if(event === "message") ipc = callback; } },
		fs, path, ws: {}, https: {}, "./kkutu": masterCore,
		"../sub/global.json": { ADMIN: [], USER_BLOCK_OPTIONS: {} }, "../const": Const,
		"../sub/jjlog": log, "../sub/secure": () => ({}), "../sub/recaptcha": {}
	}, { process: { env: {}, on() {} }, __dirname: path.join(sourceRoot, "Server/lib/Game"),
		setTimeout: () => 1, clearTimeout() {}, setInterval: () => 1, clearInterval() {} },
	"\nexports.__state = { DIC, ROOM, MATCH1V1_QUEUE, MATCH1V1_PENDING_ROOMS }; exports.__request = processClientRequest;");
	master.MainDB = db;
	master.CHANNELS = channels;
	env.master = master.exports;
	const state = env.state = master.exports.__state;
	masterCore.init(db, state.DIC, state.ROOM, {}, channels);
	const workerDIC = env.workerDIC = {};
	const workerROOM = env.workerROOM = {};
	env.sent = [];
	env.receive = message => ipc(channels[1], clone(message));
	const workerCore = env.workerCore = core(true, {
		env: { CHANNEL: "1" }, send: message => { env.sent.push(clone(message)); env.receive(message); }
	});
	workerCore.init(db, workerDIC, workerROOM, {});
	workerCore.onClientClosed = client => { delete workerDIC[client.id]; };
	function client(implementation, dic) {
		const c = new implementation.Client(socket(), { id: "p", title: "Player" }, "same-session");
		c.data = new implementation.Data({ score: 1000, name: "Player" });
		c.money = 100;
		c._savedMoney = 100;
		c._savedScore = 1000;
		c.box = {};
		c.equip = {};
		c.friends = {};
		c.friendReq = {};
		dic[c.id] = c;
		return c;
	}
	env.lobby = client(masterCore, state.DIC);
	env.worker = client(workerCore, workerDIC);
	function room(implementation, map, id, channel) {
		return map[id] = new implementation.Room({ id, title: "Room " + id, password: "", limit: 2,
			mode: Const.GAME_TYPE.indexOf("ESH"), round: 3, time: 10, opts: {} }, channel);
	}
	env.a = room(workerCore, workerROOM, 100, 1);
	room(masterCore, state.ROOM, 100, 1);
	room(masterCore, state.ROOM, 200, 2);
	env.reserve = id => {
		const before = env.reservations.length;
		env.lobby.enter({ id, password: "" }, false, true);
		assert.strictEqual(env.reservations.length, before + 1, "room entry creates a worker reservation");
		return env.reservations[before];
	};
	env.joinA = () => {
		const reservation = env.reserve(100);
		assert(reservation.roomToken, "reservation carries its ownership token");
		env.worker._roomToken = reservation.roomToken;
		env.receive({ type: "room-come", target: "p", id: 100, sid: "same-session", roomToken: reservation.roomToken });
		env.a.come(env.worker);
		assert.strictEqual(env.lobby.place, 100);
		return reservation;
	};
	return env;
}

test("new room reservations replace ownership and reject delayed former-worker snapshots", () => {
	const env = environment();
	const a = env.joinA();
	env.worker.syncToMaster();
	const delayed = env.sent.filter(message => message.type === "user-publish").slice(-1)[0];
	env.a.go(env.worker);
	assert.strictEqual(env.lobby.place, 0);
	const b = env.reserve(200);
	assert.notStrictEqual(b.roomToken, a.roomToken, "each reservation has a fresh token");
	env.receive({ type: "room-come", target: "p", id: 200, sid: "same-session", roomToken: b.roomToken });
	assert.strictEqual(env.lobby.place, 200);
	env.receive(delayed);
	assert.strictEqual(env.lobby.place, 200, "old worker cannot overwrite the current membership");
	env.receive({ type: "user-publish", sid: "same-session", roomToken: a.roomToken,
		data: { id: "p", place: 0, money: 1, data: { score: 1 }, game: {} }, savedMoney: 1 });
	assert.strictEqual(env.lobby.money, 100);
	assert.strictEqual(env.lobby.data.score, 1000);
	env.receive({ type: "user-publish", sid: "same-session", roomToken: b.roomToken,
		data: { id: "p", place: 200, money: 105, data: { score: 1005 }, game: { ready: true, form: "J", team: 0 } }, savedMoney: 105 });
	assert.strictEqual(env.lobby.money, 105, "current owner's valid update is accepted");
	assert.strictEqual(env.lobby.data.score, 1005);
});

test("pending settlement blocks entry, refresh and clan spending until DB and Redis finish", () => {
	const env = environment();
	env.joinA();
	env.records.p.money = 1000;
	env.worker._savedMoney = env.lobby._savedMoney = 1000;
	env.lobby.money = 1000;
	env.worker.money = 1003;
	env.worker.data.score = 1010;
	let settled = false;
	env.worker.flush().then(() => { settled = true; });
	assert(env.lobby._roomSaving, "master receives the pending settlement barrier");
	env.a.go(env.worker);
	assert.strictEqual(env.lobby.place, 0);
	function blocked() {
		const reservations = env.reservations.length;
		const reads = env.userReads;
		env.lobby.enter({ id: 200, password: "" }, false, true);
		env.master.__request(env.lobby, { type: "refresh" });
		env.master.__request(env.lobby, { type: "clanCreate", name: "Before save" });
		assert.strictEqual(env.reservations.length, reservations);
		assert.strictEqual(env.userReads, reads, "blocked refresh does not load an old DB snapshot");
		assert.strictEqual(env.lobby.money, 1003, "blocked clan creation cannot spend pending funds");
	}
	blocked();
	assert.strictEqual(env.records.p.money, 1000);
	assert.strictEqual(env.records.p.kkutu.score, 1000);
	env.pendingWrites.shift()();
	assert.strictEqual(env.records.p.money, 1003);
	assert.strictEqual(env.records.p.kkutu.score, 1010);
	assert(!settled);
	assert(env.lobby._roomSaving, "DB completion alone does not clear the barrier");
	blocked();
	while(env.pendingRedis.length) env.pendingRedis.shift()();
	assert(settled);
	assert(!env.lobby._roomSaving, "barrier clears after all settlement callbacks");
	env.reserve(200);
});

test("overlapping saves keep the handoff barrier until every save completes", () => {
	const env = environment();
	env.joinA();
	env.worker.money = 103;
	env.worker.data.score = 1010;
	env.worker.flush();
	env.worker.money = 105;
	env.worker.data.score = 1014;
	env.worker.flush();
	assert.strictEqual(env.worker._flushPending, 2);
	env.pendingWrites.shift()();
	while(env.pendingRedis.length) env.pendingRedis.shift()();
	assert.strictEqual(env.worker._flushPending, 1);
	assert(env.lobby._roomSaving, "one completed flush cannot release another pending flush");
	env.pendingWrites.shift()();
	while(env.pendingRedis.length) env.pendingRedis.shift()();
	assert.strictEqual(env.worker._flushPending, 0);
	assert(!env.lobby._roomSaving);
	assert.strictEqual(env.records.p.money, 105);
	assert.strictEqual(env.records.p.kkutu.score, 1014);
});

test("failed save releases the handoff barrier and leaves progression available for retry", () => {
	const env = environment();
	env.joinA();
	env.worker.money = 103;
	env.worker.data.score = 1010;
	let result;
	env.worker.flush().then(value => { result = value; });
	env.pendingWrites.shift()(new Error("isolated write failure"));
	assert(result && result.error);
	assert.strictEqual(env.worker._flushPending, 0);
	assert(!env.lobby._roomSaving);
	assert.strictEqual(env.worker._savedMoney, 100);
	assert.strictEqual(env.worker._savedScore, 1000);
	assert.strictEqual(env.records.p.money, 100);
	env.worker.flush();
	env.pendingWrites.shift()();
	while(env.pendingRedis.length) env.pendingRedis.shift()();
	assert.strictEqual(env.records.p.money, 103);
	assert.strictEqual(env.records.p.kkutu.score, 1010);
});

test("worker reservation and socket entry retain the master ownership token", () => {
	const env = environment();
	let onMessage;
	class SocketServer extends EventEmitter { constructor(options) { super(); this.options = options; } }
	env.db.session.findOne = () => ({ limit() { return this; }, on: callback => callback({ profile: { id: "p", title: "Player" } }) });
	const slave = load("Server/lib/Game/slave.js", {
		ws: { Server: SocketServer }, fs, https: {}, "../const": Const, "../sub/secure": () => ({}),
		"./master": env.master, "./kkutu": env.workerCore, "../sub/lizard": Lizard,
		"../Web/db": env.db, "../sub/jjlog": log,
		"../sub/global.json": { ADMIN: [], USER_BLOCK_OPTIONS: {} }
	}, { process: { env: { CHANNEL: "1", KKUTU_PORT: "8496" }, on: (event, callback) => { if(event === "message") onMessage = callback; },
		send: message => env.receive(message) }, setTimeout: () => 1, clearTimeout() {} },
	"\nexports.__state = { DIC, ROOM, RESERVED }; exports.__server = Server;");
	env.db.ready();
	const state = slave.exports.__state;
	state.ROOM[100] = new env.workerCore.Room({ id: 100, title: "A", limit: 2,
		mode: Const.GAME_TYPE.indexOf("ESH"), round: 3, time: 10, opts: {} }, 1);
	const reservation = env.reserve(100);
	onMessage(reservation);
	assert.strictEqual(state.RESERVED["same-session"].roomToken, reservation.roomToken);
	slave.exports.__server.emit("connection", socket(), { url: "/same-session&1", connection: { remoteAddress: "127.0.0.1" }, headers: {} });
	assert(state.DIC.p, "valid reserved socket enters its room");
	assert.strictEqual(state.DIC.p._roomToken, reservation.roomToken);
	assert.strictEqual(state.DIC.p.place, 100);
	assert.strictEqual(env.lobby.place, 100);
});

test("worker exit releases affected room barriers and preserves other channels", () => {
	const env = environment();
	const reservation = env.joinA();
	env.lobby._roomSaving = true;
	env.lobby.ready = true;
	env.lobby.game = { score: 10 };
	const other = new env.masterCore.Client(socket(), { id: "q", title: "Other player" }, "other-session");
	other.place = 200;
	other.ready = true;
	other.game = { score: 77 };
	other._roomSaving = true;
	other._roomToken = "other-owner";
	env.state.DIC.q = other;
	const otherRoom = env.state.ROOM[200];
	otherRoom.players = ["q"];
	otherRoom.master = "q";
	env.state.MATCH1V1_PENDING_ROOMS[100] = { host: "p" };
	env.state.MATCH1V1_PENDING_ROOMS[200] = { host: "q" };
	// A stale membership in the crashed room must not reset a client who has moved.
	env.state.ROOM[100].players.push("q");
	env.master.onWorkerExit(1);
	assert(!env.state.ROOM[100]);
	assert(!env.state.MATCH1V1_PENDING_ROOMS[100]);
	assert.strictEqual(env.lobby.place, 0);
	assert.strictEqual(Object.keys(env.lobby.game).length, 0);
	assert.strictEqual(env.lobby.ready, false);
	assert.strictEqual(env.lobby._roomSaving, false);
	assert.strictEqual(env.lobby._roomToken, null);
	assert(env.lobby.socket.messages.some(message => message.type === "roomStuck"));
	assert.strictEqual(env.state.ROOM[200], otherRoom);
	assert(env.state.MATCH1V1_PENDING_ROOMS[200]);
	assert.strictEqual(other.place, 200);
	assert.strictEqual(other.game.score, 77);
	assert.strictEqual(other.ready, true);
	assert.strictEqual(other._roomSaving, true);
	assert.strictEqual(other._roomToken, "other-owner");
	assert(!other.socket.messages.some(message => message.type === "roomStuck"));
	env.receive({ type: "user-publish", sid: "same-session", roomToken: reservation.roomToken,
		data: { id: "p", place: 100, game: {} }, pendingSaves: 1 });
	assert.strictEqual(env.lobby.place, 0, "crashed worker token stays invalid");
	assert.strictEqual(env.lobby._roomSaving, false);
});

test("matchmaking waits for pending save and clan creation but accepts a ready lobby client", () => {
	const env = environment();
	env.lobby._roomSaving = true;
	env.master.__request(env.lobby, { type: "match1v1" });
	assert.strictEqual(env.state.MATCH1V1_QUEUE.length, 0);
	assert.strictEqual(env.lobby.socket.messages.slice(-1)[0].state, "error");
	env.lobby._roomSaving = false;
	env.lobby._clanCreating = true;
	env.master.__request(env.lobby, { type: "match1v1" });
	assert.strictEqual(env.state.MATCH1V1_QUEUE.length, 0);
	assert.strictEqual(env.lobby.socket.messages.slice(-1)[0].state, "error");
	env.lobby._clanCreating = false;
	env.master.__request(env.lobby, { type: "match1v1" });
	assert.strictEqual(env.state.MATCH1V1_QUEUE.length, 1);
	assert.strictEqual(env.state.MATCH1V1_QUEUE[0].id, "p");
	assert.strictEqual(env.lobby.socket.messages.slice(-1)[0].state, "searching");
});

function startup(kind, serverId, cpu, worker) {
	const env = { forks: [], exits: [], removedChannels: [], logs: [], slaveLoaded: false };
	const cluster = {
		isMaster: !worker, isWorker: !!worker,
		fork(options) {
			assert(env.forks.length < 20, "startup unexpectedly exceeds the mocked fork limit");
			const child = { process: { pid: env.forks.length + 1 } };
			env.forks.push({ options: clone(options), child });
			return child;
		},
		on(event, callback) { if(event === "exit") env.onExit = callback; }
	};
	const processStub = {
		argv: kind === "Game" ? ["node", "cluster.js", String(serverId), String(cpu)] : ["node", "cluster.js", String(cpu)], env: {},
		exit(code) { env.exits.push(code); throw new Error("test process exit " + code); }
	};
	const dependencies = {
		cluster, "../const": { MAIN_PORTS: [8080], TEST_PORT: 4040 }, "../sub/jjlog": log,
		"./master.js": { init: (id, channels) => { env.id = id; env.channels = channels; } },
		"./master": { onWorkerExit: channel => env.removedChannels.push(channel) },
		"./slave.js": {}, "./main.js": {}
	};
	const filename = path.join(sourceRoot, "Server/lib/" + kind + "/cluster.js");
	const context = { require: name => { if(name === "./slave.js") env.slaveLoaded = true; return dependencies[name]; },
		process: processStub, global: {}, console: { log: value => env.logs.push(value) } };
	try { vm.runInNewContext("(function(){" + fs.readFileSync(filename, "utf8") + "\n})();", context, { filename }); }
	catch(error) { if(!env.exits.length) throw error; }
	env.global = context.global;
	return env;
}

["Game", "Web"].forEach(kind => {
	test(kind + " cluster rejects invalid CPU counts without forking", () => {
		[0, -1, 0.5, Infinity, "invalid"].forEach(cpu => {
			const env = startup(kind, 0, cpu);
			assert.strictEqual(env.forks.length, 0, "invalid CPU " + cpu + " starts no workers");
			assert(env.exits.length || env.logs.length, "invalid CPU " + cpu + " is reported");
		});
	});
	test(kind + " cluster starts the requested workers and replaces a dead worker", () => {
		const env = startup(kind, 0, 2);
		assert.strictEqual(env.forks.length, 2);
		env.onExit(env.forks[0].child);
		assert.strictEqual(env.forks.length, 3, "a dead worker is replaced");
		assert.deepStrictEqual(env.forks[2].options, env.forks[0].options, "replacement retains its channel/port");
		if(kind === "Game") assert.deepStrictEqual(env.removedChannels, [1]);
	});
});
test("Game cluster rejects invalid server indices before forking", () => {
	[-1, 0.5, Infinity, 1, "invalid"].forEach(id => {
		const env = startup("Game", id, 1);
		assert.deepStrictEqual(env.exits, [1]);
		assert.strictEqual(env.forks.length, 0);
	});
});
test("Game test startup initializes server zero and loads the worker branch", () => {
	const env = startup("Game", "test", "invalid");
	assert.strictEqual(env.id, "0");
	assert.strictEqual(env.forks.length, 1);
	assert.strictEqual(env.global.test, true);
	const worker = startup("Game", "test", "invalid", true);
	assert(worker.slaveLoaded);
});

console.log("Validated " + passed + " handoff/startup regression cases without external services.");
