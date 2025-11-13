import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { ResponseUtil } from '../utils/response.util';
import {
  ResponseCode,
  ResponseMessage,
  BusinessErrorType,
  ErrorResponse,
} from '../dto/response.dto';

/**
 * 全局HTTP异常过滤器
 * 统一处理所有异常并返回标准格式的错误响应
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const traceId = (request as any).traceId || this.generateTraceId();

    // 获取异常信息
    const exceptionInfo = this.getExceptionInfo(exception);

    // 构建错误响应
    const errorResponse = this.buildErrorResponse(
      exceptionInfo,
      traceId,
      request,
    );

    // 记录异常日志
    this.logException(exception, request, exceptionInfo, traceId);

    // 设置响应头
    response.setHeader('X-Trace-Id', traceId);
    response.setHeader('Content-Type', 'application/json; charset=utf-8');

    // 返回错误响应
    response.status(exceptionInfo.status).json(errorResponse);
  }

  /**
   * 获取异常信息
   */
  private getExceptionInfo(exception: unknown): {
    status: number;
    message: string;
    errorType: BusinessErrorType;
    details?: any;
    fields?: Record<string, string[]>;
    stack?: string;
  } {
    // HTTP异常
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      // 处理验证异常
      if (status === HttpStatus.BAD_REQUEST && typeof response === 'object') {
        const responseObj = response as any;
        if (responseObj.message && Array.isArray(responseObj.message)) {
          return {
            status,
            message: ResponseMessage.BAD_REQUEST,
            errorType: BusinessErrorType.VALIDATION_ERROR,
            fields: this.parseValidationErrors(responseObj.message),
            stack: exception.stack,
          };
        }
      }

      return {
        status,
        message:
          typeof response === 'string'
            ? response
            : typeof response === 'object' && response['message']
              ? response['message']
              : exception.message,
        errorType: this.getErrorTypeByStatus(status),
        details: typeof response === 'object' ? response : undefined,
        stack: exception.stack,
      };
    }

    // 数据库异常
    if (exception instanceof QueryFailedError) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: '数据库操作失败',
        errorType: BusinessErrorType.DATABASE_ERROR,
        details: {
          query: exception.query,
          parameters: exception.parameters,
          driverError: exception.driverError,
        },
        stack: exception.stack,
      };
    }

    // 其他异常
    if (exception instanceof Error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: exception.message || ResponseMessage.INTERNAL_SERVER_ERROR,
        errorType: BusinessErrorType.BUSINESS_ERROR,
        stack: exception.stack,
      };
    }

    // 未知异常
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: ResponseMessage.INTERNAL_SERVER_ERROR,
      errorType: BusinessErrorType.BUSINESS_ERROR,
      details: exception,
    };
  }

  /**
   * 根据状态码获取错误类型
   */
  private getErrorTypeByStatus(status: number): BusinessErrorType {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return BusinessErrorType.VALIDATION_ERROR;
      case HttpStatus.UNAUTHORIZED:
      case HttpStatus.FORBIDDEN:
        return BusinessErrorType.PERMISSION_DENIED;
      case HttpStatus.TOO_MANY_REQUESTS:
        return BusinessErrorType.RATE_LIMIT;
      case HttpStatus.SERVICE_UNAVAILABLE:
      case HttpStatus.BAD_GATEWAY:
      case HttpStatus.GATEWAY_TIMEOUT:
        return BusinessErrorType.EXTERNAL_SERVICE_ERROR;
      default:
        return BusinessErrorType.BUSINESS_ERROR;
    }
  }

  /**
   * 解析验证错误
   */
  private parseValidationErrors(messages: string[]): Record<string, string[]> {
    const fields: Record<string, string[]> = {};

    messages.forEach((message) => {
      // 尝试解析字段名和错误信息
      const match = message.match(/^(\w+)\s+(.+)$/);
      if (match) {
        const [, field, error] = match;
        if (!fields[field]) {
          fields[field] = [];
        }
        fields[field].push(error);
      } else {
        // 如果无法解析字段名，使用通用字段
        if (!fields.general) {
          fields.general = [];
        }
        fields.general.push(message);
      }
    });

    return fields;
  }

  /**
   * 构建错误响应
   */
  private buildErrorResponse(
    exceptionInfo: any,
    traceId: string,
    request: Request,
  ): ErrorResponse {
    return ResponseUtil.error(
      exceptionInfo.message,
      exceptionInfo.status,
      exceptionInfo.errorType,
      exceptionInfo.details,
      exceptionInfo.fields,
      traceId,
      exceptionInfo.stack,
    );
  }

  /**
   * 记录异常日志
   */
  private logException(
    exception: unknown,
    request: Request,
    exceptionInfo: any,
    traceId: string,
  ): void {
    const { method, url, ip, body, query, params } = request;
    const userAgent = request.get('User-Agent') || '';

    const logContext = {
      traceId,
      method,
      url,
      ip,
      userAgent: userAgent.substring(0, 100),
      body: this.sanitizeLogData(body),
      query,
      params,
      status: exceptionInfo.status,
      errorType: exceptionInfo.errorType,
      timestamp: new Date().toISOString(),
    };

    // 根据异常类型和状态码决定日志级别
    if (exceptionInfo.status >= 500) {
      this.logger.error(`服务器异常: ${exceptionInfo.message}`, {
        ...logContext,
        stack: exceptionInfo.stack,
        exception:
          exception instanceof Error
            ? {
                name: exception.constructor.name,
                message: exception.message,
              }
            : exception,
      });
    } else if (exceptionInfo.status >= 400) {
      this.logger.warn(`客户端错误: ${exceptionInfo.message}`, logContext);
    } else {
      this.logger.log(`异常处理: ${exceptionInfo.message}`, logContext);
    }
  }

  /**
   * 清理敏感日志数据
   */
  private sanitizeLogData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveFields = [
      'password',
      'token',
      'authorization',
      'secret',
      'key',
      'credential',
    ];

    const sanitized = { ...data };

    Object.keys(sanitized).forEach((key) => {
      const lowerKey = key.toLowerCase();
      if (sensitiveFields.some((field) => lowerKey.includes(field))) {
        sanitized[key] = '***';
      }
    });

    return sanitized;
  }

  /**
   * 生成追踪ID
   */
  private generateTraceId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`;
  }
}
