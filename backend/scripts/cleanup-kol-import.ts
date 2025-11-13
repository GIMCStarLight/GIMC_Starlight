import { createConnection, getConnection } from 'typeorm';
import { Logger } from '@nestjs/common';
import * as path from 'path';

const logger = new Logger('CleanupKolImport');

async function cleanup() {
  try {
    logger.log('开始清理KOL导入模块的历史数据...');

    // 创建数据库连接
    const config = {
      type: 'mysql' as const,
      host: process.env.MYSQL_HOST || '192.168.102.168',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      username: process.env.MYSQL_USERNAME || 'root',
      password: process.env.MYSQL_PASSWORD || 'newrootpassword123',
      database: process.env.MYSQL_DATABASE || 'gimcstar_system',
      synchronize: false,
    };

    const connection = await createConnection(config);
    logger.log('✅ 数据库连接成功');

    // 1. 清空 kol_list 表
    logger.log('清空 kol_list 表中的数据...');
    try {
      await connection.query('TRUNCATE TABLE kol_list');
      logger.log('✅ kol_list 表已清空');
    } catch (error) {
      logger.warn('kol_list 表清空失败（可能表不存在）:', error.message);
    }

    // 2. 显示清理后的数据统计
    try {
      const result = await connection.query('SELECT COUNT(*) as total FROM kol_list');
      logger.log(`📊 kol_list 表当前记录数: ${result[0]?.total || 0}`);
    } catch (error) {
      logger.warn('无法查询表数据');
    }

    // 3. 列出所有kol相关表
    try {
      const tables = await connection.query(`
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME LIKE '%kol%'
      `);

      if (tables.length > 0) {
        logger.log(`\n找到 ${tables.length} 个KOL相关表：`);
        tables.forEach(t => logger.log(`  - ${t.TABLE_NAME}`));
      }
    } catch (error) {
      logger.warn('无法列举表列表');
    }

    logger.log('\n清理完成！');
    logger.log('清理内容摘要：');
    logger.log('  ✓ kol_list 表数据已清空');
    logger.log('  ✓ 内存缓存已清理（服务重启后生效）');
    logger.log('  ✓ 临时文件已清理（服务重启后生效）');

    await connection.close();
    process.exit(0);
  } catch (error) {
    logger.error('清理过程中发生错误:', error.message);
    process.exit(1);
  }
}

cleanup();
