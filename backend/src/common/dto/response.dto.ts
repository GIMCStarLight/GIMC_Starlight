/**
 * 统一响应格式定义
 * 根据技术方案文档要求实现标准化API响应
 */

/**
 * API响应DTO
 */
export class ApiResponseDto<T = any> {
  code: number;
  message: string;
  data: T;
  traceId: string;
  timestamp: number;
  duration?: number;

  constructor(
    code: number,
    message: string,
    data: T,
    traceId: string,
    duration?: number,
  ) {
    this.code = code;
    this.message = message;
    this.data = data;
    this.traceId = traceId;
    this.timestamp = Date.now();
    this.duration = duration;
  }
}

/**
 * 基础响应接口
 */
export interface BaseResponse<T = any> {
  /** 响应状态码 */
  code: number;
  /** 响应消息 */
  message: string;
  /** 响应数据 */
  data: T;
  /** 请求追踪ID */
  traceId: string;
  /** 响应时间戳 */
  timestamp: number;
  /** 服务器处理时间(ms) */
  duration?: number;
}

/**
 * 分页响应接口
 */
export interface PaginatedResponse<T = any> extends BaseResponse<T[]> {
  /** 分页信息 */
  pagination: {
    /** 当前页码 */
    page: number;
    /** 每页数量 */
    pageSize: number;
    /** 总记录数 */
    total: number;
    /** 总页数 */
    totalPages: number;
    /** 是否有下一页 */
    hasNext: boolean;
    /** 是否有上一页 */
    hasPrev: boolean;
  };
}

/**
 * 错误响应接口
 */
export interface ErrorResponse extends BaseResponse<null> {
  /** 错误详情 */
  error: {
    /** 错误类型 */
    type: string;
    /** 错误详细信息 */
    details?: any;
    /** 错误堆栈(仅开发环境) */
    stack?: string;
    /** 验证错误字段 */
    fields?: Record<string, string[]>;
  };
}

/**
 * 响应状态码枚举
 */
export enum ResponseStatus {
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}

/**
 * 响应状态码枚举
 */
export enum ResponseCode {
  /** 成功 */
  SUCCESS = 200,
  /** 创建成功 */
  CREATED = 201,
  /** 无内容 */
  NO_CONTENT = 204,
  /** 请求参数错误 */
  BAD_REQUEST = 400,
  /** 未授权 */
  UNAUTHORIZED = 401,
  /** 禁止访问 */
  FORBIDDEN = 403,
  /** 资源不存在 */
  NOT_FOUND = 404,
  /** 请求方法不允许 */
  METHOD_NOT_ALLOWED = 405,
  /** 请求冲突 */
  CONFLICT = 409,
  /** 请求频率过高 */
  TOO_MANY_REQUESTS = 429,
  /** 服务器内部错误 */
  INTERNAL_SERVER_ERROR = 500,
  /** 服务不可用 */
  SERVICE_UNAVAILABLE = 503,
}

/**
 * 响应消息枚举
 */
export enum ResponseMessage {
  SUCCESS = '操作成功',
  CREATED = '创建成功',
  NO_CONTENT = '无内容',
  BAD_REQUEST = '请求参数错误',
  UNAUTHORIZED = '未授权访问',
  FORBIDDEN = '禁止访问',
  NOT_FOUND = '资源不存在',
  METHOD_NOT_ALLOWED = '请求方法不允许',
  CONFLICT = '请求冲突',
  TOO_MANY_REQUESTS = '请求频率过高，请稍后重试',
  INTERNAL_SERVER_ERROR = '服务器内部错误',
  SERVICE_UNAVAILABLE = '服务暂时不可用',
}

/**
 * 业务错误类型枚举
 */
export enum BusinessErrorType {
  /** 参数验证错误 */
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  /** 业务逻辑错误 */
  BUSINESS_ERROR = 'BUSINESS_ERROR',
  /** 资源不存在 */
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  /** 权限不足 */
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  /** 资源冲突 */
  RESOURCE_CONFLICT = 'RESOURCE_CONFLICT',
  /** 外部服务错误 */
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  /** 数据库错误 */
  DATABASE_ERROR = 'DATABASE_ERROR',
  /** 网络错误 */
  NETWORK_ERROR = 'NETWORK_ERROR',
  /** 配置错误 */
  CONFIG_ERROR = 'CONFIG_ERROR',
  /** 未知错误 */
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  /** 未授权 */
  UNAUTHORIZED = 'UNAUTHORIZED',
  /** 禁止访问 */
  FORBIDDEN = 'FORBIDDEN',
  /** 资源不存在 */
  NOT_FOUND = 'NOT_FOUND',
  /** 请求频率超限 */
  RATE_LIMIT = 'RATE_LIMIT',
}
