const { Pool } = require("../Server/lib/node_modules/pg");
const GLOBAL = require("../Server/lib/sub/global.json");

const pool = new Pool({
	user: GLOBAL.PG_USER,
	password: GLOBAL.PG_PASSWORD,
	port: GLOBAL.PG_PORT,
	database: GLOBAL.PG_DATABASE,
	host: GLOBAL.PG_HOST
});

async function main(){
	await pool.query(`
		CREATE TABLE IF NOT EXISTS kkutu_vocab (
			_id TEXT PRIMARY KEY,
			lists JSONB NOT NULL DEFAULT '[]'::jsonb,
			"updatedAt" BIGINT NOT NULL DEFAULT 0
		)
	`);
	const { rows } = await pool.query(`
		SELECT column_name, data_type
		FROM information_schema.columns
		WHERE table_name = 'kkutu_vocab'
		ORDER BY ordinal_position
	`);
	console.table(rows);
}

main().catch((err) => {
	console.error(err);
	process.exitCode = 1;
}).finally(() => pool.end());
