"use strict";

const path = require("path");
const { Client } = require(path.join(process.cwd(), "Server/lib/node_modules/pg"));
const config = require(path.join(process.cwd(), "Server/lib/sub/global.json"));

const words = process.argv.slice(2);

async function main(){
	if(!words.length){
		console.error("Usage: node tools/inspect_words.js <word> [word...]");
		process.exit(1);
	}
	const client = new Client({
		host: config.PG_HOST,
		user: config.PG_USER,
		password: String(config.PG_PASSWORD),
		port: config.PG_PORT,
		database: config.PG_DATABASE
	});
	await client.connect();
	try{
		const result = await client.query(
			"SELECT _id, type, theme, mean, flag FROM kkutu_en WHERE _id = ANY($1::text[]) ORDER BY _id",
			[ words ]
		);
		console.log(JSON.stringify(result.rows, null, 2));
	}finally{
		await client.end();
	}
}

main().catch(function(error){
	console.error(error);
	process.exit(1);
});
