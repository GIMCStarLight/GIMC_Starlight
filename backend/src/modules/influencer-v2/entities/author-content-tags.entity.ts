import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * 内容标签表
 * 包含标签关系、主题标签、词语关联等
 */
@Entity('authors_content_tags', { database: 'crawler_db_v2' })
export class AuthorContentTags {
  @PrimaryColumn({ type: 'text' })
  author_id: string;

  @Column({ type: 'jsonb', nullable: true })
  tags_relation: any;

  @Column({ type: 'jsonb', nullable: true })
  content_theme_labels_180d: any;

  @Column({ type: 'jsonb', nullable: true })
  author_thin_mid_word_association_index: any;

  // 计算字段（数据库生成）
  @Column({ type: 'text', array: true, nullable: true, insert: false, update: false })
  primary_tags: string[];

  @Column({ type: 'text', array: true, nullable: true, insert: false, update: false })
  primary_themes: string[];

  @Column({ type: 'integer', nullable: true, insert: false, update: false })
  tag_count: number;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}
