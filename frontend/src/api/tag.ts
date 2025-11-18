import type { RequestClient } from '@vben/request';
import { requestClient } from './request';
import { requestDeduplicator } from '../utils/request-deduplicator';

// 标签相关的类型定义
export interface Tag {
  id: number;
  name: string;
  code?: string;
  description?: string;
  platform: string;
  level: number;
  parentId?: number;
  sort: number;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  parent?: Tag;
  children?: Tag[];
  fullPath?: string;
  isRoot?: boolean;
  isLeaf?: boolean;
}

export interface CreateTagDto {
  name: string;
  code?: string;
  description?: string;
  platform: string;
  parentId?: number;
  sort?: number;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface UpdateTagDto {
  name?: string;
  code?: string;
  description?: string;
  platform?: string;
  parentId?: number;
  sort?: number;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface QueryTagDto {
  page?: number;
  limit?: number;
  name?: string;
  platform?: string;
  parentId?: number;
  level?: number;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  includeChildren?: boolean;
  rootOnly?: boolean;
}

export interface PaginatedTagResponse {
  data: Tag[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface TagTreeNode extends Tag {
  children?: TagTreeNode[];
}

/**
 * 标签API类
 */
class TagApi {
  private client: RequestClient;

  constructor(client: RequestClient) {
    this.client = client;
  }

  /**
   * 创建标签
   */
  create = async (data: CreateTagDto): Promise<Tag> => {
    return this.client.post('/tags', data);
  }

  /**
   * 分页查询标签列表
   */
  findAll = async (params?: QueryTagDto): Promise<PaginatedTagResponse> => {
    return requestDeduplicator.deduplicate(
      {
        url: '/tags',
        method: 'GET',
        params,
      },
      () => this.client.get('/tags', { params })
    );
  }

  /**
   * 获取标签树结构
   */
  getTree = async (filters?: { platform?: string; name?: string; isActive?: boolean }): Promise<TagTreeNode[]> => {
    const params = filters ? Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => value !== undefined)
    ) : undefined;
    return requestDeduplicator.deduplicate(
      {
        url: '/tags/tree',
        method: 'GET',
        params,
      },
      () => this.client.get('tags/tree', { params })
    );
  }

  /**
   * 根据ID查询标签详情
   */
  findOne = async (id: number): Promise<Tag> => {
    return this.client.get(`/tags/${id}`);
  }

  /**
   * 获取标签的所有祖先
   */
  getAncestors = async (id: number): Promise<Tag[]> => {
    return this.client.get(`/tags/${id}/ancestors`);
  }

  /**
   * 获取标签的所有后代
   */
  getDescendants = async (id: number): Promise<Tag[]> => {
    return this.client.get(`/tags/${id}/descendants`);
  }

  /**
   * 更新标签
   */
  update = async (id: number, data: UpdateTagDto): Promise<Tag> => {
    return this.client.patch(`/tags/${id}`, data);
  }

  /**
   * 移动标签到新的父级
   */
  moveTag = async (id: number, parentId?: number): Promise<Tag> => {
    return this.client.patch(`/tags/${id}/move`, { parentId });
  }

  /**
   * 删除标签
   */
  remove = async (id: number): Promise<void> => {
    return this.client.delete(`/tags/${id}`);
  }

  /**
   * 批量删除标签
   */
  removeMany = async (ids: number[]): Promise<void> => {
    return this.client.delete('/tags/batch', { data: { ids } });
  }

  /**
   * 根据平台查询标签列表
   */
  findByPlatform = async (platform: string, params?: Omit<QueryTagDto, 'platform'>): Promise<PaginatedTagResponse> => {
    return this.client.get(`/tags/platform/${platform}`, { params });
  }

  /**
   * 根据平台获取标签树结构
   */
  getTreeByPlatform = async (platform: string): Promise<TagTreeNode[]> => {
    return requestDeduplicator.deduplicate(
      {
        url: `/tags/platform/${platform}/tree`,
        method: 'GET',
      },
      () => this.client.get(`/tags/platform/${platform}/tree`)
    );
  }

  /**
   * 根据平台获取根级标签
   */
  getRootsByPlatform = async (platform: string, params?: Omit<QueryTagDto, 'platform' | 'rootOnly'>): Promise<PaginatedTagResponse> => {
    return requestDeduplicator.deduplicate(
      {
        url: `/tags/platform/${platform}/roots`,
        method: 'GET',
        params,
      },
      () => this.client.get(`/tags/platform/${platform}/roots`, { params })
    );
  }
}

// 导出标签API实例
export const tagApi = new TagApi(requestClient);

// 导出便捷方法
export const {
  create: createTag,
  findAll: getTags,
  getTree: getTagTree,
  findOne: getTag,
  getAncestors: getTagAncestors,
  getDescendants: getTagDescendants,
  update: updateTag,
  moveTag,
  remove: deleteTag,
  removeMany: deleteTags,
  findByPlatform: getTagsByPlatform,
  getTreeByPlatform: getTagTreeByPlatform,
  getRootsByPlatform: getRootTagsByPlatform,
} = tagApi;