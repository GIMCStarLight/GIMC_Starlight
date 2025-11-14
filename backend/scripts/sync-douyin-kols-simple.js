/**
 * 简化版批量同步抖音达人脚本（纯JavaScript，无需编译）
 * 
 * 使用方法：
 * node scripts/sync-douyin-kols-simple.js [选项]
 * 
 * 选项：
 * --status=pending    仅同步指定状态的达人（可选：unmatched, pending, matched, rejected）
 * --limit=100         限制同步的最大数量（默认：全部）
 * --batch-size=20     每批同步的数量（默认：20）
 * --delay=3000        批次间延迟毫秒数（默认：3000）
 * --dry-run           仅查询并显示待同步达人，不执行实际同步
 * 
 * 示例：
 * # 同步所有待同步的抖音达人
 * node scripts/sync-douyin-kols-simple.js
 * 
 * # 仅同步状态为pending的达人
 * node scripts/sync-douyin-kols-simple.js --status=pending
 * 
 * # 同步前100个达人，每批10个
 * node scripts/sync-douyin-kols-simple.js --limit=100 --batch-size=10
 * 
 * # 查看待同步达人但不执行同步
 * node scripts/sync-douyin-kols-simple.js --dry-run
 */

const axios = require('axios');
const { Client } = require('pg');
require('dotenv').config();

// ==================== 配置 ====================
const config = {
  // API配置
  apiUrl: process.env.BACKEND_API_URL || `http://localhost:${process.env.PORT || 10001}/api`,
  requestTimeout: 600000, // 10分钟

  // 数据库配置（PostgreSQL）
  db: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    user: process.env.POSTGRES_USERNAME || 'postgres',
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DATABASE || 'crawler_db_v2',
  },

  // 同步配置
  batchSize: 20,
  batchDelay: 3000,
  maxLimit: null,
  filterStatus: null,
  dryRun: false,
};

// 解析命令行参数
process.argv.slice(2).forEach(arg => {
  if (arg.startsWith('--status=')) {
    config.filterStatus = arg.split('=')[1];
  } else if (arg.startsWith('--limit=')) {
    config.maxLimit = parseInt(arg.split('=')[1]);
  } else if (arg.startsWith('--batch-size=')) {
    config.batchSize = parseInt(arg.split('=')[1]);
  } else if (arg.startsWith('--delay=')) {
    config.batchDelay = parseInt(arg.split('=')[1]);
  } else if (arg === '--dry-run') {
    config.dryRun = true;
  }
});

// ==================== 工具函数 ====================

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes > 0 ? `${minutes}分${remainingSeconds}秒` : `${seconds}秒`;
}

// ==================== 数据库操作 ====================

async function fetchDouyinKols(client) {
  try {
    let query = `
      SELECT id, account_id, account_name, match_status, followers_w
      FROM kol_list
      WHERE platform IN ('抖音', 'douyin')
        AND account_id IS NOT NULL
        AND account_id != ''
    `;

    if (config.filterStatus) {
      query += ` AND match_status = '${config.filterStatus}'`;
    }

    query += ` ORDER BY id ASC`;

    if (config.maxLimit) {
      query += ` LIMIT ${config.maxLimit}`;
    }

    const result = await client.query(query);
    return result.rows;
  } catch (error) {
    console.error('❌ 查询数据库失败:', error.message);
    throw error;
  }
}

// ==================== API调用 ====================

async function callBatchSyncApi(kolIds) {
  try {
    const response = await axios.post(
      `${config.apiUrl}/kol-sync/batch`,
      { kolIds },
      {
        timeout: config.requestTimeout,
        headers: { 'Content-Type': 'application/json' },
      }
    );
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`API错误 (${error.response.status}): ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      throw new Error(`请求超时或无响应: ${error.message}`);
    } else {
      throw new Error(`请求配置错误: ${error.message}`);
    }
  }
}

// ==================== 主函数 ====================

async function main() {
  const scriptStartTime = Date.now();

  console.log('\n========================================');
  console.log('🚀 批量同步抖音达人脚本');
  console.log('========================================\n');

  // 显示配置
  console.log('📋 当前配置:');
  console.log(`   - API地址: ${config.apiUrl}`);
  console.log(`   - 数据库: PostgreSQL ${config.db.host}:${config.db.port}/${config.db.database}`);
  console.log(`   - 每批数量: ${config.batchSize}`);
  console.log(`   - 批次延迟: ${config.batchDelay}ms`);
  if (config.filterStatus) {
    console.log(`   - 筛选状态: ${config.filterStatus}`);
  }
  if (config.maxLimit) {
    console.log(`   - 最大数量: ${config.maxLimit}`);
  }
  if (config.dryRun) {
    console.log(`   - 模式: 🔍 仅查询 (不执行同步)`);
  }
  console.log('');

  let client;

  try {
    // 连接数据库
    console.log('📊 正在连接 PostgreSQL 数据库...');
    client = new Client(config.db);
    await client.connect();
    console.log('✅ 数据库连接成功\n');

    // 查询待同步的达人
    console.log('🔍 正在查询抖音达人...');
    const allKols = await fetchDouyinKols(client);
    console.log(`✅ 查询完成，共找到 ${allKols.length} 个抖音达人\n`);

    if (allKols.length === 0) {
      console.log('ℹ️  没有符合条件的抖音达人');
      return;
    }

    // 统计状态分布
    const statusCounts = {};
    allKols.forEach(kol => {
      const status = kol.match_status || 'unmatched';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    console.log('📈 状态分布:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      const percentage = ((count / allKols.length) * 100).toFixed(1);
      console.log(`   - ${status.padEnd(12)}: ${count.toString().padStart(4)} 个 (${percentage}%)`);
    });
    console.log('');

    // 显示前10个达人示例
    console.log('📝 达人示例 (前10个):');
    allKols.slice(0, 10).forEach((kol, idx) => {
      const followers = kol.followers_w ? `${kol.followers_w}万粉` : '未知粉丝数';
      const status = kol.match_status || 'unmatched';
      console.log(`   ${(idx + 1).toString().padStart(2)}. ${kol.account_name.padEnd(20)} (${followers.padEnd(12)}, 状态: ${status})`);
    });
    if (allKols.length > 10) {
      console.log(`   ... 还有 ${allKols.length - 10} 个达人`);
    }
    console.log('');

    // 如果是dry-run模式，到这里就结束
    if (config.dryRun) {
      console.log('🔍 DRY-RUN模式: 仅查询完成，未执行同步');
      console.log('💡 要执行实际同步，请移除 --dry-run 参数\n');
      return;
    }

    // 确认开始同步
    const totalBatches = Math.ceil(allKols.length / config.batchSize);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`⚠️  即将开始同步 ${allKols.length} 个达人`);
    console.log(`📦 预计批次数: ${totalBatches}`);
    console.log(`⏱️  预计总耗时: ${formatDuration(totalBatches * (config.batchDelay + 30000))}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 分批处理
    let totalSuccess = 0;
    let totalFailed = 0;
    let totalPartial = 0;

    for (let i = 0; i < allKols.length; i += config.batchSize) {
      const batchNumber = Math.floor(i / config.batchSize) + 1;
      const batch = allKols.slice(i, i + config.batchSize);
      const kolIds = batch.map(kol => kol.id);

      console.log(`\n╔════════════════════════════════════════╗`);
      console.log(`║  批次 ${batchNumber}/${totalBatches} - 同步 ${batch.length} 个达人`.padEnd(43) + '║');
      console.log(`╚════════════════════════════════════════╝`);

      // 显示当前批次达人
      batch.slice(0, 5).forEach((kol, idx) => {
        const status = kol.match_status || 'unmatched';
        console.log(`   ${idx + 1}. ${kol.account_name} (ID: ${kol.id}, 状态: ${status})`);
      });
      if (batch.length > 5) {
        console.log(`   ... 还有 ${batch.length - 5} 个`);
      }

      try {
        const batchStartTime = Date.now();
        console.log(`\n🔄 正在调用同步API...`);

        const result = await callBatchSyncApi(kolIds);
        const batchDuration = Date.now() - batchStartTime;

        console.log(`\n✅ 批次 ${batchNumber} 同步完成 (耗时: ${formatDuration(batchDuration)})`);
        console.log(`   ✔️  成功: ${result.successCount}`);
        console.log(`   ❌ 失败: ${result.failedCount}`);
        console.log(`   ⚠️  部分成功: ${result.partialCount}`);

        // 显示失败详情
        if (result.failedCount > 0) {
          console.log(`\n   失败详情:`);
          result.results
            .filter(r => r.status === 'failed')
            .slice(0, 3)
            .forEach(r => {
              const kol = batch.find(k => k.id === r.kolId);
              console.log(`      • ${kol?.account_name} (ID: ${r.kolId})`);
              console.log(`        错误: ${r.errorMessage || '未知错误'}`);
            });
          if (result.failedCount > 3) {
            console.log(`      ... 还有 ${result.failedCount - 3} 个失败项`);
          }
        }

        totalSuccess += result.successCount;
        totalFailed += result.failedCount;
        totalPartial += result.partialCount;

      } catch (error) {
        console.error(`\n❌ 批次 ${batchNumber} 同步失败:`, error.message);
        totalFailed += batch.length;
      }

      // 进度条
      const progress = ((i + batch.length) / allKols.length * 100).toFixed(1);
      const progressBar = '█'.repeat(Math.floor(progress / 2.5)) + '░'.repeat(40 - Math.floor(progress / 2.5));
      console.log(`\n进度: [${progressBar}] ${progress}%`);
      console.log(`已完成: ${i + batch.length}/${allKols.length} | 成功: ${totalSuccess} | 失败: ${totalFailed}`);

      // 批次间延迟
      if (i + config.batchSize < allKols.length) {
        console.log(`\n⏳ 等待 ${config.batchDelay}ms 后继续下一批...`);
        await delay(config.batchDelay);
      }
    }

    // 最终统计
    const totalDuration = Date.now() - scriptStartTime;
    console.log('\n\n╔════════════════════════════════════════╗');
    console.log('║          📊 同步完成统计              ║');
    console.log('╚════════════════════════════════════════╝');
    console.log(`总达人数: ${allKols.length}`);
    console.log(`成功: ${totalSuccess} (${((totalSuccess / allKols.length) * 100).toFixed(1)}%)`);
    console.log(`失败: ${totalFailed} (${((totalFailed / allKols.length) * 100).toFixed(1)}%)`);
    console.log(`部分成功: ${totalPartial} (${((totalPartial / allKols.length) * 100).toFixed(1)}%)`);
    console.log(`总耗时: ${formatDuration(totalDuration)}`);
    console.log('════════════════════════════════════════\n');

    if (totalFailed > 0) {
      console.log('💡 提示：可以使用以下命令重试失败的同步任务：');
      console.log(`   curl -X POST ${config.apiUrl}/kol-sync/retry-failed`);
      console.log('   或运行: node scripts/sync-douyin-kols-simple.js --status=rejected\n');
    }

  } catch (error) {
    console.error('\n❌ 脚本执行失败:', error.message);
    console.error('详细错误:', error);
    process.exit(1);
  } finally {
    if (client) {
      await client.end();
      console.log('✅ 数据库连接已关闭\n');
    }
  }
}

// 运行主函数
main().catch(error => {
  console.error('❌ 未捕获的错误:', error);
  process.exit(1);
});
