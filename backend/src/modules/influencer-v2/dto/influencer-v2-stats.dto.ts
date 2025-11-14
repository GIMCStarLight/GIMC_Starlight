import { ApiProperty } from '@nestjs/swagger';

export class GenderStatDto {
  @ApiProperty({ description: '性别', example: '男' })
  gender: string;

  @ApiProperty({ description: '数量', example: 1500 })
  count: number;
}

export class AuthorTypeStatDto {
  @ApiProperty({ description: '达人类型', example: '个人' })
  type: string;

  @ApiProperty({ description: '数量', example: 2000 })
  count: number;
}

export class TierStatDto {
  @ApiProperty({ description: '影响力等级', example: 'macro', enum: ['mega', 'macro', 'micro', 'nano'] })
  tier: string;

  @ApiProperty({ description: '数量', example: 800 })
  count: number;
}

export class InfluencerV2StatsDto {
  @ApiProperty({ description: '总达人数', example: 5000 })
  totalCount: number;

  @ApiProperty({ description: '性别分布统计', type: [GenderStatDto] })
  genderStats: GenderStatDto[];

  @ApiProperty({ description: '达人类型分布统计', type: [AuthorTypeStatDto] })
  authorTypeStats: AuthorTypeStatDto[];

  @ApiProperty({ description: '影响力等级分布统计', type: [TierStatDto] })
  tierStats: TierStatDto[];
}
