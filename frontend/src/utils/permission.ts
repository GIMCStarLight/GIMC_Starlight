import { useUserStore, useAccessStore } from '@vben/stores';

/**
 * 权限工具类
 */
export class PermissionUtils {
  /**
   * 获取用户 store
   */
  private static get userStore() {
    return useUserStore();
  }

  /**
   * 获取访问权限 store
   */
  private static get accessStore() {
    return useAccessStore();
  }

  /**
   * 检查是否为超级管理员
   */
  static isSuperAdmin(): boolean {
    return (
      this.userStore.userInfo?.roles?.includes('super_admin') || false
    );
  }

  /**
   * 检查是否有指定权限
   * @param permission 权限码或权限码数组
   * @param requireAll 是否需要全部权限（AND关系），默认false（OR关系）
   */
  static hasPermission(
    permission: string | string[],
    requireAll = false,
  ): boolean {
    // 超级管理员拥有所有权限
    if (this.isSuperAdmin()) {
      return true;
    }

    const userPermissions = this.accessStore.accessCodes || [];

    if (typeof permission === 'string') {
      return userPermissions.includes(permission);
    }

    if (Array.isArray(permission)) {
      if (requireAll) {
        return permission.every((p) => userPermissions.includes(p));
      } else {
        return permission.some((p) => userPermissions.includes(p));
      }
    }

    return false;
  }

  /**
   * 检查是否有指定角色
   * @param role 角色码或角色码数组
   * @param requireAll 是否需要全部角色（AND关系），默认false（OR关系）
   */
  static hasRole(role: string | string[], requireAll = false): boolean {
    const userRoles = this.userStore.userInfo?.roles || [];

    if (typeof role === 'string') {
      return userRoles.includes(role);
    }

    if (Array.isArray(role)) {
      if (requireAll) {
        return role.every((r) => userRoles.includes(r));
      } else {
        return role.some((r) => userRoles.includes(r));
      }
    }

    return false;
  }

  /**
   * 检查是否有任一权限
   * @param permissions 权限码数组
   */
  static hasAnyPermission(permissions: string[]): boolean {
    return this.hasPermission(permissions, false);
  }

  /**
   * 检查是否有全部权限
   * @param permissions 权限码数组
   */
  static hasAllPermissions(permissions: string[]): boolean {
    return this.hasPermission(permissions, true);
  }

  /**
   * 检查是否有任一角色
   * @param roles 角色码数组
   */
  static hasAnyRole(roles: string[]): boolean {
    return this.hasRole(roles, false);
  }

  /**
   * 检查是否有全部角色
   * @param roles 角色码数组
   */
  static hasAllRoles(roles: string[]): boolean {
    return this.hasRole(roles, true);
  }

  /**
   * 检查是否可以访问指定路由
   * @param routePath 路由路径
   */
  static canAccessRoute(routePath: string): boolean {
    // 这里可以根据路由配置中的权限要求进行检查
    // 暂时返回true，具体实现需要结合路由配置
    return true;
  }

  /**
   * 获取用户所有权限
   */
  static getUserPermissions(): string[] {
    return this.accessStore.accessCodes || [];
  }

  /**
   * 获取用户所有角色
   */
  static getUserRoles(): string[] {
    return this.userStore.userInfo?.roles || [];
  }

  /**
   * 检查是否有数据权限
   * @param dataScope 数据范围：all-全部数据，dept-部门数据，self-个人数据
   * @param targetUserId 目标用户ID（用于检查是否可以操作该用户的数据）
   */
  static hasDataPermission(
    dataScope: 'all' | 'dept' | 'self',
    targetUserId?: string,
  ): boolean {
    // 超级管理员拥有所有数据权限
    if (this.isSuperAdmin()) {
      return true;
    }

    const currentUserId = this.userStore.userInfo?.userId;

    switch (dataScope) {
      case 'all':
        // 检查是否有全部数据权限
        return this.hasRole(['business_admin', 'data_admin']);

      case 'dept':
        // 检查是否为同部门数据
        if (!targetUserId) return false;
        // 这里需要根据实际业务逻辑判断目标用户是否在同一部门
        return true;

      case 'self':
        // 只能操作自己的数据
        return currentUserId === targetUserId;

      default:
        return false;
    }
  }

  /**
   * 过滤有权限的菜单项
   * @param menuItems 菜单项数组
   */
  static filterMenusByPermission(menuItems: any[]): any[] {
    return menuItems.filter((item) => {
      // 如果没有权限要求，默认显示
      if (!item.permission && !item.role) {
        return true;
      }

      // 检查权限
      if (item.permission && !this.hasPermission(item.permission)) {
        return false;
      }

      // 检查角色
      if (item.role && !this.hasRole(item.role)) {
        return false;
      }

      // 递归过滤子菜单
      if (item.children && item.children.length > 0) {
        item.children = this.filterMenusByPermission(item.children);
      }

      return true;
    });
  }

  /**
   * 过滤有权限的按钮
   * @param buttons 按钮配置数组
   */
  static filterButtonsByPermission(buttons: any[]): any[] {
    return buttons.filter((button) => {
      if (!button.permission && !button.role) {
        return true;
      }

      if (button.permission && !this.hasPermission(button.permission)) {
        return false;
      }

      if (button.role && !this.hasRole(button.role)) {
        return false;
      }

      return true;
    });
  }
}

// 导出常用的权限检查函数
export const {
  hasPermission,
  hasRole,
  hasAnyPermission,
  hasAllPermissions,
  hasAnyRole,
  hasAllRoles,
  isSuperAdmin,
  hasDataPermission,
  getUserPermissions,
  getUserRoles,
  filterMenusByPermission,
  filterButtonsByPermission,
} = PermissionUtils;

// 默认导出
export default PermissionUtils;
