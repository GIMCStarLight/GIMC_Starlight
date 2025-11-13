import {
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  Min,
  Max,
  IsInt,
  IsBoolean,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';

export class InfluencerQueryDto {
  @ApiPropertyOptional({ description: '页码，默认为1' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '页码必须是整数' })
  @Min(1, { message: '页码必须大于0' })
  page: number = 1;

  @ApiPropertyOptional({ description: '每页数量，默认为20' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '每页数量必须是整数' })
  @Min(1, { message: '每页数量必须大于0' })
  @Max(100, { message: '每页数量不能超过100' })
  limit: number = 20;

  @ApiPropertyOptional({
    description: '昵称搜索',
    example: '美妆博主',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.trim() === ''
        ? undefined
        : value
      : undefined,
  )
  @IsString()
  nickName?: string;

  @ApiPropertyOptional({
    description: '性别筛选',
    enum: [1, 2],
    example: 1,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined;
    const num = typeof value === 'string' ? Number(value) : value;
    return Number.isFinite(num) ? num : undefined;
  })
  @Type(() => Number)
  @IsEnum([1, 2])
  gender?: number;

  @ApiPropertyOptional({
    description: '城市筛选',
    example: '北京',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.trim() === ''
        ? undefined
        : value
      : undefined,
  )
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    description: '省份筛选',
    example: '北京',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.trim() === ''
        ? undefined
        : value
      : undefined,
  )
  @IsString()
  province?: string;

  @ApiPropertyOptional({
    description: '影响力等级筛选',
    enum: ['mega', 'macro', 'micro', 'nano'],
    example: 'macro',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() !== '' ? value : undefined,
  )
  @IsEnum(['mega', 'macro', 'micro', 'nano'])
  influencerTier?: 'mega' | 'macro' | 'micro' | 'nano';

  @ApiPropertyOptional({
    description: '最小粉丝数',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) =>
    value === '' || value === undefined || value === null
      ? undefined
      : typeof value === 'string'
      ? Number.parseInt(value)
      : Number.isFinite(value)
      ? value
      : undefined,
  )
  minFollowers?: number;

  @ApiPropertyOptional({
    description: '最大粉丝数',
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) =>
    value === '' || value === undefined || value === null
      ? undefined
      : typeof value === 'string'
      ? Number.parseInt(value)
      : Number.isFinite(value)
      ? value
      : undefined,
  )
  maxFollowers?: number;

  @ApiPropertyOptional({
    description: '最小互动率',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Transform(({ value }) =>
    value === '' || value === undefined || value === null
      ? undefined
      : typeof value === 'string'
      ? Number.parseFloat(value)
      : Number.isFinite(value)
      ? value
      : undefined,
  )
  minEngagementRate?: number;

  @ApiPropertyOptional({
    description: '最大互动率',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Transform(({ value }) =>
    value === '' || value === undefined || value === null
      ? undefined
      : typeof value === 'string'
      ? Number.parseFloat(value)
      : Number.isFinite(value)
      ? value
      : undefined,
  )
  maxEngagementRate?: number;

  @ApiPropertyOptional({
    description: '是否认证',
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined;
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return undefined;
  })
  verified?: boolean;

  @ApiPropertyOptional({
    description: '地理位置',
    example: '北京市朝阳区',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.trim() === ''
        ? undefined
        : value
      : undefined,
  )
  @IsString()
  location?: string;

  @ApiPropertyOptional({
    description: '标签ID列表，逗号分隔',
    example: '1,2,3',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.trim() === ''
        ? undefined
        : value
      : undefined,
  )
  @IsString()
  tagIds?: string;

  @ApiPropertyOptional({
    description: '达人类型筛选',
    enum: [1, 3],
    example: 1,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === '' || value === undefined || value === null) return undefined;
    const num = typeof value === 'string' ? Number(value) : value;
    return Number.isFinite(num) ? num : undefined;
  })
  @Type(() => Number)
  @IsEnum([1, 3])
  authorType?: number;

  @ApiPropertyOptional({
    description: '关键词搜索',
    example: '美妆博主',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.trim() === ''
        ? undefined
        : value
      : undefined,
  )
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: '平台筛选',
    example: 'xiaohongshu',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.trim() === ''
        ? undefined
        : value
      : undefined,
  )
  @IsString()
  platform?: string;

  @ApiPropertyOptional({
    description: '分类筛选',
    example: '美妆',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value.trim() === ''
        ? undefined
        : value
      : undefined,
  )
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: '排序字段',
    enum: [
      'follower',
      'created_at',
      'updated_at',
      'nick_name',
      'star_index',
      'price_1_20',
    ],
    default: 'follower',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() !== '' ? value : undefined,
  )
  @IsEnum([
    'follower',
    'created_at',
    'updated_at',
    'nick_name',
    'star_index',
    'price_1_20',
  ])
  sortBy?: string = 'follower';

  @ApiPropertyOptional({
    description: '排序方向',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() !== '' ? value : undefined,
  )
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
