<template>
  <div class="quick-filters">
    <!-- 合作诉求 -->
    <CooperationFilter v-model="filters.cooperation" @update:model-value="handleFilterChange" />

    <!-- 适配行业(内容标签) -->
    <IndustryFilter v-model="filters.contentTags" @update:model-value="handleFilterChange" />

    <!-- 达人类型 -->
    <InfluencerTierFilter v-model="filters.tier" @update:model-value="handleFilterChange" />

    <!-- 匹配度 -->
    <MatchingFilter 
      v-model:certifications="filters.certifications"
      v-model:content-types="filters.contentTypes"
      v-model:gender="filters.gender"
      v-model:ecommerce="filters.ecommerce"
      v-model:price-range="filters.priceRange"
      v-model:province="filters.province"
      @update:certifications="handleFilterChange"
      @update:content-types="handleFilterChange"
      @update:gender="handleFilterChange"
      @update:ecommerce="handleFilterChange"
      @update:price-range="handleFilterChange"
      @update:province="handleFilterChange"
    />
    
    <!-- 筛选统计 -->
    <div class="filter-summary" v-if="activeFilterCount > 0">
      <span>已选择 {{ activeFilterCount }} 个筛选条件</span>
      <el-button link type="primary" @click="clearAllFilters">清空所有筛选</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useInfluencerSquareStore } from '#/store'
import CooperationFilter from './filters/CooperationFilter.vue'
import IndustryFilter from './filters/IndustryFilter.vue'
import InfluencerTierFilter from './filters/InfluencerTierFilter.vue'
import MatchingFilter from './filters/MatchingFilter.vue'

const store = useInfluencerSquareStore()

// 统一管理所有筛选状态
const filters = ref({
  cooperation: '',
  contentTags: [] as string[],
  tier: '',
  certifications: [] as string[],
  contentTypes: [] as string[],
  gender: undefined as number | undefined,
  ecommerce: '',
  priceRange: '',
  province: '',
})

// 计算活跃筛选数量
const activeFilterCount = computed(() => {
  let count = 0
  if (filters.value.cooperation) count++
  if (filters.value.contentTags.length > 0) count++
  if (filters.value.tier) count++
  if (filters.value.certifications.length > 0) count += filters.value.certifications.length
  if (filters.value.contentTypes.length > 0) count += filters.value.contentTypes.length
  if (filters.value.gender !== undefined) count++
  if (filters.value.ecommerce) count++
  if (filters.value.priceRange) count++
  if (filters.value.province) count++
  return count
})

// 筛选变化处理
const handleFilterChange = () => {
  // 合作诉求逻辑
  if (filters.value.cooperation === 'ecommerce') {
    store.setFilter('ecommerce', 'with_videos')
  } else if (filters.value.cooperation === 'brand') {
    store.setFilter('specialTag', 'excellent')
  } else {
    store.setFilter('ecommerce', '')
    store.setFilter('specialTag', '')
  }
  
  // 内容标签
  store.setFilter('contentTags', filters.value.contentTags)
  
  // 达人类型
  store.setFilter('tier', filters.value.tier)
  
  // 认证状态
  store.setFilter('star_excellent_author', filters.value.certifications.includes('excellent'))
  store.setFilter('is_black_horse_author', filters.value.certifications.includes('black_horse'))
  store.setFilter('star_qianchuan_high_potential', filters.value.certifications.includes('high_potential'))
  
  // 内容类型
  store.setFilter('is_short_drama', filters.value.contentTypes.includes('short_drama'))
  store.setFilter('is_cocreate_author', filters.value.contentTypes.includes('cocreate'))
  store.setFilter('is_cpm_project_author', filters.value.contentTypes.includes('cpm_project'))
  
  // 性别
  store.setFilter('gender', filters.value.gender)
  
  // 电商能力
  store.setFilter('ecommerce', filters.value.ecommerce)
  
  // 价格区间
  if (filters.value.priceRange) {
    const [min, max] = filters.value.priceRange.split('-').map(Number)
    store.setFilter('priceMin', min)
    store.setFilter('priceMax', max)
  } else {
    store.setFilter('priceMin', undefined)
    store.setFilter('priceMax', undefined)
  }
  
  // 地域
  store.setFilter('province', filters.value.province)
  
  // 加载数据
  store.loadInfluencersDebounced()
}

// 清空所有筛选
const clearAllFilters = () => {
  filters.value = {
    cooperation: '',
    contentTags: [],
    tier: '',
    certifications: [],
    contentTypes: [],
    gender: undefined,
    ecommerce: '',
    priceRange: '',
    province: '',
  }
  
  store.resetFilters()
  store.loadInfluencersDebounced()
}
</script>

<style scoped lang="scss">
.quick-filters {
  margin-bottom: 20px;
  padding: 20px 24px;
  background: var(--el-bg-color);
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  
  .filter-summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 16px;
    padding: 12px 16px;
    background: var(--el-fill-color-light);
    border-radius: 6px;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }
}
</style>
