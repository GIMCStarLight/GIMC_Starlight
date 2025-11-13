import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * 工具垂直领域表
 * 垂直领域层 - 低频访问
 */
@Entity('authors_tool_vertical', { database: 'crawler_db_v2' })
export class AuthorToolVertical {
  @PrimaryColumn({ type: 'text' })
  author_id: string;

  @Column({ type: 'bigint', nullable: true })
  tool_item_count_90d: number;

  @Column({ type: 'jsonb', nullable: true })
  median_tool_item_component_click_range: any;

  @Column({ type: 'jsonb', nullable: true })
  median_tool_item_cpc_range: any;

  // 计算字段
  @Column({ type: 'boolean', default: false })
  is_tool_creator: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
