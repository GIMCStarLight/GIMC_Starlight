import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * 电商数据表
 * 包含电商能力、GMV、带货数据等
 */
@Entity('authors_ecommerce', { database: 'crawler_db_v2' })
export class AuthorEcommerce {
  @PrimaryColumn({ type: 'text' })
  author_id: string;

  @Column({ type: 'boolean', default: false })
  e_commerce_enable: boolean;

  @Column({ type: 'text', nullable: true })
  author_ecom_level: string;

  @Column({ type: 'bigint', nullable: true })
  star_ecom_video_num_30d: number;

  @Column({ type: 'bigint', nullable: true })
  ecom_video_product_num_30d: number;

  @Column({ type: 'bigint', nullable: true })
  star_ecom_video_product_num_30d: number;

  @Column({ type: 'jsonb', nullable: true })
  ecom_gmv_30d_range: any;

  @Column({ type: 'jsonb', nullable: true })
  ecom_avg_order_value_30d_range: any;

  @Column({ type: 'jsonb', nullable: true })
  ecom_gpm_30d_range: any;

  @Column({ type: 'jsonb', nullable: true })
  ecom_gpm_30days_range: any;

  @Column({ type: 'double precision', nullable: true })
  ecom_score: number;

  @Column({ type: 'bigint', nullable: true })
  ecom_watch_pv_30d: number;

  @Column({ type: 'jsonb', nullable: true })
  ecom_video_ctr_30d_range: any;

  @Column({ type: 'jsonb', nullable: true })
  ecom_video_mid_click_pv_30d_range: any;

  @Column({ type: 'jsonb', nullable: true })
  avg_sale_amount_range: any;

  @Column({ type: 'jsonb', nullable: true })
  star_ecom_main_price_30days: any;

  // 计算字段（数据库生成）
  @Column({ type: 'text', nullable: true, insert: false, update: false })
  ecom_capability_tier: string;

  @Column({ type: 'boolean', insert: false, update: false })
  is_ecom_active: boolean;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
