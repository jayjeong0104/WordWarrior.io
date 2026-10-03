const { Pool } = require("../Server/lib/node_modules/pg");
const GLOBAL = require("../Server/lib/sub/global.json");

// The ten cosmetics shown in codex-clipboard-70821471-aa2e-4fc4-9824-a0035550d37e.png.
const REMOVED_IDS = Object.freeze([
	"void_regent_helmet",
	"harbor_umbrella",
	"harbor_rain_shoes",
	"harbor_rain_jacket",
	"harbor_rain_cap",
	"moonlit_halo",
	"starlight_wand",
	"moonstep_boots",
	"starlight_cape",
	"starlight_beret"
]);

const pool = new Pool({
	user: GLOBAL.PG_USER,
	password: GLOBAL.PG_PASSWORD,
	port: GLOBAL.PG_PORT,
	database: GLOBAL.PG_DATABASE,
	host: GLOBAL.PG_HOST
});

function hasOwn(value, key){
	return Object.prototype.hasOwnProperty.call(value, key);
}

function normalizeRecord(value){
	if(!value || typeof value !== "object" || Array.isArray(value)) return {};
	return { ...value };
}

function referencePredicate(){
	return REMOVED_IDS
		.map((_, index) => `(box::text LIKE $${index + 1} OR equip::text LIKE $${index + 1})`)
		.join(" OR ");
}

async function scrubUserInventories(client){
	const patterns = REMOVED_IDS.map((id) => `%${id}%`);
	const result = await client.query(
		`SELECT _id, box, equip FROM users WHERE ${referencePredicate()}`,
		patterns
	);
	let usersUpdated = 0;
	let inventoryEntriesRemoved = 0;
	let equippedSlotsCleared = 0;

	for(const row of result.rows){
		const box = normalizeRecord(row.box);
		const equip = normalizeRecord(row.equip);
		let dirty = false;

		for(const id of REMOVED_IDS){
			if(!hasOwn(box, id)) continue;
			delete box[id];
			inventoryEntriesRemoved += 1;
			dirty = true;
		}

		for(const slot of Object.keys(equip)){
			if(!REMOVED_IDS.includes(equip[slot])) continue;
			delete equip[slot];
			equippedSlotsCleared += 1;
			dirty = true;
		}

		if(!dirty) continue;
		await client.query(
			`UPDATE users SET box = $2, equip = $3 WHERE _id = $1`,
			[row._id, JSON.stringify(box), JSON.stringify(equip)]
		);
		usersUpdated += 1;
	}

	return { usersUpdated, inventoryEntriesRemoved, equippedSlotsCleared };
}

async function verifyRemoval(client){
	const patterns = REMOVED_IDS.map((id) => `%${id}%`);
	const store = await client.query(
		`SELECT _id FROM kkutu_shop WHERE _id = ANY($1::text[]) ORDER BY _id`,
		[REMOVED_IDS]
	);
	const descriptions = await client.query(
		`SELECT _id FROM kkutu_shop_desc WHERE _id = ANY($1::text[]) ORDER BY _id`,
		[REMOVED_IDS]
	);
	const users = await client.query(
		`SELECT _id FROM users WHERE ${referencePredicate()} ORDER BY _id`,
		patterns
	);
	return {
		remainingStoreIds: store.rows.map((row) => row._id),
		remainingDescriptionIds: descriptions.rows.map((row) => row._id),
		remainingUserIds: users.rows.map((row) => row._id)
	};
}

async function main(){
	const client = await pool.connect();
	try{
		await client.query("BEGIN");
		const descriptions = await client.query(
			`DELETE FROM kkutu_shop_desc WHERE _id = ANY($1::text[]) RETURNING _id`,
			[REMOVED_IDS]
		);
		const store = await client.query(
			`DELETE FROM kkutu_shop WHERE _id = ANY($1::text[]) RETURNING _id`,
			[REMOVED_IDS]
		);
		const users = await scrubUserInventories(client);
		const verification = await verifyRemoval(client);

		if(
			verification.remainingStoreIds.length ||
			verification.remainingDescriptionIds.length ||
			verification.remainingUserIds.length
		){
			throw new Error(`Removal verification failed: ${JSON.stringify(verification)}`);
		}

		await client.query("COMMIT");
		console.log(JSON.stringify({
			removedIds: REMOVED_IDS,
			storeRowsDeleted: store.rowCount,
			descriptionRowsDeleted: descriptions.rowCount,
			...users,
			verification
		}, null, 2));
	}catch(err){
		await client.query("ROLLBACK");
		throw err;
	}finally{
		client.release();
		await pool.end();
	}
}

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
});
