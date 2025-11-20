import { DataSource } from 'typeorm';
import { InitRbacDataSeed } from './001-init-rbac-data';
import SeedXingtuTags1758610867001 from './1758610867001-SeedXingtuTags';
import SeedHuahuoTags1758610867002 from './1758610867002-SeedHuahuoTags';
import SeedPugongyingTags1758610867003 from './1758610867003-SeedPugongyingTags';
import { RBAC_ENTITIES } from '../entities';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

/**
 * 数据库种子文件运行器
 * 用于执行所有种子文件的数据初始化
 */
export class SeedRunner {
  private dataSource: DataSource;

  constructor() {
    this.dataSource = new DataSource({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || '192.168.102.168',
      port: parseInt(process.env.POSTGRES_PORT || '5432') || 5432,
      username: process.env.POSTGRES_USERNAME || 'postgres',
      password: process.env.POSTGRES_PASSWORD || '',
      database: process.env.POSTGRES_DATABASE || 'crawler_db_v2',
      entities: RBAC_ENTITIES,
      synchronize: false,
      logging: false,
    });
  }

  /**
   * 运行所有种子文件
   */
  async runAll(): Promise<void> {
    console.log('🌱 开始运行所有种子文件...');

    try {
      await this.dataSource.initialize();
      console.log('✅ 数据库连接成功');

      await this.executeSeeds(this.dataSource);

      console.log('🎉 所有种子文件运行完成！');
    } catch (error) {
      console.error('❌ 种子文件运行失败:', error);
      throw error;
    } finally {
      if (this.dataSource.isInitialized) {
        await this.dataSource.destroy();
      }
    }
  }

  /**
   * 使用现有连接运行所有种子文件
   */
  async runAllWithExistingConnection(dataSource: DataSource): Promise<void> {
    console.log('🌱 开始运行所有种子文件（使用现有连接）...');

    try {
      await this.executeSeeds(dataSource);
      console.log('🎉 所有种子文件运行完成！');
    } catch (error) {
      console.error('❌ 种子文件运行失败:', error);
      throw error;
    }
  }

  /**
   * 执行所有种子文件的核心逻辑
   */
  private async executeSeeds(dataSource: DataSource): Promise<void> {
    // 1. 初始化RBAC数据
    console.log('📋 初始化RBAC权限数据...');
    const rbacSeed = new InitRbacDataSeed();
    await rbacSeed.run(dataSource);

    // 2. 导入星图标签数据
    console.log('🏷️  导入星图标签数据...');
    const xingtuTagsSeed = new SeedXingtuTags1758610867001();
    await xingtuTagsSeed.run(dataSource);

    // 3. 导入花火标签数据
    console.log('🏷️  导入花火标签数据...');
    const huahuoTagsSeed = new SeedHuahuoTags1758610867002();
    await huahuoTagsSeed.run(dataSource);

    // 4. 导入蒲公英标签数据
    console.log('🏷️  导入蒲公英标签数据...');
    const pugongyingTagsSeed = new SeedPugongyingTags1758610867003();
    await pugongyingTagsSeed.run(dataSource);

    console.log('✅ 所有种子数据导入完成');
  }

  /**
   * 仅运行RBAC初始化
   */
  async runRbacInit(): Promise<void> {
    try {
      console.log('🌱 开始执行RBAC初始化...');

      await this.dataSource.initialize();
      console.log('✅ 数据库连接成功');

      const rbacSeed = new InitRbacDataSeed();
      await rbacSeed.run(this.dataSource);

      console.log('🎉 RBAC初始化完成！');
    } catch (error) {
      console.error('❌ RBAC初始化失败:', error);
      throw error;
    } finally {
      if (this.dataSource.isInitialized) {
        await this.dataSource.destroy();
        console.log('🔌 数据库连接已关闭');
      }
    }
  }
}

// 如果直接运行此文件，则执行所有种子
if (require.main === module) {
  const runner = new SeedRunner();

  const command = process.argv[2];

  if (command === 'rbac') {
    runner.runRbacInit().catch((error) => {
      console.error('执行失败:', error);
      process.exit(1);
    });
  } else {
    runner.runAll().catch((error) => {
      console.error('执行失败:', error);
      process.exit(1);
    });
  }
}
