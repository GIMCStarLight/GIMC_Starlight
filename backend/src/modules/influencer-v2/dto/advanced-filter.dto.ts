import {
  IsOptional,
  IsInt,
  IsString,
  IsArray,
  IsNumber,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * 高级筛选DTO
 * 对应优化方案中的快速筛选和高级筛选维度
 */

// 枚举定义
export enum QualityTier {
  PREMIUM = 'premium',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum GrowthLevel {
  EXPLOSIVE = 'explosive',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  STAGNANT = 'stagnant',
}

export enum PriceTier {
  LOW = 'low', // 基础型: 1-5千元
  MEDIUM = 'medium', // 标准型: 5千-2万元
  HIGH = 'high', // 高端型: 2万-5万元
  PREMIUM = 'premium', // 顶级型: 5万元以上
}

export enum InfluencerTier {
  MEGA = 'mega', // 顶流 1000万+
  MACRO = 'macro', // 头部 100-1000万
  MID = 'mid', // 腰部 10-100万
  MICRO = 'micro', // 小微 1-10万
  NANO = 'nano', // 新星 1万以下
}

export enum EcomCapability {
  TOP = 'top',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  DISABLED = 'disabled',
}

/**
 * 快速筛选DTO
 */
export class QuickFilterDto {
  // 第1行 - 业务场景 (暂时不在后端实现,由前端组合多个筛选条件)

  // 第2行 - 内容定位
  @IsOptional()
  @IsArray()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  primaryTags?: string[];

  // 第3行 - 数据表现
  @IsOptional()
  @IsEnum(QualityTier)
  qualityTier?: QualityTier;

  @IsOptional()
  @IsEnum(GrowthLevel)
  growthLevel?: GrowthLevel;

  // 第4行 - 预算规模
  @IsOptional()
  @IsEnum(PriceTier)
  priceTier?: PriceTier;

  @IsOptional()
  @IsEnum(InfluencerTier)
  influencerTier?: InfluencerTier;
}

/**
 * 高级筛选DTO
 */
export class AdvancedFilterDto extends QuickFilterDto {
  // ========== 1. 基础维度 ==========

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsEnum(['M', 'F', 'U'])
  gender?: 'M' | 'F' | 'U';

  // ========== 2. 粉丝维度 ==========

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minFollowers?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxFollowers?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-1)
  @Max(10)
  minGrowthRate30d?: number; // 30天增长率

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-1)
  @Max(10)
  maxGrowthRate30d?: number;

  // ========== 3. 数据表现维度 ==========

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  minInteractRate?: number; // 互动率

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  maxInteractRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  minPlayOverRate?: number; // 完播率

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  maxPlayOverRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minVvMedian?: number; // 中位播放量

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxVvMedian?: number;

  // ========== 4. 价格维度 ==========

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice20_60?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice20_60?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minCpmEfficiency?: number; // CPM性价比

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxCpmEfficiency?: number;

  // ========== 5. 电商维度 ==========

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  ecommerceEnabled?: boolean;

  @IsOptional()
  @IsEnum(EcomCapability)
  ecomCapabilityTier?: EcomCapability;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minGmv30d?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxGmv30d?: number;

  // ========== 6. 营销维度 ==========

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minConvertIndex?: number; // 转化指数

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minShoppingIndex?: number; // 种草指数

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minSpreadIndex?: number; // 传播指数

  // ========== 7. 认证标签维度 ==========

  @IsOptional()
  @IsString()
  orgName?: string; // 机构筛选（省广星媒、星链达人等）

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  excellentAuthor?: boolean; // 优质达人

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  blackHorse?: boolean; // 黑马达人

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  risingStart?: boolean; // 新星达人

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  highPotential?: boolean; // 高潜达人

  // ========== 8. 预期指标维度 ==========

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minExpectedPlayNum?: number; // 预期播放量

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxExpectedPlayNum?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minExpectedCpm?: number; // 预期CPM

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxExpectedCpm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minExpectedCpe?: number; // 预期CPE

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxExpectedCpe?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  minBurstRate?: number; // 爆文率

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  maxBurstRate?: number;

  // ========== 9. 匹配相关 ==========

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  matchedOnly?: boolean; // 仅展示已匹配达人（与私域达人库关联）
}

/**
 * 分页参数
 */
export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: string = 'follower'; // 默认按粉丝数排序

  @IsOptional()
  @IsString()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

/**
 * 组合查询DTO
 */
export class AuthorFilterQueryDto extends AdvancedFilterDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: string = 'follower';

  @IsOptional()
  @IsString()
  @IsEnum(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
