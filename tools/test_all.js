"use strict";

// Isolated regressions use actual source with mocked services; never start servers or migrations.
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const Module = require("module");
const { spawnSync } = require("child_process");
const root = path.resolve(__dirname, "..");
let parsed = 0;
function checkSyntax(directory) {
	for(const entry of fs.readdirSync(directory, { withFileTypes: true })) {
		if(entry.name === "node_modules" || entry.name === ".git") continue;
		const file = path.join(directory, entry.name);
		if(entry.isDirectory()) checkSyntax(file);
		else if(entry.name.endsWith(".js")) {
			const source = fs.readFileSync(file, "utf8");
			new vm.Script(Module.wrap(source), { filename: file });
			parsed++;
		}
	}
}
checkSyntax(path.join(root, "Server"));
checkSyntax(path.join(root, "tools"));
console.log("Syntax checked " + parsed + " JavaScript files.");

const checks = [
	["test_session_configuration.js"],
	["test_web_regressions.js"],
	["test_core_regressions.js"],
	["test_handoff_regressions.js"],
	["test_game_rules_regressions.js"],
	["test_client_regressions.js"],
	["test_main_word_rendering.js"],
	["test_maintenance_regressions.js"],
	["build_client.js", "--check"]
];
for(const [script, ...args] of checks) {
	const result = spawnSync(process.execPath, [path.join(__dirname, script), ...args], {
		cwd: root, encoding: "utf8"
	});
	if(result.stdout) process.stdout.write(result.stdout);
	if(result.stderr) process.stderr.write(result.stderr);
	if(result.error) throw result.error;
	if(result.status !== 0) process.exit(result.status || 1);
}
console.log("All isolated regressions and client build checks passed.");
