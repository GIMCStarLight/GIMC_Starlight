/**
 * API请求去重与缓存工具
 * 功能1: 防止短时间内重复发起相同的请求（去重）
 * 功能2: 为查询类API提供TTL缓存（减少服务器压力）
 */

import { log } from './logger'

interface RequestConfig {
  url?: string
  method?: string
  params?: any
  data?: any
  [key: string]: any
}

interface CacheOptions {
  /** 缓存时长（毫秒），默认0表示不缓存 */
  ttl?: number
  /** 是否强制刷新缓存 */
  forceRefresh?: boolean
  /** 是否使用 SWR 策略（返回过期数据的同时后台刷新） */
  staleWhileRevalidate?: boolean
}

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  /** 访问次数统计 */
  accessCount?: number
  /** 最后访问时间 */
  lastAccessTime?: number
}

/**
 * 请求去重器（增强版：支持TTL缓存）
 */
export class RequestDeduplicator {
  // 待处理的请求Map (key -> Promise)
  private pendingRequests = new Map<string, Promise<any>>()
  
  // 缓存数据Map (key -> CacheEntry)
  private cache = new Map<string, CacheEntry<any>>()
  
  // 缓存统计
  private stats = {
    hits: 0,        // 缓存命中次数
    misses: 0,      // 缓存未命中次数
    sets: 0,        // 缓存设置次数
    evictions: 0,   // 缓存驱逐次数
  }
  
  // 最大缓存条目数（防止内存无限增长）
  private readonly maxCacheSize = 1000
  
  // 最大缓存内存估算（MB）
  private readonly maxCacheMemoryMB = 50

  // 默认缓存配置 (url路径 -> TTL毫秒)
  private readonly defaultCacheTTL: Record<string, number> = {
    // 热门标签 - 5分钟缓存
    '/influencer-filter/popular-tags': 5 * 60 * 1000,
    
    // 统计数据 - 2分钟缓存
    '/influencer-filter/stats': 2 * 60 * 1000,
    '/influencer-authors/stats': 2 * 60 * 1000,
    '/kol-match/statistics': 2 * 60 * 1000,
    '/kol-reviews/statistics': 2 * 60 * 1000,
    
    // 配置类数据 - 10分钟缓存
    '/kol-lists/platforms': 10 * 60 * 1000,
    '/kol-lists/categories': 10 * 60 * 1000,
    '/kol-lists/organizations': 10 * 60 * 1000,
    '/tags': 10 * 60 * 1000,
    '/tags/tree': 10 * 60 * 1000,
    
    // 筛选类API - 30秒缓存（防止快速切换时的请求风暴）
    '/influencer-filter/quick': 30 * 1000,
    '/influencer-filter/advanced': 30 * 1000,
  }

  // 白名单: 需要去重的API路径
  private readonly whitelist: string[] = [
    // 筛选类API
    '/influencer-filter/advanced',
    '/influencer-filter/quick',
    '/influencer-filter/stats',
    '/influencer-filter/popular-tags',
    
    // 列表查询API
    '/influencer-authors/list',
    '/kol-lists',
    '/kol-match',
    
    // 统计类API
    '/influencer-authors/stats',
    '/kol-match/statistics',
    '/performance/metrics',
    '/performance/matching-stats',
    '/performance/slow-queries',
    
    // 详情查询API
    '/influencer-authors/detail',
    '/kol-lists/',
    '/kol-match/',
    
    // 配置查询API
    '/kol-lists/platforms',
    '/kol-lists/categories',
    '/kol-lists/organizations',
  ]

  // 黑名单: 不应去重的API路径 (优先级高于白名单)
  private readonly blacklist: string[] = [
    // 刷新类API
    '/influencer-filter/refresh-view',
    
    // 导出类API
    '/influencer-authors/batch-export',
    '/kol-lists/export',
    
    // 认证类API
    '/auth/login',
    '/auth/logout',
    '/auth/refresh',
    
    // 批量操作API (需要每次执行)
    '/kol-match/batch',
    '/kol-lists/batch',
    '/kol-lists/',  // DELETE操作
    
    // 文件上传API
    '/upload/excel',
    '/upload/validate',
    '/upload/import',
    
    // 确认/拒绝操作
    '/kol-match/.*/(confirm|reject)',
  ]

  /**
   * 生成请求唯一标识
   */
  generateKey(config: RequestConfig): string {
    const { url = '', method = 'GET', params = {}, data = {} } = config
    const paramsStr = JSON.stringify(params)
    const dataStr = JSON.stringify(data)
    return `${method}:${url}:${paramsStr}:${dataStr}`
  }

  /**
   * 检查请求是否需要去重
   */
  shouldDeduplicate(config: RequestConfig): boolean {
    const url = config.url || ''

    // 黑名单优先
    if (this.blacklist.some((pattern) => url.includes(pattern))) {
      return false
    }

    // 检查白名单
    return this.whitelist.some((pattern) => url.includes(pattern))
  }

  /**
   * 获取请求的默认缓存时长
   */
  private getDefaultTTL(url: string): number {
    for (const [pattern, ttl] of Object.entries(this.defaultCacheTTL)) {
      if (url.includes(pattern)) {
        return ttl
      }
    }
    return 0 // 默认不缓存
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(entry: CacheEntry<any>): boolean {
    const age = Date.now() - entry.timestamp
    return age < entry.ttl
  }

  /**
   * 从缓存中获取数据
   */
  private getCachedData<T>(key: string, useSWR: boolean = false): T | null {
    const entry = this.cache.get(key)
    if (!entry) {
      this.stats.misses++
      return null
    }
    
    // 更新访问统计
    entry.accessCount = (entry.accessCount || 0) + 1
    entry.lastAccessTime = Date.now()
    
    if (this.isCacheValid(entry)) {
      const age = Date.now() - entry.timestamp
      this.stats.hits++
      log.debug(`[RequestCache] 缓存命中: ${key.split(':')[1]}, 缓存年龄: ${(age / 1000).toFixed(1)}s, 访问次数: ${entry.accessCount}`)
      return entry.data
    }
    
    // SWR 策略：返回过期数据（调用方会在后台刷新）
    if (useSWR) {
      const age = Date.now() - entry.timestamp
      log.debug(`[RequestCache] SWR命中（过期数据）: ${key.split(':')[1]}, 过期时长: ${(age / 1000).toFixed(1)}s`)
      this.stats.hits++
      return entry.data
    }
    
    // 缓存过期，清除
    this.cache.delete(key)
    this.stats.misses++
    log.debug(`[RequestCache] 缓存过期: ${key.split(':')[1]}`)
    return null
  }

  /**
   * 设置缓存数据
   */
  private setCachedData<T>(key: string, data: T, ttl: number): void {
    if (ttl <= 0) return // 不缓存
    
    // 检查缓存大小限制
    if (this.cache.size >= this.maxCacheSize) {
      this.evictLRUCache()
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccessTime: Date.now(),
    })
    
    this.stats.sets++
    log.debug(`[RequestCache] 缓存设置: ${key.split(':')[1]}, TTL: ${(ttl / 1000).toFixed(0)}s, 总缓存数: ${this.cache.size}`)
  }

  /**
   * 去重与缓存处理（增强版）
   */
  deduplicate<T>(
    config: RequestConfig, 
    requestFn: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // 检查是否需要去重
    if (!this.shouldDeduplicate(config)) {
      return requestFn()
    }

    const key = this.generateKey(config)
    const url = config.url || ''
    
    // 确定缓存时长
    const ttl = options.ttl !== undefined ? options.ttl : this.getDefaultTTL(url)
    const useSWR = options.staleWhileRevalidate ?? false
    
    // 如果不强制刷新，先尝试从缓存获取
    if (!options.forceRefresh && ttl > 0) {
      const cachedData = this.getCachedData<T>(key, useSWR)
      if (cachedData !== null) {
        // SWR 策略：返回缓存数据的同时，后台刷新
        if (useSWR && !this.isCacheValid(this.cache.get(key)!)) {
          log.debug(`[RequestCache] SWR后台刷新: ${url}`)
          // 异步刷新缓存（不阻塞返回）
          this.refreshCacheInBackground(key, requestFn, ttl)
        }
        return Promise.resolve(cachedData)
      }
    }

    // 如果已有相同请求正在处理,直接返回该Promise
    if (this.pendingRequests.has(key)) {
      log.debug(`[RequestDeduplicator] 去重复用请求: ${url}`)
      return this.pendingRequests.get(key)!
    }

    // 执行新请求
    log.debug(`[RequestDeduplicator] 执行新请求: ${url}`)
    const promise = requestFn()
      .then((data) => {
        // 成功后缓存数据
        this.setCachedData(key, data, ttl)
        return data
      })
      .catch((error) => {
        // 请求失败，如果有过期缓存，尝试返回过期数据
        const staleData = this.cache.get(key)?.data
        if (staleData && useSWR) {
          log.warn(`[RequestCache] 请求失败，返回过期缓存: ${url}`, error)
          return staleData
        }
        throw error
      })
      .finally(() => {
        // 请求完成后从Map中移除
        this.pendingRequests.delete(key)
      })

    // 缓存Promise
    this.pendingRequests.set(key, promise)

    return promise
  }

  /**
   * 清除所有待处理请求和缓存
   */
  clear(): void {
    this.pendingRequests.clear()
    this.cache.clear()
    log.debug('[RequestDeduplicator] 已清除所有待处理请求和缓存')
  }
  
  /**
   * 清除特定URL的缓存
   */
  clearCache(urlPattern: string): void {
    let count = 0
    for (const key of this.cache.keys()) {
      if (key.includes(urlPattern)) {
        this.cache.delete(key)
        count++
      }
    }
    log.debug(`[RequestCache] 清除缓存: ${urlPattern}, 清除数量: ${count}`)
  }
  
  /**
   * 清除过期缓存（定期清理）
   */
  clearExpiredCache(): void {
    let count = 0
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isCacheValid(entry)) {
        this.cache.delete(key)
        count++
      }
    }
    if (count > 0) {
      log.debug(`[RequestCache] 清除过期缓存: ${count}个`)
    }
  }

  /**
   * 获取当前待处理请求数量
   */
  getPendingCount(): number {
    return this.pendingRequests.size
  }
  
  /**
   * 获取当前缓存数量
   */
  getCacheCount(): number {
    return this.cache.size
  }
  
  /**
   * LRU 缓存驱逐策略（移除最少访问的条目）
   */
  private evictLRUCache(): void {
    let oldestKey: string | null = null
    let oldestTime = Date.now()
    let lowestAccessCount = Infinity
    
    // 找出最少使用的缓存条目
    for (const [key, entry] of this.cache.entries()) {
      const accessCount = entry.accessCount || 0
      const lastAccessTime = entry.lastAccessTime || entry.timestamp
      
      // 优先驱逐访问次数少的，其次驱逐最久未访问的
      if (accessCount < lowestAccessCount || 
          (accessCount === lowestAccessCount && lastAccessTime < oldestTime)) {
        oldestKey = key
        oldestTime = lastAccessTime
        lowestAccessCount = accessCount
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey)
      this.stats.evictions++
      log.debug(`[RequestCache] LRU驱逐缓存: ${oldestKey.split(':')[1]}, 访问次数: ${lowestAccessCount}`)
    }
  }
  
  /**
   * SWR 后台刷新缓存
   */
  private refreshCacheInBackground<T>(
    key: string,
    requestFn: () => Promise<T>,
    ttl: number
  ): void {
    // 避免重复刷新
    if (this.pendingRequests.has(key)) {
      return
    }
    
    const promise = requestFn()
      .then((data) => {
        this.setCachedData(key, data, ttl)
        log.debug(`[RequestCache] SWR后台刷新完成: ${key.split(':')[1]}`)
        return data
      })
      .catch((error) => {
        log.warn(`[RequestCache] SWR后台刷新失败: ${key.split(':')[1]}`, error)
      })
      .finally(() => {
        this.pendingRequests.delete(key)
      })
    
    this.pendingRequests.set(key, promise)
  }
  
  /**
   * 缓存预热（主动加载常用数据）
   */
  async warmupCache(requests: Array<{ config: RequestConfig; requestFn: () => Promise<any>; ttl?: number }>): Promise<void> {
    log.info(`[RequestCache] 开始缓存预热，共 ${requests.length} 个请求`)
    
    const promises = requests.map(({ config, requestFn, ttl }) => {
      const key = this.generateKey(config)
      const cacheTTL = ttl ?? this.getDefaultTTL(config.url || '')
      
      return requestFn()
        .then((data) => {
          this.setCachedData(key, data, cacheTTL)
        })
        .catch((error) => {
          log.warn(`[RequestCache] 预热失败: ${config.url}`, error)
        })
    })
    
    await Promise.allSettled(promises)
    log.success(`[RequestCache] 缓存预热完成，当前缓存数: ${this.cache.size}`)
  }
  
  /**
   * 获取缓存统计信息（增强版）
   */
  getCacheStats(): {
    total: number
    valid: number
    expired: number
    hits: number
    misses: number
    hitRate: number
    sets: number
    evictions: number
    memoryEstimateMB: number
  } {
    let valid = 0
    let expired = 0
    let totalSize = 0
    
    for (const entry of this.cache.values()) {
      if (this.isCacheValid(entry)) {
        valid++
      } else {
        expired++
      }
      // 粗略估算内存占用（JSON字符串长度）
      try {
        totalSize += JSON.stringify(entry.data).length
      } catch {
        // 忽略无法序列化的数据
      }
    }
    
    const totalRequests = this.stats.hits + this.stats.misses
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0
    const memoryEstimateMB = totalSize / (1024 * 1024)
    
    return {
      total: this.cache.size,
      valid,
      expired,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Number(hitRate.toFixed(2)),
      sets: this.stats.sets,
      evictions: this.stats.evictions,
      memoryEstimateMB: Number(memoryEstimateMB.toFixed(2)),
    }
  }
  
  /**
   * 重置统计信息
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
    }
    log.debug('[RequestCache] 统计信息已重置')
  }
  
  /**
   * 打印缓存统计报告
   */
  printCacheReport(): void {
    const stats = this.getCacheStats()
    log.info('===== 📊 请求缓存统计报告 =====')
    log.info(`总缓存数: ${stats.total} (有效: ${stats.valid}, 过期: ${stats.expired})`)
    log.info(`命中次数: ${stats.hits}, 未命中: ${stats.misses}, 命中率: ${stats.hitRate}%`)
    log.info(`设置次数: ${stats.sets}, 驱逐次数: ${stats.evictions}`)
    log.info(`内存估算: ${stats.memoryEstimateMB} MB / ${this.maxCacheMemoryMB} MB`)
    log.info(`待处理请求: ${this.getPendingCount()}`)
    log.info('================================')
  }
}

// 导出单例
export const requestDeduplicator = new RequestDeduplicator()

// 定期清理过期缓存（每5分钟）
if (typeof window !== 'undefined') {
  setInterval(() => {
    requestDeduplicator.clearExpiredCache()
  }, 5 * 60 * 1000)
}
