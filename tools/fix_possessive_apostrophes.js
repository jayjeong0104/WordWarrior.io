"use strict";

const path = require("path");
const { Client } = require(path.join(process.cwd(), "Server/lib/node_modules/pg"));
const config = require(path.join(process.cwd(), "Server/lib/sub/global.json"));

const APPLY = process.argv.includes("--apply");

const POSSESSIVE_WORDS = new Set([
	"child",
	"children",
	"devil",
	"executioner",
	"father",
	"god",
	"king",
	"man",
	"men",
	"miner",
	"mother",
	"people",
	"princess",
	"queen",
	"rascal",
	"rascals",
	"summoner",
	"victoria",
	"woman",
	"women"
]);

const EXACT_RENAMES = {
	"builder s workshop": "builder's workshop",
	"author s sheet": "author's sheet",
	"bill wyman s rhythm kings": "bill wyman's rhythm kings",
	"blackmore s night": "blackmore's night",
	"executioner s kitchen": "executioner's kitchen",
	"euler s three body problem": "euler's three body problem",
	"five nights at freddy s 3": "five nights at freddy's 3",
	"five nights at freddy s 4": "five nights at freddy's 4",
	"gauss s law": "gauss's law",
	"gauss s law for magnetism": "gauss's law for magnetism",
	"grand belial s key": "grand belial's key",
	"hess s law": "hess's law",
	"harry s house": "harry's house",
	"jon oliva s pain": "jon oliva's pain",
	"king s lynn town f c": "king's lynn town f c",
	"king s x": "king's x",
	"lucifer s friend": "lucifer's friend",
	"miner s mine": "miner's mine",
	"martyr s memorial a division league": "martyr's memorial a division league",
	"noel gallagher s high flying birds": "noel gallagher's high flying birds",
	"ohm s acoustic law": "ohm's acoustic law",
	"pavlov s dog": "pavlov's dog",
	"pekka s playhouse": "pekka's playhouse",
	"slash s snakepit": "slash's snakepit",
	"summoner s rift": "summoner's rift",
	"tamon s b side": "tamon's b side",
	"victoria s secret": "victoria's secret",
	"yule s q": "yule's q"
};

const DO_NOT_RENAME = new Set([
	"u s",
	"u s a",
	"u s army",
	"u s navy",
	"u s open",
	"u s state",
	"vitamin s"
]);

const TITLE_THEMES = new Set([
	"ANIME",
	"APEX",
	"BRAWL",
	"BRAND",
	"COD",
	"CRL",
	"FORT",
	"LOL",
	"MINC",
	"MOB",
	"OVW",
	"POK",
	"PUBG",
	"STA",
	"VALO"
]);

const SCIENCE_AFTER = new Set([
	"alpha",
	"constant",
	"energy",
	"law",
	"laws",
	"modulus",
	"number",
	"principle",
	"q",
	"rules"
]);

const CONTRACTION_PREVIOUS = new Set([
	"it",
	"let",
	"what",
	"where",
	"who"
]);

function splitCsv(value){
	return String(value || "")
		.split(",")
		.map(function(item){ return item.trim(); })
		.filter(Boolean);
}

function joinCsv(values){
	return Array.from(new Set(values.filter(Boolean))).join(",");
}

function normalizeId(value){
	return String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function isNumericToken(value){
	return /^[0-9]+[a-z0-9]*$/.test(String(value || ""));
}

function hasTitleTheme(row){
	return splitCsv(row.theme).some(function(theme){ return TITLE_THEMES.has(theme); });
}

function markerCanBePossessive(parts, index){
	const token = parts[index - 1] || "";
	const next = parts[index + 1] || "";
	if(token.length <= 1) return false;
	if(token === "u" || token === "st") return false;
	if(token === "and") return false;
	if(isNumericToken(token)) return false;
	if(next.length <= 1) return false;
	if(isNumericToken(next)) return false;
	if([ "a", "c", "d", "f", "k", "p" ].includes(next)) return false;
	return true;
}

function markerShouldConvert(row, parts, index, broadTarget, existingTargets){
	const token = parts[index - 1] || "";
	const next = parts[index + 1] || "";
	if(existingTargets.has(broadTarget)) return true;
	if(POSSESSIVE_WORDS.has(token)) return true;
	if(CONTRACTION_PREVIOUS.has(token)) return true;
	if(SCIENCE_AFTER.has(next)) return true;
	if(token.endsWith("s")) return false;
	if(hasTitleTheme(row)) return true;
	return false;
}

function broadPossessiveTarget(id){
	const normalized = normalizeId(id);
	if(!normalized || DO_NOT_RENAME.has(normalized)) return "";
	if(EXACT_RENAMES[normalized]) return EXACT_RENAMES[normalized];

	const parts = normalized.split(" ");
	let changed = false;
	for(let i = 1; i < parts.length; i++){
		if(parts[i] !== "s") continue;
		const previous = parts[i - 1];
		if(!markerCanBePossessive(parts, i)) continue;
		parts[i - 1] = previous + "'s";
		parts.splice(i, 1);
		i--;
		changed = true;
	}
	return changed ? parts.join(" ") : "";
}

function possessiveTarget(row, existingTargets){
	const normalized = normalizeId(row._id);
	if(!normalized || DO_NOT_RENAME.has(normalized)) return "";
	if(EXACT_RENAMES[normalized]) return EXACT_RENAMES[normalized];

	const broadTarget = broadPossessiveTarget(normalized);
	const parts = normalized.split(" ");
	let changed = false;
	for(let i = 1; i < parts.length; i++){
		if(parts[i] !== "s") continue;
		const previous = parts[i - 1];
		if(!markerCanBePossessive(parts, i)) continue;
		if(!markerShouldConvert(row, parts, i, broadTarget, existingTargets)) continue;
		parts[i - 1] = previous + "'s";
		parts.splice(i, 1);
		i--;
		changed = true;
	}
	return changed ? parts.join(" ") : "";
}

function mergeRow(target, source){
	return {
		_id: target._id,
		type: joinCsv(splitCsv(target.type).concat(splitCsv(source.type))),
		theme: joinCsv(splitCsv(target.theme).concat(splitCsv(source.theme))),
		mean: String(target.mean || "").trim() || String(source.mean || "").trim(),
		hit: Math.max(Number(target.hit) || 0, Number(source.hit) || 0),
		flag: Math.max(Number(target.flag) || 0, Number(source.flag) || 0)
	};
}

async function applyOperation(client, op){
	if(op.type === "rename"){
		await client.query("UPDATE kkutu_en SET _id=$1 WHERE _id=$2", [ op.after, op.before ]);
		return;
	}
	if(op.type === "merge"){
		await client.query(
			"UPDATE kkutu_en SET type=$1, mean=$2, hit=$3, theme=$4, flag=$5 WHERE _id=$6",
			[ op.row.type, op.row.mean, op.row.hit, op.row.theme, op.row.flag, op.row._id ]
		);
		await client.query("DELETE FROM kkutu_en WHERE _id=$1", [ op.source ]);
	}
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
			"SELECT _id, type, mean, hit, theme, flag FROM kkutu_en WHERE _id LIKE '% s %' ORDER BY _id"
		)).rows;
		const broadTargets = rows.map(function(row){ return broadPossessiveTarget(row._id); }).filter(Boolean);
		const allRows = (await client.query(
			"SELECT _id, type, mean, hit, theme, flag FROM kkutu_en WHERE _id = ANY($1::text[])",
			[ broadTargets ]
		)).rows;
		const byId = new Map();
		allRows.forEach(function(row){ byId.set(row._id, row); });
		const existingTargets = new Set(allRows.map(function(row){ return row._id; }));

		const operations = [];
		const skipped = [];
		rows.forEach(function(row){
			const after = possessiveTarget(row, existingTargets);
			if(!after || after === row._id){
				skipped.push(row._id);
				return;
			}
			const target = byId.get(after);
			if(target){
				operations.push({ type: "merge", source: row._id, target: after, row: mergeRow(target, row) });
				byId.set(after, operations[operations.length - 1].row);
			}else{
				operations.push({ type: "rename", before: row._id, after: after });
				byId.set(after, Object.assign({}, row, { _id: after }));
			}
		});

		console.log(JSON.stringify({
			mode: APPLY ? "apply" : "dry-run",
			candidates: rows.length,
			operations: operations.length,
			skipped: skipped.length,
			operationSample: operations.slice(0, 500),
			skippedSample: skipped.slice(0, 500)
		}, null, 2));

		if(APPLY && operations.length){
			await client.query("BEGIN");
			try{
				for(let i = 0; i < operations.length; i++){
					await applyOperation(client, operations[i]);
				}
				await client.query("COMMIT");
				console.log("APPLIED", operations.length);
			}catch(error){
				await client.query("ROLLBACK");
				throw error;
			}
		}

		const checkWords = [
			"victoria s secret",
			"victoria's secret",
			"summoner s rift",
			"summoner's rift",
			"builder s workshop",
			"builder's workshop"
		];
		const check = await client.query(
			"SELECT _id, type, theme, mean FROM kkutu_en WHERE _id = ANY($1::text[]) ORDER BY _id",
			[ checkWords ]
		);
		console.log("CHECK");
		check.rows.forEach(function(row){
			console.log(JSON.stringify(row));
		});
	}finally{
		await client.end();
	}
}

main().catch(function(error){
	console.error(error);
	process.exit(1);
});
