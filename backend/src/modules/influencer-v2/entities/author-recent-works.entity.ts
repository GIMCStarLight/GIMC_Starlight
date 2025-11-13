import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * 最近作品表
 * 作品层 - 低频访问
 */
@Entity('authors_recent_works', { database: 'crawler_db_v2' })
export class AuthorRecentWorks {
  @PrimaryColumn({ type: 'text' })
  author_id: string;

  @Column({ type: 'jsonb', nullable: true })
  last_10_items: any;

  // 计算字段
  @Column({ type: 'integer', default: 0 })
  recent_works_count: number;

  @Column({ type: 'bigint', nullable: true })
  avg_recent_vv: number;

  @Column({ type: 'bigint', nullable: true })
  total_recent_vv: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
