"use strict";

const path = require("path");
const { Client } = require(path.join(process.cwd(), "Server/lib/node_modules/pg"));
const config = require(path.join(process.cwd(), "Server/lib/sub/global.json"));

const APPLY = process.argv.includes("--apply");

const THEME = {
	FAMOUS: "KPO",
	NBA: "NBAP",
	SOCCER: "SOCP",
	MINECRAFT: "MINC",
	MILITARY: "100"
};

const NAME_PARTICLES = new Set([
	"de", "del", "della", "der", "den", "di", "du", "da", "dos", "das",
	"van", "von", "la", "le", "al", "el", "bin", "ibn", "st", "saint",
	"mc", "mac", "y"
]);

const NAME_SUFFIXES = new Set([
	"jr", "sr", "ii", "iii", "iv", "v"
]);

const BLOCKED_NAME_TOKENS = new Set([
	"person", "people", "female", "male", "atheist", "theist", "agnostic",
	"footballer", "basketball", "player", "players", "coach", "goalkeeper",
	"keeper", "defender", "midfielder", "striker", "receiver", "blocker",
	"linebacker", "quarterback", "center", "forward", "guard", "battle",
	"pass", "creeper", "academic", "academy", "accessory", "accomplice",
	"abolitionist", "abortionist", "aboriginal", "aborigine", "abbot",
	"abbess", "academician", "artist", "athlete", "doctor", "scientist",
	"religion", "military", "professor", "student", "philosopher", "poet",
	"author", "writer", "singer", "actor", "actress", "hero", "villain",
	"woman", "man", "girl", "boy", "adult", "infant", "child", "baby"
]);

const EXPLICIT_THEME_REMOVALS = {
	[THEME.MINECRAFT]: new Set([
		"american creeper",
		"brown creeper",
		"canary creeper",
		"emerald creeper",
		"european creeper",
		"giant potato creeper",
		"tree creeper",
		"trumpet creeper",
		"virginia creeper",
		"wall creeper"
	]),
	[THEME.MILITARY]: new Set([
		"battle pass"
	]),
	[THEME.SOCCER]: new Set([
		"lionelmessi",
		"falcao"
	])
};

const EXPLICIT_THEME_ADDITIONS = {
	"michael jordan": [THEME.NBA],
	"scottie pippen": [THEME.NBA],
	"dennis rodman": [THEME.NBA],
	"lebron james": [THEME.NBA],
	"kyrie irving": [THEME.NBA],
	"lionel messi": [THEME.SOCCER]
};

const UPSERT_WORDS = [
	{
		_id: "radamel falcao",
		type: "INJEONG",
		mean: "＂1＂ Radamel Falcao is a Colombian striker known for starring for Porto, Atletico Madrid, Monaco, and Colombia.",
		theme: [THEME.SOCCER, THEME.FAMOUS]
	}
];

function splitThemes(theme){
	return String(theme || "")
		.split(",")
		.map((value) => value.trim())
		.filter(Boolean);
}

function joinThemes(themes){
	return Array.from(new Set(themes.filter(Boolean))).join(",");
}

function normalizeWord(word){
	return String(word || "")
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

function tokenizeName(id){
	return normalizeWord(id).split(" ").filter(Boolean);
}

function isRomanNumeral(token){
	return /^(?:i|ii|iii|iv|v|vi|vii|viii|ix|x)$/i.test(token);
}

function isValidNameToken(token){
	return /^[a-z]+(?:['-][a-z]+)*$/.test(token);
}

function isPlausibleFullName(id){
	const tokens = tokenizeName(id);
	if(tokens.length < 2 || tokens.length > 6) return false;

	let substantive = 0;
	for(const token of tokens){
		if(BLOCKED_NAME_TOKENS.has(token)) return false;
		if(NAME_PARTICLES.has(token) || NAME_SUFFIXES.has(token) || isRomanNumeral(token)) continue;
		if(token.length === 1){
			substantive += 1;
			continue;
		}
		if(!isValidNameToken(token)) return false;
		substantive += 1;
	}
	return substantive >= 2;
}

function shouldKeepFamous(row){
	if(!row.theme.includes(THEME.FAMOUS)) return true;
	return isPlausibleFullName(row._id);
}

function shouldKeepPlayer(row, theme){
	if(!row.theme.includes(theme)) return true;
	return isPlausibleFullName(row._id);
}

function addThemes(currentThemes, themesToAdd){
	const next = new Set(currentThemes);
	for(const theme of (Array.isArray(themesToAdd) ? themesToAdd : [])) next.add(theme);
	return Array.from(next);
}

function removeTheme(currentThemes, theme){
	return currentThemes.filter((value) => value !== theme);
}

async function upsertWord(client, row){
	const existing = await client.query("SELECT _id, theme FROM kkutu_en WHERE _id=$1", [ row._id ]);
	if(existing.rows.length){
		const themes = addThemes(splitThemes(existing.rows[0].theme), row.theme);
		await client.query("UPDATE kkutu_en SET theme=$1, type=$2, mean=$3 WHERE _id=$4", [ joinThemes(themes), row.type, row.mean, row._id ]);
		return { inserted: false, updated: true };
	}

	await client.query(
		"INSERT INTO kkutu_en (_id, type, mean, theme) VALUES ($1, $2, $3, $4)",
		[ row._id, row.type, row.mean, joinThemes(row.theme) ]
	);
	return { inserted: true, updated: false };
}

async function main(){
	const client = new Client({
		host: config.PG_HOST,
		user: config.PG_USER,
		password: String(config.PG_PASSWORD),
		port: config.PG_PORT,
		database: config.PG_DATABASE
	});
	await client.connect();

	const rows = (await client.query(
		`SELECT _id, type, mean, theme
		 FROM kkutu_en
		 WHERE theme IS NOT NULL
		   AND theme <> ''
		   AND (
		     ','||theme||',' LIKE '%,${THEME.FAMOUS},%'
		     OR ','||theme||',' LIKE '%,${THEME.NBA},%'
		     OR ','||theme||',' LIKE '%,${THEME.SOCCER},%'
		     OR ','||theme||',' LIKE '%,${THEME.MINECRAFT},%'
		     OR ','||theme||',' LIKE '%,${THEME.MILITARY},%'
		   )`
	)).rows;

	const updates = [];
	const removedCounts = {};
	const addedCounts = {};

	for(const row of rows){
		const beforeThemes = splitThemes(row.theme);
		let afterThemes = beforeThemes.slice();

		if(!shouldKeepFamous(row) && afterThemes.includes(THEME.FAMOUS)){
			afterThemes = removeTheme(afterThemes, THEME.FAMOUS);
			removedCounts[THEME.FAMOUS] = (removedCounts[THEME.FAMOUS] || 0) + 1;
		}

		if(!shouldKeepPlayer(row, THEME.NBA) && afterThemes.includes(THEME.NBA)){
			afterThemes = removeTheme(afterThemes, THEME.NBA);
			removedCounts[THEME.NBA] = (removedCounts[THEME.NBA] || 0) + 1;
		}

		if(!shouldKeepPlayer(row, THEME.SOCCER) && afterThemes.includes(THEME.SOCCER)){
			afterThemes = removeTheme(afterThemes, THEME.SOCCER);
			removedCounts[THEME.SOCCER] = (removedCounts[THEME.SOCCER] || 0) + 1;
		}

		for(const [theme, words] of Object.entries(EXPLICIT_THEME_REMOVALS)){
			if(words.has(normalizeWord(row._id)) && afterThemes.includes(theme)){
				afterThemes = removeTheme(afterThemes, theme);
				removedCounts[theme] = (removedCounts[theme] || 0) + 1;
			}
		}

		const additions = EXPLICIT_THEME_ADDITIONS[normalizeWord(row._id)];
		if(Array.isArray(additions) && additions.length){
			afterThemes = addThemes(afterThemes, additions);
			for(const theme of additions){
				if(!beforeThemes.includes(theme) && afterThemes.includes(theme)){
					addedCounts[theme] = (addedCounts[theme] || 0) + 1;
				}
			}
		}

		const afterThemeString = joinThemes(afterThemes);
		if(afterThemeString !== row.theme){
			updates.push({
				_id: row._id,
				before: row.theme,
				after: afterThemeString
			});
		}
	}

	let inserted = 0;
	let upsertUpdated = 0;

	if(APPLY){
		await client.query("BEGIN");
		try{
			for(const row of updates){
				await client.query("UPDATE kkutu_en SET theme=$1 WHERE _id=$2", [ row.after, row._id ]);
			}

			for(const row of UPSERT_WORDS){
				const result = await upsertWord(client, row);
				if(result.inserted) inserted += 1;
				if(result.updated) upsertUpdated += 1;
			}

			await client.query("COMMIT");
		}catch(error){
			await client.query("ROLLBACK");
			throw error;
		}
	}

	console.log("UPDATES", updates.length);
	console.log("INSERTED", inserted);
	console.log("UPSERT_UPDATED", upsertUpdated);
	console.log("REMOVED_BY_THEME", JSON.stringify(removedCounts, null, 2));
	console.log("ADDED_BY_THEME", JSON.stringify(addedCounts, null, 2));
	console.log("SAMPLE_CHANGES");
	for(const row of updates.slice(0, 80)){
		console.log(row._id + "\t" + row.before + "\t=>\t" + row.after);
	}

	for(const theme of [THEME.FAMOUS, THEME.NBA, THEME.SOCCER, THEME.MINECRAFT, THEME.MILITARY]){
		const result = await client.query(
			"SELECT COUNT(*)::int AS c FROM kkutu_en WHERE ','||COALESCE(theme,'')||',' LIKE '%,' || $1 || ',%'",
			[ theme ]
		);
		console.log("COUNT", theme, result.rows[0].c);
	}

	await client.end();
}

main().catch(async (error) => {
	console.error(error);
	process.exit(1);
});
