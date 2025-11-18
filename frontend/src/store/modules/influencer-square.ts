/**
 * 达人广场状态管理 - 使用优化后API
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { advancedFilter } from '../../api/influencer-filter'
import type { Influencer, InfluencerFilterParams, ViewMode, CardSize, SortOption } from '../../types/influencer'
import { InfluencerNormalizer } from '../../utils/influencer-normalizer'
import { log } from '../../utils/logger'

export const useInfluencerSquareStore = defineStore('influencer-square', () => {
  // 加载状态
  const loading = ref(false)
  
  // 达人数据
  const influencers = ref<Influencer[]>([])
  const totalCount = ref(0)
  
  // 选中的达人 ID 集合（使用 Set 提高查找性能）
  const selectedInfluencerIds = ref<Set<string>>(new Set())
  
  // 分页
  const currentPage = ref(1)
  const pageSize = ref(20)
  
  // 排序 - 默认按星图指数降序
  const sortBy = ref<SortOption>('star_index_desc')
  
  // 视图模式
  const viewMode = ref<ViewMode>('card')
  const cardSize = ref<CardSize>('standard')
  
  // 筛选条件 - 使用优化后的筛选参数结构
  const filters = ref<InfluencerFilterParams>({})
  
  // 激活的筛选条件数量
  const activeFiltersCount = computed(() => {
    return Object.keys(filters.value).filter(
      key => filters.value[key as keyof InfluencerFilterParams] !== undefined && 
             filters.value[key as keyof InfluencerFilterParams] !== '' &&
             filters.value[key as keyof InfluencerFilterParams] !== null
    ).length
  })
  
  // 选中的达人数量
  const selectedCount = computed(() => selectedInfluencerIds.value.size)
  
  // 选中的达人列表（用于导出）
  const selectedInfluencers = computed(() => {
    return influencers.value.filter(item => selectedInfluencerIds.value.has(item.author_id))
  })
  
  // 加载达人数据 - 使用优化后API
  const loadInfluencers = async () => {
    log.debug('[Store] 开始加载达人数据(优化API)')
    loading.value = true
    try {
      const params: InfluencerFilterParams = {
        ...filters.value,
        page: currentPage.value,
        limit: pageSize.value,
        sortBy: sortBy.value === 'recommended' ? 'created_at' : sortBy.value.replace(/_desc$/, '').replace(/_asc$/, ''),
        sortOrder: sortBy.value.includes('_asc') ? 'ASC' : 'DESC',
      }
      log.debug('[Store] 请求参数:', params)
      
      const response = await advancedFilter(params)
      log.debug('[Store] 优化API返回数据:', response)
      
      // API已经解包，response直接是 { data, pagination, performance, fromCache }
      const rawList = Array.isArray(response.data) ? response.data : []

      // 使用归一化工具类处理数据
      influencers.value = InfluencerNormalizer.normalizeBatch(rawList)
      totalCount.value = response.pagination?.total || 0
      
      // 恢复当前页达人的选中状态
      influencers.value.forEach(item => {
        item.isSelected = selectedInfluencerIds.value.has(item.author_id)
      })
      
      // 显示性能信息
      if (response.performance) {
        const { totalTime, dataTime, countTime } = response.performance
        log.debug(`[Store] 查询性能: 总计${totalTime}ms (计数:${countTime}ms, 数据:${dataTime}ms)`)
        if (response.fromCache) {
          log.debug('[Store] 数据来自缓存')
        }
      }
      
      log.success('[Store] 数据已更新到Store')
      log.debug('[Store] influencers.value长度:', influencers.value.length)
      log.debug('[Store] totalCount.value:', totalCount.value)
    } catch (error) {
      log.error('[Store] 加载达人数据失败:', error)
      influencers.value = []
      totalCount.value = 0
    } finally {
      loading.value = false
      log.debug('[Store] 加载完成, loading:', loading.value)
    }
  }
  
  // 设置分页
  const setCurrentPage = (page: number) => {
    currentPage.value = page
  }
  
  const setPageSize = (size: number) => {
    pageSize.value = size
    currentPage.value = 1 // 重置到第一页
  }
  
  // 设置排序
  const setSortBy = (sort: SortOption) => {
    sortBy.value = sort
  }
  
  // 设置视图模式
  const setViewMode = (mode: 'card' | 'table') => {
    viewMode.value = mode
  }
  
  const setCardSize = (size: 'compact' | 'standard' | 'detailed') => {
    cardSize.value = size
  }
  
  // 设置筛选条件
  const setFilter = (key: string, value: any) => {
    (filters.value as any)[key] = value
    currentPage.value = 1 // 重置到第一页
  }
  
  // 批量设置筛选条件
  const setFilters = (newFilters: InfluencerFilterParams) => {
    filters.value = { ...filters.value, ...newFilters }
    currentPage.value = 1
  }
  
  // 重置筛选条件
  const resetFilters = () => {
    filters.value = {}
    currentPage.value = 1
  }
  
  // 切换达人选中状态
  const toggleInfluencerSelection = (authorId: string) => {
    if (selectedInfluencerIds.value.has(authorId)) {
      selectedInfluencerIds.value.delete(authorId)
    } else {
      selectedInfluencerIds.value.add(authorId)
    }
    // 更新当前页达人的 isSelected 状态
    const influencer = influencers.value.find(item => item.author_id === authorId)
    if (influencer) {
      influencer.isSelected = selectedInfluencerIds.value.has(authorId)
    }
  }
  
  // 批量设置选中状态
  const setInfluencerSelection = (authorIds: string[], selected: boolean) => {
    authorIds.forEach(authorId => {
      if (selected) {
        selectedInfluencerIds.value.add(authorId)
      } else {
        selectedInfluencerIds.value.delete(authorId)
      }
    })
    // 更新当前页达人的 isSelected 状态
    influencers.value.forEach(item => {
      if (authorIds.includes(item.author_id)) {
        item.isSelected = selectedInfluencerIds.value.has(item.author_id)
      }
    })
  }
  
  // 清空所有选中
  const clearSelection = () => {
    selectedInfluencerIds.value.clear()
    influencers.value.forEach(item => {
      item.isSelected = false
    })
  }
  
  const loadInfluencersDebounced = useDebounceFn(loadInfluencers, 300)

  return {
    // 状态
    loading,
    influencers,
    totalCount,
    currentPage,
    pageSize,
    sortBy,
    viewMode,
    cardSize,
    filters,
    activeFiltersCount,
    selectedInfluencerIds,
    selectedCount,
    selectedInfluencers,
    
    // 方法
    loadInfluencers,
    loadInfluencersDebounced,
    setCurrentPage,
    setPageSize,
    setSortBy,
    setViewMode,
    setCardSize,
    setFilter,
    setFilters,
    resetFilters,
    toggleInfluencerSelection,
    setInfluencerSelection,
    clearSelection,
  }
})
