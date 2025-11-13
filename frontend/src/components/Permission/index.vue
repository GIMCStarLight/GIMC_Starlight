<template>
  <div v-if="hasAccess">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUserStore, useAccessStore } from '@vben/stores'

interface Props {
  /** 权限码，支持字符串或数组 */
  permission?: string | string[]
  /** 角色码，支持字符串或数组 */
  role?: string | string[]
  /** 是否需要全部权限/角色（AND关系），默认false（OR关系） */
  requireAll?: boolean
  /** 是否反向检查（没有权限时显示） */
  reverse?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  requireAll: false,
  reverse: false
})

const userStore = useUserStore()
const accessStore = useAccessStore()

// 检查是否有访问权限
const hasAccess = computed(() => {
  let result = false
  
  // 超级管理员拥有所有权限
  if (userStore.userInfo?.roles?.some(role => role.code === 'super_admin')) {
    result = true
  } else {
    // 角色权限检查
    if (props.role) {
      result = checkRolePermission()
    }
    // 功能权限检查
    else if (props.permission) {
      result = checkFunctionPermission()
    }
    // 如果既没有角色也没有权限要求，默认显示
    else {
      result = true
    }
  }
  
  // 反向检查
  return props.reverse ? !result : result
})

/**
 * 检查角色权限
 */
function checkRolePermission(): boolean {
  const userRoles = userStore.userInfo?.roles?.map(role => role.code) || []
  const { role, requireAll } = props
  
  if (!role) return false
  
  if (typeof role === 'string') {
    return userRoles.includes(role)
  }
  
  if (Array.isArray(role)) {
    if (requireAll) {
      // 需要拥有所有角色
      return role.every(r => userRoles.includes(r))
    } else {
      // 拥有任一角色即可
      return role.some(r => userRoles.includes(r))
    }
  }
  
  return false
}

/**
 * 检查功能权限
 */
function checkFunctionPermission(): boolean {
  const userPermissions = accessStore.accessCodes || []
  const { permission, requireAll } = props
  
  if (!permission) return false
  
  if (typeof permission === 'string') {
    return userPermissions.includes(permission)
  }
  
  if (Array.isArray(permission)) {
    if (requireAll) {
      // 需要拥有所有权限
      return permission.every(p => userPermissions.includes(p))
    } else {
      // 拥有任一权限即可
      return permission.some(p => userPermissions.includes(p))
    }
  }
  
  return false
}
</script>

<script lang="ts">
export default {
  name: 'Permission'
}
</script>