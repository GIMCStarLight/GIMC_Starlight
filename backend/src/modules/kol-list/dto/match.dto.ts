import {
  IsOptional,
  IsNumber,
  IsString,
  IsEnum,
  IsArray,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MatchStatus } from '../../../database/entities/kol-list.entity';
import { ReviewStatus } from '../../../database/entities/kol-private-matches.entity';

export class BatchMatchDto {
  @ApiPropertyOptional({
    description: '批次大小',
    minimum: 1,
    maximum: 1000,
    default: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  @Type(() => Number)
  batchSize?: number = 100;

  @ApiPropertyOptional({
    description: '最小置信度',
    minimum: 0,
    maximum: 1,
    default: 0.6,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  minConfidence?: number = 0.6;

  @ApiPropertyOptional({
    description: '是否启用缓存',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enableCache?: boolean = true;

  @ApiPropertyOptional({
    description: '指定平台列表',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  platforms?: string[];
}

export class ConfirmMatchDto {
  @ApiProperty({
    description: '公海达人ID',
  })
  @IsString()
  publicAuthorId: string;

  @ApiPropertyOptional({
    description: '确认备注',
  })
  @IsOptional()
  @IsString()
  remark?: string;
}

export class RejectMatchDto {
  @ApiProperty({
    description: '公海达人ID',
  })
  @IsString()
  publicAuthorId: string;

  @ApiPropertyOptional({
    description: '拒绝原因',
  })
  @IsOptional()
  @IsString()
  remark?: string;
}

export class QueryMatchesDto {
  @ApiPropertyOptional({
    description: '页码',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页数量',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: '匹配状态',
    enum: MatchStatus,
  })
  @IsOptional()
  @IsEnum(MatchStatus)
  matchStatus?: MatchStatus;

  @ApiPropertyOptional({
    description: '审核状态',
    enum: ReviewStatus,
  })
  @IsOptional()
  @IsEnum(ReviewStatus)
  reviewStatus?: ReviewStatus;

  @ApiPropertyOptional({
    description: '平台',
  })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({
    description: '账号名称（模糊搜索）',
  })
  @IsOptional()
  @IsString()
  accountName?: string;

  @ApiPropertyOptional({
    description: '最小置信度',
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Type(() => Number)
  minConfidence?: number;
}

export class MatchCandidateResponseDto {
  @ApiProperty({ description: '公海达人ID' })
  publicAuthorId: string;

  @ApiProperty({ description: '匹配置信度' })
  confidence: number;

  @ApiProperty({ description: '匹配方法' })
  method: string;

  @ApiProperty({ description: '匹配详情' })
  details: Record<string, unknown>;

  @ApiPropertyOptional({ description: '公海数据快照' })
  publicSnapshot?: Record<string, unknown>;
}

export class MatchResultResponseDto {
  @ApiProperty({ description: '私域达人ID' })
  privateKolId: number;

  @ApiProperty({
    description: '匹配候选列表',
    type: [MatchCandidateResponseDto],
  })
  candidates: MatchCandidateResponseDto[];

  @ApiProperty({ description: '候选总数' })
  totalCandidates: number;
}

export class BatchMatchResponseDto {
  @ApiProperty({ description: '匹配结果列表', type: [MatchResultResponseDto] })
  results: MatchResultResponseDto[];

  @ApiProperty({ description: '处理总数' })
  totalProcessed: number;

  @ApiProperty({ description: '成功匹配数' })
  successMatched: number;

  @ApiProperty({ description: '处理时间（毫秒）' })
  processingTime: number;
}

export class MatchStatisticsDto {
  @ApiProperty({ description: '私域达人总数', example: 1000 })
  totalPrivateKols: number;

  @ApiProperty({ description: '已匹配数量', example: 450 })
  matchedCount: number;

  @ApiProperty({ description: '待审核数量', example: 100 })
  pendingCount: number;

  @ApiProperty({ description: '未匹配数量', example: 450 })
  unmatchedCount: number;

  @ApiProperty({ description: '匹配率（百分比）', example: 45.0 })
  matchRate: number;

  @ApiPropertyOptional({ description: '按平台分布', example: { douyin: 300, kuaishou: 150 } })
  platformDistribution?: Record<string, number>;

  @ApiPropertyOptional({ description: '按状态分布', example: { matched: 450, pending: 100, unmatched: 450 } })
  statusDistribution?: Record<string, number>;
}
