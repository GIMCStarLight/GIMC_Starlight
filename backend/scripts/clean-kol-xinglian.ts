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

function dedupeByKey<T>(arr: T[], keyFn: (t: T) => string): T[] {
  const map = new Map<string, T>();
  for (const item of arr) map.set(keyFn(item), item);
  return Array.from(map.values());
}

function normalizeKey(s: string): string {
  return s.replace(/\s+/g, '').replace(/\n|\r/g, '').trim();
}

function get(record: RecordRow, aliases: string[]): string | undefined {
  // 先直接匹配，再做规范化匹配
  for (const k of aliases) {
    const v = record[k];
    if (v !== undefined && String(v).trim() !== '') return String(v).trim();
  }
  const normMap = new Map<string, string>();
  for (const [rk, rv] of Object.entries(record)) {
    normMap.set(normalizeKey(rk), rv == null ? '' : String(rv));
  }
  for (const k of aliases) {
    const v = normMap.get(normalizeKey(k));
    if (v !== undefined && String(v).trim() !== '') return String(v).trim();
  }
  return undefined;
}

function parseFansW(raw?: string): string {
  if (!raw) return '';
  const s = raw.replace(/[,\s]/g, '').replace(/万|W|w/gi, '');
  const num = parseFloat(s.replace(/[^0-9.]/g, ''));
  if (!isFinite(num)) return '';
  return (Math.round(num * 100) / 100).toString();
}

function toPlainPrice(raw?: string): string {
  if (!raw) return '';
  let s = raw
    .replace(/[，,]/g, '')
    .replace(/元|人民币|RMB|rmb/gi, '')
    .replace(/\s+/g, '')
    .replace(/[￥¥]/g, '')
    .trim();
  const range = s.match(/([0-9]+(?:\.[0-9]+)?)\s*[-~—]\s*([0-9]+(?:\.[0-9]+)?)(?:\s*(万|w|W))?/);
  if (range) {
    const low = parseFloat(range[1]);
    const unit = range[3];
    if (isFinite(low)) return Math.round(low * (unit ? 10000 : 1)).toString();
  }
  const mWan = s.match(/([0-9]+(?:\.[0-9]+)?)\s*(万|w|W)/);
  if (mWan) {
    const base = parseFloat(mWan[1]);
    if (isFinite(base)) return Math.round(base * 10000).toString();
  }
  const m = s.match(/([0-9]+(?:\.[0-9]+)?)/);
  if (!m) return '';
  const n = parseFloat(m[1]);
  return isFinite(n) ? Math.round(n).toString() : '';
}

function normalizePlatform(raw?: string): string {
  if (!raw) return '';
  const s = raw.replace(/\s+/g, '').toLowerCase();
  if (/抖音|douyin/.test(s)) return '抖音';
  if (/快手|kuaishou/.test(s)) return '快手';
  if (/小红书|xhs|redbook/.test(s)) return '小红书';
  if (/视频号|wechatvideo/.test(s)) return '视频号';
  if (/b站|bilibili|哔哩/.test(s)) return 'B站';
  if (/微博|weibo/.test(s)) return '微博';
  if (/懂车帝/.test(s)) return '懂车帝';
  if (/汽车之家/.test(s)) return '汽车之家';
  if (/今日头条|头条|toutiao/.test(s)) return '今日头条';
  return raw.trim();
}

function splitPlatforms(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[、,，;；\/\n\r]+/)
    .map((s) => normalizePlatform(s))
    .filter((s) => s && s.trim());
}

function synthesizeAccountId(platform: string, name: string, link?: string): string {
  // 简单基于平台与名称兜底，如有链接则附带前缀标记
  const prefix = platform.replace(/\s+/g, '').toLowerCase();
  if (link && /douyin\.com|v\.douyin\.com/.test(link)) {
    const m = link.match(/user\/([^/?#]+)/);
    if (m) return `douyin:${m[1]}`;
  }
  return `${prefix}:${(name || '').slice(0, 16)}`;
}

function main() {
  const dirArg = process.argv.find((a) => a.startsWith('--dir='));
  const fileArg = process.argv.find((a) => a.startsWith('--file='));
  const dataDir = dirArg
    ? dirArg.split('=')[1]
    : process.env.KOL_CSV_DIR || path.resolve(__dirname, '../../data');
  const inFile = fileArg
    ? fileArg.split('=')[1]
    : path.resolve(dataDir, '星链计划.csv');

  const outDir = path.resolve(dataDir, 'cleaned');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  logger.info(`读取文件: ${path.basename(inFile)}`);
  if (!fs.existsSync(inFile)) {
    logger.error('输入文件不存在');
    process.exit(1);
  }
  const raw = fs.readFileSync(inFile, { encoding: 'utf8' });
  const rows = robustParseCsv(raw);

  const outputRows: Record<string, unknown>[] = [];
  const qualityIssues: string[] = [];

  rows.forEach((r, idx) => {
    const account_name = (get(r, ['账号名称', '账号名', '昵称']) || '').replace(/[“”]/g, '"').trim();
    const main_platform_raw = get(r, ['主发平台']) || '';
    const main_platform = normalizePlatform(main_platform_raw);
    const all_platforms_raw = get(r, ['全网平台']) || '';
    const platforms = splitPlatforms(all_platforms_raw);
    if (platforms.length === 0 && main_platform) platforms.push(main_platform);

    const douyin_link = get(r, ['达人链接']) || '';
    const main_home_link = get(r, ['星图/花火/蒲公英主页链接']) || '';
    const account_type = get(r, ['账号类型']) || '';
    const fans_main_raw = get(r, ['主发平台粉丝量（w）']) || get(r, ['主发平台\n粉丝量（w）']) || '';
    const fans_main_w = parseFansW(fans_main_raw);

    const price_1_20s = toPlainPrice(get(r, ['1-20s视频预估报价', '1-20s\n视频预估报价']));
    const price_21_60s = toPlainPrice(get(r, ['21-60s视频预估报价', '21-60s\n视频预估报价']));
    const price_60s_plus = toPlainPrice(get(r, ['60s以上视频预估报价', '60s以上\n视频预估报价']));

    const grad1 = get(r, ['第一梯度']) || '';
    const grad2 = get(r, ['第二梯度']) || '';
    const grad3 = get(r, ['第三梯度']) || '';
    const policy = get(r, ['政策']) || '';
    const policyLevel = get(r, ['当前政策梯度']) || '';
    const desc = get(r, ['合作简介/说明']) || '';

    const remarkParts = [
      desc && `合作简介：${desc}`,
      policyLevel && `当前政策梯度：${policyLevel}`,
      `来源：星链计划`,
    ].filter(Boolean);
    const remark = remarkParts.join(' | ');

    const org_name = '星链计划';

    const expandedCountBefore = outputRows.length;
    platforms.forEach((p) => {
      const isMain = p === main_platform;
      const platform = p;
      const home_link = isMain ? douyin_link || main_home_link : '';
      const account_id = synthesizeAccountId(platform, account_name, home_link);

      const row: Record<string, unknown> = {
        '账号平台': platform,
        '账号名称': account_name,
        '账号ID': account_id,
        '主页链接': home_link,
        '粉丝量（w）': isMain ? fans_main_w : '',
        '21s-60s报价': price_21_60s,
        '60s+报价': price_60s_plus,
        '达人属性': '',
        '所属机构名': org_name,
        '账号类型': account_type,
        '返点/折扣金额': policy,
        '返点区间': '',
        '政策等级': '',
        '返点账期': '',
        '支付账期': '',
        '备注': remark,
        // 额外字段（进入 platform_extra），满足规则要求的保留
        '主发平台': isMain ? main_platform_raw : '',
        '主发平台粉丝量（w）': isMain ? fans_main_w : '',
        '1-20s报价': price_1_20s,
        '第一梯度': grad1,
        '第二梯度': grad2,
        '第三梯度': grad3,
        '全网平台': all_platforms_raw,
      };
      outputRows.push(row);
    });

    const expandedCountAfter = outputRows.length;
    const expanded = expandedCountAfter - expandedCountBefore;
    const platformsCount = splitPlatforms(all_platforms_raw).length || (main_platform ? 1 : 0);
    if (expanded !== platformsCount) {
      qualityIssues.push(`行${idx + 1} 平台展开数量不匹配: 期望=${platformsCount} 实际=${expanded}`);
    }
    if (main_platform && !platforms.includes(main_platform)) {
      qualityIssues.push(`行${idx + 1} 主发平台未包含在全网平台列表: 主发=${main_platform_raw} 列表=${all_platforms_raw}`);
    }
    // 梯度字段一致性：本脚本直接复制，若存在缺失则记为提醒
    if (!grad1 && !grad2 && !grad3) {
      qualityIssues.push(`行${idx + 1} 梯度字段缺失（第一/第二/第三梯度均空）`);
    }
  });

  const deduped = dedupeByKey(outputRows, (r) => `${r['账号平台']}::${r['账号ID']}`);
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
    '主发平台',
    '主发平台粉丝量（w）',
    '1-20s报价',
    '第一梯度',
    '第二梯度',
    '第三梯度',
    '全网平台',
  ];

  // 复用前文定义的 outDir（避免重复声明）
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outCsv = stringifyCsv(headers, deduped);
  const outFile = path.join(outDir, '星链计划.clean.csv');
  fs.writeFileSync(outFile, outCsv, { encoding: 'utf8' });
  logger.info(`输出清洗文件: ${path.basename(outFile)} 行数=${deduped.length}`);

  // 输出数据质量验证报告
  const reportLines: string[] = [];
  reportLines.push(`清洗文件: ${path.basename(inFile)}`);
  reportLines.push(`展开后记录总数: ${deduped.length}`);
  reportLines.push(`提醒/问题数: ${qualityIssues.length}`);
  qualityIssues.slice(0, 50).forEach((msg) => reportLines.push(`- ${msg}`));
  if (qualityIssues.length > 50) reportLines.push(`... 其余 ${qualityIssues.length - 50} 条省略`);
  const reportFile = path.join(outDir, '星链计划.validation.txt');
  fs.writeFileSync(reportFile, reportLines.join('\n'), { encoding: 'utf8' });
  logger.info(`输出验证报告: ${path.basename(reportFile)}`);
}

try {
  main();
} catch (err) {
  const msg = err instanceof Error ? err.message : String(err);
  logger.error(`清洗失败：${msg}`);
  process.exit(1);
}