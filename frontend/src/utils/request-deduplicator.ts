/**
 * API请求去重工具
 * 防止短时间内重复发起相同的请求
 */

interface RequestConfig {
  url?: string
  method?: string
  params?: any
  data?: any
  [key: string]: any
}

/**
 * 请求去重器
 */
export class RequestDeduplicator {
  // 待处理的请求Map (key -> Promise)
  private pendingRequests = new Map<string, Promise<any>>()

  // 白名单: 需要去重的API路径
  private readonly whitelist: string[] = [
    '/influencers/v3/filter/advanced',
    '/influencers/v3/filter/quick',
    '/influencers/v3/filter/stats',
    '/influencers/v3/filter/popular-tags',
  ]

  // 黑名单: 不应去重的API路径 (优先级高于白名单)
  private readonly blacklist: string[] = [
    '/influencers/v3/filter/refresh-view',
    '/influencers/v3/batch-export',
    '/auth/login',
    '/auth/logout',
    '/auth/refresh',
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
   * 去重处理
   */
  deduplicate<T>(config: RequestConfig, requestFn: () => Promise<T>): Promise<T> {
    // 检查是否需要去重
    if (!this.shouldDeduplicate(config)) {
      return requestFn()
    }

    const key = this.generateKey(config)

    // 如果已有相同请求正在处理,直接返回该Promise
    if (this.pendingRequests.has(key)) {
      console.log(`[RequestDeduplicator] 去重复用请求: ${config.url}`)
      return this.pendingRequests.get(key)!
    }

    // 执行新请求
    console.log(`[RequestDeduplicator] 执行新请求: ${config.url}`)
    const promise = requestFn().finally(() => {
      // 请求完成后从Map中移除
      this.pendingRequests.delete(key)
    })

    // 缓存Promise
    this.pendingRequests.set(key, promise)

    return promise
  }

  /**
   * 清除所有待处理请求
   */
  clear(): void {
    this.pendingRequests.clear()
    console.log('[RequestDeduplicator] 已清除所有待处理请求')
  }

  /**
   * 获取当前待处理请求数量
   */
  getPendingCount(): number {
    return this.pendingRequests.size
  }
}

// 导出单例
export const requestDeduplicator = new RequestDeduplicator()
