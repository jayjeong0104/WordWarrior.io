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

var Const = require('../../const');
var Lizard = require('../../sub/lizard');
var DB;
var DIC;

const ROBOT_START_DELAY = [ 900, 620, 320, 120, 20 ];
const ROBOT_TYPE_COEF = [ 820, 520, 300, 110, 25 ];
const ROBOT_THINK_COEF = [ 2.8, 1.7, 0.95, 0.35, 0.08 ];
const ROBOT_HIT_LIMIT = [ 6, 3, 1, 0, 0 ];
const ROBOT_LENGTH_LIMIT = [ 4, 6, 12, 99, 99 ];
const ROBOT_PICK_TOP = [ 6, 5, 4, 2, 1 ];
const RIEUL_TO_NIEUN = [4449, 4450, 4457, 4460, 4462, 4467];
const RIEUL_TO_IEUNG = [4451, 4455, 4456, 4461, 4466, 4469];
const NIEUN_TO_IEUNG = [4455, 4461, 4466, 4469];

exports.init = function(_DB, _DIC){
	DB = _DB;
	DIC = _DIC;
};
exports.getTitle = function(){
	var R = new Lizard.Tail();
	var my = this;
	var l = my.rule;
	var game = my.game;
	var EXAMPLE;
	var eng, ja;
	
	if(!l){
		R.go("undefinedd");
		return R;
	}
	if(!l.lang){
		R.go("undefinedd");
		return R;
	}
	EXAMPLE = Const.EXAMPLE_TITLE[l.lang];
	my.game.dic = {};
	
	switch(Const.GAME_TYPE[my.mode]){
		case 'EKT':
		case 'ESH':
		case 'EBT':
		case 'EAP':
			eng = "^" + String.fromCharCode(97 + Math.floor(Math.random() * 26));
			break;
		case 'KKT':
			my.game.wordLength = 3;
		case 'KSH':
		case 'KAP':
			ja = 44032 + 588 * Math.floor(Math.random() * 18);
			eng = "^[\\u" + ja.toString(16) + "-\\u" + (ja + 587).toString(16) + "]";
			break;
	}
	function tryTitle(h){
		if(h > 50){
			R.go(EXAMPLE);
			return;
		}
		DB.kkutu[l.lang].find(
			[ '_id', new RegExp(eng + ".{" + Math.max(1, my.round - 1) + "}$") ],
			// [ 'hit', { '$lte': h } ],
			(l.lang == "ko") ? [ 'type', Const.KOR_GROUP ] : [ '_id', Const.ENG_ID ]
			// '$where', eng+"this._id.length == " + Math.max(2, my.round) + " && this.hit <= " + h
		).limit(20).on(function($md){
			if(my.game !== game || !my.gaming) return;
			var list;
			
			if($md.length){
				list = shuffle($md);
				checkTitle(list.shift()._id).then(onChecked);
			
				function onChecked(v){
					if(v) R.go(v);
					else if(list.length) checkTitle(list.shift()._id).then(onChecked);
					else R.go(EXAMPLE);
				}
			}else{
				tryTitle(h + 10);
			}
		});
	}
	function checkTitle(title){
		var R = new Lizard.Tail();
		var i, list = [];
		var len;
		
		/* 부하가 너무 걸린다면 주석을 풀자.
		R.go(true);
		return R;
		*/
		if(title == null){
			R.go(EXAMPLE);
		}else{
			len = title.length;
			for(i=0; i<len; i++) list.push(getAuto.call(my, title[i], getSubChar.call(my, title[i]), 1));
			
			Lizard.all(list).then(function(res){
				for(i in res) if(!res[i]) return R.go(EXAMPLE);
				
				return R.go(title);
			});
		}
		return R;
	}
	tryTitle(10);
	
	return R;
};
exports.roundReady = function(){
	var my = this;
	if(!my.game.title) return;
	
	clearTimeout(my.game.turnTimer);
	clearTimeout(my.game.robotTimer);
	my.game.late = true;
	my.game.loading = false;
	my.game.round++;
	my.game.roundTime = my.time * 1000;
	if(my.game.round <= my.round){
		my.game.char = my.game.title[my.game.round - 1];
		my.game.subChar = getSubChar.call(my, my.game.char);
		if(my.opts.randomturn && my.game.seq && my.game.seq.length > 1){
			var nextTurn;
			do{
				nextTurn = Math.floor(Math.random() * my.game.seq.length);
			}while(nextTurn == my.game.turn);
			my.game.turn = nextTurn;
		}
		my.game.chain = [];
		my.game.doubleShotContinue = false;
		if(my.opts.mission || my.opts.doublemission) my.game.mission = getMissions(my.rule.lang, my.opts.doublemission ? 2 : 1);
		else my.game.mission = null;
		my.game.missionHit = false;
		my.game.missionHits = [];
		my.game.lastScorer = null;
		if(my.opts.banletter || my.opts.doubleban){
			my.game.banLetters = getBanLetters(my.rule.lang, my.opts.doubleban ? 2 : 1, my.game.char, my.game.subChar, my.game.mission);
			my.game.banRoundReady = true;
		}else{
			my.game.banLetters = [];
			my.game.banRoundReady = false;
		}
		if(my.opts.sami) my.game.wordLength = 2;
		
		my.byMaster('roundReady', {
			round: my.game.round,
			char: my.game.char,
			subChar: my.game.subChar,
			mission: my.game.mission,
			banLetters: my.game.banLetters || []
		}, true);
		my.game.turnTimer = setTimeout(my.turnStart, 2400);
	}else{
		my.roundEnd();
	}
};
exports.turnStart = function(force){
	var my = this;
	var speed;
	var si;
	
	if(!my.game.chain) return;
	my.game.roundTime = Math.min(my.game.roundTime, Math.max(10000, 150000 - my.game.chain.length * 1500));
	speed = my.getTurnSpeed(my.game.roundTime);
	clearTimeout(my.game.turnTimer);
	clearTimeout(my.game.robotTimer);
	my.game.late = false;
	my.game.loading = false;
	my.game.turnToken = (my.game.turnToken || 0) + 1;
	my.game.turnTime = my.opts.speed ? 4500 : (15000 - 1400 * speed);
	if(my.opts.speed) speed = 10;
	my.game.turnAt = (new Date()).getTime();
	if(my.opts.sami) my.game.wordLength = (my.game.wordLength == 3) ? 2 : 3;
	if(my.opts.banletter || my.opts.doubleban){
		if(my.game.banRoundReady){
			my.game.banRoundReady = false;
		}else if(!my.opts.doubleshot || !my.game.doubleShotContinue){
			my.game.banLetters = getBanLetters(my.rule.lang, my.opts.doubleban ? 2 : 1, my.game.char, my.game.subChar, my.game.mission);
		}
	}else{
		my.game.banLetters = [];
		my.game.banRoundReady = false;
	}
	if(my.opts.doubleshot){
		if(!my.game.doubleShotContinue) my.game.shotsRemaining = 2;
	}else{
		my.game.shotsRemaining = 1;
	}
	
	my.byMaster('turnStart', {
		turn: my.game.turn,
		char: my.game.char,
		subChar: my.game.subChar,
		speed: speed,
		roundTime: my.game.roundTime,
		turnTime: my.game.turnTime,
		mission: my.game.mission,
		banLetters: my.game.banLetters || [],
		doubleShot: !!my.opts.doubleshot,
		shotIndex: my.opts.doubleshot ? Math.max(1, 3 - (my.game.shotsRemaining || 1)) : 1,
		shotsTotal: my.opts.doubleshot ? 2 : 1,
		chaos: !!my.opts.chaos,
		wordLength: my.game.wordLength,
		seq: force ? my.game.seq : undefined
	}, true);
	my.game.doubleShotContinue = false;
	my.game.turnTimer = setTimeout(my.turnEnd, Math.min(my.game.roundTime, my.game.turnTime + 100));
	if(si = my.game.seq[my.game.turn]) if(si.robot){
		si._done = [];
		my.readyRobot(si);
	}
};
exports.turnEnd = function(){
	var my = this;
	var target;
	var score;
	var extraScores = [];
	var prev;
	var prevScore;
	
	if(!my.game.seq) return;
	target = DIC[my.game.seq[my.game.turn]] || my.game.seq[my.game.turn];
	
	if(my.game.loading){
		my.game.turnTimer = setTimeout(my.turnEnd, 100);
		return;
	}
	my.game.late = true;
	if(target) if(target.game){
		score = getPenaltyFor.call(my, target);
		target.game.score += score;
	}
	if(target && target.game && my.opts.selfdestruct && !my.opts.safe && my.game.lastScorer && my.game.lastScorer != target.id){
		prev = DIC[my.game.lastScorer] || null;
		if(!prev){
			my.game.seq.some(function(item){
				if(item && item.robot && item.id == my.game.lastScorer){
					prev = item;
					return true;
				}
				return false;
			});
		}
		if(prev && prev.game){
			prevScore = getPenaltyFor.call(my, prev);
			prev.game.score += prevScore;
			extraScores.push({ id: prev.id, score: prevScore });
		}
	}
	var game = my.game;
	getAuto.call(my, my.game.char, my.game.subChar, 0).then(function(w){
		if(my.game !== game || !my.gaming) return;
		my.byMaster('turnEnd', {
			ok: false,
			target: target ? target.id : null,
			score: score,
			extraScores: extraScores,
			hint: w
		}, true);
		my.game._rrt = setTimeout(my.roundReady, 3000);
	});
	clearTimeout(my.game.robotTimer);
};
exports.submit = function(client, text){
	var score, l, t, rawText, lookupText, baseScore, bonusScore;
	var my = this;
	var tv = (new Date()).getTime();
	var mgt = my.game.seq && my.game.seq[my.game.turn];
	var turnToken = my.game.turnToken;
	var chain = my.game.chain;
	
	if(!mgt || !isCurrentSubmission(my, client, turnToken, chain) || my.game.loading) return;
	if(typeof text != "string" || !text) return;
	if(!my.game.char) return;
	rawText = String(text || "");
	lookupText = normalizeSubmittedText.call(my, rawText);
	if(lookupText === false) return client.publish('turnError', { code: 404, value: rawText }, true);
	text = lookupText;
	if(/\s/.test(text)) return client.publish('turnError', { code: 404, value: text }, true);
	
	if(!isChainable(text, my.mode, my.game.char, my.game.subChar)){
		if(client.robot) return my.readyRobot(client);
		return client.chat(rawText);
	}
	var specialRuleCode = getSpecialRuleRejectionCode.call(my, text);
	if(specialRuleCode) return client.publish('turnError', { code: specialRuleCode, value: text }, true);
	if(my.opts.noreset && my.game.dic && my.game.dic[text]) return client.publish('turnError', { code: 409, value: text }, true);
	if(my.game.chain.indexOf(text) != -1) return client.publish('turnError', { code: 409, value: text }, true);
	
	l = my.rule.lang;
	my.game.loading = true;
	function onDB($doc){
		if(!isCurrentSubmission(my, client, turnToken, chain)){
			releaseSubmission(my, turnToken, chain);
			return;
		}
		var preChar = getChar.call(my, text);
		var preSubChar = getSubChar.call(my, preChar);
		var firstMove = my.game.chain.length < 1;
		
		function preApproved(){
			function approved(){
				if(!isCurrentSubmission(my, client, turnToken, chain) || !my.game.dic){
					releaseSubmission(my, turnToken, chain);
					return;
				}
				
				my.game.loading = false;
				my.game.late = true;
				clearTimeout(my.game.turnTimer);
				t = tv - my.game.turnAt;
				baseScore = my.getScore(text, t, true);
				score = my.getScore(text, t);
				bonusScore = Math.max(0, score - baseScore);
				my.game.dic[text] = (my.game.dic[text] || 0) + 1;
				my.game.chain.push(text);
				my.game.roundTime -= t;
				my.game.char = preChar;
				my.game.subChar = preSubChar;
				my.game.lastScorer = client.id;
				client.game.score += score;
				client.publish('turnEnd', {
					ok: true,
					value: my.opts.hidden ? getHiddenText(text) : text,
					mean: my.opts.hidden ? "" : $doc.mean,
					theme: my.opts.hidden ? "" : $doc.theme,
					wc: my.opts.hidden ? "" : $doc.type,
					score: score,
					bonus: my.game.missionHit ? bonusScore : 0,
					baby: $doc.baby
				}, true);
				if(my.game.missionHit){
					my.game.mission = replaceHitMissions(my.rule.lang, my.game.mission, my.game.missionHits);
					my.game.missionHit = false;
					my.game.missionHits = [];
				}
				if(my.opts.doubleshot && my.game.shotsRemaining > 1){
					my.game.shotsRemaining--;
					my.game.doubleShotContinue = true;
					my.game.turnTimer = setTimeout(my.turnStart, my.game.turnTime / 6, true);
				}else{
					my.game.turnTimer = setTimeout(my.turnNext, my.game.turnTime / 6);
				}
				if(!client.robot){
					client.invokeWordPiece(text, 1);
					DB.kkutu[l].update([ '_id', text ]).set([ 'hit', $doc.hit + 1 ]).on();
				}
			}
			if(firstMove || my.opts.manner) getAuto.call(my, preChar, preSubChar, 1).then(function(w){
				if(!isCurrentSubmission(my, client, turnToken, chain)){
					releaseSubmission(my, turnToken, chain);
					return;
				}
				if(w) approved();
				else{
					my.game.loading = false;
					client.publish('turnError', { code: firstMove ? 402 : 403, value: text }, true);
					if(client.robot){
						my.readyRobot(client);
					}
				}
			});
			else approved();
		}
		function denied(code){
			my.game.loading = false;
			client.publish('turnError', { code: code || 404, value: text }, true);
		}
		if($doc){
			if(!my.opts.injeong && ($doc.flag & Const.KOR_FLAG.INJEONG)) denied();
			else if(my.opts.strict && (!$doc.type.match(Const.KOR_STRICT) || $doc.flag >= 4)) denied(406);
			else if(my.opts.loanword && ($doc.flag & Const.KOR_FLAG.LOANWORD)) denied(405);
			else preApproved();
		}else{
			denied();
		}
	}
	function isChainable(){
		var type = Const.GAME_TYPE[my.mode];
		var char = my.game.char, subChar = my.game.subChar;
		var l = char.length;
		var isReverse = !!my.rule._back;
		
		if(!text) return false;
		if(text.length <= l) return false;
		if(my.game.wordLength && text.length != my.game.wordLength) return false;
		if(isReverse) return (text.slice(-1) == char) || (text.slice(-1) == subChar);
		switch(l){
			case 1: return (text[0] == char) || (text[0] == subChar);
			case 2: return (text.substr(0, 2) == char);
			case 3: return (text.substr(0, 3) == char) || (text.substr(0, 2) == char.slice(1));
			default: return false;
		}
	}
	DB.kkutu[l].findOne([ '_id', text ],
		(l == "ko") ? [ 'type', Const.KOR_GROUP ] : [ '_id', Const.ENG_ID ]
	).on(onDB);
};
exports.getScore = function(text, delay, ignoreMission){
	var my = this;
	var tr = 1 - delay / my.game.turnTime;
	var score, arr;
	
	if(!text || !my.game.chain || !my.game.dic) return 0;
	score = Const.getPreScore(text, my.game.chain, tr);
	
	if(my.game.dic[text]) score *= 15 / (my.game.dic[text] + 15);
	if(!ignoreMission) if(arr = getMissionMatches(text, my.game.mission)){
		score += score * 0.5 * arr;
		my.game.missionHit = true;
		my.game.missionHits = mergeMissionHits(my.game.missionHits, getMissionHitLetters(text, my.game.mission));
	}
	return Math.round(score);
};
exports.readyRobot = function(robot){
	var my = this;
	var turnToken = my.game.turnToken;
	var chain = my.game.chain;
	if(!isCurrentSubmission(my, robot, turnToken, chain)) return;
	clearTimeout(my.game.robotTimer);
	var level = robot.level;
	var delay = ROBOT_START_DELAY[level] || 0;
	var ended = {};
	var w, text, i;
	var isRev = !!my.rule._back;
	
	getAuto.call(my, my.game.char, my.game.subChar, 2).then(function(list){
		if(!isCurrentSubmission(my, robot, turnToken, chain)) return;
		list = filterAutoList.call(my, list || []).filter(function(item){
			return item && item._id && isChainableForCurrent.call(my, item._id) && item._id.length <= ROBOT_LENGTH_LIMIT[level] && !robot._done.includes(item._id);
		});
		if(!list.length) return denied();
		list.sort(function(a, b){ return b.hit - a.hit; });
		if(ROBOT_HIT_LIMIT[level] > (list[0].hit || 0)) return denied();
		if(level >= 3 && !robot._done.length && my.game.turnTime >= 1600){
			for(i in list){
				w = list[i]._id.charAt(isRev ? 0 : (list[i]._id.length - 1));
				if(!ended.hasOwnProperty(w)) ended[w] = [];
				ended[w].push(list[i]);
			}
			getWishList(Object.keys(ended)).then(function(key){
				if(!isCurrentSubmission(my, robot, turnToken, chain)) return;
				var v = ended[key];
				if(v && v.length && (level >= 4 || Math.random() < 0.8)) pickList(v);
				else pickList(list);
			});
		}else{
			pickList(list);
		}
	});
	function denied(){
		text = isRev ? `T.T ...${my.game.char}` : `${my.game.char}... T.T`;
		after();
	}
	function pickList(list){
		w = pickClassicRobotWord(list, level, my.game.mission);
		if(w){
			text = w._id;
			delay += 350 * ROBOT_THINK_COEF[level] * (0.45 + Math.random() * 0.55) / Math.max(1, Math.log(1.8 + Math.max(1, w.hit || 0)));
			after();
		}else denied();
	}
	function after(){
		if(!isCurrentSubmission(my, robot, turnToken, chain)) return;
		var submitText = text;
		delay += text.length * ROBOT_TYPE_COEF[level];
		robot._done.push(text);
		if(my.opts.mirror) submitText = reverseText(submitText);
		if(my.opts.caps) submitText = submitText.toUpperCase();
		my.game.robotTimer = setTimeout(function(){
			if(isCurrentSubmission(my, robot, turnToken, chain)) my.turnRobot(robot, submitText);
		}, delay);
	}
	function getWishList(list){
		var R = new Lizard.Tail();
		var wz = [];
		var res;
		
		for(i in list) wz.push(getWish(list[i]));
		Lizard.all(wz).then(function($res){
			if(!my.game.chain) return;
			$res.sort(function(a, b){ return a.length - b.length; });
			
			if(my.opts.manner || !my.game.chain.length){
				while(res = $res.shift()) if(res.length) break;
			}else res = $res.shift();
			R.go(res ? res.char : null);
		});
		return R;
	}
	function getWish(char){
		var R = new Lizard.Tail();
		
		DB.kkutu[my.rule.lang].find([ '_id', new RegExp(isRev ? `.${char}$` : `^${char}.`) ]).limit(10).on(function($res){
			R.go({ char: char, length: $res.length });
		});
		return R;
	}
};
function isCurrentSubmission(my, client, turnToken, chain){
	var current = my.game && my.game.seq && my.game.seq[my.game.turn];
	return my.gaming && !my.game.late && my.game.turnToken === turnToken && my.game.chain === chain
		&& current && (current.robot ? current === client : current === client.id);
}
function releaseSubmission(my, turnToken, chain){
	if(my.game && my.game.turnToken === turnToken && my.game.chain === chain) my.game.loading = false;
}
function pickClassicRobotWord(list, level, mission){
	var top = ROBOT_PICK_TOP[level] || 1;
	var scored = (list || []).slice().sort(function(a, b){
		var diff = getClassicRobotWordScore(b, level, mission) - getClassicRobotWordScore(a, level, mission);
		if(diff) return diff;
		diff = b._id.length - a._id.length;
		if(diff) return diff;
		return (b.hit || 0) - (a.hit || 0);
	});
	if(!scored.length) return null;
	if(level >= 4 || top <= 1) return scored[0];
	return scored[Math.floor(Math.random() * Math.min(top, scored.length))];
}
function getClassicRobotWordScore(item, level, mission){
	var text = item && item._id ? item._id : "";
	var hit = Number(item && item.hit) || 0;
	var len = text.length;
	var missionHits = getMissionMatches(text, mission);
	var common = Math.log(hit + 1);
	var rare = Math.max(0, 7 - common * 2);
	switch(level){
		case 0: return missionHits * 5 + common * 8 - len * 1.8;
		case 1: return missionHits * 7 + common * 6 - len * 0.8;
		case 2: return missionHits * 11 + common * 2 + len * 1.2;
		case 3: return missionHits * 16 + len * 2.4 + rare * 4;
		default: return missionHits * 24 + len * 3.4 + rare * 7 + (hit <= 1 ? 4 : 0);
	}
}
function getMission(l){
	var arr = (l == "ko") ? Const.MISSION_ko : Const.MISSION_en;
	
	if(!arr) return "-";
	return arr[Math.floor(Math.random() * arr.length)];
}
function getMissions(l, count){
	var i = 0, v, res = [];
	count = Math.max(1, count || 1);
	while(res.length < count){
		v = getMission(l);
		if(res.indexOf(v) == -1) res.push(v);
		if(++i > 50) break;
	}
	return count == 1 ? res[0] : res;
}
function getReplacementMission(l, blocked){
	var i = 0, v;
	blocked = blocked || {};
	while(i++ < 80){
		v = getMission(l);
		if(v && !blocked[String(v).toLowerCase()]) return v;
	}
	return getMission(l);
}
function replaceHitMissions(l, mission, hits){
	var arr = Array.isArray(mission) ? mission.slice() : (mission ? [ mission ] : []);
	var hitMap = {};
	var blocked = {};
	var i, key, next;
	if(!arr.length) return mission;
	(hits || []).forEach(function(item){
		hitMap[String(item || "").toLowerCase()] = true;
	});
	arr.forEach(function(item){
		blocked[String(item || "").toLowerCase()] = true;
	});
	for(i = 0; i < arr.length; i++){
		key = String(arr[i] || "").toLowerCase();
		if(!hitMap[key]) continue;
		delete blocked[key];
		next = getReplacementMission(l, blocked);
		blocked[String(next || "").toLowerCase()] = true;
		arr[i] = next;
	}
	return Array.isArray(mission) ? arr : arr[0];
}
function getBanLetters(l, count, char, subc, mission){
	var arr = (l == "ko") ? Const.MISSION_ko : Const.MISSION_en;
	var blocked = {};
	var res = [];
	var guard = 0;
	var m = Array.isArray(mission) ? mission : (mission ? [ mission ] : []);
	var i, v;
	if(!arr) return res;
	String(char || "").split("").forEach(function(ch){ blocked[ch.toLowerCase()] = true; });
	String(subc || "").split("").forEach(function(ch){ blocked[ch.toLowerCase()] = true; });
	for(i in m) blocked[String(m[i] || "").toLowerCase()] = true;
	count = Math.max(1, count || 1);
	while(res.length < count && guard++ < 80){
		v = arr[Math.floor(Math.random() * arr.length)];
		if(!v) continue;
		if(blocked[String(v).toLowerCase()]) continue;
		if(res.indexOf(v) == -1) res.push(v);
	}
	return res;
}
function getMissionMatches(text, mission){
	var i, arr = Array.isArray(mission) ? mission : (mission ? [ mission ] : []);
	var count = 0;
	var m;
	for(i in arr){
		m = String(arr[i] || "");
		if(!m) continue;
		count += (text.match(new RegExp(m, "g")) || []).length;
	}
	return count;
}
function getMissionHitLetters(text, mission){
	var i, arr = Array.isArray(mission) ? mission : (mission ? [ mission ] : []);
	var hits = [];
	var m;
	for(i in arr){
		m = String(arr[i] || "");
		if(!m) continue;
		if((text.match(new RegExp(m, "g")) || []).length) hits.push(m);
	}
	return hits;
}
function mergeMissionHits(current, next){
	var res = Array.isArray(current) ? current.slice() : [];
	(next || []).forEach(function(item){
		if(res.indexOf(item) == -1) res.push(item);
	});
	return res;
}
function getPenaltyFor(target){
	var my = this;
	if(my.opts.safe) return 0;
	if(my.opts.chaos) return -Math.round((target.game.score || 0) * 0.9);
	return Const.getPenalty(my.game.chain, target.game.score);
}
function normalizeSubmittedText(text){
	var my = this;
	var value = String(text || "");
	if(my.opts.caps){
		if(!/[A-Z]/.test(value) || /[a-z]/.test(value)) return false;
		value = value.toLowerCase();
	}
	if(my.opts.mirror) value = reverseText(value);
	return value;
}
function reverseText(text){
	return String(text || "").split("").reverse().join("");
}
function getHiddenText(text){
	return new Array(String(text || "").length + 1).join("?");
}
function getLengthLimits(my){
	if(my.rule.lang == "ko") return { longMin: 4, shortMax: 2 };
	return { longMin: 7, shortMax: 4 };
}
function getSpecialRuleRejectionCode(text){
	var my = this;
	var i, limits = getLengthLimits(my);
	var bans = my.game.banLetters || [];
	if(my.opts.long && text.length < limits.longMin) return 410;
	if(my.opts.short && text.length > limits.shortMax) return 411;
	for(i in bans) if(bans[i] && text.indexOf(bans[i]) != -1) return 408;
	return 0;
}
function isAllowedBySpecialRules(text){
	return !getSpecialRuleRejectionCode.call(this, text);
}
function isChainableForCurrent(text){
	var my = this;
	var char = my.game.char, subChar = my.game.subChar;
	var l = char ? char.length : 0;
	if(!text || !char) return false;
	if(text.length <= l) return false;
	if(my.game.wordLength && text.length != my.game.wordLength) return false;
	if(my.rule && my.rule._back) return (text.slice(-1) == char) || (text.slice(-1) == subChar);
	switch(l){
		case 1: return (text[0] == char) || (text[0] == subChar);
		case 2: return (text.substr(0, 2) == char);
		case 3: return (text.substr(0, 3) == char) || (text.substr(0, 2) == char.slice(1));
		default: return false;
	}
}
function filterAutoList(list){
	var my = this;
	return (list || []).filter(function(item){
		if(!item || !item._id) return false;
		if(my.opts.noreset && my.game.dic && my.game.dic[item._id]) return false;
		return isAllowedBySpecialRules.call(my, item._id);
	});
}
function hasDynamicAutoConstraint(my){
	return !!(my.opts.banletter || my.opts.doubleban || my.opts.noreset || my.opts.long || my.opts.short);
}
function getAuto(char, subc, type){
	/* type
		0 무작위 단어 하나
		1 존재 여부
		2 단어 목록
	*/
	var my = this;
	var R = new Lizard.Tail();
	var gameType = Const.GAME_TYPE[my.mode];
	var game = my.game;
	var adv, adc;
	var key = gameType + "_" + keyByOptions(my.opts);
	var MAN = DB.kkutu_manner[my.rule.lang];
	var bool = type == 1;
	var dynamic = hasDynamicAutoConstraint(my);
	if(!char){
		R.go(type == 2 ? [] : (bool ? false : null));
		return R;
	}
	
	adc = char + (subc ? ("|"+subc) : "");
	switch(gameType){
		case 'EKT':
			adv = `^(${adc})..`;
			break;
		case 'KSH':
			adv = `^(${adc}).`;
			break;
		case 'ESH':
		case 'EBT':
			adv = `^(${adc})...`;
			break;
		case 'KKT':
			adv = `^(${adc}).{${my.game.wordLength-1}}$`;
			break;
		case 'EAP':
		case 'KAP':
			adv = `.(${adc})$`;
			break;
	}
	if(!char){
		console.log(`Undefined char detected! key=${key} type=${type} adc=${adc}`);
	}
	MAN.findOne([ '_id', char || "★" ]).on(function($mn){
		if(my.game !== game || !my.gaming) return R.go(type == 2 ? [] : (bool ? false : null));
		if($mn && bool && !dynamic){
			if($mn[key] == null) produce();
			else R.go($mn[key]);
		}else{
			produce();
		}
	});
	function produce(){
		var aqs = [[ '_id', new RegExp(adv) ]];
		var aft;
		var lst;
		
		if(!my.opts.injeong) aqs.push([ 'flag', { '$nand': Const.KOR_FLAG.INJEONG } ]);
		if(my.rule.lang == "ko"){
			if(my.opts.loanword) aqs.push([ 'flag', { '$nand': Const.KOR_FLAG.LOANWORD } ]);
			if(my.opts.strict) aqs.push([ 'type', Const.KOR_STRICT ], [ 'flag', { $lte: 3 } ]);
			else aqs.push([ 'type', Const.KOR_GROUP ]);
		}else{
			aqs.push([ '_id', Const.ENG_ID ]);
		}
		switch(type){
			case 0:
			default:
				aft = function($md){
					R.go($md[Math.floor(Math.random() * $md.length)]);
				};
				break;
			case 1:
				aft = function($md){
					R.go($md.length ? true : false);
				};
				break;
			case 2:
				aft = function($md){
					R.go($md);
				};
				break;
		}
		DB.kkutu[my.rule.lang].find.apply(this, aqs).limit(bool || dynamic ? 300 : 123).on(function($md){
			var filtered;
			if(my.game !== game || !my.gaming) return R.go(type == 2 ? [] : (bool ? false : null));
			if(!dynamic) forManner($md);
			filtered = filterAutoList.call(my, $md);
			if(my.game.chain) aft(filtered.filter(function(item){ return !my.game.chain.includes(item._id); }));
			else aft(filtered);
		});
		function forManner(list){
			lst = list;
			MAN.upsert([ '_id', char ]).set([ key, lst.length ? true : false ]).on(null, null, onFail);
		}
		function onFail(){
			MAN.createColumn(key, "boolean").on(function(){
				forManner(lst);
			});
		}
	}
	return R;
}
function keyByOptions(opts){
	var arr = [];
	
	if(opts.injeong) arr.push('X');
	if(opts.loanword) arr.push('L');
	if(opts.strict) arr.push('S');
	return arr.join('');
}
function shuffle(arr){
	var i, r = [];
	
	for(i in arr) r.push(arr[i]);
	r.sort(function(a, b){ return Math.random() - 0.5; });
	
	return r;
}
function getChar(text){
	var my = this;
	
	switch(Const.GAME_TYPE[my.mode]){
		case 'EKT': return text.slice(text.length - 3);
		case 'ESH':
		case 'EBT':
		case 'KKT':
		case 'KSH': return text.slice(-1);
		case 'EAP':
		case 'KAP': return text.charAt(0);
	}
};
function getSubChar(char){
	var my = this;
	var r;
	var c = char.charCodeAt();
	var k;
	var ca, cb, cc;
	
	switch(Const.GAME_TYPE[my.mode]){
		case "EKT":
			if(char.length > 2) r = char.slice(1);
			break;
		case "KKT": case "KSH": case "KAP":
			k = c - 0xAC00;
			if(k < 0 || k > 11171) break;
			ca = [ Math.floor(k/28/21), Math.floor(k/28)%21, k%28 ];
			cb = [ ca[0] + 0x1100, ca[1] + 0x1161, ca[2] + 0x11A7 ];
			cc = false;
			if(cb[0] == 4357){ // ㄹ에서 ㄴ, ㅇ
				cc = true;
				if(RIEUL_TO_NIEUN.includes(cb[1])) cb[0] = 4354;
				else if(RIEUL_TO_IEUNG.includes(cb[1])) cb[0] = 4363;
				else cc = false;
			}else if(cb[0] == 4354){ // ㄴ에서 ㅇ
				if(NIEUN_TO_IEUNG.indexOf(cb[1]) != -1){
					cb[0] = 4363;
					cc = true;
				}
			}
			if(cc){
				cb[0] -= 0x1100; cb[1] -= 0x1161; cb[2] -= 0x11A7;
				r = String.fromCharCode(((cb[0] * 21) + cb[1]) * 28 + cb[2] + 0xAC00);
			}
			break;
		case "ESH": default:
			break;
	}
	return r;
}