import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PerformanceMetricsService } from './performance-metrics.service';

/**
 * 性能监控拦截器
 * 自动记录API响应时间
 */
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);

  constructor(
    private readonly performanceMetricsService: PerformanceMetricsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    const { method, url } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const responseTime = Date.now() - startTime;
          const statusCode = response.statusCode;

          // 异步记录，不阻塞响应
          this.performanceMetricsService
            .recordApiResponseTime(url, method, responseTime, statusCode)
            .catch((error) => {
              this.logger.warn('记录API性能指标失败', error);
            });
        },
        error: (error) => {
          const responseTime = Date.now() - startTime;
          const statusCode = error.status || 500;

          this.performanceMetricsService
            .recordApiResponseTime(url, method, responseTime, statusCode)
            .catch((err) => {
              this.logger.warn('记录API性能指标失败', err);
            });
        },
      }),
    );
  }
}
