#!/usr/bin/env ts-node
/**
 * MySQL到PostgreSQL数据迁移脚本
 * 
 * 功能：将RBAC系统数据从MySQL迁移到PostgreSQL
 * 迁移表：user_auth, user_profile, permissions, roles, role_permissions, user_roles, tags
 * 
 * 使用方法：
 *   pnpm run migrate:mysql-to-postgres
 * 
 * 注意事项：
 *   1. 执行前确保PostgreSQL表结构已创建
 *   2. 建议先在测试环境验证
 *   3. 迁移过程会记录详细日志
 */

import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';

// 加载环境变量
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
 * 迁移统计信息
 */
interface MigrationStats {
  table: string;
  total: number;
  migrated: number;
  skipped: number;
  failed: number;
  startTime: Date;
  endTime?: Date;
}

class MySQLToPostgreSQLMigration {
  private mysqlDataSource: DataSource;
  private postgresDataSource: DataSource;
  private stats: MigrationStats[] = [];

  constructor() {
    // MySQL连接配置
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

    // PostgreSQL连接配置
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
   * 初始化数据库连接
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
   * 迁移单个表
   */
  async migrateTable(
    tableName: string,
    transformer: (row: any) => any,
    batchSize: number = 1000,
  ): Promise<MigrationStats> {
    const stats: MigrationStats = {
      table: tableName,
      total: 0,
      migrated: 0,
      skipped: 0,
      failed: 0,
      startTime: new Date(),
    };

    logger.info(`开始迁移表: ${tableName}`);

    try {
      // 获取总记录数
      const countResult = await this.mysqlDataSource.query(
        `SELECT COUNT(*) as count FROM ${tableName}`,
      );
      stats.total = parseInt(countResult[0].count);
      logger.info(`${tableName} 总记录数: ${stats.total}`);

      if (stats.total === 0) {
        logger.warn(`${tableName} 无数据，跳过迁移`);
        stats.endTime = new Date();
        return stats;
      }

      // 分批迁移
      let offset = 0;
      while (offset < stats.total) {
        const rows = await this.mysqlDataSource.query(
          `SELECT * FROM ${tableName} LIMIT ${batchSize} OFFSET ${offset}`,
        );

        if (rows.length === 0) break;

        // 转换数据
        const transformed = rows.map(transformer);

        // 批量插入PostgreSQL
        try {
          // 构建插入语句
          const columns = Object.keys(transformed[0]);
          const placeholders = transformed
            .map((_: any, i: number) => `(${columns.map((_col: any, j: number) => `$${i * columns.length + j + 1}`).join(',')})`)
            .join(',');
          
          const values = transformed.flatMap((row: any) => columns.map(col => row[col]));
          
          await this.postgresDataSource.query(
            `INSERT INTO ${tableName} (${columns.join(',')}) VALUES ${placeholders} ON CONFLICT DO NOTHING`,
            values,
          );

          stats.migrated += rows.length;
        } catch (error) {
          logger.error(`批量插入失败: ${(error as Error).message}`);
          stats.failed += rows.length;
        }

        offset += batchSize;
        logger.info(`${tableName} 进度: ${offset}/${stats.total} (${((offset / stats.total) * 100).toFixed(2)}%)`);
      }

      stats.endTime = new Date();
      logger.success(`${tableName} 迁移完成: 成功 ${stats.migrated}, 失败 ${stats.failed}`);
    } catch (error) {
      logger.error(`${tableName} 迁移失败: ${(error as Error).message}`);
      throw error;
    }

    this.stats.push(stats);
    return stats;
  }

  /**
   * 执行完整迁移
   */
  async migrate(): Promise<void> {
    logger.info('='.repeat(60));
    logger.info('开始MySQL到PostgreSQL数据迁移');
    logger.info('='.repeat(60));

    try {
      await this.initialize();

      // 按依赖顺序迁移表
      logger.info('\n阶段1: 迁移用户认证表');
      await this.migrateTable('user_auth', this.transformUserAuth);
      await this.migrateTable('user_profile', this.transformUserProfile);

      logger.info('\n阶段2: 迁移权限和角色表');
      await this.migrateTable('roles', this.transformRole);
      await this.migrateTable('permissions', this.transformPermission);

      logger.info('\n阶段3: 迁移关联表');
      await this.migrateTable('user_roles', this.transformUserRole);
      await this.migrateTable('role_permissions', this.transformRolePermission);

      logger.info('\n阶段4: 迁移标签表');
      await this.migrateTagsWithHierarchy();

      // 重置序列
      await this.resetSequences();

      // 验证数据
      await this.verifyMigration();

      // 输出统计报告
      this.printReport();
    } catch (error) {
      logger.error(`迁移失败: ${(error as Error).message}`);
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * 迁移标签表（处理层级关系）
   */
  private async migrateTagsWithHierarchy(): Promise<void> {
    logger.info('开始迁移表: tags（按层级顺序）');

    try {
      // 先迁移顶级标签（parent_id为NULL）
      let allTags = await this.mysqlDataSource.query('SELECT * FROM tags ORDER BY level, id');
      
      logger.info(`tags 总记录数: ${allTags.length}`);

      let migrated = 0;
      let failed = 0;

      // 按层级迁移
      for (const tag of allTags) {
        try {
          const transformed = this.transformTag(tag);
          
          await this.postgresDataSource.query(
            `INSERT INTO tags (id, name, code, description, platform, level, parent_id, sort, is_active, metadata, created_at, updated_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
             ON CONFLICT (code) DO NOTHING`,
            [
              transformed.id,
              transformed.name,
              transformed.code,
              transformed.description,
              transformed.platform,
              transformed.level,
              transformed.parent_id,
              transformed.sort,
              transformed.is_active,
              transformed.metadata,
              transformed.created_at,
              transformed.updated_at,
            ],
          );
          migrated++;
        } catch (error) {
          failed++;
          if (failed <= 5) {
            logger.warn(`标签迁移失败 (ID: ${tag.id}): ${(error as Error).message}`);
          }
        }

        if ((migrated + failed) % 100 === 0) {
          logger.info(`tags 进度: ${migrated + failed}/${allTags.length} (${(((migrated + failed) / allTags.length) * 100).toFixed(2)}%)`);
        }
      }

      logger.success(`tags 迁移完成: 成功 ${migrated}, 失败 ${failed}`);
    } catch (error) {
      logger.error(`tags 迁移失败: ${(error as Error).message}`);
      throw error;
    }
  }

  /**
   * 数据转换函数
   */
  private transformUserAuth = (row: any) => ({
    id: row.id,
    phone: row.phone,
    password_hash: row.password_hash || row.passwordHash,
    status: row.status,
    last_login_at: row.last_login_at || row.lastLoginAt,
    created_at: row.created_at || row.createdAt,
    updated_at: row.updated_at || row.updatedAt,
  });

  private transformUserProfile = (row: any) => ({
    user_id: row.user_id || row.userId,
    nickname: row.nickname,
    avatar: row.avatar,
    email: row.email,
    real_name: row.real_name || row.realName,
    created_at: row.created_at || row.createdAt,
    updated_at: row.updated_at || row.updatedAt,
  });

  private transformRole = (row: any) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description,
    parent_id: row.parent_id || row.parentId,
    sort: row.sort || 0,
    status: row.status,
    created_at: row.created_at || row.createdAt,
    updated_at: row.updated_at || row.updatedAt,
  });

  private transformPermission = (row: any) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.type?.toUpperCase() || 'API',
    description: row.description,
    parent_id: row.parent_id || row.parentId,
    resource: row.resource,
    action: row.action,
    sort: row.sort || 0,
    status: row.status,
    created_at: row.created_at || row.createdAt,
    updated_at: row.updated_at || row.updatedAt,
  });

  private transformUserRole = (row: any) => ({
    id: row.id,
    user_id: row.user_id || row.userId,
    role_id: row.role_id || row.roleId,
    created_at: row.created_at || row.createdAt,
  });

  private transformRolePermission = (row: any) => ({
    id: row.id,
    role_id: row.role_id || row.roleId,
    permission_id: row.permission_id || row.permissionId,
    created_at: row.created_at || row.createdAt,
  });

  private transformTag = (row: any) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    description: row.description,
    platform: row.platform,
    level: row.level || 1,
    parent_id: row.parent_id || row.parentId,
    sort: row.sort || 0,
    is_active: row.is_active !== undefined ? row.is_active : row.isActive,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
    created_at: row.created_at || row.createdAt,
    updated_at: row.updated_at || row.updatedAt,
  });

  /**
   * 重置PostgreSQL序列
   */
  private async resetSequences(): Promise<void> {
    logger.info('\n重置PostgreSQL序列...');

    const tables = ['user_auth', 'user_profile', 'roles', 'permissions', 'user_roles', 'role_permissions', 'tags'];

    for (const table of tables) {
      try {
        await this.postgresDataSource.query(`
          SELECT setval(
            pg_get_serial_sequence('${table}', 'id'),
            COALESCE((SELECT MAX(id) FROM ${table}), 1),
            true
          )
        `);
        logger.success(`${table} 序列重置成功`);
      } catch (error) {
        logger.warn(`${table} 序列重置跳过: ${(error as Error).message}`);
      }
    }
  }

  /**
   * 验证迁移结果
   */
  private async verifyMigration(): Promise<void> {
    logger.info('\n验证迁移结果...');

    const tables = ['user_auth', 'user_profile', 'roles', 'permissions', 'user_roles', 'role_permissions', 'tags'];

    for (const table of tables) {
      const mysqlCount = await this.mysqlDataSource.query(`SELECT COUNT(*) as count FROM ${table}`);
      const postgresCount = await this.postgresDataSource.query(`SELECT COUNT(*) as count FROM ${table}`);

      const mysqlTotal = parseInt(mysqlCount[0].count);
      const postgresTotal = parseInt(postgresCount[0].count);

      if (mysqlTotal === postgresTotal) {
        logger.success(`${table}: MySQL(${mysqlTotal}) = PostgreSQL(${postgresTotal}) ✓`);
      } else {
        logger.error(`${table}: MySQL(${mysqlTotal}) ≠ PostgreSQL(${postgresTotal}) ✗`);
      }
    }
  }

  /**
   * 输出迁移报告
   */
  private printReport(): void {
    logger.info('\n' + '='.repeat(60));
    logger.info('迁移统计报告');
    logger.info('='.repeat(60));

    for (const stat of this.stats) {
      const duration = stat.endTime 
        ? ((stat.endTime.getTime() - stat.startTime.getTime()) / 1000).toFixed(2)
        : 'N/A';

      logger.info(`
表名: ${stat.table}
总记录: ${stat.total}
成功: ${stat.migrated}
跳过: ${stat.skipped}
失败: ${stat.failed}
耗时: ${duration}秒
      `.trim());
    }

    logger.info('='.repeat(60));
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
  const migration = new MySQLToPostgreSQLMigration();

  try {
    await migration.migrate();
    logger.success('\n🎉 数据迁移完成！');
    process.exit(0);
  } catch (error) {
    logger.error(`\n❌ 数据迁移失败: ${(error as Error).message}`);
    process.exit(1);
  }
}

// 执行迁移
if (require.main === module) {
  main();
}

export { MySQLToPostgreSQLMigration };
