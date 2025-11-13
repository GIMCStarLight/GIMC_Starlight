import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

/**
 * 变更历史审计表
 * 归档层 - 记录所有数据变更
 */
@Entity('authors_change_history', { database: 'crawler_db_v2' })
export class AuthorChangeHistory {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'text' })
  author_id: string;

  @Column({ type: 'text' })
  table_name: string;

  @Column({ type: 'text' })
  operation: string; // INSERT, UPDATE, DELETE

  @Column({ type: 'jsonb', nullable: true })
  old_data: any;

  @Column({ type: 'jsonb', nullable: true })
  new_data: any;

  @Column({ type: 'text', nullable: true })
  changed_by: string;

  @CreateDateColumn({ type: 'timestamp' })
  changed_at: Date;
}
