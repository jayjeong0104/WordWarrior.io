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
	MILITARY: "100",
	LINGUISTICS: "310",
	COMPUTER_SCIENCE: "490",
	SPORTS: "350"
};

const NAME_PARTICLES = new Set([
	"de", "del", "della", "der", "den", "di", "du", "da", "dos", "das",
	"van", "von", "la", "le", "al", "el", "bin", "ibn", "st", "saint",
	"mc", "mac", "y", "o"
]);

const NAME_SUFFIXES = new Set([
	"jr", "sr", "ii", "iii", "iv", "v"
]);

const BLOCKED_NAME_STARTERS = new Set([
	"able", "ablebodied", "action", "actor's", "adjutant", "air", "american",
	"army", "athlete", "atheist", "attorney", "battle", "believer", "boy",
	"brigadier", "british", "case", "chief", "child", "church", "citizen",
	"civil", "coach", "commanding", "commissioned", "comptroller", "dental",
	"desk", "disinfestation", "doctor", "enlisted", "executive", "female",
	"field", "fivestar", "flag", "fleet", "footballer", "forward", "full",
	"general", "girl", "governor", "guard", "hearing", "hero", "inspector",
	"intelligence", "judge", "law", "leader", "legal", "lieutenant",
	"line", "male", "man", "medical", "member", "midfielder", "military",
	"naval", "noncommissioned", "officer", "official", "peace", "people",
	"person", "petty", "philosopher", "player", "players", "poet",
	"police", "postmaster", "presiding", "probation", "professor",
	"prosecuting", "quarterback", "quartermaster", "rear", "receiver",
	"religion", "representative", "returning", "scientist", "secretarial",
	"secretary", "senior", "ship's", "shop", "singer", "solicitor", "staff",
	"striker", "student", "superior", "supporter", "supply", "surgeon",
	"theist", "united", "us", "vice", "villain", "waiter's", "warrant",
	"woman", "worker", "writer"
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
	]),
	[THEME.FAMOUS]: new Set([
		"female",
		"atheist"
	])
};

const EXPLICIT_THEME_FIXES = {
	"hypertext markup language": {
		add: [THEME.COMPUTER_SCIENCE],
		remove: [THEME.LINGUISTICS]
	},
	"michael jordan": { add: [THEME.FAMOUS, THEME.NBA] },
	"scottie pippen": { add: [THEME.FAMOUS, THEME.NBA] },
	"dennis rodman": { add: [THEME.FAMOUS, THEME.NBA] },
	"lebron james": { add: [THEME.FAMOUS, THEME.NBA] },
	"kyrie irving": { add: [THEME.FAMOUS, THEME.NBA] },
	"kevin durant": { add: [THEME.FAMOUS, THEME.NBA] },
	"stephen curry": { add: [THEME.FAMOUS, THEME.NBA] },
	"kobe bryant": { add: [THEME.FAMOUS, THEME.NBA] },
	"magic johnson": { add: [THEME.FAMOUS, THEME.NBA] },
	"larry bird": { add: [THEME.FAMOUS, THEME.NBA] },
	"tim duncan": { add: [THEME.FAMOUS, THEME.NBA] },
	"shaquille o'neal": { add: [THEME.FAMOUS, THEME.NBA] },
	"shaquille o neal": { add: [THEME.FAMOUS, THEME.NBA] },
	"cade cunningham": { add: [THEME.FAMOUS, THEME.NBA] },
	"chief joseph": { add: [THEME.FAMOUS] },
	"lionel messi": { add: [THEME.FAMOUS, THEME.SOCCER] },
	"radamel falcao": { add: [THEME.FAMOUS, THEME.SOCCER] }
};

const UPSERT_WORDS = [
	{
		_id: "shai gilgeous-alexander",
		type: "INJEONG",
		mean: "＂1＂ Shai Gilgeous-Alexander debuted in 2018 and became an elite scoring guard for Oklahoma City.",
		theme: [THEME.FAMOUS, THEME.NBA]
	},
	{
		_id: "anthony edwards",
		type: "INJEONG",
		mean: "＂1＂ Anthony Edwards debuted in 2020 and became a high-scoring All-NBA guard for Minnesota.",
		theme: [THEME.FAMOUS, THEME.NBA]
	},
	{
		_id: "nikola jokic",
		type: "INJEONG",
		mean: "＂1＂ Nikola Jokic debuted in 2015 and became a multiple-MVP center and Denver champion.",
		theme: [THEME.FAMOUS, THEME.NBA]
	}
];

const DEFINITION_UPDATES = {
	"michael jordan": "＂1＂ Michael Jordan debuted in 1984 and won six NBA championships with the Chicago Bulls.",
	"scottie pippen": "＂1＂ Scottie Pippen debuted in 1987 and starred as an all-around forward on six Bulls title teams.",
	"dennis rodman": "＂1＂ Dennis Rodman debuted in 1986 and became a Hall of Fame rebounder on multiple championship teams.",
	"lebron james": "＂1＂ LeBron James debuted in 2003 and became a four-time NBA champion and one of basketball's greatest forwards.",
	"kyrie irving": "＂1＂ Kyrie Irving debuted in 2011 and became an All-NBA guard and 2016 NBA champion.",
	"kevin durant": "＂1＂ Kevin Durant debuted in 2007 and became an MVP scorer and multiple-time NBA champion.",
	"stephen curry": "＂1＂ Stephen Curry debuted in 2009 and became a four-time NBA champion and all-time great shooter.",
	"kobe bryant": "＂1＂ Kobe Bryant debuted in 1996 and won five NBA championships with the Los Angeles Lakers.",
	"magic johnson": "＂1＂ Magic Johnson debuted in 1979 and led the Lakers to five NBA championships as a legendary point guard.",
	"larry bird": "＂1＂ Larry Bird debuted in 1979 and won three NBA championships as the Celtics' star forward.",
	"tim duncan": "＂1＂ Tim Duncan debuted in 1997 and won five NBA championships as San Antonio's franchise big man.",
	"shaquille o'neal": "＂1＂ Shaquille O'Neal debuted in 1992 and became a dominant Hall of Fame center and four-time NBA champion.",
	"shaquille o neal": "＂1＂ Shaquille O'Neal debuted in 1992 and became a dominant Hall of Fame center and four-time NBA champion.",
	"cade cunningham": "＂1＂ Cade Cunningham debuted in 2021 and became Detroit's lead playmaking guard.",
	"shai gilgeous-alexander": "＂1＂ Shai Gilgeous-Alexander debuted in 2018 and became an elite scoring guard for Oklahoma City.",
	"anthony edwards": "＂1＂ Anthony Edwards debuted in 2020 and became a high-scoring All-NBA guard for Minnesota.",
	"nikola jokic": "＂1＂ Nikola Jokic debuted in 2015 and became a multiple-MVP center and Denver champion.",
	"lionel messi": "＂1＂ Lionel Messi debuted in 2004 and became a World Cup winner and multiple Ballon d'Or recipient.",
	"radamel falcao": "＂1＂ Radamel Falcao debuted in 2005 and became a prolific Colombian striker for club and country."
};

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

function isLikelyProperFullName(id){
	const tokens = tokenizeName(id);
	if(tokens.length < 2 || tokens.length > 6) return false;
	if(BLOCKED_NAME_STARTERS.has(tokens[0])) return false;

	let substantive = 0;
	for(const token of tokens){
		if(/^\d+$/.test(token)) return false;
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

function addThemes(currentThemes, themesToAdd){
	const next = new Set(currentThemes);
	for(const theme of (Array.isArray(themesToAdd) ? themesToAdd : [])) next.add(theme);
	return Array.from(next);
}

function removeTheme(currentThemes, theme){
	return currentThemes.filter((value) => value !== theme);
}

async function upsertWord(client, row){
	const existing = await client.query("SELECT _id, theme, type FROM kkutu_en WHERE _id=$1", [ row._id ]);
	if(existing.rows.length){
		const currentThemes = splitThemes(existing.rows[0].theme);
		const themes = addThemes(currentThemes, row.theme);
		await client.query(
			"UPDATE kkutu_en SET theme=$1, type=$2, mean=$3 WHERE _id=$4",
			[ joinThemes(themes), row.type, row.mean, row._id ]
		);
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

	const specialIds = Array.from(new Set([
		...Object.keys(EXPLICIT_THEME_FIXES),
		...Object.keys(DEFINITION_UPDATES),
		...UPSERT_WORDS.map((row) => row._id),
		...Object.values(EXPLICIT_THEME_REMOVALS).flatMap((set) => Array.from(set))
	]));

	const rows = (await client.query(
		`SELECT _id, type, mean, theme
		 FROM kkutu_en
		 WHERE (
		     theme IS NOT NULL
		     AND theme <> ''
		     AND (
		       ','||theme||',' LIKE '%,${THEME.FAMOUS},%'
		       OR ','||theme||',' LIKE '%,${THEME.NBA},%'
		       OR ','||theme||',' LIKE '%,${THEME.SOCCER},%'
		       OR ','||theme||',' LIKE '%,${THEME.MINECRAFT},%'
		       OR ','||theme||',' LIKE '%,${THEME.MILITARY},%'
		       OR ','||theme||',' LIKE '%,${THEME.LINGUISTICS},%'
		       OR ','||theme||',' LIKE '%,${THEME.COMPUTER_SCIENCE},%'
		     )
		   )
		   OR _id = ANY($1)`,
		[ specialIds ]
	)).rows;

	const updates = [];
	const removedCounts = {};
	const addedCounts = {};
	const meanUpdates = [];

	for(const row of rows){
		const beforeThemes = splitThemes(row.theme);
		let afterThemes = beforeThemes.slice();
		const normalized = normalizeWord(row._id);

		if(afterThemes.includes(THEME.FAMOUS) && !isLikelyProperFullName(row._id)){
			afterThemes = removeTheme(afterThemes, THEME.FAMOUS);
			removedCounts[THEME.FAMOUS] = (removedCounts[THEME.FAMOUS] || 0) + 1;
		}

		if(afterThemes.includes(THEME.NBA) && !isLikelyProperFullName(row._id)){
			afterThemes = removeTheme(afterThemes, THEME.NBA);
			removedCounts[THEME.NBA] = (removedCounts[THEME.NBA] || 0) + 1;
		}

		if(afterThemes.includes(THEME.SOCCER) && !isLikelyProperFullName(row._id)){
			afterThemes = removeTheme(afterThemes, THEME.SOCCER);
			removedCounts[THEME.SOCCER] = (removedCounts[THEME.SOCCER] || 0) + 1;
		}

		for(const [theme, words] of Object.entries(EXPLICIT_THEME_REMOVALS)){
			if(words.has(normalized) && afterThemes.includes(theme)){
				afterThemes = removeTheme(afterThemes, theme);
				removedCounts[theme] = (removedCounts[theme] || 0) + 1;
			}
		}

		const themeFix = EXPLICIT_THEME_FIXES[normalized];
		if(themeFix){
			if(Array.isArray(themeFix.remove)){
				for(const theme of themeFix.remove){
					if(afterThemes.includes(theme)){
						afterThemes = removeTheme(afterThemes, theme);
						removedCounts[theme] = (removedCounts[theme] || 0) + 1;
					}
				}
			}
			if(Array.isArray(themeFix.add)){
				for(const theme of themeFix.add){
					if(!afterThemes.includes(theme)){
						afterThemes = addThemes(afterThemes, [ theme ]);
						addedCounts[theme] = (addedCounts[theme] || 0) + 1;
					}
				}
			}
		}

		if(joinThemes(afterThemes) !== joinThemes(beforeThemes)){
			updates.push({
				_id: row._id,
				before: joinThemes(beforeThemes),
				after: joinThemes(afterThemes)
			});
		}

		if(DEFINITION_UPDATES[normalized] && row.mean !== DEFINITION_UPDATES[normalized]){
			meanUpdates.push({
				_id: row._id,
				mean: DEFINITION_UPDATES[normalized]
			});
		}
	}

	let inserted = 0;
	let upsertUpdated = 0;
	for(const row of UPSERT_WORDS){
		const existing = await client.query("SELECT _id FROM kkutu_en WHERE _id=$1", [ row._id ]);
		if(existing.rows.length) upsertUpdated += 1;
		else inserted += 1;
	}

	if(APPLY){
		await client.query("BEGIN");
		try{
			for(const row of updates){
				await client.query("UPDATE kkutu_en SET theme=$1 WHERE _id=$2", [ row.after, row._id ]);
			}
			for(const row of meanUpdates){
				await client.query("UPDATE kkutu_en SET mean=$1 WHERE _id=$2", [ row.mean, row._id ]);
			}
			for(const row of UPSERT_WORDS){
				await upsertWord(client, row);
			}
			await client.query("COMMIT");
		}catch(error){
			await client.query("ROLLBACK");
			throw error;
		}
	}

	console.log("ROWS_TO_UPDATE", updates.length);
	console.log("MEAN_UPDATES", meanUpdates.length);
	console.log("UPSERT_INSERTED", inserted);
	console.log("UPSERT_UPDATED", upsertUpdated);
	Object.keys(removedCounts).sort().forEach((theme) => {
		console.log("REMOVE", theme, removedCounts[theme]);
	});
	Object.keys(addedCounts).sort().forEach((theme) => {
		console.log("ADD", theme, addedCounts[theme]);
	});
	console.log("SAMPLE_UPDATES");
	updates.slice(0, 50).forEach((row) => {
		console.log(row._id + "\t" + row.before + "\t=>\t" + row.after);
	});
	console.log("SAMPLE_MEAN_UPDATES");
	meanUpdates.slice(0, 30).forEach((row) => {
		console.log(row._id + "\t=>\t" + row.mean);
	});

	for(const theme of [THEME.FAMOUS, THEME.NBA, THEME.SOCCER, THEME.MINECRAFT, THEME.MILITARY, THEME.LINGUISTICS, THEME.COMPUTER_SCIENCE]){
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
