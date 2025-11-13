import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { AuthorCore } from './author-core.entity';

/**
 * 粉丝增长指标表
 * 包含粉丝数、增长率、增长等级等
 */
@Entity('authors_fans_metrics', { database: 'crawler_db_v2' })
export class AuthorFansMetrics {
  @PrimaryColumn({ type: 'text' })
  author_id: string;

  @Column({ type: 'bigint', default: 0 })
  follower: number;

  @Column({ type: 'bigint', nullable: true })
  fans_increment_15d: number;

  @Column({ type: 'double precision', nullable: true })
  fans_increment_rate_15d: number;

  @Column({ type: 'bigint', nullable: true })
  fans_increment_30d: number;

  @Column({ type: 'double precision', nullable: true })
  fans_increment_rate_30d: number;

  // 计算字段（数据库生成）
  @Column({ type: 'boolean', insert: false, update: false })
  is_rising_star: boolean;

  @Column({ type: 'text', nullable: true, insert: false, update: false })
  growth_level: string;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  // 关联关系
  @OneToOne(() => AuthorCore, core => core.fans_metrics)
  @JoinColumn({ name: 'author_id' })
  author: AuthorCore;
}
