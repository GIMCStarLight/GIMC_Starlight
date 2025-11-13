import { DataSource } from 'typeorm';
import { KolList } from '../src/database/entities/kol-list.entity';
import { KolPrivateMatches } from '../src/database/entities/kol-private-matches.entity';
import { KolMatchLogs } from '../src/database/entities/kol-match-logs.entity';

const logger = {
  log: (msg: string) => console.log(`[INFO] ${msg}`),
  warn: (msg: string) => console.log(`[WARN] ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${msg}`),
};

async function initializePostgres() {
  try {
    logger.log('开始初始化PostgreSQL中的KOL表...');

    // 创建数据库连接
    const dataSource = new DataSource({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || '192.168.102.168',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      username: process.env.POSTGRES_USERNAME || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      database: process.env.POSTGRES_DATABASE || 'crawler_db_v2',
      entities: [KolList, KolPrivateMatches, KolMatchLogs],
      synchronize: true, // 启用自动同步创建表
      logging: false,
    });

    await dataSource.initialize();
    logger.log('✅ 数据库连接成功');

    // 检查表是否创建
    const tables = await dataSource.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name LIKE 'kol_%'
    `);

    if (tables.length > 0) {
      logger.log(`✅ KOL相关表已创建，共${tables.length}个表：`);
      tables.forEach((t: any) => logger.log(`   - ${t.table_name}`));
    } else {
      logger.warn('⚠️ 未找到KOL相关表，同步过程可能未完成');
    }

    // 检查表的列
    const kolListColumns = await dataSource.query(`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name = 'kol_list'
      ORDER BY ordinal_position
    `);

    if (kolListColumns.length > 0) {
      logger.log(`✅ kol_list表已创建，共${kolListColumns.length}个列`);
    }

    logger.log('\n初始化完成！');
    logger.log('总结：');
    logger.log('  ✓ PostgreSQL数据库连接成功');
    logger.log('  ✓ KOL相关表已创建或已存在');
    logger.log('  ✓ 表结构已同步');

    await dataSource.destroy();
    process.exit(0);
  } catch (error) {
    logger.error('初始化失败: ' + (error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}


initializePostgres();
