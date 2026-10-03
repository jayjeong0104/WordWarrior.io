const { Pool } = require("../Server/lib/node_modules/pg");
const GLOBAL = require("../Server/lib/sub/global.json");
const pool = new Pool({ user: GLOBAL.PG_USER, password: GLOBAL.PG_PASSWORD, host: GLOBAL.PG_HOST, port: GLOBAL.PG_PORT, database: GLOBAL.PG_DATABASE });
(async()=>{
  const q = await pool.query(`SELECT type, COUNT(*)::int AS count FROM kkutu_en GROUP BY type ORDER BY count DESC LIMIT 30`);
  console.log(JSON.stringify(q.rows,null,2));
  await pool.end();
})().catch(e=>{console.error(e);process.exit(1)});
