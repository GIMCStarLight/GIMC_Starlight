import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { UserAuth } from './user-auth.entity';

/**
 * 工单事务类型枚举
 */
export enum WorkOrderType {
  NEW_FEATURE = 'new_feature', // 新增功能
  SYSTEM_REFACTOR = 'system_refactor', // 系统改造
  BUG_FIX = 'bug_fix', // 问题调试
  OPTIMIZATION = 'optimization', // 性能优化
  REQUIREMENT_CHANGE = 'requirement_change', // 需求变更
  OTHER = 'other', // 其他
}

/**
 * 工单状态枚举
 */
export enum WorkOrderStatus {
  PENDING = 'pending', // 待接收
  RECEIVED = 'received', // 已接收
  IN_PROGRESS = 'in_progress', // 处理中
  TESTING = 'testing', // 测试中
  COMPLETED = 'completed', // 已完成
  REJECTED = 'rejected', // 已拒绝
  CANCELLED = 'cancelled', // 已取消
}

/**
 * 工单优先级枚举
 */
export enum WorkOrderPriority {
  LOW = 'low', // 低
  MEDIUM = 'medium', // 中
  HIGH = 'high', // 高
  URGENT = 'urgent', // 紧急
}

/**
 * 工单实体
 */
@Entity('work_orders')
@Index(['status'])
@Index(['createdBy'])
@Index(['assignedTo'])
@Index(['createdAt'])
export class WorkOrder {
  @PrimaryGeneratedColumn('uuid', { comment: '工单ID' })
  id: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: '工单标题',
  })
  title: string;

  @Column({
    type: 'enum',
    enum: WorkOrderType,
    comment: '事务类型',
  })
  type: WorkOrderType;

  @Column({
    type: 'enum',
    enum: WorkOrderPriority,
    default: WorkOrderPriority.MEDIUM,
    comment: '优先级',
  })
  priority: WorkOrderPriority;

  @Column({
    type: 'text',
    comment: '需求描述',
  })
  description: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: '涉及的功能模块（从菜单中选择）',
  })
  modules: string[];

  @Column({
    type: 'json',
    nullable: true,
    comment: '附件信息',
  })
  attachments: {
    name: string;
    url: string;
    size: number;
    type: string;
  }[];

  @Column({
    type: 'enum',
    enum: WorkOrderStatus,
    default: WorkOrderStatus.PENDING,
    comment: '工单状态',
  })
  status: WorkOrderStatus;

  @Column({
    type: 'bigint',
    name: 'created_by',
    comment: '创建人ID',
  })
  createdBy: string;

  @Column({
    type: 'bigint',
    nullable: true,
    name: 'assigned_to',
    comment: '分配给（处理人ID）',
  })
  assignedTo: string;

  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'received_at',
    comment: '接收时间',
  })
  receivedAt: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'started_at',
    comment: '开始处理时间',
  })
  startedAt: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'completed_at',
    comment: '完成时间',
  })
  completedAt: Date;

  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'expected_completion_at',
    comment: '期望完成时间',
  })
  expectedCompletionAt: Date;

  @Column({
    type: 'text',
    nullable: true,
    comment: '处理结果/备注',
  })
  result: string;

  @CreateDateColumn({
    type: 'timestamp',
    name: 'created_at',
    comment: '创建时间',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    name: 'updated_at',
    comment: '更新时间',
  })
  updatedAt: Date;

  // 关联关系
  @ManyToOne(() => UserAuth, { nullable: false })
  @JoinColumn({ name: 'created_by' })
  creator: UserAuth;

  @ManyToOne(() => UserAuth, { nullable: true })
  @JoinColumn({ name: 'assigned_to' })
  assignee: UserAuth;
}
