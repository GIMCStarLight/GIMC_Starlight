import { ApiProperty } from '@nestjs/swagger';

export class InfluencerBasicDto {
  @ApiProperty({ description: '作者ID' })
  authorId: string;

  @ApiProperty({ description: '星图ID' })
  starId: string;

  @ApiProperty({ description: '昵称' })
  nickName: string;

  @ApiProperty({ description: '头像URI' })
  avatarUri: string;

  @ApiProperty({ description: '粉丝数' })
  follower: number;

  @ApiProperty({ description: '作者类型' })
  authorType: string;

  @ApiProperty({ description: '性别' })
  gender: string;

  @ApiProperty({ description: '城市' })
  city: string;

  @ApiProperty({ description: '省份' })
  province: string;

  @ApiProperty({ description: '星图指数' })
  starIndex: number;

  @ApiProperty({ description: '1-20秒报价' })
  price_1_20: number;

  @ApiProperty({ description: '20-60秒报价' })
  price_20_60: number;

  @ApiProperty({ description: '60秒以上报价' })
  price_60: number;

  @ApiProperty({ description: '30日播放量中位数' })
  vv_median_30d: number;

  @ApiProperty({ description: '30日互动率' })
  interact_rate_within_30d: number;

  @ApiProperty({ description: '90日星图视频数' })
  star_video_cnt_90d: number;

  @ApiProperty({ description: '电商开通状态' })
  eCommerceEnable: boolean;

  @ApiProperty({ description: '是否优质作者' })
  isExcellentAuthor: boolean;

  @ApiProperty({ description: '是否黑马作者' })
  isBlackHorseAuthor: boolean;

  @ApiProperty({ description: '是否共创作者' })
  isCocreateAuthor: boolean;

  @ApiProperty({ description: '是否短剧作者' })
  isShortDrama: boolean;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({
    description: '影响力等级',
    enum: ['mega', 'macro', 'micro', 'nano'],
  })
  influencerTier: 'mega' | 'macro' | 'micro' | 'nano';

  @ApiProperty({ description: '地理位置' })
  location: string;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}

export class PriceExtraInfoDto {
  @ApiProperty({ description: '价格上限', required: false })
  ceiling_price?: string;

  @ApiProperty({ description: '价格下限', required: false })
  floor_price?: string;
}

export class TaskPriceDto {
  @ApiProperty({ description: '结束时间', required: false })
  end_time?: string;

  @ApiProperty({ description: '平台来源', required: false })
  platform_source?: number;

  @ApiProperty({ description: '价格', required: false })
  price?: number;

  @ApiProperty({
    type: PriceExtraInfoDto,
    description: '价格额外信息',
    required: false,
  })
  price_extra_info?: PriceExtraInfoDto;

  @ApiProperty({ description: '开始时间', required: false })
  start_time?: string;

  @ApiProperty({ description: '任务类别', required: false })
  task_category?: number;

  @ApiProperty({ description: '视频类型', required: false })
  video_type?: number;

  @ApiProperty({ description: '视频类型状态', required: false })
  video_type_status?: number;
}

export class LastItemDto {
  @ApiProperty({ required: false })
  item_id?: string;

  @ApiProperty({ required: false })
  video_tag?: number;

  @ApiProperty({ required: false })
  vv?: number;
}

export class ExtraDataDto {
  @ApiProperty({
    description: '近180天内容主题标签',
    type: () => [String],
    nullable: true,
  })
  content_theme_labels_180d?: string[] | null;

  @ApiProperty({
    description: '标签关联',
    type: 'object',
    additionalProperties: true,
    nullable: true,
  })
  tags_relation?: Record<string, unknown>;

  @ApiProperty({
    description: '最近10个作品',
    type: () => [LastItemDto],
    nullable: true,
  })
  last_10_items?: LastItemDto[] | null;

  @ApiProperty({
    description: '各行业转化指数',
    type: 'object',
    additionalProperties: { type: 'number' },
    nullable: true,
  })
  link_convert_index_by_industry?: Record<string, number> | null;

  @ApiProperty({
    description: '各行业推荐指数',
    type: 'object',
    additionalProperties: { type: 'number' },
    nullable: true,
  })
  link_recommend_index_by_industry?: Record<string, number> | null;

  @ApiProperty({
    description: '各行业传播指数',
    type: 'object',
    additionalProperties: { type: 'number' },
    nullable: true,
  })
  link_spread_index_by_industry?: Record<string, number> | null;

  @ApiProperty({
    description: '各行业星图指数',
    type: 'object',
    additionalProperties: { type: 'number' },
    nullable: true,
  })
  link_star_index_by_industry?: Record<string, number> | null;

  @ApiProperty({
    description: '各行业用户类型',
    type: 'object',
    additionalProperties: true,
    nullable: true,
  })
  link_user_type_by_industry?: Record<string, unknown>;
}

export class InfluencerDetailDto extends InfluencerBasicDto {
  @ApiProperty({ description: '1-20s视频价格' })
  price1To20: number;

  @ApiProperty({ description: '20-60s视频价格' })
  price20To60: number;

  @ApiProperty({ description: '60s以上视频价格' })
  price60Plus: number;

  @ApiProperty({
    description: '统一任务价格列表',
    type: () => [TaskPriceDto],
    nullable: true,
  })
  unifiedTaskPriceList: TaskPriceDto[] | null;

  @ApiProperty({ description: '额外信息', type: ExtraDataDto, nullable: true })
  extra: ExtraDataDto | null;
}

export class PaginationDto {
  @ApiProperty({ description: '当前页码' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  limit: number;

  @ApiProperty({ description: '总数量' })
  total: number;

  @ApiProperty({ description: '总页数' })
  totalPages: number;
}

export class InfluencerListResponseDto {
  @ApiProperty({ type: [InfluencerBasicDto], description: '影响者列表' })
  data: InfluencerBasicDto[];

  @ApiProperty({ type: PaginationDto, description: '分页信息' })
  pagination: PaginationDto;
}

export class InfluencerDetailResponseDto {
  @ApiProperty({ type: InfluencerDetailDto, description: '影响者详情' })
  data: InfluencerDetailDto;
}
