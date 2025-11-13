import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * 游戏达人数据表
 * 垂直领域层 - 低频访问
 */
@Entity('authors_game_data', { database: 'crawler_db_v2' })
export class AuthorGameData {
  @PrimaryColumn({ type: 'text' })
  author_id: string;

  @Column({ type: 'text', nullable: true })
  game_type: string;

  @Column({ type: 'bigint', nullable: true })
  game_item_count_90d: number;

  @Column({ type: 'jsonb', nullable: true })
  median_game_item_component_click_range: any;

  @Column({ type: 'jsonb', nullable: true })
  median_game_item_cpc_range: any;

  // 计算字段
  @Column({ type: 'boolean', default: false })
  is_game_creator: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
