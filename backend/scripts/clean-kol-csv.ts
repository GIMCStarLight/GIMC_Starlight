import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { parse as parseCsv } from 'csv-parse/sync';
import * as crypto from 'crypto';

dotenv.config();

type RecordRow = Record<string, string>;

const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  warn: (msg: string) => console.log(`[WARN] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`),
};

function normalizePlatform(name: string | undefined): string {
  const n = (name || '').trim();
  const map: Record<string, string> = {
    抖音: 'douyin',
    小红书: 'xiaohongshu',
    B站: 'bilibili',
    哔哩哔哩: 'bilibili',
    微博: 'weibo',
    快手: 'kuaishou',
    视频号: 'wechat_video',
    公众号: 'wechat_official',
  };
  return map[n] || n.toLowerCase();
}

function pick(record: RecordRow, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = record[k];
    if (v !== undefined && String(v).trim() !== '') return String(v).trim();
  }
  return undefined;
}

function parseNumber(input: string | undefined): number | undefined {
  if (!input) return undefined;
  const s = input
    .replace(/[\s,]/g, '')
    .replace(/￥/g, '')
    .replace(/元/g, '')
    .toLowerCase();
  const isWan = /w|万/.test(s);
  const numStr = s.replace(/[^0-9.]/g, '');
  if (!numStr) return undefined;
  const num = parseFloat(numStr);
  if (Number.isNaN(num)) return undefined;
  return isWan ? num : num; // 粉丝量字段统一为“万”单位时直接返回
}

function parsePrice(input: string | undefined): number | undefined {
  if (!input) return undefined;
  const s = input
    .replace(/[\s,]/g, '')
    .replace(/￥/g, '')
    .replace(/元/g, '')
    .toLowerCase();
  const isWan = /w|万/.test(s);
  const numStr = s.replace(/[^0-9.]/g, '');
  if (!numStr) return undefined;
  const num = parseFloat(numStr);
  if (Number.isNaN(num)) return undefined;
  return Math.round(isWan ? num * 10000 : num);
}

function extractAccountId(
  platform: string,
  explicitId: string | undefined,
  homeLink: string | undefined,
  accountName: string,
): string {
  if (explicitId && explicitId.trim()) return explicitId.trim();
  if (homeLink) {
    try {
      const url = new URL(homeLink);
      const host = url.hostname;
      const pathname = url.pathname.replace(/\/$/, '');
      if (host.includes('weibo.com')) {
        const segs = pathname.split('/').filter(Boolean);
        if (segs[0] === 'u' && segs[1]) return segs[1];
        if (segs[0]) return segs[0];
      }
      if (host.includes('bilibili.com')) {
        const segs = pathname.split('/').filter(Boolean);
        const id = segs[segs.length - 1];
        if (id) return id;
      }
      if (host.includes('kuaishou')) {
        const segs = pathname.split('/').filter(Boolean);
        const idx = segs.indexOf('profile');
        if (idx >= 0 && segs[idx + 1]) return segs[idx + 1];
      }
      if (host.includes('xiaohongshu.com')) {
        const segs = pathname.split('/').filter(Boolean);
        const idx = segs.indexOf('profile');
        if (idx >= 0 && segs[idx + 1]) return segs[idx + 1];
      }
    } catch {
      // 非URL格式，忽略
    }
  }
  const hash = crypto
    .createHash('md5')
    .update(`${platform}:${accountName}`)
    .digest('hex')
    .slice(0, 16);
  return `${platform}:${hash}`;
}

function dedupeByKey<T>(arr: T[], keyFn: (t: T) => string): T[] {
  const map = new Map<string, T>();
  for (const item of arr) {
    map.set(keyFn(item), item);
  }
  return Array.from(map.values());
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

function robustParseCsv(text: string): RecordRow[] {
  // 替换智能引号为标准双引号，提高兼容性
  const normalized = text.replace(/[“”]/g, '"');
  try {
    const raw = parseCsv(normalized, {
      columns: true,
      skip_empty_lines: true,
      bom: true,
      relax_column_count: true,
      relax_quotes: true,
      // 遇到错误行跳过，尽量保留可解析数据
      skip_records_with_error: true,
      // 统一记录分隔符
      record_delimiter: ['\n', '\r\n'],
    });
    const records: RecordRow[] = (Array.isArray(raw) ? raw : []).map(
      (r: Record<string, unknown>) => {
        const obj: RecordRow = {};
        for (const [k, v] of Object.entries(r)) {
          obj[k] = v == null ? '' : String(v);
        }
        return obj;
      },
    );
    return records;
  } catch {
    // 极端情况下直接按行切分，简单逗号分隔（可能损失嵌套逗号的精度）
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

function main() {
  const dirArg = process.argv.find((a) => a.startsWith('--dir='));
  const dataDir = dirArg
    ? dirArg.split('=')[1]
    : process.env.KOL_CSV_DIR || path.resolve(__dirname, '../../data');

  const outDir = path.resolve(dataDir, 'cleaned');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  logger.info(`开始清洗目录: ${dataDir}`);
  const files = fs
    .readdirSync(dataDir)
    .filter((f) => f.toLowerCase().endsWith('.csv'))
    .map((f) => path.join(dataDir, f));
  if (files.length === 0) {
    logger.warn('目录内未找到CSV文件');
    process.exit(0);
  }

  let total = 0;
  let parsed = 0;
  let skipped = 0;
  for (const f of files) {
    logger.info(`读取文件: ${path.basename(f)}`);
    const raw = fs.readFileSync(f, { encoding: 'utf8' });
    const rows = robustParseCsv(raw);
    total += rows.length;

    // 规范字段与清洗
    const normalizedRows: Record<string, unknown>[] = rows.map((r) => {
      const platformFromFile = normalizePlatform(path.basename(f, path.extname(f)));
      const platform = normalizePlatform(pick(r, ['账号平台', '主发平台']) || platformFromFile);
      const account_name = (pick(r, ['账号名称', '账号名', '昵称']) || '').replace(/[“”]/g, '"').trim();
      const home_link = pick(r, ['主页链接', '账号链接', '达人链接']);
      const explicitId = pick(r, ['账号ID', '用户id']);
      const account_id = extractAccountId(platform, explicitId, home_link, account_name);

      const followers_w = parseNumber(
        pick(r, ['粉丝量（w）', '粉丝量(W)', '主发平台粉丝量（w）', '粉丝维度']) || undefined,
      );
      const star_quote_21_60s = parsePrice(
        pick(r, ['互选（1/60s）参考价', '21s-60s报价', '21-60s视频预估报价']) || undefined,
      );
      const star_quote_60s_plus = parsePrice(
        pick(r, ['互选（60s+）原创参考价', '60s+报价', '60s以上视频预估报价']) || undefined,
      );

      const org_name = pick(r, ['所属机构名', '所属机构']) || '';
      const category = pick(r, ['账号类型', '标签']) || '';

      return {
        账号平台: platform,
        账号名称: account_name,
        账号ID: account_id,
        主页链接: home_link || '',
        粉丝量_w: followers_w ?? '',
        报价_21_60s: star_quote_21_60s ?? '',
        报价_60s_plus: star_quote_60s_plus ?? '',
        所属机构: org_name,
        账号类型: category,
      };
    });

    // 去重 (platform + account_id)
    const deduped = dedupeByKey<Record<string, unknown>>(
      normalizedRows,
      (e: Record<string, unknown>) =>
        `${String(e['账号平台'] ?? '')}|${String(e['账号ID'] ?? '')}`,
    );

    parsed += deduped.length;
    skipped += rows.length - deduped.length;

    const headers = [
      '账号平台',
      '账号名称',
      '账号ID',
      '主页链接',
      '粉丝量_w',
      '报价_21_60s',
      '报价_60s_plus',
      '所属机构',
      '账号类型',
    ];
    const outCsv = stringifyCsv(headers, deduped);
    const outFile = path.join(outDir, `${path.basename(f, '.csv')}.clean.csv`);
    fs.writeFileSync(outFile, outCsv, { encoding: 'utf8' });
    logger.info(`输出清洗文件: ${path.basename(outFile)} 行数=${deduped.length}`);
  }

  logger.info(`清洗完成：共读取 ${files.length} 个文件，行数=${total}，输出=${parsed}，去重/跳过=${skipped}`);
}

try {
  main();
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  logger.error(`清洗失败：${msg}`);
  process.exit(1);
}