"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const resolve = relativePath => path.join(root, relativePath);
const read = relativePath => fs.readFileSync(resolve(relativePath), "utf8");

const combinedGameplayScripts = [
	"Server/lib/Web/public/js/in_game_kkutu.js",
	"Server/lib/Web/public/js/in_game_kkutu.min.js",
	"Server/lib/Web/lib/in_game_kkutu.js"
];
const pushDisplayScripts = [
	...combinedGameplayScripts,
	"Server/lib/Web/lib/kkutu/body.js"
];
const betaRuleScripts = [
	...combinedGameplayScripts,
	"Server/lib/Web/lib/kkutu/rule_classic.js"
];
const gameplayScripts = Array.from(new Set([...pushDisplayScripts, ...betaRuleScripts]));

const betaEffectStylesheet = "Server/lib/Web/public/css/beta_longword.css";

function pushDisplayBlock(source, relativePath){
	const start = source.indexOf("function pushDisplay(");
	const end = source.indexOf("function pushHint(", start);

	assert.notStrictEqual(start, -1, `${relativePath}: pushDisplay() is missing`);
	assert.notStrictEqual(end, -1, `${relativePath}: pushDisplay() boundary is missing`);
	return source.slice(start, end);
}

function betaHelperBlock(source, relativePath){
	const startMatch = /\b(?:var|const)\s+BETA_LONG_WORD_DISPLAY_MIN_LENGTH\s*=/.exec(source);
	const end = source.indexOf("$lib.Classic.roundReady", startMatch ? startMatch.index : 0);

	assert.ok(startMatch, `${relativePath}: beta long-word constants are missing`);
	assert.notStrictEqual(end, -1, `${relativePath}: beta helper boundary is missing`);
	return source.slice(startMatch.index, end);
}

function namedFunctionBlock(source, name, relativePath){
	const start = source.indexOf(`function ${name}(`);
	const nextFunction = source.indexOf("\nfunction ", start + 1);
	const classicBoundary = source.indexOf("\n$lib.Classic.roundReady", start + 1);
	const candidates = [nextFunction, classicBoundary].filter(index => index !== -1);
	const end = candidates.length ? Math.min(...candidates) : -1;

	assert.notStrictEqual(start, -1, `${relativePath}: ${name}() is missing`);
	assert.notStrictEqual(end, -1, `${relativePath}: ${name}() boundary is missing`);
	return source.slice(start, end);
}

const forbiddenUnsafeIdentifiers = [
	"setPlainDisplayHtml",
	"display-long-text",
	"beta-longword-typed-text",
	"beta-vfx-core",
	"beta-vfx-kicker",
	"beta-vfx-word",
	"beta-vfx-score"
];

const rejectedKeyframePattern = /@(?:-webkit-)?keyframes\s+(?:BetaVfx(?:Core|Kicker|Word|Score)|beta-vfx-(?:core|kicker|word|score)[^\s{]*)/i;

const pushDisplayCopies = pushDisplayScripts.map(relativePath => {
	const source = read(relativePath);
	const block = pushDisplayBlock(source, relativePath);
	const directWrites = block.match(/\$stage\.game\.display\.html\(j\);/g) || [];

	assert.strictEqual(
		directWrites.length,
		2,
		`${relativePath}: both forward and reverse typing paths must write directly to the main display`
	);
	assert.match(block, /BEAT\[len\s*=\s*safeText\.length\]/);
	assert.match(block, /var tick\s*=\s*\$data\.turnTime\s*\/\s*96/);
	assert.match(block, /var sg\s*=\s*\$data\.turnTime\s*\/\s*12/);
	assert.match(block, /var\s+beatStartTop\s*=\s*isBetaTestMode\(\)\s*\?\s*0\s*:\s*-6\s*;/);
	assert.match(block, /'margin-top'\s*:\s*beatStartTop/);
	assert.match(block, /\.show\(\)\.animate\(anim,\s*100\)/);
	assert.match(block, /Number\(i\)\s*\*\s*sg\s*\/\s*len/);
	assert.match(block, /for\(i\s*=\s*0;\s*i\s*<\s*3;\s*i\+\+\)/);
	assert.match(block, /\(beat\s*\?\s*\$stage\.game\.display\.children\("\.display-text"\)\s*:\s*\$stage\.game\.display\)/);
	assert.match(block, /\.css\('font-size',\s*21\)\s*\.animate\(\{\s*'font-size'\s*:\s*20\s*\},\s*tick\)/);
	assert.match(block, /RULE\[mode\]\.lang\s*==\s*"en"\s*&&\s*len\s*<\s*10/);
	assert.match(
		block,
		/syncBetaLongWordDisplayState\(safeText\);/,
		`${relativePath}: pushDisplay() must synchronize the additive beta styling without wrapping the text`
	);

	return block.replace(/\r\n/g, "\n");
});

pushDisplayCopies.slice(1).forEach((block, index) => {
	assert.strictEqual(
		block,
		pushDisplayCopies[0],
		`${pushDisplayScripts[index + 1]}: pushDisplay() is out of sync with the served desktop copy`
	);
});

const betaHelperCopies = betaRuleScripts.map(relativePath => {
	const source = read(relativePath);
	const helpers = betaHelperBlock(source, relativePath);
	const betaGate = namedFunctionBlock(source, "isBetaTestMode", relativePath);
	const syncDisplay = namedFunctionBlock(source, "syncBetaLongWordDisplayState", relativePath);
	const playVfx = namedFunctionBlock(source, "playBetaLongWordVfx", relativePath);

	assert.match(helpers, /\b(?:var|const)\s+BETA_LONG_WORD_DISPLAY_MIN_LENGTH\s*=\s*13\s*;/);
	assert.match(helpers, /\b(?:var|const)\s+BETA_LONG_WORD_VFX_MIN_LENGTH\s*=\s*14\s*;/);
	assert.match(helpers, /\b(?:var|const)\s+BETA_LONG_WORD_LIGHT_MIN_LENGTH\s*=\s*18\s*;/);
	[
		"setBetaLongWordCssVariable",
		"clearBetaLongWordDisplayState",
		"syncBetaLongWordDisplayState",
		"playBetaLongWordVfx"
	].forEach(name => {
		assert.match(helpers, new RegExp(`function\\s+${name}\\s*\\(`), `${relativePath}: ${name}() must be part of the synchronized beta helper block`);
	});
	assert.match(betaGate, /MODE\s*&&\s*MODE\[\$data\.room\.mode\]\s*==\s*["']EBT["']/);
	assert.match(syncDisplay, /isBetaTestMode\(\)/);
	assert.match(syncDisplay, /BETA_LONG_WORD_DISPLAY_MIN_LENGTH/);
	assert.match(playVfx, /!isBetaTestMode\(\)/);
	assert.match(playVfx, /BETA_LONG_WORD_VFX_MIN_LENGTH/);
	assert.match(playVfx, /BETA_LONG_WORD_LIGHT_MIN_LENGTH/);
	[syncDisplay, playVfx].forEach(effectBlock => {
		assert.doesNotMatch(
			effectBlock,
			/\$display\s*\.\s*(?:html|text|empty|append|prepend|replaceWith)\s*\(/,
			`${relativePath}: additive beta effects must never replace or wrap the authoritative main-word text`
		);
	});
	assert.ok(
		(source.match(/\bclearBetaLongWordDisplayState\s*\(/g) || []).length > 1,
		`${relativePath}: clearBetaLongWordDisplayState() must be invoked outside its declaration`
	);
	assert.ok(
		(source.match(/\bplayBetaLongWordVfx\s*\(/g) || []).length > 1,
		`${relativePath}: playBetaLongWordVfx() must be invoked from gameplay flow`
	);
	assert.match(
		source,
		/pushDisplay\(data\.value,\s*data\.mean,\s*data\.theme,\s*data\.wc\);[\s\S]{0,240}?playBetaLongWordVfx\(data\.value(?:,\s*data\.score)?\);/,
		`${relativePath}: successful Classic turns must launch the beta effect without replacing pushDisplay()`
	);

	return helpers.replace(/\r\n/g, "\n");
});

betaHelperCopies.slice(1).forEach((block, index) => {
	assert.strictEqual(
		block,
		betaHelperCopies[0],
		`${betaRuleScripts[index + 1]}: beta long-word helpers are out of sync with the served desktop copy`
	);
});

gameplayScripts.forEach(relativePath => {
	const source = read(relativePath);
	forbiddenUnsafeIdentifiers.forEach(identifier => {
		assert.ok(!source.includes(identifier), `${relativePath}: unsafe/rejected identifier remains: ${identifier}`);
	});
	assert.doesNotMatch(source, rejectedKeyframePattern);
});

const splitGameplaySources = fs.readdirSync(resolve("Server/lib/Web/lib/kkutu"))
	.filter(fileName => fileName.endsWith(".js"))
	.map(fileName => `Server/lib/Web/lib/kkutu/${fileName}`);

[
	...splitGameplaySources,
	"Server/lib/Web/public/css/in_kkutu.css",
	"Server/lib/Web/public/css/in_m_kkutu.css",
	"Server/lib/Web/public/css/in_game_kkutu.css",
	"Server/lib/Web/public/css/in_m_game_kkutu.css"
].forEach(relativePath => {
	const source = read(relativePath);
	forbiddenUnsafeIdentifiers.forEach(identifier => {
		assert.ok(!source.includes(identifier), `${relativePath}: unsafe/rejected identifier remains: ${identifier}`);
	});
	assert.doesNotMatch(source, rejectedKeyframePattern);
});

[
	"Server/lib/Web/views/kkutu.pug",
	"Server/lib/Web/views/m_kkutu.pug"
].forEach(relativePath => {
	const view = read(relativePath);
	assert.match(
		view,
		/link\(rel=['"]stylesheet['"],\s*href=['"]\/css\/beta_longword\.css\?v=[^'"]+['"]\)/,
		`${relativePath}: beta_longword.css must be linked with a cache key`
	);
	assert.match(
		view,
		/in_game_kkutu(?:\.min)?\.js\?v=[^'"\s]*main-word-original\d*/,
		`${relativePath}: gameplay script cache key must identify the restored main-word renderer`
	);
});

assert.ok(fs.existsSync(resolve(betaEffectStylesheet)), "beta_longword.css must be shipped");

const betaCss = read(betaEffectStylesheet);
assert.match(betaCss, /body\.in-game\.beta-test-mode/);
assert.match(betaCss, /\.beta-longword-vfx/);
assert.match(betaCss, /\.beta-vfx-particle/);
assert.match(betaCss, /\.beta-longword-style/);
assert.match(betaCss, /\.beta-longword-active/);
forbiddenUnsafeIdentifiers.forEach(identifier => {
	assert.ok(!betaCss.includes(identifier), `${betaEffectStylesheet}: unsafe/rejected identifier remains: ${identifier}`);
});
assert.doesNotMatch(betaCss, rejectedKeyframePattern);

const desktopCss = read("Server/lib/Web/public/css/in_kkutu.css");
const gameplayDisplayRules = Array.from(
	desktopCss.matchAll(/body\.in-game\s+\.jjo-display\s*\{([^}]*)\}/g),
	match => match[1]
);

assert.ok(gameplayDisplayRules.length, "in_kkutu.css: body.in-game .jjo-display rule is missing");
assert.ok(
	gameplayDisplayRules.some(rule => /font-size\s*:\s*20px\s*;/.test(rule)),
	"in_kkutu.css: main word display must have a 20px resting size"
);
gameplayDisplayRules.forEach(rule => {
	assert.doesNotMatch(
		rule,
		/font-size\s*:[^;}]*!important/i,
		"in_kkutu.css: !important font-size blocks the original 21px to 20px pulse"
	);
});

console.log("main word rendering regression checks passed");
