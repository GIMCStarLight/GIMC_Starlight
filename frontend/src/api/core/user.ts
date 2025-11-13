import type { UserInfo } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace UserApi {
  /** 用户信息 */
  export interface UserInfo {
    id: string;
    phone: string;
    name: string;
    email?: string;
    department?: string;
    position?: string;
    avatar?: string;
    avatarUrl?: string;
    status: number;
    roles?: Array<{
      id: string;
      name: string;
      code: string;
    }>;
    createdAt: string;
    updatedAt: string;
    lastLoginAt?: string;
  }

  /** 用户列表查询参数 */
  export interface UserListParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: number;
    department?: string;
    roleId?: string;
  }

  /** 用户列表响应 */
  export interface UserListResult {
    data: UserInfo[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }

  /** 更新用户参数 */
  export interface UpdateUserParams {
    name?: string;
    email?: string;
    department?: string;
    position?: string;
    status?: number;
    roleIds?: string[];
  }

  /** 重置密码响应 */
  export interface ResetPasswordResult {
    temporaryPassword: string;
    needChangePassword: boolean;
  }

  /** 批量删除参数 */
  export interface BatchDeleteParams {
    ids: string[];
  }

  /** 创建用户参数 */
  export interface CreateUserParams {
    name: string;
    email?: string;
    phone: string;
    department?: string;
    position?: string;
    password: string;
    roleIds?: string[];
  }

  /** 分配用户角色参数 */
  export interface AssignUserRolesParams {
    userId: string;
    roleIds: string[];
  }
}

/**
 * 获取用户信息（保持向后兼容）
 */
export async function getUserInfoApi() {
  return requestClient.get<UserInfo>('/user/info');
}

/**
 * 获取用户列表
 */
export async function getUserListApi(params?: UserApi.UserListParams) {
  return requestClient.get<UserApi.UserListResult>('/users', {
    params,
  });
}

/**
 * 获取用户详情
 */
export async function getUserDetailApi(id: string) {
  return requestClient.get<UserApi.UserInfo>(`/users/${id}`);
}

/**
 * 更新用户信息
 */
export async function updateUserApi(
  id: string,
  data: UserApi.UpdateUserParams,
) {
  return requestClient.put<UserApi.UserInfo>(`/users/${id}`, data);
}

/**
 * 删除用户
 */
export async function deleteUserApi(id: string) {
  return requestClient.delete(`/users/${id}`);
}

/**
 * 批量删除用户
 */
export async function batchDeleteUsersApi(data: UserApi.BatchDeleteParams) {
  return requestClient.delete('/users/batch', { data });
}

/**
 * 重置用户密码
 */
export async function resetUserPasswordApi(data: {
  userId: string;
  newPassword: string;
}) {
  return requestClient.post<UserApi.ResetPasswordResult>(
    `/users/${data.userId}/reset-password`,
    {
      newPassword: data.newPassword,
    },
  );
}

/**
 * 创建用户
 */
export async function createUserApi(data: UserApi.CreateUserParams) {
  return requestClient.post<UserApi.UserInfo>('/users', data);
}

/**
 * 分配用户角色
 */
export async function assignUserRolesApi(data: UserApi.AssignUserRolesParams) {
  return requestClient.post(`/users/${data.userId}/roles`, {
    roleIds: data.roleIds,
  });
}

/**
 * 获取当前用户信息(包含角色和权限)
 */
export async function getCurrentUserProfileApi() {
  return requestClient.get<
    UserApi.UserInfo & { roles: string[]; permissions: string[] }
  >('/auth/profile');
}
