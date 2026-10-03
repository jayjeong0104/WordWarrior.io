"use strict";

const https = require("https");
const { Pool } = require("../Server/lib/node_modules/pg");
const GLOBAL = require("../Server/lib/sub/global.json");

const APPLY = process.argv.includes("--apply");
const TOP_MARK = "\uFF02";
const MID_OPEN = "\uFF3B";
const MID_CLOSE = "\uFF3D";
const LOW_OPEN = "\uFF08";
const LOW_CLOSE = "\uFF09";
const SUBJECT = "BRAWL";
const TYPE = "INJEONG";
const FLAG = 2;
const BASE = "https://api.brawlapi.com/v1";

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
		.replace(/&/g, " and ")
		.replace(/[^a-z0-9' ]+/gi, " ")
		.replace(/(^|\s)'|'(\s|$)/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();
}

function cleanText(text){
	return String(text || "")
		.replace(/<[^>]+>/g, " ")
		.replace(/\u00a0/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function splitThemes(theme){
	return String(theme || "")
		.split(",")
		.map(function(item){ return item.trim(); })
		.filter(Boolean);
}

function appendCsv(value, item){
	const current = String(value || "").trim();
	return current ? current + "," + item : item;
}

function serializeMeanNumber(index, definition){
	return [
		TOP_MARK + index + TOP_MARK,
		MID_OPEN + "1" + MID_CLOSE,
		LOW_OPEN + "1" + LOW_CLOSE,
		String(definition).trim()
	].join("");
}

function nextMeanNumber(mean){
	let max = 0;
	String(mean || "").replace(/\uFF02([0-9]+)\uFF02/g, function(_, number){
		max = Math.max(max, Number(number) || 0);
		return _;
	});
	return max + 1;
}

function appendMean(mean, definition){
	const current = String(mean || "").trim();
	const serialized = serializeMeanNumber(nextMeanNumber(current), definition);
	return current ? current + "  " + serialized : serialized;
}

function normalizedText(text){
	return String(text || "")
		.toLowerCase()
		.replace(/[\uFF02\uFF3B\uFF3D\uFF08\uFF09]/g, " ")
		.replace(/[^a-z0-9]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function hasDefinition(mean, definition){
	const haystack = normalizedText(mean);
	const needle = normalizedText(definition);
	if(!needle) return true;
	return haystack.indexOf(needle) !== -1 || haystack.indexOf(needle.slice(0, 80)) !== -1;
}

function hasUsableMean(mean){
	return /[a-z]/i.test(String(mean || "")
		.replace(/\uFF02[0-9]+\uFF02/g, "")
		.replace(/\uFF3B[0-9]+\uFF3D/g, "")
		.replace(/\uFF08[0-9]+\uFF09/g, ""));
}

function requestJson(url){
	return new Promise(function(resolve, reject){
		const req = https.get(url, {
			headers: {
				"Accept": "application/json",
				"User-Agent": "KKuTu-BrawlAPI-Subject-Importer/1.0"
			},
			timeout: 60000
		}, function(res){
			let body = "";
			res.setEncoding("utf8");
			res.on("data", function(chunk){ body += chunk; });
			res.on("end", function(){
				if(res.statusCode < 200 || res.statusCode >= 300){
					reject(new Error("HTTP " + res.statusCode + " " + body.slice(0, 200)));
					return;
				}
				try{
					resolve(JSON.parse(body));
				}catch(err){
					reject(err);
				}
			});
		});
		req.on("timeout", function(){
			req.destroy(new Error("Request timed out"));
		});
		req.on("error", reject);
	});
}

function addTerm(terms, word, definition, source){
	const id = normalizeWord(word);
	const text = cleanText(definition);
	if(!id || id.length < 2 || !text) return;
	if(id.split(" ").length > 8) return;
	if(!terms.has(id)){
		terms.set(id, {
			word: id,
			definition: text,
			source: source
		});
	}
}

async function collectTerms(){
	const terms = new Map();
	const brawlers = await requestJson(BASE + "/brawlers");
	(brawlers.list || []).forEach(function(brawler){
		const rarity = brawler.rarity && brawler.rarity.name ? brawler.rarity.name + " " : "";
		const role = brawler.class && brawler.class.name && brawler.class.name !== "Unknown" ? brawler.class.name + " " : "";
		addTerm(
			terms,
			brawler.name,
			rarity + role + "Brawl Stars brawler. " + cleanText(brawler.description),
			"brawler"
		);
		(brawler.starPowers || []).forEach(function(item){
			addTerm(
				terms,
				item.name,
				"Brawl Stars star power for " + brawler.name + ". " + cleanText(item.description),
				"starPower"
			);
		});
		(brawler.gadgets || []).forEach(function(item){
			addTerm(
				terms,
				item.name,
				"Brawl Stars gadget for " + brawler.name + ". " + cleanText(item.description),
				"gadget"
			);
		});
	});

	const modes = await requestJson(BASE + "/gamemodes");
	(modes.list || []).forEach(function(mode){
		const description = cleanText(mode.description || mode.shortDescription || mode.title);
		addTerm(terms, mode.name, "Brawl Stars game mode. " + description, "gameMode");
	});

	const maps = await requestJson(BASE + "/maps");
	(maps.list || []).forEach(function(map){
		const mode = map.gameMode && map.gameMode.name ? " for " + map.gameMode.name : "";
		addTerm(terms, map.name, "Brawl Stars map" + mode + ".", "map");
	});

	return Array.from(terms.values());
}

async function loadExisting(client){
	const q = await client.query("SELECT _id, type, mean, theme, flag FROM kkutu_en");
	const map = new Map();
	q.rows.forEach(function(row){
		map.set(normalizeWord(row._id), row);
	});
	return map;
}

function planRows(existing, rows){
	const inserts = [];
	const updates = [];
	rows.forEach(function(row){
		const current = existing.get(row.word);
		if(!current){
			const inserted = {
				_id: row.word,
				type: TYPE,
				mean: serializeMeanNumber(1, row.definition),
				hit: 0,
				theme: SUBJECT,
				flag: FLAG
			};
			inserts.push(inserted);
			existing.set(row.word, inserted);
			return;
		}

		const currentMean = String(current.mean || "").trim();
		let nextType = String(current.type || "");
		let nextTheme = String(current.theme || "");
		let nextMean = currentMean;

		if(!hasUsableMean(currentMean)){
			nextType = appendCsv(nextType, TYPE);
			nextTheme = appendCsv(nextTheme, SUBJECT);
			nextMean = serializeMeanNumber(1, row.definition);
		}else if(!splitThemes(nextTheme).includes(SUBJECT) || !hasDefinition(currentMean, row.definition)){
			nextType = appendCsv(nextType, TYPE);
			nextTheme = appendCsv(nextTheme, SUBJECT);
			nextMean = appendMean(currentMean, row.definition);
		}

		if(nextType !== String(current.type || "") || nextTheme !== String(current.theme || "") || nextMean !== currentMean){
			updates.push({
				id: current._id,
				type: nextType,
				theme: nextTheme,
				mean: nextMean,
				source: row.source
			});
			current.type = nextType;
			current.theme = nextTheme;
			current.mean = nextMean;
		}
	});
	return { inserts: inserts, updates: updates };
}

async function countTheme(client){
	const q = await client.query(
		"SELECT COUNT(*)::int AS count FROM kkutu_en WHERE string_to_array(COALESCE(theme, ''), ',') @> ARRAY[$1]",
		[ SUBJECT ]
	);
	return q.rows[0].count;
}

async function applyPlan(client, plan){
	for(let i = 0; i < plan.updates.length; i++){
		await client.query("UPDATE kkutu_en SET type=$1, theme=$2, mean=$3 WHERE _id=$4", [
			plan.updates[i].type,
			plan.updates[i].theme,
			plan.updates[i].mean,
			plan.updates[i].id
		]);
	}
	for(let i = 0; i < plan.inserts.length; i++){
		await client.query(
			"INSERT INTO kkutu_en (_id, type, mean, hit, theme, flag) VALUES ($1, $2, $3, $4, $5, $6)",
			[
				plan.inserts[i]._id,
				plan.inserts[i].type,
				plan.inserts[i].mean,
				plan.inserts[i].hit,
				plan.inserts[i].theme,
				plan.inserts[i].flag
			]
		);
	}
}

async function main(){
	const rows = await collectTerms();
	const client = await pool.connect();
	try{
		const existing = await loadExisting(client);
		const plan = planRows(existing, rows);
		if(APPLY){
			await client.query("BEGIN");
			await applyPlan(client, plan);
			await client.query("COMMIT");
		}
		const bySource = rows.reduce(function(acc, row){
			acc[row.source] = (acc[row.source] || 0) + 1;
			return acc;
		}, {});
		console.log(JSON.stringify({
			mode: APPLY ? "apply" : "dry-run",
			fetched: rows.length,
			bySource: bySource,
			inserts: plan.inserts.length,
			updates: plan.updates.length,
			count: await countTheme(client),
			sample: rows.slice(0, 12)
		}, null, 2));
	} catch(err){
		if(APPLY) await client.query("ROLLBACK");
		throw err;
	} finally{
		client.release();
		await pool.end();
	}
}

main().catch(function(err){
	console.error(err);
	process.exit(1);
});
