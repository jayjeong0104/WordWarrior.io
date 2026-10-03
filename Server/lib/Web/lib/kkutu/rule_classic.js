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

function normalizeClassicRuleList(value){
	if(Array.isArray(value)) return value.filter(function(item){ return item !== null && item !== undefined && item !== ""; });
	if(value === null || value === undefined || value === "") return [];
	return [ value ];
}
function isClassicMissionLetter(value){
	var missions = normalizeClassicRuleList($data && $data.mission);
	return missions.indexOf(String(value)) != -1;
}
function makeClassicRuleHand(type, title, values){
	var list = normalizeClassicRuleList(values);
	return $("<div>").addClass("classic-rule-hand classic-rule-hand-" + type)
		.append($("<div>").addClass("classic-rule-hand-title").text(title))
		.append($("<div>").addClass("classic-rule-hand-value").toggleClass("classic-rule-hand-value-multi", list.length > 1).text(list.join(" ")));
}
function renderClassicRuleItems(data){
	var $items = $stage.game.items.removeClass("classic-rule-items classic-rule-has-ban").empty();
	var missions = normalizeClassicRuleList(data && data.mission);
	var bans = normalizeClassicRuleList(data && data.banLetters);
	$data.mission = data ? data.mission : null;
	if(bans.length) $items.addClass("classic-rule-has-ban");
	if(bans.length) $items.append(makeClassicRuleHand("ban", "BAN", bans));
	if(missions.length) $items.append(makeClassicRuleHand("mission", "MISSION", missions));
	if(data && data.doubleShot){
		$items.append($("<div>").addClass("classic-rule-extra").text((L['optDoubleShot'] || "DoubleShot") + " " + (data.shotIndex || 1) + "/" + (data.shotsTotal || 2)));
	}
	if($items.children().length) $items.addClass("classic-rule-items").show().css('opacity', 1);
	else $items.hide();
}
function setClassicHiddenEntry(active){
	var type = (active && isGameTurnEntryActive()) ? "password" : "text";
	$stage.game.hereText.attr('type', type);
	$stage.talk.attr('type', type);
}
function setClassicChaosTime(active){
	$(".jjo-turn-time,.jjo-round-time").css('visibility', active ? "hidden" : "");
}
function applyClassicExtraScores(list){
	var i, item, $card, $score;
	if(!Array.isArray(list)) return;
	for(i in list){
		item = list[i];
		if(!item || !item.id || !item.score) continue;
		addScore(item.id, Number(item.score));
		$card = $("#game-user-" + item.id);
		$score = $("<div>").addClass("deltaScore lost").html(item.score);
		drawObtainedScore($card, $score);
		updateScore(item.id, getScore(item.id));
	}
}
function isBetaTestMode(){
	return !!($data && $data.room && MODE && MODE[$data.room.mode] == "EBT");
}
var BETA_LONG_WORD_DISPLAY_MIN_LENGTH = 13;
var BETA_LONG_WORD_VFX_MIN_LENGTH = 14;
var BETA_LONG_WORD_LIGHT_MIN_LENGTH = 18;
function setBetaLongWordCssVariable($target, name, value){
	if(!$target || !$target.length) return;
	$target.each(function(){
		if(!this.style || !this.style.setProperty) return;
		if(value === "" || value == null) this.style.removeProperty(name);
		else this.style.setProperty(name, String(value));
	});
}
function clearBetaLongWordDisplayState(){
	var $display = ($stage && $stage.game && $stage.game.display && $stage.game.display.length) ? $stage.game.display : $(".jjo-display");
	var $bar = $display.closest(".jjoDisplayBar");
	var $host = ($stage && $stage.box && $stage.box.game && $stage.box.game.length) ? $stage.box.game : $(".GameBox");
	var cleanupTimer = $host.length ? $host.data("beta-longword-cleanup") : null;

	if(cleanupTimer) clearTimeout(cleanupTimer);
	if($host.length){
		$host.find(".beta-longword-vfx").remove();
		$host.removeData("beta-longword-cleanup");
	}
	if($bar.length){
		$bar.removeClass("beta-longword-active");
		setBetaLongWordCssVariable($bar, "--beta-text-glow", "");
	}
	if($display.length){
		$display.removeClass("beta-longword-active beta-longword-style");
		setBetaLongWordCssVariable($display, "--beta-text-glow", "");
	}
}
function syncBetaLongWordDisplayState(value){
	var raw = String(value == null ? "" : value).trim();
	var compact = raw.replace(/[\s.'-]/g, "");
	var $display = ($stage && $stage.game && $stage.game.display && $stage.game.display.length) ? $stage.game.display : $(".jjo-display");

	clearBetaLongWordDisplayState();
	if(!$display.length) return;
	if(isBetaTestMode() && compact.length >= BETA_LONG_WORD_DISPLAY_MIN_LENGTH){
		$display.addClass("beta-longword-style");
	}
}
function playBetaLongWordVfx(value){
	var raw = String(value || "").trim();
	var compact = raw.replace(/[\s.'-]/g, "");
	var hidden = !!($data && $data.room && $data.room.opts && $data.room.opts.hidden);
	var displayWord = hidden ? "LONG WORD" : ((typeof badWords == "function") ? badWords(raw) : raw);
	var chars = displayWord.replace(/\s/g, "").split("");
	var $host = ($stage && $stage.box && $stage.box.game && $stage.box.game.length) ? $stage.box.game : $(".GameBox");
	var $display = ($stage && $stage.game && $stage.game.display && $stage.game.display.length) ? $stage.game.display : $(".jjo-display");
	var $bar = $display.closest(".jjoDisplayBar");
	var length = compact.length;
	var hasLightEffect = length >= BETA_LONG_WORD_LIGHT_MIN_LENGTH;
	var power = Math.min(1, Math.max(0, (length - 10) / 14));
	var particleCount = Math.min(36, 8 + Math.round(length * 0.72));
	var streakCount = Math.min(12, 4 + Math.floor(length / 4));
	var glow = hasLightEffect ? (0.72 + power * 0.75) : 0;
	var ringScale = 2.55 + power * 1.1;
	var $fx, cleanupTimer, hostRect, displayRect, i, angle, dist, ch, delay;

	if(!isBetaTestMode() || compact.length < BETA_LONG_WORD_VFX_MIN_LENGTH || !$host.length) return;
	$host.find(".beta-longword-vfx").remove();
	cleanupTimer = $host.data("beta-longword-cleanup");
	if(cleanupTimer) clearTimeout(cleanupTimer);
	if($bar.length){
		if(hasLightEffect){
			setBetaLongWordCssVariable($bar, "--beta-text-glow", glow.toFixed(2));
			$bar.removeClass("beta-longword-active");
			if($bar.get(0)) void $bar.get(0).offsetWidth;
			$bar.addClass("beta-longword-active");
		}else{
			$bar.removeClass("beta-longword-active");
			setBetaLongWordCssVariable($bar, "--beta-text-glow", "");
		}
	}
	if($display.length){
		$display.addClass("beta-longword-style");
		if(hasLightEffect){
			setBetaLongWordCssVariable($display, "--beta-text-glow", glow.toFixed(2));
			$display.removeClass("beta-longword-active");
			if($display.get(0)) void $display.get(0).offsetWidth;
			$display.addClass("beta-longword-active");
		}else{
			$display.removeClass("beta-longword-active");
			setBetaLongWordCssVariable($display, "--beta-text-glow", "");
		}
	}
	$fx = $("<div>")
		.addClass("beta-longword-vfx")
		.attr("aria-hidden", "true")
		.attr("style",
			"--beta-glow:" + glow.toFixed(2) + ";" +
			"--beta-ring-scale:" + ringScale.toFixed(2) + ";"
		);
	if($display.length && $display.get(0) && $host.get(0)){
		hostRect = $host.get(0).getBoundingClientRect();
		displayRect = $display.get(0).getBoundingClientRect();
		$fx.css({
			left: (displayRect.left - hostRect.left + displayRect.width * 0.5) + "px",
			top: (displayRect.top - hostRect.top + displayRect.height * 0.5) + "px"
		});
	}
	if(hasLightEffect){
		$fx.append($("<div>").addClass("beta-vfx-ring beta-vfx-ring-a"));
		$fx.append($("<div>").addClass("beta-vfx-ring beta-vfx-ring-b"));
		for(i=0; i<streakCount; i++){
			angle = -32 + i * (64 / Math.max(1, streakCount - 1));
			$fx.append($("<div>").addClass("beta-vfx-streak").attr("style",
				"--beta-angle:" + angle + "deg;" +
				"--beta-delay:" + (i * 18) + "ms;"
			));
		}
	}
	for(i=0; i<particleCount; i++){
		angle = (i * 137) % 360;
		dist = 82 + (i % 6) * 15;
		ch = chars.length ? chars[i % chars.length] : "*";
		delay = 24 + (i % 8) * 12;
		$fx.append($("<div>").addClass("beta-vfx-particle").text(ch).attr("style",
			"--beta-x:" + (Math.cos(angle * Math.PI / 180) * dist).toFixed(1) + "px;" +
			"--beta-y:" + (Math.sin(angle * Math.PI / 180) * dist * 0.58).toFixed(1) + "px;" +
			"--beta-rot:" + ((angle % 80) - 40) + "deg;" +
			"--beta-delay:" + delay + "ms;"
		));
	}
	$host.append($fx);
	$host.data("beta-longword-cleanup", addTimeout(function(){
		$fx.remove();
		$bar.removeClass("beta-longword-active");
		setBetaLongWordCssVariable($bar, "--beta-text-glow", "");
		$display.removeClass("beta-longword-active");
		setBetaLongWordCssVariable($display, "--beta-text-glow", "");
		$host.removeData("beta-longword-cleanup");
	}, 1050));
}
$lib.Classic.roundReady = function(data){
	var i, len = (($data.room.game && $data.room.game.title) ? $data.room.game.title.length : 0);
	var $l;
	
	clearBetaLongWordDisplayState();
	clearBoard();
	$data._roundTime = $data.room.time * 1000;
	$stage.game.display.html(getCharText(data.char, data.subChar));
	$data._chainPassPending = 0;
	$stage.game.chain.show().html($data.chain = 0);
	renderClassicRuleItems(data);
	setClassicChaosTime(!!($data.room.opts && $data.room.opts.chaos));
	setClassicHiddenEntry(false);
	if(isReverseClassicMode(MODE[$data.room.mode])){
		$(".jjoDisplayBar .graph-bar").css({ 'float': "right", 'text-align': "left" });
	}
	drawRound(data.round);
	playSound('round_start');
	recordEvent('roundReady', { data: data });
};
$lib.Classic.turnStart = function(data){
	clearBetaLongWordDisplayState();
	$data.room.game.turn = data.turn;
	if(data.seq) $data.room.game.seq = data.seq;
	if(!($data._tid = $data.room.game.seq[data.turn])) return;
	if($data._tid.robot) $data._tid = $data._tid.id;
	data.id = $data._tid;
	if($data._chainPassPending){
		$data.chain = (Number($data.chain) || 0) + $data._chainPassPending;
		$data._chainPassPending = 0;
		$stage.game.chain.html($data.chain);
	}
	
	$stage.game.display.html($data._char = getCharText(data.char, data.subChar, data.wordLength));
	$(".game-user-current").removeClass("game-user-current");
	$("#game-user-"+data.id).addClass("game-user-current");
	if(!$data._replay){
		$stage.game.here.css('display', (data.id == $data.id) ? "block" : "none");
		setClassicHiddenEntry(!!($data.room.opts && $data.room.opts.hidden && data.id == $data.id));
		if(data.id == $data.id){
			addTimeout(function(){ focusTurnEntryInput(mobile); }, 0);
		}
	}
	renderClassicRuleItems(data);
	setClassicChaosTime(!!($data.room.opts && $data.room.opts.chaos));
	
	ws.onmessage = _onMessage;
	clearInterval($data._tTime);
	clearTrespasses();
	$data._chars = [ data.char, data.subChar ];
	$data._speed = data.speed;
	$data._tTime = addInterval(turnGoing, TICK);
	$data.turnTime = data.turnTime;
	$data._turnTime = data.turnTime;
	$data._roundTime = data.roundTime;
	$data._turnSound = playSound("T"+data.speed);
	recordEvent('turnStart', {
		data: data
	});
};
$lib.Classic.turnGoing = function(){
	if(!$data.room) clearInterval($data._tTime);
	$data._turnTime -= TICK;
	$data._roundTime -= TICK;
	
	if($data.room && $data.room.opts && $data.room.opts.chaos){
		$stage.game.turnBar.width("100%").html("");
		$stage.game.roundBar.width("100%").html("");
	}else{
		$stage.game.turnBar
			.width($data._timePercent())
			.html(($data._turnTime*0.001).toFixed(1) + L['SECOND']);
		$stage.game.roundBar
			.width($data._roundTime/$data.room.time*0.1 + "%")
			.html(($data._roundTime*0.001).toFixed(1) + L['SECOND']);
	}
	
	if(!$stage.game.roundBar.hasClass("round-extreme")) if($data._roundTime <= 5000) $stage.game.roundBar.addClass("round-extreme");
};
$lib.Classic.turnEnd = function(id, data){
	var $sc = $("<div>")
		.addClass("deltaScore")
		.html((data.score > 0) ? ("+" + (data.score - data.bonus)) : data.score);
	var $uc = $(".game-user-current");
	var hi;
	
	clearBetaLongWordDisplayState();
	stopTurnSound();
	addScore(id, data.score);
	clearInterval($data._tTime);
	if(data.ok){
		checkFailCombo();
		clearTimeout($data._fail);
		$stage.game.here.hide();
		$data._chainPassPending = ($data._chainPassPending || 0) + 1;
		pushDisplay(data.value, data.mean, data.theme, data.wc);
		playBetaLongWordVfx(data.value);
	}else{
		checkFailCombo(id);
		$sc.addClass("lost");
		$(".game-user-current").addClass("game-user-bomb");
		$stage.game.here.hide();
		playSound('timeout');
	}
	if(data.hint){
		clearBetaLongWordDisplayState();
		data.hint = data.hint._id;
		hi = data.hint.indexOf($data._chars[0]);
		if(hi == -1) hi = data.hint.indexOf($data._chars[1]);
		
		if(isReverseClassicMode(MODE[$data.room.mode])) $stage.game.display.empty()
			.append($("<label>").css('color', "#AAAAAA").html(data.hint.slice(0, hi)))
			.append($("<label>").html(data.hint.slice(hi)));
		else $stage.game.display.empty()
			.append($("<label>").html(data.hint.slice(0, hi + 1)))
			.append($("<label>").css('color', "#AAAAAA").html(data.hint.slice(hi + 1)));
	}
	if(data.bonus){
		mobile ? $sc.html("+" + (data.score - data.bonus) + "+" + data.bonus) : addTimeout(function(){
			var $bc = $("<div>")
				.addClass("deltaScore bonus")
				.html("+" + data.bonus);
			
			drawObtainedScore($uc, $bc);
		}, 500);
	}
	drawObtainedScore($uc, $sc).removeClass("game-user-current");
	updateScore(id, getScore(id));
	applyClassicExtraScores(data.extraScores);
	setClassicHiddenEntry(false);
};
