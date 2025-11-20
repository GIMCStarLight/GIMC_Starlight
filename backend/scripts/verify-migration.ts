#!/usr/bin/env ts-node
/**
 * 数据一致性验证脚本
 * 
 * 功能：对比MySQL和PostgreSQL中的数据一致性
 * 用于双写期间和迁移完成后的数据校验
 * 
 * 使用方法：
 *   pnpm run verify:migration
 */

import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
import * as crypto from 'crypto';

dotenv.config();

const configService = new ConfigService();

// 日志工具
const logger = {
  info: (msg: string) => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`),
  warn: (msg: string) => console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`),
  error: (msg: string) => console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`),
  success: (msg: string) => console.log(`[SUCCESS] ${new Date().toISOString()} - ✅ ${msg}`),
};

/**
 * 验证结果
 */
interface VerificationResult {
  table: string;
  mysqlCount: number;
  postgresCount: number;
  countMatch: boolean;
  sampleMatch: boolean;
  inconsistencies: any[];
}

class MigrationVerifier {
  private mysqlDataSource: DataSource;
  private postgresDataSource: DataSource;
  private results: VerificationResult[] = [];

  constructor() {
    this.mysqlDataSource = new DataSource({
      type: 'mysql',
      host: configService.get<string>('MYSQL_HOST', 'localhost'),
      port: configService.get<number>('MYSQL_PORT', 3306),
      username: configService.get<string>('MYSQL_USERNAME', 'root'),
      password: configService.get<string>('MYSQL_PASSWORD'),
      database: configService.get<string>('MYSQL_DATABASE', 'gimcstar_system'),
      synchronize: false,
      logging: false,
    });

    this.postgresDataSource = new DataSource({
      type: 'postgres',
      host: configService.get<string>('POSTGRES_HOST', '192.168.102.168'),
      port: configService.get<number>('POSTGRES_PORT', 5432),
      username: configService.get<string>('POSTGRES_USERNAME', 'postgres'),
      password: configService.get<string>('POSTGRES_PASSWORD'),
      database: configService.get<string>('POSTGRES_DATABASE', 'crawler_db_v2'),
      synchronize: false,
      logging: false,
    });
  }

  /**
   * 初始化连接
   */
  async initialize(): Promise<void> {
    logger.info('初始化数据库连接...');

    try {
      await this.mysqlDataSource.initialize();
      logger.success('MySQL连接成功');
    } catch (error) {
      logger.error(`MySQL连接失败: ${(error as Error).message}`);
      throw error;
    }

    try {
      await this.postgresDataSource.initialize();
      logger.success('PostgreSQL连接成功');
    } catch (error) {
      logger.error(`PostgreSQL连接失败: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * 验证表数据
   */
  async verifyTable(tableName: string, orderByColumn: string = 'id'): Promise<VerificationResult> {
    logger.info(`\n正在验证表: ${tableName}`);

    const result: VerificationResult = {
      table: tableName,
      mysqlCount: 0,
      postgresCount: 0,
      countMatch: false,
      sampleMatch: true,
      inconsistencies: [],
    };

    try {
      // 1. 验证记录数
      const mysqlCountResult = await this.mysqlDataSource.query(
        `SELECT COUNT(*) as count FROM ${tableName}`,
      );
      const postgresCountResult = await this.postgresDataSource.query(
        `SELECT COUNT(*) as count FROM ${tableName}`,
      );

      result.mysqlCount = parseInt(mysqlCountResult[0].count);
      result.postgresCount = parseInt(postgresCountResult[0].count);
      result.countMatch = result.mysqlCount === result.postgresCount;

      logger.info(`MySQL记录数: ${result.mysqlCount}`);
      logger.info(`PostgreSQL记录数: ${result.postgresCount}`);

      if (result.countMatch) {
        logger.success('记录数匹配 ✓');
      } else {
        logger.error(`记录数不匹配 ✗ (差异: ${Math.abs(result.mysqlCount - result.postgresCount)})`);
      }

      // 2. 抽样验证数据一致性（取前100条）
      if (result.mysqlCount > 0 && result.postgresCount > 0) {
        const sampleSize = Math.min(100, result.mysqlCount);
        const mysqlSample = await this.mysqlDataSource.query(
          `SELECT * FROM ${tableName} ORDER BY ${orderByColumn} LIMIT ${sampleSize}`,
        );
        const postgresSample = await this.postgresDataSource.query(
          `SELECT * FROM ${tableName} ORDER BY ${orderByColumn} LIMIT ${sampleSize}`,
        );

        // 比对样本数据
        for (let i = 0; i < Math.min(mysqlSample.length, postgresSample.length); i++) {
          const mysqlRow = this.normalizeRow(mysqlSample[i]);
          const postgresRow = this.normalizeRow(postgresSample[i]);

          const mysqlHash = this.hashObject(mysqlRow);
          const postgresHash = this.hashObject(postgresRow);

          if (mysqlHash !== postgresHash) {
            result.sampleMatch = false;
            result.inconsistencies.push({
              id: mysqlRow.id,
              mysql: mysqlRow,
              postgres: postgresRow,
            });

            if (result.inconsistencies.length <= 5) {
              logger.warn(`数据不一致 (ID: ${mysqlRow.id})`);
            }
          }
        }

        if (result.sampleMatch) {
          logger.success(`数据一致性验证通过 (样本: ${sampleSize}条) ✓`);
        } else {
          logger.error(`发现 ${result.inconsistencies.length} 条不一致记录 ✗`);
        }
      }
    } catch (error) {
      logger.error(`验证失败: ${(error as Error).message}`);
      throw error;
    }

    this.results.push(result);
    return result;
  }

  /**
   * 标准化行数据（处理类型差异）
   */
  private normalizeRow(row: any): any {
    const normalized: any = {};

    for (const [key, value] of Object.entries(row)) {
      if (value === null || value === undefined) {
        normalized[key] = null;
      } else if (value instanceof Date) {
        // 统一时间格式
        normalized[key] = value.toISOString();
      } else if (typeof value === 'bigint') {
        // bigint转为字符串
        normalized[key] = value.toString();
      } else if (Buffer.isBuffer(value)) {
        // Buffer转为字符串
        normalized[key] = value.toString('utf-8');
      } else if (typeof value === 'object') {
        // JSON对象标准化
        normalized[key] = JSON.stringify(value);
      } else {
        normalized[key] = value;
      }
    }

    return normalized;
  }

  /**
   * 计算对象哈希
   */
  private hashObject(obj: any): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    return crypto.createHash('md5').update(str).digest('hex');
  }

  /**
   * 执行完整验证
   */
  async verify(): Promise<void> {
    logger.info('='.repeat(60));
    logger.info('开始数据一致性验证');
    logger.info('='.repeat(60));

    try {
      await this.initialize();

      const tables = [
        { name: 'user_auth', orderBy: 'id' },
        { name: 'user_profile', orderBy: 'user_id' },
        { name: 'roles', orderBy: 'id' },
        { name: 'permissions', orderBy: 'id' },
        { name: 'user_roles', orderBy: 'id' },
        { name: 'role_permissions', orderBy: 'id' },
        { name: 'tags', orderBy: 'id' },
      ];

      for (const table of tables) {
        await this.verifyTable(table.name, table.orderBy);
      }

      // 输出验证报告
      this.printReport();
    } catch (error) {
      logger.error(`验证失败: ${(error as Error).message}`);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * 输出验证报告
   */
  private printReport(): void {
    logger.info('\n' + '='.repeat(60));
    logger.info('验证报告');
    logger.info('='.repeat(60));

    let allPassed = true;

    for (const result of this.results) {
      const status = result.countMatch && result.sampleMatch ? '✅ 通过' : '❌ 失败';
      allPassed = allPassed && result.countMatch && result.sampleMatch;

      logger.info(`
表名: ${result.table}
MySQL记录: ${result.mysqlCount}
PostgreSQL记录: ${result.postgresCount}
记录数匹配: ${result.countMatch ? '✓' : '✗'}
数据一致性: ${result.sampleMatch ? '✓' : '✗'}
不一致记录: ${result.inconsistencies.length}
状态: ${status}
      `.trim());
    }

    logger.info('='.repeat(60));

    if (allPassed) {
      logger.success('\n🎉 所有验证通过！数据一致性良好。');
    } else {
      logger.error('\n⚠️ 发现数据不一致，请检查迁移日志。');
    }
  }

  /**
   * 清理资源
   */
  private async cleanup(): Promise<void> {
    logger.info('\n清理资源...');

    if (this.mysqlDataSource.isInitialized) {
      await this.mysqlDataSource.destroy();
      logger.info('MySQL连接已关闭');
    }

    if (this.postgresDataSource.isInitialized) {
      await this.postgresDataSource.destroy();
      logger.info('PostgreSQL连接已关闭');
    }
  }
}

/**
 * 主函数
 */
async function main() {
  const verifier = new MigrationVerifier();

  try {
    await verifier.verify();
    logger.success('\n验证完成！');
    process.exit(0);
  } catch (error) {
    logger.error(`\n验证失败: ${(error as Error).message}`);
    process.exit(1);
  }
}

// 执行验证
if (require.main === module) {
  main();
}

export { MigrationVerifier };
