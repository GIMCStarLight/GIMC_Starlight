import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { parse as parseCsv } from 'csv-parse/sync';
import * as dotenv from 'dotenv';
import {
  KolList,
  CooperationDegree,
  DataSource as Source,
  ResourceAttribute,
} from '../src/database/entities/kol-list.entity';
import * as crypto from 'crypto';

dotenv.config();

type RecordRow = Record<string, string>;

const logger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  warn: (msg: string) => console.log(`[WARN] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`),
};

// 通用按键去重（后写覆盖前写，保持最新记录）
function dedupeByKey<T>(arr: T[], keyFn: (t: T) => string): T[] {
  const map = new Map<string, T>();
  for (const item of arr) {
    map.set(keyFn(item), item);
  }
  return Array.from(map.values());
}

function clampStr(value: string | undefined, max: number): string | undefined {
  if (value == null) return undefined;
  const s = String(value);
  return s.length > max ? s.slice(0, max) : s;
}

// 平台名称标准化
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

// 取第一个非空字段
function pick(record: RecordRow, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = record[k];
    if (v !== undefined && String(v).trim() !== '') return String(v).trim();
  }
  return undefined;
}

// 数值解析（去掉“万/元/￥”、逗号等修饰）
function parseNumber(input: string | undefined): number | undefined {
  if (!input) return undefined;
  const s = input
    .replace(/[\s,]/g, '')
    .replace(/￥/g, '')
    .replace(/元/g, '')
    .toLowerCase();
  // 粉丝量（万）常见写法："12.3", "12.3w", "12万", "50w+"
  const isWan = /w|万/.test(s);
  const numStr = s.replace(/[^0-9.]/g, '');
  if (!numStr) return undefined;
  const num = parseFloat(numStr);
  if (Number.isNaN(num)) return undefined;
  if (isWan) return num; // 粉丝量字段已统一为“万”为单位
  return num;
}

// 账号ID提取：优先使用显式列；否则从链接或账号名生成稳定ID
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
      // 微博：weibo.com/u/<id> 或 /<name>
      if (host.includes('weibo.com')) {
        const segs = pathname.split('/').filter(Boolean);
        if (segs[0] === 'u' && segs[1]) return segs[1];
        if (segs[0]) return segs[0];
      }
      // B站：space.bilibili.com/<id>
      if (host.includes('bilibili.com')) {
        const segs = pathname.split('/').filter(Boolean);
        const id = segs[segs.length - 1];
        if (id) return id;
      }
      // 快手：v.kuaishou.com/ 或 www.kuaishou.com/profile/<id>
      if (host.includes('kuaishou')) {
        const segs = pathname.split('/').filter(Boolean);
        const idx = segs.indexOf('profile');
        if (idx >= 0 && segs[idx + 1]) return segs[idx + 1];
      }
      // 小红书：www.xiaohongshu.com/user/profile/<id>
      if (host.includes('xiaohongshu.com')) {
        const segs = pathname.split('/').filter(Boolean);
        const idx = segs.indexOf('profile');
        if (idx >= 0 && segs[idx + 1]) return segs[idx + 1];
      }
      // 视频号/公众号链接通常较复杂，忽略
    } catch {
      // 非URL格式，忽略
    }
  }

  // 兜底：使用平台+账号名的hash生成稳定ID
  const hash = crypto
    .createHash('md5')
    .update(`${platform}:${accountName}`)
    .digest('hex')
    .slice(0, 16);
  return `${platform}:${hash}`;
}

// 独家属性判断
function toExclusive(attrText: string | undefined): number {
  const t = (attrText || '').toLowerCase();
  return /独家/.test(t) ? 1 : 0;
}

// 报价解析为人民币整数
function parsePrice(input: string | undefined): number | undefined {
  if (!input) return undefined;
  const raw = input.trim().toLowerCase();
  // 去除常见符号
  const s = raw.replace(/[￥,\s]/g, '').replace(/元/g, '');
  const isWan = /w|万/.test(s);
  // 处理区间，如 "5000-20000w"，取下限避免拼接产生超大数
  const range = s.match(/([0-9]+(?:\.[0-9]+)?)\s*[-~至]\s*([0-9]+(?:\.[0-9]+)?)/);
  if (range) {
    const lower = parseFloat(range[1]);
    if (!Number.isNaN(lower)) {
      const val = isWan ? lower * 10000 : lower;
      return Math.round(val);
    }
  }
  // 单值：如 30000、3w、3万、3.5w
  const numStr = s.replace(/[^0-9.]/g, '');
  if (!numStr) return undefined;
  const num = parseFloat(numStr);
  if (Number.isNaN(num)) return undefined;
  const val = isWan ? num * 10000 : num;
  return Math.round(val);
}

// 将一行记录映射到KolList
function mapRecord(fileName: string, record: RecordRow): Partial<KolList> {
  const platformFromFile = normalizePlatform(
    path.basename(fileName, path.extname(fileName)),
  );
  const platform = normalizePlatform(
    pick(record, ['账号平台', '主发平台']) || platformFromFile,
  );

  const account_name = pick(record, ['账号名称', '账号名', '昵称']) || '';
  const home_link = pick(record, ['主页链接', '账号链接', '达人链接']);
  const explicitId = pick(record, ['账号ID', '用户id']);
  const account_id = extractAccountId(
    platform,
    explicitId,
    home_link,
    account_name,
  );

  const followers_w = parseNumber(
    pick(record, [
      '粉丝量（w）',
      '粉丝量(W)',
      '主发平台粉丝量（w）',
      '粉丝维度',
    ]) || undefined,
  );
  const org_name = pick(record, ['所属机构名', '所属机构']);
  const category = pick(record, ['账号类型', '标签']);

  const star_quote_21_60s = parsePrice(
    pick(record, [
      '互选（1/60s）参考价',
      '21s-60s报价',
      '21-60s视频预估报价',
    ]) || undefined,
  );
  const star_quote_60s_plus = parsePrice(
    pick(record, [
      '互选（60s+）原创参考价',
      '60s+报价',
      '60s以上视频预估报价',
    ]) || undefined,
  );

  const is_exclusive = toExclusive(pick(record, ['达人属性']) || undefined);
  const rebate_policy = pick(record, ['返点/折扣金额']);
  const rebate_range = pick(record, ['返点范围', '返点区间']);
  const policy_level = pick(record, ['政策等级']);
  const rebate_period = pick(record, ['返点账期']);
  const pay_period = pick(record, ['支付账期']);
  const remarkRaw = pick(record, ['备注', '合作简介/说明']);

  // 将部分平台差异化字段合并进备注，避免丢失信息
  const extraPieces: string[] = [];
  // 微博特有
  const wbDirect = pick(record, ['直发参考价']);
  const wbRepost = pick(record, ['转发参考价']);
  const wbPic = pick(record, ['原创图文参考价']);
  const wbVideo = pick(record, ['原创视频参考价']);
  if (wbDirect) extraPieces.push(`直发参考价=${wbDirect}`);
  if (wbRepost) extraPieces.push(`转发参考价=${wbRepost}`);
  if (wbPic) extraPieces.push(`原创图文参考价=${wbPic}`);
  if (wbVideo) extraPieces.push(`原创视频参考价=${wbVideo}`);
  // 小红书报备
  const xhsPic = pick(record, ['平台图文报备']);
  const xhsVideo = pick(record, ['平台视频报备']);
  if (xhsPic) extraPieces.push(`平台图文报备=${xhsPic}`);
  if (xhsVideo) extraPieces.push(`平台视频报备=${xhsVideo}`);
  // 公众号
  const mpTouTiao = pick(record, ['头条平台价/刊例价']);
  const mpCiTiao = pick(record, ['次条平台价/刊例价']);
  if (mpTouTiao) extraPieces.push(`头条价=${mpTouTiao}`);
  if (mpCiTiao) extraPieces.push(`次条价=${mpCiTiao}`);

  const remark = [
    remarkRaw,
    extraPieces.length ? extraPieces.join('; ') : undefined,
  ]
    .filter(Boolean)
    .join(' | ');

  const knownKeys = new Set([
    '账号平台',
    '主发平台',
    '账号名称',
    '账号名',
    '昵称',
    '主页链接',
    '账号链接',
    '达人链接',
    '账号ID',
    '用户id',
    '粉丝量（w）',
    '粉丝量(W)',
    '主发平台粉丝量（w）',
    '粉丝维度',
    '所属机构名',
    '所属机构',
    '账号类型',
    '标签',
    '互选（1/60s）参考价',
    '21s-60s报价',
    '21-60s视频预估报价',
    '互选（60s+）原创参考价',
    '60s+报价',
    '60s以上视频预估报价',
    '达人属性',
    '返点/折扣金额',
    '返点范围',
    '返点区间',
    '政策等级',
    '返点账期',
    '支付账期',
    '备注',
    '合作简介/说明',
    '直发参考价',
    '转发参考价',
    '原创图文参考价',
    '原创视频参考价',
    '平台图文报备',
    '平台视频报备',
    '头条平台价/刊例价',
    '次条平台价/刊例价',
  ]);
  const platform_extra: Record<string, string> = {};
  for (const [k, v] of Object.entries(record)) {
    const s = v == null ? '' : String(v).trim();
    if (!knownKeys.has(k) && s) {
      platform_extra[k] = s;
    }
  }

  const entity: Partial<KolList> = {
    platform: clampStr(platform, 30)!,
    account_name: clampStr(account_name, 100) || '',
    account_id: clampStr(account_id, 80) || '',
    home_link: clampStr(home_link || '', 500) || '',
    followers_w: followers_w ?? 0,
    org_name: clampStr(org_name || undefined, 100),
    category: clampStr(category || undefined, 30),
    star_quote_21_60s: star_quote_21_60s ?? undefined,
    star_quote_60s_plus: star_quote_60s_plus ?? undefined,
    is_exclusive,
    rebate_policy: rebate_policy || undefined,
    rebate_range: clampStr(rebate_range || undefined, 50),
    policy_level: clampStr(policy_level || undefined, 10),
    rebate_period: clampStr(rebate_period || undefined, 30),
    pay_period: clampStr(pay_period || undefined, 30),
    remark: clampStr(remark || undefined, 500),
    platform_extra: Object.keys(platform_extra).length
      ? platform_extra
      : undefined,
    cooperation_intro: undefined,
    all_platforms: undefined,
    contact_info: undefined,
    cooperation_degree: CooperationDegree.MEDIUM,
    source: Source.IMPORT,
    resource_attribute: ResourceAttribute.OTHER,
    annual_contract_org: undefined,
    matched_author_id: undefined,
    match_confidence: undefined,
    matched_snapshot: undefined,
    matched_at: undefined,
    created_by: undefined,
    updated_by: undefined,
    deleted_at: undefined,
  };

  return entity;
}

function loadCsv(filePath: string): RecordRow[] {
  const text = fs.readFileSync(filePath, { encoding: 'utf8' });
  const raw = parseCsv(text, {
    columns: true,
    skip_empty_lines: true,
    bom: true,
    relax_column_count: true,
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
}

async function main() {
  const dirArgs = process.argv.filter((a) => a.startsWith('--dir='));
  const chosenDirArg = dirArgs.length ? dirArgs[dirArgs.length - 1] : undefined;
  const dataDir = chosenDirArg
    ? chosenDirArg.split('=')[1]
    : process.env.KOL_CSV_DIR || path.resolve(__dirname, '../../data');

  logger.info(`读取目录: ${dataDir}`);
  const files = fs
    .readdirSync(dataDir)
    .filter((f) => f.toLowerCase().endsWith('.csv'))
    .map((f) => path.join(dataDir, f));
  if (files.length === 0) {
    logger.warn('目录内未找到CSV文件');
    process.exit(0);
  }

  // 连接Postgres（与后端保持一致的环境变量）
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    username: process.env.POSTGRES_USERNAME || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    database: process.env.POSTGRES_DATABASE || 'influencer_db',
    entities: [KolList],
    synchronize: false,
    logging: false,
  });

  await dataSource.initialize();
  logger.info('✅ 已连接Postgres');

  // 确保唯一索引存在，以支持 ON CONFLICT( platform, account_id )
  await dataSource.query(
    'CREATE UNIQUE INDEX IF NOT EXISTS uniq_kol_platform_account_id ON kol_list (platform, account_id)',
  );

  await dataSource.query(
    'ALTER TABLE kol_list ADD COLUMN IF NOT EXISTS platform_extra JSON',
  );

  // 报价字段升级为 BIGINT，避免超过 32 位整数上限
  await dataSource.query(
    'ALTER TABLE kol_list ALTER COLUMN star_quote_21_60s TYPE BIGINT',
  );
  await dataSource.query(
    'ALTER TABLE kol_list ALTER COLUMN star_quote_60s_plus TYPE BIGINT',
  );

  const seqRes = await dataSource.query(
    `SELECT pg_get_serial_sequence('kol_list','id') AS seq`,
  );
  const seqName: string | undefined = Array.isArray(seqRes)
    ? (seqRes[0]?.seq as string | undefined)
    : undefined;
  if (seqName) {
    await dataSource.query(
      `SELECT setval($1, (SELECT COALESCE(MAX(id), 0) FROM kol_list))`,
      [seqName],
    );
    logger.info(`✅ 已同步主键序列: ${seqName}`);
  } else {
    logger.warn('未找到主键序列，跳过主键序列同步');
  }

  let total = 0;
  let inserted = 0;

  for (const f of files) {
    logger.info(`解析文件: ${path.basename(f)}`);
    const rows = loadCsv(f);
    total += rows.length;

    const batch: Partial<KolList>[] = rows
      .map((r) => mapRecord(f, r))
      .filter((e) => e.account_name && e.platform && e.account_id);

    // 以 (platform|account_id) 为键去重，避免同一个 INSERT 影响同一行两次
    const batchUnique = dedupeByKey(
      batch,
      (e) => `${e.platform}|${e.account_id}`,
    );

    // 分批UPSERT（平台+账号ID）
    const CHUNK = 500;
    for (let i = 0; i < batchUnique.length; i += CHUNK) {
      const slice = batchUnique.slice(i, i + CHUNK);
      if (!slice.length) continue;
      const qb = dataSource
        .createQueryBuilder()
        .insert()
        .into(KolList)
        .values(slice)
        .onConflict(
          '("platform", "account_id") DO UPDATE SET ' +
            [
              'account_name = EXCLUDED.account_name',
              'home_link = EXCLUDED.home_link',
              'followers_w = EXCLUDED.followers_w',
              'org_name = EXCLUDED.org_name',
              'category = EXCLUDED.category',
              'star_quote_21_60s = EXCLUDED.star_quote_21_60s',
              'star_quote_60s_plus = EXCLUDED.star_quote_60s_plus',
              'is_exclusive = EXCLUDED.is_exclusive',
              'rebate_policy = EXCLUDED.rebate_policy',
              'rebate_range = EXCLUDED.rebate_range',
              'policy_level = EXCLUDED.policy_level',
              'rebate_period = EXCLUDED.rebate_period',
              'pay_period = EXCLUDED.pay_period',
              'remark = EXCLUDED.remark',
              'platform_extra = EXCLUDED.platform_extra',
              'source = EXCLUDED.source',
            ].join(', '),
        );
      await qb.execute();
      inserted += slice.length; // 统计目的（不区分插入/更新）
    }
  }

  logger.info(`导入完成：共处理 ${total} 行；写入 ${inserted} 行（含更新）。`);
  await dataSource.destroy();
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  logger.error(`导入失败：${msg}`);
  process.exit(1);
});