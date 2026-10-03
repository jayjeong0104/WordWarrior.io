"use strict";

// Offline screenshot/demo harness. It renders the real desktop Pug template and
// serves local files only; it never loads application servers or database code.
// From the repository root:
//   Get-Content -Raw -LiteralPath tools/demo_game_server.js | node --preserve-symlinks
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const http = require("http");
const ROOT = process.cwd();
const PUBLIC = path.join(ROOT, "Server/lib/Web/public");
const VIEWS = path.join(ROOT, "Server/lib/Web/views");
const PORT = Number(process.env.GAME_DEMO_PORT) || 4174;
const pugPath = [ "Server/lib/node_modules/pug", "Server/node_modules/pug", "node_modules/pug" ]
	.map(relative => path.join(ROOT, relative)).find(candidate => fs.existsSync(path.join(candidate, "package.json")));
if(!pugPath) throw new Error("Pug dependency missing. Install the repository's declared Server/lib dependencies before starting the demo.");
const pug = require(pugPath);
function getLanguage(){
	return JSON.parse(fs.readFileSync(path.join(ROOT, "Server/lib/Web/lang/en_US.json"), "utf8").replace(/^\uFEFF/, ""));
}
const acornModule = { exports: {} };
const acornPath = [
	"Server/lib/node_modules/acorn-globals/node_modules/acorn/dist/acorn.js",
	"Server/lib/node_modules/acorn/dist/acorn.js",
	"Server/node_modules/acorn/dist/acorn.js",
	"node_modules/acorn/dist/acorn.js"
].map(relative => path.join(ROOT, relative)).find(candidate => fs.existsSync(candidate));
if(!acornPath) throw new Error("Acorn dependency missing. Install the repository's declared Server/lib dependencies before starting the demo.");
vm.runInNewContext(fs.readFileSync(acornPath, "utf8"), { exports: acornModule.exports, module: acornModule });
const acorn = acornModule.exports;
const ecmaVersion = Number(String(acorn.version).split(".")[0]) < 6 ? 6 : 2020;
const constantSource = fs.readFileSync(path.join(ROOT, "Server/lib/const.js"), "utf8");
const requiredConstants = new Set([ "OPTIONS", "MOREMI_PART", "CATEGORIES", "AVAIL_EQUIP", "GROUPS", "RULE", "KO_INJEONG", "EN_INJEONG", "KO_THEME", "EN_THEME", "IJP_EXCEPT" ]);
const constantsContext = { exports: {} };
const constantStatements = acorn.parse(constantSource, { ecmaVersion }).body.filter(node => {
	const expression = node.type === "ExpressionStatement" && node.expression;
	const left = expression && expression.type === "AssignmentExpression" && expression.left;
	return left && left.type === "MemberExpression" && left.object.name === "exports" && requiredConstants.has(left.property.name);
});
vm.runInNewContext(constantStatements.map(node => constantSource.slice(node.start, node.end)).join("\n"), constantsContext);
const constants = constantsContext.exports;
constants.MODE = Object.keys(constants.RULE);

// VM-loading our own small fixture modules avoids Node realpath permission issues
// in restricted Windows environments. Local modules still use builtin requires.
const localModules = new Map();
function loadDemoModule(filename){
	filename = path.resolve(filename);
	if(localModules.has(filename)) return localModules.get(filename).exports;
	const localModule = { exports: {} };
	localModules.set(filename, localModule);
	const source = fs.readFileSync(filename, "utf8");
	const localRequire = name => name.startsWith(".") ? loadDemoModule(path.resolve(path.dirname(filename), name.endsWith(".js") ? name : name + ".js")) : require(name);
	const wrapper = vm.runInThisContext("(function(require,module,exports,__dirname,__filename){\n" + source + "\n})", { filename });
	wrapper(localRequire, localModule, localModule.exports, path.dirname(filename), filename);
	return localModule.exports;
}
function getDemo(){
	localModules.clear();
	const fixtureAssets = loadDemoModule(path.join(ROOT, "tools/demo_game_fixture.js"));
	const client = loadDemoModule(path.join(ROOT, "tools/demo_game_client.js"));
	const fixture = client.createFixture ? client.createFixture({ rules: constants.RULE, fixtureAssets }) : fixtureAssets.buildFixture();
	return { fixtureAssets, fixture, client };
}

function renderPage(url){
	const language = getLanguage();
	const demo = getDemo();
	const fixture = demo.fixture;
	const users = fixture.users || {};
	const ownId = fixture.id || fixture.userId || "demo-you";
	const user = users[ownId] || Object.values(users)[0] || {};
	const profile = Object.assign({ id: ownId, title: "Wordsmith", name: "Wordsmith", image: "/img/kkutu/moremi/body_fla.png" }, fixture.profile || user.profile || {});
	// Fictional local session values, never a real server/session identifier.
	profile.image = typeof profile.image === "string" && profile.image.startsWith("/") ? profile.image : "/img/kkutu/moremi/body_fla.png";
	const locals = Object.assign({}, constants, {
		locale: Object.assign({}, language.GLOBAL, language.kkutu), lang: "en_US", page: "kkutu",
		session: { profile, guest: false, admin: false }, data: { _id: profile.id },
		published: false, mobile: false, as_pc: false, PROTOCOL: "ws", HOST: "127.0.0.1", PORT, _id: "demo-session",
		ogImage: "/img/ogImage.png", ogURL: "/", ogTitle: "KKuTu demo session", ogDescription: "Fictional local demo session"
	});
	let html = pug.renderFile(path.join(VIEWS, "kkutu.pug"), locals);
	// All original scripts (including inline WebSocket locking, analytics and
	// recaptcha) are removed. Only the deterministic mock client is injected.
	html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "");
	// Prevent the template's hidden HOME button from navigating off the local
	// demo. A delegated preventDefault cannot cancel an inline location write.
	html = html.replace(/\sonclick=(["'])(.*?)\1/gi, (attribute, quote, code) =>
		/\blocation(?:\.href)?\s*=\s*(?:&quot;|&#39;|["'])https?:\/\//i.test(code) ? "" : attribute);
	html = html.replace("</head>", '<style>#demo-session-badge{display:block!important;position:fixed;right:12px;bottom:8px;z-index:20000;padding:3px 7px;border-radius:4px;background:rgba(17,24,31,.86);color:#aebbc6;font:12px Arial,sans-serif;letter-spacing:.06em;pointer-events:none}</style></head>');
	if(url && /^(game|classic)$/.test(url.searchParams.get("view") || "")){
		// Screenshot-only arena: the production background remains unchanged.
		html = html.replace(/<body\b([^>]*)>/i, '<body$1 class="demo-arena">');
		html = html.replace("</head>", '<style>body.demo-arena.in-game,html:has(body.demo-arena.in-game){background-image:url("/demo/background.png")!important;background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important;background-attachment:fixed}</style></head>');
	}
	html = html.replace("</body>", '<div id="demo-session-badge" aria-label="Fictional demo session">DEMO SESSION</div><script src="/js/jquery.js"></script><script src="/demo/runtime.js"></script><script src="/demo/fixture.js"></script></body>');
	return html;
}

function renderLogin(){
	const language = getLanguage();
	const providers = [
		["google", "withGoogle", "#ffffff", "#223344"], ["discord", "withDiscord", "#5865f2", "#ffffff"],
		["github", "withGithub", "#24292e", "#ffffff"], ["twitch", "withTwitch", "#9146ff", "#ffffff"],
		["naver", "withNaver", "#03c75a", "#ffffff"], ["kakao", "withKakao", "#fee500", "#342d2d"],
		["facebook", "withFacebook", "#1877f2", "#ffffff"], ["twitter", "withTwitter", "#1da1f2", "#ffffff"],
		["line", "withLine", "#06c755", "#ffffff"], ["spotify", "withSpotify", "#1db954", "#15251b"],
		["instagram", "withInstagram", "#b43885", "#ffffff"], ["daldalso", "withDaldalso", "#34465d", "#ffffff"]
	].map(row => ({ vendor: row[0], displayName: row[1], color: row[2], fontColor: row[3] }));
	let html = pug.renderFile(path.join(VIEWS, "login.pug"), {
		locale: Object.assign({}, language.GLOBAL, language.login), lang: "en_US", page: "login",
		session: { profile: null, guest: true, admin: false }, data: {}, published: false,
		mobile: false, as_pc: false, loginList: providers,
		ogTitle: "KKuTu", ogDescription: "Word-chain online", ogURL: "/login", ogImage: "/img/ogImage.png"
	});
	html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "");
	// The screenshot adapter exposes no sign-in or legal acceptance action.
	html = html.replace("</body>", '<script>document.body.setAttribute("data-demo-ready","true");document.addEventListener("click",function(e){if(e.target.closest("a"))e.preventDefault();});</script></body>');
	return html;
}

const MIME = { ".css": "text/css; charset=utf-8", ".js": "application/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".html": "text/html; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".svg": "image/svg+xml", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav", ".ico": "image/x-icon" };
function send(res, status, type, body){
	res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
	res.end(body);
}
function safeStaticFile(urlPath){
	let decoded;
	try { decoded = decodeURIComponent(urlPath); } catch(err) { return null; }
	if(decoded.includes("\0") || decoded.includes("\\")) return null;
	const file = path.resolve(PUBLIC, "." + decoded);
	const relative = path.relative(PUBLIC, file);
	if(relative.startsWith("..") || path.isAbsolute(relative)) return null;
	return file;
}
const server = http.createServer((req, res) => {
	// Reject all writes even if a new fixture accidentally falls back to AJAX.
	if(req.method !== "GET" && req.method !== "HEAD") return send(res, 405, "text/plain; charset=utf-8", "Read-only local demo; writes are disabled.");
	res.setHeader("Content-Security-Policy", "default-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; media-src 'self'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'");
	let url;
	try { url = new URL(req.url, "http://127.0.0.1:" + PORT); } catch(err) { return send(res, 400, "text/plain", "Invalid URL"); }
	try {
		if(url.pathname === "/login" || (url.pathname === "/" && url.searchParams.get("view") === "login")) return send(res, 200, MIME[".html"], renderLogin());
		if(url.pathname === "/" || url.pathname === "/demo") return send(res, 200, MIME[".html"], renderPage(url));
		if(url.pathname === "/demo/background.png") return send(res, 200, MIME[".png"], req.method === "HEAD" ? undefined : fs.readFileSync(path.join(ROOT, "game_img/8e9a668b-3569-4fbb-990e-af576027c7d9.png")));
		if(url.pathname === "/demo/runtime.js"){
			const demo = getDemo();
			return send(res, 200, MIME[".js"], demo.client.buildRuntime({ language: getLanguage(), rules: constants.RULE, options: constants.OPTIONS, fixtureAssets: demo.fixtureAssets }));
		}
		if(url.pathname === "/demo/fixture.js") return send(res, 200, MIME[".js"], "// All fixture data and mock actions are supplied by /demo/runtime.js.\n");
		const file = safeStaticFile(url.pathname);
		if(!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, "text/plain; charset=utf-8", "Local static asset not found.");
		return send(res, 200, MIME[path.extname(file).toLowerCase()] || "application/octet-stream", req.method === "HEAD" ? undefined : fs.readFileSync(file));
	} catch(err) {
		console.error("Demo request failed:", err.message);
		return send(res, 500, "text/plain; charset=utf-8", "Demo fixture is not ready: " + err.message);
	}
});
server.listen(PORT, "127.0.0.1", () => console.log("Read-only KKuTu demo: http://127.0.0.1:" + PORT + "/?view=lobby"));
