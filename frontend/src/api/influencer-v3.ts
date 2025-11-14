/**
 * 达人广场V3 API接口
 */
import { requestClient, baseRequestClient } from './request'
import { requestDeduplicator } from '../utils/request-deduplicator'

export interface InfluencerListParams {
  page?: number
  pageSize?: number
  sortBy?: string
  
  // 快速筛选
  tier?: string
  specialTag?: string
  ecommerce?: string
  priceRange?: string
  province?: string
  
  // 高级筛选
  contentTags?: string[]
  followerMin?: number
  followerMax?: number
  interactRateMin?: number
  interactRateMax?: number
  starIndexMin?: number
  starIndexMax?: number
  gender?: number
  authorType?: number
  
  // 匹配相关
  matchedOnly?: boolean
}

export interface InfluencerListResponse {
  data: any[]
  total: number
  page: number
  pageSize: number
}

/**
 * 获取达人列表
 */
export async function getInfluencerListV3(params: InfluencerListParams): Promise<InfluencerListResponse> {
  return requestDeduplicator.deduplicate(
    {
      url: '/v2/influencers/v3/list',
      method: 'GET',
      params,
    },
    async () => {
      try {
        console.log('🚀 [API] 发起请求 getInfluencerListV3, params:', params)
        
        // 参数转换：将 camelCase 转为 snake_case
        const queryParams: any = { ...params }
        if (params.matchedOnly !== undefined) {
          queryParams.matchedOnly = params.matchedOnly
          console.log('🔗 [API] 启用已匹配筛选:', queryParams.matchedOnly)
        }
        
        // 使用 baseRequestClient 获取完整 AxiosResponse
        const axiosResponse = await baseRequestClient.get('/v2/influencers/v3/list', { params: queryParams })
        console.log('📦 [API] Axios原始响应:', axiosResponse)
        
        // 从 AxiosResponse 中提取 data
        const responseData = axiosResponse.data
        console.log('📦 [API] 响应数据:', responseData)
        
        // 后端返回结构: { code: 200, message: "...", data: [...], pagination: {...} }
        const finalResult: InfluencerListResponse = {
          data: responseData.data || [],
          total: responseData.total || 0,
          page: responseData.page || 1,
          pageSize: responseData.pageSize || 20,
        }
        
        console.log('✅ [API] 最终返回数据:', finalResult)
        console.log('✅ [API] 返回数据量:', finalResult.data.length, '条, 总数:', finalResult.total)
        
        return finalResult
      } catch (error) {
        console.error('❌ [API] 获取达人列表失败:', error)
        throw error
      }
    }
  )
}

/**
 * 获取达人统计数据
 */
export async function getInfluencerStats() {
  return requestDeduplicator.deduplicate(
    {
      url: '/influencers/v3/stats',
      method: 'GET',
    },
    async () => {
      try {
        const response = await requestClient.get('/influencers/v3/stats')
        // 后端返回: { code, message, data: { data: {...} } }
        const result = response.data || response
        return result.data || result
      } catch (error) {
        console.error('获取统计数据失败:', error)
        throw error
      }
    }
  )
}

/**
 * 获取达人详情
 */
export async function getInfluencerDetailV3(authorId: string) {
  return requestDeduplicator.deduplicate(
    {
      url: `/influencers/v3/detail/${authorId}`,
      method: 'GET',
    },
    async () => {
      try {
        const response = await requestClient.get(`/influencers/v3/detail/${authorId}`)
        const result = response.data || response
        return result.data || result
      } catch (error) {
        console.error('获取达人详情失败:', error)
        throw error
      }
    }
  )
}
