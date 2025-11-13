/**
 * KOL数据同步API接口
 * 
 * 提供私域达人与公海达人数据同步相关的前端API调用方法
 */

import { requestClient } from './request';

export namespace KolSyncApi {
  /** 同步结果 */
  export interface SyncResult {
    kolId: number;
    accountId: string;
    status: 'pending' | 'in_progress' | 'success' | 'failed' | 'partial';
    matchedAuthorId?: string;
    errorMessage?: string;
    syncedAt?: string;
  }

  /** 批量同步结果 */
  export interface BatchSyncResult {
    totalCount: number;
    successCount: number;
    failedCount: number;
    partialCount: number;
    results: SyncResult[];
    crawlJobId?: string;
  }

  /** 同步统计 */
  export interface SyncStats {
    total: number;
    unmatched: number;
    pending: number;
    matched: number;
    rejected: number;
  }

  /**
   * 同步单个KOL数据
   * 超时时间设置为6分钟（360秒），因为需要调用爬虫API并轮询任务状态
   */
  export async function syncSingleKol(kolId: number, accountId: string): Promise<SyncResult> {
    const startTime = Date.now();
    console.log(`[KolSyncApi.syncSingleKol] 🎯 开始同步请求 - KOL ID: ${kolId}, Account ID: ${accountId}`);
    
    try {
      console.log(`[KolSyncApi.syncSingleKol] 📤 发送POST请求到: /kol-sync/single`);
      console.log(`[KolSyncApi.syncSingleKol] 📊 请求体:`, { kol_id: kolId, account_id: accountId });
      console.log(`[KolSyncApi.syncSingleKol] ⏱️ 超时设置: 360000ms (6分钟)`);
      
      const result = await requestClient.post<SyncResult>(
        `/kol-sync/single`, 
        { 
          kol_id: kolId,
          account_id: accountId
        }, 
        {
          timeout: 360000, // 6分钟超时
        }
      );
      
      const duration = Date.now() - startTime;
      console.log(`[KolSyncApi.syncSingleKol] ✅ 收到响应 - 耗时: ${duration}ms`);
      console.log(`[KolSyncApi.syncSingleKol] 📊 同步结果:`, {
        kolId: result.kolId,
        accountId: result.accountId,
        status: result.status,
        matchedAuthorId: result.matchedAuthorId,
        errorMessage: result.errorMessage,
        syncedAt: result.syncedAt
      });
      
      if (result.status === 'failed') {
        console.warn(`[KolSyncApi.syncSingleKol] ⚠️ 同步失败 - 错误: ${result.errorMessage}`);
      } else if (result.status === 'success') {
        console.log(`[KolSyncApi.syncSingleKol] 🎉 同步成功 - 匹配作者ID: ${result.matchedAuthorId}`);
      }
      
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(`[KolSyncApi.syncSingleKol] 💥 同步请求失败 - 耗时: ${duration}ms`);
      console.error(`[KolSyncApi.syncSingleKol] 💥 错误类型: ${error.constructor?.name || typeof error}`);
      console.error(`[KolSyncApi.syncSingleKol] 💥 错误信息: ${error.message}`);
      
      if (error.response) {
        console.error(`[KolSyncApi.syncSingleKol] 📥 HTTP响应状态: ${error.response.status}`);
        console.error(`[KolSyncApi.syncSingleKol] 📥 HTTP响应数据:`, error.response.data);
        console.error(`[KolSyncApi.syncSingleKol] 📥 HTTP响应头:`, error.response.headers);
      } else if (error.request) {
        console.error(`[KolSyncApi.syncSingleKol] 📥 请求已发送但未收到响应`);
        console.error(`[KolSyncApi.syncSingleKol] 📥 请求详情:`, error.request);
      } else {
        console.error(`[KolSyncApi.syncSingleKol] 💥 请求配置错误: ${error.message}`);
      }
      
      console.error(`[KolSyncApi.syncSingleKol] 💥 完整错误对象:`, error);
      throw error;
    }
  }

  /**
   * 批量同步KOL数据
   * 超时时间设置为10分钟（600秒），批量操作耗时更长
   */
  export async function syncBatchKols(kolIds: number[]): Promise<BatchSyncResult> {
    return requestClient.post<BatchSyncResult>('/kol-sync/batch', { kolIds }, {
      timeout: 600000, // 10分钟超时
    });
  }

  /**
   * 重试同步单个KOL
   * 超时时间设置为6分钟（360秒）
   */
  export async function retrySyncKol(kolId: number): Promise<SyncResult> {
    return requestClient.post<SyncResult>(`/kol-sync/retry/${kolId}`, {}, {
      timeout: 360000, // 6分钟超时
    });
  }

  /**
   * 批量重试所有失败的同步任务
   * 超时时间设置为10分钟（600秒）
   */
  export async function retryFailedSyncs(): Promise<BatchSyncResult> {
    return requestClient.post<BatchSyncResult>('/kol-sync/retry-failed', {}, {
      timeout: 600000, // 10分钟超时
    });
  }

  /**
   * 获取同步统计信息
   */
  export async function getSyncStats(): Promise<SyncStats> {
    return requestClient.get<SyncStats>('/kol-sync/stats');
  }
}
