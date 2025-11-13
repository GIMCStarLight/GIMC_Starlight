import { requestClient } from './request'

/**
 * 导入任务状态
 */
export enum ImportTaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * 导入任务信息
 */
export interface ImportTask {
  taskId: string
  status: ImportTaskStatus
  totalRows: number
  processedRows: number
  successCount: number
  failedCount: number
  progress: number // 0-100
  startTime: number
  endTime?: number
  duration?: number
  failedRecords?: FailedRecord[]
  errorMessage?: string
}

/**
 * 失败记录
 */
export interface FailedRecord {
  row: number
  data: any
  error: string
}

/**
 * 启动异步导入
 */
export async function startAsyncImport(params: {
  fileId: string
  type: 'private' | 'public'
  fileName?: string
}) {
  const response = await requestClient.post('/upload/import-async', params)
  return response.data
}

/**
 * 获取导入进度
 */
export async function getImportProgress(taskId: string): Promise<ImportTask> {
  const response = await requestClient.get(`/upload/import-progress/${taskId}`)
  return response.data
}

/**
 * 获取导入历史列表
 */
export async function getImportHistory(params: {
  page?: number
  pageSize?: number
}) {
  const response = await requestClient.get('/upload/import-history', { params })
  return response.data
}

/**
 * 获取导入历史详情
 */
export async function getImportHistoryDetail(taskId: string) {
  const response = await requestClient.get(`/upload/import-history/${taskId}`)
  return response.data
}
