import type { App, Directive, DirectiveBinding } from 'vue'
import { useUserStore, useAccessStore } from '@vben/stores'

/**
 * 权限指令
 * 用法：
 * v-permission="'user:create'" - 单个权限
 * v-permission="['user:create', 'user:edit']" - 多个权限（OR关系）
 * v-permission.all="['user:create', 'user:edit']" - 多个权限（AND关系）
 * v-permission:role="'admin'" - 角色权限
 * v-permission:role.all="['admin', 'manager']" - 多个角色（AND关系）
 */
const permissionDirective: Directive = {
  mounted(el: HTMLElement, binding: DirectiveBinding) {
    checkPermission(el, binding)
  },
  updated(el: HTMLElement, binding: DirectiveBinding) {
    checkPermission(el, binding)
  }
}

function checkPermission(el: HTMLElement, binding: DirectiveBinding) {
  const { value, arg, modifiers } = binding
  
  if (!value) {
    console.warn('v-permission指令需要传入权限值')
    return
  }

  // 延迟获取 store，确保 Pinia 已初始化
  const userStore = useUserStore()
  const accessStore = useAccessStore()

  let hasPermission = false

  // 超级管理员拥有所有权限
  if (userStore.userInfo?.roles?.includes('super_admin')) {
    hasPermission = true
  } else {
    // 角色权限检查
    if (arg === 'role') {
      hasPermission = checkRolePermission(value, modifiers.all || false, userStore)
    } else {
      // 功能权限检查
      hasPermission = checkFunctionPermission(value, modifiers.all || false, accessStore)
    }
  }

  // 根据权限结果显示或隐藏元素
  if (!hasPermission) {
    // 移除元素而不是隐藏，避免占用空间
    el.remove()
  }
}

/**
 * 检查角色权限
 */
function checkRolePermission(roles: string | string[], requireAll: boolean, userStore: any): boolean {
  const userRoles = userStore.userInfo?.roles || []
  
  if (typeof roles === 'string') {
    return userRoles.includes(roles)
  }
  
  if (Array.isArray(roles)) {
    if (requireAll) {
      // 需要拥有所有角色
      return roles.every(role => userRoles.includes(role))
    } else {
      // 拥有任一角色即可
      return roles.some(role => userRoles.includes(role))
    }
  }
  
  return false
}

/**
 * 检查功能权限
 */
function checkFunctionPermission(permissions: string | string[], requireAll: boolean, accessStore: any): boolean {
  const userPermissions = accessStore.accessCodes || []
  
  if (typeof permissions === 'string') {
    return userPermissions.includes(permissions)
  }
  
  if (Array.isArray(permissions)) {
    if (requireAll) {
      // 需要拥有所有权限
      return permissions.every(permission => userPermissions.includes(permission))
    } else {
      // 拥有任一权限即可
      return permissions.some(permission => userPermissions.includes(permission))
    }
  }
  
  return false
}

/**
 * 权限检查函数（用于在组件中编程式检查）
 */
export function hasPermission(permission: string | string[], requireAll = false): boolean {
  const userStore = useUserStore()
  const accessStore = useAccessStore()
  
  // 超级管理员拥有所有权限
  if (userStore.userInfo?.roles?.includes('super_admin')) {
    return true
  }
  
  return checkFunctionPermission(permission, requireAll, accessStore)
}

/**
 * 角色检查函数
 */
export function hasRole(role: string | string[], requireAll = false): boolean {
  const userStore = useUserStore()
  
  return checkRolePermission(role, requireAll, userStore)
}

/**
 * 安装权限指令
 */
export function setupPermissionDirective(app: App) {
  app.directive('permission', permissionDirective)
}

export default permissionDirective
