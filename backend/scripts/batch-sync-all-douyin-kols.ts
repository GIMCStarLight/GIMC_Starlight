/**
 * 批量同步所有抖音达人数据
 * 
 * 功能：自动分批调用后端批量同步API，将所有抖音达人同步到公海数据
 * 限制：每批最多20个达人（受前端限制）
 * 
 * 使用方法：
 * 1. 确保后端服务已启动（默认端口：10001）
 * 2. 运行命令：npx ts-node scripts/batch-sync-all-douyin-kols.ts
 * 
 * 注意：
 * - 脚本会自动查询所有待同步的抖音达人
 * - 每批20个进行同步，批次间延迟避免服务器压力
 * - 显示详细的同步进度和结果统计
 */

import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { Client } from 'pg';

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// 配置
const BACKEND_API_URL = process.env.BACKEND_API_URL || `http://localhost:${process.env.PORT || 10001}/api`;
const BATCH_SIZE = 20; // 每批同步的数量
const BATCH_DELAY = 3000; // 批次间延迟（毫秒），避免过载
const REQUEST_TIMEOUT = 600000; // 请求超时时间10分钟

// 数据库连接配置（PostgreSQL）
const dbConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  user: process.env.POSTGRES_USERNAME || 'postgres',
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DATABASE || 'crawler_db_v2',
};

interface KolRecord {
  id: number;
  account_id: string;
  account_name: string;
  match_status: string;
}

interface BatchSyncResult {
  totalCount: number;
  successCount: number;
  failedCount: number;
  partialCount: number;
  results: Array<{
    kolId: number;
    accountId: string;
    status: string;
    errorMessage?: string;
  }>;
}

/**
 * 查询所有需要同步的抖音达人
 * @param filterStatus 筛选特定状态，默认查询所有状态
 */
async function fetchDouyinKols(client: Client, filterStatus?: string): Promise<KolRecord[]> {
  try {
    let query = `
      SELECT id, account_id, account_name, match_status
      FROM kol_list
      WHERE platform IN ('抖音', 'douyin')
        AND account_id IS NOT NULL
        AND account_id != ''
    `;

    if (filterStatus) {
      query += ` AND match_status = '${filterStatus}'`;
    }

    query += ` ORDER BY id ASC`;

    const result = await client.query(query);
    return result.rows;
  } catch (error) {
    console.error('❌ 查询数据库失败:', error);
    throw error;
  }
}

/**
 * 调用后端批量同步API
 */
async function callBatchSyncApi(kolIds: number[]): Promise<BatchSyncResult> {
  try {
    const response = await axios.post(
      `${BACKEND_API_URL}/kol-sync/batch`,
      { kolIds },
      {
        timeout: REQUEST_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error('❌ API响应错误:', error.response.status, error.response.data);
    } else if (error.request) {
      console.error('❌ 请求未收到响应:', error.message);
    } else {
      console.error('❌ 请求配置错误:', error.message);
    }
    throw error;
  }
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 主函数
 */
async function main() {
  console.log('========================================');
  console.log('🚀 批量同步所有抖音达人');
  console.log('========================================\n');

  const client = new Client(dbConfig);

  try {
    // 初始化数据库连接
    console.log('📊 正在连接 PostgreSQL 数据库...');
    await client.connect();
    console.log('✅ 数据库连接成功\n');

    // 查询所有待同步的抖音达人
    console.log('🔍 正在查询待同步的抖音达人...');
    const allKols = await fetchDouyinKols(client);
    console.log(`✅ 查询完成，共找到 ${allKols.length} 个抖音达人\n`);

    if (allKols.length === 0) {
      console.log('ℹ️  没有需要同步的抖音达人');
      return;
    }

    // 显示状态分布
    const statusCounts: Record<string, number> = {};
    allKols.forEach(kol => {
      const status = kol.match_status || 'unmatched';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    console.log('📈 状态分布:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count} 个`);
    });
    console.log('');

    // 确认是否继续
    console.log(`⚠️  即将开始批量同步，每批 ${BATCH_SIZE} 个达人`);
    console.log(`⏱️  预计批次数: ${Math.ceil(allKols.length / BATCH_SIZE)}`);
    console.log(`⏱️  每批延迟: ${BATCH_DELAY}ms`);
    console.log('');

    // 分批处理
    const totalBatches = Math.ceil(allKols.length / BATCH_SIZE);
    let totalSuccess = 0;
    let totalFailed = 0;
    let totalPartial = 0;

    for (let i = 0; i < allKols.length; i += BATCH_SIZE) {
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const batch = allKols.slice(i, i + BATCH_SIZE);
      const kolIds = batch.map(kol => kol.id);

      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📦 批次 ${batchNumber}/${totalBatches} - 同步 ${batch.length} 个达人`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      
      // 显示当前批次的达人信息（显示前5个）
      const displayKols = batch.slice(0, 5);
      displayKols.forEach((kol, idx) => {
        console.log(`   ${idx + 1}. ${kol.account_name} (ID: ${kol.id}, 状态: ${kol.match_status || 'unmatched'})`);
      });
      if (batch.length > 5) {
        console.log(`   ... 还有 ${batch.length - 5} 个达人`);
      }
      console.log('');

      try {
        const startTime = Date.now();
        console.log(`🔄 正在调用同步API...`);
        
        const result = await callBatchSyncApi(kolIds);
        const duration = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log(`\n✅ 批次 ${batchNumber} 同步完成 (耗时: ${duration}s)`);
        console.log(`   - 成功: ${result.successCount}`);
        console.log(`   - 失败: ${result.failedCount}`);
        console.log(`   - 部分成功: ${result.partialCount}`);

        // 显示失败的达人
        if (result.failedCount > 0) {
          console.log(`\n   ⚠️  失败详情:`);
          result.results
            .filter(r => r.status === 'failed')
            .slice(0, 3)
            .forEach(r => {
              const kol = batch.find(k => k.id === r.kolId);
              console.log(`      - ${kol?.account_name} (ID: ${r.kolId}): ${r.errorMessage}`);
            });
          if (result.failedCount > 3) {
            console.log(`      ... 还有 ${result.failedCount - 3} 个失败项`);
          }
        }

        totalSuccess += result.successCount;
        totalFailed += result.failedCount;
        totalPartial += result.partialCount;

      } catch (error: any) {
        console.error(`\n❌ 批次 ${batchNumber} 同步失败:`, error.message);
        totalFailed += batch.length;
      }

      // 如果不是最后一批，等待一段时间再继续
      if (i + BATCH_SIZE < allKols.length) {
        console.log(`\n⏳ 等待 ${BATCH_DELAY}ms 后继续下一批...`);
        await delay(BATCH_DELAY);
      }
    }

    // 总结
    console.log('\n\n========================================');
    console.log('📊 同步完成统计');
    console.log('========================================');
    console.log(`总达人数: ${allKols.length}`);
    console.log(`成功: ${totalSuccess} (${((totalSuccess / allKols.length) * 100).toFixed(1)}%)`);
    console.log(`失败: ${totalFailed} (${((totalFailed / allKols.length) * 100).toFixed(1)}%)`);
    console.log(`部分成功: ${totalPartial} (${((totalPartial / allKols.length) * 100).toFixed(1)}%)`);
    console.log('========================================\n');

    if (totalFailed > 0) {
      console.log('💡 提示：可以使用以下命令重试失败的同步任务：');
      console.log('   curl -X POST http://localhost:10001/api/v1/kol-sync/retry-failed\n');
    }

  } catch (error) {
    console.error('\n❌ 脚本执行失败:', error);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    await client.end();
    console.log('✅ 数据库连接已关闭');
  }
}

// 运行主函数
main().catch(error => {
  console.error('❌ 未捕获的错误:', error);
  process.exit(1);
});
