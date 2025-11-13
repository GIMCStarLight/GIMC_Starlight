import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { KolList } from './kol-list.entity';

export enum MatchMethod {
  ACCOUNT_NAME = 'account_name',
  ACCOUNT_ID = 'account_id',
  FUZZY_NAME = 'fuzzy_name',
  MANUAL = 'manual',
}

export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('kol_private_matches')
@Index(['private_kol_id', 'public_author_id'], { unique: true })
@Index(['private_kol_id'])
@Index(['public_author_id'])
@Index(['match_confidence'])
@Index(['review_status'])
@Index(['match_method'])
@Index(['created_at'])
export class KolPrivateMatches {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', comment: '自增主键' })
  id: number;

  @Column({
    type: 'bigint',
    comment: '私域达人ID',
  })
  private_kol_id: number;

  @Column({
    type: 'varchar',
    length: 64,
    comment: '公海达人ID',
  })
  public_author_id: string;

  @Column({
    type: 'decimal',
    precision: 4,
    scale: 3,
    comment: '匹配置信度(0-1)',
  })
  match_confidence: number;

  @Column({
    type: 'enum',
    enum: MatchMethod,
    comment: '匹配方法',
  })
  match_method: MatchMethod;

  @Column({
    type: 'json',
    nullable: true,
    comment: '匹配详情',
  })
  match_details: any;

  @Column({
    type: 'json',
    nullable: true,
    comment: '公海数据快照',
  })
  public_snapshot: any;

  @Column({
    type: 'enum',
    enum: ReviewStatus,
    default: ReviewStatus.PENDING,
    comment: '审核状态',
  })
  review_status: ReviewStatus;

  @Column({
    type: 'bigint',
    nullable: true,
    comment: '审核人ID',
  })
  reviewed_by: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '审核时间',
  })
  reviewed_at: Date;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: '审核备注',
  })
  review_remark: string;

  @Column({
    type: 'bigint',
    nullable: true,
    comment: '创建人ID',
  })
  created_by: number;

  @CreateDateColumn({ type: 'timestamp', comment: '创建时间' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', comment: '更新时间' })
  updated_at: Date;

  // 关联关系
  @ManyToOne(() => KolList)
  @JoinColumn({ name: 'private_kol_id' })
  privateKol: KolList;
}
