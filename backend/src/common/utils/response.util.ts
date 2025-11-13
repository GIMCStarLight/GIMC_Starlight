import { randomUUID } from 'crypto';
import {
  BaseResponse,
  PaginatedResponse,
  ErrorResponse,
  ResponseCode,
  ResponseMessage,
  BusinessErrorType,
} from '../dto/response.dto';

/**
 * 响应工具类
 * 提供统一的响应格式构建方法
 */
export class ResponseUtil {
  /**
   * 构建成功响应
   */
  static success<T>(
    data: T,
    message: string = ResponseMessage.SUCCESS,
    code: number = ResponseCode.SUCCESS,
    traceId?: string,
    startTime?: number,
  ): BaseResponse<T> {
    const now = Date.now();
    return {
      code,
      message,
      data,
      traceId: traceId || randomUUID(),
      timestamp: now,
      duration: startTime ? now - startTime : undefined,
    };
  }

  /**
   * 构建分页响应
   */
  static paginated<T>(
    data: T[],
    page: number,
    pageSize: number,
    total: number,
    message: string = ResponseMessage.SUCCESS,
    traceId?: string,
    startTime?: number,
  ): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / pageSize);
    const now = Date.now();

    return {
      code: ResponseCode.SUCCESS,
      message,
      data,
      traceId: traceId || randomUUID(),
      timestamp: now,
      duration: startTime ? now - startTime : undefined,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * 构建错误响应
   */
  static error(
    message: string,
    code: number = ResponseCode.INTERNAL_SERVER_ERROR,
    errorType: BusinessErrorType = BusinessErrorType.BUSINESS_ERROR,
    details?: any,
    fields?: Record<string, string[]>,
    traceId?: string,
    stack?: string,
  ): ErrorResponse {
    return {
      code,
      message,
      data: null,
      traceId: traceId || randomUUID(),
      timestamp: Date.now(),
      error: {
        type: errorType,
        details,
        fields,
        stack: process.env.NODE_ENV === 'development' ? stack : undefined,
      },
    };
  }

  /**
   * 构建验证错误响应
   */
  static validationError(
    fields: Record<string, string[]>,
    message: string = ResponseMessage.BAD_REQUEST,
    traceId?: string,
  ): ErrorResponse {
    return this.error(
      message,
      ResponseCode.BAD_REQUEST,
      BusinessErrorType.VALIDATION_ERROR,
      undefined,
      fields,
      traceId,
    );
  }

  /**
   * 构建未授权响应
   */
  static unauthorized(
    message: string = ResponseMessage.UNAUTHORIZED,
    traceId?: string,
  ): ErrorResponse {
    return this.error(
      message,
      ResponseCode.UNAUTHORIZED,
      BusinessErrorType.PERMISSION_DENIED,
      undefined,
      undefined,
      traceId,
    );
  }

  /**
   * 构建禁止访问响应
   */
  static forbidden(
    message: string = ResponseMessage.FORBIDDEN,
    traceId?: string,
  ): ErrorResponse {
    return this.error(
      message,
      ResponseCode.FORBIDDEN,
      BusinessErrorType.PERMISSION_DENIED,
      undefined,
      undefined,
      traceId,
    );
  }

  /**
   * 构建资源不存在响应
   */
  static notFound(
    message: string = ResponseMessage.NOT_FOUND,
    traceId?: string,
  ): ErrorResponse {
    return this.error(
      message,
      ResponseCode.NOT_FOUND,
      BusinessErrorType.BUSINESS_ERROR,
      undefined,
      undefined,
      traceId,
    );
  }

  /**
   * 构建限流响应
   */
  static tooManyRequests(
    message: string = ResponseMessage.TOO_MANY_REQUESTS,
    traceId?: string,
  ): ErrorResponse {
    return this.error(
      message,
      ResponseCode.TOO_MANY_REQUESTS,
      BusinessErrorType.RATE_LIMIT,
      undefined,
      undefined,
      traceId,
    );
  }

  /**
   * 构建服务不可用响应
   */
  static serviceUnavailable(
    message: string = ResponseMessage.SERVICE_UNAVAILABLE,
    traceId?: string,
  ): ErrorResponse {
    return this.error(
      message,
      ResponseCode.SERVICE_UNAVAILABLE,
      BusinessErrorType.EXTERNAL_SERVICE_ERROR,
      undefined,
      undefined,
      traceId,
    );
  }
}
