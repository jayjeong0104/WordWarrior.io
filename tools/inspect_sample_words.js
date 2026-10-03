const { Pool } = require("../Server/lib/node_modules/pg");
const GLOBAL = require("../Server/lib/sub/global.json");
const pool = new Pool({ user: GLOBAL.PG_USER, password: GLOBAL.PG_PASSWORD, host: GLOBAL.PG_HOST, port: GLOBAL.PG_PORT, database: GLOBAL.PG_DATABASE });
(async()=>{
  const words = ['us','uk','england','pikachu','lebron','messi','jupiter','algorithm','minecraft'];
  const q = await pool.query('SELECT _id, type, theme, mean, flag FROM kkutu_en WHERE _id = ANY($1::text[]) ORDER BY _id',[words]);
  console.log(JSON.stringify(q.rows,null,2));
  await pool.end();
})().catch(e=>{console.error(e);process.exit(1)});
