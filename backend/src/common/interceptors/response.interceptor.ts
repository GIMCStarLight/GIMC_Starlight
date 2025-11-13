import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';
import { ResponseUtil } from '../utils/response.util';
import { BaseResponse } from '../dto/response.dto';

/**
 * 全局响应拦截器
 * 统一处理所有API响应格式
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ResponseInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    // 从请求头或生成traceId
    const traceId =
      (request.headers['x-trace-id'] as string) ||
      (request.headers['x-request-id'] as string) ||
      this.generateTraceId();

    // 将traceId添加到请求对象中，供后续使用
    (request as any).traceId = traceId;

    // 设置响应头
    response.setHeader('X-Trace-Id', traceId);
    response.setHeader('X-Response-Time', Date.now().toString());

    return next.handle().pipe(
      map((data) => {
        const endTime = Date.now();
        const duration = endTime - startTime;

        // 记录响应日志
        this.logResponse(request, response, duration, traceId);

        // 如果是DELETE请求且返回void/undefined，保持原样（用于204 No Content）
        if (
          request.method === 'DELETE' &&
          (data === undefined || data === null)
        ) {
          return data;
        }

        // 如果返回的数据已经是标准格式，直接返回
        if (this.isStandardResponse(data)) {
          // 更新duration
          data.duration = duration;
          return data;
        }

        // 处理不同类型的响应数据
        return this.formatResponse(data, traceId, startTime);
      }),
    );
  }

  /**
   * 检查是否为标准响应格式
   */
  private isStandardResponse(data: any): data is BaseResponse {
    return (
      data &&
      typeof data === 'object' &&
      'code' in data &&
      'message' in data &&
      'data' in data &&
      'traceId' in data &&
      'timestamp' in data
    );
  }

  /**
   * 格式化响应数据
   */
  private formatResponse(
    data: any,
    traceId: string,
    startTime: number,
  ): BaseResponse {
    // 处理分页数据
    if (this.isPaginatedData(data)) {
      return ResponseUtil.paginated(
        data.items || data.data || [],
        data.page || 1,
        data.pageSize || data.limit || 20,
        data.total || 0,
        '查询成功',
        traceId,
        startTime,
      );
    }

    // 处理普通数据
    return ResponseUtil.success(data, '操作成功', 200, traceId, startTime);
  }

  /**
   * 检查是否为分页数据
   */
  private isPaginatedData(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      (('items' in data && 'total' in data) ||
        ('data' in data && 'total' in data) ||
        ('page' in data && 'pageSize' in data))
    );
  }

  /**
   * 生成追踪ID
   */
  private generateTraceId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`;
  }

  /**
   * 记录响应日志
   */
  private logResponse(
    request: Request,
    response: Response,
    duration: number,
    traceId: string,
  ): void {
    const { method, url, ip } = request;
    const { statusCode } = response;
    const userAgent = request.get('User-Agent') || '';

    // 构建日志信息
    const logInfo = {
      traceId,
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      ip,
      userAgent: userAgent.substring(0, 100), // 限制长度
      timestamp: new Date().toISOString(),
    };

    // 根据状态码决定日志级别
    if (statusCode >= 500) {
      this.logger.error(`API响应异常`, logInfo);
    } else if (statusCode >= 400) {
      this.logger.warn(`API响应警告`, logInfo);
    } else if (duration > 2000) {
      // 响应时间超过2秒记录警告
      this.logger.warn(`API响应缓慢`, logInfo);
    } else {
      this.logger.log(`API响应正常`, logInfo);
    }
  }
}
