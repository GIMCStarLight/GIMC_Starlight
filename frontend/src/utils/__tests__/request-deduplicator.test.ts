import { describe, expect, it, beforeEach, vi } from 'vitest'
import { RequestDeduplicator, requestDeduplicator } from '../request-deduplicator'

describe('RequestDeduplicator', () => {
  let deduplicator: RequestDeduplicator

  beforeEach(() => {
    deduplicator = new RequestDeduplicator()
  })

  describe('generateKey', () => {
    it('应该为相同的请求配置生成相同的key', () => {
      const config1 = { url: '/api/test', method: 'GET', params: { id: 1 } }
      const config2 = { url: '/api/test', method: 'GET', params: { id: 1 } }
      
      const key1 = deduplicator.generateKey(config1)
      const key2 = deduplicator.generateKey(config2)
      
      expect(key1).toBe(key2)
    })

    it('应该为不同的URL生成不同的key', () => {
      const config1 = { url: '/api/test1', method: 'GET' }
      const config2 = { url: '/api/test2', method: 'GET' }
      
      const key1 = deduplicator.generateKey(config1)
      const key2 = deduplicator.generateKey(config2)
      
      expect(key1).not.toBe(key2)
    })

    it('应该为不同的method生成不同的key', () => {
      const config1 = { url: '/api/test', method: 'GET' }
      const config2 = { url: '/api/test', method: 'POST' }
      
      const key1 = deduplicator.generateKey(config1)
      const key2 = deduplicator.generateKey(config2)
      
      expect(key1).not.toBe(key2)
    })

    it('应该为不同的params生成不同的key', () => {
      const config1 = { url: '/api/test', method: 'GET', params: { id: 1 } }
      const config2 = { url: '/api/test', method: 'GET', params: { id: 2 } }
      
      const key1 = deduplicator.generateKey(config1)
      const key2 = deduplicator.generateKey(config2)
      
      expect(key1).not.toBe(key2)
    })

    it('应该为不同的data生成不同的key', () => {
      const config1 = { url: '/api/test', method: 'POST', data: { name: 'Alice' } }
      const config2 = { url: '/api/test', method: 'POST', data: { name: 'Bob' } }
      
      const key1 = deduplicator.generateKey(config1)
      const key2 = deduplicator.generateKey(config2)
      
      expect(key1).not.toBe(key2)
    })
  })

  describe('shouldDeduplicate', () => {
    it('应该对白名单中的URL返回true', () => {
      const config = { url: '/influencer-filter/advanced' }
      expect(deduplicator.shouldDeduplicate(config)).toBe(true)
    })

    it('应该对黑名单中的URL返回false', () => {
      const config = { url: '/auth/login' }
      expect(deduplicator.shouldDeduplicate(config)).toBe(false)
    })

    it('应该对不在白名单中的URL返回false', () => {
      const config = { url: '/api/unknown' }
      expect(deduplicator.shouldDeduplicate(config)).toBe(false)
    })

    it('黑名单优先级应该高于白名单', () => {
      const config = { url: '/influencer-authors/batch-export' }
      expect(deduplicator.shouldDeduplicate(config)).toBe(false)
    })

    it('应该对统计类API返回true', () => {
      expect(deduplicator.shouldDeduplicate({ url: '/influencer-authors/stats' })).toBe(true)
      expect(deduplicator.shouldDeduplicate({ url: '/kol-match/statistics' })).toBe(true)
      expect(deduplicator.shouldDeduplicate({ url: '/performance/metrics' })).toBe(true)
    })

    it('应该对详情类API返回true', () => {
      expect(deduplicator.shouldDeduplicate({ url: '/influencer-authors/detail/123' })).toBe(true)
      expect(deduplicator.shouldDeduplicate({ url: '/kol-match/123/candidates' })).toBe(true)
    })

    it('应该对列表查询API返回true', () => {
      expect(deduplicator.shouldDeduplicate({ url: '/influencer-authors/list' })).toBe(true)
      expect(deduplicator.shouldDeduplicate({ url: '/kol-lists' })).toBe(true)
      expect(deduplicator.shouldDeduplicate({ url: '/kol-match' })).toBe(true)
    })

    it('应该对批量操作API返回false', () => {
      expect(deduplicator.shouldDeduplicate({ url: '/kol-match/batch' })).toBe(false)
      expect(deduplicator.shouldDeduplicate({ url: '/kol-lists/batch' })).toBe(false)
    })

    it('应该对文件上传API返回false', () => {
      expect(deduplicator.shouldDeduplicate({ url: '/upload/excel' })).toBe(false)
      expect(deduplicator.shouldDeduplicate({ url: '/upload/import' })).toBe(false)
    })
  })

  describe('deduplicate', () => {
    it('应该对不在白名单的请求直接执行', async () => {
      const requestFn = vi.fn().mockResolvedValue('result')
      const config = { url: '/api/unknown' }
      
      const result = await deduplicator.deduplicate(config, requestFn)
      
      expect(requestFn).toHaveBeenCalledTimes(1)
      expect(result).toBe('result')
    })

    it('应该对相同的请求只执行一次', async () => {
      const requestFn = vi.fn().mockResolvedValue('result')
      const config = { url: '/influencer-authors/stats', method: 'GET' }
      
      const [result1, result2, result3] = await Promise.all([
        deduplicator.deduplicate(config, requestFn),
        deduplicator.deduplicate(config, requestFn),
        deduplicator.deduplicate(config, requestFn),
      ])
      
      expect(requestFn).toHaveBeenCalledTimes(1)
      expect(result1).toBe('result')
      expect(result2).toBe('result')
      expect(result3).toBe('result')
    })

    it('应该在请求完成后从缓存中移除', async () => {
      const requestFn = vi.fn().mockResolvedValue('result')
      const config = { url: '/influencer-authors/stats', method: 'GET' }
      
      await deduplicator.deduplicate(config, requestFn)
      expect(deduplicator.getPendingCount()).toBe(0)
      
      await deduplicator.deduplicate(config, requestFn)
      expect(requestFn).toHaveBeenCalledTimes(2)
    })

    it('应该处理请求失败的情况', async () => {
      const error = new Error('Request failed')
      const requestFn = vi.fn().mockRejectedValue(error)
      const config = { url: '/influencer-authors/stats', method: 'GET' }
      
      await expect(deduplicator.deduplicate(config, requestFn)).rejects.toThrow('Request failed')
      expect(deduplicator.getPendingCount()).toBe(0)
    })

    it('应该在请求失败后允许重试', async () => {
      const error = new Error('Request failed')
      const requestFn = vi.fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success')
      const config = { url: '/influencer-authors/stats', method: 'GET' }
      
      await expect(deduplicator.deduplicate(config, requestFn)).rejects.toThrow('Request failed')
      const result = await deduplicator.deduplicate(config, requestFn)
      
      expect(requestFn).toHaveBeenCalledTimes(2)
      expect(result).toBe('success')
    })

    it('应该对不同参数的相同URL分别处理', async () => {
      const requestFn1 = vi.fn().mockResolvedValue('result1')
      const requestFn2 = vi.fn().mockResolvedValue('result2')
      const config1 = { url: '/influencer-authors/detail/123', method: 'GET' }
      const config2 = { url: '/influencer-authors/detail/456', method: 'GET' }
      
      const [result1, result2] = await Promise.all([
        deduplicator.deduplicate(config1, requestFn1),
        deduplicator.deduplicate(config2, requestFn2),
      ])
      
      expect(requestFn1).toHaveBeenCalledTimes(1)
      expect(requestFn2).toHaveBeenCalledTimes(1)
      expect(result1).toBe('result1')
      expect(result2).toBe('result2')
    })

    it('应该正确处理复杂的请求数据', async () => {
      const requestFn = vi.fn().mockResolvedValue('result')
      const config = {
        url: '/influencer-filter/advanced',
        method: 'POST',
        data: {
          platform: 'douyin',
          followerMin: 10000,
          tags: ['美食', '旅游'],
          page: 1,
          pageSize: 20,
        },
      }
      
      const [result1, result2] = await Promise.all([
        deduplicator.deduplicate(config, requestFn),
        deduplicator.deduplicate(config, requestFn),
      ])
      
      expect(requestFn).toHaveBeenCalledTimes(1)
      expect(result1).toBe('result')
      expect(result2).toBe('result')
    })
  })

  describe('clear', () => {
    it('应该清除所有待处理请求', async () => {
      const requestFn = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('result'), 100))
      )
      const config = { url: '/influencer-authors/stats', method: 'GET' }
      
      deduplicator.deduplicate(config, requestFn)
      expect(deduplicator.getPendingCount()).toBe(1)
      
      deduplicator.clear()
      expect(deduplicator.getPendingCount()).toBe(0)
    })
  })

  describe('getPendingCount', () => {
    it('应该返回正确的待处理请求数量', async () => {
      const requestFn = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('result'), 100))
      )
      
      expect(deduplicator.getPendingCount()).toBe(0)
      
      deduplicator.deduplicate({ url: '/influencers/v3/stats' }, requestFn)
      expect(deduplicator.getPendingCount()).toBe(1)
      
      deduplicator.deduplicate({ url: '/kol-match/statistics' }, requestFn)
      expect(deduplicator.getPendingCount()).toBe(2)
    })
  })

  describe('单例实例', () => {
    it('requestDeduplicator应该是RequestDeduplicator的实例', () => {
      expect(requestDeduplicator).toBeInstanceOf(RequestDeduplicator)
    })

    it('requestDeduplicator应该正常工作', async () => {
      const requestFn = vi.fn().mockResolvedValue('result')
      const config = { url: '/influencer-authors/stats', method: 'GET' }
      
      const result = await requestDeduplicator.deduplicate(config, requestFn)
      
      expect(requestFn).toHaveBeenCalledTimes(1)
      expect(result).toBe('result')
    })
  })
})
