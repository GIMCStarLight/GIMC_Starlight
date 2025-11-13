import { requestClient } from './request'

export interface CreateKolReviewDto {
  authorId: string
  reviewer: string
  score: number
  content: string
  reviewTags?: string[]
}

export interface KolReviewInfo {
  id: number
  authorId: string
  reviewer: string
  score: number
  content: string
  reviewType?: string
  reviewTags?: string[]
  status?: string
  createdAt: string
  updatedAt: string
  // 达人信息
  influencerAuthorId?: string
  influencerNickName?: string
  influencerAvatarUri?: string
  influencerAuthorType?: string
  influencerFollower?: number
  influencerGrade?: string
  influencerGender?: number
  influencerCity?: string
  influencerProvince?: string
}

export interface KolReviewListResult {
  data: KolReviewInfo[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ReviewStatistics {
  totalReviews: number
  totalInfluencers: number
  averageScore: string | number
  todayReviews: number
  scoreDistribution: { score: number; count: number }[]
}

// 创建达人评价
export async function createKolReviewApi(data: CreateKolReviewDto) {
  return requestClient.post<KolReviewInfo>('v2/kol-reviews', data)
}

// 更新达人评价
export async function updateKolReviewApi(id: number, data: Partial<CreateKolReviewDto>) {
  return requestClient.patch<KolReviewInfo>(`v2/kol-reviews/${id}`, data)
}

// 获取达人评价列表（带分页和筛选）
export async function getKolReviewsApi(params?: any) {
  return requestClient.get<KolReviewListResult>('v2/kol-reviews', { params })
}

// 获取单条评价详情
export async function getKolReviewDetailApi(id: number) {
  return requestClient.get<KolReviewInfo>(`v2/kol-reviews/${id}`)
}

// 获取统计数据
export async function getReviewStatisticsApi() {
  return requestClient.get<ReviewStatistics>('v2/kol-reviews/statistics')
}

// 根据authorId获取达人评价
export async function getKolReviewsByAuthorIdApi(authorId: string) {
  return requestClient.get<KolReviewInfo[]>(`v2/kol-reviews/author/${authorId}`)
}

// 删除评价
export async function deleteKolReviewApi(id: number) {
  return requestClient.delete(`v2/kol-reviews/${id}`)
}

// 审核评价
export async function auditKolReviewApi(id: number, data: {
  status: 'approved' | 'rejected'
  auditor: string
  comment?: string
}) {
  return requestClient.post(`v2/kol-reviews/${id}/audit`, data)
}

// 批量删除
export async function batchDeleteKolReviewsApi(data: {
  ids: number[]
  deletedBy?: string
}) {
  return requestClient.post('v2/kol-reviews/batch/delete', data)
}

// 批量审核
export async function batchAuditKolReviewsApi(data: {
  ids: number[]
  status: 'approved' | 'rejected'
  auditor: string
  comment?: string
}) {
  return requestClient.post('v2/kol-reviews/batch/audit', data)
}
