"use strict";

function lines(text){
	return String(text || "")
		.split(/\r?\n/)
		.map(function(line){ return line.trim(); })
		.filter(Boolean);
}

const COUNTRY_CODES = [
	"AF","AL","DZ","AD","AO","AG","AR","AM","AU","AT","AZ","BS","BH","BD","BB","BY","BE","BZ","BJ","BT",
	"BO","BA","BW","BR","BN","BG","BF","BI","CV","KH","CM","CA","CF","TD","CL","CN","CO","KM","CG","CD",
	"CR","CI","HR","CU","CY","CZ","DK","DJ","DM","DO","EC","EG","SV","GQ","ER","EE","SZ","ET","FJ","FI",
	"FR","GA","GM","GE","DE","GH","GR","GD","GT","GN","GW","GY","HT","HN","HU","IS","IN","ID","IR","IQ",
	"IE","IL","IT","JM","JP","JO","KZ","KE","KI","KP","KR","KW","KG","LA","LV","LB","LS","LR","LY","LI",
	"LT","LU","MG","MW","MY","MV","ML","MT","MH","MR","MU","MX","FM","MD","MC","MN","ME","MA","MZ","MM",
	"NA","NR","NP","NL","NZ","NI","NE","NG","MK","NO","OM","PK","PW","PA","PG","PY","PE","PH","PL","PT",
	"QA","RO","RU","RW","KN","LC","VC","WS","SM","ST","SA","SN","RS","SC","SL","SG","SK","SI","SB","SO",
	"ZA","SS","ES","LK","SD","SR","SE","CH","SY","TJ","TZ","TH","TL","TG","TO","TT","TN","TR","TM","TV",
	"UG","UA","AE","GB","US","UY","UZ","VU","VA","VE","VN","YE","ZM","ZW","PS","XK"
];

const COUNTRY_NAME_OVERRIDES = {
	CD: "democratic republic of the congo",
	CG: "republic of the congo",
	CI: "cote divoire",
	CZ: "czech republic",
	FM: "micronesia",
	GB: "united kingdom",
	IR: "iran",
	KP: "north korea",
	KR: "south korea",
	LA: "laos",
	MK: "north macedonia",
	MD: "moldova",
	PS: "palestine",
	RU: "russia",
	SY: "syria",
	TL: "timor leste",
	TZ: "tanzania",
	US: "united states",
	VA: "vatican city",
	VE: "venezuela",
	VN: "vietnam",
	XK: "kosovo"
};

const COUNTRY_NAMES = lines(`
	afghanistan
	albania
	algeria
	andorra
	angola
	antigua and barbuda
	argentina
	armenia
	australia
	austria
	azerbaijan
	bahamas
	bahrain
	bangladesh
	barbados
	belarus
	belgium
	belize
	benin
	bhutan
	bolivia
	bosnia and herzegovina
	botswana
	brazil
	brunei
	bulgaria
	burkina faso
	burundi
	cabo verde
	cambodia
	cameroon
	canada
	central african republic
	chad
	chile
	china
	colombia
	comoros
	republic of the congo
	democratic republic of the congo
	costa rica
	cote divoire
	croatia
	cuba
	cyprus
	czech republic
	denmark
	djibouti
	dominica
	dominican republic
	ecuador
	egypt
	el salvador
	equatorial guinea
	eritrea
	estonia
	eswatini
	ethiopia
	fiji
	finland
	france
	gabon
	gambia
	georgia
	germany
	ghana
	greece
	grenada
	guatemala
	guinea
	guinea bissau
	guyana
	haiti
	honduras
	hungary
	iceland
	india
	indonesia
	iran
	iraq
	ireland
	israel
	italy
	jamaica
	japan
	jordan
	kazakhstan
	kenya
	kiribati
	north korea
	south korea
	kuwait
	kyrgyzstan
	laos
	latvia
	lebanon
	lesotho
	liberia
	libya
	liechtenstein
	lithuania
	luxembourg
	madagascar
	malawi
	malaysia
	maldives
	mali
	malta
	marshall islands
	mauritania
	mauritius
	mexico
	micronesia
	moldova
	monaco
	mongolia
	montenegro
	morocco
	mozambique
	myanmar
	namibia
	nauru
	nepal
	netherlands
	new zealand
	nicaragua
	niger
	nigeria
	north macedonia
	norway
	oman
	pakistan
	palau
	palestine
	panama
	papua new guinea
	paraguay
	peru
	philippines
	poland
	portugal
	qatar
	romania
	russia
	rwanda
	saint kitts and nevis
	saint lucia
	saint vincent and the grenadines
	samoa
	san marino
	sao tome and principe
	saudi arabia
	senegal
	serbia
	seychelles
	sierra leone
	singapore
	slovakia
	slovenia
	solomon islands
	somalia
	south africa
	south sudan
	spain
	sri lanka
	sudan
	suriname
	sweden
	switzerland
	syria
	tajikistan
	tanzania
	thailand
	timor leste
	togo
	tonga
	trinidad and tobago
	tunisia
	turkey
	turkmenistan
	tuvalu
	uganda
	ukraine
	united arab emirates
	united kingdom
	united states
	uruguay
	uzbekistan
	vanuatu
	vatican city
	venezuela
	vietnam
	yemen
	zambia
	zimbabwe
	kosovo
`);

const AUTO_SUBJECT_RULES = {
	"450": lines(`
		astronom
		planet
		stellar
		galaxy
		cosmic
		orbit
		lunar
		solar
		asteroid
		comet
		nebula
		telescope
		star
		universe
		black hole
		supernova
		quasar
		pulsar
		interstellar
		exoplanet
	`),
	"490": lines(`
		computer
		software
		program
		algorithm
		database
		network
		internet
		code
		coding
		processor
		memory
		server
		client
		compiler
		programming language
		programing language
		algorithmic language
		algebraic language
		assembly language
		machine language
		markup language
		query language
		object code
		object language
		encryption
		cybersecurity
		operating system
		filesystem
		cryptography
		machine learning
		data structure
	`),
	"240": lines(`
		mathemat
		algebra
		geometry
		calculus
		equation
		matrix
		vector
		theorem
		proof
		integral
		derivative
		probability
		number
		arithmetic
		statistic
		statistics
		fraction
		decimal
		percentage
		ratio
		triangle
		circle
		angle
		radius
		diameter
		pi
		topology
		combinator
		logarithm
		polynomial
		trigonometry
		linear algebra
		group theory
		number theory
	`),
	DSCI: lines(`
		data
		dataset
		statistic
		analytics
		machine learning
		statistical model
		predictive model
		machine learning model
		classification model
		classification algorithm
		regression
		clustering
		prediction model
		model training
		sampling
		feature engineering
		feature vector
		feature selection
		inference
		neural network
		data mining
		time series
		bayesian
		visualization
	`),
	"150": lines(`
		novel
		poem
		poetry
		poet
		stage play
		screenplay
		playwright
		drama
		literary
		literature
		fiction
		epic
		booker
		pulitzer
		shakespeare
		tragedy
		comedy
		author
		manuscript
		sonnet
	`),
	"30": lines(`
		econom
		market
		money
		free trade
		international trade
		trade deficit
		trade surplus
		trade balance
		tax
		finance
		bank
		inflation
		investment
		currency
		price
		gdp
		recession
		bond market
		bond trading
		bond issue
		bond rating
		stock market
		stock exchange
		common stock
		preferred stock
		shareholder
		securities
		monetary policy
		fiscal policy
	`),
	"310": lines(`
		language
		linguist
		phoneme
		phonemic
		phonetics
		phonology
		phonological
		phonotactics
		allophone
		allophonic
		acrophony
		homophone
		homophonic
		homophonous
		homophony
		phonics
		phonic
		phonation
		phonemics
		phonogram
		phonogramic
		phonetician
		phoneticist
		morphophoneme
		morphophonemic
		circumflex
		prosody
		prosodic
		trill
		syntax
		semantic
		grammar
		speech
		morpheme
		phoneme
		etymolog
		pragmatic
		lexicon
		morphology
		orthography
		bilingual
		dialect
	`),
	"350": lines(`
		sport
		soccer
		football
		basketball
		baseball
		tennis
		golf
		athlete
		league
		tournament
		goal
		score
		olympic
		cricket
		hockey
		rugby
		volleyball
	`),
	"410": lines(`
		relig
		church
		temple
		god
		goddess
		worship
		theology
		faith
		prayer
		sacred
		buddh
		islam
		christian
		hindu
		judaism
		scripture
		clergy
	`),
	"100": lines(`
		military
		army
		navy
		air force
		war
		weapon
		battle
		troop
		soldier
		missile
		artillery
		tank
		naval
		combat
		logistics
		infantry
		reconnaissance
	`),
	"370": lines(`
		medical
		medicine
		disease
		doctor
		hospital
		surgery
		therapy
		anatom
		physiolog
		symptom
		diagnos
		treatment
		clinical
		drug
		pathology
		oncology
		cardiology
	`),
	"530": lines(`
		chem
		molecule
		atom
		element
		acid
		compound
		reaction
		organic
		ionic
		covalent
		chemical
		periodic table
		solution
		catalyst
		solvent
	`),
	MINC: lines(`
		minecraft
		creeper
		redstone
		enderman
		pickaxe
		nether
		overworld
		villager
		ender dragon
		crafting table
	`),
	STA: lines(`
		starcraft
		terran
		zerg
		protoss
		hydralisk
		ultralisk
		zealot
		battlecruiser
		dragoon
		mutalisk
	`),
	POK: lines(`
		pokemon
		pokeball
		pokedex
		pikachu
		charizard
		bulbasaur
		squirtle
		mewtwo
		eevee
		gym leader
	`),
	FORT: lines(`
		fortnite
		battle bus
		loot llama
		reboot van
		v bucks
		tilted towers
		storm circle
		chug jug
		slurp juice
		victory royale
	`),
	VALO: lines(`
		valorant
		spike
		jett
		reyna
		sage
		viper
		brimstone
		omen
		killjoy
		cypher
	`),
	PUBG: lines(`
		pubg
		battlegrounds
		erangel
		miramar
		sanhok
		vikendi
		airdrop
		frying pan
		ghillie
		red zone
	`),
	APEX: lines(`
		apex legends
		wraith
		bloodhound
		lifeline
		pathfinder
		bangalore
		gibraltar
		octane
		respawn beacon
		shield battery
	`),
	OVW: lines(`
		overwatch
		tracer
		reaper
		widowmaker
		genji
		mercy
		lucio
		zenyatta
		payload
		kings row
	`),
	NBAP: lines(`
		basketball player
		nba player
		basketball
		nba
		point guard
		shooting guard
		small forward
		power forward
		guard
		forward
		center
		finals mvp
		rookie of the year
		basketball hall of fame
	`),
	SOCP: lines(`
		footballer
		soccer player
		football player
		striker
		midfielder
		defender
		goalkeeper
		winger
		ballon d'or
		premier league
		la liga
		serie a
		bundesliga
		champions league
		world cup
	`)
};

const GAME_SUBJECT_EXTRA_WORDS = {
	MINC: lines(`
		wooden shovel
		stone shovel
		iron shovel
		golden shovel
		diamond shovel
		netherite shovel
		wooden axe
		stone axe
		iron axe
		golden axe
		diamond axe
		netherite axe
		wooden hoe
		stone hoe
		iron hoe
		golden hoe
		diamond hoe
		netherite hoe
		oak planks
		spruce planks
		birch planks
		jungle planks
		acacia planks
		dark oak planks
		mangrove planks
		cherry planks
		cobbled deepslate
		redstone torch
		redstone repeater
		redstone comparator
		daylight detector
		note block
		jukebox
		blast furnace
		smoker
		cartography table
		fletching table
		loom
		smithing table
		grindstone
		stonecutter
		barrel
		composter
		brewing stand
		cauldron
		ender chest
		trapped chest
		shulker box
		fire charge
		ender pearl
		eye of ender
		nether star
		dragon egg
		turtle egg
		amethyst shard
		echo shard
		disc fragment
		heart of the sea
		prismarine shard
		prismarine crystals
		nautilus shell
		totem of undying
		goat horn
		recovery compass
		lodestone
		brush
		archaeology
		chiseled bookshelf
		sculk sensor
		sculk shrieker
		sculk catalyst
		frogspawn
		tadpole
		camel
		sniffer
		breeze
		bogged
		trial chamber
		trial spawner
		vault
		copper bulb
		crafter
		pale garden
		resin brick
		pale oak
		nether portal
		end portal
		end city
		bastion remnant
		nether fortress
		enderman farm
		iron golem
		snow golem
		mooshroom
		phantom
		silverfish
		endermite
		magma cream
		glow squid
		frog light
	`),
	STA: lines(`
		command center
		orbital command
		planetary fortress
		supply depot
		refinery
		engine bay
		armory
		starport
		factory
		barracks
		academy
		machine shop
		control tower
		science vessel
		dropship
		valkyrie
		sunken colony
		spore colony
		sunken colony
		spawning pool
		evolution chamber
		hydralisk den
		spire
		greater spire
		defiler mound
		nydus canal
		hive
		lair
		creep colony
		queen nest
		scourge
		defiler
		guardian
		devourer
		drone
		scv
		probe
		nexus
		pylon
		photon cannon
		cybernetics core
		citadel of adun
		forge
		robotics facility
		robotics support bay
		fleet beacon
		arbiter tribunal
		observatory
		stargate
		arbiter
		scout
		interceptor
		observer
		shuttle
		scarab
		disruption web
		psionic storm
		hallucination
		emp shockwave
		lockdown
		spider mine
		cloak
		burrow
		dark swarm
		plague
		consume
		ensnare
		parasitic bomb
		metabolic boost
		leg enhancements
		singularity charge
	`)
	,
	POK: lines(`
		ivysaur
		venusaur
		charmeleon
		charizard
		wartortle
		blastoise
		caterpie
		metapod
		butterfree
		weedle
		kakuna
		beedrill
		pidgey
		pidgeotto
		pidgeot
		rattata
		raticate
		spearow
		fearow
		ekans
		arbok
		sandshrew
		sandslash
		nidoran
		nidorina
		nidoqueen
		nidorino
		nidoking
		clefairy
		clefable
		vulpix
		ninetales
		jigglypuff
		wigglytuff
		zubat
		golbat
		oddish
		gloom
		vileplume
		paras
		parasect
		venonat
		venomoth
		diglett
		dugtrio
		persian
		golduck
		mankey
		primeape
		growlithe
		arcanine
		poliwag
		poliwhirl
		poliwrath
		abra
		kadabra
		alakazam
		machop
		machoke
		machamp
		bellsprout
		weepinbell
		victreebel
		tentacool
		tentacruel
		geodude
		graveler
		golem
		ponyta
		rapidash
		slowpoke
		slowbro
		magnemite
		magneton
		farfetchd
		doduo
		dodrio
		seel
		dewgong
		grimer
		muk
		shellder
		cloyster
		gastly
		haunter
		drowzee
		hypno
		krabby
		kingler
		voltorb
		electrode
		exeggcute
		exeggutor
		cubone
		marowak
		hitmonlee
		hitmonchan
		lickitung
		koffing
		weezing
		rhyhorn
		rhydon
		chansey
		tangela
		kangaskhan
		horsea
		seadra
		goldeen
		seaking
		staryu
		starmie
		scyther
		jynx
		electabuzz
		magmar
		pinsir
		tauros
		magikarp
		gyarados
		lapras
		ditto
		vaporeon
		jolteon
		fl
		flareon
		porygon
		omanyte
		omastar
		kabuto
		kabutops
		aerodactyl
		articuno
		zapdos
		moltres
		dratini
		dragonair
		dragonite
		chikorita
		bayleef
		meganium
		cyndaquil
		quilava
		typhlosion
		totodile
		croconaw
		feraligatr
		togepi
		togetic
		mareep
		flaaffy
		ampharos
		bellossom
		azumarill
		sudowoodo
		politoed
		espeon
		umbreon
		slowking
		steelix
		scizor
		heracross
		sneasel
		skarmory
		houndour
		houndoom
		kingdra
		phanpy
		donphan
		porygon2
		stantler
		smeargle
		tyrogue
		hitmontop
		miltank
		blissey
		raikou
		entei
		suicune
		larvitar
		pupitar
		tyranitar
		lugia
		ho oh
		celebi
	`),
	FORT: lines(`
		greasy grove
		salty springs
		risky reels
		lonely lodge
		wailing woods
		haunted hills
		pleasant park
		retail row
		lucky landing
		shifty shafts
		polar peak
		frosty flights
		sunny steps
		lazy lagoon
		misty meadows
		steamy stacks
		dirty docks
		holly hedges
		craggy cliffs
		bony burbs
		logjam lumberyard
		greasy grove
		rocky reels
		tilted town
		mega city
		frenzy fields
		breakwater bay
		shattered slabs
		mega city
		creep catcher
		shockwave grenade
		impulse grenade
		stink bomb
		bush bomb
		grappler
		grapple blade
		infinity blade
		slap juice
		chug splash
		med kit
		bandage bazooka
		ballistic shield
		combat shotgun
		pump shotgun
		tactical shotgun
		heavy shotgun
		ranger shotgun
		combat smg
		assault rifle
		burst assault rifle
		scoped assault rifle
		heavy sniper
		hunting rifle
		rocket launcher
		bolt action sniper
		common scar
		golden scar
		supply llama
		zero build
		no build
		edit reset
		box fight
		build battle
		creative mode
		battle royale
		save the world
		party royale
	`)
	,
	VALO: lines(`
		vandal
		phantom
		operator
		sheriff
		guardian
		bulldog
		stinger
		spectre
		ares
		odin
		marshal
		shorty
		classic
		frenzy
		ghost
		bucky
		judge
		outlaw
		focus mode
		controller
		initiator
		duelist
		sentinel
		ultimate orb
		spike carrier
		default plant
		post plant
		retake
		lurk
		entry fragger
		smoke
		flash
		molly
		one way smoke
		crosshair
		eco round
		force buy
		save round
		pistol round
		overtime
		heaven
		hell
		market
		tree room
		catwalk
		a main
		b main
		mid doors
		sewers
		hookah
		showers
		cubby
		site anchor
		dismiss
		leer
		tailwind
		cloudburst
		updraft
		dark cover
		paranoia
		seekers
		recon bolt
		owl drone
		healing orb
		barrier orb
		turret
		nanoswarm
		trademark
		headhunter
		satchel
		paint shells
		blast pack
		`)
	,
	PUBG: lines(`
		akm
		m416
		m16a4
		scar l
		qbz
		aug a3
		ace32
		groza
		awm
		kar98k
		win94
		m24
		slr
		sks
		mk14
		mk12
		mini14
		qbu
		vss
		vector
		uzi
		tommy gun
		pp bizon
		mp5k
		ump45
		dbs
		s1897
		s686
		s12k
		m249
		dp28
		crowbar
		sickle
		machete
		stun grenade
		smoke grenade
		frag grenade
		c4
		molotov cocktail
		first aid kit
		med kit
		adrenaline syringe
		energy drink
		painkiller
		compensator
		suppressor
		flash hider
		extended mag
		quickdraw mag
		cheek pad
		bullet loops
		red dot sight
		holographic sight
		2x scope
		3x scope
		4x scope
		6x scope
		8x scope
		pickup truck
		buggy
		motor glider
		brdm
		rondo
		paramo
		haven
		taego
		deston
		erangel
		miramar
		sanhok
		vikendi
		karakin
		pochinki
		school
		ruins
		bootcamp
		georgopol
		sosnovka military base
		los leones
		san martin
		pecado
		hacienda del patron
		`)
	,
	APEX: lines(`
		r301 carbine
		flatline
		hemlok
		havoc
		devotion
		l star
		nemesis
		alternator
		r99
		car smg
		volt
		prowler
		peacekeeper
		mastiff
		eva 8
		mozambique
		wingman
		p2020
		re45
		longbow
		sentinel
		charge rifle
		triple take
		30 30 repeater
		kraber
		bocek
		arc star
		thermite grenade
		fragger
		kings canyon
		worlds edge
		olympus
		storm point
		broken moon
		district
		fragment
		skull town
		estates
		hammond labs
		energy depot
		barometer
		thermal station
		harvester
		climatizer
		antenna
		jurassic park
		survey beacon
		ring console
		knockdown shield
		heat shield
		respawn beacon
		mobile respawn beacon
		ultimate accelerant
		shield battery
		shield cell
		phoenix kit
		med kit
		syringe
		helmet
		backpack
		gold knockdown shield
		gold backpack
		red armor
		white armor
		blue armor
		purple armor
		void jump
		dimensional rift
		smoke launcher
		drone heal
		nox gas
		`)
	,
	OVW: lines(`
		dva
		doomfist
		mauga
		junker queen
		reinhardt
		orisa
		winston
		wrecking ball
		zarya
		ashe
		bastion
		cassidy
		echo
		genji
		hanzo
		junkrat
		mei
		pharah
		reaper
		sojourn
		soldier 76
		sombra
		symmetra
		torbjorn
		tracer
		widowmaker
		ana
		baptiste
		brigitte
		illari
		juno
		kiriko
		lifeweaver
		lucio
		mercy
		moira
		zenyatta
		numbani
		hanamura
		volskaya industries
		kings row
		route 66
		hollywood
		eichenwalde
		junkertown
		busan
		oasis
		lijiang tower
		nepal
		blizzard world
		rialto
		havana
		circuit royal
		shambali monastery
		paraiso
		colosseo
		esperanca
		new queen street
		antarctic peninsula
		suravasa
		runasapi
		clash
		escort
		payload
		control map
		push
		flashpoint
		rally
		valkyrie
		coalescence
		deadeye
		dragonstrike
		tactical visor
		pulse bomb
		graviton surge
	`)
};

const SOCCER_PLAYER_WORDS = lines(`
	lionel messi
	cristiano ronaldo
	neymar
	kylian mbappe
	erling haaland
	kevin de bruyne
	mohamed salah
	robert lewandowski
	karim benzema
	luka modric
	toni kroos
	andres iniesta
	xavi
	zinedine zidane
	ronaldinho
	ronaldo nazario
	pele
	diego maradona
	johan cruyff
	david beckham
	thierry henry
	kaka
	luis suarez
	gareth bale
	wayne rooney
	sergio ramos
	iker casillas
	gianluigi buffon
	manuel neuer
	virgil van dijk
	eden hazard
	didier drogba
	samuel etoo
	alan shearer
	frank lampard
	steven gerrard
	paul scholes
	ryan giggs
	rio ferdinand
	john terry
	ashley cole
	paolo maldini
	franco baresi
	alessandro nesta
	fabio cannavaro
	giorgio chiellini
	leonardo bonucci
	alessandro del piero
	francesco totti
	andrea pirlo
	gennaro gattuso
	filippo inzaghi
	christian vieri
	roberto baggio
	pavel nedved
	andriy shevchenko
	franck ribery
	arjen robben
	philipp lahm
	bastian schweinsteiger
	thomas muller
	miroslav klose
	mesut ozil
	mats hummels
	marco reus
	mario gotze
	michael ballack
	lukas podolski
	oliver kahn
	clarence seedorf
	edgar davids
	ruud van nistelrooy
	robin van persie
	wesley sneijder
	dennis bergkamp
	dirk kuyt
	memphis depay
	xabi alonso
	carles puyol
	sergio busquets
	cesc fabregas
	gerard pique
	javier mascherano
	dani alves
	marcelo
	roberto carlos
	cafu
	dani carvajal
	casemiro
	pepe
	angel di maria
	gonzalo higuain
	carlos tevez
	javier zanetti
	esteban cambiasso
	juan roman riquelme
	gabriel batistuta
	hernan crespo
	juan sebastian veron
	walter samuel
	gabriel heinze
	emi martinez
	julian alvarez
	lautaro martinez
	enzo fernandez
	alexis mac allister
	rodri
	alvaro morata
	pedri
	gavi
	lamine yamal
	nico williams
	ferran torres
	sergio aguero
	fernando torres
	david villa
	david silva
	santi cazorla
	juan mata
	diego costa
	jordi alba
	marc andre ter stegen
	jan oblak
	antoine griezmann
	olivier giroud
	hugo lloris
	raphael varane
	william saliba
	theo hernandez
	ousmane dembele
	kingsley coman
	paul pogba
	ngolo kante
	claude makelele
	patrick vieira
	lilian thuram
	laurent blanc
	didier deschamps
	david trezeguet
	michel platini
	george weah
	sadio mane
	riyad mahrez
	yaya toure
	kolo toure
	michael essien
	john obi mikel
	victor osimhen
	kalidou koulibaly
	achraf hakimi
	hakim ziyech
	sofyan amrabat
	abedi pele
	jay jay okocha
	vincent enyeama
	thomas partey
	andre ayew
	son heung min
	park ji sung
	hwang hee chan
	kim min jae
	takefusa kubo
	kaoru mitoma
	shinji kagawa
	shinji okazaki
	keisuke honda
	maya yoshida
	takumi minamino
	wataru endo
	mehdi taremi
	alireza jahanbakhsh
	alexis sanchez
	arturo vidal
	claudio bravo
	ivan zamorano
	marcelo salas
	james rodriguez
	juan cuadrado
	falcao
	david ospina
	luis diaz
	diego forlan
	federico valverde
	diego godin
	jose gimenez
	paolo guerrero
	jefferson farfan
	hugo sanchez
	rafael marquez
	javier hernandez
	hirving lozano
	guillermo ochoa
	carlos vela
	christian pulisic
	alphonso davies
	jonathan david
	clint dempsey
	landon donovan
	tim howard
	weston mckennie
	tyler adams
	ivan perisic
	mario mandzukic
	dario srna
	dejan lovren
	edin dzeko
	miralem pjanic
	dusan vlahovic
	dusan tadic
	nemanja vidic
	aleksandar mitrovic
	sergej milinkovic savic
	dejan stankovic
	sinisa mihajlovic
	dimitar berbatov
	hristo stoichkov
	franz beckenbauer
	lothar matthaus
	gerd muller
	jurgen klinsmann
	bernd schuster
	rudi voller
	ilkay gundogan
	kai havertz
	jamal musiala
	niklas sule
	marco van basten
	ruud gullit
	frank rijkaard
	patrick kluivert
	jaap stam
	mark van bommel
	georginio wijnaldum
	matthijs de ligt
	cody gakpo
	daley blind
	bruno fernandes
	ruben dias
	joao cancelo
	joao felix
	nuno mendes
	ricardo carvalho
	deco
	nani
	ricardo quaresma
	diogo jota
	harry kane
	jude bellingham
	bukayo saka
	phil foden
	declan rice
	mason mount
	jack grealish
	jordan henderson
	kieran trippier
	john stones
	kyle walker
	harry maguire
	raheem sterling
	marcus rashford
	cole palmer
	jermain defoe
	michael owen
	sol campbell
	gary neville
	jamie carragher
	gary lineker
	paul gascoigne
	bobby charlton
	bobby moore
	geoff hurst
	aaron ramsey
	craig bellamy
	roberto firmino
	richarlison
	raphinha
	vinicius junior
	rodrygo
	lucas paquetta
	thiago silva
	marquinhos
	ederson
	alisson
	gabriel jesus
	willian
	fred
	oscar
	hulk
	romario
	bebeto
	socrates
	zico
	falcao brazil
	jairzinho
	rivellino
	garrincha
	carlos alberto torres
	taffarel
	roberto firmino
	giancarlo antognoni
	gianfranco zola
	roberto mancini
	paolo rossi
	gianluca vialli
	marco materazzi
	andrea barzagli
	salvatore schillaci
	giuseppe bergomi
	gianluigi donnarumma
	marco verratti
	nicolo barella
	jorginho
	sandro tonali
	federico chiesa
	thibaut courtois
	romelu lukaku
	kevin de bruyne
	eden hazard
	yannick carrasco
	dries mertens
	axel witsel
	toby alderweireld
	jan vertonghen
	vincent kompany
	romain saiss
	youssef en nesyri
	noussair mazraoui
	amine harit
	riyad mahrez
	ismael bennacer
	pierre emerick aubameyang
	sebastien haller
	pascal gross
	deniz undav
	jonas hofmann
	leroy sane
	joshua kimmich
	serge gnabry
	antonio rudiger
	david alaba
	jamal musiala
	jude bellingham
	federico dimarco
	lautaro martinez
	henrikh mkhitaryan
	hakan calhanoglu
	marcus thuram
	victor osimhen
	khvicha kvaratskhelia
	stanislav lobotka
	matthijs de ligt
	leroy sane
	dayot upamecano
	alphonso davies
	serhou guirassy
	jeremie frimpong
	florian wirtz
	piero hincapie
	granit xhaka
	nicolas pepe
	wilfried zaha
	moussa dembele
	heung min son
	dele alli
	james maddison
	martin odegaard
	kai havertz
	gabriel martinelli
	mikel merino
	declan rice
	rodri hernandez
	bernardo silva
	ruben dias
	kevin de bruyne
	ederson moraes
	andy robertson
	trent alexander arnold
	virgil van dijk
	darwin nunez
	diogo jota
	alisson becker
	joe gomez
	ibrahima konate
	bruno guimaraes
	alexander isak
	anthony gordon
	kieran trippier
	sandro tonali
	cole palmer
	reece james
	ben chilwell
	moises caicedo
	declan rice
	fernando hierro
	raul
	luis enrique
	pep guardiola
	xabi prieto
	david de gea
	fernando morientes
	gaizka mendieta
	joan capdevila
	gerard moreno
	isco
	fernando llorente
	mikel arteta
	branislav ivanovic
	nemanja matic
	petr cech
	ole gunnar solskjaer
	dwight yorke
	andy cole
	park chu young
	ki sung yueng
	hidetoshi nakata
	yuto nagatomo
	ricardo kaka
	hakan sukur
	roque santa cruz
	fredrik ljungberg
	robin olsen
	victor lindelof
`)

module.exports = {
	COUNTRY_CODES,
	COUNTRY_NAME_OVERRIDES,
	COUNTRY_NAMES,
	AUTO_SUBJECT_RULES,
	GAME_SUBJECT_EXTRA_WORDS,
	SOCCER_PLAYER_WORDS,
	lines
};
