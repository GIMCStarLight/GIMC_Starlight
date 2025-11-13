import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { PlatformType } from '../../common/enums/platform-type.enum';

/**
 * 来源账户映射表
 * 用于关联各平台的账户ID到统一的达人ID
 * 例如：星图ID 7425618843545894921 -> 统一达人ID
 */
@Entity('source_account')
@Index(['source_type', 'source_platform', 'platform_uid'], { unique: true })
export class SourceAccount {
  @PrimaryGeneratedColumn('uuid', {
    comment: '来源账户映射ID',
    name: 'source_account_id',
  })
  source_account_id: string;

  @Column({ type: 'uuid', comment: '关联的达人ID', name: 'influencer_id' })
  @Index()
  influencer_id: string;

  @Column({
    type: 'text',
    comment: '来源类型（如：data_platform, api_crawl等）',
    name: 'source_type',
  })
  source_type: string;

  @Column({
    type: 'enum',
    enum: PlatformType,
    comment: '来源平台（douyin, xiaohongshu等）',
    name: 'source_platform',
  })
  source_platform: PlatformType;

  @Column({
    type: 'text',
    comment: '平台账户ID（如星图ID：7425618843545894921）',
    name: 'platform_uid',
  })
  platform_uid: string;

  @Column({
    type: 'jsonb',
    nullable: true,
    comment: '额外信息（JSON格式）',
    name: 'extra_info',
  })
  extra_info: Record<string, any>;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: '首次发现时间',
    name: 'first_seen_at',
  })
  first_seen_at: Date;

  @Column({
    type: 'timestamptz',
    nullable: true,
    comment: '最后发现时间',
    name: 'last_seen_at',
  })
  last_seen_at: Date;

  @Column({
    type: 'uuid',
    nullable: true,
    comment: '关联的摄入记录ID',
    name: 'ingest_id',
  })
  ingest_id: string;

  @CreateDateColumn({ comment: '创建时间', name: 'created_at' })
  created_at: Date;

  @UpdateDateColumn({ comment: '更新时间', name: 'updated_at' })
  updated_at: Date;
}
