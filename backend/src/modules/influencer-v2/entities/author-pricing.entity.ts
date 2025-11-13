import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { AuthorCore } from './author-core.entity';

/**
 * 价格报价表
 * 包含各时长价格、预期播放量等
 */
@Entity('authors_pricing', { database: 'crawler_db_v2' })
export class AuthorPricing {
  @PrimaryColumn({ type: 'text' })
  author_id: string;

  @Column({ type: 'bigint', nullable: true })
  price_1_20: number;

  @Column({ type: 'bigint', nullable: true })
  price_20_60: number;

  @Column({ type: 'bigint', nullable: true })
  price_60: number;

  @Column({ type: 'double precision', nullable: true })
  assign_cpm_suggest_price: number;

  @Column({ type: 'bigint', nullable: true })
  expected_play_num: number;

  @Column({ type: 'bigint', nullable: true })
  expected_natural_play_num: number;

  @Column({ type: 'bigint', nullable: true })
  promotion_prospective_vv: number;

  @Column({ type: 'double precision', nullable: true })
  promotion_prospective_1_20_cpm: number;

  @Column({ type: 'double precision', nullable: true })
  promotion_prospective_20_60_cpm: number;

  @Column({ type: 'double precision', nullable: true })
  promotion_prospective_60_cpm: number;

  @Column({ type: 'jsonb', nullable: true })
  assign_task_price_list: any;

  @Column({ type: 'jsonb', nullable: true })
  enroll_task_price_list: any;

  @Column({ type: 'bigint', nullable: true })
  pic_expected_play_num: number;

  @Column({ type: 'double precision', nullable: true })
  pic_expected_cpm: number;

  @Column({ type: 'integer', nullable: true })
  expected_cpa3_level: number;

  // 计算字段（数据库生成）
  @Column({ type: 'double precision', nullable: true, insert: false, update: false })
  cpm_efficiency: number;

  @Column({ type: 'text', nullable: true, insert: false, update: false })
  price_tier: string;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  // 关联关系
  @OneToOne(() => AuthorCore, core => core.pricing)
  @JoinColumn({ name: 'author_id' })
  author: AuthorCore;
}
