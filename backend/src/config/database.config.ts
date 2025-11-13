import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { SourceAccount } from '../database/entities/source-account.entity';
import { KolList } from '../database/entities/kol-list.entity';
import { KolPrivateMatches } from '../database/entities/kol-private-matches.entity';
import { KolMatchLogs } from '../database/entities/kol-match-logs.entity';
import { KolReviews } from '../database/entities/kol-reviews.entity';
import { RBAC_ENTITIES } from '../database/entities';
import { AuthorCoreView } from '../database/entities/author-core-view.entity';
import { SqlbotConfig } from '../modules/sqlbot/entities/sqlbot-config.entity';
import { SupplierDatabase } from '../database/entities/supplier-database.entity';
import { ImportHistory } from '../database/entities/import-history.entity';
import {
  AuthorCore,
  AuthorFansMetrics,
  AuthorEngagementMetrics,
  AuthorPricing,
  AuthorMarketingIndices,
  AuthorContentTags,
  AuthorEcommerce,
  MvAuthorsCombined,
} from '../modules/influencer-v2/entities';

/**
 * MySQL数据库配置
 * 用于主要业务数据存储
 */
export const getMySQLConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  const enableReplication = configService.get<boolean>(
    'MYSQL_ENABLE_REPLICATION',
    false,
  );
  const slaveHost = configService.get<string>('MYSQL_SLAVE_HOST');

  const baseConfig = {
    type: 'mysql' as const,
    entities: RBAC_ENTITIES,
    synchronize: false,
    logging: configService.get<boolean>('MYSQL_LOGGING', false),
    timezone: '+08:00',
    charset: 'utf8mb4',
    retryAttempts: 3,
    retryDelay: 3000,
    autoLoadEntities: false,
  };

  // 读写分离配置
  if (enableReplication && slaveHost) {
    return {
      ...baseConfig,
      replication: {
        master: {
          host: configService.get<string>('MYSQL_HOST', 'localhost'),
          port: configService.get<number>('MYSQL_PORT', 3306),
          username: configService.get<string>('MYSQL_USERNAME', 'root'),
          password: configService.get<string>('MYSQL_PASSWORD'),
          database: configService.get<string>(
            'MYSQL_DATABASE',
            'gimcstar_system',
          ),
        },
        slaves: [
          {
            host: slaveHost,
            port: configService.get<number>('MYSQL_SLAVE_PORT', 3306),
            username: configService.get<string>('MYSQL_SLAVE_USERNAME', 'root'),
            password: configService.get<string>('MYSQL_SLAVE_PASSWORD'),
            database: configService.get<string>(
              'MYSQL_DATABASE',
              'gimcstar_system',
            ),
          },
        ],
      },
      extra: {
        connectionLimit: 50, // 主库连接池
        slaveConnectionLimit: 100, // 从库连接池更大
        maxIdle: 10,
        idleTimeoutMillis: 30000,
        acquireTimeout: 60000,
      },
    };
  }

  // 单机配置
  return {
    ...baseConfig,
    host: configService.get<string>('MYSQL_HOST', 'localhost'),
    port: configService.get<number>('MYSQL_PORT', 3306),
    username: configService.get<string>('MYSQL_USERNAME', 'root'),
    password: configService.get<string>('MYSQL_PASSWORD'),
    database: configService.get<string>('MYSQL_DATABASE', 'gimcstar_system'),
    extra: {
      connectionLimit: 50,
      maxIdle: 10,
      idleTimeoutMillis: 30000,
      acquireTimeout: 60000,
    },
  };
};

/**
 * PostgreSQL数据库配置
 * 用于分析数据和复杂查询 + KOL数据存储
 */
export const getPostgreSQLConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  // 读取SSL配置
  const sslEnabled =
    configService.get<string>('POSTGRES_SSL', 'false').toLowerCase() === 'true';
  const sslRejectUnauthorized =
    configService
      .get<string>('POSTGRES_SSL_REJECT_UNAUTHORIZED', 'true')
      .toLowerCase() === 'true';

  // SSL配置逻辑
  let sslConfig: boolean | object = false;
  if (sslEnabled) {
    sslConfig = {
      rejectUnauthorized: sslRejectUnauthorized,
    };
  }

  return {
    type: 'postgres',
    host: configService.get<string>('POSTGRES_HOST', '192.168.102.168'),
    port: configService.get<number>('POSTGRES_PORT', 5432),
    username: configService.get<string>('POSTGRES_USERNAME', 'postgres'),
    password: configService.get<string>('POSTGRES_PASSWORD'),
    database: configService.get<string>('POSTGRES_DATABASE', 'crawler_db_v2'),
    entities: [
      KolList,
      KolPrivateMatches,
      KolMatchLogs,
      SourceAccount,
      KolReviews,
      AuthorCoreView,
      SqlbotConfig,
      SupplierDatabase,
      ImportHistory,
    ],
    synchronize: false, // 禁用自动同步，表结构由迁移脚本管理
    logging: configService.get<boolean>('POSTGRES_LOGGING', false),
    ssl: sslConfig,
    extra: {
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      charset: 'utf8',
    },
    retryAttempts: 3,
    retryDelay: 3000,
    autoLoadEntities: false, // 禁用自动加载实体
  };
};

/**
 * 爬虫数据库配置（第二数据源）
 * 用于读取爬虫采集的作者数据
 */
export const getCrawlerDBConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => {
  // 读取SSL配置
  const sslEnabled =
    configService.get<string>('CRAWLER_DB_SSL', 'false').toLowerCase() ===
    'true';
  const sslRejectUnauthorized =
    configService
      .get<string>('CRAWLER_DB_SSL_REJECT_UNAUTHORIZED', 'true')
      .toLowerCase() === 'true';

  // SSL配置逻辑
  let sslConfig: boolean | object = false;
  if (sslEnabled) {
    sslConfig = {
      rejectUnauthorized: sslRejectUnauthorized,
    };
  }

  return {
    type: 'postgres',
    host: configService.get<string>('CRAWLER_DB_HOST', '192.168.102.168'),
    port: configService.get<number>('CRAWLER_DB_PORT', 5432),
    username: configService.get<string>('CRAWLER_DB_USERNAME', 'postgres'),
    password: configService.get<string>('CRAWLER_DB_PASSWORD'),
    database: configService.get<string>('CRAWLER_DB_DATABASE', 'crawler_db_v2'),
    entities: [
      AuthorCoreView,
      AuthorCore,
      AuthorFansMetrics,
      AuthorEngagementMetrics,
      AuthorPricing,
      AuthorMarketingIndices,
      AuthorContentTags,
      AuthorEcommerce,
      MvAuthorsCombined,
    ],
    synchronize: false, // 禁用自动同步，表结构已存在
    logging: configService.get<boolean>('CRAWLER_DB_LOGGING', false),
    ssl: sslConfig,
    extra: {
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      charset: 'utf8',
    },
    retryAttempts: 3,
    retryDelay: 3000,
    autoLoadEntities: false,
  };
};

/**
 * 数据库连接名称常量
 */
export const DATABASE_CONNECTIONS = {
  MYSQL: 'mysql',
  POSTGRES: 'postgres',
  CRAWLER: 'crawler',
} as const;

/**
 * 数据库配置验证
 */
export const validateDatabaseConfig = (configService: ConfigService): void => {
  const requiredMySQLVars = [
    'MYSQL_HOST',
    'MYSQL_USERNAME',
    'MYSQL_PASSWORD',
    'MYSQL_DATABASE',
  ];
  const requiredPostgresVars = [
    'POSTGRES_HOST',
    'POSTGRES_USERNAME',
    'POSTGRES_PASSWORD',
    'POSTGRES_DATABASE',
  ];

  const missingVars: string[] = [];

  [...requiredMySQLVars, ...requiredPostgresVars].forEach((varName) => {
    if (!configService.get(varName)) {
      missingVars.push(varName);
    }
  });

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required database environment variables: ${missingVars.join(', ')}`,
    );
  }
};
