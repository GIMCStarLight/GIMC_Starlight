/**
 * 该文件可自行根据业务逻辑进行调整
 */
import type { RequestClientOptions } from '@vben/request';

import { useAppConfig } from '@vben/hooks';
import { preferences } from '@vben/preferences';
import {
  authenticateResponseInterceptor,
  defaultResponseInterceptor,
  errorMessageResponseInterceptor,
  RequestClient,
} from '@vben/request';
import { useAccessStore } from '@vben/stores';

import { ElMessage } from 'element-plus';

import { useAuthStore } from '#/store';

import { refreshTokenApi } from './core';

function createRequestClient(baseURL: string, options?: RequestClientOptions) {
  const client = new RequestClient({
    ...options,
    baseURL,
  });

  /**
   * 重新认证逻辑 - 简化版本，直接跳转登录页
   */
  async function doReAuthenticate() {
    console.warn('Access token or refresh token is invalid or expired. ');
    const accessStore = useAccessStore();
    const authStore = useAuthStore();
    
    // 立即清理所有认证状态
    accessStore.setAccessToken(null);
    accessStore.setRefreshToken(null);
    accessStore.setIsAccessChecked(false);
    
    // 强制重置登录状态
    authStore.loginLoading = false;
    
    // 清空所有缓存
    try {
      // 清空 localStorage
      localStorage.clear();
      console.log('✅ localStorage已清空');
      
      // 清空 sessionStorage
      sessionStorage.clear();
      console.log('✅ sessionStorage已清空');
      
      // 清空所有cookies
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substr(0, eqPos) : c;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=." + window.location.hostname;
      });
      console.log('✅ cookies已清空');
    } catch (error) {
      console.error('清空缓存时出错:', error);
    }
    
    // 直接执行登出，跳转到登录页
    await authStore.logout();
  }

  /**
   * 刷新token
   */
  async function doRefreshToken() {
    const accessStore = useAccessStore();
    
    try {
      const result = await refreshTokenApi();
      console.log('刷新token API响应:', result);
      
      // baseRequestClient.post 默认会返回 AxiosResponse，structure 可能为:
      // 1) AxiosResponse -> result.data = { code, message, data: { accessToken, ... } }
      // 2) 已经被拦截器处理过 -> result = { accessToken, refreshToken, ... }
      // 兼容两种情况，优先读取内部 data 字段
      const payload =
        // 如果是 AxiosResponse 且 data 包含 data 字段
        (result && (result as any).data && (result as any).data.data)
          ? (result as any).data.data
          : // 否则如果是 AxiosResponse，取其 data；或直接取 result
            (result && (result as any).data) || result;

      console.log('解析后的payload:', payload);

      const accessToken = payload?.accessToken;
      const refreshToken = payload?.refreshToken;
      
      if (accessToken) {
        console.log('刷新token成功，新的accessToken:', accessToken);
        accessStore.setAccessToken(accessToken);
        // 存储新的refreshToken
        if (refreshToken) {
          console.log('更新refreshToken:', refreshToken);
          accessStore.setRefreshToken(refreshToken);
        }
        return accessToken;
      }
      
      console.error('刷新token失败：未找到accessToken', payload);
      throw new Error('刷新令牌失败：未找到accessToken');
    } catch (error) {
      console.error('刷新token过程中发生错误:', error);
      
      // 清空所有缓存
      try {
        // 清空 localStorage
        localStorage.clear();
        console.log('✅ localStorage已清空');
        
        // 清空 sessionStorage
        sessionStorage.clear();
        console.log('✅ sessionStorage已清空');
        
        // 清空所有cookies
        document.cookie.split(";").forEach((c) => {
          const eqPos = c.indexOf("=");
          const name = eqPos > -1 ? c.substr(0, eqPos) : c;
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=." + window.location.hostname;
        });
        console.log('✅ cookies已清空');
      } catch (clearError) {
        console.error('清空缓存时出错:', clearError);
      }
      
      throw error;
    }
  }

  function formatToken(token: null | string) {
    return token ? `Bearer ${token}` : null;
  }

  // 请求头处理
  client.addRequestInterceptor({
    fulfilled: async (config) => {
      const accessStore = useAccessStore();
      const authHeader = formatToken(accessStore.accessToken);
      if (authHeader) {
        config.headers.Authorization = authHeader;
      } else {
        // 避免发送无效 Authorization 头
        if (config.headers && 'Authorization' in config.headers) {
          delete (config.headers as Record<string, any>).Authorization;
        }
      }
      config.headers['Accept-Language'] = preferences.app.locale;
      return config;
    },
  });

  // 处理返回的响应数据格式
  client.addResponseInterceptor(
    defaultResponseInterceptor({
      codeField: 'code',
      dataField: 'data',
      successCode: (code: any) => code === 200 || code === 201,
    }),
  );

  // 认证失败与刷新令牌处理（401 优先处理）
  client.addResponseInterceptor(
    authenticateResponseInterceptor({
      client,
      doReAuthenticate,
      doRefreshToken,
      enableRefreshToken: preferences.app.enableRefreshToken,
      formatToken,
    }),
  );

  // 通用错误提示（非401等错误）
  client.addResponseInterceptor(
    errorMessageResponseInterceptor((msg: string, error) => {
      const responseData = error?.response?.data ?? {};
      const errorMessage = responseData?.message ?? '';
      ElMessage.error(errorMessage || msg);
      return Promise.reject(error);
    }),
  );

  // 权限更新强制登出拦截器
  client.addResponseInterceptor({
    rejected: async (error) => {
      const { response } = error;
      // 检查是否是权限更新导致的强制登出（状态码 460）
      if (response?.status === 460) {
        const authStore = useAuthStore();
        ElMessage.warning({
          message: '您的权限已更新，请重新登录以获取最新权限',
          duration: 3000,
        });
        // 延迟1秒后自动登出，给用户看到提示的时间
        setTimeout(async () => {
          await authStore.logout(true);
        }, 1000);
        return Promise.reject(error);
      }
      throw error;
    },
  });

  return client;
}

// 延迟初始化requestClient，避免在模块加载时调用useAppConfig
let _requestClient: RequestClient | null = null;
let _baseRequestClient: RequestClient | null = null;

function getApiURL() {
  try {
    const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);
    return apiURL;
  } catch (error) {
    console.error('Error getting apiURL:', error);
    return 'http://localhost:5320/api'; // fallback URL
  }
}

function getRequestClient(): RequestClient {
  if (!_requestClient) {
    const apiURL = getApiURL();
    _requestClient = createRequestClient(apiURL, {
      responseReturn: 'data',
    });
  }
  return _requestClient;
}

export const requestClient = new Proxy({} as RequestClient, {
  get(_target, prop) {
    const client = getRequestClient();
    const value = Reflect.get(client, prop);
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
  set(_target, prop, value) {
    const client = getRequestClient();
    return Reflect.set(client, prop, value);
  },
  has(_target, prop) {
    const client = getRequestClient();
    return Reflect.has(client, prop);
  },
  ownKeys(_target) {
    const client = getRequestClient();
    return Reflect.ownKeys(client);
  },
  getPrototypeOf(_target) {
    const client = getRequestClient();
    return Reflect.getPrototypeOf(client);
  }
});

// 为baseRequestClient也配置错误拦截器，确保登录等基础API也能正确显示错误提示
export const baseRequestClient = new Proxy({} as RequestClient, {
  get(target, prop) {
    if (!_baseRequestClient) {
      _baseRequestClient = createRequestClient(getApiURL());
    }
    return Reflect.get(_baseRequestClient, prop);
  },
});
