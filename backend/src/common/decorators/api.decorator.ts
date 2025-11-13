import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBody,
  ApiQuery,
  ApiParam,
  ApiHeader,
  ApiBearerAuth,
  ApiConsumes,
  ApiProduces,
  getSchemaPath,
} from '@nestjs/swagger';
import { ResponseStatus, BusinessErrorType } from '../dto/response.dto';

/**
 * API装饰器选项接口
 */
export interface ApiDecoratorOptions {
  /** API标签 */
  tags?: string[];
  /** 操作摘要 */
  summary?: string;
  /** 操作描述 */
  description?: string;
  /** 是否需要认证 */
  auth?: boolean;
  /** 成功响应类型 */
  successType?: Type<any>;
  /** 是否是分页响应 */
  isPaginated?: boolean;
  /** 请求体类型 */
  bodyType?: Type<any>;
  /** 查询参数 */
  queries?: Array<{
    name: string;
    type?: 'string' | 'number' | 'boolean' | 'array';
    required?: boolean;
    description?: string;
    example?: any;
  }>;
  /** 路径参数 */
  params?: Array<{
    name: string;
    type?: 'string' | 'number' | 'uuid';
    description?: string;
    example?: any;
  }>;
  /** 请求头 */
  headers?: Array<{
    name: string;
    required?: boolean;
    description?: string;
    example?: string;
  }>;
  /** 内容类型 */
  consumes?: string[];
  /** 响应类型 */
  produces?: string[];
  /** 自定义错误响应 */
  errors?: Array<{
    status: number;
    description: string;
    type?: BusinessErrorType;
  }>;
}

/**
 * 统一API装饰器
 * 提供完整的Swagger文档和验证装饰器
 */
export function ApiEndpoint(options: ApiDecoratorOptions = {}) {
  const decorators: any[] = [];

  // 添加标签
  if (options.tags && options.tags.length > 0) {
    decorators.push(ApiTags(...options.tags));
  }

  // 添加操作信息
  if (options.summary || options.description) {
    decorators.push(
      ApiOperation({
        summary: options.summary,
        description: options.description,
      }),
    );
  }

  // 添加认证
  if (options.auth) {
    decorators.push(ApiBearerAuth());
  }

  // 添加请求体
  if (options.bodyType) {
    decorators.push(
      ApiBody({
        type: options.bodyType,
        description: '请求体数据',
      }),
    );
  }

  // 添加查询参数
  if (options.queries) {
    options.queries.forEach((query) => {
      decorators.push(
        ApiQuery({
          name: query.name,
          type: query.type || 'string',
          required: query.required || false,
          description: query.description,
          example: query.example,
        }),
      );
    });
  }

  // 添加路径参数
  if (options.params) {
    options.params.forEach((param) => {
      decorators.push(
        ApiParam({
          name: param.name,
          type: param.type || 'string',
          description: param.description,
          example: param.example,
        }),
      );
    });
  }

  // 添加请求头
  if (options.headers) {
    options.headers.forEach((header) => {
      decorators.push(
        ApiHeader({
          name: header.name,
          required: header.required || false,
          description: header.description,
          example: header.example,
        }),
      );
    });
  }

  // 添加内容类型
  if (options.consumes) {
    decorators.push(ApiConsumes(...options.consumes));
  }

  // 添加响应类型
  if (options.produces) {
    decorators.push(ApiProduces(...options.produces));
  }

  // 添加成功响应
  decorators.push(
    ApiResponse({
      status: 200,
      description: '请求成功',
      schema: options.successType
        ? options.isPaginated
          ? {
              type: 'object',
              properties: {
                code: { type: 'number', example: ResponseStatus.SUCCESS },
                message: { type: 'string', example: '请求成功' },
                data: {
                  type: 'object',
                  properties: {
                    items: {
                      type: 'array',
                      items: { $ref: getSchemaPath(options.successType) },
                    },
                    total: { type: 'number', example: 100 },
                    page: { type: 'number', example: 1 },
                    limit: { type: 'number', example: 10 },
                    totalPages: { type: 'number', example: 10 },
                    hasNext: { type: 'boolean', example: true },
                    hasPrev: { type: 'boolean', example: false },
                  },
                },
                traceId: { type: 'string', example: 'trace-123456' },
                timestamp: { type: 'number', example: Date.now() },
              },
            }
          : {
              type: 'object',
              properties: {
                code: { type: 'number', example: ResponseStatus.SUCCESS },
                message: { type: 'string', example: '请求成功' },
                data: { $ref: getSchemaPath(options.successType) },
                traceId: { type: 'string', example: 'trace-123456' },
                timestamp: { type: 'number', example: Date.now() },
              },
            }
        : {
            type: 'object',
            properties: {
              code: { type: 'number', example: ResponseStatus.SUCCESS },
              message: { type: 'string', example: '请求成功' },
              data: { type: 'object', nullable: true },
              traceId: { type: 'string', example: 'trace-123456' },
              timestamp: { type: 'number', example: Date.now() },
            },
          },
    }),
  );

  // 添加通用错误响应
  decorators.push(
    ApiResponse({
      status: 400,
      description: '请求参数错误',
      schema: {
        type: 'object',
        properties: {
          code: { type: 'number', example: ResponseStatus.ERROR },
          message: { type: 'string', example: '请求参数验证失败' },
          error: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                example: BusinessErrorType.VALIDATION_ERROR,
              },
              details: { type: 'object', nullable: true },
            },
          },
          traceId: { type: 'string', example: 'trace-123456' },
          timestamp: { type: 'number', example: Date.now() },
        },
      },
    }),
  );

  decorators.push(
    ApiResponse({
      status: 401,
      description: '未授权访问',
      schema: {
        type: 'object',
        properties: {
          code: { type: 'number', example: ResponseStatus.ERROR },
          message: { type: 'string', example: '未授权访问' },
          error: {
            type: 'object',
            properties: {
              type: { type: 'string', example: BusinessErrorType.UNAUTHORIZED },
              details: { type: 'object', nullable: true },
            },
          },
          traceId: { type: 'string', example: 'trace-123456' },
          timestamp: { type: 'number', example: Date.now() },
        },
      },
    }),
  );

  decorators.push(
    ApiResponse({
      status: 403,
      description: '禁止访问',
      schema: {
        type: 'object',
        properties: {
          code: { type: 'number', example: ResponseStatus.ERROR },
          message: { type: 'string', example: '权限不足' },
          error: {
            type: 'object',
            properties: {
              type: { type: 'string', example: BusinessErrorType.FORBIDDEN },
              details: { type: 'object', nullable: true },
            },
          },
          traceId: { type: 'string', example: 'trace-123456' },
          timestamp: { type: 'number', example: Date.now() },
        },
      },
    }),
  );

  decorators.push(
    ApiResponse({
      status: 404,
      description: '资源不存在',
      schema: {
        type: 'object',
        properties: {
          code: { type: 'number', example: ResponseStatus.ERROR },
          message: { type: 'string', example: '请求的资源不存在' },
          error: {
            type: 'object',
            properties: {
              type: { type: 'string', example: BusinessErrorType.NOT_FOUND },
              details: { type: 'object', nullable: true },
            },
          },
          traceId: { type: 'string', example: 'trace-123456' },
          timestamp: { type: 'number', example: Date.now() },
        },
      },
    }),
  );

  decorators.push(
    ApiResponse({
      status: 429,
      description: '请求过于频繁',
      schema: {
        type: 'object',
        properties: {
          code: { type: 'number', example: ResponseStatus.ERROR },
          message: { type: 'string', example: '请求过于频繁，请稍后再试' },
          error: {
            type: 'object',
            properties: {
              type: { type: 'string', example: BusinessErrorType.RATE_LIMIT },
              details: {
                type: 'object',
                properties: {
                  limit: { type: 'number', example: 100 },
                  remaining: { type: 'number', example: 0 },
                  resetTime: { type: 'number', example: Date.now() + 60000 },
                },
              },
            },
          },
          traceId: { type: 'string', example: 'trace-123456' },
          timestamp: { type: 'number', example: Date.now() },
        },
      },
    }),
  );

  decorators.push(
    ApiResponse({
      status: 500,
      description: '服务器内部错误',
      schema: {
        type: 'object',
        properties: {
          code: { type: 'number', example: ResponseStatus.ERROR },
          message: { type: 'string', example: '服务器内部错误' },
          error: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                example: BusinessErrorType.EXTERNAL_SERVICE_ERROR,
              },
              details: { type: 'object', nullable: true },
            },
          },
          traceId: { type: 'string', example: 'trace-123456' },
          timestamp: { type: 'number', example: Date.now() },
        },
      },
    }),
  );

  // 添加自定义错误响应
  if (options.errors) {
    options.errors.forEach((error) => {
      decorators.push(
        ApiResponse({
          status: error.status,
          description: error.description,
          schema: {
            type: 'object',
            properties: {
              code: { type: 'number', example: ResponseStatus.ERROR },
              message: { type: 'string', example: error.description },
              error: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    example: error.type || BusinessErrorType.BUSINESS_ERROR,
                  },
                  details: { type: 'object', nullable: true },
                },
              },
              traceId: { type: 'string', example: 'trace-123456' },
              timestamp: { type: 'number', example: Date.now() },
            },
          },
        }),
      );
    });
  }

  return applyDecorators(...decorators);
}

/**
 * 预定义的API装饰器
 */
export const ApiDecorators = {
  /** 获取列表API */
  GetList: (options: Omit<ApiDecoratorOptions, 'isPaginated'> = {}) =>
    ApiEndpoint({
      ...options,
      isPaginated: true,
      summary: options.summary || '获取列表',
      queries: [
        { name: 'page', type: 'number', description: '页码', example: 1 },
        { name: 'limit', type: 'number', description: '每页数量', example: 10 },
        {
          name: 'search',
          type: 'string',
          description: '搜索关键词',
          required: false,
        },
        {
          name: 'sort',
          type: 'string',
          description: '排序字段',
          required: false,
        },
        {
          name: 'order',
          type: 'string',
          description: '排序方向(asc/desc)',
          required: false,
        },
        ...(options.queries || []),
      ],
    }),

  /** 获取详情API */
  GetDetail: (options: ApiDecoratorOptions = {}) =>
    ApiEndpoint({
      ...options,
      summary: options.summary || '获取详情',
      params: [
        { name: 'id', type: 'uuid', description: '资源ID' },
        ...(options.params || []),
      ],
    }),

  /** 创建资源API */
  Create: (options: ApiDecoratorOptions = {}) =>
    ApiEndpoint({
      ...options,
      summary: options.summary || '创建资源',
      auth: options.auth !== false,
    }),

  /** 更新资源API */
  Update: (options: ApiDecoratorOptions = {}) =>
    ApiEndpoint({
      ...options,
      summary: options.summary || '更新资源',
      auth: options.auth !== false,
      params: [
        { name: 'id', type: 'uuid', description: '资源ID' },
        ...(options.params || []),
      ],
    }),

  /** 删除资源API */
  Delete: (options: ApiDecoratorOptions = {}) =>
    ApiEndpoint({
      ...options,
      summary: options.summary || '删除资源',
      auth: options.auth !== false,
      params: [
        { name: 'id', type: 'uuid', description: '资源ID' },
        ...(options.params || []),
      ],
    }),

  /** 批量操作API */
  Batch: (options: ApiDecoratorOptions = {}) =>
    ApiEndpoint({
      ...options,
      summary: options.summary || '批量操作',
      auth: options.auth !== false,
    }),

  /** 上传文件API */
  Upload: (options: ApiDecoratorOptions = {}) =>
    ApiEndpoint({
      ...options,
      summary: options.summary || '上传文件',
      auth: options.auth !== false,
      consumes: ['multipart/form-data'],
    }),

  /** 导出数据API */
  Export: (options: ApiDecoratorOptions = {}) =>
    ApiEndpoint({
      ...options,
      summary: options.summary || '导出数据',
      auth: options.auth !== false,
      produces: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ],
    }),

  /** 登录API */
  Login: (options: ApiDecoratorOptions = {}) =>
    ApiEndpoint({
      ...options,
      tags: ['认证', ...(options.tags || [])],
      summary: options.summary || '用户登录',
      auth: false,
    }),

  /** 注册API */
  Register: (options: ApiDecoratorOptions = {}) =>
    ApiEndpoint({
      ...options,
      tags: ['认证', ...(options.tags || [])],
      summary: options.summary || '用户注册',
      auth: false,
    }),

  /** 刷新令牌API */
  RefreshToken: (options: ApiDecoratorOptions = {}) =>
    ApiEndpoint({
      ...options,
      tags: ['认证', ...(options.tags || [])],
      summary: options.summary || '刷新访问令牌',
      auth: false,
    }),

  /** 获取用户信息API */
  Profile: (options: ApiDecoratorOptions = {}) =>
    ApiEndpoint({
      ...options,
      tags: ['用户', ...(options.tags || [])],
      summary: options.summary || '获取用户信息',
      auth: true,
    }),
};
