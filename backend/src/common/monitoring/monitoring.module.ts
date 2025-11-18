import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { RedisModule } from '@nestjs-modules/ioredis';
import { PerformanceMetricsService } from './performance-metrics.service';
import { PerformanceInterceptor } from './performance.interceptor';
import { MonitoringController } from './monitoring.controller';
import { AuthModule } from '../../auth/auth.module';

/**
 * 性能监控模块
 * 全局模块，自动注册性能拦截器
 */
@Global()
@Module({
  imports: [RedisModule, AuthModule],
  controllers: [MonitoringController],
  providers: [
    PerformanceMetricsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceInterceptor,
    },
  ],
  exports: [PerformanceMetricsService],
})
export class MonitoringModule {}
