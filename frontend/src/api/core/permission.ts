import { requestClient } from '#/api/request';

export namespace PermissionApi {
  /** 权限信息 */
  export interface PermissionInfo {
    id: string;
    name: string;
    code: string;
    type: 'MENU' | 'BUTTON' | 'API';
    resource?: string;
    action?: string;
    description?: string;
    parentId?: string;
    sort?: number;
    status: number;
    createdAt: string;
    updatedAt: string;
    children?: PermissionInfo[];
  }

  /** 权限列表查询参数 */
  export interface PermissionListParams {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    status?: number;
    parentId?: string;
    sort?: string;
    order?: 'asc' | 'desc';
  }

  /** 权限列表响应 */
  export interface PermissionListResult {
    data: PermissionInfo[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }

  /** 创建权限参数 */
  export interface CreatePermissionParams {
    name: string;
    code: string;
    type: 'MENU' | 'BUTTON' | 'API';
    resource?: string;
    action?: string;
    description?: string;
    parentId?: string;
    sort?: number;
  }

  /** 更新权限参数 */
  export interface UpdatePermissionParams {
    name?: string;
    code?: string;
    type?: 'MENU' | 'BUTTON' | 'API';
    resource?: string;
    action?: string;
    description?: string;
    parentId?: string;
    sort?: number;
    status?: number;
  }
}

/**
 * 获取权限列表
 */
export async function getPermissionListApi(
  params?: PermissionApi.PermissionListParams,
) {
  return requestClient.get<PermissionApi.PermissionListResult>('/permissions', {
    params,
  });
}

/**
 * 获取权限树形结构
 */
export async function getPermissionTreeApi() {
  return requestClient.get<PermissionApi.PermissionInfo[]>('/permissions/tree');
}

/**
 * 获取权限树形结构（用于选择器）
 */
export async function getPermissionTreeSelectApi() {
  return requestClient.get<PermissionApi.PermissionInfo[]>('/permissions/tree-select');
}

/**
 * 获取权限树形列表（用于树形表格）
 */
export async function getPermissionTreeListApi(params?: {
  search?: string;
  type?: string;
  status?: number;
}) {
  return requestClient.get<{
    data: PermissionApi.PermissionInfo[];
    total: number;
  }>('/permissions/tree-list', {
    params,
  });
}

/**
 * 获取权限详情
 */
export async function getPermissionDetailApi(id: string) {
  return requestClient.get<PermissionApi.PermissionInfo>(`/permissions/${id}`);
}

/**
 * 创建权限
 */
export async function createPermissionApi(
  data: PermissionApi.CreatePermissionParams,
) {
  return requestClient.post<PermissionApi.PermissionInfo>('/permissions', data);
}

/**
 * 更新权限
 */
export async function updatePermissionApi(
  id: string,
  data: PermissionApi.UpdatePermissionParams,
) {
  return requestClient.put<PermissionApi.PermissionInfo>(
    `/permissions/${id}`,
    data,
  );
}

/**
 * 删除权限
 */
export async function deletePermissionApi(id: string) {
  return requestClient.delete(`/permissions/${id}`);
}
