"use strict";

const path = require("path");
const { Client } = require(path.join(process.cwd(), "Server/lib/node_modules/pg"));
const config = require(path.join(process.cwd(), "Server/lib/sub/global.json"));

const APPLY = process.argv.includes("--apply");

const THEME = {
	LINGUISTICS: "310",
	COMPUTER_SCIENCE: "490"
};

const EXPLICIT_REMOVE = new Set([
	"earphone",
	"loan",
	"saxophone"
]);

const VALID_PHON_WORDS = [
	"acrophony",
	"allophone",
	"allophonic",
	"apophony",
	"homophone",
	"homophonic",
	"homophonous",
	"morphophoneme",
	"morphophonemic",
	"phonetician",
	"phoneticist",
	"phonate",
	"phoneme",
	"phonemic",
	"phonemics",
	"phonetics",
	"phonetic",
	"phonic",
	"phonics",
	"phonogram",
	"phonogramic",
	"phonation",
	"phonologic",
	"phonological",
	"phonologist",
	"phonology",
	"phonotactic",
	"phonotactics",
	"polyphonic letter",
	"prosodic",
	"prosody"
];

const FALSE_PHON_PATTERNS = [
	/\bsaxophon/,
	/\bearphone\b/,
	/\bheadphone/,
	/\btelephone/,
	/\bcellphone/,
	/\bphone\b/,
	/\bphones\b/,
	/\bphonograph/,
	/\bgramophone/,
	/\bmicrophone/,
	/\bmegaphone/,
	/\bdictaphone/,
	/\bxylophone/,
	/\beuphonium/,
	/\beuphon/,
	/\bcacophon/,
	/\bantiphon/,
	/\bphonocardi/,
	/\b[a-z0-9]*phon[a-z0-9]*\b/
];

const PROGRAMMING_LANGUAGE_PATTERNS = [
	/\bprogramming language\b/,
	/\bcomputer language\b/,
	/\balgorithmic language\b/,
	/\balgebraic language\b/,
	/\bassembly language\b/,
	/\bmachine language\b/,
	/\bauthoring language\b/,
	/\bmarkup language\b/,
	/\bquery language\b/,
	/\bprograming language\b/,
	/\bsoftware\b.*\blanguage\b/,
	/\blanguage\b.*\bcomputer programs\b/
];

const GRAMMAR_SCHOOL_PATTERNS = [
	/\bgrammar school\b/
];

function normalizeText(value){
	return String(value || "")
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function splitThemes(theme){
	return String(theme || "")
		.split(",")
		.map(function(value){ return value.trim(); })
		.filter(Boolean);
}

function joinThemes(themes){
	return Array.from(new Set(themes.filter(Boolean))).join(",");
}

function removeTheme(themes, theme){
	return themes.filter(function(value){ return value !== theme; });
}

function hasAnyPattern(text, patterns){
	return patterns.some(function(pattern){ return pattern.test(text); });
}

function isValidPhonWord(id, text){
	const paddedId = " " + id + " ";
	const paddedText = " " + text + " ";
	if(/\bphone\b/.test(paddedId) && /\b(speech sound|vowel|consonant|articulat|orinasal)\b/.test(paddedText)){
		return true;
	}
	return VALID_PHON_WORDS.some(function(word){
		return id === word || paddedId.indexOf(" " + word + " ") !== -1 || paddedText.indexOf(" " + word + " ") !== -1;
	});
}

function isProgrammingLanguage(text){
	return hasAnyPattern(text, PROGRAMMING_LANGUAGE_PATTERNS);
}

function hasGrammarSchoolFalseSignal(text){
	return hasAnyPattern(text, GRAMMAR_SCHOOL_PATTERNS);
}

function hasFalsePhonSignal(id, text){
	if(isValidPhonWord(id, text)) return false;
	return hasAnyPattern(" " + id + " ", FALSE_PHON_PATTERNS)
		|| hasAnyPattern(" " + text + " ", FALSE_PHON_PATTERNS);
}

function cleanupReason(row){
	const id = normalizeText(row._id);
	const text = normalizeText([ row._id, row.mean ].join(" "));

	if(EXPLICIT_REMOVE.has(id)) return "explicit false-positive";
	if(isProgrammingLanguage(text)) return "programming language belongs to computer science";
	if(hasFalsePhonSignal(id, text)) return "false phon match";
	if(hasGrammarSchoolFalseSignal(text)) return "grammar school false match";
	return "";
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
		"SELECT _id, type, mean, theme FROM kkutu_en WHERE ','||COALESCE(theme,'')||',' LIKE '%,' || $1 || ',%' ORDER BY _id",
		[ THEME.LINGUISTICS ]
	)).rows;

	const updates = [];
	const reasonCounts = {};
	rows.forEach(function(row){
		const reason = cleanupReason(row);
		if(!reason) return;
		let afterThemes = removeTheme(splitThemes(row.theme), THEME.LINGUISTICS);
		if(reason === "programming language belongs to computer science" && !afterThemes.includes(THEME.COMPUTER_SCIENCE)){
			afterThemes.push(THEME.COMPUTER_SCIENCE);
		}
		reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
		updates.push({
			_id: row._id,
			before: row.theme,
			after: joinThemes(afterThemes),
			reason: reason
		});
	});

	console.log("ROWS_TO_UPDATE", updates.length);
	Object.keys(reasonCounts).sort().forEach(function(reason){
		console.log("REASON", reason, reasonCounts[reason]);
	});
	console.log("SAMPLE");
	updates.slice(0, 120).forEach(function(row){
		console.log(row._id + "\t" + row.before + "\t=>\t" + row.after + "\t" + row.reason);
	});

	if(APPLY){
		await client.query("BEGIN");
		try{
			for(const row of updates){
				await client.query("UPDATE kkutu_en SET theme=$1 WHERE _id=$2", [ row.after, row._id ]);
			}
			await client.query("COMMIT");
			console.log("APPLIED", updates.length);
		}catch(error){
			await client.query("ROLLBACK");
			throw error;
		}
	}

	const check = await client.query(
		"SELECT _id, theme, mean FROM kkutu_en WHERE _id = ANY($1) ORDER BY _id",
		[ [ "allophone", "earphone", "loan", "phoneme", "phonetics", "phonology", "saxophone" ] ]
	);
	console.log("CHECK");
	check.rows.forEach(function(row){
		console.log(row._id + "\t" + row.theme + "\t" + String(row.mean || "").slice(0, 120));
	});

	await client.end();
}

main().catch(function(error){
	console.error(error);
	process.exit(1);
});
