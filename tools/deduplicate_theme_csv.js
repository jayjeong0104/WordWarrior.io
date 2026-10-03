"use strict";

const { Pool } = require("../Server/lib/node_modules/pg");
const GLOBAL = require("../Server/lib/sub/global.json");

const APPLY = process.argv.includes("--apply");

const pool = new Pool({
	user: GLOBAL.PG_USER,
	password: GLOBAL.PG_PASSWORD,
	host: GLOBAL.PG_HOST,
	port: GLOBAL.PG_PORT,
	database: GLOBAL.PG_DATABASE
});

function splitThemes(theme){
	return String(theme || "")
		.split(",")
		.map(function(item){ return item.trim(); })
		.filter(Boolean);
}

function dedupeTheme(theme){
	return Array.from(new Set(splitThemes(theme))).join(",");
}

async function main(){
	const client = await pool.connect();
	try{
		const q = await client.query("SELECT _id, theme FROM kkutu_en WHERE theme IS NOT NULL AND theme <> ''");
		const updates = [];
		q.rows.forEach(function(row){
			const after = dedupeTheme(row.theme);
			if(after !== row.theme){
				updates.push({ id: row._id, before: row.theme, after: after });
			}
		});

		if(APPLY && updates.length){
			await client.query("BEGIN");
			for(let i = 0; i < updates.length; i++){
				await client.query("UPDATE kkutu_en SET theme=$1 WHERE _id=$2", [ updates[i].after, updates[i].id ]);
			}
			await client.query("COMMIT");
		}

		console.log(JSON.stringify({
			mode: APPLY ? "apply" : "dry-run",
			updates: updates.length,
			sample: updates.slice(0, 20)
		}, null, 2));
	} catch(err){
		if(APPLY) await client.query("ROLLBACK").catch(function(){});
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
