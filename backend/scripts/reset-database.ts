import { DataSource } from 'typeorm';
import { SeedRunner } from '../src/database/seeds/seed-runner';
import { RBAC_ENTITIES } from '../src/database/entities';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

/**
 * 数据库重置脚本
 * 一键清空数据库并重新初始化所有表和数据
 */
class DatabaseResetScript {
  private dataSource: DataSource;

  constructor() {
    this.dataSource = new DataSource({
      type: 'mysql',
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306') || 3306,
      username: process.env.MYSQL_USERNAME || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'gimcstar_light_system',
      entities: RBAC_ENTITIES,
      synchronize: true, // 重要：开启同步以重建表结构
      dropSchema: true,  // 重要：删除现有schema
      logging: ['error', 'warn'],
    });
  }

  /**
   * 执行完整的数据库重置
   */
  async resetDatabase(): Promise<void> {
    console.log('🚨 警告：即将完全重置数据库！');
    console.log('📋 重置步骤：');
    console.log('   1. 删除所有现有表');
    console.log('   2. 重新创建表结构');
    console.log('   3. 初始化基础数据');
    console.log('');

    // 等待确认（在生产环境中可以添加交互式确认）
    await this.waitForConfirmation();

    try {
      console.log('🔄 开始重置数据库...');
      
      // 1. 初始化数据源（会自动删除并重建表）
      await this.dataSource.initialize();
      console.log('✅ 数据库表结构重建完成');

      // 2. 运行种子文件初始化数据（使用同一个连接）
      console.log('🌱 开始初始化基础数据...');
      const seedRunner = new SeedRunner();
      await seedRunner.runAllWithExistingConnection(this.dataSource);

      console.log('');
      console.log('🎉 数据库重置完成！');
      console.log('🔑 默认超级管理员账号：');
      console.log('   手机号: 13800000000');
      console.log('   密码: admin123456');
      console.log('   ⚠️  请登录后立即修改密码！');
      
    } catch (error) {
      console.error('❌ 数据库重置失败:', error);
      throw error;
    } finally {
      // 3. 最后关闭连接
      if (this.dataSource.isInitialized) {
        await this.dataSource.destroy();
      }
    }
  }

  /**
   * 仅重建表结构（不初始化数据）
   */
  async resetSchema(): Promise<void> {
    console.log('🔄 开始重建数据库表结构...');
    
    try {
      await this.dataSource.initialize();
      console.log('✅ 数据库表结构重建完成');
      
    } catch (error) {
      console.error('❌ 表结构重建失败:', error);
      throw error;
    } finally {
      if (this.dataSource.isInitialized) {
        await this.dataSource.destroy();
      }
    }
  }

  /**
   * 仅初始化数据（表结构必须已存在）
   */
  async initData(): Promise<void> {
    console.log('🌱 开始初始化基础数据...');
    
    try {
      const seedRunner = new SeedRunner();
      await seedRunner.runAll();
      console.log('✅ 基础数据初始化完成');
      
    } catch (error) {
      console.error('❌ 数据初始化失败:', error);
      throw error;
    }
  }

  /**
   * 等待确认（简单实现，生产环境可以使用inquirer等库）
   */
  private async waitForConfirmation(): Promise<void> {
    const args = process.argv;
    const forceFlag = args.includes('--force') || args.includes('-f');
    
    if (!forceFlag) {
      console.log('⏳ 5秒后开始执行，按 Ctrl+C 取消...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  /**
   * 显示帮助信息
   */
  static showHelp(): void {
    console.log('数据库重置脚本使用说明：');
    console.log('');
    console.log('命令格式：');
    console.log('  pnpm db:reset [选项] [操作]');
    console.log('');
    console.log('操作：');
    console.log('  (无参数)    - 完整重置：删除表 + 重建表 + 初始化数据');
    console.log('  schema      - 仅重建表结构');
    console.log('  data        - 仅初始化数据');
    console.log('');
    console.log('选项：');
    console.log('  --force, -f - 跳过确认等待');
    console.log('  --help, -h  - 显示帮助信息');
    console.log('');
    console.log('示例：');
    console.log('  pnpm db:reset              # 完整重置数据库');
    console.log('  pnpm db:reset --force      # 强制重置，跳过等待');
    console.log('  pnpm db:reset schema       # 仅重建表结构');
    console.log('  pnpm db:reset data         # 仅初始化数据');
  }
}

// 主执行逻辑
async function main() {
  const args = process.argv.slice(2);
  
  // 显示帮助
  if (args.includes('--help') || args.includes('-h')) {
    DatabaseResetScript.showHelp();
    return;
  }

  const resetScript = new DatabaseResetScript();
  const operation = args.find(arg => !arg.startsWith('--') && !arg.startsWith('-'));

  try {
    switch (operation) {
      case 'schema':
        await resetScript.resetSchema();
        break;
      case 'data':
        await resetScript.initData();
        break;
      default:
        await resetScript.resetDatabase();
        break;
    }
  } catch (error) {
    console.error('执行失败:', error.message);
    process.exit(1);
  }
}

// 执行主函数
if (require.main === module) {
  main();
}