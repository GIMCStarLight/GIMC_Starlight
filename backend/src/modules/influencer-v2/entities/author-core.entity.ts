import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, OneToOne } from 'typeorm';
import { AuthorFansMetrics } from './author-fans-metrics.entity';
import { AuthorEngagementMetrics } from './author-engagement-metrics.entity';
import { AuthorPricing } from './author-pricing.entity';

/**
 * 作者核心信息表
 * 高频访问，包含基础信息和身份标识
 */
@Entity('authors_core', { database: 'crawler_db_v2' })
export class AuthorCore {
  @PrimaryColumn({ type: 'text' })
  author_id: string;

  @Column({ type: 'text', nullable: true })
  star_id: string;

  @Column({ type: 'bigint', nullable: true })
  core_user_id: number;

  @Column({ type: 'text', default: '未知' })
  nick_name: string;

  @Column({ type: 'text', nullable: true })
  avatar_uri: string;

  @Column({ type: 'integer', nullable: true })
  gender: number;

  @Column({ type: 'text', nullable: true })
  city: string;

  @Column({ type: 'text', nullable: true })
  province: string;

  @Column({ type: 'integer', nullable: true })
  author_type: number;

  @Column({ type: 'integer', nullable: true })
  author_status: number;

  @Column({ type: 'integer', nullable: true })
  grade: number;

  @Column({ type: 'bigint', default: 0 })
  follower: number;

  @Column({ type: 'double precision', nullable: true })
  star_index: number;

  @Column({ type: 'boolean', default: false })
  star_excellent_author: boolean;

  @Column({ type: 'boolean', default: false })
  is_black_horse_author: boolean;

  @Column({ type: 'boolean', default: false })
  is_cocreate_author: boolean;

  @Column({ type: 'boolean', default: false })
  is_cpm_project_author: boolean;

  @Column({ type: 'boolean', default: false })
  is_short_drama: boolean;

  @Column({ type: 'boolean', default: false })
  is_ad_star_cur_high_quality_author: boolean;

  @Column({ type: 'boolean', default: false })
  star_qianchuan_high_potential: boolean;

  // 爬虫数据字段（来自 get_author_base_info 和 get_author_platform_channel_info_v2）
  @Column({ type: 'text', nullable: true })
  unique_id: string;

  @Column({ type: 'text', nullable: true })
  sec_uid: string;

  @Column({ type: 'text', nullable: true })
  short_id: string;

  @Column({ type: 'boolean', default: false })
  has_phone: boolean;

  @Column({ type: 'text', nullable: true })
  mcn_name: string;

  @Column({ type: 'text', nullable: true })
  self_intro: string;

  @Column({ type: 'integer', array: true, nullable: true })
  platform: number[];

  @Column({ type: 'integer', array: true, nullable: true })
  platform_channel: number[];

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  last_crawled_at: Date;

  // 关联关系
  @OneToOne(() => AuthorFansMetrics, fans => fans.author)
  fans_metrics: AuthorFansMetrics;

  @OneToOne(() => AuthorEngagementMetrics, engagement => engagement.author)
  engagement_metrics: AuthorEngagementMetrics;

  @OneToOne(() => AuthorPricing, pricing => pricing.author)
  pricing: AuthorPricing;
}
