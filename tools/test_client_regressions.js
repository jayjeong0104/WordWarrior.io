"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const clientBuild = require("./build_client");

const root = path.resolve(__dirname, "..");
const read = relativePath => fs.readFileSync(path.join(root, relativePath), "utf8");
const constants = read("Server/lib/const.js");
const ruleStart = constants.indexOf("exports.RULE =");
const ruleEnd = constants.indexOf("\n};", ruleStart) + 3;
assert.ok(ruleStart >= 0 && ruleEnd > ruleStart, "The server rule registry must be available.");
const server = { exports: {} };
vm.createContext(server);
vm.runInContext(constants.slice(ruleStart, ruleEnd), server);
const RULE = server.exports.RULE;
const MODE = Object.keys(RULE);

function element(){
	const state = { html: "", value: "", visible: true, attributes: {}, classes: new Set(), handlers: [] };
	const node = { style: { setProperty(){}, removeProperty(){} }, getBoundingClientRect(){ return { left: 0, top: 0, width: 400, height: 200 }; } };
	const methods = {
		length: 1, state,
		html(value){ if(arguments.length === 0) return state.html; state.html = String(value); return proxy; },
		text(value){ return arguments.length ? methods.html(value) : state.html; },
		val(value){ if(arguments.length === 0) return state.value; state.value = value; return proxy; },
		show(){ state.visible = true; return proxy; },
		hide(){ state.visible = false; return proxy; },
		is(selector){ return selector === ":visible" ? state.visible : false; },
		css(key, value){ if(key === "display" && arguments.length > 1) state.visible = value !== "none"; return proxy; },
		attr(key, value){ if(arguments.length === 1 && typeof key === "string") return state.attributes[key]; if(typeof key === "object") Object.assign(state.attributes, key); else state.attributes[key] = value; return proxy; },
		prop(key, value){ return methods.attr.apply(null, arguments); },
		addClass(value){ String(value).split(/\s+/).forEach(name => state.classes.add(name)); return proxy; },
		removeClass(value){ String(value).split(/\s+/).forEach(name => state.classes.delete(name)); return proxy; },
		hasClass(value){ return state.classes.has(value); },
		each(callback){ callback.call(node); return proxy; },
		get(){ return node; },
		data(){ return undefined; },
		children(){ const child = element(); child.length = 0; return child; },
		width(){ return arguments.length ? proxy : 400; },
		height(){ return arguments.length ? proxy : 200; },
		outerWidth(){ return 400; }, outerHeight(){ return 200; },
		on(event, selector, callback){ state.handlers.push({ event, selector, callback }); return proxy; },
		off(event, selector, callback){ state.handlers = state.handlers.filter(handler => handler.event !== event || handler.selector !== selector || handler.callback !== callback); return proxy; },
		ready(){ return proxy; }
	};
	const proxy = new Proxy(methods, { get(target, key){ return key in target ? target[key] : function(){ return proxy; }; } });
	return proxy;
}

function loadClient(source, filename){
	let timer = 0;
	const nodes = {};
	const $ = function(value){
		if(value && value.state) return value;
		if(typeof value === "string" && value.charAt(0) !== "<") return nodes[value] || (nodes[value] = element());
		return element();
	};
	$.extend = function(){ return Object.assign.apply(Object, arguments); };
	$.contains = function(){ return true; };
	const context = {
		$, L: { rounds: "ROUND", SECOND: "s" }, window: {}, document: {}, console,
		setTimeout(){ return ++timer; }, setInterval(){ return ++timer; },
		clearTimeout(){}, clearInterval(){}
	};
	vm.createContext(context);
	vm.runInContext(source, context, { filename });
	context.MODE = MODE;
	context.RULE = RULE;
	context.mobile = filename.endsWith(".min.js");
	context.$stage = { game: {}, box: {}, dialog: {} };
	["display", "here", "hereText", "items", "chain", "hints", "cwcmd", "bb", "round", "history", "turnBar", "roundBar"].forEach(key => context.$stage.game[key] = element());
	context.$stage.box.game = element();
	["result", "dress", "charFactory"].forEach(key => context.$stage.dialog[key] = element());
	context.$stage.talk = element();
	context.$stage.chatBtn = element();
	context.playSound = function(){ return { stop(){} }; };
	context.playBGM = context.stopBGM = context.loading = function(){};
	return context;
}

function prepareRoom(context, mode){
	context.$data = {
		id: "player", place: 1, _timers: [], _activeGameRule: "Daneo", _spectate: false,
		users: { player: { game: { score: 0 } } }, robots: {},
		room: { id: 1, mode, time: 60, round: 3, gaming: true, opts: {}, game: { title: "①②③④⑤⑥⑦⑧⑨⑩", turn: 0, seq: ["player"] } },
		_timePercent(){ return "50%"; }
	};
}

function roundData(rule){
	const data = { type: "roundReady", round: 1 };
	if(rule === "Classic") Object.assign(data, { char: "a", subChar: null });
	if(rule === "Jaqwi" || rule === "Daneo") data.theme = "e01";
	if(rule === "Hunmin") data.theme = "ㄱㄴ";
	if(rule === "Typing") data.list = ["apple", "boat"];
	if(rule === "Sock") data.board = "abcd";
	return data;
}

function checkDispatch(source, filename){
	const context = loadClient(source, filename);
	const original = {};
	const calls = [];
	Object.keys(context.$lib).forEach(rule => {
		original[rule] = Object.assign({}, context.$lib[rule]);
		["roundReady", "turnStart", "turnGoing", "turnEnd"].forEach(phase => {
			context.$lib[rule][phase] = function(){ calls.push([rule, phase]); };
		});
	});
	MODE.forEach((code, mode) => {
		prepareRoom(context, mode);
		const expected = RULE[code].rule;
		context.onMessage(roundData(expected));
		context.onMessage({ type: "turnStart", turn: 0 });
		context.route("turnGoing");
		context.onMessage({ type: "turnEnd", target: "player", ok: true, score: 25, bonus: 10 });
		assert.deepStrictEqual(calls.splice(0), [
			[expected, "roundReady"], [expected, "turnStart"], [expected, "turnGoing"], [expected, "turnEnd"]
		], `${filename}: ${code} must use its server-defined rule throughout the round`);
		assert.strictEqual(context.$data.room.mode, mode, `${filename}: the client must preserve ${code}'s server mode`);
	});
	Object.keys(original).forEach(rule => context.$lib[rule] = original[rule]);
	// Execute the actual round-ready handlers, including clearBoard and its helpers.
	MODE.forEach((code, mode) => {
		prepareRoom(context, mode);
		assert.doesNotThrow(() => context.onMessage(roundData(RULE[code].rule)), `${filename}: ${code} round initialization`);
	});
}

function checkMobileBonuses(source, filename){
	["Classic", "Daneo", "Hunmin"].forEach(rule => {
		const context = loadClient(source, filename);
		prepareRoom(context, MODE.findIndex(code => RULE[code].rule === rule));
		context.mobile = true;
		const rendered = [];
		const updated = [];
		context.$data._chars = ["a"];
		context.clearBetaLongWordDisplayState = context.stopTurnSound = context.checkFailCombo = context.pushDisplay = context.playBetaLongWordVfx = context.setClassicHiddenEntry = function(){};
		context.drawObtainedScore = function(card, score){ rendered.push(score.html()); return card; };
		context.updateScore = function(id, score){ updated.push([id, score]); };
		assert.doesNotThrow(() => context.$lib[rule].turnEnd("player", { ok: true, score: 25, bonus: 10, value: "apple" }), `${filename}: ${rule} mobile mission bonus`);
		assert.deepStrictEqual(rendered, ["+15+10"], `${filename}: ${rule} must render the base score plus bonus`);
		assert.deepStrictEqual(updated, [["player", 25]], `${filename}: ${rule} must finish updating the score`);
	});
}

function checkSockBoard(source, filename){
	const context = loadClient(source, filename);
	prepareRoom(context, MODE.indexOf("ESS"));
	context.$data._board = "abcd";
	context.$data._maps = [];
	context.$lib.Sock.drawDisplay = context.drawObtainedScore = context.updateScore = function(){};
	context.$lib.Sock.turnEnd("player", { score: 10, value: "ab" });
	assert.strictEqual(context.$data._board, "\u3000\u3000cd", `${filename}: used Sock letters must leave one blank cell each`);
	assert.strictEqual(context.$data._board.length, 4, `${filename}: Sock must preserve board dimensions`);
	context.$lib.Sock.turnStart({ roundTime: 60000 });
	assert.strictEqual(context.$stage.game.here.is(":visible"), true, `${filename}: Sock players need an input while chat is collapsed`);
	assert.strictEqual(context.$stage.game.hereText.prop("readonly"), false);
	context.$lib.Sock.turnEnd("player", {});
	assert.strictEqual(context.$stage.game.here.is(":visible"), false, `${filename}: Sock input must close between rounds`);
	context.$data._spectate = true;
	context.$lib.Sock.turnStart({ roundTime: 60000 });
	assert.strictEqual(context.$stage.game.here.is(":visible"), false, `${filename}: Sock spectators must not get a turn input`);
	context.$data._spectate = false;
	context.$data._replay = true;
	context.$lib.Sock.turnStart({ roundTime: 60000 });
	assert.strictEqual(context.$stage.game.here.is(":visible"), false, `${filename}: Sock replays must not get a turn input`);
}

function checkTypingSpace(source, filename){
	const context = loadClient(source, filename);
	prepareRoom(context, MODE.indexOf("ETY"));
	let submissions = 0;
	context.$stage.chatBtn.trigger = function(){ submissions++; };
	function pressSpace(id){
		let prevented = false;
		context.$("body").state.handlers.forEach(handler => {
			if(handler.event !== "keydown" || !handler.selector.split(/,\s*/).includes("#" + id)) return;
			handler.callback({ keyCode: 32, preventDefault(){ prevented = true; } });
		});
		return prevented;
	}
	context.$lib.Typing.spaceOn();
	assert.strictEqual(pressSpace("Talk"), true, `${filename}: Space must submit from the open chat input`);
	assert.strictEqual(pressSpace("game-input"), true, `${filename}: Space must submit from the game input`);
	assert.strictEqual(submissions, 2);
	context.$lib.Typing.spaceOff();
	assert.strictEqual(pressSpace("Talk"), false, `${filename}: normal chat must recover Space after Typing ends`);
	context.$data.room.opts.proverb = true;
	context.$lib.Typing.spaceOn();
	assert.strictEqual(pressSpace("game-input"), false, `${filename}: proverb spaces must remain part of the answer`);
}

function checkClanDraftPreservation(source){
	const context = loadClient(source, "authoritative sources");
	const identity = "player:clan:one";
	let storedIdentity = identity;
	let fields = {};
	function field(value){
		const node = {
			selectionStart: 2, selectionEnd: 5, selectionDirection: "forward", focusCalls: 0,
			focus(){ this.focusCalls++; context.document.activeElement = this; },
			setSelectionRange(start, end, direction){ this.selectionStart = start; this.selectionEnd = end; this.selectionDirection = direction; }
		};
		return {
			0: node, length: 1, value,
			first(){ return this; },
			val(next){ if(arguments.length === 0) return this.value; this.value = next; return this; }
		};
	}
	const missing = { length: 0, first(){ return this; }, val(){ return this; } };
	const section = { data(){ return storedIdentity; }, find(selector){ return fields[selector] || missing; } };
	fields[".js-clan-message"] = field("partly typed message");
	context.document.activeElement = fields[".js-clan-message"][0];
	const draft = context.captureClanPageRenderState(section, identity);
	const replacement = field("");
	fields = { ".js-clan-message": replacement };
	context.document.activeElement = {};
	context.restoreClanPageRenderState(section, draft, false);
	assert.strictEqual(replacement.value, "partly typed message", "same-clan refresh keeps its message draft");
	assert.strictEqual(replacement[0].focusCalls, 0, "value restoration does not focus an input");
	context.restoreClanPageRenderState(section, draft, true);
	assert.strictEqual(context.document.activeElement, replacement[0], "same focused field recovers focus");
	assert.strictEqual(replacement[0].selectionStart, 2);
	assert.strictEqual(replacement[0].selectionEnd, 5);
	assert.strictEqual(replacement[0].selectionDirection, "forward");

	const navigationButton = {};
	context.document.activeElement = navigationButton;
	const unfocusedDraft = context.captureClanPageRenderState(section, identity);
	fields = { ".js-clan-message": field("") };
	context.restoreClanPageRenderState(section, unfocusedDraft, true);
	assert.strictEqual(context.document.activeElement, navigationButton, "refresh does not steal focus from navigation");
	assert.strictEqual(fields[".js-clan-message"][0].focusCalls, 0);
	storedIdentity = "player:clan:two";
	fields[".js-clan-message"].value = "";
	context.restoreClanPageRenderState(section, draft, true);
	assert.strictEqual(fields[".js-clan-message"].value, "", "another clan does not inherit the old draft");
	assert.strictEqual(context.captureClanPageRenderState(section, identity), null);

	storedIdentity = "player:recruiting";
	const values = { ".js-clan-name": "My crew", ".js-clan-about": "Between rounds", ".js-clan-search": "crew", ".js-clan-border": "#123456", ".js-clan-fill": "#654321", ".js-clan-pattern": "tiles4", ".js-clan-logo": "letters", ".js-clan-logo-text": "MC" };
	fields = Object.fromEntries(Object.keys(values).map(selector => [ selector, field(values[selector]) ]));
	const form = context.captureClanPageRenderState(section, storedIdentity);
	fields = Object.fromEntries(Object.keys(values).map(selector => [ selector, field("") ]));
	context.restoreClanPageRenderState(section, form, true);
	Object.keys(values).forEach(selector => assert.strictEqual(fields[selector].value, values[selector], "recruiting refresh keeps " + selector));
	storedIdentity = "another-player:recruiting";
	fields[".js-clan-name"].value = "";
	context.restoreClanPageRenderState(section, form, true);
	assert.strictEqual(fields[".js-clan-name"].value, "", "another account does not inherit form drafts");
}

function checkClientPresentation(source){
	const context = loadClient(source, "presentation helpers");
	context.$("#LANG").text("en_US");
	assert.strictEqual(context.getClientLocale(), "en-US");
	assert.strictEqual(context.formatClientTime({ toLocaleTimeString(locale){ return locale; } }), "en-US", "chat time uses the game locale rather than the browser locale");
	context.$("#LANG").text("ko_KR");
	assert.strictEqual(context.getClientLocale(), "ko-KR");
	context.$("#LANG").text("invalid locale");
	assert.strictEqual(context.getClientLocale(), "en-US");

	const image = element();
	const icons = [];
	image.prepend = function(icon){ icons.push(icon); return image; };
	context.$("#LANG").text("ko_KR");
	context.renderLocalizedItemImage(image, { _id: "red_name", group: "NIK" });
	assert.strictEqual(icons.length, 0, "Korean nickname thumbnails remain unchanged");
	context.$("#LANG").text("en_US");
	context.renderLocalizedItemImage(image, { _id: "red_name", group: "NIK" });
	assert.strictEqual(icons.length, 1);
	assert.ok(icons[0].hasClass("fa-font"));
	assert.strictEqual(icons[0].attr("aria-hidden"), "true");
	context.renderLocalizedItemImage(image, { _id: "redbere", group: "Mhead" });
	assert.strictEqual(icons.length, 1, "equipment art remains unchanged");

	const originalQuery = context.$;
	let viewportWidth = 1280;
	let players = 12;
	let styles;
	context.$ = function(value){ return value === context.window ? { width(){ return viewportWidth; } } : originalQuery(value); };
	context.$stage = { game: { chain: element() } };
	context.mobile = false;
	context.syncChainSignToDefinitions = function(){};
	const body = context.$(".GameBox .game-body");
	body.children = function(){ return { length: players }; };
	body.css = function(value){ styles = value; return body; };
	context.syncInGameViewportLayout();
	assert.strictEqual(styles.width, "1840px", "a full roster retains the native single-row card spacing");
	assert.strictEqual(styles["--game-user-scale"], "0.6087", "small viewports retain the native uniform roster scaling");
	assert.strictEqual(body.hasClass("is-dense-roster"), false, "viewport changes do not switch to a redesigned card grid");
	players = 6;
	context.syncInGameViewportLayout();
	assert.strictEqual(styles.width, "916px");
	assert.strictEqual(styles["--game-user-scale"], "1.0000", "a smaller roster keeps native card proportions");
	viewportWidth = 1920;
	players = 12;
	context.syncInGameViewportLayout();
	assert.strictEqual(styles.width, "1840px");
	assert.strictEqual(styles["--game-user-scale"], "0.9565");
	context.mobile = true;
	viewportWidth = 1280;
	context.syncInGameViewportLayout();
	assert.strictEqual(styles.width, "1840px", "mobile retains the pre-screenshot layout path");
	context.mobile = false;
	body.addClass("cw");
	context.syncInGameViewportLayout();
	assert.strictEqual(styles.width, "", "Crossword and Sock clear the full-row width");
	assert.strictEqual(styles["--game-user-scale"], "", "Crossword and Sock clear the full-row scale");
}

clientBuild.buildClient({ check: true });
const source = clientBuild.compileClient();
checkClanDraftPreservation(source);
checkClientPresentation(source);
clientBuild.OUTPUT_FILES.forEach(filename => {
	const output = read(filename);
	assert.strictEqual(output, source, `${filename}: must be generated from the same authoritative source`);
	checkDispatch(output, filename);
	checkMobileBonuses(output, filename);
	checkSockBoard(output, filename);
	checkTypingSpace(output, filename);
});

const tasks = {};
let gruntConfig;
require("../Server/lib/Gruntfile")({
	initConfig(config){ gruntConfig = config; },
	loadNpmTasks(){},
	registerTask(name, description, callback){ tasks[name] = callback || description; }
});
assert.deepStrictEqual(tasks.default, ["client", "uglify"]);
assert.deepStrictEqual(tasks.pack, ["client"], "pack must rebuild once rather than wrap an existing file");
assert.ok(!Object.keys(gruntConfig.uglify.build.files).some(filename => /in_game_kkutu\.min\.js$/.test(filename)), "uglify must not overwrite the shared game client");

console.log(`Client regression checks passed (${MODE.length} modes, 3 outputs, mobile bonuses, Sock board, clan drafts/focus, locale/item icons, roster sizing, deterministic build).`);
