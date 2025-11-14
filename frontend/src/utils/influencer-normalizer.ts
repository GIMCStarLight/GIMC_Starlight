/**
 * 达人数据归一化工具
 * 统一处理API返回的多种数据格式,提高数据一致性
 */
import type { RawInfluencer, Influencer } from '../types/influencer'

/**
 * 达人数据归一化器
 * 使用WeakMap缓存避免重复归一化
 */
export class InfluencerNormalizer {
  private static cache = new WeakMap<RawInfluencer, Influencer>()

  /**
   * 归一化单个达人数据
   */
  static normalize(raw: RawInfluencer): Influencer {
    // 检查缓存
    if (this.cache.has(raw)) {
      return this.cache.get(raw)!
    }

    // 执行归一化
    const normalized: Influencer = {
      // 保留其他所有字段
      ...raw,

      // ID归一化 (优先级: author_id > authorId > id)
      author_id: raw.author_id || raw.authorId || raw.id || '',

      // 昵称归一化 (优先级: nick_name > nickName > canonical_name)
      nick_name: raw.nick_name || raw.nickName || raw.canonical_name || '',

      // 头像归一化 (优先级: avatar_uri > avatarUri > avatar_url)
      avatar_uri: raw.avatar_uri || raw.avatarUri || raw.avatar_url || '',

      // 星图指数归一化 (字符串转数字,null/undefined转0)
      star_index: this.normalizeNumber((raw.star_index ?? raw.starIndex) as any),

      // 粉丝数归一化
      follower_count: this.normalizeNumber((raw.follower ?? raw.follower_count) as any),

      // 平台
      platform: raw.platform || '',

      // UI状态初始化
      updating: raw.updating ?? false,
      updateProgress: raw.updateProgress ?? 0,
      updateStatus: raw.updateStatus ?? '',
      isSelected: raw.isSelected ?? false,
    }

    // 缓存结果
    this.cache.set(raw, normalized)

    return normalized
  }

  /**
   * 批量归一化
   */
  static normalizeBatch(items: RawInfluencer[]): Influencer[] {
    if (!Array.isArray(items)) {
      console.warn('[InfluencerNormalizer] 输入不是数组:', items)
      return []
    }

    return items.map((item) => this.normalize(item))
  }

  /**
   * 数值归一化辅助方法
   * 处理字符串、null、undefined等情况
   */
  private static normalizeNumber(value: any): number {
    if (value === null || value === undefined) return 0
    if (typeof value === 'string') {
      const num = Number(value)
      return isNaN(num) ? 0 : num
    }
    if (typeof value === 'number') return value
    return 0
  }

  /**
   * 清除缓存 (用于内存管理)
   */
  static clearCache(): void {
    // WeakMap会自动回收,这里仅做标记
    console.log('[InfluencerNormalizer] 缓存清除标记')
  }

  /**
   * 验证必填字段
   */
  static validate(influencer: Influencer): boolean {
    const requiredFields = ['author_id', 'nick_name', 'platform']
    const missing = requiredFields.filter((field) => !influencer[field as keyof Influencer])

    if (missing.length > 0) {
      console.warn('[InfluencerNormalizer] 缺少必填字段:', {
        author_id: influencer.author_id,
        missing,
      })
      return false
    }

    return true
  }
}
