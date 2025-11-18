/**
 * 供应商管理 Store
 * 负责供应商列表、关系管理等状态
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { log } from '../../utils/logger'

export const useSupplierStore = defineStore('supplier', () => {
  // 供应商列表状态
  const supplierList = ref<any[]>([])
  const loading = ref(false)
  const totalCount = ref(0)
  
  // 分页
  const currentPage = ref(1)
  const pageSize = ref(20)
  
  // 筛选条件
  const filters = ref({
    keyword: '',
    type: '',
    status: ''
  })
  
  // 选中的供应商
  const selectedSupplierIds = ref<Set<string>>(new Set())
  
  // 计算属性
  const selectedCount = computed(() => selectedSupplierIds.value.size)
  
  const hasFilters = computed(() => {
    return Object.values(filters.value).some(v => v !== '' && v !== undefined)
  })
  
  // 方法
  const loadSupplierList = async () => {
    loading.value = true
    try {
      log.debug('[SupplierStore] 加载供应商列表')
      // TODO: 调用实际API
      // const response = await getSupplierListApi({ ...filters.value, page: currentPage.value, limit: pageSize.value })
      // supplierList.value = response.data
      // totalCount.value = response.total
    } catch (error) {
      log.error('[SupplierStore] 加载供应商列表失败:', error)
      supplierList.value = []
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
      keyword: '',
      type: '',
      status: ''
    }
    currentPage.value = 1
  }
  
  const toggleSupplierSelection = (supplierId: string) => {
    if (selectedSupplierIds.value.has(supplierId)) {
      selectedSupplierIds.value.delete(supplierId)
    } else {
      selectedSupplierIds.value.add(supplierId)
    }
  }
  
  const clearSelection = () => {
    selectedSupplierIds.value.clear()
  }
  
  const $reset = () => {
    supplierList.value = []
    loading.value = false
    totalCount.value = 0
    currentPage.value = 1
    pageSize.value = 20
    filters.value = {
      keyword: '',
      type: '',
      status: ''
    }
    selectedSupplierIds.value.clear()
  }
  
  return {
    // 状态
    supplierList,
    loading,
    totalCount,
    currentPage,
    pageSize,
    filters,
    selectedSupplierIds,
    selectedCount,
    hasFilters,
    
    // 方法
    loadSupplierList,
    setCurrentPage,
    setPageSize,
    setFilter,
    resetFilters,
    toggleSupplierSelection,
    clearSelection,
    $reset
  }
})
