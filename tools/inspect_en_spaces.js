const { Pool } = require("../Server/lib/node_modules/pg");
const GLOBAL = require("../Server/lib/sub/global.json");
const pool = new Pool({ user: GLOBAL.PG_USER, password: GLOBAL.PG_PASSWORD, host: GLOBAL.PG_HOST, port: GLOBAL.PG_PORT, database: GLOBAL.PG_DATABASE });
(async()=>{
  const q = await pool.query(`SELECT COUNT(*)::int AS count FROM kkutu_en WHERE _id ~ '\\s'`);
  const q2 = await pool.query(`SELECT _id FROM kkutu_en WHERE _id ~ '\\s' LIMIT 20`);
  console.log(JSON.stringify({withSpaces:q.rows[0], samples:q2.rows},null,2));
  await pool.end();
})().catch(e=>{console.error(e);process.exit(1)});
