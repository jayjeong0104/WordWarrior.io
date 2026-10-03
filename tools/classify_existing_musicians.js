"use strict";

const { Client } = require("../Server/lib/node_modules/pg");
const config = require("../Server/lib/sub/global.json");

const APPLY = process.argv.indexOf("--apply") !== -1;
const MUSICIANS = "MUSN";
const SAMPLE_WORDS = [
	"liszt", "beethoven", "bach", "mozart", "chopin",
	"drake", "eminem", "taylor swift", "bts", "queen"
];

const EXPLICIT_MUSICIAN_WORDS = new Set([
	"2pac", "50 cent", "abba", "ac dc", "adele", "aerosmith", "aespa", "ariana grande",
	"asap rocky", "bad bunny", "beatles", "beyonce", "bigbang", "billie eilish",
	"blackpink", "blink 182", "bob dylan", "bob marley", "bruno mars", "bts",
	"cardi b", "childish gambino", "coldplay", "daft punk", "david bowie", "doja cat",
	"drake", "dua lipa", "ed sheeran", "elton john", "eminem", "enhypen", "exo",
	"fleetwood mac", "frank ocean", "freddie mercury", "future", "girls generation",
	"green day", "harry styles", "ice spice", "itzy", "ive", "jay z", "j cole",
	"juice wrld", "justin bieber", "kanye west", "katy perry", "kendrick lamar",
	"lady gaga", "led zeppelin", "le sserafim", "lil nas x", "lil uzi vert", "lil wayne",
	"madonna", "mamamoo", "mariah carey", "megan thee stallion", "metallica",
	"michael jackson", "miley cyrus", "nas", "nct", "newjeans", "nicki minaj",
	"nirvana", "notorious b i g", "oasis", "olivia rodrigo", "pink floyd",
	"playboi carti", "pop smoke", "post malone", "prince", "queen", "radiohead",
	"red velvet", "rihanna", "rolling stones", "selena gomez", "seventeen", "shakira",
	"snoop dogg", "stray kids", "taylor swift", "the beatles", "the notorious b i g",
	"the rolling stones", "the weeknd", "travis scott", "tupac", "tupac shakur",
	"twice", "txt", "tyler the creator", "u2", "whitney houston", "xxxtentacion"
]);

const MUST_HAVE_MUSICIAN_ENTRIES = [
	{ word: "50 cent", definition: "American rapper." },
	{ word: "aespa", definition: "South Korean girl group." },
	{ word: "ariana grande", definition: "American singer and actress." },
	{ word: "bad bunny", definition: "Puerto Rican rapper and singer." },
	{ word: "beyonce", definition: "American singer." },
	{ word: "billie eilish", definition: "American singer-songwriter." },
	{ word: "blackpink", definition: "South Korean girl group." },
	{ word: "bruno mars", definition: "American singer and songwriter." },
	{ word: "bts", definition: "South Korean boy band." },
	{ word: "cardi b", definition: "American rapper." },
	{ word: "coldplay", definition: "British rock band." },
	{ word: "doja cat", definition: "American rapper and singer." },
	{ word: "drake", definition: "Canadian rapper, singer, and songwriter." },
	{ word: "dua lipa", definition: "English and Albanian singer." },
	{ word: "eminem", definition: "American rapper." },
	{ word: "enhypen", definition: "South Korean boy band." },
	{ word: "exo", definition: "South Korean-Chinese boy band." },
	{ word: "jay z", definition: "American rapper." },
	{ word: "j cole", definition: "American rapper." },
	{ word: "kanye west", definition: "American rapper and record producer." },
	{ word: "kendrick lamar", definition: "American rapper." },
	{ word: "lady gaga", definition: "American singer and songwriter." },
	{ word: "le sserafim", definition: "South Korean girl group." },
	{ word: "lil wayne", definition: "American rapper." },
	{ word: "metallica", definition: "American heavy metal band." },
	{ word: "newjeans", definition: "South Korean girl group." },
	{ word: "nicki minaj", definition: "Trinidadian-born rapper." },
	{ word: "nirvana", definition: "American rock band." },
	{ word: "post malone", definition: "American rapper and singer." },
	{ word: "queen", definition: "British rock band." },
	{ word: "rihanna", definition: "Barbadian singer." },
	{ word: "seventeen", definition: "South Korean boy band." },
	{ word: "snoop dogg", definition: "American rapper." },
	{ word: "stray kids", definition: "South Korean boy band." },
	{ word: "taylor swift", definition: "American singer-songwriter." },
	{ word: "the weeknd", definition: "Canadian singer and songwriter." },
	{ word: "travis scott", definition: "American rapper." },
	{ word: "tupac shakur", definition: "American rapper." },
	{ word: "twice", definition: "South Korean girl group." },
	{ word: "txt", definition: "South Korean boy band." }
];

function splitCsv(value){
	return String(value || "")
		.split(",")
		.map(function(item){ return item.trim(); })
		.filter(Boolean);
}

function joinCsv(items){
	return Array.from(new Set((items || []).filter(Boolean))).join(",");
}

function normalizeText(value){
	return String(value || "")
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[\u2018\u2019\u201B\u02BC\uFF07]/g, "'")
		.replace(/[^a-z0-9'&.\- ]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function contextFor(row){
	return normalizeText([ row._id, row.mean ].join(" "));
}

const MUSICIAN_ROLE_PATTERNS = [
	/\bmusician(s)?\b/,
	/\bcomposer(s)?\b/,
	/\bsinger(s)?\b/,
	/\bsinger songwriter(s)?\b/,
	/\bsongwriter(s)?\b/,
	/\brapper(s)?\b/,
	/\bmc\b/,
	/\bdisc jockey(s)?\b/,
	/\bdj\b/,
	/\brecording artist(s)?\b/,
	/\brecord producer(s)?\b/,
	/\bmusic producer(s)?\b/,
	/\bvocalist(s)?\b/,
	/\bpianist(s)?\b/,
	/\bkeyboardist(s)?\b/,
	/\bguitarist(s)?\b/,
	/\bbassist(s)?\b/,
	/\bdrummer(s)?\b/,
	/\bviolinist(s)?\b/,
	/\bviolist(s)?\b/,
	/\bcellist(s)?\b/,
	/\boboist(s)?\b/,
	/\bclarinetist(s)?\b/,
	/\bflutist(s)?\b/,
	/\bsaxophonist(s)?\b/,
	/\btrumpeter(s)?\b/,
	/\borganist(s)?\b/,
	/\bharpsichordist(s)?\b/,
	/\bconductor(s)?\b/,
	/\bbandleader(s)?\b/,
	/\bchoirmaster(s)?\b/,
	/\bopera singer(s)?\b/,
	/\bsoprano(s)?\b/,
	/\btenor(s)?\b/,
	/\bbaritone(s)?\b/,
	/\bcontralto(s)?\b/,
	/\bmezzo soprano(s)?\b/
];

const MUSICIAN_GROUP_PATTERNS = [
	/\bk pop (group|band|singer|artist|idol)\b/,
	/\bkpop (group|band|singer|artist|idol)\b/,
	/\bpop (group|band|duo|singer|artist|idol)\b/,
	/\brock (group|band|duo|singer|artist)\b/,
	/\bhip hop (group|duo|artist|musician|rapper)\b/,
	/\brap (group|duo|artist)\b/,
	/\bboy band(s)?\b/,
	/\bgirl group(s)?\b/,
	/\bmusical group(s)?\b/,
	/\bmusic group(s)?\b/,
	/\bvocal group(s)?\b/,
	/\bgroup of musicians\b/,
	/\borganization of musicians\b/,
	/\bmusicians who perform together\b/,
	/\bband of musicians\b/,
	/\bband formed\b/,
	/\bband from\b/,
	/\bband based in\b/,
	/\bband founded\b/
];

const FALSE_POSITIVE_PATTERNS = [
	/\bcomposer of type\b/,
	/\bband of frequencies\b/,
	/\bfrequency band\b/,
	/\bband gap\b/,
	/\bconduction band\b/,
	/\bvalence band\b/,
	/\brubber band\b/,
	/\belastic band\b/,
	/\bwatch band\b/,
	/\bwaistband\b/,
	/\bheadband\b/,
	/\bnotation used by musicians\b/,
	/\bprize awarded\b.*\bmusicians\b/,
	/\bmusic created by\b/,
	/\bmusic performed by\b/
];

function isMusicFormInsteadOfMusician(id, context){
	if(!/\bmusic\b/.test(id)) return false;
	if(/\b(musical group|musical organization|rock group|rock band|jazz band|brass band|concert band|dance band|military band)\b/.test(id)) return false;
	return /\b(group of musicians|musicians who perform together|performed by .* musicians|created by .* musicians|notation used by musicians)\b/.test(context);
}

function isMusicianLike(row){
	const context = contextFor(row);
	const themes = splitCsv(row.theme);
	const id = normalizeText(row._id);
	const hasPersonishTheme = themes.indexOf("e18") !== -1 || themes.indexOf("KPO") !== -1;

	if(!context) return false;
	if(EXPLICIT_MUSICIAN_WORDS.has(id)) return true;
	if(FALSE_POSITIVE_PATTERNS.some(function(pattern){ return pattern.test(context); })) return false;
	if(isMusicFormInsteadOfMusician(id, context)) return false;
	if(MUSICIAN_GROUP_PATTERNS.some(function(pattern){ return pattern.test(context); })) return true;
	if(hasPersonishTheme && MUSICIAN_ROLE_PATTERNS.some(function(pattern){ return pattern.test(context); })) return true;
	if(/\ba musician who\b/.test(context) || /\bmusicians who\b/.test(context)) return true;
	return false;
}

function isFalseMusician(row){
	const id = normalizeText(row._id);
	const context = contextFor(row);

	return FALSE_POSITIVE_PATTERNS.some(function(pattern){ return pattern.test(context); })
		|| isMusicFormInsteadOfMusician(id, context);
}

function previewMean(mean){
	return String(mean || "")
		.replace(/\s+/g, " ")
		.slice(0, 180);
}

function serializeDefinition(definition){
	return "＂1＂ " + String(definition || "").trim();
}

function nextDefinitionIndex(mean){
	const matches = String(mean || "").match(/＂\d+＂/g);
	return matches ? matches.length + 1 : 1;
}

function plainDefinitionText(mean){
	return normalizeText(String(mean || "")
		.replace(/＂\d+＂/g, " ")
		.replace(/［\d+］/g, " ")
		.replace(/（\d+）/g, " "));
}

function hasUsefulMusicianDefinition(row){
	const plain = plainDefinitionText(row.mean);
	if(plain.length < 8) return false;
	return MUSICIAN_ROLE_PATTERNS.concat(MUSICIAN_GROUP_PATTERNS).some(function(pattern){
		return pattern.test(plain);
	});
}

function appendDefinition(mean, definition){
	const current = String(mean || "").trim();
	const next = nextDefinitionIndex(current);
	const serialized = "＂" + next + "＂ " + String(definition || "").trim();

	return current ? current + "  " + serialized : serializeDefinition(definition);
}

function escapeRegex(value){
	return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removeDuplicateTrailingDefinition(mean, definition){
	const current = String(mean || "").trim();
	const normalizedDefinition = normalizeText(definition);
	const trailing = new RegExp("\\s*＂\\d+＂\\s*" + escapeRegex(String(definition || "").trim()) + "\\s*$");
	const trimmed = current.replace(trailing, "").trim();

	if(trimmed !== current && plainDefinitionText(trimmed).indexOf(normalizedDefinition) >= 0){
		return trimmed;
	}
	return current;
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
	try{
		const rows = (await client.query(
			"SELECT _id, type, theme, mean FROM kkutu_en ORDER BY _id"
		)).rows;
		const updates = [];
		const removals = [];
		const upserts = [];
		const index = new Map();

		rows.forEach(function(row){
			index.set(normalizeText(row._id), row);
		});

		rows.forEach(function(row){
			const themes = splitCsv(row.theme);
			if(themes.indexOf(MUSICIANS) !== -1){
				if(isFalseMusician(row)){
					removals.push({
						id: row._id,
						before: row.theme || "",
						after: joinCsv(themes.filter(function(theme){ return theme !== MUSICIANS; })),
						mean: previewMean(row.mean)
					});
				}
				return;
			}
			if(!isMusicianLike(row)) return;
			updates.push({
				id: row._id,
				before: row.theme || "",
				after: joinCsv(themes.concat([ MUSICIANS ])),
				mean: previewMean(row.mean)
			});
		});

		MUST_HAVE_MUSICIAN_ENTRIES.forEach(function(entry){
			const word = normalizeText(entry.word);
			const existing = index.get(word);
			if(!existing){
				upserts.push({
					id: word,
					type: "INJEONG",
					theme: MUSICIANS,
					mean: serializeDefinition(entry.definition),
					insert: true
				});
				return;
			}

			const themes = splitCsv(existing.theme);
			const nextTheme = joinCsv(themes.concat([ MUSICIANS ]));
			const cleanedMean = removeDuplicateTrailingDefinition(existing.mean, entry.definition);
			const rowForDefinition = Object.assign({}, existing, { mean: cleanedMean });
			const nextMean = hasUsefulMusicianDefinition(rowForDefinition) || plainDefinitionText(cleanedMean).indexOf(normalizeText(entry.definition)) >= 0
				? cleanedMean
				: appendDefinition(cleanedMean, entry.definition);

			if(nextTheme !== String(existing.theme || "") || nextMean !== String(existing.mean || "")){
				upserts.push({
					id: existing._id,
					type: existing.type,
					theme: nextTheme,
					mean: nextMean,
					insert: false
				});
			}
		});

		console.log("MUSICIAN_ROWS_TO_UPDATE", updates.length);
		console.log("MUSICIAN_FALSE_POSITIVES_TO_REMOVE", removals.length);
		console.log("MUSICIAN_MUST_HAVE_UPSERTS", upserts.length);
		console.log("SAMPLE_UPDATES");
		updates.slice(0, 120).forEach(function(row){
			console.log(row.id + "\t" + row.before + "\t=>\t" + row.after + "\t" + row.mean);
		});
		console.log("SAMPLE_REMOVALS");
		removals.slice(0, 80).forEach(function(row){
			console.log(row.id + "\t" + row.before + "\t=>\t" + row.after + "\t" + row.mean);
		});
		console.log("SAMPLE_UPSERTS");
		upserts.slice(0, 80).forEach(function(row){
			console.log((row.insert ? "INSERT" : "UPDATE") + "\t" + row.id + "\t" + row.theme + "\t" + previewMean(row.mean));
		});

		if(APPLY){
			await client.query("BEGIN");
			try{
				for(const row of updates){
					await client.query("UPDATE kkutu_en SET theme=$1 WHERE _id=$2", [ row.after, row.id ]);
				}
				for(const row of removals){
					await client.query("UPDATE kkutu_en SET theme=$1 WHERE _id=$2", [ row.after, row.id ]);
				}
				for(const row of upserts){
					if(row.insert){
						await client.query(
							"INSERT INTO kkutu_en (_id, type, mean, hit, theme, flag) VALUES ($1, $2, $3, $4, $5, $6)",
							[ row.id, row.type, row.mean, 0, row.theme, 2 ]
						);
					}else{
						await client.query(
							"UPDATE kkutu_en SET theme=$1, mean=$2 WHERE _id=$3",
							[ row.theme, row.mean, row.id ]
						);
					}
				}
				await client.query("COMMIT");
				console.log("APPLIED", updates.length, "REMOVED", removals.length, "UPSERTED", upserts.length);
			}catch(error){
				await client.query("ROLLBACK");
				throw error;
			}
		}

		const samples = (await client.query(
			"SELECT _id, theme, mean FROM kkutu_en WHERE _id = ANY($1::text[]) ORDER BY _id",
			[ SAMPLE_WORDS ]
		)).rows;
		console.log("SAMPLE_WORDS");
		samples.forEach(function(row){
			console.log(row._id + "\t" + row.theme + "\t" + previewMean(row.mean));
		});

		const count = (await client.query(
			"SELECT COUNT(*)::int AS c FROM kkutu_en WHERE ','||COALESCE(theme,'')||',' LIKE '%,' || $1 || ',%'",
			[ MUSICIANS ]
		)).rows[0].c;
		console.log("MUSICIANS_COUNT", count);
	}finally{
		await client.end();
	}
}

main().catch(function(error){
	console.error(error);
	process.exit(1);
});
