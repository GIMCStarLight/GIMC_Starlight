// KOL 匹配相关类型定义

export enum MatchStatus {
  PENDING = 'pending',
  MATCHED = 'matched',
  NO_MATCH = 'no_match',
  FAILED = 'failed'
}

export enum ReviewStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  NEED_MORE_INFO = 'need_more_info'
}

export enum DataSource {
  PUBLIC = 'public',      // 公海达人
  PRIVATE = 'private',    // 私域达人
  MATCHED = 'matched'     // 匹配结果
}

// 批量匹配请求参数
export interface BatchMatchParams {
  batchSize?: number;
  minConfidence?: number;
  enableCache?: boolean;
  platforms?: string[];
}

// 匹配候选结果
export interface MatchCandidate {
  publicAuthorId: string;
  confidence: number;
  method: string;
  details: Record<string, unknown>;
  publicSnapshot?: Record<string, unknown>;
}

// 单个匹配结果
export interface MatchResult {
  privateKolId: number;
  candidates: MatchCandidate[];
  totalCandidates: number;
}

// 批量匹配响应
export interface BatchMatchResponse {
  results: MatchResult[];
  totalProcessed: number;
  successMatched: number;
  processingTime: number;
}

// 确认匹配参数
export interface ConfirmMatchParams {
  publicAuthorId: string;
  remark?: string;
}

// 拒绝匹配参数
export interface RejectMatchParams {
  publicAuthorId: string;
  remark?: string;
}

// 匹配查询参数
export interface QueryMatchesParams {
  page?: number;
  limit?: number;
  matchStatus?: MatchStatus;
  reviewStatus?: ReviewStatus;
  platform?: string;
  accountName?: string;
  minConfidence?: number;
}

// KOL 基础信息
export interface KolInfo {
  id: number;
  platform: string;
  accountName: string;
  accountId: string;
  homeLink: string;
  followersW: number;
  orgName?: string;
  category?: string;
  starQuote21_60s?: number;
  starQuote60sPlus?: number;
  isExclusive?: number;
  rebatePolicy?: number;
  rebateRange?: string;
  policyLevel?: string;
  rebatePeriod?: string;
  payPeriod?: string;
  remark?: string;
  createdAt?: string;
  updatedAt?: string;
}

// 扩展的 KOL 信息（包含匹配状态）
export interface ExtendedKolInfo extends KolInfo {
  matchStatus?: MatchStatus;
  reviewStatus?: ReviewStatus;
  matchedCount?: number;
  confidence?: number;
  matchMethod?: string;
  lastMatchTime?: string;
  reviewTime?: string;
  reviewer?: string;
  reviewRemark?: string;
}

// 匹配任务状态
export interface MatchTask {
  id: string;
  status: 'running' | 'completed' | 'failed';
  progress: number;
  totalCount: number;
  processedCount: number;
  successCount: number;
  failedCount: number;
  startTime: string;
  endTime?: string;
  error?: string;
}

// 导入任务状态
export interface ImportTask {
  id: string;
  fileName: string;
  status: 'uploading' | 'validating' | 'importing' | 'completed' | 'failed';
  progress: number;
  totalRows: number;
  processedRows: number;
  successRows: number;
  failedRows: number;
  errors: ImportError[];
  startTime: string;
  endTime?: string;
}

// 导入错误信息
export interface ImportError {
  row: number;
  field?: string;
  message: string;
  data?: Record<string, unknown>;
}

// 筛选条件
export interface FilterConditions {
  dataSource: DataSource;
  platform?: string;
  accountName?: string;
  orgName?: string;
  category?: string;
  minFollowersW?: number;
  maxFollowersW?: number;
  matchStatus?: MatchStatus;
  reviewStatus?: ReviewStatus;
  matchedOnly?: boolean;
  isExclusive?: number;
  rebatePolicy?: number;
  policyLevel?: string;
  minConfidence?: number;
  dateRange?: [string, string];
}

// 分页参数
export interface PaginationParams {
  page: number;
  limit: number;
}

// 分页响应
export interface PaginationResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// 批量操作类型
export enum BatchOperationType {
  MATCH = 'match',
  APPROVE = 'approve',
  REJECT = 'reject',
  DELETE = 'delete',
  EXPORT = 'export'
}

// 批量操作参数
export interface BatchOperationParams {
  type: BatchOperationType;
  ids: number[];
  params?: Record<string, unknown>;
}

// 统计信息
export interface KolStatistics {
  total: number;
  publicCount: number;
  privateCount: number;
  matchedCount: number;
  pendingReviewCount: number;
  approvedCount: number;
  rejectedCount: number;
  platformStats: Record<string, number>;
  categoryStats: Record<string, number>;
}