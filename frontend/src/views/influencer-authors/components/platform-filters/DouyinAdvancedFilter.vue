<template>
  <div class="advanced-filters-compact">
    <div class="filter-header" @click="toggleCollapse">
      <div class="header-left">
        <span class="header-title">高级筛选</span>
        <span v-if="hasActiveFilters" class="active-badge">{{ activeFiltersCount }}</span>
      </div>
      <div class="header-right">
        <el-button link size="small" @click.stop="toggleCollapse">
          <IconifyIcon :icon="isCollapsed ? 'lucide:chevron-down' : 'lucide:chevron-up'" />
          {{ isCollapsed ? '展开' : '收起' }}
        </el-button>
        <el-button link size="small" @click.stop="handleReset" v-if="hasActiveFilters">
          <IconifyIcon icon="lucide:rotate-ccw" />
          重置
        </el-button>
      </div>
    </div>

    <div class="filter-content" v-show="!isCollapsed">
      <div class="smart-scenarios">
        <div class="scenario-label">
          <IconifyIcon icon="lucide:sparkles" />
          智能场景
        </div>
        <div class="scenario-buttons">
          <el-button 
            v-for="scenario in scenarios" 
            :key="scenario.key"
            size="small"
            :type="selectedScenario === scenario.key ? 'primary' : ''"
            @click="applyScenario(scenario)"
          >
            <IconifyIcon :icon="scenario.icon" />
            {{ scenario.label }}
          </el-button>
        </div>
      </div>

      <el-form :model="filters" label-width="70px" class="compact-form">
        <div class="form-section">
          <div class="section-title">
            <IconifyIcon icon="lucide:target" />
            核心指标
          </div>
          <div class="form-grid form-grid-3">
            <el-form-item label="粉丝规模">
              <DiscreteRangePicker
                v-model="followerRange"
                :options="FOLLOWER_OPTIONS"
              />
            </el-form-item>
            <el-form-item label="报价区间">
              <DiscreteRangePicker
                v-model="priceRange"
                :options="PRICE_OPTIONS"
              />
            </el-form-item>
            <el-form-item label="30日GMV">
              <DiscreteRangePicker
                v-model="gmvRange"
                :options="GMV_OPTIONS"
              />
            </el-form-item>
          </div>
        </div>

        <div class="form-section">
          <div class="section-title">
            <IconifyIcon icon="lucide:star" />
            内容质量
          </div>
          <div class="form-grid form-grid-3">
            <el-form-item label="互动率">
              <DiscreteRangePicker
                v-model="interactRateRange"
                :options="INTERACT_RATE_OPTIONS"
              />
            </el-form-item>
            <el-form-item label="完播率">
              <DiscreteRangePicker
                v-model="playOverRateRange"
                :options="PLAY_OVER_RATE_OPTIONS"
              />
            </el-form-item>
            <el-form-item label="30日增长">
              <DiscreteRangePicker
                v-model="growthRateRange"
                :options="GROWTH_RATE_OPTIONS"
              />
            </el-form-item>
          </div>
        </div>
        
        <div class="form-section">
          <div class="section-title">
            <IconifyIcon icon="lucide:trending-up" />
            营销指数
          </div>
          <div class="form-grid form-grid-3">
            <el-form-item label="最低转化">
              <PickerInput
                v-model="filters.minConvertIndex"
                :options="MARKETING_INDEX_OPTIONS"
                placeholder="≥ 不限"
              />
            </el-form-item>
            <el-form-item label="最低种草">
              <PickerInput
                v-model="filters.minShoppingIndex"
                :options="MARKETING_INDEX_OPTIONS"
                placeholder="≥ 不限"
              />
            </el-form-item>
            <el-form-item label="最低传播">
              <PickerInput
                v-model="filters.minSpreadIndex"
                :options="MARKETING_INDEX_OPTIONS"
                placeholder="≥ 不限"
              />
            </el-form-item>
          </div>
        </div>
      </el-form>

      <div class="selected-filters" v-if="hasActiveFilters">
        <div class="selected-title">
          <IconifyIcon icon="lucide:check-circle" />
          已选条件
        </div>
        <div class="selected-tags">
          <el-tag v-for="tag in activeFilterTags" :key="tag.key" closable type="info" size="small" @close="removeFilterTag(tag.key)">
            {{ tag.label }}
          </el-tag>
        </div>
      </div>

      <div class="filter-footer">
        <div class="footer-left">
          <span class="estimated-count" v-if="props.estimatedCount >= 0">
            <el-icon v-if="props.loading" class="is-loading"><IconifyIcon icon="lucide:loader-2" /></el-icon>
            <template v-else>预计 <strong>{{ props.estimatedCount }}</strong> 位达人</template>
          </span>
        </div>
        <div class="footer-right">
          <el-button @click="handleReset" :disabled="!hasActiveFilters">清空筛选</el-button>
          <el-button type="primary" @click="handleApply">应用筛选</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// --- 脚本部分完全没有改动 ---
import { ref, computed, type PropType } from 'vue'
import { IconifyIcon } from '@vben/icons'
import type { AdvancedFilterParams } from '#/api/influencer-filter'
import DiscreteRangePicker from '../DiscreteRangePicker.vue'
import PickerInput from '../PickerInput.vue'
import { 
  FOLLOWER_OPTIONS, 
  PRICE_OPTIONS, 
  INTERACT_RATE_OPTIONS,
  PLAY_OVER_RATE_OPTIONS,
  GROWTH_RATE_OPTIONS,
  GMV_OPTIONS,
  MARKETING_INDEX_OPTIONS
} from '../../constants/filter-options'

interface FilterProps {
  estimatedCount?: number
  loading?: boolean
}
const props = withDefaults(defineProps<FilterProps>(), {
  estimatedCount: -1,
  loading: false
})
const emit = defineEmits<{
  filterChange: [filters: AdvancedFilterParams]
}>()
const selectedScenario = ref('')
const scenarios = [
  { 
    key: 'ecommerce', 
    label: '电商带货推荐', 
    icon: 'lucide:shopping-bag', 
    filters: { 
      minFollowers: 100000, 
      maxFollowers: 1000000, 
      ecommerceEnabled: true,
      ecomCapabilityTier: 'high' // 电商能力高级以上
    }
  },
  { 
    key: 'brand', 
    label: '品牌曝光优选', 
    icon: 'lucide:megaphone', 
    filters: { 
      minFollowers: 500000, 
      minInteractRate: 0.10 
    }
  },
  { 
    key: 'value', 
    label: '性价比达人', 
    icon: 'lucide:trending-up', 
    filters: { 
      minFollowers: 50000, 
      maxFollowers: 500000, 
      maxPrice20_60: 5000, 
      minInteractRate: 0.12 
    }
  },
  { 
    key: 'rising', 
    label: '新星榜单', 
    icon: 'lucide:rocket', 
    filters: { 
      minFollowers: 10000, 
      maxFollowers: 100000, 
      minGrowthRate30d: 0.3 
    }
  }
]
const filters = ref<AdvancedFilterParams>({
  minFollowers: undefined, maxFollowers: undefined, minGrowthRate30d: undefined, maxGrowthRate30d: undefined,
  minInteractRate: undefined, maxInteractRate: undefined, minPlayOverRate: undefined, maxPlayOverRate: undefined,
  minVvMedian: undefined, maxVvMedian: undefined,
  minGmv30d: undefined, maxGmv30d: undefined, minConvertIndex: undefined, minShoppingIndex: undefined,
  minSpreadIndex: undefined, minCpmEfficiency: undefined, maxCpmEfficiency: undefined, minPrice20_60: undefined,
  maxPrice20_60: undefined
})
const followerRange = computed({
  get: (): [number | undefined, number | undefined] => [filters.value.minFollowers, filters.value.maxFollowers],
  set: (value: [number | undefined, number | undefined]) => {
    filters.value.minFollowers = value[0]
    filters.value.maxFollowers = value[1]
  }
})
const priceRange = computed({
  get: (): [number | undefined, number | undefined] => [filters.value.minPrice20_60, filters.value.maxPrice20_60],
  set: (value: [number | undefined, number | undefined]) => {
    filters.value.minPrice20_60 = value[0]
    filters.value.maxPrice20_60 = value[1]
  }
})
const interactRateRange = computed({
  get: (): [number | undefined, number | undefined] => [filters.value.minInteractRate, filters.value.maxInteractRate],
  set: (value: [number | undefined, number | undefined]) => {
    filters.value.minInteractRate = value[0]
    filters.value.maxInteractRate = value[1]
  }
})
const playOverRateRange = computed({
  get: (): [number | undefined, number | undefined] => [filters.value.minPlayOverRate, filters.value.maxPlayOverRate],
  set: (value: [number | undefined, number | undefined]) => {
    filters.value.minPlayOverRate = value[0]
    filters.value.maxPlayOverRate = value[1]
  }
})
const growthRateRange = computed({
  get: (): [number | undefined, number | undefined] => [filters.value.minGrowthRate30d, filters.value.maxGrowthRate30d],
  set: (value: [number | undefined, number | undefined]) => {
    filters.value.minGrowthRate30d = value[0]
    filters.value.maxGrowthRate30d = value[1]
  }
})
const gmvRange = computed({
  get: (): [number | undefined, number | undefined] => [filters.value.minGmv30d, filters.value.maxGmv30d],
  set: (value: [number | undefined, number | undefined]) => {
    filters.value.minGmv30d = value[0]
    filters.value.maxGmv30d = value[1]
  }
})
interface FilterConfig {
  key: string
  label: string
  getActiveTag: (filters: AdvancedFilterParams) => string | null
  reset: (filters: AdvancedFilterParams) => void
}
const filterConfig: FilterConfig[] = [
  {
    key: 'follower',
    label: '粉丝规模',
    getActiveTag: (f) => {
      if (f.minFollowers || f.maxFollowers) {
        const min = formatFollowerValue(f.minFollowers ?? 0)
        const max = f.maxFollowers ? formatFollowerValue(f.maxFollowers) : '不限'
        return `粉丝: ${min} - ${max}`
      }
      return null
    },
    reset: (f) => { f.minFollowers = undefined; f.maxFollowers = undefined }
  },
  {
    key: 'price',
    label: '报价区间',
    getActiveTag: (f) => {
      if (f.minPrice20_60 || f.maxPrice20_60) {
        const min = formatPriceValue(f.minPrice20_60 ?? 0)
        const max = f.maxPrice20_60 ? formatPriceValue(f.maxPrice20_60) : '不限'
        return `报价: ${min} - ${max}`
      }
      return null
    },
    reset: (f) => { f.minPrice20_60 = undefined; f.maxPrice20_60 = undefined }
  },
  {
    key: 'interactRate',
    label: '互动率',
    getActiveTag: (f) => {
      if (f.minInteractRate || f.maxInteractRate) {
        const min = ((f.minInteractRate ?? 0) * 100).toFixed(1)
        const max = f.maxInteractRate ? (f.maxInteractRate * 100).toFixed(1) : '不限'
        return `互动率: ${min}% - ${max}%`
      }
      return null
    },
    reset: (f) => { f.minInteractRate = undefined; f.maxInteractRate = undefined }
  },
  {
    key: 'playOverRate',
    label: '完播率',
    getActiveTag: (f) => {
      if (f.minPlayOverRate || f.maxPlayOverRate) {
        const min = ((f.minPlayOverRate ?? 0) * 100).toFixed(1)
        const max = f.maxPlayOverRate ? (f.maxPlayOverRate * 100).toFixed(1) : '不限'
        return `完播率: ${min}% - ${max}%`
      }
      return null
    },
    reset: (f) => { f.minPlayOverRate = undefined; f.maxPlayOverRate = undefined }
  },
  {
    key: 'growthRate',
    label: '30日增长',
    getActiveTag: (f) => {
      if (f.minGrowthRate30d !== undefined || f.maxGrowthRate30d !== undefined) {
        const min = ((f.minGrowthRate30d ?? -1) * 100).toFixed(0)
        const max = f.maxGrowthRate30d !== undefined ? (f.maxGrowthRate30d * 100).toFixed(0) : '不限'
        return `30日增长: ${min}% - ${max}%`
      }
      return null
    },
    reset: (f) => { f.minGrowthRate30d = undefined; f.maxGrowthRate30d = undefined }
  },
  {
    key: 'gmv',
    label: '30日GMV',
    getActiveTag: (f) => {
      if (f.minGmv30d || f.maxGmv30d) {
        const min = formatMoneyValue(f.minGmv30d ?? 0)
        const max = f.maxGmv30d ? formatMoneyValue(f.maxGmv30d) : '不限'
        return `GMV: ${min} - ${max}`
      }
      return null
    },
    reset: (f) => { f.minGmv30d = undefined; f.maxGmv30d = undefined }
  },
  {
    key: 'convertIndex',
    label: '转化指数',
    getActiveTag: (f) => f.minConvertIndex ? `转化指数 ≥ ${f.minConvertIndex}` : null,
    reset: (f) => { f.minConvertIndex = undefined }
  },
  {
    key: 'shoppingIndex',
    label: '种草指数',
    getActiveTag: (f) => f.minShoppingIndex ? `种草指数 ≥ ${f.minShoppingIndex}` : null,
    reset: (f) => { f.minShoppingIndex = undefined }
  },
  {
    key: 'spreadIndex',
    label: '传播指数',
    getActiveTag: (f) => f.minSpreadIndex ? `传播指数 ≥ ${f.minSpreadIndex}` : null,
    reset: (f) => { f.minSpreadIndex = undefined }
  }
]
const hasActiveFilters = computed(() => Object.entries(filters.value).some(([key, value]) => {
  if (typeof value === 'boolean') return value === true
  return value !== undefined && value !== null
}))
const activeFiltersCount = computed(() => {
  let count = 0
  Object.entries(filters.value).forEach(([key, value]) => {
    if (typeof value === 'boolean') { if (value === true) count++ }
    else if (value !== undefined && value !== null) count++
  })
  return count
})
const activeFilterTags = computed(() => {
  return filterConfig
    .map(config => {
      const label = config.getActiveTag(filters.value)
      return label ? { key: config.key, label } : null
    })
    .filter(Boolean) as { key: string; label: string }[]
})
const applyScenario = (scenario: typeof scenarios[0]) => {
  if (selectedScenario.value === scenario.key) {
    selectedScenario.value = ''
    handleReset()
    return
  }
  selectedScenario.value = scenario.key
  const resetFilters = getInitialFilters()
  Object.assign(filters.value, resetFilters, scenario.filters)
}
const formatFollowerValue = (value: number | undefined) => {
  if (!value) return '0'
  if (value >= 10000000) return `${(value / 10000000).toFixed(0)}亿`
  if (value >= 10000) return `${(value / 10000).toFixed(0)}万`
  return value.toString()
}
const formatPriceValue = (value: number | undefined) => {
  if (!value) return '0元'
  if (value >= 10000) return `${(value / 10000).toFixed(1)}万`
  return `${value}元`
}
const formatMoneyValue = (value: number | undefined) => {
  if (!value) return '0元'
  if (value >= 10000) return `${(value / 10000).toFixed(0)}万`
  return `${value}元`
}
const removeFilterTag = (key: string) => {
  const config = filterConfig.find(c => c.key === key)
  if (config) {
    config.reset(filters.value)
  }
}
const getInitialFilters = (): AdvancedFilterParams => ({
  minFollowers: undefined, maxFollowers: undefined, minGrowthRate30d: undefined, maxGrowthRate30d: undefined,
  minInteractRate: undefined, maxInteractRate: undefined, minPlayOverRate: undefined, maxPlayOverRate: undefined,
  minVvMedian: undefined, maxVvMedian: undefined,
  minGmv30d: undefined, maxGmv30d: undefined, minConvertIndex: undefined, minShoppingIndex: undefined,
  minSpreadIndex: undefined, minCpmEfficiency: undefined, maxCpmEfficiency: undefined, minPrice20_60: undefined,
  maxPrice20_60: undefined
})
const handleReset = () => {
  selectedScenario.value = ''
  Object.assign(filters.value, getInitialFilters())
}
const handleApply = () => {
  const cleanedFilters: AdvancedFilterParams = {}
  Object.entries(filters.value).forEach(([key, value]) => {
    if (typeof value === 'boolean') { if (value === true) cleanedFilters[key] = value }
    else if (value !== undefined && value !== null) cleanedFilters[key] = value
  })
  emit('filterChange', cleanedFilters)
}

// 添加折叠状态 - 默认折叠
const isCollapsed = ref(true)

// 切换折叠状态
const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

defineExpose({ reset: handleReset })
</script>

<style scoped lang="scss">
/* --- 样式部分已优化 --- */

.advanced-filters-compact {
  background: #ffffff;
  border-radius: 8px;
  padding: 16px 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  cursor: pointer;
  
  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .header-right {
    display: flex;
    align-items: center;
    gap: 12px;
  }
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.active-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background: #409eff;
  border-radius: 10px;
}

.filter-content {
  margin-top: 20px;
}

.smart-scenarios {
  margin-bottom: 20px;
  padding: 14px;
  background: linear-gradient(135deg, #f0f4ff 0%, #f9f5ff 100%);
  border-radius: 6px;
  border: 1px solid #e0e7ff;
}

.scenario-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #4f46e5;
  margin-bottom: 10px;
}

.scenario-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.compact-form {
  :deep(.el-form-item) {
    margin-bottom: 14px;
  }
  
  :deep(.el-form-item__label) {
    font-size: 12px;
    color: #6b7280;
    font-weight: 500;
    padding-right: 8px;
    line-height: 32px;
  }
  
  :deep(.el-form-item__content) {
    display: flex;
    align-items: center;
    line-height: 32px;
  }
}

.form-section {
  margin-bottom: 18px;
  padding: 16px;
  background: #fafbfc;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 14px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

/* 关键优化：为网格添加 max-width */
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px 20px;
  max-width: 860px; /* 2列的最大宽度 */
  
  &.form-grid-3 {
    grid-template-columns: repeat(3, 1fr);
    max-width: 1300px; /* 3列的最大宽度 */
  }
  
  @media (max-width: 1000px) {
    grid-template-columns: 1fr;
    max-width: 100%; /* 响应式时重置 max-width */
    
    &.form-grid-3 {
      grid-template-columns: 1fr;
      max-width: 100%; /* 响应式时重置 max-width */
    }
  }
}

.selected-filters {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 12px;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
}

.selected-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  margin-right: 12px;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-footer {
  margin-top: 12px;
  padding: 12px 14px;
  background: #ffffff;
  border-top: 1px solid #e5e7eb;
  border-radius: 0 0 8px 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-left {
  .estimated-count {
    font-size: 14px;
    color: #6b7280;
    
    strong {
      font-size: 18px;
      font-weight: 600;
      color: #409eff;
      margin: 0 4px;
    }
  }
}

.footer-right {
  display: flex;
  gap: 12px;
}
</style>