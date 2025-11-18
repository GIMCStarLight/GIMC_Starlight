import type { Recordable, UserInfo } from '@vben/types';

import { ref } from 'vue';

import { LOGIN_PATH } from '@vben/constants';
import { preferences } from '@vben/preferences';
import { resetAllStores, useAccessStore, useUserStore } from '@vben/stores';

import { ElNotification } from 'element-plus';
import { defineStore } from 'pinia';

import {
  getAccessCodesApi,
  getCurrentUserApi,
  getUserProfileApi,
  loginApi,
  logoutApi,
} from '#/api';
import { $t } from '#/locales';
import { log } from '../../utils/logger';

export const useAuthStore = defineStore('auth', () => {
  const loginLoading = ref(false);

  async function authLogin(
    params: Recordable<any>,
    onSuccess?: () => Promise<void> | void,
  ) {
    const accessStore = useAccessStore();
    const userStore = useUserStore();

    // 异步处理用户登录操作并获取 accessToken
    let userInfo: null | UserInfo = null;
    try {
      log.debug('开始登录，设置loading为true');
      loginLoading.value = true;
      log.debug('发送登录请求，参数:', params);
      const loginResult = await loginApi(params);
      log.debug('登录API响应:', loginResult.data);

      const accessToken =
        loginResult?.accessToken ||
        loginResult?.data?.accessToken ||
        loginResult?.data?.data?.accessToken;

      log.debug("accessToken", accessToken)
      if (accessToken) {
        log.success('获取到accessToken:', accessToken);
        // 将 accessToken 存储到 accessStore 中
        accessStore.setAccessToken(accessToken);
        log.success('accessToken已存储到store');
        // 存储 refreshToken（虽然主要通过Cookie，但也可以存储备用）
        const refreshToken =
          loginResult?.refreshToken ||
          loginResult?.data?.refreshToken ||
          loginResult?.data?.data?.refreshToken;
        if (refreshToken) {
          log.debug('获取到refreshToken:', refreshToken);
          accessStore.setRefreshToken(refreshToken);
          log.success('refreshToken已存储到store');
        }

        // 直接使用登录API返回的用户信息
        if (loginResult?.user) {
          userInfo = await processUserInfo(loginResult.user);
        } else {
          // 如果登录API没有返回用户信息，则调用获取用户信息API
          userInfo = await fetchUserInfo();
        }

        // 获取用户权限码
        await fetchAccessCodes();

        if (accessStore.loginExpired) {
          log.debug('处理登录过期状态');
          accessStore.setLoginExpired(false);
        } else {
          if (onSuccess) {
            log.debug('执行onSuccess回调');
            await onSuccess?.();
          } else {
            // 登录成功后，跳转到用户主页或默认首页
            const redirectPath = userInfo?.homePath || preferences.app.defaultHomePath;
            log.debug('准备跳转到:', redirectPath);
            log.debug('用户信息homePath:', userInfo?.homePath);
            log.debug('默认首页路径:', preferences.app.defaultHomePath);

            // 使用window.location进行跳转，避免router实例问题
            log.debug('使用window.location进行跳转...');
            window.location.href = redirectPath;
            log.success('跳转指令已发送');
          }
        }

        if (userInfo?.realName) {
          ElNotification({
            message: `${$t('authentication.loginSuccessDesc')}:${userInfo?.realName}`,
            title: $t('authentication.loginSuccess'),
            type: 'success',
          });
        }
      }
    } catch (error) {
      // 登录失败，立即重置loading状态
      log.error('登录失败，立即设置loading为false');
      loginLoading.value = false;
      // 重新抛出错误让调用方和拦截器处理
      throw error;
    } finally {
      // 确保loading状态被重置（防御性编程）
      log.debug('finally块执行，确保loading为false');
      loginLoading.value = false;
    }

    return {
      userInfo,
    };
  }

  async function logout(redirect: boolean = true) {
    const accessStore = useAccessStore();
    log.info('开始执行退出登录...');

    try {
      log.debug('调用退出登录API...');
      await logoutApi();
      log.success('退出登录API调用成功');
    } catch (error) {
      log.warn('退出登录API调用失败，但继续执行清理:', error);
    }

    log.debug('清除token和状态...');
    // 显式清除token和相关状态
    accessStore.setAccessToken(null);
    accessStore.setRefreshToken(null);
    accessStore.setAccessCodes([]);
    accessStore.setIsAccessChecked(false);
    accessStore.setLoginExpired(false);
    
    // 清除用户信息
    const userStore = useUserStore();
    userStore.setUserInfo(null);
    
    log.success('认证状态清除完成');

    // 构建登录页URL - 强制刷新页面
    const isHashMode = window.location.hash !== '';
    
    if (isHashMode) {
      // Hash路由模式：直接修改hash并强制刷新整个页面
      log.debug('Hash路由模式，准备跳转到登录页');
      // 先设置hash到登录页
      window.location.hash = LOGIN_PATH;
      // 立即强制刷新整个页面，确保状态完全清空
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } else {
      // History路由模式：直接使用href跳转会自动刷新
      let loginUrl = LOGIN_PATH;
      if (redirect) {
        const currentPath = window.location.pathname + window.location.search;
        if (currentPath && currentPath !== LOGIN_PATH) {
          loginUrl += `?redirect=${encodeURIComponent(currentPath)}`;
        }
      }
      log.debug('准备跳转到登录页:', loginUrl);
      window.location.href = loginUrl;
    }
    
    log.success('退出登录跳转指令已发送');
  }

  /**
   * 处理用户信息（从登录API或用户信息API）
   */
  async function processUserInfo(userInfo: any) {
    const transformedUserInfo = {
      avatar: userInfo.avatar || userInfo.avatarUrl,
      // homePath: '/home/index', // 设置为默认首页，不需要特殊权限
      homePath: userInfo.homePath || preferences.app.defaultHomePath, // 使用用户设置的homePath或默认路径
      realName: userInfo.name || userInfo.realName, // 修复realName映射
      roles: userInfo.roles || ['user'], // 确保有默认角色
      userId: userInfo.id, // 修复userId映射
      username: userInfo.username || userInfo.phone, // 使用phone作为username备选
      email: userInfo.email,
      department: userInfo.department,
      position: userInfo.position,
      status: userInfo.status,
      permissions: userInfo.permissions || [],
      createdAt: userInfo.createdAt,
      updatedAt: userInfo.updatedAt,
      lastLoginAt: userInfo.lastLoginAt,
    };

    const userStore = useUserStore();
    userStore.setUserInfo(transformedUserInfo);
    return transformedUserInfo;
  }

  // 添加重试计数器
  let userInfoRetryCount = 0;
  const MAX_USER_INFO_RETRY = 3;
  let lastUserInfoRetryTime = 0;
  const USER_INFO_RETRY_INTERVAL = 3000; // 3秒重试间隔

  /**
   * 获取用户信息
   */
  async function fetchUserInfo() {
    // 检查重试限制
    const now = Date.now();
    if (userInfoRetryCount >= MAX_USER_INFO_RETRY) {
      userInfoRetryCount = 0; // 重置计数器
      throw new Error('获取用户信息重试次数超限');
    }

    // 检查重试间隔
    if (now - lastUserInfoRetryTime < USER_INFO_RETRY_INTERVAL) {
      throw new Error('重试间隔未到');
    }

    try {
      userInfoRetryCount++;
      lastUserInfoRetryTime = now;

      const userInfo = await getCurrentUserApi();

      // 成功后重置计数器
      userInfoRetryCount = 0;
      return await processUserInfo(userInfo);
    } catch (error) {
      throw error;
    }
  }

  // 添加请求防抖机制
  let fetchAccessCodesPromise: Promise<string[]> | null = null;

  /**
   * 获取用户权限码
   */
  async function fetchAccessCodes() {
    const accessStore = useAccessStore();
    
    // 如果已有缓存的权限码，直接返回
    if (accessStore.accessCodes && accessStore.accessCodes.length > 0) {
      log.debug('使用缓存的权限码');
      return accessStore.accessCodes;
    }

    // 如果正在请求中，返回同一个 Promise
    if (fetchAccessCodesPromise) {
      log.debug('正在请求权限码，复用同一请求');
      return fetchAccessCodesPromise;
    }

    // 创建新的请求
    fetchAccessCodesPromise = (async () => {
      try {
        log.debug('开始请求权限码...');
        const response = await getAccessCodesApi();

        // 提取权限码数组，处理可能的响应格式
        let codes: string[] = [];
        if (Array.isArray(response)) {
          codes = response;
        } else if (
          response &&
          typeof response === 'object' &&
          'data' in response
        ) {
          codes = Array.isArray(response.data) ? response.data : [];
        } else if (
          response &&
          typeof response === 'object' &&
          Array.isArray(response.codes)
        ) {
          codes = response.codes;
        }

        accessStore.setAccessCodes(codes);
        log.success('权限码获取成功，数量:', codes.length);
        return codes;
      } catch (error) {
        log.error('fetchAccessCodes - 获取权限码失败:', error);
        // 权限码获取失败不应该阻止登录流程，设置为空数组
        accessStore.setAccessCodes([]);
        return [];
      } finally {
        // 请求完成后清除 Promise
        fetchAccessCodesPromise = null;
      }
    })();

    return fetchAccessCodesPromise;
  }

  function $reset() {
    loginLoading.value = false;
  }

  return {
    $reset,
    authLogin,
    fetchAccessCodes,
    fetchUserInfo,
    loginLoading,
    logout,
  };
});
