import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ReviewType {
  INTERNAL = 'internal',
  CLIENT = 'client',
  PARTNER = 'partner',
}

export enum KolReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('kol_reviews')
@Index(['authorId', 'createdAt'])
@Index(['isDeleted'])
export class KolReviews {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id: number;

  @Column({ name: 'author_id', type: 'text' })
  authorId: string;

  @Column({ length: 100 })
  reviewer: string;

  @Column({ name: 'reviewer_id', type: 'bigint', nullable: true })
  reviewerId?: number;

  @Column({ type: 'int' })
  score: number;

  @Column({ type: 'text' })
  content: string;

  @Column({
    name: 'review_type',
    type: 'varchar',
    length: 50,
    default: ReviewType.INTERNAL,
  })
  reviewType: ReviewType;

  @Column({ name: 'review_tags', type: 'text', array: true, nullable: true })
  reviewTags?: string[];

  @Column({ type: 'jsonb', nullable: true })
  attachments?: any;

  @Column({
    type: 'varchar',
    length: 20,
    default: KolReviewStatus.APPROVED,
  })
  status: KolReviewStatus;

  @Column({ length: 100, nullable: true })
  auditor?: string;

  @Column({ name: 'audit_time', type: 'timestamp', nullable: true })
  auditTime?: Date;

  @Column({ name: 'audit_comment', type: 'text', nullable: true })
  auditComment?: string;

  @Column({ name: 'is_deleted', type: 'boolean', default: false })
  isDeleted: boolean;

  @Column({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deletedAt?: Date;

  @Column({ name: 'deleted_by', length: 100, nullable: true })
  deletedBy?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
