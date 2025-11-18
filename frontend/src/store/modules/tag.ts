/**
 * 标签管理 Store
 * 负责标签列表、分类、常用标签等状态管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { log } from '../../utils/logger'

export const useTagStore = defineStore('tag', () => {
  // 标签列表
  const tagList = ref<any[]>([])
  const loading = ref(false)
  
  // 标签树（分类）
  const tagTree = ref<any[]>([])
  
  // 常用标签（缓存热门标签）
  const popularTags = ref<any[]>([])
  const popularTagsLoading = ref(false)
  
  // 筛选条件
  const filters = ref({
    keyword: '',
    category: '',
    status: ''
  })
  
  // 选中的标签
  const selectedTagIds = ref<Set<string>>(new Set())
  
  // 计算属性
  const selectedCount = computed(() => selectedTagIds.value.size)
  
  const selectedTags = computed(() => {
    return tagList.value.filter(tag => selectedTagIds.value.has(tag.id))
  })
  
  const hasFilters = computed(() => {
    return Object.values(filters.value).some(v => v !== '' && v !== undefined)
  })
  
  // 方法
  const loadTagList = async () => {
    loading.value = true
    try {
      log.debug('[TagStore] 加载标签列表')
      // TODO: 调用实际API
      // const response = await getTagListApi(filters.value)
      // tagList.value = response.data
    } catch (error) {
      log.error('[TagStore] 加载标签列表失败:', error)
      tagList.value = []
    } finally {
      loading.value = false
    }
  }
  
  const loadTagTree = async () => {
    try {
      log.debug('[TagStore] 加载标签树')
      // TODO: 调用实际API
      // const response = await getTagTreeApi()
      // tagTree.value = response.data
    } catch (error) {
      log.error('[TagStore] 加载标签树失败:', error)
      tagTree.value = []
    }
  }
  
  const loadPopularTags = async () => {
    popularTagsLoading.value = true
    try {
      log.debug('[TagStore] 加载热门标签')
      // TODO: 调用实际API
      // const response = await getPopularTagsApi()
      // popularTags.value = response.data
    } catch (error) {
      log.error('[TagStore] 加载热门标签失败:', error)
      popularTags.value = []
    } finally {
      popularTagsLoading.value = false
    }
  }
  
  const setFilter = (key: string, value: any) => {
    (filters.value as any)[key] = value
  }
  
  const resetFilters = () => {
    filters.value = {
      keyword: '',
      category: '',
      status: ''
    }
  }
  
  const toggleTagSelection = (tagId: string) => {
    if (selectedTagIds.value.has(tagId)) {
      selectedTagIds.value.delete(tagId)
    } else {
      selectedTagIds.value.add(tagId)
    }
  }
  
  const clearSelection = () => {
    selectedTagIds.value.clear()
  }
  
  const $reset = () => {
    tagList.value = []
    loading.value = false
    tagTree.value = []
    popularTags.value = []
    popularTagsLoading.value = false
    filters.value = {
      keyword: '',
      category: '',
      status: ''
    }
    selectedTagIds.value.clear()
  }
  
  return {
    // 状态
    tagList,
    loading,
    tagTree,
    popularTags,
    popularTagsLoading,
    filters,
    selectedTagIds,
    selectedCount,
    selectedTags,
    hasFilters,
    
    // 方法
    loadTagList,
    loadTagTree,
    loadPopularTags,
    setFilter,
    resetFilters,
    toggleTagSelection,
    clearSelection,
    $reset
  }
})
