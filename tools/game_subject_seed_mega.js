"use strict";

function lines(text){
	return String(text || "")
		.split(/\r?\n/)
		.map(function(line){ return line.trim(); })
		.filter(Boolean);
}

module.exports = {
	MINC: lines(`
		oak log
		spruce log
		birch log
		jungle log
		acacia log
		dark oak log
		mangrove log
		cherry log
		bamboo planks
		bamboo mosaic
		crimson stem
		warped stem
		stripped oak log
		stripped spruce log
		stripped birch log
		stripped jungle log
		stripped acacia log
		stripped dark oak log
		stripped mangrove log
		stripped cherry log
		stripped crimson stem
		stripped warped stem
		blackstone
		polished blackstone
		gilded blackstone
		basalt
		smooth basalt
		netherrack
		soul sand
		soul soil
		crimson nylium
		warped nylium
		shroomlight
		nether wart block
		warped wart block
		crying obsidian
		respawn anchor
		soul lantern
		soul torch
		soul campfire
		honey bottle
		honeycomb
		honeycomb block
		bee nest
		beehive
		beeswax
		glow berries
		sweet berries
		dried kelp block
		suspicious stew
		blaze rod
		blaze powder
		ghast tear
		nether wart
		chorus fruit
		popped chorus fruit
		purpur block
		purpur pillar
		purpur stairs
		end rod
		elytra
		trident
		conduit
		turtle helmet
		phantom membrane
		music disc 13
		music disc cat
		music disc blocks
		music disc chirp
		music disc far
		music disc mall
		music disc mellohi
		music disc stal
		music disc strad
		music disc ward
		music disc 11
		music disc wait
		music disc pigstep
		music disc otherside
		music disc relic
		plains
		sunflower plains
		snowy plains
		ice spikes
		desert
		swamp
		mangrove swamp
		savanna
		savanna plateau
		badlands
		wooded badlands
		eroded badlands
		old growth birch forest
		old growth taiga
		old growth pine taiga
		dark forest
		flower forest
		meadow
		grove
		snowy slopes
		jagged peaks
		stony peaks
		frozen peaks
		lush cave
		dripstone cave
		deep dark
		basalt deltas
		soul sand valley
		crimson forest
		warped forest
		bamboo jungle
		sparse jungle
		windswept hills
		windswept forest
		windswept gravelly hills
		stony shore
		mushroom fields
		warden
		ravager
		vex
		evoker
		pillager
		vindicator
		illusioner
		zoglin
		hoglin
		piglin brute
		strider
		wither skeleton
		blaze
		ghast
		zombified piglin
		drowned
		husk
		stray
		skeleton horse
		zombie horse
		axolotl
		fox
		panda
		polar bear
		ocelot
		wolf
		llama
		trader llama
		wandering trader
		villager
		elder guardian
		guardian
		wither
		ender dragon
		piglin
		magma cube
		slime block
		honey block
	`),
	STA: lines(`
		marine
		marauder
		reaper
		ghost
		medic
		firebat
		goliath
		vulture
		siege tank
		battlecruiser
		wraith
		banshee
		liberator
		medivac
		thor
		hellion
		hellbat
		widow mine
		cyclone
		raven
		viking
		mule
		zealot
		dragoon
		dark templar
		high templar
		archon
		dark archon
		corsair
		carrier
		phoenix
		void ray
		immortal
		colossus
		stalker
		adept
		mothership
		warp prism
		disruptor
		tempest
		oracle
		sentry
		roach
		baneling
		brood lord
		corrupter
		overseer
		overlord
		ultralisk
		swarm host
		viper
		infestor
		lurker
		mutalisk
		broodling
		changeling
		baneling nest
		roach warren
		infestation pit
		ultralisk cavern
		jim raynor
		sarah kerrigan
		aratanis
		artanis
		zeratul
		tassadar
		fenix
		aldaris
		alarak
		abathur
		dehaka
		tychus
		nova terra
		alexei stukov
		arcturus mengsk
		valerian mengsk
		rohana
		vorazun
		karax
		zagara
		swann
		stetmann
		hyperion
		leviathan
		gantrithor
		xel naga
		hybrid reaver
		hybrid dominator
		khaydarin crystal
		stimpack
		combat shield
		siege mode
		yamato cannon
		cloaking field
		blink
		charge
		thermal lance
		warp gate
		guardian shield
		force field
		khaydarin amulet
		metabolic boost
		muscular augments
		glial reconstitution
		burrow move
		pathogen glands
		centrifugal hooks
		pneumatized carapace
		gravitic drive
	`),
	POK: lines(`
		treecko
		grovyle
		sceptile
		torchic
		combusken
		blaziken
		mudkip
		marshtomp
		swampert
		poochyena
		mightyena
		zigzagoon
		linoone
		wurmple
		silcoon
		beautifly
		cascoon
		dustox
		lotad
		lombre
		ludicolo
		seedot
		nuzleaf
		shiftry
		taillow
		swellow
		wingull
		pelipper
		ralts
		kirlia
		gardevoir
		gallade
		surskit
		masquerain
		shroomish
		breloom
		slakoth
		vigoroth
		slaking
		nincada
		ninjask
		shedinja
		whismur
		loudred
		exploud
		makuhita
		hariyama
		nosepass
		aron
		lairon
		aggron
		meditite
		medicham
		electrike
		manectric
		plusle
		minun
		volbeat
		illumise
		roselia
		gulpin
		swalot
		carvanha
		sharpedo
		wailmer
		wailord
		numel
		camerupt
		torkoal
		spoink
		grumpig
		trapinch
		vibrava
		flygon
		cacnea
		cacturne
		swablu
		altaria
		zangoose
		seviper
		lunatone
		solrock
		barboach
		whiscash
		corphish
		crawdaunt
		baltoy
		claydol
		lileep
		cradily
		anorith
		armaldo
		feebas
		milotic
		castform
		kecleon
		shuppet
		banette
		duskull
		dusclops
		tropius
		chimecho
		wynaut
		snorunt
		glalie
		spheal
		sealeo
		walrein
		clamperl
		huntail
		gorebyss
		relicanth
		luvdisc
		bagon
		shelgon
		salamence
		beldum
		metang
		metagross
		regirock
		regice
		registeel
		latias
		latios
		kyogre
		groudon
		rayquaza
		jirachi
		deoxys
		turtwig
		grotle
		torterra
		chimchar
		monferno
		infernape
		piplup
		prinplup
		empoleon
		starly
		staravia
		staraptor
		bidoof
		bibarel
		kricketot
		kricketune
		shinx
		luxio
		luxray
		budew
		roserade
		cranidos
		rampardos
		shieldon
		bastiodon
		burmy
		wormadam
		mothim
		combee
		vespiquen
		pachirisu
		buizel
		floatzel
		cherubi
		cherrim
		shellos
		gastrodon
		ambipom
		drifloon
		drifblim
		buneary
		lopunny
		mismagius
		honchkrow
		glameow
		purugly
		chingling
		stunky
		skuntank
		bronzor
		bronzong
		bonsly
		mime jr
		happiny
		chatot
		spiritomb
		gible
		gabite
		garchomp
		munchlax
		riolu
		lucario
		hippopotas
		hippowdon
		skorupi
		drapion
		croagunk
		toxicroak
		carnivine
		finneon
		lumineon
		snover
		abomasnow
		weavile
		magnezone
		lickilicky
		rhyperior
		tangrowth
		electivire
		magmortar
		togekiss
		yanmega
		leafeon
		glaceon
		gliscor
		mamoswine
		porygon z
		probopass
		dusknoir
		froslass
		rotom
		uxie
		mesprit
		azelf
		dialga
		palkia
		heatran
		regigigas
		giratina
		cresselia
		phione
		manaphy
		darkrai
		shaymin
		victini
		snivy
		servine
		serperior
		tepig
		pignite
		emboar
		oshawott
		dewott
		samurott
		patrat
		watchog
		lillipup
		herdier
		stoutland
		purrloin
		liepard
		pansage
		simisage
		pansear
		simisear
		panpour
		simipour
		munna
		musharna
		blitzle
		zebstrika
		roggenrola
		boldore
		gigalith
		woobat
		swoobat
		drilbur
		excadrill
		audino
		timburr
		gurdurr
		conkeldurr
		tynamo
		eelektrik
		eelektross
		litwick
		lampent
		chandelure
		axew
		fraxure
		haxorus
		deino
		zweilous
		hydreigon
		reshiram
		zekrom
		kyurem
	`),
	FORT: lines(`
		tilted towers
		dusty depot
		dusty divot
		moisty mire
		fatal fields
		snobby shores
		junk junction
		flush factory
		paradise palms
		tomato temple
		neo tilted
		pressure plant
		catty corner
		camp cod
		coral castle
		weeping woods
		coney crossroads
		sanctuary
		daily bugle
		grim gables
		chonkers speedway
		stealthy stronghold
		herald sanctum
		ruined reels
		citadel
		anvil square
		slap shores
		knotty nets
		rumble ruins
		creaky compound
		sanguine suites
		brutal bastion
		fencing fields
		rebel roost
		restored reels
		reckless railways
		grim gate
		lavish lair
		classy courts
		grand glacier
		mt olympus
		island of doom
		rocket ram
		kinetic blade
		kinetic boomerang
		thunder spear
		business turret
		guardian shield
		port a bunker
		port a fort
		port a fortress
		boogie bomb
		boombox
		clinger
		cow catcher
		launch pad
		rift to go
		slap splashes
		big pot
		shield keg
		chug cannon
		chug jug
		flopper
		slap fish
		thermal fish
		hammer pump shotgun
		auto shotgun
		frenzy auto shotgun
		maven auto shotgun
		combat assault rifle
		twin mag smg
		mk seven assault rifle
		red eye assault rifle
		thunder burst smg
		enforcer ar
		warforged assault rifle
		harbinger smg
		frenzy shotgun
		reaper sniper rifle
		lock on pistol
		hand cannon
		chapter 1
		chapter 2
		chapter 3
		chapter 4
		chapter 5
		victory royale
		crown win
		reboot van
		augment
		reality augment
		`),
	VALO: lines(`
		abyss
		lotus
		sunset
		pearl
		fracture
		breeze
		icebox
		haven
		split
		bind
		ascent
		iso
		deadlock
		harbor
		gekko
		fade
		chamber
		neon
		astra
		kayo
		yoru
		skye
		killjoy
		reyna
		raze
		breach
		omen
		brimstone
		viper
		phoenix
		sage
		sova
		cypher
		jett
		clove
		waylay
		satchel jump
		dry peek
		jiggle peek
		shoulder peek
		op shot
		eco frag
		half buy
		full buy
		anti eco
		anti flash
		trade kill
		contact play
		split push
		fake execute
		fast rotate
		anchor smoke
		retake molly
		sova dart
		shock dart
		hunters fury
		blades
		run it back
		tour de force
		seek them out
		null cmd
		rolling thunder
		from the shadows
		toxic screen
		incendiary
		orbital strike
		`),
	PUBG: lines(`
		vector extended mag
		ar suppressor
		sr suppressor
		dmr suppressor
		ar compensator
		sr compensator
		smg compensator
		ar flash hider
		sr flash hider
		angled foregrip
		vertical foregrip
		lightweight grip
		half grip
		thumb grip
		laser sight
		tactical stock
		ar extended quickdraw
		smg extended quickdraw
		7.62mm
		5.56mm
		9mm
		45 acp
		12 gauge
		300 magnum
		flare gun
		spike trap
		jerry can
		emergency pickup
		blue chip detector
		emergency parachute
		mountain bike
		pillar security car
		zima
		coupe rb
		mirado
		dacia
		uaz
		aquarail
		boat
		helicopter
		taego secret room
		vikendi train station
		ruins sanhok
		pai nan
		kampong
		mongnai
		paradise resort
		bootcamp sanhok
		ha tinh
		hatinh
		khao
		coal mine
		castle
		podvosto
		dinoland
		cement factory
		cosmodrome
		sawmill
		volnova
		abbey
		lakawi
		las leones
		monte nuevo
		impala
		water city
		terminal
		ripton
		arena
		dropshot
		chicken dinner
		blue zone
		red zone
		care package
		self revive
		teammate recall
	`),
	APEX: lines(`
		bangalore
		bloodhound
		caustic
		gibraltar
		lifeline
		mirage
		octane
		pathfinder
		wraith
		wattson
		crypto
		revenant
		loba
		rampart
		horizon
		fuse
		valkyrie
		seer
		ash
		mad maggie
		newcastle
		vantage
		catalyst
		ballistic
		conduit
		alter
		bangalore smoke
		beast of the hunt
		nox vision
		defensive bombardment
		care package
		dimensional rift
		zipline gun
		launch pad
		rolling thunder
		drone emp
		death totem
		black market boutique
		amp cover
		black hole
		motherlode
		skyward dive
		exhibit
		phase breach
		wrecking ball apex
		castle wall
		snipers mark
		dark veil
		tempest
		ring flare
		replicator
		crafting material
		evo shield
		hammerpoint rounds
		skullpiercer
		turbocharger
		double tap trigger
		boosted loader
		kinetic feeder
		shatter caps
		hammerpoint
		skull town east
		thunder watch
		cenote cave
		mill
		command center
		production yard
		countdown
		lava siphon
		bonsai plaza
		grow towers
		orbital cannon
		`),
	OVW: lines(`
		roadhog
		ramattra
		sigma
		venture
		roadhog hook
		biotic grenade
		sleep dart
		nano boost
		immortality field
		amp matrix
		repair pack
		inspire
		whip shot
		solar rifle
		captive sun
		ofuda
		swift step
		kitsune rush
		petal platform
		life grip
		tree of life
		crossfade
		sound barrier
		guardian angel
		resurrect
		coalescence
		orb of discord
		transcendence
		fusion cannons
		micro missiles
		self destruct
		power block
		meteor strike
		rampage
		commanding shout
		barrier field
		fire strike
		earthshatter
		fortify
		terra surge
		jump pack
		primal rage
		grapple claw
		minefield
		graviton surge
		bob
		dynamite
		reconfigure
		artillery
		combat roll
		magnetic grenade
		duplicate
		focusing beam
		deflect
		dragonblade
		sonic arrow
		storm arrow
		riptire
		ice wall
		blizzard
		barrage
		helix rockets
		hack
		emp overwatch
		photon barrier
		turret overload
		pulse pistols
		infra sight
		ilios
		dorado
		gibraltar
		midtown
		monte carlo
		toronto
		throne of anubis
		`),
};
