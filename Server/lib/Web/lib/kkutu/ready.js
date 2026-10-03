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

$(document).ready(function(){
	var i;
	
	$data.PUBLIC = $("#PUBLIC").html() == "true";
	$data.URL = $("#URL").html();
	$data.version = $("#version").html();
	var serverMatch = location.href.match(/[?&]server=(\d+)/);
	$data.server = serverMatch ? serverMatch[1] : "0";
	$data.shop = {};
	$data._okg = 0;
	$data._playTime = 0;
	$data._kd = "";
	$data._timers = [];
	$data._obtain = [];
	$data._wblock = {};
	$data._shut = {};
	$data.usersR = {};
	$data.clan = { my: null, list: [] };
	$data._myInfo = false;
	$data._shop = false;
	$data._shopCart = [];
	$data._shopPreviewOriginal = false;
	$data._clans = false;
	$data._friends = {};
	$data._communityOpen = false;
	$data._match1v1Open = false;
	$data._match1v1Searching = false;
	$data._match1v1Status = "";
	$data._match1v1SearchStartedAt = 0;
	$data._communityTab = "lobby";
	$data._communityRanking = null;
	$data._communityRankingLoading = false;
	$data._communityRankingError = "";
	$data._communityLibraryQuery = "";
	$data._communityLibraryLoading = false;
	$data._communityLibraryResult = null;
	$data._communityVocab = null;
	$data._communityVocabLoading = false;
	$data._communityVocabError = "";
	$data._communityVocabStatus = "";
	$data._communityVocabSelected = "";
	$data._communityVocabDetail = "";
	$data._communityLobbyTalk = "";
	$data._communityLobbyChatLog = [];
	$data._chatHistory = [];
	$data._inGameChatCollapsed = false;
	$data._friendSearchQuery = "";
	$data._friendSearchResults = null;
	$data._friendSearchLoading = false;
	$data._friendPending = {};
	$data._pendingFriendAddTarget = "";
	$data._communityRankingSeq = 0;
	$data._communityLibrarySeq = 0;
	$("#top-profile-card").removeClass("myinfo-open");
	EXP.push(getRequiredScore(1));
	for(i=2; i<MAX_LEVEL; i++){
		EXP.push(EXP[i-2] + getRequiredScore(i));
	}
	EXP[MAX_LEVEL - 1] = Infinity;
	EXP.push(Infinity);
	$stage = {
		loading: $("#Loading"),
		lobby: {
			userListTitle: $(".UserListBox .product-title"),
			userList: $(".UserListBox .product-body"),
			roomListTitle: $(".RoomListBox .product-title"),
			roomList: $(".RoomListBox .product-body"),
			createBanner: $("<div>").addClass("rooms-item rooms-create").append($("<div>").html(L['newRoom']))
		},
		chat: $("#Chat"),
		chatLog: $("#chat-log-board"),
		talk: $("#Talk"),
		chatBtn: $("#ChatBtn"),
		menu: {
			help: $("#HelpBtn"),
			setting: $("#SettingBtn"),
			community: $("#CommunityBtn"),
			clans: $("#ClansBtn"),
			newRoom: $("#NewRoomBtn"),
			setRoom: $("#SetRoomBtn"),
			quickRoom: $("#QuickRoomBtn"),
			match1v1: $("#Match1v1Btn"),
			spectate: $("#SpectateBtn"),
			shop: $("#ShopBtn"),
			dict: $("#DictionaryBtn"),
			wordPlus: $("#WordPlusBtn"),
			invite: $("#InviteBtn"),
			practice: $("#PracticeBtn"),
			ready: $("#ReadyBtn"),
			start: $("#StartBtn"),
			exit: $("#ExitBtn"),
			notice: $("#NoticeBtn"),
			replay: $("#ReplayBtn"),
			leaderboard: $("#LeaderboardBtn")
		},
		dialog: {
			setting: $("#SettingDiag"),
				settingServer: $("#setting-server"),
			settingOK: $("#setting-ok"),
			community: $("#CommunityDiag"),
				commFriends: $("#comm-friends"),
				commFriendAdd: $("#comm-friend-add"),
				commFriendQuery: $("#comm-friend-query"),
				commFriendSearch: $("#comm-friend-search"),
				commFriendResults: $("#comm-friend-results"),
			notice: $("#NoticeDiag"),
				noticeList: $("#notice-list"),
				noticeEmpty: $("#notice-empty"),
			warning: $("#WarningDiag"),
				warningMessage: $("#warning-message"),
				warningOK: $("#warning-ok"),
				warningCancel: $("#warning-cancel"),
				warningOverlay: $("#WarningOverlay"),
			room: $("#RoomDiag"),
				roomOK: $("#room-ok"),
			quick: $("#QuickDiag"),
				quickOK: $("#quick-ok"),
			result: $("#ResultDiag"),
				resultOK: $("#result-ok"),
				resultSave: $("#result-save"),
			practice: $("#PracticeDiag"),
				practiceOK: $("#practice-ok"),
			dict: $("#DictionaryDiag"),
				dictInjeong: $("#dict-injeong"),
				dictSearch: $("#dict-search"),
			wordPlus: $("#WordPlusDiag"),
				wordPlusOK: $("#wp-ok"),
			invite: $("#InviteDiag"),
				inviteList: $(".invite-board"),
				inviteRobot: $("#invite-robot"),
			roomInfo: $("#RoomInfoDiag"),
				roomInfoJoin: $("#room-info-join"),
			profile: $("#ProfileDiag"),
				profileFriend: $("#profile-friend"),
				profileShut: $("#profile-shut"),
				profileHandover: $("#profile-handover"),
				profileKick: $("#profile-kick"),
				profileLevel: $("#profile-level"),
				profileDress: $("#profile-dress"),
				profileWhisper: $("#profile-whisper"),
			kickVote: $("#KickVoteDiag"),
				kickVoteY: $("#kick-vote-yes"),
				kickVoteN: $("#kick-vote-no"),
			purchase: $("#PurchaseDiag"),
				purchaseOK: $("#purchase-ok"),
				purchaseNO: $("#purchase-no"),
			replay: $("#ReplayDiag"),
				replayView: $("#replay-view"),
			leaderboard: $("#LeaderboardDiag"),
				lbTable: $("#ranking tbody"),
				lbPage: $("#lb-page"),
				lbNext: $("#lb-next"),
				lbMe: $("#lb-me"),
				lbPrev: $("#lb-prev"),
			dress: $("#DressDiag"),
				dressOK: $("#dress-ok"),
			charFactory: $("#CharFactoryDiag"),
				cfCompose: $("#cf-compose"),
			injPick: $("#InjPickDiag"),
				injPickAll: $("#injpick-all"),
				injPickNo: $("#injpick-no"),
				injPickOK: $("#injpick-ok"),
			chatLog: $("#ChatLogDiag"),
			obtain: $("#ObtainDiag"),
				obtainOK: $("#obtain-ok"),
			help: $("#HelpDiag")
		},
		box: {
			chat: $(".ChatBox"),
			userList: $(".UserListBox"),
			roomList: $(".RoomListBox"),
			match1v1: $(".Match1v1Box"),
			shop: $(".ShopBox"),
			clans: $(".ClanBox"),
			friends: $(".FriendsBox"),
			myInfo: $(".MyInfoBox"),
			room: $(".RoomBox"),
			game: $(".GameBox"),
			me: $(".MeBox")
		},
		game: {
			display: $(".jjo-display"),
			hints: $(".GameBox .hints"),
			cwcmd: $(".GameBox .cwcmd"),
			bb: $(".GameBox .bb"),
			items: $(".GameBox .items"),
			chain: $(".GameBox .chain"),
			round: $(".rounds"),
			here: $(".game-input").hide(),
			hereText: $("#game-input"),
			history: $(".history"),
			roundBar: $(".jjo-round-time .graph-bar"),
			turnBar: $(".jjo-turn-time .graph-bar")
		},
		yell: $("#Yell").hide(),
		balloons: $("#Balloons")
	};
	syncRankedMenuLabel();
	var noticeListNode = $stage.dialog.noticeList && $stage.dialog.noticeList[0];
	if(window.MutationObserver && noticeListNode && noticeListNode.nodeType){
		(new MutationObserver(syncNoticeEmptyState)).observe(noticeListNode, {
			childList: true
		});
	}
	bindReadyHoverSmoothing();
	bindMenuToggleGlassFlash();
	bindMyInfoOutsideClose();
	syncNoticeEmptyState();
	$("#top-settings-btn").off("click").on("click", function(e){
		if(e && e.preventDefault) e.preventDefault();
		if(e && e.stopImmediatePropagation) e.stopImmediatePropagation();
		else if(e && e.stopPropagation) e.stopPropagation();
		toggleSettingsDialog();
	});
	$("#top-help-btn").on("click", function(){
		if($stage && $stage.menu && $stage.menu.help && $stage.menu.help.length){
			$stage.menu.help.trigger("click");
		}else if($stage && $stage.dialog && $stage.dialog.help){
			showDialog($stage.dialog.help);
		}
	});
	$("#top-notice-btn").on("click", function(e){
		if(e && e.stopPropagation) e.stopPropagation();
		openNoticeDialog();
	});
	$("#top-login-btn").on("click", function(e){
		if(e && e.stopPropagation) e.stopPropagation();
		location.href = "/login?desc=login_kkutu";
	});
	$("#top-profile-card .top-profile-main").on("click", function(){
		if(!canOpenMyInfoInCurrentView()) return;
		$data._myInfo = !$data._myInfo;
		if($data._myInfo){
			clearLobbySidePageIntent();
			$data._shop = false;
			$data._clans = false;
			$data._communityOpen = false;
			closeMatch1v1LobbyView(true);
			if($stage.menu.shop && $stage.menu.shop.length){
				$stage.menu.shop.removeClass("toggled");
			}
			if($stage.menu.clans && $stage.menu.clans.length){
				$stage.menu.clans.removeClass("toggled");
			}
			if($stage.menu.community && $stage.menu.community.length){
				$stage.menu.community.removeClass("toggled");
			}
		}
		updateUI();
	});
	function toggleMyInfoFromSidebar(e){
		if(e && e.preventDefault) e.preventDefault();
		if(e && e.stopPropagation) e.stopPropagation();
		$("#top-profile-card .top-profile-main").trigger("click");
		return false;
	}
	$(document).on("click", "#online-myinfo-card", toggleMyInfoFromSidebar);
	$(document).on("keydown", "#online-myinfo-card", function(e){
		if(e.key == "Enter" || e.key == " " || e.which == 13 || e.which == 32) toggleMyInfoFromSidebar(e);
	});
	$(document).on("click", ".myinfo-tab", function(){
		var $tab = $(this);
		var section = $tab.data("section");
		var $box = $(".MyInfoBox");
		if(!section || !$box.length) return;
		$box.find(".myinfo-tab").removeClass("active");
		$tab.addClass("active");
		$box.find(".myinfo-section").removeClass("is-active");
		$box.find('.myinfo-section[data-section="'+section+'"]').addClass("is-active");
		if(section === "profile") renderMyInfoProfile();
		else if(section === "inventory") scheduleMyInfoInventoryRender();
		else if(section === "letter-merger") scheduleMyInfoLetterMergerRender();
		else if(section === "replay") renderMyInfoReplay();
		else if(section === "settings") renderMyInfoSettings();
	});
	if(_WebSocket == undefined){
		loading(L['websocketUnsupport']);
		alert(L['websocketUnsupport']);
		return;
	}
	$data._soundList = [
		{ key: "k", value: "/media/kkutu/k.mp3" },
		{ key: "lobby", value: "/media/kkutu/LobbyBGM.mp3" },
		{ key: "jaqwi", value: "/media/kkutu/JaqwiBGM.mp3" },
		{ key: "jaqwiF", value: "/media/kkutu/JaqwiFastBGM.mp3" },
		{ key: "game_start", value: "/media/kkutu/game_start.mp3" },
		{ key: "round_start", value: "/media/kkutu/round_start.mp3" },
		{ key: "fail", value: "/media/kkutu/fail.mp3" },
		{ key: "timeout", value: "/media/kkutu/timeout.mp3" },
		{ key: "lvup", value: "/media/kkutu/lvup.mp3" },
		{ key: "Al", value: "/media/kkutu/Al.mp3" },
		{ key: "success", value: "/media/kkutu/success.mp3" },
		{ key: "missing", value: "/media/kkutu/missing.mp3" },
		{ key: "mission", value: "/media/kkutu/mission.mp3" },
		{ key: "kung", value: "/media/kkutu/kung.mp3" },
		{ key: "horr", value: "/media/kkutu/horr.mp3" },
		{ key: "profile_dress", value: "/media/kkutu/sfx/Your%20Profile.mp3" },
		{ key: "store_item_click", value: "/media/kkutu/sfx/store%20item%20click.mp3" },
	];
	for(i=0; i<=10; i++) $data._soundList.push(
		{ key: "T"+i, value: "/media/kkutu/T"+i+".mp3" },
		{ key: "K"+i, value: "/media/kkutu/K"+i+".mp3" },
		{ key: "As"+i, value: "/media/kkutu/As"+i+".mp3" }
	);
	loadSounds($data._soundList);
	processShop(connect);
	delete $data._soundList;
	
	MOREMI_PART = $("#MOREMI_PART").html().split(',');
	AVAIL_EQUIP = $("#AVAIL_EQUIP").html().split(',');
	RULE = JSON.parse($("#RULE").html());
	OPTIONS = JSON.parse($("#OPTIONS").html());
	MODE = Object.keys(RULE);
	mobile = $("#mobile").html() == "true";
	if(mobile) TICK = 200;
	$data._timePercent = false ? function(){
		return $data._turnTime / $data.turnTime * 100 + "%";
	} : function(){
		var turnSound = $data._turnSound;
		var pos = turnSound ? (turnSound.audio ? turnSound.audio.currentTime : (audioContext.currentTime - turnSound.startedAt)) : 0;
		
		return (100 - pos/$data.turnTime*100000) + "%";
	};
	$data.setRoom = function(id, data){
		var isLobby = getOnly() == "for-lobby";
		
	if(data == null){
			if($data._roomThemeMap) delete $data._roomThemeMap[String(id)];
			delete $data.rooms[id];
			if(isLobby) $("#room-" + id).remove();
		}else{
			// $data.rooms[id] = data;
			data.id = data.id || id;
			attachRoomTheme(data);
			if(isLobby && !$data.rooms[id]) $stage.lobby.roomList.append($("<div>").attr('id', "room-" + id));
			$data.rooms[id] = data;
			if(isLobby) $("#room-" + id).replaceWith(roomListBar(data));
		}
		// updateRoomList();
	};
	$data.setUser = function(id, data){
		var only = getOnly();
		var needed = only == "for-lobby" || only == "for-master";
		var $obj;
		
		if($data._replay){
			$rec.users[id] = data;
			return;
		}
		if(data == null){
			delete $data.users[id];
			if(needed) $("#users-item-" + id + ",#invite-item-" + id).remove();
		}else{
			if(needed && !$data.users[id]){
				$obj = userListBar(data, only == "for-master");
				
				if(only == "for-master") $stage.dialog.inviteList.append($obj);
				else $stage.lobby.userList.append($obj);
			}
			$data.users[id] = data;
			if(needed){
				if($obj) $("#" + $obj.attr('id')).replaceWith($obj);
				else $("#" + ((only == "for-lobby") ? "users-item-" : "invite-item") + id).replaceWith(userListBar(data, only == "for-master"));
			}
		}
	};
	function setGameTurnInputActive(active){
		$stage.game.here.css('display', active ? "block" : "none");
		$stage.game.hereText.prop('readonly', !active);
		if(!active) $stage.game.hereText.val("");
	}
	function focusInputAtEnd($input, clear){
		var input, length;
		
		if(!$input || !$input.length) return;
		if(clear) $input.val("");
		try{
			$input.focus();
			input = $input.get(0);
			if(input && input.setSelectionRange){
				length = String($input.val() || "").length;
				input.setSelectionRange(length, length);
			}
		}catch(e){
		}
	}
	function focusGameTurnInput(clear){
		var $target;
		try{
			if(!isGameTurnEntryActive()){
				resetRoomChatInputState();
				return;
			}
			if(clear){
				$stage.talk.val("");
				$stage.game.hereText.val("");
			}
			$stage.game.hereText.prop('readonly', false);
			$target = (mobile || !$stage.talk.is(':visible')) ? $stage.game.hereText : $stage.talk;
			if($target.get(0) == $stage.game.hereText.get(0)) $stage.game.hereText.prop('readonly', false);
			else $stage.game.hereText.val($stage.talk.val());
			focusInputAtEnd($target, false);
			addTimeout(function(){
				$stage.game.hereText.prop('readonly', false);
				$target = (mobile || !$stage.talk.is(':visible')) ? $stage.game.hereText : $stage.talk;
				if($target.get(0) != $stage.game.hereText.get(0)) $stage.game.hereText.val($stage.talk.val());
				focusInputAtEnd($target, false);
			}, 80);
		}catch(e){
			if(window.console && console.warn) console.warn("turn input focus failed", e);
		}
	}
	function focusTurnEntryInput(clear){
		focusGameTurnInput(clear);
	}
	function isGameTurnEntryActive(){
		return !!($data.room && $data.room.gaming && getOnly() == "for-gaming" && $stage.game.here.is(':visible'));
	}
	function resetRoomChatInputState(){
		if(!$stage || !$stage.talk || !$stage.talk.length) return;
		$stage.talk.prop('readonly', false).prop('disabled', false).attr('type', 'text');
	}

// 媛앹껜 ?ㅼ젙
	/*addTimeout(function(){
		$("#intro-start").hide();
		$("#intro").show();
	}, 1400);*/
	$(document).on('paste', function(e){
		if($data.room) if($data.room.gaming){
			e.preventDefault();
			return false;
		}
	});
	$stage.talk.on('drop', function(e){
		if($data.room) if($data.room.gaming){
			e.preventDefault();
			return false;
		}
	});
	$data.opts = $.cookie('kks');
	try{
		applyOptions($data.opts ? JSON.parse($data.opts) : {});
	}catch(e){
		applyOptions({});
	}
	$(".dialog-head").on('mousedown', function(e){
		if(e.which && e.which !== 1) return;
		var $pd = $(e.currentTarget).parents(".dialog");
		
		$(".dialog-front").removeClass("dialog-front");
		$pd.addClass("dialog-front");
		startDrag($pd, e.clientX, e.clientY);
	});
	// addInterval(checkInput, 1);
	$stage.chatBtn.on('click', function(e){
		checkInput();
		
		var turnEntryActive = isGameTurnEntryActive();
		var value = turnEntryActive
			? $stage.game.hereText.val()
			: $stage.talk.val();
		var trimmedValue = String(value || "").trim();
		if(turnEntryActive && !isValidCapsTurnEntryValue(trimmedValue)){
			notice(L['capsRuleNotice'] || "Type the word in capital letters.");
			return;
		}
		if(!trimmedValue) return;
		var o = { value: trimmedValue };
		if(o.value[0] == "/"){
			o.cmd = o.value.split(" ");
			runCommand(o.cmd);
		}else{
			if(turnEntryActive || $data._relay){
				o.relay = true;
			}
			send('talk', o);
		}
		if($data._whisper){
			$stage.talk.val("/e " + $data._whisper + " ");
			delete $data._whisper;
		}else{
			$stage.talk.val("");
		}
		$stage.game.hereText.val("");
	}).hotkey($stage.talk, 13).hotkey($stage.game.hereText, 13);
	$("#cw-q-input").on('keydown', function(e){
		if(e.keyCode == 13){
			var $target = $(e.currentTarget);
			var value = $target.val();
			var o = { relay: true, data: $data._sel, value: value };
			
			if(!value) return;
			send('talk', o);
			$target.val("");
		}
	}).on('focusout', function(e){
		$(".cw-q-body").empty();
		$stage.game.cwcmd.css('opacity', 0);
	});
	$("#room-limit").on('change', function(e){
		var $target = $(e.currentTarget);
		var value = $target.val();
		
		if(value < 2 || value > 12){
			$target.css('color', "#FF4444");
		}else{
			$target.css('color', "");
		}
	});
	$("#room-round").on('change', function(e){
		var $target = $(e.currentTarget);
		var value = $target.val();
		
		if(value < 1 || value > 10){
			$target.css('color', "#FF4444");
		}else{
			$target.css('color', "");
		}
	});
	$stage.game.here.on('click', function(e){
		if($stage.game.here.is(':visible')){
			$stage.game.hereText.prop('readonly', false).focus();
		}
	});
	function isCapsRuleActive(){
		return !!($data.room && $data.room.gaming && $data.room.opts && $data.room.opts.caps && $stage.game.here.is(':visible'));
	}
	function normalizeTurnEntryValue(value){
		return String(value == null ? "" : value);
	}
	function isValidCapsTurnEntryValue(value){
		value = String(value == null ? "" : value);
		if(!isCapsRuleActive()) return true;
		return !(/[a-z]/.test(value) || !/[A-Z]/.test(value));
	}
	function rejectCapsLockInput(e){
		if(!isCapsRuleActive()) return false;
		if(e && typeof e.getModifierState == "function" && e.getModifierState("CapsLock")){
			e.preventDefault();
			notice(L['capsLockBlocked'] || "Caps Lock is disabled in Caps mode.");
			return true;
		}
		return false;
	}
	$stage.talk.off('.turnsync').on('input.turnsync keyup.turnsync', function(e){
		var value = normalizeTurnEntryValue($stage.talk.val());
		$stage.talk.val(value);
		if(isGameTurnEntryActive()){
			$stage.game.hereText.prop('readonly', false).val(value);
		}
	}).off('keydown.capsrule').on('keydown.capsrule', function(e){
		if(rejectCapsLockInput(e)) return false;
	});
	$stage.game.hereText.off('.turnsync').on('input.turnsync keyup.turnsync', function(e){
		if(!isGameTurnEntryActive()) return;
		var value = normalizeTurnEntryValue($stage.game.hereText.val());
		$stage.game.hereText.val(value);
		$stage.talk.val(value);
	}).off('keydown.capsrule').on('keydown.capsrule', function(e){
		if(rejectCapsLockInput(e)) return false;
	});
	function setTurnEntryValue(value){
		value = normalizeTurnEntryValue(value);
		$stage.game.hereText.prop('readonly', false).val(value);
		$stage.talk.val(value);
	}
	function getTurnEntryValue(){
		return String($stage.game.hereText.val() || $stage.talk.val() || "");
	}
	function shouldCaptureTurnKey(e){
		var target = e.target;
		var $target;
		var tag;

		if(!isGameTurnEntryActive()) return false;
		if(e.ctrlKey || e.metaKey || e.altKey) return false;
		if(!target) return true;
		if(target == $stage.game.hereText.get(0) || target == $stage.talk.get(0)) return false;
		$target = $(target);
		tag = String(target.tagName || "").toLowerCase();
		if($target.is("input, textarea, select") || target.isContentEditable || tag == "button") return false;
		return true;
	}
	$(document).off('keydown.turninputcatch').on('keydown.turninputcatch', function(e){
		var key;
		var value;

		if(!shouldCaptureTurnKey(e)) return;
		key = e.key;
		if(key == "Enter"){
			e.preventDefault();
			$stage.chatBtn.trigger('click');
			return;
		}
		if(key == "Backspace"){
			e.preventDefault();
			value = getTurnEntryValue();
			setTurnEntryValue(value.slice(0, -1));
			return;
		}
		if(key == "Delete"){
			e.preventDefault();
			setTurnEntryValue("");
			return;
		}
		if(key && key.length == 1){
			if(rejectCapsLockInput(e)) return;
			e.preventDefault();
			setTurnEntryValue(getTurnEntryValue() + key);
		}
	});
	$(window).on('beforeunload', function(e){
		if($data.room) return L['sureExit'];
	});
	$(window).on('pagehide', function(){
		clearCommunityLobbyChatState();
	});
	function startDrag($diag, sx, sy){
		stopDrag();
		var $middle = $("#Middle");
		var middleRect = $middle.length ? $middle.get(0).getBoundingClientRect() : { left: 0, top: 0, right: 0 };
		var scale = $middle.length ? ($middle.data("scale") || 1) : 1;
		var midWidth = $middle.length ? $middle.outerWidth() : 0;
		var originCss = $middle.length ? window.getComputedStyle($middle.get(0)).transformOrigin : "0px 0px";
		var originRight = originCss.indexOf("100%") === 0 || originCss.indexOf("right") === 0;
		var currentLeft = parseFloat($diag.css("left")) || 0;
		var currentTop = parseFloat($diag.css("top")) || 0;
		var startX = originRight
			? (midWidth - (middleRect.right - sx) / scale)
			: ((sx - middleRect.left) / scale);
		var startY = (sy - middleRect.top) / scale;
		var origin = {
			left: startX - currentLeft,
			top: startY - currentTop
		};
		$(window).on('mousemove.dialogdrag', function(e){
			if(typeof e.buttons === "number" && (e.buttons & 1) === 0){
				stopDrag();
				return;
			}
			if(typeof e.buttons === "undefined" && e.which === 0){
				stopDrag();
				return;
			}
			var mx = originRight
				? (midWidth - (middleRect.right - e.clientX) / scale)
				: ((e.clientX - middleRect.left) / scale);
			var my = (e.clientY - middleRect.top) / scale;
			var left = mx - origin.left;
			var top = my - origin.top;
			$diag.css('left', left);
			$diag.css('top', top);
		});
		$(window).on('mouseup.dialogdrag blur.dialogdrag', function(){
			stopDrag();
		});
		$(document).on('mouseup.dialogdrag', function(){
			stopDrag();
		});
	}
	function stopDrag($diag){
		$(window).off('.dialogdrag');
		$(document).off('.dialogdrag');
	}
	$(".result-me-gauge .graph-bar").addClass("result-me-before-bar");
	$(".result-me-gauge")
		.append($("<div>").addClass("graph-bar result-me-current-bar"))
		.append($("<div>").addClass("graph-bar result-me-bonus-bar"));
// 硫붾돱 踰꾪듉
	for(i in $stage.dialog){
		if($stage.dialog[i].children(".dialog-head").hasClass("no-close")) continue;
		
		$stage.dialog[i].children(".dialog-head").append($("<div>").addClass("closeBtn").on('click', function(e){
			$(e.currentTarget).parent().parent().hide();
		}).hotkey(false, 27));
	}
	$stage.dialog.warningOK.on('click', function(){
		closeWarningDialog(true);
	});
	$stage.dialog.warningCancel.on('click', function(){
		closeWarningDialog(false);
	});
	$stage.dialog.warning.on('click mousedown', function(e){
		e.stopPropagation();
	});
	$stage.dialog.warningOverlay.on('click', function(e){
		if(e.target !== e.currentTarget) return;
		if($data._warningDialog && $data._warningDialog.mode == "alert") return;
		closeWarningDialog(false);
	});
	$(document).on('keydown.warningDialog', function(e){
		if(e.which == 27 && $stage.dialog.warning.is(":visible")){
			if($data._warningDialog && $data._warningDialog.mode == "alert") return;
			e.preventDefault();
			closeWarningDialog(false);
		}
	});
	$stage.menu.help.on('click', function(e){
		var $help = $("#help-board");
		if(!$help.data("loaded")){
			$help.attr('src', "/help");
			$help.data("loaded", true);
		}
		showDialog($stage.dialog.help);
	});
	$stage.menu.setting.off('click').on('click', function(e){
		if(e && e.preventDefault) e.preventDefault();
		if(e && e.stopImmediatePropagation) e.stopImmediatePropagation();
		else if(e && e.stopPropagation) e.stopPropagation();
		toggleSettingsDialog();
	});
	$stage.menu.community.off('click').on('click.communityPage', function(e){
		var willOpen;

		if(getOnly() == "for-lobby" && ensureCommunityPageBox()){
			if(e && e.preventDefault) e.preventDefault();
			if(e && e.stopImmediatePropagation) e.stopImmediatePropagation();
			else if(e && e.stopPropagation) e.stopPropagation();
			willOpen = !(getLobbySidePageStoredIntent() == "community" && ($data._communityOpen || $("body").hasClass("community-open")));
			if(willOpen){
				activateLobbySidePage("community", false);
			}else{
				closeLobbySidePage("community", true);
			}
			return false;
		}
		showDialog($stage.dialog.community);
		refreshFriendSearchResults();
	});
	$stage.dialog.commFriendAdd.on('click', triggerFriendAddPrompt);
	$stage.dialog.commFriendSearch.on('click', function(e){
		if(e && e.preventDefault) e.preventDefault();
		requestFriendSearch();
	});
	$stage.dialog.commFriendQuery.on('keydown', function(e){
		if(e.which == 13){
			e.preventDefault();
			requestFriendSearch();
		}
	});
	$stage.dialog.commFriendQuery.on('input', function(){
		if($.trim($(this).val() || "")) return;
		$data._friendSearchQuery = "";
		$data._friendSearchResults = null;
		$data._friendSearchLoading = false;
		refreshFriendSearchResults();
	});
	refreshFriendSearchResults();
	function ensureDialogOnBody($d){
		if(!$d || !$d.length) return $d;
		if(!$d.data('bodyMounted')){
			$d.appendTo('body');
			$d.data('bodyMounted', true);
		}
		return $d;
	}
	function resetLobbyPanelsForRoomDialog(type){
		var needsReset;

		if(type != 'enter') return;
		if(typeof getOnly == "function" && getOnly() != "for-lobby") return;
		needsReset = !!($data._myInfo || $data._shop || $data._clans || $data._communityOpen || $data._match1v1Open || $data._match1v1Searching || $("body").hasClass("myinfo-open") || $("body").hasClass("clan-open") || $("body").hasClass("community-open") || $("body").hasClass("match1v1-open"));
		closeMatch1v1LobbyView(true);
		$data._myInfo = false;
		$data._shop = false;
		$data._clans = false;
		$data._communityOpen = false;
		clearLobbySidePageIntent();
		$("body").removeClass("myinfo-open clan-open community-open");
		$("#top-profile-card").removeClass("myinfo-open");
		if($stage && $stage.menu){
			if($stage.menu.shop) $stage.menu.shop.removeClass("toggled");
			if($stage.menu.clans) $stage.menu.clans.removeClass("toggled");
			if($stage.menu.community) $stage.menu.community.removeClass("toggled");
		}
		if(typeof toggleMyInfoOverlay == "function") toggleMyInfoOverlay(false);
		if($stage && $stage.loading && $stage.loading.length && !$stage.loading.hasClass("is-interactive")){
			$stage.loading.removeClass("is-interactive").hide().empty();
		}
		if(needsReset && typeof updateUI == "function") updateUI(undefined, true);
	}
	function openRoomDialog(type){
		var $d = ($stage && $stage.dialog && $stage.dialog.room) ? $stage.dialog.room : $("#RoomDiag");
		var rule;
		var i, k;
		var now;

		$d = ensureDialogOnBody($d);
		if(!$d || !$d.length) return false;
		now = Date.now ? Date.now() : (new Date()).getTime();
		if($data._roomDialogClickGuard && $data._roomDialogClickGuard.type == type && now - $data._roomDialogClickGuard.time < 80){
			return false;
		}
		$data._roomDialogClickGuard = { type: type, time: now };
		if((type == 'setRoom' || type == 'enter') && $data.typeRoom == type && ($d.is(":visible") || $d.css("display") != "none")){
			$d.hide().removeClass("dialog-front");
			return false;
		}
		resetLobbyPanelsForRoomDialog(type);
		if(type == 'setRoom'){
			if(!$data.room) return false;
			rule = RULE[MODE[$data.room.mode]];
			$data.typeRoom = 'setRoom';
			$("#room-title").val($data.room.title || "");
			$("#room-limit").val($data.room.limit);
			$("#room-mode").val($data.room.mode).trigger('change');
			$("#room-round").val($data.room.round);
			$("#room-time").val(rule ? ($data.room.time / rule.time) : $data.room.time);
			for(i in OPTIONS){
				k = OPTIONS[i].name.toLowerCase();
				$("#room-" + k).attr('checked', !!($data.room.opts && $data.room.opts[k]));
			}
			$data._injpick = ($data.room.opts && $data.room.opts.injpick) || [];
			$d.find(".dialog-title").html(L['setRoom']);
		}else{
			$data.typeRoom = 'enter';
			$d.find(".dialog-title").html(L['newRoom']);
		}
		showDialog($d, true);
		return true;
	}
	window.openRoomDialog = openRoomDialog;
	if(/[?&]debugRoomDiag=1(?:&|$)/.test(location.search)){
		setTimeout(function(){
			openRoomDialog('enter');
		}, 1200);
	}
	if(/[?&]debugRoomDiagClick=1(?:&|$)/.test(location.search)){
		setTimeout(function(){
			$("#NewRoomBtn").trigger('click');
		}, 1200);
	}
	if(/[?&]debugRoomDiagHit=1(?:&|$)/.test(location.search)){
		setTimeout(function(){
			var $btn = $("#NewRoomBtn");
			var probe;
			var hit;
			if(!$btn.length) return;
			$btn.css({ width: "334px", height: "78px", "font-size": "34px" });
			probe = $btn.get(0).getBoundingClientRect();
			hit = document.elementFromPoint(Math.round(probe.left + 160), Math.round(probe.top + probe.height * 0.5));
			$("body").attr("data-roomdiag-hit", hit ? (hit.id || hit.className || hit.tagName) : "none");
		}, 4200);
	}
	$stage.menu.newRoom.on('click', function(e){
		e.preventDefault();
		e.stopPropagation();
		openRoomDialog('enter');
	});
	$stage.menu.setRoom.on('click', function(e){
		e.preventDefault();
		e.stopPropagation();
		openRoomDialog('setRoom');
	});
	$(document).off('click.roomdialog', '#NewRoomBtn').on('click.roomdialog', '#NewRoomBtn', function(e){
		e.preventDefault();
		openRoomDialog('enter');
	}).off('click.roomdialog', '#SetRoomBtn').on('click.roomdialog', '#SetRoomBtn', function(e){
		e.preventDefault();
		openRoomDialog('setRoom');
	});
	function updateGameOptions(opts, prefix){
		var i, k;
		
		for(i in OPTIONS){
			k = OPTIONS[i].name.toLowerCase();
			if(opts.indexOf(i) == -1) $("#" + prefix + "-" + k + "-panel").hide();
			else $("#" + prefix + "-" + k + "-panel").show();
		}
	}
	function getGameOptions(prefix){
		var i, name, opts = {};
		
		for(i in OPTIONS){
			name = OPTIONS[i].name.toLowerCase();
			
			if($("#" + prefix + "-" + name).is(':checked')) opts[name] = true;
		}
		return opts;
	}
	function isRoomMatched(room, mode, opts, all){
		var i;
		
		if(!all){
			if(room.gaming) return false;
			if(room.password) return false;
			if(room.players.length >= room.limit) return false;
		}
		if(room.mode != mode) return false;
		for(i in opts) if(!room.opts[i]) return false;
		return true;
	}
	$("#quick-mode, #QuickDiag .game-option").on('change', function(e){
		var val = $("#quick-mode").val();
		var ct = 0;
		var i, opts;
		
		if(e.currentTarget.id == "quick-mode"){
			$("#QuickDiag .game-option").prop('checked', false);
		}
		opts = getGameOptions('quick');
		updateGameOptions(RULE[MODE[val]].opts, 'quick');
		for(i in $data.rooms){
			if(isRoomMatched($data.rooms[i], val, opts, true)) ct++;
		}
		$("#quick-status").html(L['quickStatus'] + " " + ct);
	});
	function openQuickRoomDialog(e){
		if(e && e.preventDefault) e.preventDefault();
		if(e && e.stopPropagation) e.stopPropagation();
		if(getOnly() != "for-lobby") return false;
		showDialog($stage.dialog.quick);
		if($stage.dialog.quick.is(':visible')){
			$("#QuickDiag>.dialog-body").find("*").prop('disabled', false);
			$("#quick-mode").trigger('change');
			$("#quick-queue").html("");
			$stage.dialog.quickOK.removeClass("searching").html(L['OK']);
		}
		return true;
	}
	$stage.menu.quickRoom.on('click', openQuickRoomDialog);
	$(document).off('click.quickroom', '#RoomSearchBtn').on('click.quickroom', '#RoomSearchBtn', openQuickRoomDialog);
	$stage.dialog.quickOK.on('click', function(e){
		var mode = $("#quick-mode").val();
		var opts = getGameOptions('quick');
		
		if(getOnly() != "for-lobby") return;
		if($stage.dialog.quickOK.hasClass("searching")){
			$stage.dialog.quick.hide();
			quickTick();
			openQuickRoomDialog(e);
			return;
		}
		$("#QuickDiag>.dialog-body").find("*").prop('disabled', true);
		$stage.dialog.quickOK.addClass("searching").html("<i class='fa fa-spinner fa-spin'></i> " + L['NO']).prop('disabled', false);
		$data._quickn = 0;
		$data._quickT = addInterval(quickTick, 1000);
		function quickTick(){
			var i, arr = [];
			
			if(!$stage.dialog.quick.is(':visible')){
				clearTimeout($data._quickT);
				return;
			}
			$("#quick-queue").html(L['quickQueue'] + " " + prettyTime($data._quickn++ * 1000));
			for(i in $data.rooms){
				if(isRoomMatched($data.rooms[i], mode, opts)) arr.push(i);
			}
			if(arr.length){
				i = arr[Math.floor(Math.random() * arr.length)];
				$data._preQuick = true;
				$("#room-" + i).trigger('click');
			}
		}
	});
	$stage.menu.match1v1.on('click', function(e){
		if(getOnly() != "for-lobby") return;
		if(e && e.preventDefault) e.preventDefault();
		if(e && e.stopPropagation) e.stopPropagation();
		setMatch1v1LobbyOpen(!$data._match1v1Open);
		updateUI(undefined, true);
	});
	$(document).off('click.match1v1battle', '#Match1v1BattleBtn').on('click.match1v1battle', '#Match1v1BattleBtn', function(e){
		if(e && e.preventDefault) e.preventDefault();
		if(e && e.stopPropagation) e.stopPropagation();
		if(getOnly() != "for-lobby") return false;
		if($data._match1v1Searching){
			cancelMatch1v1Search(false);
			return false;
		}
		setMatch1v1LobbyOpen(true);
		setMatch1v1SearchState(true);
		send('match1v1', {}, true, true);
		return false;
	});
	$("#room-mode").on('change', function(e){
		var v = $("#room-mode").val();
		var rule = RULE[MODE[v]];
		$("#game-mode-expl").html(L['modex' + v]);

		updateGameOptions(rule.opts, 'room');
		
		$data._injpick = [];
		if(rule.opts.indexOf("ijp") != -1) $("#room-injpick-panel").show();
		else $("#room-injpick-panel").hide();
		if(rule.rule == "Typing") $("#room-round").val(3);
		$("#room-time").children("option").each(function(i, o){
			$(o).html(Number($(o).val()) * rule.time + L['SECOND']);
		});
	}).trigger('change');
	$stage.menu.spectate.on('click', function(e){
		var mode = $stage.menu.spectate.hasClass("toggled");
		
		if(mode){
			send('form', { mode: "J" }, false, true);
			$stage.menu.spectate.removeClass("toggled");
		}else{
			send('form', { mode: "S" }, false, true);
			$stage.menu.spectate.addClass("toggled");
		}
	});
	$stage.menu.clans.off('click').on('click.clanPage', function(e){
		var opening;

		if(e && e.preventDefault) e.preventDefault();
		if(e && e.stopImmediatePropagation) e.stopImmediatePropagation();
		else if(e && e.stopPropagation) e.stopPropagation();
		if(getOnly() != "for-lobby") return false;
		ensureClanPageBox();
		opening = !(getLobbySidePageStoredIntent() == "clan" && ($data._clans || $("body").hasClass("clan-open")));
		if(opening){
			activateLobbySidePage("clan", false);
			if(!$data.clan || !Array.isArray($data.clan.list)) send('clanList', {}, true);
		}else{
			closeLobbySidePage("clan", true);
		}
		return false;
	});
	$stage.menu.shop.on('click', function(e){
		$data._myInfo = false;
		$data._clans = false;
		$data._communityOpen = false;
		clearLobbySidePageIntent();
		closeMatch1v1LobbyView(true);
		if($data._shop = !$data._shop){
			loadShop();
			$stage.menu.shop.addClass("toggled");
			if($stage.menu.clans && $stage.menu.clans.length){
				$stage.menu.clans.removeClass("toggled");
			}
			$stage.menu.community.removeClass("toggled");
		}else{
			$stage.menu.shop.removeClass("toggled");
		}
		updateUI();
	});
	$(".shop-type").on('click', function(e){
		var $target = $(e.currentTarget);
		var type = $target.attr('id').slice(10);
		
		$(".shop-type.selected").removeClass("selected");
		$target.addClass("selected");
		
		filterShop(type == 'all' || $target.attr('value'));
	});
	$("#shop-cart-buy").on('click', purchaseShopCart);
	$("#shop-preview-original").on('change', function(e){
		$data._shopPreviewOriginal = $(e.currentTarget).is(':checked');
		renderShopCartState();
	});
	$(document).on('click', '.shop-cart-item-remove', function(e){
		e.preventDefault();
		e.stopPropagation();
		toggleShopCartItem($(e.currentTarget).attr("data-id"));
	});
	$stage.menu.dict.on('click', function(e){
		showDialog($stage.dialog.dict);
	});
	$stage.menu.wordPlus.on('click', function(e){
		showDialog($stage.dialog.wordPlus);
	});
	function openInviteDialog(e){
		if(e && e.preventDefault) e.preventDefault();
		if(e && e.stopPropagation) e.stopPropagation();
		showDialog($stage.dialog.invite);
		updateUserList(true);
		return false;
	}
	$stage.menu.invite.on('click', openInviteDialog);
	$(document).off('click.roomInviteCard', '.room-invite-card').on('click.roomInviteCard', '.room-invite-card', openInviteDialog);
	$(document).off('keydown.roomInviteCard', '.room-invite-card').on('keydown.roomInviteCard', '.room-invite-card', function(e){
		if(e.key == "Enter" || e.key == " " || e.which == 13 || e.which == 32) openInviteDialog(e);
	});
	$stage.menu.practice.on('click', function(e){
		if(RULE[MODE[$data.room.mode]].ai){
			$("#PracticeDiag .dialog-title").html(L['practice']);
			$("#PracticeDiag").removeData("botMode").removeData("profileTarget");
			$("#PracticeDiag").height(135);
			$("#ai-nickname-row").hide();
			$("#ai-nickname").val("").prop('disabled', true);
			$("#practice-ok").text(L['OK'] || "OK");
			$("#ai-team").val(0).prop('disabled', true);
			showDialog($stage.dialog.practice);
		}else{
			send('practice', { level: -1 });
		}
	});
	$stage.menu.ready.on('click', function(e){
		send('ready');
	});
	$stage.menu.start.on('click', function(e){
		send('start');
	});
	$stage.menu.exit.on('click', function(e){
		if($data.room.gaming){
			showWarningDialog(L['sureExit'], function(){
				haltGameAudio();
				if($data.practicing || $data.room.practice) send('leave');
				else send(shouldReturnToRoomOnGameExit() ? 'returnRoom' : 'leave');
			});
			return;
		}
		if($data.resulting) haltGameAudio();
		send('leave');
	});
	$stage.menu.replay.on('click', function(e){
		if($data._replay){
			replayStop();
		}
		showDialog($stage.dialog.replay);
		initReplayDialog();
		if($stage.dialog.replay.is(':visible')){
			$("#replay-file").trigger('change');
		}
	});
	$stage.menu.leaderboard.on('click', function(e){
		$data._lbpage = 0;
		if($stage.dialog.leaderboard.is(":visible")){
			$stage.dialog.leaderboard.hide();
		}else $.get("/ranking", function(res){
			drawLeaderboard(res);
			showDialog($stage.dialog.leaderboard);
		});
	});
	$stage.dialog.lbPrev.on('click', function(e){
		$(e.currentTarget).attr('disabled', true);
		$.get("/ranking?p=" + ($data._lbpage - 1), function(res){
			drawLeaderboard(res);
		});
	});
	$stage.dialog.lbMe.on('click', function(e){
		$(e.currentTarget).attr('disabled', true);
		$.get("/ranking?id=" + $data.id, function(res){
			drawLeaderboard(res);
		});
	});
	$stage.dialog.lbNext.on('click', function(e){
		$(e.currentTarget).attr('disabled', true);
		$.get("/ranking?p=" + ($data._lbpage + 1), function(res){
			drawLeaderboard(res);
		});
	});
	$stage.dialog.settingServer.on('click', function(e){
		location.href = "/";
	});
	$stage.dialog.settingOK.on('click', function(e){
		applyOptions({
			mb: $("#mute-bgm").is(":checked"),
			me: $("#mute-effect").is(":checked"),
			di: $("#deny-invite").is(":checked"),
			dw: $("#deny-whisper").is(":checked"),
			df: $("#deny-friend").is(":checked"),
			ar: $("#auto-ready").is(":checked"),
			su: $("#sort-user").is(":checked"),
			ow: $("#only-waiting").is(":checked"),
			ou: $("#only-unlock").is(":checked"),
			dm: $("#dark-mode").is(":checked")
		});
		$.cookie('kks', JSON.stringify($data.opts));
		$stage.dialog.setting.hide();
	});
	function getProfileIdFromDialog($target){
		var $dialog = $target.closest(".dialog");
		return $dialog.data("profileId") || $data._profiled;
	}
	$(document).on('click', '.js-profile-level', function(e){
		var profileId = getProfileIdFromDialog($(e.currentTarget));
		var robot = ($data.robots && $data.robots[profileId]) || {};
		var profile = ensureAIProfile(robot);

		$("#PracticeDiag").data("profileTarget", profileId);
		$("#PracticeDiag").data("botMode", "setAI");
		$("#PracticeDiag .dialog-title").html(L['robot']);
		$("#PracticeDiag").height(170);
		$("#ai-nickname-row").show();
		$("#ai-nickname").prop('disabled', false)
			.val(robot.nickname || "")
			.attr('placeholder', profile.title || getAIProfile(robot.level).title);
		$("#practice-level").val(robot.level == null ? 2 : robot.level);
		$("#ai-team").val(robot.game && robot.game.team != null ? robot.game.team : 0);
		$("#ai-team").prop('disabled', false);
		$("#practice-ok").text(L['OK'] || "OK");
		showDialog($stage.dialog.practice);
	});
	$stage.dialog.practiceOK.on('click', function(e){
		var level = $("#practice-level").val();
		var team = $("#ai-team").val();
		var botMode = $("#PracticeDiag").data("botMode");
		
		if(botMode == "addAI"){
			send('invite', { target: "AI", level: level, team: team, nickname: $("#ai-nickname").val() });
			$("#PracticeDiag").data("botMode", "addAI").removeData("profileTarget");
			$("#practice-ok").text("ADD");
			return;
		}
		$stage.dialog.practice.hide();
		if($("#PracticeDiag .dialog-title").html() == L['robot']){
			var profileTarget = $("#PracticeDiag").data("profileTarget") || $data._profiled;
			send('setAI', { target: profileTarget, level: level, team: team, nickname: $("#ai-nickname").val() });
		}else{
			send('practice', { level: level });
		}
		$("#PracticeDiag").removeData("profileTarget").removeData("botMode");
		$("#practice-ok").text(L['OK'] || "OK");
	});
	$stage.dialog.roomOK.on('click', function(e){
		var i, k, opts = {
			injpick: $data._injpick
		};
		for(i in OPTIONS){
			k = OPTIONS[i].name.toLowerCase();
			opts[k] = $("#room-" + k).is(':checked');
		}
		send($data.typeRoom, {
			title: $("#room-title").val().trim() || $("#room-title").attr('placeholder').trim(),
			password: $("#room-pw").val(),
			limit: $("#room-limit").val(),
			mode: $("#room-mode").val(),
			round: $("#room-round").val(),
			time: $("#room-time").val(),
			opts: opts,
		});
		$stage.dialog.room.hide();
	});
	$stage.dialog.resultOK.on('click', function(e){
		if($data._resultPage == 1 && $data._resultRank){
			drawRanking($data._resultRank[$data.id]);
			return;
		}
		$data.resulting = false;
		$stage.dialog.result.hide();
		if($data._replay || $data._replayEnded || $data._replayReturnToMyInfo){
			delete $data._resultRank;
			replayStop({ returnToMyInfoReplay: true });
			return;
		}
		delete $data._replay;
		delete $data._resultRank;
		$stage.box.room.height(ROOM_BOX_HEIGHT);
		playLobbyBGMFromGame();
		forkChat();
		if($data.practicing){
			send('leave');
			return;
		}
		updateUI();
	});
	$stage.dialog.resultSave.on('click', function(e){
		var date = new Date($rec.time);
		var blob = new Blob([ JSON.stringify($rec) ], { type: "text/plain" });
		var url = URL.createObjectURL(blob);
		var fileName = "KKuTu" + (
			date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " "
			+ date.getHours() + "-" + date.getMinutes() + "-" + date.getSeconds()
		) + ".kkt";
		var $a = $("<a>").attr({
			'download': fileName,
			'href': url
		}).on('click', function(e){
			$a.remove();
		});
		$("#Jungle").append($a);
		$a[0].click();
	});
	function setDictionaryActionState($button, busy){
		$button.prop('disabled', !!busy).toggleClass('is-working', !!busy);
	}
	function showDictionaryOutput(content){
		var $output = $("#dict-output");

		$output.empty();
		if(content == null) return;
		if(content.jquery || (content && content.nodeType)){
			$output.append(content);
		}else{
			$output.html(content);
		}
	}
	function getDictionaryQuery(){
		var word = ($("#dict-input").val() || "").replace(/[‘’`´]/g, "'").replace(/[^\sa-zA-Z0-9'.\uac00-\ud7a3]/g, "").trim();

		return {
			word: word,
			lang: word.match(/[\uac00-\ud7a3]/) ? 'ko' : 'en'
		};
	}
	function getDictionaryRequestMessage(res){
		if(!res || !res.error) return (res && res.message) || L['dictRequestQueued'];
		switch(res.error){
		case 402: return L['dictRequestLogin'];
		case 403: return L['dictRequestExists'];
		case 409: return L['dictAlreadyExists'];
		default: return (res.message || L['dictRequestFailed']) + (res.error ? " (" + res.error + ")" : "");
		}
	}
	function cleanDictionaryDefinitionText(text){
		return String(text == null ? "" : text)
			.replace(/\uFF02[0-9]+\uFF02/g, " ")
			.replace(/\"[0-9]+\"/g, " ")
			.replace(/\uFF3B[0-9]+\uFF3D/g, " ")
			.replace(/\[[0-9]+\]/g, " ")
			.replace(/\uFF08[0-9]+\uFF09/g, " ")
			.replace(/\([0-9]+\)/g, " ")
			.replace(/\s+/g, " ")
			.trim();
	}
	function isHiddenThemeCode(themeCode){
		return String(themeCode || "").trim() === "e03";
	}
	function getVisibleThemeLabel(themeCode){
		var key = String(themeCode || "").trim();
		var lower = key.toLowerCase();
		var numeric = lower.replace(/^[a-z]+/i, "").replace(/^0+/, "");
		var label;
		if(!key || isHiddenThemeCode(lower)) return "";
		label = L["theme_" + key]
			|| L["theme_" + lower]
			|| (numeric ? L["theme_" + numeric] : "")
			|| "";
		if(label) return label;
		if(/^[a-z]+\d+$/i.test(key)) return "";
		return key;
	}
	function syncGameRuleFromRoom(room){
		var rule = room && RULE && RULE[MODE[room.mode]];
		// The server's mode identifies the rule; several modes share the same title.
		if(rule) $data._activeGameRule = rule.rule;
		else delete $data._activeGameRule;
	}
	function getRoundDisplayLabel(title, index){
		var rule = ((RULE || {})[MODE[$data.room.mode]] || {}).rule;
		var label = (rule === "Daneo") ? "" : String(title || "").charAt(index);
		if(label && /\S/.test(label) && label !== "?" && label !== "\uFFFD") return label;
		return String(index + 1);
	}
	function formatDictionaryDefinitionHtml(text){
		return String(text || "")
			.replace(/\$\$[^\$]+\$\$/g, function(item){
				var txt = item.slice(2, item.length - 2)
					.replace(/\^\{([^\}]+)\}/g, "<sup>$1</sup>")
					.replace(/_\{([^\}]+)\}/g, "<sub>$1</sub>")
					.replace(/\\geq/g, "&ge;");
				return "<equ>" + txt + "</equ>";
			})
			.replace(/\*\*([^\*]+)\*\*/g, "<sup>$1</sup>")
			.replace(/\*([^\*]+)\*/g, "<sub>$1</sub>");
	}
	function splitDictionaryDefinitions(text, pattern){
		return String(text == null ? "" : text)
			.replace(pattern, "\u0000")
			.split("\u0000")
			.map(cleanDictionaryDefinitionText)
			.filter(Boolean);
	}
	function stripDictionaryExampleText(text){
		var value = String(text || "").trim();
		var parts;

		if(!value) return "";
		parts = value.split(/\s*;\s*/).map(function(item){
			return String(item || "").trim();
		}).filter(Boolean);
		if(parts.length) value = parts[0];
		return value
			.replace(/\s+/g, " ")
			.replace(/\s+([,.;:!?])/g, "$1")
			.trim();
	}
	function getDictionaryTypeLabels(wcs){
		return (wcs || []).map(function(item){
			return L['class_' + item] || "";
		});
	}
	function extractDictionaryDefinitions(mean){
		var rawText = String(mean == null ? "" : mean).trim();
		var text;
		var parts;

		if(!rawText) return [];
		parts = splitDictionaryDefinitions(rawText, /\uFF02[0-9]+\uFF02|\"[0-9]+\"/g);

		if(parts.length > 1) return parts;
		parts = splitDictionaryDefinitions(rawText, /\uFF3B[0-9]+\uFF3D|\[[0-9]+\]/g);
		if(parts.length > 1) return parts;
		parts = splitDictionaryDefinitions(rawText, /\uFF08[0-9]+\uFF09|\([0-9]+\)/g);
		text = cleanDictionaryDefinitionText(rawText);
		return (parts.length ? parts : (text ? [ cleanDictionaryDefinitionText(text) ] : []))
			.map(stripDictionaryExampleText)
			.filter(Boolean);
	}
	function isBroadDictionaryThemeCode(themeCode){
		var key = String(themeCode || "").trim().toLowerCase();
		return [ "e05", "e08", "e12", "e13", "e15", "e18", "e20", "e43", "370", "530", "1001" ].indexOf(key) !== -1;
	}
	function isSpecialDictionaryThemeCode(themeCode){
		var key = String(themeCode || "").trim();
		return !!key && !/^e\d+$/i.test(key);
	}
	function addDictionaryEntryTheme(entry, themeInfo){
		var raw = String((themeInfo && themeInfo.raw) || "").trim();
		var label = String((themeInfo && themeInfo.label) || "").trim();
		if(!label) return;
		entry.themes = entry.themes || [];
		if(entry.themes.some(function(item){
			return String(item.raw || "") === raw || String(item.label || "") === label;
		})) return;
		entry.themes.push({ raw: raw, label: label });
	}
	function dictionaryThemeDefinitionScore(text, themeInfo, type){
		var key = String((themeInfo && themeInfo.raw) || "").trim().toUpperCase();
		var label = String((themeInfo && themeInfo.label) || "").trim().toLowerCase();
		var typeCode = String(type || "").trim().toLowerCase();
		var value = String(text || "").toLowerCase();
		if(key == "E18" && /^v/.test(typeCode)) return 0;
		if(key == "530" && /\bmathematical element\b/.test(value)) return 0;
		var tests = {
			"490": [ /\bcomputer\b/, /\bsoftware\b/, /\bprogramming language\b/, /\bmarkup language\b/, /\bprotocol\b/, /\bhypertext\b/, /\bserver\b/, /\bbrowser\b/, /\bdatabase\b/, /\balgorithm\b/, /\binternet\b/, /\btcp\b/ ],
			"CRL": [ /\bclash royale\b/, /\bcrown towers?\b/, /\belixir\b/, /\barena\b/ ],
			"ANIME": [ /\banime\b/, /\bjapanese anime\b/, /\banimated\b/, /\banimation\b/ ],
			"BRAWL": [ /\bbrawl stars\b/ ],
			"MINC": [ /\bminecraft\b/ ],
			"FORT": [ /\bfortnite\b/ ],
			"VALO": [ /\bvalorant\b/ ],
			"PUBG": [ /\bpubg\b/, /\bplayerunknown\b/ ],
			"APEX": [ /\bapex legends\b/ ],
			"OVW": [ /\boverwatch\b/ ],
			"COD": [ /\bcall of duty\b/ ],
			"LOL": [ /\bleague of legends\b/ ],
			"NBAP": [ /\bbasketball\b/ ],
			"SOCP": [ /\bfootball\b/, /\bsoccer\b/ ],
			"VOLL": [ /\bvolleyball\b/ ],
			"BASE": [ /\bbaseball\b/ ],
			"AMFB": [ /\bamerican football\b/, /\bgridiron football\b/ ],
			"e05": [ /\banimal\b/, /\bspecies\b/, /\bboas?\b/ ],
			"e08": [ /\bbody\b/, /\bbone\b/, /\borgan\b/, /\bskin\b/, /\bmuscle\b/ ],
			"e12": [ /\bemotion\b/, /\bfeeling\b/ ],
			"e13": [ /\bfood\b/, /\bbeverage\b/, /\bdrink\b/, /\beat\b/, /\bcrop\b/, /\bsalad\b/, /\bcoffee\b/ ],
			"e15": [ /\bisland\b/, /\bcity\b/, /\btown\b/, /\bcountry\b/, /\bregion\b/, /\bplace\b/, /\blocation\b/ ],
			"e18": [ /\bperson\b/, /\bbeing\b/, /\bhuman\b/, /\bman\b/, /\bwoman\b/, /\bfemale\b/, /\bsorcerer\b/, /\bmagician\b/, /\bbeliever\b/, /\bplayer\b/, /\bmember\b/, /\bpractices\b/ ],
			"e20": [ /\bplant\b/, /\btree\b/, /\bcrop\b/, /\bflower\b/ ],
			"e43": [ /\bweather\b/, /\brain\b/, /\bsnow\b/, /\bwind\b/ ],
			"370": [ /\bmedical\b/, /\bmedicine\b/, /\bdisease\b/, /\bdoctor\b/, /\bhospital\b/, /\bsurgery\b/, /\bsurgical\b/, /\btherapy\b/, /\banatomy\b/, /\bphysiology\b/, /\bsymptom\b/, /\bdiagnosis\b/, /\btreatment\b/, /\bclinical\b/, /\bpathology\b/, /\boncology\b/, /\bcardiology\b/ ],
			"530": [ /\bchemical\b/, /\bchemistry\b/, /\bmolecule\b/, /\bmolecular\b/, /\batoms?\b/, /\batomic\b/, /\belement\b/, /\bcompound\b/, /\bacid\b/, /\boxide\b/, /\balkali\b/, /\bsolvent\b/, /\bcatalyst\b/, /\bionic\b/, /\bcovalent\b/, /\bmetallic\b/, /\ballotropic\b/, /\barsenic\b/, /\bisotope\b/, /\bperiodic table\b/, /\bherbicide\b/, /\binsecticide\b/ ],
			"1001": [ /\bsovereign country\b/, /\brepublic\b/, /\bcountry\b/, /\bnation\b/ ],
			"350": [ /\bsport\b/, /\bplayer\b/, /\bcricket\b/, /\bteam\b/, /\bmatch\b/ ]
		};
		var list = tests[key] || tests[String((themeInfo && themeInfo.raw) || "").trim()] || [];
		var i;
		for(i = 0; i < list.length; i++){
			if(list[i].test(value)) return 100 - i;
		}
		if(label && value.indexOf(label) !== -1) return 40;
		if(label){
			var parts = label.split(/\s+/).filter(function(part){ return part.length > 3; });
			if(parts.length && parts.every(function(part){ return value.indexOf(part) !== -1; })) return 20;
		}
		return 0;
	}
	function normalizeDictionaryDefinitionEntries(entries, themeInfos){
		var normalized = (entries || []).map(function(entry){
			return {
				text: String((entry && entry.text) || "").trim(),
				type: String((entry && entry.type) || "").trim(),
				themes: []
			};
		});
		var infos = (themeInfos || []).filter(function(themeInfo){
			return !!String((themeInfo || {}).label || "").trim();
		});
		var used = [];
		var i, j, bestIndex, bestScore, score, info;

		function isUsed(index){ return used.indexOf(index) !== -1; }
		function markUsed(index){ if(!isUsed(index)) used.push(index); }
		function hasExplicitTheme(entry){
			return (entry.themes || []).some(function(themeInfo){
				return isSpecialDictionaryThemeCode(themeInfo.raw);
			});
		}

		infos.forEach(function(themeInfo, themeIndex){
			bestIndex = -1;
			bestScore = 0;
			for(i = 0; i < normalized.length; i++){
				score = dictionaryThemeDefinitionScore(normalized[i].text, themeInfo, normalized[i].type);
				if(isBroadDictionaryThemeCode(themeInfo.raw) && score > 0){
					addDictionaryEntryTheme(normalized[i], themeInfo);
					bestScore = Math.max(bestScore, score);
					bestIndex = i;
					continue;
				}
				if(score > bestScore){
					bestScore = score;
					bestIndex = i;
				}
			}
			if(bestIndex >= 0 && bestScore > 0){
				if(!isBroadDictionaryThemeCode(themeInfo.raw)) addDictionaryEntryTheme(normalized[bestIndex], themeInfo);
				markUsed(themeIndex);
			}
		});
		for(i = 0; i < infos.length; i++){
			if(isUsed(i)) continue;
			info = infos[i];
			if(!isSpecialDictionaryThemeCode(info.raw) || !/^[A-Z]+$/.test(String(info.raw || ""))) continue;
			for(j = 0; j < normalized.length; j++){
				if(String(normalized[j].type || "").toUpperCase() !== "INJEONG") continue;
				if(hasExplicitTheme(normalized[j])) continue;
				addDictionaryEntryTheme(normalized[j], info);
				markUsed(i);
				break;
			}
		}
		if(normalized.length === 1){
			for(i = 0; i < infos.length; i++){
				if(isUsed(i)) continue;
				addDictionaryEntryTheme(normalized[0], infos[i]);
				markUsed(i);
			}
		}
		return normalized.filter(function(entry){
			return !!(entry.text || (entry.themes && entry.themes.length));
		});
	}
	function extractDictionaryDefinitionEntries(mean, theme, wcs){
		var rawText = String(mean == null ? "" : mean).trim();
		var themeQueue = (theme ? theme.split(",") : []).map(function(item){
			var raw = String(item || "").trim();
			return {
				raw: raw,
				label: String(getVisibleThemeLabel(raw) || "").trim()
			};
		});
		var allThemeInfos = themeQueue.slice();
		var typeQueue = (wcs || []).slice();
		var entries = [];
		var means;
		var remainingThemes;
		var typeCode;

		if(!rawText) return [];
		if(rawText.indexOf("\uFF02") === -1){
			entries = extractDictionaryDefinitions(rawText).map(function(definition, index){
				var themeInfo = themeQueue[index] || {};
				return {
					text: definition,
					theme: String(themeInfo.label || "").trim(),
					rawTheme: String(themeInfo.raw || "").trim(),
					type: String(typeQueue[0] || "").trim()
				};
			});
			return normalizeDictionaryDefinitionEntries(entries, allThemeInfos);
		}
		means = rawText.split(/\uFF02[0-9]+\uFF02/).slice(1).map(function(m1){
			return (m1.indexOf("\uFF3B") == -1) ? [[ m1 ]] : m1.split(/\uFF3B[0-9]+\uFF3D/).slice(1).map(function(m2){
				return m2.split(/\uFF08[0-9]+\uFF09/).slice(1);
			});
		});
		means.forEach(function(m1){
			m1.forEach(function(m2){
				typeCode = String(typeQueue.shift() || "").trim();
				var localThemes = themeQueue.splice(0, m2.length);
				m2.forEach(function(m3){
					var themeInfo = localThemes.shift() || {};
					var themeLabel = String(themeInfo.label || "").trim();
					var definition = stripDictionaryExampleText(cleanDictionaryDefinitionText(m3));
					if(!definition && !themeLabel) return;
					entries.push({
						text: definition,
						theme: themeLabel,
						rawTheme: String(themeInfo.raw || "").trim(),
						type: typeCode
					});
				});
			});
		});
		themeQueue.filter(function(item){
			return !!String((item || {}).label || "").trim();
		}).forEach(function(themeInfo){
			entries.push({
				text: "",
				theme: String(themeInfo.label || "").trim(),
				rawTheme: String(themeInfo.raw || "").trim(),
				type: ""
			});
		});
		return normalizeDictionaryDefinitionEntries(entries, allThemeInfos);
	}
	function buildDictionaryResultView(word, mean, theme, wcs){
		var $view = $("<div>").addClass("word");
		var entries = extractDictionaryDefinitionEntries(mean, theme, wcs);
		var $definitions = $("<div>").addClass("word-definitions");
		if(!entries.length){
			return $view.append($("<div>").addClass("word-definition")
				.append($("<span>").addClass("word-def-text").text(L['wpFail_404'] || "No definition found.")));
		}
		entries.forEach(function(entry, index){
			var $line = $("<div>").addClass("word-definition");
			var $body = $("<span>").addClass("word-def-body");

			$line.append($("<span>").addClass("word-def-index").text((index + 1) + "."));
			(entry.themes || []).forEach(function(themeInfo){
				$body.append($("<span>").addClass("word-theme").text(themeInfo.label));
			});
			if(entry.text){
				$body.append($("<span>").addClass("word-def-text").html(formatDictionaryDefinitionHtml(entry.text)));
			}
			$line.append($body);
			$definitions.append($line);
		});
		$view.append($definitions);
		return $view;
	}
	window.KKUTU_DICTIONARY_CORE = {
		buildResultView: buildDictionaryResultView,
		extractDefinitionEntries: extractDictionaryDefinitionEntries
	};
	$stage.dialog.dictInjeong.on('click', function(e){
		var $target = $(e.currentTarget);
		var query = getDictionaryQuery();
		
		if($target.is(':disabled')) return;
		if(!query.word) return showDictionaryOutput(getDictionaryErrorText(404));
		setDictionaryActionState($target, true);
		showDictionaryOutput(L['searching']);
		$.post("/dict-request", {
			word: query.word,
			lang: query.lang
		}, function(res){
			showDictionaryOutput(getDictionaryRequestMessage(res));
		}).fail(function(xhr){
			var res = xhr && xhr.responseJSON;
			showDictionaryOutput(getDictionaryRequestMessage(res || { error: xhr.status }));
		}).always(function(){
			addTimeout(function(){
				setDictionaryActionState($target, false);
			}, 260);
		});
	});
	$stage.dialog.dictSearch.on('click', function(e){
		var $target = $(e.currentTarget);
		
		if($target.is(':disabled')) return;
		setDictionaryActionState($target, true);
		showDictionaryOutput(L['searching']);
		tryDict($("#dict-input").val(), function(res){
			var errorText;
			addTimeout(function(){
				setDictionaryActionState($target, false);
			}, 260);
			if(res.error){
				errorText = getDictionaryErrorText(res);
				return showDictionaryOutput(errorText);
			}
			
			showDictionaryOutput(buildDictionaryResultView(res.word, res.mean, res.theme, (res.type || "").split(',')));
		});
	}).hotkey($("#dict-input"), 13);
	$stage.dialog.wordPlusOK.on('click', function(e){
		var t;
		if($stage.dialog.wordPlusOK.hasClass("searching")) return;
		if(!(t = $("#wp-input").val())) return;
		t = t.replace(/[^a-z\uac00-\ud7a3]/gi, "");
		if(t.length < 2) return;
		
		$("#wp-input").val("");
		$(e.currentTarget).addClass("searching").html("<i class='fa fa-spin fa-spinner'></i>");
		send('wp', { value: t });
	}).hotkey($("#wp-input"), 13);
	$stage.dialog.inviteRobot.on('click', function(e){
		var profile = getAIProfile(2);

		$("#PracticeDiag").data("botMode", "addAI").removeData("profileTarget");
		$("#PracticeDiag .dialog-title").html(L['robot']);
		$("#PracticeDiag").height(170);
		$("#ai-nickname-row").show();
		$("#ai-nickname").prop('disabled', false).val("").attr('placeholder', profile.title);
		$("#practice-level").val(2);
		$("#ai-team").val(0).prop('disabled', false);
		$("#practice-ok").text("ADD");
		showDialog($stage.dialog.practice, true);
	});
	$stage.box.me.on('click', function(e){
		requestProfile($data.id);
	});
	$stage.dialog.roomInfoJoin.on('click', function(e){
		$stage.dialog.roomInfo.hide();
		tryJoin($data._roominfo);
	});
	$(document).on('click', '.js-profile-handover', function(e){
		var profileId = getProfileIdFromDialog($(e.currentTarget));

		showWarningDialog(L['sureHandover'], function(){
			send('handover', { target: profileId });
		});
	});
	$(document).on('click', '.js-profile-kick', function(e){
		var profileId = getProfileIdFromDialog($(e.currentTarget));

		send('kick', { robot: $data.robots.hasOwnProperty(profileId), target: profileId });
	});
	$(document).on('click', '.js-profile-friend', function(e){
		var profileId = getProfileIdFromDialog($(e.currentTarget));

		if(!profileId || profileId == $data.id) return;
		if($data.robots && $data.robots.hasOwnProperty(profileId)) return;
		if(($data.friends || {}).hasOwnProperty(profileId)){
			requestFriendRemoveById(profileId);
		}else{
			requestCommunityFriendAdd(profileId);
		}
	});
	$(document).on('click', '.js-profile-shut', function(e){
		var profileId = getProfileIdFromDialog($(e.currentTarget));
		var o = $data.users[profileId];
		
		if(!o) return;
		toggleShutBlock(o.profile.title || o.profile.name);
	});
	$(document).on('click', '.js-profile-whisper', function(e){
		var profileId = getProfileIdFromDialog($(e.currentTarget));
		var o = $data.users[profileId];
		
		if(!o) return;
		$stage.talk.val("/e " + (o.profile.title || o.profile.name).replace(/\s/g, "") + " ").focus();
	});
	$(document).on('click', '.js-profile-dress', function(e){
		if($(e.currentTarget).closest(".MyInfoBox").length){
			e.preventDefault();
			openMyInfoInventory();
			return;
		}
		restoreMyInfoInlineDress();
		// alert(L['error_555']);
		playSound('profile_dress');
		if($data.guest) return fail(421);
		if($data._gaming) return fail(438);
		if(!$stage.dialog.dress.length){
			var currentName = ($data.users[$data.id] && ($data.users[$data.id].profile.title || $data.users[$data.id].profile.name)) || "";
			var nextName = prompt(L['myNickname'] || L['nickname'], currentName);
			if(nextName == null) return;
			requestNickname(nextName);
			return;
		}
		if(showDialog($stage.dialog.dress)) $.get("/box", function(res){
			if(res.error) return fail(res.error);
			
			$data.box = res;
			drawMyDress();
		});
	});
	$stage.dialog.dressOK.on('click', function(e){
		$(e.currentTarget).attr('disabled', true);
		var $nick = $("#dress-nick");
		var my = $data.users[$data.id];
		var prevExordial = my ? (my.exordial || "") : "";
		var nextExordial = $("#dress-exordial").val();
		var exordialChanged = nextExordial !== prevExordial;
		if($nick.length){
			var currentName = my ? (my.profile.title || my.profile.name || "") : "";
			var nextName = $nick.val();
			if(nextName != null){
				nextName = nextName.trim();
				if(!nextName){
					$stage.dialog.dressOK.attr('disabled', false);
					return fail(456);
				}
				if(nextName && nextName !== currentName){
					requestNickname(nextName);
				}
			}
		}
		$.post("/exordial", { data: nextExordial }, function(res){
			$stage.dialog.dressOK.attr('disabled', false);
			if(res.error) return fail(res.error);
			
			if(my) my.exordial = nextExordial;
			$stage.dialog.dress.hide();
			if(exordialChanged) scheduleProfileRefresh();
		});
	});
	$("#DressDiag .dress-type").on('click', function(e){
		var $target = $(e.currentTarget);
		var type = $target.attr('id').slice(11);
		
		$(".dress-type.selected").removeClass("selected");
		$target.addClass("selected");
		
		drawMyGoods(type == 'all' || $target.attr('value'));
	});
	$("#dress-cf").on('click', function(e){
		if($data._gaming) return fail(438);
		if($(e.currentTarget).closest(".MyInfoBox").length){
			e.preventDefault();
			openMyInfoLetterMerger();
			return;
		}
		if(showDialog($stage.dialog.charFactory)) drawCharFactory();
	});
	$stage.dialog.cfCompose.attr("type", "button").on('click', function(e){
		e.preventDefault();
		e.stopPropagation();
		if(!$stage.dialog.cfCompose.hasClass("cf-composable")) return showCharFactoryError(436);
		showWarningDialog(L['cfSureCompose'], function(){
			$.post("/cf", { tray: $data._tray.join('|') }, function(res){
				var i;
				
				if(res.error) return showCharFactoryError(res.error);
				send('refresh');
				alert(L['cfComposed']);
				$data.users[$data.id].money = res.money;
				$data.box = res.box;
				for(i in res.gain) queueObtain(res.gain[i]);
				
				drawMyDress($data._avGroup);
				updateMe();
				drawCharFactory();
			}).fail(function(){
				showCharFactoryError(500);
			});
		});
	});
	$("#room-injeong-pick").on('click', function(e){
		var rule = RULE[MODE[$("#room-mode").val()]];
		var i;
		
		$("#injpick-list>div").hide();
		if(rule.lang == "ko"){
			$data._ijkey = "#ko-pick-";
			$("#ko-pick-list").show();
		}else if(rule.lang == "en"){
			$data._ijkey = "#en-pick-";
			$("#en-pick-list").show();
		}
		$stage.dialog.injPickNo.trigger('click');
		for(i in $data._injpick){
			$($data._ijkey + $data._injpick[i]).prop('checked', true);
		}
		showDialog($stage.dialog.injPick);
	});
	$stage.dialog.injPickAll.on('click', function(e){
		$("#injpick-list input").prop('checked', true);
	});
	$stage.dialog.injPickNo.on('click', function(e){
		$("#injpick-list input").prop('checked', false);
	});
	$stage.dialog.injPickOK.on('click', function(e){
		var $target = $($data._ijkey + "list");
		var list = [];
		
		$data._injpick = $target.find("input").each(function(i, o){
			var $o = $(o);
			var id = $o.attr('id').slice(8);
			
			if($o.is(':checked')) list.push(id);
		});
		$data._injpick = list;
		$stage.dialog.injPick.hide();
	});
	$stage.dialog.kickVoteY.on('click', function(e){
		send('kickVote', { agree: true });
		clearTimeout($data._kickTimer);
		$stage.dialog.kickVote.hide();
	});
	$stage.dialog.kickVoteN.on('click', function(e){
		send('kickVote', { agree: false });
		clearTimeout($data._kickTimer);
		$stage.dialog.kickVote.hide();
	});
	$stage.dialog.purchaseOK.on('click', function(e){
		$.post("/buy/" + $data._sgood, function(res){
			var my = $data.users[$data.id];
			
			if(res.error) return fail(res.error);
			playSound("store_item_click");
			alert(L['purchased']);
			my.money = res.money;
			$data.box = res.box;
			updateMe();
		});
		$stage.dialog.purchase.hide();
	});
	$stage.dialog.purchaseNO.on('click', function(e){
		$stage.dialog.purchase.hide();
	});
	$stage.dialog.obtainOK.on('click', function(e){
		var obj = $data._obtain.shift();
		
		if(obj) drawObtain(obj);
		else $stage.dialog.obtain.hide();
	});
	for(i=0; i<6; i++) $("#team-" + i).on('click', onTeam);
	function isLocalSpectatingForTeam(){
		var me = $data && $data.users ? $data.users[$data.id] : null;

		return !!(
			$data._spectate ||
			($stage.menu.spectate && $stage.menu.spectate.hasClass("toggled")) ||
			(me && me.game && me.game.form == "S")
		);
	}
	function onTeam(e){
		if(isLocalSpectatingForTeam()){
			announceSystem(L['notice'], L['spectatorTeamBlocked'] || "Spectators can't be on a team.", {
				chat: true,
				kind: "warning"
			});
			return;
		}
		if($(".team-selector").hasClass("team-unable")) return;
		
		send('team', { value: $(e.currentTarget).attr('id').slice(5) });
	}
// 由ы뵆?덉씠
	function initReplayDialog(){
		$stage.dialog.replayView.attr('disabled', true);
		$("#myinfo-replay-view").attr('disabled', true);
	}
	function renderReplayMeta($date, $version, $players, $view, data){
		var i;
		var u;
		var $p;

		$date.html("-");
		$version.html("-");
		$players.html("-");
		$view.attr('disabled', true);
		$rec = false;
		if(!data) return;

		$date.html((new Date(data.time)).toLocaleString(getClientLocale()));
		$version.html(data.version);
		$players.empty();
		for(i in data.players){
			u = data.players[i];
			$players.append($p = $("<div>").addClass("replay-player-bar ellipse")
				.html(u.title)
				.prepend(getLevelImage(u.data.score).addClass("users-level"))
			);
			if(u.id == data.me) $p.css('font-weight', "bold");
		}
		$rec = data;
		$view.attr('disabled', false);
	}
	function bindReplayUploader(fileSelector, dateSelector, versionSelector, playersSelector, viewSelector){
		$(fileSelector).on('change', function(e){
			var file = (e.target.files || [])[0];
			var reader;
			var $date = $(dateSelector);
			var $version = $(versionSelector);
			var $players = $(playersSelector);
			var $view = $(viewSelector);

			if(!$date.length || !$version.length || !$players.length || !$view.length) return;
			renderReplayMeta($date, $version, $players, $view, null);
			if(!file) return;
			reader = new FileReader();
			reader.readAsText(file);
			reader.onload = function(evt){
				var data;

				try{
					data = JSON.parse(evt.target.result);
					renderReplayMeta($date, $version, $players, $view, data);
				}catch(ex){
					console.warn(ex);
					alert(L['replayError']);
				}
			};
		});
	}
	bindReplayUploader("#replay-file", "#replay-date", "#replay-version", "#replay-players", "#replay-view");
	bindReplayUploader("#myinfo-replay-file", "#myinfo-replay-date", "#myinfo-replay-version", "#myinfo-replay-players", "#myinfo-replay-view");
	$stage.dialog.replayView.on('click', function(e){
		replayReady({ returnToMyInfoReplay: false });
	});
	$("#myinfo-replay-view").on('click', function(e){
		replayReady({ returnToMyInfoReplay: true });
	});
	
// ?ㅽ뙵
	addInterval(function(){
		if(spamCount > 0) spamCount = 0;
		else if(spamWarning > 0) spamWarning -= 0.03;
	}, 1000);

	var uiResizeTimer;
	function syncResizeAnimationState(){
		$("body").addClass("ui-resizing");
		clearTimeout(uiResizeTimer);
		uiResizeTimer = setTimeout(function(){
			$("body").removeClass("ui-resizing");
		}, 160);
	}
	$(window).on('resize', function(){
		syncResizeAnimationState();
		applyMiddleScale();
		refreshCustomScrollbars();
	});
	$(window).on('load', function(){
		applyMiddleScale();
		refreshCustomScrollbars();
		setTimeout(function(){
			applyMiddleScale();
			refreshCustomScrollbars();
		}, 120);
		setTimeout(function(){
			applyMiddleScale();
			refreshCustomScrollbars();
		}, 360);
	});
	applyMiddleScale();
	setTimeout(function(){
		applyMiddleScale();
		refreshCustomScrollbars();
	}, 0);
	setTimeout(function(){
		applyMiddleScale();
		refreshCustomScrollbars();
	}, 180);
	refreshCustomScrollbars();

// ?뱀냼耳??곌껐
	function connect(){
		ws = new _WebSocket($data.URL);
		ws.onopen = function(e){
			loading();
			/*if($data.PUBLIC && mobile) $("#ad").append($("<ins>").addClass("daum_ddn_area")
				.css({ 'display': "none", 'margin-top': "10px", 'width': "100%" })
				.attr({
					'data-ad-unit': "DAN-1ib8r0w35a0qb",
					'data-ad-media': "4I8",
					'data-ad-pubuser': "3iI",
					'data-ad-type': "A",
					'data-ad-width': "320",
					'data-ad-height': "100"
				})
			).append($("<script>")
				.attr({
					'type': "text/javascript",
					'src': "//t1.daumcdn.net/adfit/static/ad.min.js"
				})
			);*/
		};
		ws.onmessage = _onMessage = function(e){
			onMessage(JSON.parse(e.data));
		};
		ws.onclose = function(e){
			var ct = L['closed'] + " (#" + e.code + ")";
			
			if(rws) rws.close();
			stopAllSounds();
			alert(ct);
			$.get("/kkutu_notice.html", function(res){
				loading(res);
			});
		};
		ws.onerror = function(e){
			console.warn(L['error'], e);
		};
	}
});
