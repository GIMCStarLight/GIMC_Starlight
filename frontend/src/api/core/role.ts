import { requestClient } from '#/api/request';

export namespace RoleApi {
  /** 角色信息 */
  export interface RoleInfo {
    id: string;
    name: string;
    code: string;
    description?: string;
    status: number;
    userCount?: number;
    permissionCount?: number;
    permissions?: string[];
    children?: RoleInfo[];
    hasChildren?: boolean;
    parentId?: string;
    isSystem?: boolean;
    createdAt: string;
    updatedAt: string;
  }

  /** 角色列表查询参数 */
  export interface RoleListParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: number;
    parentId?: string;
  }

  /** 角色列表响应 */
  export interface RoleListResult {
    data: RoleInfo[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }

  /** 角色权限分配参数 */
  export interface AssignPermissionsParams {
    roleId: string;
    permissionIds: string[];
  }

  /** 角色用户分配参数 */
  export interface AssignUsersParams {
    roleId: string;
    userIds: string[];
  }

  /** 创建角色参数 */
  export interface CreateRoleParams {
    name: string;
    code: string;
    description?: string;
    parentId?: string;
    permissions?: string[];
  }

  /** 更新角色参数 */
  export interface UpdateRoleParams {
    name?: string;
    code?: string;
    description?: string;
    status?: number;
    permissions?: string[];
  }
}

/**
 * 获取角色列表
 */
export async function getRoleListApi(params?: RoleApi.RoleListParams) {
  return requestClient.get<RoleApi.RoleListResult>('/roles', {
    params,
  });
}

/**
 * 获取角色详情
 */
export async function getRoleDetailApi(id: string) {
  return requestClient.get<RoleApi.RoleInfo>(`/roles/${id}`);
}

/**
 * 获取角色权限列表
 */
export async function getRolePermissionsApi(id: string) {
  return requestClient.get<RoleApi.PermissionInfo[]>(`/roles/${id}/permissions`);
}

/**
 * 获取角色可分配的权限
 */
export async function getRoleAssignablePermissionsApi(id: string) {
  return requestClient.get<RoleApi.PermissionInfo[]>(`/roles/${id}/assignable-permissions`);
}

/**
 * 创建角色
 */
export async function createRoleApi(data: RoleApi.CreateRoleParams) {
  return requestClient.post<RoleApi.RoleInfo>('/roles', data);
}

/**
 * 更新角色
 */
export async function updateRoleApi(
  id: string,
  data: RoleApi.UpdateRoleParams,
) {
  return requestClient.put<RoleApi.RoleInfo>(`/roles/${id}`, data);
}

/**
 * 删除角色
 */
export async function deleteRoleApi(id: string) {
  return requestClient.delete(`/roles/${id}`);
}


/**
 * 分配角色权限
 */
export async function assignRolePermissionsApi(
  data: RoleApi.AssignPermissionsParams,
): Promise<void> {
  return requestClient.post(`/roles/${data.roleId}/permissions`, {
    permissionIds: data.permissionIds,
  });
}

/**
 * 获取角色用户列表
 */
export async function getRoleUsersApi(
  id: string,
  params?: { page?: number; limit?: number },
): Promise<any> {
  return requestClient.get(`/roles/${id}/users`, {
    params: {
      page: params?.page || 1,
      limit: params?.limit || 10,
    },
  });
}

/**
 * 分配角色用户
 */
export async function assignRoleUsersApi(
  data: RoleApi.AssignUsersParams,
): Promise<void> {
  return requestClient.post(`/roles/${data.roleId}/users`, {
    user_ids: data.userIds,
  });
}

/**
 * 移除角色用户
 */
export async function removeRoleUsersApi(
  roleId: string,
  userIds: string[],
): Promise<void> {
  return requestClient.delete(`/roles/${roleId}/users`, {
    data: { user_ids: userIds },
  });
}

/**
 * 获取角色树形结构
 */
export async function getRoleTreeApi(): Promise<RoleApi.RoleInfo[]> {
  return requestClient.get('roles/tree');
}

/**
 * 获取角色树形列表（用于树形表格）
 */
export async function getRoleTreeListApi(params?: {
  search?: string;
  status?: number;
}) {
  return requestClient.get<{
    data: RoleApi.RoleInfo[];
    total: number;
  }>('/roles/tree-list', {
    params,
  });
}

/**
 * 批量删除角色
 */
export async function batchDeleteRolesApi(ids: string[]): Promise<void> {
  return requestClient.delete('roles/batch', {
    data: { ids },
  });
}
