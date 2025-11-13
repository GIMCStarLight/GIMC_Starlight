import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { AuthorCore } from './author-core.entity';

/**
 * 互动播放指标表
 * 包含互动率、播放完成率、中位数等
 */
@Entity('authors_engagement_metrics', { database: 'crawler_db_v2' })
export class AuthorEngagementMetrics {
  @PrimaryColumn({ type: 'text' })
  author_id: string;

  @Column({ type: 'double precision', nullable: true })
  interact_rate_30d: number;

  @Column({ type: 'double precision', nullable: true })
  play_over_rate_30d: number;

  @Column({ type: 'double precision', nullable: true })
  vv_median_30d: number;

  @Column({ type: 'bigint', nullable: true })
  interaction_median_30d: number;

  @Column({ type: 'double precision', nullable: true })
  sn_interact_rate_30d: number;

  @Column({ type: 'double precision', nullable: true })
  sn_play_over_rate_30d: number;

  @Column({ type: 'double precision', nullable: true })
  avg_search_after_view_rate_30d: number;

  @Column({ type: 'double precision', nullable: true })
  burst_text_rate: number;

  // 计算字段（数据库生成）
  @Column({ type: 'double precision', nullable: true, insert: false, update: false })
  engagement_score: number;

  @Column({ type: 'text', nullable: true, insert: false, update: false })
  quality_tier: string;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  // 关联关系
  @OneToOne(() => AuthorCore, core => core.engagement_metrics)
  @JoinColumn({ name: 'author_id' })
  author: AuthorCore;
}
