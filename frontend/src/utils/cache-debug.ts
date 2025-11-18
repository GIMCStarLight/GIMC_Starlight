/**
 * 缓存调试工具
 * 在浏览器控制台使用 window.__cacheDebug 访问
 */

import { requestDeduplicator } from './request-deduplicator'

export const cacheDebug = {
  /**
   * 查看缓存统计信息
   */
  stats() {
    const stats = requestDeduplicator.getCacheStats()
    const pendingCount = requestDeduplicator.getPendingCount()
    
    console.group('📊 API缓存统计')
    console.log('缓存总数:', stats.total)
    console.log('有效缓存:', stats.valid)
    console.log('过期缓存:', stats.expired)
    console.log('待处理请求:', pendingCount)
    console.log('命中率:', stats.total > 0 ? ((stats.valid / stats.total) * 100).toFixed(1) + '%' : 'N/A')
    console.groupEnd()
    
    return stats
  },

  /**
   * 清除所有缓存
   */
  clearAll() {
    requestDeduplicator.clear()
    console.log('✅ 已清除所有缓存')
  },

  /**
   * 清除特定URL的缓存
   */
  clear(urlPattern: string) {
    requestDeduplicator.clearCache(urlPattern)
    console.log(`✅ 已清除缓存: ${urlPattern}`)
  },

  /**
   * 清除过期缓存
   */
  clearExpired() {
    requestDeduplicator.clearExpiredCache()
    console.log('✅ 已清除过期缓存')
  },

  /**
   * 帮助信息
   */
  help() {
    console.group('🔧 缓存调试工具使用指南')
    console.log('查看统计:', 'window.__cacheDebug.stats()')
    console.log('清除所有:', 'window.__cacheDebug.clearAll()')
    console.log('清除特定:', 'window.__cacheDebug.clear("/tags")')
    console.log('清除过期:', 'window.__cacheDebug.clearExpired()')
    console.groupEnd()
  }
}

// 开发环境下挂载到window对象
if (typeof window !== 'undefined') {
  const isDev = (import.meta as any).env?.MODE === 'development'
  if (isDev) {
    ;(window as any).__cacheDebug = cacheDebug
    console.log('💡 缓存调试工具已就绪，使用 window.__cacheDebug.help() 查看帮助')
  }
}

export default cacheDebug
