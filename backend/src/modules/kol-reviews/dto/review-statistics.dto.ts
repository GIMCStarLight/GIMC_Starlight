import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ScoreDistributionDto {
  @ApiProperty({ description: '评分值', example: 5 })
  score: number;

  @ApiProperty({ description: '该评分的数量', example: 120 })
  count: number;

  @ApiProperty({ description: '占比（百分比）', example: 24.5 })
  percentage?: number;
}

export class ReviewStatisticsDto {
  @ApiProperty({ description: '总达人数', example: 500 })
  totalInfluencers: number;

  @ApiProperty({ description: '总评价数', example: 1200 })
  totalReviews: number;

  @ApiProperty({ description: '平均评分', example: 4.2 })
  averageScore: number;

  @ApiProperty({ description: '今日新增评价数', example: 15 })
  todayReviews: number;

  @ApiProperty({ 
    description: '评分分布', 
    type: [ScoreDistributionDto],
    example: [
      { score: 5, count: 500, percentage: 41.7 },
      { score: 4, count: 400, percentage: 33.3 },
      { score: 3, count: 200, percentage: 16.7 },
      { score: 2, count: 80, percentage: 6.7 },
      { score: 1, count: 20, percentage: 1.7 },
    ]
  })
  scoreDistribution: ScoreDistributionDto[];

  @ApiPropertyOptional({ description: '按审核状态分布', example: { pending: 50, approved: 1100, rejected: 50 } })
  auditStatusDistribution?: Record<string, number>;
}
