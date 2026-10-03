"use strict";

const https = require("https");
const querystring = require("querystring");
const { Pool } = require("../Server/lib/node_modules/pg");
const GLOBAL = require("../Server/lib/sub/global.json");
const DATA = require("./subject_target_data");
const MANUAL = require("./manual_subject_terms");

const ENDPOINT = "https://query.wikidata.org/sparql";
const USER_AGENT = "KKuTu-Wikidata-Subject-Importer/1.0 (local DB enrichment; https://www.wikidata.org/)";
const TOP_MARK = "\uFF02";
const MID_OPEN = "\uFF3B";
const MID_CLOSE = "\uFF3D";
const LOW_OPEN = "\uFF08";
const LOW_CLOSE = "\uFF09";
const APPLY = process.argv.includes("--apply");
const FORCE_ORDER = process.argv.includes("--force-order");

const subjectArg = valueFor("--subject");
const limitArg = Number(valueFor("--limit") || 0);
const sampleArg = Number(valueFor("--sample") || 12);

const pool = new Pool({
	user: GLOBAL.PG_USER,
	password: GLOBAL.PG_PASSWORD,
	host: GLOBAL.PG_HOST,
	port: GLOBAL.PG_PORT,
	database: GLOBAL.PG_DATABASE
});

const COMMON_SKIP_DESCRIPTION = [
	"wikimedia disambiguation page",
	"wikimedia category",
	"wikimedia list article",
	"wikimedia template",
	"scientific article",
	"family name",
	"given name",
	"human name",
	"surname",
	"redirect page",
	"identifier",
	"category page"
];

const SUBJECT_WORD_BLOCKLIST = {
	BRAND: new Set([
		"spam",
		"text"
	])
};

const SUBJECTS = [
	subject("CITY", "CITY", 1200, 10, "INJEONG", [
		instanceOf("Q515")
	]),
	subject("ANIME", "ANIME", 5000, 1, "INJEONG", [
		instanceSubclassOf("Q1107"),
		instanceOf("Q1107"),
		"?item wdt:P31/wdt:P279* wd:Q11424; wdt:P495 wd:Q17; wdt:P136 wd:Q1107.",
		"?item wdt:P136/wdt:P279* wd:Q1107.",
		mainSubject("Q1107"),
		instanceOfLabel("anime television series"),
		instanceOfLabel("anime film"),
		instanceOfLabel("original video animation"),
		genreLabel("anime")
	], {
		requireDescription: [ "anime", "animated", "animation" ],
		manual: MANUAL.ANIME
	}),
	subject("POK", "POKEMON", 1000, 2, "INJEONG", [
		rooted("Pokémon")
	], {
		requireDescription: [ "pokémon", "pokemon" ]
	}),
	subject("CRL", "CLASH ROYALE", 600, 1, "INJEONG", [
		rooted("Clash Royale")
	], {
		requireDescription: [ "clash royale", "video game" ]
	}),
	subject("MINC", "MINECRAFT", 800, 2, "INJEONG", [
		rooted("Minecraft")
	], {
		requireDescription: [ "minecraft" ]
	}),
	subject("FORT", "FORTNITE", 800, 2, "INJEONG", [
		rooted("Fortnite"),
		rooted("Fortnite Battle Royale")
	], {
		requireDescription: [ "fortnite" ]
	}),
	subject("VALO", "VALORANT", 600, 1, "INJEONG", [
		rooted("Valorant")
	], {
		requireDescription: [ "valorant" ]
	}),
	subject("STA", "STARCRAFT", 600, 2, "INJEONG", [
		rooted("StarCraft")
	], {
		requireDescription: [ "starcraft" ]
	}),
	subject("PUBG", "PUBG", 600, 1, "INJEONG", [
		rooted("PUBG: Battlegrounds"),
		rooted("PlayerUnknown's Battlegrounds")
	], {
		requireDescription: [ "pubg", "playerunknown", "battle royale" ]
	}),
	subject("OVW", "OVERWATCH", 700, 2, "INJEONG", [
		rooted("Overwatch"),
		rooted("Overwatch 2")
	], {
		requireDescription: [ "overwatch" ]
	}),
	subject("APEX", "APEX LEGENDS", 600, 1, "INJEONG", [
		rooted("Apex Legends")
	], {
		requireDescription: [ "apex legends" ]
	}),
	subject("VOLL", "VOLLEYBALL", 1200, 4, "INJEONG", [
		sport("Q1734"),
		instanceOf("Q1734")
	], {
		ordered: false,
		requireDescription: [ "volleyball" ],
		skipSpecificYearTournaments: true
	}),
	subject("BASE", "BASEBALL", 1500, 5, "INJEONG", [
		sport("Q5369"),
		instanceOf("Q5369")
	], {
		ordered: false,
		requireDescription: [ "baseball" ],
		skipSpecificYearTournaments: true
	}),
	subject("AMFB", "AMERICAN FOOTBALL", 1500, 5, "INJEONG", [
		sport("Q41323"),
		instanceOf("Q41323")
	], {
		ordered: false,
		requireDescription: [ "american football", "gridiron football", "national football league" ],
		skipSpecificYearTournaments: true
	}),
	subject("BRAND", "BRAND NAME", 1500, 10, "INJEONG", [
		instanceOf("Q431289"),
		instanceOf("Q4830453"),
		instanceOf("Q783794")
	], {
		ordered: false,
		requireDescription: [ "company", "brand", "corporation", "manufacturer", "multinational", "enterprise", "business", "retailer", "automaker", "airline" ],
		extraSkipDescriptions: [ "newspaper", "television channel", "radio station", "sports club" ]
	}),
	subject("460", "PHILOSOPHY", 1000, 5, "n", [
		instanceOf("Q5891"),
		occupation("Q4964182"),
		"?item wdt:P101 wd:Q5891.",
		"?item wdt:P921 wd:Q5891."
	], {
		ordered: false,
		requireDescription: [ "philosophy", "philosopher", "philosophical" ]
	}),
	subject("400", "POLITICS", 1500, 8, "INJEONG", [
		instanceOf("Q7163"),
		occupation("Q82955"),
		"?item wdt:P101 wd:Q7163.",
		"?item wdt:P921 wd:Q7163."
	], {
		ordered: false,
		requireDescription: [ "politic", "politician", "political", "government", "minister", "president", "party" ]
	}),
	subject("160", "PHYSICS", 4500, 3, "n", [
		instanceSubclassOf("Q413"),
		subclassOf("Q413"),
		mainSubject("Q413"),
		fieldOfWork("Q413"),
		occupation("Q169470"),
		instanceOfLabel("physical theory"),
		instanceOfLabel("physics concept"),
		instanceOfLabel("quantum mechanics"),
		mainSubjectLabel("quantum mechanics"),
		mainSubjectLabel("classical mechanics"),
		mainSubjectLabel("relativity"),
		mainSubjectLabel("thermodynamics"),
		mainSubjectLabel("electromagnetism"),
		mainSubjectLabel("particle physics"),
		mainSubjectLabel("nuclear physics"),
		mainSubjectLabel("optics")
	], {
		ordered: false,
		requireDescription: [ "physic", "quantum", "relativity", "thermodynamic", "mechanic", "electromagnet", "particle", "nuclear", "optical", "astrophys", "cosmolog", "laser" ],
		extraSkipDescriptions: [ "physical album", "sports physic" ],
		manual: MANUAL.PHYSICS
	}),
	subject("MUTH", "MUSIC THEORY", 2500, 1, "n", [
		instanceSubclassOf("Q193544"),
		subclassOf("Q193544"),
		instanceOf("Q193544"),
		"?item wdt:P361 wd:Q193544.",
		"?item wdt:P921 wd:Q193544.",
		subclassOfLabel("musical notation"),
		subclassOfLabel("musical form"),
		subclassOfLabel("musical technique"),
		subclassOfLabel("musical interval"),
		partOfLabel("music theory"),
		partOfLabel("musical notation"),
		partOfLabel("harmony"),
		partOfLabel("rhythm"),
		mainSubjectLabel("musical notation"),
		mainSubjectLabel("harmony"),
		mainSubjectLabel("rhythm"),
		mainSubjectLabel("counterpoint"),
		instanceOfLabel("musical scale"),
		instanceOfLabel("chord"),
		instanceOfLabel("musical interval"),
		instanceOfLabel("musical notation"),
		instanceOfLabel("rhythm"),
		instanceOfLabel("harmony"),
		instanceOfLabel("melody"),
		instanceOfLabel("musical mode"),
		instanceOfLabel("cadence"),
		mainSubjectLabel("music theory")
	], {
		requireDescription: [ "music theory", "musical", "music", "chord", "scale", "notation", "rhythm", "harmony", "melody" ],
		manual: MANUAL.MUTH
	}),
	subject("MUSN", "MUSICIANS", 1800, 8, "INJEONG", [
		occupation("Q639669"),
		instanceOf("Q215380")
	], {
		ordered: false,
		requireDescription: [ "musician", "composer", "singer", "band", "conductor", "pianist", "guitarist", "rapper", "drummer", "songwriter", "recording artist" ]
	}),
	subject("230", "BIOLOGY", 1200, 5, "n", [
		instanceOf("Q420"),
		occupation("Q864503"),
		"?item wdt:P101 wd:Q420.",
		"?item wdt:P921 wd:Q420.",
		"?item wdt:P2579 wd:Q420."
	], {
		ordered: false,
		requireDescription: [ "biology", "biologist", "microbiologist", "zoologist", "botanist", "geneticist", "ecologist", "virologist", "naturalist", "mycologist" ],
		extraSkipDescriptions: [ "taxon", "species of", "genus of", "family of" ]
	}),
	subject("IDEO", "IDEOLOGY", 800, 3, "n", [
		instanceOf("Q7257"),
		instanceOf("Q12909644")
	], {
		requireDescription: [ "ideology", "political philosophy", "political movement", "school of thought" ]
	}),
	subject("BRAWL", "BRAWL STARS", 500, 1, "INJEONG", [
		"VALUES ?root { wd:Q30330493 } ?item wdt:P1441 ?root.",
		"VALUES ?root { wd:Q30330493 } ?item wdt:P361 ?root.",
		"VALUES ?root { wd:Q30330493 } ?item wdt:P179 ?root.",
		rooted("Brawl Stars")
	], {
		requireDescription: [ "brawl stars", "video game" ],
		manual: MANUAL.BRAWL.concat([
			{ word: "brawl stars", definition: "2018 multiplayer video game developed by Supercell." }
		])
	}),
	subject("COD", "CALL OF DUTY", 1000, 2, "INJEONG", [
		"VALUES ?root { wd:Q192156 } ?item wdt:P179 ?root.",
		"VALUES ?root { wd:Q192156 } ?item wdt:P361 ?root.",
		"VALUES ?root { wd:Q192156 } ?item wdt:P1441 ?root.",
		rooted("Call of Duty"),
		rooted("Call of Duty: Modern Warfare"),
		rooted("Call of Duty: Black Ops"),
		rooted("Call of Duty: Warzone"),
		rooted("Call of Duty: Zombies")
	], {
		requireDescription: [ "call of duty", "video game" ],
		manual: MANUAL.COD.concat([
			{ word: "call of duty", definition: "Video game franchise published by Activision." }
		])
	}),
	subject("MOB", "MOBILE GAMES", 1500, 4, "INJEONG", [
		"?item wdt:P31 wd:Q7889; wdt:P400 ?platform. VALUES ?platform { wd:Q94 wd:Q48493 }"
	], {
		requireDescription: [ "video game" ]
	}),
	subject("NBAP", "BASKETBALL", 2000, 6, "INJEONG", [
		sport("Q5372"),
		instanceOf("Q5372")
	], {
		ordered: false,
		requireDescription: [ "basketball" ],
		skipSpecificYearTournaments: true
	}),
	subject("SOCP", "FOOTBALL(SOCCER)", 2500, 8, "INJEONG", [
		sport("Q2736"),
		instanceOf("Q2736")
	], {
		ordered: false,
		requireDescription: [ "association football", "footballer", "football player", "football club", "football team", "soccer" ],
		skipSpecificYearTournaments: true
	}),
	subject("LOL", "LEAGUE OF LEGENDS", 800, 1, "INJEONG", [
		"VALUES ?root { wd:Q223341 } ?item wdt:P1441 ?root.",
		"VALUES ?root { wd:Q223341 } ?item wdt:P361 ?root.",
		"VALUES ?root { wd:Q223341 } ?item wdt:P179 ?root.",
		rooted("League of Legends")
	], {
		requireDescription: [ "league of legends", "video game" ]
	}),
	subject("DSCI", "DATA SCIENCE", 1200, 3, "n", [
		instanceOf("Q2374463"),
		mainSubject("Q2374463"),
		fieldOfWork("Q2374463"),
		subclassOf("Q2539"),
		instanceSubclassOf("Q2539"),
		mainSubject("Q2539"),
		fieldOfWork("Q2539"),
		subclassOf("Q11660"),
		instanceSubclassOf("Q11660"),
		mainSubject("Q11660"),
		fieldOfWork("Q11660"),
		subclassOf("Q172491"),
		instanceSubclassOf("Q172491"),
		mainSubject("Q172491"),
		subclassOf("Q12483"),
		instanceSubclassOf("Q12483")
	], {
		requireDescription: [ "data science", "machine learning", "artificial intelligence", "statistics", "data mining" ],
		extraSkipDescriptions: [ "online database", "film database", "music database", "bibliographic database" ]
	})
];

function valueFor(name){
	const index = process.argv.indexOf(name);
	if(index === -1) return null;
	return process.argv[index + 1] || null;
}

function subject(code, label, limit, minSitelinks, type, patterns, options){
	options = options || {};
	return {
		code,
		label,
		limit,
		minSitelinks,
		type,
		flag: type === "INJEONG" ? 2 : 0,
		patterns,
		ordered: options.ordered !== false,
		requireDescription: options.requireDescription || [],
		manual: options.manual || [],
		extraSkipDescriptions: options.extraSkipDescriptions || [],
		skipSpecificYearTournaments: options.skipSpecificYearTournaments === true
	};
}

function instanceOf(qid){
	return "?item wdt:P31 wd:" + qid + ".";
}

function occupation(qid){
	return "?item wdt:P106 wd:" + qid + ".";
}

function sport(qid){
	return "?item wdt:P641 wd:" + qid + ".";
}

function subclassOf(qid){
	return "?item wdt:P279* wd:" + qid + ".";
}

function instanceSubclassOf(qid){
	return "?item wdt:P31/wdt:P279* wd:" + qid + ".";
}

function mainSubject(qid){
	return "?item wdt:P921 wd:" + qid + ".";
}

function fieldOfWork(qid){
	return "?item wdt:P101 wd:" + qid + ".";
}

function instanceOfLabel(label){
	return "?root rdfs:label " + sparqlString(label) + "@en. ?item wdt:P31/wdt:P279* ?root.";
}

function subclassOfLabel(label){
	return "?root rdfs:label " + sparqlString(label) + "@en. ?item wdt:P279* ?root.";
}

function partOfLabel(label){
	return "?root rdfs:label " + sparqlString(label) + "@en. ?item wdt:P361 ?root.";
}

function genreLabel(label){
	return "?root rdfs:label " + sparqlString(label) + "@en. ?item wdt:P136/wdt:P279* ?root.";
}

function mainSubjectLabel(label){
	return "?root rdfs:label " + sparqlString(label) + "@en. ?item wdt:P921 ?root.";
}

function rooted(label){
	return [
		"?root rdfs:label " + sparqlString(label) + "@en.",
		"?item wdt:P1441|wdt:P361|wdt:P179 ?root."
	].join(" ");
}

function normalizeWord(word){
	return String(word || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[\u2018\u2019\u201B\u02BC\uFF07]/g, "'")
		.replace(/[’‘`]/g, "'")
		.replace(/&/g, " and ")
		.replace(/[^a-z0-9' ]+/gi, " ")
		.replace(/(^|\s)'|'(\s|$)/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();
}

function splitThemes(theme){
	return String(theme || "")
		.split(",")
		.map(function(item){ return item.trim(); })
		.filter(Boolean);
}

function joinThemes(themes){
	return Array.from(new Set(themes.filter(Boolean))).join(",");
}

function serializeMean(definition){
	if(!definition) return "";
	return serializeMeanNumber(1, definition);
}

function serializeMeanNumber(index, definition){
	return [
		TOP_MARK + index + TOP_MARK,
		MID_OPEN + "1" + MID_CLOSE,
		LOW_OPEN + "1" + LOW_CLOSE,
		String(definition).trim()
	].join("");
}

function nextMeanNumber(mean){
	let max = 0;
	String(mean || "").replace(/\uFF02([0-9]+)\uFF02/g, function(_, number){
		max = Math.max(max, Number(number) || 0);
		return _;
	});
	return max + 1;
}

function appendMean(mean, definition){
	const current = String(mean || "").trim();
	const serialized = serializeMeanNumber(nextMeanNumber(current), definition);
	return current ? current + "  " + serialized : serialized;
}

function appendCsv(value, item){
	const current = String(value || "").trim();
	return current ? current + "," + item : item;
}

function normalizedText(text){
	return String(text || "")
		.toLowerCase()
		.replace(/[\uFF02\uFF3B\uFF3D\uFF08\uFF09]/g, " ")
		.replace(/[^a-z0-9]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function hasDefinition(mean, definition){
	const haystack = normalizedText(mean);
	const needle = normalizedText(definition);
	if(!needle) return true;
	return haystack.indexOf(needle) !== -1 || haystack.indexOf(needle.slice(0, 80)) !== -1;
}

function hasUsableMean(mean){
	return /[a-z]/i.test(String(mean || "")
		.replace(/\uFF02[0-9]+\uFF02/g, "")
		.replace(/\uFF3B[0-9]+\uFF3D/g, "")
		.replace(/\uFF08[0-9]+\uFF09/g, ""));
}

function normalizeDefinition(description){
	let text = String(description || "")
		.replace(/\s+/g, " ")
		.trim();
	if(!text) return "";
	text = text.charAt(0).toUpperCase() + text.slice(1);
	if(!/[.!?]$/.test(text)) text += ".";
	return text;
}

function isBadDescription(description, config){
	const lower = String(description || "").toLowerCase();
	return COMMON_SKIP_DESCRIPTION.concat(config.extraSkipDescriptions || []).some(function(term){
		return lower.indexOf(term) !== -1;
	});
}

function isGoodLabel(label){
	const normalized = normalizeWord(label);
	if(!normalized) return false;
	if(normalized.length < 2 || normalized.length > 48) return false;
	if(normalized.split(" ").length > 6) return false;
	if(/^\d+$/.test(normalized)) return false;
	if(/^list of /.test(normalized)) return false;
	if(/^category /.test(normalized)) return false;
	if(/^q[0-9]+$/.test(normalized)) return false;
	if(normalized === "not stated" || normalized === "unknown") return false;
	return true;
}

function isSpecificYearTournamentWord(word){
	const normalized = normalizeWord(word);
	if(!/\b(?:18|19|20)\d{2}\b/.test(normalized)) return false;
	return /\b(championships?|cups?|tournaments?|leagues?|finals?|series|bowls?|olympics?|olympiad|season|qualifiers?|qualification|classic|trophy|challenge|games)\b/.test(normalized);
}

function hasRequiredDescription(definition, config){
	const required = config.requireDescription || [];
	if(!required.length) return true;
	const lower = String(definition || "").toLowerCase();
	return required.some(function(term){
		return lower.indexOf(term) !== -1;
	});
}

function isSubjectWordBlocked(config, word){
	const blocked = SUBJECT_WORD_BLOCKLIST[config.code];
	return !!(blocked && blocked.has(word));
}

function sparqlFor(config){
	const unions = config.patterns.map(function(pattern){
		return "{ " + pattern + " }";
	}).join("\n\tUNION\n\t");
	const limit = limitArg > 0 ? limitArg : config.limit;
	const required = (config.requireDescription || []).map(function(term){
		return "CONTAINS(LCASE(STR(?itemDescription)), " + sparqlString(term.toLowerCase()) + ")";
	});
	const lines = [
		"SELECT DISTINCT ?item ?itemLabel ?itemDescription ?sitelinks WHERE {",
		"\t" + unions,
		"\t?item wikibase:sitelinks ?sitelinks.",
		"\t?item rdfs:label ?itemLabel.",
		"\tFILTER(LANG(?itemLabel) = \"en\")",
		"\t?item schema:description ?itemDescription.",
		"\tFILTER(LANG(?itemDescription) = \"en\")",
		"\tFILTER(?sitelinks >= " + config.minSitelinks + ")",
		"}"
	];
	if(required.length){
		lines.splice(lines.length - 1, 0, "\tFILTER(" + required.join(" || ") + ")");
	}
	if(config.ordered || FORCE_ORDER) lines.push("ORDER BY DESC(?sitelinks)");
	lines.push("LIMIT " + limit);
	return lines.join("\n");
}

function sparqlString(value){
	return "\"" + String(value).replace(/\\/g, "\\\\").replace(/"/g, "\\\"") + "\"";
}

function requestSparql(query){
	const qs = querystring.stringify({ query: query, format: "json" });
	const url = ENDPOINT + "?" + qs;
	return new Promise(function(resolve, reject){
		const req = https.get(url, {
			headers: {
				"Accept": "application/sparql-results+json",
				"User-Agent": USER_AGENT
			},
			timeout: 60000
		}, function(res){
			let body = "";
			res.setEncoding("utf8");
			res.on("data", function(chunk){ body += chunk; });
			res.on("end", function(){
				if(res.statusCode < 200 || res.statusCode >= 300){
					reject(new Error("Wikidata query failed: HTTP " + res.statusCode + " " + body.slice(0, 300)));
					return;
				}
				try{
					resolve(JSON.parse(body));
				}catch(err){
					reject(err);
				}
			});
		});
		req.on("timeout", function(){
			req.destroy(new Error("Wikidata query timed out"));
		});
		req.on("error", reject);
	});
}

function parseBinding(binding, config){
	const label = binding.itemLabel && binding.itemLabel.value;
	const description = binding.itemDescription && binding.itemDescription.value;
	const qid = binding.item && binding.item.value ? binding.item.value.replace(/^.*\//, "") : "";
	const sitelinks = Number(binding.sitelinks && binding.sitelinks.value || 0);
	const word = normalizeWord(label);
	const definition = normalizeDefinition(description);
	if(!qid || !isGoodLabel(label) || !definition || isBadDescription(definition, config)) return null;
	if(config.skipSpecificYearTournaments && isSpecificYearTournamentWord(word)) return null;
	if(!hasRequiredDescription(definition, config)) return null;
	return {
		word,
		definition,
		qid,
		sitelinks,
		subject: config.code,
		type: config.type,
		flag: config.flag
	};
}

async function fetchSubject(config){
	const rows = [];
	const seen = new Set();
	config.manual.forEach(function(entry){
		const word = normalizeWord(entry.word);
		const definition = normalizeDefinition(entry.definition);
		if(word && definition && !isSubjectWordBlocked(config, word)){
			seen.add(word);
			rows.push({
				word,
				definition,
				qid: "manual",
				sitelinks: 999999,
				subject: config.code,
				type: config.type,
				flag: config.flag
			});
		}
	});

	const json = await requestSparqlWithRetry(sparqlFor(config), config.code);
	const bindings = json.results && json.results.bindings || [];
	bindings.forEach(function(binding){
		const parsed = parseBinding(binding, config);
		if(!parsed || seen.has(parsed.word) || isSubjectWordBlocked(config, parsed.word)) return;
		seen.add(parsed.word);
		rows.push(parsed);
	});
	rows.sort(function(a, b){
		return b.sitelinks - a.sitelinks || a.word.localeCompare(b.word);
	});
	return rows;
}

async function requestSparqlWithRetry(query, code){
	let lastError = null;
	for(let attempt = 1; attempt <= 3; attempt++){
		try{
			return await requestSparql(query);
		}catch(err){
			lastError = err;
			process.stderr.write("RETRY " + code + " attempt " + attempt + " failed: " + err.message + "\n");
			if(attempt < 3){
				await new Promise(function(resolve){ setTimeout(resolve, 2000 * attempt); });
			}
		}
	}
	throw lastError;
}

function addTheme(theme, code){
	const themes = splitThemes(theme);
	if(!themes.includes(code)) themes.push(code);
	return joinThemes(themes);
}

function removeTheme(theme, code){
	return joinThemes(splitThemes(theme).filter(function(value){ return value !== code; }));
}

function countryNames(){
	const names = new Set();
	(DATA.COUNTRY_NAMES || []).forEach(function(name){ names.add(normalizeWord(name)); });
	Object.keys(DATA.COUNTRY_NAME_OVERRIDES || {}).forEach(function(code){
		names.add(normalizeWord(DATA.COUNTRY_NAME_OVERRIDES[code]));
	});
	return names;
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
		const current = existing.get(row.word);
		const serialized = serializeMean(row.definition);
		if(current){
			const currentMean = String(current.mean || "").trim();
			let nextType = String(current.type || "");
			let nextTheme = String(current.theme || "");
			let nextMean = currentMean;

			if(!hasUsableMean(currentMean)){
				nextType = appendCsv(nextType, row.type);
				nextTheme = addTheme(nextTheme, row.subject);
				nextMean = serialized;
			}else if(!splitThemes(nextTheme).includes(row.subject) || !hasDefinition(currentMean, row.definition)){
				nextType = appendCsv(nextType, row.type);
				nextTheme = addTheme(nextTheme, row.subject);
				nextMean = appendMean(currentMean, row.definition);
			}

			if(nextType !== String(current.type || "") || nextTheme !== String(current.theme || "") || nextMean !== currentMean){
				updates.push({
					id: current._id,
					type: nextType,
					theme: nextTheme,
					mean: nextMean,
					subject: row.subject,
					qid: row.qid,
					sitelinks: row.sitelinks
				});
				current.type = nextType;
				current.theme = nextTheme;
				current.mean = nextMean;
			}
			return;
		}
		const inserted = {
			_id: row.word,
			type: row.type,
			mean: serialized,
			hit: 0,
			theme: row.subject,
			flag: row.flag,
			qid: row.qid,
			sitelinks: row.sitelinks
		};
		inserts.push(inserted);
		existing.set(row.word, inserted);
	});
	return { inserts, updates };
}

function planPlaceNameCleanup(existing){
	const countries = countryNames();
	const updates = [];
	existing.forEach(function(row, word){
		const themes = splitThemes(row.theme);
		if(!themes.includes("e15")) return;
		if(!(themes.includes("1001") || themes.includes("CITY") || countries.has(word))) return;
		const nextTheme = removeTheme(row.theme, "e15");
		if(nextTheme === String(row.theme || "")) return;
		updates.push({
			id: row._id,
			theme: nextTheme,
			before: row.theme
		});
		row.theme = nextTheme;
	});
	return updates;
}

async function applyUpdates(client, updates){
	for(let i = 0; i < updates.length; i++){
		await client.query("UPDATE kkutu_en SET type=$1, theme=$2, mean=$3 WHERE _id=$4", [
			updates[i].type,
			updates[i].theme,
			updates[i].mean,
			updates[i].id
		]);
	}
}

async function applyThemeOnlyUpdates(client, updates){
	for(let i = 0; i < updates.length; i++){
		await client.query("UPDATE kkutu_en SET theme=$1 WHERE _id=$2", [
			updates[i].theme,
			updates[i].id
		]);
	}
}

async function applyInserts(client, inserts){
	for(let i = 0; i < inserts.length; i++){
		await client.query(
			"INSERT INTO kkutu_en (_id, type, mean, hit, theme, flag) VALUES ($1, $2, $3, $4, $5, $6)",
			[
				inserts[i]._id,
				inserts[i].type,
				inserts[i].mean,
				inserts[i].hit,
				inserts[i].theme,
				inserts[i].flag
			]
		);
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
	const selected = SUBJECTS.filter(function(config){
		return !subjectArg || config.code.toLowerCase() === subjectArg.toLowerCase() || config.label.toLowerCase() === subjectArg.toLowerCase();
	});
	if(!selected.length){
		throw new Error("Unknown subject: " + subjectArg);
	}

	const fetchedBySubject = {};
	for(let i = 0; i < selected.length; i++){
		const config = selected[i];
		process.stderr.write("FETCH " + config.code + " " + config.label + "\n");
		fetchedBySubject[config.code] = await fetchSubject(config);
		await new Promise(function(resolve){ setTimeout(resolve, 750); });
	}

	const client = await pool.connect();
	try{
		const existing = await loadExisting(client);
		const placeCleanup = planPlaceNameCleanup(existing);
		const plans = {};
		let allInserts = [];
		let allUpdates = [];

		selected.forEach(function(config){
			const plan = planRows(existing, fetchedBySubject[config.code]);
			plans[config.code] = {
				label: config.label,
				fetched: fetchedBySubject[config.code].length,
				inserts: plan.inserts.length,
				updates: plan.updates.length,
				sample: fetchedBySubject[config.code].slice(0, sampleArg).map(function(row){
					return {
						word: row.word,
						definition: row.definition,
						qid: row.qid,
						sitelinks: row.sitelinks
					};
				})
			};
			allInserts = allInserts.concat(plan.inserts);
			allUpdates = allUpdates.concat(plan.updates);
		});

		const summary = {
			mode: APPLY ? "apply" : "dry-run",
			subjects: plans,
			totalFetched: Object.keys(fetchedBySubject).reduce(function(sum, key){ return sum + fetchedBySubject[key].length; }, 0),
			totalInserts: allInserts.length,
			totalUpdates: allUpdates.length,
			placeNameCleanupUpdates: placeCleanup.length,
			counts: {}
		};

		if(APPLY){
			await client.query("BEGIN");
			await applyThemeOnlyUpdates(client, placeCleanup);
			await applyUpdates(client, allUpdates);
			await applyInserts(client, allInserts);
			await client.query("COMMIT");
		}

		const countCodes = Array.from(new Set(selected.map(function(config){ return config.code; }).concat([ "e15", "1001" ])));
		for(let i = 0; i < countCodes.length; i++){
			summary.counts[countCodes[i]] = await countTheme(client, countCodes[i]);
		}
		console.log(JSON.stringify(summary, null, 2));
	} catch(err){
		try{
			if(APPLY) await client.query("ROLLBACK");
		} catch(rollbackErr){
			console.error("ROLLBACK_FAILED", rollbackErr);
		}
		throw err;
	} finally{
		client.release();
		await pool.end();
	}
}

main().catch(function(err){
	console.error(err);
	process.exit(1);
});
