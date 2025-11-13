import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('suppliers')
@Index(['supplier_full_name'])
@Index(['agency_name'])
export class SupplierDatabase {
  @PrimaryGeneratedColumn('increment', { type: 'int', comment: '主键' })
  id: number;

  // 基本信息
  @Column({ type: 'varchar', length: 255, comment: '供应商全称' })
  supplier_full_name: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '机构名',
  })
  agency_name: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '供应商性质',
  })
  supplier_type: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '供应商简称',
  })
  supplier_short_name: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '供应商英文名',
  })
  supplier_english_name: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '供应商官网',
  })
  supplier_website: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: '供应商简介',
  })
  supplier_description: string;

  // 政策与财务
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '当前政策梯度',
  })
  current_policy_gradient: string;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
    comment: '税率(%)',
  })
  tax_rate_percent: number;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '账期',
  })
  payment_term: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '结算方式',
  })
  settlement_method: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '开票主体',
  })
  billing_entity: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '收款主体',
  })
  collection_entity: string;

  // 2024政策与合作
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '2024政策梯度',
  })
  policy_2024_gradient: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: '2024合作模式',
  })
  cooperation_mode_2024: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: '2024备注',
  })
  notes_2024: string;

  // 2025政策与合作
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '2025政策梯度',
  })
  policy_2025_gradient: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: '2025合作模式',
  })
  cooperation_mode_2025: string;

  @Column({
    type: 'text',
    nullable: true,
    comment: '2025备注',
  })
  notes_2025: string;

  // 对接人信息
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '一级对接人',
  })
  primary_contact_name: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '联系方式',
  })
  primary_contact_phone_wechat: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '二级对接人',
  })
  secondary_contact_name: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '二级联系方式',
  })
  secondary_contact_phone_wechat: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '三级对接人',
  })
  tertiary_contact_name: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '三级联系方式',
  })
  tertiary_contact_phone_wechat: string;

  // 合同信息
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '跟进人',
  })
  contract_follow_up_person: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '合同状态',
  })
  contract_status: string;

  @Column({
    type: 'date',
    nullable: true,
    comment: '合同开始日期',
  })
  contract_start_date: Date;

  @Column({
    type: 'date',
    nullable: true,
    comment: '合同结束日期',
  })
  contract_end_date: Date;

  @Column({
    type: 'text',
    nullable: true,
    comment: '合同备注',
  })
  contract_notes: string;

  // 资源与平台
  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '资源类型',
  })
  resource_type: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '主要平台',
  })
  main_platform: string;

  @Column({
    type: 'boolean',
    default: false,
    comment: '是否代下单',
  })
  is_proxy_order: boolean;

  @Column({
    type: 'text',
    nullable: true,
    comment: '资源备注',
  })
  resource_notes: string;

  // 审计字段
  @CreateDateColumn({
    type: 'timestamp',
    comment: '创建时间',
  })
  created_at: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    comment: '更新时间',
  })
  updated_at: Date;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '创建人',
  })
  created_by: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '更新人',
  })
  updated_by: string;
}
