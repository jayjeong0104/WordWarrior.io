"use strict";

// Execute the actual web entry point with isolated dependencies. Never load
// private configuration, connect to a database, or start a real server.
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const filename = path.resolve(__dirname, "../Server/lib/Web/main.js");
const source = fs.readFileSync(filename, "utf8");

function initialize(settings){
	const requested = [];
	const stop = new Error("Isolated session construction reached");
	let sessionOptions;
	const app = { set(){}, use(){} };
	const express = function(){ return app; };
	express.static = function(){ return function(){}; };
	const session = function(options){ sessionOptions = options; throw stop; };
	const mocks = {
		"../sub/global.json": settings,
		"ws": {}, "express": express, "express-session": session,
		"connect-redis": function(){ return function(){}; }, "redis": {},
		"body-parser": { urlencoded(){ return function(){}; } }, "dddos": {},
		"./db": {}, "../sub/jjlog": { info(){} }, "../sub/webinit": { page(){} },
		"../sub/secure": {}, "passport": {}, "../const": {}, "https": {}, "fs": {},
		"./lang/ko_KR.json": {}, "./lang/en_US.json": {}, "../sub/checkpub": {}
	};
	const context = {
		__dirname: path.dirname(filename),
		require(name){
			requested.push(name);
			if(!Object.prototype.hasOwnProperty.call(mocks, name)) throw new Error("Unexpected dependency: " + name);
			return mocks[name];
		}
	};
	let error;
	try { vm.runInNewContext(source, context, { filename }); }
	catch(caught){ error = caught; }
	return { error, stop, sessionOptions, requested };
}

const configured = "isolated-fixture-signing-value";
const valid = initialize({ SESSION_SECRET: configured });
assert.strictEqual(valid.error, valid.stop, "configured startup reaches express-session");
assert.strictEqual(valid.sessionOptions.secret, configured, "express-session receives the exact private signing value");
assert.strictEqual(valid.sessionOptions.resave, false);
assert.strictEqual(valid.sessionOptions.saveUninitialized, true);

const spaces = initialize({ SESSION_SECRET: " " + configured + " " });
assert.strictEqual(spaces.error, spaces.stop);
assert.strictEqual(spaces.sessionOptions.secret, " " + configured + " ", "validation preserves existing signing bytes");

for(const invalid of [undefined, null, "", " \t\n", 123, false, {}, []]){
	const settings = invalid === undefined ? {} : { SESSION_SECRET: invalid };
	const result = initialize(settings);
	assert.ok(result.error && /non-empty SESSION_SECRET.*global\.json/.test(result.error.message), "invalid configuration has a clear required-key error");
	assert.strictEqual(result.sessionOptions, undefined, "missing configuration never selects a shared fallback");
	assert.deepStrictEqual(result.requested, ["../sub/global.json"], "configuration fails before service dependencies load");
}

console.log("Session configuration checks passed (actual source, exact configured value, missing/invalid rejection, no fallback or services).");
