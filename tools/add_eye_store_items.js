const { Pool } = require("../Server/lib/node_modules/pg");
const GLOBAL = require("../Server/lib/sub/global.json");

const now = Date.now();
const REMOVED_IDS = [
	"moon_glow",
	"nova_glint",
	"ember_lash",
	"aurora_gaze",
	"comet_arc",
	"crystal_tide",
	"velvet_lid",
	"royal_glint",
	"prism_flash",
	"sunset_lash",
	"frost_shine",
	"orbit_gaze",
	"wink_eye",
	"sparkle_eyes",
	"star_eyes",
	"heart_eyes",
	"sleepy_dream",
	"sharp_glance"
];
const ITEMS = [];

const pool = new Pool({
	user: GLOBAL.PG_USER,
	password: GLOBAL.PG_PASSWORD,
	port: GLOBAL.PG_PORT,
	database: GLOBAL.PG_DATABASE,
	host: GLOBAL.PG_HOST
});

function hasOwn(obj, key){
	return Object.prototype.hasOwnProperty.call(obj, key);
}
function normalizeRecord(value){
	if(!value || typeof value !== "object" || Array.isArray(value)) return {};
	return { ...value };
}
async function scrubRemovedEyesFromUsers(client){
	const patterns = REMOVED_IDS.map((id) => "%" + id + "%");
	const where = REMOVED_IDS.map((_, index) => `box::text LIKE $${index + 1} OR equip::text LIKE $${index + 1}`).join(" OR ");
	const result = await client.query(
		`SELECT _id, box, equip FROM users WHERE ${where}`,
		patterns
	);
	let updated = 0;

	for(const row of result.rows){
		const box = normalizeRecord(row.box);
		const equip = normalizeRecord(row.equip);
		let dirty = false;

		for(const id of REMOVED_IDS){
			if(hasOwn(box, id)){
				delete box[id];
				dirty = true;
			}
		}
		for(const key of Object.keys(equip)){
			if(REMOVED_IDS.includes(equip[key])){
				delete equip[key];
				dirty = true;
			}
		}
		if(!dirty) continue;

		await client.query(
			`UPDATE users SET box = $2::jsonb, equip = $3::jsonb WHERE _id = $1`,
			[row._id, JSON.stringify(box), JSON.stringify(equip)]
		);
		updated += 1;
	}
	return updated;
}

async function upsertEyeItems(client){
	for(let i = 0; i < ITEMS.length; i++){
		const item = ITEMS[i];
		const updatedAt = now + i;

		await client.query(`
			INSERT INTO kkutu_shop (_id, "group", cost, term, options, "updatedAt", hit)
			VALUES ($1, $2, $3, $4, $5::jsonb, $6, 0)
			ON CONFLICT (_id) DO UPDATE SET
				"group" = EXCLUDED."group",
				cost = EXCLUDED.cost,
				term = EXCLUDED.term,
				options = EXCLUDED.options,
				"updatedAt" = EXCLUDED."updatedAt"
		`, [ item.id, "Meye", item.cost, 0, "{}", updatedAt ]);

		await client.query(`
			INSERT INTO kkutu_shop_desc (_id, "name_en_US", "desc_en_US", "name_ko_KR", "desc_ko_KR")
			VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT (_id) DO UPDATE SET
				"name_en_US" = EXCLUDED."name_en_US",
				"desc_en_US" = EXCLUDED."desc_en_US",
				"name_ko_KR" = EXCLUDED."name_ko_KR",
				"desc_ko_KR" = EXCLUDED."desc_ko_KR"
		`, [ item.id, item.name, item.desc, item.name, item.desc ]);
	}
}

async function main(){
	const client = await pool.connect();

	try{
		await client.query("BEGIN");
		await client.query(`DELETE FROM kkutu_shop_desc WHERE _id = ANY($1::text[])`, [REMOVED_IDS]);
		await client.query(`DELETE FROM kkutu_shop WHERE _id = ANY($1::text[])`, [REMOVED_IDS]);
		const cleanedUsers = await scrubRemovedEyesFromUsers(client);
		await upsertEyeItems(client);
		await client.query("COMMIT");

		console.log("Removed eye ids:", REMOVED_IDS.join(", "));
		console.log("Users cleaned:", cleanedUsers);
		console.table(ITEMS.map((item) => ({
			_id: item.id,
			group: "Meye",
			cost: item.cost,
			name: item.name
		})));
	}catch(err){
		await client.query("ROLLBACK");
		throw err;
	}finally{
		client.release();
	}
}

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
}).finally(() => pool.end());
