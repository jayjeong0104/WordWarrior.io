const { Pool } = require("../Server/lib/node_modules/pg");
const GLOBAL = require("../Server/lib/sub/global.json");

const pool = new Pool({
  user: GLOBAL.PG_USER,
  password: GLOBAL.PG_PASSWORD,
  host: GLOBAL.PG_HOST,
  port: GLOBAL.PG_PORT,
  database: GLOBAL.PG_DATABASE,
});

const TARGET_SUBJECTS = [
  "MINC",
  "STA",
  "450",
  "160",
  "490",
  "240",
  "DSCI",
  "150",
  "30",
  "310",
  "350",
  "1001",
  "POK",
  "NBAP",
  "SOCP",
  "410",
  "100",
  "370",
  "FORT",
  "VALO",
  "PUBG",
  "APEX",
  "OVW",
];

async function countForSubject(subject) {
  return pool.query(
    "SELECT COUNT(*)::int AS count FROM kkutu_en WHERE string_to_array(COALESCE(theme, ''), ',') @> ARRAY[$1]",
    [subject]
  );
}

async function sampleForSubject(subject) {
  return pool.query(
    "SELECT _id, type, theme FROM kkutu_en WHERE string_to_array(COALESCE(theme, ''), ',') @> ARRAY[$1] ORDER BY _id LIMIT 12",
    [subject]
  );
}

async function shortPlaceNames() {
  return pool.query(`
    SELECT _id, type, theme, mean
    FROM kkutu_en
    WHERE string_to_array(COALESCE(theme, ''), ',') @> ARRAY['e15']
      AND length(_id) <= 3
    ORDER BY length(_id), _id
    LIMIT 200
  `);
}

async function main() {
  try {
    for (const subject of TARGET_SUBJECTS) {
      const [count, sample] = await Promise.all([
        countForSubject(subject),
        sampleForSubject(subject),
      ]);
      console.log(`SUBJECT ${subject} ${count.rows[0].count}`);
      console.log(JSON.stringify(sample.rows, null, 2));
    }

    const placeRows = await shortPlaceNames();
    console.log("SHORT_PLACE_NAMES");
    console.log(JSON.stringify(placeRows.rows, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
