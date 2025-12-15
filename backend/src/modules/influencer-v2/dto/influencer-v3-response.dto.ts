import { ApiProperty } from '@nestjs/swagger';

export class InfluencerV3CardDataDto {
  @ApiProperty({ description: '作者ID' })
  author_id: string;

  @ApiProperty({ description: '星图ID' })
  star_id: string;

  @ApiProperty({ description: '昵称' })
  nick_name: string;

  @ApiProperty({ description: '头像URI' })
  avatar_uri: string;

  @ApiProperty({ description: '性别：1-男 2-女' })
  gender: number;

  @ApiProperty({ description: '城市' })
  city: string;

  @ApiProperty({ description: '省份' })
  province: string;

  @ApiProperty({ description: '粉丝数' })
  follower: number;

  @ApiProperty({ description: '达人等级' })
  influencer_tier: string;

  // 认证标签
  @ApiProperty({ description: '是否优质作者' })
  star_excellent_author: boolean;

  @ApiProperty({ description: '是否黑马作者' })
  is_black_horse_author: boolean;

  @ApiProperty({ description: '是否千川高潜' })
  star_qianchuan_high_potential: boolean;

  // 爬虫数据字段（来自 get_author_base_info 和 get_author_platform_channel_info_v2）
  @ApiProperty({ description: 'MCN机构名称', required: false })
  mcn_name?: string;

  @ApiProperty({ description: '抖音号（unique_id）', required: false })
  unique_id?: string;

  @ApiProperty({ description: '安全ID（sec_uid）', required: false })
  sec_uid?: string;

  @ApiProperty({ description: '抖音短ID（short_id）', required: false })
  short_id?: string;

  @ApiProperty({ description: '是否有手机号', required: false })
  has_phone?: boolean;

  @ApiProperty({ description: '自我介绍（self_intro）', required: false })
  self_intro?: string;

  @ApiProperty({ description: '支持平台数组', required: false, type: [Number] })
  platform?: number[];

  @ApiProperty({ description: '支持渠道数组', required: false, type: [Number] })
  platform_channel?: number[];

  // 内容标签
  @ApiProperty({ description: '主要标签数组' })
  primary_tags: string[];

  @ApiProperty({ description: '标签总数' })
  tag_count: number;

  // 粉丝增长
  @ApiProperty({ description: '30天粉丝增长率' })
  fans_increment_rate_30d: number;

  // 互动数据
  @ApiProperty({ description: '30天互动率' })
  interact_rate_30d: number;

  @ApiProperty({ description: '30天完播率' })
  play_over_rate_30d: number;

  @ApiProperty({ description: '30天播放量中位数' })
  vv_median_30d: number;

  // 营销能力
  @ApiProperty({ description: '链接转化指数' })
  link_convert_index: number;

  @ApiProperty({ description: '链接购物指数' })
  link_shopping_index: number;

  @ApiProperty({ description: '星图指数' })
  star_index: number;

  // 价格信息
  @ApiProperty({ description: '1-20秒视频报价' })
  price_1_20: number;

  @ApiProperty({ description: '21-60秒视频报价' })
  price_20_60: number;

  @ApiProperty({ description: '60秒以上视频报价' })
  price_60: number;

  // 电商数据
  @ApiProperty({ description: '是否开通电商' })
  e_commerce_enable: boolean;

  @ApiProperty({ description: '电商等级' })
  author_ecom_level: string;

  @ApiProperty({ description: '30天星图电商视频数' })
  star_ecom_video_num_30d: number;

  @ApiProperty({ description: '30天GMV区间' })
  ecom_gmv_30d_range: string;

  @ApiProperty({ description: '电商评分' })
  ecom_score: number;

  // 操作状态
  @ApiProperty({ description: '是否已选' })
  isSelected: boolean;

  @ApiProperty({ description: '是否已收藏' })
  isFavorited: boolean;

  // 私域达人库独有字段（仅已匹配达人有值）
  @ApiProperty({ description: '是否已匹配私域达人库', required: false })
  is_matched?: boolean;

  @ApiProperty({ description: '匹配状态', required: false })
  match_status?: string;

  @ApiProperty({ description: '所属机构（私域）', required: false })
  org_name?: string;

  @ApiProperty({ description: '分类标签（私域）', required: false })
  category?: string;

  @ApiProperty({ description: '是否独家：1-是 0-否（私域）', required: false })
  is_exclusive?: number;

  @ApiProperty({ description: '返点政策描述（私域）', required: false })
  rebate_policy?: string;

  @ApiProperty({ description: '返点区间（私域）', required: false })
  rebate_range?: string;

  @ApiProperty({ description: '政策等级 A/B/C（私域）', required: false })
  policy_level?: string;

  @ApiProperty({ description: '返点账期（私域）', required: false })
  rebate_period?: string;

  @ApiProperty({ description: '支付账期（私域）', required: false })
  pay_period?: string;

  @ApiProperty({ description: '配合度：high/medium/low（私域）', required: false })
  cooperation_degree?: string;

  @ApiProperty({ description: '合作简介（私域）', required: false })
  cooperation_intro?: string;

  @ApiProperty({ description: '联系方式（私域）', required: false })
  contact_info?: any;

  @ApiProperty({ description: '备注（私域）', required: false })
  remark?: string;

  @ApiProperty({ description: '年框机构（私域）', required: false })
  annual_contract_org?: string;

  @ApiProperty({ description: '匹配时间（私域）', required: false })
  matched_at?: Date;
}

export class InfluencerV3ListResponseDto {
  @ApiProperty({ description: '达人数据列表', type: [InfluencerV3CardDataDto] })
  data: InfluencerV3CardDataDto[];

  @ApiProperty({ description: '总数' })
  total: number;

  @ApiProperty({ description: '当前页' })
  page: number;

  @ApiProperty({ description: '每页数量' })
  pageSize: number;
}

export class InfluencerV3DetailResponseDto {
  @ApiProperty({ description: '达人详细数据' })
  data: InfluencerV3CardDataDto;
}

export class InfluencerV3StatsResponseDto {
  @ApiProperty({ description: '统计数据' })
  data: {
    totalInfluencers: number;
    totalGrowth: number;
    excellentInfluencers: number;
    blackHorseInfluencers: number;
    ecommerceInfluencers: number;
    ecommerceWithVideos: number;
  };
}
