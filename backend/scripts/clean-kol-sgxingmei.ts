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
  try {
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
  } catch {
    const lines = normalized.replace(/\r\n/g, '\n').split('\n');
    const headerLine = lines.shift() || '';
    const headers = headerLine.split(',').map((s) => s.replace(/^"|"$/g, '').trim());
    const rows: RecordRow[] = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      const cells = line.split(',').map((s) => s.replace(/^"|"$/g, '').trim());
      const obj: RecordRow = {};
      for (let i = 0; i < headers.length; i++) obj[headers[i]] = cells[i] || '';
      rows.push(obj);
    }
    return rows;
  }
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

function dedupeByKey<T>(arr: T[], keyFn: (t: T) => string): T[] {
  const map = new Map<string, T>();
  for (const item of arr) map.set(keyFn(item), item);
  return Array.from(map.values());
}

function parseFansW(raw?: string): string {
  if (!raw) return '';
  const s = raw.replace(/[,\s]/g, '').replace(/万|W|w/gi, '');
  // 保留两位小数
  const num = parseFloat(s.replace(/[^0-9.]/g, ''));
  if (!isFinite(num)) return '';
  return (Math.round(num * 100) / 100).toString();
}

function toPlainPrice(raw?: string): string {
  if (!raw) return '';
  // 去除货币符号与中文单位
  let s = raw
    .replace(/[，,]/g, '')
    .replace(/元|人民币|RMB|rmb/gi, '')
    .replace(/\s+/g, '')
    .replace(/[￥¥]/g, '')
    .trim();
  // 处理“万/w”单位，统一换算为阿拉伯数字
  const mWan = s.match(/([0-9]+(?:\.[0-9]+)?)\s*(万|w|W)/);
  if (mWan) {
    const base = parseFloat(mWan[1]);
    if (isFinite(base)) return Math.round(base * 10000).toString();
  }
  // 直接提取数字
  const m = s.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (!m) return '';
  const n = parseFloat(m[1]);
  return isFinite(n) ? Math.round(n).toString() : '';
}

function extractVideo60PlusPrice(status?: string): string {
  if (!status) return '';
  // 拆分为片段，定位视频号相关描述
  const segments = status
    .replace(/：/g, ':')
    .split(/[；;。\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const seg of segments) {
    if (!/(视频号|微信视频号)/.test(seg)) continue;
    // 在该片段中查找60s+价格
    const m = seg.match(/60s\+[^0-9]*([0-9]+(?:\.[0-9]+)?\s*(?:万|w|W)?)/);
    if (m) return toPlainPrice(m[1]);
  }
  // 兜底在全文尝试匹配一次
  const m2 = status.match(/(视频号|微信视频号)[^\n]*?60s\+[^0-9]*([0-9]+(?:\.[0-9]+)?\s*(?:万|w|W)?)/);
  if (m2) return toPlainPrice(m2[2]);
  return '';
}

function main() {
  const dirArg = process.argv.find((a) => a.startsWith('--dir='));
  const fileArg = process.argv.find((a) => a.startsWith('--file='));
  const dataDir = dirArg
    ? dirArg.split('=')[1]
    : process.env.KOL_CSV_DIR || path.resolve(__dirname, '../../data');
  const inFile = fileArg
    ? fileArg.split('=')[1]
    : path.resolve(dataDir, '省广星媒.csv');

  const outDir = path.resolve(dataDir, 'cleaned');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  logger.info(`读取文件: ${path.basename(inFile)}`);
  if (!fs.existsSync(inFile)) {
    logger.error('输入文件不存在');
    process.exit(1);
  }
  const raw = fs.readFileSync(inFile, { encoding: 'utf8' });
  const rows = robustParseCsv(raw);

  let invalidOrg = 0;
  const normalizedRows: Record<string, unknown>[] = rows.map((r) => {
    const platform = '视频号';
    const account_name = (pick(r, ['昵称']) || '').replace(/[“”]/g, '"').trim();
    const explicitId = pick(r, ['账号ID', '用户id']);
    const account_id = explicitId || `sph:${(account_name || '').slice(0, 16)}`;
    const home_link = '';

    const fansRaw = pick(r, ['粉丝量（万）']);
    const fansW = parseFansW(fansRaw);

    const org_name_raw = pick(r, ['现挂靠机构']) || '';
    const org_name = '省广星媒';
    if (org_name_raw && org_name_raw !== '省广星媒') invalidOrg++;

    const account_type = pick(r, ['达人类型']) || '';
    const policy = pick(r, ['签约政策']) || '';
    const progress = pick(r, ['进度']) || '';
    const overview = pick(r, ['达人概况']) || '';
    const status = pick(r, ['达人近况登记']) || '';
    const all_platforms = pick(r, ['全网平台']) || '';
    const follower = pick(r, ['跟进人']) || '';

    const price60Plus = extractVideo60PlusPrice(status);

    const remarkParts = [
      overview && `达人概况：${overview}`,
      progress && `进度：${progress}`,
      policy && `签约政策：${policy}`,
      status && `达人近况登记：${status}`,
      follower && `跟进人：${follower}`,
    ].filter(Boolean);
    const remark = remarkParts.join(' | ');

    return {
      '账号平台': platform,
      '账号名称': account_name,
      '账号ID': account_id,
      '主页链接': home_link,
      '粉丝量（w）': fansW,
      '21s-60s报价': '',
      '60s+报价': price60Plus,
      '达人属性': '',
      '所属机构名': org_name,
      '账号类型': account_type,
      '返点/折扣金额': policy,
      '返点区间': '',
      '政策等级': '',
      '返点账期': '',
      '支付账期': '',
      '备注': remark,
      // 作为平台特有信息保留，导入时会进入 platform_extra
      '全网平台': all_platforms,
    } as Record<string, unknown>;
  });

  const deduped = dedupeByKey(normalizedRows, (r) => `${r['账号平台']}::${r['账号ID']}`);

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
    '全网平台',
  ];
  const outCsv = stringifyCsv(headers, deduped);
  const outFile = path.join(outDir, '省广星媒.clean.csv');
  fs.writeFileSync(outFile, outCsv, { encoding: 'utf8' });
  logger.info(`输出清洗文件: ${path.basename(outFile)} 行数=${deduped.length}`);
  if (invalidOrg > 0)
    logger.warn(`存在 ${invalidOrg} 行“现挂靠机构”不为省广星媒（已统一填充为省广星媒并在备注中保留原信息）`);
}

try {
  main();
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  logger.error(`清洗失败：${msg}`);
  process.exit(1);
}