import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { MYSQL_ENTITIES, POSTGRES_ENTITIES } from './src/database/entities';
import { ImportHistory } from './src/database/entities/import-history.entity';

// 加载环境变量
config();

/**
 * PostgreSQL数据源配置
 * 用于运行迁移和种子数据
 */
export const PostgresDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || '192.168.102.168',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  username: process.env.POSTGRES_USERNAME || 'postgres',
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DATABASE || 'crawler_db_v2',
  synchronize: false,
  logging: true,
  entities: [
    ...MYSQL_ENTITIES,  // RBAC系统实体（已迁移到PostgreSQL）
    ...POSTGRES_ENTITIES,  // 业务数据实体
    ImportHistory,
  ],
  migrations: ['src/database/migrations/*.ts'],
  migrationsTableName: 'migrations',
  ssl: process.env.POSTGRES_SSL === 'true' ? {
    rejectUnauthorized: process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED !== 'false',
  } : false,
});

export default PostgresDataSource;
