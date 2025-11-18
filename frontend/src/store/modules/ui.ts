/**
 * UI 状态管理 Store
 * 负责全局 UI 状态（侧边栏、主题、通知等）
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUiStore = defineStore('ui', () => {
  // 侧边栏状态
  const sidebarCollapsed = ref(false)
  
  // 全屏状态
  const isFullscreen = ref(false)
  
  // 全局加载状态
  const globalLoading = ref(false)
  
  // 未读通知数量
  const unreadNotifications = ref(0)
  
  // 当前激活的菜单路径
  const activeMenuPath = ref('')
  
  // 面包屑
  const breadcrumbs = ref<Array<{ name: string; path: string }>>([])
  
  // 计算属性
  const hasUnreadNotifications = computed(() => unreadNotifications.value > 0)
  
  // 方法
  const toggleSidebar = () => {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }
  
  const setSidebarCollapsed = (collapsed: boolean) => {
    sidebarCollapsed.value = collapsed
  }
  
  const toggleFullscreen = () => {
    isFullscreen.value = !isFullscreen.value
    if (isFullscreen.value) {
      document.documentElement.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }
  
  const setGlobalLoading = (loading: boolean) => {
    globalLoading.value = loading
  }
  
  const setUnreadNotifications = (count: number) => {
    unreadNotifications.value = count
  }
  
  const incrementUnreadNotifications = () => {
    unreadNotifications.value++
  }
  
  const setActiveMenuPath = (path: string) => {
    activeMenuPath.value = path
  }
  
  const setBreadcrumbs = (crumbs: Array<{ name: string; path: string }>) => {
    breadcrumbs.value = crumbs
  }
  
  const $reset = () => {
    sidebarCollapsed.value = false
    isFullscreen.value = false
    globalLoading.value = false
    unreadNotifications.value = 0
    activeMenuPath.value = ''
    breadcrumbs.value = []
  }
  
  return {
    // 状态
    sidebarCollapsed,
    isFullscreen,
    globalLoading,
    unreadNotifications,
    activeMenuPath,
    breadcrumbs,
    hasUnreadNotifications,
    
    // 方法
    toggleSidebar,
    setSidebarCollapsed,
    toggleFullscreen,
    setGlobalLoading,
    setUnreadNotifications,
    incrementUnreadNotifications,
    setActiveMenuPath,
    setBreadcrumbs,
    $reset
  }
})
