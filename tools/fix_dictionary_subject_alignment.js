"use strict";

const { Pool } = require("../Server/lib/node_modules/pg");
const GLOBAL = require("../Server/lib/sub/global.json");

const APPLY = process.argv.includes("--apply");
const TOP_MARK = "\uFF02";
const MID_OPEN = "\uFF3B";
const MID_CLOSE = "\uFF3D";
const LOW_OPEN = "\uFF08";
const LOW_CLOSE = "\uFF09";

const COMPUTER_SCIENCE_TERMS = [
	{ word: "ip", definition: "Internet Protocol, the network protocol used to address and route packets across networks.", append: true },
	{ word: "ip address", definition: "A numerical address that identifies a device on an Internet Protocol network.", append: true },
	{ word: "internet protocol", definition: "The network protocol used to address and route packets across interconnected networks.", append: false },
	{ word: "html", definition: "A markup language used to structure hypertext documents for the web.", append: false },
	{ word: "http", definition: "A protocol used to transfer hypertext requests and information between servers and browsers.", append: false },
	{ word: "hypertext transfer protocol", definition: "A protocol used to transfer hypertext requests and information between servers and browsers.", append: false },
	{ word: "css", definition: "Cascading Style Sheets, a stylesheet language used to describe web page presentation.", append: false },
	{ word: "javascript", definition: "A programming language commonly used for interactive web pages and applications.", append: false },
	{ word: "sql", definition: "A query language used to manage and retrieve data in relational databases.", append: false },
	{ word: "api", definition: "An application programming interface for communication between software components.", append: false },
	{ word: "json", definition: "A lightweight data-interchange format commonly used by web APIs.", append: false },
	{ word: "xml", definition: "A markup language for encoding structured documents and data.", append: false },
	{ word: "url", definition: "A web address that identifies the location of a resource on a network.", append: false },
	{ word: "uri", definition: "A string that identifies a resource by name, location, or both.", append: false },
	{ word: "dns", definition: "The Domain Name System, which maps domain names to network addresses.", append: false },
	{ word: "tcp", definition: "Transmission Control Protocol, a transport protocol for reliable network communication.", append: false },
	{ word: "udp", definition: "User Datagram Protocol, a transport protocol for low-latency network communication.", append: false },
	{ word: "python", definition: "A high-level programming language used for software development and scripting.", append: true },
	{ word: "information technology", definition: "The branch of technology dealing with computers, telecommunications, and information systems.", append: false },
	{ word: "computing", definition: "The study and use of computers and computable processes.", append: false },
	{ word: "hyperlink", definition: "A link from a hypertext document to another resource or location.", append: false },
	{ word: "hypertext", definition: "Machine-readable text organized with links between related information.", append: false },
	{ word: "metadata", definition: "Data that describes other data.", append: false },
	{ word: "modem", definition: "A device that modulates and demodulates signals for computer network communication.", append: false },
	{ word: "digital communication", definition: "Electronic transmission of digitally encoded information.", append: false },
	{ word: "musical instrument digital interface", definition: "A standard protocol for communication between electronic musical instruments and computers.", append: false }
];

const pool = new Pool({
	user: GLOBAL.PG_USER,
	password: GLOBAL.PG_PASSWORD,
	host: GLOBAL.PG_HOST,
	port: GLOBAL.PG_PORT,
	database: GLOBAL.PG_DATABASE
});

function normalizeWord(word){
	return String(word || "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[\u2018\u2019\u201B\u02BC\uFF07]/g, "'")
		.replace(/[’‘`]/g, "'")
		.replace(/&/g, " and ")
		.replace(/[^a-z0-9' ]+/gi, " ")
		.replace(/(^|\s)'|'(\s|$)/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();
}

function normalizedText(text){
	return String(text || "")
		.toLowerCase()
		.replace(/[\uFF02\uFF3B\uFF3D\uFF08\uFF09]/g, " ")
		.replace(/[^a-z0-9']+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function splitCsv(value){
	return String(value || "")
		.split(",")
		.map(function(item){ return item.trim(); })
		.filter(Boolean);
}

function joinUnique(values){
	return Array.from(new Set((values || []).filter(Boolean))).join(",");
}

function hasUsableMean(mean){
	return /[a-z]/i.test(String(mean || "")
		.replace(/\uFF02[0-9]+\uFF02/g, "")
		.replace(/\uFF3B[0-9]+\uFF3D/g, "")
		.replace(/\uFF08[0-9]+\uFF09/g, ""));
}

function cleanDefinition(text){
	return String(text || "")
		.replace(/\uFF02[0-9]+\uFF02/g, " ")
		.replace(/\uFF3B[0-9]+\uFF3D/g, " ")
		.replace(/\uFF08[0-9]+\uFF09/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function extractDefinitions(mean){
	const raw = String(mean || "").trim();
	if(!raw) return [];
	if(raw.indexOf(TOP_MARK) === -1) return [ cleanDefinition(raw) ].filter(Boolean);
	return raw.split(/\uFF02[0-9]+\uFF02/).slice(1).map(cleanDefinition).filter(Boolean);
}

function serializeMeanNumber(index, definition){
	return [
		TOP_MARK + index + TOP_MARK,
		MID_OPEN + "1" + MID_CLOSE,
		LOW_OPEN + "1" + LOW_CLOSE,
		String(definition || "").trim()
	].join("");
}

function nextMeanNumber(mean){
	let max = 0;
	String(mean || "").replace(/\uFF02([0-9]+)\uFF02/g, function(match, number){
		max = Math.max(max, Number(number) || 0);
		return match;
	});
	return max + 1;
}

function appendMean(mean, definition){
	const current = String(mean || "").trim();
	const next = serializeMeanNumber(nextMeanNumber(current), definition);
	return current ? current + "  " + next : next;
}

function hasDefinition(mean, definition){
	const haystack = normalizedText(mean);
	const needle = normalizedText(definition);
	return !!needle && (haystack.indexOf(needle) !== -1 || haystack.indexOf(needle.slice(0, 80)) !== -1);
}

function appendTypeIfNeeded(type, meanBefore, typeToAppend){
	const countBefore = extractDefinitions(meanBefore).length;
	const types = splitCsv(type);
	if(types.length >= countBefore + 1) return types.join(",");
	return types.concat([ typeToAppend ]).join(",");
}

function ensureTheme(theme, code){
	return joinUnique(splitCsv(theme).concat([ code ]));
}

async function loadRows(client){
	const q = await client.query("SELECT _id, type, mean, theme, flag, hit FROM kkutu_en");
	return q.rows;
}

function buildExactMap(rows){
	const map = new Map();
	rows.forEach(function(row){
		const key = normalizeWord(row._id);
		if(!map.has(key) || row._id === key){
			map.set(key, row);
		}
	});
	return map;
}

function planComputerScience(rows, exact){
	const inserts = [];
	const updates = [];

	COMPUTER_SCIENCE_TERMS.forEach(function(term){
		const key = normalizeWord(term.word);
		const current = exact.get(key);
		if(!current){
			const row = {
				_id: key,
				type: "n",
				mean: serializeMeanNumber(1, term.definition),
				hit: 0,
				theme: "490",
				flag: 0
			};
			inserts.push(row);
			rows.push(row);
			exact.set(key, row);
			return;
		}

		let nextType = String(current.type || "");
		let nextMean = String(current.mean || "").trim();
		let nextTheme = ensureTheme(current.theme, "490");

		if((term.append || !hasUsableMean(nextMean)) && !hasDefinition(nextMean, term.definition)){
			const before = nextMean;
			nextMean = appendMean(nextMean, term.definition);
			nextType = appendTypeIfNeeded(nextType, before, "n");
		}

		if(nextType !== String(current.type || "") || nextMean !== String(current.mean || "").trim() || nextTheme !== String(current.theme || "")){
			updates.push({
				id: current._id,
				type: nextType,
				mean: nextMean,
				theme: nextTheme,
				reason: "computer-science"
			});
			current.type = nextType;
			current.mean = nextMean;
			current.theme = nextTheme;
		}
	});

	return { inserts, updates };
}

function planCaseDuplicateMerges(rows, exact){
	const byLower = new Map();
	const updates = [];
	const deletes = [];

	rows.forEach(function(row){
		const key = String(row._id || "").toLowerCase();
		if(!byLower.has(key)) byLower.set(key, []);
		byLower.get(key).push(row);
	});

	byLower.forEach(function(group, key){
		if(group.length < 2) return;
		const target = group.find(function(row){ return row._id === key; })
			|| group.find(function(row){ return row._id === String(row._id || "").toLowerCase(); })
			|| group.slice().sort(function(a, b){ return String(a._id).localeCompare(String(b._id)); })[0];
		group.forEach(function(source){
			if(source === target) return;

			let targetType = String(target.type || "");
			let targetMean = String(target.mean || "").trim();
			const targetTheme = joinUnique(splitCsv(target.theme).concat(splitCsv(source.theme)));
			let changed = false;

			if(hasUsableMean(source.mean)){
				const definitions = extractDefinitions(source.mean);
				const sourceTypes = splitCsv(source.type);
				definitions.forEach(function(definition, index){
					if(hasDefinition(targetMean, definition)) return;
					const before = targetMean;
					targetMean = appendMean(targetMean, definition);
					targetType = appendTypeIfNeeded(targetType, before, sourceTypes[index] || sourceTypes[0] || "INJEONG");
					changed = true;
				});
			}

			if(changed || targetTheme !== String(target.theme || "")){
				updates.push({
					id: target._id,
					type: targetType,
					mean: targetMean,
					theme: targetTheme,
					reason: "case-duplicate-merge:" + source._id
				});
				target.type = targetType;
				target.mean = targetMean;
				target.theme = targetTheme;
			}
			deletes.push(source._id);
		});
	});

	return { updates, deletes };
}

async function applyPlan(client, plan){
	await client.query("BEGIN");
	try{
		for(const row of plan.updates){
			await client.query("UPDATE kkutu_en SET type=$1, mean=$2, theme=$3 WHERE _id=$4", [
				row.type,
				row.mean,
				row.theme,
				row.id
			]);
		}
		for(const row of plan.inserts){
			await client.query(
				"INSERT INTO kkutu_en (_id, type, mean, hit, theme, flag) VALUES ($1, $2, $3, $4, $5, $6)",
				[ row._id, row.type, row.mean, row.hit, row.theme, row.flag ]
			);
		}
		for(const id of plan.deletes){
			await client.query("DELETE FROM kkutu_en WHERE _id=$1", [ id ]);
		}
		await client.query("COMMIT");
	}catch(err){
		await client.query("ROLLBACK");
		throw err;
	}
}

async function main(){
	const client = await pool.connect();
	try{
		const rows = await loadRows(client);
		const exact = buildExactMap(rows);
		const csPlan = planComputerScience(rows, exact);
		const mergePlan = planCaseDuplicateMerges(rows, exact);
		const plan = {
			inserts: csPlan.inserts,
			updates: csPlan.updates.concat(mergePlan.updates),
			deletes: mergePlan.deletes
		};

		console.log(JSON.stringify({
			mode: APPLY ? "apply" : "dry-run",
			inserts: plan.inserts.length,
			updates: plan.updates.length,
			deletes: plan.deletes.length,
			insertSamples: plan.inserts.slice(0, 20).map(function(row){ return row._id + " [" + row.theme + "]"; }),
			updateSamples: plan.updates.slice(0, 30).map(function(row){ return row.id + " " + row.reason; }),
			deleteSamples: plan.deletes.slice(0, 30)
		}, null, 2));

		if(APPLY) await applyPlan(client, plan);
	}finally{
		client.release();
		await pool.end();
	}
}

if(require.main === module) main().catch(function(err){
	console.error(err && err.stack || err);
	process.exit(1);
});
module.exports = { buildExactMap, planComputerScience, planCaseDuplicateMerges };
