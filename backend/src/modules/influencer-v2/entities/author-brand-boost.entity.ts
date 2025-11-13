import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * 品牌提升数据表
 * 品牌层 - 低频访问
 */
@Entity('authors_brand_boost', { database: 'crawler_db_v2' })
export class AuthorBrandBoost {
  @PrimaryColumn({ type: 'text' })
  author_id: string;

  @Column({ type: 'bigint', nullable: true })
  brand_boost_vv: number;

  @Column({ type: 'boolean', nullable: true })
  video_brand_boost: boolean;

  @Column({ type: 'bigint', nullable: true })
  video_brand_boost_vv: number;

  @Column({ type: 'boolean', nullable: true })
  pic_brand_boost: boolean;

  @Column({ type: 'bigint', nullable: true })
  pic_brand_boost_vv: number;

  // 计算字段
  @Column({ type: 'text', nullable: true })
  brand_capability_tier: string; // top, high, medium, low

  @Column({ type: 'double precision', nullable: true })
  brand_capability_score: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
