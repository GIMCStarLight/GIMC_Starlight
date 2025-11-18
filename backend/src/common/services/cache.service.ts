import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { REDIS_KEYS, REDIS_TTL } from '../../config/redis.config';
import { PerformanceMetricsService } from '../monitoring/performance-metrics.service';

/**
 * 缓存数据类型
 */
export interface CacheOptions {
  ttl?: number; // 过期时间（秒）
  prefix?: string; // 键前缀
}

/**
 * 通用缓存服务
 * 提供Redis缓存的统一接口
 */
@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);

  constructor(
    @InjectRedis() private readonly redis: Redis,
    @Optional() private readonly performanceMetricsService?: PerformanceMetricsService,
  ) {}

  /**
   * 设置缓存
   * @param key 缓存键
   * @param value 缓存值
   * @param options 缓存选项
   */
  async set<T>(
    key: string,
    value: T,
    options: CacheOptions = {},
  ): Promise<void> {
    try {
      const { ttl = REDIS_TTL.DEFAULT, prefix = '' } = options;
      const fullKey = prefix ? `${prefix}${key}` : key;
      const serializedValue = JSON.stringify(value);

      if (ttl > 0) {
        await this.redis.setex(fullKey, ttl, serializedValue);
      } else {
        await this.redis.set(fullKey, serializedValue);
      }

      this.logger.debug(`缓存已设置: ${fullKey}, TTL: ${ttl}`);
    } catch (error) {
      this.logger.error(`设置缓存失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取缓存
   * @param key 缓存键
   * @param prefix 键前缀
   * @returns 缓存值
   */
  async get<T>(key: string, prefix: string = ''): Promise<T | null> {
    try {
      const fullKey = prefix ? `${prefix}${key}` : key;
      const value = await this.redis.get(fullKey);

      // 记录缓存命中/未命中
      if (this.performanceMetricsService) {
        await this.performanceMetricsService.recordCacheHit(fullKey, value !== null);
      }

      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.error(`获取缓存失败: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * 删除缓存
   * @param key 缓存键
   * @param prefix 键前缀
   */
  async del(key: string, prefix: string = ''): Promise<void> {
    try {
      const fullKey = prefix ? `${prefix}${key}` : key;
      await this.redis.del(fullKey);

      this.logger.debug(`缓存已删除: ${fullKey}`);
    } catch (error) {
      this.logger.error(`删除缓存失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 批量删除缓存
   * @param keys 缓存键数组
   * @param prefix 键前缀
   */
  async delMany(keys: string[], prefix: string = ''): Promise<void> {
    try {
      if (keys.length === 0) return;

      const fullKeys = keys.map((key) => (prefix ? `${prefix}${key}` : key));
      await this.redis.del(...fullKeys);

      this.logger.debug(`批量删除缓存: ${fullKeys.length} 个键`);
    } catch (error) {
      this.logger.error(`批量删除缓存失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 检查缓存是否存在
   * @param key 缓存键
   * @param prefix 键前缀
   * @returns 是否存在
   */
  async exists(key: string, prefix: string = ''): Promise<boolean> {
    try {
      const fullKey = prefix ? `${prefix}${key}` : key;
      const exists = await this.redis.exists(fullKey);
      return exists === 1;
    } catch (error) {
      this.logger.error(`检查缓存存在性失败: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * 设置缓存过期时间
   * @param key 缓存键
   * @param ttl 过期时间（秒）
   * @param prefix 键前缀
   */
  async expire(key: string, ttl: number, prefix: string = ''): Promise<void> {
    try {
      const fullKey = prefix ? `${prefix}${key}` : key;
      await this.redis.expire(fullKey, ttl);

      this.logger.debug(`设置缓存过期时间: ${fullKey}, TTL: ${ttl}`);
    } catch (error) {
      this.logger.error(`设置缓存过期时间失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 获取缓存剩余过期时间
   * @param key 缓存键
   * @param prefix 键前缀
   * @returns 剩余时间（秒），-1表示永不过期，-2表示不存在
   */
  async ttl(key: string, prefix: string = ''): Promise<number> {
    try {
      const fullKey = prefix ? `${prefix}${key}` : key;
      return await this.redis.ttl(fullKey);
    } catch (error) {
      this.logger.error(`获取缓存TTL失败: ${error.message}`, error.stack);
      return -2;
    }
  }

  /**
   * 模糊匹配删除缓存
   * @param pattern 匹配模式
   */
  async delByPattern(pattern: string): Promise<number> {
    try {
      const keys = await this.redis.keys(pattern);

      if (keys.length === 0) {
        return 0;
      }

      await this.redis.del(...keys);

      this.logger.debug(`模糊删除缓存: ${keys.length} 个键`);
      return keys.length;
    } catch (error) {
      this.logger.error(`模糊删除缓存失败: ${error.message}`, error.stack);
      return 0;
    }
  }

  /**
   * 获取或设置缓存（缓存穿透保护 + Redis降级）
   * @param key 缓存键
   * @param factory 数据工厂函数
   * @param options 缓存选项
   * @returns 缓存值
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {},
  ): Promise<T> {
    const { prefix = '' } = options;

    try {
      // 先尝试从缓存获取
      const cached = await this.get<T>(key, prefix);
      if (cached !== null) {
        return cached;
      }
    } catch (error) {
      // Redis故障，记录警告但不抛异常
      this.logger.warn(`Redis缓存获取失败，降级到直接查询: ${(error as Error).message}`);
    }

    // 缓存未命中或Redis故障，调用工厂函数获取数据
    const data = await factory();

    // 尝试将数据存入缓存（Redis故障时不影响业务）
    try {
      await this.set(key, data, options);
    } catch (error) {
      this.logger.warn(`Redis缓存写入失败，但不影响业务: ${(error as Error).message}`);
    }

    return data;
  }

  /**
   * 获取或设置缓存 - 带穿透防护（空值缓存）
   * @param key 缓存键
   * @param factory 数据工厂函数
   * @param options 缓存选项
   * @returns 缓存值
   */
  async getOrSetWithNullCache<T>(
    key: string,
    factory: () => Promise<T | null>,
    options: CacheOptions = {},
  ): Promise<T | null> {
    try {
      const { prefix = '', ttl = REDIS_TTL.DEFAULT } = options;
      const fullKey = prefix ? `${prefix}${key}` : key;

      // 检查缓存
      const cached = await this.redis.get(fullKey);

      if (cached !== null) {
        // 如果是空值标记，返回null
        if (cached === 'NULL_VALUE') {
          return null;
        }
        return JSON.parse(cached) as T;
      }

      // 调用工厂函数
      const data = await factory();

      if (data === null) {
        // 空值缓存，设置较短的TTL（5分钟）
        await this.redis.setex(fullKey, 300, 'NULL_VALUE');
      } else {
        // 正常缓存
        await this.redis.setex(fullKey, ttl, JSON.stringify(data));
      }

      return data;
    } catch (error) {
      this.logger.error(`缓存穿透防护失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取或设置缓存 - 带击穿防护（互斥锁）
   * @param key 缓存键
   * @param factory 数据工厂函数
   * @param options 缓存选项
   * @returns 缓存值
   */
  async getOrSetWithLock<T>(
    key: string,
    factory: () => Promise<T>,
    options: CacheOptions = {},
  ): Promise<T> {
    try {
      const { prefix = '', ttl = REDIS_TTL.DEFAULT } = options;
      const fullKey = prefix ? `${prefix}${key}` : key;
      const lockKey = `lock:${fullKey}`;

      // 检查缓存
      const cached = await this.redis.get(fullKey);
      if (cached !== null && cached !== 'NULL_VALUE') {
        return JSON.parse(cached) as T;
      }

      // 尝试获取锁（5秒超时）
      const lockAcquired = await this.redis.set(lockKey, '1', 'EX', 5, 'NX');

      if (lockAcquired === 'OK') {
        try {
          // 获取锁成功，执行工厂函数
          const data = await factory();
          await this.redis.setex(fullKey, ttl, JSON.stringify(data));
          return data;
        } finally {
          // 释放锁
          await this.redis.del(lockKey);
        }
      } else {
        // 获取锁失败，等待100ms后重试
        await new Promise((resolve) => setTimeout(resolve, 100));

        // 重试获取缓存
        const retryCache = await this.redis.get(fullKey);
        if (retryCache && retryCache !== 'NULL_VALUE') {
          return JSON.parse(retryCache) as T;
        }

        // 仍无缓存，直接查询（降级处理）
        return await factory();
      }
    } catch (error) {
      this.logger.error(`缓存击穿防护失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 用户权限缓存相关方法
   */

  /**
   * 设置用户权限缓存
   * @param userId 用户ID
   * @param permissions 权限列表
   */
  async setUserPermissions(
    userId: string,
    permissions: string[],
  ): Promise<void> {
    await this.set(userId, permissions, {
      prefix: REDIS_KEYS.USER_PERMISSIONS,
      ttl: REDIS_TTL.USER_PERMISSIONS,
    });
  }

  /**
   * 获取用户权限缓存
   * @param userId 用户ID
   * @returns 权限列表
   */
  async getUserPermissions(userId: string): Promise<string[] | null> {
    return await this.get<string[]>(userId, REDIS_KEYS.USER_PERMISSIONS);
  }

  /**
   * 清除用户权限缓存
   * @param userId 用户ID
   */
  async clearUserPermissions(userId: string): Promise<void> {
    await this.del(userId, REDIS_KEYS.USER_PERMISSIONS);
  }

  /**
   * 搜索结果缓存相关方法
   */

  /**
   * 设置搜索结果缓存
   * @param query 搜索查询
   * @param results 搜索结果
   */
  async setSearchResults<T>(query: string, results: T): Promise<void> {
    const cacheKey = this.generateSearchCacheKey(query);
    await this.set(cacheKey, results, {
      prefix: REDIS_KEYS.SEARCH_CACHE,
      ttl: REDIS_TTL.SEARCH_CACHE,
    });
  }

  /**
   * 获取搜索结果缓存
   * @param query 搜索查询
   * @returns 搜索结果
   */
  async getSearchResults<T>(query: string): Promise<T | null> {
    const cacheKey = this.generateSearchCacheKey(query);
    return await this.get<T>(cacheKey, REDIS_KEYS.SEARCH_CACHE);
  }

  /**
   * 清除搜索结果缓存
   * @param query 搜索查询（可选，不传则清除所有）
   */
  async clearSearchResults(query?: string): Promise<void> {
    if (query) {
      const cacheKey = this.generateSearchCacheKey(query);
      await this.del(cacheKey, REDIS_KEYS.SEARCH_CACHE);
    } else {
      await this.delByPattern(`${REDIS_KEYS.SEARCH_CACHE}*`);
    }
  }

  /**
   * 用户档案缓存相关方法
   */

  /**
   * 设置用户档案缓存
   * @param userId 用户ID
   * @param profile 用户档案
   */
  async setUserProfile<T>(userId: string, profile: T): Promise<void> {
    await this.set(userId, profile, {
      prefix: REDIS_KEYS.USER_PROFILE,
      ttl: REDIS_TTL.USER_PROFILE,
    });
  }

  /**
   * 获取用户档案缓存
   * @param userId 用户ID
   * @returns 用户档案
   */
  async getUserProfile<T>(userId: string): Promise<T | null> {
    return await this.get<T>(userId, REDIS_KEYS.USER_PROFILE);
  }

  /**
   * 清除用户档案缓存
   * @param userId 用户ID
   */
  async clearUserProfile(userId: string): Promise<void> {
    await this.del(userId, REDIS_KEYS.USER_PROFILE);
  }

  /**
   * 清除用户所有相关缓存
   * @param userId 用户ID
   */
  async clearUserCache(userId: string): Promise<void> {
    await Promise.all([
      this.clearUserPermissions(userId),
      this.clearUserProfile(userId),
      // 清除用户会话缓存
      this.delByPattern(`${REDIS_KEYS.USER_SESSION}${userId}:*`),
    ]);

    this.logger.log(`已清除用户 ${userId} 的所有缓存`);
  }

  /**
   * 生成搜索缓存键
   * @param query 搜索查询
   * @returns 缓存键
   */
  private generateSearchCacheKey(query: string): string {
    // 对查询进行标准化处理
    const normalizedQuery = query.toLowerCase().trim();

    // 生成哈希值作为缓存键
    const crypto = require('crypto');
    return crypto.createHash('md5').update(normalizedQuery).digest('hex');
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats(): Promise<{
    totalKeys: number;
    keysByPrefix: Record<string, number>;
    memoryUsage: string;
  }> {
    try {
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : 'unknown';

      const allKeys = await this.redis.keys('*');
      const keysByPrefix: Record<string, number> = {};

      // 统计各前缀的键数量
      for (const key of allKeys) {
        const prefix = key.split(':')[0] + ':';
        keysByPrefix[prefix] = (keysByPrefix[prefix] || 0) + 1;
      }

      return {
        totalKeys: allKeys.length,
        keysByPrefix,
        memoryUsage,
      };
    } catch (error) {
      this.logger.error(`获取缓存统计失败: ${error.message}`, error.stack);
      return {
        totalKeys: 0,
        keysByPrefix: {},
        memoryUsage: 'unknown',
      };
    }
  }

  /**
   * 清理过期缓存（手动触发）
   */
  async cleanupExpiredCache(): Promise<number> {
    try {
      // Redis会自动清理过期键，这里主要用于统计
      const allKeys = await this.redis.keys('*');
      let expiredCount = 0;

      for (const key of allKeys) {
        const ttl = await this.redis.ttl(key);
        if (ttl === -2) {
          // 键不存在（已过期）
          expiredCount++;
        }
      }

      this.logger.log(`缓存清理完成，发现 ${expiredCount} 个过期键`);
      return expiredCount;
    } catch (error) {
      this.logger.error(`清理过期缓存失败: ${error.message}`, error.stack);
      return 0;
    }
  }

  /**
   * 获取有序集合的成员（按分数倒序）
   * @param key 键名
   * @param start 开始位置
   * @param stop 结束位置
   * @param withScores 是否包含分数
   */
  async zrevrange(
    key: string,
    start: number,
    stop: number,
    withScores: boolean = false,
  ): Promise<string[]> {
    try {
      if (withScores) {
        return await this.redis.zrevrange(key, start, stop, 'WITHSCORES');
      } else {
        return await this.redis.zrevrange(key, start, stop);
      }
    } catch (error) {
      this.logger.error(`获取有序集合失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 增加有序集合成员的分数
   * @param key 键名
   * @param increment 增量
   * @param member 成员
   */
  async zincrby(
    key: string,
    increment: number,
    member: string,
  ): Promise<string> {
    try {
      return await this.redis.zincrby(key, increment, member);
    } catch (error) {
      this.logger.error(`增加有序集合分数失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取有序集合的成员数量
   * @param key 键名
   */
  async zcard(key: string): Promise<number> {
    try {
      return await this.redis.zcard(key);
    } catch (error) {
      this.logger.error(
        `获取有序集合成员数量失败: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 按排名范围删除有序集合成员
   * @param key 键名
   * @param start 开始排名
   * @param stop 结束排名
   */
  async zremrangebyrank(
    key: string,
    start: number,
    stop: number,
  ): Promise<number> {
    try {
      return await this.redis.zremrangebyrank(key, start, stop);
    } catch (error) {
      this.logger.error(
        `按排名删除有序集合成员失败: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
