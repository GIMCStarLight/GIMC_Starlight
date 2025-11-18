/**
 * 请求缓存使用示例和最佳实践
 * 
 * 本文件展示如何使用扩展后的请求去重与缓存机制
 */

import { requestDeduplicator } from './request-deduplicator'

/**
 * 示例1: 使用默认TTL缓存（自动）
 * 
 * 以下API已配置默认TTL，无需手动设置：
 * - /influencer-filter/popular-tags (5分钟)
 * - /influencer-filter/stats (2分钟)
 * - /kol-lists/platforms (10分钟)
 * - /tags/tree (10分钟)
 */

// 示例：获取热门标签（自动使用5分钟缓存）
// export async function getPopularTags() {
//   return requestDeduplicator.deduplicate(
//     { url: '/influencer-filter/popular-tags', method: 'GET' },
//     () => requestClient.get('/influencer-filter/popular-tags')
//   )
// }

/**
 * 示例2: 自定义TTL缓存
 * 
 * 对于需要特殊缓存时长的API，可以手动指定TTL
 */

// 示例：获取用户配置（缓存30分钟）
// export async function getUserConfig() {
//   return requestDeduplicator.deduplicate(
//     { url: '/user/config', method: 'GET' },
//     () => requestClient.get('/user/config'),
//     { ttl: 30 * 60 * 1000 } // 30分钟
//   )
// }

/**
 * 示例3: 强制刷新缓存
 * 
 * 某些场景需要强制获取最新数据
 */

// 示例：强制刷新统计数据
// export async function refreshStats() {
//   return requestDeduplicator.deduplicate(
//     { url: '/influencer-filter/stats', method: 'GET' },
//     () => requestClient.get('/influencer-filter/stats'),
//     { forceRefresh: true } // 强制刷新
//   )
// }

/**
 * 示例4: 禁用缓存
 * 
 * 对于实时性要求极高的数据
 */

// 示例：获取实时价格（不缓存）
// export async function getRealTimePrice() {
//   return requestDeduplicator.deduplicate(
//     { url: '/price/realtime', method: 'GET' },
//     () => requestClient.get('/price/realtime'),
//     { ttl: 0 } // 不缓存
//   )
// }

/**
 * 缓存管理工具函数
 */

/**
 * 清除特定URL的缓存
 * 使用场景：数据更新后需要清除相关缓存
 */
export function clearApiCache(urlPattern: string) {
  requestDeduplicator.clearCache(urlPattern)
}

/**
 * 清除所有缓存
 * 使用场景：用户登出、切换账号
 */
export function clearAllCache() {
  requestDeduplicator.clear()
}

/**
 * 获取缓存统计信息
 * 使用场景：性能监控、调试
 */
export function getCacheStats() {
  return requestDeduplicator.getCacheStats()
}

/**
 * 最佳实践建议
 * 
 * 1. **配置类数据**（如平台列表、标签树）
 *    - 推荐TTL: 10-30分钟
 *    - 特点：变化频率低，可长期缓存
 * 
 * 2. **统计类数据**（如总数、分布图）
 *    - 推荐TTL: 2-5分钟
 *    - 特点：允许轻微延迟，减少服务器压力
 * 
 * 3. **筛选类数据**（如达人列表）
 *    - 推荐TTL: 30-60秒
 *    - 特点：防止快速切换时的请求风暴
 * 
 * 4. **详情类数据**（如达人详情）
 *    - 推荐TTL: 1-2分钟
 *    - 特点：访问频繁，短期缓存即可
 * 
 * 5. **实时类数据**（如在线状态、实时价格）
 *    - 推荐TTL: 0（不缓存）
 *    - 特点：必须获取最新数据
 * 
 * 6. **数据更新后**
 *    - 调用 clearCache 清除相关缓存
 *    - 或使用 forceRefresh 强制刷新
 */

/**
 * 缓存刷新策略示例
 */

// 示例：更新标签后清除相关缓存
// export async function updateTag(tagId: string, data: any) {
//   await requestClient.put(`/tags/${tagId}`, data)
//   // 清除标签相关的所有缓存
//   clearApiCache('/tags')
// }

// 示例：批量操作后刷新列表
// export async function batchDeleteKols(ids: string[]) {
//   await requestClient.delete('/kol-lists', { data: { ids } })
//   // 强制刷新列表数据
//   return requestDeduplicator.deduplicate(
//     { url: '/kol-lists', method: 'GET', params: {} },
//     () => requestClient.get('/kol-lists'),
//     { forceRefresh: true }
//   )
// }

export default {
  clearApiCache,
  clearAllCache,
  getCacheStats,
}
