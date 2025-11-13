import type { Router } from 'vue-router';
import { LOGIN_PATH } from '@vben/constants';
import { preferences } from '@vben/preferences';
import { useAccessStore, useUserStore } from '@vben/stores';
import { startProgress, stopProgress } from '@vben/utils';
import { useAuthStore } from '#/store';
import { accessRoutes, coreRouteNames } from '#/router/routes';
import { $t } from '#/locales';
import { generateAccess } from './access';

/**
 * 通用守卫配置
 * @param router
 */
function setupCommonGuard(router: Router) {
  // 记录已经加载的页面
  const loadedPaths = new Set<string>();
  router.beforeEach((to) => {
    to.meta.loaded = loadedPaths.has(to.path);
    // 页面加载进度条
    if (!to.meta.loaded && preferences.transition.progress) {
      startProgress();
    }
    return true;
  });

  router.afterEach((to) => {
    // 记录页面是否加载,如果已经加载，后续的页面切换动画等效果不在重复执行
    loadedPaths.add(to.path);
    // 关闭页面加载进度条
    if (preferences.transition.progress) { stopProgress(); }
  });
}

/**
 * 权限访问守卫配置
 * @param router
 */
function setupAccessGuard(router: Router) {
  // 添加防止无限循环的保护机制
  let isRedirectingToLogin = false;
  router.beforeEach(async (to, from) => {
    const accessStore = useAccessStore();
    const userStore = useUserStore();
    const authStore = useAuthStore();
    // 基本路由，这些路由不需要进入权限拦截
    if (coreRouteNames.includes(to.name as string)) {
      // 重置重定向标志
      if (to.path === LOGIN_PATH) {
        isRedirectingToLogin = false;
      }

      if (to.path === LOGIN_PATH && accessStore.accessToken) {
        // 已登录用户访问登录页，重定向到首页
        // 避免访问userStore.userInfo触发API调用，直接使用默认首页
        const redirectPath =
          (to.query?.redirect as string) ||
          preferences.app.defaultHomePath;

        // 避免循环重定向
        if (redirectPath === to.fullPath) {
          return true;
        }

        return {
          path: decodeURIComponent(redirectPath),
          replace: true,
        };
      }
      return true;
    }

    // 如果正在重定向到登录页，直接允许通过，避免无限循环
    if (isRedirectingToLogin && to.path === LOGIN_PATH) {
      isRedirectingToLogin = false;
      return true;
    }

    // accessToken 检查
    if (!accessStore.accessToken) {
      // 明确声明忽略权限访问权限，则可以访问
      if (to.meta.ignoreAccess) {
        return true;
      }

      // 没有访问权限，直接跳转登录页面
      if (to.fullPath !== LOGIN_PATH) {
        isRedirectingToLogin = true;
        return {
          path: LOGIN_PATH,
          query:
            to.fullPath === preferences.app.defaultHomePath || to.fullPath === '/home'
              ? {}
              : { redirect: encodeURIComponent(to.fullPath) },
          replace: true,
        };
      }
      return to;
    }

    // 是否已经生成过动态路由
    if (accessStore.isAccessChecked) {
      // 已登录且已检查过权限时，额外做一次基于路由 meta.permissions 的前端强校验
      const requiredPerms = (to.meta?.permissions || []) as string[];
      const needAuth = (to.meta?.requiresAuth as boolean) ?? false;
      if (needAuth && requiredPerms.length > 0) {
        try {
          // 使用已缓存的权限码，避免重复请求
          const codes: string[] = accessStore.accessCodes || [];
          if (codes.length > 0) {
            const has = requiredPerms.every((p) => codes.includes(p));
            if (!has) {
              // 无权限：阻止进入，保持在当前页或跳转到首页
              return from?.fullPath && from.fullPath !== to.fullPath
                ? from.fullPath
                : preferences.app.defaultHomePath;
            }
          }
        } catch (error) {
          // 权限检查失败，设置重定向标志并跳转登录页
          isRedirectingToLogin = true;
          return {
            path: LOGIN_PATH,
            query: { redirect: encodeURIComponent(to.fullPath) },
            replace: true,
          };
        }
      }
      return true;
    }

    // 生成路由表 - 简化逻辑，任何失败都直接跳转登录页
    let userInfo = userStore.userInfo;
    if (!userInfo) {
      try {
        userInfo = await authStore.fetchUserInfo();
      } catch (error) {
        // 获取用户信息失败，设置重定向标志并跳转登录页
        isRedirectingToLogin = true;
        return {
          path: LOGIN_PATH,
          query: { redirect: encodeURIComponent(to.fullPath) },
          replace: true,
        };
      }
    }
    const userRoles = userInfo.roles ?? [];

    // 获取用户权限码（只调用一次，后续使用缓存）
    let accessCodes: string[] = accessStore.accessCodes || [];
    if (!accessCodes.length) {
      try {
        accessCodes = await authStore.fetchAccessCodes();
      } catch (error) {
        // 获取权限码失败，设置重定向标志并跳转登录页
        isRedirectingToLogin = true;
        return {
          path: LOGIN_PATH,
          query: { redirect: encodeURIComponent(to.fullPath) },
          replace: true,
        };
      }
    }

    let accessibleMenus, accessibleRoutes;
    // 生成菜单和路由
    ({ accessibleMenus, accessibleRoutes } = await generateAccess({
      roles: userRoles,
      router,
      // 则会在菜单中显示，但是访问会被重定向到403
      routes: accessRoutes,
    }));

    // 如果后端菜单未返回“标签筛选”但用户拥有权限，则注入一个本地菜单项
    try {
      // 临时隐藏：标签筛选菜单 - 注释掉强制注入逻辑
      // // 使用已缓存的权限码
      // const hasTagFilterPerm = accessCodes.includes('tag:filter:view');
      // const hasTagFilterMenu = Array.isArray(accessibleMenus)
      //   ? accessibleMenus.some((m: any) => m?.path === '/tag-filter')
      //   : false;

      // if (hasTagFilterPerm && !hasTagFilterMenu) {
      //   const tagFilterMenu = {
      //     name: 'TagFilter',
      //     path: '/tag-filter',
      //     meta: {
      //       icon: 'lucide:filter',
      //       title: $t('page.tagFilter.title'),
      //     },
      //   } as any;
      //   accessibleMenus = Array.isArray(accessibleMenus)
      //     ? [...accessibleMenus, tagFilterMenu]
      //     : [tagFilterMenu];
      // }

      // const hasTagFilterRoute = router.hasRoute('TagFilter');
      // // 若路由表中没有 TagFilter，但本地动态路由里存在且用户有权限，则强制注册一次防止404
      // if (hasTagFilterPerm && !hasTagFilterRoute) {
      //   const localTagFilter = accessRoutes.find((r) => r.name === 'TagFilter');
      //   if (localTagFilter) {
      //     router.addRoute(localTagFilter);
      //   }
      // }
      // 依据本地权限码，裁剪掉不应该显示的菜单（例如后端误下发）
      const hasManage = accessCodes.includes('tag:manage');
      const hasFilter = accessCodes.includes('tag:filter:view');
      const prune = (menus: any[]): any[] =>
        (menus || [])
          .filter((m) => {
            if (m?.path === '/tag-management' && !hasManage) return false;
            if (m?.path === '/tag-filter' && !hasFilter) return false;
            return true;
          })
          .map((m) => ({
            ...m,
            children: Array.isArray(m?.children)
              ? prune(m.children)
              : m?.children,
          }));
      if (Array.isArray(accessibleMenus)) {
        accessibleMenus = prune(accessibleMenus);
      }
    } catch { }

    // 保存菜单信息和路由信息
    accessStore.setAccessMenus(accessibleMenus);
    accessStore.setAccessRoutes(accessibleRoutes);
    accessStore.setIsAccessChecked(true);

    // 进入目标页面前，执行一次前端权限强校验（基于路由 meta.permissions）
    const requiredPerms = (to.meta?.permissions || []) as string[];
    const needAuth = (to.meta?.requiresAuth as boolean) ?? false;
    if (needAuth && requiredPerms.length > 0) {
      // 使用已缓存的权限码
      const has = requiredPerms.every((p) => accessCodes.includes(p));
      if (!has) {
        return preferences.app.defaultHomePath;
      }
    }

    // 确定重定向路径
    let redirectPath: string;
    if (from.query.redirect) {
      // 如果有redirect参数，使用它
      redirectPath = from.query.redirect as string;
    } else if (to.path === '/' || to.path === preferences.app.defaultHomePath) {
      // 如果访问的是根路径或默认主页，跳转到用户主页
      redirectPath = userInfo.homePath || preferences.app.defaultHomePath;
    } else {
      // 否则跳转到原本要访问的页面
      redirectPath = to.fullPath;
    }

    const resolvedRoute = router.resolve(decodeURIComponent(redirectPath));

    return {
      ...resolvedRoute,
      replace: true,
    };
  });
}

/**
 * 项目守卫配置
 * @param router
 */
function createRouterGuard(router: Router) {
  /** 通用 */
  setupCommonGuard(router);
  /** 权限访问 */
  setupAccessGuard(router);
}

export { createRouterGuard };
