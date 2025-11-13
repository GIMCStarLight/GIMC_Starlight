import { baseRequestClient, requestClient } from '#/api/request';

export namespace AuthApi {
  /** 登录接口参数 */
  export interface LoginParams {
    phone: string;
    password: string;
  }

  /** 注册接口参数 */
  export interface RegisterParams {
    phone: string;
    password: string;
    confirmPassword: string;
    name: string;
  }

  /** 用户信息 */
  export interface UserInfo {
    id: string;
    phone: string;
    name: string;
    email?: string;
    department?: string;
    position?: string;
    avatarUrl?: string;
    status: number;
    roles?: string[];
    permissions?: string[];
    createdAt: string;
    updatedAt: string;
    lastLoginAt?: string;
  }

  /** 登录接口返回值 */
  export interface LoginResult {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
    refreshExpiresIn: number;
    user: UserInfo;
  }

  /** 刷新Token返回值 */
  export interface RefreshTokenResult {
    accessToken: string;
    refreshToken: string;
    tokenType: string;
    expiresIn: number;
    refreshExpiresIn: number;
  }

  /** 修改密码参数 */
  export interface ChangePasswordParams {
    oldPassword: string;
    newPassword: string;
  }

  /** 更新用户资料参数 */
  export interface UpdateProfileParams {
    name?: string;
    email?: string;
    department?: string;
    position?: string;
  }
}

/**
 * 用户登录
 */
export async function loginApi(data: AuthApi.LoginParams) {
  
  try {
    const result = await baseRequestClient.post<AuthApi.LoginResult>('/auth/login', data, {
      withCredentials: true,
    });
    return result;
  } catch (error) {
    throw error;
  }
}

/**
 * 用户注册
 */
export async function registerApi(data: AuthApi.RegisterParams) {
  return baseRequestClient.post<AuthApi.LoginResult>('/auth/register', data, {
    withCredentials: true,
  });
}

/**
 * 刷新访问令牌
 */
export async function refreshTokenApi(refreshToken?: string) {
  const data = refreshToken ? { refreshToken } : undefined;
  return baseRequestClient.post<AuthApi.RefreshTokenResult>('/auth/refresh', data, {
    withCredentials: true,
  });
}

/**
 * 获取用户资料
 */
export async function getUserProfileApi() {
  return requestClient.get<AuthApi.UserInfo>('/auth/profile');
}

/**
 * 修改密码
 */
export async function changePasswordApi(data: AuthApi.ChangePasswordParams) {
  return requestClient.patch('/auth/password', data);
}

/**
 * 更新用户资料
 */
export async function updateProfileApi(data: AuthApi.UpdateProfileParams) {
  return requestClient.patch<AuthApi.UserInfo>('/auth/profile', data);
}

/**
 * 退出登录
 */
export async function logoutApi() {
  return baseRequestClient.post('/auth/logout', undefined, {
    withCredentials: true,
  });
}

/**
 * 获取用户权限码
 */
export async function getAccessCodesApi() {
  return requestClient.get<string[]>('/auth/codes');
}

/**
 * 获取当前用户信息(包含角色和权限)
 */
export async function getCurrentUserApi() {
  return requestClient.get<AuthApi.UserInfo>('/auth/profile');
}
