import { ApiProperty } from '@nestjs/swagger';

/**
 * 通用API响应DTO
 */
export class ApiResponseDto<T> {
  @ApiProperty({
    description: 'HTTP状态码',
    example: 200,
  })
  code: number;

  @ApiProperty({
    description: '响应消息',
    example: '操作成功',
  })
  message: string;

  @ApiProperty({
    description: '响应数据',
  })
  data: T;

  @ApiProperty({
    description: '追踪ID',
    example: 'trace-123456',
  })
  traceId: string;

  @ApiProperty({
    description: '时间戳',
    example: 1640995200000,
  })
  timestamp: number;
}

/**
 * 分页信息DTO
 */
export class PaginationDto {
  @ApiProperty({
    description: '当前页码',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: '每页数量',
    example: 10,
  })
  pageSize: number;

  @ApiProperty({
    description: '总记录数',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: '总页数',
    example: 10,
  })
  totalPages: number;

  @ApiProperty({
    description: '是否有下一页',
    example: true,
  })
  hasNext: boolean;

  @ApiProperty({
    description: '是否有上一页',
    example: false,
  })
  hasPrev: boolean;
}

/**
 * 分页响应DTO
 */
export class PaginatedResponseDto<T> extends ApiResponseDto<T[]> {
  @ApiProperty({
    description: '分页信息',
    type: PaginationDto,
  })
  pagination: PaginationDto;
}

/**
 * 错误详情DTO
 */
export class ErrorDetailsDto {
  @ApiProperty({
    description: '错误类型',
    example: 'VALIDATION_ERROR',
  })
  type: string;

  @ApiProperty({
    description: '错误详情',
    example: { field: 'phone', message: '手机号格式不正确' },
  })
  details: any;

  @ApiProperty({
    description: '请求路径',
    example: '/api/v1/users',
  })
  path?: string;

  @ApiProperty({
    description: '请求方法',
    example: 'POST',
  })
  method?: string;
}

/**
 * API错误响应DTO
 */
export class ApiErrorResponseDto {
  @ApiProperty({
    description: 'HTTP错误状态码',
    example: 400,
  })
  code: number;

  @ApiProperty({
    description: '错误消息',
    example: '请求参数错误',
  })
  message: string;

  @ApiProperty({
    description: '数据为空',
    nullable: true,
    example: null,
  })
  data: null;

  @ApiProperty({
    description: '追踪ID',
    example: 'trace-123456',
  })
  traceId: string;

  @ApiProperty({
    description: '时间戳',
    example: 1640995200000,
  })
  timestamp: number;

  @ApiProperty({
    description: '错误详情',
    type: ErrorDetailsDto,
    required: false,
  })
  error?: ErrorDetailsDto;
}

/**
 * 标准成功响应示例
 */
export const SuccessResponseExample = {
  200: {
    description: '操作成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: '操作成功' },
        data: { type: 'object' },
        traceId: { type: 'string', example: 'trace-123456' },
        timestamp: { type: 'number', example: 1640995200000 },
      },
    },
  },
};

/**
 * 标准错误响应示例
 */
export const ErrorResponseExamples = {
  400: {
    description: '请求参数错误',
    type: ApiErrorResponseDto,
  },
  401: {
    description: '未认证',
    type: ApiErrorResponseDto,
  },
  403: {
    description: '权限不足',
    type: ApiErrorResponseDto,
  },
  404: {
    description: '资源不存在',
    type: ApiErrorResponseDto,
  },
  409: {
    description: '资源冲突',
    type: ApiErrorResponseDto,
  },
  429: {
    description: '请求过于频繁',
    type: ApiErrorResponseDto,
  },
  500: {
    description: '服务器内部错误',
    type: ApiErrorResponseDto,
  },
};
