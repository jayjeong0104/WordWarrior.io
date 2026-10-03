const { Pool } = require("../Server/lib/node_modules/pg");
const GLOBAL = require("../Server/lib/sub/global.json");

async function main() {
  const pool = new Pool({
    user: GLOBAL.PG_USER,
    password: GLOBAL.PG_PASSWORD,
    host: GLOBAL.PG_HOST,
    port: GLOBAL.PG_PORT,
    database: GLOBAL.PG_DATABASE,
  });

  try {
    const stats = await pool.query(`
      SELECT 'kkutu_en' AS table_name, COUNT(*)::int AS count FROM kkutu_en
      UNION ALL
      SELECT 'kkutu_ko' AS table_name, COUNT(*)::int AS count FROM kkutu_ko
      UNION ALL
      SELECT 'kkutu_injeong' AS table_name, COUNT(*)::int AS count FROM kkutu_injeong
    `);
    console.log("TABLE_COUNTS");
    console.log(JSON.stringify(stats.rows, null, 2));

    const enThemes = await pool.query(`
      SELECT theme, COUNT(*)::int AS count
      FROM kkutu_en
      WHERE theme IS NOT NULL AND theme <> ''
      GROUP BY theme
      ORDER BY count DESC
      LIMIT 50
    `);
    console.log("EN_THEME_GROUPS");
    console.log(JSON.stringify(enThemes.rows, null, 2));

    const enSubjectCounts = await pool.query(`
      WITH split AS (
        SELECT regexp_split_to_table(theme, ',') AS subject
        FROM kkutu_en
        WHERE theme IS NOT NULL AND theme <> ''
      )
      SELECT subject, COUNT(*)::int AS count
      FROM split
      WHERE subject <> ''
      GROUP BY subject
      ORDER BY count DESC, subject
      LIMIT 100
    `);
    console.log("EN_SUBJECT_COUNTS");
    console.log(JSON.stringify(enSubjectCounts.rows, null, 2));

    const emptyEnglish = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM kkutu_en
      WHERE COALESCE(theme, '') = ''
        AND (mean IS NULL OR btrim(mean) = '')
    `);
    console.log("EN_EMPTY_WORDS");
    console.log(JSON.stringify(emptyEnglish.rows, null, 2));

    const shortPlaceNames = await pool.query(`
      SELECT _id, type, theme, mean
      FROM kkutu_en
      WHERE (',' || COALESCE(theme, '') || ',') LIKE '%,e15,%'
        AND length(_id) <= 3
      ORDER BY length(_id), _id
      LIMIT 300
    `);
    console.log("EN_SHORT_PLACE_NAMES");
    console.log(JSON.stringify(shortPlaceNames.rows, null, 2));

    const allSubjects = await pool.query(`
      WITH split AS (
        SELECT DISTINCT regexp_split_to_table(theme, ',') AS subject
        FROM kkutu_en
        WHERE theme IS NOT NULL AND theme <> ''
      )
      SELECT subject
      FROM split
      WHERE subject <> ''
      ORDER BY subject
    `);
    console.log("EN_ALL_SUBJECT_CODES");
    console.log(JSON.stringify(allSubjects.rows, null, 2));

    const sampleWord = await pool.query(`
      SELECT *
      FROM kkutu_en
      LIMIT 1
    `);
    console.log("EN_SAMPLE_WORD");
    console.log(JSON.stringify(sampleWord.rows, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
