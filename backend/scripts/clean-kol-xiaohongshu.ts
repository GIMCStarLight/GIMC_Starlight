import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { parse as parseCsv } from 'csv-parse/sync';

dotenv.config();

type RecordRow = Record<string, string>;

const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  warn: (msg: string) => console.log(`[WARN] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`),
};

function pick(record: RecordRow, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = record[k];
    if (v !== undefined && String(v).trim() !== '') return String(v).trim();
  }
  return undefined;
}

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

function safeCsvField(value: unknown): string {
  const s = value === undefined || value === null ? '' : String(value);
  const needsQuote = /[",\n]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}

function stringifyCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const lines: string[] = [];
  lines.push(headers.map((h) => safeCsvField(h)).join(','));
  for (const row of rows) {
    const line = headers.map((h) => safeCsvField(row[h])).join(',');
    lines.push(line);
  }
  return lines.join('\n');
}

function extractXhsId(explicitId: string | undefined, homeLink: string | undefined): string | undefined {
  if (explicitId && explicitId.trim()) return explicitId.trim();
  if (homeLink) {
    try {
      const url = new URL(homeLink);
      const segs = url.pathname.split('/').filter(Boolean);
      const idx = segs.indexOf('profile');
      if (idx >= 0 && segs[idx + 1]) return segs[idx + 1];
    } catch {}
  }
  return undefined;
}

function main() {
  const dirArg = process.argv.find((a) => a.startsWith('--dir='));
  const fileArg = process.argv.find((a) => a.startsWith('--file='));
  const dataDir = dirArg
    ? dirArg.split('=')[1]
    : process.env.KOL_CSV_DIR || path.resolve(__dirname, '../../data');
  const inFile = fileArg
    ? fileArg.split('=')[1]
    : path.resolve(dataDir, '小红书.csv');

  const outDir = path.resolve(dataDir, 'cleaned');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  logger.info(`读取文件: ${path.basename(inFile)}`);
  if (!fs.existsSync(inFile)) {
    logger.error('输入文件不存在');
    process.exit(1);
  }
  const raw = fs.readFileSync(inFile, { encoding: 'utf8' });
  const rows = robustParseCsv(raw);

  const normalizedRows: Record<string, unknown>[] = rows.map((r) => {
    const platform = '小红书';
    const account_name = (pick(r, ['账号名称', '账号名', '昵称']) || '').replace(/[“”]/g, '"').trim();
    const home_link = pick(r, ['主页链接', '账号链接']) || '';
    const explicitId = pick(r, ['账号ID', '用户id', 'UID', 'uid']);
    let account_id = extractXhsId(explicitId, home_link);
    if (!account_id) account_id = explicitId || `xhs:${(account_name || '').slice(0, 16)}`;

    const fansRaw = pick(r, ['粉丝量（w）', '粉丝量(W)', '粉丝量w', '粉丝量']);
    const org_name = pick(r, ['所属机构名', '所属机构', '机构', '所属机构名称']);
    const category = pick(r, ['账号类型', '类型', '分类']);
    const rebate_amount = pick(r, ['返点/折扣金额', '折扣金额', '返点']);
    const rebate_range = pick(r, ['返点区间']);
    const policy_level = pick(r, ['政策等级']);
    const rebate_period = pick(r, ['返点账期']);
    const pay_period = pick(r, ['支付账期']);
    const remark = pick(r, ['备注']);

    const price_21_60 = pick(r, ['21s-60s报价', '21-60s视频预估报价']);
    const price_60_plus = pick(r, ['60s+报价', '60s以上视频预估报价']);

    const final_link = home_link || (account_id ? `https://www.xiaohongshu.com/user/profile/${account_id}` : '');
    return {
      账号平台: platform,
      账号名称: account_name,
      账号ID: account_id || '',
      主页链接: final_link,
      '粉丝量（w）': fansRaw || '',
      '21s-60s报价': price_21_60 || '',
      '60s+报价': price_60_plus || '',
      所属机构名: org_name || '',
      账号类型: category || '',
      达人属性: pick(r, ['达人属性', '标签']) || '',
      '返点/折扣金额': rebate_amount || '',
      返点区间: rebate_range || '',
      政策等级: policy_level || '',
      返点账期: rebate_period || '',
      支付账期: pay_period || '',
      备注: remark || '',
    };
  });

  const deduped = Array.from(
    new Map(
      normalizedRows.map((t) => [String(`${t['账号平台']}::${t['账号ID']}`), t]),
    ).values(),
  );

  const headers = [
    '账号平台',
    '账号名称',
    '账号ID',
    '主页链接',
    '粉丝量（w）',
    '21s-60s报价',
    '60s+报价',
    '达人属性',
    '所属机构名',
    '账号类型',
    '返点/折扣金额',
    '返点区间',
    '政策等级',
    '返点账期',
    '支付账期',
    '备注',
  ];
  const outCsv = stringifyCsv(headers, deduped);
  const outFile = path.join(outDir, '小红书.clean.csv');
  fs.writeFileSync(outFile, outCsv, { encoding: 'utf8' });
  logger.info(`输出清洗文件: ${path.basename(outFile)} 行数=${deduped.length}`);
}

try {
  main();
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  logger.error(`清洗失败：${msg}`);
  process.exit(1);
}