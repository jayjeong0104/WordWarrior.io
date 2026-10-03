(function(root, $){
	"use strict";

	if(!$) return;

	var CHESTS = {
		boxB2: {
			tier: "rare",
			rewards: [ "b2_fire", "b2_metal" ]
		},
		boxB3: {
			tier: "advanced",
			rewards: [ "b3_do", "b3_hwa", "b3_pok" ]
		},
		boxB4: {
			tier: "common",
			rewards: [ "b4_bb", "b4_hongsi", "b4_mint" ]
		}
	};
	var TIER_LABELS = {
		rare: "emblemChestTierRare",
		advanced: "emblemChestTierAdvanced",
		common: "emblemChestTierCommon"
	};
	var state = {
		id: null,
		phase: "closed",
		generation: 0,
		startedAt: 0,
		previousFocus: null,
		pageScrollLock: null,
		timers: [],
		uncertain: {}
	};
	var $stage;
	var $close;
	var $title;
	var $description;
	var $tier;
	var $pool;
	var $owned;
	var $status;
	var $action;
	var $actionLabel;
	var $actionMeta;
	var $chestTop;
	var $chestBottom;
	var $result;
	var $resultImage;
	var $resultKicker;
	var $resultName;

	function copy(key, fallback){
		var value = root.L && root.L[key];

		if($.isArray(value)) value = value[0];
		return (value === undefined || value === null || value === "") ? fallback : String(value);
	}

	function itemName(key){
		try{
			if(typeof root.iName == "function") return String(root.iName(key) || key);
		}catch(err){}
		return key;
	}

	function itemDescription(key){
		try{
			if(typeof root.iDesc == "function") return String(root.iDesc(key) || "");
		}catch(err){}
		return "";
	}

	function itemImage(key){
		try{
			if(typeof root.iImage == "function") return root.iImage(key);
		}catch(err){}
		return key.indexOf("boxB") === 0 ? "/img/kkutu/shop/" + key + ".svg?v=item-box-vector1" : "/img/kkutu/moremi/badge/" + key + ".png";
	}

	function ownedCount(id){
		var owned = root.$data && root.$data.box && root.$data.box[id];

		if(typeof owned == "number") return Math.max(0, owned);
		if(owned && typeof owned.value == "number") return Math.max(0, owned.value);
		return 0;
	}

	function reducedMotion(){
		return !!(root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches);
	}

	function schedule(callback, delay){
		var timer = root.setTimeout(callback, delay);

		state.timers.push(timer);
		return timer;
	}

	function clearTimers(){
		while(state.timers.length) root.clearTimeout(state.timers.pop());
	}

	function lockPageScroll(){
		var body = document.body;
		var documentElement = document.documentElement;
		var computedStyle;
		var scrollbarWidth;
		var paddingRight;

		if(!body) return;
		if(state.pageScrollLock){
			$(body).addClass("emblem-chest-active");
			return;
		}

		state.pageScrollLock = {
			paddingRight: body.style.getPropertyValue("padding-right"),
			paddingRightPriority: body.style.getPropertyPriority("padding-right")
		};
		scrollbarWidth = documentElement ? Math.max(0, (root.innerWidth || documentElement.clientWidth) - documentElement.clientWidth) : 0;
		if(scrollbarWidth){
			computedStyle = root.getComputedStyle ? root.getComputedStyle(body) : null;
			paddingRight = parseFloat(computedStyle && computedStyle.paddingRight) || 0;
			body.style.setProperty("padding-right", (paddingRight + scrollbarWidth) + "px", "important");
		}
		$(body).addClass("emblem-chest-active");
	}

	function unlockPageScroll(){
		var body = document.body;
		var lock = state.pageScrollLock;

		if(!body) return;
		$(body).removeClass("emblem-chest-active");
		if(!lock) return;

		if(lock.paddingRight){
			body.style.setProperty("padding-right", lock.paddingRight, lock.paddingRightPriority);
		}else{
			body.style.removeProperty("padding-right");
		}
		state.pageScrollLock = null;
	}

	function focusWithoutScroll($target){
		var target = $target && $target[0];

		if(!target || typeof target.focus != "function") return;
		try{
			target.focus({ preventScroll: true });
		}catch(err){
			target.focus();
		}
	}

	function play(key){
		try{
			if(typeof root.playSound == "function") root.playSound(key);
		}catch(err){}
	}

	function buildParticles($target, count){
		var i;

		for(i=0; i<count; i++){
			$target.append($("<i>")
				.addClass("emblem-chest-particle emblem-chest-particle-" + (i + 1))
				.attr("aria-hidden", "true")
			);
		}
	}

	function ensureStage(){
		var $scene;
		var $copy;
		var $headline;
		var $featured;
		var $visual;
		var $halo;
		var $chest;
		var $particles;
		var $footer;

		if($stage && $stage.length) return $stage;

		$stage = $("<div>")
			.attr({
				id: "EmblemChestStage",
				"aria-hidden": "true",
				role: "dialog",
				"aria-modal": "true",
				"aria-labelledby": "emblem-chest-title",
				"aria-describedby": "emblem-chest-description"
			})
			.addClass("emblem-chest-stage");
		$scene = $("<div>")
			.addClass("emblem-chest-scene");
		$close = $("<button>")
			.attr({ type: "button", "aria-label": copy("emblemChestClose", "Close") })
			.addClass("emblem-chest-close")
			.append($("<i>").addClass("fa fa-times").attr("aria-hidden", "true"))
			.append($("<span>").text(copy("emblemChestClose", "Close")));
		$copy = $("<section>").addClass("emblem-chest-copy");
		$tier = $("<div>").addClass("emblem-chest-tier");
		$title = $("<h2>").attr("id", "emblem-chest-title").addClass("emblem-chest-title");
		$description = $("<p>").attr("id", "emblem-chest-description").addClass("emblem-chest-description");
		$headline = $("<div>").addClass("emblem-chest-headline")
			.append($tier)
			.append($title)
			.append($("<div>").addClass("emblem-chest-title-rule"))
			.append($description);
		$featured = $("<div>").addClass("emblem-chest-featured")
			.append($("<h3>")
				.append($("<i>").addClass("fa fa-gift").attr("aria-hidden", "true"))
				.append($("<span>").text(copy("emblemChestFeatured", "Featured rewards")))
			)
			.append($pool = $("<div>").addClass("emblem-chest-pool"));
		$footer = $("<div>").addClass("emblem-chest-footer")
			.append($action = $("<button>")
				.attr({ type: "button", id: "emblem-chest-open" })
				.addClass("emblem-chest-action")
				.append($actionLabel = $("<span>").addClass("emblem-chest-action-label"))
				.append($actionMeta = $("<span>").addClass("emblem-chest-action-meta"))
			)
			.append($owned = $("<div>").addClass("emblem-chest-owned"))
			.append($status = $("<div>").addClass("emblem-chest-status").attr({
				role: "status",
				"aria-live": "polite"
			}));
		$copy.append($headline).append($featured).append($footer);

		$visual = $("<section>").addClass("emblem-chest-visual").attr("aria-label", copy("emblemChestPreview", "Chest preview"));
		$halo = $("<div>").addClass("emblem-chest-halo")
			.append($("<div>").addClass("emblem-chest-rays").attr("aria-hidden", "true"))
			.append($("<div>").addClass("emblem-chest-orbit emblem-chest-orbit-a").attr("aria-hidden", "true"))
			.append($("<div>").addClass("emblem-chest-orbit emblem-chest-orbit-b").attr("aria-hidden", "true"));
		$chest = $("<div>").addClass("emblem-chest-object")
			.append($("<div>").addClass("emblem-chest-shadow").attr("aria-hidden", "true"))
			.append($chestBottom = $("<img>").addClass("emblem-chest-sprite emblem-chest-bottom").attr({ alt: "", "aria-hidden": "true" }))
			.append($chestTop = $("<img>").addClass("emblem-chest-sprite emblem-chest-top").attr({ alt: "", "aria-hidden": "true" }));
		$particles = $("<div>").addClass("emblem-chest-particles").attr("aria-hidden", "true");
		buildParticles($particles, 18);
		$result = $("<div>").addClass("emblem-chest-result").attr("aria-hidden", "true")
			.append($("<div>").addClass("emblem-chest-result-glow").attr("aria-hidden", "true"))
			.append($resultKicker = $("<div>").addClass("emblem-chest-result-kicker"))
			.append($("<div>").addClass("emblem-chest-result-frame")
				.append($resultImage = $("<img>").addClass("emblem-chest-result-image").attr("alt", ""))
			)
			.append($resultName = $("<div>").addClass("emblem-chest-result-name"))
			.append($("<div>").addClass("emblem-chest-result-term")
				.append($("<i>").addClass("fa fa-clock-o").attr("aria-hidden", "true"))
				.append($("<span>").text(copy("emblemChestSevenDays", "7 days added")))
			);
		$visual.append($halo.append($chest).append($particles).append($result));
		$scene.append($copy).append($visual).append($("<div>").addClass("emblem-chest-flash").attr("aria-hidden", "true"));
		$stage.append($scene).append($close);
		$("body").append($stage);

		$close.on("click.emblemChest", closeStage);
		$action.on("click.emblemChest", function(){
			if(state.phase == "preview" || state.phase == "error") requestOpen();
			else if(state.phase == "revealed" || state.phase == "uncertain") closeStage();
		});
		$stage.on("mousedown.emblemChest", function(e){
			if(e.target === e.currentTarget) closeStage();
		});
		$(document).off("keydown.emblemChest").on("keydown.emblemChest", handleKeydown);
		return $stage;
	}

	function renderPool(config){
		$pool.empty();
		config.rewards.forEach(function(key){
			$pool.append($("<div>").addClass("emblem-chest-reward badge-" + key.slice(0, 2))
				.append($("<div>").addClass("emblem-chest-reward-art")
					.append($("<img>").attr({ src: itemImage(key), alt: "" }))
				)
				.append($("<div>").addClass("emblem-chest-reward-copy")
					.append($("<strong>").text(itemName(key)))
					.append($("<span>").text(copy("emblemChestEqualChance", "Equal chance")))
				)
			);
		});
	}

	function setPhase(phase){
		state.phase = phase;
		$stage.attr("data-phase", phase)
			.toggleClass("is-opening", phase == "opening")
			.toggleClass("is-bursting", phase == "bursting" || phase == "revealed")
			.toggleClass("is-revealed", phase == "revealed")
			.toggleClass("has-error", phase == "error" || phase == "uncertain");
		$stage.attr("aria-busy", phase == "opening" || phase == "bursting" ? "true" : "false");
		$close.prop("disabled", phase == "opening" || phase == "bursting");
	}

	function showPreview(id, opener){
		var config = CHESTS[id];
		var chestUrl;
		var count;
		var openLabel;

		if(!config) return false;
		ensureStage();
		clearTimers();
		state.generation++;
		state.id = id;
		state.previousFocus = opener && opener.jquery ? opener[0] : (opener || document.activeElement);
		chestUrl = itemImage(id);
		count = ownedCount(id);
		openLabel = copy("emblemChestOpen", "OPEN CHEST");
		lockPageScroll();

		$stage.removeClass("tier-common tier-rare tier-advanced is-visible is-bursting is-revealed has-error")
			.addClass("tier-" + config.tier)
			.attr("aria-hidden", "false")
			.show()
			.scrollTop(0)
			.scrollLeft(0);
		$tier.text(copy(TIER_LABELS[config.tier], config.tier.toUpperCase()) + " · " + copy("emblemChestLabel", "EMBLEM CHEST"));
		$title.text(itemName(id));
		$description.text(itemDescription(id) || copy("emblemChestDescription", "One of these emblems is waiting inside."));
		$chestTop.attr("src", chestUrl);
		$chestBottom.attr("src", chestUrl);
		$result.attr("aria-hidden", "true");
		$resultImage.attr({ src: "", alt: "" });
		$resultName.empty();
		renderPool(config);
		$owned.text(copy("emblemChestOwned", "OWNED") + "  ×" + count);
		$status.removeClass("is-error").text(copy("emblemChestTapHint", "Tap Open when you're ready."));
		$action.prop("disabled", count < 1).attr("aria-label", openLabel);
		$actionLabel.text(openLabel);
		$actionMeta.text(count > 0 ? copy("emblemChestGuaranteed", "1 EMBLEM GUARANTEED") : copy("emblemChestEmpty", "NO CHESTS LEFT"));
		if(state.uncertain[id]){
			setPhase("uncertain");
			$status.addClass("is-error").text(copy("emblemChestRetryLocked", "This chest is locked for this session because the previous result could not be confirmed."));
			$action.prop("disabled", false).attr("aria-label", copy("emblemChestClose", "CLOSE"));
			$actionLabel.text(copy("emblemChestClose", "CLOSE"));
			$actionMeta.text(copy("emblemChestNoRetry", "NO AUTOMATIC RETRY"));
		}else{
			setPhase("preview");
		}
		(root.requestAnimationFrame || function(fn){ root.setTimeout(fn, 0); })(function(){
			if(state.phase != "closed") $stage.addClass("is-visible");
		});
		schedule(function(){
			if(state.phase == "preview" || state.phase == "uncertain") focusWithoutScroll($action);
		}, reducedMotion() ? 0 : 240);
		return true;
	}

	function updateClientState(res){
		var my;

		root.$data.box = res.box;
		my = root.$data.users && root.$data.users[root.$data.id];
		if(my && res.data !== undefined) my.data = res.data;
		syncInventoryViews(true);
	}

	function syncInventoryViews(refreshGameServer){
		try{
			if(refreshGameServer && typeof root.send == "function") root.send("refresh");
		}catch(err){}
		try{
			if(typeof root.drawMyDress == "function") root.drawMyDress(root.$data._avGroup);
		}catch(err){}
		try{
			if(typeof root.updateMe == "function") root.updateMe();
		}catch(err){}
	}

	function isValidSuccess(res, config){
		return !!(
			res &&
			!res.error &&
			res.result == 200 &&
			res.box &&
			$.isArray(res.gain) &&
			res.gain.length == 1 &&
			res.gain[0] &&
			config.rewards.indexOf(res.gain[0].key) != -1
		);
	}

	function preloadImage(url, callback){
		var image = new Image();
		var finished = false;
		var finish = function(){
			if(finished) return;
			finished = true;
			callback();
		};

		image.onload = finish;
		image.onerror = finish;
		image.src = url;
		if(image.complete) finish();
		schedule(finish, 1200);
	}

	function requestOpen(){
		var id = state.id;
		var config = CHESTS[id];
		var generation;
		var minimumDelay;

		if(!config || (state.phase != "preview" && state.phase != "error")) return;
		if(ownedCount(id) < 1){
			$status.addClass("is-error").text(copy("emblemChestEmpty", "No chests left."));
			$action.prop("disabled", true);
			return;
		}

		clearTimers();
		generation = ++state.generation;
		state.startedAt = Date.now();
		minimumDelay = reducedMotion() ? 80 : 950;
		setPhase("opening");
		$status.removeClass("is-error").text(copy("emblemChestOpening", "Charging the chest…"));
		$action.prop("disabled", true);
		$actionLabel.text(copy("emblemChestOpening", "OPENING…"));
		$actionMeta.text(copy("emblemChestOpeningHint", "REWARD LOCKED IN ON SERVER"));
		play("store_item_click");

		$.ajax({
			url: "/consume/" + encodeURIComponent(id),
			type: "POST",
			dataType: "json",
			timeout: 15000
		})
			.done(function(res){
				var elapsed;
				var delay;

				if(generation != state.generation || state.phase != "opening") return;
				if(res && res.error){
					handleApplicationError(res.error, generation);
					return;
				}
				if(!isValidSuccess(res, config)){
					handleUncertain(generation);
					return;
				}
				updateClientState(res);
				elapsed = Date.now() - state.startedAt;
				delay = Math.max(0, minimumDelay - elapsed);
				preloadImage(itemImage(res.gain[0].key), function(){
					if(generation != state.generation || state.phase != "opening") return;
					schedule(function(){
						if(generation == state.generation && state.phase == "opening") burstOpen(res.gain[0], generation);
					}, delay);
				});
			})
			.fail(function(){
				if(generation != state.generation || state.phase != "opening") return;
				handleUncertain(generation);
			});
	}

	function burstOpen(reward, generation){
		var burstDelay = reducedMotion() ? 40 : 620;

		setPhase("bursting");
		$status.text(copy("emblemChestUnlocking", "Unlocked!"));
		play("kung");
		schedule(function(){
			if(generation != state.generation || state.phase != "bursting") return;
			showReward(reward);
		}, burstDelay);
	}

	function showReward(reward){
		var name = itemName(reward.key);
		var count = ownedCount(state.id);

		$result.removeClass("badge-b2 badge-b3 badge-b4").addClass("badge-" + reward.key.slice(0, 2));
		$resultKicker.text(copy("emblemChestYouReceived", "YOU RECEIVED"));
		$resultImage.attr({ src: itemImage(reward.key), alt: name });
		$resultName.text(name);
		$result.attr("aria-hidden", "false");
		$owned.text(copy("emblemChestRemaining", "REMAINING") + "  ×" + count);
		$status.removeClass("is-error").text(copy("emblemChestRewardReady", "Added to inventory: {V1}.").replace("{V1}", name));
		$action.prop("disabled", false).attr("aria-label", copy("emblemChestContinue", "CONTINUE"));
		$actionLabel.text(copy("emblemChestContinue", "CONTINUE"));
		$actionMeta.text(copy("emblemChestAdded", "ADDED TO INVENTORY"));
		setPhase("revealed");
		play("success");
		focusWithoutScroll($action);
	}

	function refreshInventory(done){
		var reconciled = false;

		done = done || function(){};
		if(!root.$data) return done();
		$.ajax({
			url: "/box",
			type: "GET",
			dataType: "json",
			timeout: 6000
		})
			.done(function(res){
				if(!res || res.error) return;
				root.$data.box = res;
				reconciled = true;
				syncInventoryViews(true);
			})
			.always(function(){ done(reconciled); });
	}

	function handleApplicationError(errorCode, generation){
		refreshInventory(function(reconciled){
			var message;

			if(generation != state.generation || state.phase != "opening") return;
			if(!reconciled){
				state.uncertain[state.id] = true;
				showUncertainState(false);
				return;
			}
			message = copy("error_" + errorCode, copy("emblemChestOpenFailed", "The chest could not be opened. Please try again."));
			setPhase("error");
			$status.addClass("is-error").text(message);
			$owned.text(copy("emblemChestOwned", "OWNED") + "  ×" + ownedCount(state.id));
			$action.prop("disabled", ownedCount(state.id) < 1).attr("aria-label", copy("emblemChestTryAgain", "TRY AGAIN"));
			$actionLabel.text(copy("emblemChestTryAgain", "TRY AGAIN"));
			$actionMeta.text(copy("emblemChestNotConsumed", "NOT CONSUMED"));
			focusWithoutScroll($action);
		});
	}

	function handleUncertain(generation){
		var id = state.id;

		state.uncertain[id] = true;
		showUncertainState(null);
		root.setTimeout(function(){
			refreshInventory(function(reconciled){
				if(generation != state.generation || state.phase != "uncertain" || state.id != id) return;
				showUncertainState(reconciled);
			});
		}, reducedMotion() ? 0 : 650);
	}

	function showUncertainState(reconciled){
		var message;

		setPhase("uncertain");
		if(reconciled === null){
			message = copy("emblemChestCheckingInventory", "Connection interrupted. Checking your inventory…");
		}else if(reconciled){
			message = copy("emblemChestConnectionUncertain", "Connection interrupted. Inventory was refreshed; check your emblems before opening another chest.");
		}else{
			message = copy("emblemChestInventoryUnverified", "Connection interrupted and inventory could not be verified. Reconnect before opening another chest.");
		}
		$status.addClass("is-error").text(message);
		$owned.text(copy("emblemChestOwned", "OWNED") + "  ×" + ownedCount(state.id));
		$action.prop("disabled", false).attr("aria-label", copy("emblemChestClose", "CLOSE"));
		$actionLabel.text(copy("emblemChestClose", "CLOSE"));
		$actionMeta.text(copy("emblemChestNoRetry", "NO AUTOMATIC RETRY"));
		focusWithoutScroll($action);
	}

	function closeStage(){
		var id;
		var previousFocus;

		if(!$stage || !$stage.is(":visible")) return;
		if(state.phase == "opening" || state.phase == "bursting") return;
		id = state.id;
		previousFocus = state.previousFocus;
		clearTimers();
		state.generation++;
		state.phase = "closed";
		state.id = null;
		$stage.removeClass("is-visible").attr({ "aria-hidden": "true", "aria-busy": "false" });
		root.setTimeout(function(){
			if(state.phase == "closed"){
				$stage.hide().removeClass("is-opening is-bursting is-revealed has-error");
				unlockPageScroll();
			}
		}, reducedMotion() ? 0 : 180);
		root.setTimeout(function(){
			var $inventoryItem = id ? $("#dress-" + id) : $();

			if($inventoryItem.length && $inventoryItem.is(":visible")) $inventoryItem.focus();
			else if(previousFocus && document.documentElement.contains(previousFocus)) previousFocus.focus();
		}, 0);
	}

	function handleKeydown(e){
		var $focusable;
		var first;
		var last;

		if(!$stage || !$stage.is(":visible") || state.phase == "closed") return;
		if(e.which == 27){
			e.preventDefault();
			closeStage();
			return;
		}
		if(e.which != 9) return;
		$focusable = $stage.find("button:visible:not(:disabled)");
		if(!$focusable.length){
			e.preventDefault();
			return;
		}
		first = $focusable[0];
		last = $focusable[$focusable.length - 1];
		if(e.shiftKey && document.activeElement === first){
			e.preventDefault();
			last.focus();
		}else if(!e.shiftKey && document.activeElement === last){
			e.preventDefault();
			first.focus();
		}
	}

	function preloadAssets(){
		var seen = {};

		Object.keys(CHESTS).forEach(function(id){
			[ id ].concat(CHESTS[id].rewards).forEach(function(key){
				var url = itemImage(key);
				var image;

				if(!url || seen[url]) return;
				seen[url] = true;
				image = new Image();
				image.src = url;
			});
		});
	}

	root.openEmblemChestExperience = showPreview;
	root.isEmblemChest = function(id){ return !!CHESTS[id]; };
	$(preloadAssets);
})(window, window.jQuery);
