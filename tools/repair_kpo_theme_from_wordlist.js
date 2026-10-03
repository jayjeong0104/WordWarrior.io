"use strict";

const fs = require("fs");
const path = require("path");
const { Pool } = require("../Server/lib/node_modules/pg");
const GLOBAL = require("../Server/lib/sub/global.json");

const APPLY = process.argv.includes("--apply");
const WORDLIST = path.join(__dirname, "..", "data", "wordlists", "kkutu_en_KPO.txt");

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
		.replace(/&/g, " and ")
		.replace(/[^a-z0-9 ]+/gi, " ")
		.replace(/\s+/g, " ")
		.trim()
		.toLowerCase();
}

function splitThemes(theme){
	return String(theme || "")
		.split(",")
		.map(function(item){ return item.trim(); })
		.filter(Boolean);
}

function addTheme(theme, code){
	const themes = splitThemes(theme);
	if(!themes.includes(code)) themes.push(code);
	return themes.join(",");
}

async function main(){
	const words = Array.from(new Set(fs.readFileSync(WORDLIST, "utf8")
		.split(/\r?\n/)
		.map(normalizeWord)
		.filter(Boolean)));

	const client = await pool.connect();
	try{
		const updates = [];
		for(let i = 0; i < words.length; i++){
			const row = await client.query("SELECT _id, theme FROM kkutu_en WHERE _id=$1", [ words[i] ]);
			if(!row.rows.length) continue;
			const current = row.rows[0];
			if(splitThemes(current.theme).includes("KPO")) continue;
			updates.push({
				id: current._id,
				before: current.theme,
				theme: addTheme(current.theme, "KPO")
			});
		}

		if(APPLY){
			await client.query("BEGIN");
			for(let i = 0; i < updates.length; i++){
				await client.query("UPDATE kkutu_en SET theme=$1 WHERE _id=$2", [ updates[i].theme, updates[i].id ]);
			}
			await client.query("COMMIT");
		}

		console.log(JSON.stringify({
			mode: APPLY ? "apply" : "dry-run",
			wordlistWords: words.length,
			updates: updates.length,
			byCurrentTheme: updates.reduce(function(acc, update){
				const before = update.before || "";
				acc[before] = (acc[before] || 0) + 1;
				return acc;
			}, {}),
			sample: updates.slice(0, 20)
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
