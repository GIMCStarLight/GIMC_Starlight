import { SetMetadata } from '@nestjs/common';

/**
 * 查询缓存配置
 */
export interface QueryCacheConfig {
  /** 缓存键前缀 */
  prefix?: string;
  /** 缓存TTL（秒） */
  ttl?: number;
  /** 是否启用空值缓存 */
  enableNullCache?: boolean;
  /** 是否启用击穿防护（互斥锁） */
  enableLock?: boolean;
  /** 缓存键生成函数 */
  keyGenerator?: (...args: any[]) => string;
}

export const QUERY_CACHE_KEY = 'query_cache';

/**
 * 查询缓存装饰器
 * @param config 缓存配置
 * @example
 * \@QueryCache({ prefix: 'user:', ttl: 300, enableNullCache: true })
 * async findById(id: string) { ... }
 */
export const QueryCache = (config: QueryCacheConfig = {}) =>
  SetMetadata(QUERY_CACHE_KEY, config);

/**
 * 数据库查询优化装饰器
 * 标记需要使用从库查询的方法
 */
export const UseReplica = () => SetMetadata('use_replica', true);

/**
 * 慢查询警告装饰器
 * @param threshold 阈值（毫秒），超过此值记录警告
 */
export const SlowQueryWarning = (threshold: number = 1000) =>
  SetMetadata('slow_query_threshold', threshold);
