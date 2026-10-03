"use strict";

const { Pool } = require("../Server/lib/node_modules/pg");
const GLOBAL = require("../Server/lib/sub/global.json");
const DATA = require("./subject_target_data");

const APPLY = process.argv.includes("--apply");
const PLACE = "e15";
const COUNTRY = "1001";
const CITY = "CITY";

const pool = new Pool({
	user: GLOBAL.PG_USER,
	password: GLOBAL.PG_PASSWORD,
	host: GLOBAL.PG_HOST,
	port: GLOBAL.PG_PORT,
	database: GLOBAL.PG_DATABASE
});

const COUNTRY_ALIASES = new Set([
	"us", "usa", "u s", "u s a", "uk", "u k", "united states", "united kingdom",
	"uae", "u a e", "united arab emirates"
]);

const PROPER_PLACE_PATTERNS = [
	/\bcapital (and largest city )?of\b/,
	/\bformer capital\b/,
	/\b\d+(?:st|nd|rd|th)? largest city\b/,
	/\ba city in\b/,
	/\ba city of\b/,
	/\bcity in\b/,
	/\bcity of\b/,
	/\ba town in\b/,
	/\btown in\b/,
	/\ba village in\b/,
	/\bvillage in\b/,
	/\ba port in\b/,
	/\bport in\b/,
	/\ba republic in\b/,
	/\bnorth american republic\b/,
	/\ba communist nation\b/,
	/\ba country in\b/,
	/\bcountry in\b/,
	/\ba state in\b/,
	/\bstate of\b/,
	/\ba province in\b/,
	/\bprovince of\b/,
	/\ba region in\b/,
	/\bregion of\b/,
	/\ban island in\b/,
	/\bisland in\b/,
	/\bisland of\b/,
	/\ba peninsula in\b/,
	/\bpeninsula in\b/
];

function normalizeWord(word){
	return String(word || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9 ]+/gi, " ")
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

function removeTheme(themes, theme){
	return themes.filter(function(value){ return value !== theme; });
}

function addTheme(themes, theme){
	if(!themes.includes(theme)) themes.push(theme);
	return themes;
}

function countryNames(){
	const names = new Set();
	(DATA.COUNTRY_NAMES || []).forEach(function(name){ names.add(normalizeWord(name)); });
	Object.keys(DATA.COUNTRY_NAME_OVERRIDES || {}).forEach(function(code){
		names.add(normalizeWord(DATA.COUNTRY_NAME_OVERRIDES[code]));
	});
	COUNTRY_ALIASES.forEach(function(name){ names.add(name); });
	return names;
}

function properPlaceReason(row, countries){
	const id = normalizeWord(row._id);
	const mean = String(row.mean || "").toLowerCase();
	const themes = splitThemes(row.theme);
	const nonPlaceThemes = themes.filter(function(theme){ return theme !== PLACE; });

	if(themes.includes(COUNTRY)) return "country-tagged row";
	if(themes.includes(CITY)) return "city-tagged row";
	if(countries.has(id)) return "known country name or alias";
	if(nonPlaceThemes.length) return "";

	for(let i = 0; i < PROPER_PLACE_PATTERNS.length; i++){
		if(PROPER_PLACE_PATTERNS[i].test(mean)) return "proper-place definition pattern";
	}
	return "";
}

async function main(){
	const client = await pool.connect();
	try{
		const countries = countryNames();
		const rows = await client.query(
			"SELECT _id, type, mean, theme FROM kkutu_en WHERE string_to_array(COALESCE(theme, ''), ',') @> ARRAY[$1] ORDER BY _id",
			[ PLACE ]
		);
		const updates = [];

		rows.rows.forEach(function(row){
			const themes = splitThemes(row.theme);
			const reason = properPlaceReason(row, countries);
			if(!reason) return;

			let nextThemes = removeTheme(themes, PLACE);
			if(countries.has(normalizeWord(row._id))){
				nextThemes = addTheme(nextThemes, COUNTRY);
			}
			const after = joinThemes(nextThemes);
			if(after === String(row.theme || "")) return;
			updates.push({
				id: row._id,
				before: row.theme,
				after: after,
				reason: reason,
				mean: String(row.mean || "").slice(0, 140)
			});
		});

		console.log("ROWS_TO_UPDATE", updates.length);
		console.log("SAMPLE");
		console.log(JSON.stringify(updates.slice(0, 80), null, 2));

		if(APPLY){
			await client.query("BEGIN");
			for(let i = 0; i < updates.length; i++){
				await client.query("UPDATE kkutu_en SET theme=$1 WHERE _id=$2", [
					updates[i].after,
					updates[i].id
				]);
			}
			await client.query("COMMIT");
		}
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
