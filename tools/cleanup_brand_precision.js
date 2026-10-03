"use strict";

const path = require("path");
const { Client } = require(path.join(process.cwd(), "Server/lib/node_modules/pg"));
const config = require(path.join(process.cwd(), "Server/lib/sub/global.json"));

const APPLY = process.argv.includes("--apply");
const BRAND = "BRAND";
const TOP_MARK = "\uFF02";

const TARGETS = {
	spam: {
		reason: "Wikidata brand label collided with the common lowercase word",
		removeDefinitions: [ /\bbrand of canned precooked meat product\b/i ],
		removeTypes: [ "INJEONG" ]
	},
	text: {
		reason: "Wikidata brand/company label collided with the common dictionary word",
		removeDefinitions: [],
		removeTypes: []
	}
};

function splitCsv(value){
	return String(value || "")
		.split(",")
		.map(function(item){ return item.trim(); })
		.filter(Boolean);
}

function joinCsv(items){
	return items.filter(Boolean).join(",");
}

function joinUniqueCsv(items){
	return Array.from(new Set(items.filter(Boolean))).join(",");
}

function removeOne(items, value){
	const index = items.indexOf(value);
	if(index !== -1) items.splice(index, 1);
	return items;
}

function removeTheme(theme, code){
	return joinUniqueCsv(splitCsv(theme).filter(function(item){ return item !== code; }));
}

function splitMeanSections(mean){
	const text = String(mean || "");
	const re = new RegExp(TOP_MARK + "[0-9]+" + TOP_MARK, "g");
	const matches = [];
	let match;
	while((match = re.exec(text))){
		matches.push({ index: match.index });
	}
	if(!matches.length) return text ? [ text ] : [];
	return matches.map(function(item, index){
		const next = matches[index + 1];
		return text.slice(item.index, next ? next.index : text.length).trim();
	}).filter(Boolean);
}

function removeMatchingDefinitions(mean, patterns){
	if(!patterns.length) return String(mean || "");
	return splitMeanSections(mean).filter(function(section){
		return !patterns.some(function(pattern){ return pattern.test(section); });
	}).join("  ");
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
		const ids = Object.keys(TARGETS);
		const rows = (await client.query(
			"SELECT _id, type, mean, theme FROM kkutu_en WHERE _id = ANY($1::text[]) ORDER BY _id",
			[ ids ]
		)).rows;

		const updates = rows.map(function(row){
			const target = TARGETS[row._id];
			let nextTheme = removeTheme(row.theme, BRAND);
			let nextMean = removeMatchingDefinitions(row.mean, target.removeDefinitions);
			let types = splitCsv(row.type);
			target.removeTypes.forEach(function(type){ types = removeOne(types, type); });
			const nextType = joinCsv(types);
			return {
				_id: row._id,
				beforeType: String(row.type || ""),
				afterType: nextType,
				beforeTheme: String(row.theme || ""),
				afterTheme: nextTheme,
				beforeMean: String(row.mean || ""),
				afterMean: nextMean,
				reason: target.reason
			};
		}).filter(function(row){
			return row.beforeType !== row.afterType || row.beforeTheme !== row.afterTheme || row.beforeMean !== row.afterMean;
		});

		console.log("ROWS_TO_UPDATE", updates.length);
		updates.forEach(function(row){
			console.log(row._id + "\t" + row.beforeTheme + "\t=>\t" + row.afterTheme + "\t" + row.reason);
			if(row.beforeType !== row.afterType) console.log("TYPE\t" + row.beforeType + "\t=>\t" + row.afterType);
			if(row.beforeMean !== row.afterMean) console.log("MEAN_CHANGED\t" + row._id);
		});

		if(APPLY && updates.length){
			await client.query("BEGIN");
			try{
				for(const row of updates){
					await client.query(
						"UPDATE kkutu_en SET type=$1, theme=$2, mean=$3 WHERE _id=$4",
						[ row.afterType, row.afterTheme, row.afterMean, row._id ]
					);
				}
				await client.query("COMMIT");
				console.log("APPLIED", updates.length);
			}catch(error){
				await client.query("ROLLBACK");
				throw error;
			}
		}

		const check = await client.query(
			"SELECT _id, type, theme, mean FROM kkutu_en WHERE _id = ANY($1::text[]) ORDER BY _id",
			[ ids ]
		);
		console.log("CHECK");
		check.rows.forEach(function(row){
			console.log(JSON.stringify(row));
		});
	}finally{
		await client.end();
	}
}

main().catch(function(error){
	console.error(error);
	process.exit(1);
});
