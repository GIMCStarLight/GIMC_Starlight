import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum MatchOperation {
  AUTO_MATCH = 'auto_match',
  MANUAL_MATCH = 'manual_match',
  CONFIRM_MATCH = 'confirm_match',
  REJECT_MATCH = 'reject_match',
  UNMATCH = 'unmatch',
}

@Entity('kol_match_logs')
@Index(['private_kol_id'])
@Index(['public_author_id'])
@Index(['operation'])
@Index(['created_at'])
@Index(['created_by'])
export class KolMatchLogs {
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
    nullable: true,
    comment: '公海达人ID',
  })
  public_author_id: string;

  @Column({
    type: 'enum',
    enum: MatchOperation,
    comment: '操作类型',
  })
  operation: MatchOperation;

  @Column({
    type: 'json',
    nullable: true,
    comment: '操作详情',
  })
  operation_details: any;

  @Column({
    type: 'decimal',
    precision: 4,
    scale: 3,
    nullable: true,
    comment: '匹配置信度',
  })
  match_confidence: number;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: '操作备注',
  })
  remark: string;

  @Column({
    type: 'bigint',
    nullable: true,
    comment: '操作人ID',
  })
  created_by: number;

  @CreateDateColumn({ type: 'timestamp', comment: '创建时间' })
  created_at: Date;
}
