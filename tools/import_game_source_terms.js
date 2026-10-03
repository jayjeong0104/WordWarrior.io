"use strict";

const https = require("https");
const { URL } = require("url");
const { Pool } = require("../Server/lib/node_modules/pg");
const GLOBAL = require("../Server/lib/sub/global.json");

const TOP_MARK = "\uFF02";
const MID_OPEN = "\uFF3B";
const MID_CLOSE = "\uFF3D";
const LOW_OPEN = "\uFF08";
const LOW_CLOSE = "\uFF09";
const APPLY = process.argv.includes("--apply");
const subjectArg = valueFor("--subject");

const TARGETS = {
	FORT: "FORTNITE",
	OVW: "OVERWATCH",
	CRL: "CLASH ROYALE",
	COD: "CALL OF DUTY",
	MINC: "MINECRAFT",
	VALO: "VALORANT",
	STA: "STARCRAFT",
	PUBG: "PUBG",
	APEX: "APEX LEGENDS",
	LOL: "LEAGUE OF LEGENDS"
};

const FANDOM_ROOTS = {
	FORT: {
		host: "fortnite.fandom.com",
		maxDepth: 2,
		maxPages: 1800,
		categories: [
			[ "Category:Weapons (Battle Royale)", "Fortnite Battle Royale weapon." ],
			[ "Category:Items", "Fortnite item." ],
			[ "Category:Consumables", "Fortnite consumable item." ],
			[ "Category:Named Locations", "Fortnite named location." ],
			[ "Category:Locations (Battle Royale)", "Fortnite Battle Royale location." ],
			[ "Category:Game Modes", "Fortnite game mode." ]
		]
	},
	STA: {
		host: "starcraft.fandom.com",
		maxDepth: 3,
		maxPages: 1800,
		categories: [
			[ "Category:StarCraft units", "StarCraft unit." ],
			[ "Category:StarCraft II units", "StarCraft II unit." ],
			[ "Category:StarCraft buildings", "StarCraft building." ],
			[ "Category:StarCraft II buildings", "StarCraft II building." ],
			[ "Category:Abilities", "StarCraft ability." ],
			[ "Category:Upgrades", "StarCraft upgrade." ],
			[ "Category:Heroes", "StarCraft hero." ]
		]
	},
	PUBG: {
		host: "pubg.fandom.com",
		maxDepth: 2,
		maxPages: 1200,
		categories: [
			[ "Category:Weapons", "PUBG weapon." ],
			[ "Category:Attachments", "PUBG attachment." ],
			[ "Category:Equipment", "PUBG equipment." ],
			[ "Category:Items", "PUBG item." ],
			[ "Category:Vehicles", "PUBG vehicle." ],
			[ "Category:Maps", "PUBG map." ],
			[ "Category:Locations", "PUBG location." ]
		]
	},
	APEX: {
		host: "apexlegends.fandom.com",
		maxDepth: 2,
		maxPages: 1500,
		categories: [
			[ "Category:Legends", "Apex Legends playable legend." ],
			[ "Category:Weapons", "Apex Legends weapon." ],
			[ "Category:Abilities", "Apex Legends ability." ],
			[ "Category:Items in Apex Legends", "Apex Legends item." ],
			[ "Category:Items", "Apex Legends item." ],
			[ "Category:Hop-Ups", "Apex Legends hop-up." ],
			[ "Category:Ordnance", "Apex Legends ordnance." ],
			[ "Category:Maps", "Apex Legends map." ],
			[ "Category:Locations", "Apex Legends location." ],
			[ "Category:Map features", "Apex Legends map feature." ],
			[ "Category:Game Modes", "Apex Legends game mode." ]
		]
	},
	COD: {
		host: "callofduty.fandom.com",
		maxDepth: 2,
		maxPages: 1800,
		categories: [
			[ "Category:Weapons Per Game", "Call of Duty weapon." ],
			[ "Category:Perks", "Call of Duty perk." ],
			[ "Category:Call of Duty Multiplayer Maps", "Call of Duty multiplayer map." ],
			[ "Category:Call of Duty: Zombies Maps", "Call of Duty Zombies map." ],
			[ "Category:Call of Duty Characters", "Call of Duty character." ],
			[ "Category:Call of Duty: Modern Warfare Characters", "Call of Duty character." ],
			[ "Category:Call of Duty: Black Ops Characters", "Call of Duty character." ],
			[ "Category:Call of Duty: Warzone Operators", "Call of Duty operator." ],
			[ "Category:Call of Duty: Warzone 2.0 Operators", "Call of Duty operator." ],
			[ "Category:Call of Duty: Mobile Scorestreaks", "Call of Duty scorestreak." ],
			[ "Category:Call of Duty: Black Ops III Scorestreaks", "Call of Duty scorestreak." ],
			[ "Category:Call of Duty: Modern Warfare III Killstreaks and Scorestreaks", "Call of Duty killstreak or scorestreak." ]
		]
	}
};

const MANUAL_TERMS = {
	FORT: [
		[ "battle bus", "Fortnite Battle Royale vehicle." ],
		[ "loot llama", "Fortnite loot container." ],
		[ "reboot van", "Fortnite respawn station." ],
		[ "victory royale", "Fortnite match win." ],
		[ "storm circle", "Fortnite Battle Royale storm area." ],
		[ "zero build", "Fortnite no-building Battle Royale mode." ],
		[ "save the world", "Fortnite cooperative survival mode." ],
		[ "creative mode", "Fortnite sandbox creation mode." ]
	],
	CRL: [
		[ "elixir", "Clash Royale battle resource." ],
		[ "king tower", "Clash Royale central tower." ],
		[ "princess tower", "Clash Royale arena tower." ],
		[ "arena", "Clash Royale battle arena." ],
		[ "clan war", "Clash Royale clan competition." ],
		[ "trophy road", "Clash Royale progression path." ],
		[ "card evolution", "Clash Royale card upgrade system." ],
		[ "training camp", "Clash Royale arena." ],
		[ "goblin stadium", "Clash Royale arena." ],
		[ "bone pit", "Clash Royale arena." ],
		[ "barbarian bowl", "Clash Royale arena." ],
		[ "pekka's playhouse", "Clash Royale arena." ],
		[ "spell valley", "Clash Royale arena." ],
		[ "builder's workshop", "Clash Royale arena." ],
		[ "royal arena", "Clash Royale arena." ],
		[ "frozen peak", "Clash Royale arena." ],
		[ "jungle arena", "Clash Royale arena." ],
		[ "hog mountain", "Clash Royale arena." ],
		[ "electro valley", "Clash Royale arena." ],
		[ "spooky town", "Clash Royale arena." ],
		[ "rascals hideout", "Clash Royale arena." ],
		[ "serenity peak", "Clash Royale arena." ],
		[ "miner's mine", "Clash Royale arena." ],
		[ "executioner's kitchen", "Clash Royale arena." ],
		[ "royal crypt", "Clash Royale arena." ],
		[ "silent sanctuary", "Clash Royale arena." ],
		[ "dragon spa", "Clash Royale arena." ],
		[ "boot camp", "Clash Royale arena." ],
		[ "pancake arena", "Clash Royale arena." ],
		[ "legendary arena", "Clash Royale arena." ]
	],
	COD: [
		[ "killstreak", "Call of Duty reward earned from consecutive eliminations." ],
		[ "scorestreak", "Call of Duty reward earned from score." ],
		[ "zombies", "Call of Duty cooperative undead survival mode." ],
		[ "pack a punch", "Call of Duty Zombies weapon upgrade machine." ],
		[ "mystery box", "Call of Duty Zombies random weapon box." ],
		[ "nuketown", "Call of Duty multiplayer map." ],
		[ "shipment", "Call of Duty multiplayer map." ],
		[ "rust", "Call of Duty multiplayer map." ],
		[ "verdansk", "Call of Duty Warzone map." ]
	],
	MINC: [
		[ "overworld", "Minecraft dimension." ],
		[ "nether", "Minecraft dimension." ],
		[ "the end", "Minecraft dimension." ],
		[ "redstone", "Minecraft item and wiring system." ],
		[ "crafting table", "Minecraft crafting block." ],
		[ "ender dragon", "Minecraft boss mob." ],
		[ "creeper", "Minecraft hostile mob." ],
		[ "enderman", "Minecraft neutral mob." ]
	],
	VALO: [
		[ "spike", "Valorant bomb objective." ],
		[ "retake", "Valorant site-recapture situation." ],
		[ "post plant", "Valorant round state after spike plant." ],
		[ "entry fragger", "Valorant attacking role." ],
		[ "eco round", "Valorant low-economy round." ]
	],
	STA: [
		[ "terran", "StarCraft playable race." ],
		[ "zerg", "StarCraft playable race." ],
		[ "protoss", "StarCraft playable race." ],
		[ "khalai", "StarCraft Protoss faction." ],
		[ "brood war", "StarCraft expansion." ]
	],
	PUBG: [
		[ "battlegrounds", "PUBG battle royale mode." ],
		[ "blue zone", "PUBG shrinking danger zone." ],
		[ "red zone", "PUBG bombardment zone." ],
		[ "airdrop", "PUBG supply crate drop." ],
		[ "winner winner chicken dinner", "PUBG match win phrase." ]
	],
	APEX: [
		[ "ring", "Apex Legends shrinking safe zone." ],
		[ "respawn beacon", "Apex Legends teammate respawn station." ],
		[ "jumpmaster", "Apex Legends squad drop leader." ],
		[ "knockdown shield", "Apex Legends defensive knockdown item." ]
	],
	OVW: [
		[ "payload", "Overwatch escort objective." ],
		[ "push", "Overwatch robot-control game mode." ],
		[ "control", "Overwatch objective game mode." ],
		[ "escort", "Overwatch payload game mode." ],
		[ "hybrid", "Overwatch assault-escort game mode." ]
	],
	LOL: [
		[ "summoner's rift", "League of Legends primary map." ],
		[ "howling abyss", "League of Legends ARAM map." ],
		[ "baron nashor", "League of Legends epic monster." ],
		[ "dragon soul", "League of Legends elemental dragon reward." ],
		[ "rift herald", "League of Legends epic monster." ],
		[ "nexus", "League of Legends base objective." ]
	]
};

const pool = new Pool({
	user: GLOBAL.PG_USER,
	password: GLOBAL.PG_PASSWORD,
	host: GLOBAL.PG_HOST,
	port: GLOBAL.PG_PORT,
	database: GLOBAL.PG_DATABASE
});

function valueFor(name){
	const index = process.argv.indexOf(name);
	if(index === -1) return null;
	return process.argv[index + 1] || null;
}

function normalizeWord(word){
	let value = String(word || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[\u2018\u2019\u201B\u02BC\uFF07]/g, "'")
		.replace(/[’‘`]/g, "'")
		.replace(/&/g, " and ")
		.replace(/\+/g, " plus ")
		.replace(/[^a-z0-9'. ]+/gi, " ")
		.replace(/(^|\s)'|'(\s|$)/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();
	if(value === "d va" || value === "dva") return "d.va";
	if(value === "l u c i o") return "lucio";
	return value;
}

function compactWord(word){
	return normalizeWord(word).replace(/\s+/g, "");
}

function splitThemes(theme){
	return String(theme || "")
		.split(",")
		.map(function(item){ return item.trim(); })
		.filter(Boolean);
}

function splitCsv(value){
	return String(value || "")
		.split(",")
		.map(function(item){ return item.trim(); })
		.filter(Boolean);
}

function joinUnique(values){
	return Array.from(new Set((values || []).filter(Boolean))).join(",");
}

function serializeMean(definition){
	return serializeMeanNumber(1, definition);
}

function serializeMeanNumber(index, definition){
	return [
		TOP_MARK + index + TOP_MARK,
		MID_OPEN + "1" + MID_CLOSE,
		LOW_OPEN + "1" + LOW_CLOSE,
		String(definition || "").trim()
	].join("");
}

function nextMeanNumber(mean){
	let max = 0;
	String(mean || "").replace(/\uFF02([0-9]+)\uFF02/g, function(match, number){
		max = Math.max(max, Number(number) || 0);
		return match;
	});
	return max + 1;
}

function appendMean(mean, definition){
	const current = String(mean || "").trim();
	const next = serializeMeanNumber(nextMeanNumber(current), definition);
	return current ? current + "  " + next : next;
}

function stripHtml(text){
	return String(text || "")
		.replace(/<style[\s\S]*?<\/style>/gi, " ")
		.replace(/<script[\s\S]*?<\/script>/gi, " ")
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&quot;/g, "\"")
		.replace(/&#39;/g, "'")
		.replace(/&apos;/g, "'")
		.replace(/\s+/g, " ")
		.trim();
}

function normalizeDefinition(description, fallback){
	let text = stripHtml(description);
	if(!text) text = fallback || "";
	text = text.replace(/\s+/g, " ").trim();
	if(text.length > 180){
		const firstSentence = text.match(/^.{30,180}?[.!?](?:\s|$)/);
		text = firstSentence ? firstSentence[0].trim() : text.slice(0, 177).trim() + "...";
	}
	if(!text) return "";
	text = text.charAt(0).toUpperCase() + text.slice(1);
	if(!/[.!?]$/.test(text)) text += ".";
	return text;
}

function normalizedText(text){
	return String(text || "")
		.toLowerCase()
		.replace(/[\uFF02\uFF3B\uFF3D\uFF08\uFF09]/g, " ")
		.replace(/[^a-z0-9']+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function hasUsableMean(mean){
	return /[a-z]/i.test(String(mean || "")
		.replace(/\uFF02[0-9]+\uFF02/g, "")
		.replace(/\uFF3B[0-9]+\uFF3D/g, "")
		.replace(/\uFF08[0-9]+\uFF09/g, ""));
}

function hasDefinition(mean, definition){
	const haystack = normalizedText(mean);
	const needle = normalizedText(definition);
	if(!needle) return true;
	return haystack.indexOf(needle) !== -1 || haystack.indexOf(needle.slice(0, 90)) !== -1;
}

function isGoodWord(word){
	const normalized = normalizeWord(word);
	if(!normalized) return false;
	if(normalized.length < 2 || normalized.length > 48) return false;
	if(normalized.split(" ").length > 8) return false;
	if(/^\d+$/.test(normalized)) return false;
	if(/^list of /.test(normalized)) return false;
	if(/^category /.test(normalized)) return false;
	if(/^file /.test(normalized)) return false;
	if(/^template /.test(normalized)) return false;
	if(/\b(images?|videos?|audio files?|voice lines?|quotes?|sound files?|icons?|galleries|gallery|transcripts?)\b/.test(normalized)) return false;
	if(/\b(unreleased|unused|cut content|removed content|development)\b/.test(normalized)) return false;
	if([ "weapon", "weapons", "item", "items", "map", "maps", "locations", "characters", "operators", "abilities", "perks" ].indexOf(normalized) !== -1) return false;
	return true;
}

function cleanWikiTitle(title){
	let text = String(title || "")
		.replace(/^Category:/i, "")
		.replace(/\/.*$/, "")
		.replace(/\s*\([^)]*(?:mobile|unused|unreleased|image|video|audio|weapon|map|perk|operator|character|call of duty|starcraft|apex legends|pubg|fortnite)[^)]*\)/gi, "")
		.replace(/\s+/g, " ")
		.trim();
	return text;
}

function isUsefulSubcategory(title){
	const normalized = normalizeWord(title);
	if(/\b(images?|videos?|audio|sound files?|voice lines?|icons?|galleries|gallery|transcripts?|screenshots?|logos?)\b/.test(normalized)) return false;
	if(/\b(unused|unreleased|cut content|removed content|development)\b/.test(normalized)) return false;
	return true;
}

function addTerm(terms, subject, word, definition, source){
	const normalized = normalizeWord(word);
	const finalDefinition = normalizeDefinition(definition, TARGETS[subject] + " term.");
	const key = subject + "\t" + normalized;
	if(!TARGETS[subject] || !isGoodWord(normalized) || !finalDefinition) return;
	if(!terms.has(key)){
		terms.set(key, {
			word: normalized,
			subject: subject,
			definition: finalDefinition,
			source: source || ""
		});
		return;
	}
	const current = terms.get(key);
	if(current.definition.length < 30 && finalDefinition.length > current.definition.length){
		current.definition = finalDefinition;
	}
}

function getJson(url){
	return new Promise(function(resolve, reject){
		const req = https.get(url, {
			headers: {
				"Accept": "application/json",
				"User-Agent": "KKuTu-game-source-importer/1.0"
			},
			timeout: 60000
		}, function(res){
			let body = "";
			res.setEncoding("utf8");
			res.on("data", function(chunk){ body += chunk; });
			res.on("end", function(){
				if(res.statusCode < 200 || res.statusCode >= 300){
					reject(new Error("HTTP " + res.statusCode + " for " + url));
					return;
				}
				try{
					resolve(JSON.parse(body));
				}catch(err){
					reject(new Error("Invalid JSON for " + url + ": " + err.message));
				}
			});
		});
		req.on("timeout", function(){
			req.destroy(new Error("Timeout for " + url));
		});
		req.on("error", reject);
	});
}

async function getJsonWithRetry(url){
	let lastError = null;
	for(let attempt = 1; attempt <= 3; attempt++){
		try{
			return await getJson(url);
		}catch(err){
			lastError = err;
			if(attempt < 3){
				await new Promise(function(resolve){ setTimeout(resolve, 1000 * attempt); });
			}
		}
	}
	throw lastError;
}

async function fetchLeagueOfLegends(terms){
	const versions = await getJsonWithRetry("https://ddragon.leagueoflegends.com/api/versions.json");
	const version = versions[0];
	const base = "https://ddragon.leagueoflegends.com/cdn/" + version + "/data/en_US/";
	const championFull = await getJsonWithRetry(base + "championFull.json");
	const items = await getJsonWithRetry(base + "item.json");
	const summoners = await getJsonWithRetry(base + "summoner.json");
	const runes = await getJsonWithRetry(base + "runesReforged.json");
	const maps = await getJsonWithRetry(base + "map.json");

	Object.keys(championFull.data || {}).forEach(function(id){
		const champ = championFull.data[id];
		addTerm(terms, "LOL", champ.name, (champ.blurb || "League of Legends champion."), "Riot Data Dragon");
		(champ.spells || []).forEach(function(spell){
			addTerm(terms, "LOL", spell.name, (spell.description || "League of Legends champion ability."), "Riot Data Dragon");
		});
		if(champ.passive && champ.passive.name){
			addTerm(terms, "LOL", champ.passive.name, (champ.passive.description || "League of Legends passive ability."), "Riot Data Dragon");
		}
	});
	Object.keys(items.data || {}).forEach(function(id){
		const item = items.data[id];
		if(item && item.name){
			addTerm(terms, "LOL", item.name, item.plaintext || "League of Legends item.", "Riot Data Dragon");
		}
	});
	Object.keys(summoners.data || {}).forEach(function(id){
		const spell = summoners.data[id];
		addTerm(terms, "LOL", spell.name, spell.description || "League of Legends summoner spell.", "Riot Data Dragon");
	});
	(runes || []).forEach(function(tree){
		addTerm(terms, "LOL", tree.name, "League of Legends rune path.", "Riot Data Dragon");
		(tree.slots || []).forEach(function(slot){
			(slot.runes || []).forEach(function(rune){
				addTerm(terms, "LOL", rune.name, rune.shortDesc || "League of Legends rune.", "Riot Data Dragon");
			});
		});
	});
	Object.keys((maps.data || {})).forEach(function(id){
		const map = maps.data[id];
		addTerm(terms, "LOL", map.mapName, "League of Legends map.", "Riot Data Dragon");
	});
}

async function fetchValorant(terms){
	const agents = await getJsonWithRetry("https://valorant-api.com/v1/agents?isPlayableCharacter=true");
	const weapons = await getJsonWithRetry("https://valorant-api.com/v1/weapons");
	const maps = await getJsonWithRetry("https://valorant-api.com/v1/maps");
	const modes = await getJsonWithRetry("https://valorant-api.com/v1/gamemodes");
	const gear = await getJsonWithRetry("https://valorant-api.com/v1/gear");

	(agents.data || []).forEach(function(agent){
		addTerm(terms, "VALO", agent.displayName, agent.description || "Valorant agent.", "VALORANT-API");
		(agent.abilities || []).forEach(function(ability){
			if(ability && ability.displayName && ability.displayName !== "Ultimate"){
				addTerm(terms, "VALO", ability.displayName, ability.description || "Valorant agent ability.", "VALORANT-API");
			}
		});
	});
	(weapons.data || []).forEach(function(weapon){
		addTerm(terms, "VALO", weapon.displayName, "Valorant weapon.", "VALORANT-API");
	});
	(maps.data || []).forEach(function(map){
		addTerm(terms, "VALO", map.displayName, "Valorant map.", "VALORANT-API");
	});
	(modes.data || []).forEach(function(mode){
		addTerm(terms, "VALO", mode.displayName, "Valorant game mode.", "VALORANT-API");
	});
	(gear.data || []).forEach(function(item){
		addTerm(terms, "VALO", item.displayName, item.description || "Valorant gear.", "VALORANT-API");
	});
}

async function fetchOverwatch(terms){
	const heroes = await getJsonWithRetry("https://overfast-api.tekrop.fr/heroes");
	const maps = await getJsonWithRetry("https://overfast-api.tekrop.fr/maps");
	for(const hero of heroes || []){
		addTerm(terms, "OVW", hero.name, "Overwatch " + hero.role + " hero.", "Overfast API");
		try{
			const detail = await getJsonWithRetry("https://overfast-api.tekrop.fr/heroes/" + encodeURIComponent(hero.key));
			(detail.abilities || []).forEach(function(ability){
				addTerm(terms, "OVW", ability.name, ability.description || "Overwatch hero ability.", "Overfast API");
			});
		}catch(err){
			process.stderr.write("WARN OVW hero detail failed for " + hero.key + ": " + err.message + "\n");
		}
	}
	(maps || []).forEach(function(map){
		addTerm(terms, "OVW", map.name, "Overwatch map.", "Overfast API");
	});
}

async function fetchClashRoyale(terms){
	const cards = await getJsonWithRetry("https://royaleapi.github.io/cr-api-data/json/cards.json");
	(cards || []).forEach(function(card){
		addTerm(terms, "CRL", card.name, card.description || "Clash Royale card.", "RoyaleAPI card data");
		if(card.is_evolved){
			addTerm(terms, "CRL", card.name + " evolution", "Clash Royale evolved card.", "RoyaleAPI card data");
		}
	});
}

async function fetchMinecraft(terms){
	const versions = await getJsonWithRetry("https://api.github.com/repos/PrismarineJS/minecraft-data/contents/data/pc");
	const version = versions
		.map(function(item){ return item.name; })
		.filter(function(name){ return /^1\.\d+(?:\.\d+)?$/.test(name); })
		.sort(compareVersions)
		.pop();
	const base = "https://raw.githubusercontent.com/PrismarineJS/minecraft-data/master/data/pc/" + version + "/";
	const files = [
		[ "items.json", "Minecraft item or block." ],
		[ "blocks.json", "Minecraft block." ],
		[ "entities.json", "Minecraft entity." ],
		[ "biomes.json", "Minecraft biome." ],
		[ "enchantments.json", "Minecraft enchantment." ],
		[ "effects.json", "Minecraft status effect." ]
	];
	for(const file of files){
		const rows = await getJsonWithRetry(base + file[0]);
		(rows || []).forEach(function(row){
			addTerm(terms, "MINC", row.displayName || row.name, file[1], "PrismarineJS minecraft-data " + version);
		});
	}
}

function compareVersions(a, b){
	const aa = a.split(".").map(Number);
	const bb = b.split(".").map(Number);
	const len = Math.max(aa.length, bb.length);
	for(let i = 0; i < len; i++){
		const av = aa[i] || 0;
		const bv = bb[i] || 0;
		if(av !== bv) return av - bv;
	}
	return 0;
}

async function fetchFortnite(terms){
	const map = await getJsonWithRetry("https://fortnite-api.com/v1/map");
	(((map || {}).data || {}).pois || []).forEach(function(poi){
		addTerm(terms, "FORT", poi.name, "Fortnite map point of interest.", "Fortnite-API map data");
	});
	await fetchFandomRoots(terms, "FORT");
}

async function fetchFandomRoots(terms, subject){
	const root = FANDOM_ROOTS[subject];
	if(!root) return;
	for(const item of root.categories){
		const category = item[0];
		const definition = item[1];
		const titles = await fetchFandomCategory(root.host, category, root.maxDepth, root.maxPages);
		titles.forEach(function(title){
			addTerm(terms, subject, cleanWikiTitle(title), definition, root.host + " " + category);
		});
	}
}

async function fetchFandomCategory(host, category, maxDepth, maxPages){
	const seenCategories = new Set();
	const seenTitles = new Set();
	const queue = [ { category: category, depth: 0 } ];

	while(queue.length && seenTitles.size < maxPages){
		const current = queue.shift();
		if(seenCategories.has(current.category)) continue;
		seenCategories.add(current.category);
		let cmcontinue = null;
		do{
			const url = new URL("https://" + host + "/api.php");
			url.searchParams.set("action", "query");
			url.searchParams.set("list", "categorymembers");
			url.searchParams.set("cmtitle", current.category);
			url.searchParams.set("cmlimit", "500");
			url.searchParams.set("format", "json");
			if(cmcontinue) url.searchParams.set("cmcontinue", cmcontinue);
			const json = await getJsonWithRetry(url.toString());
			const members = json.query && json.query.categorymembers || [];
			members.forEach(function(member){
				if(member.ns === 14 && current.depth < maxDepth && isUsefulSubcategory(member.title)){
					queue.push({ category: member.title, depth: current.depth + 1 });
				}else if(member.ns === 0){
					seenTitles.add(member.title);
				}
			});
			cmcontinue = json.continue && json.continue.cmcontinue;
		}while(cmcontinue && seenTitles.size < maxPages);
	}
	return Array.from(seenTitles);
}

async function fetchPubg(terms){
	await fetchFandomRoots(terms, "PUBG");
}

async function fetchApex(terms){
	await fetchFandomRoots(terms, "APEX");
}

async function fetchCallOfDuty(terms){
	await fetchFandomRoots(terms, "COD");
}

async function fetchStarCraft(terms){
	await fetchFandomRoots(terms, "STA");
}

function addManualTerms(terms, subject){
	(MANUAL_TERMS[subject] || []).forEach(function(item){
		addTerm(terms, subject, item[0], item[1], "manual curated");
	});
}

async function fetchSubjectTerms(subject){
	const terms = new Map();
	addManualTerms(terms, subject);
	if(subject === "LOL") await fetchLeagueOfLegends(terms);
	else if(subject === "VALO") await fetchValorant(terms);
	else if(subject === "OVW") await fetchOverwatch(terms);
	else if(subject === "CRL") await fetchClashRoyale(terms);
	else if(subject === "MINC") await fetchMinecraft(terms);
	else if(subject === "FORT") await fetchFortnite(terms);
	else if(subject === "PUBG") await fetchPubg(terms);
	else if(subject === "APEX") await fetchApex(terms);
	else if(subject === "COD") await fetchCallOfDuty(terms);
	else if(subject === "STA") await fetchStarCraft(terms);
	return Array.from(terms.values());
}

async function loadExisting(client){
	const q = await client.query("SELECT _id, type, mean, theme, flag, hit FROM kkutu_en");
	const map = new Map();
	q.rows.forEach(function(row){
		map.set(normalizeWord(row._id), row);
	});
	return map;
}

function planRows(existing, fetchedRows){
	const inserts = [];
	const updates = [];
	fetchedRows.forEach(function(row){
		const current = existing.get(normalizeWord(row.word));
		if(current){
			const currentMean = String(current.mean || "").trim();
			let nextType = String(current.type || "");
			let nextTheme = String(current.theme || "");
			let nextMean = currentMean;
			const themes = splitThemes(nextTheme);

			if(!hasUsableMean(currentMean)){
				nextType = joinUnique(splitCsv(nextType).concat([ "INJEONG" ]));
				nextTheme = joinUnique(themes.concat([ row.subject ]));
				nextMean = serializeMean(row.definition);
			}else if(!themes.includes(row.subject) || !hasDefinition(currentMean, row.definition)){
				nextType = splitCsv(nextType).concat([ "INJEONG" ]).join(",");
				nextTheme = joinUnique(themes.concat([ row.subject ]));
				nextMean = appendMean(currentMean, row.definition);
			}

			if(nextType !== String(current.type || "") || nextTheme !== String(current.theme || "") || nextMean !== currentMean){
				updates.push({
					id: current._id,
					type: nextType,
					theme: nextTheme,
					mean: nextMean,
					subject: row.subject,
					source: row.source
				});
				current.type = nextType;
				current.theme = nextTheme;
				current.mean = nextMean;
			}
			return;
		}

		const inserted = {
			_id: row.word,
			type: "INJEONG",
			mean: serializeMean(row.definition),
			hit: 0,
			theme: row.subject,
			flag: 2,
			source: row.source
		};
		inserts.push(inserted);
		existing.set(normalizeWord(row.word), inserted);
	});
	return { inserts, updates };
}

async function applyPlan(client, plan){
	await client.query("BEGIN");
	try{
		for(const row of plan.updates){
			await client.query("UPDATE kkutu_en SET type=$1, mean=$2, theme=$3 WHERE _id=$4", [
				row.type,
				row.mean,
				row.theme,
				row.id
			]);
		}
		for(const row of plan.inserts){
			await client.query(
				"INSERT INTO kkutu_en (_id, type, mean, hit, theme, flag) VALUES ($1, $2, $3, $4, $5, $6)",
				[ row._id, row.type, row.mean, row.hit, row.theme, row.flag ]
			);
		}
		await client.query("COMMIT");
	}catch(err){
		await client.query("ROLLBACK");
		throw err;
	}
}

async function countTheme(client, theme){
	const q = await client.query(
		"SELECT COUNT(*)::int AS count FROM kkutu_en WHERE string_to_array(COALESCE(theme, ''), ',') @> ARRAY[$1]",
		[ theme ]
	);
	return q.rows[0].count;
}

async function main(){
	const requested = subjectArg ? [ subjectArg.toUpperCase() ] : Object.keys(TARGETS);
	const unknown = requested.filter(function(subject){ return !TARGETS[subject]; });
	if(unknown.length) throw new Error("Unknown subject(s): " + unknown.join(", "));

	const allFetched = [];
	for(const subject of requested){
		process.stderr.write("FETCH " + subject + " " + TARGETS[subject] + "\n");
		const rows = await fetchSubjectTerms(subject);
		process.stderr.write("FETCHED " + subject + " " + rows.length + "\n");
		allFetched.push.apply(allFetched, rows);
	}

	const client = await pool.connect();
	try{
		const existing = await loadExisting(client);
		const plan = planRows(existing, allFetched);
		const bySubject = {};
		allFetched.forEach(function(row){
			bySubject[row.subject] = (bySubject[row.subject] || 0) + 1;
		});

		console.log(JSON.stringify({
			mode: APPLY ? "apply" : "dry-run",
			fetched: bySubject,
			inserts: plan.inserts.length,
			updates: plan.updates.length,
			insertSamples: plan.inserts.slice(0, 20).map(function(row){ return row._id + " [" + row.theme + "]"; }),
			updateSamples: plan.updates.slice(0, 20).map(function(row){ return row.id + " [" + row.subject + "]"; })
		}, null, 2));

		if(APPLY){
			await applyPlan(client, plan);
			for(const subject of requested){
				console.log("COUNT " + subject + " " + await countTheme(client, subject));
			}
		}
	}finally{
		client.release();
		await pool.end();
	}
}

main().catch(function(err){
	console.error(err && err.stack || err);
	process.exit(1);
});
