import { Entity, Column, PrimaryColumn } from 'typeorm';

/**
 * 综合筛选物化视图
 * 对应数据库中的 mv_authors_combined
 * 整合了所有筛选所需的字段,提供最佳查询性能
 */
@Entity({
  name: 'mv_authors_combined',
  synchronize: false, // 物化视图不参与schema同步
})
export class MvAuthorsCombined {
  // ========== 核心信息 ==========

  @PrimaryColumn()
  author_id: string;

  @Column()
  star_id: string;

  @Column()
  nick_name: string;

  @Column()
  avatar_uri: string;

  @Column()
  city: string;

  @Column()
  province: string;

  @Column('smallint', { nullable: true })
  gender: number;

  @Column()
  author_type: number;

  // ========== 认证标签 ==========

  @Column()
  star_excellent_author: boolean;

  @Column()
  is_black_horse_author: boolean;

  @Column()
  star_qianchuan_high_potential: boolean;

  @Column()
  is_short_drama: boolean;

  @Column()
  is_cocreate_author: boolean;

  @Column()
  is_cpm_project_author: boolean;

  @Column()
  is_ad_star_cur_high_quality_author: boolean;

  // ========== 计算字段(快速筛选用) ==========

  @Column('double precision', { nullable: true })
  star_index: number;

  @Column({ nullable: true })
  growth_level: string; // explosive/high/medium/low/stagnant

  @Column({ nullable: true })
  is_rising_star: boolean;

  @Column({ nullable: true })
  quality_tier: string; // premium/high/medium/low

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  engagement_score: number;

  @Column({ nullable: true })
  price_tier: string; // economy/standard/premium/luxury

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  cpm_efficiency: number;

  // ========== 粉丝指标 ==========

  @Column('bigint', { nullable: true })
  follower: number;

  @Column('int', { nullable: true })
  fans_increment_30d: number;

  @Column('decimal', { precision: 10, scale: 6, nullable: true })
  fans_increment_rate_30d: number;

  @Column('int', { nullable: true })
  fans_increment_15d: number;

  @Column('decimal', { precision: 10, scale: 6, nullable: true })
  fans_increment_rate_15d: number;

  // ========== 互动指标 ==========

  @Column('decimal', { precision: 10, scale: 6, nullable: true })
  interact_rate_30d: number;

  @Column('decimal', { precision: 10, scale: 6, nullable: true })
  play_over_rate_30d: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  vv_median_30d: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  interaction_median_30d: number;

  @Column('decimal', { precision: 10, scale: 6, nullable: true })
  sn_interact_rate_30d: number;

  @Column('decimal', { precision: 10, scale: 6, nullable: true })
  sn_play_over_rate_30d: number;

  // ========== 价格指标 ==========

  @Column('int', { nullable: true })
  price_1_20: number;

  @Column('int', { nullable: true })
  price_20_60: number;

  @Column('int', { nullable: true })
  price_60: number;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  expected_play_num: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  assign_cpm_suggest_price: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  promotion_prospective_20_60_cpm: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  sn_prospective_20_60_cpe: number;

  // ========== 营销指数 ==========

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  link_convert_index: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  link_shopping_index: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  link_spread_index: number;

  // ========== 电商能力 ==========

  @Column()
  e_commerce_enable: boolean;

  @Column()
  author_ecom_level: string;

  @Column('bigint', { nullable: true })
  star_ecom_video_num_30d: number;

  @Column('bigint', { nullable: true })
  gmv_30d: number;

  @Column()
  ecom_capability_tier: string;

  @Column()
  is_ecom_active: boolean;

  // ========== 内容标签 ==========

  @Column('text', { array: true, nullable: true })
  primary_tags: string[];

  @Column('text', { array: true, nullable: true })
  primary_themes: string[];

  @Column()
  tag_count: number;

  // ========== 时间戳 ==========

  @Column()
  updated_at: Date;

  @Column()
  last_crawled_at: Date;
}
