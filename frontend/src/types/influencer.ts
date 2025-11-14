/**
 * 达人广场相关类型定义
 * 扩展自基础Author类型,添加UI状态和业务字段
 */
import type { AuthorDetail } from './author'

/**
 * 原始API响应数据(兼容多种命名格式)
 */
export interface RawInfluencer {
  author_id?: string
  authorId?: string
  id?: string
  nick_name?: string
  nickName?: string
  canonical_name?: string
  star_index?: string | number
  starIndex?: string | number
  avatar_uri?: string
  avatarUri?: string
  avatar_url?: string
  follower?: number
  follower_count?: number
  platform?: string
  [key: string]: any
}

/**
 * 标准化后的达人数据(用于UI展示)
 */
export interface Influencer {
  // 核心字段(保证存在)
  author_id: string
  nick_name: string
  avatar_uri: string
  star_index: number
  follower_count: number
  platform: string

  // UI状态字段
  updating?: boolean
  updateProgress?: number
  updateStatus?: string
  isSelected?: boolean

  // 业务扩展字段
  is_matched?: boolean
  org_name?: string
  rebate_policy?: string
  rebate_range?: string
  policy_level?: number
  rebate_period?: string
  pay_period?: string

  // 其他字段(索引签名)
  [key: string]: any
}

/**
 * 达人筛选参数(扩展自API筛选参数)
 */
export interface InfluencerFilterParams {
  // 平台筛选
  platform?: string

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

  // 内容标签
  primaryTags?: string[]

  // 质量分级
  qualityTier?: 'premium' | 'high' | 'medium' | 'low'
  growthLevel?: 'explosive' | 'high' | 'medium' | 'low' | 'stagnant'

  // 价格档位
  priceTier?: 'low' | 'medium' | 'high' | 'premium'
  influencerTier?: 'mega' | 'macro' | 'mid' | 'micro' | 'nano'

  // 认证标签
  excellentAuthor?: boolean
  blackHorse?: boolean
  risingStart?: boolean
  highPotential?: boolean

  // 匹配相关
  matchedOnly?: boolean
  matchStatus?: 'PENDING' | 'MATCHED' | 'UNMATCHED' | 'REJECTED' | 'NO_MATCH' | 'FAILED'

  // 分页排序
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

/**
 * 分页响应
 */
export interface PaginationResponse {
  page: number
  limit: number
  total: number
  totalPages: number
}

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  totalTime: number
  dataTime: number
  countTime: number
}

/**
 * API标准响应
 */
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
  pagination?: PaginationResponse
  performance?: PerformanceMetrics
  fromCache?: boolean
}

/**
 * 达人列表API响应
 */
export interface InfluencerListResponse {
  data: Influencer[]
  pagination: PaginationResponse
  performance?: PerformanceMetrics
  fromCache?: boolean
}

/**
 * 视图模式
 */
export type ViewMode = 'card' | 'table'

/**
 * 卡片尺寸
 */
export type CardSize = 'compact' | 'standard' | 'detailed'

/**
 * 排序选项
 */
export type SortOption = 
  | 'recommended'
  | 'follower_desc'
  | 'star_index_desc'
  | 'interact_rate_desc'
  | 'price_asc'
  | 'price_desc'
