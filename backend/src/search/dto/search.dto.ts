import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsEnum,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum SortField {
  RELEVANCE = 'relevance',
  FOLLOWERS = 'followers',
  ENGAGEMENT_RATE = 'engagement_rate',
  CREATED_AT = 'created_at',
  UPDATED_AT = 'updated_at',
}

export enum Platform {
  DOUYIN = 'douyin',
  XIAOHONGSHU = 'xiaohongshu',
  WEIBO = 'weibo',
  BILIBILI = 'bilibili',
}

export class SearchInfluencerDto {
  @ApiPropertyOptional({ description: '搜索关键词' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({
    description: '平台筛选',
    enum: Platform,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(Platform, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  platforms?: Platform[];

  @ApiPropertyOptional({ description: '标签筛选' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  tags?: string[];

  @ApiPropertyOptional({ description: '最小粉丝数' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minFollowers?: number;

  @ApiPropertyOptional({ description: '最大粉丝数' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxFollowers?: number;

  @ApiPropertyOptional({ description: '最小互动率（百分比）' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  minEngagementRate?: number;

  @ApiPropertyOptional({ description: '最大互动率（百分比）' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  maxEngagementRate?: number;

  @ApiPropertyOptional({ description: '地区筛选' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  regions?: string[];

  @ApiPropertyOptional({ description: '性别筛选' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ description: '年龄范围-最小' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  minAge?: number;

  @ApiPropertyOptional({ description: '年龄范围-最大' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  maxAge?: number;

  @ApiPropertyOptional({ description: '是否认证' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isVerified?: boolean;

  @ApiPropertyOptional({
    description: '排序字段',
    enum: SortField,
    default: SortField.RELEVANCE,
  })
  @IsOptional()
  @IsEnum(SortField)
  sortBy?: SortField = SortField.RELEVANCE;

  @ApiPropertyOptional({
    description: '排序方向',
    enum: SortOrder,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  size?: number = 20;

  @ApiPropertyOptional({ description: '是否使用缓存', default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  useCache?: boolean = true;
}

export class SearchSuggestionDto {
  @ApiProperty({ description: '搜索查询' })
  @IsString()
  query: string;

  @ApiPropertyOptional({ description: '建议数量', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  size?: number = 10;
}

export class SearchResultDto {
  @ApiProperty({ description: '搜索结果' })
  items: any[];

  @ApiProperty({ description: '总数量' })
  total: number;

  @ApiProperty({ description: '当前页' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  size: number;

  @ApiProperty({ description: '总页数' })
  totalPages: number;

  @ApiProperty({ description: '是否有下一页' })
  hasNext: boolean;

  @ApiProperty({ description: '是否有上一页' })
  hasPrev: boolean;

  @ApiProperty({ description: '搜索耗时（毫秒）' })
  took: number;

  @ApiProperty({ description: '是否来自缓存' })
  fromCache: boolean;

  @ApiPropertyOptional({ description: '聚合结果' })
  aggregations?: any;
}
