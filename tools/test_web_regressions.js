"use strict";

// Actual-source regression tests. All route database/network dependencies are mocked.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ROOT = process.cwd();
const logs = { log(){}, warn(){}, error(){}, info(){}, alert(){} };
const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));

function load(relative, mocks){
	const filename = path.join(ROOT, relative);
	const context = { module: { exports: {} }, exports: {}, global: {}, __dirname: path.dirname(filename), Buffer, URL, console, setTimeout, process: { argv: [] } };
	context.Math = Object.create(Math);
	context.Math.random = () => 0.999;
	context.exports = context.module.exports;
	context.require = name => {
		if(Object.prototype.hasOwnProperty.call(mocks || {}, name)) return mocks[name];
		if([ "assert", "fs", "path" ].includes(name)) return require(name);
		throw new Error("Unexpected dependency: " + name);
	};
	vm.runInNewContext(fs.readFileSync(filename, "utf8"), context, { filename });
	return { exports: context.module.exports, context };
}

function collectionTests(){
	const escape = load("Server/lib/node_modules/pg-escape/index.js").exports;
	const lizard = load("Server/lib/sub/lizard.js").exports;
	const loaded = load("Server/lib/sub/collection.js", { "pg-escape": escape, "./lizard": lizard, "./jjlog": logs });
	const queries = [];
	loaded.context.origin = { query(sql, cb){ queries.push(sql); cb(null, { rows: [], rowCount: 1 }); } };
	// Table is a constructor; keep arrays in the source VM realm.
	vm.runInNewContext(`
		var agent = new exports.Agent('Postgres', origin);
		var table = new agent.Table('users');
		var fields = [['kkutu.name','Nickname'],['kkutu.username','User'],['kkutu.joinedAt',1],['kkutu.record',{ wins: 2 }]];
		var original = JSON.stringify(fields);
		var write = table.update(['_id','user']);
		write.set.apply(write, fields).on();
		if(JSON.stringify(fields) !== original) throw new Error('set mutated its input');
		table.upsert(['_id','user']).set(['kkutu.name','Nickname'],['kkutu.username','User']).on();
		table.update(['_id','user']).set({money:0,black:null,active:false}).on();
		table.findOne(['kkutu.foo.bar','value']).on();
		table.update(['_id','user'],['box',{$jsonEquals:{item:1}}]).set(['box',{}]).on();
		table.update(['_id','user']).inc(['kkutu.score',15],['kkutu.playTime',100]).on();
		table.update(['_id','user']).inc(['kkutu.ranked.games',-1]).on();
		var rejected = false;
		try { table.update(['_id','user']).inc(['kkutu.score',NaN]).on(); } catch(e) { rejected = true; }
		if(!rejected) throw new Error('non-finite JSON increment accepted');
		table.update(['_id','user']).inc(['box.$WPCa',2],['box.$WPCa',3]).on();
		var pieceFields = 'abcdefghijklmnopqrstuvwxyz'.split('').map(function(letter){ return ['box.$WPC'+letter,1]; });
		var pieceQuery = table.update(['_id','user']);
		pieceQuery.inc.apply(pieceQuery,pieceFields).on();
	`, loaded.context);
	assert.strictEqual((queries[0].match(/"kkutu"=/g) || []).length, 1, "one assignment per JSON column");
	assert(queries[0].includes("'{record}'"));
	assert(queries[1].includes('ON CONFLICT (_id) DO UPDATE SET "kkutu"=jsonb_set'));
	assert.strictEqual((queries[1].split("VALUES")[0].match(/"kkutu"/g) || []).length, 1);
	assert(queries[1].includes('{"name":"Nickname","username":"User"}'));
	assert(queries[2].includes('"money"=0') && queries[2].includes('"black"=NULL') && queries[2].includes('"active"=\'false\''));
	assert(queries[3].includes("kkutu->'foo'->>'bar'"));
	assert(queries[4].includes("COALESCE((\"box\")::jsonb,'null'::jsonb)="));
	assert.strictEqual((queries[5].match(/"kkutu"=/g) || []).length, 1, 'JSON increments share one assignment');
	assert(queries[5].includes("#>> '{score}')::numeric,0)+15"));
	assert(queries[5].includes("#>> '{playTime}')::numeric,0)+100"));
	assert(queries[5].includes('to_jsonb(COALESCE('));
	assert(queries[6].includes("'{ranked}'") && queries[6].includes("#>> '{ranked,games}')::numeric,0)+-1"));
	assert(queries[7].includes("#>> '{$WPCa}')::numeric,0)+5"));
	assert.strictEqual((queries[7].match(/to_jsonb\(/g) || []).length, 1);
	assert.strictEqual((queries[8].match(/to_jsonb\(/g) || []).length, 26);
	assert(queries[8].length < 10000, 'many wordpiece increments keep SQL size bounded');
	loaded.context.expectedError = new Error("Mock query failure");
	loaded.context.origin.query = (sql, cb) => cb(loaded.context.expectedError);
	vm.runInNewContext(`
		var called = 0;
		table.update(['_id','user']).set(['money',1]).on(function(doc, err){
			if(doc !== undefined || err !== expectedError) throw new Error('missing query error');
			called++;
		});
		if(called !== 1) throw new Error('error callback count');
	`, loaded.context);
	const ready = new lizard.Tail();
	ready.go(undefined);
	let calls = 0;
	ready.then(value => { assert.strictEqual(value, undefined); calls++; });
	ready.then(() => calls++);
	ready.go("duplicate");
	assert.strictEqual(calls, 2);
	const value = new lizard.Tail(); value.go("ready");
	let result;
	lizard.all([ null, value, null ]).then(data => { result = data; });
	assert.strictEqual(result[1], "ready");
	lizard.all([ null ]).then(data => { assert.strictEqual(data.length, 0); });
	const first = new lizard.Tail(), second = new lizard.Tail();
	let joined;
	lizard.all([ first, null, second ]).then(data => { joined = data; });
	second.go('second'); assert.strictEqual(joined, undefined);
	first.go('first'); assert.strictEqual(joined[0], 'first'); assert.strictEqual(joined[2], 'second');
	const redis = new loaded.exports.Agent('Redis', { zrevrange(args, cb){ cb(new Error('unavailable')); }, zrevrank(args, cb){ cb(null, null); } });
	const ranking = new redis.Table('score');
	ranking.getPage(0, 15).then(data => assert.strictEqual(data.data.length, 0));
	ranking.getSurround('missing').then(data => assert.strictEqual(data.data.length, 0));
}

function googleCallbackTests(){
	const EventEmitter = require('events');
	let request;
	const google = load('Server/lib/Web/auth/auth_google.js', {
		'../../sub/auth.json': { google: {} }, 'passport-google-oauth2': { Strategy: function(){} },
		https: { request(){ request = new EventEmitter(); request.end = () => {}; request.destroy = () => request.emit('error', new Error('timeout')); return request; } }
	});
	let calls = 0;
	google.context.fetchGoogleUserinfoPicture('mock-token', () => calls++);
	request.emit('timeout');
	request.emit('error', new Error('later error'));
	assert.strictEqual(calls, 1, 'userinfo timeout must complete authentication once');
}

const inventory = load("Server/lib/sub/inventory.js").exports;
function get(object, field){ return field.split('.').reduce((value, key) => value == null ? undefined : value[key], object); }
function set(object, field, value){
	const keys = field.split('.');
	let cursor = object;
	while(keys.length > 1){ const key = keys.shift(); cursor = cursor[key] || (cursor[key] = {}); }
	cursor[keys[0]] = clone(value);
}
function fixture(initial, items){
	const state = { user: clone(initial), sessions: { sid: { profile: { id: "user" } } }, writes: 0, deferred: false, reads: [], failUpdates: false };
	function read(row){
		const pointer = { fields: null, limit(...fields){ this.fields = fields; return this; }, on(callback){
			let data = clone(row);
			if(data && this.fields){ const selected = { _id: data._id }; this.fields.forEach(([key]) => { selected[key] = data[key]; }); data = selected; }
			const finish = () => callback(data);
			if(state.deferred) state.reads.push(finish); else finish();
		} };
		return pointer;
	}
	const db = {
		users: {
			findOne(){ return read(state.user); },
			update(...filters){ return { set(...changes){ this.changes = changes; return this; }, on(callback, check, onFail){
				if(state.failUpdates){ const err = new Error("Mock failure"); return onFail ? onFail(err) : callback(undefined, err); }
				const matches = filters.every(([field, expected]) => {
					if(field === '_id') return expected === state.user._id;
					if(expected && typeof expected === 'object' && '$jsonEquals' in expected) return JSON.stringify(get(state.user, field) == null ? null : get(state.user, field)) === JSON.stringify(expected.$jsonEquals);
					return get(state.user, field) === expected;
				});
				if(matches){ this.changes.forEach(item => { if(item) set(state.user, item[0], item[1]); }); state.writes++; }
				if(callback) callback([], null, { rowCount: matches ? 1 : 0 });
			} }; }
		},
		kkutu_shop: {
			findOne([key, id]){ return read(items[id]); },
			find([key, predicate]){ return { limit(){ return this; }, on(cb){ cb(clone(predicate.$in.map(id => items[id]).filter(Boolean))); } }; },
			update(){ return { set(){ return this; }, inc(){ return this; }, on(){} }; }
		},
		kkutu: { en: { findOne(){ return read({ _id: 'cat' }); } }, ko: { findOne(){ return read(null); } } },
		session: { remove([key, sid]){ return { on(cb, check, fail){ if(state.failUpdates) return fail(new Error('failure')); delete state.sessions[sid]; cb([]); } }; } }
	};
	const routes = {};
	const server = { get(p, fn){ routes[p] = fn; }, post(p, fn){ routes[p] = fn; } };
	const base = { "../db": db, "../../sub/jjlog": logs, "../../sub/inventory": inventory, "../../const": { AVAIL_EQUIP: [ 'BDG1', 'BDG2' ] }, fs: {}, request: {}, https: {} };
	load('Server/lib/Web/routes/major.js', base).exports.run(server, () => {});
	load('Server/lib/Web/routes/consume.js', base).exports.run(server, () => {});
	load('Server/lib/Web/routes/login.js', Object.assign({}, base, {
		passport: { serializeUser(){}, deserializeUser(){} }, 'glob-promise': {}, '../../sub/global.json': { ADMIN: [] }, '../../sub/auth.json': {}
	})).exports.run(server, () => {});
	function call(route, data){
		const response = {};
		const req = Object.assign({ session: { id: 'sid', profile: { id: 'user' }, destroy(cb){ response.destroyed = true; cb(); } }, params: {}, body: {}, query: {} }, data || {});
		const res = { json(value){ response.body = clone(value); }, send(value){ response.body = clone(value); }, redirect(value){ response.redirect = value; }, sendStatus(value){ response.status = value; } };
		routes[route](req, res);
		return response;
	}
	return { state, call };
}
function user(box){ return { _id: 'user', money: 1000, box: box || {}, equip: {}, kkutu: { score: 100, friendReq: { retained: true }, name: 'Saved' } }; }
const items = { badge: { _id: 'badge', group: 'BDG1', cost: 100, term: 3600 }, alternate: { _id: 'alternate', group: 'BDG1', cost: 100, term: 0 }, permanent: { _id: 'permanent', group: 'BDG2', cost: 100, term: 0 }, dictPage: { _id: 'dictPage', cost: 10, term: 0 }, boxB2: { _id: 'boxB2', cost: 10, term: 0 } };

function routeTests(){
	for(const tray of [ '__proto__', 'constructor', '$WPDa', '$WPCab', '', [ '$WPCa' ] ]){
		const f = fixture(user(), items);
		assert.strictEqual(f.call('/cf', { body: { tray } }).body.error, 400);
		assert.strictEqual(f.state.writes, 0);
	}
	let f = fixture(user({ '$WPCa': 1 }), items);
	assert.strictEqual(f.call('/cf', { body: { tray: '$WPCa|$WPCa' } }).body.error, 434);
	assert.strictEqual(f.state.writes, 0);
	f = fixture(user({ '$WPCc': 1, '$WPCa': 1, '$WPCt': 1 }), items);
	assert.strictEqual(f.call('/cf', { body: { tray: '$WPCc|$WPCa|$WPCt' } }).body.result, 200);
	assert.strictEqual(f.state.user.money, 940);
	assert.strictEqual(f.state.user.box.dictPage, 2);
	assert(!Object.prototype.hasOwnProperty.call(f.state.user.box, '$WPCc'));
	const expire = Math.round(Date.now() / 1000) + 3600;
	f = fixture(user({ badge: { value: 1, expire } }), items);
	assert.strictEqual(f.call('/equip/:id', { params: { id: 'badge' } }).body.result, 200);
	assert.strictEqual(f.state.user.box.badge.value, 0);
	assert.strictEqual(f.call('/payback/:id', { params: { id: 'badge' } }).body.error, 430);
	assert.strictEqual(f.call('/equip/:id', { params: { id: 'badge' } }).body.result, 200);
	assert.strictEqual(f.state.user.box.badge.value, 1);
	assert.strictEqual(f.state.user.box.badge.expire, expire);
	f = fixture(user({ badge: { value: 2, expire } }), items);
	f.call('/equip/:id', { params: { id: 'badge' } });
	assert.strictEqual(f.call('/payback/:id', { params: { id: 'badge' } }).body.result, 200);
	assert.deepStrictEqual(f.state.user.box.badge, { value: 0, expire });
	f.call('/equip/:id', { params: { id: 'badge' } });
	assert.deepStrictEqual(f.state.user.box.badge, { value: 1, expire });
	f = fixture(user({ badge: { value: 1, expire }, alternate: 1 }), items);
	f.call('/equip/:id', { params: { id: 'badge' } });
	assert.strictEqual(f.call('/equip/:id', { params: { id: 'alternate' } }).body.result, 200);
	assert.deepStrictEqual(f.state.user.box.badge, { value: 1, expire }, 'returning old equipment uses its original term and expiry');
	assert.strictEqual(f.state.user.equip.BDG, 'alternate');
	f = fixture(user({ permanent: 1 }), items);
	f.call('/equip/:id', { params: { id: 'permanent' } });
	f.call('/equip/:id', { params: { id: 'permanent' } });
	assert.strictEqual(f.state.user.box.permanent, 1);
	f = fixture(user({ badge: { value: 1, expire: 1 } }), items);
	assert.strictEqual(f.call('/equip/:id', { params: { id: 'badge' } }).body.error, 430);
	assert.strictEqual(f.call('/payback/:id', { params: { id: 'badge' } }).body.error, 430);
	f = fixture(user({ dictPage: 1 }), items);
	assert.strictEqual(f.call('/consume/:id', { params: { id: 'dictPage' } }).body.result, 200);
	assert.strictEqual(f.state.user.kkutu.score, 114);
	assert.deepStrictEqual(f.state.user.kkutu.friendReq, { retained: true });
	assert.strictEqual(f.state.user.kkutu.name, 'Saved');
	f = fixture(user({ boxB2: 1 }), items);
	assert.strictEqual(f.call('/consume/:id', { params: { id: 'boxB2' } }).body.result, 200);
	assert.strictEqual(f.state.user.box.b2_metal.value, 1);
	assert(f.state.user.box.b2_metal.expire > Date.now() / 1000 + 604700);
	assert.strictEqual(f.call('/consume/:id', { params: { id: 'permanent' } }).body.error, 430);
	f = fixture(user({ dictPage: { value: 0, expire } }), items);
	assert.strictEqual(f.call('/consume/:id', { params: { id: 'dictPage' } }).body.error, 430);
	f = fixture(user(), items);
	assert.strictEqual(f.call('/buy', { body: { ids: '["badge","dictPage"]' } }).body.result, 200);
	assert.strictEqual(f.state.user.money, 890);
	assert.strictEqual(f.state.user.box.dictPage, 1);
	f = fixture(user(), items); f.state.deferred = true;
	const first = f.call('/buy', { body: { id: 'badge' } });
	const second = f.call('/buy', { body: { id: 'dictPage' } });
	f.state.reads.shift()(); f.state.reads.shift()();
	assert.strictEqual(first.body.result, 200);
	assert.strictEqual(second.body.error, 409);
	assert.strictEqual(f.state.user.money, 900);
	assert(!f.state.user.box.dictPage);
	f = fixture(user(), items);
	const logout = f.call('/logout');
	assert.strictEqual(logout.redirect, '/'); assert(logout.destroyed); assert(!f.state.sessions.sid);
	f = fixture(user(), items); f.state.failUpdates = true;
	const failedLogout = f.call('/logout');
	assert.strictEqual(failedLogout.status, 500); assert(!failedLogout.destroyed); assert(f.state.sessions.sid);
}

function databaseInitTests(){
	const EventEmitter = require('events');
	for(const failBeforeReady of [ true, false ]){
		const redis = new EventEmitter();
		let quits = 0, connects = 0, ready = 0;
		const callbacks = [];
		redis.quit = () => { quits++; redis.emit('error', new Error('quit event')); };
		const loaded = load('Server/lib/Web/db.js', {
			'pg': { Pool: class { connect(cb){ connects++; callbacks.push(cb); } } },
			'../sub/global.json': {}, '../sub/jjlog': logs,
			'../sub/collection': { Agent: function(type){ this.Table = function(key){ this.type = type; this.key = key; }; } },
			'../sub/checkpub': {}, '../sub/lizard': load('Server/lib/sub/lizard.js').exports,
			'redis': { createClient(){ return redis; } }
		});
		loaded.exports.ready = () => { ready++; };
		loaded.context.Pub.ready(true);
		redis.emit('connect');
		redis.emit('connect');
		if(failBeforeReady) redis.emit('error', new Error('initial failure'));
		assert.strictEqual(connects, 1, 'only one PG connection while initialization is pending');
		callbacks.shift()(null, {});
		const users = loaded.exports.users;
		if(!failBeforeReady) assert.strictEqual(loaded.exports.redis.type, 'Redis');
		redis.emit('error', new Error('later failure'));
		redis.emit('connect');
		redis.emit('error', new Error('repeated failure'));
		assert.strictEqual(ready, 1, 'initialization cannot restart a running server');
		assert.strictEqual(connects, 1);
		assert.strictEqual(quits, 1, 'Redis is disabled once even with reentrant error events');
		assert.strictEqual(loaded.exports.users, users, 'existing PG table agents stay intact');
		assert.strictEqual(typeof loaded.exports.redis.getGlobal, 'function');
	}
}

collectionTests();
routeTests();
googleCallbackTests();
databaseInitTests();
console.log('Web, inventory, collection, database and callback regression tests passed.');
