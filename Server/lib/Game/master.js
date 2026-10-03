/**
 * Rule the words! KKuTu Online
 * Copyright (C) 2017 JJoriping(op@jjo.kr)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <http://www.gnu.org/licenses/>.
 */

var Cluster = require("cluster");
var File = require('fs');
var Path = require('path');
var WebSocket = require('ws');
var https = require('https');
var HTTPS_Server;
// var Heapdump = require("heapdump");
var KKuTu = require('./kkutu');
var GLOBAL = require("../sub/global.json");
var Const = require("../const");
var JLog = require('../sub/jjlog');
var Secure = require('../sub/secure');
var Recaptcha = require('../sub/recaptcha');

var MainDB;
var CHANNELS;

var Server;
var DIC = Object.create(null);
var DNAME = Object.create(null);
var ROOM = Object.create(null);

var T_ROOM = {};
var T_USER = {};

var SID;
var WDIC = {};
var CLANS = {};
var USER_CLAN = {};
var CLAN_SAVE_TIMER = null;
var CLAN_PENDING_NAMES = Object.create(null);

const DEVELOP = exports.DEVELOP = global.test || false;
const GUEST_PERMISSION = exports.GUEST_PERMISSION = {
	'create': true,
	'enter': true,
	'talk': true,
	'practice': true,
	'ready': true,
	'start': true,
	'invite': true,
	'inviteRes': true,
	'kick': true,
	'kickVote': true,
	'wp': true
};
const ENABLE_ROUND_TIME = exports.ENABLE_ROUND_TIME = [ 10, 30, 60, 90, 120, 150 ];
const ENABLE_FORM = exports.ENABLE_FORM = [ "S", "J" ];
const MODE_LENGTH = exports.MODE_LENGTH = Const.GAME_TYPE.length;
const PORT = process.env['KKUTU_PORT'];
const NICKNAME_MAX = 20;
const CLAN_STORE_PATH = Path.resolve(__dirname, "../data/clans.json");
const CLAN_NAME_MAX = 24;
const CLAN_ABOUT_MAX = 120;
const CLAN_CHAT_MAX = 500;
const CLAN_MESSAGE_MAX = 200;
const CLAN_MAX_MEMBERS = 50;
const CLAN_CREATE_COST = 500;
const CLAN_MISSION_GOALS = [ 50, 70, 90, 110, 130, 150 ];
const CLAN_MISSION_REWARDS = [ 200000, 300000, 450000, 600000, 800000, 1000000 ];
const MATCH1V1_MODE = Math.max(0, Const.GAME_TYPE.indexOf("ESH"));
const MATCH1V1_BASE_LEVEL_GAP = 4;
const MATCH1V1_BASE_TROPHY_GAP = 160;
const MATCH1V1_GAP_GROW_MS = 5000;
const MATCH1V1_GAP_GROW_STEP = 3;
const MATCH1V1_TROPHY_GAP_GROW_STEP = 80;
const MATCH1V1_MAX_LEVEL_GAP = 90;
const MATCH1V1_MAX_TROPHY_GAP = 2400;
const MATCH1V1_SCAN_MS = 2000;
const MATCH1V1_ROUNDS = 5;
const MATCH1V1_SECONDS = 50;
const ROOM_THEME_NAMES = [ "blue", "brown", "gray", "green", "pink", "purple", "red", "yellow" ];

var ROOM_THEME_CURSOR = 0;

var MATCH1V1_QUEUE = [];
var MATCH1V1_PENDING_ROOMS = {};
var MATCH1V1_SCAN_TIMER = null;
var MATCH1V1_EXP = [];

process.on('uncaughtException', function(err){
	var text = `:${PORT} [${new Date().toLocaleString()}] ERROR: ${err.toString()}\n${err.stack}\n`;
	
	File.appendFile("/jjolol/KKUTU_ERROR.log", text, function(res){
		JLog.error(`ERROR OCCURRED ON THE MASTER!`);
		console.log(text);
	});
});
function normalizeRoomThemeName(value){
	value = String(value || "").trim().toLowerCase();
	return ROOM_THEME_NAMES.indexOf(value) == -1 ? "" : value;
}
function nextRoomThemeName(){
	var index = typeof ROOM_THEME_CURSOR == "number" ? ROOM_THEME_CURSOR : 0;
	var value = ROOM_THEME_NAMES[index % ROOM_THEME_NAMES.length] || ROOM_THEME_NAMES[0];

	ROOM_THEME_CURSOR = (index + 1) % ROOM_THEME_NAMES.length;
	return value;
}
function assignRoomTheme(room){
	if(!room) return "";

	room.roomTheme = nextRoomThemeName();
	room.themeColor = room.roomTheme;
	return room.roomTheme;
}
function enforceRoomTheme(target, incoming){
	var theme = normalizeRoomThemeName(target && (target.roomTheme || target.themeColor));

	if(!theme && target) theme = assignRoomTheme(target);
	if(!theme) theme = normalizeRoomThemeName(incoming && (incoming.roomTheme || incoming.themeColor));
	if(!theme) theme = assignRoomTheme(incoming);
	if(target){
		target.roomTheme = theme;
		target.themeColor = theme;
	}
	if(incoming){
		incoming.roomTheme = theme;
		incoming.themeColor = theme;
	}
	return theme;
}
function processAdmin(id, value){
	var cmd, temp, i, j;
	
	value = value.replace(/^(#\w+\s+)?(.+)/, function(v, p1, p2){
		if(p1) cmd = p1.slice(1).trim();
		return p2;
	});
	switch(cmd){
		case "yell":
			KKuTu.publish('yell', { value: value });
			return null;
		case "kill":
			if(temp = DIC[value]){
				temp.socket.send('{"type":"error","code":410}');
				temp.socket.close();
			}
			return null;
		case "tailroom":
			if(temp = ROOM[value]){
				if(T_ROOM[value] == id){
					i = true;
					delete T_ROOM[value];
				}else T_ROOM[value] = id;
				if(DIC[id]) DIC[id].send('tail', { a: i ? "trX" : "tr", rid: temp.id, id: id, msg: { pw: temp.password, players: temp.players } });
			}
			return null;
		case "tailuser":
			if(temp = DIC[value]){
				if(T_USER[value] == id){
					i = true;
					delete T_USER[value];
				}else T_USER[value] = id;
				temp.send('test');
				if(DIC[id]) DIC[id].send('tail', { a: i ? "tuX" : "tu", rid: temp.id, id: id, msg: temp.getData() });
			}
			return null;
		case "dump":
			if(DIC[id]) DIC[id].send('yell', { value: "This feature is not supported..." });
			/*Heapdump.writeSnapshot("/home/kkutu_memdump_" + Date.now() + ".heapsnapshot", function(err){
				if(err){
					JLog.error("Error when dumping!");
					return JLog.error(err.toString());
				}
				if(DIC[id]) DIC[id].send('yell', { value: "DUMP OK" });
				JLog.success("Dumping success.");
			});*/
			return null;
		/* Enhanced User Block System [S] */
		case 'ban':
			try {
				var args = value.split(",");
				if(args.length == 2){
					MainDB.users.update([ '_id', args[0].trim() ]).set([ 'black', args[1].trim() ]).on();
				}else if(args.length == 3){
					MainDB.users.update([ '_id', args[0].trim() ]).set([ 'black', args[1].trim() ], [ 'blockedUntil', addDate(parseInt(args[2].trim())) ]).on();				
				}else return null;
				
				JLog.info(`[Block] ?ъ슜??#${args[0].trim()}(??媛 ?댁슜?쒗븳 泥섎━?섏뿀?듬땲??`);
				
				if(temp = DIC[args[0].trim()]){
					temp.socket.send('{"type":"error","code":410}');
					temp.socket.close();
				}
			}catch(e){
				processAdminErrorCallback(e, id);
			}
			return null;
		case 'ipban':
			try {
				var args = value.split(",");
				if(args.length == 2){
					MainDB.ip_block.update([ '_id', args[0].trim() ]).set([ 'reasonBlocked', args[1].trim() ]).on();
				}else if(args.length == 3){
					MainDB.ip_block.update([ '_id', args[0].trim() ]).set([ 'reasonBlocked', args[1].trim() ], [ 'ipBlockedUntil', addDate(parseInt(args[2].trim())) ]).on();				
				}else return null;
				
				JLog.info(`[Block] IP 二쇱냼 ${args[0].trim()}(??媛 ?댁슜?쒗븳 泥섎━?섏뿀?듬땲??`);
			}catch(e){
				processAdminErrorCallback(e, id);
			}
			return null;
		case 'unban':
			try {
				MainDB.users.update([ '_id', value ]).set([ 'black', null ], [ 'blockedUntil', 0 ]).on();								
				JLog.info(`[Block] ?ъ슜??#${value}(??媛 ?댁슜?쒗븳 ?댁젣 泥섎━?섏뿀?듬땲??`);
			}catch(e){
				processAdminErrorCallback(e, id);
			}
			return null;
		case 'ipunban':
			try {
				MainDB.ip_block.update([ '_id', value ]).set([ 'reasonBlocked', null ], [ 'ipBlockedUntil', 0 ]).on();								
				JLog.info(`[Block] IP 二쇱냼 ${value}(??媛 ?댁슜?쒗븳 ?댁젣 泥섎━?섏뿀?듬땲??`);
			}catch(e){
				processAdminErrorCallback(e, id);
			}
			return null;
		/* Enhanced User Block System [E] */
	}
	return value;
}
function normalizeNickname(value){
	if(typeof value != "string") return "";
	var name = value.trim();
	if(!name) return "";
	if(name.length > NICKNAME_MAX) return "";
	if(/[\r\n\t]/.test(name)) return "";
	if(/[&<>]/.test(name)) return "";
	if(name.replace(/[\s\u200B-\u200D\uFEFF]/g, "") === "") return "";
	return name;
}
function nicknameKey(name){
	if(!name) return "";
	return name.replace(/\s/g, "");
}
/* Enhanced User Block System [S] */
function addDate(num){
	if(isNaN(num)) return;
	return Date.now() + num * 24 * 60 * 60 * 1000;
}

function processAdminErrorCallback(error, id){
	DIC[id].send('notice', { value: `紐낅졊??泥섎━?섎뒗 ?꾩쨷 ?ㅻ쪟媛 諛쒖깮?섏??듬땲?? ${error}` });
	JLog.warn(`[Block] 紐낅졊??泥섎━?섎뒗 ?꾩쨷 ?ㅻ쪟媛 諛쒖깮?섏??듬땲?? ${error}`);
}
/* Enhanced User Block System [E] */
function checkTailUser(id, place, msg){
	var temp;
	
	if(temp = T_USER[id]){
		if(!DIC[temp]){
			delete T_USER[id];
			return;
		}
		DIC[temp].send('tail', { a: "user", rid: place, id: id, msg: msg });
	}
}
function narrateFriends(id, friends, stat){
	if(!friends) return;
	var fl = Object.keys(friends);
	
	if(!fl.length) return;
	
	MainDB.users.find([ '_id', { $in: fl } ], [ 'server', /^\w+$/ ]).limit([ 'server', true ]).on(function($fon){
		var i, sf = {}, s;
		
		for(i in $fon){
			if(!sf[s = $fon[i].server]) sf[s] = [];
			sf[s].push($fon[i]._id);
		}
		if(DIC[id]) DIC[id].send('friends', { list: sf });
		
		if(sf[SID]){
			KKuTu.narrate(sf[SID], 'friend', { id: id, s: SID, stat: stat });
			delete sf[SID];
		}
		for(i in WDIC){
			WDIC[i].send('narrate-friend', { id: id, s: SID, stat: stat, list: sf });
			break;
		}
	});
}
function getDisplayName($c){
	if(!$c || !$c.profile) return "";
	return $c.profile.title || $c.profile.name || $c.id || "";
}
function getRequiredScore(lv){
	return Math.round(
		(!(lv % 5) * 0.3 + 1) * (!(lv % 15) * 0.4 + 1) * (!(lv % 45) * 0.5 + 1) * (
			120 + Math.floor(lv / 5) * 60 + Math.floor(lv * lv / 225) * 120 + Math.floor(lv * lv / 2025) * 180
		)
	);
}
function getUserLevel(score){
	var i;
	score = Math.max(0, Number(score) || 0);
	if(!MATCH1V1_EXP.length){
		MATCH1V1_EXP.push(getRequiredScore(1));
		for(i=2; i<360; i++){
			MATCH1V1_EXP.push(MATCH1V1_EXP[i - 2] + getRequiredScore(i));
		}
		MATCH1V1_EXP[359] = Infinity;
	}
	for(i=0; i<MATCH1V1_EXP.length; i++){
		if(score < MATCH1V1_EXP[i]) break;
	}
	return i + 1;
}
function getUserTrophy(data){
	var trophy;
	var ranked;

	if(!data) return 0;
	ranked = data.ranked;
	trophy = ranked && ranked.trophy != null ? ranked.trophy : data.trophy;
	trophy = Math.round(Number(trophy));
	return isFinite(trophy) ? Math.max(0, trophy) : 0;
}
function getMatch1v1Entry(id){
	var i;
	for(i=0; i<MATCH1V1_QUEUE.length; i++){
		if(MATCH1V1_QUEUE[i].id == id) return MATCH1V1_QUEUE[i];
	}
	return null;
}
function removeMatch1v1Entry(id){
	var i;
	for(i=MATCH1V1_QUEUE.length - 1; i>=0; i--){
		if(MATCH1V1_QUEUE[i].id == id){
			MATCH1V1_QUEUE.splice(i, 1);
			return true;
		}
	}
	return false;
}
function purgeMatch1v1Queue(){
	var i, client;
	for(i=MATCH1V1_QUEUE.length - 1; i>=0; i--){
		client = DIC[MATCH1V1_QUEUE[i].id];
		if(!client || client.place != 0) MATCH1V1_QUEUE.splice(i, 1);
	}
	if(!MATCH1V1_QUEUE.length && MATCH1V1_SCAN_TIMER){
		clearInterval(MATCH1V1_SCAN_TIMER);
		MATCH1V1_SCAN_TIMER = null;
	}
}
function insertMatch1v1Entry(entry){
	var i;
	removeMatch1v1Entry(entry.id);
	for(i=0; i<MATCH1V1_QUEUE.length; i++){
		if((MATCH1V1_QUEUE[i].trophy || 0) > (entry.trophy || 0)) break;
	}
	MATCH1V1_QUEUE.splice(i, 0, entry);
	if(!MATCH1V1_SCAN_TIMER) MATCH1V1_SCAN_TIMER = setInterval(processMatch1v1Queue, MATCH1V1_SCAN_MS);
}
function getMatch1v1AllowedLevelGap(a, b, now){
	var wait = Math.max(now - a.queuedAt, now - b.queuedAt);
	return Math.min(MATCH1V1_MAX_LEVEL_GAP, MATCH1V1_BASE_LEVEL_GAP + Math.floor(wait / MATCH1V1_GAP_GROW_MS) * MATCH1V1_GAP_GROW_STEP);
}
function getMatch1v1AllowedTrophyGap(a, b, now){
	var wait = Math.max(now - a.queuedAt, now - b.queuedAt);
	return Math.min(MATCH1V1_MAX_TROPHY_GAP, MATCH1V1_BASE_TROPHY_GAP + Math.floor(wait / MATCH1V1_GAP_GROW_MS) * MATCH1V1_TROPHY_GAP_GROW_STEP);
}
function findMatch1v1Opponent(entry, now){
	var i, cand, client, levelGap, levelAllowed, trophyGap, trophyAllowed, scoreGap, waitBonus, score, best = null;
	for(i=0; i<MATCH1V1_QUEUE.length; i++){
		cand = MATCH1V1_QUEUE[i];
		if(!cand || cand.id == entry.id) continue;
		client = DIC[cand.id];
		if(!client || client.place != 0) continue;
		trophyGap = Math.abs((cand.trophy || 0) - (entry.trophy || 0));
		trophyAllowed = getMatch1v1AllowedTrophyGap(entry, cand, now);
		if(trophyGap > trophyAllowed) continue;
		levelGap = Math.abs(cand.level - entry.level);
		levelAllowed = getMatch1v1AllowedLevelGap(entry, cand, now);
		if(levelGap > levelAllowed) continue;
		scoreGap = Math.abs((entry.score || 0) - (cand.score || 0));
		waitBonus = Math.min(now - entry.queuedAt, now - cand.queuedAt);
		score = trophyGap * 100000 + levelGap * 1000 + scoreGap / 1000 - waitBonus;
		if(!best || score < best.score) best = { entry: cand, score: score };
	}
	return best && best.entry;
}
function getMatch1v1RoomTitle(a, b){
	var left = getDisplayName(DIC[a.id]) || "Player";
	var right = getDisplayName(DIC[b.id]) || "Player";
	var title = left + " vs " + right;
	return title.length > 20 ? "Ranked Match" : title;
}
function createMatch1v1Room(hostEntry, guestEntry){
	var host = DIC[hostEntry.id];
	var guest = DIC[guestEntry.id];
	var room;
	if(hostEntry.id == guestEntry.id) return false;
	if(!host || host.place != 0){
		if(guest && guest.place == 0) guest.send('match1v1', { state: "opponentLeft" });
		return false;
	}
	if(!guest || guest.place != 0){
		if(host && host.place == 0) host.send('match1v1', { state: "opponentLeft" });
		return false;
	}
	room = {
		title: getMatch1v1RoomTitle(hostEntry, guestEntry),
		password: "",
		limit: 2,
		mode: MATCH1V1_MODE,
		round: MATCH1V1_ROUNDS,
		time: MATCH1V1_SECONDS,
		opts: {
			mission: true,
			banletter: true
		},
		match1v1: true,
		matchPlayers: [ hostEntry.id, guestEntry.id ]
	};
	host.send('match1v1', { state: "matched", opponent: getDisplayName(guest), level: guestEntry.level, trophy: hostEntry.trophy, opponentTrophy: guestEntry.trophy });
	guest.send('match1v1', { state: "matched", opponent: getDisplayName(host), level: hostEntry.level, trophy: guestEntry.trophy, opponentTrophy: hostEntry.trophy });
	host.enter(room, false);
	if(room.id){
		MATCH1V1_PENDING_ROOMS[room.id] = {
			host: hostEntry.id,
			guest: guestEntry.id,
			hostTrophy: hostEntry.trophy,
			guestTrophy: guestEntry.trophy,
			createdAt: Date.now()
		};
		return true;
	}
	return false;
}
function processMatch1v1Queue(){
	var i, entry, opponent, host, guest, now = Date.now();
	purgeMatch1v1Queue();
	for(i=0; i<MATCH1V1_QUEUE.length; i++){
		entry = MATCH1V1_QUEUE[i];
		opponent = findMatch1v1Opponent(entry, now);
		if(!opponent) continue;
		host = entry.queuedAt <= opponent.queuedAt ? entry : opponent;
		guest = host == entry ? opponent : entry;
		removeMatch1v1Entry(host.id);
		removeMatch1v1Entry(guest.id);
		createMatch1v1Room(host, guest);
		i = -1;
		purgeMatch1v1Queue();
	}
}
function requestMatch1v1($c){
	var entry;
	if(!$c || $c.place != 0 || $c._roomSaving || $c._clanCreating){
		if($c) $c.send('match1v1', { state: "error", code: "notLobby" });
		return;
	}
	if($c.guest && !GUEST_PERMISSION.enter) return $c.sendError(401);
	if(getMatch1v1Entry($c.id)){
		entry = getMatch1v1Entry($c.id);
		$c.send('match1v1', { state: "searching", level: entry.level, trophy: entry.trophy });
		return;
	}
	entry = {
		id: $c.id,
		level: getUserLevel($c.data && $c.data.score),
		trophy: getUserTrophy($c.data),
		score: ($c.data && Number($c.data.score)) || 0,
		queuedAt: Date.now()
	};
	insertMatch1v1Entry(entry);
	$c.send('match1v1', { state: "searching", level: entry.level, trophy: entry.trophy });
	processMatch1v1Queue();
}
function cancelMatch1v1($c, silent){
	if(!$c) return;
	if(removeMatch1v1Entry($c.id) && !silent) $c.send('match1v1', { state: "cancelled" });
	purgeMatch1v1Queue();
}
function getDisplayNameFromDoc($doc){
	var kk = $doc ? $doc.kkutu : null;
	var name = "";
	
	if(typeof kk == "string"){
		try{
			kk = JSON.parse(kk);
		}catch(e){
			kk = null;
		}
	}
	if(kk && typeof kk == "object"){
		name = kk.name || kk.title || "";
		if(typeof name == "string"){
			name = name.trim();
			if(name) return name;
		}
	}
	if($doc){
		name = $doc.title || $doc.name || $doc._id || "";
		if(typeof name == "string"){
			name = name.trim();
			if(name) return name;
		}
	}
	return "";
}
function getFriendReqFromDoc($doc){
	var kk = $doc ? $doc.kkutu : null;
	
	if(typeof kk == "string"){
		try{
			kk = JSON.parse(kk);
		}catch(e){
			kk = null;
		}
	}
	if(kk && typeof kk.friendReq == "object" && kk.friendReq){
		return kk.friendReq;
	}
	if($doc && typeof $doc.friendReq == "object" && $doc.friendReq){
		return $doc.friendReq;
	}
	return {};
}
function saveFriendRequests(id, req){
	MainDB.users.update([ '_id', id ]).set([ 'kkutu.friendReq', req || {} ]).on();
}
function clanNameKey(name){
	return (name || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
}
function sanitizeClanName(value){
	var name = (value || "").toString().trim();

	if(!name) return "";
	if(name.length > CLAN_NAME_MAX) return "";
	if(/[\r\n\t]/.test(name)) return "";
	if(/[<>]/.test(name)) return "";
	if(name.replace(/\s/g, "").length < 2) return "";
	return name;
}
function sanitizeClanAbout(value){
	var about = (value || "").toString().trim();

	if(about.length > CLAN_ABOUT_MAX) about = about.slice(0, CLAN_ABOUT_MAX);
	return about;
}
function sanitizeClanMessage(value){
	var msg = (value || "").toString().trim();

	if(!msg) return "";
	if(msg.length > CLAN_MESSAGE_MAX) msg = msg.slice(0, CLAN_MESSAGE_MAX);
	msg = msg.replace(/[\r\n\t]/g, " ");
	return msg;
}
function sanitizeClanLogoText(value){
	var raw = (value || "").toString();
	var trimmed = raw.replace(/[<>\r\n\t]/g, "").replace(/\s+/g, "");
	var chars = Array.from(trimmed).slice(0, 2);

	return chars.join('');
}
function makeClanMission(){
	var idx = Math.floor(Math.random() * CLAN_MISSION_GOALS.length);
	var goal = CLAN_MISSION_GOALS[idx];
	var reward = CLAN_MISSION_REWARDS[idx];

	return {
		id: "chat_" + Date.now() + "_" + Math.floor(Math.random() * 100000),
		type: "clan_chat",
		title: "Send clan messages together",
		goal: goal,
		progress: 0,
		reward: reward,
		completed: false,
		completedAt: 0,
		createdAt: Date.now()
	};
}
function normalizeMission(raw){
	var mission = raw && typeof raw == "object" ? raw : {};
	var goal = Number(mission.goal) || CLAN_MISSION_GOALS[0];
	var progress = Number(mission.progress) || 0;
	var reward = Number(mission.reward) || CLAN_MISSION_REWARDS[0];

	return {
		id: mission.id || ("chat_" + Date.now()),
		type: mission.type || "clan_chat",
		title: mission.title || "Send clan messages together",
		goal: Math.max(1, goal),
		progress: Math.max(0, progress),
		reward: Math.max(0, reward),
		completed: !!mission.completed,
		completedAt: Number(mission.completedAt) || 0,
		createdAt: Number(mission.createdAt) || Date.now()
	};
}
function normalizeClanBanner(raw){
	var src = raw && typeof raw == "object" ? raw : {};
	var shape = "shield";
	var border = String(src.border || "").toLowerCase();
	var fill = String(src.fill || "").toLowerCase();
	var logo = String(src.logo || "crown").toLowerCase();
	var pattern = String(src.pattern || "solid").toLowerCase();
	var validShapes = [ "shield" ];
	var validLogos = [
		"crown", "bolt", "sword", "star", "gem",
		"mori", "yinyang", "hammer", "potion", "keyboard",
		"pencil", "book", "letters", "lotus"
	];
	var validPatterns = [ "solid", "tiles4", "vstripes3", "hstripes3", "vsplit2", "hsplit2" ];
	var text = sanitizeClanLogoText(src.text);

	if(logo == "flower") logo = "lotus";
	if(validShapes.indexOf(shape) < 0) shape = "shield";
	if(!/^#[0-9a-f]{6}$/.test(border)) border = "#1f2a44";
	if(!/^#[0-9a-f]{6}$/.test(fill)) fill = "#de3f4e";
	if(validLogos.indexOf(logo) < 0) logo = "crown";
	if(validPatterns.indexOf(pattern) < 0) pattern = "solid";
	if(logo != "letters") text = "";
	if(logo == "letters" && !text) text = "KK";
	return {
		shape: shape,
		border: border,
		fill: fill,
		logo: logo,
		pattern: pattern,
		text: text
	};
}
function normalizeClan(raw, fallbackId){
	var clan = raw && typeof raw == "object" ? raw : {};
	var id = clan.id || fallbackId || ("clan_" + Date.now() + "_" + Math.floor(Math.random() * 100000));
	var name = sanitizeClanName(clan.name) || ("Clan " + id.slice(-5));
	var members = {};
	var owner = clan.owner || "";
	var chat = Array.isArray(clan.chat) ? clan.chat : [];
	var mission = normalizeMission(clan.mission);
	var banner = normalizeClanBanner(clan.banner);

	if(clan.members && typeof clan.members == "object"){
		Object.keys(clan.members).forEach(function(uid){
			var row = clan.members[uid];
			var mName = (row && row.name ? row.name : uid).toString().trim();
			if(!mName) mName = uid;
			members[uid] = {
				name: mName.slice(0, NICKNAME_MAX),
				joinedAt: Number(row && row.joinedAt) || Date.now(),
				role: (row && row.role) ? row.role : "member"
			};
		});
	}
	if(!Object.keys(members).length) return null;
	if(!members[owner]) owner = Object.keys(members)[0];
	members[owner].role = "owner";
	chat = chat.slice(-CLAN_CHAT_MAX).map(function(item){
		var text = sanitizeClanMessage(item && item.text);
		var type = item && item.type == "system" ? "system" : "chat";
		var senderId = (item && item.senderId ? item.senderId : "").toString();
		var senderName = (item && item.senderName ? item.senderName : "").toString().trim();

		return {
			id: (item && item.id) || ("c_" + Date.now() + "_" + Math.floor(Math.random() * 100000)),
			type: type,
			senderId: senderId,
			senderName: senderName || (type == "system" ? "System" : senderId),
			text: text || ((item && item.text) ? String(item.text).slice(0, CLAN_MESSAGE_MAX) : ""),
			time: Number(item && item.time) || Date.now()
		};
	});
	return {
		id: id,
		name: name,
		about: sanitizeClanAbout(clan.about || ""),
		createdAt: Number(clan.createdAt) || Date.now(),
		owner: owner,
		public: true,
		banner: banner,
		members: members,
		chat: chat,
		mission: mission
	};
}
function scheduleClanSave(){
	if(CLAN_SAVE_TIMER) return;
	CLAN_SAVE_TIMER = setTimeout(function(){
		var payload;
		var dir;

		CLAN_SAVE_TIMER = null;
		try{
			dir = Path.dirname(CLAN_STORE_PATH);
			if(!File.existsSync(dir)) File.mkdirSync(dir, { recursive: true });
			payload = JSON.stringify({ clans: CLANS }, null, 2);
			File.writeFileSync(CLAN_STORE_PATH, payload, "utf8");
		}catch(e){
			JLog.warn("Failed to save clan store: " + e.toString());
		}
	}, 60);
}
function rebuildClanIndex(){
	var next = {};

	Object.keys(CLANS).forEach(function(cid){
		var clan = CLANS[cid];

		if(!clan || !clan.members) return;
		Object.keys(clan.members).forEach(function(uid){
			next[uid] = cid;
		});
	});
	USER_CLAN = next;
}
function loadClanStore(){
	var raw;
	var parsed;
	var source;

	CLANS = {};
	USER_CLAN = {};
	if(!File.existsSync(CLAN_STORE_PATH)) return;
	try{
		raw = File.readFileSync(CLAN_STORE_PATH, "utf8");
		parsed = raw ? JSON.parse(raw) : {};
		source = (parsed && parsed.clans && typeof parsed.clans == "object") ? parsed.clans : parsed;
		if(source && typeof source == "object"){
			Object.keys(source).forEach(function(cid){
				var clan = normalizeClan(source[cid], cid);
				if(!clan) return;
				CLANS[clan.id] = clan;
			});
		}
		rebuildClanIndex();
	}catch(e){
		JLog.warn("Failed to load clan store: " + e.toString());
	}
}
function getClanById(id){
	if(!id) return null;
	return CLANS[id] || null;
}
function getClanByUserId(uid){
	var cid = USER_CLAN[uid];
	return cid ? getClanById(cid) : null;
}
function pushClanChat(clan, item){
	if(!clan.chat) clan.chat = [];
	clan.chat.push(item);
	if(clan.chat.length > CLAN_CHAT_MAX) clan.chat = clan.chat.slice(-CLAN_CHAT_MAX);
}
function buildClanSummary(clan){
	var members = clan && clan.members ? Object.keys(clan.members) : [];
	var mission = normalizeMission(clan && clan.mission);

	return {
		id: clan.id,
		name: clan.name,
		about: clan.about || "",
		createdAt: Number(clan.createdAt) || 0,
		owner: clan.owner,
		memberCount: members.length,
		public: true,
		banner: normalizeClanBanner(clan.banner),
		mission: {
			title: mission.title,
			goal: mission.goal,
			progress: mission.progress,
			reward: mission.reward,
			completed: mission.completed
		}
	};
}
function buildClanDetails(clan){
	var members = [];
	var chat = [];
	var mission = normalizeMission(clan && clan.mission);

	Object.keys(clan.members || {}).forEach(function(uid){
		var row = clan.members[uid];
		members.push({
			id: uid,
			name: (row && row.name) || uid,
			role: (row && row.role) || (uid == clan.owner ? "owner" : "member"),
			joinedAt: Number(row && row.joinedAt) || 0,
			online: !!DIC[uid]
		});
	});
	members.sort(function(a, b){
		if(a.role == "owner" && b.role != "owner") return -1;
		if(a.role != "owner" && b.role == "owner") return 1;
		return (a.name || "").localeCompare(b.name || "");
	});
	(clan.chat || []).forEach(function(item){
		chat.push({
			id: item.id,
			type: item.type || "chat",
			senderId: item.senderId || "",
			senderName: item.senderName || "",
			text: item.text || "",
			time: Number(item.time) || 0
		});
	});
	return {
		id: clan.id,
		name: clan.name,
		about: clan.about || "",
		createdAt: Number(clan.createdAt) || 0,
		owner: clan.owner,
		memberCount: members.length,
		banner: normalizeClanBanner(clan.banner),
		members: members,
		chat: chat,
		mission: {
			id: mission.id,
			type: mission.type,
			title: mission.title,
			goal: mission.goal,
			progress: mission.progress,
			reward: mission.reward,
			completed: mission.completed,
			completedAt: mission.completedAt
		}
	};
}
function getClanStateForUser(uid){
	var clan = getClanByUserId(uid);
	var list = Object.keys(CLANS).map(function(cid){
		return buildClanSummary(CLANS[cid]);
	}).sort(function(a, b){
		if(b.memberCount != a.memberCount) return b.memberCount - a.memberCount;
		return (a.name || "").localeCompare(b.name || "");
	});

	return {
		my: clan ? buildClanDetails(clan) : null,
		list: list
	};
}
function sendClanStateToClient($c){
	if(!$c) return;
	$c.send('clanState', getClanStateForUser($c.id));
}
function broadcastClanList(){
	var payload = { list: Object.keys(CLANS).map(function(cid){ return buildClanSummary(CLANS[cid]); }) };
	var uid;

	payload.list.sort(function(a, b){
		if(b.memberCount != a.memberCount) return b.memberCount - a.memberCount;
		return (a.name || "").localeCompare(b.name || "");
	});
	for(uid in DIC){
		DIC[uid].send('clanList', payload);
	}
}
function broadcastClanState(clan){
	if(!clan || !clan.members) return;
	Object.keys(clan.members).forEach(function(uid){
		var $c = DIC[uid];
		if($c) sendClanStateToClient($c);
	});
}
function notifyClanMembers(clan, type, data){
	if(!clan || !clan.members) return;
	Object.keys(clan.members).forEach(function(uid){
		var $c = DIC[uid];
		if($c) $c.send(type, data);
	});
}
function addClanChat(clan, senderId, senderName, text, isSystem){
	var safeText = sanitizeClanMessage(text);
	if(!safeText) return null;
	var item = {
		id: "c_" + Date.now() + "_" + Math.floor(Math.random() * 100000),
		type: isSystem ? "system" : "chat",
		senderId: senderId || "",
		senderName: senderName || (isSystem ? "System" : (senderId || "")),
		text: safeText,
		time: Date.now()
	};

	pushClanChat(clan, item);
	notifyClanMembers(clan, 'clanChat', { clanId: clan.id, item: item });
	return item;
}
function grantClanReward(uid, reward, clanName, missionTitle){
	var online = DIC[uid];
	var payload = { clan: clanName, mission: missionTitle };

	if(!reward || reward <= 0) return;
	if(online){
		var room = ROOM[online.place];
		if(room && CHANNELS && CHANNELS[room.channel]){
			CHANNELS[room.channel].send({ type: "client-money", target: uid, amount: reward, payload: payload });
		}else online.awardMoney(reward, payload);
		return;
	}
	MainDB.users.update([ '_id', uid ]).inc([ 'money', reward ]).on();
}
function advanceClanMission(clan, delta){
	var mission = normalizeMission(clan.mission);
	var members = Object.keys(clan.members || {});
	var reward;

	if(!members.length) return;
	if(mission.completed) return;
	mission.progress += Math.max(0, Number(delta) || 0);
	if(mission.progress < mission.goal){
		clan.mission = mission;
		scheduleClanSave();
		broadcastClanState(clan);
		broadcastClanList();
		return;
	}
	mission.progress = mission.goal;
	mission.completed = true;
	mission.completedAt = Date.now();
	clan.mission = mission;
	reward = mission.reward;
	members.forEach(function(uid){
		grantClanReward(uid, reward, clan.name, mission.title);
	});
	addClanChat(clan, "", "System", "Clan mission completed! Reward distributed.", true);
	notifyClanMembers(clan, 'clanNotice', {
		value: "Clan mission completed. Reward: " + reward
	});
	clan.mission = makeClanMission();
	scheduleClanSave();
	broadcastClanState(clan);
	broadcastClanList();
}
function syncClanMemberName(uid, name){
	var clan = getClanByUserId(uid);

	if(!clan || !clan.members || !clan.members[uid]) return;
	clan.members[uid].name = (name || uid).slice(0, NICKNAME_MAX);
	scheduleClanSave();
	broadcastClanState(clan);
	broadcastClanList();
}
function leaveClanByUser($c, silent){
	var clan = getClanByUserId($c.id);
	var members;
	var nextOwner;

	if(!clan) return;
	delete clan.members[$c.id];
	delete USER_CLAN[$c.id];
	members = Object.keys(clan.members);
	if(!members.length){
		delete CLANS[clan.id];
		scheduleClanSave();
		broadcastClanList();
		sendClanStateToClient($c);
		return;
	}
	if(clan.owner == $c.id){
		nextOwner = members[0];
		clan.owner = nextOwner;
		clan.members[nextOwner].role = "owner";
	}
	if(!silent){
		addClanChat(clan, "", "System", (getDisplayName($c) || $c.id) + " left the clan.", true);
	}
	scheduleClanSave();
	broadcastClanState(clan);
	broadcastClanList();
	sendClanStateToClient($c);
}
Cluster.on('message', function(worker, msg){
	var temp;
	if(!msg || typeof msg !== "object") return;
	
	switch(msg.type){
		case "admin":
			if(DIC[msg.id] && DIC[msg.id].admin) processAdmin(msg.id, msg.value);
			break;
		case "tail-report":
			if(temp = T_ROOM[msg.place]){
				if(!DIC[temp]) delete T_ROOM[msg.place];
				else DIC[temp].send('tail', { a: "room", rid: msg.place, id: msg.id, msg: msg.msg });
			}
			checkTailUser(msg.id, msg.place, msg.msg);
			break;
		case "okg":
			if(DIC[msg.id]) DIC[msg.id].onOKG(msg.time);
			break;
		case "kick":
			if(DIC[msg.target]) DIC[msg.target].socket.close();
			break;
		case "invite":
			if(!DIC[msg.target]){
				worker.send({ type: "invite-error", target: msg.id, code: 417 });
				break;
			}
			if(DIC[msg.target].place != 0){
				worker.send({ type: "invite-error", target: msg.id, code: 417 });
				break;
			}
			if(!GUEST_PERMISSION.invite) if(DIC[msg.target].guest){
				worker.send({ type: "invite-error", target: msg.id, code: 422 });
				break;
			}
			if(DIC[msg.target]._invited){
				worker.send({ type: "invite-error", target: msg.id, code: 419 });
				break;
			}
			DIC[msg.target]._invited = msg.place;
			DIC[msg.target].send('invited', { from: msg.place });
			break;
		case "room-new":
			if(DIC[msg.target] && msg.roomToken !== DIC[msg.target]._roomToken) break;
			if(ROOM[msg.room.id] || !DIC[msg.target]){ // ?대? 洹몃윴 ID??諛⑹씠 ?덈떎... 洹?諛⑹? ?녿뜕 嫄몃줈 ?대씪.
				worker.send({ type: "room-invalid", room: msg.room });
			}else{
				assignRoomTheme(msg.room);
				ROOM[msg.room.id] = new KKuTu.Room(msg.room, msg.room.channel);
				worker.send({ type: "room-theme", id: msg.room.id, roomTheme: msg.room.roomTheme });
				if(MATCH1V1_PENDING_ROOMS[msg.room.id]){
					var pendingMatch = MATCH1V1_PENDING_ROOMS[msg.room.id];
					var matchGuest = DIC[pendingMatch.guest];
					delete MATCH1V1_PENDING_ROOMS[msg.room.id];
					if(matchGuest && matchGuest.place == 0){
						matchGuest.enter({ id: msg.room.id, password: "" }, false, true);
					}else if(DIC[pendingMatch.host]){
						DIC[pendingMatch.host].send('match1v1', { state: "opponentLeft" });
					}
				}
			}
			break;
		case "room-come":
			if(DIC[msg.target] && msg.roomToken !== DIC[msg.target]._roomToken) break;
			if(ROOM[msg.id] && DIC[msg.target]){
				cancelMatch1v1(DIC[msg.target], true);
				ROOM[msg.id].come(DIC[msg.target]);
			}else{
				JLog.warn(`Wrong room-come id=${msg.id}&target=${msg.target}`);
			}
			break;
		case "room-spectate":
			if(DIC[msg.target] && msg.roomToken !== DIC[msg.target]._roomToken) break;
			if(ROOM[msg.id] && DIC[msg.target]){
				ROOM[msg.id].spectate(DIC[msg.target], msg.pw);
			}else{
				JLog.warn(`Wrong room-spectate id=${msg.id}&target=${msg.target}`);
			}
			break;
		case "room-go":
			if(DIC[msg.target] && msg.roomToken !== DIC[msg.target]._roomToken) break;
			if(ROOM[msg.id] && DIC[msg.target]){
				ROOM[msg.id].go(DIC[msg.target]);
			}else{
				// ?섍?湲?留먭퀬 ?곌껐 ?먯껜媛 ?딄꼈?????앷린?????섎떎.
				JLog.warn(`Wrong room-go id=${msg.id}&target=${msg.target}`);
				if(ROOM[msg.id] && ROOM[msg.id].players){
					// ?????섎룞?쇰줈 吏?뚯???
					var x = ROOM[msg.id].players.indexOf(msg.target);
					
					if(x != -1){
						ROOM[msg.id].players.splice(x, 1);
						JLog.warn(`^ OK`);
					}
				}
				if(msg.removed) delete ROOM[msg.id];
			}
			break;
		case "user-publish":
			if(msg.data && (temp = DIC[msg.data.id]) && (!msg.sid || msg.sid === temp.sid) && msg.roomToken === temp._roomToken){
				var social = { name: temp.data && temp.data.name, username: temp.data && temp.data.username, friendReq: temp.friendReq };
				[ 'profile', 'place', 'data', 'money', 'equip', 'exordial', 'box', 'okgCount' ].forEach(function(key){
					if(Object.prototype.hasOwnProperty.call(msg.data, key)) temp[key] = msg.data[key];
				});
				if(temp.data){
					if(social.name) temp.data.name = social.name;
					if(social.username) temp.data.username = social.username;
					temp.data.friendReq = social.friendReq || {};
				}
				if(msg.data.game){
					temp.game = msg.data.game;
					temp.ready = !!msg.data.game.ready;
					temp.form = msg.data.game.form;
					temp.team = msg.data.game.team;
					temp.subPlace = msg.data.game.practice || 0;
				}
				if(isFinite(msg.savedMoney)) temp._savedMoney = Number(msg.savedMoney);
				if(isFinite(msg.savedScore)) temp._savedScore = Number(msg.savedScore);
				temp._roomSaving = Number(msg.pendingSaves) > 0;
			}
			break;
		case "client-nick":
			if(DIC[msg.target] && DIC[msg.target].sid === msg.sid) processClientRequest(DIC[msg.target], { type: "nick", value: msg.value });
			break;
		case "client-money-missing":
			if(!isFinite(msg.amount) || msg.amount <= 0) break;
			MainDB.users.update([ '_id', msg.target ]).inc([ 'money', msg.amount ]).on(function(result, err){
				var client = DIC[msg.target];
				if(err || !client) return;
				client.money = (Number(client.money) || 0) + msg.amount;
				client._savedMoney = (Number(client._savedMoney) || 0) + msg.amount;
				client.send('clanMissionReward', { clan: msg.payload.clan, mission: msg.payload.mission, reward: msg.amount, money: client.money });
			});
			break;
		case "room-publish":
			if(temp = ROOM[msg.data.room.id]){
				enforceRoomTheme(temp, msg.data.room);
				for(var i in msg.data.room){
					temp[i] = msg.data.room[i];
				}
				enforceRoomTheme(temp, msg.data.room);
				temp.password = msg.password;
			}
			KKuTu.publish('room', msg.data);
			break;
		case "room-expired":
			if(msg.create && ROOM[msg.id]){
				for(var i in ROOM[msg.id].players){
					var $c = DIC[ROOM[msg.id].players[i]];
					
					if($c) $c.send('roomStuck');
				}
				delete ROOM[msg.id];
			}
			break;
		case "room-invalid":
			delete ROOM[msg.room.id];
			break;
		default:
			JLog.warn(`Unhandled IPC message type: ${msg.type}`);
	}
});
exports.onWorkerExit = function(channel){
	Object.keys(ROOM).forEach(function(id){
		var room = ROOM[id];
		if(room.channel != channel) return;
		clearTimeout(room._match1v1Timer);
		delete ROOM[id];
		delete MATCH1V1_PENDING_ROOMS[id];
		(room.players || []).forEach(function(uid){
			var client = DIC[uid];
			if(!client || client.place != room.id) return;
			client.place = 0;
			client.game = {};
			client.ready = false;
			client._roomSaving = false;
			client._roomToken = null;
			client.send('roomStuck');
		});
		KKuTu.publish('room', { room: { id: room.id, players: [] } });
	});
};
exports.init = function(_SID, CHAN){
	SID = _SID;
	CHANNELS = CHAN;
	MainDB = require('../Web/db');
	MainDB.ready = function(){
		JLog.success("Master DB is ready.");
		loadClanStore();
		
		MainDB.users.update([ 'server', SID ]).set([ 'server', "" ]).on();
		if(Const.IS_SECURED) {
			const options = Secure();
			HTTPS_Server = https.createServer(options)
				.listen(global.test ? Const.TEST_PORT : process.env['KKUTU_PORT']);
			Server = new WebSocket.Server({server: HTTPS_Server});
		} else {
			Server = new WebSocket.Server({
				port: global.test ? Const.TEST_PORT : process.env['KKUTU_PORT'],
				perMessageDeflate: false
			});
		}
		Server.on('connection', function(socket, info){
			var key = info.url.slice(1);
			var $c;
			
			socket.on('error', function(err){
				JLog.warn("Error on #" + key + " on ws: " + err.toString());
			});
			// ???쒕쾭
			if(info.headers.host.startsWith(GLOBAL.GAME_SERVER_HOST + ":")){
				if(WDIC[key]) WDIC[key].socket.close();
				WDIC[key] = new KKuTu.WebServer(socket);
				JLog.info(`New web server #${key}`);
				WDIC[key].socket.on('close', function(){
					JLog.alert(`Exit web server #${key}`);
					WDIC[key].socket.removeAllListeners();
					delete WDIC[key];
				});
				return;
			}
			if(Object.keys(DIC).length >= Const.KKUTU_MAX){
				socket.send(`{ "type": "error", "code": "full" }`);
				return;
			}
			MainDB.session.findOne([ '_id', key ]).limit([ 'profile', true ]).on(function($body){
				$c = new KKuTu.Client(socket, $body ? $body.profile : null, key);
				$c.admin = GLOBAL.ADMIN.indexOf($c.id) != -1;
				/* Enhanced User Block System [S] */
				$c.remoteAddress = GLOBAL.USER_BLOCK_OPTIONS.USE_X_FORWARDED_FOR ? String(info.headers['x-forwarded-for'] || info.connection.remoteAddress).split(',')[0].trim() : info.connection.remoteAddress;
				/* Enhanced User Block System [E] */
				
				if(DIC[$c.id]){
					DIC[$c.id].sendError(408);
					DIC[$c.id].socket.close();
				}
				if(DEVELOP && !Const.TESTER.includes($c.id)){
					$c.sendError(500);
					$c.socket.close();
					return;
				}
				if($c.guest){
					if(SID != "0"){
						$c.sendError(402);
						$c.socket.close();
						return;
					}
					if(KKuTu.NIGHT){
						$c.sendError(440);
						$c.socket.close();
						return;
					}
				}
				/* Enhanced User Block System [S] */
				if(GLOBAL.USER_BLOCK_OPTIONS.USE_MODULE && ((GLOBAL.USER_BLOCK_OPTIONS.BLOCK_IP_ONLY_FOR_GUEST && $c.guest) || !GLOBAL.USER_BLOCK_OPTIONS.BLOCK_IP_ONLY_FOR_GUEST)){
					MainDB.ip_block.findOne([ '_id', $c.remoteAddress ]).on(function($body){
						if ($body && $body.reasonBlocked) {
							if(Number($body.ipBlockedUntil) > 0 && Number($body.ipBlockedUntil) < Date.now()) {
								MainDB.ip_block.update([ '_id', $c.remoteAddress ]).set([ 'ipBlockedUntil', 0 ], [ 'reasonBlocked', null ]).on();
								JLog.info(`IP 二쇱냼 ${$c.remoteAddress}???댁슜?쒗븳???댁젣?섏뿀?듬땲??`);
							}
							else {
								$c.socket.send(JSON.stringify({
									type: 'error',
									code: 446,
									reasonBlocked: !$body.reasonBlocked ? GLOBAL.USER_BLOCK_OPTIONS.DEFAULT_BLOCKED_TEXT : $body.reasonBlocked,
									ipBlockedUntil: !$body.ipBlockedUntil ? GLOBAL.USER_BLOCK_OPTIONS.BLOCKED_FOREVER : $body.ipBlockedUntil
								}));
								$c.socket.close();
								return;
							}
						}
					});
				}
				/* Enhanced User Block System [E] */
				if($c.isAjae === null){
					$c.sendError(441);
					$c.socket.close();
					return;
				}
				$c.refresh().then(function(ref){
					if(socket.readyState !== 1) return;
					/* Enhanced User Block System [S] */
					let isBlockRelease = false;
					
					if(ref.result == 444 && Number(ref.blockedUntil) > 0 && Number(ref.blockedUntil) < Date.now()) {
						DIC[$c.id] = $c;
						MainDB.users.update([ '_id', $c.id ]).set([ 'blockedUntil', 0 ], [ 'black', null ]).on();
						JLog.info(`?ъ슜??#${$c.id}???댁슜?쒗븳???댁젣?섏뿀?듬땲??`);
						isBlockRelease = true;
					}
					/* Enhanced User Block System [E] */						
					
					/* Enhanced User Block System [S] */
					if(ref.result == 200 || isBlockRelease){
					/* Enhanced User Block System [E] */
						DIC[$c.id] = $c;
						var nameKey = nicknameKey($c.profile.title || $c.profile.name);
						if(nameKey) DNAME[nameKey] = $c.id;
						MainDB.users.update([ '_id', $c.id ]).set([ 'server', SID ]).on();

						if (($c.guest && GLOBAL.GOOGLE_RECAPTCHA_TO_GUEST) || GLOBAL.GOOGLE_RECAPTCHA_TO_USER) {
							$c.socket.send(JSON.stringify({
								type: 'recaptcha',
								siteKey: GLOBAL.GOOGLE_RECAPTCHA_SITE_KEY
							}));
						} else {
							$c.passRecaptcha = true;

							joinNewUser($c);
						}
					} else {
						/* Enhanced User Block System [S] */
						if(ref.blockedUntil) $c.send('error', {
							code: ref.result, message: ref.black, blockedUntil: ref.blockedUntil
						});
						else $c.send('error', {
							code: ref.result, message: ref.black
						});
						/* Enhanced User Block System [E] */
						
						$c._error = ref.result;
						$c.socket.close();
						// JLog.info("Black user #" + $c.id);
					}
				});
			});
		});
		Server.on('error', function (err) {
			JLog.warn("Error on ws: " + err.toString());
		});
		KKuTu.init(MainDB, DIC, ROOM, GUEST_PERMISSION, CHAN);
	};
};

function joinNewUser($c) {
	$c.send('welcome', {
		id: $c.id,
		guest: $c.guest,
		box: $c.box,
		playTime: $c.data.playTime,
		okg: $c.okgCount,
		users: KKuTu.getUserList(),
		rooms: KKuTu.getRoomList(),
		friends: $c.friends,
		friendReq: $c.friendReq || {},
		clan: getClanStateForUser($c.id),
		admin: $c.admin,
		test: global.test,
		caj: $c._checkAjae ? true : false
	});
	var clan = getClanByUserId($c.id);
	if(clan) broadcastClanState(clan);
	narrateFriends($c.id, $c.friends, "on");
	KKuTu.publish('conn', {user: $c.getData()});

	JLog.info("New user #" + $c.id);
}

KKuTu.onClientMessage = function ($c, msg) {
	if (!msg) return;
	
	if ($c.passRecaptcha) {
		processClientRequest($c, msg);
	} else {
		if (msg.type === 'recaptcha') {
			Recaptcha.verifyRecaptcha(msg.token, $c.remoteAddress, function (success) {
				if (success) {
					$c.passRecaptcha = true;

					joinNewUser($c);

					processClientRequest($c, msg);
				} else {
					JLog.warn(`Recaptcha failed from IP ${$c.remoteAddress}`);

					$c.sendError(447);
					$c.socket.close();
				}
			});
		}
	}
};

function processClientRequest($c, msg) {
	var stable = true;
	var temp;
	var now = (new Date()).getTime();
	
	switch (msg.type) {
		case 'yell':
			if (!msg.value) return;
			if (!$c.admin) return;

			$c.publish('yell', {value: msg.value});
			break;
		case 'nick':
			if($c.guest) return $c.sendError(421);
			var nickname = normalizeNickname(msg.value || "");
			if(!nickname) return $c.sendError(456);
			var nextKey = nicknameKey(nickname);
			if(!nextKey) return $c.sendError(456);
			if(DNAME[nextKey] && DNAME[nextKey] !== $c.id) return $c.sendError(457);

			var currentName = $c.profile.title || $c.profile.name || "";
			var currentKey = nicknameKey(currentName);
			if(currentKey && currentKey !== nextKey) delete DNAME[currentKey];
			DNAME[nextKey] = $c.id;

			$c.profile.title = nickname;
			$c.profile.name = "anonymous";
			$c.data.name = nickname;
			MainDB.session.update([ '_id', $c.sid ]).set([ 'profile.title', nickname ]).on();
			MainDB.users.update([ '_id', $c.id ]).set([ 'kkutu.name', nickname ]).on();
			syncClanMemberName($c.id, nickname);
			$c.publish('user', $c.getData());
			if(ROOM[$c.place] && CHANNELS[ROOM[$c.place].channel]) CHANNELS[ROOM[$c.place].channel].send({ type: "client-profile", target: $c.id, profile: $c.profile });
			break;
		case 'refresh':
			if($c._roomSaving || $c._clanCreating) return $c.sendError(400);
			if($c.place && ROOM[$c.place]){
				if(ROOM[$c.place].gaming) return $c.sendError(400);
				if(CHANNELS[ROOM[$c.place].channel]) CHANNELS[ROOM[$c.place].channel].send({ type: "client-refresh", target: $c.id, sid: $c.sid });
			}else $c.refresh();
			break;
		case 'talk':
			if(typeof msg.value !== "string" || !msg.value) return;
			if(msg.whisper && typeof msg.whisper !== "string") return $c.sendError(400);
			if (!GUEST_PERMISSION.talk) if ($c.guest) {
				$c.send('error', {code: 401});
				return;
			}
			msg.value = msg.value.substr(0, 200);
			if ($c.admin) {
				if (!processAdmin($c.id, msg.value)) break;
			}
			checkTailUser($c.id, $c.place, msg);
			if (msg.whisper) {
				msg.whisper.split(',').forEach(v => {
					if (temp = DIC[DNAME[v]]) {
						temp.send('chat', {
							from: $c.profile.title || $c.profile.name,
							profile: $c.profile,
							value: msg.value
						});
					} else {
						$c.sendError(424, v);
					}
				});
			} else {
				$c.chat(msg.value);
			}
			break;
		case 'friendAdd':
			if (!msg.target) return;
			if ($c.guest) return;
			if ($c.id == msg.target) return;
			if (Object.keys($c.friends).length >= 100) return $c.sendError(452);
			if ($c.friends[msg.target]) {
				$c.send('friendAddRes', { target: msg.target, res: true });
				return;
			}
			function queueRequest(targetId, targetClient, targetDoc){
				var targetFriends = (targetClient && targetClient.friends) || ((targetDoc || {}).friends) || {};
				var targetReq = (targetClient && targetClient.friendReq) || getFriendReqFromDoc(targetDoc);
				var targetName = targetClient
					? (getDisplayName(targetClient) || targetId)
					: (getDisplayNameFromDoc(targetDoc) || targetId);
				var fromName = getDisplayName($c) || $c.id;
				var reqItem;
				
				if (targetFriends[$c.id]) {
					$c.send('friendAddRes', { target: targetId, res: true });
					return;
				}
				if (targetReq[$c.id]) return $c.sendError(454);
				
				reqItem = {
					name: fromName,
					time: Date.now()
				};
				targetReq[$c.id] = reqItem;
				saveFriendRequests(targetId, targetReq);
				
				if (targetClient) {
					targetClient.friendReq = targetReq;
					targetClient.send('friendAdd', {
						from: $c.id,
						name: reqItem.name,
						time: reqItem.time
					});
				}
				$c.send('friendAddQueued', { target: targetId, name: targetName });
			}
			if (temp = DIC[msg.target]) {
				if (temp.guest) return $c.sendError(453);
				queueRequest(temp.id, temp, null);
			} else {
				MainDB.users.findOne([ '_id', msg.target ])
					.limit([ '_id', true ], [ 'friends', true ], [ 'kkutu', true ])
					.on(function($doc){
						if (!$doc) return $c.sendError(450);
						$doc.friendReq = getFriendReqFromDoc($doc);
						queueRequest(msg.target, null, $doc);
					});
			}
			break;
		case 'friendAddRes':
			if (!msg.from) return;
			if ($c.guest) return;
			$c.friendReq = $c.friendReq || {};
			if (!$c.friendReq[msg.from]) return;
			var reqInfo = $c.friendReq[msg.from] || {};
			delete $c.friendReq[msg.from];
			saveFriendRequests($c.id, $c.friendReq);
			temp = DIC[msg.from];
			if (msg.res) {
				var requesterName = temp
					? (getDisplayName(temp) || msg.from)
					: (reqInfo.name || msg.from);
				$c.send('friendAddRes', {
					target: msg.from,
					name: requesterName,
					res: true,
					server: temp ? CHAN : false
				});
				if (!$c.friends[msg.from]) {
					$c.friends[msg.from] = requesterName;
					$c.flush(false, false, true);
					$c.send('friendEdit', { friends: $c.friends });
				}
				if (temp) {
					if (!temp.friends[$c.id]) temp.addFriend($c.id);
				} else {
					MainDB.users.findOne([ '_id', msg.from ]).limit([ 'friends', true ]).on(function($doc){
						if (!$doc) return;
						var f = $doc.friends || {};
						f[$c.id] = getDisplayName($c) || $c.id;
						MainDB.users.update([ '_id', msg.from ]).set([ 'friends', f ]).on();
					});
				}
			}
			if (temp) temp.send('friendAddRes', {
				target: $c.id,
				name: getDisplayName($c) || $c.id,
				server: CHAN,
				res: msg.res
			});
			break;
		case 'friendEdit':
			if (!$c.friends) return;
			if (!$c.friends[msg.id]) return;
			$c.friends[msg.id] = (msg.memo || "").slice(0, 50);
			$c.flush(false, false, true);
			$c.send('friendEdit', {friends: $c.friends});
			break;
		case 'friendRemove':
			if (!$c.friends) return;
			if (!$c.friends[msg.id]) return;
			$c.removeFriend(msg.id);
			break;
		case 'clanList':
			sendClanStateToClient($c);
			break;
		case 'clanCreate':
			if($c.guest) return $c.sendError(421);
			if($c.place || $c._roomSaving || $c._clanCreating) return $c.sendError(400);
			var clanName = sanitizeClanName(msg.name);
			var clanAbout = sanitizeClanAbout(msg.about);
			var clanBanner = normalizeClanBanner((msg.banner && typeof msg.banner == "object") ? msg.banner : {
				shape: msg.clanShape || msg.shape,
				border: msg.clanBorder || msg.border,
				fill: msg.clanFill || msg.fill,
				pattern: msg.clanPattern || msg.pattern,
				logo: msg.clanLogo || msg.logo,
				text: msg.clanText || msg.text
			});
			var existingClan = getClanByUserId($c.id);
			var myMoney = Number($c.money) || 0;
			var clanId;
			var duplicated;
			if(existingClan){
				$c.send('clanNotice', { value: "Leave your current clan first." });
				sendClanStateToClient($c);
				return;
			}
			if(myMoney < CLAN_CREATE_COST){
				$c.send('clanNotice', { value: "Need " + CLAN_CREATE_COST + " gems to create a clan." });
				return;
			}
			if(!clanName){
				$c.send('clanNotice', { value: "Invalid clan name." });
				return;
			}
			duplicated = CLAN_PENDING_NAMES[clanNameKey(clanName)] || Object.keys(CLANS).some(function(cid){
				return clanNameKey(CLANS[cid].name) == clanNameKey(clanName);
			});
			if(duplicated){
				$c.send('clanNotice', { value: "Clan name already exists." });
				return;
			}
			$c._clanCreating = true;
			CLAN_PENDING_NAMES[clanNameKey(clanName)] = $c.id;
			MainDB.users.update([ '_id', $c.id ], [ 'money', myMoney ]).inc([ 'money', -CLAN_CREATE_COST ]).on(function(doc, err, result){
				$c._clanCreating = false;
				delete CLAN_PENDING_NAMES[clanNameKey(clanName)];
				if(err) return $c.sendError(500);
				if(!result || result.rowCount !== 1) return $c.send('clanNotice', { value: "Balance changed. Refresh before creating a clan." });
				$c.money = myMoney - CLAN_CREATE_COST;
				$c._savedMoney = (Number($c._savedMoney) || myMoney) - CLAN_CREATE_COST;
				$c.publish('user', $c.getData());
				clanId = "clan_" + Date.now().toString(36) + "_" + Math.floor(Math.random() * 9999).toString(36);
				CLANS[clanId] = {
					id: clanId,
					name: clanName,
					about: clanAbout,
					createdAt: Date.now(),
					owner: $c.id,
					public: true,
					banner: clanBanner,
					members: {},
					chat: [],
					mission: makeClanMission()
				};
				CLANS[clanId].members[$c.id] = {
					name: getDisplayName($c) || $c.id,
					joinedAt: Date.now(),
					role: "owner"
				};
				USER_CLAN[$c.id] = clanId;
				addClanChat(CLANS[clanId], "", "System", "Clan created by " + (getDisplayName($c) || $c.id), true);
				$c.send('clanNotice', { value: "Clan created. " + CLAN_CREATE_COST + " gems spent." });
				scheduleClanSave();
				broadcastClanList();
				broadcastClanState(CLANS[clanId]);
				sendClanStateToClient($c);
			});
			break;
		case 'clanJoin':
			if($c.guest) return $c.sendError(421);
			if($c._clanCreating) return $c.sendError(400);
			var joinTarget = getClanById(msg.id);
			if(!joinTarget){
				$c.send('clanNotice', { value: "Clan not found." });
				sendClanStateToClient($c);
				return;
			}
			if(getClanByUserId($c.id)){
				$c.send('clanNotice', { value: "Leave your current clan first." });
				sendClanStateToClient($c);
				return;
			}
			if(Object.keys(joinTarget.members || {}).length >= CLAN_MAX_MEMBERS){
				$c.send('clanNotice', { value: "Clan is full." });
				return;
			}
			joinTarget.members[$c.id] = {
				name: getDisplayName($c) || $c.id,
				joinedAt: Date.now(),
				role: "member"
			};
			USER_CLAN[$c.id] = joinTarget.id;
			addClanChat(joinTarget, "", "System", (getDisplayName($c) || $c.id) + " joined the clan.", true);
			scheduleClanSave();
			broadcastClanState(joinTarget);
			broadcastClanList();
			sendClanStateToClient($c);
			break;
		case 'clanLeave':
			leaveClanByUser($c);
			break;
		case 'clanChat':
			var myClan = getClanByUserId($c.id);
			var clanMsg;
			if(!myClan){
				$c.send('clanNotice', { value: "Join a clan first." });
				return;
			}
			clanMsg = sanitizeClanMessage(msg.value);
			if(!clanMsg) return;
			addClanChat(myClan, $c.id, getDisplayName($c) || $c.id, clanMsg, false);
			advanceClanMission(myClan, 1);
			scheduleClanSave();
			break;
		case 'enter':
		case 'setRoom':
			msg.match1v1 = false;
			delete msg.matchPlayers;
			cancelMatch1v1($c, true);
			if (!msg.title) stable = false;
			if (!msg.limit) stable = false;
			if (!msg.round) stable = false;
			if (!msg.time) stable = false;
			if(!msg.opts || typeof msg.opts !== "object" || Array.isArray(msg.opts)) stable = false;
			else if(msg.opts.injpick !== undefined && !Array.isArray(msg.opts.injpick)) stable = false;

			msg.code = false;
			msg.limit = Number(msg.limit);
			msg.mode = Number(msg.mode);
			msg.round = Number(msg.round);
			msg.time = Number(msg.time);

			if (isNaN(msg.limit)) stable = false;
			if (isNaN(msg.mode)) stable = false;
			if (isNaN(msg.round)) stable = false;
			if (isNaN(msg.time)) stable = false;

			if (stable) {
				if (typeof msg.title !== "string" || msg.title.length > 20) stable = false;
				if (typeof msg.password !== "string" || msg.password.length > 20) stable = false;
				if (msg.limit < 2 || msg.limit > 12) {
					msg.code = 432;
					stable = false;
				}
				if (msg.mode % 1 || msg.mode < 0 || msg.mode >= MODE_LENGTH) stable = false;
				if (msg.round < 1 || msg.round > 10) {
					msg.code = 433;
					stable = false;
				}
				if (ENABLE_ROUND_TIME.indexOf(msg.time) == -1) stable = false;
			}
			if (msg.type == 'enter') {
				if (msg.id || stable) $c.enter(msg, msg.spectate);
				else $c.sendError(msg.code || 431);
			} else if (msg.type == 'setRoom') {
				if (stable) $c.setRoom(msg);
				else $c.sendError(msg.code || 431);
			}
			break;
		case 'match1v1':
			if(msg.cancel) cancelMatch1v1($c, false);
			else requestMatch1v1($c);
			break;
		case 'inviteRes':
			cancelMatch1v1($c, true);
			if (!(temp = ROOM[msg.from])) return;
			if (!GUEST_PERMISSION.inviteRes) if ($c.guest) return;
			if ($c._invited != msg.from) return;
			if (msg.res) {
				$c.enter({id: $c._invited}, false, true);
			} else {
				if (DIC[temp.master]) DIC[temp.master].send('inviteNo', {target: $c.id});
			}
			delete $c._invited;
			break;
		/* 留앺븷 ?㏓떎?댁젣
		case 'caj':
			if(!$c._checkAjae) return;
			clearTimeout($c._checkAjae);
			if(msg.answer == "yes") $c.confirmAjae(msg.input);
			else if(KKuTu.NIGHT){
				$c.sendError(440);
				$c.socket.close();
			}
			break;
		*/
		case 'test':
			checkTailUser($c.id, $c.place, msg);
			break;
		default:
			break;
	}
}

KKuTu.onClientClosed = function($c, code){
	if(DIC[$c.id] !== $c){
		if($c.socket) $c.socket.removeAllListeners();
		return;
	}
	var clan = getClanByUserId($c.id);
	cancelMatch1v1($c, true);
	delete DIC[$c.id];
	if($c._error != 409) MainDB.users.update([ '_id', $c.id ]).set([ 'server', "" ]).on();
	if($c.profile){
		var nameKey = nicknameKey($c.profile.title || $c.profile.name);
		if(nameKey) delete DNAME[nameKey];
	}
	if($c.socket) $c.socket.removeAllListeners();
	if(clan) broadcastClanState(clan);
	if($c.friends) narrateFriends($c.id, $c.friends, "off");
	KKuTu.publish('disconn', { id: $c.id });

	JLog.alert("Exit #" + $c.id);
};

