/**
 * 环境检查脚本
 * 检查数据库连接、后端API、待同步达人数量等
 */

const axios = require('axios');
const { Client } = require('pg');
require('dotenv').config();

const config = {
  apiUrl: process.env.BACKEND_API_URL || `http://localhost:${process.env.PORT || 10001}/api`,
  db: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USERNAME || 'postgres',
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DATABASE || 'crawler_db_v2',
  },
};

async function checkDatabase() {
  try {
    console.log('📊 检查 PostgreSQL 数据库连接...');
    const client = new Client(config.db);
    await client.connect();
    console.log('✅ 数据库连接成功');

    // 查询抖音达人统计
    const result = await client.query(`
      SELECT 
        COUNT(*)::INTEGER as total,
        SUM(CASE WHEN match_status = 'unmatched' OR match_status IS NULL THEN 1 ELSE 0 END)::INTEGER as unmatched,
        SUM(CASE WHEN match_status = 'pending' THEN 1 ELSE 0 END)::INTEGER as pending,
        SUM(CASE WHEN match_status = 'matched' THEN 1 ELSE 0 END)::INTEGER as matched,
        SUM(CASE WHEN match_status = 'rejected' THEN 1 ELSE 0 END)::INTEGER as rejected
      FROM kol_list
      WHERE platform IN ('抖音', 'douyin')
        AND account_id IS NOT NULL
        AND account_id != ''
    `);

    const stats = result.rows[0];
    console.log('\n📈 抖音达人统计:');
    console.log(`   总数: ${stats.total}`);
    console.log(`   未匹配: ${stats.unmatched}`);
    console.log(`   待同步: ${stats.pending}`);
    console.log(`   已匹配: ${stats.matched}`);
    console.log(`   同步失败: ${stats.rejected}`);

    await client.end();
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    return false;
  }
}

async function checkAPI() {
  try {
    console.log('\n🌐 检查后端API...');
    console.log(`   API地址: ${config.apiUrl}`);
    
    const response = await axios.get(`${config.apiUrl}/kol-sync/stats`, {
      timeout: 5000,
    });
    
    console.log('✅ API连接成功');
    console.log('\n📊 同步统计:');
    console.log(`   总数: ${response.data.total}`);
    console.log(`   未匹配: ${response.data.unmatched}`);
    console.log(`   待同步: ${response.data.pending}`);
    console.log(`   已匹配: ${response.data.matched}`);
    console.log(`   同步失败: ${response.data.rejected}`);
    
    return true;
  } catch (error) {
    console.error('❌ API连接失败:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   提示: 请确保后端服务已启动');
      console.error(`   启动命令: cd /Users/samuel/Desktop/系统开发/backend && npm run start:dev`);
    }
    return false;
  }
}

async function main() {
  console.log('\n========================================');
  console.log('🔍 环境检查');
  console.log('========================================\n');

  const dbOk = await checkDatabase();
  const apiOk = await checkAPI();

  console.log('\n========================================');
  console.log('📋 检查结果');
  console.log('========================================');
  console.log(`数据库: ${dbOk ? '✅ 正常' : '❌ 异常'}`);
  console.log(`后端API: ${apiOk ? '✅ 正常' : '❌ 异常'}`);
  console.log('========================================\n');

  if (dbOk && apiOk) {
    console.log('✅ 环境检查通过！可以运行批量同步脚本');
    console.log('\n💡 使用命令:');
    console.log('   # 先查看待同步达人（不执行同步）');
    console.log('   node scripts/sync-douyin-kols-simple.js --dry-run');
    console.log('');
    console.log('   # 执行全量同步');
    console.log('   node scripts/sync-douyin-kols-simple.js');
    console.log('');
  } else {
    console.log('❌ 环境检查未通过，请先解决上述问题');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ 检查失败:', error);
  process.exit(1);
});
