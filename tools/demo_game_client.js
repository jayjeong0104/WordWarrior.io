"use strict";

// Offline demo only. Production declarations, renderers and message dispatch are
// read from the canonical split client; the ready/socket startup is never run.
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ROOT = path.resolve(__dirname, "..");
const CLIENT = path.join(ROOT, "Server/lib/Web/lib/kkutu");
const acornModule = { exports: {} };
const acornPaths = [
	"Server/lib/node_modules/acorn-globals/node_modules/acorn/dist/acorn.js",
	"Server/lib/node_modules/acorn/dist/acorn.js",
	"Server/node_modules/acorn/dist/acorn.js",
	"node_modules/acorn/dist/acorn.js"
].map(relative => path.join(ROOT, relative));
const acornPath = acornPaths.find(filename => fs.existsSync(filename));
if(!acornPath) throw new Error("Offline demo requires the repository's Acorn dependency. Install the repository dependencies before starting the demo.");
vm.runInNewContext(fs.readFileSync(acornPath, "utf8"), { module: acornModule, exports: acornModule.exports });
const acorn = acornModule.exports;
// Older hoisted Acorn releases understand the canonical client as ES2015;
// passing 2020 to those releases incorrectly treats undefined as reserved.
const acornMajor = Number(String(acorn.version || "").split(".")[0]);
const parse = source => acorn.parse(source, { ecmaVersion: acornMajor && acornMajor < 6 ? 6 : 2020 });

function visit(node, callback){
	if(!node || typeof node !== "object") return;
	if(node.type) callback(node);
	Object.keys(node).forEach(key => {
		if(key === "start" || key === "end") return;
		const value = node[key];
		if(Array.isArray(value)) value.forEach(child => visit(child, callback));
		else if(value && typeof value === "object") visit(value, callback);
	});
}
function declarations(source){
	return parse(source).body.filter(node => node.type === "FunctionDeclaration" || node.type === "VariableDeclaration")
		.map(node => node.type === "FunctionDeclaration" ? source.slice(node.start, node.end) : node.declarations
			.filter(declaration => declaration.id.name !== "audioContext")
			.map(declaration => node.kind + " " + source.slice(declaration.start, declaration.end) + ";").join("\n"))
		.join("\n");
}
function readyBindings(source){
	let callback;
	visit(parse(source), node => {
		if(node.type === "CallExpression" && node.callee.type === "MemberExpression" && node.callee.property.name === "ready") callback = node.arguments[0];
	});
	if(!callback || !callback.body) throw new Error("Canonical ready callback was not found.");
	const stage = [];
	const helpers = [];
	const events = [];
	let dispatcher = "";
	visit(callback.body, node => {
		if(node.type === "AssignmentExpression" && node.left.type === "Identifier" && node.left.name === "_onMessage") dispatcher = source.slice(node.start, node.end) + ";";
	});
	callback.body.body.forEach(node => {
		const text = source.slice(node.start, node.end);
		if(node.type === "FunctionDeclaration") helpers.push(text);
		const expression = node.type === "ExpressionStatement" && node.expression;
		if(expression && expression.type === "AssignmentExpression"){
			const left = source.slice(expression.left.start, expression.left.end);
			if(left === "$stage" || left === "$data.setUser" || left === "$data.setRoom") stage.push(text);
		}
		if(node.type !== "ExpressionStatement") return;
		if(/^\$stage\.chatBtn\.on\(/.test(text)
			|| /^\$stage\.(?:talk|game\.hereText)\.off\('\.turnsync'\)/.test(text)
			|| /^\$stage\.menu\.(?:community|clans)\.off\(/.test(text)
			|| /^\$stage\.menu\.shop\.on\(/.test(text)
			|| /^\$stage\.menu\.ready\.on\(/.test(text)
			|| /^\$stage\.dialog\.(?:warningOK|warningCancel|dressOK)\.on\(/.test(text)
			|| /^\$\("#top-profile-card \.top-profile-main"\)\.on\(/.test(text)
			|| (/^\$\(document\)\./.test(text) && /\.myinfo-tab/.test(text))
			|| /^\$\("#DressDiag \.dress-type"\)\.on\(/.test(text)) events.push(text);
	});
	if(stage.length !== 3) throw new Error("Canonical stage/user/room bindings changed.");
	if(!dispatcher) throw new Error("Canonical socket message dispatcher was not found.");
	return { helpers: helpers.join("\n"), stage: stage.join("\n") + "\n" + dispatcher, events: events.join("\n") };
}
function sharedBindings(){
	const source = fs.readFileSync(path.join(ROOT, "Server/lib/Web/lib/global.js"), "utf8");
	const statements = [];
	visit(parse(source), node => {
		if(node.type !== "AssignmentExpression") return;
		const left = source.slice(node.left.start, node.left.end);
		if(left === "global.expl" || left === "$.prototype.hotkey") statements.push(source.slice(node.start, node.end) + ";");
	});
	return "var global = {}; var explSize;\n" + statements.join("\n");
}
function createFixture(settings){
	const assets = settings && settings.fixtureAssets;
	if(!assets) throw new Error("Demo fixture data is required.");
	const fixture = typeof assets.buildFixture === "function" ? assets.buildFixture()
		: typeof assets.createFixture === "function" ? assets.createFixture() : assets;
	const result = JSON.parse(JSON.stringify(fixture));
	if(!result.id || !result.users || !result.users[result.id]) throw new Error("Demo fixture must include its own user.");
	return result;
}
function buildRuntime(settings){
	const fixture = createFixture(settings);
	const language = settings.language.GLOBAL ? Object.assign({}, settings.language.GLOBAL, settings.language.kkutu) : settings.language;
	const ready = readyBindings(fs.readFileSync(path.join(CLIENT, "ready.js"), "utf8"));
	const rules = [ "classic", "jaqwi", "crossword", "typing", "hunmin", "daneo", "sock" ]
		.map(name => fs.readFileSync(path.join(CLIENT, "rule_" + name + ".js"), "utf8")).join("\n");
	const source = "window.L=" + JSON.stringify(language) + ";window.audioContext=false;\n"
		+ sharedBindings() + "\n" + declarations(fs.readFileSync(path.join(CLIENT, "head.js"), "utf8"))
		+ "\n" + rules + "\n" + declarations(fs.readFileSync(path.join(CLIENT, "body.js"), "utf8"))
		+ "\nvar _onMessage;\n" + ready.helpers + "\nfunction initializeDemoStage(){\n" + ready.stage + "\n}\n"
		+ "function bindDemoClientEvents(){\n" + ready.events + "\n}\n"
		+ fs.readFileSync(path.join(ROOT, "Server/lib/Web/public/js/emblem_chest.js"), "utf8") + "\n"
		+ "(" + bootstrap.toString() + ")(" + JSON.stringify(fixture) + "," + JSON.stringify(settings.rules) + "," + JSON.stringify(settings.options) + ");\n";
	new vm.Script(source, { filename: "demo_game_runtime.js" });
	return source;
}

function bootstrap(fixture, rules, options){
	const clone = value => JSON.parse(JSON.stringify(value));
	const nativeTimeout = window.setTimeout.bind(window);
	const nativeClearTimeout = window.clearTimeout.bind(window);
	const nativeClearInterval = window.clearInterval.bind(window);
	let clock = 0;
	let nextTimer = 1000000;
	const timers = new Map();
	const intervals = new Map();
	window.__demoActions = [];
	window.__demoErrors = [];
	window.__demoReady = false;
	document.body.setAttribute("data-demo-ready", "false");
	window.addEventListener("error", event => window.__demoErrors.push(event.message));
	$.fx.off = true;
	// Only client game timers are frozen. Browser layout and ordinary UI callbacks
	// retain their native scheduler; flush advances the actual animation callbacks.
	_setTimeout = function(callback, delay){
		const id = ++nextTimer;
		timers.set(id, { id, at: clock + (Number(delay) || 0), callback, args: Array.prototype.slice.call(arguments, 2) });
		return id;
	};
	_setInterval = function(callback, delay){
		const id = ++nextTimer;
		intervals.set(id, { callback, delay });
		return id;
	};
	window.clearTimeout = function(id){ if(!timers.delete(id)) nativeClearTimeout(id); };
	window.clearInterval = function(id){ if(!intervals.delete(id)) nativeClearInterval(id); };
	function flush(milliseconds){
		const end = clock + milliseconds;
		let steps = 0;
		while(steps++ < 10000){
			const due = Array.from(timers.values()).filter(timer => timer.at <= end).sort((a, b) => a.at - b.at || a.id - b.id)[0];
			if(!due) break;
			timers.delete(due.id);
			clock = due.at;
			due.callback.apply(window, due.args);
		}
		clock = end;
	}
	Date.now = () => fixture.now + clock;
	window.RULE = rules;
	window.OPTIONS = options;
	window.MODE = Object.keys(rules);
	window.MOREMI_PART = [ "back", "eye", "mouth", "shoes", "clothes", "head", "lhand", "rhand", "front" ];
	window.AVAIL_EQUIP = [ "Mhead", "Meye", "Mmouth", "Mclothes", "Mshoes", "Mback", "Mhand", "BDG", "NIK" ];
	window.mobile = false;
	window.EXP = [];
	EXP.push(getRequiredScore(1));
	for(let level = 2; level < MAX_LEVEL; level++) EXP.push(EXP[level - 2] + getRequiredScore(level));
	EXP[MAX_LEVEL - 1] = Infinity;
	EXP.push(Infinity);
	window.$data = {
		PUBLIC: false, URL: "demo-session", version: "Offline demo", server: "1", id: fixture.id, place: 0,
		users: {}, usersR: {}, robots: {}, rooms: {}, shop: clone(fixture.shop), box: clone(fixture.box),
		friends: {}, _friends: {}, clan: { my: null, list: [] }, opts: { su: true, dm: new URLSearchParams(location.search).get("theme") === "dark" },
		_timers: [], _obtain: [], _shut: {}, _wblock: {}, _chatHistory: [], _communityLobbyChatLog: [],
		_playTime: 3840000, _okg: 6, _kd: "", _gaming: false, _shop: false, _myInfo: false, _clans: false,
		_communityOpen: false, _communityTab: "lobby", _communityRanking: clone(fixture.ranking),
		_communityVocab: clone(fixture.vocab), _communityVocabSelected: fixture.vocab.lists[0].id,
		_communityLibraryQuery: "aurora", _communityVocabDetail: "", _communityLibraryResult: null,
		_communityRankingError: "", _communityVocabError: "", _communityVocabStatus: "", _communityLobbyTalk: "",
		_friendSearchQuery: "", _friendSearchResults: null, _friendSearchLoading: false, _friendPending: {},
		_shopCart: [], _shopPreviewOriginal: false, _myInfoBoxLoaded: true, _myInfoBoxLoading: false
	};
	Object.keys($data.shop).forEach(id => {
		const item = $data.shop[id];
		if(item.name || item.desc) L[id] = [ item.name || id, item.desc || "" ];
	});
	initializeDemoStage();
	global.profile = clone(fixture.users[fixture.id].profile);
	$.cookie = function(){ return null; };
	window.playSound = function(){ return { audio: { currentTime: 0 }, stop(){}, volume: 0 }; };
	window.playBGM = function(){ return { stop(){}, volume: 0 }; };
	window.stopBGM = window.stopTurnSound = window.vibrate = function(){};
	$data._timePercent = function(){ return $data._turnTime / $data.turnTime * 100 + "%"; };
	const dictionary = {
		aurora: "A natural display of coloured light in the night sky.",
		birch: "A tree with thin bark and light-coloured wood.", harbor: "A sheltered place where ships can anchor.",
		river: "A large natural stream of water flowing towards the sea.", rose: "A flowering shrub known for its fragrant blooms.",
		ember: "A small piece of glowing coal or wood in a dying fire.", rain: "Water falling in drops from clouds.",
		nebula: "A cloud of gas and dust in space.", acorn: "The nut of an oak tree.", nectar: "The sweet liquid produced by flowers.",
		raven: "A large black bird of the crow family.", night: "The time between sunset and sunrise.", thorn: "A sharp point on a plant stem.",
		novel: "A long fictional story in prose.", lilac: "A shrub with fragrant purple or white flowers.", canopy: "The upper layer formed by the crowns of trees.",
		yarrow: "A flowering plant with finely divided leaves.", willow: "A tree with narrow leaves and flexible branches.", walnut: "The edible seed of a walnut tree.",
		tulip: "A spring flower with a cup-shaped bloom.", pollen: "The fine powder produced by flowering plants.", nimbus: "A cloud that brings rain.",
		silver: "A shiny white precious metal.", ribbon: "A narrow strip of fabric.", notebook: "A book of blank pages for writing notes.",
		kite: "A light frame flown in the wind on a string.", elm: "A tall tree with rough leaves.", mist: "A fine cloud of water droplets near the ground.",
		trail: "A path through the countryside.", lantern: "A portable light with a protective cover.", nest: "A home built by a bird for its eggs.",
		timber: "Wood prepared for building.", ripple: "A small wave on the surface of water.", evergreen: "A plant that keeps its leaves throughout the year."
	};
	const chestRewards = {boxB2: ["b2_fire", "b2_metal"], boxB3: ["b3_do", "b3_hwa", "b3_pok"], boxB4: ["b4_bb", "b4_hongsi", "b4_mint"]};
	let chestsOpened = 0;
	function consumeChest(id){
		const pool = chestRewards[id];
		const entry = $data.box[id];
		const quantity = typeof entry === "number" ? entry : entry && entry.value;
		if(!pool || !Number.isInteger(quantity) || quantity < 1) return {error: 430};
		if(quantity === 1) delete $data.box[id];
		else if(typeof entry === "number") $data.box[id]--;
		else entry.value--;
		const key = id === fixture.chestId && pool.indexOf(fixture.chestReward) >= 0 ? fixture.chestReward : pool[chestsOpened % pool.length];
		const now = Math.round(Date.now() / 1000);
		const current = $data.box[key];
		// Match Inventory.obtain: a live timed emblem extends by seven days.
		if(current && typeof current === "object" && current.expire > now) current.expire += 604800;
		else if(typeof current === "number" && current > 0) $data.box[key]++;
		else $data.box[key] = {value: 1, expire: now + 604800};
		chestsOpened++;
		const my = $data.users[fixture.id];
		my.box = clone($data.box);
		fixture.box = clone($data.box);
		fixture.users[fixture.id].box = clone($data.box);
		fixture.profiles[fixture.id].box = clone($data.box);
		window.__demoActions.push({type: "mock-consume", chest: id, reward: key, remaining: quantity - 1});
		return {result: 200, box: clone($data.box), data: clone(my.data), gain: [{key, value: 1}]};
	}
	function httpResult(url){
		const query = new URL(url, location.origin);
		if(query.pathname === "/shop") return { goods: Object.keys(fixture.shop).map(id => clone(fixture.shop[id])) };
		if(query.pathname === "/box") return clone($data.box);
		if(/ranking/.test(query.pathname)) return clone(fixture.ranking);
		if(/vocab/.test(query.pathname)) return clone($data._communityVocab);
		if(/profile/.test(query.pathname)) return clone(fixture.profiles[query.searchParams.get("id")] || $data.users[query.searchParams.get("id")] || {});
		if(/friend/.test(query.pathname)) return { list: Object.values($data.users).slice(1, 5).map(user => ({ id: user.id, name: user.profile.title })) };
		if(query.pathname.indexOf("/dict/") !== 0) return { error: 400 };
		const word = query.pathname.indexOf("/dict/") === 0 ? decodeURIComponent(query.pathname.slice(6))
			: query.searchParams.get("word") || query.searchParams.get("q") || "aurora";
		return { word, _id: word, mean: dictionary[word] || "An English dictionary entry.", theme: word === "nebula" || word === "aurora" ? "450" : "", type: "n", hit: 24 };
	}
	$.ajax = function(input){
		const config = typeof input === "string" ? { url: input } : (input || {});
		const deferred = $.Deferred();
		const writes = config.type && /^(POST|PUT|PATCH|DELETE)$/i.test(config.type);
		const result = writes && /^\/consume\//.test(config.url || "") && /^POST$/i.test(config.type)
			? consumeChest(decodeURIComponent(config.url.slice(9))) : writes ? {error: 400} : httpResult(config.url || "/");
		if(config.success) config.success(clone(result));
		deferred.resolve(clone(result));
		return deferred.promise();
	};
	$.get = function(url, data, callback){
		if(typeof data === "function") callback = data;
		const result = httpResult(url);
		if(callback) callback(clone(result));
		return $.Deferred().resolve(clone(result)).promise();
	};
	$.post = function(url, data, callback){
		if(typeof data === "function"){ callback = data; data = undefined; }
		window.__demoActions.push({ type: "mock-http", url, data });
		let result = { error: 400 };
		if(url.indexOf("/equip/") === 0){
			const id = decodeURIComponent(url.slice(7));
			const item = $data.shop[id];
			if(item && $data.box[id]){
				const my = $data.users[fixture.id];
				let part = item.group;
				if(part === "Mhand") part = data && data.isLeft ? "Mlhand" : "Mrhand";
				if(part.substr(0, 3) === "BDG") part = "BDG";
				if(my.equip[part] === id) delete my.equip[part];
				else my.equip[part] = id;
				result = { box: clone($data.box), equip: clone(my.equip) };
				fixture.users[fixture.id].equip = clone(my.equip);
				fixture.profiles[fixture.id].equip = clone(my.equip);
			}
		}else if(url === "/exordial"){
			$data.users[fixture.id].exordial = String((data && data.data) || "");
			result = {};
		}
		if(callback) callback(clone(result));
		if(!result.error && url.indexOf("/equip/") === 0) prepareProfilePhotos().then(updateMe);
		return $.Deferred().resolve(clone(result)).promise();
	};
	let gameWordsPlayed = 0;
	let playedWords = [];
	let currentMission = "r";
	const chain = [ "birch", "harbor", "river", "rose", "ember", "rain", "nebula", "acorn", "nectar", "raven", "night", "thorn" ];
	function receive(message){ _onMessage({ data: JSON.stringify(message) }); }
	function startTurn(char, turn){
		const banLetters = $data.room.opts.banletter ? ["x"] : [];
		receive({ type: "turnStart", turn, char, subChar: "", speed: 3, turnTime: 12000, roundTime: 42600, mission: currentMission, banLetters });
		flush(120);
		$data._turnTime = 8700;
		$data._roundTime = 42600;
		route("turnGoing");
	}
	function submitGameWord(value, playerId){
		if(!$data.room || !$data.room.gaming) return;
		const typing = MODE[$data.room.mode] === "ETY";
		const id = playerId || $data._tid || fixture.id;
		const word = String(value || "").trim().toLowerCase();
		if(!word) return;
		if(!typing && id !== $data._tid) return;
		if(!typing && $data.room.opts.banletter && word.indexOf("x") >= 0){
			receive({type: "turnError", code: 408, value: word}); flush(1900); return;
		}
		if(!typing && playedWords.indexOf(word) >= 0){
			receive({type: "turnError", code: 409, value: word}); flush(1900); return;
		}
		if(!typing && $data._chars && word.charAt(0) !== $data._chars[0]){
			receive({ type: "turnError", code: 400, value: word });
			flush(1900);
			return;
		}
		if(!typing && (!/^[a-z]+$/.test(word) || !Object.prototype.hasOwnProperty.call(dictionary, word))){
			receive({type: "turnError", code: 404, value: word}); flush(1900); return;
		}
		// Actual Classic score formula, for a simulated 3.3-second submission.
		const base = 2 * (Math.pow(5 + 7 * word.length, 0.74) + 0.88 * playedWords.length) * (0.5 + 0.5 * (1 - 3300 / 12000));
		const hits = typing ? 0 : word.split(currentMission).length - 1;
		const score = typing ? word.length : Math.round(base * (1 + hits * 0.5));
		const bonus = typing ? 0 : score - Math.round(base);
		receive({ type: "turnEnd", target: id, ok: true, value: word, mean: dictionary[word] || "A word from this local demonstration round.", theme: word === "nebula" || word === "aurora" ? "450" : "", wc: "n", score, bonus });
		flush(2300);
		playedWords.push(word);
		gameWordsPlayed++;
		if(!typing){
			if(hits) currentMission = ["r", "a", "e", "n", "l"][(gameWordsPlayed + 2) % 5];
			const nextTurn = ($data.room.game.turn + 1) % $data.room.game.seq.length;
			startTurn(word.slice(-1), nextTurn);
		}else{
			$data._roundTime = 42600;
			route("turnGoing");
		}
		window.__demoSnapshot = { view: "game", words: gameWordsPlayed, mode: MODE[$data.room.mode], current: $data._tid };
	}
	const socket = {
		readyState: 1, close(){}, onmessage: null,
		send(raw){
			const message = JSON.parse(raw);
			window.__demoActions.push(clone(message));
			// Network sends become simulated server messages in this page only.
			if(message.type === "talk"){
				if(message.relay && $data.room && $data.room.gaming){
					nativeTimeout(() => submitGameWord(message.value, fixture.id), 0);
				}else receive({ type: "chat", profile: $data.users[fixture.id].profile, value: message.value, timestamp: fixture.now + clock });
			}else if(message.type === "clanChat" && $data.clan.my){
				const item = { senderId: fixture.id, senderName: $data.users[fixture.id].profile.title, text: message.value, time: fixture.now + clock };
				nativeTimeout(() => receive({ type: "clanChat", clanId: $data.clan.my.id, item }), 0);
			}else if(message.type === "clanList") receive({ type: "clanList", list: fixture.clan.list });
			else if(message.type === "enter") enterRoom(message.id, false);
			else if(message.type === "ready" && $data.room && !$data.room.gaming){
				const room = clone($data.room);
				room.readies[fixture.id].r = !$data.users[fixture.id].game.ready;
				receive({ type: "room", room });
			}
			else if(message.type === "start") enterRoom($data.place, true);
			else if(message.type === "leave") showView("lobby");
			else if(message.type === "equip"){
				const item = $data.shop[message.item];
				if(item){ $data.users[fixture.id].equip[item.group === "Mhand" ? (message.isLeft ? "Mlhand" : "Mrhand") : item.group] = message.item; drawMyDress(); updateMe(); }
			}
		}
	};
	window.ws = window.rws = socket;
	window.WebSocket = _WebSocket = function(){ throw new Error("Live sockets are disabled in the offline demo."); };
	bindDemoClientEvents();
	global.expl();
	function lobby(){
		$(".emblem-chest-close").trigger("click");
		timers.clear(); intervals.clear();
		if($data._spaced) $lib.Typing.spaceOff();
		$data.rooms = clone(fixture.rooms);
		Object.keys($data.users).forEach(id => { if(fixture.users[id]) $data.users[id].place = fixture.users[id].place; });
		$data.place = 0; $data.room = null; $data._gaming = false; $data._only = ""; $data._players = null;
		$data.resulting = false; $data._replay = false; $data._record = false; $data._myInfo = false; $data._shop = false;
		$data._clans = false; $data._communityOpen = false; $data._match1v1Open = false;
		$data.users[fixture.id].place = 0;
		clearLobbySidePageIntent();
		closeMyInfoOverlay();
		$(".dialog").hide();
		updateUI(undefined, true);
	}
	function enterRoom(id, gaming, typing){
		lobby();
		$data._chatHistory = [];
		renderChatHistory();
		const room = clone(fixture.rooms[id] || fixture.rooms[fixture.activeRoomId]);
		typing = !!typing || MODE[room.mode] === "ETY";
		if(room.players.indexOf(fixture.id) < 0){
			if(room.players.length < room.limit){
				room.players.push(fixture.id);
			}else{
				let replaced = room.players.indexOf("orbit");
				if(replaced < 0 || room.players[replaced] === room.master) replaced = room.players.findIndex(playerId => playerId !== room.master);
				const removedId = room.players[replaced];
				if($data.users[removedId]) $data.users[removedId].place = 0;
				delete room.readies[removedId];
				room.players[replaced] = fixture.id;
			}
		}
		room.players = [ fixture.id ].concat(room.players.filter(playerId => playerId !== fixture.id));
		room.readies[fixture.id] = { r: !!gaming, f: "J", t: 0 };
		if(typing) room.mode = MODE.indexOf("ETY");
		room.gaming = !!gaming;
		if(typing) room.opts = {};
		room.game = { title: "①②③", seq: room.players.slice(), turn: 0 };
		room.players.forEach((playerId, index) => {
			$data.users[playerId].place = room.id; $data.users[playerId].game.score = 0;
			room.readies[playerId] = {r: playerId !== room.master && (gaming || index % 3 !== 1), f: "J", t: 0};
		});
		receive({ type: "room", target: fixture.id, room });
		$data._players = room.players.join(",");
		$data._master = room.master;
		$data._gaming = !!gaming;
		if(gaming){
			gameReady();
			startRecord(room.game.title);
			$data._gaming = true;
			updateUI(true, true);
			flush(600);
			$stage.box.room.hide();
			currentMission = "r";
			playedWords = [];
			receive(typing ? { type: "roundReady", round: 2, list: [ "aurora", "canopy", "river", "luminous", "mosaic", "nebula", "serendipity", "quartz", "meadow", "horizon" ] } : { type: "roundReady", round: 2, char: "b", subChar: "", mission: currentMission, banLetters: room.opts.banletter ? ["x"] : [] });
			gameWordsPlayed = 0;
			if(typing){
				receive({ type: "turnStart", roundTime: 42600 });
				flush(120);
				submitGameWord("aurora", fixture.id);
				submitGameWord("canopy", fixture.id);
				room.game.seq.filter(playerId => playerId !== fixture.id).forEach((playerId, index) => {
					submitGameWord(index % 2 ? "luminous" : "mosaic", playerId);
					submitGameWord(index % 2 ? "river" : "nebula", playerId);
				});
			}else{
				for(let index = 0; index < room.game.seq.length; index++){
					startTurn(index ? chain[index - 1].slice(-1) : "b", index % room.game.seq.length);
					submitGameWord(chain[index], room.game.seq[index % room.game.seq.length]);
				}
			}
			const roomChat = typing ? [
				{ profile: $data.users.juniper.profile, value: "Accuracy first, speed later.", timestamp: fixture.now - 120000 }
			] : (fixture.roomChat || fixture.chat.slice(-2));
			roomChat.forEach(row => receive({ type: "chat", profile: row.profile, value: row.value, timestamp: row.timestamp }));
			// Let the real balloon expiry run before the still frame; the two chat
			// messages remain in native history without covering player cards.
			flush(3000);
			applyMiddleScale();
		}else{
			[ ["atlas", "Twelve in. Mission and Ban on. Ready?"], ["echo", "Ready. Saving a few R words."], ["nova", "Hat on. Tea ready."] ]
				.forEach((line, index) => receive({ type: "chat", profile: $data.users[line[0]].profile, value: line[1], timestamp: fixture.now - (5 - index) * 60000 }));
			flush(3000);
			[ ["sage", "One sec, swapping my hat."], [fixture.id, "Ready when you are."] ]
				.forEach((line, index) => receive({ type: "chat", profile: $data.users[line[0]].profile, value: line[1], timestamp: fixture.now - (2 - index) * 60000 }));
		}
		window.__demoSnapshot = { view: gaming ? "game" : "room", words: gameWordsPlayed, mode: MODE[room.mode] };
	}
	function showView(view){
		if($("#EmblemChestStage").attr("aria-busy") === "true") return;
		if(view === "game" || view === "classic" || view === "typing" || view === "room"){
			const roomId = view === "typing" ? Object.keys(fixture.rooms).find(id => MODE[fixture.rooms[id].mode] === "ETY") : fixture.activeRoomId;
			enterRoom(roomId, view !== "room", view === "typing");
			return;
		}
		lobby();
		if(view === "clans" || view === "clan"){
			$data.clan = clone(fixture.clan);
			activateLobbySidePage("clan", false);
			renderClanPageSafe();
		}else if(view === "community" || view === "library" || view === "ranking"){
			$data._communityTab = view === "community" ? "lobby" : view;
			activateLobbySidePage("community", false);
			renderFriendsPage();
			if(view === "library") requestCommunityLibrarySearch("aurora");
		}else if(view === "profile" || view === "inventory" || /^chest(?:-reveal)?$/.test(view)){
			$data._myInfo = true;
			updateUI(undefined, true);
			if(view === "inventory" || /^chest/.test(view)){
				$(".myinfo-tab[data-section='inventory']").trigger("click");
				renderMyInfoInventory();
			}
			if(/^chest/.test(view)){
				const openPreview = (attempt = 0) => {
					const $chest = $("#dress-" + fixture.chestId);
					if(!$chest.length){
						if(attempt < 20) return nativeTimeout(() => openPreview(attempt + 1), 50);
						throw new Error("Native inventory chest item did not render.");
					}
					$chest.trigger("click");
					if(view === "chest-reveal") $("#emblem-chest-open").trigger("click");
				};
				openPreview();
			}
		}else if(view === "shop"){
			$stage.menu.shop.trigger("click");
		}
		flush(100);
		applyMiddleScale();
		window.__demoSnapshot = { view, words: 0 };
	}
	window.demo = {
		view: showView, receive, flush,
		openChest(){ $("#emblem-chest-open").trigger("click"); },
		next(){
			if(!$data.room || !$data.room.gaming) return enterRoom(fixture.activeRoomId, true);
			const typing = MODE[$data.room.mode] === "ETY";
			const word = typing ? $data._list[$data.chain] : Object.keys(dictionary).find(value => value.charAt(0) === $data._chars[0] && value.length >= 4 && value.indexOf("x") < 0 && playedWords.indexOf(value) < 0);
			if(!word) return;
			submitGameWord(word, typing ? fixture.id : ($data._tid || fixture.id));
		},
		submit: submitGameWord,
		state(){ return { view: window.__demoSnapshot, users: Object.keys($data.users).length, rooms: Object.keys($data.rooms).length, players: $data.room ? $data.room.players.length : 0, chest: {opened: chestsOpened, remaining: $data.box[fixture.chestId] || 0, reward: clone($data.box[fixture.chestReward] || null), revealed: $("#EmblemChestStage").hasClass("is-revealed")}, actions: clone(window.__demoActions) }; }
	};
	receive({ type: "welcome", id: fixture.id, guest: false, admin: false, users: fixture.users, rooms: fixture.rooms, friends: fixture.friends, clan: fixture.clan, box: fixture.box, playTime: 3840000, okg: 6 });
	$data._friends = clone(fixture.friendPresence);
	$data._communityLobbyChatLog = clone(fixture.chat);
	$data._chatHistory = clone(fixture.chat);
	renderChatHistory();
	flush(2500);
	$("#Intro,#Loading,#global-notice,#Bottom").hide();
	$("body").toggleClass("dark-mode", !!$data.opts.dm);
	$stage.menu.exit.off("click.demo").on("click.demo", () => showView("lobby"));
	$stage.menu.start.off("click.demo").on("click.demo", () => enterRoom($data.place || fixture.activeRoomId, true));
	$stage.menu.newRoom.off("click.demo").on("click.demo", () => enterRoom(fixture.activeRoomId, false));
	$stage.menu.quickRoom.off("click.demo").on("click.demo", () => enterRoom(fixture.activeRoomId, false));
	$(".dialog-close").on("click.demo", function(){ $(this).closest(".dialog").hide(); });
	$("#top-close-btn").on("click.demo", () => showView("lobby"));
	$("#game-input").on("dblclick.demo", () => window.demo.next());
	$(window).on("resize.demo", applyMiddleScale);
	$(window).on("keydown.demo", function(event){
		if(event.key === "Escape") return showView("lobby");
		if(event.key === "ArrowRight" && event.altKey){ event.preventDefault(); window.demo.next(); }
	});
	$(document).on("click.demoExternal", "a[href^='http'],#menu-item-HOME", function(event){ event.preventDefault(); });
	$(document).on("submit.demo", "form", event => event.preventDefault());
	const query = new URLSearchParams(location.search);
	async function prepareProfilePhotos(){
		const profiles = fixture.profiles || fixture.users;
		const photos = {};
		await Promise.all(Object.keys(profiles).map(async id => {
			const user = profiles[id];
			// Simulate uploaded profile photos by composing the exact equipped sprite
			// nodes/order from the real Moremi renderer, including its mirrored hand.
			const $avatar = $("<div>");
			renderMoremi($avatar, user.equip || {});
			const images = $avatar.find("img").toArray();
			await Promise.all(images.map(image => new Promise((resolve, reject) => {
				if(image.complete) return image.naturalWidth ? resolve() : reject(new Error("Demo avatar asset missing: " + image.src));
				image.onload = resolve;
				image.onerror = () => reject(new Error("Demo avatar asset missing: " + image.src));
			})));
			const canvas = document.createElement("canvas");
			canvas.width = canvas.height = 200;
			const context = canvas.getContext("2d");
			images.forEach(image => {
				context.save();
				if(image.style.transform.indexOf("scaleX(-1)") >= 0){ context.translate(200, 0); context.scale(-1, 1); }
				context.drawImage(image, 0, 0, 200, 200);
				context.restore();
			});
			photos[id] = canvas.toDataURL("image/png");
		}));
		Object.keys(photos).forEach(id => {
			if(fixture.profiles && fixture.profiles[id]) fixture.profiles[id].profile.image = photos[id];
			if(fixture.users[id]) fixture.users[id].profile.image = photos[id];
			if($data.users[id]) $data.users[id].profile.image = photos[id];
		});
		fixture.chat.concat(fixture.roomChat || []).forEach(row => { if(photos[row.profile.id]) row.profile.image = photos[row.profile.id]; });
		$("#PROFILE_IMAGE").text(photos[fixture.id]);
		global.profile.image = photos[fixture.id];
		window.__demoAvatarCount = Object.keys(photos).length;
		document.body.setAttribute("data-demo-avatar-count", String(window.__demoAvatarCount));
	}
	// Load-sensitive fonts/images may settle after the synchronous fixture render.
	window.addEventListener("load", function(){ applyMiddleScale(); });
	if(document.fonts && document.fonts.ready) document.fonts.ready.then(applyMiddleScale);
	prepareProfilePhotos().then(function(){
		showView(query.get("view") || "lobby");
		updateMe();
		if(getOnly() === "for-lobby") updateUserList(true);
		applyMiddleScale();
		window.__demoReady = true;
		document.body.setAttribute("data-demo-ready", "true");
	}).catch(function(error){ window.__demoErrors.push(error.message); console.error("Demo preparation failed", error); });
}

module.exports = { createFixture, buildRuntime };
