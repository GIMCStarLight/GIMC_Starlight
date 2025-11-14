import { describe, expect, it, beforeEach, vi } from 'vitest'
import { InfluencerNormalizer } from '../influencer-normalizer'
import type { RawInfluencer, Influencer } from '../../types/influencer'

describe('InfluencerNormalizer', () => {
  beforeEach(() => {
    // 清除缓存
    InfluencerNormalizer.clearCache()
  })

  describe('normalize', () => {
    it('应该正确归一化标准格式的数据', () => {
      const raw: RawInfluencer = {
        author_id: '123456',
        nick_name: '测试达人',
        avatar_uri: 'https://example.com/avatar.jpg',
        star_index: 85,
        follower_count: 100000,
        platform: 'douyin',
      }

      const result = InfluencerNormalizer.normalize(raw)

      expect(result.author_id).toBe('123456')
      expect(result.nick_name).toBe('测试达人')
      expect(result.avatar_uri).toBe('https://example.com/avatar.jpg')
      expect(result.star_index).toBe(85)
      expect(result.follower_count).toBe(100000)
      expect(result.platform).toBe('douyin')
    })

    it('应该处理驼峰命名格式的字段', () => {
      const raw: any = {
        authorId: '123456',
        nickName: '测试达人',
        avatarUri: 'https://example.com/avatar.jpg',
        starIndex: 85,
        follower: 100000,
        platform: 'douyin',
      }

      const result = InfluencerNormalizer.normalize(raw)

      expect(result.author_id).toBe('123456')
      expect(result.nick_name).toBe('测试达人')
      expect(result.avatar_uri).toBe('https://example.com/avatar.jpg')
      expect(result.star_index).toBe(85)
      expect(result.follower_count).toBe(100000)
    })

    it('应该处理canonical_name作为备用昵称', () => {
      const raw: any = {
        author_id: '123456',
        canonical_name: '备用昵称',
        platform: 'douyin',
      }

      const result = InfluencerNormalizer.normalize(raw)

      expect(result.nick_name).toBe('备用昵称')
    })

    it('应该处理avatar_url作为备用头像', () => {
      const raw: any = {
        author_id: '123456',
        nick_name: '测试',
        avatar_url: 'https://example.com/avatar2.jpg',
        platform: 'douyin',
      }

      const result = InfluencerNormalizer.normalize(raw)

      expect(result.avatar_uri).toBe('https://example.com/avatar2.jpg')
    })

    it('应该将字符串类型的数字转换为数值', () => {
      const raw: any = {
        author_id: '123456',
        nick_name: '测试',
        star_index: '85.5',
        follower_count: '100000',
        platform: 'douyin',
      }

      const result = InfluencerNormalizer.normalize(raw)

      expect(result.star_index).toBe(85.5)
      expect(result.follower_count).toBe(100000)
    })

    it('应该将无效的数字字符串转换为0', () => {
      const raw: any = {
        author_id: '123456',
        nick_name: '测试',
        star_index: 'invalid',
        follower_count: 'abc',
        platform: 'douyin',
      }

      const result = InfluencerNormalizer.normalize(raw)

      expect(result.star_index).toBe(0)
      expect(result.follower_count).toBe(0)
    })

    it('应该将null和undefined的数字字段转换为0', () => {
      const raw: any = {
        author_id: '123456',
        nick_name: '测试',
        star_index: null,
        follower_count: undefined,
        platform: 'douyin',
      }

      const result = InfluencerNormalizer.normalize(raw)

      expect(result.star_index).toBe(0)
      expect(result.follower_count).toBe(0)
    })

    it('应该初始化UI状态字段', () => {
      const raw: RawInfluencer = {
        author_id: '123456',
        nick_name: '测试',
        platform: 'douyin',
      }

      const result = InfluencerNormalizer.normalize(raw)

      expect(result.updating).toBe(false)
      expect(result.updateProgress).toBe(0)
      expect(result.updateStatus).toBe('')
      expect(result.isSelected).toBe(false)
    })

    it('应该保留已存在的UI状态字段', () => {
      const raw: any = {
        author_id: '123456',
        nick_name: '测试',
        platform: 'douyin',
        updating: true,
        updateProgress: 50,
        updateStatus: 'processing',
        isSelected: true,
      }

      const result = InfluencerNormalizer.normalize(raw)

      expect(result.updating).toBe(true)
      expect(result.updateProgress).toBe(50)
      expect(result.updateStatus).toBe('processing')
      expect(result.isSelected).toBe(true)
    })

    it('应该保留所有额外字段', () => {
      const raw: any = {
        author_id: '123456',
        nick_name: '测试',
        platform: 'douyin',
        customField1: 'value1',
        customField2: 123,
        customField3: { nested: 'object' },
      }

      const result = InfluencerNormalizer.normalize(raw)

      expect(result.customField1).toBe('value1')
      expect(result.customField2).toBe(123)
      expect(result.customField3).toEqual({ nested: 'object' })
    })

    it('应该使用WeakMap缓存归一化结果', () => {
      const raw: RawInfluencer = {
        author_id: '123456',
        nick_name: '测试',
        platform: 'douyin',
      }

      const result1 = InfluencerNormalizer.normalize(raw)
      const result2 = InfluencerNormalizer.normalize(raw)

      expect(result1).toBe(result2) // 应该是同一个对象引用
    })

    it('应该处理空字符串', () => {
      const raw: any = {
        author_id: '',
        nick_name: '',
        avatar_uri: '',
        platform: '',
      }

      const result = InfluencerNormalizer.normalize(raw)

      expect(result.author_id).toBe('')
      expect(result.nick_name).toBe('')
      expect(result.avatar_uri).toBe('')
      expect(result.platform).toBe('')
    })

    it('应该处理完全缺失的字段', () => {
      const raw: any = {
        someOtherField: 'value',
      }

      const result = InfluencerNormalizer.normalize(raw)

      expect(result.author_id).toBe('')
      expect(result.nick_name).toBe('')
      expect(result.avatar_uri).toBe('')
      expect(result.star_index).toBe(0)
      expect(result.follower_count).toBe(0)
      expect(result.platform).toBe('')
    })
  })

  describe('normalizeBatch', () => {
    it('应该正确归一化数组数据', () => {
      const rawList: RawInfluencer[] = [
        {
          author_id: '123',
          nick_name: '达人1',
          platform: 'douyin',
        },
        {
          author_id: '456',
          nick_name: '达人2',
          platform: 'xiaohongshu',
        },
      ]

      const results = InfluencerNormalizer.normalizeBatch(rawList)

      expect(results).toHaveLength(2)
      expect(results[0].author_id).toBe('123')
      expect(results[0].nick_name).toBe('达人1')
      expect(results[1].author_id).toBe('456')
      expect(results[1].nick_name).toBe('达人2')
    })

    it('应该处理空数组', () => {
      const results = InfluencerNormalizer.normalizeBatch([])

      expect(results).toEqual([])
    })

    it('应该处理非数组输入', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const results = InfluencerNormalizer.normalizeBatch(null as any)

      expect(results).toEqual([])
      expect(consoleSpy).toHaveBeenCalledWith('[InfluencerNormalizer] 输入不是数组:', null)
      
      consoleSpy.mockRestore()
    })

    it('应该对批量数据使用缓存', () => {
      const raw1: RawInfluencer = {
        author_id: '123',
        nick_name: '达人1',
        platform: 'douyin',
      }
      const raw2: RawInfluencer = {
        author_id: '456',
        nick_name: '达人2',
        platform: 'douyin',
      }

      const results1 = InfluencerNormalizer.normalizeBatch([raw1, raw2])
      const results2 = InfluencerNormalizer.normalizeBatch([raw1, raw2])

      expect(results1[0]).toBe(results2[0]) // 缓存命中
      expect(results1[1]).toBe(results2[1]) // 缓存命中
    })
  })

  describe('validate', () => {
    it('应该验证通过完整的必填字段', () => {
      const influencer: Influencer = {
        author_id: '123456',
        nick_name: '测试达人',
        avatar_uri: '',
        star_index: 0,
        follower_count: 0,
        platform: 'douyin',
      }

      const result = InfluencerNormalizer.validate(influencer)

      expect(result).toBe(true)
    })

    it('应该验证失败当缺少author_id', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const influencer: any = {
        author_id: '',
        nick_name: '测试达人',
        platform: 'douyin',
      }

      const result = InfluencerNormalizer.validate(influencer)

      expect(result).toBe(false)
      expect(consoleSpy).toHaveBeenCalled()
      
      consoleSpy.mockRestore()
    })

    it('应该验证失败当缺少nick_name', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const influencer: any = {
        author_id: '123456',
        nick_name: '',
        platform: 'douyin',
      }

      const result = InfluencerNormalizer.validate(influencer)

      expect(result).toBe(false)
      
      consoleSpy.mockRestore()
    })

    it('应该验证失败当缺少platform', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const influencer: any = {
        author_id: '123456',
        nick_name: '测试达人',
        platform: '',
      }

      const result = InfluencerNormalizer.validate(influencer)

      expect(result).toBe(false)
      
      consoleSpy.mockRestore()
    })

    it('应该验证失败当缺少多个必填字段', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const influencer: any = {
        author_id: '',
        nick_name: '',
        platform: '',
      }

      const result = InfluencerNormalizer.validate(influencer)

      expect(result).toBe(false)
      
      consoleSpy.mockRestore()
    })
  })

  describe('normalizeNumber (private method)', () => {
    // 通过normalize方法间接测试normalizeNumber
    it('应该正确处理各种数值输入', () => {
      const testCases = [
        { input: 123, expected: 123 },
        { input: '456', expected: 456 },
        { input: '78.9', expected: 78.9 },
        { input: null, expected: 0 },
        { input: undefined, expected: 0 },
        { input: 'invalid', expected: 0 },
        { input: '', expected: 0 },
        { input: 0, expected: 0 },
      ]

      testCases.forEach(({ input, expected }) => {
        const raw: any = {
          author_id: '123',
          nick_name: '测试',
          platform: 'douyin',
          star_index: input,
        }

        const result = InfluencerNormalizer.normalize(raw)

        expect(result.star_index).toBe(expected)
      })
    })
  })

  describe('clearCache', () => {
    it('应该输出清除缓存标记日志', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      InfluencerNormalizer.clearCache()

      expect(consoleSpy).toHaveBeenCalledWith('[InfluencerNormalizer] 缓存清除标记')
      
      consoleSpy.mockRestore()
    })
  })

  describe('字段优先级测试', () => {
    it('author_id应该优先于authorId和id', () => {
      const raw: any = {
        author_id: 'first',
        authorId: 'second',
        id: 'third',
        nick_name: '测试',
        platform: 'douyin',
      }

      const result = InfluencerNormalizer.normalize(raw)

      expect(result.author_id).toBe('first')
    })

    it('authorId应该优先于id', () => {
      const raw: any = {
        authorId: 'second',
        id: 'third',
        nick_name: '测试',
        platform: 'douyin',
      }

      const result = InfluencerNormalizer.normalize(raw)

      expect(result.author_id).toBe('second')
    })

    it('nick_name应该优先于nickName和canonical_name', () => {
      const raw: any = {
        author_id: '123',
        nick_name: 'first',
        nickName: 'second',
        canonical_name: 'third',
        platform: 'douyin',
      }

      const result = InfluencerNormalizer.normalize(raw)

      expect(result.nick_name).toBe('first')
    })

    it('avatar_uri应该优先于avatarUri和avatar_url', () => {
      const raw: any = {
        author_id: '123',
        nick_name: '测试',
        avatar_uri: 'first.jpg',
        avatarUri: 'second.jpg',
        avatar_url: 'third.jpg',
        platform: 'douyin',
      }

      const result = InfluencerNormalizer.normalize(raw)

      expect(result.avatar_uri).toBe('first.jpg')
    })
  })
})
