"use strict";

const fs = require("fs");
const path = require("path");
const { Client } = require(path.join(process.cwd(), "Server/lib/node_modules/pg"));
const config = require(path.join(process.cwd(), "Server/lib/sub/global.json"));
const SUBJECT_DATA = require("./subject_target_data");

const APPLY = process.argv.indexOf("--apply") !== -1;
const sampleArg = process.argv.find(function(arg){ return /^--sample=/.test(arg); });
const SAMPLE_LIMIT = Number(sampleArg ? sampleArg.split("=")[1] : "") || 120;
const TOP_MARK = "\uFF02";
const REFERENCE_SQL = path.join(process.cwd(), "db.sql");

const WORDNET_SUBJECT_TO_VISIBLE = {
	e27: "530"
};

const CATALOG_SUBJECTS = new Set([
	"ANIME",
	"APEX",
	"BRAWL",
	"COD",
	"CRL",
	"FORT",
	"LOL",
	"MINC",
	"OVW",
	"POK",
	"PUBG",
	"STA",
	"VALO"
]);

const CHECK_WORDS = [
	"as",
	"zinc",
	"chemical bond",
	"american samoa",
	"samoa",
	"ca",
	"co",
	"ga",
	"in",
	"or"
];

function decodeCopyField(field){
	if(field === "\\N") return "";
	return String(field || "")
		.replace(/\\\\/g, "\\")
		.replace(/\\t/g, "\t")
		.replace(/\\n/g, "\n")
		.replace(/\\r/g, "\r");
}

function extractReferenceRows(){
	const sql = fs.readFileSync(REFERENCE_SQL, "utf8");
	const marker = "COPY kkutu_en (_id, type, mean, hit, theme, flag) FROM stdin;";
	const start = sql.indexOf(marker);
	const rows = new Map();
	let bodyStart;
	let bodyEnd;

	if(start < 0) throw new Error("Could not find kkutu_en COPY section in db.sql");
	bodyStart = start + marker.length;
	bodyEnd = sql.indexOf("\n\\.", bodyStart);
	if(bodyEnd < 0) throw new Error("Could not find end of kkutu_en COPY section in db.sql");

	sql.slice(bodyStart, bodyEnd).trim().split(/\r?\n/).forEach(function(line){
		const parts = line.split("\t").map(decodeCopyField);
		if(parts.length < 6) return;
		rows.set(parts[0], {
			_id: parts[0],
			type: parts[1] || "",
			mean: parts[2] || "",
			theme: parts[4] || ""
		});
	});
	return rows;
}

function splitCsv(value){
	return String(value || "")
		.split(",")
		.map(function(item){ return item.trim(); })
		.filter(Boolean);
}

function joinCsv(values){
	return (values || []).filter(Boolean).join(",");
}

function unique(values){
	const seen = new Set();
	return (values || []).filter(function(value){
		if(!value || seen.has(value)) return false;
		seen.add(value);
		return true;
	});
}

function isWordNetTheme(theme){
	return /^e\d+$/i.test(String(theme || "").trim());
}

function isCustomTheme(theme){
	const value = String(theme || "").trim();
	return !!value && !isWordNetTheme(value);
}

function isCatalogSubject(theme){
	return CATALOG_SUBJECTS.has(String(theme || "").trim().toUpperCase());
}

function isInjeongType(type){
	return String(type || "").trim().toUpperCase() === "INJEONG";
}

function hasAutoSubjectRules(theme){
	return Object.prototype.hasOwnProperty.call(SUBJECT_DATA.AUTO_SUBJECT_RULES || {}, String(theme || "").trim());
}

function canDropUnplacedTheme(theme){
	return hasAutoSubjectRules(theme) || String(theme || "").trim() === "1001";
}

function isBlankReferenceTheme(theme){
	const value = String(theme || "").trim().toLowerCase();
	return !value || value === "e03";
}

function normalizeText(text){
	return String(text || "")
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[`'"\u2018\u2019\u201c\u201d]/g, " ")
		.replace(/[^a-z0-9]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function compactText(text){
	return normalizeText(text).replace(/\s+/g, "");
}

function hasWholePhrase(text, phrase){
	return (" " + text + " ").indexOf(" " + normalizeText(phrase) + " ") !== -1;
}

function stripDefinitionMarkup(text){
	return String(text || "")
		.replace(/\uFF3B[0-9]+\uFF3D/g, " ")
		.replace(/\uFF08[0-9]+\uFF09/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function extractDefinitions(mean){
	const raw = String(mean || "").trim();
	if(!raw) return [];
	if(raw.indexOf(TOP_MARK) === -1){
		const cleaned = stripDefinitionMarkup(raw);
		return cleaned ? [ cleaned ] : [];
	}
	return raw
		.split(/\uFF02[0-9]+\uFF02/g)
		.slice(1)
		.map(stripDefinitionMarkup)
		.filter(Boolean);
}

function buildRuleMatchers(theme){
	const rules = (SUBJECT_DATA.AUTO_SUBJECT_RULES || {})[theme] || [];
	return rules.map(function(rule){
		const phrase = normalizeText(rule);
		const compact = compactText(rule);
		const isMulti = phrase.indexOf(" ") !== -1;
		const isStem = !isMulti && compact.length > 4 && /(olog|onom|chem|physic|mathemat|linguist|astronom|econom|statistic|biolog|relig|medic)$/.test(compact);

		return function(context){
			if(!compact) return 0;
			if(context.idCompact === compact){
				if(context.allowStrongIdScore) return 120;
				if(context.allowWeakIdScore) return 55;
			}
			if(isMulti && hasWholePhrase(context.definitionText, phrase)) return 95;
			if(!isMulti && hasWholePhrase(context.definitionText, phrase)) return 80;
			if(isStem && context.definitionTokens.some(function(token){ return token.indexOf(compact) === 0; })) return 62;
			return 0;
		};
	});
}

const MATCHERS = Object.create(null);
function scoreRuleTheme(theme, row, definition, type, definitionCount){
	const key = String(theme || "").trim();
	const catalogSubject = isCatalogSubject(key);
	const definitionText = normalizeText(definition);
	const context = {
		id: normalizeText(row._id),
		idCompact: compactText(row._id),
		text: normalizeText([ row._id, definition ].join(" ")),
		definitionText: definitionText,
		definitionTokens: definitionText.split(/\s+/).filter(Boolean),
		allowStrongIdScore: !catalogSubject || definitionCount <= 1,
		allowWeakIdScore: catalogSubject && isInjeongType(type)
	};
	let score = 0;

	if(!MATCHERS[key]) MATCHERS[key] = buildRuleMatchers(key);
	MATCHERS[key].forEach(function(match){
		score = Math.max(score, match(context));
	});
	return score;
}

function scoreChemistry(row, definition, type, definitionCount){
	const text = normalizeText([ row._id, definition ].join(" "));
	const id = compactText(row._id);
	let score = scoreRuleTheme("530", row, definition, type, definitionCount);

	if(/\b(chemical|chemistry|molecule|molecular|atom|atomic|element|compound|acid|oxide|alkali|solvent|catalyst|ionic|covalent)\b/.test(text)){
		score = Math.max(score, 100);
	}
	if(/\b(metallic|metal|allotropic|arsenic|isotope|periodic table|herbicide|insecticide|arsenopyrite|orpiment|realgar|chemist|chemists|nerve agent|combustion|ferromagnetic|bivalent|trivalent)\b/.test(text)){
		score = Math.max(score, 110);
	}
	if(/\b(gas|gaseous)\b/.test(text) && /\b(poisonous|combustion|carbon|compound|odorless)\b/.test(text)){
		score = Math.max(score, 100);
	}
	if(id.length <= 2 && /\b(territory|state|province|island|country|city|town|region)\b/.test(text)){
		score = Math.min(score, 25);
	}
	if(/\bmathematical element\b/.test(text)){
		score = Math.min(score, 25);
	}
	return score;
}

function scoreMath(row, definition, type, definitionCount){
	const text = normalizeText(definition);
	let score = scoreRuleTheme("240", row, definition, type, definitionCount);

	if(/\b(mathematical|mathematics|number|numeral|arithmetic|algebra|geometry|calculus|equation|matrix|vector|theorem|fraction|integer|ordinal|cardinal|counting order)\b/.test(text)){
		score = Math.max(score, 100);
	}
	if(/\b(diameter|radius|angle|ratio|percentage|decimal)\b/.test(text) && score < 100){
		score = Math.min(score, 70);
	}
	return score;
}

function scoreMedical(row, definition, type, definitionCount){
	const text = normalizeText(definition);
	let score = scoreRuleTheme("370", row, definition, type, definitionCount);

	if(/\b(medical|medicine|disease|doctor|hospital|surgery|surgical|therapy|anatomy|physiology|symptom|diagnosis|treatment|clinical|pathology|oncology|cardiology)\b/.test(text)){
		score = Math.max(score, 100);
	}
	return score;
}

function scoreCountry(row, definition, type, definitionCount){
	const text = normalizeText(definition);
	const id = compactText(row._id);
	const countryNames = (SUBJECT_DATA.COUNTRY_NAMES || []).map(compactText);
	const overrides = SUBJECT_DATA.COUNTRY_NAME_OVERRIDES || {};
	let score = scoreRuleTheme("1001", row, definition, type, definitionCount);
	let idIsCountry = false;

	if(countryNames.indexOf(id) !== -1){
		idIsCountry = true;
		score = Math.max(score, 80);
	}
	Object.keys(overrides).forEach(function(code){
		if(compactText(code) === id || compactText(overrides[code]) === id){
			idIsCountry = true;
			score = Math.max(score, 80);
		}
	});
	if(/\b(sovereign country|independent country|republic|kingdom|nation|constitutional monarchy)\b/.test(text)) score = Math.max(score, idIsCountry ? 115 : 100);
	if(/\b(united states territory|territory|island|city|town|province|state)\b/.test(text) && !/\b(sovereign country|independent country|republic|kingdom|nation|constitutional monarchy)\b/.test(text)){
		score = Math.min(score, 30);
	}
	return score;
}

function scoreCustomTheme(theme, row, definition, type, definitionCount){
	const key = String(theme || "").trim();
	let score;

	if(key === "240") return scoreMath(row, definition, type, definitionCount);
	if(key === "530") return scoreChemistry(row, definition, type, definitionCount);
	if(key === "370") return scoreMedical(row, definition, type, definitionCount);
	if(key === "1001") return scoreCountry(row, definition, type, definitionCount);
	score = scoreRuleTheme(key, row, definition, type, definitionCount);
	return score;
}

function bestDefinitionForTheme(theme, row, definitions, types){
	let bestIndex = -1;
	let bestScore = 0;

	definitions.forEach(function(definition, index){
		const score = scoreCustomTheme(theme, row, definition, types[index], definitions.length);
		if(score > bestScore){
			bestScore = score;
			bestIndex = index;
		}
	});
	return { index: bestIndex, score: bestScore };
}

function buildBaseThemes(row, reference, definitionCount){
	const currentThemes = splitCsv(row.theme);
	const referenceThemes = reference ? splitCsv(reference.theme) : [];
	const base = [];
	let i;

	for(i = 0; i < definitionCount; i++){
		base[i] = referenceThemes[i] || currentThemes.find(function(theme){
			return isWordNetTheme(theme) && !base.includes(theme);
		}) || "";
	}
	return base;
}

function buildBaseTypes(row, reference, definitionCount){
	const currentTypes = splitCsv(row.type);
	const referenceTypes = reference ? splitCsv(reference.type) : [];
	const out = [];
	let i;

	for(i = 0; i < definitionCount; i++){
		out[i] = referenceTypes[i] || currentTypes[i] || currentTypes[0] || "";
	}
	return out;
}

function shouldReplaceThemeForCustom(existingTheme, customTheme){
	if(!existingTheme) return true;
	if(existingTheme === customTheme) return true;
	if(isBlankReferenceTheme(existingTheme)) return true;
	if(WORDNET_SUBJECT_TO_VISIBLE[String(existingTheme || "").toLowerCase()] === customTheme) return true;
	return false;
}

function placementThresholdForTheme(theme){
	return isCatalogSubject(theme) ? 55 : 60;
}

function overrideThresholdForTheme(theme){
	return isCatalogSubject(theme) ? 80 : 95;
}

function planRow(row, reference){
	const definitions = extractDefinitions(row.mean);
	const definitionCount = definitions.length;
	const currentThemes = splitCsv(row.theme);
	const currentCustomThemes = unique(currentThemes.filter(isCustomTheme));
	const nextThemes = buildBaseThemes(row, reference, definitionCount);
	const nextTypes = buildBaseTypes(row, reference, definitionCount);
	const extraThemes = [];
	const reasons = [];
	const hasCustomDefinition = nextTypes.some(isInjeongType);
	let customMoved = false;

	if(!reference) return null;
	if(!definitionCount) return null;

	currentCustomThemes.forEach(function(theme){
		const best = bestDefinitionForTheme(theme, row, definitions, nextTypes);
		if(best.index >= 0 && best.score >= placementThresholdForTheme(theme) && shouldReplaceThemeForCustom(nextThemes[best.index], theme)){
			if(nextThemes[best.index] !== theme){
				nextThemes[best.index] = theme;
				customMoved = true;
				reasons.push("placed " + theme + " on definition " + (best.index + 1));
			}
			return;
		}
		if(best.index >= 0 && best.score >= overrideThresholdForTheme(theme) && isWordNetTheme(nextThemes[best.index]) && nextThemes[best.index] !== theme){
			nextThemes[best.index] = theme;
			customMoved = true;
			reasons.push("overrode definition " + (best.index + 1) + " with " + theme);
			return;
		}
		if(nextThemes.indexOf(theme) === -1){
			if(hasCustomDefinition || !canDropUnplacedTheme(theme)){
				extraThemes.push(theme);
			}else{
				reasons.push("removed unplaced " + theme);
			}
		}
	});

	if(currentCustomThemes.indexOf("530") !== -1){
		definitions.forEach(function(definition, index){
			if(WORDNET_SUBJECT_TO_VISIBLE[String(nextThemes[index] || "").toLowerCase()] !== "530") return;
			if(scoreChemistry(row, definition, nextTypes[index], definitionCount) < 95) return;
			nextThemes[index] = "530";
			customMoved = true;
			reasons.push("placed 530 on definition " + (index + 1));
		});
	}

	const finalThemes = joinCsv(nextThemes.concat(extraThemes.filter(function(theme){
		return nextThemes.indexOf(theme) === -1;
	})));
	const finalTypes = joinCsv(nextTypes);
	const beforeTheme = joinCsv(currentThemes);
	const beforeType = joinCsv(splitCsv(row.type));

	if(reference && joinCsv(splitCsv(reference.theme).slice(0, definitionCount)) !== joinCsv(nextThemes.slice(0, definitionCount))){
		reasons.push("reference sequence plus subject scoring");
	}else if(reference && beforeTheme !== finalThemes){
		reasons.push("reference theme sequence");
	}
	if(customMoved && !reasons.length) reasons.push("custom subject repositioned");
	if(beforeType !== finalTypes) reasons.push("type count aligned");

	if(beforeTheme === finalThemes && beforeType === finalTypes) return null;
	return {
		id: row._id,
		beforeType: beforeType,
		afterType: finalTypes,
		beforeTheme: beforeTheme,
		afterTheme: finalThemes,
		reasons: unique(reasons).join("; "),
		mean: row.mean
	};
}

async function main(){
	const referenceRows = extractReferenceRows();
	const client = new Client({
		host: config.PG_HOST,
		user: config.PG_USER,
		password: String(config.PG_PASSWORD),
		port: config.PG_PORT,
		database: config.PG_DATABASE
	});
	const updates = [];
	const reasonCounts = {};

	await client.connect();
	try{
		const rows = (await client.query(
			"SELECT _id, type, mean, theme FROM kkutu_en ORDER BY _id"
		)).rows;

		rows.forEach(function(row){
			const reference = referenceRows.get(row._id);
			const update = planRow(row, reference);
			if(!update) return;
			updates.push(update);
			(update.reasons || "changed").split("; ").forEach(function(reason){
				reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
			});
		});

		console.log("REFERENCE_ROWS", referenceRows.size);
		console.log("ROWS_SCANNED", rows.length);
		console.log("ROWS_TO_UPDATE", updates.length);
		Object.keys(reasonCounts).sort().forEach(function(reason){
			console.log("REASON", reasonCounts[reason], reason);
		});
		console.log("SAMPLE");
		updates.slice(0, SAMPLE_LIMIT).forEach(function(row){
			console.log(row.id + "\t" + row.beforeTheme + "\t=>\t" + row.afterTheme + "\t" + row.beforeType + "\t=>\t" + row.afterType + "\t" + row.reasons);
		});
		console.log("CHECK_PLAN");
		CHECK_WORDS.forEach(function(word){
			const planned = updates.find(function(row){ return row.id === word; });
			if(planned){
				console.log(planned.id + "\t" + planned.beforeTheme + "\t=>\t" + planned.afterTheme + "\t" + planned.beforeType + "\t=>\t" + planned.afterType + "\t" + planned.reasons);
			}else{
				console.log(word + "\t(no planned change)");
			}
		});

		if(APPLY && updates.length){
			await client.query("BEGIN");
			try{
				for(const row of updates){
					await client.query(
						"UPDATE kkutu_en SET type=$1, theme=$2 WHERE _id=$3",
						[ row.afterType, row.afterTheme, row.id ]
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
			[ CHECK_WORDS ]
		);
		console.log("CHECK");
		check.rows.forEach(function(row){
			console.log(row._id + "\t" + row.type + "\t" + row.theme + "\t" + String(row.mean || "").slice(0, 170));
		});
	}finally{
		await client.end();
	}
}

main().catch(function(error){
	console.error(error);
	process.exit(1);
});
