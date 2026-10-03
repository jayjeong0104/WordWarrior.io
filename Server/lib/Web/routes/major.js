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

var File	 = require("fs");
var Web		 = require("request");
var Https	 = require("https");
var MainDB	 = require("../db");
var JLog	 = require("../../sub/jjlog");
var Const	 = require("../../const");
var Path	 = require("path");
var Inventory = require("../../sub/inventory");

var PROFILE_IMAGE_CACHE_TTL = 1000 * 60 * 30;
var PROFILE_IMAGE_CACHE = new Map();
var PROFILE_IMAGE_FALLBACK = Path.resolve(__dirname, "../public/img/kkutu/moremi/body_fla.png");
var DICT_REQUESTS_PATH = Path.resolve(__dirname, "../../data/dict_requests.json");
var VOCAB_MAX_LISTS = 5;
var VOCAB_MAX_WORDS = 50;
var VOCAB_TABLE_READY = false;
var VOCAB_TABLE_PENDING = [];

function normalizeDictionaryRequestWord(word, lang){
	word = normalizeDictionaryLookupWord(word, lang);
	return lang == "en" ? word.toLowerCase() : word;
}
function sameDictionaryRequest(item, word, lang){
	return !!item && item.lang == lang && normalizeDictionaryRequestWord(item.word, lang) == normalizeDictionaryRequestWord(word, lang);
}
function readDictionaryRequests(callback){
	File.readFile(DICT_REQUESTS_PATH, "utf8", function(err, raw){
		var list = [];

		if(err){
			if(err.code != "ENOENT") JLog.warn(`Failed to read dictionary requests: ${err.message}`);
			return callback(list);
		}
		try{
			list = JSON.parse(raw);
			if(!Array.isArray(list)) list = [];
		}catch(parseErr){
			JLog.warn(`Failed to parse dictionary requests: ${parseErr.message}`);
			list = [];
		}
		callback(list);
	});
}
function writeDictionaryRequests(list, callback){
	File.writeFile(DICT_REQUESTS_PATH, JSON.stringify(Array.isArray(list) ? list : [], null, 2), callback || function(){});
}
function safeJson(value){
	return JSON.stringify(value || []);
}
function normalizeVocabLang(word, lang){
	if(lang == "ko" || lang == "en") return lang;
	return String(word || "").match(/[\uac00-\ud7a3]/) ? "ko" : "en";
}
function normalizeVocabWord(word, lang){
	word = normalizeDictionaryLookupWord(word, lang);
	return lang == "en" ? word.toLowerCase() : word;
}
function normalizeDictionaryLookupWord(word, lang){
	word = String(word || "")
		.replace(/[\u2018\u2019\u201B\u02BC\uFF07`´]/g, "'")
		.replace(/[‘’`´]/g, "'")
		.replace(/[^\sa-zA-Z0-9'.\uac00-\ud7a3]/g, "")
		.replace(/\s+/g, " ")
		.trim();
	return lang == "en" ? word.toLowerCase() : word;
}
function getDictionaryLookupFallbacks(word, lang){
	if(lang != "en") return [];
	if(word == "dva" || word == "d va") return [ "d.va" ];
	return [];
}
function normalizeVocabName(name){
	name = String(name || "").replace(/\s+/g, " ").trim().slice(0, 32);
	return name || "Vocabulary";
}
function createVocabListId(){
	return "vl_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function normalizeVocabLists(lists){
	if(Buffer.isBuffer(lists)) lists = lists.toString("utf8");
	if(typeof lists == "string"){
		try{
			lists = JSON.parse(lists);
		}catch(e){
			lists = [];
		}
	}
	if(!Array.isArray(lists)) lists = [];
	return lists.slice(0, VOCAB_MAX_LISTS).map(function(list, index){
		var words = Array.isArray(list && list.words) ? list.words : [];

		return {
			id: String((list && list.id) || createVocabListId()),
			name: normalizeVocabName((list && list.name) || ("Vocabulary " + (index + 1))),
			createdAt: Number(list && list.createdAt) || Date.now(),
			words: words.slice(0, VOCAB_MAX_WORDS).map(function(item){
				var lang = normalizeVocabLang(item && item.word, item && item.lang);
				var word = normalizeVocabWord(item && item.word, lang);

				if(!word) return null;
				return {
					word: word,
					lang: lang,
					mean: String((item && item.mean) || ""),
					theme: String((item && item.theme) || ""),
					type: String((item && item.type) || ""),
					addedAt: Number(item && item.addedAt) || Date.now()
				};
			}).filter(Boolean)
		};
	});
}
function findVocabList(lists, id){
	var i;

	for(i=0; i<lists.length; i++){
		if(lists[i].id == id) return lists[i];
	}
	return null;
}
function ensureVocabTable(callback){
	if(VOCAB_TABLE_READY) return callback();
	VOCAB_TABLE_PENDING.push(callback);
	if(VOCAB_TABLE_PENDING.length > 1) return;
	MainDB.users.direct(
		"CREATE TABLE IF NOT EXISTS kkutu_vocab ("
			+ "_id TEXT PRIMARY KEY, "
			+ "lists JSONB NOT NULL DEFAULT '[]'::jsonb, "
			+ "\"updatedAt\" BIGINT NOT NULL DEFAULT 0"
		+ ")",
		function(err){
			var pending = VOCAB_TABLE_PENDING.splice(0);

			if(err){
				JLog.warn(`Failed to ensure kkutu_vocab table: ${err.message}`);
			}else{
				VOCAB_TABLE_READY = true;
			}
			pending.forEach(function(done){
				done(err);
			});
		}
	);
}
function loadUserVocab(uid, callback){
	ensureVocabTable(function(err){
		if(err) return callback(err);
		MainDB.users.direct(
			"SELECT lists FROM kkutu_vocab WHERE _id='" + escapeSqlString(uid) + "' LIMIT 1",
			function(selectErr, result){
				if(selectErr) return callback(selectErr);
				callback(null, normalizeVocabLists(result && result.rows && result.rows[0] ? result.rows[0].lists : []));
			}
		);
	});
}
function saveUserVocab(uid, lists, callback){
	var json = escapeSqlString(safeJson(normalizeVocabLists(lists)));

	ensureVocabTable(function(err){
		if(err) return callback(err);
		MainDB.users.direct(
			"INSERT INTO kkutu_vocab (_id, lists, \"updatedAt\") VALUES ('"
				+ escapeSqlString(uid) + "', '" + json + "'::jsonb, " + Date.now() + ") "
				+ "ON CONFLICT (_id) DO UPDATE SET lists=EXCLUDED.lists, \"updatedAt\"=EXCLUDED.\"updatedAt\"",
			callback
		);
	});
}
function sendVocabError(res, code, message){
	res.send({ error: code, message: message });
}
function sendVocabLists(res, lists){
	res.send({
		lists: normalizeVocabLists(lists),
		limits: {
			lists: VOCAB_MAX_LISTS,
			words: VOCAB_MAX_WORDS
		}
	});
}
function buildVocabWordEntry($word, lang){
	return {
		word: $word._id,
		lang: lang,
		mean: String($word.mean || ""),
		theme: String($word.theme || ""),
		type: String($word.type || ""),
		addedAt: Date.now()
	};
}

function obtain($user, key, value, term, addValue){
	Inventory.obtain($user.box, key, value, term, addValue);
}
function consume($user, key, value, force){
	return Inventory.consume($user.box, key, value, force);
}
function parseJsonText(value){
	if(!value) return value;
	if(Buffer.isBuffer(value)) value = value.toString("utf8");
	if(typeof value != "string") return value;
	var trimmed = value.trim();
	if(!trimmed) return "";
	try{
		value = JSON.parse(trimmed);
	}catch(e){
		return value;
	}
	if(typeof value == "string"){
		var nested = value.trim();
		if(nested && nested !== trimmed){
			try{
				value = JSON.parse(nested);
			}catch(e){
				return value;
			}
		}
	}
	return value;
}
function isBlankName(value){
	if(typeof value != "string") return true;
	if(!value) return true;
	return value.replace(/[\s\u200B-\u200D\uFEFF]/g, "") === "";
}
function extractNameFromText(text){
	if(!text || typeof text != "string") return "";
	var match = text.match(/"name"\s*:\s*"([^"]+)"/i) || text.match(/"title"\s*:\s*"([^"]+)"/i);
	if(!match){
		match = text.match(/\\"name\\"\\s*:\\s*\\"([^\\"]+)\\"/i) || text.match(/\\"title\\"\\s*:\\s*\\"([^\\"]+)\\"/i);
	}
	return match ? match[1].trim() : "";
}
function extractNameOnlyFromText(text){
	if(!text || typeof text != "string") return "";
	var match = text.match(/"name"\s*:\s*"([^"]+)"/i);
	if(!match){
		match = text.match(/\\"name\\"\\s*:\\s*\\"([^\\"]+)\\"/i);
	}
	return match ? match[1].trim() : "";
}
function extractUsernameFromText(text){
	if(!text || typeof text != "string") return "";
	var match = text.match(/"username"\s*:\s*"([^"]+)"/i);
	if(!match){
		match = text.match(/\\"username\\"\\s*:\\s*\\"([^\\"]+)\\"/i);
	}
	return match ? match[1].trim() : "";
}
function extractIdFromText(text){
	if(!text || typeof text != "string") return "";
	var match = text.match(/"id"\s*:\s*"([^"]+)"/i);
	if(!match){
		match = text.match(/\\"id\\"\\s*:\\s*\\"([^\\"]+)\\"/i);
	}
	return match ? match[1].trim() : "";
}
function getNameFromObject(obj){
	if(!obj || typeof obj != "object") return "";
	var name = obj.title || obj.name || "";
	if(typeof name == "string" && !isBlankName(name)) return name.trim();
	if(obj.profile){
		var nested = obj.profile;
		if(typeof nested != "object") nested = parseJsonText(nested);
		if(nested && typeof nested == "object"){
			name = nested.title || nested.name || "";
			if(typeof name == "string" && !isBlankName(name)) return name.trim();
		}
	}
	return "";
}
function getUsernameFromObject(obj){
	if(!obj || typeof obj != "object") return "";
	var username = obj.username || obj.userName || obj.name || "";
	if(typeof username == "string" && !isBlankName(username)) return username.trim();
	if(obj.profile){
		var nested = obj.profile;
		if(typeof nested != "object") nested = parseJsonText(nested);
		if(nested && typeof nested == "object"){
			username = nested.username || nested.userName || nested.name || "";
			if(typeof username == "string" && !isBlankName(username)) return username.trim();
		}
	}
	return "";
}
function getKkutuUsernameFromObject(obj){
	if(!obj || typeof obj != "object") return "";
	var username = obj.username || obj.userName || "";
	if(typeof username == "string" && !isBlankName(username)) return username.trim();
	return "";
}
function getGoogleProfileFallback(profile){
	var authType = "";
	var pid = "";
	var nested;
	if(!profile || typeof profile != "object") return "";
	authType = String(profile.authType || profile.type || "").toLowerCase();
	if(authType != "google" && profile.profile){
		nested = profile.profile;
		if(typeof nested != "object") nested = parseJsonText(nested);
		if(nested && typeof nested == "object"){
			authType = String(nested.authType || nested.type || "").toLowerCase();
			if(!profile.id && nested.id) profile.id = nested.id;
			if(!profile._id && nested._id) profile._id = nested._id;
		}
	}
	if(authType != "google"){
		pid = String(profile.id || profile._id || "").trim();
		if(!/^\d{16,}$/.test(pid)) return "";
	}
	pid = String(profile.id || profile._id || "").trim();
	if(!pid || /^https?:\/\//i.test(pid) || pid.indexOf("/") != -1) return "";
	return "https://profiles.google.com/s2/photos/profile/" + encodeURIComponent(pid) + "?sz=256";
}
function normalizeProfileImage(profile){
	var originalString = "";
	if(!profile) return "";
	if(typeof profile == "string"){
		originalString = profile;
	}
	profile = parseJsonText(profile);
	if(typeof profile == "string"){
		profile = { image: profile || originalString };
	}
	if(profile.profile){
		var nested = profile.profile;
		if(typeof nested != "object") nested = parseJsonText(nested);
		if(nested && typeof nested == "object") profile = nested;
	}
	var image = profile.image || profile.picture || profile.photo || "";
	if(image && typeof image == "object"){
		image = image.url || image.value || image.image || "";
	}
	if(typeof image != "string") return "";
	image = image.trim();
	if(!image || image == "[object Object]" || image == "undefined" || image == "null"){
		image = getGoogleProfileFallback(profile);
		if(!image) return "";
	}
	if(image.indexOf("//") === 0) image = "https:" + image;
	if(/^http:\/\//i.test(image)) image = "https://" + image.slice(7);
	if(!/^https?:\/\//i.test(image) && image[0] !== "/" && !/^data:image\//i.test(image)) return "";
	return image;
}
function isGoogleProfileImageHost(host){
	host = (host || "").toLowerCase();
	return /(^|\.)googleusercontent\.com$/.test(host)
		|| /(^|\.)ggpht\.com$/.test(host)
		|| /(^|\.)googleapis\.com$/.test(host)
		|| /(^|\.)google\.com$/.test(host)
		|| /(^|\.)gstatic\.com$/.test(host);
}
function isGoogleProfileImageUrl(url){
	if(typeof url != "string") return false;
	if(!/^https?:\/\//i.test(url)) return false;
	try{
		return isGoogleProfileImageHost((new URL(url)).hostname);
	}catch(e){
		return false;
	}
}
function proxifyProfileImage(url){
	var image = normalizeProfileImage(url);
	if(!image) return "";
	if(isGoogleProfileImageUrl(image)){
		return "/profile-image?u=" + encodeURIComponent(image);
	}
	return image;
}
function getCachedProfileImage(url){
	var cached = PROFILE_IMAGE_CACHE.get(url);
	if(!cached) return null;
	if((Date.now() - cached.time) > PROFILE_IMAGE_CACHE_TTL){
		PROFILE_IMAGE_CACHE.delete(url);
		return null;
	}
	return cached;
}
function putCachedProfileImage(url, contentType, body){
	if(!Buffer.isBuffer(body)) return;
	PROFILE_IMAGE_CACHE.set(url, {
		time: Date.now(),
		contentType: contentType || "image/png",
		body: body
	});
}
function sendFallbackProfileImage(res){
	res.set("Cache-Control", "no-store, max-age=0");
	return res.sendFile(PROFILE_IMAGE_FALLBACK);
}
function sendCachedProfileImage(res, cached, maxAge){
	res.set("Cache-Control", "public, max-age=" + String(maxAge || 3600));
	res.set("Content-Type", cached.contentType || "image/png");
	return res.send(cached.body);
}
function fetchProfileImageByHttps(url, redirectLeft, callback){
	var req = Https.request(url, {
		method: "GET",
		timeout: 12000,
		headers: {
			"User-Agent": "Mozilla/5.0 (KKuTu Profile Image Proxy)",
			"Accept": "image/*,*/*;q=0.8",
			"Accept-Encoding": "identity",
			"Connection": "close"
		}
	}, function(resp){
		var status = resp && resp.statusCode ? resp.statusCode : 0;
		var contentType = resp && resp.headers ? String(resp.headers["content-type"] || "") : "";
		var loc = resp && resp.headers ? String(resp.headers.location || "") : "";
		var chunks = [];

		if(status >= 300 && status < 400 && loc && redirectLeft > 0){
			resp.resume();
			try{
				return fetchProfileImageByHttps((new URL(loc, url)).toString(), redirectLeft - 1, callback);
			}catch(e){
				return callback(e || new Error("Bad redirect URL"));
			}
		}
		if(status < 200 || status >= 300){
			resp.resume();
			return callback(new Error("Bad status: " + status));
		}
		resp.on("data", function(chunk){ chunks.push(chunk); });
		resp.on("end", function(){
			var body = Buffer.concat(chunks);
			if(!body.length || contentType.indexOf("image/") !== 0){
				return callback(new Error("Invalid image payload"));
			}
			return callback(null, {
				contentType: contentType,
				body: body
			});
		});
		resp.on("error", callback);
	});
	req.on("timeout", function(){
		req.destroy(new Error("HTTPS image request timeout"));
	});
	req.on("error", callback);
	req.end();
}
function fetchProfileImage(url, callback){
	Web.get({
		url: url,
		encoding: null,
		gzip: true,
		timeout: 12000,
		followRedirect: true,
		maxRedirects: 8,
		headers: {
			"User-Agent": "Mozilla/5.0 (KKuTu Profile Image Proxy)",
			"Accept": "image/*,*/*;q=0.8",
			"Accept-Encoding": "identity",
			"Connection": "close"
		}
	}, function(err, _res, body){
		var contentType = _res && _res.headers ? String(_res.headers["content-type"] || "") : "";
		var ok = !err && _res && _res.statusCode >= 200 && _res.statusCode < 400 && Buffer.isBuffer(body) && body.length && contentType.indexOf("image/") === 0;

		if(ok){
			return callback(null, {
				contentType: contentType,
				body: body
			});
		}
		return fetchProfileImageByHttps(url, 5, callback);
	});
}
function normalizeProfileName(profile){
	if(!profile) return "";
	profile = parseJsonText(profile);
	if(typeof profile == "string"){
		var extracted = extractNameFromText(profile);
		return extracted ? extracted : "";
	}
	return getNameFromObject(profile);
}
function normalizeProfileUsername(profile){
	if(!profile) return "";
	profile = parseJsonText(profile);
	if(typeof profile == "string"){
		var extracted = extractUsernameFromText(profile);
		if(extracted) return extracted;
		var nameOnly = extractNameOnlyFromText(profile);
		if(nameOnly) return nameOnly;
		return profile.trim();
	}
	return getUsernameFromObject(profile);
}
function normalizeProfileId(profile){
	if(!profile) return "";
	profile = parseJsonText(profile);
	if(typeof profile == "string"){
		return extractIdFromText(profile);
	}
	if(profile.profile){
		var nested = profile.profile;
		if(typeof nested != "object") nested = parseJsonText(nested);
		if(nested && typeof nested == "object") profile = nested;
	}
	var id = profile.id;
	if(typeof id == "string"){
		id = id.trim();
	}else if(typeof id == "number"){
		id = String(id);
	}else{
		return "";
	}
	return id ? id : "";
}
function normalizeKkutuName(kkutu){
	if(!kkutu) return "";
	kkutu = parseJsonText(kkutu);
	if(typeof kkutu == "string"){
		var extracted = extractNameFromText(kkutu);
		if(extracted) return extracted;
		var trimmed = kkutu.trim();
		return isBlankName(trimmed) ? "" : trimmed;
	}
	return getNameFromObject(kkutu) || "";
}
function normalizeKkutuUsername(kkutu){
	if(!kkutu) return "";
	kkutu = parseJsonText(kkutu);
	if(typeof kkutu == "string"){
		var extracted = extractUsernameFromText(kkutu);
		if(extracted) return extracted;
		var nameOnly = extractNameOnlyFromText(kkutu);
		if(nameOnly) return nameOnly;
		var trimmed = kkutu.trim();
		return isBlankName(trimmed) ? "" : trimmed;
	}
	return getKkutuUsernameFromObject(kkutu) || "";
}
function normalizeObjectValue(value){
	var parsed = parseJsonText(value);
	if(parsed && typeof parsed == "object") return parsed;
	return {};
}
function normalizeUsernameField(value){
	if(typeof value != "string") return "";
	var trimmed = value.trim();
	return isBlankName(trimmed) ? "" : trimmed;
}
function isLikelyId(name, id){
	if(!name) return true;
	if(typeof name != "string") return false;
	if(/^[a-f0-9]{24}$/i.test(name)) return true;
	if(/^[a-f0-9]{32}$/i.test(name)) return true;
	return false;
}
function escapeLike(value){
	return String(value)
		.replace(/\\/g, "\\\\")
		.replace(/%/g, "\\%")
		.replace(/_/g, "\\_")
		.replace(/'/g, "''");
}
function escapeSqlString(value){
	return String(value).replace(/'/g, "''");
}
function loadUserNamesFromDb(ids, done){
	if(!ids || !ids.length) return done([]);
	MainDB.users.find([ '_id', { '$in': ids } ]).limit([ 'kkutu', true ]).on(function(rows){
		if(!rows || !rows.length) return done([]);
		done(rows.map(function(row){
			var name = normalizeKkutuName(row.kkutu);
			var username = normalizeKkutuUsername(row.kkutu);
			if(!name){
				if(typeof row.kkutu == "string"){
					name = extractNameFromText(row.kkutu);
				}else if(row.kkutu && typeof row.kkutu == "object"){
					try{
						name = extractNameFromText(JSON.stringify(row.kkutu));
					}catch(e){
						name = "";
					}
				}
			}
			return { _id: row._id, name: name, username: username };
		}));
	});
}
function loadSessionNames(ids, done){
	if(!ids || !ids.length) return done({});
	MainDB.session.find().limit([ 'profile', true ]).on(function(rows){
		if(!rows || !rows.length) return done({});
		var nameById = {};

		rows.forEach(function(row){
			var id = normalizeProfileId(row.profile);
			var name = normalizeProfileName(row.profile);

			if(id && name && !isLikelyId(name, id)){
				nameById[id] = name;
			}
		});

		if(!ids || !ids.length) return done(nameById);
		var filtered = {};
		ids.forEach(function(id){
			if(nameById[id]) filtered[id] = nameById[id];
		});
		done(filtered);
	});
}
function loadSessionUsernames(ids, done){
	if(!ids || !ids.length) return done({});
	MainDB.session.find().limit([ 'profile', true ]).on(function(rows){
		if(!rows || !rows.length) return done({});
		var usernameById = {};

		rows.forEach(function(row){
			var id = normalizeProfileId(row.profile);
			var username = normalizeProfileUsername(row.profile);

			if(id && username && !isLikelyId(username, id)){
				usernameById[id] = username;
			}
		});

		if(!ids || !ids.length) return done(usernameById);
		var filtered = {};
		ids.forEach(function(id){
			if(usernameById[id]) filtered[id] = usernameById[id];
		});
		done(filtered);
	});
}
function findSessionName(id, done){
	var safeId = escapeSqlString(id);
	var sql = "SELECT profile FROM session WHERE profile->>'id' = '" + safeId + "' LIMIT 1";

	MainDB.session.direct(sql, function(err, res){
		if(!err && res && res.rows && res.rows.length){
			var name = normalizeProfileName(res.rows[0].profile);
			if(name) return done(name);
		}

		var likeId = escapeLike(id);
		var likeRaw = '%"id":"' + likeId + '"%';
		var likeEscaped = '%\\\\\"id\\\\\":\\\\\"' + likeId + '\\\\\"%';
		var fallbackSql = "SELECT profile FROM session WHERE profile::text LIKE '" + likeRaw
			+ "' ESCAPE '\\\\' OR profile::text LIKE '" + likeEscaped + "' ESCAPE '\\\\' LIMIT 1";

		MainDB.session.direct(fallbackSql, function(fallbackErr, fallbackRes){
			if(fallbackErr || !fallbackRes || !fallbackRes.rows || !fallbackRes.rows.length) return done("");
			done(normalizeProfileName(fallbackRes.rows[0].profile));
		});
	});
}
function findSessionUsername(id, done){
	var safeId = escapeSqlString(id);
	var sql = "SELECT profile FROM session WHERE profile->>'id' = '" + safeId + "' LIMIT 1";

	MainDB.session.direct(sql, function(err, res){
		if(!err && res && res.rows && res.rows.length){
			var username = normalizeProfileUsername(res.rows[0].profile);
			if(username) return done(username);
		}

		var likeId = escapeLike(id);
		var likeRaw = '%"id":"' + likeId + '"%';
		var likeEscaped = '%\\\\\"id\\\\\":\\\\\"' + likeId + '\\\\\"%';
		var fallbackSql = "SELECT profile FROM session WHERE profile::text LIKE '" + likeRaw
			+ "' ESCAPE '\\\\' OR profile::text LIKE '" + likeEscaped + "' ESCAPE '\\\\' LIMIT 1";

		MainDB.session.direct(fallbackSql, function(fallbackErr, fallbackRes){
			if(fallbackErr || !fallbackRes || !fallbackRes.rows || !fallbackRes.rows.length) return done("");
			done(normalizeProfileUsername(fallbackRes.rows[0].profile));
		});
	});
}
function attachLeaderboardNames(payload, res){
	if(!payload || !payload.data || !payload.data.length) return res.send(payload || {});
	var ids = payload.data.map(function(item){ return item.id; }).filter(Boolean);
	if(!ids.length) return res.send(payload);

	loadUserNamesFromDb(ids, function(rows){
		var nameById = {};
		var usernameById = {};
		var missing;

		rows.forEach(function(row){
			var name = (row.name || "").toString().trim();
			var username = normalizeUsernameField(row.username);

			if(!isBlankName(name) && !isLikelyId(name, row._id)){
				nameById[row._id] = name;
			}
			if(!isBlankName(username) && !isLikelyId(username, row._id)){
				usernameById[row._id] = username;
			}
		});

		missing = ids.filter(function(id){
			return !nameById[id];
		});

		loadSessionNames(missing, function(sessionNames){
			Object.keys(sessionNames || {}).forEach(function(id){
				if(sessionNames[id]) nameById[id] = sessionNames[id];
			});

			missing = ids.filter(function(id){
				return !nameById[id];
			});

			if(missing.length){
				var pending = missing.length;
				missing.forEach(function(id){
					findSessionName(id, function(sessionName){
						if(sessionName && !isLikelyId(sessionName, id)){
							nameById[id] = sessionName;
							MainDB.users.upsert([ '_id', id ]).set([ 'kkutu.name', sessionName ]).on();
						}
						if(--pending === 0){
							resolveUsernames();
						}
					});
				});
			}else{
				resolveUsernames();
			}
		});

		function resolveUsernames(){
			var missingUsernames = ids.filter(function(id){
				return !usernameById[id];
			});

			loadSessionUsernames(missingUsernames, function(sessionUsernames){
				Object.keys(sessionUsernames || {}).forEach(function(id){
					if(sessionUsernames[id]) usernameById[id] = sessionUsernames[id];
				});

				missingUsernames = ids.filter(function(id){
					return !usernameById[id];
				});

				if(missingUsernames.length){
					var pendingUsernames = missingUsernames.length;
					missingUsernames.forEach(function(id){
					findSessionUsername(id, function(sessionUsername){
						if(sessionUsername && !isLikelyId(sessionUsername, id)){
							usernameById[id] = sessionUsername;
							MainDB.users.upsert([ '_id', id ]).set([ 'kkutu.username', sessionUsername ]).on();
						}
						if(--pendingUsernames === 0){
							applyNames();
							res.send(payload);
							}
						});
					});
				}else{
					applyNames();
					res.send(payload);
				}
			});
		}

		function applyNames(){
			payload.data.forEach(function(item){
				if(nameById[item.id]){
					item.name = nameById[item.id];
				}else if(usernameById[item.id]){
					item.name = usernameById[item.id];
				}else if(!isLikelyId(item.id)){
					item.name = item.id;
				}
				if(usernameById[item.id]){
					item.username = usernameById[item.id];
				}
			});
		}
	});
}
function scoreFriendSearchName(name, query){
	var normalizedName = normalizeUsernameField(name).toLowerCase();
	var normalizedQuery = normalizeUsernameField(query).toLowerCase();

	if(!normalizedName) return 99;
	if(normalizedName == normalizedQuery) return 0;
	if(normalizedName.indexOf(normalizedQuery) === 0) return 1;
	if(normalizedName.indexOf(" " + normalizedQuery) >= 0) return 2;
	if(normalizedName.indexOf(normalizedQuery) >= 0) return 3;
	return 4;
}
function friendSearchTextMatches(value, query){
	var normalizedValue = normalizeUsernameField(value).toLowerCase();
	var normalizedQuery = normalizeUsernameField(query).toLowerCase();

	return !!normalizedQuery && normalizedValue.indexOf(normalizedQuery) !== -1;
}
function addFriendSearchResult(map, rawId, rawName, online, rawUsername){
	var id = (rawId || "").toString().trim();
	var name = normalizeUsernameField(rawName || "");
	var username = normalizeUsernameField(rawUsername || "");
	var current;

	if(!id) return;
	current = map[id];
	if(!current){
		map[id] = {
			id: id,
			name: name || id,
			username: username,
			online: !!online
		};
		return;
	}
	if(online) current.online = true;
	if(name && (!current.name || current.name == current.id || !current.online)){
		current.name = name;
	}
	if(username && !current.username){
		current.username = username;
	}
}
function buildFriendSearchResults(uid, keyword, sessionRows, userRows){
	var map = {};

	sessionRows = sessionRows || [];
	userRows = userRows || [];
	sessionRows.forEach(function(row){
		var id = normalizeProfileId(row.profile);
		var name = normalizeProfileName(row.profile);
		var username = normalizeProfileUsername(row.profile);

		if(!id || id == uid) return;
		if(!friendSearchTextMatches(name, keyword) && !friendSearchTextMatches(username, keyword) && !friendSearchTextMatches(id, keyword)) return;
		addFriendSearchResult(map, id, name || username, true, username);
	});
	userRows.forEach(function(row){
		var id = row.id || row._id;
		var name = normalizeKkutuName(row.kkutu);
		var username = normalizeKkutuUsername(row.kkutu);

		if(!id || id == uid) return;
		if(!friendSearchTextMatches(name, keyword) && !friendSearchTextMatches(username, keyword) && !friendSearchTextMatches(id, keyword)) return;
		addFriendSearchResult(map, id, name || username, false, username);
	});
	return Object.keys(map).map(function(id){
		return map[id];
	}).sort(function(a, b){
		var scoreDiff = scoreFriendSearchName(a.name, keyword) - scoreFriendSearchName(b.name, keyword);
		if(scoreDiff) return scoreDiff;
		if(a.online != b.online) return a.online ? -1 : 1;
		if(a.name.length != b.name.length) return a.name.length - b.name.length;
		return a.name.localeCompare(b.name);
	}).slice(0, 10);
}
function searchFriendCandidatesFallback(uid, keyword, done){
	var sessionRows = [];
	var userRows = [];
	var waiting = 2;
	var finished = false;

	function finish(){
		if(finished || --waiting > 0) return;
		finished = true;
		done(buildFriendSearchResults(uid, keyword, sessionRows, userRows));
	}
	function fail(){
		finish();
	}

	MainDB.session.find().limit([ 'profile', true ]).on(function(rows){
		sessionRows = rows || [];
		finish();
	}, null, fail);
	MainDB.users.find().limit([ '_id', true ], [ 'kkutu', true ]).on(function(rows){
		userRows = rows || [];
		finish();
	}, null, fail);
}
function searchFriendCandidates(uid, query, done){
	var keyword = normalizeUsernameField(query);
	var like;
	var safeUid = escapeSqlString(uid || "");
	var sessionSql;
	var userSql;

	if(!keyword) return done([]);
	like = "%" + escapeLike(keyword) + "%";
	sessionSql = "SELECT profile"
		+ " FROM session"
		+ " WHERE profile::text ILIKE '" + like + "' ESCAPE '\\\\'"
		+ " LIMIT 48";
	userSql = "SELECT _id AS id, kkutu"
		+ " FROM users"
		+ " WHERE _id <> '" + safeUid + "'"
		+ " AND (_id ILIKE '" + like + "' ESCAPE '\\\\'"
		+ " OR kkutu::text ILIKE '" + like + "' ESCAPE '\\\\')"
		+ " LIMIT 48";

	MainDB.session.direct(sessionSql, function(sessionErr, sessionRes){
		var sessionRows = (!sessionErr && sessionRes && sessionRes.rows) ? sessionRes.rows : [];

		MainDB.users.direct(userSql, function(userErr, userRes){
			var userRows = (!userErr && userRes && userRes.rows) ? userRes.rows : [];
			var results = buildFriendSearchResults(uid, keyword, sessionRows, userRows);

			if(!results.length){
				return searchFriendCandidatesFallback(uid, keyword, done);
			}
			done(results);
		});
	});
}
function normalizeBuyIds(raw){
	var ids = parseJsonText(raw);
	var seen = Object.create(null);

	if(Array.isArray(ids)){
		return ids.map(function(id){
			return (typeof id == "string" || typeof id == "number") ? String(id).trim() : "";
		}).filter(function(id){
			if(!id || seen[id]) return false;
			seen[id] = true;
			return true;
		});
	}
	if(typeof ids == "string" || typeof ids == "number"){
		ids = String(ids).trim();
		return ids ? [ ids ] : [];
	}
	return [];
}
function purchaseGoods(uid, ids, res){
	if(!uid) return res.json({ error: 423 });
	if(!ids || !ids.length) return res.json({ error: 400 });

	MainDB.kkutu_shop.find([ '_id', { '$in': ids } ]).limit([ 'cost', true ], [ 'term', true ], [ 'hit', true ]).on(function($items){
		var itemMap = Object.create(null);
		var totalCost = 0;
		var i;
		var item;

		if(!$items || $items.length != ids.length) return res.json({ error: 400 });
		for(i=0; i<$items.length; i++){
			itemMap[$items[i]._id] = $items[i];
		}
		for(i=0; i<ids.length; i++){
			item = itemMap[ids[i]];
			if(!item || !Number.isFinite(Number(item.cost)) || Number(item.cost) < 0) return res.json({ error: 400 });
			totalCost += Number(item.cost);
		}
		MainDB.users.findOne([ '_id', uid ]).limit([ 'money', true ], [ 'box', true ]).on(function($user){
			var postM;

			if(!$user) return res.json({ error: 400 });
			var before = Inventory.snapshot($user, [ 'money', 'box' ]);
			if(!$user.box) $user.box = {};
			postM = $user.money - totalCost;
			if(!Number.isFinite(postM)) return res.json({ error: 400 });
			if(postM < 0) return res.send({ result: 400 });

			for(i=0; i<ids.length; i++){
				item = itemMap[ids[i]];
				obtain($user, ids[i], 1, item.term);
			}
			Inventory.save(MainDB.users, uid, before, [
				[ 'money', postM ],
				[ 'box', $user.box ]
			], function(err){
				if(err) return res.json({ error: err.code === 409 ? 409 : 500 });
				res.send({ result: 200, money: postM, box: $user.box, ids: ids });
				JLog.log("[PURCHASED] " + ids.join(",") + " by " + uid);
				for(i=0; i<ids.length; i++){
					item = itemMap[ids[i]];
					MainDB.kkutu_shop.update([ '_id', ids[i] ]).inc([ 'hit', 1 ]).on();
				}
			});
		});
	});
}

exports.run = function(Server, page){

Server.get("/profile-image", function(req, res){
	var image = normalizeProfileImage((req.query.u || "").toString());
	var cached = null;
	if(!image || !isGoogleProfileImageUrl(image)){
		return sendFallbackProfileImage(res);
	}
	cached = getCachedProfileImage(image);
	if(cached){
		return sendCachedProfileImage(res, cached, 3600);
	}
	(function fetchWithRetry(attempt){
		fetchProfileImage(image, function(err, result){
			if(!err && result && Buffer.isBuffer(result.body) && result.body.length){
				putCachedProfileImage(image, result.contentType, result.body);
				return sendCachedProfileImage(res, result, 3600);
			}
			if(attempt < 1){
				return setTimeout(function(){ fetchWithRetry(attempt + 1); }, 140);
			}
			cached = PROFILE_IMAGE_CACHE.get(image);
			if(cached){
				return sendCachedProfileImage(res, cached, 300);
			}
			return sendFallbackProfileImage(res);
		});
	})(0);
});

Server.get("/box", function(req, res){
	if(req.session.profile){
		/*if(Const.ADMIN.indexOf(req.session.profile.id) == -1){
			return res.send({ error: 555 });
		}*/
	}else{
		return res.send({ error: 400 });
	}
	MainDB.users.findOne([ '_id', req.session.profile.id ]).limit([ 'box', true ]).on(function($body){
		if(!$body){
			res.send({ error: 400 });
		}else{
			res.send($body.box);
		}
	});
});
Server.get("/help", function(req, res){
	page(req, res, "help", {
		'KO_INJEONG': Const.KO_INJEONG
	});
});
Server.get("/profile", function(req, res){
	var id = (req.query.id || "").toString().trim();
	if(!id) return res.send({ error: 400 });

	MainDB.session.findOne([ 'profile.id', id ]).limit([ 'profile', true ]).on(function($ses){
		var sessionProfile = $ses ? $ses.profile : null;
		var sessionName = normalizeProfileName(sessionProfile);
		var sessionUsername = normalizeProfileUsername(sessionProfile);
		var sessionImage = normalizeProfileImage(sessionProfile);

		MainDB.users.findOne([ '_id', id ]).limit([ 'kkutu', true ], [ 'equip', true ], [ 'exordial', true ]).on(function($user){
			if(!$user) return res.send({ error: 404 });
			var data = { score: 0, record: {} };
			var kkutu = parseJsonText($user.kkutu);

			if(kkutu && typeof kkutu == "object"){
				Object.keys(kkutu).forEach(function(key){
					data[key] = kkutu[key];
				});
			}
			data.score = Number(data.score) || 0;
			if(!data.record || typeof data.record != "object") data.record = {};
			data.joinedAt = Number(data.joinedAt) || Date.UTC(2026, 3, 17);
			if(!kkutu || !Number(kkutu.joinedAt)){
				MainDB.users.update([ '_id', id ]).set([ 'kkutu.joinedAt', data.joinedAt ]).on();
			}

			var name = sessionName || normalizeKkutuName($user.kkutu) || sessionUsername || id;
			var profile = { id: id, title: name, name: name };
			if(sessionImage) profile.image = proxifyProfileImage(sessionImage) || sessionImage;

			MainDB.redis.putGlobal(id, data.score).then(function(){
				MainDB.redis.getSurround(id, 15).then(function(rankBody){
					var rank = null;

					if(rankBody && Array.isArray(rankBody.data)){
						rankBody.data.some(function(item){
							if(item && item.id == id){
								rank = Number(item.rank);
								return true;
							}
							return false;
						});
					}
					res.send({
						id: id,
						profile: profile,
						data: data,
						equip: normalizeObjectValue($user.equip),
						exordial: typeof $user.exordial == "string" ? $user.exordial : ($user.exordial ? String($user.exordial) : ""),
						place: 0,
						rank: isNaN(rank) ? null : rank
					});
				});
			});
		});
	});
});
Server.get("/ranking", function(req, res){
	var pg = Number(req.query.p);
	var id = req.query.id;
	
	if(id){
		MainDB.users.findOne([ '_id', id ]).limit([ 'kkutu', true ]).on(function($user){
			var kkutu = parseJsonText($user && $user.kkutu);
			var score = kkutu && typeof kkutu == "object" ? Number(kkutu.score) || 0 : 0;

			if(!$user){
				return MainDB.redis.getSurround(id, 15).then(function($body){
					attachLeaderboardNames($body, res);
				});
			}
			MainDB.redis.putGlobal(id, score).then(function(){
				MainDB.redis.getSurround(id, 15).then(function($body){
					attachLeaderboardNames($body, res);
				});
			});
		});
	}else{
		if(isNaN(pg)) pg = 0;
		MainDB.redis.getPage(pg, 15).then(function($body){
			attachLeaderboardNames($body, res);
		});
	}
});
Server.get("/injeong/:word", function(req, res){
	if(!req.session.profile) return res.send({ error: 402 });
	var word = req.params.word;
	var theme = req.query.theme;
	var now = Date.now();
	
	if(now - req.session.injBefore < 2000) return res.send({ error: 429 });
	req.session.injBefore = now;
	
	MainDB.kkutu['ko'].findOne([ '_id', word.replace(/[^가-힣0-9]/g, "") ]).on(function($word){
		if($word) return res.send({ error: 409 });
		MainDB.kkutu_injeong.findOne([ '_id', word ]).on(function($ij){
			if($ij){
				if($ij.theme == '~') return res.send({ error: 406 });
				else return res.send({ error: 403 });
			}
			Web.get("https://namu.moe/w/" + encodeURI(word), function(err, _res){
				if(err) return res.send({ error: 400 });
				else if(_res.statusCode != 200) return res.send({ error: 405 });
				MainDB.kkutu_injeong.insert([ '_id', word ], [ 'theme', theme ], [ 'createdAt', now ], [ 'writer', req.session.profile.id ]).on(function($res){
					res.send({ message: "OK" });
				});
			});
		});
	});
});
Server.get("/cf/:word", function(req, res){
	res.send(getCFRewards(req.params.word, Number(req.query.l || 0), req.query.b == "1"));
});
Server.get("/shop", function(req, res){
	MainDB.kkutu_shop.find().limit([ 'cost', true ], [ 'term', true ], [ 'group', true ], [ 'options', true ], [ 'updatedAt', true ]).on(function($goods){
		var ids = $goods.map(function(item){ return item._id; });

		MainDB.kkutu_shop_desc.find([ '_id', { '$in': ids } ]).on(function($desc){
			var desc = {};
			var locale = req.query.locale || "ko_KR";
			var nameKey = "name_" + locale;
			var descKey = "desc_" + locale;

			$desc.forEach(function(item){
				desc[item._id] = item;
			});
			$goods.forEach(function(item){
				var text = desc[item._id];

				if(!text) return;
				item.name = text[nameKey] || text.name_ko_KR || text.name_en_US || item._id;
				item.desc = text[descKey] || text.desc_ko_KR || text.desc_en_US || "";
			});
			res.json({ goods: $goods });
		});
	});
	// res.json({ error: 555 });
});
Server.get("/friend-search", function(req, res){
	if(!req.session.profile) return res.send({ error: 402 });
	searchFriendCandidates(req.session.profile.id, req.query.q || "", function(list){
		res.send({ list: list });
	});
});
Server.post("/dict-request", function(req, res){
	if(!req.session.profile) return res.send({ error: 402 });
	var lang = req.body.lang == "ko" ? "ko" : "en";
	var word = normalizeDictionaryRequestWord(req.body.word || "", lang);
	var DB = MainDB.kkutu[lang];

	if(!word) return res.send({ error: 400 });
	if(!DB || !DB.findOne) return res.send({ error: 400 });
	DB.findOne([ '_id', word ]).on(function($word){
		if($word) return res.send({ error: 409 });
		readDictionaryRequests(function(list){
			if(list.some(function(item){ return sameDictionaryRequest(item, word, lang); })){
				return res.send({ error: 403 });
			}
			list.unshift({
				word: word,
				lang: lang,
				requesterId: req.session.profile.id,
				requesterName: req.session.profile.title || req.session.profile.name || req.session.profile.id,
				createdAt: Date.now()
			});
			writeDictionaryRequests(list, function(err){
				if(err){
					JLog.warn(`Failed to write dictionary request: ${err.message}`);
					return res.send({ error: 500 });
				}
				res.send({ message: "Request sent for moderator approval." });
			});
		});
	});
});
Server.get("/vocab", function(req, res){
	if(!req.session.profile) return res.send({ error: 402 });
	loadUserVocab(req.session.profile.id, function(err, lists){
		if(err){
			JLog.warn(`Failed to load vocab for ${req.session.profile.id}: ${err.message}`);
			return sendVocabError(res, 500, "Could not load vocabulary lists.");
		}
		sendVocabLists(res, lists);
	});
});
Server.post("/vocab/list", function(req, res){
	if(!req.session.profile) return res.send({ error: 402 });
	loadUserVocab(req.session.profile.id, function(err, lists){
		var list;

		if(err){
			JLog.warn(`Failed to load vocab for ${req.session.profile.id}: ${err.message}`);
			return sendVocabError(res, 500, "Could not load vocabulary lists.");
		}
		if(lists.length >= VOCAB_MAX_LISTS){
			return sendVocabError(res, 409, "You can only have 5 vocabulary lists.");
		}
		list = {
			id: createVocabListId(),
			name: normalizeVocabName(req.body.name || ("Vocabulary " + (lists.length + 1))),
			createdAt: Date.now(),
			words: []
		};
		lists.push(list);
		saveUserVocab(req.session.profile.id, lists, function(saveErr){
			if(saveErr){
				JLog.warn(`Failed to save vocab for ${req.session.profile.id}: ${saveErr.message}`);
				return sendVocabError(res, 500, "Could not save vocabulary lists.");
			}
			sendVocabLists(res, lists);
		});
	});
});
Server.post("/vocab/list/rename", function(req, res){
	if(!req.session.profile) return res.send({ error: 402 });
	loadUserVocab(req.session.profile.id, function(err, lists){
		var list;

		if(err){
			JLog.warn(`Failed to load vocab for ${req.session.profile.id}: ${err.message}`);
			return sendVocabError(res, 500, "Could not load vocabulary lists.");
		}
		list = findVocabList(lists, req.body.listId);
		if(!list) return sendVocabError(res, 404, "Vocabulary list not found.");
		list.name = normalizeVocabName(req.body.name);
		saveUserVocab(req.session.profile.id, lists, function(saveErr){
			if(saveErr){
				JLog.warn(`Failed to rename vocab for ${req.session.profile.id}: ${saveErr.message}`);
				return sendVocabError(res, 500, "Could not save vocabulary lists.");
			}
			sendVocabLists(res, lists);
		});
	});
});
Server.post("/vocab/list/delete", function(req, res){
	if(!req.session.profile) return res.send({ error: 402 });
	loadUserVocab(req.session.profile.id, function(err, lists){
		var before;

		if(err){
			JLog.warn(`Failed to load vocab for ${req.session.profile.id}: ${err.message}`);
			return sendVocabError(res, 500, "Could not load vocabulary lists.");
		}
		before = lists.length;
		lists = lists.filter(function(list){
			return list.id != req.body.listId;
		});
		if(lists.length == before) return sendVocabError(res, 404, "Vocabulary list not found.");
		saveUserVocab(req.session.profile.id, lists, function(saveErr){
			if(saveErr){
				JLog.warn(`Failed to delete vocab for ${req.session.profile.id}: ${saveErr.message}`);
				return sendVocabError(res, 500, "Could not save vocabulary lists.");
			}
			sendVocabLists(res, lists);
		});
	});
});
Server.post("/vocab/add", function(req, res){
	if(!req.session.profile) return res.send({ error: 402 });
	var lang = normalizeVocabLang(req.body.word, req.body.lang);
	var word = normalizeVocabWord(req.body.word, lang);
	var DB = MainDB.kkutu[lang];

	if(!word || !DB || !DB.findOne) return sendVocabError(res, 400, "Invalid word.");
	DB.findOne([ '_id', word ]).on(function($word){
		if(!$word) return sendVocabError(res, 404, "Word not found.");
		loadUserVocab(req.session.profile.id, function(err, lists){
			var list;
			var exists;

			if(err){
				JLog.warn(`Failed to load vocab for ${req.session.profile.id}: ${err.message}`);
				return sendVocabError(res, 500, "Could not load vocabulary lists.");
			}
			list = findVocabList(lists, req.body.listId);
			if(!list) return sendVocabError(res, 404, "Vocabulary list not found.");
			exists = list.words.some(function(item){
				return item.word == $word._id && item.lang == lang;
			});
			if(exists) return res.send({
				lists: lists,
				limits: { lists: VOCAB_MAX_LISTS, words: VOCAB_MAX_WORDS },
				duplicate: true
			});
			if(list.words.length >= VOCAB_MAX_WORDS){
				return sendVocabError(res, 413, "A vocabulary list can only hold 50 words.");
			}
			list.words.unshift(buildVocabWordEntry($word, lang));
			saveUserVocab(req.session.profile.id, lists, function(saveErr){
				if(saveErr){
					JLog.warn(`Failed to add vocab for ${req.session.profile.id}: ${saveErr.message}`);
					return sendVocabError(res, 500, "Could not save vocabulary lists.");
				}
				sendVocabLists(res, lists);
			});
		});
	});
});
Server.post("/vocab/remove", function(req, res){
	if(!req.session.profile) return res.send({ error: 402 });
	var lang = normalizeVocabLang(req.body.word, req.body.lang);
	var word = normalizeVocabWord(req.body.word, lang);

	loadUserVocab(req.session.profile.id, function(err, lists){
		var list;
		var before;

		if(err){
			JLog.warn(`Failed to load vocab for ${req.session.profile.id}: ${err.message}`);
			return sendVocabError(res, 500, "Could not load vocabulary lists.");
		}
		list = findVocabList(lists, req.body.listId);
		if(!list) return sendVocabError(res, 404, "Vocabulary list not found.");
		before = list.words.length;
		list.words = list.words.filter(function(item){
			return !(item.word == word && item.lang == lang);
		});
		if(before == list.words.length) return sendVocabError(res, 404, "Word not found in list.");
		saveUserVocab(req.session.profile.id, lists, function(saveErr){
			if(saveErr){
				JLog.warn(`Failed to remove vocab for ${req.session.profile.id}: ${saveErr.message}`);
				return sendVocabError(res, 500, "Could not save vocabulary lists.");
			}
			sendVocabLists(res, lists);
		});
	});
});

// POST
Server.post("/exordial", function(req, res){
	var text = req.body.data || "";
	
	if(req.session.profile){
		text = text.slice(0, 100);
		MainDB.users.update([ '_id', req.session.profile.id ]).set([ 'exordial', text ]).on(function($res){
			res.send({ text: text });
		});
	}else res.send({ error: 400 });
});
Server.post("/buy", function(req, res){
	if(!req.session.profile) return res.json({ error: 423 });
	purchaseGoods(req.session.profile.id, normalizeBuyIds(req.body.ids || req.body.id), res);
});
Server.post("/buy/:id", function(req, res){
	if(!req.session.profile) return res.json({ error: 423 });
	return purchaseGoods(req.session.profile.id, normalizeBuyIds(req.params.id), res);
});
Server.post("/equip/:id", function(req, res){
	if(!req.session.profile) return res.json({ error: 400 });
	var uid = req.session.profile.id;
	var gid = req.params.id;
	var isLeft = req.body.isLeft == "true";
	var now = Date.now() * 0.001;
	
	MainDB.users.findOne([ '_id', uid ]).limit([ 'box', true ], [ 'equip', true ]).on(function($user){
		if(!$user) return res.json({ error: 400 });
		var before = Inventory.snapshot($user, [ 'box', 'equip' ]);
		if(!$user.box) $user.box = {};
		if(!$user.equip) $user.equip = {};
		MainDB.kkutu_shop.findOne([ '_id', gid ]).limit([ 'group', true ], [ 'term', true ]).on(function($item){
			if(!$item) return res.json({ error: 430 });
			if(!Const.AVAIL_EQUIP.includes($item.group)) return res.json({ error: 400 });
			
			var part = $item.group;
			if(part.substr(0, 3) == "BDG") part = "BDG";
			if(part == "Mhand") part = isLeft ? "Mlhand" : "Mrhand";
			var qid = $user.equip[part];
			if(qid !== $item._id && !Inventory.quantity($user.box, gid)) return res.json({ error: 430 });
			function finish(oldItem){
				if(qid){
					var oldEntry = Inventory.entry($user.box, qid);
					if(oldEntry && typeof oldEntry == "object" && oldEntry.expire !== undefined){
						if(Number.isFinite(oldEntry.expire) && oldEntry.expire > now){
							obtain($user, qid, 1, oldEntry.expire, true);
						}else delete $user.box[qid];
					}else if(oldItem && !Number(oldItem.term)){
						obtain($user, qid, 1);
					}
					delete $user.equip[part];
				}
				if(qid !== $item._id){
					if(!consume($user, gid, 1)) return res.json({ error: 430 });
					$user.equip[part] = $item._id;
				}
				Inventory.save(MainDB.users, uid, before, [ [ 'box', $user.box ], [ 'equip', $user.equip ] ], function(err){
					if(err) return res.json({ error: err.code === 409 ? 409 : 500 });
					res.send({ result: 200, box: $user.box, equip: $user.equip });
				});
			}
			if(qid && qid !== $item._id){
				MainDB.kkutu_shop.findOne([ '_id', qid ]).limit([ 'term', true ]).on(finish);
			}else finish($item);
		});
	});
});
Server.post("/payback/:id", function(req, res){
	if(!req.session.profile) return res.json({ error: 400 });
	var uid = req.session.profile.id;
	var gid = req.params.id;
	var isDyn = gid.charAt() == '$';
	
	MainDB.users.findOne([ '_id', uid ]).limit([ 'money', true ], [ 'box', true ], [ 'equip', true ]).on(function($user){
		if(!$user) return res.json({ error: 400 });
		var before = Inventory.snapshot($user, [ 'money', 'box', 'equip' ]);
		if(!$user.box) $user.box = {};
		if(!Inventory.quantity($user.box, gid)) return res.json({ error: 430 });
		MainDB.kkutu_shop.findOne([ '_id', isDyn ? gid.slice(0, 4) : gid ]).limit([ 'cost', true ]).on(function($item){
			if(!$item || !Number.isFinite(Number($item.cost)) || Number($item.cost) < 0 || !Number.isFinite(Number($user.money))) return res.json({ error: 430 });
			var equipped = Object.keys($user.equip || {}).some(function(part){ return $user.equip[part] === gid; });
			consume($user, gid, 1, !equipped);
			$user.money = Number($user.money) + Math.round(0.2 * Number($item.cost));
			Inventory.save(MainDB.users, uid, before, [ [ 'money', $user.money ], [ 'box', $user.box ] ], function(err){
				if(err) return res.json({ error: err.code === 409 ? 409 : 500 });
				res.send({ result: 200, box: $user.box, money: $user.money });
			});
		});
	});
});
function blendWord(word){
	var lang = parseLanguage(word);
	var i, kl = [];
	var kr = [];
	
	if(lang == "en") return String.fromCharCode(97 + Math.floor(Math.random() * 26));
	if(lang == "ko"){
		for(i=word.length-1; i>=0; i--){
			var k = word.charCodeAt(i) - 0xAC00;
			
			kl.push([ Math.floor(k/28/21), Math.floor(k/28)%21, k%28 ]);
		}
		[0,1,2].sort((a, b) => (Math.random() < 0.5)).forEach((v, i) => {
			kr.push(kl[v][i]);
		});
		return String.fromCharCode(((kr[0] * 21) + kr[1]) * 28 + kr[2] + 0xAC00);
	}
}
function parseLanguage(word){
	return word.match(/[a-zA-Z]/) ? "en" : "ko";
}
Server.post("/cf", function(req, res){
	if(!req.session.profile) return res.json({ error: 400 });
	var uid = req.session.profile.id;
	if(typeof req.body.tray !== "string") return res.json({ error: 400 });
	var tray = req.body.tray.split('|');
	var i, o;
	
	if(tray.length < 1 || tray.length > 6) return res.json({ error: 400 });
	if(tray.some(function(piece){ return !/^\$WP[ABC][a-zA-Z\uac00-\ud7a3]$/.test(piece); })) return res.json({ error: 400 });
	MainDB.users.findOne([ '_id', uid ]).limit([ 'money', true ], [ 'box', true ]).on(function($user){
		if(!$user) return res.json({ error: 400 });
		var before = Inventory.snapshot($user, [ 'money', 'box' ]);
		if(!$user.box) $user.box = {};
		var requirements = Object.create(null), word = "", level = 0;
		var cfr, gain = [];
		var blend;
		
		for(i = 0; i < tray.length; i++){
			word += tray[i].slice(4);
			level += 68 - tray[i].charCodeAt(3);
			requirements[tray[i]] = (requirements[tray[i]] || 0) + 1;
			if(Inventory.quantity($user.box, tray[i]) < requirements[tray[i]]) return res.json({ error: 434 });
		}
		function composeWithBlendState(){
			cfr = getCFRewards(word, level, blend);
			if(!Number.isFinite(cfr.cost) || cfr.cost < 0 || !Number.isFinite(Number($user.money))) return res.json({ error: 400 });
			if($user.money < cfr.cost) return res.json({ error: 407 });
			Object.keys(requirements).forEach(function(key){ consume($user, key, requirements[key]); });
			for(i in cfr.data){
				o = cfr.data[i];
				
				if(Math.random() >= o.rate) continue;
				if(o.key.charAt(4) == "?"){
					o.key = o.key.slice(0, 4) + (blend ? blendWord(word) : word.charAt(Math.floor(Math.random() * word.length)));
				}
				obtain($user, o.key, o.value, o.term);
				gain.push(o);
			}
			$user.money -= cfr.cost;
			Inventory.save(MainDB.users, uid, before, [ [ 'money', $user.money ], [ 'box', $user.box ] ], function(err){
				if(err) return res.json({ error: err.code === 409 ? 409 : 500 });
				res.send({ result: 200, box: $user.box, money: $user.money, gain: gain });
			});
		}
		if(word.length == 3){
			MainDB.kkutu[parseLanguage(word)].findOne([ '_id', word ]).on(function($dic){
				blend = !$dic;
				composeWithBlendState();
			});
		}else{
			blend = false;
			composeWithBlendState();
		}
	});
	// res.send(getCFRewards(req.params.word, Number(req.query.l || 0)));
});
Server.get("/dict/:word", function(req, res){
    var lang = req.query.lang == "ko" ? "ko" : "en";
    var word = normalizeDictionaryLookupWord(req.params.word || "", lang);
    var DB = MainDB.kkutu[lang];
    var fallbacks = getDictionaryLookupFallbacks(word, lang);
    var sendWord = function($word){
        res.send({
            word: $word._id,
            mean: $word.mean,
            theme: $word.theme,
            type: $word.type
        });
    };
    var tryFallback = function(){
        var next = fallbacks.shift();

        if(!next) return res.send({ error: 404 });
        DB.findOne([ '_id', next ]).on(function($word){
            if(!$word) return tryFallback();
            sendWord($word);
        });
    };
    
    if(!word) return res.send({ error: 404 });
    if(!DB) return res.send({ error: 400 });
    if(!DB.findOne) return res.send({ error: 400 });
    DB.findOne([ '_id', word ]).on(function($word){
        if(!$word) return tryFallback();
        sendWord($word);
    });
});

};
function getCFRewards(word, level, blend){
	var R = [];
	var f = {
		len: word.length, // 최대 6
		lev: level // 최대 18
	};
	var cost = 20 * f.lev;
	var wur = f.len / 36; // 최대 2.867
	
	if(blend){
		if(wur >= 0.5){
			R.push({ key: "$WPA?", value: 1, rate: 1 });
		}else if(wur >= 0.35){
			R.push({ key: "$WPB?", value: 1, rate: 1 });
		}else if(wur >= 0.05){
			R.push({ key: "$WPC?", value: 1, rate: 1 });
		}
		cost = Math.round(cost * 0.2);
	}else{
		R.push({ key: "dictPage", value: Math.round(f.len * 0.6), rate: 1 });
		R.push({ key: "boxB4", value: 1, rate: Math.min(1, f.lev / 7) });
		if(f.lev >= 5){
			R.push({ key: "boxB3", value: 1, rate: Math.min(1, f.lev / 15) });
			cost += 10 * f.lev;
			wur += f.lev / 20;
		}
		if(f.lev >= 10){
			R.push({ key: "boxB2", value: 1, rate: Math.min(1, f.lev / 30) });
			cost += 20 * f.lev;
			wur += f.lev / 10;
		}
		if(wur >= 0.05){
			if(wur > 1) R.push({ key: "$WPC?", value: Math.floor(wur), rate: 1 });
			R.push({ key: "$WPC?", value: 1, rate: wur % 1 });
		}
		if(wur >= 0.35){
			if(wur > 2) R.push({ key: "$WPB?", value: Math.floor(wur / 2), rate: 1 });
			R.push({ key: "$WPB?", value: 1, rate: (wur / 2) % 1 });
		}
		if(wur >= 0.5){
			R.push({ key: "$WPA?", value: 1, rate: wur / 3 });
		}
	}
	return { data: R, cost: cost };
}
