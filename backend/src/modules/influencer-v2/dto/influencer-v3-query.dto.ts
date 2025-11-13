import { IsOptional, IsInt, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class InfluencerV3QueryDto {
  @ApiProperty({ description: '页码', required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: '每页数量', required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiProperty({
    description: '排序方式',
    required: false,
    enum: [
      'recommended',
      'follower_desc',
      'star_index_desc',
      'interact_rate_desc',
      'price_asc',
      'price_desc',
    ],
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'recommended';

  // 快速筛选
  @ApiProperty({
    description: '达人等级',
    required: false,
    enum: ['mega', 'macro', 'micro', 'nano'],
  })
  @IsOptional()
  @IsString()
  tier?: string;

  @ApiProperty({
    description: '特殊标签',
    required: false,
    enum: ['excellent', 'black_horse', 'high_potential'],
  })
  @IsOptional()
  @IsString()
  specialTag?: string;

  @ApiProperty({
    description: '电商能力',
    required: false,
    enum: ['enabled', 'with_videos'],
  })
  @IsOptional()
  @IsString()
  ecommerce?: string;

  @ApiProperty({ description: '价格区间', required: false })
  @IsOptional()
  @IsString()
  priceRange?: string;

  @ApiProperty({ description: '省份', required: false })
  @IsOptional()
  @IsString()
  province?: string;

  // 高级筛选
  @ApiProperty({ description: '内容标签（逗号分隔）', required: false })
  @IsOptional()
  @IsString()
  contentTags?: string;

  @ApiProperty({ description: '最小粉丝数', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  followerMin?: number;

  @ApiProperty({ description: '最大粉丝数', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  followerMax?: number;

  @ApiProperty({ description: '最小互动率', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  interactRateMin?: number;

  @ApiProperty({ description: '最大互动率', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  interactRateMax?: number;

  @ApiProperty({ description: '最小星图指数', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  starIndexMin?: number;

  @ApiProperty({ description: '最大星图指数', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  starIndexMax?: number;

  @ApiProperty({ description: '性别：1-男 2-女', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  gender?: number;

  @ApiProperty({ description: '达人类型：1-个人 3-机构', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  authorType?: number;

  @ApiProperty({ 
    description: '仅展示已匹配达人（与私域达人库关联）', 
    required: false,
    default: false 
  })
  @IsOptional()
  @Type(() => Boolean)
  matchedOnly?: boolean;
}
