import { applyDecorators, Type } from '@nestjs/common';
import { ApiResponse, ApiResponseOptions } from '@nestjs/swagger';
import {
  ApiErrorResponseDto,
  ErrorResponseExamples,
} from '../dto/api-response.dto';

/**
 * 标准API响应装饰器
 * 自动添加常见的HTTP状态码响应文档
 *
 * @param successType 成功响应的数据类型
 * @param options 可选配置
 *
 * @example
 * @StandardApiResponses(UserDto)
 * findOne() {}
 *
 * @StandardApiResponses(UserDto, {
 *   excludeErrors: [404],
 *   customErrors: { 409: '用户已存在' }
 * })
 * create() {}
 */
export function StandardApiResponses<T>(
  successType?: Type<T> | null,
  options?: {
    /** 成功响应的状态码 */
    successStatus?: number;
    /** 成功响应的描述 */
    successDescription?: string;
    /** 是否为数组响应 */
    isArray?: boolean;
    /** 排除特定错误码 */
    excludeErrors?: number[];
    /** 自定义错误描述 */
    customErrors?: Record<number, string>;
    /** 是否需要认证 */
    requireAuth?: boolean;
  },
) {
  const {
    successStatus = 200,
    successDescription = '操作成功',
    isArray = false,
    excludeErrors = [],
    customErrors = {},
    requireAuth = true,
  } = options || {};

  const decorators: Array<
    ClassDecorator | MethodDecorator | PropertyDecorator
  > = [];

  // 成功响应
  if (successType) {
    decorators.push(
      ApiResponse({
        status: successStatus,
        description: successDescription,
        type: successType,
        isArray,
      }),
    );
  }

  // 标准错误响应
  const standardErrors = [
    400, // 请求参数错误
    ...(requireAuth ? [401, 403] : []), // 认证和授权错误
    500, // 服务器错误
  ];

  standardErrors
    .filter((status) => !excludeErrors.includes(status))
    .forEach((status) => {
      const errorConfig = ErrorResponseExamples[status];
      decorators.push(
        ApiResponse({
          status,
          description: customErrors[status] || errorConfig.description,
          type: errorConfig.type,
        }),
      );
    });

  return applyDecorators(...decorators);
}

/**
 * CRUD操作标准响应装饰器
 */
export class CrudApiResponses {
  /**
   * 列表查询响应
   */
  static List<T>(type: Type<T>) {
    return StandardApiResponses(type, {
      successStatus: 200,
      successDescription: '成功获取列表',
      isArray: true,
      requireAuth: true,
    });
  }

  /**
   * 详情查询响应
   */
  static Detail<T>(type: Type<T>) {
    return StandardApiResponses(type, {
      successStatus: 200,
      successDescription: '成功获取详情',
      requireAuth: true,
      customErrors: {
        404: '资源不存在',
      },
    });
  }

  /**
   * 创建响应
   */
  static Create<T>(type: Type<T>) {
    return StandardApiResponses(type, {
      successStatus: 201,
      successDescription: '创建成功',
      requireAuth: true,
      customErrors: {
        409: '资源已存在',
      },
    });
  }

  /**
   * 更新响应
   */
  static Update<T>(type: Type<T>) {
    return StandardApiResponses(type, {
      successStatus: 200,
      successDescription: '更新成功',
      requireAuth: true,
      customErrors: {
        404: '资源不存在',
      },
    });
  }

  /**
   * 删除响应
   */
  static Delete() {
    return StandardApiResponses(null, {
      successStatus: 200,
      successDescription: '删除成功',
      requireAuth: true,
      customErrors: {
        404: '资源不存在',
      },
    });
  }

  /**
   * 批量操作响应
   */
  static Batch<T>(type?: Type<T>) {
    return StandardApiResponses(type, {
      successStatus: 200,
      successDescription: '批量操作成功',
      requireAuth: true,
    });
  }
}

/**
 * 公开API响应装饰器 (无需认证)
 */
export function PublicApiResponses<T>(
  successType: Type<T>,
  options?: {
    successStatus?: number;
    successDescription?: string;
    isArray?: boolean;
    customErrors?: Record<number, string>;
  },
) {
  return StandardApiResponses(successType, {
    ...options,
    requireAuth: false,
  });
}

/**
 * 文件上传响应装饰器
 */
export function FileUploadApiResponses() {
  return applyDecorators(
    ApiResponse({
      status: 201,
      description: '文件上传成功',
      schema: {
        type: 'object',
        properties: {
          code: { type: 'number', example: 201 },
          message: { type: 'string', example: '文件上传成功' },
          data: {
            type: 'object',
            properties: {
              filename: { type: 'string', example: 'file-123.jpg' },
              url: {
                type: 'string',
                example: 'https://cdn.example.com/file-123.jpg',
              },
              size: { type: 'number', example: 102400 },
              mimeType: { type: 'string', example: 'image/jpeg' },
            },
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: '文件格式不支持或文件过大',
      type: ApiErrorResponseDto,
    }),
    ApiResponse({
      status: 413,
      description: '文件大小超过限制',
      type: ApiErrorResponseDto,
    }),
  );
}

/**
 * 导出响应装饰器
 */
export function ExportApiResponses() {
  return applyDecorators(
    ApiResponse({
      status: 200,
      description: '导出成功',
      content: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
          schema: {
            type: 'string',
            format: 'binary',
          },
        },
        'text/csv': {
          schema: {
            type: 'string',
          },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: '导出参数错误',
      type: ApiErrorResponseDto,
    }),
  );
}
