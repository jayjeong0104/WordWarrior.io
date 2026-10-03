(function(){
	var TOP_MARK = "\uFF02";
	var MID_OPEN = "\uFF3B";
	var MID_CLOSE = "\uFF3D";
	var LOW_OPEN = "\uFF08";
	var LOW_CLOSE = "\uFF09";
	var TOP_RE = /\uFF02[0-9]+\uFF02/;
	var MID_RE = /\uFF3B[0-9]+\uFF3D/;
	var LOW_RE = /\uFF08[0-9]+\uFF09/;
	var WIDTH = {
		y: 50,
		t: 50,
		g: 100,
		l: 200,
		m: 600
	};
	var NEW_WORD_SUBJECTS = {
		ko: [
			{ value: "1001", label: "Country" },
			{ value: "150", label: "Literature" },
			{ value: "490", label: "Computer" },
			{ value: "530", label: "Chemistry" },
			{ value: "160", label: "Physics" },
			{ value: "240", label: "Mathematics" },
			{ value: "310", label: "Linguistics" },
			{ value: "350", label: "Sports" },
			{ value: "450", label: "Astronomy" },
			{ value: "30", label: "Economy" },
			{ value: "40", label: "Historic Site" },
			{ value: "CITY", label: "City" },
			{ value: "ANIME", label: "Anime" },
			{ value: "VOLL", label: "Volleyball" },
			{ value: "BASE", label: "Baseball" },
			{ value: "AMFB", label: "American Football" },
			{ value: "BRAND", label: "Brand Name" },
			{ value: "400", label: "Politics" },
			{ value: "460", label: "Philosophy" },
			{ value: "MUTH", label: "Music Theory" },
			{ value: "MUSN", label: "Musicians" },
			{ value: "230", label: "Biology" },
			{ value: "IDEO", label: "Ideology" },
			{ value: "BRAWL", label: "Brawl Stars" },
			{ value: "COD", label: "Call of Duty" },
			{ value: "MOB", label: "Mobile Games" },
			{ value: "NBAP", label: "Basketball" },
			{ value: "SOCP", label: "Football(Soccer)" }
		],
		en: [
			{ value: "e05", label: "Animal" },
			{ value: "e08", label: "Human Body" },
			{ value: "e12", label: "Emotion" },
			{ value: "e13", label: "Food" },
			{ value: "e15", label: "Place Name" },
			{ value: "e20", label: "Plant" },
			{ value: "e43", label: "Weather" },
			{ value: "160", label: "Physics" },
			{ value: "530", label: "Chemistry" },
			{ value: "CITY", label: "City" },
			{ value: "ANIME", label: "Anime" },
			{ value: "VOLL", label: "Volleyball" },
			{ value: "BASE", label: "Baseball" },
			{ value: "AMFB", label: "American Football" },
			{ value: "BRAND", label: "Brand Name" },
			{ value: "400", label: "Politics" },
			{ value: "460", label: "Philosophy" },
			{ value: "MUTH", label: "Music Theory" },
			{ value: "MUSN", label: "Musicians" },
			{ value: "230", label: "Biology" },
			{ value: "IDEO", label: "Ideology" },
			{ value: "BRAWL", label: "Brawl Stars" },
			{ value: "COD", label: "Call of Duty" },
			{ value: "MOB", label: "Mobile Games" },
			{ value: "NBAP", label: "Basketball" },
			{ value: "SOCP", label: "Football(Soccer)" }
		]
	};
	var NEW_WORD_TYPES = {
		ko: [
			{ value: "1", label: "Noun" },
			{ value: "10", label: "Affix" },
			{ value: "5", label: "Verb" },
			{ value: "6", label: "Adjective" },
			{ value: "8", label: "Adverb" },
			{ value: "9", label: "Interjection" }
		],
		en: [
			{ value: "n", label: "Noun" },
			{ value: "s", label: "Suffix" },
			{ value: "v", label: "Verb" },
			{ value: "a", label: "Adjective" },
			{ value: "r", label: "Adverb" },
			{ value: "p", label: "Pronoun" },
			{ value: "int", label: "Interjection" },
			{ value: "prep", label: "Preposition" },
			{ value: "aux", label: "Auxiliary Verb" }
		]
	};

	function putter(id, kind, value){
		return $("<input>").attr("id", id).css("width", WIDTH[kind]).val(value == null ? "" : value);
	}
	function wordPutter(x1, x2, x3, kind, value){
		return putter("word-" + [ x1, x2, x3, kind ].join("-"), kind, value);
	}
	function actionCell(x1, x2, x3){
		var key = [ "wa", x1, x2, x3 ].join("-") + "-";

		return $("<td>")
			.append($("<button>").attr("id", key + "u").css("float", "left").html("▲").on("click", onAction))
			.append($("<button>").attr("id", key + "x").css("float", "left").html("X").on("click", onAction))
			.append($("<button>").attr("id", key + "e").css("float", "left").html("?").on("click", onAction))
			.append($("<button>").attr("id", key + "d").css("float", "left").html("▼").on("click", onAction));
	}
	function renderRow(x1, x2, x3, type, theme, mean){
		return $("<tr>").attr("id", [ "wr", x1, x2, x3 ].join("-"))
			.append($("<td>").html([ x1, x2, x3 ].join("-")))
			.append($("<td>").append(wordPutter(x1, x2, x3, "y", type)))
			.append($("<td>").append(wordPutter(x1, x2, x3, "t", theme)))
			.append($("<td>").append(wordPutter(x1, x2, x3, "m", mean)))
			.append(actionCell(x1, x2, x3));
	}
	function changeId($row, nextKey){
		var prevKey = $row.attr("id").slice(3);

		$row.attr("id", "wr-" + nextKey).children("td").first().html(nextKey);
		$row.find("*").each(function(_, node){
			var $node = $(node);
			var id = $node.attr("id");

			if(id && id.indexOf(prevKey) !== -1){
				$node.attr("id", id.replace(prevKey, nextKey));
			}
		});
	}
	function onAction(e){
		var key = $(e.currentTarget).attr("id").slice(3).split("-");
		var code = key.pop();
		var currentKey = key.join("-");
		var $target = $("#wr-" + currentKey);
		var nextKey;

		switch(code){
		case "u":
			if(!$target.prev().length) return;
			if(e.shiftKey){
				nextKey = $target.prev().attr("id").slice(3);
				changeId($target, nextKey);
				changeId($target.prev(), currentKey);
			}
			$target.prev().before($target);
			break;
		case "x":
			$target.remove();
			break;
		case "e":
			nextKey = prompt("new key", currentKey);
			if(nextKey) changeId($target, nextKey);
			break;
		case "d":
			if(!$target.next().length) return;
			if(e.shiftKey){
				nextKey = $target.next().attr("id").slice(3);
				changeId($target, nextKey);
				changeId($target.next(), currentKey);
			}
			$target.next().after($target);
			break;
		}
	}
	function emptyWordDoc(word){
		return {
			_id: word || "",
			flag: "",
			hit: "",
			type: "",
			theme: "",
			mean: ""
		};
	}
	function setWordMeta(doc){
		var flag = doc && doc.flag != null ? doc.flag : "";
		var hit = doc && doc.hit != null ? doc.hit : "";

		$("#wd-id").text(doc && doc._id ? doc._id : "");
		$("#wd-flag").val(flag);
		$("#word-flag").text("flag: " + flag);
		$("#word-hit").text("hit: " + hit);
	}
	function clearWordEditor(message){
		$("#wd-data").empty();
		setWordMeta(emptyWordDoc(""));
		if(message) $("#wd-id").text(message);
	}
	function parseMean(mean){
		if(typeof mean !== "string" || !mean.length) return [];
		if(mean.indexOf(TOP_MARK) === -1) return [ [ [ mean ] ] ];

		return mean.split(TOP_RE).slice(1).map(function(level1){
			if(level1.indexOf(MID_OPEN) === -1) return [ [ level1 ] ];
			return level1.split(MID_RE).slice(1).map(function(level2){
				if(level2.indexOf(LOW_OPEN) === -1) return [ level2 ];
				return level2.split(LOW_RE).slice(1);
			});
		});
	}
	function serializeMean(groups){
		return (groups || []).map(function(level1, x1){
			level1 = level1 || [ [ "" ] ];
			return TOP_MARK + (x1 + 1) + TOP_MARK + level1.map(function(level2, x2){
				level2 = level2 || [ "" ];
				return MID_OPEN + (x2 + 1) + MID_CLOSE + level2.map(function(level3, x3){
					return LOW_OPEN + (x3 + 1) + LOW_CLOSE + (level3 == null ? "" : level3);
				}).join("");
			}).join("");
		}).join("");
	}
	function renderWord(doc){
		var types = doc.type ? String(doc.type).split(",") : [];
		var themes = doc.theme ? String(doc.theme).split(",") : [];
		var means = parseMean(doc.mean);
		var $table = $("#wd-data").empty();

		setWordMeta(doc);
		if(!means.length) return;

		means.forEach(function(level1, x1){
			level1.forEach(function(level2, x2){
				var type = types.shift() || "";
				level2.forEach(function(level3, x3){
					$table.append(renderRow(x1, x2, x3, type, themes.shift() || "", level3));
				});
			});
		});
	}
	function buildWordDoc(){
		var doc = {
			_id: $("#db-word").val().trim(),
			flag: $("#wd-flag").val(),
			type: [],
			theme: [],
			mean: []
		};
		var prevTypeKey = null;

		$("#wd-data tr").each(function(_, row){
			var key = $(row).children("td").first().html().split("-");
			var typeKey = key[0] + "-" + key[1];
			var item = {
				type: $("#word-" + [ key[0], key[1], key[2], "y" ].join("-")).val(),
				theme: $("#word-" + [ key[0], key[1], key[2], "t" ].join("-")).val(),
				mean: $("#word-" + [ key[0], key[1], key[2], "m" ].join("-")).val()
			};

			if(prevTypeKey !== typeKey){
				doc.type.push(item.type);
				prevTypeKey = typeKey;
			}
			doc.theme.push(item.theme);
			if(!doc.mean[key[0]]) doc.mean[key[0]] = [];
			if(!doc.mean[key[0]][key[1]]) doc.mean[key[0]][key[1]] = [];
			doc.mean[key[0]][key[1]][key[2]] = item.mean;
		});
		doc.type = doc.type.join(",");
		doc.theme = doc.theme.join(",");
		doc.mean = serializeMean(doc.mean);

		return doc;
	}
	function loadWord(){
		var word = $("#db-word").val().trim();
		var lang = $("#db-lang").val();

		if(!word){
			clearWordEditor("");
			return;
		}
		$.get("/gwalli/kkutudb/" + encodeURIComponent(word) + "?lang=" + encodeURIComponent(lang))
			.done(function(res){
				renderWord(res || emptyWordDoc(word));
			})
			.fail(function(){
				clearWordEditor(word + " (not found)");
			});
	}
	function addWordRow(){
		var key = prompt("key (x-y-z)", "0-0-0");

		if(!key) return;
		key = key.split("-");
		if(key.length !== 3) return;
		$("#wd-data").append(renderRow(key[0], key[1], key[2], "", "", ""));
	}
	function saveWord(){
		var word = $("#db-word").val().trim();
		var lang = $("#db-lang").val();
		var data;

		if(!word){
			alert("word is required");
			return;
		}
		data = buildWordDoc();
		data._id = word;
		$.post("/gwalli/kkutudb/" + encodeURIComponent(word), {
			pw: $("#db-password").val(),
			lang: lang,
			data: JSON.stringify(data)
		})
			.done(function(res){
				alert(res);
				loadWord();
				loadDictionaryRequests();
			})
			.fail(function(xhr){
				alert("save failed: " + xhr.status);
			});
	}
	function deleteWord(){
		var word = $("#db-word").val().trim();
		var lang = $("#db-lang").val();
		var data;

		if(!word){
			alert("word is required");
			return;
		}
		if(!confirm("Delete '" + word + "' from KKuTu DB?")) return;

		data = {
			_id: word,
			flag: 0,
			type: "",
			theme: "",
			mean: ""
		};
		$.post("/gwalli/kkutudb/" + encodeURIComponent(word), {
			pw: $("#db-password").val(),
			lang: lang,
			data: JSON.stringify(data)
		})
			.done(function(res){
				alert(res);
				$("#db-word").val("");
				clearWordEditor("");
			})
			.fail(function(xhr){
				alert("delete failed: " + xhr.status);
			});
	}
	function renderSelectOptions($select, items, placeholder){
		var current = $select.val();

		$select.empty().append($("<option>").val("").text(placeholder));
		(items || []).forEach(function(item){
			$select.append($("<option>").val(item.value).text(item.label));
		});
		if(current) $select.val(current);
		if(!$select.val()) $select.prop("selectedIndex", 0);
	}
	function populateNewWordOptions(){
		var lang = $("#db-lang").val();

		renderSelectOptions($("#new-word-subject"), NEW_WORD_SUBJECTS[lang], "subject");
		renderSelectOptions($("#new-word-type"), NEW_WORD_TYPES[lang], "word type");
	}
	function toggleNewWord(forceOpen){
		var $panel = $("#gwalli-new-word");
		var nextOpen = typeof forceOpen === "boolean" ? forceOpen : !$panel.hasClass("is-open");

		populateNewWordOptions();
		$panel.toggleClass("is-open", nextOpen);
		$("#db-new-word").toggleClass("toggled", nextOpen);
		if(nextOpen){
			$("#new-word-id").val($("#db-word").val().trim());
			$("#new-word-id").trigger("focus");
		}
	}
	function createNewWord(){
		var word = $("#new-word-id").val().trim();
		var subject = $("#new-word-subject").val();
		var type = $("#new-word-type").val();
		var definition = $("#new-word-definition").val().trim();
		var lang = $("#db-lang").val();
		var data;

		if(!word){
			alert("word is required");
			return;
		}
		if(!subject){
			alert("subject is required");
			return;
		}
		if(!type){
			alert("word type is required");
			return;
		}
		if(!definition){
			alert("definition is required");
			return;
		}

		data = {
			_id: word,
			flag: 0,
			type: type,
			theme: subject,
			mean: serializeMean([ [ [ definition ] ] ])
		};
		$.post("/gwalli/kkutudb/" + encodeURIComponent(word), {
			pw: $("#db-password").val(),
			lang: lang,
			data: JSON.stringify(data)
		})
			.done(function(res){
				alert(res);
				$("#db-word").val(word);
				$("#new-word-definition").val("");
				toggleNewWord(false);
				loadWord();
				loadDictionaryRequests();
			})
			.fail(function(xhr){
				alert("create failed: " + xhr.status);
			});
	}
	function formatDictionaryRequestDate(value){
		var date = new Date(value || 0);

		if(isNaN(date.getTime())) return "";
		return date.toLocaleString();
	}
	function loadDictionaryRequestIntoEditor(item){
		if(!item) return;
		$("#db-lang").val(item.lang == "ko" ? "ko" : "en");
		populateNewWordOptions();
		toggleNewWord(true);
		$("#db-word").val(item.word || "");
		$("#new-word-id").val(item.word || "").trigger("focus");
		$("#new-word-subject").prop("selectedIndex", 0);
		$("#new-word-type").prop("selectedIndex", 0);
		$("#new-word-definition").val("");
		location.hash = "#gwalli-kkutudb";
	}
	function removeDictionaryRequest(item){
		if(!item || !item.word) return;
		if(!confirm("Reject '" + item.word + "' request?")) return;

		$.post("/gwalli/dictrequests/remove", {
			pw: $("#db-password").val(),
			word: item.word,
			lang: item.lang
		})
			.done(function(){
				loadDictionaryRequests();
			})
			.fail(function(xhr){
				alert("request remove failed: " + xhr.status);
			});
	}
	function loadDictionaryRequests(){
		var $body = $("#dict-requests-data");

		if(!$body.length) return;
		$.get("/gwalli/dictrequests")
			.done(function(res){
				var list = (res && res.list) || [];

				$body.empty();
				if(!list.length){
					$body.append(
						$("<tr>").append(
							$("<td>").attr("colspan", 5).text("No pending requests.")
						)
					);
					return;
				}
				list.forEach(function(item){
					var $actions = $("<td>")
						.append(
							$("<button>").text("Load").on("click", function(){
								loadDictionaryRequestIntoEditor(item);
							})
						)
						.append(
							$("<button>").css("margin-left", "6px").text("Reject").on("click", function(){
								removeDictionaryRequest(item);
							})
						);

					$body.append(
						$("<tr>")
							.append($("<td>").text(item.word || ""))
							.append($("<td>").text(item.lang || ""))
							.append($("<td>").text(item.requesterName || item.requesterId || ""))
							.append($("<td>").text(formatDictionaryRequestDate(item.createdAt)))
							.append($actions)
					);
				});
			})
			.fail(function(xhr){
				$body.empty().append(
					$("<tr>").append(
						$("<td>").attr("colspan", 5).text("Failed to load requests (" + xhr.status + ")")
					)
				);
			});
	}

	$(document).ready(function(){
		clearWordEditor("");
		populateNewWordOptions();
		$("#db-go").off("click").on("click", loadWord);
		$("#db-new-word").off("click").on("click", function(){
			toggleNewWord();
		});
		$("#word-add").off("click").on("click", addWordRow);
		$("#db-delete").off("click").on("click", deleteWord);
		$("#db-apply").off("click").on("click", saveWord);
		$("#new-word-create").off("click").on("click", createNewWord);
		$("#dict-requests-refresh").off("click").on("click", loadDictionaryRequests);
		$("#db-lang").on("change", function(){
			populateNewWordOptions();
			clearWordEditor("");
		});
		loadDictionaryRequests();
	});
}());
