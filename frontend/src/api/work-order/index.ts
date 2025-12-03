import { requestClient } from '../request'
import type {
  WorkOrder,
  CreateWorkOrderDto,
  UpdateWorkOrderDto,
  UpdateWorkOrderStatusDto,
  AssignWorkOrderDto,
  QueryWorkOrderParams,
  WorkOrderListResponse,
  WorkOrderStatistics,
  WorkOrderLog,
} from './types'

/**
 * 创建工单
 */
export async function createWorkOrder(data: CreateWorkOrderDto) {
  return requestClient.post<WorkOrder>('/work-orders', data)
}

/**
 * 查询工单列表
 */
export async function getWorkOrderList(params: QueryWorkOrderParams) {
  return requestClient.get<WorkOrderListResponse>('/work-orders', { params })
}

/**
 * 获取我创建的工单
 */
export async function getMyCreatedWorkOrders(params: QueryWorkOrderParams) {
  return requestClient.get<WorkOrderListResponse>('/work-orders/my-created', { params })
}

/**
 * 获取分配给我的工单
 */
export async function getAssignedToMeWorkOrders(params: QueryWorkOrderParams) {
  return requestClient.get<WorkOrderListResponse>('/work-orders/assigned-to-me', { params })
}

/**
 * 获取工单统计信息
 */
export async function getWorkOrderStatistics() {
  return requestClient.get<WorkOrderStatistics>('/work-orders/statistics')
}

/**
 * 查询工单详情
 */
export async function getWorkOrderDetail(id: string) {
  return requestClient.get<WorkOrder>(`/work-orders/${id}`)
}

/**
 * 更新工单
 */
export async function updateWorkOrder(id: string, data: UpdateWorkOrderDto) {
  return requestClient.put<WorkOrder>(`/work-orders/${id}`, data)
}

/**
 * 更新工单状态
 */
export async function updateWorkOrderStatus(id: string, data: UpdateWorkOrderStatusDto) {
  return requestClient.put<WorkOrder>(`/work-orders/${id}/status`, data)
}

/**
 * 分配工单
 */
export async function assignWorkOrder(id: string, data: AssignWorkOrderDto) {
  return requestClient.put<WorkOrder>(`/work-orders/${id}/assign`, data)
}

/**
 * 删除工单
 */
export async function deleteWorkOrder(id: string) {
  return requestClient.delete(`/work-orders/${id}`)
}

/**
 * 获取工单日志
 */
export async function getWorkOrderLogs(id: string) {
  return requestClient.get<WorkOrderLog[]>(`/work-orders/${id}/logs`)
}

export * from './types'
