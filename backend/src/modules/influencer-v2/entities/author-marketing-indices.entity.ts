import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * 营销指数表
 * 包含链接转化、购物、传播、星图指数等
 */
@Entity('authors_marketing_indices', { database: 'crawler_db_v2' })
export class AuthorMarketingIndices {
  @PrimaryColumn({ type: 'text' })
  author_id: string;

  @Column({ type: 'double precision', nullable: true })
  link_convert_index: number;

  @Column({ type: 'double precision', nullable: true })
  link_shopping_index: number;

  @Column({ type: 'double precision', nullable: true })
  link_spread_index: number;

  @Column({ type: 'double precision', nullable: true })
  link_star_index: number;

  @Column({ type: 'double precision', nullable: true })
  star_index: number;

  @Column({ type: 'jsonb', nullable: true })
  link_convert_index_by_industry: any;

  @Column({ type: 'jsonb', nullable: true })
  link_spread_index_by_industry: any;

  @Column({ type: 'jsonb', nullable: true })
  link_star_index_by_industry: any;

  @Column({ type: 'jsonb', nullable: true })
  link_recommend_index_by_industry: any;

  @Column({ type: 'jsonb', nullable: true })
  search_after_view_index_by_industry: any;

  // 计算字段（数据库生成）
  @Column({ type: 'double precision', nullable: true, insert: false, update: false })
  marketing_power_score: number;

  @Column({ type: 'text', nullable: true, insert: false, update: false })
  marketing_tier: string;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
