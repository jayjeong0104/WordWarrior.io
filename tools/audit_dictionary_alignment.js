"use strict";

const { Pool } = require("../Server/lib/node_modules/pg");
const GLOBAL = require("../Server/lib/sub/global.json");

const pool = new Pool({
	user: GLOBAL.PG_USER,
	password: GLOBAL.PG_PASSWORD,
	host: GLOBAL.PG_HOST,
	port: GLOBAL.PG_PORT,
	database: GLOBAL.PG_DATABASE
});

const COMPUTER_SCIENCE = "490";

const EXACT_COMPUTER_SCIENCE_WORDS = [
	"ai",
	"api",
	"arpanet",
	"ascii",
	"browser",
	"cache",
	"cgi",
	"compiler",
	"computer",
	"computer science",
	"computing",
	"css",
	"database",
	"dns",
	"ethernet",
	"html",
	"http",
	"https",
	"hyperlink",
	"hypertext",
	"information technology",
	"internet",
	"internet protocol",
	"ip",
	"ip address",
	"javascript",
	"json",
	"linux",
	"malware",
	"metadata",
	"modem",
	"operating system",
	"packet",
	"protocol",
	"python",
	"router",
	"server",
	"software",
	"sql",
	"tcp",
	"udp",
	"unix",
	"uri",
	"url",
	"web browser",
	"web page",
	"web server",
	"world wide web",
	"xml"
];

const HIGH_CONFIDENCE_CS_PATTERNS = [
	/\(computer science\)/i,
	/\bcomputer programming\b/i,
	/\bprogramming language\b/i,
	/\bmarkup language\b/i,
	/\bquery language\b/i,
	/\bobject code\b/i,
	/\bmachine code\b/i,
	/\bmachine language\b/i,
	/\bassembly language\b/i,
	/\boperating system\b/i,
	/\bdata structure\b/i,
	/\bmachine learning\b/i,
	/\binternet protocol\b/i,
	/\bweb browser\b/i,
	/\bweb page\b/i,
	/\bworld wide web\b/i,
	/\bhypertext\b/i,
	/\bsoftware\b/i
];

function hasTheme(row, theme){
	return String(row.theme || "")
		.split(",")
		.map(function(value){ return value.trim(); })
		.indexOf(theme) !== -1;
}

function definitionCount(mean){
	const text = String(mean || "");
	if(!text.trim()) return 0;
	const parts = text.indexOf("\uFF02") === -1
		? [ text ]
		: text.split(/\uFF02[0-9]+\uFF02/).slice(1);
	return parts.map(function(part){
		return String(part || "")
			.replace(/\uFF3B[0-9]+\uFF3D/g, " ")
			.replace(/\uFF08[0-9]+\uFF09/g, " ")
			.replace(/\s+/g, " ")
			.trim();
	}).filter(function(part){
		return /[a-z0-9]/i.test(part);
	}).length;
}

function typeCount(type){
	return String(type || "")
		.split(",")
		.map(function(value){ return value.trim(); })
		.filter(Boolean)
		.length;
}

async function main(){
	const rows = (await pool.query("SELECT _id, type, theme, mean FROM kkutu_en ORDER BY _id")).rows;

	const caseDuplicates = [];
	const byLower = new Map();
	rows.forEach(function(row){
		const key = String(row._id || "").toLowerCase();
		if(!byLower.has(key)) byLower.set(key, []);
		byLower.get(key).push(row._id);
	});
	byLower.forEach(function(ids){
		if(ids.length > 1) caseDuplicates.push(ids);
	});

	const exactSet = new Set(EXACT_COMPUTER_SCIENCE_WORDS);
	const missingExactCs = rows.filter(function(row){
		return exactSet.has(String(row._id || "").toLowerCase()) && !hasTheme(row, COMPUTER_SCIENCE);
	});

	const missingPatternCs = rows.filter(function(row){
		if(hasTheme(row, COMPUTER_SCIENCE)) return false;
		const haystack = [ row._id, row.mean ].join(" ");
		return HIGH_CONFIDENCE_CS_PATTERNS.some(function(pattern){ return pattern.test(haystack); });
	});

	const typeMeanMismatches = rows.filter(function(row){
		const defs = definitionCount(row.mean);
		const types = typeCount(row.type);
		return defs > 0 && types > 0 && defs !== types;
	});

	console.log(JSON.stringify({
		caseDuplicateCount: caseDuplicates.length,
		caseDuplicateSamples: caseDuplicates.slice(0, 30),
		missingExactComputerScienceCount: missingExactCs.length,
		missingExactComputerScienceSamples: missingExactCs.slice(0, 80),
		missingPatternComputerScienceCount: missingPatternCs.length,
		missingPatternComputerScienceSamples: missingPatternCs.slice(0, 80),
		typeMeanMismatchCount: typeMeanMismatches.length,
		typeMeanMismatchSamples: typeMeanMismatches.slice(0, 80)
	}, null, 2));
}

main()
	.catch(function(error){
		console.error(error);
		process.exit(1);
	})
	.finally(function(){
		pool.end();
	});
