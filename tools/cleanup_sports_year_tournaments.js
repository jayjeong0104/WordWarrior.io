"use strict";

const { Pool } = require("../Server/lib/node_modules/pg");
const GLOBAL = require("../Server/lib/sub/global.json");

const APPLY = process.argv.includes("--apply");

const SPORTS = {
	NBAP: "Basketball tournament.",
	VOLL: "Volleyball tournament.",
	BASE: "Baseball tournament.",
	AMFB: "American football tournament.",
	SOCP: "Football tournament."
};
const SPORT_CODES = Object.keys(SPORTS);
const YEAR_RE = /\b(?:18|19|20)\d{2}\b/;
const YEAR_WITH_SHORT_SEASON_RE = /\b(?:18|19|20)\d{2}(?:\s+\d{2})?\b/g;
const COMPETITION_RE = /\b(championships?|cups?|tournaments?|leagues?|finals?|series|bowls?|olympics?|olympiad|season|qualifiers?|qualification|classic|trophy|challenge|games)\b/;

const pool = new Pool({
	user: GLOBAL.PG_USER,
	password: GLOBAL.PG_PASSWORD,
	host: GLOBAL.PG_HOST,
	port: GLOBAL.PG_PORT,
	database: GLOBAL.PG_DATABASE
});

function splitCsv(value){
	return String(value || "")
		.split(",")
		.map(function(item){ return item.trim(); })
		.filter(Boolean);
}

function joinCsv(values){
	return Array.from(new Set(values.filter(Boolean))).join(",");
}

function normalizeSpaces(value){
	return String(value || "").replace(/\s+/g, " ").trim();
}

function fixPossessives(value){
	return normalizeSpaces(String(value || "")
		.replace(/\bmen s\b/g, "men's")
		.replace(/\bwomen s\b/g, "women's"));
}

function hasSportTheme(row){
	const themes = splitCsv(row.theme);
	return SPORT_CODES.some(function(code){ return themes.includes(code); });
}

function sportThemes(row){
	const themes = splitCsv(row.theme);
	return SPORT_CODES.filter(function(code){ return themes.includes(code); });
}

function isYearTournament(id){
	const value = String(id || "").toLowerCase();
	return YEAR_RE.test(value) && COMPETITION_RE.test(value);
}

function generalTournamentName(id){
	const value = fixPossessives(String(id || "").toLowerCase().replace(YEAR_WITH_SHORT_SEASON_RE, " "));
	if(!value || YEAR_RE.test(value) || !COMPETITION_RE.test(value)) return "";
	return value;
}

function hasUsableMean(mean){
	return /[a-z]/i.test(String(mean || "")
		.replace(/\uFF02[0-9]+\uFF02/g, "")
		.replace(/\uFF3B[0-9]+\uFF3D/g, "")
		.replace(/\uFF08[0-9]+\uFF09/g, ""));
}

function serializeMean(definition){
	return "＂1＂［1］（1）" + definition;
}

function genericDefinition(row){
	const themes = sportThemes(row);
	return SPORTS[themes[0]] || "Sports tournament.";
}

function definitionForGeneral(row){
	const mean = String(row.mean || "");
	if(hasUsableMean(mean) && !YEAR_RE.test(mean)) return mean;
	return serializeMean(genericDefinition(row));
}

function mergeRow(target, source, meanOverride){
	return {
		_id: target._id,
		type: joinCsv(splitCsv(target.type).concat(splitCsv(source.type))),
		theme: joinCsv(splitCsv(target.theme).concat(splitCsv(source.theme))),
		mean: hasUsableMean(target.mean) ? target.mean : (meanOverride || source.mean),
		hit: Math.max(Number(target.hit) || 0, Number(source.hit) || 0),
		flag: Math.max(Number(target.flag) || 0, Number(source.flag) || 0)
	};
}

function cloneAs(row, id, mean){
	return {
		_id: id,
		type: row.type,
		theme: joinCsv(splitCsv(row.theme)),
		mean: mean || row.mean,
		hit: Number(row.hit) || 0,
		flag: Number(row.flag) || 0
	};
}

async function loadRows(client){
	const q = await client.query("SELECT _id, type, mean, hit, theme, flag FROM kkutu_en");
	const rows = q.rows.map(function(row){
		row._id = String(row._id || "").toLowerCase();
		return row;
	});
	const byId = new Map();
	rows.forEach(function(row){ byId.set(row._id, row); });
	return { rows: rows, byId: byId };
}

function planCleanup(rows, byId){
	const operations = [];
	const deleted = new Set();
	let deleteYearSpecific = 0;
	let renamePossessive = 0;
	let mergeIntoGeneral = 0;
	let insertGeneral = 0;

	rows.forEach(function(row){
		if(deleted.has(row._id) || !hasSportTheme(row)) return;

		if(isYearTournament(row._id)){
			const targetId = generalTournamentName(row._id);
			if(targetId && targetId !== row._id){
				const mean = definitionForGeneral(row);
				const target = byId.get(targetId);
				if(target){
					const merged = mergeRow(target, row, mean);
					operations.push({ type: "update", row: merged, reason: "merge-year-specific", source: row._id });
					byId.set(targetId, merged);
					mergeIntoGeneral++;
				}else{
					const inserted = cloneAs(row, targetId, mean);
					operations.push({ type: "insert", row: inserted, reason: "general-from-year-specific", source: row._id });
					byId.set(targetId, inserted);
					insertGeneral++;
				}
			}
			operations.push({ type: "delete", id: row._id, reason: "delete-year-specific" });
			deleted.add(row._id);
			byId.delete(row._id);
			deleteYearSpecific++;
			return;
		}

		const targetId = fixPossessives(row._id);
		if(targetId && targetId !== row._id){
			const target = byId.get(targetId);
			if(target){
				const merged = mergeRow(target, row);
				operations.push({ type: "update", row: merged, reason: "merge-possessive", source: row._id });
				operations.push({ type: "delete", id: row._id, reason: "delete-possessive-source" });
				byId.set(targetId, merged);
				byId.delete(row._id);
				deleted.add(row._id);
				mergeIntoGeneral++;
			}else{
				const before = row._id;
				operations.push({ type: "rename", before: before, after: targetId, reason: "fix-possessive" });
				row._id = targetId;
				byId.delete(before);
				byId.set(targetId, row);
				renamePossessive++;
			}
		}
	});

	return {
		operations: operations,
		stats: {
			deleteYearSpecific: deleteYearSpecific,
			renamePossessive: renamePossessive,
			mergeIntoGeneral: mergeIntoGeneral,
			insertGeneral: insertGeneral
		}
	};
}

async function applyOperation(client, op){
	if(op.type === "update"){
		await client.query(
			"UPDATE kkutu_en SET type=$1, mean=$2, hit=$3, theme=$4, flag=$5 WHERE _id=$6",
			[ op.row.type, op.row.mean, op.row.hit, op.row.theme, op.row.flag, op.row._id ]
		);
		return;
	}
	if(op.type === "insert"){
		await client.query(
			"INSERT INTO kkutu_en (_id, type, mean, hit, theme, flag) VALUES ($1, $2, $3, $4, $5, $6)",
			[ op.row._id, op.row.type, op.row.mean, op.row.hit, op.row.theme, op.row.flag ]
		);
		return;
	}
	if(op.type === "rename"){
		await client.query("UPDATE kkutu_en SET _id=$1 WHERE _id=$2", [ op.after, op.before ]);
		return;
	}
	if(op.type === "delete"){
		await client.query("DELETE FROM kkutu_en WHERE _id=$1", [ op.id ]);
	}
}

async function main(){
	const client = await pool.connect();
	try{
		const loaded = await loadRows(client);
		const plan = planCleanup(loaded.rows, loaded.byId);
		if(APPLY && plan.operations.length){
			await client.query("BEGIN");
			for(let i = 0; i < plan.operations.length; i++){
				await applyOperation(client, plan.operations[i]);
			}
			await client.query("COMMIT");
		}
		console.log(JSON.stringify({
			mode: APPLY ? "apply" : "dry-run",
			stats: plan.stats,
			operations: plan.operations.length,
			sample: plan.operations.slice(0, 40)
		}, null, 2));
	}catch(err){
		if(APPLY) await client.query("ROLLBACK").catch(function(){});
		throw err;
	}finally{
		client.release();
		await pool.end();
	}
}

main().catch(function(err){
	console.error(err);
	process.exit(1);
});
