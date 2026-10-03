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

/**
 * 볕뉘 수정사항:
 * Login 을 Passport 로 수행하기 위한 수정
 */

var GLOBAL	 = require("../sub/global.json");
if(typeof GLOBAL.SESSION_SECRET != "string" || !GLOBAL.SESSION_SECRET.trim()){
	throw new Error("Set a non-empty SESSION_SECRET in Server/lib/sub/global.json before starting the web server.");
}

var WS		 = require("ws");
var Express	 = require("express");
var Exession = require("express-session");
var Redission= require("connect-redis")(Exession);
var Redis	 = require("redis");
var Parser	 = require("body-parser");
var DDDoS	 = require("dddos");
var Server	 = Express();
var DB		 = require("./db");
//볕뉘 수정 구문삭제 (28)
var JLog	 = require("../sub/jjlog");
var WebInit	 = require("../sub/webinit");
var Secure = require('../sub/secure');
//볕뉘 수정
var passport = require('passport');
//볕뉘 수정 끝
var Const	 = require("../const");
var https	 = require('https');
var fs		 = require('fs');

var Language = {
	'ko_KR': require("./lang/ko_KR.json"),
	'en_US': require("./lang/en_US.json")
};
//볕뉘 수정
var ROUTES = [
	"major", "consume", "admin", "login"
];
//볕뉘 수정 끝
var page = WebInit.page;
var gameServers = [];

WebInit.MOBILE_AVAILABLE = [
	"portal", "main", "kkutu"
];

require("../sub/checkpub");

JLog.info("<< KKuTu Web >>");
Server.set('views', __dirname + "/views");
Server.set('view engine', "pug");
Server.use(Express.static(__dirname + "/public"));
Server.use(Parser.urlencoded({ extended: true }));
Server.use(Exession({
	/* use only for redis-installed

	store: new Redission({
		client: Redis.createClient(),
		ttl: 3600 * 12
	}),*/
	secret: GLOBAL.SESSION_SECRET,
	resave: false,
	saveUninitialized: true
}));
//볕뉘 수정
Server.use(passport.initialize());
Server.use(passport.session());
Server.use((req, res, next) => {
	if(req.session.passport) {
		delete req.session.passport;
	}
	next();
});
Server.use((req, res, next) => {
	if(Const.IS_SECURED) {
		if(req.protocol == 'http') {
			let url = 'https://'+req.get('host')+req.originalUrl;
			res.status(302).redirect(url);
		} else {
			next();
		}
	} else {
		next();
	}
});
//볕뉘 수정 끝
/* use this if you want

DDDoS = new DDDoS({
	maxWeight: 6,
	checkInterval: 10000,
	rules: [{
		regexp: "^/(cf|dict|gwalli)",
		maxWeight: 20,
		errorData: "429 Too Many Requests"
	}, {
		regexp: ".*",
		errorData: "429 Too Many Requests"
	}]
});
DDDoS.rules[0].logFunction = DDDoS.rules[1].logFunction = function(ip, path){
	JLog.warn(`DoS from IP ${ip} on ${path}`);
};
Server.use(DDDoS.express());*/

WebInit.init(Server, true);
DB.ready = function(){
	setInterval(function(){
		var q = [ 'createdAt', { $lte: Date.now() - 3600000 * 12 } ];

		DB.session.remove(q).on();
	}, 600000);
	setInterval(function(){
		gameServers.forEach(function(v){
			if(v.socket) v.socket.send(`{"type":"seek"}`);
			else v.seek = undefined;
		});
	}, 4000);
	JLog.success("DB is ready.");

	DB.kkutu_shop_desc.find().on(function($docs){
		var i, j;

		for(i in Language) flush(i);
		function flush(lang){
			var db;

			Language[lang].SHOP = db = {};
			for(j in $docs){
				db[$docs[j]._id] = [ $docs[j][`name_${lang}`], $docs[j][`desc_${lang}`] ];
			}
		}
	});
	Server.listen(80);
	if(Const.IS_SECURED) {
		const options = Secure();
		https.createServer(options, Server).listen(443);
	}
};
Const.MAIN_PORTS.forEach(function(v, i){
	var KEY = process.env['WS_KEY'];
	var protocol;
	if(Const.IS_SECURED) {
		protocol = 'wss';
	} else {
		protocol = 'ws';
	}
	gameServers[i] = new GameClient(KEY, `${protocol}://${GLOBAL.GAME_SERVER_HOST}:${v}/${KEY}`);
});
function GameClient(id, url){
	var my = this;

	my.id = id;
	my.socket = new WS(url, { perMessageDeflate: false, rejectUnauthorized: false});
	
	my.send = function(type, data){
		if(!data) data = {};
		data.type = type;

		my.socket.send(JSON.stringify(data));
	};
	my.socket.on('open', function(){
		JLog.info(`Game server #${my.id} connected`);
	});
	my.socket.on('error', function(err){
		JLog.warn(`Game server #${my.id} has an error: ${err.toString()}`);
	});
	my.socket.on('close', function(code){
		JLog.error(`Game server #${my.id} closed: ${code}`);
		my.socket.removeAllListeners();
		delete my.socket;
	});
	my.socket.on('message', function(data){
		var _data = data;
		var i;

		data = JSON.parse(data);

		switch(data.type){
			case "seek":
				my.seek = data.value;
				break;
			case "narrate-friend":
				for(i in data.list){
					gameServers[i].send('narrate-friend', { id: data.id, s: data.s, stat: data.stat, list: data.list[i] });
				}
				break;
			default:
		}
	});
}
ROUTES.forEach(function(v){
	require(`./routes/${v}`).run(Server, WebInit.page);
});
Server.get("/", function(req, res){
	var server = req.query.server;
	
	function coerceProfile(profile){
		if(!profile) return null;
		if(typeof profile == "string"){
			profile = profile.trim();
			if(!profile) return null;
			try{
				profile = JSON.parse(profile);
			}catch(e){
				return null;
			}
			if(typeof profile == "string"){
				profile = profile.trim();
				if(!profile) return null;
				try{
					profile = JSON.parse(profile);
				}catch(e){
					return null;
				}
			}
		}
		if(!(profile && typeof profile == "object")) return null;
		normalizeProfileImage(profile);
		return profile;
	}
	function normalizeProfileImage(profile){
		var img;
		if(!profile || typeof profile != "object") return;
		img = profile.image;
		if(!img && profile.picture) img = profile.picture;
		if(!img && profile.photo) img = profile.photo;
		if(img && typeof img == "object"){
			img = img.url || img.value || img.image || "";
		}
		if(typeof img != "string"){
			delete profile.image;
			return;
		}
		img = img.trim();
		if(!img || img == "[object Object]" || img == "undefined" || img == "null"){
			delete profile.image;
			return;
		}
		if(img.indexOf("//") === 0) img = "https:" + img;
		if(/^http:\/\//i.test(img)) img = "https://" + img.slice(7);
		if(!/^https?:\/\//i.test(img) && img[0] !== "/" && !/^data:image\//i.test(img)){
			delete profile.image;
			return;
		}
		profile.image = img;
	}
	function getSavedNickname(user){
		if(!user || !user.kkutu) return "";
		var kkutu = user.kkutu;
		if(typeof kkutu == "string"){
			try{
				kkutu = JSON.parse(kkutu);
			}catch(e){
				return "";
			}
		}
		if(!kkutu || typeof kkutu != "object") return "";
		var name = kkutu.name || kkutu.title || "";
		if(typeof name != "string") return "";
		name = name.trim();
		return name ? name : "";
	}

	function maybeSyncNickname(profile, sid, done){
		if(!profile || !profile.id) return done(profile);
		DB.users.findOne([ '_id', profile.id ]).limit([ 'kkutu', true ]).on(function($user){
			var savedName = getSavedNickname($user);
			if(savedName && savedName !== profile.title){
				profile.title = savedName;
				DB.session.update([ '_id', sid ]).set([ 'profile.title', savedName ]).on();
			}
			done(profile);
		});
	}
	function isMissingProfileValue(value){
		if(value === null || value === undefined) return true;
		if(typeof value == "string") return value.trim() === "";
		return false;
	}
	function mergeProfileFields(target, source){
		if(!target || !source) return false;
		var changed = false;

		Object.keys(source).forEach(function(key){
			if(isMissingProfileValue(target[key]) && !isMissingProfileValue(source[key])){
				target[key] = source[key];
				changed = true;
			}
		});
		return changed;
	}

	
	//볕뉘 수정 구문삭제(220~229, 240)
	DB.session.findOne([ '_id', req.session.id ]).on(function($ses){
		var sessionProfile = coerceProfile(req.session.profile);
		var dbProfile = $ses ? coerceProfile($ses.profile) : null;
		var sid = $ses ? $ses._id : req.session.id;
		var profile = null;
		var shouldSaveProfile = false;

		if(dbProfile && dbProfile.id){
			profile = dbProfile;
			if(sessionProfile && sessionProfile.id){
				if(sessionProfile.id !== dbProfile.id){
					profile = sessionProfile;
					shouldSaveProfile = true;
				}else if(mergeProfileFields(profile, sessionProfile)){
					shouldSaveProfile = true;
				}
			}
		}else if(sessionProfile && sessionProfile.id){
			profile = sessionProfile;
			shouldSaveProfile = true;
		}

		if(profile){
			if(!profile.sid || profile.sid !== sid){
				profile.sid = sid;
				shouldSaveProfile = true;
			}
			if(!global.isPublic) profile.sid = sid;
			if(shouldSaveProfile){
				DB.session.upsert([ '_id', sid ]).set([ 'profile', profile ], [ 'createdAt', Date.now() ]).on();
			}
		}

		if(!profile) return onFinish(null);
		maybeSyncNickname(profile, sid || req.session.id, function(profile){
			onFinish({ _id: (sid || req.session.id), profile: profile });
		});
	});
	function onFinish($doc){
		var id = req.session.id;

		if($doc){
			req.session.profile = $doc.profile;
			id = req.session.id;
		}else{
			delete req.session.profile;
		}
		page(req, res, Const.MAIN_PORTS[server] ? "kkutu" : "portal", {
			'_page': "kkutu",
			'_id': id,
			'PORT': Const.MAIN_PORTS[server],
			'HOST': req.hostname,
			'PROTOCOL': Const.IS_SECURED ? 'wss' : 'ws',
			'TEST': req.query.test,
			'MOREMI_PART': Const.MOREMI_PART,
			'AVAIL_EQUIP': Const.AVAIL_EQUIP,
			'CATEGORIES': Const.CATEGORIES,
			'GROUPS': Const.GROUPS,
			'MODE': Const.GAME_TYPE,
			'RULE': Const.RULE,
			'OPTIONS': Const.OPTIONS,
			'KO_INJEONG': Const.KO_INJEONG,
			'EN_INJEONG': Const.EN_INJEONG,
			'KO_THEME': Const.KO_THEME,
			'EN_THEME': Const.EN_THEME,
			'IJP_EXCEPT': Const.IJP_EXCEPT,
			'ogImage': "http://kkutu.kr/img/kkutu/logo.png",
			'ogURL': "http://kkutu.kr/",
			'ogTitle': "글자로 놀자! 끄투 온라인",
			'ogDescription': "끝말잇기가 이렇게 박진감 넘치는 게임이었다니!"
		});
	}
});

Server.get("/servers", function(req, res){
	var list = [];

	gameServers.forEach(function(v, i){
		list[i] = v.seek;
	});
	res.send({ list: list, max: Const.KKUTU_MAX });
});

//볕뉘 수정 구문 삭제(274~353)

Server.get("/legal/:page", function(req, res){
	page(req, res, "legal/"+req.params.page);
});
