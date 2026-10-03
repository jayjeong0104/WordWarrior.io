const fs = require('fs');
const path = require('path');
const { Pool } = require('../Server/lib/node_modules/pg');
const GLOBAL = require('../Server/lib/sub/global.json');

const REFERENCE_SQL = path.join(
  __dirname,
  '..',
  'original file',
  'KKuTu-master_original',
  'db.sql'
);

const pool = new Pool({
  host: GLOBAL.PG_HOST,
  user: GLOBAL.PG_USER,
  password: GLOBAL.PG_PASSWORD,
  port: GLOBAL.PG_PORT,
  database: GLOBAL.PG_DATABASE,
});

function decodeCopyField(field) {
  if (field === '\\N') return null;
  return field
    .replace(/\\\\/g, '\\')
    .replace(/\\t/g, '\t')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r');
}

function stripExamplesFromDefinition(text) {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';
  return trimmed.split(';')[0].trim();
}

function normalizeMean(rawMean) {
  if (!rawMean) return rawMean;

  const numberedMatches = [...rawMean.matchAll(/＂(\d+)＂/g)];
  if (!numberedMatches.length) {
    return stripExamplesFromDefinition(rawMean);
  }

  const parts = [];
  for (let i = 0; i < numberedMatches.length; i++) {
    const current = numberedMatches[i];
    const next = numberedMatches[i + 1];
    const number = current[1];
    const start = current.index + current[0].length;
    const end = next ? next.index : rawMean.length;
    const body = rawMean.slice(start, end);
    const cleaned = stripExamplesFromDefinition(body);
    parts.push(cleaned ? `＂${number}＂ ${cleaned}` : `＂${number}＂`);
  }

  return parts.join('  ').trim();
}

function extractCopySection(sqlText, tableName) {
  const marker = `COPY ${tableName} (_id, type, mean, hit, theme, flag) FROM stdin;`;
  const start = sqlText.indexOf(marker);
  if (start === -1) return [];

  const bodyStart = start + marker.length;
  const bodyEnd = sqlText.indexOf('\n\\.', bodyStart);
  if (bodyEnd === -1) return [];

  const lines = sqlText
    .slice(bodyStart, bodyEnd)
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);

  return lines.map((line) => {
    const [id, type, mean] = line.split('\t').map(decodeCopyField);
    return { id, type, mean };
  });
}

async function syncTable(tableName, referenceRows) {
  if (!referenceRows.length) {
    console.log(`${tableName}: no reference rows found`);
    return;
  }

  const ids = referenceRows.map((row) => row.id);
  const existing = await pool.query(
    `SELECT _id, mean FROM ${tableName} WHERE _id = ANY($1::varchar[])`,
    [ids]
  );
  const existingMap = new Map(existing.rows.map((row) => [row._id, row.mean]));

  const updates = [];
  let unchanged = 0;
  let missing = 0;

  for (const row of referenceRows) {
    if (!existingMap.has(row.id)) {
      missing += 1;
      continue;
    }

    const normalizedMean = normalizeMean(row.mean);
    if (existingMap.get(row.id) === normalizedMean) {
      unchanged += 1;
      continue;
    }

    updates.push([row.id, normalizedMean]);
  }

  let updated = 0;
  const batchSize = 500;
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    const values = [];
    const placeholders = batch
      .map(([id, mean], index) => {
        const base = index * 2;
        values.push(id, mean);
        return `($${base + 1}, $${base + 2})`;
      })
      .join(', ');

    const sql = `
      UPDATE ${tableName} AS tgt
      SET mean = src.mean
      FROM (VALUES ${placeholders}) AS src(_id, mean)
      WHERE tgt._id = src._id
    `;
    await pool.query(sql, values);
    updated += batch.length;
  }

  console.log(
    `${tableName}: updated=${updated}, unchanged=${unchanged}, missing_in_current=${missing}`
  );
}

async function main() {
  const sqlText = fs.readFileSync(REFERENCE_SQL, 'utf8');
  const enRows = extractCopySection(sqlText, 'kkutu_en');
  const koRows = extractCopySection(sqlText, 'kkutu_ko');

  await syncTable('kkutu_en', enRows);
  await syncTable('kkutu_ko', koRows);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
