const { Pool } = require("../Server/lib/node_modules/pg");
const GLOBAL = require("../Server/lib/sub/global.json");
const EXTRA_SUBJECT_SEEDS = require("./en_subject_seed_extra");
const EXTRA_SUBJECT_SEEDS_MORE = require("./en_subject_seed_more");
const EXTRA_SUBJECT_SEEDS_MASSIVE = require("./en_subject_seed_massive");

const TOP_MARK = "\uFF02";
const MID_OPEN = "\uFF3B";
const MID_CLOSE = "\uFF3D";
const LOW_OPEN = "\uFF08";
const LOW_CLOSE = "\uFF09";

const pool = new Pool({
	user: GLOBAL.PG_USER,
	password: GLOBAL.PG_PASSWORD,
	host: GLOBAL.PG_HOST,
	port: GLOBAL.PG_PORT,
	database: GLOBAL.PG_DATABASE,
});

const APPLY = process.argv.includes("--apply");

const PLACE_NAME_KEEP = new Set([ "us", "uk", "usa", "uae", "eu" ]);
const COUNTRY_KEEP = new Set([ "us", "uk", "usa", "uae", "eu" ]);
const PLACE_NAME_REMOVE = new Set([
	"ak", "al", "ar", "as", "az", "ca", "co", "ct", "dc", "de",
	"fl", "ga", "gu", "hi", "ia", "id", "il", "in", "ks", "ky",
	"la", "ma", "md", "me", "mi", "mn", "mo", "ms", "mt", "nc",
	"nd", "ne", "nh", "nj", "nm", "nv", "ny", "oh", "ok", "or",
	"pa", "pr", "ri", "sc", "sd", "tn", "tx", "ut", "va", "vi",
	"vt", "wa", "wi", "wv", "wy"
]);

const SUBJECT_SEEDS = {
	MINC: {
		defaultType: "INJEONG",
		noDefinition: true,
		entries: [
			"creeper", "enderman", "redstone", "obsidian", "bedrock",
			"villager", "enderdragon", "wither", "elytra", "netherite",
			"diamondpickaxe", "craftingtable", "enchantingtable", "blaze", "ghast",
			"piglin", "shulker", "beacon", "totem", "axolotl",
			"warden", "stronghold", "slimeblock", "furnace", "nether"
		]
	},
	STA: {
		defaultType: "INJEONG",
		noDefinition: true,
		entries: [
			"terran", "zerg", "protoss", "hydralisk", "ultralisk",
			"mutalisk", "marine", "firebat", "medic", "ghost",
			"goliath", "vulture", "wraith", "battlecruiser", "zealot",
			"dragoon", "reaver", "archon", "templar", "darktemplar",
			"carrier", "corsair", "overlord", "lurker", "baneling"
		]
	},
	POK: {
		defaultType: "INJEONG",
		noDefinition: true,
		entries: [
			"pikachu", "charizard", "bulbasaur", "squirtle", "mewtwo",
			"mew", "gengar", "eevee", "snorlax", "psyduck",
			"jigglypuff", "meowth", "lapras", "dragonite", "lugia",
			"hooh", "celebi", "latios", "latias", "deoxys",
			"rayquaza", "dialga", "palkia", "giratina", "arceus",
			"reshiram", "zekrom", "kyogre", "groudon", "mudkip",
			"torchic", "treecko", "lucario", "garchomp", "greninja",
			"sylveon", "umbreon", "espeon", "blastoise", "venusaur"
		]
	},
	FORT: {
		defaultType: "INJEONG",
		noDefinition: true,
		entries: [
			"battlebus", "lootllama", "tiltedtowers", "pleasantpark", "dustydepot",
			"tomatotown", "slurpjuice", "shieldpotion", "boogiebomb", "chugjug",
			"medmist", "rebootvan", "stormcircle", "riftgo", "launchpad",
			"supplydrop", "glider", "harvestingtool", "vbucks", "mythic"
		]
	},
	VALO: {
		defaultType: "INJEONG",
		noDefinition: true,
		entries: [
			"jett", "phoenix", "sage", "omen", "reyna",
			"brimstone", "killjoy", "cypher", "yoru", "neon",
			"fade", "harbor", "gekko", "iso", "clove",
			"viper", "sova", "breach", "skye", "chamber",
			"astra", "ascent", "bind", "haven", "split",
			"breeze", "fracture", "lotus", "sunset", "abyss"
		]
	},
	PUBG: {
		defaultType: "INJEONG",
		noDefinition: true,
		entries: [
			"erangel", "miramar", "sanhok", "vikendi", "karakin",
			"taego", "deston", "airdrop", "redzone", "ghillie",
			"fryingpan", "parachute", "sidecar", "crossbow", "molotov",
			"gascan", "panzerfaust", "firstaidkit", "bandage", "painkiller",
			"energydrink"
		]
	},
	APEX: {
		defaultType: "INJEONG",
		noDefinition: true,
		entries: [
			"wraith", "lifeline", "bloodhound", "gibraltar", "pathfinder",
			"bangalore", "caustic", "mirage", "octane", "wattson",
			"revenant", "horizon", "valkyrie", "seer", "catalyst",
			"conduit", "ash", "loba", "rampart", "fuse",
			"madmaggie", "stormpoint", "worldsedge", "olympus", "brokenmoon",
			"kingscanyon"
		]
	},
	OVW: {
		defaultType: "INJEONG",
		noDefinition: true,
		entries: [
			"tracer", "reaper", "widowmaker", "mercy", "genji",
			"hanzo", "cassidy", "ana", "zenyatta", "lucio",
			"mei", "sombra", "bastion", "winston", "orisa",
			"moira", "brigitte", "sigma", "kiriko", "sojourn",
			"ramattra", "illari", "venture", "juno", "roadhog",
			"torbjorn", "symmetra", "pharah"
		]
	},
	"450": {
		defaultType: "n",
		entries: [
			{ word: "galaxy", definition: "A vast system of stars, gas, and dust bound by gravity." },
			{ word: "nebula", definition: "A cloud of gas and dust in interstellar space." },
			{ word: "quasar", definition: "An extremely luminous galactic core powered by a black hole.", extraThemes: [ "160" ] },
			{ word: "supernova", definition: "A stellar explosion that briefly outshines an entire galaxy.", extraThemes: [ "160" ] },
			{ word: "blackhole", definition: "A region of spacetime whose gravity prevents light from escaping.", extraThemes: [ "160" ] },
			{ word: "exoplanet", definition: "A planet that orbits a star outside the solar system." },
			{ word: "pulsar", definition: "A rapidly rotating neutron star that emits periodic radiation.", extraThemes: [ "160" ] },
			{ word: "constellation", definition: "A recognized pattern of stars in the night sky." },
			{ word: "asteroid", definition: "A small rocky body that orbits the sun." },
			{ word: "meteorite", definition: "A meteoroid fragment that reaches the ground." },
			{ word: "eclipse", definition: "An event in which one celestial body blocks another from view." },
			{ word: "solstice", definition: "Either yearly point when the sun is farthest north or south." },
			{ word: "equinox", definition: "Either yearly point when day and night are nearly equal in length." },
			{ word: "heliosphere", definition: "The vast region around the sun shaped by the solar wind." },
			{ word: "redgiant", definition: "A large, cool star in a late stage of stellar evolution." },
			{ word: "whitedwarf", definition: "A dense stellar remnant left after a low-mass star dies." },
			{ word: "orbit", definition: "The curved path of one body around another under gravity.", extraThemes: [ "160" ] },
			{ word: "aphelion", definition: "The point where an orbiting body is farthest from the sun." },
			{ word: "perihelion", definition: "The point where an orbiting body is nearest the sun." },
			{ word: "zenith", definition: "The point in the sky directly above an observer." },
			{ word: "nadir", definition: "The point in the sky directly opposite the zenith." },
			{ word: "cosmology", definition: "The study of the origin and evolution of the universe." },
			{ word: "interstellar", definition: "Existing or traveling between stars." },
			{ word: "planetarium", definition: "A theater or device used to simulate the night sky." },
			{ word: "spectroscopy", definition: "The study of matter by examining its interaction with light.", extraThemes: [ "160" ] }
		]
	},
	"160": {
		defaultType: "n",
		entries: [
			{ word: "quantum", definition: "The smallest discrete amount of a physical quantity." },
			{ word: "entropy", definition: "A measure of disorder or energy dispersal in a system." },
			{ word: "relativity", definition: "The theory describing space, time, gravity, and motion." },
			{ word: "momentum", definition: "The quantity of motion equal to mass times velocity." },
			{ word: "velocity", definition: "Speed measured in a specified direction." },
			{ word: "acceleration", definition: "The rate at which velocity changes with time." },
			{ word: "gravity", definition: "The force by which massive bodies attract one another." },
			{ word: "friction", definition: "The force that resists motion between surfaces in contact." },
			{ word: "inertia", definition: "The tendency of matter to resist changes in motion." },
			{ word: "photon", definition: "A quantum particle of electromagnetic radiation." },
			{ word: "neutrino", definition: "A nearly massless particle that interacts only weakly with matter." },
			{ word: "thermodynamics", definition: "The study of heat, energy, work, and temperature." },
			{ word: "superposition", definition: "The combination of states or effects in linear systems." },
			{ word: "interference", definition: "The overlap of waves that produces reinforcement or cancellation." },
			{ word: "diffraction", definition: "The bending and spreading of waves around obstacles." },
			{ word: "resonance", definition: "Strong oscillation produced near a natural frequency." },
			{ word: "kinematics", definition: "The study of motion without considering its causes." },
			{ word: "dynamics", definition: "The study of motion together with the forces that cause it." },
			{ word: "electromagnetism", definition: "The branch of physics dealing with electric and magnetic phenomena." },
			{ word: "wavefunction", definition: "A mathematical description of a quantum state." },
			{ word: "centripetal", definition: "Directed toward the center of a curved path." },
			{ word: "joule", definition: "The SI unit of energy and work." },
			{ word: "newtonian", definition: "Relating to the physical laws described by Isaac Newton." },
			{ word: "oscillation", definition: "Repeated movement around an equilibrium point." },
			{ word: "equilibrium", definition: "A state in which opposing influences balance each other." }
		]
	},
	"490": {
		defaultType: "n",
		entries: [
			{ word: "algorithm", definition: "A finite procedure for solving a problem or performing a computation.", extraThemes: [ "240" ] },
			{ word: "datastructure", definition: "A method of organizing data for efficient access and update." },
			{ word: "compiler", definition: "A program that translates source code into another form." },
			{ word: "interpreter", definition: "A program that executes code directly, usually line by line." },
			{ word: "encryption", definition: "The process of encoding data to keep it secure." },
			{ word: "hashing", definition: "The transformation of data into a fixed-size digest." },
			{ word: "recursion", definition: "A method in which a solution is defined in terms of itself." },
			{ word: "iteration", definition: "Repeated execution of a process or code block." },
			{ word: "automaton", definition: "An abstract machine used to model computation." },
			{ word: "cybersecurity", definition: "The protection of systems, networks, and data from digital attack." },
			{ word: "operatingsystem", definition: "The core software that manages hardware and applications." },
			{ word: "kernel", definition: "The central part of an operating system." },
			{ word: "protocol", definition: "A set of rules governing data communication between systems." },
			{ word: "filesystem", definition: "The method an operating system uses to store and organize files." },
			{ word: "multithreading", definition: "The use of multiple execution threads within one program." },
			{ word: "virtualization", definition: "The creation of virtual versions of computing resources." },
			{ word: "microservice", definition: "A small, independently deployable service in a larger application." },
			{ word: "serialization", definition: "The conversion of data into a format that can be stored or transmitted." },
			{ word: "database", definition: "An organized collection of data that can be queried and updated." },
			{ word: "indexing", definition: "A method of accelerating data retrieval with auxiliary structures." },
			{ word: "caching", definition: "The storage of data for faster repeated access." },
			{ word: "concurrency", definition: "The management of multiple tasks during overlapping periods." },
			{ word: "debugging", definition: "The process of finding and fixing software defects." },
			{ word: "cryptography", definition: "The study and practice of secure communication.", extraThemes: [ "DSCI" ] },
			{ word: "machinelearning", definition: "A branch of computing that learns patterns from data.", extraThemes: [ "DSCI" ] }
		]
	},
	"240": {
		defaultType: "n",
		entries: [
			{ word: "calculus", definition: "The branch of mathematics dealing with change and accumulation." },
			{ word: "algebra", definition: "The branch of mathematics focused on symbols and equations." },
			{ word: "geometry", definition: "The branch of mathematics concerned with shape, size, and space." },
			{ word: "topology", definition: "The study of properties preserved through continuous deformation." },
			{ word: "combinatorics", definition: "The study of counting, arrangement, and discrete structure." },
			{ word: "probability", definition: "The mathematics of chance and uncertainty.", extraThemes: [ "DSCI" ] },
			{ word: "trigonometry", definition: "The study of angles, triangles, and trigonometric functions." },
			{ word: "vector", definition: "A quantity with both magnitude and direction." },
			{ word: "matrix", definition: "A rectangular array of numbers or symbols." },
			{ word: "eigenvalue", definition: "A scalar associated with a matrix transformation." },
			{ word: "integral", definition: "A mathematical object representing accumulation or area." },
			{ word: "derivative", definition: "A measure of instantaneous change of a function." },
			{ word: "theorem", definition: "A statement proven true by logical argument." },
			{ word: "lemma", definition: "A subsidiary proposition used to prove a theorem." },
			{ word: "corollary", definition: "A proposition that follows directly from a proven result." },
			{ word: "polynomial", definition: "An algebraic expression made from sums of powers of variables." },
			{ word: "logarithm", definition: "The exponent needed to produce a number from a given base." },
			{ word: "manifold", definition: "A space that locally resembles ordinary Euclidean space." },
			{ word: "bijection", definition: "A one-to-one and onto correspondence between sets." },
			{ word: "asymptote", definition: "A line that a curve approaches without reaching." },
			{ word: "congruence", definition: "An equivalence relation defined by a modulus." },
			{ word: "factorial", definition: "The product of all positive integers up to a given number." },
			{ word: "arithmetic", definition: "The elementary mathematics of numbers and operations." },
			{ word: "sequence", definition: "An ordered list of numbers or mathematical objects." },
			{ word: "symmetry", definition: "A balanced correspondence of parts under a transformation." }
		]
	},
	DSCI: {
		defaultType: "n",
		entries: [
			{ word: "regression", definition: "A modeling method used to estimate relationships between variables." },
			{ word: "classification", definition: "The assignment of observations to predefined categories." },
			{ word: "clustering", definition: "The grouping of similar observations without preset labels." },
			{ word: "featureengineering", definition: "The creation or refinement of variables for modeling." },
			{ word: "dataset", definition: "A structured collection of data used for analysis." },
			{ word: "trainingdata", definition: "Data used to fit a predictive model." },
			{ word: "validation", definition: "The evaluation of a model during development." },
			{ word: "crossvalidation", definition: "A resampling method for assessing model performance." },
			{ word: "overfitting", definition: "A model error caused by learning noise too closely." },
			{ word: "underfitting", definition: "A model error caused by an overly simple model." },
			{ word: "dimensionality", definition: "The number of features or variables in a dataset." },
			{ word: "embedding", definition: "A dense vector representation that captures relationships in data." },
			{ word: "timeseries", definition: "Data recorded in chronological order." },
			{ word: "bayesian", definition: "Relating to inference with prior and observed evidence." },
			{ word: "inference", definition: "The act of drawing conclusions from evidence and models." },
			{ word: "visualization", definition: "The graphical presentation of data and results." },
			{ word: "pipeline", definition: "A chained workflow for preparing data and fitting models." },
			{ word: "sampling", definition: "The selection of observations from a larger population." },
			{ word: "imputation", definition: "The replacement of missing values with estimated ones." },
			{ word: "outlier", definition: "A data point that differs markedly from the rest." }
		]
	},
	"150": {
		defaultType: "n",
		entries: [
			{ word: "iliad", definition: "An ancient Greek epic about wrath and war at Troy." },
			{ word: "odyssey", definition: "An ancient Greek epic about Odysseus returning home." },
			{ word: "aeneid", definition: "A Roman epic that follows Aeneas after the fall of Troy." },
			{ word: "beowulf", definition: "An Old English epic about a hero battling monsters." },
			{ word: "inferno", definition: "The first part of Dante's Divine Comedy." },
			{ word: "hamlet", definition: "A Shakespeare tragedy about revenge in the Danish court." },
			{ word: "macbeth", definition: "A Shakespeare tragedy about ambition, murder, and guilt." },
			{ word: "othello", definition: "A Shakespeare tragedy centered on jealousy and betrayal." },
			{ word: "kinglear", definition: "A Shakespeare tragedy about family, power, and madness." },
			{ word: "donquixote", definition: "A classic novel about an idealistic knight and his delusions." },
			{ word: "faust", definition: "A literary work about a pact made in pursuit of knowledge." },
			{ word: "frankenstein", definition: "A Gothic novel about creation, science, and responsibility." },
			{ word: "dracula", definition: "A Gothic novel that shaped the modern vampire myth." },
			{ word: "mobydick", definition: "A classic novel about obsession and a white whale." },
			{ word: "warandpeace", definition: "A grand novel of Russian society during the Napoleonic wars." },
			{ word: "annakarenina", definition: "A Tolstoy novel about love, society, and tragedy." },
			{ word: "madamebovary", definition: "A realist novel about desire, illusion, and boredom." },
			{ word: "lesmiserables", definition: "A sweeping novel about justice, mercy, and revolution." },
			{ word: "crimeandpunishment", definition: "A Dostoevsky novel about guilt, punishment, and conscience." },
			{ word: "brotherskaramazov", definition: "A philosophical novel about faith, doubt, and family." },
			{ word: "prideandprejudice", definition: "A classic novel of manners, wit, and romance." },
			{ word: "wutheringheights", definition: "A Gothic novel of revenge and destructive love." },
			{ word: "greatgatsby", definition: "A modern classic about wealth, desire, and illusion." },
			{ word: "beloved", definition: "A Pulitzer-winning novel about memory, slavery, and haunting." },
			{ word: "theoldmanandthesea", definition: "A Pulitzer-winning novella about endurance and dignity." },
			{ word: "midnightschildren", definition: "A Booker-winning novel about identity and postcolonial India." },
			{ word: "onehundredyearsofsolitude", definition: "A landmark novel of family history and magical realism." }
		]
	},
	"30": {
		defaultType: "n",
		entries: [
			{ word: "inflation", definition: "A general rise in prices that lowers purchasing power." },
			{ word: "recession", definition: "A significant decline in economic activity across the economy." },
			{ word: "deflation", definition: "A general fall in prices across an economy." },
			{ word: "gdp", definition: "The total value of goods and services produced in an economy." },
			{ word: "tariff", definition: "A tax imposed on imported goods." },
			{ word: "subsidy", definition: "Financial support given to encourage an economic activity." },
			{ word: "liquidity", definition: "The ease with which an asset can be converted into cash." },
			{ word: "monopoly", definition: "Market control by a single seller or provider." },
			{ word: "oligopoly", definition: "A market dominated by a small number of firms." },
			{ word: "fiscalpolicy", definition: "Government spending and taxation used to influence the economy." },
			{ word: "monetarypolicy", definition: "Central bank actions used to influence money and credit." },
			{ word: "macroeconomics", definition: "The branch of economics dealing with large-scale economic systems." },
			{ word: "microeconomics", definition: "The branch of economics dealing with individual decisions and markets." },
			{ word: "arbitrage", definition: "Profit from price differences in different markets." },
			{ word: "austerity", definition: "Policies aimed at reducing public spending and debt." },
			{ word: "bankruptcy", definition: "A legal state in which debts cannot be repaid." },
			{ word: "insolvency", definition: "The condition of being unable to meet financial obligations." },
			{ word: "equity", definition: "Ownership value or a stake in an asset or company." },
			{ word: "dividend", definition: "A payment distributed to shareholders from company profits." },
			{ word: "bond", definition: "A debt security issued to raise money." },
			{ word: "stockmarket", definition: "A market where shares of public companies are traded." },
			{ word: "unemployment", definition: "The state of being without work while seeking employment." },
			{ word: "stagflation", definition: "A mix of stagnation, inflation, and weak growth." },
			{ word: "supplychain", definition: "The network involved in producing and distributing goods." },
			{ word: "demandcurve", definition: "A graph showing quantity demanded at different prices." }
		]
	},
	"310": {
		defaultType: "n",
		entries: [
			{ word: "phonetics", definition: "The study of the physical sounds of speech." },
			{ word: "phonology", definition: "The study of sound systems in language." },
			{ word: "morphology", definition: "The study of word structure and formation." },
			{ word: "syntax", definition: "The study of how words combine into sentences." },
			{ word: "semantics", definition: "The study of meaning in language." },
			{ word: "pragmatics", definition: "The study of meaning in context and use." },
			{ word: "orthography", definition: "The conventional spelling system of a language." },
			{ word: "etymology", definition: "The study of word origins and historical change." },
			{ word: "lexicon", definition: "The vocabulary of a language or speaker." },
			{ word: "corpus", definition: "A structured body of language data used for study." },
			{ word: "allophone", definition: "A phonetic variant of a phoneme." },
			{ word: "phoneme", definition: "The smallest contrastive sound unit in a language." },
			{ word: "morpheme", definition: "The smallest unit of meaning or grammatical function." },
			{ word: "grapheme", definition: "The smallest functional unit of a writing system." },
			{ word: "diglossia", definition: "The coexistence of high and low language varieties." },
			{ word: "bilingualism", definition: "The regular use of two languages." },
			{ word: "multilingualism", definition: "The regular use of several languages." },
			{ word: "sociolinguistics", definition: "The study of language in society and social context." },
			{ word: "psycholinguistics", definition: "The study of language processing in the mind." },
			{ word: "diachronic", definition: "Relating to language change over time." },
			{ word: "synchronic", definition: "Relating to language at a particular point in time." },
			{ word: "inflection", definition: "A grammatical change in form expressing function." },
			{ word: "derivation", definition: "The formation of new words from existing bases." },
			{ word: "prosody", definition: "Rhythm, stress, and intonation in speech." },
			{ word: "register", definition: "A variety of language associated with a situation or field." }
		]
	},
	"350": {
		defaultType: "n",
		entries: [
			{ word: "touchdown", definition: "A scoring play worth six points in American football." },
			{ word: "homerun", definition: "A baseball hit that allows the batter to score directly." },
			{ word: "hattrick", definition: "Three goals or equivalent scores by one player in one game." },
			{ word: "offside", definition: "A rule violation involving illegal positioning in team sports." },
			{ word: "penaltykick", definition: "A direct kick awarded from the penalty spot in soccer." },
			{ word: "freethrow", definition: "An uncontested basketball shot awarded after certain fouls." },
			{ word: "slamdunk", definition: "A forceful basketball shot made directly through the hoop." },
			{ word: "buzzerbeater", definition: "A shot made just before the game clock expires." },
			{ word: "overtime", definition: "An extra period used to decide a tied game." },
			{ word: "bullpen", definition: "The area where relief pitchers warm up in baseball." },
			{ word: "ace", definition: "A top starting pitcher or an unreturnable serve." },
			{ word: "relay", definition: "A race in which teammates run or swim in sequence." },
			{ word: "backhand", definition: "A stroke made from the reverse side of the hand." },
			{ word: "forehand", definition: "A stroke made from the palm-side of the hand." },
			{ word: "knockout", definition: "A victory that ends a bout by rendering the opponent unable to continue." },
			{ word: "marathon", definition: "A long-distance running race of 42.195 kilometers." },
			{ word: "triathlon", definition: "A multisport race consisting of swimming, cycling, and running." },
			{ word: "goalkeeper", definition: "The player who defends the goal in soccer or hockey." },
			{ word: "striker", definition: "An attacking soccer player whose main job is scoring." },
			{ word: "midfielder", definition: "A soccer player who links defense and attack." },
			{ word: "dribble", definition: "To move a ball with repeated controlled touches." },
			{ word: "layup", definition: "A close-range basketball shot taken near the basket." },
			{ word: "rebound", definition: "Gaining possession after a missed basketball shot." },
			{ word: "wicket", definition: "The target or pitch-related term used in cricket." },
			{ word: "birdie", definition: "A golf score of one under par on a hole." }
		]
	},
	"1001": {
		defaultType: "n",
		entries: [
			{ word: "unitedstates", definition: "A country in North America composed of fifty states.", extraThemes: [ "e15" ] },
			{ word: "unitedkingdom", definition: "A country made up of England, Scotland, Wales, and Northern Ireland.", extraThemes: [ "e15" ] },
			{ word: "canada", definition: "A country in North America known for its vast land area.", extraThemes: [ "e15" ] },
			{ word: "mexico", definition: "A country in North America between the United States and Central America.", extraThemes: [ "e15" ] },
			{ word: "brazil", definition: "The largest country in South America.", extraThemes: [ "e15" ] },
			{ word: "argentina", definition: "A South American country known for Buenos Aires and football.", extraThemes: [ "e15" ] },
			{ word: "england", definition: "A country that forms the largest part of the United Kingdom.", extraThemes: [ "e15" ] },
			{ word: "france", definition: "A European country known for Paris and its cultural influence.", extraThemes: [ "e15" ] },
			{ word: "germany", definition: "A central European country with a major industrial economy.", extraThemes: [ "e15" ] },
			{ word: "italy", definition: "A European country known for Rome, art, and cuisine.", extraThemes: [ "e15" ] },
			{ word: "spain", definition: "A European country on the Iberian Peninsula.", extraThemes: [ "e15" ] },
			{ word: "portugal", definition: "A European country on the western Iberian coast.", extraThemes: [ "e15" ] },
			{ word: "poland", definition: "A central European country with Warsaw as its capital.", extraThemes: [ "e15" ] },
			{ word: "greece", definition: "A southeastern European country with a long classical history.", extraThemes: [ "e15" ] },
			{ word: "egypt", definition: "A country in northeastern Africa centered on the Nile.", extraThemes: [ "e15" ] },
			{ word: "nigeria", definition: "A populous West African country.", extraThemes: [ "e15" ] },
			{ word: "southafrica", definition: "A country at the southern tip of Africa.", extraThemes: [ "e15" ] },
			{ word: "ethiopia", definition: "A country in the Horn of Africa with a long recorded history.", extraThemes: [ "e15" ] },
			{ word: "kenya", definition: "An East African country known for wildlife and distance running.", extraThemes: [ "e15" ] },
			{ word: "india", definition: "A large South Asian country with a vast population.", extraThemes: [ "e15" ] },
			{ word: "china", definition: "An East Asian country with one of the world's oldest civilizations.", extraThemes: [ "e15" ] },
			{ word: "japan", definition: "An East Asian island country in the Pacific.", extraThemes: [ "e15" ] },
			{ word: "southkorea", definition: "An East Asian country on the southern half of the Korean Peninsula.", extraThemes: [ "e15" ] },
			{ word: "australia", definition: "A country and continent in the southern hemisphere.", extraThemes: [ "e15" ] },
			{ word: "newzealand", definition: "An island country in the southwestern Pacific Ocean.", extraThemes: [ "e15" ] }
		]
	},
	NBAP: {
		defaultType: "INJEONG",
		entries: [
			{ word: "lebronjames", definition: "LeBron James debuted in 2003 and became a four-time NBA champion and four-time MVP." },
			{ word: "stephencurry", definition: "Stephen Curry debuted in 2009 and transformed the NBA with his long-range shooting for Golden State." },
			{ word: "kevindurant", definition: "Kevin Durant debuted in 2007 and became an MVP scorer with multiple championships." },
			{ word: "giannisantetokounmpo", definition: "Giannis Antetokounmpo debuted in 2013 and became a two-time MVP and NBA champion." },
			{ word: "nikolajokic", definition: "Nikola Jokic debuted in 2015 and became a multiple-time MVP center for Denver." },
			{ word: "lukadoncic", definition: "Luka Doncic debuted in 2018 and quickly became an All-NBA playmaker and scorer." },
			{ word: "joelembiid", definition: "Joel Embiid debuted in 2014 and won the 2023 NBA MVP." },
			{ word: "jaysontatum", definition: "Jayson Tatum debuted in 2017 and became Boston's franchise scoring star." },
			{ word: "kawhileonard", definition: "Kawhi Leonard debuted in 2011 and won Finals MVP with two different franchises." },
			{ word: "jimmybutler", definition: "Jimmy Butler debuted in 2011 and became known for elite playoff performances." },
			{ word: "damianlillard", definition: "Damian Lillard debuted in 2012 and became famous for deep shooting and clutch scoring." },
			{ word: "anthonydavis", definition: "Anthony Davis debuted in 2012 and won an NBA title with the Lakers." },
			{ word: "kyrieirving", definition: "Kyrie Irving debuted in 2011 and hit the title-clinching shot in the 2016 Finals." },
			{ word: "jamesharden", definition: "James Harden debuted in 2009 and won the 2018 NBA MVP." },
			{ word: "russellwestbrook", definition: "Russell Westbrook debuted in 2008 and averaged a triple-double in multiple seasons." },
			{ word: "chrispaul", definition: "Chris Paul debuted in 2005 and became one of the defining point guards of his era." },
			{ word: "paulgeorge", definition: "Paul George debuted in 2010 and became a multiple-time All-Star wing." },
			{ word: "devinbooker", definition: "Devin Booker debuted in 2015 and became Phoenix's leading scoring star." },
			{ word: "jamorant", definition: "Ja Morant debuted in 2019 and won Rookie of the Year in 2020." },
			{ word: "anthonyedwards", definition: "Anthony Edwards debuted in 2020 and became Minnesota's explosive young star." },
			{ word: "shaigilgeousalexander", definition: "Shai Gilgeous-Alexander debuted in 2018 and became an MVP-level guard for Oklahoma City." },
			{ word: "jalenbrunson", definition: "Jalen Brunson debuted in 2018 and became the lead guard for New York." },
			{ word: "tyresehaliburton", definition: "Tyrese Haliburton debuted in 2020 and became an elite passing guard for Indiana." },
			{ word: "victorwembanyama", definition: "Victor Wembanyama debuted in 2023 and became known for rare size and skill." },
			{ word: "kobebryant", definition: "Kobe Bryant debuted in 1996 and won five NBA titles with the Lakers." },
			{ word: "michaeljordan", definition: "Michael Jordan debuted in 1984 and won six NBA titles with Chicago." },
			{ word: "timduncan", definition: "Tim Duncan debuted in 1997 and won five NBA titles with San Antonio." },
			{ word: "shaquilleoneal", definition: "Shaquille O'Neal debuted in 1992 and won four NBA titles as a dominant center." },
			{ word: "dirknowitzki", definition: "Dirk Nowitzki debuted in 1998 and led Dallas to a championship." },
			{ word: "dwyanewade", definition: "Dwyane Wade debuted in 2003 and won three NBA titles with Miami." },
			{ word: "kevingarnett", definition: "Kevin Garnett debuted in 1995 and won MVP and an NBA title." },
			{ word: "alleniverson", definition: "Allen Iverson debuted in 1996 and won the 2001 NBA MVP." },
			{ word: "magicjohnson", definition: "Magic Johnson debuted in 1979 and won five NBA titles with the Lakers." },
			{ word: "larrybird", definition: "Larry Bird debuted in 1979 and won three straight MVP awards." },
			{ word: "kareemabduljabbar", definition: "Kareem Abdul-Jabbar debuted in 1969 and won six MVP awards and six titles." }
		]
	},
	SOCP: {
		defaultType: "INJEONG",
		entries: [
			{ word: "lionelmessi", definition: "Lionel Messi debuted in 2004 and won multiple Ballon d'Or awards and a World Cup." },
			{ word: "cristianoronaldo", definition: "Cristiano Ronaldo debuted in 2002 and became one of football's all-time leading scorers." },
			{ word: "neymar", definition: "Neymar debuted in 2009 and became Brazil's record scorer." },
			{ word: "kylianmbappe", definition: "Kylian Mbappe debuted in 2015 and won the 2018 World Cup with France." },
			{ word: "erlinghaaland", definition: "Erling Haaland debuted in 2017 and became one of Europe's most prolific strikers." },
			{ word: "kevindebruyne", definition: "Kevin De Bruyne debuted in 2008 and became one of the best attacking midfielders of his era." },
			{ word: "mohamedsalah", definition: "Mohamed Salah debuted in 2010 and became Liverpool's modern scoring icon." },
			{ word: "robertlewandowski", definition: "Robert Lewandowski debuted in 2006 and became one of Europe's most reliable scorers." },
			{ word: "karimbenzema", definition: "Karim Benzema debuted in 2004 and won the 2022 Ballon d'Or." },
			{ word: "lukamodric", definition: "Luka Modric debuted in 2003 and won the 2018 Ballon d'Or." },
			{ word: "tonikroos", definition: "Toni Kroos debuted in 2007 and won multiple Champions League titles." },
			{ word: "andresiniesta", definition: "Andres Iniesta debuted in 2002 and scored Spain's 2010 World Cup winner." },
			{ word: "xavi", definition: "Xavi debuted in 1998 and became Barcelona's midfield metronome." },
			{ word: "zinedinezidane", definition: "Zinedine Zidane debuted in 1989 and won the 1998 World Cup with France." },
			{ word: "ronaldinho", definition: "Ronaldinho debuted in 1998 and became famous for flair and a Ballon d'Or." },
			{ word: "ronaldonazario", definition: "Ronaldo Nazario debuted in 1993 and won two Ballon d'Or awards." },
			{ word: "pele", definition: "Pele debuted in 1956 and won three World Cups with Brazil." },
			{ word: "maradona", definition: "Diego Maradona debuted in 1976 and inspired Argentina to the 1986 World Cup title." },
			{ word: "johancruyff", definition: "Johan Cruyff debuted in 1964 and shaped modern football as player and coach." },
			{ word: "davidbeckham", definition: "David Beckham debuted in 1992 and became a global icon for club and country." },
			{ word: "thierryhenry", definition: "Thierry Henry debuted in 1994 and became Arsenal's record scorer." },
			{ word: "kaka", definition: "Kaka debuted in 2001 and won the 2007 Ballon d'Or." },
			{ word: "luissuarez", definition: "Luis Suarez debuted in 2005 and became one of Uruguay's greatest scorers." },
			{ word: "garethbale", definition: "Gareth Bale debuted in 2006 and starred in multiple Real Madrid title runs." },
			{ word: "waynerooney", definition: "Wayne Rooney debuted in 2002 and became Manchester United's record scorer." },
			{ word: "sergioramos", definition: "Sergio Ramos debuted in 2004 and won the World Cup and multiple Champions League titles." },
			{ word: "ikercasillas", definition: "Iker Casillas debuted in 1999 and captained Spain to World Cup glory." },
			{ word: "gianluigibuffon", definition: "Gianluigi Buffon debuted in 1995 and became one of football's great goalkeepers." },
			{ word: "manuelneuer", definition: "Manuel Neuer debuted in 2005 and redefined sweeping goalkeeper play." },
			{ word: "virgilvandijk", definition: "Virgil van Dijk debuted in 2011 and anchored Liverpool's defense to major titles." }
		]
	},
	"410": {
		defaultType: "n",
		entries: [
			{ word: "theology", definition: "The study of the divine and religious belief." },
			{ word: "liturgy", definition: "The fixed forms used in public worship." },
			{ word: "scripture", definition: "Sacred writings regarded as authoritative in a religion." },
			{ word: "gospel", definition: "A sacred text or message of religious teaching." },
			{ word: "psalm", definition: "A sacred song or poem used in worship." },
			{ word: "torah", definition: "The foundational sacred text of Judaism." },
			{ word: "talmud", definition: "A central collection of Jewish law and commentary." },
			{ word: "quran", definition: "The holy book of Islam." },
			{ word: "hadith", definition: "Reports describing the sayings and actions of Muhammad." },
			{ word: "sutra", definition: "A concise sacred text in several Asian religious traditions." },
			{ word: "mantra", definition: "A sacred utterance or phrase used in ritual or meditation." },
			{ word: "nirvana", definition: "A state of liberation from suffering in Buddhism." },
			{ word: "samsara", definition: "The cycle of death and rebirth in Indian religions." },
			{ word: "moksha", definition: "Liberation from the cycle of rebirth in Hindu thought." },
			{ word: "karma", definition: "The principle that actions shape future outcomes." },
			{ word: "dharma", definition: "A principle of duty, law, or right order." },
			{ word: "pilgrimage", definition: "A journey made for religious devotion." },
			{ word: "sacrament", definition: "A sacred rite regarded as a channel of grace." },
			{ word: "communion", definition: "A Christian sacramental act of sharing consecrated bread and wine." },
			{ word: "baptism", definition: "A religious rite of initiation using water." },
			{ word: "exegesis", definition: "Critical interpretation of a sacred text." },
			{ word: "monotheism", definition: "Belief in a single deity." },
			{ word: "polytheism", definition: "Belief in many deities." },
			{ word: "pantheism", definition: "The view that the divine is identical with the universe." },
			{ word: "denomination", definition: "A recognized branch within a religious tradition." }
		]
	},
	"100": {
		defaultType: "n",
		entries: [
			{ word: "infantry", definition: "Soldiers who fight primarily on foot." },
			{ word: "artillery", definition: "Large-caliber weapons used for long-range fire." },
			{ word: "cavalry", definition: "Mounted troops or their armored modern equivalent." },
			{ word: "battalion", definition: "A military unit made of several companies." },
			{ word: "brigade", definition: "A large military formation composed of several battalions." },
			{ word: "platoon", definition: "A military unit smaller than a company." },
			{ word: "squadron", definition: "A unit of aircraft, cavalry, or naval vessels." },
			{ word: "destroyer", definition: "A fast warship designed to escort and defend fleets." },
			{ word: "frigate", definition: "A warship used mainly for escort and patrol duties." },
			{ word: "carrier", definition: "A large warship built to deploy military aircraft." },
			{ word: "submarine", definition: "A vessel capable of operating underwater." },
			{ word: "logistics", definition: "The movement and support of troops and supplies." },
			{ word: "ammunition", definition: "Projectiles and explosive charges used by weapons." },
			{ word: "camouflage", definition: "Concealment achieved by blending with surroundings." },
			{ word: "reconnaissance", definition: "Military observation to gather information about an enemy." },
			{ word: "insurgency", definition: "An organized rebellion against established authority." },
			{ word: "armistice", definition: "A formal agreement to stop fighting." },
			{ word: "garrison", definition: "Troops stationed in a particular place." },
			{ word: "doctrine", definition: "A set of principles guiding military action." },
			{ word: "skirmish", definition: "A minor or brief fight between forces." },
			{ word: "ceasefire", definition: "A temporary suspension of hostilities." },
			{ word: "detachment", definition: "A small unit separated for a specific duty." },
			{ word: "sortie", definition: "A sudden attack or mission by troops or aircraft." },
			{ word: "paratrooper", definition: "A soldier trained to enter battle by parachute." },
			{ word: "ordnance", definition: "Military weapons, ammunition, and related equipment." }
		]
	},
	"370": {
		defaultType: "n",
		entries: [
			{ word: "anatomy", definition: "The study of bodily structure." },
			{ word: "physiology", definition: "The study of bodily function." },
			{ word: "pathology", definition: "The study of disease and its effects." },
			{ word: "oncology", definition: "The branch of medicine dealing with cancer." },
			{ word: "cardiology", definition: "The branch of medicine dealing with the heart." },
			{ word: "neurology", definition: "The branch of medicine dealing with the nervous system." },
			{ word: "epidemiology", definition: "The study of disease patterns in populations." },
			{ word: "immunology", definition: "The study of immune systems and responses." },
			{ word: "pediatrics", definition: "Medical care relating to infants and children." },
			{ word: "geriatrics", definition: "Medical care relating to older adults." },
			{ word: "radiology", definition: "The medical use of imaging to diagnose and treat disease." },
			{ word: "biopsy", definition: "The removal of tissue for medical examination." },
			{ word: "diagnosis", definition: "The identification of a disease or condition." },
			{ word: "prognosis", definition: "A forecast of the likely course of a disease." },
			{ word: "antibiotic", definition: "A drug used to treat bacterial infection." },
			{ word: "vaccine", definition: "A preparation that stimulates immune protection." },
			{ word: "syndrome", definition: "A set of symptoms that occur together." },
			{ word: "sepsis", definition: "A dangerous bodywide response to infection." },
			{ word: "insulin", definition: "A hormone that regulates blood sugar." },
			{ word: "anesthesia", definition: "Controlled loss of sensation during medical procedures." },
			{ word: "triage", definition: "The sorting of patients by urgency of treatment." },
			{ word: "transfusion", definition: "The transfer of blood or blood components into a patient." },
			{ word: "metabolism", definition: "The chemical processes that sustain life in an organism." },
			{ word: "pathogen", definition: "A microorganism that can cause disease." },
			{ word: "virology", definition: "The study of viruses and viral disease." }
		]
	}
};

function mergeSubjectSeedMap(extraSeedMap){
	Object.keys(extraSeedMap).forEach(function(subject){
		if(!SUBJECT_SEEDS[subject]){
			throw new Error("Unknown subject for extra English seed: " + subject);
		}
		SUBJECT_SEEDS[subject].entries = SUBJECT_SEEDS[subject].entries.concat(extraSeedMap[subject]);
	});
}

mergeSubjectSeedMap(EXTRA_SUBJECT_SEEDS);
mergeSubjectSeedMap(EXTRA_SUBJECT_SEEDS_MORE);
mergeSubjectSeedMap(EXTRA_SUBJECT_SEEDS_MASSIVE);

function serializeMean(definition){
	if(!definition) return "";
	return [
		TOP_MARK + "1" + TOP_MARK,
		MID_OPEN + "1" + MID_CLOSE,
		LOW_OPEN + "1" + LOW_CLOSE,
		definition.trim()
	].join("");
}

function splitThemes(theme){
	return String(theme || "")
		.split(",")
		.map(function(item){ return item.trim(); })
		.filter(Boolean);
}

function joinThemes(themes){
	return Array.from(new Set(themes.filter(Boolean))).join(",");
}

function ensureLettersOnly(word){
	if(!/^[a-z0-9 ]+$/i.test(word)){
		throw new Error("Invalid English DB seed word (letters, digits, and spaces only): " + word);
	}
}

function normalizeEntry(subject, entry, defaults){
	if(typeof entry === "string"){
		entry = { word: entry };
	}
	entry = Object.assign({}, entry);
	entry.word = String(entry.word || "").toLowerCase().replace(/\s+/g, " ").trim();
	entry.type = entry.type || defaults.defaultType;
	entry.extraThemes = Array.isArray(entry.extraThemes) ? entry.extraThemes.slice() : [];
	entry.themeList = [ subject ].concat(entry.extraThemes);
	entry.mean = defaults.noDefinition ? "" : serializeMean(entry.definition || "");
	entry.flag = entry.flag != null ? entry.flag : (entry.type === "INJEONG" ? 2 : 0);
	ensureLettersOnly(entry.word);
	return entry;
}

function allSeedEntries(){
	var rows = [];
	Object.keys(SUBJECT_SEEDS).forEach(function(subject){
		var defaults = SUBJECT_SEEDS[subject];
		defaults.entries.forEach(function(entry){
			rows.push(normalizeEntry(subject, entry, defaults));
		});
	});
	return rows;
}

async function loadExistingWords(client){
	var q = await client.query("SELECT _id, type, mean, theme, flag, hit FROM kkutu_en");
	var map = new Map();

	q.rows.forEach(function(row){
		map.set(row._id, row);
	});
	return map;
}

function planThemeCleanup(existingMap){
	var updates = [];

	existingMap.forEach(function(row){
		var currentThemes = splitThemes(row.theme);
		var nextThemes = currentThemes.slice();
		var removed = [];
		var id = String(row._id || "");

		if(currentThemes.includes("e15") && id.length <= 2 && !PLACE_NAME_KEEP.has(id)){
			nextThemes = nextThemes.filter(function(theme){ return theme !== "e15"; });
			removed.push("e15");
		}else if(currentThemes.includes("e15") && PLACE_NAME_REMOVE.has(id)){
			nextThemes = nextThemes.filter(function(theme){ return theme !== "e15"; });
			removed.push("e15");
		}
		if(currentThemes.includes("1001") && id.length <= 2 && !COUNTRY_KEEP.has(id)){
			nextThemes = nextThemes.filter(function(theme){ return theme !== "1001"; });
			removed.push("1001");
		}
		nextThemes = Array.from(new Set(nextThemes));
		if(joinThemes(currentThemes) === joinThemes(nextThemes)) return;
		row.theme = joinThemes(nextThemes);
		updates.push({
			id: id,
			theme: row.theme,
			removedThemes: removed
		});
	});
	return updates;
}

function planSeedOperations(existingMap){
	var inserts = [];
	var updates = [];
	var pendingInserts = new Set();

	allSeedEntries().forEach(function(seed){
		var current = existingMap.get(seed.word);
		var mergedThemes;

		if(current){
			mergedThemes = joinThemes(splitThemes(current.theme).concat(seed.themeList));
			if(mergedThemes !== joinThemes(splitThemes(current.theme))){
				current.theme = mergedThemes;
				if(!pendingInserts.has(seed.word)) updates.push({
					id: seed.word,
					theme: mergedThemes,
					addedThemes: seed.themeList
				});
			}
			return;
		}
		current = {
			_id: seed.word,
			type: seed.type,
			mean: seed.mean,
			theme: joinThemes(seed.themeList),
			flag: seed.flag,
			hit: 0
		};
		inserts.push(current);
		existingMap.set(seed.word, current);
		pendingInserts.add(seed.word);
	});

	return {
		inserts: inserts,
		updates: updates
	};
}

function countPlannedEmptyEnglish(existingMap){
	var count = 0;

	existingMap.forEach(function(row){
		var theme = String(row.theme || "").trim();
		var mean = String(row.mean || "").trim();
		if(!theme && !mean) count++;
	});
	return count;
}

async function applyThemeUpdates(client, updates){
	for(var i = 0; i < updates.length; i++){
		await client.query("UPDATE kkutu_en SET theme = $2 WHERE _id = $1", [
			updates[i].id,
			updates[i].theme
		]);
	}
}

async function applyInserts(client, inserts){
	for(var i = 0; i < inserts.length; i++){
		await client.query(
			"INSERT INTO kkutu_en (_id, type, mean, hit, theme, flag) VALUES ($1, $2, $3, $4, $5, $6)",
			[
				inserts[i]._id,
				inserts[i].type,
				inserts[i].mean,
				inserts[i].hit,
				inserts[i].theme,
				inserts[i].flag
			]
		);
	}
}

async function deleteEmptyEnglish(client){
	var q = await client.query(
		"DELETE FROM kkutu_en WHERE COALESCE(BTRIM(theme), '') = '' AND COALESCE(BTRIM(mean), '') = ''"
	);
	return q.rowCount;
}

async function deleteKoreanWords(client){
	var q = await client.query("DELETE FROM kkutu_ko");
	return q.rowCount;
}

async function countTable(client, tableName){
	var q = await client.query("SELECT COUNT(*)::int AS count FROM " + tableName);
	return q.rows[0].count;
}

async function countTheme(client, theme){
	var q = await client.query(
		"SELECT COUNT(*)::int AS count FROM kkutu_en WHERE string_to_array(COALESCE(theme, ''), ',') @> ARRAY[$1]",
		[ theme ]
	);
	return q.rows[0].count;
}

async function main(){
	var client = await pool.connect();
	var existingMap;
	var cleanupUpdates;
	var seedPlan;
	var deleteEnglishCount;
	var summary;
	var subjectCodes = [
		"MINC", "STA", "450", "160", "490", "240", "DSCI", "150", "30", "310", "350",
		"1001", "POK", "NBAP", "SOCP", "410", "100", "370", "FORT", "VALO", "PUBG",
		"APEX", "OVW"
	];

	try{
		existingMap = await loadExistingWords(client);
		cleanupUpdates = planThemeCleanup(existingMap);
		seedPlan = planSeedOperations(existingMap);
		deleteEnglishCount = countPlannedEmptyEnglish(existingMap);

		summary = {
			mode: APPLY ? "apply" : "dry-run",
			cleanupThemeUpdates: cleanupUpdates.length,
			seedThemeUpdates: seedPlan.updates.length,
			seedInserts: seedPlan.inserts.length,
			deleteEmptyEnglish: deleteEnglishCount,
			deleteAllKoreanRows: APPLY ? await countTable(client, "kkutu_ko") : null,
			subjectCountsAfterPlan: {}
		};
		await Promise.all(subjectCodes.map(async function(theme){
			summary.subjectCountsAfterPlan[theme] = APPLY ? await countTheme(client, theme) : null;
		}));

		if(!APPLY){
			console.log(JSON.stringify(summary, null, 2));
			console.log("SAMPLE_CLEANUP_UPDATES");
			console.log(JSON.stringify(cleanupUpdates.slice(0, 60), null, 2));
			console.log("SAMPLE_THEME_UPDATES");
			console.log(JSON.stringify(seedPlan.updates.slice(0, 60), null, 2));
			console.log("SAMPLE_INSERTS");
			console.log(JSON.stringify(seedPlan.inserts.slice(0, 80), null, 2));
			return;
		}

		await client.query("BEGIN");
		await applyThemeUpdates(client, cleanupUpdates);
		await applyThemeUpdates(client, seedPlan.updates);
		await applyInserts(client, seedPlan.inserts);
		summary.deleteEmptyEnglish = await deleteEmptyEnglish(client);
		summary.deleteAllKoreanRows = await deleteKoreanWords(client);
		await client.query("COMMIT");

		summary.englishRowCount = await countTable(client, "kkutu_en");
		summary.koreanRowCount = await countTable(client, "kkutu_ko");
		await Promise.all(subjectCodes.map(async function(theme){
			summary.subjectCountsAfterPlan[theme] = await countTheme(client, theme);
		}));

		console.log(JSON.stringify(summary, null, 2));
	} catch(err){
		try{
			if(APPLY) await client.query("ROLLBACK");
		} catch(rollbackErr){
			console.error("ROLLBACK_FAILED", rollbackErr);
		}
		throw err;
	} finally{
		client.release();
		await pool.end();
	}
}

if(require.main === module) main().catch(function(err){
	console.error(err);
	process.exit(1);
});
module.exports = { allSeedEntries, planThemeCleanup, planSeedOperations, countPlannedEmptyEnglish };
