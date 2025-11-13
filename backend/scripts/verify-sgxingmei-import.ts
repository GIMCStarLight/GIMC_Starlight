import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { parse as parseCsv } from 'csv-parse/sync';
import { Client } from 'pg';

dotenv.config();

type RecordRow = Record<string, string>;

const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  warn: (msg: string) => console.log(`[WARN] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`),
};

function robustParseCsv(text: string): RecordRow[] {
  const normalized = text.replace(/[“”]/g, '"');
  const raw = parseCsv(normalized, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_column_count: true,
    relax_quotes: true,
    skip_records_with_error: true,
    record_delimiter: ['\n', '\r\n'],
  });
  const records: RecordRow[] = (Array.isArray(raw) ? raw : []).map(
    (r: Record<string, unknown>) => {
      const obj: RecordRow = {};
      for (const [k, v] of Object.entries(r)) obj[k] = v == null ? '' : String(v);
      return obj;
    },
  );
  return records;
}

async function main() {
  const dirArg = process.argv.find((a) => a.startsWith('--dir='));
  const fileArg = process.argv.find((a) => a.startsWith('--file='));
  const dataDir = dirArg
    ? dirArg.split('=')[1]
    : process.env.KOL_CSV_DIR || path.resolve(__dirname, '../../data');
  const inFile = fileArg
    ? fileArg.split('=')[1]
    : path.resolve(dataDir, 'cleaned/省广星媒.clean.csv');

  if (!fs.existsSync(inFile)) {
    logger.error(`未找到清洗文件: ${inFile}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(inFile, { encoding: 'utf8' });
  const rows = robustParseCsv(raw);
  const accountIds = rows.map((r) => r['账号ID']).filter((s) => s && s.trim());
  const expectedCount = rows.length;

  logger.info(`清洗文件行数: ${expectedCount}`);

  const client = new Client({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  await client.connect();

  const totalRes = await client.query(
    `SELECT COUNT(*)::int AS cnt FROM kol_list WHERE platform = $1 AND org_name = $2`,
    ['视频号', '省广星媒'],
  );
  const totalCount: number = totalRes.rows[0]?.cnt ?? 0;
  logger.info(`DB计数（平台=视频号，机构=省广星媒）: ${totalCount}`);

  const res2 = await client.query(
    `SELECT COUNT(*)::int AS cnt FROM kol_list WHERE platform = $1 AND account_id = ANY($2)`,
    ['视频号', accountIds],
  );
  const matchedCount: number = res2.rows[0]?.cnt ?? 0;
  logger.info(`DB计数（按账号ID匹配）: ${matchedCount}`);

  const sampleRes = await client.query(
    `SELECT account_name, account_id, fans_count_w, star_quote_60s_plus, org_name FROM kol_list WHERE platform = $1 AND org_name = $2 ORDER BY id DESC LIMIT 5`,
    ['视频号', '省广星媒'],
  );
  if (sampleRes.rowCount) {
    logger.info(`样例（最新5条）:`);
    for (const r of sampleRes.rows) {
      console.log(
        ` - 名称=${r.account_name} ID=${r.account_id} 粉丝(w)=${r.fans_count_w} 60s+报价=${r.star_quote_60s_plus} 机构=${r.org_name}`,
      );
    }
  }

  await client.end();
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  logger.error(`验证失败：${msg}`);
  process.exit(1);
});