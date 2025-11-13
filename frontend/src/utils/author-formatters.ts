/**
 * 达人数据格式化工具函数
 */

import type { AuthorDetail } from '../types/author'

/**
 * 格式化粉丝数
 */
export function formatFollower(count: number | undefined): string {
  if (!count || count === 0) return '0'
  if (count >= 100000000) {
    return `${(count / 100000000).toFixed(2)}亿`
  }
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}万`
  }
  return count.toLocaleString()
}

/**
 * 格式化播放量中位数
 */
export function formatVvMedian(vv: number | undefined): string {
  if (!vv || vv === 0) return '-'
  if (vv >= 10000) {
    return `${(vv / 10000).toFixed(1)}万`
  }
  return vv.toLocaleString()
}

/**
 * 格式化互动率
 */
export function formatInteractRate(rate: number | undefined): string {
  if (!rate && rate !== 0) return '-'
  return `${(rate * 100).toFixed(2)}%`
}

/**
 * 格式化星图指数
 */
export function formatStarIndex(index: number | undefined): string {
  if (!index && index !== 0) return '-'
  return index.toFixed(2)
}

/**
 * 格式化价格
 */
export function formatPrice(price: number | undefined): string {
  if (!price || price === 0) return '-'
  if (price >= 10000) {
    return `¥${(price / 10000).toFixed(2)}万`
  }
  return `¥${price.toLocaleString()}`
}

/**
 * 格式化性别
 */
export function formatGender(gender: number | undefined): string {
  const genderMap: Record<number, string> = {
    0: '未知',
    1: '男',
    2: '女',
  }
  return genderMap[gender ?? 0] || '未知'
}

/**
 * 格式化达人类型
 */
export function formatAuthorType(type: number | undefined): string {
  const typeMap: Record<number, string> = {
    1: '个人',
    3: '机构',
  }
  return typeMap[type ?? 1] || '未知'
}

/**
 * 格式化电商能力
 */
export function formatEcommerce(enable: boolean | undefined): string {
  return enable ? '已开通' : '未开通'
}

/**
 * 格式化粉丝增长率
 */
export function formatGrowthRate(rate: number | undefined): string {
  if (!rate && rate !== 0) return '-'
  const sign = rate > 0 ? '+' : ''
  return `${sign}${(rate * 100).toFixed(2)}%`
}

/**
 * 格式化粉丝增长等级
 */
export function formatGrowthLevel(level: number | undefined): string {
  const levelMap: Record<number, { text: string; color: string }> = {
    1: { text: '低速', color: 'info' },
    2: { text: '中速', color: 'warning' },
    3: { text: '高速', color: 'success' },
    4: { text: '爆发', color: 'danger' },
  }
  return levelMap[level ?? 0]?.text || '-'
}

/**
 * 获取粉丝增长等级颜色
 */
export function getGrowthLevelColor(level: number | undefined): string {
  const levelMap: Record<number, string> = {
    1: 'info',
    2: 'warning',
    3: 'success',
    4: 'danger',
  }
  return levelMap[level ?? 0] || 'info'
}

/**
 * 格式化内容标签
 */
export function formatContentTags(tags: string[] | undefined): string {
  if (!tags || tags.length === 0) return '-'
  return tags.slice(0, 3).join(', ') + (tags.length > 3 ? '...' : '')
}

/**
 * 格式化日期时间
 */
export function formatDateTime(date: string | undefined): string {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * 格式化日期
 */
export function formatDate(date: string | undefined): string {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

/**
 * 计算性价比（CPM）
 */
export function calculateCPM(price: number | undefined, expectedVv: number | undefined): string {
  if (!price || !expectedVv || expectedVv === 0) return '-'
  const cpm = (price / expectedVv) * 1000
  return `¥${cpm.toFixed(2)}`
}

/**
 * 获取达人等级标签
 */
export function getAuthorGradeTag(grade: number | undefined): { text: string; type: string } {
  const gradeMap: Record<number, { text: string; type: string }> = {
    1: { text: 'S级', type: 'danger' },
    2: { text: 'A级', type: 'warning' },
    3: { text: 'B级', type: 'success' },
    4: { text: 'C级', type: 'info' },
  }
  return gradeMap[grade ?? 4] || { text: '未评级', type: '' }
}

/**
 * 获取达人特殊标签
 */
export function getAuthorSpecialTags(author: AuthorDetail): Array<{ text: string; type: string }> {
  const tags: Array<{ text: string; type: string }> = []
  
  if (author.star_excellent_author) {
    tags.push({ text: '优质作者', type: 'success' })
  }
  if (author.is_black_horse_author) {
    tags.push({ text: '黑马作者', type: 'warning' })
  }
  if (author.is_cocreate_author) {
    tags.push({ text: '共创作者', type: 'primary' })
  }
  if (author.is_cpm_project_author) {
    tags.push({ text: 'CPM项目', type: 'info' })
  }
  if (author.is_short_drama) {
    tags.push({ text: '短剧', type: 'danger' })
  }
  if (author.is_ad_star_cur_high_quality_author) {
    tags.push({ text: '高质量', type: 'success' })
  }
  if (author.star_qianchuan_high_potential) {
    tags.push({ text: '高潜力', type: 'warning' })
  }
  
  return tags
}

/**
 * 格式化GMV等级
 */
export function formatGMVLevel(level: number | undefined): string {
  const levelMap: Record<number, string> = {
    1: '低',
    2: '中',
    3: '高',
    4: '极高',
  }
  return levelMap[level ?? 0] || '-'
}

/**
 * 获取数据新鲜度标签
 */
export function getDataFreshnessTag(lastCrawledAt: string | undefined): { text: string; type: string } {
  if (!lastCrawledAt) {
    return { text: '未知', type: 'info' }
  }
  
  const now = new Date()
  const crawledDate = new Date(lastCrawledAt)
  const hoursDiff = (now.getTime() - crawledDate.getTime()) / (1000 * 60 * 60)
  
  if (hoursDiff < 24) {
    return { text: '最新', type: 'success' }
  } else if (hoursDiff < 72) {
    return { text: '较新', type: 'warning' }
  } else if (hoursDiff < 168) {
    return { text: '一周内', type: 'info' }
  } else {
    return { text: '较旧', type: 'danger' }
  }
}
