/**
 * KOL 管理 Store
 * 负责 KOL 列表、评价、导入等状态管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { log } from '../../utils/logger'

export const useKolStore = defineStore('kol', () => {
  // KOL 列表状态
  const kolList = ref<any[]>([])
  const loading = ref(false)
  const totalCount = ref(0)
  
  // 分页
  const currentPage = ref(1)
  const pageSize = ref(20)
  
  // 筛选条件
  const filters = ref({
    platform: '',
    keyword: '',
    status: ''
  })
  
  // 选中的 KOL
  const selectedKolIds = ref<Set<string>>(new Set())
  
  // 计算属性
  const selectedCount = computed(() => selectedKolIds.value.size)
  
  const hasFilters = computed(() => {
    return Object.values(filters.value).some(v => v !== '' && v !== undefined)
  })
  
  // 方法
  const loadKolList = async () => {
    loading.value = true
    try {
      log.debug('[KolStore] 加载 KOL 列表')
      // TODO: 调用实际API
      // const response = await getKolListApi({ ...filters.value, page: currentPage.value, limit: pageSize.value })
      // kolList.value = response.data
      // totalCount.value = response.total
    } catch (error) {
      log.error('[KolStore] 加载 KOL 列表失败:', error)
      kolList.value = []
      totalCount.value = 0
    } finally {
      loading.value = false
    }
  }
  
  const setCurrentPage = (page: number) => {
    currentPage.value = page
  }
  
  const setPageSize = (size: number) => {
    pageSize.value = size
    currentPage.value = 1
  }
  
  const setFilter = (key: string, value: any) => {
    (filters.value as any)[key] = value
    currentPage.value = 1
  }
  
  const resetFilters = () => {
    filters.value = {
      platform: '',
      keyword: '',
      status: ''
    }
    currentPage.value = 1
  }
  
  const toggleKolSelection = (kolId: string) => {
    if (selectedKolIds.value.has(kolId)) {
      selectedKolIds.value.delete(kolId)
    } else {
      selectedKolIds.value.add(kolId)
    }
  }
  
  const clearSelection = () => {
    selectedKolIds.value.clear()
  }
  
  const $reset = () => {
    kolList.value = []
    loading.value = false
    totalCount.value = 0
    currentPage.value = 1
    pageSize.value = 20
    filters.value = {
      platform: '',
      keyword: '',
      status: ''
    }
    selectedKolIds.value.clear()
  }
  
  return {
    // 状态
    kolList,
    loading,
    totalCount,
    currentPage,
    pageSize,
    filters,
    selectedKolIds,
    selectedCount,
    hasFilters,
    
    // 方法
    loadKolList,
    setCurrentPage,
    setPageSize,
    setFilter,
    resetFilters,
    toggleKolSelection,
    clearSelection,
    $reset
  }
})
