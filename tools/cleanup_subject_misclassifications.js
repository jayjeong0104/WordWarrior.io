"use strict";

const path = require("path");
const { Client } = require(path.join(process.cwd(), "Server/lib/node_modules/pg"));
const config = require(path.join(process.cwd(), "Server/lib/sub/global.json"));

const DATA = require("./subject_target_data");
const SEED_EXTRA = require("./en_subject_seed_extra");
const SEED_MORE = require("./en_subject_seed_more");
const SEED_MASSIVE = require("./en_subject_seed_massive");
const GAME_MEGA = require("./game_subject_seed_mega");

const TARGET_THEMES = [
	"MINC", "STA", "POK", "FORT", "VALO", "PUBG", "APEX", "OVW",
	"NBAP", "SOCP",
	"450", "160", "490", "240", "DSCI", "150", "30", "310", "350", "410", "100", "370", "530",
	"1001"
];

function normalizeWord(word){
	return String(word || "")
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}

function compactWord(word){
	return normalizeWord(word).replace(/\s+/g, "");
}

function splitThemes(theme){
	return String(theme || "")
		.split(",")
		.map(function(value){ return value.trim(); })
		.filter(Boolean);
}

function joinThemes(themes){
	return themes.filter(Boolean).join(",");
}

function hasWholePhrase(text, phrase){
	return (" " + text + " ").indexOf(" " + phrase + " ") !== -1;
}

function buildExplicitWordSets(){
	const explicit = new Map();

	function addWord(theme, word){
		if(!theme || !word) return;
		if(!explicit.has(theme)) explicit.set(theme, new Set());
		explicit.get(theme).add(compactWord(word));
	}

	function addSeedSource(source){
		Object.keys(source || {}).forEach(function(theme){
			(source[theme] || []).forEach(function(entry){
				if(typeof entry === "string"){
					addWord(theme, entry);
					return;
				}
				if(entry && entry.word){
					addWord(theme, entry.word);
				}
			});
		});
	}

	addSeedSource(SEED_EXTRA);
	addSeedSource(SEED_MORE);
	addSeedSource(SEED_MASSIVE);
	addSeedSource(GAME_MEGA);
	addSeedSource(DATA.GAME_SUBJECT_EXTRA_WORDS || {});

	(DATA.COUNTRY_NAMES || []).forEach(function(word){ addWord("1001", word); });
	(DATA.COUNTRY_CODES || []).forEach(function(word){ addWord("1001", word); });
	Object.keys(DATA.COUNTRY_NAME_OVERRIDES || {}).forEach(function(code){
		addWord("1001", code);
		addWord("1001", DATA.COUNTRY_NAME_OVERRIDES[code]);
	});

	return explicit;
}

function termMatcher(term){
	const spaced = normalizeWord(term);
	const compact = compactWord(term);
	const isMultiWord = spaced.indexOf(" ") !== -1;
	const isShort = compact.length <= 3;
	const isStem = !isMultiWord && !isShort && (
		/(astronom|mathemat|econom|linguist|phon|semantic|pragmatic|etymolog|combinator|morpholog|orthograph|statistic)$/.test(compact)
	);

	return function(context){
		if(!compact) return false;
		if(context.idCompact === compact) return true;
		if(isMultiWord){
			return hasWholePhrase(context.textSpaced, spaced);
		}
		if(isShort){
			return hasWholePhrase(context.textSpaced, spaced);
		}
		if(isStem){
			return context.idCompact.indexOf(compact) !== -1 || context.tokens.some(function(token){
				return token.indexOf(compact) === 0;
			});
		}
		return hasWholePhrase(context.textSpaced, spaced);
	};
}

function buildAutoMatchers(){
	const matchers = {};
	Object.keys(DATA.AUTO_SUBJECT_RULES || {}).forEach(function(theme){
		matchers[theme] = (DATA.AUTO_SUBJECT_RULES[theme] || []).map(termMatcher);
	});
	return matchers;
}

function justifiedTheme(row, theme, explicit, autoMatchers){
	const idCompact = compactWord(row._id);
	const textSpaced = normalizeWord([ row._id, row.mean ].join(" "));
	const tokens = textSpaced.split(/\s+/).filter(Boolean);
	const context = { idCompact, textSpaced, tokens };

	if(explicit.has(theme) && explicit.get(theme).has(idCompact)){
		return true;
	}
	if(theme === "1001"){
		return false;
	}
	const matchers = autoMatchers[theme];
	if(!matchers || !matchers.length) return false;
	return matchers.some(function(match){
		return match(context);
	});
}

async function main(){
	const apply = process.argv.indexOf("--apply") !== -1;
	const explicit = buildExplicitWordSets();
	const autoMatchers = buildAutoMatchers();

	const client = new Client({
		host: config.PG_HOST,
		user: config.PG_USER,
		password: String(config.PG_PASSWORD),
		port: config.PG_PORT,
		database: config.PG_DATABASE
	});
	await client.connect();

	const rows = (await client.query(
		"SELECT _id, theme, mean FROM kkutu_en WHERE theme IS NOT NULL AND theme <> ''"
	)).rows;

	const removals = [];
	const removedByTheme = {};

	rows.forEach(function(row){
		const themes = splitThemes(row.theme);
		const keep = [];
		let changed = false;

		themes.forEach(function(theme){
			if(TARGET_THEMES.indexOf(theme) === -1){
				keep.push(theme);
				return;
			}
			if(justifiedTheme(row, theme, explicit, autoMatchers)){
				keep.push(theme);
				return;
			}
			changed = true;
			removedByTheme[theme] = (removedByTheme[theme] || 0) + 1;
		});

		if(changed){
			removals.push({
				id: row._id,
				before: row.theme,
				after: joinThemes(keep)
			});
		}
	});

	console.log("ROWS_TO_UPDATE", removals.length);
	Object.keys(removedByTheme).sort().forEach(function(theme){
		console.log("REMOVE", theme, removedByTheme[theme]);
	});
	console.log("SAMPLE");
	removals.slice(0, 80).forEach(function(row){
		console.log(row.id + "\t" + row.before + "\t=>\t" + row.after);
	});

	if(apply){
		await client.query("BEGIN");
		try{
			for(const row of removals){
				await client.query("UPDATE kkutu_en SET theme=$1 WHERE _id=$2", [ row.after, row.id ]);
			}
			await client.query("COMMIT");
			console.log("APPLIED", removals.length);
		}catch(error){
			await client.query("ROLLBACK");
			throw error;
		}
	}

	for(const theme of TARGET_THEMES){
		const result = await client.query(
			"SELECT COUNT(*)::int AS c FROM kkutu_en WHERE ','||COALESCE(theme,'')||',' LIKE '%,' || $1 || ',%'",
			[ theme ]
		);
		console.log("COUNT", theme, result.rows[0].c);
	}

	await client.end();
}

main().catch(function(error){
	console.error(error);
	process.exit(1);
});
