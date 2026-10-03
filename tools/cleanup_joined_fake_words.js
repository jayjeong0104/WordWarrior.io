"use strict";

const fs = require("fs");
const path = require("path");
const { Client } = require(path.join(process.cwd(), "Server/lib/node_modules/pg"));
const config = require(path.join(process.cwd(), "Server/lib/sub/global.json"));

const APPLY = process.argv.includes("--apply");
const DB_SQL = path.join(process.cwd(), "db.sql");

const EXPLICIT_REMOVE = new Set([
	"reddishstriped",
	"mercurypoisoning"
]);

const KEEP_JOINED = new Set([
	"airbag",
	"aircraft",
	"airport",
	"armchair",
	"backbone",
	"background",
	"baseball",
	"basketball",
	"blackboard",
	"blueprint",
	"bookcase",
	"bookmark",
	"bookshelf",
	"brainstorm",
	"breakfast",
	"butterfly",
	"cannot",
	"cartwheel",
	"chairman",
	"childhood",
	"cowboy",
	"cupcake",
	"database",
	"daylight",
	"desktop",
	"doorbell",
	"download",
	"earphone",
	"earthquake",
	"firefighter",
	"firefly",
	"football",
	"foreground",
	"greenhouse",
	"headphone",
	"homepage",
	"keyboard",
	"laptop",
	"lighthouse",
	"moonlight",
	"newspaper",
	"notebook",
	"overwatch",
	"password",
	"playground",
	"rainbow",
	"screenshot",
	"smartphone",
	"snowball",
	"software",
	"starfish",
	"starship",
	"sunflower",
	"sunlight",
	"teammate",
	"toothbrush",
	"volleyball",
	"waterfall",
	"website"
]);

const BAD_DEFINITION_PATTERNS = [
	/\b[a-z]+ poisoning\b/,
	/\b[a-z]+ striped\b/,
	/\b[a-z]+ spotted\b/,
	/\b[a-z]+ colored\b/,
	/\b[a-z]+ coloured\b/
];

const JOINED_DESCRIPTOR_SUFFIXES = [
	"striped",
	"spotted",
	"streaked",
	"banded",
	"lined",
	"colored",
	"coloured"
];

function normalize(value){
	return String(value || "")
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "");
}

function compact(value){
	return normalize(value).replace(/[^a-z0-9]+/g, "");
}

function textWords(value){
	return normalize(value).replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
}

function isPlainJoinedId(id){
	return /^[a-z][a-z0-9]{7,}$/.test(id) && id.indexOf(" ") === -1 && id.indexOf("'") === -1;
}

function hasBadDefinitionSignal(row){
	const text = " " + textWords(row.mean).join(" ") + " ";
	return BAD_DEFINITION_PATTERNS.some(function(pattern){ return pattern.test(text); });
}

function isPlainDescriptorDefinition(row){
	const text = textWords(row.mean).join(" ");
	return /^1 having [a-z]+ (stripes?|spots?|streaks?|bands?|lines?)$/.test(text);
}

function canSplitIntoExistingWords(id, wordSet){
	for(let i = 3; i <= id.length - 3; i++){
		const left = id.slice(0, i);
		const right = id.slice(i);
		if(wordSet.has(left) && wordSet.has(right)) return left + " " + right;
	}
	return "";
}

function joinedDescriptorSplit(id){
	for(const suffix of JOINED_DESCRIPTOR_SUFFIXES){
		if(id.length > suffix.length + 2 && id.endsWith(suffix)){
			return id.slice(0, -suffix.length) + " " + suffix;
		}
	}
	return "";
}

function cleanupReason(row, wordSet){
	const id = normalize(row._id).trim();
	if(EXPLICIT_REMOVE.has(id)) return "explicit fake joined word";
	if(!isPlainJoinedId(id) || KEEP_JOINED.has(id)) return "";
	if(isPlainDescriptorDefinition(row)){
		const descriptorSplit = joinedDescriptorSplit(id);
		if(descriptorSplit) return "definition describes joined phrase: " + descriptorSplit;
	}
	return "";
}

function removeRowsFromSql(ids){
	if(!ids.length || !fs.existsSync(DB_SQL)) return 0;
	const remove = new Set(ids);
	const before = fs.readFileSync(DB_SQL, "utf8");
	const lines = before.split(/\r?\n/);
	let removed = 0;
	const after = lines.filter(function(line){
		const id = line.split("\t", 1)[0];
		if(remove.has(id)){
			removed++;
			return false;
		}
		return true;
	}).join("\n");
	if(APPLY && removed) fs.writeFileSync(DB_SQL, after, "utf8");
	return removed;
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
		const rows = (await client.query("SELECT _id, type, mean, theme, flag FROM kkutu_en ORDER BY _id")).rows;
		const wordSet = new Set();
		rows.forEach(function(row){
			const id = normalize(row._id).trim();
			wordSet.add(id);
		});

		const removals = [];
		rows.forEach(function(row){
			const reason = cleanupReason(row, wordSet);
			if(reason) removals.push({ id: row._id, reason: reason, mean: row.mean });
		});

		console.log(JSON.stringify({
			apply: APPLY,
			count: removals.length,
			removals: removals.slice(0, 200)
		}, null, 2));

		if(APPLY && removals.length){
			const ids = removals.map(function(item){ return item.id; });
			await client.query("DELETE FROM kkutu_en WHERE _id = ANY($1::text[])", [ ids ]);
			const sqlRemoved = removeRowsFromSql(ids);
			console.log("Deleted from kkutu_en:", ids.length);
			console.log("Removed from db.sql:", sqlRemoved);
		}
	}finally{
		await client.end();
	}
}

main().catch(function(error){
	console.error(error);
	process.exit(1);
});
