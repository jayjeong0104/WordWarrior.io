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

const ROBOT_START_DELAY = [ 900, 650, 340, 140, 20 ];
const ROBOT_TYPE_COEF = [ 900, 560, 320, 130, 30 ];
const ROBOT_THINK_COEF = [ 2.8, 1.7, 0.95, 0.35, 0.08 ];
const ROBOT_HIT_LIMIT = [ 3, 1, 0, 0, 0 ];
const ROBOT_PICK_TOP = [ 7, 6, 4, 2, 1 ];

exports.init = function(_DB, _DIC){
	DB = _DB;
	DIC = _DIC;
};
exports.getTitle = function(){
	var R = new Lizard.Tail();
	var my = this;
	
	setTimeout(function(){
		R.go("①②③④⑤⑥⑦⑧⑨⑩");
	}, 500);
	return R;
};
exports.roundReady = function(){
	var my = this;
	var ijl = my.opts.injpick.length;
	
	clearTimeout(my.game.turnTimer);
	clearTimeout(my.game.robotTimer);
	my.game.late = true;
	my.game.loading = false;
	my.game.round++;
	my.game.roundTime = my.time * 1000;
	if(my.game.round <= my.round){
		my.game.theme = my.opts.injpick[Math.floor(Math.random() * ijl)];
		my.game.chain = [];
		my.game.mission = my.opts.mission ? getMission(my.rule.lang) : null;
		my.byMaster('roundReady', {
			round: my.game.round,
			theme: my.game.theme,
			mission: my.game.mission
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
	my.game.turnTime = 15000 - 1400 * speed;
	my.game.turnAt = (new Date()).getTime();
	my.byMaster('turnStart', {
		turn: my.game.turn,
		speed: speed,
		roundTime: my.game.roundTime,
		turnTime: my.game.turnTime,
		mission: my.game.mission,
		seq: force ? my.game.seq : undefined
	}, true);
	my.game.turnTimer = setTimeout(my.turnEnd, Math.min(my.game.roundTime, my.game.turnTime + 100));
	if(si = my.game.seq[my.game.turn]) if(si.robot){
		my.readyRobot(si);
	}
};
exports.turnEnd = function(){
	var my = this;
	if(!my.game.seq) return;
	var target = DIC[my.game.seq[my.game.turn]] || my.game.seq[my.game.turn];
	var score;
	
	if(my.game.loading){
		my.game.turnTimer = setTimeout(my.turnEnd, 100);
		return;
	}
	if(!my.game.chain) return;
	
	my.game.late = true;
	if(target) if(target.game){
		score = Const.getPenalty(my.game.chain, target.game.score);
		target.game.score += score;
	}
	var game = my.game;
	getAuto.call(my, my.game.theme, 0).then(function(w){
		if(my.game !== game || !my.gaming) return;
		my.byMaster('turnEnd', {
			ok: false,
			target: target ? target.id : null,
			score: score,
			hint: w
		}, true);
		my.game._rrt = setTimeout(my.roundReady, 3000);
	});
	clearTimeout(my.game.robotTimer);
};
exports.submit = function(client, text, data){
	var score, baseScore, l, t;
	var my = this;
	var tv = (new Date()).getTime();
	var mgt = my.game.seq && my.game.seq[my.game.turn];
	var turnToken = my.game.turnToken;
	var chain = my.game.chain;
	
	if(!mgt || !isCurrentSubmission(my, client, turnToken, chain) || my.game.loading) return;
	if(typeof text != "string" || !text) return;
	if(!my.game.theme) return;
	if(my.game.chain.indexOf(text) == -1){
		l = my.rule.lang;
		my.game.loading = true;
		function onDB($doc){
			if(!isCurrentSubmission(my, client, turnToken, chain)){
				releaseSubmission(my, turnToken, chain);
				return;
			}
			function preApproved(){
				if(!isCurrentSubmission(my, client, turnToken, chain)){
					releaseSubmission(my, turnToken, chain);
					return;
				}
				
				my.game.loading = false;
				my.game.late = true;
				clearTimeout(my.game.turnTimer);
				t = tv - my.game.turnAt;
				baseScore = my.getScore(text, t, true);
				score = my.getScore(text, t);
				my.game.chain.push(text);
				my.game.roundTime -= t;
				client.game.score += score;
				client.publish('turnEnd', {
					ok: true,
					value: text,
					mean: $doc.mean,
					theme: $doc.theme,
					wc: $doc.type,
					score: score,
					bonus: (my.game.mission === true) ? score - baseScore : 0,
					baby: $doc.baby
				}, true);
				if(my.game.mission === true){
					my.game.mission = getMission(my.rule.lang);
				}
				my.game.turnTimer = setTimeout(my.turnNext, my.game.turnTime / 6);
				if(!client.robot){
					client.invokeWordPiece(text, 1);
					DB.kkutu[l].update([ '_id', text ]).set([ 'hit', $doc.hit + 1 ]).on();
				}
			}
			function denied(code){
				my.game.loading = false;
				client.publish('turnError', { code: code || 404, value: text }, true);
			}
			if($doc){
				if(typeof $doc.theme != "string" || !$doc.theme.match(toRegex(my.game.theme))) denied(407);
				else preApproved();
			}else{
				denied();
			}
		}
		DB.kkutu[l].findOne([ '_id', text ]).on(onDB);
	}else{
		client.publish('turnError', { code: 409, value: text }, true);
	}
};
exports.getScore = function(text, delay, ignoreMission){
	var my = this;
	var tr = 1 - delay / my.game.turnTime;
	var score = Const.getPreScore(text, my.game.chain, tr);
	var arr;
	
	if(!ignoreMission && my.opts.mission && typeof my.game.mission == "string" && my.game.mission) if(arr = text.match(new RegExp(my.game.mission, "g"))){
		score += score * 0.5 * arr.length;
		my.game.mission = true;
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
	var w, text;
	
	getAuto.call(my, my.game.theme, 2).then(function(list){
		if(!isCurrentSubmission(my, robot, turnToken, chain)) return;
		list = (list || []).filter(function(item){ return item && item._id; });
		if(!list.length) return denied();
		list.sort(function(a, b){ return b.hit - a.hit; });
		if(ROBOT_HIT_LIMIT[level] > (list[0].hit || 0)) return denied();
		pickList(list);
	});
	function denied(){
		text = "... T.T";
		after();
	}
	function pickList(list){
		w = pickThemeRobotWord(list, level, my.game.mission);
		if(w){
			text = w._id;
			delay += 320 * ROBOT_THINK_COEF[level] * (0.45 + Math.random() * 0.55) / Math.max(1, Math.log(1.8 + Math.max(1, w.hit || 0)));
			after();
		}else denied();
	}
	function after(){
		if(!isCurrentSubmission(my, robot, turnToken, chain)) return;
		delay += text.length * ROBOT_TYPE_COEF[level];
		my.game.robotTimer = setTimeout(function(){
			if(isCurrentSubmission(my, robot, turnToken, chain)) my.turnRobot(robot, text);
		}, delay);
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
function pickThemeRobotWord(list, level, mission){
	var top = ROBOT_PICK_TOP[level] || 1;
	var scored = (list || []).slice().sort(function(a, b){
		var diff = getThemeRobotWordScore(b, level, mission) - getThemeRobotWordScore(a, level, mission);
		if(diff) return diff;
		diff = b._id.length - a._id.length;
		if(diff) return diff;
		return (b.hit || 0) - (a.hit || 0);
	});
	if(!scored.length) return null;
	if(level >= 4 || top <= 1) return scored[0];
	return scored[Math.floor(Math.random() * Math.min(top, scored.length))];
}
function getThemeRobotWordScore(item, level, mission){
	var text = item && item._id ? item._id : "";
	var hit = Number(item && item.hit) || 0;
	var len = text.length;
	var missionHits = countThemeRobotMission(text, mission);
	var common = Math.log(hit + 1);
	var rare = Math.max(0, 6 - common * 1.6);
	switch(level){
		case 0: return missionHits * 4 + common * 7 - len * 1.4;
		case 1: return missionHits * 6 + common * 5 - len * 0.3;
		case 2: return missionHits * 10 + len * 1.6 + common;
		case 3: return missionHits * 15 + len * 2.4 + rare * 4;
		default: return missionHits * 22 + len * 3 + rare * 6 + (hit <= 1 ? 4 : 0);
	}
}
function countThemeRobotMission(text, mission){
	var arr;
	if(!mission || mission === true) return 0;
	arr = text.match(new RegExp(mission, "g"));
	return arr ? arr.length : 0;
}
function toRegex(theme){
	return new RegExp(`(^|,)${theme}($|,)`);
}
function getMission(l){
	var arr = (l == "ko") ? Const.MISSION_ko : Const.MISSION_en;
	
	if(!arr) return "-";
	return arr[Math.floor(Math.random() * arr.length)];
}
function getAuto(theme, type){
	/* type
		0 무작위 단어 하나
		1 존재 여부
		2 단어 목록
	*/
	var my = this;
	var R = new Lizard.Tail();
	var bool = type == 1;
	
	var aqs = [[ 'theme', toRegex(theme) ]];
	var aft;
	var raiser;
	var lst = false;
	
	if(my.game.chain) aqs.push([ '_id', { '$nin': my.game.chain } ]);
	raiser = DB.kkutu[my.rule.lang].find.apply(this, aqs).limit(bool ? 1 : 123);
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
	raiser.on(aft);
	
	return R;
}