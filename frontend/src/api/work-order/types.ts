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
 * 附件信息
 */
export interface Attachment {
  name: string
  url: string
  size: number
  type: string
}

/**
 * 工单信息
 */
export interface WorkOrder {
  id: string
  title: string
  type: WorkOrderType
  priority: WorkOrderPriority
  description: string
  modules?: string[]
  attachments?: Attachment[]
  status: WorkOrderStatus
  createdBy: string
  assignedTo?: string
  receivedAt?: string
  startedAt?: string
  completedAt?: string
  expectedCompletionAt?: string
  result?: string
  createdAt: string
  updatedAt: string
  creator?: {
    id: string
    phone: string
    profile?: {
      name: string
      email?: string
      avatar?: string
    }
  }
  assignee?: {
    id: string
    phone: string
    profile?: {
      name: string
      email?: string
      avatar?: string
    }
  }
}

/**
 * 创建工单DTO
 */
export interface CreateWorkOrderDto {
  title: string
  type: WorkOrderType
  priority?: WorkOrderPriority
  description: string
  modules?: string[]
  attachments?: Attachment[]
  expectedCompletionAt?: string
  assignedTo?: string
}

/**
 * 更新工单DTO
 */
export interface UpdateWorkOrderDto {
  title?: string
  type?: WorkOrderType
  priority?: WorkOrderPriority
  description?: string
  modules?: string[]
  expectedCompletionAt?: string
  result?: string
}

/**
 * 更新工单状态DTO
 */
export interface UpdateWorkOrderStatusDto {
  status: WorkOrderStatus
  comment?: string
}

/**
 * 分配工单DTO
 */
export interface AssignWorkOrderDto {
  assignedTo: string
  comment?: string
}

/**
 * 查询工单参数
 */
export interface QueryWorkOrderParams {
  keyword?: string
  type?: WorkOrderType
  status?: WorkOrderStatus
  priority?: WorkOrderPriority
  createdBy?: string
  assignedTo?: string
  modules?: string[]
  createdAtStart?: string
  createdAtEnd?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

/**
 * 工单列表响应
 */
export interface WorkOrderListResponse {
  items: WorkOrder[]
  total: number
  page: number
  limit: number
  totalPages: number
}

/**
 * 工单统计信息
 */
export interface WorkOrderStatistics {
  total: number
  pending: number
  received: number
  inProgress: number
  completed: number
  myCreated: number
  assignedToMe: number
}

/**
 * 工单日志操作类型枚举
 */
export enum WorkOrderLogAction {
  CREATE = 'create',
  RECEIVE = 'receive',
  ASSIGN = 'assign',
  START = 'start',
  UPDATE = 'update',
  COMMENT = 'comment',
  STATUS_CHANGE = 'status_change',
  COMPLETE = 'complete',
  REJECT = 'reject',
  CANCEL = 'cancel',
}

/**
 * 工单日志
 */
export interface WorkOrderLog {
  id: string
  workOrderId: string
  action: WorkOrderLogAction
  content?: string
  oldStatus?: WorkOrderStatus
  newStatus?: WorkOrderStatus
  oldAssignee?: string
  newAssignee?: string
  metadata?: Record<string, any>
  createdBy: string
  createdAt: string
  operator?: {
    id: string
    phone: string
    profile?: {
      name: string
      avatar?: string
    }
  }
}
