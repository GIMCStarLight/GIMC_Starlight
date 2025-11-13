import { Entity, Column, PrimaryColumn, CreateDateColumn } from 'typeorm';

/**
 * 原始数据归档表（分区表）
 * 归档层 - 按月分区
 */
@Entity('authors_raw_archive', { database: 'crawler_db_v2' })
export class AuthorRawArchive {
  @PrimaryColumn({ type: 'bigint' })
  run_id: number;

  @PrimaryColumn({ type: 'text' })
  author_id: string;

  @PrimaryColumn({ type: 'timestamp' })
  created_at: Date;

  @Column({ type: 'jsonb', nullable: true })
  raw_attribute_datas: any;
}
