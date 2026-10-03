"use strict";

const path = require("path");
const { Client } = require(path.join(process.cwd(), "Server/lib/node_modules/pg"));
const config = require(path.join(process.cwd(), "Server/lib/sub/global.json"));

const SEED_EXTRA = require("./en_subject_seed_extra");
const SEED_MORE = require("./en_subject_seed_more");
const SEED_MASSIVE = require("./en_subject_seed_massive");

const APPLY = process.argv.includes("--apply");
const THEME = "150";
const SPORTS_THEME = "350";
const EXPLICIT_FALSE_LITERATURE = new Set([
	"first half",
	"last half",
	"make believe",
	"makebelieve",
	"manuelneuer",
	"nacreous",
	"opaline",
	"opalescent",
	"period of play",
	"play false",
	"play possum",
	"playing period",
	"sandbox",
	"sandlot",
	"sandpile",
	"second half"
]);

const LITERATURE_PATTERNS = [
	/\bnovel(s|la|las|ette)?\b/,
	/\bpoem(s)?\b/,
	/\bpoetry\b/,
	/\bpoet(s|ic|ical|ry)?\b/,
	/\bliterary\b/,
	/\bliterature\b/,
	/\bfiction(al)?\b/,
	/\bepic\b/,
	/\bbooker\b/,
	/\bpulitzer\b/,
	/\bshakespeare(an)?\b/,
	/\btraged(y|ies)\b/,
	/\bcomed(y|ies)\b/,
	/\bauthor(s|ed|ing|ship)?\b/,
	/\bmanuscript(s)?\b/,
	/\bsonnet(s)?\b/,
	/\bplaywright(s)?\b/,
	/\bscreenplay(s)?\b/,
	/\bteleplay(s)?\b/,
	/\bstage play(s)?\b/,
	/\bdrama(s|tic|tist)?\b/,
	/\bnovelist(s)?\b/,
	/\bessayist(s)?\b/,
	/\bshort stor(y|ies)\b/
];

function normalizeWord(word){
	return String(word || "")
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, " ")
		.replace(/\s+/g, " ")
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
	return Array.from(new Set(themes.filter(Boolean))).join(",");
}

function removeTheme(themes, theme){
	return themes.filter(function(value){ return value !== theme; });
}

function buildExplicitLiteratureWords(){
	const words = new Set();
	function addSource(source){
		(source[THEME] || []).forEach(function(entry){
			if(typeof entry === "string") words.add(compactWord(entry));
			else if(entry && entry.word) words.add(compactWord(entry.word));
		});
	}
	addSource(SEED_EXTRA);
	addSource(SEED_MORE);
	addSource(SEED_MASSIVE);
	return words;
}

function hasLiteratureEvidence(row, explicitWords){
	const id = normalizeWord(row._id);
	const compact = compactWord(row._id);
	const text = normalizeWord([ row._id, row.mean ].join(" "));
	if(explicitWords.has(compact)) return true;
	return LITERATURE_PATTERNS.some(function(pattern){
		return pattern.test(id) || pattern.test(text);
	});
}

function hasFalsePlayEvidence(row){
	const id = normalizeWord(row._id);
	const themes = splitThemes(row.theme);
	const text = normalizeWord([ row._id, row.mean ].join(" "));
	if(EXPLICIT_FALSE_LITERATURE.has(id)) return true;
	const hasPlaySignal = /\bplay(s|ed|er|ers|ing)?\b/.test(text) || /\bplayer(s)?\b/.test(text);
	if(!hasPlaySignal) return false;
	if(themes.includes(SPORTS_THEME)) return true;
	return [
		/\bamerican football\b/,
		/\bfootball\b/,
		/\bbaseball\b/,
		/\bbasketball\b/,
		/\bgolf\b/,
		/\bhockey\b/,
		/\bcricket\b/,
		/\bsport(s)?\b/,
		/\bathlete(s)?\b/,
		/\bteam(s)?\b/,
		/\bball\b/,
		/\bcard game\b/,
		/\bchess\b/,
		/\bdice\b/,
		/\bcroquet\b/,
		/\bgambling\b/,
		/\bplay truant\b/,
		/\bplay music\b/,
		/\bplayed by\b/,
		/\bplay loudly\b/,
		/\bmusician\b/,
		/\binstrument\b/,
		/\bthe part you are expected to play\b/,
		/\bplay a significant role\b/,
		/\bplay an important role\b/,
		/\bchildren s play\b/,
		/\bchild s play\b/,
		/\bforeplay\b/,
		/\bplay boisterously\b/,
		/\bplay around\b/,
		/\bplay of (color|colors|light)\b/,
		/\bchildren s play\b/,
		/\bwhere children\b.*\bplay\b/,
		/\bfor children s play\b/
	].some(function(pattern){
		return pattern.test(text);
	});
}

function hasFalseSportsPeriodEvidence(row){
	const text = normalizeWord([ row._id, row.mean ].join(" "));
	if(!/\b(period|half|quarter|inning|overtime|tiebreaker|tie breaker)\b/.test(text)) return false;
	return [
		/\bgame\b/,
		/\bsport(s)?\b/,
		/\bfootball\b/,
		/\bbaseball\b/,
		/\bbasketball\b/,
		/\bhockey\b/,
		/\bcricket\b/,
		/\bgolf\b/,
		/\btournament\b/,
		/\bcompetition\b/,
		/\bteam\b/,
		/\bball\b/,
		/\bextra innings\b/,
		/\bovertime\b/,
		/\btie breaker\b/,
		/\btiebreaker\b/
	].some(function(pattern){
		return pattern.test(text);
	});
}

async function main(){
	const explicitWords = buildExplicitLiteratureWords();
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
			"SELECT _id, type, mean, theme FROM kkutu_en WHERE ','||COALESCE(theme,'')||',' LIKE '%,' || $1 || ',%' ORDER BY _id",
			[ THEME ]
		)).rows;
		const updates = [];
		rows.forEach(function(row){
			if(hasLiteratureEvidence(row, explicitWords)) return;
			if(!hasFalsePlayEvidence(row) && !hasFalseSportsPeriodEvidence(row)) return;
			updates.push({
				_id: row._id,
				before: row.theme,
				after: joinThemes(removeTheme(splitThemes(row.theme), THEME)),
				mean: row.mean
			});
		});

		console.log("ROWS_TO_UPDATE", updates.length);
		console.log("SAMPLE");
		updates.slice(0, 120).forEach(function(row){
			console.log(row._id + "\t" + row.before + "\t=>\t" + row.after + "\t" + String(row.mean || "").slice(0, 130));
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
			"SELECT _id, theme, mean FROM kkutu_en WHERE _id = ANY($1::text[]) ORDER BY _id",
			[ [ "end", "hamlet", "macbeth", "play", "screenplay" ] ]
		);
		console.log("CHECK");
		check.rows.forEach(function(row){
			console.log(row._id + "\t" + row.theme + "\t" + String(row.mean || "").slice(0, 140));
		});
	}finally{
		await client.end();
	}
}

main().catch(function(error){
	console.error(error);
	process.exit(1);
});
