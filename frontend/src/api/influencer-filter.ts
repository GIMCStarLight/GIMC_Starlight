/**
 * 达人筛选API (基于物化视图优化)
 * 路由: /api/influencer-filter
 */
import { requestClient } from './request'
import { requestDeduplicator } from '../utils/request-deduplicator'

// ========== 类型定义 ==========

export interface QuickFilterParams {
  // 内容标签
  primaryTags?: string[]
  
  // 数据表现
  qualityTier?: 'premium' | 'high' | 'medium' | 'low'
  growthLevel?: 'explosive' | 'high' | 'medium' | 'low' | 'stagnant'
  
  // 预算规模
  priceTier?: 'low' | 'medium' | 'high' | 'premium'  // 基础型 | 标准型 | 高端型 | 顶级型
  influencerTier?: 'mega' | 'macro' | 'mid' | 'micro' | 'nano'
  
  // 分页
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

export interface AdvancedFilterParams extends QuickFilterParams {
  // 基础信息
  keyword?: string
  province?: string
  city?: string
  gender?: 'M' | 'F' | 'U'
  
  // 粉丝维度
  minFollowers?: number
  maxFollowers?: number
  minGrowthRate30d?: number
  maxGrowthRate30d?: number
  
  // 数据表现
  minInteractRate?: number
  maxInteractRate?: number
  minPlayOverRate?: number
  maxPlayOverRate?: number
  minVvMedian?: number
  maxVvMedian?: number
  
  // 价格维度
  minPrice20_60?: number
  maxPrice20_60?: number
  minCpmEfficiency?: number
  maxCpmEfficiency?: number
  
  // 电商维度
  ecommerceEnabled?: boolean
  ecomCapabilityTier?: 'top' | 'high' | 'medium' | 'low' | 'disabled'
  minGmv30d?: number
  maxGmv30d?: number
  ecommRegistered?: boolean
  
  // 营销维度
  minConvertIndex?: number
  minShoppingIndex?: number
  minSpreadIndex?: number
  
  // 预期指标
  minExpectedPlayNum?: number
  maxExpectedPlayNum?: number
  minExpectedCpm?: number
  maxExpectedCpm?: number
  minExpectedCpe?: number
  maxExpectedCpe?: number
  minBurstRate?: number
  maxBurstRate?: number
  
  // 认证标签
  excellentAuthor?: boolean
  blackHorse?: boolean
  risingStart?: boolean
  highPotential?: boolean
  
  // 机构筛选
  orgName?: string
  
  // 匹配相关
  matchedOnly?: boolean
  matchStatus?: 'PENDING' | 'MATCHED' | 'UNMATCHED' | 'REJECTED' | 'NO_MATCH' | 'FAILED'
}

export interface FilterResponse {
  data: any[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  performance: {
    countTime: number
    dataTime: number
    totalTime: number
  }
  fromCache: boolean
}

export interface FilterStatsResponse {
  totalCount: number
  qualityDistribution: { tier: string; count: number }[]
  growthDistribution: { level: string; count: number }[]
  priceDistribution: { tier: string; count: number }[]
  followerDistribution: { tier: string; count: number }[]
  ecomDistribution: { tier: string; count: number }[]
  fromCache: boolean
}

export interface PopularTag {
  tag: string
  count: number
}

// ========== API方法 ==========

/**
 * 快速筛选查询
 */
export async function quickFilter(params: QuickFilterParams): Promise<FilterResponse> {
  try {
    const response = await requestClient.get('/influencer-filter/quick', { params })
    // requestClient 配置了 responseReturn: 'data' 和 defaultResponseInterceptor
    // 会自动解包: { code, data } -> data -> { data, pagination, performance }
    return response
  } catch (error) {
    console.error('快速筛选失败:', error)
    throw error
  }
}

/**
 * 高级筛选查询 - 集成请求去重
 */
export async function advancedFilter(params: AdvancedFilterParams): Promise<FilterResponse> {
  // 使用请求去重器包装
  return requestDeduplicator.deduplicate(
    {
      url: '/influencer-filter/advanced',
      method: 'POST',
      data: params,
    },
    async () => {
      try {
        // 在发送前进行参数规范化与枚举映射
        const payload: Record<string, any> = { ...params }
        
        // 仅展示已匹配达人
        if (params.matchedOnly) {
          payload.matched_only = true
        }

        // 匹配状态枚举映射（兼容前端旧枚举到后端枚举）
        if (params.matchStatus) {
          const map: Record<string, string> = {
            PENDING: 'PENDING',
            MATCHED: 'MATCHED',
            UNMATCHED: 'UNMATCHED',
            REJECTED: 'REJECTED',
            NO_MATCH: 'UNMATCHED',
            FAILED: 'REJECTED'
          }
          payload.match_status = map[String(params.matchStatus)]
        }

        // POST请求,参数放在body里
        const response = await requestClient.post('/influencer-filter/advanced', payload)
        // requestClient 配置了 responseReturn: 'data' 和 defaultResponseInterceptor
        // 会自动解包: { code, data } -> data -> { data, pagination, performance }
        return response
      } catch (error) {
        console.error('高级筛选失败:', error)
        throw error
      }
    }
  )
}

/**
 * 获取筛选统计
 */
export async function getFilterStatistics(params: Omit<AdvancedFilterParams, 'page' | 'limit'>): Promise<FilterStatsResponse> {
  try {
    const response = await requestClient.get('/influencer-filter/stats', { params })
    return response
  } catch (error) {
    console.error('获取筛选统计失败:', error)
    throw error
  }
}

/**
 * 获取热门标签
 */
export async function getPopularTags(limit = 20): Promise<PopularTag[]> {
  try {
    const response = await requestClient.get('/influencer-filter/popular-tags', {
      params: { limit }
    })
    return response
  } catch (error) {
    console.error('获取热门标签失败:', error)
    throw error
  }
}

/**
 * 刷新物化视图(内部使用)
 */
export async function refreshMaterializedView(): Promise<{ message: string }> {
  try {
    const response = await requestClient.post('/influencer-filter/refresh-view')
    return response
  } catch (error) {
    console.error('刷新物化视图失败:', error)
    throw error
  }
}
