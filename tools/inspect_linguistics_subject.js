"use strict";

const path = require("path");
const { Client } = require(path.join(process.cwd(), "Server/lib/node_modules/pg"));
const config = require(path.join(process.cwd(), "Server/lib/sub/global.json"));

const THEME = "310";
const SAMPLE_WORDS = [
	"saxophone",
	"earphone",
	"loan",
	"allophone",
	"phoneme",
	"phonetics",
	"phonology",
	"language",
	"computer language",
	"body language",
	"sign language"
];

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
		const examples = await client.query(
			"SELECT _id, type, theme, mean FROM kkutu_en WHERE _id = ANY($1) ORDER BY _id",
			[ SAMPLE_WORDS ]
		);
		console.log("EXAMPLES");
		console.log(JSON.stringify(examples.rows, null, 2));

		const count = await client.query(
			"SELECT COUNT(*)::int AS c FROM kkutu_en WHERE ','||COALESCE(theme,'')||',' LIKE '%,' || $1 || ',%'",
			[ THEME ]
		);
		console.log("LINGUISTICS_COUNT", count.rows[0].c);

		const samples = await client.query(
			`SELECT _id, type, theme, mean
			 FROM kkutu_en
			 WHERE ','||COALESCE(theme,'')||',' LIKE '%,' || $1 || ',%'
			 ORDER BY _id
			 LIMIT 300`,
			[ THEME ]
		);
		console.log("FIRST_300");
		samples.rows.forEach((row) => {
			console.log(row._id + "\t" + row.theme + "\t" + String(row.mean || "").slice(0, 140));
		});
	}finally{
		await client.end();
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
