"use strict";

// Load the real maintenance planners with mocked PostgreSQL and configuration.
// Queries below run only against an in-memory adapter; no database is contacted.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ROOT = path.resolve(__dirname, "..");
const clone = value => JSON.parse(JSON.stringify(value));
let passed = 0;

function loadTool(name, options) {
	options = options || {};
	const filename = path.join(ROOT, "tools", name);
	let databaseCalls = 0;
	const failDatabase = () => { databaseCalls++; throw new Error("Unexpected database access"); };
	const connectClient = () => {
		databaseCalls++;
		if(!options.client) throw new Error("Unexpected database access");
		return options.client;
	};
	const context = {
		module: { exports: {} },
		console: { log() {}, error: console.error },
		process: { argv: options.argv || [], cwd: () => ROOT, exit: failDatabase },
		require(dependency) {
			if(dependency === "path") return path;
			if(dependency.replace(/\\/g, "/").endsWith("/Server/lib/node_modules/pg")) {
				return {
					Pool: class { connect() { return connectClient(); } query() { return failDatabase(); } async end() {} },
					Client: class {
						async connect() { this.client = connectClient(); }
						query(sql, values) { return this.client.query(sql, values); }
						async end() {}
					}
				};
			}
			if(dependency.replace(/\\/g, "/").endsWith("/Server/lib/sub/global.json")) return {};
			if([ "./en_subject_seed_extra", "./en_subject_seed_more", "./en_subject_seed_massive", "./subject_target_data", "./game_subject_seed_mega" ].includes(dependency)) {
				const dataFilename = path.join(path.dirname(filename), dependency + ".js");
				const data = { module: { exports: {} } };
				vm.runInNewContext(fs.readFileSync(dataFilename, "utf8"), data, { filename: dataFilename });
				return data.module.exports;
			}
			throw new Error("Unexpected dependency: " + dependency);
		}
	};
	vm.runInNewContext(fs.readFileSync(filename, "utf8"), context, { filename });
	assert.strictEqual(databaseCalls, 0, name + " must not run main when imported");
	return { api: context.module.exports, context };
}

function themes(value) {
	return new Set(String(value || "").split(",").map(item => item.trim()).filter(Boolean));
}

function rowMap(rows) {
	return new Map(rows.map(row => [ row._id, clone(row) ]));
}

function inMemoryClient(rows) {
	return {
		release() {},
		async query(sql, values) {
			if([ "BEGIN", "COMMIT", "ROLLBACK" ].includes(sql)) return { rows: [], rowCount: 0 };
			if(sql.startsWith("SELECT _id, ")) {
				const keys = sql.match(/^SELECT (.+?) FROM kkutu_en/)[1].split(", ");
				const selected = Array.from(rows.values()).filter(row => !sql.includes("ANY($1") || values[0].includes(row._id));
				return { rows: selected.map(row => Object.fromEntries(keys.map(key => [ key, row[key] ]))) };
			}
			if(sql.startsWith("SELECT COUNT(*)::int AS count FROM kkutu_en")) {
				return { rows: [ { count: Array.from(rows.values()).filter(row => !values || themes(row.theme).has(values[0])).length } ] };
			}
			if(sql === "UPDATE kkutu_en SET theme = $2 WHERE _id = $1") {
				if(!rows.has(values[0])) return { rowCount: 0 };
				rows.get(values[0]).theme = values[1];
				return { rowCount: 1 };
			}
			if(sql.startsWith("INSERT INTO kkutu_en (")) {
				assert(!rows.has(values[0]), "duplicate insert: " + values[0]);
				const keys = sql.match(/^INSERT INTO kkutu_en \((.+?)\)/)[1].split(", ");
				rows.set(values[0], Object.assign({ hit: 0 }, Object.fromEntries(keys.map((key, index) => [ key, values[index] ]))));
				return { rowCount: 1 };
			}
			if(sql.startsWith("DELETE FROM kkutu_en WHERE _id = ")) {
				const ids = sql.includes("ANY($1") ? values[0] : [ values[0] ];
				let count = 0;
				for(const id of ids) if(rows.delete(id)) count++;
				return { rowCount: count };
			}
			throw new Error("Unexpected in-memory query: " + sql);
		}
	};
}

async function seedScenario(label, tool, initialRows) {
	const original = rowMap(initialRows);
	const planned = rowMap(initialRows);
	const persisted = rowMap(initialRows);
	const plan = tool.api.planSeedOperations(planned);
	const client = inMemoryClient(persisted);
	// Match the migration's actual UPDATE-before-INSERT apply order.
	await tool.context.applyThemeUpdates(client, plan.updates);
	await tool.context.applyInserts(client, plan.inserts);

	const expected = new Map();
	for(const row of initialRows) expected.set(row._id, themes(row.theme));
	for(const seed of tool.api.allSeedEntries()) {
		if(!expected.has(seed.word)) expected.set(seed.word, new Set());
		for(const theme of seed.themeList) expected.get(seed.word).add(theme);
	}
	assert.strictEqual(persisted.size, expected.size, label + ": row count");
	for(const [ id, memberships ] of expected) {
		assert.deepStrictEqual(Array.from(themes(persisted.get(id).theme)).sort(), Array.from(memberships).sort(), label + ": all seed themes for " + id);
		assert.strictEqual(persisted.get(id).theme, planned.get(id).theme, label + ": plan matches persisted theme for " + id);
	}
	for(const [ id, row ] of original) {
		for(const key of [ "type", "mean", "flag", "hit" ]) {
			assert.strictEqual(persisted.get(id)[key], row[key], label + ": preserve existing " + key + " for " + id);
		}
	}
	assert(themes(persisted.get("carrier").theme).has("100"), label + ": carrier military theme");
	assert(themes(persisted.get("carrier").theme).has("STA"), label + ": carrier StarCraft theme");
	passed++;
	return { persisted, plan };
}

async function seedTests() {
	const tool = loadTool("migrate_en_subjects.js");
	const fresh = await seedScenario("fresh database", tool, []);
	assert.strictEqual(fresh.plan.updates.length, 0, "fresh seeds must not update pending inserts");
	assert.strictEqual(fresh.plan.inserts.length, new Set(tool.api.allSeedEntries().map(seed => seed.word)).size);
	const rerun = await seedScenario("repeat migration", tool, Array.from(fresh.persisted.values()));
	assert.strictEqual(rerun.plan.inserts.length, 0, "rerun inserts nothing");
	assert.strictEqual(rerun.plan.updates.length, 0, "rerun updates nothing");

	const words = Array.from(new Set(tool.api.allSeedEntries().map(seed => seed.word)));
	const existing = words.filter((word, index) => index % 3 === 0 || word === "carrier").map((word, index) => ({
		_id: word, type: "existing-type", mean: "Retained definition " + index, theme: "existing-theme", flag: 5, hit: index + 1
	}));
	existing.push({ _id: "unrelated existing word", type: "n", mean: "Unrelated definition", theme: "legacy", flag: 0, hit: 99 });
	const mixed = await seedScenario("mixed database", tool, existing);
	assert(mixed.plan.inserts.length > 0 && mixed.plan.updates.length > 0, "mixed case exercises inserts and updates");
	const mixedRerun = await seedScenario("repeat mixed migration", tool, Array.from(mixed.persisted.values()));
	assert.strictEqual(mixedRerun.plan.inserts.length, 0);
	assert.strictEqual(mixedRerun.plan.updates.length, 0);
}

function alignmentTests() {
	const tool = loadTool("fix_dictionary_subject_alignment.js");
	const rows = [
		{ _id: "creeper", type: "n", mean: "A person who creeps.", theme: "legacy", flag: 0, hit: 4 },
		{ _id: "Creeper", type: "INJEONG", mean: "", theme: "MINC,STA", flag: 2, hit: 9 },
		{ _id: "CREEPER", type: "INJEONG", mean: "＂1＂［1］（1）", theme: "APEX,MINC", flag: 2, hit: 3 }
	];
	const originalTarget = clone(rows[0]);
	const plan = tool.api.planCaseDuplicateMerges(rows, tool.api.buildExactMap(rows));
	assert.deepStrictEqual(clone(plan.deletes), [ "Creeper", "CREEPER" ]);
	assert.deepStrictEqual(Array.from(themes(rows[0].theme)).sort(), [ "APEX", "MINC", "STA", "legacy" ]);
	assert.strictEqual(plan.updates[plan.updates.length - 1].theme, rows[0].theme, "final update preserves all duplicate themes");
	for(const key of [ "type", "mean", "flag", "hit" ]) assert.strictEqual(rows[0][key], originalTarget[key], "empty-definition source preserves existing " + key);
	passed++;

	const definitions = [
		{ _id: "python", type: "n", mean: "＂1＂［1］（1）A large snake.", theme: "legacy" },
		{ _id: "Python", type: "n", mean: "＂1＂［1］（1）A programming language.", theme: "490" }
	];
	const definedPlan = tool.api.planCaseDuplicateMerges(definitions, tool.api.buildExactMap(definitions));
	assert(definitions[0].mean.includes("A large snake.") && definitions[0].mean.includes("A programming language."), "defined source still appends distinct meaning");
	assert(themes(definitions[0].theme).has("490"));
	assert.deepStrictEqual(clone(definedPlan.deletes), [ "Python" ]);
	passed++;
}

async function dvaTests() {
	const canonical = { _id: "d.va", type: "INJEONG", mean: "D.Va is an Overwatch hero.", theme: "OVW", flag: 2, hit: 40 };
	const rows = rowMap([ canonical ]);
	const tool = loadTool("fix_dva_period.js", { client: inMemoryClient(rows) });
	await tool.api.main();
	assert.deepStrictEqual(rows.get("d.va"), canonical, "already-canonical D.Va keeps usage and metadata");
	await tool.api.main();
	assert.deepStrictEqual(rows.get("d.va"), canonical, "D.Va rerun still keeps hit 40");
	passed++;

	const preferred = { _id: "d va", type: "n", mean: "Preferred alias definition.", theme: "OVW,legacy", flag: 2, hit: 17 };
	const aliases = rowMap([ preferred, canonical, { _id: "dva", type: "n", mean: "Other alias.", theme: "legacy", flag: 0, hit: 81 } ]);
	await loadTool("fix_dva_period.js", { client: inMemoryClient(aliases) }).api.main();
	assert.strictEqual(aliases.size, 1);
	assert.deepStrictEqual(aliases.get("d.va"), Object.assign({}, preferred, { _id: "d.va" }), "preserve existing source precedence and selected alias hit");
	passed++;
}

async function expansionTests() {
	const unrelated = { _id: "unrelated entry", type: "n", mean: "Unrelated definition.", theme: "legacy", flag: 0, hit: 23 };
	const rows = rowMap([
		{ _id: "fl", type: "n", mean: "Fl is a sovereign country.", theme: "1001,e15", flag: 0, hit: 12 },
		{ _id: "fr", type: "n", mean: "Fr is a sovereign country.", theme: "1001,e15", flag: 0, hit: 6 },
		unrelated
	]);
	const tool = loadTool("expand_subject_targets.js", { client: inMemoryClient(rows), argv: [ "--apply" ] });
	await tool.api.main();
	const fl = rows.get("fl");
	assert(fl, "real POK seed must be inserted after deletion of the unrelated bogus country row");
	assert.strictEqual(fl.theme, "POK", "new seed must not inherit deleted country metadata");
	assert.strictEqual(fl.type, "INJEONG");
	assert.strictEqual(fl.mean, "");
	assert.strictEqual(fl.flag, 2);
	assert.strictEqual(fl.hit, 0);
	assert(!rows.has("fr"), "country row with no replacement seed remains deleted");
	assert.deepStrictEqual(rows.get(unrelated._id), unrelated);
	passed++;
}

(async function main() {
	await seedTests();
	alignmentTests();
	await dvaTests();
	await expansionTests();
	console.log("Maintenance regressions passed: " + passed + " scenarios (no database access)");
})().catch(error => {
	console.error(error);
	process.exitCode = 1;
});
