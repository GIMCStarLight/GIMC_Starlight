import { requestClient } from './request';
import { requestDeduplicator } from '../utils/request-deduplicator';
import type {
  BatchMatchParams,
  BatchMatchResponse,
  MatchResult,
  ConfirmMatchParams,
  RejectMatchParams,
  QueryMatchesParams,
  PaginationResponse,
  ExtendedKolInfo,
  KolInfo,
  KolStatistics
} from '../types/kol-match.types';

// KOL 匹配相关 API
export class KolMatchApi {
  // 批量匹配私域达人
  static async batchMatch(params: BatchMatchParams): Promise<BatchMatchResponse> {
    return requestClient.post('/kol-match/batch', params);
  }

  // 获取单个私域达人的匹配候选
  static async getMatchCandidates(privateKolId: number): Promise<MatchResult> {
    return requestDeduplicator.deduplicate(
      {
        url: `/kol-match/${privateKolId}/candidates`,
        method: 'GET',
      },
      () => requestClient.get(`/kol-match/${privateKolId}/candidates`)
    );
  }

  // 确认匹配
  static async confirmMatch(privateKolId: number, params: ConfirmMatchParams): Promise<void> {
    return requestClient.put(`/kol-match/${privateKolId}/confirm`, params);
  }

  // 拒绝匹配
  static async rejectMatch(privateKolId: number, params: RejectMatchParams): Promise<void> {
    return requestClient.put(`/kol-match/${privateKolId}/reject`, params);
  }

  // 查询匹配结果
  static async queryMatches(params: QueryMatchesParams): Promise<PaginationResponse<ExtendedKolInfo>> {
    return requestDeduplicator.deduplicate(
      {
        url: '/kol-match',
        method: 'GET',
        params,
      },
      async () => {
        const response: any = await requestClient.get('/kol-match', { params, responseReturn: 'raw' });
        const backendData = response?.data || response;
        const pagination = backendData.pagination || {};
        return {
          data: backendData.data || [],
          total: pagination.total || 0,
          page: pagination.page || params.page || 1,
          limit: pagination.pageSize || params.limit || 20,
          totalPages: pagination.totalPages || 0,
          hasNext: pagination.hasNext || false,
          hasPrev: pagination.hasPrev || false
        };
      }
    );
  }

  // 获取匹配统计信息
  static async getMatchStatistics(): Promise<KolStatistics> {
    return requestDeduplicator.deduplicate(
      {
        url: '/kol-match/statistics',
        method: 'GET',
      },
      async () => {
        const response: any = await requestClient.get('/kol-match/statistics', { responseReturn: 'raw' });
        const backendData = response?.data || response;
        return backendData.data || backendData || {
          total: 0,
          publicCount: 0,
          privateCount: 0,
          matchedCount: 0,
          pendingReviewCount: 0
        };
      }
    );
  }
}

// KOL 列表相关 API
export class KolListApi {
  // 获取 KOL 列表
  static async getKolList(params: any): Promise<PaginationResponse<KolInfo>> {
    return requestDeduplicator.deduplicate(
      {
        url: '/kol-lists',
        method: 'GET',
        params,
      },
      async () => {
        const response: any = await requestClient.get('/kol-lists', { params, responseReturn: 'raw' });
        // 后端返回格式: { code, message, data: [...], pagination: {...} }
        // 需要重组为前端期望的格式
        const backendData = response?.data || response;
        const pagination = backendData.pagination || {};
        return {
          data: backendData.data || [],
          total: pagination.total || 0,
          page: pagination.page || params.page || 1,
          limit: pagination.pageSize || params.limit || 20,
          totalPages: pagination.totalPages || 0,
          hasNext: pagination.hasNext || false,
          hasPrev: pagination.hasPrev || false
        };
      }
    );
  }

  // 创建 KOL
  static async createKol(data: Partial<KolInfo>): Promise<KolInfo> {
    return requestClient.post('/kol-lists', data);
  }

  // 批量创建 KOL
  static async batchCreateKol(data: { kols: Partial<KolInfo>[] }): Promise<any> {
    return requestClient.post('/kol-lists/batch', data);
  }

  // 更新 KOL
  static async updateKol(id: number, data: Partial<KolInfo>): Promise<KolInfo> {
    // 后端使用 PATCH /kol-lists/:id 进行部分更新
    return requestClient.patch(`/kol-lists/${id}`, data);
  }

  // 删除 KOL
  static async deleteKol(id: number): Promise<void> {
    return requestClient.delete(`/kol-lists/${id}`);
  }

  // 批量删除 KOL
  static async batchDeleteKol(ids: number[]): Promise<{ deletedCount: number; failedIds: number[] }> {
    return requestClient.delete('/kol-lists', { data: { ids } });
  }

  // 获取 KOL 详情
  static async getKolDetail(id: number): Promise<KolInfo> {
    return requestDeduplicator.deduplicate(
      {
        url: `/kol-lists/${id}`,
        method: 'GET',
      },
      () => requestClient.get(`/kol-lists/${id}`)
    );
  }

  // 导出 KOL 数据
  static async exportKolData(params: any): Promise<Blob> {
    return requestClient.get('/kol-lists/export', { 
      params, 
      responseType: 'blob' 
    });
  }

  // 获取平台列表
  static async getPlatforms(): Promise<string[]> {
    return requestDeduplicator.deduplicate(
      {
        url: '/kol-lists/platforms',
        method: 'GET',
      },
      async () => {
        const response: any = await requestClient.get('/kol-lists/platforms', { responseReturn: 'raw' });
        const backendData = response?.data || response;
        return backendData.data || backendData || [];
      }
    );
  }

  // 获取分类列表
  static async getCategories(): Promise<string[]> {
    return requestDeduplicator.deduplicate(
      {
        url: '/kol-lists/categories',
        method: 'GET',
      },
      async () => {
        const response: any = await requestClient.get('/kol-lists/categories', { responseReturn: 'raw' });
        const backendData = response?.data || response;
        return backendData.data || backendData || [];
      }
    );
  }

  // 获取机构列表
  static async getOrganizations(): Promise<string[]> {
    return requestDeduplicator.deduplicate(
      {
        url: '/kol-lists/organizations',
        method: 'GET',
      },
      async () => {
        const response: any = await requestClient.get('/kol-lists/organizations', { responseReturn: 'raw' });
        const backendData = response?.data || response;
        return backendData.data || backendData || [];
      }
    );
  }
}

// 文件上传相关 API
export class FileUploadApi {
  // 上传 Excel 文件
  static async uploadExcel(file: File, onProgress?: (progress: number) => void): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    return requestClient.post('/upload/excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      // 上传大文件时可能较慢，适当增加超时
      timeout: 60000,
      onUploadProgress: (progressEvent: any) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      }
    });
  }

  // 验证导入数据
  static async validateImportData(fileId: string, type: 'private' | 'public' = 'private'): Promise<any> {
    // 验证可能需要处理数万条记录，显著超过默认10秒
    return requestClient.post('/upload/validate', { fileId, type }, {
      timeout: 120000 // 2分钟
    });
  }

  // 导入数据
  static async importData(fileId: string, type: 'private' | 'public' = 'private'): Promise<any> {
    // 导入执行涉及数据库写入，耗时可能更长
    return requestClient.post('/upload/import', { fileId, type }, {
      timeout: 300000 // 5分钟
    });
  }
}

// 性能监控相关 API
export class PerformanceApi {
  // 获取系统性能指标
  static async getSystemMetrics(): Promise<any> {
    return requestDeduplicator.deduplicate(
      {
        url: '/performance/metrics',
        method: 'GET',
      },
      () => requestClient.get('/performance/metrics')
    );
  }

  // 获取匹配性能统计
  static async getMatchingStats(): Promise<any> {
    return requestDeduplicator.deduplicate(
      {
        url: '/performance/matching-stats',
        method: 'GET',
      },
      () => requestClient.get('/performance/matching-stats')
    );
  }

  // 获取慢查询日志
  static async getSlowQueries(): Promise<any> {
    return requestDeduplicator.deduplicate(
      {
        url: '/performance/slow-queries',
        method: 'GET',
      },
      () => requestClient.get('/performance/slow-queries')
    );
  }
}
