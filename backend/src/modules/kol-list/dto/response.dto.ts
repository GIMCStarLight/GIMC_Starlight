import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiResponse<T = any> {
  @ApiProperty({ description: '响应状态码' })
  code: number;

  @ApiProperty({ description: '响应消息' })
  message: string;

  @ApiPropertyOptional({ description: '响应数据' })
  data?: T;

  @ApiProperty({ description: '响应时间戳' })
  timestamp: number;

  @ApiPropertyOptional({ description: '请求ID' })
  requestId?: string;

  constructor(code: number, message: string, data?: T, requestId?: string) {
    this.code = code;
    this.message = message;
    this.data = data;
    this.timestamp = Date.now();
    this.requestId = requestId;
  }

  static success<T>(data?: T, message = '操作成功', requestId?: string) {
    return new ApiResponse(200, message, data, requestId);
  }

  static error(code: number, message: string, data?: any, requestId?: string) {
    return new ApiResponse(code, message, data, requestId);
  }
}

export class PaginationMeta {
  @ApiProperty({ description: '当前页码' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  limit: number;

  @ApiProperty({ description: '总记录数' })
  total: number;

  @ApiProperty({ description: '总页数' })
  totalPages: number;

  @ApiProperty({ description: '是否有下一页' })
  hasNext: boolean;

  @ApiProperty({ description: '是否有上一页' })
  hasPrev: boolean;

  constructor(page: number, limit: number, total: number) {
    this.page = page;
    this.limit = limit;
    this.total = total;
    this.totalPages = Math.ceil(total / limit);
    this.hasNext = page < this.totalPages;
    this.hasPrev = page > 1;
  }
}

export class PaginatedResponse<T> {
  @ApiProperty({ description: '数据列表' })
  items: T[];

  @ApiProperty({ description: '分页信息', type: PaginationMeta })
  meta: PaginationMeta;

  constructor(items: T[], page: number, limit: number, total: number) {
    this.items = items;
    this.meta = new PaginationMeta(page, limit, total);
  }
}

export class ErrorDetail {
  @ApiProperty({ description: '错误字段' })
  field?: string;

  @ApiProperty({ description: '错误代码' })
  code: string;

  @ApiProperty({ description: '错误消息' })
  message: string;

  @ApiPropertyOptional({ description: '错误值' })
  value?: unknown;

  constructor(code: string, message: string, field?: string, value?: unknown) {
    this.code = code;
    this.message = message;
    this.field = field;
    this.value = value;
  }
}

export class ValidationErrorResponse extends ApiResponse {
  @ApiProperty({ description: '验证错误详情', type: [ErrorDetail] })
  errors: ErrorDetail[];

  constructor(errors: ErrorDetail[], requestId?: string) {
    super(400, '请求参数验证失败', null, requestId);
    this.errors = errors;
  }
}
