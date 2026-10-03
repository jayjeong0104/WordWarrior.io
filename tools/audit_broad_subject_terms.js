"use strict";

const path = require("path");
const { Client } = require(path.join(process.cwd(), "Server/lib/node_modules/pg"));
const config = require(path.join(process.cwd(), "Server/lib/sub/global.json"));

const AUDIT = {
	"450": [ "star", "orbit", "planet", "comet" ],
	"490": [ "code", "program", "network", "server", "client" ],
	"240": [ "number", "proof", "circle", "angle", "matrix", "vector" ],
	DSCI: [ "model", "feature", "classification", "prediction" ],
	"30": [ "market", "stock", "bond", "bank", "price", "trade", "money" ],
	"350": [ "goal", "score", "league", "tournament" ],
	"410": [ "god", "faith", "sacred", "temple", "church" ],
	"100": [ "war", "battle", "tank", "weapon", "army" ],
	"370": [ "drug", "doctor", "clinical", "therapy" ],
	"530": [ "element", "solution", "reaction", "organic", "acid", "compound" ]
};

function normalizeText(value){
	return String(value || "")
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function hasTerm(text, term){
	const normalizedTerm = normalizeText(term);
	return (" " + text + " ").indexOf(" " + normalizedTerm + " ") !== -1;
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
		for(const theme of Object.keys(AUDIT)){
			const rows = (await client.query(
				"SELECT _id, theme, mean FROM kkutu_en WHERE ','||COALESCE(theme,'')||',' LIKE '%,' || $1 || ',%' ORDER BY _id",
				[ theme ]
			)).rows;
			console.log("THEME", theme, "ROWS", rows.length);
			for(const term of AUDIT[theme]){
				const matches = rows.filter(function(row){
					return hasTerm(normalizeText([ row._id, row.mean ].join(" ")), term);
				});
				console.log(" TERM", term, "COUNT", matches.length);
				matches.slice(0, 18).forEach(function(row){
					console.log("  " + row._id + "\t" + row.theme + "\t" + String(row.mean || "").slice(0, 150));
				});
			}
		}
	}finally{
		await client.end();
	}
}

main().catch(function(error){
	console.error(error);
	process.exit(1);
});
