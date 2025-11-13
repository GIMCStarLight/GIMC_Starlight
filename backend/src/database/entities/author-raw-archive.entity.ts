import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

/**
 * 达人原始数据归档表
 * 存储完整的123个字段的原始数据
 */
@Entity('authors_raw_archive')
export class AuthorRawArchive {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'text', name: 'author_id' })
  authorId: string;

  @Column({ type: 'bigint', name: 'run_id', nullable: true })
  runId: number;

  @Column({ type: 'jsonb', name: 'raw_attribute_datas', nullable: true })
  rawAttributeDatas: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
