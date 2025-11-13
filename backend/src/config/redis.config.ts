import { CacheModuleOptions } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';
import { RedisOptions } from 'ioredis';

/**
 * Redis缓存配置
 */
export const getRedisConfig = (
  configService: ConfigService,
): CacheModuleOptions => ({
  store: redisStore,
  host: configService.get<string>('REDIS_HOST', 'localhost'),
  port: configService.get<number>('REDIS_PORT', 6379),
  password: configService.get<string>('REDIS_PASSWORD') || undefined,
  db: configService.get<number>('REDIS_DB', 0),
  ttl: configService.get<number>('REDIS_TTL', 3600),
  max: configService.get<number>('CACHE_MAX', 100),
  retryAttempts: 3,
  retryDelay: 1000,
  lazyConnect: true,
  keepAlive: 30000,
  family: 4,
  keyPrefix: 'gimcstar:',
});

/**
 * Redis客户端配置（用于直接操作Redis）
 */
export const getRedisClientConfig = (
  configService: ConfigService,
): RedisOptions => ({
  host: configService.get<string>('REDIS_HOST', 'localhost'),
  port: configService.get<number>('REDIS_PORT', 6379),
  password: configService.get<string>('REDIS_PASSWORD') || undefined,
  db: configService.get<number>('REDIS_DB', 0),

  enableReadyCheck: false,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  family: 4,
  keyPrefix: 'gimcstar:',
  connectTimeout: 10000,
  commandTimeout: 5000,
});

/**
 * Redis缓存键前缀常量
 */
export const REDIS_KEYS = {
  USER_SESSION: 'user:session:',
  USER_PROFILE: 'user:profile:',
  USER_PERMISSIONS: 'user:permissions:',
  EXPERT_CACHE: 'expert:cache:',
  SEARCH_RESULT: 'search:result:',
  SEARCH_CACHE: 'search:cache:',
  RECOMMENDATION: 'recommendation:',
  RATE_LIMIT: 'rate:limit:',
  VERIFICATION_CODE: 'verify:code:',
  JWT_BLACKLIST: 'jwt:blacklist:',
} as const;

/**
 * Redis缓存TTL常量（秒）
 */
export const REDIS_TTL = {
  DEFAULT: 3600, // 1小时（默认）
  SHORT: 300, // 5分钟
  MEDIUM: 1800, // 30分钟
  LONG: 3600, // 1小时
  VERY_LONG: 86400, // 24小时
  SESSION: 604800, // 7天
  USER_PERMISSIONS: 3600, // 1小时
  USER_PROFILE: 1800, // 30分钟
  SEARCH_CACHE: 1800, // 30分钟
} as const;

/**
 * Redis配置验证
 */
export const validateRedisConfig = (configService: ConfigService): void => {
  const host = configService.get<string>('REDIS_HOST');
  const port = configService.get<number>('REDIS_PORT');

  if (!host) {
    throw new Error('REDIS_HOST is required');
  }

  if (!port || port < 1 || port > 65535) {
    throw new Error('REDIS_PORT must be a valid port number');
  }
};

/**
 * Redis连接状态检查
 */
export interface RedisHealthIndicator {
  isHealthy(): Promise<boolean>;
  getConnectionInfo(): Promise<{
    status: 'connected' | 'disconnected' | 'error';
    host: string;
    port: number;
    db: number;
    uptime?: number;
  }>;
}
