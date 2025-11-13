import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

// 枚举定义
export enum CooperationDegree {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum DataSource {
  MANUAL = 'manual',
  IMPORT = 'import',
  API = 'api',
}

export enum ResourceAttribute {
  SGXM = 'sgxm',
  EXCLUSIVE = 'exclusive',
  OTHER = 'other',
}

export enum MatchStatus {
  UNMATCHED = 'unmatched',
  PENDING = 'pending',
  MATCHED = 'matched',
  REJECTED = 'rejected',
}

@Entity('kol_list')
@Index(['platform', 'account_id'], { unique: true })
@Index(['followers_w'])
@Index(['category'])
@Index(['org_name'])
@Index(['is_exclusive'])
@Index(['resource_attribute'])
@Index(['cooperation_degree'])
@Index(['matched_author_id'])
@Index(['match_status'])
@Index(['platform', 'account_name'])
@Index(['deleted_at'])
@Index(['platform', 'match_status', 'deleted_at'])
export class KolList {
  @PrimaryGeneratedColumn('increment', { type: 'bigint', comment: '自增主键' })
  id: number;

  @Column({
    type: 'varchar',
    length: 30,
    comment: '账号平台，如抖音/小红书/B站',
  })
  platform: string;

  @Column({ type: 'varchar', length: 100, comment: '账号名称' })
  account_name: string;

  @Column({ type: 'varchar', length: 80, comment: '账号ID（各平台唯一标识）' })
  account_id: string;

  @Column({ type: 'varchar', length: 500, comment: '主页链接' })
  home_link: string;

  @Column({
    type: 'decimal',
    precision: 8,
    scale: 2,
    comment: '粉丝量（万）',
  })
  followers_w: number;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '所属机构名',
  })
  org_name: string;

  @Column({
    type: 'varchar',
    length: 30,
    nullable: true,
    comment: '账号类型，如美妆/母婴/汽车等',
  })
  category: string;

  @Column({
    type: 'bigint',
    unsigned: true,
    nullable: true,
    comment: '星图报价21-60s（人民币）',
  })
  star_quote_21_60s: number;

  @Column({
    type: 'bigint',
    unsigned: true,
    nullable: true,
    comment: '星图报价60s+（人民币）',
  })
  star_quote_60s_plus: number;

  @Column({
    type: 'smallint',
    default: 0,
    comment: '达人属性 1独家 0非独家',
  })
  is_exclusive: number;

  @Column({
    type: 'text',
    nullable: true,
    comment: '返点政策描述，如“0-50w: 25%，50-200w: 28%”',
  })
  rebate_policy: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '返点区间，如10%-15%',
  })
  rebate_range: string;

  @Column({
    type: 'varchar',
    length: 10,
    nullable: true,
    comment: '政策等级 A/B/C',
  })
  policy_level: string;

  @Column({
    type: 'varchar',
    length: 30,
    nullable: true,
    comment: '返点账期，如月结/季度结',
  })
  rebate_period: string;

  @Column({
    type: 'varchar',
    length: 30,
    nullable: true,
    comment: '支付账期，如T+1/T+7',
  })
  pay_period: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: '备注',
  })
  remark: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: '平台差异字段',
  })
  platform_extra: any;

  // 新增字段 - 扩展信息
  @Column({
    type: 'text',
    nullable: true,
    comment: '合作简介',
  })
  cooperation_intro: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: '全网平台信息',
  })
  all_platforms: any;

  @Column({
    type: 'json',
    nullable: true,
    comment: '联系方式',
  })
  contact_info: any;

  @Column({
    type: 'enum',
    enum: CooperationDegree,
    default: CooperationDegree.MEDIUM,
    comment: '配合度',
  })
  cooperation_degree: CooperationDegree;

  @Column({
    type: 'enum',
    enum: DataSource,
    default: DataSource.MANUAL,
    comment: '数据来源',
  })
  source: DataSource;

  @Column({
    type: 'enum',
    enum: ResourceAttribute,
    default: ResourceAttribute.OTHER,
    comment: '资源属性',
  })
  resource_attribute: ResourceAttribute;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '年框机构',
  })
  annual_contract_org: string;

  // 匹配相关字段
  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
    comment: '匹配的公海达人ID',
  })
  matched_author_id: string;

  @Column({
    type: 'decimal',
    precision: 4,
    scale: 3,
    nullable: true,
    comment: '匹配置信度(0-1)',
  })
  match_confidence: number;

  @Column({
    type: 'enum',
    enum: MatchStatus,
    default: MatchStatus.UNMATCHED,
    comment: '匹配状态',
  })
  match_status: MatchStatus;

  @Column({
    type: 'json',
    nullable: true,
    comment: '公海数据快照',
  })
  matched_snapshot: Record<string, any> | null;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '匹配时间',
  })
  matched_at: Date;

  // 审计字段
  @Column({
    type: 'bigint',
    nullable: true,
    comment: '创建人ID',
  })
  created_by: number;

  @Column({
    type: 'bigint',
    nullable: true,
    comment: '更新人ID',
  })
  updated_by: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    comment: '软删除时间',
  })
  deleted_at: Date;

  @CreateDateColumn({ type: 'timestamp', comment: '创建时间' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp', comment: '更新时间' })
  updated_at: Date;
}
