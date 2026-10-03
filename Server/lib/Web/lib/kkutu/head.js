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

var MODE;
var BEAT = [ null,
	"10000000",
	"10001000",
	"10010010",
	"10011010",
	"11011010",
	"11011110",
	"11011111",
	"11111111"
];
var NULL_USER = {
	profile: { title: L['null'] },
	data: { score: 0 }
};
var MOREMI_PART;
var AVAIL_EQUIP;
var RULE;
var OPTIONS;
var MAX_LEVEL = 360;
var TICK = 30;
var ROOM_BOX_HEIGHT = 360;
var EXP = [];
var BAD_WORDS = [
	"motherfucker",
	"nigger",
	"nigga",
	"fuck",
	"sex",
	"\\uc2dc\\ubc1c",
	"\\uac1c\\uc0c8\\ub07c",
	"\\ubbf8\\uce5c"
];
var BAD = new RegExp(BAD_WORDS.join("|"), "gi");

var ws, rws;
var $stage;
var $sound = {};
var $soundURL = {};
var $_sound = {}; // ?꾩옱 ?ъ깮 以묒씤 寃껊뱾
var $data = {};
var $lib = { Classic: {}, Jaqwi: {}, Crossword: {}, Typing: {}, Hunmin: {}, Daneo: {}, Sock: {} };
var $rec;
var mobile;
var match1v1SearchTimer;

var audioContext = window.hasOwnProperty("AudioContext") ? (new AudioContext()) : false;
var _WebSocket = window['WebSocket'];
var _setInterval = setInterval;
var _setTimeout = setTimeout;

function syncNoticeEmptyState(){
	var $list, $empty, hasItems;

	if(!$stage || !$stage.dialog) return;
	$list = $stage.dialog.noticeList;
	$empty = $stage.dialog.noticeEmpty;
	if(!$list || !$list.length || !$empty || !$empty.length) return;

	hasItems = $list.children().filter(function(){
		return $(this).css("display") != "none";
	}).length > 0;

	$list.toggle(hasItems);
	$empty.toggle(!hasItems);
}
function getNoticeKindIcon(kind){
	switch(kind){
		case "warning": return "exclamation";
		case "success": return "check";
		case "friend": return "user-plus";
		case "invite": return "envelope";
		case "clan": return "shield";
		case "reward": return "diamond";
		default: return "bell";
	}
}
function refreshTopNoticeBadge(){
	var count = ($data && $data._topNoticeUnread) ? Number($data._topNoticeUnread) : 0;
	var $badge = $("#top-notice-btn .top-notice-count");

	if(!$badge.length) return;
	if(count > 0){
		$badge.text(count > 99 ? "99+" : String(count)).show();
	}else{
		$badge.hide();
	}
}
function getTopNoticeStack(){
	var $stack = $("#TopNoticeToastStack");

	if(!$stack.length){
		$stack = $("<div>").attr("id", "TopNoticeToastStack").appendTo("body");
	}
	return $stack;
}
function openNoticeDialog(){
	if($stage && $stage.dialog && $stage.dialog.notice && $stage.dialog.notice.length){
		showDialog($stage.dialog.notice);
		if($data) $data._topNoticeUnread = 0;
		refreshTopNoticeBadge();
		syncNoticeEmptyState();
	}
}
function showTopNoticeToast(item){
	var $stack;
	var $toast;
	var kind = item.kind || "info";

	if(!$stage || !item || (!item.title && !item.message)) return;
	$stack = getTopNoticeStack();
	$toast = $("<div>")
		.addClass("top-notice-toast top-notice-toast-" + kind)
		.append($("<div>").addClass("top-notice-toast-icon")
			.append($("<i>").addClass("fa fa-" + getNoticeKindIcon(kind)).attr("aria-hidden", "true")))
		.append($("<div>").addClass("top-notice-toast-main")
			.append($("<div>").addClass("top-notice-toast-title").text(item.title || L['notice']))
			.append($("<div>").addClass("top-notice-toast-message").text(item.message || "")))
		.on("click", openNoticeDialog);
	$stack.prepend($toast);
	addTimeout(function(){
		$toast.addClass("top-notice-toast-out");
		addTimeout(function(){
			$toast.remove();
		}, 260);
	}, item.duration || 5200);
}
function addSystemNotification(item){
	var $list, $entry;
	var kind;

	item = item || {};
	if(!item.title && !item.message) return;
	if(!$data) return;
	if(!$data._systemNotificationKeys) $data._systemNotificationKeys = {};
	if(item.key && $data._systemNotificationKeys[item.key]) return;
	if(item.key) $data._systemNotificationKeys[item.key] = true;
	kind = item.kind || "info";
	if($stage && $stage.dialog && $stage.dialog.noticeList && $stage.dialog.noticeList.length){
		$list = $stage.dialog.noticeList;
		$entry = $("<div>").addClass("notice-item notice-item-" + kind)
			.append($("<div>").addClass("notice-item-icon")
				.append($("<i>").addClass("fa fa-" + getNoticeKindIcon(kind)).attr("aria-hidden", "true")))
			.append($("<div>").addClass("notice-item-main")
				.append($("<div>").addClass("notice-item-title").text(item.title || L['notice']))
				.append($("<div>").addClass("notice-item-sub").text(item.message || "")));
		$list.prepend($entry);
		while($list.children().length > 60) $list.children().last().remove();
		syncNoticeEmptyState();
	}
	if($data){
		if(!($stage && $stage.dialog && $stage.dialog.notice && $stage.dialog.notice.is(":visible"))){
			$data._topNoticeUnread = Number($data._topNoticeUnread || 0) + 1;
		}
		refreshTopNoticeBadge();
	}
	if(item.toast !== false) showTopNoticeToast(item);
}
function isRoomChatNoticeOpen(){
	return !!(
		$data && $data.room &&
		$stage && $stage.box && $stage.box.chat &&
		$stage.box.chat.length && $stage.box.chat.is(":visible")
	);
}
function isCommunityLobbyChatContext(){
	return !!($data && !$data.room && Number($data.place || 0) === 0);
}
function mirrorSystemAnnouncementToActiveChat(title, message, options){
	options = options || {};
	if(options.chat === false) return;
	if(isCommunityLobbyChatContext()){
		notice(message || title || "", options.head || title || L['notice']);
		return;
	}
	if(!isRoomChatNoticeOpen()) return;
	notice(message || title || "", options.head || title || L['notice']);
}
function announceSystem(title, message, options){
	var wantsWarning;
	var wantsNotify;

	options = options || {};
	wantsWarning = !!options.warning;
	wantsNotify = !!options.notify && !wantsWarning;

	if(options.chat === true || wantsWarning || wantsNotify){
		mirrorSystemAnnouncementToActiveChat(title, message, options);
	}
	if(wantsNotify){
		addSystemNotification({
			key: options.key,
			kind: options.kind,
			title: title,
			message: message,
			duration: options.duration,
			toast: options.toast
		});
	}
	if(wantsWarning){
		showAlertDialog(message || title || "");
	}
}
function flashMenuSelectionChange($button, mode){
	var timer;
	var frame;
	var requestFrame = window.requestAnimationFrame ? function(fn){ return window.requestAnimationFrame(fn); } : function(fn){ return _setTimeout(fn, 16); };
	var cancelFrame = window.cancelAnimationFrame ? function(id){ window.cancelAnimationFrame(id); } : clearTimeout;

	if(!$button || !$button.length) return;
	timer = $button.data("menuGlassFlashTimer");
	if(timer) clearTimeout(timer);
	frame = $button.data("menuGlassFlashFrame");
	if(frame) cancelFrame(frame);

	$button.removeClass("menu-glass-flash menu-glass-flash-select menu-glass-flash-deselect");
	frame = requestFrame(function(){
		$button.removeData("menuGlassFlashFrame");
		$button.addClass("menu-glass-flash " + (mode == "deselect" ? "menu-glass-flash-deselect" : "menu-glass-flash-select"));
		$button.data("menuGlassFlashTimer", _setTimeout(function(){
			$button.removeClass("menu-glass-flash menu-glass-flash-select menu-glass-flash-deselect");
			$button.removeData("menuGlassFlashTimer");
		}, 1220));
	});
	$button.data("menuGlassFlashFrame", frame);
}
function bindMenuToggleGlassFlash(){
	var addClass;
	var removeClass;
	var toggleClass;
	var toggledPattern = /(^|\s)toggled(\s|$)/;

	if($.fn._kkutuMenuToggleGlassPatched) return;
	$.fn._kkutuMenuToggleGlassPatched = true;

	addClass = $.fn.addClass;
	removeClass = $.fn.removeClass;
	toggleClass = $.fn.toggleClass;

	function isMenuButton(node){
		return !!(node && node.nodeType == 1 && node.closest && node.closest(".kkutu-menu") && node.tagName && node.tagName.toLowerCase() == "button");
	}
	$.fn.addClass = function(value){
		var targets = [];
		var result;

		if(typeof value == "string" && toggledPattern.test(value)){
			this.each(function(){
				if(isMenuButton(this) && !$(this).hasClass("toggled")) targets.push(this);
			});
		}
		result = addClass.apply(this, arguments);
		targets.forEach(function(node){
			var $node = $(node);
			if($node.hasClass("toggled")) flashMenuSelectionChange($node, "select");
		});
		return result;
	};
	$.fn.removeClass = function(value){
		var mayRemoveToggle = arguments.length === 0 || value == null || (typeof value == "string" && toggledPattern.test(value));
		var targets = [];
		var result;

		if(mayRemoveToggle){
			this.each(function(){
				if(isMenuButton(this) && $(this).hasClass("toggled")) targets.push(this);
			});
		}
		result = removeClass.apply(this, arguments);
		targets.forEach(function(node){
			var $node = $(node);
			if(!$node.hasClass("toggled")) flashMenuSelectionChange($node, "deselect");
		});
		return result;
	};
	$.fn.toggleClass = function(value, stateVal){
		var targets = [];
		var result;

		if(typeof value == "string" && toggledPattern.test(value)){
			this.each(function(){
				if(isMenuButton(this)) targets.push({ node: this, was: $(this).hasClass("toggled") });
			});
		}
		result = toggleClass.apply(this, arguments);
		targets.forEach(function(item){
			var $node = $(item.node);
			var isToggled = $node.hasClass("toggled");
			if(item.was != isToggled) flashMenuSelectionChange($node, isToggled ? "select" : "deselect");
		});
		return result;
	};
}
function closeMyInfoOverlay(){
	if(!$data) return false;
	if(!$data._myInfo && !$("body").hasClass("myinfo-open")) return false;

	$data._myInfo = false;
	$("#top-profile-card").removeClass("myinfo-open");
	$("body").removeClass("myinfo-open");
	updateUI();
	return true;
}
function bindMyInfoOutsideClose(){
	$(document).off("click.myinfoOutsideClose").on("click.myinfoOutsideClose", function(e){
		var $target;

		if(!($data && $data._myInfo && $("body").hasClass("myinfo-open"))) return;
		$target = $(e.target);
		if($target.closest(".MyInfoBox, #top-profile-card, #online-myinfo-card, .dialog, .warning-overlay").length) return;
		closeMyInfoOverlay();
	});
}
function renderFriendSearchMessageInto($results, message){
	if(!$results || !$results.length) return;
	$results.empty().append($("<div>").addClass("cfs-empty").text(message || ""));
}
function renderFriendSearchResultsInto($results, list){
	if(!$results || !$results.length) return;
	if(!list || !list.length){
		return renderFriendSearchMessageInto($results, L['friendSearchEmpty']);
	}
	$results.empty();
	list.forEach(function(item){
		var id = (item.id || "").toString();
		var name = (item.name || id).toString();
		var username = (item.username || "").toString();
		var isSelf = id == $data.id;
		var isFriend = !!(($data.friends || {})[id]);
		var isPending = !!(($data._friendPending || {})[id]);
		var $button = $("<button>").addClass("cfs-add").text(
			isSelf ? L['friendSearchSelf'] : (isFriend ? (L['friendUnadd'] || "UNADD") : (isPending ? (L['friendPending'] || "PENDING") : (L['friendAddShort'] || "ADD")))
		).prop('disabled', isSelf || isPending);

		if(!isSelf && !isPending){
			$button.on('click', function(){
				if(($data.friends || {}).hasOwnProperty(id)){
					requestFriendRemoveById(id);
				}else{
					requestCommunityFriendAdd(id);
				}
			});
		}
		$results.append($("<div>").addClass("cfs-item")
			.append($("<div>").addClass("cfs-status cfi-stat-" + (item.online ? "on" : "off")))
			.append($("<div>").addClass("cfs-meta")
				.append($("<div>").addClass("cfs-name ellipse").text(name))
				.append($("<div>").addClass("cfs-sub ellipse").text(username && username != name ? username : ("#" + id.substr(0, 5))))
			)
			.append($button)
		);
	});
}
function renderFriendSearchMessage(message){
	if(!$stage || !$stage.dialog || !$stage.dialog.commFriendResults) return;
	renderFriendSearchMessageInto($stage.dialog.commFriendResults, message);
}
function renderFriendSearchResults(list){
	if(!$stage || !$stage.dialog || !$stage.dialog.commFriendResults) return;
	renderFriendSearchResultsInto($stage.dialog.commFriendResults, list);
}
function getFriendDisplayName(id){
	var profile = (($data.users || {})[id] || {}).profile;
	return profile ? (profile.title || profile.name) : L['hidden'];
}
function getFriendMemoText(id, displayName){
	var memoText = (($data.friends || {})[id] || "").toString();

	if(displayName && memoText === displayName) return "";
	return memoText;
}
function hasCommunityPageBox(){
	return ensureCommunityPageBox();
}
function getCommunityPageBox(){
	return $(".FriendsBox").last();
}
function ensureCommunityPageBox(){
	var $box = getCommunityPageBox();
	var $body;
	var $anchor;
	var created = false;

	if(!$box.length){
		created = true;
		$body = $("<div>").addClass("product-body")
			.append($("<div>").addClass("friends-page"));
		$box = $("<div>").addClass("FriendsBox Product")
			.append($("<h5>").addClass("product-title").text((typeof L != "undefined" && L['communityText']) || "COMMUNITY"))
			.append($body);
		$anchor = $(".ShopBox");
		if(!$anchor.length) $anchor = $(".RoomListBox");
		if($anchor.length) $box.insertAfter($anchor.last());
		else $("#Middle").append($box);
	}else{
		$body = $box.children(".product-body");
		if(!$body.length){
			$body = $("<div>").addClass("product-body");
			$box.append($body);
		}
		if(!$body.children(".friends-page").length){
			$body.append($("<div>").addClass("friends-page"));
		}
	}
	if($stage && $stage.box) $stage.box.friends = $box;
	if(created && (!$data || !$data._communityOpen)) $box.hide();
	return !!($box.length && $box.find(".friends-page").length);
}
function showCommunityPageBox(){
	var $box;

	if(!ensureCommunityPageBox()) return false;
	$box = getCommunityPageBox();
	if($data){
		setLobbySidePageIntent("community");
		$data._communityOpen = true;
		$data._myInfo = false;
		$data._shop = false;
		$data._clans = false;
		$data._match1v1Open = false;
	}
	if($stage && $stage.box){
		$stage.box.friends = $box;
		if($stage.box.roomList) $stage.box.roomList.hide();
		if($stage.box.match1v1) $stage.box.match1v1.hide();
		if($stage.box.shop) $stage.box.shop.hide();
		if($stage.box.clans) $stage.box.clans.removeClass("is-lobby-side-page-active").hide();
		if($stage.box.myInfo) $stage.box.myInfo.hide();
	}
	if($stage && $stage.menu && $stage.menu.clans && $stage.menu.clans.length){
		$stage.menu.clans.removeClass("toggled");
	}
	if($stage && $stage.menu && $stage.menu.shop && $stage.menu.shop.length){
		$stage.menu.shop.removeClass("toggled");
	}
	if($stage && $stage.menu && $stage.menu.match1v1 && $stage.menu.match1v1.length){
		$stage.menu.match1v1.removeClass("toggled");
	}
	if($stage && $stage.menu && $stage.menu.community && $stage.menu.community.length){
		$stage.menu.community.addClass("toggled");
	}
	getClanPageBox().removeClass("is-lobby-side-page-active").hide();
	$("body").addClass("lobby-no-chat community-open").removeClass("clan-open myinfo-open match1v1-open");
	syncCommunityPageBoxBounds($box);
	$box.addClass("is-lobby-side-page-active").css({
		display: "block",
		visibility: "visible",
		opacity: 1,
		"pointer-events": "auto",
		position: "",
		left: "",
		top: "",
		right: "",
		bottom: "",
		"z-index": 24,
		width: "",
		height: "",
		"min-height": ""
	}).show();
	if(typeof applyResponsiveLobbyBoxHeights == "function"){
		applyResponsiveLobbyBoxHeights(typeof getLobbyTopOffset == "function" ? getLobbyTopOffset() : 0);
	}
	return true;
}
function getClanPageBox(){
	return $(".ClanBox").last();
}
function getClanPageSection(){
	return getClanPageBox().find(".clan-page");
}
function ensureClanPageBox(){
	var $box = getClanPageBox();
	var $body;
	var $anchor;
	var title = (typeof L != "undefined" && L['clanTitle']) || "CLANS";
	var created = false;

	if(!$box.length){
		created = true;
		$body = $("<div>").addClass("product-body")
			.append($("<div>").addClass("clan-page"));
		$box = $("<div>").addClass("ClanBox Product")
			.append($("<h5>").addClass("product-title").text(title))
			.append($body);
		$anchor = $(".FriendsBox");
		if(!$anchor.length) $anchor = $(".ShopBox");
		if(!$anchor.length) $anchor = $(".RoomListBox");
		if($anchor.length) $box.insertAfter($anchor.last());
		else $("#Middle").append($box);
	}else{
		$body = $box.children(".product-body");
		if(!$body.length){
			$body = $("<div>").addClass("product-body");
			$box.append($body);
		}
		if(!$body.children(".clan-page").length){
			$body.append($("<div>").addClass("clan-page"));
		}
	}
	$box.children(".product-title").text(title);
	if($stage && $stage.box) $stage.box.clans = $box;
	if(created && (!$data || !$data._clans)) $box.hide();
	return !!($box.length && $box.find(".clan-page").length);
}
function showClanPageBox(){
	var $box;

	if(!ensureClanPageBox()) return false;
	$box = getClanPageBox();
	if($data){
		setLobbySidePageIntent("clan");
		$data._clans = true;
		$data._communityOpen = false;
		$data._myInfo = false;
		$data._shop = false;
		$data._match1v1Open = false;
	}
	if($stage && $stage.box){
		$stage.box.clans = $box;
		if($stage.box.roomList) $stage.box.roomList.hide();
		if($stage.box.match1v1) $stage.box.match1v1.hide();
		if($stage.box.shop) $stage.box.shop.hide();
		if($stage.box.friends) $stage.box.friends.removeClass("is-lobby-side-page-active").hide();
		if($stage.box.myInfo) $stage.box.myInfo.hide();
	}
	if($stage && $stage.menu && $stage.menu.clans && $stage.menu.clans.length){
		$stage.menu.clans.addClass("toggled");
	}
	if($stage && $stage.menu && $stage.menu.community && $stage.menu.community.length){
		$stage.menu.community.removeClass("toggled");
	}
	if($stage && $stage.menu && $stage.menu.shop && $stage.menu.shop.length){
		$stage.menu.shop.removeClass("toggled");
	}
	if($stage && $stage.menu && $stage.menu.match1v1 && $stage.menu.match1v1.length){
		$stage.menu.match1v1.removeClass("toggled");
	}
	getCommunityPageBox().removeClass("is-lobby-side-page-active").hide();
	syncClanPageBoxBounds($box);
	$box.addClass("is-lobby-side-page-active").css({
		display: "block",
		visibility: "visible",
		opacity: 1,
		"pointer-events": "auto",
		position: "",
		left: "",
		top: "",
		right: "",
		bottom: "",
		"z-index": 24,
		width: "",
		height: "",
		"min-height": ""
	}).show();
	if(typeof applyResponsiveLobbyBoxHeights == "function"){
		applyResponsiveLobbyBoxHeights(typeof getLobbyTopOffset == "function" ? getLobbyTopOffset() : 0);
	}
	$("body").addClass("lobby-no-chat clan-open").removeClass("myinfo-open community-open match1v1-open");
	return true;
}
function getClanPageRightGap(){
	var $userBox = $(".UserListBox:visible");
	var width = $userBox.length ? Math.ceil($userBox.outerWidth() || 0) : 0;

	return width || ($("body").hasClass("userlist-collapsed") ? 20 : 220);
}
function syncClanPageBoxBounds($box){
	var rightGap = getClanPageRightGap();

	if(document.documentElement && document.documentElement.style){
		document.documentElement.style.setProperty("--clan-sidebar-reserve", rightGap + "px");
	}
	if($box && $box.length) $box.css("right", "");
	return rightGap;
}
function syncCommunityPageBoxBounds($box){
	var rightGap = getClanPageRightGap();

	if(document.documentElement && document.documentElement.style){
		document.documentElement.style.setProperty("--community-sidebar-reserve", rightGap + "px");
	}
	if($box && $box.length) $box.css("right", "");
	return rightGap;
}
function isLobbySidePageVisible(type){
	var $box = type == "clan" ? getClanPageBox() : getCommunityPageBox();

	return !!($box.length && $box.is(":visible") && ($box.outerWidth() > 0 || $box.outerHeight() > 0));
}
function getLobbySidePageButtonIntent(){
	if(!($stage && $stage.menu)) return "";
	if($stage.menu.clans && $stage.menu.clans.length && $stage.menu.clans.hasClass("toggled")) return "clan";
	if($stage.menu.community && $stage.menu.community.length && $stage.menu.community.hasClass("toggled")) return "community";
	return "";
}
function normalizeLobbySidePageType(type){
	type = String(type || "");
	return (type == "clan" || type == "community") ? type : "";
}
function getLobbySidePageStoredIntent(){
	var bodyIntent = "";

	if(typeof $ == "function") bodyIntent = normalizeLobbySidePageType($("body").attr("data-lobby-side-page"));
	return normalizeLobbySidePageType(($data && $data._lobbySidePage) || bodyIntent || getLobbySidePageButtonIntent());
}
function setLobbySidePageIntent(type){
	type = normalizeLobbySidePageType(type);
	if($data) $data._lobbySidePage = type;
	if(typeof $ == "function"){
		if(type) $("body").attr("data-lobby-side-page", type);
		else $("body").removeAttr("data-lobby-side-page");
	}
	return type;
}
function runLobbySidePageRefresh(refresh){
	if(typeof updateUI != "function") return;
	try{
		updateUI(undefined, refresh !== false);
	}catch(e){
		if(window.console && console.error) console.error("lobby side page refresh failed", e);
	}
}
function closeLobbySidePage(type, refresh){
	if($data){
		if(type == "clan") $data._clans = false;
		if(type == "community") $data._communityOpen = false;
		if(normalizeLobbySidePageType($data._lobbySidePage) == type || getLobbySidePageStoredIntent() == type) setLobbySidePageIntent("");
	}
	if($stage && $stage.menu){
		if(type == "clan" && $stage.menu.clans && $stage.menu.clans.length) $stage.menu.clans.removeClass("toggled");
		if(type == "community" && $stage.menu.community && $stage.menu.community.length) $stage.menu.community.removeClass("toggled");
	}
	(type == "clan" ? getClanPageBox() : getCommunityPageBox()).removeClass("is-lobby-side-page-active").hide();
	$("body").removeClass(type == "clan" ? "clan-open" : "community-open");
	runLobbySidePageRefresh(refresh);
}
function prepareLobbySidePageContent(type, refresh){
	type = normalizeLobbySidePageType(type);
	if(type == "clan"){
		ensureClanPageBox();
		if(refresh !== false || !getClanPageSection().children().length) renderClanPageSafe();
	}else if(type == "community"){
		ensureCommunityPageBox();
		if(refresh !== false || !getCommunityPageBox().find(".friends-page").children().length) renderFriendsPage();
	}
}
function activateLobbySidePage(type, refresh){
	var isClan;
	var ok = false;

	type = normalizeLobbySidePageType(type);
	if(!type) return false;
	if(typeof getOnly == "function" && getOnly() != "for-lobby") return false;
	isClan = type == "clan";
	if($data){
		$data._myInfo = false;
		$data._shop = false;
		$data._clans = isClan;
		$data._communityOpen = !isClan;
	}
	setLobbySidePageIntent(type);
	if(typeof closeMatch1v1LobbyView == "function") closeMatch1v1LobbyView(true);
	prepareLobbySidePageContent(type, refresh);
	if(isClan){
		ok = showClanPageBox();
	}else{
		ok = showCommunityPageBox();
	}
	if(ok && typeof refreshCustomScrollbars == "function") refreshCustomScrollbars();
	return ok;
}
function syncRankedMenuLabel(){
	var $btn = ($stage && $stage.menu && $stage.menu.match1v1) ? $stage.menu.match1v1 : $("#Match1v1Btn");
	var replaced = false;

	if(!$btn || !$btn.length) return;
	$btn.attr({ title: "RANKED", "aria-label": "RANKED" });
	$btn.contents().each(function(){
		if(this.nodeType != 3 || !$.trim(this.nodeValue || "")) return;
		this.nodeValue = "RANKED";
		replaced = true;
	});
	if(!replaced && $.trim($btn.text() || "")){
		$btn.find(".ranked-menu-label").remove();
		$btn.append($("<span>").addClass("ranked-menu-label").text("RANKED"));
	}
}
function setCommunityFriendPending(id, pending, rerender){
	if(!id) return;
	if(!$data._friendPending) $data._friendPending = {};
	if(pending) $data._friendPending[id] = true;
	else delete $data._friendPending[id];
	if(rerender !== false) refreshFriendSearchResults();
}
function getFriendRequestName(req){
	var from = (req && req.from) ? req.from.toString() : "";
	var profile = (($data.users || {})[from] || {}).profile || {};

	return ((req && req.name) || profile.title || profile.name || from || "").toString();
}
function processFriendRequestQueue(){
	var req;
	var from;
	var label;
	var message;
	var denyFriend;

	if(!$data || !$data._friendRequestQueue || !$data._friendRequestQueue.length) return;
	if($data._friendRequestPromptActive) return;
	if($data._warningDialog){
		_setTimeout(processFriendRequestQueue, 240);
		return;
	}
	if(typeof document != "undefined" && document.hasFocus && !document.hasFocus()){
		$(window).off("focus.friendRequestQueue").one("focus.friendRequestQueue", function(){
			_setTimeout(processFriendRequestQueue, 120);
		});
		return;
	}
	req = $data._friendRequestQueue.shift();
	from = (req && req.from) ? req.from.toString() : "";
	if(!from){
		_setTimeout(processFriendRequestQueue, 0);
		return;
	}
	label = getFriendRequestName(req);
	message = (label || from) + "(#" + from.substr(0, 5) + ")" + L['attemptFriendAdd'];
	denyFriend = !!($data.opts && $data.opts.df === true);
	if(denyFriend){
		announceSystem(L['friendAdd'] || "Friend Request", message, {
			notify: true,
			kind: "friend",
			key: "friend-request-auto-deny-" + from + "-" + Date.now()
		});
		send('friendAddRes', { from: from, res: false }, true);
		_setTimeout(processFriendRequestQueue, 80);
		return;
	}
	$data._friendRequestPromptActive = true;
	mirrorSystemAnnouncementToActiveChat(L['friendAdd'] || "Friend Request", message, {
		head: L['friend'] || L['notice']
	});
	showWarningDialog(message, function(){
		$data._friendRequestPromptActive = false;
		send('friendAddRes', { from: from, res: true }, true);
		_setTimeout(processFriendRequestQueue, 120);
	}, function(){
		$data._friendRequestPromptActive = false;
		send('friendAddRes', { from: from, res: false }, true);
		_setTimeout(processFriendRequestQueue, 120);
	});
}
function queueFriendRequestPrompt(req){
	var from = (req && req.from) ? req.from.toString() : "";
	var exists = false;
	var name;

	if(!from) return;
	if(!$data._friendRequestQueue) $data._friendRequestQueue = [];
	$data._friendRequestQueue.forEach(function(item){
		if(item && item.from == from) exists = true;
	});
	if(exists) return;
	name = getFriendRequestName(req);
	$data._friendRequestQueue.push({
		from: from,
		name: name,
		time: Number(req.time) || Date.now()
	});
	processFriendRequestQueue();
}
function enqueuePendingFriendRequests(reqs){
	var list = [];

	if(!reqs || typeof reqs != "object") return;
	Object.keys(reqs).forEach(function(from){
		var item = reqs[from] || {};

		list.push({
			from: from,
			name: item.name || "",
			time: Number(item.time) || 0
		});
	});
	list.sort(function(a, b){
		return (a.time || 0) - (b.time || 0);
	}).forEach(queueFriendRequestPrompt);
}
function requestCommunityFriendAdd(id){
	if(!id) return;
	setCommunityFriendPending(id, true);
	$data._pendingFriendAddTarget = id;
	send('friendAdd', { target: id }, true);
}
function triggerFriendAddPrompt(){
	var id = $.trim(prompt(L['friendAddNotice']) || "");

	if(!id) return;
	requestCommunityFriendAdd(id);
}
function requestFriendMemoEditById(id){
	var memo;

	if(!id || !$data.friends || !$data.friends.hasOwnProperty(id)) return;
	memo = prompt(L['friendEditMemo'], $data.friends[id]);
	if(!memo) return;
	send('friendEdit', { id: id, memo: memo }, true);
}
var nativeAlert = typeof window != "undefined" && typeof window.alert == "function"
	? window.alert.bind(window)
	: function(){};
function liftWarningDialogLayer(){
	var $body;

	if(!$stage || !$stage.dialog || !$stage.dialog.warningOverlay || !$stage.dialog.warningOverlay.length) return;
	$body = $("body");
	if(!$stage.dialog.warningOverlay.parent().is("body")){
		$body.append($stage.dialog.warningOverlay);
	}
	if($stage.dialog.warning && $stage.dialog.warning.length && !$stage.dialog.warning.parent().is("body")){
		$body.append($stage.dialog.warning);
	}
}
function closeWarningDialog(accepted){
	var state = $data._warningDialog || {};
	var callback = accepted ? state.onOk : state.onCancel;

	if($stage && $stage.dialog){
		if($stage.dialog.warning && $stage.dialog.warning.length){
			$stage.dialog.warning.hide().removeClass("dialog-front alert-only");
		}
		if($stage.dialog.warningOverlay && $stage.dialog.warningOverlay.length){
			$stage.dialog.warningOverlay.hide();
		}
		if($stage.dialog.warningCancel && $stage.dialog.warningCancel.length){
			$stage.dialog.warningCancel.show();
		}
		if($stage.dialog.warningOK && $stage.dialog.warningOK.length){
			$stage.dialog.warningOK.text(L['OK']);
		}
	}
	if(state.previousFront && state.previousFront.length && state.previousFront.is(":visible")){
		state.previousFront.addClass("dialog-front");
	}
	$data._warningDialog = null;
	if(typeof callback == "function") callback();
}
function showWarningDialog(message, onOk, onCancel, options){
	var $prevFront;
	var mode;

	options = options || {};
	mode = options.mode || "confirm";

	if(!$stage || !$stage.dialog || !$stage.dialog.warning || !$stage.dialog.warning.length){
		if(mode == "alert"){
			nativeAlert(message || "");
			if(typeof onOk == "function") onOk();
			return true;
		}
		if(confirm(message || "")){
			if(typeof onOk == "function") onOk();
			return true;
		}
		if(typeof onCancel == "function") onCancel();
		return false;
	}
	liftWarningDialogLayer();
	$prevFront = $(".dialog-front").not($stage.dialog.warning).filter(":visible").last();
	$data._warningDialog = {
		onOk: onOk,
		onCancel: onCancel,
		previousFront: $prevFront.length ? $prevFront : $(),
		mode: mode
	};
	if($stage.dialog.warningMessage && $stage.dialog.warningMessage.length){
		$stage.dialog.warningMessage.text(message || "");
	}
	if($stage.dialog.warning && $stage.dialog.warning.length){
		$stage.dialog.warning.toggleClass("alert-only", mode == "alert");
	}
	if($stage.dialog.warningCancel && $stage.dialog.warningCancel.length){
		$stage.dialog.warningCancel.toggle(mode != "alert");
	}
	if($stage.dialog.warningOK && $stage.dialog.warningOK.length){
		$stage.dialog.warningOK.text(options.okText || L['OK']);
	}
	if($stage.dialog.warningOverlay && $stage.dialog.warningOverlay.length){
		$stage.dialog.warningOverlay.show();
	}
	showDialog($stage.dialog.warning, true);
	return true;
}
function showAlertDialog(message, onOk){
	return showWarningDialog(message, onOk, null, { mode: "alert" });
}
if(typeof window != "undefined"){
	window.alert = function(message){
		return showAlertDialog(message);
	};
}
function confirmOpenExternalLink(url){
	showWarningDialog(L['linkWarning'], function(){
		window.open(url);
	});
	return false;
}
function requestFriendRemoveById(id){
	var memo;

	if(!id || !$data.friends || !$data.friends.hasOwnProperty(id)) return;
	memo = $data.friends[id];
	showWarningDialog(memo + "(#" + id.substr(0, 5) + ")\n" + L['friendSureRemove'], function(){
		send('friendRemove', { id: id }, true);
	});
}
function refreshFriendSearchResults(){
	if(!$data) return;
	if($data._friendSearchLoading){
		renderFriendSearchMessage(L['searching']);
	}else if($.isArray($data._friendSearchResults)){
		renderFriendSearchResults($data._friendSearchResults);
	}else{
		renderFriendSearchMessage(L['friendSearchHint']);
	}
	if($data._communityOpen && getOnly() == "for-lobby" && hasCommunityPageBox()){
		renderFriendsPage();
	}
}
function mergeLocalFriendSearchResults(list, query){
	var results = $.isArray(list) ? list.slice() : [];
	var seen = {};
	var normalizedQuery = $.trim(query || "").toLowerCase();

	results.forEach(function(item){
		if(item && item.id) seen[item.id] = true;
	});
	if(!normalizedQuery || !$data.friends) return results;
	Object.keys($data.friends).forEach(function(id){
		var displayName = getFriendDisplayName(id);
		var memoText = getFriendMemoText(id, displayName);
		var display = displayName || "";
		var memo = memoText || "";
		var haystack = (display + " " + memo).toLowerCase();
		var online = !!(($data._friends || {})[id] && ($data._friends || {})[id].server);

		if(seen[id] || haystack.indexOf(normalizedQuery) === -1) return;
		results.push({
			id: id,
			name: (display && display != L['hidden']) ? display : (memo || display || id),
			username: memo && memo != display ? memo : "",
			online: online
		});
		seen[id] = true;
	});
	return results;
}
function requestFriendSearch(queryOverride){
	var query;

	if(queryOverride && typeof queryOverride === "object" && queryOverride.currentTarget){
		queryOverride = undefined;
	}
	if(queryOverride === undefined){
		if(!$stage || !$stage.dialog || !$stage.dialog.commFriendQuery || !$stage.dialog.commFriendQuery.length) return;
		query = $.trim($stage.dialog.commFriendQuery.val() || "");
	}else{
		query = $.trim(queryOverride || "");
		if($stage && $stage.dialog && $stage.dialog.commFriendQuery && $stage.dialog.commFriendQuery.length){
			$stage.dialog.commFriendQuery.val(query);
		}
	}
	$data._friendSearchQuery = query;
	if(!query){
		$data._friendSearchLoading = false;
		$data._friendSearchResults = null;
		return refreshFriendSearchResults();
	}
	$data._friendSearchLoading = true;
	$data._friendSearchResults = null;
	refreshFriendSearchResults();
	$.get("/friend-search?q=" + encodeURIComponent(query), function(res){
		$data._friendSearchLoading = false;
		if(res && res.error){
			$data._friendSearchResults = [];
			refreshFriendSearchResults();
			return fail(res.error);
		}
		$data._friendSearchResults = mergeLocalFriendSearchResults((res && $.isArray(res.list)) ? res.list : [], query);
		refreshFriendSearchResults();
	}).fail(function(){
		$data._friendSearchLoading = false;
		$data._friendSearchResults = mergeLocalFriendSearchResults([], query);
		refreshFriendSearchResults();
	});
}
function getReadyHoverMetrics($ready){
	var button;
	var style;

	if(!$ready || !$ready.length || typeof window == "undefined" || typeof window.getComputedStyle != "function") return null;
	button = $ready.get(0);
	style = window.getComputedStyle(button);
	return {
		height: parseFloat(style.height) || 66,
		marginTop: parseFloat(style.marginTop) || 0
	};
}
function pointerHitsReadyButton(button){
	var x = $data._mouseX;
	var y = $data._mouseY;
	var target;

	if(!button || x == null || y == null || typeof document == "undefined" || typeof document.elementFromPoint != "function") return false;
	target = document.elementFromPoint(x, y);
	return !!target && (target === button || $.contains(button, target));
}
function resumeReadyPulse($ready){
	var button;

	if(!$ready || !$ready.length) return;
	button = $ready.get(0);
	clearTimeout(button._readyHoverTimer);
	$ready.stop(true, false).removeClass("ready-hover-lock").css({
		height: "",
		marginTop: "",
		animation: "none"
	});
	button.offsetHeight;
	$ready.css("animation", "ReadyBlink 1s linear infinite");
}
function animateReadyHoverState($ready, hovered){
	var button;
	var current;
	var token;
	var targetHeight;

	if(!$ready || !$ready.length) return;
	button = $ready.get(0);
	current = getReadyHoverMetrics($ready);
	if(!current) return;
	targetHeight = hovered ? 78 : 66;
	token = (button._readyHoverSeq || 0) + 1;
	button._readyHoverSeq = token;
	button._readyHoverTarget = hovered;
	clearTimeout(button._readyHoverTimer);
	$ready.stop(true, false);
	$ready.addClass("ready-hover-lock").css({
		height: current.height,
		marginTop: current.marginTop,
		animation: "none"
	});
	button._readyHoverMode = hovered ? "entering" : "leaving";
	$ready.animate({
		height: targetHeight,
		marginTop: 0
	}, hovered ? 220 : 180, "swing", function(){
		if(button._readyHoverSeq !== token) return;
		if(hovered){
			if($ready.hasClass("toggled")) return;
			$ready.css({
				height: "78px",
				marginTop: "0px",
				animation: "none"
			});
			button._readyHoverMode = "hovered";
			if(button._readyDeferredLeave){
				button._readyDeferredLeave = false;
				if(!pointerHitsReadyButton(button)) animateReadyHoverState($ready, false);
				return;
			}
			if(button._readyHoverTarget === false && !pointerHitsReadyButton(button)){
				animateReadyHoverState($ready, false);
			}
			return;
		}
		if($ready.hasClass("toggled")){
			$ready.css({
				height: "",
				marginTop: ""
			});
			button._readyHoverMode = "idle";
			return;
		}
		button._readyHoverMode = "settling";
		clearTimeout(button._readyHoverTimer);
		button._readyHoverTimer = _setTimeout(function(){
			if(button._readyHoverSeq !== token) return;
			if(button._readyHoverTarget === true){
				button._readyHoverMode = "idle";
				animateReadyHoverState($ready, true);
				return;
			}
			button._readyHoverMode = "idle";
			resumeReadyPulse($ready);
		}, 140);
		if(button._readyHoverTarget === true){
			return;
		}
	});
}
function bindReadyHoverSmoothing(){
	var $ready;
	var button;

	if(!$stage || !$stage.menu || !$stage.menu.ready || !$stage.menu.ready.length) return;
	$ready = $stage.menu.ready;
	button = $ready.get(0);
	button._readyHoverMode = "idle";
	button._readyHoverTarget = false;
	button._readyDeferredLeave = false;
	$(document).off("mousemove.readyhovertrack").on("mousemove.readyhovertrack", function(e){
		$data._mouseX = e.clientX;
		$data._mouseY = e.clientY;
	});
	$ready.off(".readyhoverfix");
	$ready.on("mouseenter.readyhoverfix", function(e){
		if($ready.hasClass("toggled")) return;
		if(e){
			$data._mouseX = e.clientX;
			$data._mouseY = e.clientY;
		}
		button._readyHoverTarget = true;
		button._readyDeferredLeave = false;
		if(button._readyHoverMode == "entering" || button._readyHoverMode == "hovered") return;
		animateReadyHoverState($ready, true);
	});
	$ready.on("mouseleave.readyhoverfix", function(e){
		if(e){
			$data._mouseX = e.clientX;
			$data._mouseY = e.clientY;
		}
		button._readyHoverTarget = false;
		if(button._readyHoverMode == "entering"){
			button._readyDeferredLeave = true;
			return;
		}
		if(button._readyHoverMode == "idle" || button._readyHoverMode == "leaving") return;
		animateReadyHoverState($ready, false);
	});
}
