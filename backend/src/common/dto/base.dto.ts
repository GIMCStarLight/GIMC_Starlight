import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsUUID,
  IsDateString,
  Min,
  Max,
  Length,
  Matches,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested,
  IsEmail,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type, Expose } from 'class-transformer';

/**
 * 排序方向枚举
 */
export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * 基础实体DTO
 */
export class BaseEntityDto {
  @ApiProperty({
    description: 'ID必须是字符串',
    example: '1',
  })
  @IsString({ message: 'ID必须是字符串' })
  @Matches(/^\d+$/, { message: 'ID必须是有效的数字格式' })
  @Expose()
  id: string;

  @ApiProperty({
    description: '创建时间',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsDateString({}, { message: '创建时间必须是有效的日期格式' })
  createdAt: string;

  @ApiProperty({
    description: '更新时间',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsDateString({}, { message: '更新时间必须是有效的日期格式' })
  updatedAt: string;

  @ApiPropertyOptional({
    description: '删除时间（软删除）',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: '删除时间必须是有效的日期格式' })
  deletedAt?: string;
}

/**
 * 分页查询DTO
 */
export class PaginationDto {
  @ApiPropertyOptional({
    description: '页码',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '页码必须是数字' })
  @Min(1, { message: '页码不能小于1' })
  @Transform(({ value }) => parseInt(value, 10) || 1)
  @Expose()
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页数量',
    minimum: 1,
    maximum: 1000,
    default: 10,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '每页数量必须是数字' })
  @Min(1, { message: '每页数量不能小于1' })
  @Max(1000, { message: '每页数量不能超过1000' })
  @Transform(({ value }) => parseInt(value, 10) || 10)
  @Expose()
  limit?: number = 10;

  @ApiPropertyOptional({
    description: '跳过数量（用于游标分页）',
    minimum: 0,
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: '跳过数量必须是数字' })
  @Min(0, { message: '跳过数量不能小于0' })
  @Transform(({ value }) => parseInt(value, 10) || 0)
  @Expose()
  offset?: number = 0;
}

/**
 * 排序查询DTO
 */
export class SortDto {
  @ApiPropertyOptional({
    description: '排序字段',
    example: 'createdAt',
  })
  @IsOptional()
  @IsString({ message: '排序字段必须是字符串' })
  @Length(1, 50, { message: '排序字段长度必须在1-50个字符之间' })
  @Matches(/^[a-zA-Z][a-zA-Z0-9_]*$/, {
    message: '排序字段只能包含字母、数字和下划线，且必须以字母开头',
  })
  @Expose()
  sort?: string = 'createdAt';

  @ApiPropertyOptional({
    description: '排序方向',
    enum: SortOrder,
    example: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder, { message: '排序方向必须是asc或desc' })
  @Transform(({ value }) => value?.toLowerCase())
  @Expose()
  order?: SortOrder = SortOrder.DESC;
}

/**
 * 搜索查询DTO
 */
export class SearchDto {
  @ApiPropertyOptional({
    description: '搜索关键词',
    example: '关键词',
  })
  @IsOptional()
  @IsString({ message: '搜索关键词必须是字符串' })
  @Length(1, 100, { message: '搜索关键词长度必须在1-100个字符之间' })
  @Transform(({ value }) => value?.trim())
  @Expose()
  search?: string;

  @ApiPropertyOptional({
    description: '搜索字段（多个字段用逗号分隔）',
    example: 'name,description',
  })
  @IsOptional()
  @IsString({ message: '搜索字段必须是字符串' })
  @Transform(({ value }) =>
    value?.split(',').map((field: string) => field.trim()),
  )
  @Expose()
  searchFields?: string[];
}

/**
 * 过滤查询DTO
 */
export class FilterDto {
  @ApiPropertyOptional({
    description: '状态过滤',
    example: 'active',
  })
  @IsOptional()
  @Expose()
  status?: string | number;

  @ApiPropertyOptional({
    description: '是否包含已删除的记录',
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: '包含已删除记录标志必须是布尔值' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  @Expose()
  includeDeleted?: boolean = false;

  @ApiPropertyOptional({
    description: '创建时间范围开始',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: '开始时间必须是有效的日期格式' })
  @Expose()
  createdAtStart?: string;

  @ApiPropertyOptional({
    description: '创建时间范围结束',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString({}, { message: '结束时间必须是有效的日期格式' })
  @Expose()
  createdAtEnd?: string;

  @ApiPropertyOptional({
    description: '更新时间范围开始',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: '开始时间必须是有效的日期格式' })
  @Expose()
  updatedAtStart?: string;

  @ApiPropertyOptional({
    description: '更新时间范围结束',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString({}, { message: '结束时间必须是有效的日期格式' })
  @Expose()
  updatedAtEnd?: string;
}

/**
 * 基础查询DTO（组合分页、排序、搜索、过滤）
 */
export class BaseQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: '排序字段',
    example: 'createdAt',
  })
  @IsOptional()
  @IsString({ message: '排序字段必须是字符串' })
  @Length(1, 50, { message: '排序字段长度必须在1-50个字符之间' })
  @Matches(/^[a-zA-Z][a-zA-Z0-9_]*$/, {
    message: '排序字段只能包含字母、数字和下划线，且必须以字母开头',
  })
  sort?: string = 'createdAt';

  @ApiPropertyOptional({
    description: '排序方向',
    enum: SortOrder,
    example: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder, { message: '排序方向必须是asc或desc' })
  @Transform(({ value }) => value?.toLowerCase())
  order?: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({
    description: '搜索关键词',
    example: '关键词',
  })
  @IsOptional()
  @IsString({ message: '搜索关键词必须是字符串' })
  @Length(1, 100, { message: '搜索关键词长度必须在1-100个字符之间' })
  @Transform(({ value }) => value?.trim())
  @Expose()
  search?: string;

  @ApiPropertyOptional({
    description: '搜索字段（多个字段用逗号分隔）',
    example: 'name,description',
  })
  @IsOptional()
  @IsString({ message: '搜索字段必须是字符串' })
  @Transform(({ value }) =>
    value?.split(',').map((field: string) => field.trim()),
  )
  @Expose()
  searchFields?: string[];

  @ApiPropertyOptional({
    description: '状态过滤',
    example: 'active',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    // 如果是数字字符串，转换为数字
    if (typeof value === 'string' && /^\d+$/.test(value)) {
      return parseInt(value, 10);
    }
    return value;
  })
  @Expose()
  status?: string | number;

  @ApiPropertyOptional({
    description: '类型过滤',
    example: 'MENU',
  })
  @IsOptional()
  @IsString({ message: '类型必须是字符串' })
  @Expose()
  type?: string;

  @ApiPropertyOptional({
    description: '是否包含已删除的记录',
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean({ message: '包含已删除记录标志必须是布尔值' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  includeDeleted?: boolean = false;

  @ApiPropertyOptional({
    description: '创建时间范围开始',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: '开始时间必须是有效的日期格式' })
  createdAtStart?: string;

  @ApiPropertyOptional({
    description: '创建时间范围结束',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString({}, { message: '结束时间必须是有效的日期格式' })
  createdAtEnd?: string;

  @ApiPropertyOptional({
    description: '更新时间范围开始',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: '开始时间必须是有效的日期格式' })
  updatedAtStart?: string;

  @ApiPropertyOptional({
    description: '更新时间范围结束',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString({}, { message: '结束时间必须是有效的日期格式' })
  updatedAtEnd?: string;
}

/**
 * ID参数DTO
 */
export class IdParamDto {
  @ApiProperty({
    description: '资源ID',
    example: '1',
  })
  @Transform(({ value }) => {
    // 强制转换路径参数为字符串，处理NestJS路径参数
    if (value === null || value === undefined) {
      return value;
    }
    const stringValue = String(value).trim();
    // 确保返回的是字符串类型
    return stringValue;
  })
  @IsString({ message: 'ID必须是字符串' })
  @Matches(/^\d+$/, { message: 'ID必须是有效的数字格式' })
  @Expose()
  id: string;
}

/**
 * 批量ID DTO
 */
export class BatchIdsDto {
  @ApiProperty({
    description: 'ID列表',
    type: [String],
    example: ['1', '2'],
  })
  @IsString({ each: true, message: '每个ID必须是字符串' })
  @Matches(/^\d+$/, { each: true, message: '每个ID必须是有效的数字格式' })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @Expose()
  ids: string[];
}

/**
 * 批量操作DTO
 */
export class BatchOperationDto extends BatchIdsDto {
  @ApiPropertyOptional({
    description: '操作类型',
    example: 'delete',
  })
  @IsOptional()
  @IsString({ message: '操作类型必须是字符串' })
  @IsEnum(['delete', 'restore', 'activate', 'deactivate'], {
    message: '操作类型必须是delete、restore、activate或deactivate之一',
  })
  @Expose()
  operation?: string;

  @ApiPropertyOptional({
    description: '操作原因',
    example: '批量清理无效数据',
  })
  @IsOptional()
  @IsString({ message: '操作原因必须是字符串' })
  @Length(1, 200, { message: '操作原因长度必须在1-200个字符之间' })
  @Expose()
  reason?: string;
}

/**
 * 状态更新DTO
 */
export class StatusUpdateDto {
  @ApiProperty({
    description: '新状态',
    example: 'active',
  })
  @IsString({ message: '状态必须是字符串' })
  @Length(1, 50, { message: '状态长度必须在1-50个字符之间' })
  @Expose()
  status: string;

  @ApiPropertyOptional({
    description: '状态变更原因',
    example: '管理员手动激活',
  })
  @IsOptional()
  @IsString({ message: '变更原因必须是字符串' })
  @Length(1, 200, { message: '变更原因长度必须在1-200个字符之间' })
  @Expose()
  reason?: string;
}

/**
 * 文件上传DTO
 */
export class FileUploadDto {
  @ApiProperty({
    description: '文件名',
    example: 'document.pdf',
  })
  @IsString({ message: '文件名必须是字符串' })
  @Length(1, 255, { message: '文件名长度必须在1-255个字符之间' })
  @Expose()
  filename: string;

  @ApiProperty({
    description: '文件大小（字节）',
    example: 1024000,
  })
  @IsNumber({}, { message: '文件大小必须是数字' })
  @Min(1, { message: '文件大小不能小于1字节' })
  @Max(100 * 1024 * 1024, { message: '文件大小不能超过100MB' })
  @Expose()
  size: number;

  @ApiProperty({
    description: '文件MIME类型',
    example: 'application/pdf',
  })
  @IsString({ message: 'MIME类型必须是字符串' })
  @Matches(
    /^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_.]*$/,
    {
      message: 'MIME类型格式不正确',
    },
  )
  @Expose()
  mimetype: string;

  @ApiPropertyOptional({
    description: '文件描述',
    example: '用户上传的文档',
  })
  @IsOptional()
  @IsString({ message: '文件描述必须是字符串' })
  @Length(1, 500, { message: '文件描述长度必须在1-500个字符之间' })
  @Expose()
  description?: string;
}

/**
 * 导出查询DTO
 */
export class ExportQueryDto extends BaseQueryDto {
  @ApiPropertyOptional({
    description: '导出格式',
    enum: ['xlsx', 'csv', 'pdf'],
    default: 'xlsx',
    example: 'xlsx',
  })
  @IsOptional()
  @IsEnum(['xlsx', 'csv', 'pdf'], {
    message: '导出格式必须是xlsx、csv或pdf之一',
  })
  @Expose()
  format?: string = 'xlsx';

  @ApiPropertyOptional({
    description: '导出字段（多个字段用逗号分隔）',
    example: 'id,name,createdAt',
  })
  @IsOptional()
  @IsString({ message: '导出字段必须是字符串' })
  @Transform(({ value }) =>
    value?.split(',').map((field: string) => field.trim()),
  )
  @Expose()
  fields?: string[];

  @ApiPropertyOptional({
    description: '文件名前缀',
    example: 'users_export',
  })
  @IsOptional()
  @IsString({ message: '文件名前缀必须是字符串' })
  @Length(1, 50, { message: '文件名前缀长度必须在1-50个字符之间' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: '文件名前缀只能包含字母、数字、下划线和连字符',
  })
  @Expose()
  filenamePrefix?: string;
}
