import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import {
  RATE_LIMIT_KEY,
  RateLimitTier,
  RATE_LIMIT_CONFIGS,
} from '../decorators/rate-limit.decorator';
import { ResponseUtil } from '../utils/response.util';

/**
 * 分级限流守卫
 * 基于Redis实现的分布式限流
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private reflector: Reflector,
    @InjectRedis() private redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 获取限流等级
    const tier =
      this.reflector.get<RateLimitTier>(RATE_LIMIT_KEY, context.getHandler()) ||
      RateLimitTier.NORMAL;

    // 无限制直接通过
    if (tier === RateLimitTier.UNLIMITED) {
      return true;
    }

    const config = RATE_LIMIT_CONFIGS[tier];
    if (!config) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // 生成限流键
    const ip = this.getClientIp(request);
    const userId = request.user?.id || 'anonymous';
    const path = request.route?.path || request.url;
    const key = `rate_limit:${tier}:${ip}:${userId}:${path}`;

    try {
      // 使用Redis原子操作
      const windowSeconds = Math.ceil(config.windowMs / 1000);
      const current = await this.redis.incr(key);

      // 第一次请求时设置过期时间
      if (current === 1) {
        await this.redis.expire(key, windowSeconds);
      }

      // 获取TTL
      const ttl = await this.redis.ttl(key);
      const resetTime = Date.now() + ttl * 1000;

      // 设置响应头
      response.setHeader('X-RateLimit-Limit', config.max);
      response.setHeader(
        'X-RateLimit-Remaining',
        Math.max(0, config.max - current),
      );
      response.setHeader('X-RateLimit-Reset', resetTime);
      response.setHeader('X-RateLimit-Tier', tier);

      // 检查是否超限
      if (current > config.max) {
        this.logger.warn(
          `Rate limit exceeded for ${ip} on ${path} (tier: ${tier}, count: ${current}/${config.max})`,
        );

        throw new HttpException(
          ResponseUtil.tooManyRequests(config.message),
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      // Redis错误时记录日志但不阻止请求
      this.logger.error(
        `Rate limit check failed: ${error.message}`,
        error.stack,
      );
      return true;
    }
  }

  /**
   * 获取客户端IP
   */
  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  }
}
