"use strict";

const { Pool } = require("../Server/lib/node_modules/pg");
const GLOBAL = require("../Server/lib/sub/global.json");
const DATA = require("./subject_target_data");
const GAME_EXTRA = require("./game_subject_seed_mega");

const TOP_MARK = "\uFF02";
const MID_OPEN = "\uFF3B";
const MID_CLOSE = "\uFF3D";
const LOW_OPEN = "\uFF08";
const LOW_CLOSE = "\uFF09";
const APPLY = process.argv.includes("--apply");
const COUNTRY_KEEP = new Set([ "us", "uk", "usa", "uae", "eu" ]);

const pool = new Pool({
	user: GLOBAL.PG_USER,
	password: GLOBAL.PG_PASSWORD,
	host: GLOBAL.PG_HOST,
	port: GLOBAL.PG_PORT,
	database: GLOBAL.PG_DATABASE
});

const TARGETS = {
	"450": 1500,
	"490": 1500,
	"240": 1500,
	DSCI: 1500,
	"150": 1500,
	"30": 1500,
	"310": 1500,
	"350": 1500,
	"410": 1500,
	"100": 1500,
	"370": 1500,
	"530": 1500,
	NBAP: 500,
	SOCP: 500
};

function normalizeWord(word){
	return String(word || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[\u2018\u2019\u201B\u02BC\uFF07]/g, "'")
		.replace(/[^a-z0-9' ]+/gi, " ")
		.replace(/(^|\s)'|'(\s|$)/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();
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

function joinThemes(themes){
	return Array.from(new Set(themes.filter(Boolean))).join(",");
}

function serializeMean(definition){
	if(!definition) return "";
	return [
		TOP_MARK + "1" + TOP_MARK,
		MID_OPEN + "1" + MID_CLOSE,
		LOW_OPEN + "1" + LOW_CLOSE,
		String(definition).trim()
	].join("");
}

function titleCase(word){
	return String(word || "")
		.split(" ")
		.filter(Boolean)
		.map(function(part){
			return part.charAt(0).toUpperCase() + part.slice(1);
		})
		.join(" ");
}

function buildIndex(rows){
	const exact = new Map();
	const compact = new Map();
	rows.forEach(function(row){
		const key = normalizeWord(row._id);
		const compactKey = compactWord(row._id);
		if(key && !exact.has(key)) exact.set(key, row);
		if(compactKey && !compact.has(compactKey)) compact.set(compactKey, row);
	});
	return { exact, compact };
}

function findExisting(index, word){
	const exactKey = normalizeWord(word);
	const compactKey = compactWord(word);
	return index.exact.get(exactKey) || index.compact.get(compactKey) || null;
}

function addTheme(row, theme){
	const merged = joinThemes(splitThemes(row.theme).concat([ theme ]));
	if(merged === String(row.theme || "")) return false;
	row.theme = merged;
	return true;
}

function addThemes(row, themes){
	const merged = joinThemes(splitThemes(row.theme).concat(themes || []));
	if(merged === String(row.theme || "")) return false;
	row.theme = merged;
	return true;
}

function countryEntries(){
	return (DATA.COUNTRY_NAMES || []).map(function(name){
		const word = normalizeWord(name);
		return {
			word: word,
			type: "n",
			themeList: [ "1001", "e15" ],
			mean: serializeMean(titleCase(word) + " is a sovereign country."),
			flag: 0
		};
	}).filter(function(entry){ return entry.word; });
}

function planBadCountryCodeCleanup(rows){
	const updates = [];
	const deletes = [];

	rows.forEach(function(row){
		const id = normalizeWord(row._id);
		if(id.length > 2 || COUNTRY_KEEP.has(id)) return;

		const themes = splitThemes(row.theme);
		if(!themes.includes("1001")) return;

		const nextThemes = themes.filter(function(theme){
			return theme !== "1001" && theme !== "e15";
		});

		if(nextThemes.length){
			const nextTheme = joinThemes(nextThemes);
			if(nextTheme !== String(row.theme || "")){
				row.theme = nextTheme;
				updates.push({ id: row._id, theme: nextTheme });
			}
			return;
		}

		if(String(row.mean || "").toLowerCase().indexOf("sovereign country") !== -1){
			deletes.push(row._id);
		}
	});

	return { updates, deletes };
}

function soccerEntries(){
	return (DATA.SOCCER_PLAYER_WORDS || []).map(function(word){
		return {
			word: normalizeWord(word),
			type: "INJEONG",
			themeList: [ "SOCP" ],
			mean: serializeMean(titleCase(word) + " is a football player."),
			flag: 2
		};
	});
}

function gameEntries(){
	const rows = [];
	const merged = {};
	[ DATA.GAME_SUBJECT_EXTRA_WORDS || {}, GAME_EXTRA || {} ].forEach(function(source){
		Object.keys(source).forEach(function(subject){
			if(!merged[subject]) merged[subject] = [];
			merged[subject] = merged[subject].concat(source[subject] || []);
		});
	});

	Object.keys(merged).forEach(function(subject){
		const seen = new Set();
		merged[subject].forEach(function(word){
			const normalized = normalizeWord(word);
			if(!normalized || seen.has(normalized)) return;
			seen.add(normalized);
			rows.push({
				word: normalized,
				type: "INJEONG",
				themeList: [ subject ],
				mean: "",
				flag: 2
			});
		});
	});
	return rows;
}

function textForRow(row){
	return normalizeWord([ row._id, row.mean ].join(" "));
}

function planAutoRules(rows){
	const updates = [];
	rows.forEach(function(row){
		const haystack = textForRow(row);
		Object.keys(DATA.AUTO_SUBJECT_RULES).forEach(function(subject){
			if(splitThemes(row.theme).includes(subject)) return;
			const matched = DATA.AUTO_SUBJECT_RULES[subject].some(function(term){
				return haystack.indexOf(normalizeWord(term)) !== -1;
			});
			if(!matched) return;
			if(addTheme(row, subject)){
				updates.push({ id: row._id, theme: row.theme, subject: subject });
			}
		});
	});
	return updates;
}

function planManualEntries(rows, index, entries){
	const inserts = [];
	const updates = [];

	entries.forEach(function(entry){
		if(!entry.word) return;
		const existing = findExisting(index, entry.word);
		if(existing){
			if(addThemes(existing, entry.themeList)){
				updates.push({ id: existing._id, theme: existing.theme, themes: entry.themeList });
			}
			return;
		}
		const row = {
			_id: entry.word,
			type: entry.type,
			mean: entry.mean,
			hit: 0,
			theme: joinThemes(entry.themeList),
			flag: entry.flag
		};
		inserts.push(row);
		rows.push(row);
		index.exact.set(normalizeWord(row._id), row);
		index.compact.set(compactWord(row._id), row);
	});
	return { inserts, updates };
}

async function loadRows(client){
	const q = await client.query("SELECT _id, type, mean, theme, flag, hit FROM kkutu_en");
	return q.rows;
}

async function applyThemeUpdates(client, updates){
	for(let i = 0; i < updates.length; i++){
		await client.query("UPDATE kkutu_en SET theme = $2 WHERE _id = $1", [
			updates[i].id,
			updates[i].theme
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

async function applyDeletes(client, ids){
	for(let i = 0; i < ids.length; i++){
		await client.query("DELETE FROM kkutu_en WHERE _id = $1", [ ids[i] ]);
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
	const client = await pool.connect();
	try{
		let rows = await loadRows(client);
		const badCountryCleanup = planBadCountryCodeCleanup(rows);
		const deletedIds = new Set(badCountryCleanup.deletes);
		rows = rows.filter(function(row){ return !deletedIds.has(row._id); });
		const index = buildIndex(rows);
		const autoUpdates = planAutoRules(rows);
		const countryPlan = planManualEntries(rows, index, countryEntries());
		const soccerPlan = planManualEntries(rows, index, soccerEntries());
		const gamePlan = planManualEntries(rows, index, gameEntries());

		const summary = {
			mode: APPLY ? "apply" : "dry-run",
			badCountryThemeRemovals: badCountryCleanup.updates.length,
			badCountryDeletes: badCountryCleanup.deletes.length,
			autoThemeUpdates: autoUpdates.length,
			countryThemeUpdates: countryPlan.updates.length,
			countryInserts: countryPlan.inserts.length,
			soccerThemeUpdates: soccerPlan.updates.length,
			soccerInserts: soccerPlan.inserts.length,
			gameThemeUpdates: gamePlan.updates.length,
			gameInserts: gamePlan.inserts.length,
			counts: {}
		};

		if(!APPLY){
			Object.keys(TARGETS).forEach(function(theme){
				const count = rows.filter(function(row){
					return splitThemes(row.theme).includes(theme);
				}).length;
				summary.counts[theme] = count;
			});
			summary.counts["1001"] = rows.filter(function(row){
				return splitThemes(row.theme).includes("1001");
			}).length;
			Object.keys(DATA.GAME_SUBJECT_EXTRA_WORDS || {}).forEach(function(theme){
				summary.counts[theme] = rows.filter(function(row){
					return splitThemes(row.theme).includes(theme);
				}).length;
			});
			console.log(JSON.stringify(summary, null, 2));
			console.log("SAMPLE_SOCCER_INSERTS");
			console.log(JSON.stringify(soccerPlan.inserts.slice(0, 40), null, 2));
			return;
		}

		await client.query("BEGIN");
		await applyThemeUpdates(client, badCountryCleanup.updates);
		await applyDeletes(client, badCountryCleanup.deletes);
		await applyThemeUpdates(client, autoUpdates);
		await applyThemeUpdates(client, countryPlan.updates.concat(soccerPlan.updates, gamePlan.updates));
		await applyInserts(client, countryPlan.inserts.concat(soccerPlan.inserts, gamePlan.inserts));
		await client.query("COMMIT");

		const finalThemes = Array.from(new Set(
			Object.keys(TARGETS)
				.concat([ "1001" ])
				.concat(Object.keys(DATA.GAME_SUBJECT_EXTRA_WORDS || {}))
		));
		for(let i = 0; i < finalThemes.length; i++){
			summary.counts[finalThemes[i]] = await countTheme(client, finalThemes[i]);
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

if(require.main === module) main().catch(function(err){
	console.error(err);
	process.exit(1);
});
module.exports = { main, buildIndex, planBadCountryCodeCleanup, planManualEntries, countryEntries, soccerEntries, gameEntries };
