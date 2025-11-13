import {
  Injectable,
  NestMiddleware,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { ResponseUtil } from '../utils/response.util';

/**
 * 限流配置接口
 */
export interface RateLimitConfig {
  /** 时间窗口（秒） */
  windowMs: number;
  /** 最大请求次数 */
  max: number;
  /** 限流键前缀 */
  keyPrefix?: string;
  /** 跳过条件函数 */
  skip?: (req: Request) => boolean;
  /** 自定义键生成函数 */
  keyGenerator?: (req: Request) => string;
  /** 自定义错误消息 */
  message?: string;
  /** 限流算法类型 */
  algorithm?: 'fixed-window' | 'sliding-window' | 'token-bucket';
  /** 令牌桶算法配置 */
  tokenBucket?: {
    /** 令牌生成速率（每秒） */
    refillRate: number;
    /** 桶容量 */
    capacity: number;
  };
  /** 是否启用分布式锁 */
  enableDistributedLock?: boolean;
}

/**
 * 限流中间件
 * 基于Redis实现分布式限流
 */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly defaultConfig: RateLimitConfig = {
    windowMs: 60, // 1分钟
    max: 100, // 100次请求
    keyPrefix: 'rate_limit',
    message: '请求频率过高，请稍后重试',
  };

  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * 创建限流中间件
   */
  static create(config: Partial<RateLimitConfig> = {}) {
    return (req: Request, res: Response, next: NextFunction) => {
      const middleware = new RateLimitMiddleware(req.app.get('redis'));
      middleware.handleRequest(req, res, next, config);
    };
  }

  use(req: Request, res: Response, next: NextFunction): void {
    this.handleRequest(req, res, next, {});
  }

  /**
   * 处理请求限流
   */
  private async handleRequest(
    req: Request,
    res: Response,
    next: NextFunction,
    userConfig: Partial<RateLimitConfig>,
  ): Promise<void> {
    try {
      const config = { ...this.defaultConfig, ...userConfig };

      // 检查是否跳过限流
      if (config.skip && config.skip(req)) {
        return next();
      }

      // 生成限流键
      const key = this.generateKey(req, config);

      // 执行限流检查
      const result = await this.checkRateLimit(key, config);

      // 设置响应头
      this.setRateLimitHeaders(res, result, config);

      // 检查是否超出限制
      if (result.isExceeded) {
        const traceId = (req as any).traceId;
        const errorResponse = ResponseUtil.tooManyRequests(
          config.message || this.defaultConfig.message!,
          traceId,
        );

        res.status(HttpStatus.TOO_MANY_REQUESTS).json(errorResponse);
        return;
      }

      next();
    } catch (error) {
      // 限流服务异常时，允许请求通过，但记录错误
      console.error('Rate limit middleware error:', error);
      next();
    }
  }

  /**
   * 生成限流键
   */
  private generateKey(req: Request, config: RateLimitConfig): string {
    if (config.keyGenerator) {
      return `${config.keyPrefix}:${config.keyGenerator(req)}`;
    }

    // 默认使用IP地址
    const ip = this.getRealIp(req);
    const path = req.route?.path || req.path;
    const method = req.method;

    return `${config.keyPrefix}:${method}:${path}:${ip}`;
  }

  /**
   * 检查限流
   */
  private async checkRateLimit(
    key: string,
    config: RateLimitConfig,
  ): Promise<{
    current: number;
    remaining: number;
    resetTime: number;
    isExceeded: boolean;
  }> {
    const algorithm = config.algorithm || 'fixed-window';

    switch (algorithm) {
      case 'sliding-window':
        return await this.checkSlidingWindowRateLimit(key, config);
      case 'token-bucket':
        return await this.checkTokenBucketRateLimit(key, config);
      default:
        return await this.checkFixedWindowRateLimit(key, config);
    }
  }

  /**
   * 固定窗口限流
   */
  private async checkFixedWindowRateLimit(
    key: string,
    config: RateLimitConfig,
  ): Promise<{
    current: number;
    remaining: number;
    resetTime: number;
    isExceeded: boolean;
  }> {
    const now = Date.now();
    const windowStart =
      Math.floor(now / (config.windowMs * 1000)) * config.windowMs;
    const windowKey = `${key}:${windowStart}`;

    let current: number;

    if (config.enableDistributedLock) {
      // 使用分布式锁确保原子性
      const lockKey = `${windowKey}:lock`;
      const lockValue = `${Date.now()}-${Math.random()}`;

      const acquired = await this.redis.set(
        lockKey,
        lockValue,
        'PX',
        100,
        'NX',
      );

      if (acquired) {
        try {
          current = await this.redis.incr(windowKey);
          await this.redis.expire(windowKey, config.windowMs + 1);
        } finally {
          // 释放锁
          const script = `
            if redis.call('get', KEYS[1]) == ARGV[1] then
              return redis.call('del', KEYS[1])
            else
              return 0
            end
          `;
          await this.redis.eval(script, 1, lockKey, lockValue);
        }
      } else {
        // 获取锁失败，直接读取当前值
        current = await this.redis
          .get(windowKey)
          .then((val) => parseInt(val || '0'));
      }
    } else {
      // 使用Redis管道提高性能
      const pipeline = this.redis.pipeline();
      pipeline.incr(windowKey);
      pipeline.expire(windowKey, config.windowMs + 1);

      const results = await pipeline.exec();
      current = (results?.[0]?.[1] as number) || 0;
    }

    const remaining = Math.max(0, config.max - current);
    const resetTime = (windowStart + config.windowMs) * 1000;
    const isExceeded = current > config.max;

    return {
      current,
      remaining,
      resetTime,
      isExceeded,
    };
  }

  /**
   * 滑动窗口限流
   */
  private async checkSlidingWindowRateLimit(
    key: string,
    config: RateLimitConfig,
  ): Promise<{
    current: number;
    remaining: number;
    resetTime: number;
    isExceeded: boolean;
  }> {
    const now = Date.now();
    const windowStart = now - config.windowMs * 1000;
    const slidingKey = `${key}:sliding`;

    // 使用Lua脚本确保原子性
    const script = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local window = tonumber(ARGV[2])
      local limit = tonumber(ARGV[3])
      local windowStart = now - window
      
      -- 清理过期记录
      redis.call('ZREMRANGEBYSCORE', key, 0, windowStart)
      
      -- 获取当前窗口内的请求数
      local current = redis.call('ZCARD', key)
      
      if current < limit then
        -- 添加当前请求
        redis.call('ZADD', key, now, now .. '-' .. math.random())
        redis.call('EXPIRE', key, math.ceil(window / 1000) + 1)
        return {current + 1, limit - current - 1, 0}
      else
        return {current, 0, 1}
      end
    `;

    const result = (await this.redis.eval(
      script,
      1,
      slidingKey,
      now.toString(),
      (config.windowMs * 1000).toString(),
      config.max.toString(),
    )) as number[];

    const [current, remaining, exceeded] = result;
    const resetTime = now + config.windowMs * 1000;

    return {
      current,
      remaining,
      resetTime,
      isExceeded: exceeded === 1,
    };
  }

  /**
   * 令牌桶限流
   */
  private async checkTokenBucketRateLimit(
    key: string,
    config: RateLimitConfig,
  ): Promise<{
    current: number;
    remaining: number;
    resetTime: number;
    isExceeded: boolean;
  }> {
    const tokenConfig = config.tokenBucket || {
      refillRate: config.max / config.windowMs,
      capacity: config.max,
    };

    const bucketKey = `${key}:bucket`;
    const now = Date.now();

    // 使用Lua脚本实现令牌桶算法
    const script = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local capacity = tonumber(ARGV[2])
      local refillRate = tonumber(ARGV[3])
      
      local bucket = redis.call('HMGET', key, 'tokens', 'lastRefill')
      local tokens = tonumber(bucket[1]) or capacity
      local lastRefill = tonumber(bucket[2]) or now
      
      -- 计算需要添加的令牌数
      local timePassed = (now - lastRefill) / 1000
      local tokensToAdd = math.floor(timePassed * refillRate)
      tokens = math.min(capacity, tokens + tokensToAdd)
      
      if tokens >= 1 then
        tokens = tokens - 1
        redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', now)
        redis.call('EXPIRE', key, 3600) -- 1小时过期
        return {capacity - tokens, tokens, 0}
      else
        redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', now)
        redis.call('EXPIRE', key, 3600)
        return {capacity - tokens, tokens, 1}
      end
    `;

    const result = (await this.redis.eval(
      script,
      1,
      bucketKey,
      now.toString(),
      tokenConfig.capacity.toString(),
      tokenConfig.refillRate.toString(),
    )) as number[];

    const [current, remaining, exceeded] = result;
    const resetTime = now + 1000 / tokenConfig.refillRate; // 下一个令牌生成时间

    return {
      current,
      remaining,
      resetTime,
      isExceeded: exceeded === 1,
    };
  }

  /**
   * 设置限流响应头
   */
  private setRateLimitHeaders(
    res: Response,
    result: {
      current: number;
      remaining: number;
      resetTime: number;
      isExceeded: boolean;
    },
    config: RateLimitConfig,
  ): void {
    res.setHeader('X-RateLimit-Limit', config.max.toString());
    res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    res.setHeader(
      'X-RateLimit-Reset',
      Math.ceil(result.resetTime / 1000).toString(),
    );
    res.setHeader('X-RateLimit-Window', config.windowMs.toString());

    if (result.isExceeded) {
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
    }
  }

  /**
   * 获取真实IP地址
   */
  private getRealIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      (req.headers['x-client-ip'] as string) ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown'
    );
  }
}

/**
 * 预定义的限流配置
 */
export const RateLimitConfigs = {
  /** 严格限流：每分钟10次 */
  STRICT: {
    windowMs: 60,
    max: 10,
    message: '请求过于频繁，请稍后重试',
  },

  /** 普通限流：每分钟100次 */
  NORMAL: {
    windowMs: 60,
    max: 100,
    message: '请求频率过高，请稍后重试',
  },

  /** 宽松限流：每分钟500次 */
  LOOSE: {
    windowMs: 60,
    max: 500,
    message: '请求频率过高，请稍后重试',
  },

  /** 登录限流：每小时5次 */
  LOGIN: {
    windowMs: 3600, // 1小时
    max: 5,
    message: '登录尝试次数过多，请1小时后重试',
    keyGenerator: (req: Request) => {
      const ip = req.ip || 'unknown';
      const phone = req.body?.phone || 'unknown';
      return `login:${ip}:${phone}`;
    },
  },

  /** 验证码限流：每分钟1次，每小时5次 */
  SMS: {
    windowMs: 60, // 1分钟
    max: 1,
    message: '验证码发送过于频繁，请稍后重试',
    keyGenerator: (req: Request) => {
      const phone = req.body?.phone || req.query?.phone || 'unknown';
      return `sms:${phone}`;
    },
  },

  /** 搜索限流：每分钟200次 */
  SEARCH: {
    windowMs: 60,
    max: 200,
    message: '搜索请求过于频繁，请稍后重试',
  },

  /** 导出限流：每小时10次 */
  EXPORT: {
    windowMs: 3600, // 1小时
    max: 10,
    message: '导出请求过于频繁，请稍后重试',
  },
};
