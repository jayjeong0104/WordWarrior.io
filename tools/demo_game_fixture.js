"use strict";

// Fictional, deterministic presentation data. This module does not connect to
// application services, read user records, or mutate the shipped catalogue.
// Item IDs/groups/prices/options below come from db.sql's kkutu_shop COPY data;
// every chosen cosmetic has a matching asset in Web/public/img/kkutu/moremi.
const NOW = Date.UTC(2026, 9, 3, 18, 35);
const DAY = 86400000;
const USER_ID = "fixture-you";
const MODES = ["EKT", "ESH", "KKT", "KSH", "CSQ", "KCW", "KTY", "ETY", "KAP", "HUN", "KDA", "EDA", "KSS", "ESS", "EAP", "EBT"];

const itemRows = [
	["blue_headphone", "Mhead", 500, "Blue headphones", "A little music between rounds."],
	["orange_headphone", "Mhead", 500, "Orange headphones", "A bright pair for your Moremi."],
	["redbere", "Mhead", 500, "Red beret", "A warm red finishing touch."],
	["brownbere", "Mhead", 500, "Brown beret", "A classic brown beret."],
	["blackbere", "Mhead", 500, "Black beret", "A simple black beret."],
	["nekomimi", "Mhead", 1200, "Cat ears", "A playful pair of ears.", {gMNY: 0.05}],
	["hamster_O", "Mhead", 1000, "Orange hamster", "A tiny companion for your next round."],
	["hamster_G", "Mhead", 1000, "Gray hamster", "A quiet companion for your next round."],
	["haksamo", "Mhead", 990, "Graduation cap", "For a Moremi that keeps learning.", {gEXP: 0.02}],
	["miljip", "Mhead", 3000, "Straw hat", "A sunny hat for a relaxed afternoon.", {gEXP: 0.04, gMNY: 0.05}],
	["inverteye", "Meye", 250, "Curious eyes", "An inquisitive look."],
	["brave_eyes", "Meye", 250, "Brave eyes", "Ready for the next challenge."],
	["bigeye", "Meye", 250, "Wide eyes", "Every new word is a discovery."],
	["close_eye", "Meye", 250, "Closed eyes", "A peaceful expression."],
	["lazy_eye", "Meye", 250, "Relaxed eyes", "Taking the round at your own pace."],
	["sunglasses", "Meye", 1000, "Sunglasses", "A cool look for sunny days.", {gEXP: 0.03}],
	["scouter", "Meye", 450, "Scouter", "Scanning for the perfect word."],
	["laugh", "Mmouth", 200, "Big smile", "A cheerful expression."],
	["cat_mouth", "Mmouth", 200, "Cat smile", "A small, mischievous smile."],
	["oh", "Mmouth", 200, "Surprised mouth", "For unexpected discoveries."],
	["merong", "Mmouth", 200, "Playful tongue", "A playful expression."],
	["beardoll", "Mmouth", 200, "Bear smile", "A soft bear-like smile."],
	["blue_vest", "Mclothes", 500, "Blue vest", "A crisp blue outfit."],
	["orange_vest", "Mclothes", 500, "Orange vest", "A bright orange outfit."],
	["pink_vest", "Mclothes", 500, "Pink vest", "A cheerful pink outfit."],
	["blackrobe", "Mclothes", 600, "Black robe", "A robe for a thoughtful wordsmith."],
	["water", "Mclothes", 500, "Water outfit", "An easygoing blue outfit."],
	["sqpants", "Mclothes", 500, "Square pants", "A familiar geometric style."],
	["medal", "Mclothes", 500, "Medal", "A finishing touch for your Moremi."],
	["black_oxford", "Mshoes", 550, "Black Oxfords", "A smart pair of black shoes.", {gEXP: 0.01}],
	["brown_oxford", "Mshoes", 550, "Brown Oxfords", "A smart pair of brown shoes.", {gMNY: 0.02}],
	["black_shoes", "Mshoes", 222, "Black shoes", "A simple pair of tiny shoes."],
	["loosesocks", "Mshoes", 200, "Loose socks", "A comfortable pair of socks."],
	["bluecandy", "Mhand", 150, "Blue candy", "A small blue treat."],
	["lemoncandy", "Mhand", 150, "Lemon candy", "A small lemon-colored treat."],
	["pinkcandy", "Mhand", 150, "Pink candy", "A small pink treat."],
	["purple_ice", "Mhand", 50, "Purple ice cream", "A purple ice cream for your Moremi."],
	["melon_ice", "Mhand", 50, "Melon ice cream", "A refreshing green treat."],
	["choco_ice", "Mhand", 50, "Chocolate ice cream", "A chocolate treat between games."],
	["spanner", "Mhand", -1, "Spanner", "A handy tool for your Moremi.", {hEXP: 10}],
	["bokjori", "Mhand", -1, "Lucky basket", "A small basket to carry with you."],
	["stars", "Mback", 3000, "Starry sky", "A field of stars behind your Moremi.", {gEXP: 0.05, gif: true}],
	["tile", "Mback", 2000, "Tile backdrop", "A bright tiled backdrop."],
	["darkblack", "Mback", 2000, "Dark backdrop", "A simple dark backdrop."],
	["blue_name", "NIK", 300, "Blue nickname", "Give your nickname a blue accent."],
	["purple_name", "NIK", 300, "Purple nickname", "Give your nickname a purple accent."],
	["orange_name", "NIK", 300, "Orange nickname", "Give your nickname an orange accent."],
	["green_name", "NIK", 300, "Green nickname", "Give your nickname a green accent."],
	["red_name", "NIK", 300, "Red nickname", "Give your nickname a red accent."],
	["pink_name", "NIK", 300, "Pink nickname", "Give your nickname a pink accent."],
	["indigo_name", "NIK", 300, "Indigo nickname", "Give your nickname an indigo accent."],
	["boxB2", "CNS", -1, "Silver emblem chest", "Contains one timed silver emblem."],
	["boxB3", "CNS", -1, "Gold emblem chest", "Contains one timed gold emblem."],
	["boxB4", "CNS", -1, "Royal emblem chest", "Contains one timed royal emblem."],
	["dictPage", "CNS", -1, "Dictionary page", "A little extra experience from a page of words."],
	["b2_fire", "BDG2", -1, "Fire emblem", "A silver emblem.", {gEXP: 0.25}, 604800],
	["b3_hwa", "BDG3", -1, "Harmony emblem", "A gold emblem.", {gEXP: 0.03, gMNY: 0.07}, 604800],
	["b4_mint", "BDG4", -1, "Mint emblem", "A royal emblem.", {gEXP: 0.01, hEXP: 10, gMNY: 0.03, hMNY: 1}, 604800],
	["b2_metal", "BDG2", -1, "Steel emblem", "A silver emblem.", {gMNY: 0.5}, 604800],
	["b3_do", "BDG3", -1, "Challenge emblem", "A gold emblem.", {gEXP: 0.05}, 604800],
	["b3_pok", "BDG3", -1, "Storm emblem", "A gold emblem.", {gMNY: 0.1, hMNY: 2}, 604800],
	["b4_bb", "BDG4", -1, "Blueberry emblem", "A royal emblem.", {gMNY: 0.05, hMNY: 1}, 604800],
	["b4_hongsi", "BDG4", -1, "Tangerine emblem", "A royal emblem.", {gEXP: 0.02, hEXP: 20}, 604800]
];
const shop = {};
itemRows.forEach(row => {
	shop[row[0]] = {_id: row[0], group: row[1], cost: row[2], name: row[3], desc: row[4], options: row[5] || {}, term: row[6] || 0, hit: 0, updatedAt: NOW - DAY * 30};
});

const outfits = [
	{Mhead: "blue_headphone", Meye: "inverteye", Mmouth: "laugh", Mclothes: "blue_vest", Mshoes: "black_oxford", Mlhand: "bluecandy", Mrhand: "purple_ice", BDG: "b4_mint"},
	{Mhead: "redbere", Meye: "bigeye", Mmouth: "cat_mouth", Mclothes: "pink_vest", Mshoes: "loosesocks", Mrhand: "pinkcandy"},
	{Mhead: "orange_headphone", Meye: "brave_eyes", Mmouth: "laugh", Mclothes: "orange_vest", Mshoes: "black_shoes", Mrhand: "melon_ice"},
	{Mhead: "brownbere", Meye: "scouter", Mmouth: "beardoll", Mclothes: "blackrobe", Mshoes: "brown_oxford", Mrhand: "spanner", BDG: "b3_hwa"},
	{Mhead: "nekomimi", Meye: "bigeye", Mmouth: "cat_mouth", Mclothes: "water", Mshoes: "loosesocks", Mrhand: "purple_ice"},
	{Mhead: "hamster_O", Meye: "close_eye", Mmouth: "laugh", Mclothes: "orange_vest", Mshoes: "brown_oxford", Mrhand: "lemoncandy"},
	{Mhead: "haksamo", Meye: "lazy_eye", Mmouth: "beardoll", Mclothes: "blackrobe", Mshoes: "black_oxford", Mrhand: "bokjori", BDG: "b2_fire"},
	{Mhead: "blackbere", Meye: "sunglasses", Mmouth: "oh", Mclothes: "blue_vest", Mshoes: "black_shoes", Mrhand: "choco_ice"},
	{Mhead: "hamster_G", Meye: "inverteye", Mmouth: "merong", Mclothes: "pink_vest", Mshoes: "loosesocks", Mrhand: "bluecandy"},
	{Mhead: "miljip", Meye: "brave_eyes", Mmouth: "laugh", Mclothes: "water", Mshoes: "brown_oxford", Mrhand: "melon_ice"},
	{Mhead: "redbere", Meye: "lazy_eye", Mmouth: "cat_mouth", Mclothes: "blue_vest", Mshoes: "black_shoes", Mrhand: "lemoncandy"},
	{Mhead: "brownbere", Meye: "close_eye", Mmouth: "beardoll", Mclothes: "orange_vest", Mshoes: "brown_oxford", Mrhand: "spanner"},
	{Mhead: "blue_headphone", Meye: "bigeye", Mmouth: "oh", Mclothes: "sqpants", Mshoes: "loosesocks", Mrhand: "pinkcandy"},
	{Mhead: "blackbere", Meye: "inverteye", Mmouth: "laugh", Mclothes: "water", Mshoes: "black_oxford", Mrhand: "purple_ice"}
];
// Mix the existing layers for a larger lobby without inventing cosmetic IDs.
const extraHeads = ["blue_headphone", "redbere", "brownbere", "blackbere", "hamster_O", "hamster_G", "orange_headphone", "nekomimi", "miljip", "haksamo"];
const extraClothes = ["blue_vest", "orange_vest", "pink_vest", "blackrobe", "water", "sqpants"];
const extraEyes = ["brave_eyes", "close_eye", "lazy_eye", "bigeye", "inverteye", "sunglasses", "scouter"];
for(let index = 14; index < 66; index++){
	outfits.push(Object.assign({}, outfits[index % 14], {
		Mhead: extraHeads[index % extraHeads.length],
		Mclothes: extraClothes[Math.floor(index / extraHeads.length) % extraClothes.length],
		Meye: extraEyes[index % extraEyes.length],
		Mrhand: ["bluecandy", "lemoncandy", "pinkcandy", "purple_ice", "melon_ice", "choco_ice"][index % 6]
	}));
}
outfits.forEach((equip, index) => {
	equip.NIK = ["blue_name", "pink_name", "orange_name", "indigo_name", "purple_name", "green_name", "red_name"][index % 7];
});

// Match getRequiredScore()/ready.js exactly. The browser adds the two Infinity
// sentinel entries after serialization; the fixture itself stays JSON-safe.
function requiredScore(level){
	return Math.round(((!(level % 5) * 0.3 + 1) * (!(level % 15) * 0.4 + 1) * (!(level % 45) * 0.5 + 1)) *
		(120 + Math.floor(level / 5) * 60 + Math.floor(level * level / 225) * 120 + Math.floor(level * level / 2025) * 180));
}
const EXP = [];
for(let level = 1; level < 360; level++) EXP.push((EXP[level - 2] || 0) + requiredScore(level));
function scoreAt(level, fraction){
	const before = EXP[level - 2] || 0;
	return before + Math.floor((EXP[level - 1] - before) * fraction);
}
function clone(value){ return JSON.parse(JSON.stringify(value)); }
function ownedOutfit(equip){
	const owned = {};
	Object.keys(equip).forEach(slot => {
		const key = equip[slot];
		if(shop[key].term) owned[key] = {value: 1, expire: Math.floor(NOW / 1000) + 4 * 86400};
		else owned[key] = (owned[key] || 0) + 1;
	});
	return owned;
}
const roster = [
	[USER_ID, "Wordsmith", 42, 2840, "Always room for one more word."],
	["mira", "Mira", 36, 1680, "A good chain starts with a small word."],
	["pixel", "Pixel", 22, 740, "Collecting words and colorful hats."],
	["atlas", "Atlas", 58, 3250, "One map, many possible routes."],
	["nova", "Nova", 14, 410, "Still finding new words every round."],
	["juniper", "Juniper", 9, 260, "A few quick typing rounds after class."],
	["sage", "Sage", 67, 4620, "Leave a little time to think."],
	["lumen", "Lumen", 28, 1250, "Looking for the bright side of a tricky letter."],
	["echo", "Echo", 18, 580, "Short words count too."],
	["rowan", "Rowan", 44, 2170, "Here for close games and good company."],
	["finch", "Finch", 7, 185, "Learning the ropes. Happy to join."],
	["cedar", "Cedar", 31, 1490, "A steady pace beats a rushed guess."],
	["kite", "Kite", 12, 390, "Typing first, coffee second."],
	["orbit", "Orbit", 25, 960, "There is usually another way around."],
	["wren", "Wren", 33, 1730, "Back for the weekend rounds."],
	["ember", "Ember", 16, 625, "Saving a few good words for later."],
	["fern", "Fern", 19, 780, "New words tend to grow on you."],
	["iris", "Iris", 47, 2460, "A quick round before the evening gets busy."],
	["vale", "Vale", 24, 1120, "Trying a different starting letter today."],
	["reed", "Reed", 11, 340, "Here for a friendly rematch."],
	["clover", "Clover", 32, 1530, "A little luck and a lot of practice."],
	["sol", "Sol", 53, 3010, "One more round while the light lasts."],
	["tess", "Tess", 15, 610, "Short words, quick decisions."],
	["alder", "Alder", 39, 1975, "A few good words in reserve."],
	["hazel", "Hazel", 61, 3740, "Finding the next link in the chain."],
	["lyra", "Lyra", 27, 1280, "Words with a bit of rhythm."],
	["rue", "Rue", 8, 215, "Making room for new favorites."],
	["moss", "Moss", 21, 895, "Slow down; the word will come."],
	["pip", "Pip", 13, 420, "A small word can start a long chain."],
	["willow", "Willow", 45, 2290, "Good company makes a close round better."],
	["robin", "Robin", 17, 655, "Warming up before the longer rounds."],
	["maple", "Maple", 34, 1740, "A few typing rounds after dinner."],
	["aspen", "Aspen", 29, 1390, "Keeping a steady typing pace."],
	["opal", "Opal", 56, 3180, "There is always another word to learn."],
	["brook", "Brook", 6, 160, "Looking for a beginner-friendly room."],
	["aster", "Aster", 41, 2080, "A little practice every day adds up."],
	["jade", "Jade", 23, 990, "A favorite hat and a new word list."],
	["dusk", "Dusk", 37, 1890, "Here for the evening rounds."],
	["wisp", "Wisp", 26, 1190, "A spare word for the difficult endings."],
	["spruce", "Spruce", 49, 2720, "A familiar room and a new challenge."],
	["grove", "Grove", 10, 310, "Practicing the longer links today."],
	["dune", "Dune", 38, 1940, "Happy to play one more rematch."],
	["cove", "Cove", 20, 860, "Taking the next round as it comes."],
	["poppy", "Poppy", 16, 630, "A short word can be the right word."],
	["birch", "Birch", 43, 2220, "Starting a small collection of plant words."],
	["fable", "Fable", 30, 1450, "New favorites find their way into every round."],
	["rook", "Rook", 62, 3860, "Keeping my typing rhythm steady."],
	["lotus", "Lotus", 35, 1810, "A little practice before the ranked games."],
	["pebble", "Pebble", 5, 145, "Finding my first few favorite rooms."],
	["marlow", "Marlow", 46, 2410, "Here for a friendly five-round session."],
	["sora", "Sora", 18, 710, "Looking for words hidden in plain sight."],
	["glade", "Glade", 40, 2030, "A quiet start and a quick finish."],
	["copper", "Copper", 57, 3340, "A good chain always has another link."],
	["sunny", "Sunny", 22, 950, "A few bright rounds between errands."],
	["breeze", "Breeze", 8, 245, "Learning one ending at a time."],
	["snow", "Snow", 33, 1660, "A relaxed pace is a good pace."],
	["thistle", "Thistle", 51, 2940, "Long words are worth looking for."],
	["bramble", "Bramble", 28, 1320, "Finding the gaps in a crowded letter grid."],
	["vesper", "Vesper", 65, 4290, "Taking a word trip around the world."],
	["cloud", "Cloud", 24, 1070, "A new destination in every round."],
	["rain", "Rain", 12, 405, "Just a few warm-up rounds today."],
	["foxglove", "Foxglove", 36, 1880, "Putting familiar sayings to the typing test."],
	["sprout", "Sprout", 15, 590, "Growing my vocabulary, one game at a time."],
	["meadow", "Meadow", 48, 2580, "Saving a word for the mission letter."],
	["gale", "Gale", 32, 1600, "There is time for one last round."],
	["coral", "Coral", 21, 920, "Dinner can wait for a close finish."]
];
const profiles = {};
const users = {};
// Display handles are fictional; stable IDs keep room/social references intact.
const handles = [
	"InkMoth", "quietcomet", "PixelPudding", "MapleCircuit", "NectarNinja", "TeaAndTypos", "PaperDragon", "LowkeyLumen",
	"EchoPebble", "RowanOnRepeat", "PocketFinch", "CedarSketch", "KiteAfterCoffee", "OrbitInk", "WrenRadio", "EmberWaffle",
	"FernAndFig", "IrisInMotion", "VelvetVale", "ReedBetweenLines", "CloverQuest", "SolarToast", "Tessellate", "AlderArcade",
	"HazelHaze", "LyraLoops", "RueTheDay", "MossBoss", "PipSqueak", "WillowWisp", "RobinRewind", "MapleSyrup", "AspenAfterhours",
	"OpalOddity", "BrookBook", "AsterOrbit", "JadeJelly", "DoodleDusk", "WishfulWisp", "SpruceGoose", "GroveGlider",
	"DuneDancer", "CoveCoffee", "PoppyByte", "BirchPlease", "FableFox", "RookAndRoll", "LotusLogic", "pebble.exe", "MoonlitMarlow",
	"SoraScribbles", "GladeRunner", "CopperKite", "SunnySideQuest", "BreezeBytes", "Snowglobe", "ThistleWhistle", "BrambleJam",
	"VesperVibes", "CloudSketch", "RainCheck", "FoxgloveFizz", "SproutScout", "MeadowMuse", "GaleForce", "CoralCrunch"
];
roster.forEach((row, index) => {
	const score = scoreAt(row[2], 0.38 + index % 4 * 0.12);
	const record = {};
	MODES.forEach(mode => { record[mode] = [0, 0, 0, 0]; });
	const games = row[2] * 3 + 12;
	const allocations = [Math.floor(score * 0.46), Math.floor(score * 0.24), Math.floor(score * 0.16)];
	const modeGames = [Math.floor(games * 0.46), Math.floor(games * 0.24), Math.floor(games * 0.16)];
	["ESH", "EKT", "ETY", "ESS"].forEach((mode, modeIndex) => {
		const count = modeIndex < 3 ? modeGames[modeIndex] : games - modeGames.reduce((a, b) => a + b, 0);
		const gained = modeIndex < 3 ? allocations[modeIndex] : score - allocations.reduce((a, b) => a + b, 0);
		record[mode] = [count, Math.floor(count * (0.38 + index % 5 * 0.045)), gained, count * 105000];
	});
	const equip = clone(outfits[index % outfits.length]);
	const rankedGames = Math.max(5, Math.floor(games * 0.32));
	const rankedWins = Math.min(rankedGames - 2, Math.floor(rankedGames * 0.52) + index % 3);
	const rankedLosses = rankedGames - rankedWins - 2;
	const trophy = index === 0 ? 842 : 450 + row[2] * 9;
	const user = {
		id: row[0], guest: false, profile: {id: row[0], name: handles[index], title: handles[index], type: "demo", image: null},
		data: {score, playTime: games * 105000, joinedAt: NOW - DAY * (90 + row[2]), connectDate: 3,
			record, ranked: {trophy, best: trophy + 38, wins: rankedWins, losses: rankedLosses, draws: 2, games: rankedGames}, trophy},
		money: row[3], equip, box: ownedOutfit(equip), exordial: row[4], place: 0,
		game: {ready: false, form: "J", team: 0, practice: 0, score: 0, item: []}
	};
	profiles[user.id] = user;
	if(user.id !== "wren" && user.id !== "ember") users[user.id] = user;
});

const box = Object.assign({}, users[USER_ID].box, {
	orange_headphone: 1, redbere: 1, brownbere: 1, blackbere: 1, nekomimi: 1, hamster_G: 1, miljip: 1,
	pink_vest: 1, orange_vest: 1, blackrobe: 1, water: 1, sqpants: 1,
	brave_eyes: 1, lazy_eye: 1, bigeye: 1, close_eye: 1, sunglasses: 1, scouter: 1,
	cat_mouth: 1, merong: 1, beardoll: 1, brown_oxford: 1, loosesocks: 1,
	bluecandy: 2, purple_ice: 3, lemoncandy: 1, pinkcandy: 2, melon_ice: 1, choco_ice: 1, spanner: 1, bokjori: 1,
	stars: 1, tile: 1, blue_name: 1, purple_name: 1, green_name: 1,
	boxB2: 3, boxB3: 2, boxB4: 4, dictPage: 5,
	b2_fire: {value: 1, expire: Math.floor(NOW / 1000) + 3 * 86400},
	b3_hwa: {value: 1, expire: Math.floor(NOW / 1000) + 5 * 86400}
});
users[USER_ID].box = box;

function makeRoom(id, title, master, players, mode, opts, gaming){
	const readies = {};
	players.forEach((uid, index) => {
		users[uid].place = id;
		users[uid].game.ready = uid !== master && (gaming || index % 2 === 1);
		readies[uid] = {r: users[uid].game.ready, f: "J", t: 0};
	});
	const theme = ["blue", "purple", "green", "brown", "yellow", "pink", "red", "gray"][(id - 101) % 8];
	return {id, channel: 1, roomTheme: theme, themeColor: theme,
		title, password: false, limit: mode === "EBT" ? 12 : mode === "ETY" || mode === "ESS" ? 8 : mode === "EDA" ? 4 : 6, mode: MODES.indexOf(mode), round: id === 112 ? 5 : 3,
		time: 60, master, players: players.slice(), readies, gaming: !!gaming,
		match1v1: false, matchPlayers: [], practice: false, opts,
		game: {round: gaming ? 2 : 0, turn: 0, seq: gaming ? players.slice() : [], title: "abcdefghij"}};
}
const rooms = {
	101: makeRoom(101, "Cozy chains, no rush", "mira", ["mira", "pixel"], "ESH", {mission: true}, false),
	102: makeRoom(102, "One chain, twelve minds", "atlas", ["atlas", "echo", "orbit", "nova", "sage", "lumen", "finch", "aspen", "grove", "poppy", "pebble", "marlow"], "EBT", {mission: true, banletter: true}, true),
	103: makeRoom(103, "Coffee, keys, repeat", "juniper", ["juniper", "kite", "rowan"], "ETY", {proverb: true}, false),
	104: makeRoom(104, "Three-letter detours", "cedar", ["cedar"], "EKT", {mission: true}, false),
	105: makeRoom(105, "Space nerds welcome", "fern", ["fern", "iris", "reed", "sol"], "EDA", {injpick: ["450"], mission: true}, false),
	106: makeRoom(106, "Slow chains, good company", "vale", ["vale"], "ESH", {}, false),
	107: makeRoom(107, "Typos happen", "clover", ["clover"], "ETY", {}, false),
	108: makeRoom(108, "Word hunt in the garden", "tess", ["tess", "alder", "lyra"], "ESS", {}, false),
	109: makeRoom(109, "Mind your manners", "hazel", ["hazel"], "EKT", {manner: true, mission: true}, false),
	110: makeRoom(110, "Snack words, anyone?", "rue", ["rue", "moss"], "EDA", {injpick: ["e13"]}, false),
	111: makeRoom(111, "Just one more word", "pip", ["pip"], "ESH", {}, false),
	112: makeRoom(112, "Proverbs and peppermint", "robin", ["robin", "maple", "willow"], "ETY", {proverb: true}, false),
	113: makeRoom(113, "Three letters, many ways out", "wisp", ["wisp", "spruce", "fable"], "EKT", {}, false),
	114: makeRoom(114, "Rematch before the kettle boils", "dune", ["dune", "cove"], "ESH", {mission: true}, true),
	115: makeRoom(115, "Plant and Garden Words", "birch", ["birch"], "EDA", {injpick: ["e20"]}, false),
	116: makeRoom(116, "Keys warmed, tea cooling", "rook", ["rook", "lotus"], "ETY", {}, true),
	117: makeRoom(117, "Lost in the letter grid", "sora", ["sora", "glade", "sunny"], "ESS", {}, false),
	118: makeRoom(118, "Manner rematch", "copper", ["copper"], "EKT", {manner: true}, false),
	119: makeRoom(119, "New here? Pull up a chair", "breeze", ["breeze", "snow"], "ESH", {}, false),
	120: makeRoom(120, "Long-word treasure hunt", "thistle", ["thistle", "bramble"], "ESS", {no2: true}, true),
	121: makeRoom(121, "Postcards from everywhere", "vesper", ["vesper", "cloud"], "EDA", {injpick: ["1001"]}, false),
	122: makeRoom(122, "Sayings at sunset", "rain", ["rain", "foxglove", "coral"], "ETY", {proverb: true}, false),
	123: makeRoom(123, "Chasing the mission letter", "sprout", ["sprout", "meadow"], "EKT", {mission: true}, false),
	124: makeRoom(124, "The dinner-can-wait club", "gale", ["gale"], "ESH", {mission: true}, false)
};
Object.assign(rooms[102].game, {
	turn: 0, char: "n", mission: "r", banLetters: ["x"], roundTime: 38500, turnTime: 12000,
	chain: ["birch", "harbor", "river", "rose", "ember", "rain", "nebula", "acorn", "nectar", "raven", "night", "thorn"]
});
rooms[102].players.forEach((uid, index) => { users[uid].game.score = [126, 94, 82, 67, 151, 44, 38, 72, 57, 65, 29, 108][index]; });
Object.assign(rooms[114].game, {turn: 0, char: "e", mission: "m", roundTime: 42000, turnTime: 9000,
	chain: ["birch", "harbor", "river", "rose", "elm", "maple"]});
rooms[114].players.forEach((uid, index) => { users[uid].game.score = [132, 96, 71][index]; });
rooms[116].round = 5;
rooms[116].game.title = "①②③④⑤⑥⑦⑧⑨⑩";
rooms[116].game.roundTime = 46000;
const typingWords = ["river", "light", "stone", "green", "cloud", "paper", "quiet", "music", "field", "rain"];
rooms[116].game.clist = Array.from({length: 200}, (_, index) => typingWords[(index * 7 + 3) % typingWords.length]);
rooms[116].players.forEach((uid, index) => { users[uid].game.score = [180, 155, 97, 126][index]; });
rooms[118].limit = 4;
rooms[120].game.title = "①②③④⑤⑥⑦⑧⑨⑩";
rooms[120].game.roundTime = 45000;
rooms[120].game.words = [];
rooms[120].game.board = ("gardenstreamcloudforestbrightstonepapermeadowflower" + "abcdefghijklmnopqrstuvwxyzaeiouaeiouaeiouaeiouaeiou").slice(0, 100);
rooms[120].players.forEach((uid, index) => { users[uid].game.score = [48, 32][index]; });

const friends = {};
["mira", "pixel", "atlas", "cedar", "wren", "ember"].forEach(id => { friends[id] = profiles[id].profile.title; });
const friendPresence = {mira: {server: "1"}, pixel: {server: "1"}, atlas: {server: "1"}, cedar: {server: "1"}, wren: {}, ember: {}};
function mission(title, goal, progress, reward){
	return {type: "clan_chat", title, goal, progress, reward, completed: false, completedAt: 0, createdAt: NOW - DAY * 2};
}
const clans = [
	{id: "fixture-northstar", name: "Northstar", about: "A few rounds after dinner. Curious minds welcome.", memberCount: 7, onlineCount: 5,
		banner: {shape: "shield", border: "#20375f", fill: "#486acc", logo: "star", pattern: "solid", text: ""},
		mission: mission("Share 120 messages with your clan", 120, 86, 200)},
	{id: "fixture-letterleague", name: "Letter League", about: "New words, close games, and a rematch or two.", memberCount: 12, onlineCount: 12,
		banner: {shape: "shield", border: "#372653", fill: "#7658b2", logo: "letters", pattern: "vsplit2", text: "LL"},
		mission: mission("Share 100 messages with your clan", 100, 64, 180)},
	{id: "fixture-sunroom", name: "Sunroom", about: "Easygoing typing rounds and weekend word chains.", memberCount: 11, onlineCount: 11,
		banner: {shape: "shield", border: "#775224", fill: "#d8ab45", logo: "crown", pattern: "hstripes3", text: ""},
		mission: mission("Share 80 messages with your clan", 80, 49, 150)}
];
const northstarIds = [USER_ID, "mira", "pixel", "atlas", "cedar", "wren", "ember", "grove"];
const myClan = Object.assign({}, clone(clans[0]), {owner: USER_ID, createdAt: NOW - DAY * 48,
	members: northstarIds.map((id, index) => ({id, name: profiles[id].profile.title, role: index === 0 ? "owner" : "member", online: !!users[id], joinedAt: NOW - DAY * (48 - index * 5)})),
	chat: [
		{type: "system", text: "InkMoth updated the clan crest.", time: NOW - 55 * 60000},
		{senderId: "mira", text: "Room 101 is open. Slow chains and a cup of tea?", time: NOW - 17 * 60000},
		{senderId: "pixel", text: "Yes please. I just typed 'harbour' three times in a row.", time: NOW - 15 * 60000},
		{senderId: "atlas", text: "Our Beta room has twelve now. Mission R, ban X. Wish us luck.", time: NOW - 12 * 60000},
		{senderId: USER_ID, text: "Joining after I pick a hat. The hamster is winning.", time: NOW - 10 * 60000},
		{senderId: "cedar", text: "86 / 120 on the clan mission. A few rounds should do it.", time: NOW - 7 * 60000}
	]});
clans[0].owner = USER_ID;
clans[0].members = clone(myClan.members);
const otherClanRosters = [
	["sage", "lumen", "echo", "orbit", "nova", "fern", "iris", "vale", "reed", "clover", "sol", "tess", "pebble", "marlow"],
	["juniper", "kite", "rowan", "finch", "alder", "hazel", "lyra", "rue", "moss", "pip", "willow", "aspen", "poppy"]
];
otherClanRosters.forEach((ids, index) => {
	const row = clans[index + 1];
	row.owner = ids[0];
	row.members = ids.map((id, memberIndex) => ({id, name: profiles[id].profile.title, role: memberIndex ? "member" : "owner", online: true, joinedAt: NOW - DAY * (30 - memberIndex)}));
});
clans.forEach(row => {
	row.memberCount = row.members.length;
	row.onlineCount = row.members.filter(member => member.online).length;
	row.members.forEach(member => {
		profiles[member.id].clan = {id: row.id, name: row.name, banner: clone(row.banner)};
	});
});
myClan.memberCount = clans[0].memberCount;
myClan.onlineCount = clans[0].onlineCount;
myClan.chat.forEach(row => { if(row.senderId) row.senderName = profiles[row.senderId].profile.title; });
const clan = {my: myClan, list: clone(clans)};
function chatLine(uid, value, minutes){ return {profile: clone(profiles[uid].profile), value, timestamp: NOW - minutes * 60000}; }
const chat = [
	chatLine("juniper", "Two spots open for a quick typing warm-up in 103.", 18),
	chatLine("kite", "Joining. I keep swapping the last two letters when I rush.", 17),
	chatLine("mira", "English chain in 101, three rounds. Beginners welcome.", 14),
	chatLine("finch", "Beta room in 102 has space. Are four-letter words okay?", 13),
	chatLine("atlas", "Yep. Mission R for a bonus, and no X this round.", 12),
	chatLine(USER_ID, "I'll come over in a minute. Finishing my outfit first.", 9),
	chatLine("cedar", "Three-letter chains in 104. Bring your oddest endings.", 6),
	chatLine("rowan", "We have room. No pressure to be quick on the first round.", 5)
];
const roomChat = [
	chatLine("atlas", "Nice chain. R words are paying off.", 2),
	chatLine("echo", "Saving 'rainbow' for an R turn.", 1)
];
const vocab = {lists: [
	{id: "fixture-nature", name: "Nature notebook", createdAt: NOW - DAY * 12, words: [
		{word: "aurora", lang: "en", mean: "A natural display of colored light in the sky.", type: "noun", theme: "450"},
		{word: "canopy", lang: "en", mean: "The upper layer formed by the crowns of trees.", type: "noun", theme: "e20"},
		{word: "nebula", lang: "en", mean: "A cloud of gas and dust in space.", type: "noun", theme: "450"}]},
	{id: "fixture-discoveries", name: "This week's discoveries", createdAt: NOW - DAY * 5, words: [
		{word: "luminous", lang: "en", mean: "Giving off or reflecting light.", type: "adjective", theme: "160"},
		{word: "mosaic", lang: "en", mean: "A picture or pattern made from small pieces.", type: "noun", theme: ""}]},
	{id: "fixture-chain", name: "Tricky starting letters", createdAt: NOW - DAY * 2, words: [
		{word: "quartz", lang: "en", mean: "A common crystalline mineral.", type: "noun", theme: "530"},
		{word: "xylem", lang: "en", mean: "Plant tissue that carries water from roots.", type: "noun", theme: "e20"}]}
], limits: {lists: 5, words: 50}};
const ranking = {page: 0, data: Object.keys(profiles).sort((a, b) => profiles[b].data.score - profiles[a].data.score)
	.map((id, rank) => ({id, rank, score: profiles[id].data.score, name: profiles[id].profile.title, profile: clone(profiles[id].profile)}))};

const fixture = {
	id: USER_ID, userId: USER_ID, now: NOW, server: "1", activeRoomId: 102, waitingRoomId: 102, chestId: "boxB2", chestReward: "b2_metal",
	shop, outfits, box, users, profiles, rooms, friends, friendPresence, clan, clans, myClan,
	chat, roomChat, vocab, ranking, EXP, money: users[USER_ID].money, gems: users[USER_ID].money,
	metadata: {fictional: true, purpose: "Local marketing/demo screenshots", maxLevel: 360}
};
function buildFixture(){ return clone(fixture); }

module.exports = Object.assign({}, fixture, {buildFixture, createFixture: buildFixture});
