import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../services/cache.service';
import {
  QUERY_CACHE_KEY,
  QueryCacheConfig,
} from '../decorators/query-cache.decorator';

/**
 * 查询缓存拦截器
 * 自动为标记了 @QueryCache 的方法提供缓存功能
 */
@Injectable()
export class QueryCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(QueryCacheInterceptor.name);

  constructor(
    private reflector: Reflector,
    private cacheService: CacheService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const config = this.reflector.get<QueryCacheConfig>(
      QUERY_CACHE_KEY,
      context.getHandler(),
    );

    if (!config) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const className = context.getClass().name;
    const methodName = handler.name;

    // 生成缓存键
    const cacheKey = this.generateCacheKey(
      className,
      methodName,
      request,
      config,
    );

    const startTime = Date.now();

    try {
      // 根据配置选择缓存策略
      if (config.enableLock) {
        // 使用互斥锁防击穿
        const result = await this.cacheService.getOrSetWithLock(
          cacheKey,
          async () => {
            const observable = next.handle();
            return await observable.toPromise();
          },
          { prefix: config.prefix, ttl: config.ttl },
        );
        return of(result);
      } else if (config.enableNullCache) {
        // 使用空值缓存防穿透
        const result = await this.cacheService.getOrSetWithNullCache(
          cacheKey,
          async () => {
            const observable = next.handle();
            return await observable.toPromise();
          },
          { prefix: config.prefix, ttl: config.ttl },
        );
        return of(result);
      } else {
        // 普通缓存
        const result = await this.cacheService.getOrSet(
          cacheKey,
          async () => {
            const observable = next.handle();
            return await observable.toPromise();
          },
          { prefix: config.prefix, ttl: config.ttl },
        );
        return of(result);
      }
    } catch (error) {
      this.logger.error(
        `Query cache error for ${className}.${methodName}: ${error.message}`,
      );
      // 缓存失败，降级到正常查询
      return next.handle();
    } finally {
      const duration = Date.now() - startTime;
      if (duration > 100) {
        this.logger.warn(
          `Query cache took ${duration}ms for ${className}.${methodName}`,
        );
      }
    }
  }

  private generateCacheKey(
    className: string,
    methodName: string,
    request: any,
    config: QueryCacheConfig,
  ): string {
    if (config.keyGenerator) {
      return config.keyGenerator(request.query, request.params, request.body);
    }

    // 默认键生成策略
    const params = JSON.stringify({
      query: request.query,
      params: request.params,
      body: request.body,
    });

    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(params).digest('hex');

    return `${className}:${methodName}:${hash}`;
  }
}
