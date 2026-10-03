"use strict";

function terms(words, definition){
	return words.map(function(word){
		return { word: word, definition: definition };
	});
}

const ANIME = terms([
	"dragon ball", "dragon ball z", "naruto", "naruto shippuden", "one piece", "bleach",
	"attack on titan", "demon slayer", "jujutsu kaisen", "my hero academia", "death note",
	"fullmetal alchemist", "fullmetal alchemist brotherhood", "neon genesis evangelion",
	"cowboy bebop", "sailor moon", "pokemon the series", "digimon adventure", "yu gi oh",
	"one punch man", "mob psycho 100", "hunter x hunter", "fairy tail", "black clover",
	"chainsaw man", "spy x family", "tokyo ghoul", "code geass", "steins gate",
	"fate stay night", "fate zero", "sword art online", "re zero", "konosuba",
	"violet evergarden", "your lie in april", "clannad", "toradora", "kaguya sama love is war",
	"haikyu", "blue lock", "slam dunk", "kuroko no basket", "yuri on ice",
	"akira", "spirited away", "princess mononoke", "my neighbor totoro", "howls moving castle",
	"grave of the fireflies", "your name", "weathering with you", "suzume", "a silent voice",
	"ghost in the shell", "perfect blue", "paprika", "summer wars", "wolf children",
	"the girl who leapt through time", "made in abyss", "mushoku tensei", "overlord",
	"that time i got reincarnated as a slime", "the rising of the shield hero", "no game no life",
	"gurren lagann", "kill la kill", "madoka magica", "soul eater", "fire force",
	"dr stone", "food wars", "the promised neverland", "vinland saga", "berserk",
	"monster", "pluto", "parasyte", "erased", "banana fish", "trigun", "hellsing",
	"black lagoon", "samurai champloo", "inuyasha", "ranma one half", "urusei yatsura",
	"jojos bizarre adventure", "detective conan", "case closed", "gintama", "d gray man",
	"cardcaptor sakura", "fruits basket", "ouran high school host club", "maid sama",
	"nichijou", "azumanga daioh", "lucky star", "k on", "love live", "oshi no ko"
], "Japanese anime work.");

const COD = [
	{ word: "call of duty modern warfare", definition: "Call of Duty subseries focused on modern military conflict." },
	{ word: "call of duty black ops", definition: "Call of Duty subseries focused on covert operations." },
	{ word: "call of duty warzone", definition: "Free-to-play Call of Duty battle royale game." },
	{ word: "call of duty zombies", definition: "Cooperative zombie survival mode in Call of Duty." }
].concat(terms([
	"call of duty", "call of duty 2", "call of duty 3", "call of duty 4 modern warfare",
	"call of duty world at war", "call of duty modern warfare 2", "call of duty black ops",
	"call of duty modern warfare 3", "call of duty black ops ii", "call of duty ghosts",
	"call of duty advanced warfare", "call of duty black ops iii", "call of duty infinite warfare",
	"call of duty wwii", "call of duty black ops 4", "call of duty modern warfare 2019",
	"call of duty black ops cold war", "call of duty vanguard", "call of duty modern warfare ii",
	"call of duty modern warfare iii", "call of duty black ops 6", "call of duty mobile",
	"call of duty warzone mobile"
], "Call of Duty video game.")).concat(terms([
	"captain price", "john price", "soap mactavish", "simon ghost riley", "gaz",
	"alex mason", "frank woods", "viktor reznov", "jason hudson", "raul menendez",
	"vladimir makarov", "general shepherd", "farah karim", "russell adler", "nikolai belinski",
	"takeo masaki", "tank dempsey", "edward richtofen"
], "Call of Duty character.")).concat(terms([
	"nuketown", "shipment", "rust", "terminal", "highrise", "crash", "vacant", "firing range",
	"hijacked", "raid", "standoff", "summit", "slums", "favela", "shoot house", "dome",
	"crossfire", "killhouse", "verdansk", "rebirth island", "alcatraz", "urzikstan"
], "Call of Duty map or location.")).concat(terms([
	"prestige mode", "killstreak", "scorestreak", "loadout drop", "gunsmith", "create a class",
	"hardpoint", "domination", "team deathmatch", "search and destroy", "free for all",
	"headquarters", "capture the flag", "gun game", "infected", "prop hunt", "dead silence",
	"juggernaut", "juggernog", "pack a punch", "mystery box"
], "Call of Duty gameplay term."));

COD.push.apply(COD, terms([
	"call of duty finest hour", "call of duty big red one", "call of duty roads to victory",
	"call of duty world at war final fronts", "call of duty classic", "call of duty modern warfare remastered",
	"call of duty black ops declassified", "call of duty online", "call of duty strike team",
	"call of duty heroes", "call of duty warzone 2"
], "Call of Duty video game."));

COD.push.apply(COD, terms([
	"ambush", "backlot", "bog", "countdown", "creek", "district", "downpour", "overgrown",
	"pipeline", "showdown", "strike", "wet work", "broadcast", "chinatown", "kandor hideout",
	"afghan", "derail", "estate", "invasion", "karachi", "quarry", "rundown", "scrapyard",
	"skidrow", "sub base", "underpass", "wasteland", "array", "cracked", "crisis", "grid",
	"hanoi", "havana", "jungle", "launch", "radiation", "villa", "wmd", "carrier",
	"drone", "express", "meltdown", "plaza", "turbine", "yemen", "combine", "evac",
	"fringe", "hunted", "redwood", "stronghold"
], "Call of Duty multiplayer map."));

COD.push.apply(COD, terms([
	"nacht der untoten", "verruckt", "shi no numa", "der riese", "kino der toten",
	"ascension", "call of the dead", "shangri la", "moon", "origins", "mob of the dead",
	"buried", "shadows of evil", "der eisendrache", "zetsubou no shima", "gorod krovi",
	"revelations", "blood of the dead", "die maschine", "firebase z", "mauer der toten",
	"forsaken", "liberty falls", "terminus"
], "Call of Duty Zombies map."));

COD.push.apply(COD, terms([
	"quick revive", "speed cola", "double tap root beer", "stamin up", "phd flopper",
	"deadshot daiquiri", "mule kick", "tombstone soda", "widows wine", "elemental pop",
	"death perception"
], "Call of Duty Zombies perk."));

COD.push.apply(COD, terms([
	"uav", "counter uav", "care package", "predator missile", "precision airstrike",
	"harrier strike", "chopper gunner", "ac 130", "tactical nuke", "sentry gun",
	"napalm strike", "rc xd", "attack dogs", "vtol jet", "gunship", "cruise missile"
], "Call of Duty scorestreak or killstreak."));

const MUTH = [
	{ word: "solfege", definition: "A music-theory system for naming scale degrees by syllable." },
	{ word: "circle of fifths", definition: "A music-theory diagram showing key relationships by fifths." }
].concat(terms([
	"music theory", "musical scale", "major scale", "minor scale", "chromatic scale",
	"pentatonic scale", "diatonic scale", "mode", "ionian mode", "dorian mode", "phrygian mode",
	"lydian mode", "mixolydian mode", "aeolian mode", "locrian mode", "interval", "semitone",
	"whole tone", "octave", "perfect fifth", "perfect fourth", "major third", "minor third",
	"tritone", "chord", "triad", "major chord", "minor chord", "diminished chord",
	"augmented chord", "seventh chord", "dominant seventh", "tonic", "dominant",
	"subdominant", "mediant", "submediant", "leading tone", "key signature", "time signature",
	"tempo", "rhythm", "meter", "syncopation", "harmony", "melody", "counterpoint",
	"cadence", "authentic cadence", "plagal cadence", "half cadence", "deceptive cadence",
	"modulation", "transposition", "inversion", "voice leading", "figured bass",
	"roman numeral analysis", "movable do", "fixed do", "pitch class", "enharmonic",
	"accidental", "sharp", "flat", "natural sign", "clef", "treble clef", "bass clef",
	"alto clef", "staff", "bar line", "measure", "beat", "note value", "rest",
	"whole note", "half note", "quarter note", "eighth note", "sixteenth note",
	"dotted note", "tie", "slur", "staccato", "legato", "crescendo", "diminuendo",
	"forte", "piano", "arpeggio", "ostinato", "motif", "phrase", "sonata form",
	"binary form", "ternary form", "rondo form", "twelve tone technique", "serialism",
	"atonality", "tonality", "polyphony", "homophony", "monophony", "timbre", "articulation",
	"natural minor", "harmonic minor", "melodic minor", "major pentatonic scale",
	"minor pentatonic scale", "blues scale", "whole tone scale", "octatonic scale",
	"diminished scale", "altered scale", "bebop scale", "harmonic major scale",
	"double harmonic scale", "hungarian minor scale", "whole half diminished scale",
	"half whole diminished scale", "lydian dominant scale", "super locrian scale",
	"locrian natural two", "phrygian dominant scale", "dorian sharp four",
	"lydian augmented scale", "mixolydian flat six", "church mode", "synthetic scale",
	"symmetrical scale", "tetrachord", "trichord", "hexachord", "pitch collection",
	"relative major", "relative minor", "parallel major", "parallel minor",
	"minor second", "major second", "augmented second", "diminished third",
	"augmented fourth", "diminished fifth", "minor sixth", "major sixth",
	"minor seventh", "major seventh", "perfect unison", "compound interval",
	"simple interval", "consonance", "dissonance", "melodic interval",
	"harmonic interval", "interval class", "suspended chord", "sus2 chord",
	"sus4 chord", "sixth chord", "ninth chord", "eleventh chord", "thirteenth chord",
	"half diminished seventh", "minor major seventh", "augmented seventh",
	"diminished seventh", "added tone chord", "add nine chord", "power chord",
	"slash chord", "polychord", "quartal chord", "quintal chord", "tertian harmony",
	"extended chord", "altered chord", "borrowed chord", "secondary dominant",
	"secondary leading tone chord", "neapolitan chord", "augmented sixth chord",
	"italian sixth", "french sixth", "german sixth", "dominant ninth",
	"dominant thirteenth", "dominant chord", "predominant chord", "applied chord",
	"passing chord", "neighboring chord", "pedal point", "pedal tone", "suspension",
	"retardation", "anticipation", "appoggiatura", "escape tone", "changing tone",
	"nonchord tone", "chord tone", "tonicization", "harmonic progression",
	"chord progression", "circle progression", "deceptive motion", "contrary motion",
	"parallel motion", "similar motion", "oblique motion", "voice exchange",
	"common tone", "common tone diminished seventh", "sequence", "harmonic sequence",
	"cadential six four", "six four chord", "figured bass numerals", "inversion symbol",
	"root position", "first inversion", "second inversion", "third inversion",
	"simple meter", "compound meter", "duple meter", "triple meter", "quadruple meter",
	"additive meter", "asymmetric meter", "mixed meter", "irregular meter", "polymeter",
	"polyrhythm", "cross rhythm", "hemiola", "anacrusis", "pickup note", "downbeat",
	"upbeat", "backbeat", "offbeat", "pulse", "subdivision", "tuplet", "triplet",
	"quintuplet", "septuplet", "dotted rhythm", "swing rhythm", "rubato",
	"accelerando", "ritardando", "rallentando", "fermata", "caesura", "grand staff",
	"ledger line", "repeat sign", "dal segno", "da capo", "coda", "segno",
	"volta bracket", "ottava", "octave clef", "tenor clef", "soprano clef",
	"mezzo soprano clef", "barline", "double barline", "final barline",
	"repeat barline", "breath mark", "phrase mark", "dynamic marking",
	"articulation mark", "accent", "marcato", "tenuto", "spiccato", "sforzando",
	"fortissimo", "pianissimo", "mezzo forte", "mezzo piano", "fortepiano",
	"crescendo hairpin", "diminuendo hairpin", "period", "sentence",
	"antecedent phrase", "consequent phrase", "variation form", "strophic form",
	"through composed", "minuet and trio", "scherzo", "fugue", "exposition",
	"development", "recapitulation", "bridge", "transition", "refrain", "verse",
	"chorus", "prechorus", "species counterpoint", "first species counterpoint",
	"second species counterpoint", "third species counterpoint",
	"fourth species counterpoint", "fifth species counterpoint", "canon",
	"invertible counterpoint", "imitation", "stretto", "subject", "countersubject",
	"answer", "real answer", "tonal answer", "augmentation", "diminution",
	"retrograde", "equal temperament", "just intonation", "meantone temperament",
	"pythagorean tuning", "well temperament", "temperament", "tuning system",
	"cents", "microtone", "quarter tone", "twelve tone equal temperament",
	"pure interval", "tone row", "pitch class set", "normal form", "prime form",
	"interval vector", "transpositional symmetry", "set class", "forte number",
	"aggregate", "hexachordal combinatoriality", "serial technique", "guide tone",
	"chord scale", "ii v i progression", "tritone substitution", "backdoor progression",
	"rhythm changes", "turnback", "coltrane changes", "modal interchange",
	"upper structure triad", "drop two voicing", "drop three voicing", "shell voicing",
	"voicing", "walking bass", "lead sheet", "fake book"
], "Music theory term."));

const PHYSICS = terms([
	"physics", "classical mechanics", "quantum mechanics", "relativity", "special relativity",
	"general relativity", "thermodynamics", "statistical mechanics", "electromagnetism",
	"optics", "acoustics", "fluid mechanics", "particle physics", "nuclear physics",
	"atomic physics", "condensed matter physics", "plasma physics", "astrophysics",
	"cosmology", "kinematics", "dynamics", "force", "mass", "acceleration", "velocity",
	"momentum", "angular momentum", "torque", "energy", "kinetic energy", "potential energy",
	"work", "power", "gravity", "gravitational field", "inertia", "friction", "pressure",
	"density", "buoyancy", "viscosity", "wave", "wavelength", "frequency", "amplitude",
	"interference", "diffraction", "refraction", "reflection", "polarization", "resonance",
	"doppler effect", "electric field", "magnetic field", "electric charge", "electric current",
	"voltage", "resistance", "capacitance", "inductance", "ohms law", "coulombs law",
	"faradays law", "maxwells equations", "photon", "electron", "proton", "neutron", "quark",
	"lepton", "boson", "fermion", "neutrino", "higgs boson", "standard model", "wave function",
	"uncertainty principle", "superposition", "quantum entanglement", "quantum tunneling",
	"blackbody radiation", "photoelectric effect", "compton scattering", "radioactivity",
	"half life", "nuclear fission", "nuclear fusion", "isotope", "laser", "spectroscopy",
	"brownian motion", "entropy", "enthalpy", "temperature", "heat capacity", "phase transition",
	"absolute zero", "critical point", "ideal gas law", "bernoulli principle", "pascal principle",
	"archimedes principle", "newtons laws of motion", "schrodinger equation", "lorentz force",
	"planck constant", "boltzmann constant", "speed of light", "gravitational constant"
], "Physics term.");

module.exports = {
	ANIME: ANIME,
	BRAWL: [],
	COD: COD,
	MUTH: MUTH,
	PHYSICS: PHYSICS
};
