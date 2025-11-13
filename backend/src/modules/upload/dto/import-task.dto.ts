import { ApiProperty } from '@nestjs/swagger';

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
  taskId: string;
  status: ImportTaskStatus;
  totalRows: number;
  processedRows: number;
  successCount: number;
  failedCount: number;
  progress: number; // 0-100
  startTime: number;
  endTime?: number;
  duration?: number;
  failedRecords?: FailedRecord[];
  errorMessage?: string;
}

/**
 * 失败记录
 */
export interface FailedRecord {
  row: number;
  data: any;
  error: string;
}

/**
 * 启动异步导入响应
 */
export class StartImportResponse {
  @ApiProperty({ description: '任务ID' })
  taskId: string;

  @ApiProperty({ description: '总行数' })
  totalRows: number;

  @ApiProperty({ description: '预计耗时（秒）' })
  estimatedDuration: number;
}

/**
 * 导入进度响应
 */
export class ImportProgressResponse {
  @ApiProperty({ description: '任务ID' })
  taskId: string;

  @ApiProperty({ description: '任务状态', enum: ImportTaskStatus })
  status: ImportTaskStatus;

  @ApiProperty({ description: '总行数' })
  totalRows: number;

  @ApiProperty({ description: '已处理行数' })
  processedRows: number;

  @ApiProperty({ description: '成功数量' })
  successCount: number;

  @ApiProperty({ description: '失败数量' })
  failedCount: number;

  @ApiProperty({ description: '进度百分比 (0-100)' })
  progress: number;

  @ApiProperty({ description: '开始时间戳' })
  startTime: number;

  @ApiProperty({ description: '结束时间戳', required: false })
  endTime?: number;

  @ApiProperty({ description: '耗时（毫秒）', required: false })
  duration?: number;

  @ApiProperty({ description: '失败记录', required: false })
  failedRecords?: FailedRecord[];

  @ApiProperty({ description: '错误信息', required: false })
  errorMessage?: string;
}
