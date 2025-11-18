import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import type Redis from 'ioredis';

/**
 * 性能指标服务
 * 负责收集和统计系统性能数据
 */
@Injectable()
export class PerformanceMetricsService {
  private readonly logger = new Logger(PerformanceMetricsService.name);
  private readonly METRICS_PREFIX = 'metrics:';
  private readonly TTL = 86400 * 7; // 7天

  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * 记录API响应时间
   */
  async recordApiResponseTime(
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number,
  ): Promise<void> {
    try {
      const key = `${this.METRICS_PREFIX}api:${method}:${endpoint}`;
      const timestamp = Date.now();

      // 使用Sorted Set存储，score为时间戳
      await this.redis.zadd(key, timestamp, JSON.stringify({
        responseTime,
        statusCode,
        timestamp,
      }));

      // 设置过期时间
      await this.redis.expire(key, this.TTL);

      // 更新统计计数器
      const statsKey = `${this.METRICS_PREFIX}stats:${method}:${endpoint}`;
      await this.redis.hincrby(statsKey, 'total', 1);
      await this.redis.hincrbyfloat(statsKey, 'totalTime', responseTime);
      
      // 记录状态码分布
      await this.redis.hincrby(statsKey, `status:${statusCode}`, 1);
      
      await this.redis.expire(statsKey, this.TTL);
    } catch (error) {
      this.logger.error('记录API响应时间失败', error);
    }
  }

  /**
   * 记录缓存命中/未命中
   */
  async recordCacheHit(cacheKey: string, hit: boolean): Promise<void> {
    try {
      const statsKey = `${this.METRICS_PREFIX}cache:stats`;
      const field = hit ? 'hits' : 'misses';
      
      await this.redis.hincrby(statsKey, field, 1);
      await this.redis.expire(statsKey, this.TTL);

      // 记录具体缓存键的统计
      const keyStatsKey = `${this.METRICS_PREFIX}cache:key:${cacheKey}`;
      await this.redis.hincrby(keyStatsKey, field, 1);
      await this.redis.expire(keyStatsKey, this.TTL);
    } catch (error) {
      this.logger.error('记录缓存统计失败', error);
    }
  }

  /**
   * 记录数据库查询时间
   */
  async recordDatabaseQuery(
    queryType: string,
    tableName: string,
    queryTime: number,
  ): Promise<void> {
    try {
      const key = `${this.METRICS_PREFIX}db:${queryType}:${tableName}`;
      const timestamp = Date.now();

      await this.redis.zadd(key, timestamp, JSON.stringify({
        queryTime,
        timestamp,
      }));

      await this.redis.expire(key, this.TTL);

      // 更新统计
      const statsKey = `${this.METRICS_PREFIX}db:stats:${queryType}:${tableName}`;
      await this.redis.hincrby(statsKey, 'count', 1);
      await this.redis.hincrbyfloat(statsKey, 'totalTime', queryTime);
      await this.redis.expire(statsKey, this.TTL);
    } catch (error) {
      this.logger.error('记录数据库查询统计失败', error);
    }
  }

  /**
   * 获取API性能统计
   */
  async getApiStats(endpoint?: string, method?: string): Promise<any> {
    try {
      let pattern: string;
      if (endpoint && method) {
        pattern = `${this.METRICS_PREFIX}stats:${method}:${endpoint}`;
      } else if (method) {
        pattern = `${this.METRICS_PREFIX}stats:${method}:*`;
      } else {
        pattern = `${this.METRICS_PREFIX}stats:*`;
      }

      const keys = await this.redis.keys(pattern);
      const stats: any[] = [];

      for (const key of keys) {
        const data = await this.redis.hgetall(key);
        const total = parseInt(data.total || '0');
        const totalTime = parseFloat(data.totalTime || '0');

        if (total > 0) {
          stats.push({
            endpoint: key.replace(`${this.METRICS_PREFIX}stats:`, ''),
            total,
            avgResponseTime: totalTime / total,
            statusCodes: Object.keys(data)
              .filter(k => k.startsWith('status:'))
              .reduce((acc, k) => {
                acc[k.replace('status:', '')] = parseInt(data[k]);
                return acc;
              }, {} as Record<string, number>),
          });
        }
      }

      return stats;
    } catch (error) {
      this.logger.error('获取API统计失败', error);
      return [];
    }
  }

  /**
   * 获取缓存命中率统计
   */
  async getCacheStats(): Promise<{
    hits: number;
    misses: number;
    hitRate: number;
    total: number;
  }> {
    try {
      const statsKey = `${this.METRICS_PREFIX}cache:stats`;
      const data = await this.redis.hgetall(statsKey);

      const hits = parseInt(data.hits || '0');
      const misses = parseInt(data.misses || '0');
      const total = hits + misses;
      const hitRate = total > 0 ? (hits / total) * 100 : 0;

      return {
        hits,
        misses,
        hitRate,
        total,
      };
    } catch (error) {
      this.logger.error('获取缓存统计失败', error);
      return { hits: 0, misses: 0, hitRate: 0, total: 0 };
    }
  }

  /**
   * 获取数据库查询性能统计
   */
  async getDatabaseStats(): Promise<any[]> {
    try {
      const pattern = `${this.METRICS_PREFIX}db:stats:*`;
      const keys = await this.redis.keys(pattern);
      const stats: any[] = [];

      for (const key of keys) {
        const data = await this.redis.hgetall(key);
        const count = parseInt(data.count || '0');
        const totalTime = parseFloat(data.totalTime || '0');

        if (count > 0) {
          const [, , queryType, tableName] = key.split(':');
          stats.push({
            queryType,
            tableName,
            count,
            avgQueryTime: totalTime / count,
            totalTime,
          });
        }
      }

      return stats.sort((a, b) => b.avgQueryTime - a.avgQueryTime);
    } catch (error) {
      this.logger.error('获取数据库统计失败', error);
      return [];
    }
  }

  /**
   * 清除所有性能指标数据
   */
  async clearMetrics(): Promise<void> {
    try {
      const keys = await this.redis.keys(`${this.METRICS_PREFIX}*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      this.logger.log(`清除了 ${keys.length} 个性能指标`);
    } catch (error) {
      this.logger.error('清除性能指标失败', error);
    }
  }
}
