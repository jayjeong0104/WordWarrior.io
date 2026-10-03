"use strict";

const path = require("path");
const { Client } = require(path.join(process.cwd(), "Server/lib/node_modules/pg"));
const config = require(path.join(process.cwd(), "Server/lib/sub/global.json"));

const SEED_EXTRA = require("./en_subject_seed_extra");
const SEED_MORE = require("./en_subject_seed_more");
const SEED_MASSIVE = require("./en_subject_seed_massive");

const APPLY = process.argv.includes("--apply");

const THEME = {
	ECONOMICS: "30",
	DATA_SCIENCE: "DSCI"
};

function normalizeWord(word){
	return String(word || "")
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

function compactWord(word){
	return normalizeWord(word).replace(/\s+/g, "");
}

function splitThemes(theme){
	return String(theme || "")
		.split(",")
		.map(function(value){ return value.trim(); })
		.filter(Boolean);
}

function joinThemes(themes){
	return Array.from(new Set(themes.filter(Boolean))).join(",");
}

function removeTheme(themes, theme){
	return themes.filter(function(value){ return value !== theme; });
}

function buildExplicitWords(theme){
	const words = new Set();
	function addSource(source){
		(source[theme] || []).forEach(function(entry){
			if(typeof entry === "string") words.add(compactWord(entry));
			else if(entry && entry.word) words.add(compactWord(entry.word));
		});
	}
	addSource(SEED_EXTRA);
	addSource(SEED_MORE);
	addSource(SEED_MASSIVE);
	return words;
}

function hasAny(text, patterns){
	return patterns.some(function(pattern){ return pattern.test(text); });
}

const DATA_SCIENCE_STRONG = [
	/\bdata science\b/,
	/\bdataset(s)?\b/,
	/\bdata set(s)?\b/,
	/\banalytics\b/,
	/\bmachine learning\b/,
	/\bneural network(s)?\b/,
	/\bregression\b/,
	/\bclustering\b/,
	/\bclassification (model|algorithm|task|problem|tree)\b/,
	/\bclassifier(s)?\b/,
	/\bpredictive model(s)?\b/,
	/\bprediction model(s)?\b/,
	/\bstatistical model(s)?\b/,
	/\bmodel training\b/,
	/\btraining data\b/,
	/\bvalidation data\b/,
	/\bdata mining\b/,
	/\btime series\b/,
	/\bbayesian\b/,
	/\bfeature (engineering|vector|selection|space|matrix)\b/,
	/\bdimensionality reduction\b/,
	/\boverfitting\b/,
	/\bunderfitting\b/,
	/\bcross validation\b/,
	/\bcrossvalidation\b/,
	/\bconfusion matrix\b/,
	/\bimputation\b/,
	/\boutlier\b/,
	/\bpipeline\b/
];

const DATA_SCIENCE_FALSE = [
	/\bmodel of (excellence|simple virtue|the heavens|the solar system|an object|something)\b/,
	/\bartist s model\b/,
	/\bphotographer s model\b/,
	/\bposes for\b/,
	/\bstate capitols\b.*\bmodel\b/,
	/\bclassification system(s)?\b/,
	/\bclassified by\b/,
	/\bprediction of (someone s future|the course of a disease|weather|future developments)\b/,
	/\bmake a prediction\b/,
	/\bprophecy\b/,
	/\bhoroscope\b/,
	/\bprognosis\b/,
	/\bforecast\b/,
	/\bfeature film\b/,
	/\bcentral or most important feature\b/,
	/\bdistinctive feature\b/,
	/\bworks feature\b/,
	/\bbe a distinctive feature\b/
];

function dataScienceReason(row, explicitWords){
	const id = compactWord(row._id);
	const text = normalizeWord([ row._id, row.mean ].join(" "));
	if(explicitWords.has(id) || hasAny(text, DATA_SCIENCE_STRONG)) return "";
	if(hasAny(text, DATA_SCIENCE_FALSE)) return "generic data-science false positive";
	if(hasAny(text, [ /\bmodel(s)?\b/, /\bfeature(s)?\b/, /\bclassification\b/, /\bprediction\b/ ])){
		return "broad data-science matcher";
	}
	return "";
}

const ECONOMICS_STRONG = [
	/\beconom(y|ic|ics|ist|ists)\b/,
	/\bmarket(s|place)?\b/,
	/\bfinancial\b/,
	/\bfinance\b/,
	/\bmonetary\b/,
	/\bmoney\b/,
	/\btax(es|ation)?\b/,
	/\binvest(ment|or|ing|ed)?\b/,
	/\bcurrency\b/,
	/\binflation\b/,
	/\bgdp\b/,
	/\brecession\b/,
	/\binterest rate\b/,
	/\bfree trade\b/,
	/\binternational trade\b/,
	/\btrade (deficit|surplus|balance)\b/,
	/\bstock (market|exchange|broker|trading|price|index)\b/,
	/\bcommon stock\b/,
	/\bpreferred stock\b/,
	/\bshareholder(s)?\b/,
	/\bsecurities\b/,
	/\bbond (market|trading|issue|rating|certificate)\b/,
	/\bbearer bond\b/,
	/\btreasury bond\b/,
	/\bgovernment bond\b/,
	/\bmunicipal bond\b/,
	/\bbank(ing|er|ers|s)?\b/,
	/\bprice(s|d)?\b/
];

const ECONOMICS_FALSE = [
	/\btrade name(s)?\b/,
	/\btrademark\b/,
	/\bmeat stock\b/,
	/\bfish stock\b/,
	/\bbeef stock\b/,
	/\bchicken stock\b/,
	/\bsoup stock\b/,
	/\bvegetable stock\b/,
	/\bstock made with\b/,
	/\bmeat or fish stock\b/,
	/\blivestock\b/,
	/\blive stock\b/,
	/\bchemical bond\b/,
	/\bcovalent bond\b/,
	/\bionic bond\b/,
	/\blinking atoms\b/,
	/\batoms\b.*\bbond\b/,
	/\bwest bank\b/,
	/\briver bank\b/
];

function economicsReason(row, explicitWords){
	const id = compactWord(row._id);
	const text = normalizeWord([ row._id, row.mean ].join(" "));
	if(explicitWords.has(id)) return "";
	if(!hasAny(text, ECONOMICS_FALSE)) return "";
	if(hasAny(text, ECONOMICS_STRONG) && !hasAny(text, [
		/\btrade name(s)?\b/,
		/\bchemical bond\b/,
		/\bcovalent bond\b/,
		/\bionic bond\b/,
		/\bwest bank\b/,
		/\briver bank\b/
	])) return "";
	return "economics false positive";
}

async function main(){
	const explicit = {};
	explicit[THEME.DATA_SCIENCE] = buildExplicitWords(THEME.DATA_SCIENCE);
	explicit[THEME.ECONOMICS] = buildExplicitWords(THEME.ECONOMICS);

	const client = new Client({
		host: config.PG_HOST,
		user: config.PG_USER,
		password: String(config.PG_PASSWORD),
		port: config.PG_PORT,
		database: config.PG_DATABASE
	});
	await client.connect();
	try{
		const rows = (await client.query(
			"SELECT _id, type, mean, theme FROM kkutu_en WHERE theme IS NOT NULL AND theme <> '' ORDER BY _id"
		)).rows;
		const updates = [];
		const counts = {};
		rows.forEach(function(row){
			let themes = splitThemes(row.theme);
			const before = joinThemes(themes);
			const reasons = [];
			if(themes.includes(THEME.DATA_SCIENCE)){
				const reason = dataScienceReason(row, explicit[THEME.DATA_SCIENCE]);
				if(reason){
					themes = removeTheme(themes, THEME.DATA_SCIENCE);
					reasons.push(THEME.DATA_SCIENCE + ": " + reason);
					counts[THEME.DATA_SCIENCE] = (counts[THEME.DATA_SCIENCE] || 0) + 1;
				}
			}
			if(themes.includes(THEME.ECONOMICS)){
				const reason = economicsReason(row, explicit[THEME.ECONOMICS]);
				if(reason){
					themes = removeTheme(themes, THEME.ECONOMICS);
					reasons.push(THEME.ECONOMICS + ": " + reason);
					counts[THEME.ECONOMICS] = (counts[THEME.ECONOMICS] || 0) + 1;
				}
			}
			const after = joinThemes(themes);
			if(before !== after){
				updates.push({
					_id: row._id,
					before: before,
					after: after,
					reasons: reasons.join("; "),
					mean: row.mean
				});
			}
		});

		console.log("ROWS_TO_UPDATE", updates.length);
		Object.keys(counts).sort().forEach(function(theme){
			console.log("REMOVE", theme, counts[theme]);
		});
		console.log("SAMPLE");
		updates.slice(0, 160).forEach(function(row){
			console.log(row._id + "\t" + row.before + "\t=>\t" + row.after + "\t" + row.reasons + "\t" + String(row.mean || "").slice(0, 130));
		});

		if(APPLY){
			await client.query("BEGIN");
			try{
				for(const row of updates){
					await client.query("UPDATE kkutu_en SET theme=$1 WHERE _id=$2", [ row.after, row._id ]);
				}
				await client.query("COMMIT");
				console.log("APPLIED", updates.length);
			}catch(error){
				await client.query("ROLLBACK");
				throw error;
			}
		}

		const check = await client.query(
			"SELECT _id, theme, mean FROM kkutu_en WHERE _id = ANY($1::text[]) ORDER BY _id",
			[ [
				"artist's model",
				"confusion matrix",
				"data leakage",
				"medical prognosis",
				"acrylan",
				"actifed",
				"chemical bond",
				"stock market"
			] ]
		);
		console.log("CHECK");
		check.rows.forEach(function(row){
			console.log(row._id + "\t" + row.theme + "\t" + String(row.mean || "").slice(0, 140));
		});
	}finally{
		await client.end();
	}
}

main().catch(function(error){
	console.error(error);
	process.exit(1);
});
