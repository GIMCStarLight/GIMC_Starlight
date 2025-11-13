/**
 * 达人数据类型定义 - 基于新的15表结构
 */

// 核心信息
export interface AuthorCore {
  author_id: string
  star_id: string
  core_user_id: number
  nick_name: string
  avatar_uri: string
  gender: number
  city: string
  province: string
  author_type: number
  author_status: number
  grade: number
  follower: number
  star_index: number
  star_excellent_author: boolean
  is_black_horse_author: boolean
  is_cocreate_author: boolean
  is_cpm_project_author: boolean
  is_short_drama: boolean
  is_ad_star_cur_high_quality_author: boolean
  star_qianchuan_high_potential: boolean
  created_at: string
  updated_at: string
  last_crawled_at: string
}

// 粉丝指标
export interface AuthorFansMetrics {
  author_id: string
  fans_growth_rate_7d: number
  fans_growth_rate_30d: number
  fans_growth_level: number
  fans_growth_level_7d: number
  fans_growth_level_30d: number
}

// 互动指标
export interface AuthorEngagementMetrics {
  author_id: string
  interact_rate_within_7d: number
  interact_rate_within_30d: number
  vv_median_7d: number
  vv_median_30d: number
  play_over_rate_7d: number
  play_over_rate_30d: number
}

// 价格报价
export interface AuthorPricing {
  author_id: string
  price_1_20: number
  price_21_60: number
  price_61_plus: number
  expected_play_volume_1_20: number
  expected_play_volume_21_60: number
  expected_play_volume_61_plus: number
}

// 营销指数
export interface AuthorMarketingIndices {
  author_id: string
  link_conversion_index: number
  shopping_index: number
  spread_index: number
  star_index: number
}

// 内容标签
export interface AuthorContentTags {
  author_id: string
  primary_tags: string[]
  theme_tags: string[]
  word_relation: Record<string, any>
}

// 电商数据
export interface AuthorEcommerce {
  author_id: string
  e_commerce_enable: boolean
  e_commerce_gmv: number
  e_commerce_gmv_level: number
  e_commerce_live_gmv_level: number
  e_commerce_video_gmv_level: number
  e_commerce_goods_cnt: number
}

// 完整的达人数据（包含所有关联）
export interface AuthorDetail extends AuthorCore {
  fans_metrics?: AuthorFansMetrics
  engagement_metrics?: AuthorEngagementMetrics
  pricing?: AuthorPricing
  marketing_indices?: AuthorMarketingIndices
  content_tags?: AuthorContentTags
  ecommerce?: AuthorEcommerce
}

// 列表查询参数
export interface AuthorListParams {
  page?: number
  limit?: number
  keyword?: string
  minFollowers?: number
  maxFollowers?: number
  tags?: string[]
  province?: string
  city?: string
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

// 列表响应
export interface AuthorListResponse {
  data: AuthorDetail[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// 性别枚举
export enum Gender {
  Unknown = 0,
  Male = 1,
  Female = 2,
}

// 达人类型枚举
export enum AuthorType {
  Personal = 1,
  Organization = 3,
}

// 达人状态枚举
export enum AuthorStatus {
  Normal = 1,
  Disabled = 2,
}
