"use strict";

// Isolated localhost preview. Only actual client declarations and static assets are
// served; production ready.js, WebSocket startup and application endpoints are absent.
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const http = require("http");
const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "Server/lib/Web/public");
const BASELINE = path.join(ROOT, "tmp/social-ui-baseline");
const CLIENT = path.join(ROOT, "Server/lib/Web/lib/kkutu");
const PORT = Number(process.env.SOCIAL_PREVIEW_PORT) || 4173;
const acornModule = { exports: {} };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, "Server/lib/node_modules/acorn-globals/node_modules/acorn/dist/acorn.js"), "utf8"), { exports: acornModule.exports, module: acornModule });
const acorn = acornModule.exports;
const language = JSON.parse(fs.readFileSync(path.join(ROOT, "Server/lib/Web/lang/en_US.json"), "utf8").replace(/^\uFEFF/, ""));
const constants = fs.readFileSync(path.join(ROOT, "Server/lib/const.js"), "utf8");
const ruleStart = constants.indexOf("exports.RULE =");
const ruleEnd = constants.indexOf("\n};", ruleStart) + 3;
const constantContext = { exports: {} };
vm.runInNewContext(constants.slice(ruleStart, ruleEnd), constantContext);
const RULE = constantContext.exports.RULE;
function declarations(source){
	const tree = acorn.parse(source, { ecmaVersion: 2020, sourceType: "script" });
	return tree.body.filter(node => node.type === "FunctionDeclaration" || node.type === "VariableDeclaration")
		.map(node => node.type === "VariableDeclaration" ? node.declarations.filter(decl => decl.id.name !== "audioContext")
			.map(decl => node.kind + " " + source.slice(decl.start, decl.end) + ";").join("\n") : source.slice(node.start, node.end)).join("\n");
}
const FIXTURE_NOW = Date.UTC(2026, 9, 2, 15, 30);
const members = [
	{ id: "fixture-you", name: "Wordsmith", role: "owner", online: true, joinedAt: FIXTURE_NOW - 86400000 * 18 },
	{ id: "mira", name: "Mira", role: "member", online: true, joinedAt: FIXTURE_NOW - 86400000 * 12 },
	{ id: "pixel", name: "Pixel", role: "member", online: true, joinedAt: FIXTURE_NOW - 86400000 * 8 },
	{ id: "atlas", name: "Atlas", role: "member", online: false, joinedAt: FIXTURE_NOW - 86400000 * 5 },
	{ id: "nova", name: "Nova", role: "member", online: false, joinedAt: FIXTURE_NOW - 86400000 * 3 }
];
const clans = [
	{ id: "fixture-northstar", name: "Northstar", about: "Curious minds. Better words. Play a little every day.", memberCount: 24, onlineCount: 8, banner: { fill: "#486acc", border: "#20375f", logo: "star", pattern: "solid" }, mission: { title: "Share 120 messages with your clan", progress: 86, goal: 120, reward: 200 } },
	{ id: "fixture-letterleague", name: "Letter League", about: "A friendly home for word-game explorers of every level.", memberCount: 18, onlineCount: 5, banner: { fill: "#6a53b2", border: "#302354", logo: "letters", text: "LL", pattern: "vsplit2" }, mission: { title: "Share 100 messages with your clan", progress: 41, goal: 100, reward: 180 } },
	{ id: "fixture-greenhouse", name: "Greenhouse", about: "Small steps, new vocabulary, and good company.", memberCount: 12, onlineCount: 4, banner: { fill: "#308b70", border: "#164e40", logo: "pencil", pattern: "solid" }, mission: { title: "Share 80 messages with your clan", progress: 62, goal: 80, reward: 150 } },
	{ id: "fixture-quicktype", name: "Quick Type", about: "Fast fingers and thoughtful words. Ranked nights on Fridays.", memberCount: 31, onlineCount: 11, banner: { fill: "#dd8b36", border: "#73451d", logo: "bolt", pattern: "hstripes3" }, mission: { title: "Share 160 messages with your clan", progress: 122, goal: 160, reward: 240 } }
];
const myClan = Object.assign({}, clans[0], { owner: "fixture-you", memberCount: members.length, createdAt: FIXTURE_NOW - 86400000 * 18, members,
	chat: [
		{ type: "system", text: "Mira joined Northstar. Welcome!", time: FIXTURE_NOW - 3600000 },
		{ senderId: "mira", senderName: "Mira", text: "Anyone up for a relaxed English chain round?", time: FIXTURE_NOW - 1500000 },
		{ senderId: "pixel", senderName: "Pixel", text: "I am in! Just learned a few new astronomy words.", time: FIXTURE_NOW - 900000 },
		{ senderId: "fixture-you", senderName: "Wordsmith", text: "Great. Meet in the lobby in five minutes.", time: FIXTURE_NOW - 300000 }
	] });
const names = [ "Wordsmith", "Mira", "Pixel", "Atlas", "Nova", "Juniper", "Sage", "Lumen", "Echo", "Rowan", "Aria", "Finch", "Cedar", "Kite", "Orion" ];
const ids = [ "fixture-you", "mira", "pixel", "atlas", "nova", "juniper", "sage", "lumen", "echo", "rowan", "aria", "finch", "cedar", "kite", "orion" ];
const users = {};
ids.forEach((id, index) => { users[id] = { id, profile: { id, title: names[index], name: names[index] }, data: { score: 240000 - index * 12000 }, equip: {}, place: index > 5 ? 102 : 0, game: { form: "J", ready: false, team: 0 } }; });
const rooms = { 101: { id: 101, title: "Friendly English Chain", master: "mira", players: [ "mira", "pixel" ], limit: 6, mode: 1, round: 3, time: 60, gaming: false, opts: {}, password: false }, 102: { id: 102, title: "Quick word practice", master: "juniper", players: ids.slice(6, 10), limit: 8, mode: 7, round: 3, time: 60, gaming: true, opts: {}, password: false } };
const vocab = { lists: [
	{ id: "fixture-nature", name: "Nature & curiosity", createdAt: FIXTURE_NOW - 86400000 * 4, words: [ { word: "aurora", lang: "en", mean: "A natural display of coloured light in the sky.", theme: "450" }, { word: "canopy", lang: "en", mean: "The upper layer of a forest.", theme: "220" }, { word: "serendipity", lang: "en", mean: "The discovery of something good by chance.", theme: "160" } ] },
	{ id: "fixture-practice", name: "This week's discoveries", createdAt: FIXTURE_NOW - 86400000 * 2, words: [ { word: "luminous", lang: "en", mean: "Giving off light.", theme: "160" }, { word: "mosaic", lang: "en", mean: "A pattern made from many small pieces.", theme: "160" } ] },
	{ id: "fixture-ranking", name: "Ranked round essentials", createdAt: FIXTURE_NOW - 86400000, words: [ { word: "quartz", lang: "en", mean: "A common crystalline mineral.", theme: "220" } ] }
], limits: { lists: 5, words: 50 } };
const ranking = { page: 0, data: ids.map((id, rank) => ({ id, rank, score: users[id].data.score, name: names[rank], profile: { title: names[rank] } })) };
const fixture = { clans, myClan, users, rooms, vocab, ranking, now: FIXTURE_NOW };
function runtime(before){
	const directory = before ? BASELINE : CLIENT;
	return "window.L=" + JSON.stringify(Object.assign({}, language.GLOBAL, language.kkutu)) + ";window.audioContext=false;\n" + declarations(fs.readFileSync(path.join(directory, "head.js"), "utf8")) + "\n" + declarations(fs.readFileSync(path.join(directory, "body.js"), "utf8")) + "\n" + bootstrap.toString() + ";bootstrap(" + JSON.stringify(fixture) + "," + JSON.stringify(RULE) + ");";
}
function bootstrap(fixture, rules){
	window.__socialPreviewActions = [];
	window.ws = window.rws = undefined;
	window.RULE = rules; window.MODE = Object.keys(rules); window.mobile = false;
	window.MOREMI_PART = [ "back", "eye", "mouth", "shoes", "clothes", "head", "lhand", "rhand", "front" ];
	window.EXP = Array.from({ length: 360 }, (_, index) => Math.pow(index + 1, 2.5) * 100);
	window.$data = { id: "fixture-you", server: "1", place: 0, guest: false, money: 1240, shop: {}, users: fixture.users, rooms: fixture.rooms,
		friends: { mira: "Mira", pixel: "Pixel", atlas: "Atlas", nova: "Nova" }, _friends: { mira: { server: "1" }, pixel: { server: "1" }, atlas: {}, nova: {} },
		_shut: {}, opts: {}, _timers: [], _communityTab: "lobby", _communityRanking: fixture.ranking, _communityVocab: fixture.vocab,
		_communityVocabSelected: "fixture-nature", _communityLibraryQuery: "aurora", _communityLobbyChatLog: [
			{ profile: fixture.users.mira.profile, value: "Hello everyone! Any relaxed rooms open?", timestamp: fixture.now - 1200000 },
			{ profile: fixture.users.pixel.profile, value: "Friendly English Chain is waiting for two more players.", timestamp: fixture.now - 840000 },
			{ profile: fixture.users["fixture-you"].profile, value: "Sounds good. See you there!", timestamp: fixture.now - 360000 }
		], clan: { my: null, list: fixture.clans } };
	const normalData = JSON.parse(JSON.stringify($data));
	window.$stage = { box: { userList: $(".UserListBox"), clans: $(".ClanBox"), friends: $(".FriendsBox"), roomList: $(".RoomListBox") }, menu: { clans: $("#ClansBtn"), community: $("#CommunityBtn") }, dialog: {}, lobby: {}, game: {} };
	const $actions = $('<details class="preview-actions"><summary>Mock actions (0)</summary><pre></pre></details>').appendTo('body');
	function recordAction(action){ window.__socialPreviewActions.push(action); $actions.find('summary').text('Mock actions (' + window.__socialPreviewActions.length + ')'); $actions.find('pre').text(JSON.stringify(window.__socialPreviewActions, null, 2)); }
	window.send = function(type, payload){ recordAction({ type, payload }); $("#preview-status").text("Mock action only: " + type); };
	window.notice = window.requestProfile = function(value){ $("#preview-status").text("Mock interaction only: " + value); };
	window.playSound = function(){ return { stop(){} }; };
	window.confirmOpenExternalLink = function(){ return false; };
	$.cookie = function(){ return null; };
	$.get = function(url, callback){
		const result = /ranking/.test(url) ? fixture.ranking : /vocab/.test(url) ? fixture.vocab : /friend/.test(url) ? { list: [ { id: "mira", name: "Mira" } ] } : { word: "aurora", mean: "A natural display of coloured light in the sky.", theme: "450", type: "noun" };
		const d = $.Deferred(); if(callback) callback(JSON.parse(JSON.stringify(result))); d.resolve(result); return d.promise();
	};
	$.post = $.ajax = function(){ const d = $.Deferred(); recordAction({ type: "mock-http", arguments: Array.from(arguments).filter(value => typeof value !== 'function') }); $("#preview-status").text("Mock HTTP action only; no data written."); d.resolve(fixture.vocab); return d.promise(); };
	function draw(){
		const page = $("#preview-page").val();
		const scenario = $('#preview-scenario').val() || 'normal';
		const clone = value => JSON.parse(JSON.stringify(value));
		$data.clan.list = clone(fixture.clans);
		$data.clan.my = $("#preview-clan-state").val() === "member" ? JSON.parse(JSON.stringify(fixture.myClan)) : null;
		[ 'friends', '_friends', 'users', 'rooms', '_communityLobbyChatLog' ].forEach(key => { $data[key] = clone(normalData[key]); });
		$data._communityRanking = clone(fixture.ranking);
		$data._communityVocab = clone(fixture.vocab);
		$data._communityRankingLoading = $data._communityVocabLoading = $data._communityLibraryLoading = $data._friendSearchLoading = false;
		$data._communityRankingError = $data._communityVocabError = $data._communityVocabStatus = '';
		$data._communityLibraryResult = null;
		$data._friendSearchResults = null;
		if(scenario === 'empty'){
			$data.clan.list = [];
			if($data.clan.my){ $data.clan.my.members = []; $data.clan.my.chat = []; $data.clan.my.memberCount = 0; }
			$data.friends = {}; $data._friends = {}; $data._communityLobbyChatLog = [];
			$data._communityRanking = { page: 0, data: [] };
			$data._communityVocab = { lists: [], limits: { lists: 5, words: 50 } };
			$data._friendSearchResults = [];
		}else if(scenario === 'loading'){
			$data._communityRankingLoading = $data._communityVocabLoading = $data._communityLibraryLoading = $data._friendSearchLoading = true;
		}else if(scenario === 'error'){
			$data._communityRanking = null; $data._communityRankingError = 'Fixture: rankings are temporarily unavailable. Please try again.';
			$data._communityVocabError = 'Fixture: vocabulary could not be loaded. Please try again.';
			$data._communityLibraryResult = { type: 'error', text: 'Fixture: dictionary search is temporarily unavailable.' };
			// The actual friend-search failure branch falls back to an empty result list.
			$data._friendSearchResults = [];
		}else if(scenario === 'long'){
			const about = 'A friendly gathering of curious word explorers who enjoy relaxed games, thoughtful conversation, and new discoveries daily.'.slice(0, 120);
			const message = 'I just discovered an extraordinary collection of astronomy and nature vocabulary. Would anyone like to try a relaxed English round together and share the words they have learned today?';
			$data.clan.list.forEach((clan, index) => { clan.name = [ 'Northstar Word Explorers', 'The Extraordinary League', 'Curious Greenhouse Guild', 'Lightning Letter Players' ][index]; clan.about = about; });
			if($data.clan.my){ $data.clan.my.name = 'Northstar Word Explorers'; $data.clan.my.about = about; $data.clan.my.members.forEach((member, index) => { member.name = [ 'Wordsmith Wanderer', 'Mira Moonwatcher', 'Pixel Pathfinder', 'Atlas Adventurer', 'Nova Nightingale' ][index]; }); $data.clan.my.chat.forEach(row => { if(row.type !== 'system'){ row.senderName = 'Mira Moonwatcher'; row.text = message; } }); }
			Object.keys($data.friends).forEach(id => { $data.friends[id] = id === 'mira' ? 'Mira Moonwatcher' : 'Extraordinary Scout'; });
			$data._communityLobbyChatLog.forEach(row => { row.profile.title = 'Wordsmith Wanderer'; row.value = message; });
			$data._communityRanking.data.forEach(row => { row.name = 'Extraordinary Scout'; row.profile.title = row.name; });
			$data._communityVocab.lists.forEach(list => { list.name = 'Discoveries in the natural world'; });
		}
		$('#preview-status').text('Fixture scenario: ' + scenario + (scenario === 'error' ? ' · friend-search errors use its real empty-results fallback' : ' · no live connections'));
		$data._communityTab = $("#preview-tab").val();
		$data._clans = page === "clans"; $data._communityOpen = page === "community";
		$("body").toggleClass("clan-open", page === "clans").toggleClass("community-open", page === "community").addClass("lobby-no-chat");
		$(".ClanBox").toggle(page === "clans"); $(".FriendsBox").toggle(page === "community");
		$("#ClansBtn").toggleClass("toggled", page === "clans"); $("#CommunityBtn").toggleClass("toggled", page === "community");
		setLobbySidePageIntent(page === "clans" ? "clan" : "community");
		if(page === "clans") { showClanPageBox(); renderClanPageSafe(); } else { showCommunityPageBox(); renderFriendsPage(); }
		applyMiddleScale();
		window.__socialPreviewReady = true;
	}
	const q = new URLSearchParams(location.search);
	$('<label>Scenario <select id="preview-scenario"><option value="normal">Normal</option><option value="empty">Empty</option><option value="loading">Loading</option><option value="error">Error</option><option value="long">Long names</option></select></label>').insertBefore('#preview-status');
	$("#preview-page").val(q.get("page") || "clans"); $("#preview-clan-state").val(q.get("state") || "recruiting"); $("#preview-tab").val(q.get("tab") || "lobby");
	$('#preview-scenario').val(q.get('scenario') || 'normal');
	$("#preview-source").val(q.get("source") || "before").on("change", function(){ q.set("source", this.value); q.set("page", $("#preview-page").val()); q.set("state", $("#preview-clan-state").val()); q.set("tab", $("#preview-tab").val()); q.set('scenario', $('#preview-scenario').val()); location.search = q.toString(); });
	$("#preview-page,#preview-clan-state,#preview-tab,#preview-scenario").on("change", draw);
	$("#ClansBtn").on("click", () => { $("#preview-page").val("clans"); draw(); });
	$("#CommunityBtn").on("click", () => { $("#preview-page").val("community"); draw(); });
	$("#preview-dark").on("change", function(){ $("body").toggleClass("dark-mode", this.checked); });
	$('<button type="button" id="preview-refresh">Simulate refresh</button>').insertBefore('#preview-status').on('mousedown', function(event){ event.preventDefault(); }).on('click', function(){
		if($('#preview-page').val() === 'clans') renderClanPageSafe(true); else renderFriendsPage();
		$('#preview-status').text('Fixture renderer refreshed; no data written.');
	});
	draw();
	$(window).on("resize.preview", applyMiddleScale);
}
function page(before){
	const source = before ? "before" : "after";
	const css = [ "style.css", "fa.css", "expl.css", "in_kkutu.css", "in_game_kkutu_shop.css", "emblem_chest.css", "supercell_magic_shadow.css", "beta_longword.css" ].map(name => '<link rel="stylesheet" href="/css/' + name + '?source=' + source + '">').join("\n");
	return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Social UI fixture preview</title>' + css + (before ? '' : '<link rel="stylesheet" href="/css/social_hub.css">') + '<link rel="stylesheet" href="/preview/frame.css"></head><body><div class="preview-controls"><strong>FIXTURE PREVIEW</strong><label>Source <select id="preview-source"><option value="before">Before baseline</option><option value="after">After current source</option></select></label><label>Page <select id="preview-page"><option value="clans">Clans</option><option value="community">Community</option></select></label><label>Clan <select id="preview-clan-state"><option value="recruiting">Recruiting</option><option value="member">Member</option></select></label><label>Community <select id="preview-tab"><option value="lobby">Lobby</option><option value="friends">Friends</option><option value="ranking">Ranking</option><option value="library">Vocabulary</option></select></label><label><input id="preview-dark" type="checkbox"> Dark</label><span id="preview-status">Deterministic fixture data · no live connections</span></div><div id="Top"><div id="top-profile-card"><div class="top-profile-main"><div class="top-profile-avatar jt-image" style="background-image:url(/img/kkutu/moremi/body_fla.png)"></div><div class="top-profile-meta"><div class="top-profile-name">Wordsmith</div><div class="top-profile-level-text">LV 42</div></div></div><div class="top-profile-spacer"></div><div class="top-profile-gems">1,240</div><button class="top-profile-settings"><i class="fa fa-bell"></i></button><button class="top-profile-settings"><i class="fa fa-cog"></i></button></div></div><div id="Jungle"><div class="kkutu-menu"><button id="NewRoomBtn" style="background:#d9ff82"><i class="fa fa-plus"></i>NEW ROOM</button><button id="Match1v1Btn" style="background:#ffdb6e"><i class="fa fa-trophy"></i>1 v 1</button><button id="DictionaryBtn" style="background:#73d07a"><i class="fa fa-book"></i>DICTIONARY</button><button id="ShopBtn" style="background:#93e8c2"><i class="fa fa-shopping-bag"></i>SHOP</button><button id="ClansBtn" style="background:#9edbff"><span class="clan-menu-icon"><span class="shield-shape"></span><span class="sword-down"></span></span>CLANS</button><button id="CommunityBtn" style="background:#daa9ff"><i class="fa fa-comments"></i>COMMUNITY</button></div></div><div id="Middle"><aside class="UserListBox Product"><h5 class="product-title"><span class="online-dot"></span> 15 online</h5><div class="product-body"><div class="preview-person">Wordsmith <small>In lobby</small></div><div class="preview-person">Mira <small>In lobby</small></div><div class="preview-person">Pixel <small>In lobby</small></div><div class="preview-person">Juniper <small>Quick word practice</small></div><div class="preview-person">Sage <small>Playing</small></div><div class="preview-person">Lumen <small>Playing</small></div></div></aside><div class="ClanBox Product is-lobby-side-page-active"><h5 class="product-title">CLANS</h5><div class="product-body"><div class="clan-page"></div></div></div><div class="FriendsBox Product is-lobby-side-page-active"><h5 class="product-title">COMMUNITY</h5><div class="product-body"><div class="friends-page"></div></div></div></div><script src="/js/jquery.js"></script><script src="/preview/runtime.js?source=' + source + '"></script></body></html>';
}
const frameCSS = ".preview-controls{position:fixed;inset:0 0 auto;z-index:10000;display:flex;gap:12px;align-items:center;flex-wrap:wrap;min-height:40px;box-sizing:border-box;background:#142039;color:#edf3ff;padding:8px 14px;font:12px Arial,sans-serif}.preview-controls label{display:flex;gap:5px;align-items:center}.preview-controls select{padding:4px;color:#172238;border-radius:5px}.preview-controls input{display:inline;width:auto}.preview-controls strong{letter-spacing:1px}.preview-controls #preview-status{margin-left:auto;opacity:.75}.preview-controls button{font:12px Arial,sans-serif;padding:5px 8px;border-radius:5px}.preview-actions{position:fixed;bottom:8px;left:8px;z-index:10000;background:#142039;color:#edf3ff;border:1px solid #52647b;border-radius:7px;padding:7px 10px;font:11px Arial,sans-serif;max-width:420px}.preview-actions pre{max-height:220px;overflow:auto;white-space:pre-wrap}#Top{top:52px}#top-profile-card{margin:0 auto}body:not(.in-game) #Middle{top:158px;min-height:calc(100vh - 158px)}.kkutu-menu{top:162px}.preview-person{float:none!important;width:100%;box-sizing:border-box;padding:14px 6px;border-bottom:1px solid #dce3ef;font-weight:bold;color:#24324a}.preview-person small{display:block;font-size:10px;color:#6c7b95;margin-top:5px}.preview-person:last-child{border:0}@media(max-width:760px){.preview-controls{min-height:72px}#Top{top:82px}body:not(.in-game) #Middle{top:188px}.kkutu-menu{top:192px}.preview-controls #preview-status{display:none}}";
const types = { ".css": "text/css", ".js": "application/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".woff": "font/woff", ".ttf": "font/ttf", ".json": "application/json" };
const server = http.createServer((req, res) => {
	try{
		if(req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405); return res.end("Read-only fixture preview"); }
		const url = new URL(req.url, "http://127.0.0.1:" + PORT);
		const before = url.searchParams.get("source") !== "after";
		res.setHeader("Cache-Control", "no-store");
		if(url.pathname === "/") { res.setHeader("Content-Type", "text/html; charset=utf-8"); return res.end(page(before)); }
		if(url.pathname === "/preview/runtime.js") { res.setHeader("Content-Type", "application/javascript; charset=utf-8"); return res.end(runtime(before)); }
		if(url.pathname === "/preview/frame.css") { res.setHeader("Content-Type", "text/css"); return res.end(frameCSS); }
		const relative = decodeURIComponent(url.pathname).replace(/^\/+/, "");
		let filename = path.resolve(PUBLIC, relative);
		if(!filename.startsWith(PUBLIC + path.sep)) { res.writeHead(403); return res.end(); }
		if(before && relative.startsWith("css/") && fs.existsSync(path.join(BASELINE, path.basename(relative)))) filename = path.join(BASELINE, path.basename(relative));
		if(!fs.existsSync(filename) || !fs.statSync(filename).isFile()) { res.writeHead(404); return res.end(); }
		res.setHeader("Content-Type", types[path.extname(filename)] || "application/octet-stream");
		if(req.method === "HEAD") return res.end();
		fs.createReadStream(filename).pipe(res);
	}catch(error){ res.writeHead(500, { "Content-Type": "text/plain" }); res.end(error.stack); }
});
server.listen(PORT, "127.0.0.1", () => console.log("Read-only social UI preview: http://127.0.0.1:" + PORT + "/?source=before&page=clans&state=recruiting"));
