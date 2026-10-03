"use strict";

// Actual Game sources with in-memory database, sockets and timers only.
// No server is started and no network/database dependency is loaded.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const EventEmitter = require("events");
const ROOT = process.cwd();
const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const logs = { log(){}, warn(){}, error(){}, info(){}, alert(){}, success(){} };
const settings = { ADMIN: [], MAIN_PORTS: [], IS_SECURED: false, SSL_OPTIONS: {} };

function load(relative, mocks, extra){
	const filename = path.join(ROOT, relative);
	const events = Object.create(null);
	const ipc = [];
	const context = Object.assign({
		module: { exports: {} }, exports: {}, global: {}, __dirname: path.dirname(filename),
		Buffer, console, Date, Math, URL,
		setTimeout(){ return {}; }, clearTimeout(){}, setInterval(){ return {}; }, clearInterval(){},
		process: { env: { CHANNEL: "1", KKUTU_PORT: "8080" },
			on(type, cb){ events[type] = cb; }, send(msg){ ipc.push(clone(msg)); },
			exit(){ throw new Error("Unexpected process exit"); } }
	}, extra);
	context.exports = context.module.exports;
	context.require = name => {
		if(Object.prototype.hasOwnProperty.call(mocks || {}, name)) return mocks[name];
		throw new Error("Unexpected dependency: " + name);
	};
	vm.runInNewContext(fs.readFileSync(filename, "utf8"), context, { filename });
	return { exports: context.module.exports, context, events, ipc };
}

const Const = load("Server/lib/const.js", { "./sub/global.json": settings }).exports;
const Lizard = load("Server/lib/sub/lizard.js").exports;
const Inventory = load("Server/lib/sub/inventory.js").exports;
function tail(value){ const result = new Lizard.Tail(); result.go(value); return result; }
function setPath(object, key, value){
	const parts = key.split(".");
	for(let i = 0; i < parts.length - 1; i++){
		if(!object[parts[i]] || typeof object[parts[i]] !== "object") object[parts[i]] = {};
		object = object[parts[i]];
	}
	object[parts[parts.length - 1]] = clone(value);
}
function getPath(object, key){ return key.split('.').reduce((value, part) => value == null ? undefined : value[part], object); }
function makeDB(initial){
	const rows = clone(initial);
	const writes = [];
	const pending = [];
	const db = { rows, writes, pending, rankWrites: [], defer: false };
	function query(method, filters){
		const fields = [], increments = [];
		const result = {
			set(){ fields.push.apply(fields, clone(Array.from(arguments))); return result; },
			inc(){ increments.push.apply(increments, clone(Array.from(arguments))); return result; },
			limit(){ return result; },
			on(cb){
				const id = filters[0] && filters[0][1];
				if(method === "findOne") { if(cb) cb(clone(rows[id])); return result; }
				if(method === "find") { if(cb) cb(Object.keys(rows).map(id => clone(rows[id]))); return result; }
				const record = { method, id, filters: clone(filters), fields: clone(fields), increments: clone(increments) };
				writes.push(record);
				const job = { record, complete(err){
					assert(!job.completed, "database callback completed twice");
					job.completed = true;
					const matched = method === "upsert" || filters.every(pair => {
						const actual = rows[id] && getPath(rows[id], pair[0]);
						if(pair[1] && typeof pair[1] === "object" && "$jsonEquals" in pair[1]){
							return JSON.stringify(actual == null ? null : actual) === JSON.stringify(pair[1].$jsonEquals);
						}
						return actual === pair[1];
					});
					if(!err && matched){
						if(!rows[id] && method === "upsert") rows[id] = { _id: id, money: 0 };
						if(rows[id]){
							fields.forEach(pair => setPath(rows[id], pair[0], pair[1]));
							increments.forEach(pair => setPath(rows[id], pair[0], (Number(getPath(rows[id], pair[0])) || 0) + pair[1]));
						}
					}
					if(cb) cb(err ? undefined : [], err || null, { rowCount: err || !rows[id] || !matched ? 0 : 1 });
				} };
				if(db.defer) pending.push(job); else job.complete();
				return result;
			}
		};
		return result;
	}
	db.users = {};
	[ "find", "findOne", "update", "upsert" ].forEach(method => {
		db.users[method] = function(){ return query(method, Array.from(arguments)); };
	});
	db.kkutu_shop = { find(){ return { on(cb){ cb([]); } }; } };
	db.session = { direct(){ throw new Error("Unexpected session query"); } };
	db.redis = { getGlobal(){ return tail(1); }, putGlobal(id, score){ db.rankWrites.push({ id, score }); return tail(id); }, getSurround(id){ return tail({ target: id, data: [] }); } };
	return db;
}
class Socket extends EventEmitter {
	constructor(){ super(); this.readyState = 1; this.messages = []; }
	send(value){ this.messages.push(JSON.parse(value)); }
	close(){ this.readyState = 3; }
}
function state(id){
	return { _id: id, money: 1000, friends: {}, box: {}, equip: {},
		kkutu: { score: 1000, name: id, username: id + "User", friendReq: { pending: "Pending" },
			playTime: 100, connectDate: new Date().getDate(), trophy: 100,
			ranked: { trophy: 100, best: 100, games: 0, wins: 0, losses: 0, draws: 0 } } };
}
function fixture(){
	const cluster = { isMaster: false, isWorker: true, events: Object.create(null), on(type, cb){ this.events[type] = cb; } };
	const db = makeDB({ a: state("a"), b: state("b") });
	const loaded = load("Server/lib/Game/kkutu.js", { "cluster": cluster, "../const": Const, "../sub/lizard": Lizard, "../sub/jjlog": logs, "../sub/inventory": Inventory });
	const core = loaded.exports;
	const clients = Object.create(null), rooms = Object.create(null), channels = { 1: { send(){} } };
	Object.assign(loaded.context, { DB: db, DIC: clients, ROOM: rooms, SHOP: {}, CHAN: channels, Rule: {} });
	core.onClientClosed = () => {};
	core.onClientMessage = () => {};
	function client(id, row){
		row = row || db.rows[id];
		const value = new core.Client(new Socket(), { id, title: id }, id + "Session");
		value.data = new core.Data(clone(row.kkutu));
		value.money = row.money; value._savedMoney = row.money;
		value._savedScore = Number(row.kkutu.score) || 0;
		value.box = clone(row.box); value.equip = clone(row.equip);
		value.friends = clone(row.friends); value.friendReq = clone(row.kkutu.friendReq);
		value.okgCount = 0; value.form = "J"; value.playAt = Date.now() - 1000;
		value.game = { score: 100, bonus: 0, wpc: [], item: [] };
		return value;
	}
	function room(a, b){
		const value = new core.Room({ id: 1, title: "Test", password: "", limit: 2,
			mode: Const.GAME_TYPE.indexOf("ESH"), round: 1, time: 30, opts: {},
			match1v1: true, matchPlayers: [ "a", "b" ] }, 1);
		clients.a = a; clients.b = b; rooms[1] = value;
		value.players = [ "a", "b" ]; value.master = "a";
		value.gaming = true; value.game = { seq: [ "a", "b" ], robots: [] };
		a.place = b.place = 1;
		value.messages = [];
		value.byMaster = (type, data) => value.messages.push({ type, data: clone(data) });
		value.export = () => {};
		return value;
	}
	return { cluster, db, loaded, core, clients, rooms, client, room };
}

function settlementTests(){
	const f = fixture();
	const stale = f.client("a");
	const a = f.client("a"), b = f.client("b");
	a.game.score = 200; b.game.score = 100;
	const room = f.room(a, b);
	room.roundEnd();
	const result = room.messages.find(message => message.type === "roundEnd").data.result;
	assert.strictEqual(result.length, 2);
	assert.strictEqual(result[0].id, "a");
	for(const entry of result){
		assert(entry.reward.score > 0 && entry.reward.money > 0, "normal round awards XP and money");
		assert.strictEqual(f.db.rows[entry.id].kkutu.score, 1000 + entry.reward.score);
		assert.strictEqual(f.db.rows[entry.id].money, 1000 + entry.reward.money);
		assert.strictEqual(f.db.rows[entry.id].kkutu.ranked.games, 1);
	}
	assert.strictEqual(f.db.rows.a.kkutu.ranked.wins, 1);
	assert.strictEqual(f.db.rows.b.kkutu.ranked.losses, 1);
	assert.strictEqual(f.db.rows.a.kkutu.username, "aUser");
	assert.deepStrictEqual(f.db.rows.a.kkutu.friendReq, { pending: "Pending" });
	const gameplay = clone(f.db.rows.a);
	const rankWrites = f.db.rankWrites.length;
	f.cluster.isMaster = true; f.cluster.isWorker = false;
	stale.friends = { b: "b" }; stale.friendReq = {};
	let socialSaved = false;
	stale.flush(false, false, true).then(() => { socialSaved = true; });
	assert(socialSaved);
	assert.strictEqual(f.db.rows.a.kkutu.score, gameplay.kkutu.score);
	assert.deepStrictEqual(f.db.rows.a.kkutu.ranked, gameplay.kkutu.ranked);
	assert.strictEqual(f.db.rows.a.kkutu.trophy, gameplay.kkutu.trophy);
	assert.strictEqual(f.db.rows.a.money, gameplay.money);
	assert.deepStrictEqual(f.db.rows.a.friends, { b: "b" });
	assert.deepStrictEqual(f.db.rows.a.kkutu.friendReq, {});
	stale.flush(true, true);
	assert.strictEqual(f.db.rows.a.kkutu.score, gameplay.kkutu.score, "full lobby flush cannot overwrite worker XP");
	assert.deepStrictEqual(f.db.rows.a.kkutu.ranked, gameplay.kkutu.ranked);
	assert.strictEqual(f.db.rows.a.kkutu.trophy, gameplay.kkutu.trophy);
	assert.strictEqual(f.db.rows.a.money, gameplay.money);
	assert.strictEqual(f.db.rankWrites.length, rankWrites, "stale lobby flush cannot overwrite worker leaderboard XP");
	assert(!room.finishing && !room.gaming);
}

function httpGameplayInterleavingTests(){
	const score = fixture(), value = score.client("a");
	score.db.rows.a.kkutu.score += 50; // Concurrent dictPage consumption.
	score.db.rows.a.money -= 20; value.money += 10;
	value.data.score += 20;
	value.flush();
	assert.strictEqual(score.db.rows.a.kkutu.score, 1070, "worker adds XP instead of replacing concurrent HTTP XP");
	assert.strictEqual(value.data.score, 1070); assert.strictEqual(value._savedScore, 1070);
	assert.strictEqual(value.money, 990); assert.strictEqual(value._savedMoney, 990);
	assert.strictEqual(score.db.rankWrites[0].score, 1070, 'leaderboard uses persisted XP including HTTP additions');
	value.data.score += 5;
	value.flush();
	assert.strictEqual(score.db.rows.a.kkutu.score, 1075, "subsequent flush reserves only new XP");

	const inventory = fixture(), a = inventory.client("a"), b = inventory.client("b");
	inventory.db.rows.a.box.dictPage = 2; // Purchase after the worker loaded its empty box.
	a.game.wpc = [ "a" ];
	const room = inventory.room(a, b);
	room.roundEnd();
	assert.strictEqual(inventory.db.rows.a.box.dictPage, 2, "word-piece rewards preserve concurrent HTTP inventory");
	assert.strictEqual(inventory.db.rows.a.box.$WPCa, 1);
	a.flush(true);
	assert.strictEqual(inventory.db.rows.a.box.$WPCa, 1, "flushing twice cannot duplicate awarded pieces");
}

function expiryTests(){
	const f = fixture();
	const past = Math.floor(Date.now() / 1000) - 10;
	f.db.rows.a.box = { missingShopItem: { value: 0, expire: past }, dictPage: 1 };
	f.db.rows.a.equip = { BDG: "missingShopItem" };
	const a = f.client("a");
	a.data.score += 20;
	a.checkExpire();
	assert(!Object.prototype.hasOwnProperty.call(f.db.rows.a.box, 'missingShopItem'));
	assert(!Object.prototype.hasOwnProperty.call(f.db.rows.a.equip, 'BDG'), 'expired equipment is removed even without a shop catalog entry');
	assert.strictEqual(f.db.rows.a.box.dictPage, 1);
	assert.strictEqual(f.db.rows.a.kkutu.score, 1000, 'expiry cleanup does not flush gameplay snapshots');
	assert.strictEqual(a.data.score, 1020);

	const renewed = fixture();
	renewed.db.rows.a.box.badge = { value: 0, expire: past };
	renewed.db.rows.a.equip.BDG = 'badge';
	const stale = renewed.client('a');
	stale.data.score += 20;
	stale.obtain('$WPCz', 1);
	const future = Math.floor(Date.now() / 1000) + 3600;
	renewed.db.rows.a.box.badge.expire = future;
	renewed.db.rows.a.box.dictPage = 2;
	stale.checkExpire();
	assert.strictEqual(renewed.db.rows.a.box.badge.expire, future, 'stale expiry cleanup cannot erase a renewed HTTP item');
	assert.strictEqual(renewed.db.rows.a.equip.BDG, 'badge');
	assert.strictEqual(stale.box.badge.expire, future, 'expiry conflict reloads current inventory');
	assert.strictEqual(stale.box.dictPage, 2);
	assert.strictEqual(stale.box.$WPCz, 1, 'pending word-piece gains survive inventory reload');
	assert.strictEqual(stale.data.score, 1020, 'inventory reload preserves unsaved gameplay XP');
	stale.flush(true);
	assert.strictEqual(renewed.db.rows.a.box.$WPCz, 1);
	assert.strictEqual(renewed.db.rows.a.kkutu.score, 1020);
	assert.strictEqual(renewed.db.rows.a.box.badge.expire, future);
}

function forfeitAndAbortTests(){
	const f = fixture();
	const a = f.client("a"), b = f.client("b");
	a.game.score = 5; b.game.score = 1000;
	const room = f.room(a, b);
	room.go(b);
	const endings = room.messages.filter(message => message.type === "roundEnd");
	assert.strictEqual(endings.length, 1);
	const result = endings[0].data.result;
	assert.strictEqual(result.length, 2, "both participants settle before quitter is removed");
	assert.strictEqual(result[0].id, "a", "highest score cannot win after forfeiting");
	assert.strictEqual(result[1].id, "b");
	assert.strictEqual(result[0].trophy.outcome, 1);
	assert.strictEqual(result[1].trophy.outcome, -1);
	assert.strictEqual(f.db.rows.a.kkutu.ranked.wins, 1);
	assert.strictEqual(f.db.rows.b.kkutu.ranked.losses, 1);
	assert(f.db.rows.a.kkutu.score > 1000 && f.db.rows.b.kkutu.score > 1000);
	assert.strictEqual(f.db.rows.b.money, 1000 + result[1].reward.money);
	assert.deepStrictEqual(Array.from(room.players), [ "a" ]);

	const lobby = fixture(); lobby.cluster.isMaster = true; lobby.cluster.isWorker = false;
	const la = lobby.client("a"), lb = lobby.client("b");
	const mirrored = lobby.room(la, lb);
	mirrored.go(lb);
	assert.strictEqual(lobby.db.writes.length, 0, "master membership updates cannot award game rewards");
	assert.strictEqual(mirrored.messages.length, 0);
	assert.deepStrictEqual(Array.from(mirrored.players), [ "a" ]);
	assert.strictEqual(lb.place, 0);
	assert.strictEqual(lobby.db.rows.a.kkutu.ranked.games, 0);

	const empty = fixture();
	const noWords = empty.room(empty.client("a"), empty.client("b"));
	const before = clone(empty.db.rows);
	noWords.roundEnd({ reason: "noWords" });
	assert.deepStrictEqual(empty.db.rows, before);
	assert.strictEqual(empty.db.writes.length, 0);
	assert(!noWords.gaming && !noWords.finishing);
	assert.strictEqual(noWords.messages.length, 1);
	assert.deepStrictEqual(noWords.messages[0].data.result, []);
}

function moneyTests(){
	const f = fixture(), a = f.client("a");
	f.db.defer = true;
	let completed = 0;
	a.money += 10; a.saveMoney(err => { assert.ifError(err); completed++; });
	a.money += 5; a.saveMoney(err => { assert.ifError(err); completed++; });
	assert.strictEqual(f.db.pending.length, 2);
	f.db.rows.a.money -= 20; // Independent atomic HTTP purchase.
	f.db.pending.pop().complete(); f.db.pending.shift().complete();
	assert.strictEqual(completed, 2);
	assert.strictEqual(f.db.rows.a.money, 995);
	assert.strictEqual(a._savedMoney, 1015);
	a.money += 3;
	let error;
	a.saveMoney(err => { error = err; });
	f.db.pending.shift().complete(new Error("mock write failure"));
	assert(error && error.message === "mock write failure");
	assert.strictEqual(a._savedMoney, 1015, "failed money reservation is released for retry");
	a.saveMoney(err => { assert.ifError(err); });
	f.db.pending.shift().complete();
	assert.strictEqual(f.db.rows.a.money, 998);

	const delayed = fixture(), value = delayed.client("a");
	delayed.db.defer = true;
	value.money += 10;
	let flushed = false;
	value.flush(true).then(() => { flushed = true; });
	const upsert = delayed.db.pending.shift();
	assert.strictEqual(upsert.record.method, "upsert");
	value.money += 5;
	value.saveMoney(err => { assert.ifError(err); });
	delayed.db.rows.a.money -= 20;
	delayed.db.pending.shift().complete();
	upsert.complete(); // Earlier flush must use its own reserved delta.
	const reserved = delayed.db.pending.shift();
	assert.strictEqual(reserved.record.increments[0][1], 10);
	reserved.complete();
	assert(flushed);
	assert.strictEqual(delayed.db.rows.a.money, 995);
	assert.strictEqual(value._savedMoney, 1015);
	assert.strictEqual(delayed.db.pending.length, 0);

	const failed = fixture(), retry = failed.client('a');
	failed.db.defer = true;
	retry.money += 10; retry.data.score += 20; retry.obtain('$WPCa', 1);
	let firstFailure;
	retry.flush(true).then(result => { firstFailure = result.error; });
	failed.db.pending.shift().complete(new Error('upsert failed'));
	assert(firstFailure);
	assert.strictEqual(retry._savedMoney, 1000); assert.strictEqual(retry._savedScore, 1000);
	assert.strictEqual(retry._pieceGains.$WPCa, 1); assert.strictEqual(retry._flushPending, 0);
	let secondFailure;
	retry.flush(true).then(result => { secondFailure = result.error; });
	failed.db.pending.shift().complete();
	failed.db.pending.shift().complete(new Error('increment failed'));
	assert(secondFailure);
	assert.strictEqual(failed.db.rows.a.money, 1000); assert.strictEqual(failed.db.rows.a.kkutu.score, 1000);
	assert.strictEqual(retry._savedMoney, 1000); assert.strictEqual(retry._savedScore, 1000);
	assert.strictEqual(retry._pieceGains.$WPCa, 1); assert.strictEqual(retry._flushPending, 0);
	let recovered;
	retry.flush(true).then(result => { recovered = !result.error; });
	failed.db.pending.shift().complete(); failed.db.pending.shift().complete();
	assert(recovered);
	assert.strictEqual(failed.db.rows.a.money, 1010); assert.strictEqual(failed.db.rows.a.kkutu.score, 1020);
	assert.strictEqual(failed.db.rows.a.box.$WPCa, 1); assert.strictEqual(retry._flushPending, 0);
}

function publicMessageTests(){
	const f = fixture(), a = f.client("a");
	f.clients.a = a;
	let routed = 0;
	f.core.onClientMessage = () => { routed++; };
	[ "{", "null", "[]", "7", "{}", '{"type":1}' ].forEach(value => a.socket.emit("message", value));
	assert.strictEqual(a.socket.messages.length, 6);
	a.socket.messages.forEach(message => { assert.strictEqual(message.type, "error"); assert.strictEqual(message.code, 400); });
	assert.strictEqual(routed, 0);
	a.socket.emit("message", '{"type":"talk","value":"hello"}');
	assert.strictEqual(routed, 1, "valid public messages are still dispatched");
}

function loadMaster(f){
	const noFile = { appendFile(){ throw new Error("Unexpected filesystem write"); } };
	const MockWebSocket = { Server: class extends EventEmitter { constructor(options){ super(); this.options = options; } } };
	const master = load("Server/lib/Game/master.js", { "cluster": f.cluster, "fs": noFile, "path": path,
		"ws": MockWebSocket, "https": {}, "./kkutu": f.core, "../sub/global.json": settings,
		"../const": Const, "../sub/jjlog": logs, "../sub/secure": () => ({}), "../sub/recaptcha": {} });
	master.context.DIC = f.clients; master.context.ROOM = f.rooms; master.context.MainDB = f.db;
	return { master, noFile, MockWebSocket };
}

function clanAndSnapshotTests(){
	const f = fixture(); f.cluster.isMaster = true; f.cluster.isWorker = false;
	const a = f.client('a'), b = f.client('b');
	a.passRecaptcha = b.passRecaptcha = true;
	f.clients.a = a; f.clients.b = b;
	const loaded = loadMaster(f);
	f.db.rows.a.kkutu.score = 1100; // Lobby still has the earlier XP snapshot.
	f.core.onClientMessage(a, { type: 'clanCreate', name: 'First Clan', about: 'Test' });
	assert.strictEqual(f.db.rows.a.money, 500);
	assert.strictEqual(a.money, 500); assert.strictEqual(a._savedMoney, 500);
	assert.strictEqual(f.db.rows.a.kkutu.score, 1100);
	assert.strictEqual(Object.keys(loaded.master.context.CLANS).length, 1);
	assert(!a._clanCreating);

	const conflict = fixture(); conflict.cluster.isMaster = true; conflict.cluster.isWorker = false;
	const ca = conflict.client('a'), cb = conflict.client('b');
	ca.passRecaptcha = cb.passRecaptcha = true;
	conflict.clients.a = ca; conflict.clients.b = cb;
	const competing = loadMaster(conflict);
	conflict.db.defer = true;
	conflict.core.onClientMessage(ca, { type: 'clanCreate', name: 'Shared Clan' });
	assert(ca._clanCreating);
	conflict.core.onClientMessage(cb, { type: 'clanCreate', name: 'Shared Clan' });
	assert.strictEqual(conflict.db.pending.length, 1, 'pending clan names cannot be created twice');
	conflict.db.rows.a.money -= 100; // HTTP charge commits before the clan charge.
	conflict.db.pending.shift().complete();
	assert.strictEqual(conflict.db.rows.a.money, 900, 'conflicting clan balance cannot be charged from stale money');
	assert.strictEqual(Object.keys(competing.master.context.CLANS).length, 0);
	assert(!ca._clanCreating);
	assert(ca.socket.messages.some(message => message.type === 'clanNotice' && /Balance changed/.test(message.value)));

	const sync = fixture(); sync.cluster.isMaster = true; sync.cluster.isWorker = false;
	const lobby = sync.client('a'); sync.clients.a = lobby;
	lobby.passRecaptcha = true;
	lobby._roomToken = 'currentRoom';
	loadMaster(sync);
	const ipc = sync.cluster.events.message;
	const fresh = clone(lobby.getData());
	fresh.data.score = 1200; fresh.data.name = 'stale worker nickname';
	fresh.money = 1020; fresh.box = { $WPCa: 1 };
	ipc({ send(){} }, { type: 'user-publish', data: fresh, sid: lobby.sid, roomToken: 'oldRoom', savedMoney: 1020, savedScore: 1200, pendingSaves: 1 });
	assert.strictEqual(lobby.data.score, 1000, 'old room snapshots cannot overwrite a current client');
	ipc({ send(){} }, { type: 'user-publish', data: fresh, sid: lobby.sid, roomToken: 'currentRoom', savedMoney: 1020, savedScore: 1200, pendingSaves: 1 });
	assert.strictEqual(lobby.data.score, 1200); assert.strictEqual(lobby.money, 1020);
	assert.strictEqual(lobby._savedMoney, 1020); assert.strictEqual(lobby._savedScore, 1200);
	assert.strictEqual(lobby.data.name, 'a', 'worker snapshots preserve lobby-owned social names');
	assert.deepStrictEqual(lobby.friendReq, { pending: 'Pending' });
	assert(lobby._roomSaving);
	sync.core.onClientMessage(lobby, { type: 'refresh' });
	assert.strictEqual(sync.db.writes.length, 0, 'refresh waits while room progress is saving');
	assert(lobby.socket.messages.some(message => message.type === 'error' && message.code === 400));
	ipc({ send(){} }, { type: 'user-publish', data: fresh, sid: lobby.sid, roomToken: 'currentRoom', savedMoney: 1020, savedScore: 1200, pendingSaves: 0 });
	assert(!lobby._roomSaving);
}

function malformedHandlerTests(){
	const f = fixture(); f.cluster.isMaster = true; f.cluster.isWorker = false;
	const a = f.client('a'); a.passRecaptcha = true; f.clients.a = a;
	const loaded = loadMaster(f);
	let changedRooms = 0, chats = 0;
	a.setRoom = () => { changedRooms++; };
	a.chat = value => { assert.strictEqual(value, 'hello'); chats++; };
	function checkHandlers(){
		for(const message of [ { type: 'talk', value: {} }, { type: 'talk', value: [] },
			{ type: 'talk', value: 'hello', whisper: [] }, { type: 'wp', value: {} } ]){
			assert.doesNotThrow(() => f.core.onClientMessage(a, clone(message)));
		}
		const valid = { type: 'setRoom', title: 'Test', password: '', limit: 2, mode: Const.GAME_TYPE.indexOf('ESH'), round: 1, time: 30, opts: {} };
		for(const opts of [ 1, [], { injpick: 'not-an-array' } ]){
			assert.doesNotThrow(() => f.core.onClientMessage(a, Object.assign(clone(valid), { opts })));
		}
		assert.strictEqual(changedRooms, 0, 'malformed room options never reach room mutation');
		f.core.onClientMessage(a, valid);
		assert.strictEqual(changedRooms, 1, 'valid room options are still accepted');
		f.core.onClientMessage(a, { type: 'talk', value: 'hello' });
		assert.strictEqual(chats, 1);
		assert.strictEqual(f.db.writes.length, 0);
	}
	checkHandlers();
	changedRooms = chats = 0;
	const worker = load('Server/lib/Game/slave.js', { 'ws': loaded.MockWebSocket, 'fs': loaded.noFile,
		'../const': Const, 'https': {}, '../sub/secure': () => ({}), './master': loaded.master.exports,
		'./kkutu': f.core, '../sub/lizard': Lizard, '../Web/db': f.db, '../sub/jjlog': logs, '../sub/global.json': settings });
	worker.context.DIC = f.clients; worker.context.ROOM = f.rooms;
	checkHandlers();
	const ruleMode = Const.GAME_TYPE.findIndex((name, index) => Const.getRule(index).opts.includes('ijp'));
	assert(ruleMode >= 0);
	assert.doesNotThrow(() => new f.core.Room({ id: 2, title: 'Test', password: '', limit: 2, mode: ruleMode, round: 1, time: 30, opts: { injpick: 'bad' } }, 1));
}

function staleSocketTests(){
	const f = fixture(), active = f.client("a"), old = f.client("a");
	f.clients.a = active;
	let leaves = 0;
	f.rooms[1] = { go(){ leaves++; } }; old.place = 1;
	let closed;
	f.core.onClientClosed = client => { closed = client; };
	old.socket.emit("close", 1000);
	assert.strictEqual(leaves, 0, "old socket cannot evict the replacement from its room");
	assert.strictEqual(closed, old);
	const { master, noFile, MockWebSocket } = loadMaster(f);
	f.core.onClientClosed(old, 1000);
	assert.strictEqual(f.clients.a, active);
	assert.strictEqual(f.db.writes.length, 0);
	const worker = load("Server/lib/Game/slave.js", { "ws": MockWebSocket, "fs": noFile, "../const": Const,
		"https": {}, "../sub/secure": () => ({}), "./master": master.exports, "./kkutu": f.core,
		"../sub/lizard": Lizard, "../Web/db": f.db, "../sub/jjlog": logs, "../sub/global.json": settings });
	worker.context.DIC = f.clients;
	f.core.onClientClosed(old, 1000);
	assert.strictEqual(f.clients.a, active);
	assert.strictEqual(f.db.writes.length, 0);
}

function dataAndFriendIdentityTests(){
	const f = fixture();
	for(const value of [ null, 'null', '[]', '[1,2]', { score: Infinity, playTime: -1, ranked: null } ]){
		const data = new f.core.Data(value);
		assert.strictEqual(data.score, 0);
		assert.strictEqual(data.playTime, 0);
	}
	f.cluster.isMaster = true; f.cluster.isWorker = false;
	const a = f.client('a'), b = f.client('b');
	a.profile.title = a.profile.name = 'anonymous';
	a.friends = { b: 'b' };
	b.friends = { a: 'anonymous', c: 'anonymous', d: 'a' };
	f.clients.a = a; f.clients.b = b;
	a.removeFriend('b');
	assert.deepStrictEqual(b.friends, { c: 'anonymous', d: 'a' }, 'removal uses user ID, never another friend memo');
	assert.deepStrictEqual(f.db.rows.b.friends, { c: 'anonymous', d: 'a' });
	assert.deepStrictEqual(a.friends, {});
}

dataAndFriendIdentityTests();
settlementTests();
httpGameplayInterleavingTests();
expiryTests();
forfeitAndAbortTests();
moneyTests();
publicMessageTests();
clanAndSnapshotTests();
malformedHandlerTests();
staleSocketTests();
console.log("Core settlement, money, message and socket regression tests passed.");
