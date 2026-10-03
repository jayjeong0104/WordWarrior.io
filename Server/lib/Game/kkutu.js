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

var GUEST_PERMISSION;
var Cluster = require("cluster");
var Const = require('../const');
var Lizard = require('../sub/lizard');
var Inventory = require('../sub/inventory');
var JLog = require('../sub/jjlog');
// 망할 셧다운제 var Ajae = require("../sub/ajae");
var DB;
var SHOP;
var DIC;
var ROOM;
var _rid;
var _roomThemeCursor;
var _connectionGeneration = 0;
var Rule;
var guestProfiles = [];
var CHAN;
var channel = process.env['CHANNEL'] || 0;

const NUM_SLAVES = 4;
const GUEST_IMAGE = "/img/kkutu/guest.png";
const MAX_OKG = 18;
const PER_OKG = 600000;
const ROOM_THEME_NAMES = [ "blue", "brown", "gray", "green", "pink", "purple", "red", "yellow" ];
const DEFAULT_JOINED_AT = Date.UTC(2026, 3, 17);
const RANKED_TROPHY_DEFAULT = 0;
const RANKED_TROPHY_WIN_MIN = 18;
const RANKED_TROPHY_WIN_MAX = 34;
const RANKED_TROPHY_LOSS_MIN = -30;
const RANKED_TROPHY_LOSS_MAX = -8;

function normalizeRoomThemeName(value){
	value = String(value || "").trim().toLowerCase();
	return ROOM_THEME_NAMES.indexOf(value) == -1 ? "" : value;
}
function nextRoomThemeName(){
	var index = typeof _roomThemeCursor == "number" ? _roomThemeCursor : 0;
	var value = ROOM_THEME_NAMES[index % ROOM_THEME_NAMES.length] || ROOM_THEME_NAMES[0];

	_roomThemeCursor = (index + 1) % ROOM_THEME_NAMES.length;
	return value;
}
function toSafeInt(value, fallback){
	value = Math.round(Number(value));
	return isFinite(value) ? value : fallback;
}
function toNonNegativeInt(value, fallback){
	return Math.max(0, toSafeInt(value, fallback));
}
function normalizeRankedData(data){
	var ranked = data && data.ranked && typeof data.ranked == "object" ? data.ranked : {};
	var trophy = ranked.trophy != null ? ranked.trophy : (data ? data.trophy : null);
	var result = {};

	trophy = toNonNegativeInt(trophy, RANKED_TROPHY_DEFAULT);
	result.trophy = trophy;
	result.best = Math.max(trophy, toNonNegativeInt(ranked.best, trophy));
	result.games = toNonNegativeInt(ranked.games, 0);
	result.wins = toNonNegativeInt(ranked.wins, 0);
	result.losses = toNonNegativeInt(ranked.losses, 0);
	result.draws = toNonNegativeInt(ranked.draws, 0);
	return result;
}
function ensureRankedData(data){
	if(!data) return normalizeRankedData(null);
	data.ranked = normalizeRankedData(data);
	data.trophy = data.ranked.trophy;
	return data.ranked;
}
function getRankedTrophyFromClient(client){
	if(!client || !client.data) return RANKED_TROPHY_DEFAULT;
	return normalizeRankedData(client.data).trophy;
}
function clampRankedTrophyDelta(delta, min, max){
	return Math.max(min, Math.min(max, Math.round(delta)));
}
function getRankedTrophyDelta(trophy, opponentTrophy, outcome){
	var expected;

	if(outcome === 0) return 0;
	trophy = toNonNegativeInt(trophy, RANKED_TROPHY_DEFAULT);
	opponentTrophy = toNonNegativeInt(opponentTrophy, RANKED_TROPHY_DEFAULT);
	expected = 1 / (1 + Math.pow(10, (opponentTrophy - trophy) / 400));
	if(outcome > 0){
		return clampRankedTrophyDelta(18 + (1 - expected) * 32, RANKED_TROPHY_WIN_MIN, RANKED_TROPHY_WIN_MAX);
	}
	return clampRankedTrophyDelta(-8 - expected * 28, RANKED_TROPHY_LOSS_MIN, RANKED_TROPHY_LOSS_MAX);
}
function getRankedOutcome(item, opponent){
	if(!item || !opponent) return 0;
	if(item.score > opponent.score) return 1;
	if(item.score < opponent.score) return -1;
	return 0;
}
function buildRankedTrophyChanges(room, result){
	var a, b, ca, cb, at, bt, ao, bo;
	var changes = {};

	if(!room || !room.match1v1 || room.practice || !result || result.length != 2) return null;
	a = result[0];
	b = result[1];
	if(!a || !b) return null;
	ca = DIC[a.id];
	cb = DIC[b.id];
	if(!ca || !cb) return null;
	at = getRankedTrophyFromClient(ca);
	bt = getRankedTrophyFromClient(cb);
	ao = room.game && room.game.forfeit ? (a.id === room.game.forfeit ? -1 : 1) : getRankedOutcome(a, b);
	bo = -ao;
	changes[a.id] = {
		opponent: b.id,
		outcome: ao,
		before: at,
		opponentBefore: bt,
		delta: getRankedTrophyDelta(at, bt, ao)
	};
	changes[b.id] = {
		opponent: a.id,
		outcome: bo,
		before: bt,
		opponentBefore: at,
		delta: getRankedTrophyDelta(bt, at, bo)
	};
	return changes;
}
function applyRankedTrophyChange(client, change){
	var ranked;
	var before;
	var after;
	var delta;

	if(!client || !client.data || !change) return null;
	ranked = ensureRankedData(client.data);
	before = ranked.trophy;
	after = Math.max(0, before + change.delta);
	delta = after - before;
	ranked.trophy = after;
	ranked.best = Math.max(ranked.best || 0, after);
	ranked.games = toNonNegativeInt(ranked.games, 0) + 1;
	if(change.outcome > 0) ranked.wins = toNonNegativeInt(ranked.wins, 0) + 1;
	else if(change.outcome < 0) ranked.losses = toNonNegativeInt(ranked.losses, 0) + 1;
	else ranked.draws = toNonNegativeInt(ranked.draws, 0) + 1;
	client.data.trophy = ranked.trophy;
	return {
		before: before,
		after: after,
		delta: delta,
		outcome: change.outcome,
		opponent: change.opponent,
		opponentBefore: change.opponentBefore,
		best: ranked.best,
		games: ranked.games,
		wins: ranked.wins,
		losses: ranked.losses,
		draws: ranked.draws
	};
}

function normalizeProfileName(profile){
	if(!profile) return "";
	if(typeof profile == "string"){
		try{
			profile = JSON.parse(profile);
		}catch(e){
			return "";
		}
	}
	var name = profile.title || profile.name || "";
	if(typeof name != "string") return "";
	name = name.trim();
	return name ? name : "";
}
function normalizeKkutuName(kkutu){
	if(!kkutu) return "";
	if(typeof kkutu == "string"){
		try{
			kkutu = JSON.parse(kkutu);
		}catch(e){
			return "";
		}
	}
	var name = kkutu.name || kkutu.title || "";
	if(typeof name != "string") return "";
	name = name.trim();
	return name ? name : "";
}
function isLikelyId(name, id){
	if(!name) return true;
	if(typeof name != "string") return false;
	if(/^[a-f0-9]{24}$/i.test(name)) return true;
	if(/^[a-f0-9]{32}$/i.test(name)) return true;
	return false;
}
function escapeSqlString(value){
	return String(value).replace(/'/g, "''");
}
function attachRankNames(ranksById, done){
	var idSet = {};
	var ids;
	var nameById = {};

	if(!ranksById) return done();
	Object.keys(ranksById).forEach(function(key){
		var list = ranksById[key] && ranksById[key].list;
		if(!list) return;
		list.forEach(function(item){
			if(item && item.id) idSet[item.id] = true;
		});
	});
	ids = Object.keys(idSet);
	if(!ids.length) return done();

	DB.users.find([ '_id', { $in: ids } ])
		.limit([ 'kkutu', true ])
		.on(function($users){
			var missing = ids.slice();

			if($users) $users.forEach(function(user){
				var name = normalizeKkutuName(user.kkutu);
				if(name && !isLikelyId(name, user._id)){
					nameById[user._id] = name;
				}
			});

			missing = missing.filter(function(id){
				return !nameById[id];
			});

			function applyNames(){
				Object.keys(ranksById).forEach(function(key){
					var list = ranksById[key] && ranksById[key].list;
					if(!list) return;
					list.forEach(function(item){
						if(item && nameById[item.id]) item.name = nameById[item.id];
					});
				});
				done();
			}

			if(!missing.length) return applyNames();

			var pending = missing.length;
			missing.forEach(function(id){
				var safeId = escapeSqlString(id);
				var sql = "SELECT profile FROM session WHERE profile->>'id' = '" + safeId + "' LIMIT 1";

				DB.session.direct(sql, function(err, res){
					if(!err && res && res.rows && res.rows.length){
						var sessionName = normalizeProfileName(res.rows[0].profile);
						if(sessionName && !isLikelyId(sessionName, id)){
							nameById[id] = sessionName;
						}
					}
					if(--pending === 0) applyNames();
				});
			});
		});
}

exports.NIGHT = false;
exports.init = function(_DB, _DIC, _ROOM, _GUEST_PERMISSION, _CHAN){
	var i, k;
	
	DB = _DB;
	DIC = _DIC;
	ROOM = _ROOM;
	GUEST_PERMISSION = _GUEST_PERMISSION;
	CHAN = _CHAN;
	_rid = 100;
	_roomThemeCursor = 0;
	// 망할 셧다운제 if(Cluster.isMaster) setInterval(exports.processAjae, 60000);
	DB.kkutu_shop.find().on(function($shop){
		SHOP = {};
		
		$shop.forEach(function(item){
			SHOP[item._id] = item;
		});
	});
	Rule = {};
	for(i in Const.RULE){
		k = Const.RULE[i].rule;
		Rule[k] = require(`./games/${k.toLowerCase()}`);
		Rule[k].init(DB, DIC);
	}
};
/* 망할 셧다운제
exports.processAjae = function(){
	var i;
	
	exports.NIGHT = (new Date()).getHours() < 6;
	if(exports.NIGHT){
		for(i in DIC){
			if(!DIC[i].isAjae){
				DIC[i].sendError(440);
				DIC[i].socket.close();
			}
		}
	}
};
*/
exports.getUserList = function(){
	var i, res = {};
	
	for(i in DIC){
		res[i] = DIC[i].getData();
	}
	
	return res;
};
exports.getRoomList = function(){
	var i, res = {};
	
	for(i in ROOM){
		res[i] = ROOM[i].getData();
	}
	
	return res;
};
exports.narrate = function(list, type, data){
	list.forEach(function(v){
		if(DIC[v]) DIC[v].send(type, data);
	});
};
exports.publish = function(type, data, _room){
	var i;
	
	if(Cluster.isMaster){
		for(i in DIC){
			DIC[i].send(type, data);
		}
	}else if(Cluster.isWorker){
		if(type == "room") process.send({ type: "room-publish", data: data, password: _room });
		else for(i in DIC){
			DIC[i].send(type, data);
		}
	}
};
exports.Robot = function(target, place, level){
	var my = this;
	
	my.id = target + place + Math.floor(Math.random() * 1000000000);
	my.robot = true;
	my.game = {};
	my.data = {};
	my.place = place;
	my.target = target;
	my.equip = { robot: true };
	my.nickname = "";
	
	my.getData = function(){
		var data = {
			id: my.id,
			robot: true,
			game: my.game,
			data: my.data,
			place: my.place,
			target: target,
			equip: my.equip,
			nickname: my.nickname,
			level: my.level,
			ready: true
		};
		if(my.nickname){
			data.profile = {
				title: my.nickname,
				name: my.nickname,
				image: "/img/kkutu/robot.png"
			};
		}
		return data;
	};
	my.setLevel = function(level){
		my.level = level;
		my.data.score = Math.pow(10, level + 2);
	};
	my.setTeam = function(team){
		my.game.team = team;
	};
	my.setNickname = function(name){
		my.nickname = name || "";
	};
	my.send = function(){};
	my.obtain = function(){};
	my.invokeWordPiece = function(text, coef){};
	my.publish = function(type, data, noBlock){
		var i;
		
		if(my.target == null){
			for(i in DIC){
				if(DIC[i].place == place) DIC[i].send(type, data);
			}
		}else if(DIC[my.target]){
			DIC[my.target].send(type, data);
		}
	};
	my.chat = function(msg, code){
		my.publish('chat', { value: msg });
	};
	my.setLevel(level);
	my.setTeam(0);
};
exports.Data = function(data){
	var i, j;
	
	if(!data) data = {};
	if(typeof data == "string"){
		try{
			data = JSON.parse(data);
		}catch(e){
			data = {};
		}
	}
	if(!data || typeof data != "object" || Array.isArray(data)) data = {};
	
	this.score = toNonNegativeInt(data.score, 0);
	this.playTime = toNonNegativeInt(data.playTime, 0);
	this.connectDate = data.connectDate || 0;
	this.joinedAt = data.joinedAt || DEFAULT_JOINED_AT;
	this.name = data.name || data.title;
	this.username = typeof data.username === "string" ? data.username : undefined;
	this.ranked = normalizeRankedData(data);
	this.trophy = this.ranked.trophy;
	this.record = {};
	for(i in Const.GAME_TYPE){
		var record = data.record && data.record[Const.GAME_TYPE[i]];
		this.record[j = Const.GAME_TYPE[i]] = [0, 1, 2, 3].map(function(index){
			return toNonNegativeInt(record && record[index], 0);
		});
	}
	// 전, 승, 점수
};
exports.WebServer = function(socket){
	var my = this;
	
	my.socket = socket;
	
	my.send = function(type, data){
		var i, r = data || {};
		
		r.type = type;
		
		if(socket.readyState == 1) socket.send(JSON.stringify(r));
	};
	my.onWebServerMessage = function(msg){
		try{ msg = JSON.parse(msg); }catch(e){ return; }
		
		switch(msg.type){
			case 'seek':
				my.send('seek', { value: Object.keys(DIC).length });
				break;
			case 'narrate-friend':
				exports.narrate(msg.list, 'friend', { id: msg.id, s: msg.s, stat: msg.stat });
				break;
			default:
		}
	};
	socket.on('message', my.onWebServerMessage);
};
exports.Client = function(socket, profile, sid){
	var my = this;
	var gp, okg;
	
	if(profile){
		my.id = profile.id;
		my.profile = profile;
		/* 망할 셧다운제
		if(Cluster.isMaster){
			my.isAjae = Ajae.checkAjae(profile.birth, profile._age);
		}else{
			my.isAjae = true;
		}
		my._birth = profile.birth;
		my._age = profile._age;
		delete my.profile.birth;
		delete my.profile._age;
		*/
		delete my.profile.token;
		delete my.profile.sid;

		if(my.profile.title) my.profile.name = "anonymous";
	}else{
		gp = guestProfiles[Math.floor(Math.random() * guestProfiles.length)];
		
		my.id = "guest__" + sid;
		my.guest = true;
		my.isAjae = false;
		my.profile = {
			id: sid,
			title: getGuestName(sid),
			image: GUEST_IMAGE
		};
	}
	my.sid = sid;
	my._pieceGains = Object.create(null);
	my.socket = socket;
	my.place = 0;
	my.team = 0;
	my.ready = false;
	my.game = {};
	
	my.subPlace = 0;
	my.error = false;
	my.blocked = false;
	my.spam = 0;
	my._pub = new Date();
	
	if(Cluster.isMaster){
		my.onOKG = function(time){
			// ?? 이럴 일이 없어야 한다.
		};
	}else{
		my.onOKG = function(time){
			var d = (new Date()).getDate();
			
			if(my.guest) return;
			if(d != my.data.connectDate){
				my.data.connectDate = d;
				my.data.playTime = 0;
				my.okgCount = 0;
			}
			my.data.playTime += time;
			
			while(my.data.playTime >= PER_OKG * (my.okgCount + 1)){
				if(my.okgCount >= MAX_OKG) return;
				my.okgCount++;
			}
			my.send('okg', { time: my.data.playTime, count: my.okgCount });
			// process.send({ type: 'okg', id: my.id, time: time });
		};
	}
	socket.on('close', function(code){
		if(DIC[my.id] !== my) return exports.onClientClosed(my, code);
		if(ROOM[my.place]) ROOM[my.place].go(my);
		if(my.subPlace) my.pracRoom.go(my);
		exports.onClientClosed(my, code);
	});
	socket.on('message', function(msg){
		var data, room = ROOM[my.place];
		if(!my) return;
		if(!msg) return;
		
		JLog.log(`Chan @${channel} Msg #${my.id}: ${msg}`);
		try{ data = JSON.parse(msg); }catch(e){ return my.sendError(400); }
		if(!data || typeof data !== "object" || Array.isArray(data) || typeof data.type !== "string") return my.sendError(400);
		if(Cluster.isWorker) process.send({ type: "tail-report", id: my.id, chan: channel, place: my.place, msg: data.error ? msg : data });
		
		exports.onClientMessage(my, data);
	});
	/* 망할 셧다운제
	my.confirmAjae = function(input){
		if(Ajae.confirmAjae(input, my._birth, my._age)){
			DB.users.update([ '_id', my.id ]).set([ 'birthday', input.join('-') ]).on(function(){
				my.sendError(445);
			});
		}else{
			DB.users.update([ '_id', my.id ]).set([ 'black', `[${input.join('-')}] 생년월일이 올바르게 입력되지 않았습니다. 잠시 후 다시 시도해 주세요.` ]).on(function(){
				my.socket.close();
			});
		}
	};
	*/
	my.getData = function(gaming){
		var o = {
			id: my.id,
			guest: my.guest,
			game: {
				ready: my.ready,
				form: my.form,
				team: my.team,
				practice: my.subPlace,
				score: my.game.score,
				item: my.game.item
			}
		};
		if(!gaming){
			o.profile = my.profile;
			o.place = my.place;
			o.data = my.data;
			o.money = my.money;
			o.equip = my.equip;
			o.exordial = my.exordial;
		}
		return o;
	};
	my.send = function(type, data){
		var i, r = data || {};
		
		r.type = type;
		
		if(socket.readyState == 1) socket.send(JSON.stringify(r));
	};
	my.sendError = function(code, msg){
		my.send('error', { code: code, message: msg });
	};
	my.syncToMaster = function(){
		if(!Cluster.isWorker) return;
		var data = my.getData();
		data.box = my.box;
		data.okgCount = my.okgCount;
		process.send({ type: "user-publish", data: data, sid: my.sid, roomToken: my._roomToken,
			savedMoney: my._savedMoney, savedScore: my._savedScore, pendingSaves: my._flushPending || 0 });
	};
	my.publish = function(type, data, noBlock){
		var i;
		var now = new Date(), st = now - my._pub;
		
		if(!noBlock){
			if(st <= Const.SPAM_ADD_DELAY) my.spam++;
			else if(st >= Const.SPAM_CLEAR_DELAY) my.spam = 0;
			if(my.spam >= Const.SPAM_LIMIT){
				if(!my.blocked) my.numSpam = 0;
				my.blocked = true;
			}
			my._pub = now;
			if(my.blocked){
				if(st < Const.BLOCKED_LENGTH){
					if(++my.numSpam >= Const.KICK_BY_SPAM){
						if(Cluster.isWorker) process.send({ type: "kick", target: my.id });
						return my.socket.close();
					}
					return my.send('blocked');
				}else my.blocked = false;
			}
		}
		data.profile = my.profile;
		if(my.subPlace && type != 'chat') my.send(type, data);
		else for(i in DIC){
			if(DIC[i].place == my.place) DIC[i].send(type, data);
		}
		if(Cluster.isWorker && type == 'user') my.syncToMaster();
	};
	my.chat = function(msg, code){
		if(my.noChat) return my.send('chat', { notice: true, code: 443 });
		my.publish('chat', { value: msg, notice: code ? true : false, code: code });
	};
	my.checkExpire = function(){
		var before = Inventory.snapshot(my, [ 'box', 'equip' ]);
		var now = new Date();
		var d = now.getDate();
		var i, expired = [];
		var gr;
		
		now = now.getTime() * 0.001;
		if(d != my.data.connectDate){
			my.data.connectDate = d;
			my.data.playTime = 0;
		}
		for(i in my.box){
			if(!my.box[i]){
				delete my.box[i];
				continue;
			}
			if(!my.box[i].expire) continue;
			if(my.box[i].expire < now){
				for(gr in my.equip) if(my.equip[gr] === i) delete my.equip[gr];
				delete my.box[i];
				expired.push(i);
			}
		}
		if(expired.length){
			my.send('expired', { list: expired });
			if(!my.guest) Inventory.save(DB.users, my.id, before, [ [ 'box', my.box ], [ 'equip', my.equip ] ], function(err){
				if(!err) return my.syncToMaster();
				if(err.code !== 409) return my.sendError(500);
				DB.users.findOne([ '_id', my.id ]).limit([ 'box', true ], [ 'equip', true ]).on(function(user){
					if(!user) return;
					my.box = user.box || {};
					my.equip = user.equip || {};
					Object.keys(my._pieceGains).forEach(function(key){ my.box[key] = (Number(my.box[key]) || 0) + my._pieceGains[key]; });
					my.syncToMaster();
				});
			});
		}
	};
	my.refresh = function(){
		var R = new Lizard.Tail();
		
		if(my.guest){
			my.equip = {};
			my.data = new exports.Data();
			my.money = 0;
			my.friends = {};
			my.friendReq = {};
			
			R.go({ result: 200 });
		}else DB.users.findOne([ '_id', my.id ]).on(function($user){
			var first = !$user;
			var black = first ? "" : $user.black;
			/* Enhanced User Block System [S] */
			const blockedUntil = (first || !$user.blockedUntil) ? null : $user.blockedUntil;
			if(black && Number(blockedUntil) > 0 && Number(blockedUntil) < Date.now()){
				black = false;
				DB.users.update([ '_id', my.id ]).set([ 'black', null ], [ 'blockedUntil', 0 ]).on();
			}
			/* Enhanced User Block System [E] */

			if(first) $user = { money: 0 };
			if(black == "null") black = false;
			if(black == "chat"){
				black = false;
				my.noChat = true;
			}
			/* 망할 셧다운제
			if(Cluster.isMaster && !my.isAjae){ // null일 수는 없다.
				my.isAjae = Ajae.checkAjae(($user.birthday || "").split('-'));
				if(my.isAjae === null){
					if(my._birth) my._checkAjae = setTimeout(function(){
						my.sendError(442);
						my.socket.close();
					}, 300000);
					else{
						my.sendError(441);
						my.socket.close();
						return;
					}
				}
			}*/
			my.exordial = $user.exordial || "";
			my.equip = $user.equip || {};
			my.box = $user.box || {};
			var storedName = "";
			var kkutu = $user.kkutu;

			if(typeof kkutu == "string"){
				try{
					kkutu = JSON.parse(kkutu);
				}catch(e){
					kkutu = null;
				}
			}
			if(kkutu){
				var rawName = kkutu.name || kkutu.title || "";
				if(typeof rawName == "string") storedName = rawName.trim();
			}
			if(storedName){
				if(my.profile.title !== storedName){
					my.profile.title = storedName;
					my.profile.name = "anonymous";
					if(my.sid) DB.session.update([ '_id', my.sid ]).set([ 'profile.title', storedName ]).on();
				}
			}
			my.data = new exports.Data($user.kkutu);
			my._savedScore = my.data.score;
			my.data.name = my.profile.title || my.profile.name;
			if(!kkutu || !Number(kkutu.joinedAt)){
				DB.users.update([ '_id', my.id ]).set([ 'kkutu.joinedAt', DEFAULT_JOINED_AT ]).on();
			}
			if(my.data.name && !storedName){
				DB.users.update([ '_id', my.id ]).set([ 'kkutu.name', my.data.name ]).on();
			}
			my.money = isFinite(Number($user.money)) ? Number($user.money) : 0;
			my._savedMoney = my.money;
			my.friends = $user.friends || {};
			my.friendReq = (kkutu && kkutu.friendReq) || $user.friendReq || {};
			my.data.friendReq = my.friendReq;
			if(first){ my._initialFlush = true; my.flush(); my._initialFlush = false; }
			else{
				my.checkExpire();
				my.okgCount = Math.floor((my.data.playTime || 0) / PER_OKG);
			}
			/* Enhanced User Block System [S] */
			if(black){
				if(blockedUntil) R.go({ result: 444, black: black, blockedUntil: blockedUntil });
				else R.go({ result: 444, black: black });
			}
			/* Enhanced User Block System [E] */
			else if(Cluster.isMaster && $user.server) R.go({ result: 409, black: $user.server });
			else if(exports.NIGHT && my.isAjae === false) R.go({ result: 440 });
			else R.go({ result: 200 });
		});
		return R;
	};
	my.reserveMoney = function(){
		var saved = isFinite(my._savedMoney) ? Number(my._savedMoney) : 0;
		var current = isFinite(my.money) ? Number(my.money) : saved;
		var delta = current - saved;
		my._savedMoney = current;
		return delta;
	};
	my.saveMoney = function(done){
		saveReservedChanges(done, my.reserveMoney());
	};
	function saveReservedChanges(done, delta, progress){
		var increments = [];
		if(delta) increments.push([ 'money', delta ]);
		if(progress && progress.score) increments.push([ 'kkutu.score', progress.score ]);
		if(progress) Object.keys(progress.pieces).forEach(function(key){ increments.push([ 'box.' + key, progress.pieces[key] ]); });
		if(!increments.length) return done();
		var query = DB.users.update([ '_id', my.id ]);
		query.inc.apply(query, increments).on(function(result, err){
			if(err) my._savedMoney -= delta;
			my.syncToMaster();
			done(err);
		});
	}
	my.awardMoney = function(amount, payload){
		if(my.guest || !isFinite(amount) || amount <= 0) return;
		my.money = (Number(my.money) || 0) + amount;
		my.saveMoney(function(err){
			if(err) return my.sendError(500);
			my.syncToMaster();
			my.send('clanMissionReward', {
				clan: payload.clan, mission: payload.mission, reward: amount, money: my.money
			});
		});
	};
	my.flush = function(box, equip, friends){
		var R = new Lizard.Tail();
		// Item gains use increments; expiration owns its separate inventory compare-and-set.
		
		if(my.guest){
			R.go({ id: my.id, prev: 0 });
			return R;
		}
		// Friend actions belong to the lobby; they must not save its gameplay snapshot.
		if(Cluster.isMaster && friends && !box && !equip){
			DB.users.update([ '_id', my.id ]).set(
				[ 'friends', my.friends ], [ 'kkutu.friendReq', my.friendReq || {} ]
			).on(function(result, err){ R.go({ id: my.id, prev: 0, error: err }); });
			return R;
		}
		var updates = [];
		var initial = my._initialFlush;
		if(my.data && isFinite(my.data.score)){
			// Save the fields owned by the game process without replacing HTTP/social data.
			(Cluster.isWorker || initial ? [ 'playTime', 'connectDate', 'joinedAt', 'record', 'ranked', 'trophy' ] : []).forEach(function(key){
				if(my.data[key] !== undefined) updates.push([ 'kkutu.' + key, my.data[key] ]);
			});
			if(initial) updates.push([ 'kkutu.score', my.data.score ]);
			if(Cluster.isMaster && my.data.name) updates.push([ 'kkutu.name', my.data.name ]);
			if(Cluster.isMaster && my.data.username) updates.push([ 'kkutu.username', my.data.username ]);
		}
		if(friends) updates.push([ 'friends', my.friends ]);
		// Reserve the delta before publishing it to the lobby, including while the DB is busy.
		var moneyDelta = my.reserveMoney();
		var progress = { score: 0, pieces: my._pieceGains };
		my._pieceGains = Object.create(null);
		if(Cluster.isWorker && !initial){
			var savedScore = isFinite(my._savedScore) ? Number(my._savedScore) : Number(my.data.score);
			progress.score = my.data.score - savedScore;
			my._savedScore = my.data.score;
		}
		my._flushPending = (my._flushPending || 0) + 1;
		var reservedScore = my._savedScore;
		var reservedMoney = my._savedMoney;
		function restoreProgress(){
			if(progress.score) my._savedScore -= progress.score;
			Object.keys(progress.pieces).forEach(function(key){ my._pieceGains[key] = (my._pieceGains[key] || 0) + progress.pieces[key]; });
		}
		function finish(result){
			my._flushPending--;
			my.syncToMaster();
			R.go(result);
		}
		my.syncToMaster();
		function afterUpsert(__res, err){
			if(err){
				my._savedMoney -= moneyDelta;
				restoreProgress();
				return finish({ id: my.id, prev: 0, error: err });
			}
			saveReservedChanges(function(moneyError){
				if(moneyError){ restoreProgress(); return finish({ id: my.id, prev: 0, error: moneyError }); }
				if(Cluster.isMaster && !initial) return finish({ id: my.id, prev: 0 });
				DB.users.findOne([ '_id', my.id ]).limit([ 'kkutu', true ], [ 'money', true ]).on(function(user, readError){
					if(readError || !user) return finish({ id: my.id, prev: 0, error: readError || new Error('Missing saved user') });
					var stored = typeof user.kkutu === 'string' ? JSON.parse(user.kkutu) : user.kkutu;
					var score = toNonNegativeInt(stored && stored.score, my.data.score);
					if(my._flushPending === 1){
						if(my._savedScore === reservedScore){
							my.data.score = score + (my.data.score - my._savedScore);
							my._savedScore = score;
						}
						if(my._savedMoney === reservedMoney && isFinite(Number(user.money))){
							my.money = Number(user.money) + (my.money - my._savedMoney);
							my._savedMoney = Number(user.money);
						}
					}
					DB.redis.getGlobal(my.id).then(function(_res){
						DB.redis.putGlobal(my.id, score).then(function(){ finish({ id: my.id, prev: _res }); });
					});
				});
			}, moneyDelta, progress);
		}
		if(updates.length){
			var query = DB.users.upsert([ '_id', my.id ]);
			query.set.apply(query, updates).on(afterUpsert);
		}else afterUpsert();
		return R;
	};
	my.invokeWordPiece = function(text, coef){
		if(!my.game.wpc) return;
		var v;
		
		if(Math.random() <= 0.04 * coef){
			v = text.charAt(Math.floor(Math.random() * text.length));
			if(!v.match(/[a-z가-힣]/)) return;
			my.game.wpc.push(v);
		}
	};
	my.enter = function(room, spec, pass){
		var $room, i;
		if(my._roomSaving || my._clanCreating) return my.sendError(400);
		
		if(my.place){
			my.send('roomStuck');
			JLog.warn(`Enter the room ${room.id} in the place ${my.place} by ${my.id}!`);
			return;
		}else if(room.id){
			// 이미 있는 방에 들어가기... 여기서 유효성을 검사한다.
			$room = ROOM[room.id];
			
			if(!$room){
				if(Cluster.isMaster){
					for(i in CHAN) CHAN[i].send({ type: "room-invalid", room: room });
				}else{
					process.send({ type: "room-invalid", room: room });
				}
				return my.sendError(430, room.id);
			}
			if($room.match1v1 && !spec && $room.matchPlayers.indexOf(my.id) === -1) return my.sendError(417);
			if(!spec){
				if($room.gaming){
					return my.send('error', { code: 416, target: $room.id });
				}else if(my.guest) if(!GUEST_PERMISSION.enter){
					return my.sendError(401);
				}
			}
			if($room.players.length >= $room.limit + (spec ? Const.MAX_OBSERVER : 0)){
				return my.sendError(429);
			}
			if($room.players.indexOf(my.id) != -1){
				return my.sendError(409);
			}
			if(Cluster.isMaster){
				my._roomToken = sid + ':' + (++_connectionGeneration);
				my.send('preRoom', { id: $room.id, pw: room.password, channel: $room.channel });
				CHAN[$room.channel].send({ type: "room-reserve", session: sid, roomToken: my._roomToken, room: room, spec: spec, pass: pass });
				
				$room = undefined;
			}else{
				if(!pass && $room){
					if($room.kicked.indexOf(my.id) != -1){
						return my.sendError(406);
					}
					if($room.password != room.password && $room.password){
						$room = undefined;
						return my.sendError(403);
					}
				}
			}
		}else if(my.guest && !GUEST_PERMISSION.enter){
			my.sendError(401);
		}else{
			// 새 방 만들어 들어가기
			/*
				1. 마스터가 ID와 채널을 클라이언트로 보낸다.
				2. 클라이언트가 그 채널 일꾼으로 접속한다.
				3. 일꾼이 만든다.
				4. 일꾼이 만들었다고 마스터에게 알린다.
				5. 마스터가 방 정보를 반영한다.
			*/
			if(Cluster.isMaster){
				var av = getFreeChannel();
				my._roomToken = sid + ':' + (++_connectionGeneration);
				
				room.id = _rid;
				room.roomTheme = nextRoomThemeName();
				room.themeColor = room.roomTheme;
				room._create = true;
				my.send('preRoom', { id: _rid, channel: av });
				CHAN[av].send({ type: "room-reserve", create: true, session: sid, roomToken: my._roomToken, room: room });
				
				do{
					if(++_rid > 999) _rid = 100;
				}while(ROOM[_rid]);
			}else{
				if(room._id){
					room.id = room._id;
					delete room._id;
				}
				if(my.place != 0){
					my.sendError(409);
				}
				$room = new exports.Room(room, getFreeChannel());
				
				process.send({ type: "room-new", target: my.id, roomToken: my._roomToken, room: $room.getData() });
				ROOM[$room.id] = $room;
				spec = false;
			}
		}
		if($room){
			if(spec) $room.spectate(my, room.password);
			else $room.come(my, room.password, pass);
		}
	};
	my.leave = function(kickVote){
		var $room = ROOM[my.place];
		
		if(my.subPlace){
			my.pracRoom.go(my);
			if($room) my.send('room', { target: my.id, room: $room.getData() });
			my.publish('user', my.getData());
			if(!kickVote) return;
		}
		if($room) $room.go(my, kickVote);
	};
	my.setForm = function(mode){
		var $room = ROOM[my.place];
		
		if(!$room) return;
		if($room.match1v1) return my.sendError(400);
		
		my.form = mode;
		my.ready = false;
		my.publish('user', my.getData(), true);
	};
	my.setTeam = function(team){
		if(ROOM[my.place] && ROOM[my.place].match1v1) return my.sendError(400);
		my.team = team;
		my.publish('user', my.getData());
	};
	my.kick = function(target, kickVote){
		var $room = ROOM[my.place];
		var i, $c;
		var len = $room.players.length;
		
		if(target == null){ // 로봇 (이 경우 kickVote는 로봇의 식별자)
			$room.removeAI(kickVote);
			return;
		}
		for(i in $room.players){
			if($room.players[i].robot) len--;
		}
		if(len < 4) kickVote = { target: target, Y: 1, N: 0 };
		if(kickVote){
			$room.kicked.push(target);
			$room.kickVote = null;
			if(DIC[target]) DIC[target].leave(kickVote);
		}else{
			$room.kickVote = { target: target, Y: 1, N: 0, list: [] };
			for(i in $room.players){
				$c = DIC[$room.players[i]];
				if(!$c) continue;
				if($c.id == $room.master) continue;
				
				$c.kickTimer = setTimeout($c.kickVote, 10000, $c, true);
			}
			my.publish('kickVote', $room.kickVote, true);
		}
	};
	my.kickVote = function(client, agree){
		var $room = ROOM[client.place];
		var $m;
		
		if(!$room) return;
		
		$m = DIC[$room.master];
		if($room.kickVote){
			$room.kickVote[agree ? 'Y' : 'N']++;
			if($room.kickVote.list.push(client.id) >= $room.players.length - 2){
				if($room.gaming) return;
				
				if($room.kickVote.Y >= $room.kickVote.N) $m.kick($room.kickVote.target, $room.kickVote);
				else $m.publish('kickDeny', { target: $room.kickVote.target, Y: $room.kickVote.Y, N: $room.kickVote.N }, true);
				
				$room.kickVote = null;
			}
		}
		clearTimeout(client.kickTimer);
	};
	my.toggle = function(){
		var $room = ROOM[my.place];
		
		if(!$room) return;
		if($room.gaming || $room.finishing) return;
		if($room.master == my.id) return;
		if(my.form != "J") return;
		
		my.ready = !my.ready;
		my.publish('user', my.getData());
	};
	my.start = function(){
		var $room = ROOM[my.place];
		
		if(!$room) return;
		if($room.master != my.id) return;
		if($room.players.length < 2) return my.sendError(411);
		
		$room.ready();
	};
	my.practice = function(level){
		var $room = ROOM[my.place];
		var ud;
		var pr;
		
		if(!$room) return;
		if($room.match1v1) return my.sendError(400);
		if(my.subPlace) return;
		if(my.form != "J") return;
		
		my.team = 0;
		my.ready = false;
		ud = my.getData();
		my.pracRoom = new exports.Room($room.getData());
		my.pracRoom.id = $room.id + 1000;
		ud.game.practice = my.pracRoom.id;
		if(pr = $room.preReady()) return my.sendError(pr);
		my.publish('user', ud);
		my.pracRoom.time /= my.pracRoom.rule.time;
		my.pracRoom.limit = 1;
		my.pracRoom.password = "";
		my.pracRoom.practice = true;
		my.subPlace = my.pracRoom.id;
		my.pracRoom.come(my);
		my.pracRoom.start(level);
		my.pracRoom.game.hum = 1;
	};
	my.setRoom = function(room){
		var $room = ROOM[my.place];
		
		if($room){
			if($room.match1v1){
				return my.sendError(400);
			}
			if(!$room.gaming){
				if($room.master == my.id){
					$room.set(room);
					exports.publish('room', { target: my.id, room: $room.getData(), modify: true }, room.password);
				}else{
					my.sendError(400);
				}
			}
		}else{
			my.sendError(400);
		}
	};
	my.applyEquipOptions = function(rw){
		var $obj;
		var i, j;
		var pm = rw.playTime / 60000;
		
		rw._score = Math.round(rw.score);
		rw._money = Math.round(rw.money);
		rw._blog = [];
		my.checkExpire();
		for(i in my.equip){
			$obj = SHOP[my.equip[i]];
			if(!$obj) continue;
			if(!$obj.options) continue;
			for(j in $obj.options){
				if(j == "gEXP") rw.score += rw._score * $obj.options[j];
				else if(j == "hEXP") rw.score += $obj.options[j] * pm;
				else if(j == "gMNY") rw.money += rw._money * $obj.options[j];
				else if(j == "hMNY") rw.money += $obj.options[j] * pm;
				else continue;
				rw._blog.push("q" + j + $obj.options[j]);
			}
		}
		if(rw.together && my.okgCount > 0){
			i = 0.05 * my.okgCount;
			j = 0.05 * my.okgCount;
			
			rw.score += rw._score * i;
			rw.money += rw._money * j;
			rw._blog.push("kgEXP" + i);
			rw._blog.push("kgMNY" + j);
		}
		rw.score = Math.round(rw.score);
		rw.money = Math.round(rw.money);
	};
	my.obtain = function(k, q, flush){
		if(my.guest) return;
		my._pieceGains[k] = (my._pieceGains[k] || 0) + q;
		if(my.box[k]) my.box[k] += q;
		else my.box[k] = q;
		
		my.send('obtain', { key: k, q: q });
		if(flush) my.flush(true);
	};
	my.addFriend = function(id){
		var fd = DIC[id];
		
		if(!fd) return;
		my.friends[id] = fd.profile.title || fd.profile.name;
		my.flush(false, false, true);
		my.send('friendEdit', { friends: my.friends });
	};
	my.removeFriend = function(id){
		var fd = DIC[id];
		var myName = (my.profile && (my.profile.title || my.profile.name)) || my.id;
		function dropFriendRef(map){
			if(!map) return;
			delete map[my.id];
		}
		
		if(fd){
			fd.friends = fd.friends || {};
			dropFriendRef(fd.friends);
			fd.flush(false, false, true);
			fd.send('friendRemoved', { id: my.id, name: myName });
			fd.send('friendEdit', { friends: fd.friends });
		}else{
			DB.users.findOne([ '_id', id ]).limit([ 'friends', true ]).on(function($doc){
				if(!$doc) return;
				
				var f = $doc.friends || {};
				
				dropFriendRef(f);
				DB.users.update([ '_id', id ]).set([ 'friends', f ]).on();
			});
		}
		delete my.friends[id];
		my.flush(false, false, true);
		my.send('friendEdit', { friends: my.friends });
	};
};
exports.Room = function(room, channel){
	var my = this;
	
	my.id = room.id || _rid;
	my.channel = channel;
	my.roomTheme = normalizeRoomThemeName(room.roomTheme || room.themeColor) || nextRoomThemeName();
	my.opts = {};
	/*my.title = room.title;
	my.password = room.password;
	my.limit = Math.round(room.limit);
	my.mode = room.mode;
	my.rule = Const.getRule(room.mode);
	my.round = Math.round(room.round);
	my.time = room.time * my.rule.time;
	my.opts = {
		manner: room.opts.manner,
		extend: room.opts.injeong,
		mission: room.opts.mission,
		loanword: room.opts.loanword,
		injpick: room.opts.injpick || []
	};*/
	my.master = null;
	my.tail = [];
	my.players = [];
	my.kicked = [];
	my.kickVote = null;
	my.match1v1 = !!room.match1v1;
	my.matchPlayers = my.match1v1 && Array.isArray(room.matchPlayers) ? room.matchPlayers.slice() : [];
	
	my.gaming = false;
	my.game = {};
	
	my.getData = function(){
		var i, readies = {};
		var pls = [];
		var seq = my.game.seq ? my.game.seq.map(filterRobot) : [];
		var o;
		
		for(i in my.players){
			if(o = DIC[my.players[i]]){
				var readyValue = (typeof o.ready === "boolean") ? o.ready : !!(o.game && o.game.ready);
				var formValue = (typeof o.form === "string" && o.form) ? o.form : ((o.game && o.game.form) || "J");
				var teamValue = (typeof o.team !== "undefined" && o.team !== null) ? Number(o.team) : Number(o.game && o.game.team);
				if(isNaN(teamValue) || teamValue < 0 || teamValue > 5) teamValue = 0;
				readies[my.players[i]] = {
					r: readyValue,
					f: formValue,
					t: teamValue
				};
			}
			pls.push(filterRobot(my.players[i]));
		}
		return {
			id: my.id,
			channel: my.channel,
			roomTheme: my.roomTheme,
			themeColor: my.roomTheme,
			title: my.title,
			password: my.password ? true : false,
			limit: my.limit,
			mode: my.mode,
			round: my.round,
			time: my.time,
			master: my.master,
			players: pls,
			readies: readies,
			gaming: my.gaming,
			match1v1: my.match1v1,
			matchPlayers: my.matchPlayers,
			game: {
				round: my.game.round,
				turn: my.game.turn,
				seq: seq,
				title: my.game.title,
				mission: my.game.mission
			},
			practice: my.practice ? true : false,
			opts: my.opts
		};
	};
	my.addAI = function(caller, level, team, nickname){
		var robot;
		if(my.match1v1) return caller.sendError(400);

		if(my.players.length >= my.limit){
			return caller.sendError(429);
		}
		if(my.gaming){
			return caller.send('error', { code: 416, target: my.id });
		}
		if(!my.rule.ai){
			return caller.sendError(415);
		}
		if(isNaN(level = Number(level))) level = 2;
		if(level < 0 || level >= 5) level = 2;
		if(isNaN(team = Number(team))) team = 0;
		if(team < 0 || team > 5) team = 0;
		robot = new exports.Robot(null, my.id, Math.round(level));
		robot.setTeam(Math.round(team));
		robot.setNickname(nickname || "");
		my.players.push(robot);
		my.export();
	};
	my.setAI = function(target, level, team, nickname){
		var i;
		if(my.match1v1) return false;
		
		for(i in my.players){
			if(!my.players[i]) continue;
			if(!my.players[i].robot) continue;
			if(my.players[i].id == target){
				my.players[i].setLevel(level);
				my.players[i].setTeam(team);
				if(arguments.length > 3) my.players[i].setNickname(nickname);
				my.export();
				return true;
			}
		}
		return false;
	};
	my.removeAI = function(target, noEx){
		var i, j;
		
		for(i in my.players){
			if(!my.players[i]) continue;
			if(!my.players[i].robot) continue;
			if(!target || my.players[i].id == target){
				if(my.gaming){
					j = my.game.seq.indexOf(my.players[i]);
					if(j != -1) my.game.seq.splice(j, 1);
				}
				my.players.splice(i, 1);
				if(!noEx) my.export();
				return true;
			}
		}
		return false;
	};
	my.scheduleMatch1v1Start = function(){
		if(!my.match1v1 || my.practice || my.gaming || my.finishing || my.players.length < my.limit) return;
		clearTimeout(my._match1v1Timer);
		my._match1v1Timer = setTimeout(function(){
			var i, c;
			if(!my.match1v1 || my.practice || my.gaming || my.finishing || my.players.length < my.limit) return;
			for(i in my.players){
				if(my.players[i] && my.players[i].robot) continue;
				c = DIC[my.players[i]];
				if(!c || c.form != "J") return;
				c.ready = c.id != my.master;
			}
			my.ready();
		}, 1000);
	};
	my.come = function(client){
		if(!my.practice) client.place = my.id;
		
		if(my.players.push(client.id) == 1){
			my.master = client.id;
		}
		if(Cluster.isWorker){
			client.ready = false;
			client.team = 0;
			client.cameWhenGaming = false;
			client.form = "J";
			
			if(!my.practice) process.send({ type: "room-come", target: client.id, roomToken: client._roomToken, id: my.id });
			my.export(client.id);
			my.scheduleMatch1v1Start();
		}
	};
	my.spectate = function(client, password){
		if(!my.practice) client.place = my.id;
		var len = my.players.push(client.id);
		
		if(Cluster.isWorker){
			client.ready = false;
			client.team = 0;
			client.cameWhenGaming = true;
			client.form = (len > my.limit) ? "O" : "S";
			
			process.send({ type: "room-spectate", target: client.id, roomToken: client._roomToken, id: my.id, pw: password });
			my.export(client.id, false, true);
		}
	};
	my.go = function(client, kickVote){
		var x = my.players.indexOf(client.id);
		var me;
		clearTimeout(my._match1v1Timer);
		
		if(x == -1){
			client.place = 0;
			if(my.players.length < 1) delete ROOM[my.id];
			return client.sendError(409);
		}
		// The lobby mirrors membership only. Scoring and forfeits run in the room worker.
		if(Cluster.isMaster){
			if(client.socket.readyState !== 1 && CHAN && CHAN[my.channel]){
				CHAN[my.channel].send({ type: "client-close", target: client.id, sid: client.sid, room: my.id });
			}
			my.players.splice(x, 1);
			if(my.master === client.id) my.master = my.players[0];
			client.place = 0;
			client.game = {};
			client.ready = false;
			if(!my.players.length) delete ROOM[my.id];
			return;
		}
		if(my.match1v1 && my.gaming && my.game.seq && my.game.seq.indexOf(client.id) !== -1){
			my.game.forfeit = client.id;
			my.roundEnd();
		}
		my.players.splice(x, 1);
		client.game = {};
		if(client.id == my.master){
			while(my.removeAI(false, true));
			my.master = my.players[0];
		}
		if(DIC[my.master]){
			DIC[my.master].ready = false;
			if(my.gaming){
				x = my.game.seq.indexOf(client.id);
				if(x != -1){
					if(my.game.seq.length <= 2){
						my.game.seq.splice(x, 1);
						my.roundEnd();
					}else{
						me = my.game.turn == x;
						if(me && my.rule.ewq){
							clearTimeout(my.game._rrt);
							my.game.loading = false;
							if(Cluster.isWorker) my.turnEnd();
						}
						my.game.seq.splice(x, 1);
						if(my.game.turn > x){
							my.game.turn--;
							if(my.game.turn < 0) my.game.turn = my.game.seq.length - 1;
						}
						if(my.game.turn >= my.game.seq.length) my.game.turn = 0;
					}
				}
			}
		}else{
			if(my.gaming){
				my.interrupt();
				my.game.late = true;
				my.gaming = false;
				my.game = {};
			}
			delete ROOM[my.id];
		}
		if(my.practice){
			clearTimeout(my.game.turnTimer);
			client.subPlace = 0;
		}else client.place = 0;
		
		if(Cluster.isWorker){
			if(!my.practice){
				client.syncToMaster();
				client.socket.close();
				process.send({ type: "room-go", target: client.id, roomToken: client._roomToken, id: my.id, removed: !Object.prototype.hasOwnProperty.call(ROOM, my.id) });
			}
			my.export(client.id, kickVote);
		}
	};
	my.returnRoom = function(client){
		var i, o;
		var otherHumans = 0;

		if(!my.gaming) return false;
		if(client.place != my.id) return false;

		for(i in my.players){
			o = my.players[i];
			if(o == client.id) continue;
			if(o && o.robot) continue;
			otherHumans++;
		}
		if(otherHumans > 0) return false;

		my.interrupt();
		my.game.late = true;
		my.gaming = false;
		my.game = {};

		for(i in my.players){
			o = my.players[i];
			if(o && o.robot) continue;
			if(DIC[o]) DIC[o].ready = false;
		}
		if(DIC[my.master]) DIC[my.master].ready = false;

		if(Cluster.isWorker) my.export(client.id);
		return true;
	};
	my.set = function(room){
		var i, k, ijc, ij;
		
		my.title = room.title;
		my.password = room.password;
		my.limit = Math.max(Math.min(12, my.players.length), Math.round(room.limit));
		my.mode = room.mode;
		my.rule = Const.getRule(room.mode);
		my.round = Math.round(room.round);
		my.time = room.time * my.rule.time;
		if(room.opts && my.opts){
			for(i in Const.OPTIONS){
				k = Const.OPTIONS[i].name.toLowerCase();
				my.opts[k] = room.opts[k] && my.rule.opts.includes(i);
			}
			if(ijc = my.rule.opts.includes("ijp")){
				ij = Const[`${my.rule.lang.toUpperCase()}_IJP`];
				my.opts.injpick = (Array.isArray(room.opts.injpick) ? room.opts.injpick : []).filter(function(item){ return ij.includes(item); });
			}else my.opts.injpick = [];
		}
		if(!my.rule.ai){
			while(my.removeAI(false, true));
		}
		for(i in my.players){
			if(DIC[my.players[i]]) DIC[my.players[i]].ready = false;
		}
	};
	my.preReady = function(teams){
		var i, j, t = 0, l = 0;
		var avTeam = [];
		
		// 팀 검사
		if(teams){
			if(teams[0].length){
				if(teams[1].length > 1 || teams[2].length > 1 || teams[3].length > 1 || teams[4].length > 1 || teams[5].length > 1) return 418;
			}else{
				for(i=1; i<6; i++){
					if(j = teams[i].length){
						if(t){
							if(t != j) return 418;
						}else t = j;
						l++;
						avTeam.push(i);
					}
				}
				if(l < 2) return 418;
				my._avTeam = shuffle(avTeam);
			}
		}
		// 인정픽 검사
		if(!my.rule) return 400;
		if(my.rule.opts.includes("ijp")){
			if(!my.opts.injpick) return 400;
			if(!my.opts.injpick.length) return 413;
			if(!my.opts.injpick.every(function(item){
				return !Const.IJP_EXCEPT.includes(item);
			})) return 414;
		}
		return false;
	};
	my.ready = function(){
		if(my.gaming || my.finishing) return;
		var i, all = true;
		var len = 0;
		var teams = [ [], [], [], [], [], [] ];
		
		for(i in my.players){
			if(my.players[i].robot){
				len++;
				teams[my.players[i].game.team].push(my.players[i]);
				continue;
			}
			if(!DIC[my.players[i]]) continue;
			if(DIC[my.players[i]].form != "J") continue;
			
			len++;
			teams[DIC[my.players[i]].team].push(my.players[i]);
			
			if(my.players[i] == my.master) continue;
			if(!DIC[my.players[i]].ready){
				all = false;
				break;
			}
		}
		if(!DIC[my.master]) return;
		if(len < 2) return DIC[my.master].sendError(411);
		if(i = my.preReady(teams)) return DIC[my.master].sendError(i);
		if(all){
			my._teams = teams;
			my.start();
		}else DIC[my.master].sendError(412);
	};
	my.start = function(pracLevel){
		if(my.gaming || my.finishing) return;
		var i, j, o, hum = 0;
		var now = (new Date()).getTime();
		my.game = {};
		var game = my.game;
		
		my.gaming = true;
		my.game.late = true;
		my.game.round = 0;
		my.game.turn = 0;
		my.game.seq = [];
		my.game.robots = [];
		if(my.practice){
			my.game.robots.push(o = new exports.Robot(my.master, my.id, pracLevel));
			my.game.seq.push(o, my.master);
		}else{
			for(i in my.players){
				if(my.players[i].robot){
					my.game.robots.push(my.players[i]);
				}else{
					if(!(o = DIC[my.players[i]])) continue;
					if(o.form != "J") continue;
					hum++;
				}
				if(my.players[i]) my.game.seq.push(my.players[i]);
			}
			if(my._avTeam){
				o = my.game.seq.length;
				j = my._avTeam.length;
				my.game.seq = [];
				for(i=0; i<o; i++){
					var v = my._teams[my._avTeam[i % j]].shift();
					
					if(!v) continue;
					my.game.seq[i] = v;
				}
			}else{
				my.game.seq = shuffle(my.game.seq);
			}
		}
		my.game.mission = null;
		for(i in my.game.seq){
			o = DIC[my.game.seq[i]] || my.game.seq[i];
			if(!o) continue;
			if(!o.game) continue;
			
			o.playAt = now;
			o.ready = false;
			o.game.score = 0;
			o.game.bonus = 0;
			o.game.item = [/*0, 0, 0, 0, 0, 0*/];
			o.game.wpc = [];
		}
		my.game.hum = hum;
		my.getTitle().then(function(title){
			if(!my.gaming || my.game !== game) return;
			my.game.title = title || Const.EXAMPLE_TITLE[(my.rule && my.rule.lang) || "en"] || "abcdefghij";
			my.export();
			game._rrt = setTimeout(function(){ if(my.game === game) my.roundReady(); }, 2000);
		});
		my.byMaster('starting', { target: my.id });
		delete my._avTeam;
		delete my._teams;
	};
	my.roundReady = function(){
		if(!my.gaming) return;
		
		return my.route("roundReady");
	};
	my.interrupt = function(){
		clearTimeout(my.game._rrt);
		clearTimeout(my.game.turnTimer);
		clearTimeout(my.game.hintTimer);
		clearTimeout(my.game.hintTimer2);
		clearTimeout(my.game.qTimer);
		clearTimeout(my.game.robotTimer);
		(my.game.robots || []).forEach(function(robot){ clearTimeout(robot._timer); });
	};
	my.roundEnd = function(data){
		if(!my.gaming || my.finishing) return;
		my.finishing = true;
		var game = my.game;
		var i, o, rw;
		var res = [];
		var users = {};
		var settledClients = {};
		var rl;
		var pv = -1;
		var suv = [];
		var teams = [ null, [], [], [], [], [] ];
		var sumScore = 0;
		var rankedChanges = null;
		var now = (new Date()).getTime();	
		
		my.interrupt();
		game.late = true;
		if(data && data.reason === "noWords"){
			my.gaming = false;
			my.finishing = false;
			my.players.forEach(function(id){ if(DIC[id]) DIC[id].ready = false; });
			my.byMaster('roundEnd', { result: [], users: {}, ranks: {}, data: data }, true);
			delete game.seq;
			my.export();
			return;
		}
		for(i in my.players){
			o = DIC[my.players[i]];
			if(!o) continue;
			if(o.cameWhenGaming){
				o.cameWhenGaming = false;
				if(o.form == "O"){
					o.sendError(428);
					o.leave();
					continue;
				}
				o.setForm("J");
			}
		}
		for(i in my.game.seq){
			o = DIC[my.game.seq[i]] || my.game.seq[i];
			if(!o) continue;
			if(o.robot){
				if(o.game.team) teams[o.game.team].push(o.game.score);
			}else if(o.team) teams[o.team].push(o.game.score);
		}
		for(i=1; i<6; i++) if(o = teams[i].length) teams[i] = [ o, teams[i].reduce(function(p, item){ return p + item; }, 0) ];
		for(i in my.game.seq){
			o = DIC[my.game.seq[i]];
			if(!o) continue;
			sumScore += o.game.score;
			res.push({ id: o.id, score: o.team ? teams[o.team][1] : o.game.score, dim: o.team ? teams[o.team][0] : 1 });
		}
		res.sort(function(a, b){
			if(game.forfeit){
				if(a.id === game.forfeit) return 1;
				if(b.id === game.forfeit) return -1;
			}
			return b.score - a.score;
		});
		rl = res.length;
		rankedChanges = buildRankedTrophyChanges(my, res);
		
		for(i in res){
			o = DIC[res[i].id];
			if(!game.forfeit && pv == res[i].score){
				res[i].rank = res[Number(i) - 1].rank;
			}else{
				res[i].rank = Number(i);
			}
			pv = res[i].score;
			rw = getRewards(my.mode, o.game.score / res[i].dim, o.game.bonus, res[i].rank, rl, sumScore);
			rw.playTime = now - o.playAt;
			o.applyEquipOptions(rw); // 착용 아이템 보너스 적용
			if(my.practice){
				rw.score = 0;
				rw.money = 0;
				rw.playTime = 0;
				rw.together = false;
				rw._score = 0;
				rw._money = 0;
				rw._blog = [];
			}
			if(!my.practice && rw.together){
				if(o.game.wpc) o.game.wpc.forEach(function(item){ o.obtain("$WPC" + item, 1); }); // 글자 조각 획득 처리
				o.onOKG(rw.playTime);
			}
			res[i].reward = rw;
			if(!my.practice){
				o.data.score += rw.score || 0;
				o.money += rw.money || 0;
				o.data.record[Const.GAME_TYPE[my.mode]][2] += rw.score || 0;
				o.data.record[Const.GAME_TYPE[my.mode]][3] += rw.playTime;
				if(rw.together){
					o.data.record[Const.GAME_TYPE[my.mode]][0]++;
					if(res[i].rank == 0) o.data.record[Const.GAME_TYPE[my.mode]][1]++;
				}
				if(rankedChanges && rankedChanges[o.id]){
					res[i].trophy = applyRankedTrophyChange(o, rankedChanges[o.id]);
				}
			}
			users[o.id] = o.getData();
			settledClients[o.id] = o;
			
			suv.push(o.flush(true));
		}
		my.gaming = false;
		Lizard.all(suv).then(function(uds){
			var o = {};
			
			suv = [];
			for(i in uds){
				o[uds[i].id] = { prev: uds[i].prev };
				suv.push(DB.redis.getSurround(uds[i].id));
			}
			Lizard.all(suv).then(function(ranks){
				var i, j;
				
				for(i in ranks){
					if(!o[ranks[i].target]) continue;
					
					o[ranks[i].target].list = ranks[i].data;
				}
				attachRankNames(o, function(){
					my.finishing = false;
					if(my.game !== game) return;
					Object.keys(settledClients).forEach(function(id){ users[id] = settledClients[id].getData(); });
					my.byMaster('roundEnd', { result: res, users: users, ranks: o, data: data }, true);
					my.export();
					delete my.game.seq;
					delete my.game.wordLength;
					delete my.game.dic;
				});
			});
		});
	};
	my.byMaster = function(type, data, nob){
		if(DIC[my.master]) DIC[my.master].publish(type, data, nob);
	};
	my.export = function(target, kickVote, spec){
		var obj = { room: my.getData() };
		var i, o;
		
		if(!my.rule) return;
		if(target) obj.target = target;
		if(kickVote) obj.kickVote = kickVote;
		if(spec && my.gaming){
			if(my.rule.rule == "Classic"){
				if(my.game.chain) obj.chain = my.game.chain.length;
			}else if(my.rule.rule == "Jaqwi"){
				obj.theme = my.game.theme;
				obj.conso = my.game.conso;
			}else if(my.rule.rule == "Crossword"){
				obj.prisoners = my.game.prisoners;
				obj.boards = my.game.boards;
				obj.means = my.game.means;
			}
			obj.spec = {};
			for(i in my.game.seq){
				if(o = DIC[my.game.seq[i]]) obj.spec[o.id] = o.game.score;
			}
		}
		if(my.practice){
			if(DIC[my.master || target]) DIC[my.master || target].send('room', obj);
		}else{
			exports.publish('room', obj, my.password);
		}
	};
	my.turnStart = function(force){
		if(!my.gaming) return;
		
		return my.route("turnStart", force);
	};
	my.readyRobot = function(robot){
		if(!my.gaming) return;
		
		return my.route("readyRobot", robot);
	};
	my.turnRobot = function(robot, text, data){
		if(!my.gaming || my.game.late || my.game.loading) return;
		if(my.rule.ewq && (!my.game.seq || my.game.seq[my.game.turn] !== robot)) return;
		
		my.submit(robot, text, data);
		//return my.route("turnRobot", robot, text);
	};
	my.turnNext = function(force){
		var next;
		if(!my.gaming) return;
		if(!my.game.seq) return;
		
		if(my.opts.randomturn && my.game.seq.length > 1){
			do{
				next = Math.floor(Math.random() * my.game.seq.length);
			}while(next == my.game.turn);
			my.game.turn = next;
		}else{
			my.game.turn = (my.game.turn + 1) % my.game.seq.length;
		}
		my.turnStart(force);
	};
	my.turnEnd = function(){
		return my.route("turnEnd");
	};
	my.submit = function(client, text, data){
		return my.route("submit", client, text, data);
	};
	my.getScore = function(text, delay, ignoreMission){
		return my.routeSync("getScore", text, delay, ignoreMission);
	};
	my.getTurnSpeed = function(rt){
		if(rt < 5000) return 10;
		else if(rt < 11000) return 9;
		else if(rt < 18000) return 8;
		else if(rt < 26000) return 7;
		else if(rt < 35000) return 6;
		else if(rt < 45000) return 5;
		else if(rt < 56000) return 4;
		else if(rt < 68000) return 3;
		else if(rt < 81000) return 2;
		else if(rt < 95000) return 1;
		else return 0;
	};
	my.getTitle = function(){
		return my.route("getTitle");
	};
	/*my.route = function(func, ...args){
		var cf;
		
		if(!(cf = my.checkRoute(func))) return;
		return Slave.run(my, func, args);
	};*/
	my.route = my.routeSync = function(func, ...args){
		var cf;
		
		if(!(cf = my.checkRoute(func))) return;
		return cf.apply(my, args);
	};
	my.checkRoute = function(func){
		var c;
		
		if(!my.rule) return JLog.warn("Unknown mode: " + my.mode), false;
		if(!(c = Rule[my.rule.rule])) return JLog.warn("Unknown rule: " + my.rule.rule), false;
		if(!c[func]) return JLog.warn("Unknown function: " + func), false;
		return c[func];
	};
	my.set(room);
};
function getFreeChannel(){
	var i, list = {};
	
	if(Cluster.isMaster){
		var mk = 1;
		
		for(i in CHAN){
			// if(CHAN[i].isDead()) continue;
			list[i] = 0;
		}
		for(i in ROOM){
			// if(!list.hasOwnProperty(i)) continue;
			mk = ROOM[i].channel;
			list[mk]++;
		}
		for(i in list){
			if(list[i] < list[mk]) mk = i;
		}
		return Number(mk);
	}else{
		return channel || 0;
	}
}
function getGuestName(sid){
	var i, len = sid.length, res = 0;
	
	for(i=0; i<len; i++){
		res += sid.charCodeAt(i) * (i+1);
	}
	return "GUEST" + (1000 + (res % 9000));
}
function shuffle(arr){
	var i, r = [];
	
	for(i in arr) r.push(arr[i]);
	r.sort(function(a, b){ return Math.random() - 0.5; });
	
	return r;
}
function getRewards(mode, score, bonus, rank, all, ss){
	var rw = { score: 0, money: 0 };
	var sr = score / ss;
	
	// all은 1~12
	// rank는 0~7
	switch(Const.GAME_TYPE[mode]){
		case "EKT":
			rw.score += score * 1.4;
			break;
		case "ESH":
		case "EBT":
			rw.score += score * 0.5;
			break;
		case "KKT":
			rw.score += score * 1.42;
			break;
		case "KSH":
			rw.score += score * 0.55;
			break;
		case "CSQ":
			rw.score += score * 0.4;
			break;
		case 'KCW':
			rw.score += score * 1.0;
			break;
		case 'KTY':
			rw.score += score * 0.3;
			break;
		case 'ETY':
			rw.score += score * 0.37;
			break;
		case 'KAP':
			rw.score += score * 0.8;
			break;
		case 'HUN':
			rw.score += score * 0.5;
			break;
		case 'KDA':
			rw.score += score * 0.57;
			break;
		case 'EDA':
			rw.score += score * 0.65;
			break;
		case 'KSS':
			rw.score += score * 0.5;
			break;
		case 'ESS':
			rw.score += score * 0.22;
			break;
		default:
			break;
	}
	rw.score = rw.score
		* (0.77 + 0.05 * (all - rank) * (all - rank)) // 순위
		* 1.25 / (1 + 1.25 * sr * sr) // 점차비(양학했을 수록 ↓)
	;
	rw.money = 1 + rw.score * 0.01;
	if(all < 2){
		rw.score = rw.score * 0.05;
		rw.money = rw.money * 0.05;
	}else{
		rw.together = true;
	}
	rw.score += bonus;
	rw.score = rw.score || 0;
	rw.money = rw.money || 0;
	
	// applyEquipOptions에서 반올림한다.
	return rw;
}
function filterRobot(item){
	if(!item) return {};
	return (item.robot && item.getData) ? item.getData() : item;
}
