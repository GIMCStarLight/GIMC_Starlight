/**
 * 字段级权限控制 Composable
 * 提供字段权限检查和列过滤功能
 */

import { computed } from 'vue'
import { useAccessStore, useUserStore } from '@vben/stores'
import {
  getAllowedFields,
  getPermissionForField,
  canViewField,
  getFieldPermissionsByResource,
} from '../config/field-permissions.config'

export interface ColumnConfig {
  prop: string
  label: string
  width?: number | string
  permission?: string  // 字段权限代码
  [key: string]: any
}

/**
 * 字段级权限控制 Composable
 * @param resource 资源类型: 'influencer' | 'kol' | 'supplier'
 */
export function useFieldPermissions(resource: 'influencer' | 'kol' | 'supplier') {
  const accessStore = useAccessStore()
  
  // 获取用户所有权限代码
  const userPermissions = computed<string[]>(() => {
    const permissions: string[] = []
    
    // 从 accessStore 获取权限
    const storedPermissions = accessStore.accessCodes || []
    storedPermissions.forEach((p: any) => {
      if (typeof p === 'string') {
        permissions.push(p)
      } else if (p?.code) {
        permissions.push(p.code)
      }
    })
    
    return permissions
  })
  
  // 检查是否是超级管理员
  const isSuperAdmin = computed(() => {
    const userStore = useUserStore()
    const roles = userStore.userInfo?.roles || []
    // 检查是否有通配符权限
    if (userPermissions.value.includes('*') || userPermissions.value.includes('*:*')) {
      return true
    }
    // 检查角色
    return roles.some((r: any) => 
      r === 'super_admin' || 
      r?.code === 'super_admin' ||
      r?.name === '超级管理员'
    )
  })
  
  // 获取用户允许查看的字段列表
  const allowedFields = computed(() => {
    if (isSuperAdmin.value) {
      // 超级管理员可以看所有字段
      const allFields: string[] = []
      const resourcePerms = getFieldPermissionsByResource(resource)
      Object.values(resourcePerms).forEach((fields: string[]) => {
        allFields.push(...fields)
      })
      return [...new Set(allFields)]
    }
    return getAllowedFields(userPermissions.value, resource)
  })
  
  /**
   * 检查用户是否有查看某字段的权限
   */
  function hasFieldPermission(fieldName: string): boolean {
    if (isSuperAdmin.value) return true
    return canViewField(fieldName, resource, userPermissions.value)
  }
  
  /**
   * 检查用户是否有某个字段权限组的权限
   */
  function hasFieldGroupPermission(permissionCode: string): boolean {
    if (isSuperAdmin.value) return true
    return userPermissions.value.includes(permissionCode)
  }
  
  /**
   * 过滤表格列配置，只返回用户有权限的列
   * @param columns 原始列配置
   * @returns 过滤后的列配置
   */
  function filterColumns<T extends ColumnConfig>(columns: T[]): T[] {
    if (isSuperAdmin.value) return columns
    
    return columns.filter(col => {
      // 如果列没有配置权限，默认显示
      if (!col.permission) {
        // 尝试通过字段名查找权限
        const permCode = getPermissionForField(col.prop, resource)
        if (!permCode) return true
        return userPermissions.value.includes(permCode)
      }
      
      // 检查配置的权限
      return userPermissions.value.includes(col.permission)
    })
  }
  
  /**
   * 为列配置自动添加权限属性
   * @param columns 原始列配置
   * @returns 带权限属性的列配置
   */
  function enrichColumnsWithPermission<T extends ColumnConfig>(columns: T[]): T[] {
    return columns.map(col => {
      if (col.permission) return col
      
      const permCode = getPermissionForField(col.prop, resource)
      if (permCode) {
        return { ...col, permission: permCode }
      }
      return col
    })
  }
  
  /**
   * 过滤对象中的字段，只保留有权限的字段
   * @param data 原始数据对象
   * @returns 过滤后的数据对象
   */
  function filterDataFields<T extends Record<string, any>>(data: T): Partial<T> {
    if (isSuperAdmin.value) return data
    
    const filtered: Partial<T> = {}
    const allowedSet = new Set(allowedFields.value.map(f => f.toLowerCase()))
    
    for (const [key, value] of Object.entries(data)) {
      const keyLower = key.toLowerCase()
      const snakeKey = camelToSnake(key).toLowerCase()
      const camelKey = snakeToCamel(key).toLowerCase()
      
      if (
        allowedSet.has(keyLower) ||
        allowedSet.has(snakeKey) ||
        allowedSet.has(camelKey) ||
        isSystemField(key)
      ) {
        (filtered as any)[key] = value
      }
    }
    
    return filtered
  }
  
  /**
   * 获取字段权限摘要（用于调试或显示）
   */
  function getPermissionSummary() {
    const resourcePerms = getFieldPermissionsByResource(resource)
    const summary: Record<string, { hasPermission: boolean; fields: string[] }> = {}
    
    for (const [code, fields] of Object.entries(resourcePerms)) {
      summary[code] = {
        hasPermission: isSuperAdmin.value || userPermissions.value.includes(code),
        fields: (fields as string[]).filter((f: string, i: number, arr: string[]) => arr.indexOf(f) === i), // 去重
      }
    }
    
    return summary
  }
  
  return {
    userPermissions,
    isSuperAdmin,
    allowedFields,
    hasFieldPermission,
    hasFieldGroupPermission,
    filterColumns,
    enrichColumnsWithPermission,
    filterDataFields,
    getPermissionSummary,
  }
}

// 工具函数
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

function isSystemField(field: string): boolean {
  const systemFields = [
    'id', 'createdAt', 'created_at', 'updatedAt', 'updated_at',
    '_id', 'total', 'page', 'pageSize', 'limit', 'offset',
  ]
  return systemFields.includes(field)
}

export default useFieldPermissions
