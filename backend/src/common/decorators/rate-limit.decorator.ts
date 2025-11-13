import { SetMetadata } from '@nestjs/common';

/**
 * 限流等级枚举
 */
export enum RateLimitTier {
  /** 严格限流 - 5次/分钟 (登录、支付等敏感操作) */
  STRICT = 'STRICT',
  /** 普通限流 - 60次/分钟 (常规API) */
  NORMAL = 'NORMAL',
  /** 宽松限流 - 300次/分钟 (查询接口) */
  RELAXED = 'RELAXED',
  /** 无限制 (健康检查、公开接口) */
  UNLIMITED = 'UNLIMITED',
}

/**
 * 限流配置常量
 */
export const RATE_LIMIT_CONFIGS = {
  [RateLimitTier.STRICT]: {
    windowMs: 60 * 1000, // 1分钟
    max: 5,
    message: '操作过于频繁，请稍后再试',
  },
  [RateLimitTier.NORMAL]: {
    windowMs: 60 * 1000,
    max: 60,
    message: '请求过于频繁，请稍后再试',
  },
  [RateLimitTier.RELAXED]: {
    windowMs: 60 * 1000,
    max: 300,
    message: '请求过于频繁，请稍后再试',
  },
  [RateLimitTier.UNLIMITED]: null,
};

export const RATE_LIMIT_KEY = 'rate_limit_tier';

/**
 * 限流装饰器
 * @param tier 限流等级
 * @example
 * \@RateLimit(RateLimitTier.STRICT)
 * \@Post('login')
 * async login() {}
 */
export const RateLimit = (tier: RateLimitTier) =>
  SetMetadata(RATE_LIMIT_KEY, tier);

/**
 * 公开接口装饰器（无限流）
 */
export const Public = () => RateLimit(RateLimitTier.UNLIMITED);
