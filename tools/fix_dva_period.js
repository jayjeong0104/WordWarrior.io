"use strict";

const path = require("path");
const { Client } = require(path.join(process.cwd(), "Server/lib/node_modules/pg"));
const config = require(path.join(process.cwd(), "Server/lib/sub/global.json"));

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
		await client.query("BEGIN");
		const before = await client.query(
			"SELECT _id, type, theme, mean, flag, hit FROM kkutu_en WHERE _id = ANY($1::text[]) ORDER BY _id",
			[ [ "d va", "d.va", "dva" ] ]
		);
		const rows = before.rows;
		const source = rows.find(row => row._id === "d va" && String(row.mean || "").trim())
			|| rows.find(row => row._id === "d.va" && String(row.mean || "").trim())
			|| rows.find(row => row._id === "dva" && String(row.mean || "").trim());
		if(!source) throw new Error("No usable D.Va definition row found.");

		await client.query("DELETE FROM kkutu_en WHERE _id = ANY($1::text[])", [ [ "d va", "d.va", "dva" ] ]);
		await client.query(
			"INSERT INTO kkutu_en (_id, type, theme, mean, flag, hit) VALUES ($1, $2, $3, $4, $5, $6)",
			[ "d.va", source.type, source.theme, source.mean, source.flag, source.hit ]
		);
		await client.query("COMMIT");

		const after = await client.query(
			"SELECT _id, type, theme, mean, flag, hit FROM kkutu_en WHERE _id = ANY($1::text[]) ORDER BY _id",
			[ [ "d va", "d.va", "dva" ] ]
		);
		console.log(JSON.stringify({ before: before.rows, after: after.rows }, null, 2));
	}catch(error){
		await client.query("ROLLBACK");
		throw error;
	}finally{
		await client.end();
	}
}

if(require.main === module) main().catch(function(error){
	console.error(error);
	process.exit(1);
});
module.exports = { main };
