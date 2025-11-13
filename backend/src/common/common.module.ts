import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR, APP_FILTER, APP_PIPE, APP_GUARD } from '@nestjs/core';

// 健康检查模块
import { HealthModule } from './health/health.module';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { GlobalValidationPipe } from './pipes/validation.pipe';
import { RequestLoggerMiddleware } from './middleware/request-logger.middleware';
import { RateLimitMiddleware } from './middleware/rate-limit.middleware';
import { SecurityMiddleware } from './middleware/security.middleware';
import { ResponseUtil } from './utils/response.util';
import { CacheService } from './services/cache.service';
import { RateLimitGuard } from './guards/rate-limit.guard';

/**
 * 公共模块
 * 包含基础的健康检查功能和全局拦截器、过滤器、中间件、管道
 */
@Module({
  imports: [ConfigModule, HealthModule],
  providers: [
    // 全局响应拦截器
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    // 全局异常过滤器
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    // 全局验证管道
    {
      provide: APP_PIPE,
      useFactory: () =>
        new GlobalValidationPipe({
          whitelist: true,
          forbidNonWhitelisted: false, // 修复：允许额外字段，避免400错误
          transform: true,
          skipMissingProperties: false,
          skipNullProperties: false,
          skipUndefinedProperties: false,
          enableDetailedErrors: process.env.NODE_ENV !== 'production',
          errorLanguage: 'zh',
          transformOptions: {
            enableImplicitConversion: true,
            excludeExtraneousValues: false, // 修复：允许未明确暴露的字段通过
            exposeDefaultValues: true,
            exposeUnsetFields: true, // 修复：允许undefined字段通过
          },
        }),
    },
    // 全局限流守卫
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    // 响应工具类
    ResponseUtil,
    // 缓存服务
    CacheService,
  ],
  exports: [HealthModule, ResponseUtil, CacheService],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 安全中间件 - 最先执行
    consumer.apply(SecurityMiddleware).forRoutes('*');

    // 请求日志中间件
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');

    // 限流中间件 - 应用到API路由，跳过预检与健康检查
    consumer
      .apply(
        RateLimitMiddleware.create({
          skip: (req) =>
            req.method === 'OPTIONS' || req.path.startsWith('/health'),
        }),
      )
      .forRoutes('api/*');
  }
}
