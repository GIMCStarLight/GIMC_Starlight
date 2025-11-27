import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { WorkOrder, WorkOrderStatus } from './work-order.entity';
import { UserAuth } from './user-auth.entity';

/**
 * 工单日志操作类型枚举
 */
export enum WorkOrderLogAction {
  CREATE = 'create', // 创建
  RECEIVE = 'receive', // 接收
  ASSIGN = 'assign', // 分配
  START = 'start', // 开始处理
  UPDATE = 'update', // 更新
  COMMENT = 'comment', // 评论
  STATUS_CHANGE = 'status_change', // 状态变更
  COMPLETE = 'complete', // 完成
  REJECT = 'reject', // 拒绝
  CANCEL = 'cancel', // 取消
}

/**
 * 工单处理日志实体
 * 记录工单的所有操作历史
 */
@Entity('work_order_logs')
@Index(['workOrderId'])
@Index(['createdAt'])
export class WorkOrderLog {
  @PrimaryGeneratedColumn('uuid', { comment: '日志ID' })
  id: string;

  @Column({
    type: 'uuid',
    name: 'work_order_id',
    comment: '工单ID',
  })
  workOrderId: string;

  @Column({
    type: 'enum',
    enum: WorkOrderLogAction,
    comment: '操作类型',
  })
  action: WorkOrderLogAction;

  @Column({
    type: 'text',
    nullable: true,
    comment: '操作说明/备注',
  })
  content: string;

  @Column({
    type: 'enum',
    enum: WorkOrderStatus,
    nullable: true,
    name: 'old_status',
    comment: '原状态',
  })
  oldStatus: WorkOrderStatus;

  @Column({
    type: 'enum',
    enum: WorkOrderStatus,
    nullable: true,
    name: 'new_status',
    comment: '新状态',
  })
  newStatus: WorkOrderStatus;

  @Column({
    type: 'bigint',
    nullable: true,
    name: 'old_assignee',
    comment: '原处理人ID',
  })
  oldAssignee: string;

  @Column({
    type: 'bigint',
    nullable: true,
    name: 'new_assignee',
    comment: '新处理人ID',
  })
  newAssignee: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: '额外数据',
  })
  metadata: Record<string, any>;

  @Column({
    type: 'bigint',
    name: 'created_by',
    comment: '操作人ID',
  })
  createdBy: string;

  @CreateDateColumn({
    type: 'timestamp',
    name: 'created_at',
    comment: '操作时间',
  })
  createdAt: Date;

  // 关联关系
  @ManyToOne(() => WorkOrder, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'work_order_id' })
  workOrder: WorkOrder;

  @ManyToOne(() => UserAuth, { nullable: false })
  @JoinColumn({ name: 'created_by' })
  operator: UserAuth;
}
