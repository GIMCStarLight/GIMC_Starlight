import { config } from 'dotenv';
import PostgresDataSource from '../../../data-source-postgres';
import { InitRbacDataSeed } from './001-init-rbac-data';

// 加载环境变量
config();

async function runSeeds() {
  console.log('🌱 开始运行种子数据...');

  try {
    // 初始化PostgreSQL数据源
    await PostgresDataSource.initialize();
    console.log('✅ PostgreSQL数据库连接成功');

    // 运行RBAC初始化种子数据
    const rbacSeed = new InitRbacDataSeed();
    await rbacSeed.run(PostgresDataSource);

    console.log('🎉 所有种子数据运行完成！');
  } catch (error) {
    console.error('❌ 种子数据运行失败:', error);
    throw error;
  } finally {
    // 关闭数据源
    await PostgresDataSource.destroy();
  }
}

// 运行种子数据
runSeeds()
  .then(() => {
    console.log('✨ 种子数据导入成功');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 种子数据导入失败:', error);
    process.exit(1);
  });
