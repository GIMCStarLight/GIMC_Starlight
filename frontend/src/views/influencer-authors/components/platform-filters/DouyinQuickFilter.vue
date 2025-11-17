<template>
  <div class="quick-filters-optimized">
    <!-- 基础信息筛选 -->
    <BasicInfoFilter v-model="basicInfo" @update:model-value="handleBasicInfoChange" />

    <!-- 合作诉求 -->
    <DouyinCooperationFilter v-model="selectedCooperation" @update:model-value="handleCooperationChange" />

    <!-- 内容定位 -->
    <DouyinContentTagsFilter v-model="selectedTags" :tag-counts="hotTags" @update:model-value="emitFilterChange" />

    <!-- 达人认证 -->
    <DouyinCertFilter v-model="influencerAttrs.certType" @update:model-value="handleAttrChange" />

    <!-- 场景推荐 -->
    <DouyinScenarioFilter v-model="selectedScenario" @apply-scenario="applyScenario" />

    <!-- 第7行:核心指标 -->
    <div class="filter-row">
      <span class="filter-label">核心指标</span>
      <div class="filter-content advanced-grid">
        <div class="advanced-item">
          <span class="advanced-label">粉丝规模</span>
          <DiscreteRangePicker
            v-model="followerRange"
            :options="FOLLOWER_OPTIONS"
            @update:model-value="handleAdvancedChange"
          />
        </div>
        <div class="advanced-item">
          <span class="advanced-label">报价区间</span>
          <DiscreteRangePicker
            v-model="priceRange"
            :options="PRICE_OPTIONS"
            @update:model-value="handleAdvancedChange"
          />
        </div>
        <div class="advanced-item">
          <span class="advanced-label">30日GMV</span>
          <DiscreteRangePicker
            v-model="gmvRange"
            :options="GMV_OPTIONS"
            @update:model-value="handleAdvancedChange"
          />
        </div>
        <div class="advanced-item">
          <span class="advanced-label">预期播放量</span>
          <DiscreteRangePicker
            v-model="expectedPlayRange"
            :options="EXPECTED_PLAY_OPTIONS"
            @update:model-value="handleAdvancedChange"
          />
        </div>
        <div class="advanced-item">
          <span class="advanced-label">预期CPM</span>
          <DiscreteRangePicker
            v-model="expectedCpmRange"
            :options="EXPECTED_CPM_OPTIONS"
            @update:model-value="handleAdvancedChange"
          />
        </div>
        <div class="advanced-item">
          <span class="advanced-label">预期CPE</span>
          <DiscreteRangePicker
            v-model="expectedCpeRange"
            :options="EXPECTED_CPE_OPTIONS"
            @update:model-value="handleAdvancedChange"
          />
        </div>
        <div class="advanced-item">
          <span class="advanced-label">爆文率</span>
          <DiscreteRangePicker
            v-model="burstRateRange"
            :options="BURST_RATE_OPTIONS"
            @update:model-value="handleAdvancedChange"
          />
        </div>
      </div>
    </div>

    <!-- 第8行:内容质量指标 -->
    <div class="filter-row">
      <span class="filter-label">内容质量</span>
      <div class="filter-content advanced-grid">
        <div class="advanced-item">
          <span class="advanced-label">互动率</span>
          <DiscreteRangePicker
            v-model="interactRateRange"
            :options="INTERACT_RATE_OPTIONS"
            @update:model-value="handleAdvancedChange"
          />
        </div>
        <div class="advanced-item">
          <span class="advanced-label">完播率</span>
          <DiscreteRangePicker
            v-model="playOverRateRange"
            :options="PLAY_OVER_RATE_OPTIONS"
            @update:model-value="handleAdvancedChange"
          />
        </div>
        <div class="advanced-item">
          <span class="advanced-label">30日增长</span>
          <DiscreteRangePicker
            v-model="growthRateRange"
            :options="GROWTH_RATE_OPTIONS"
            @update:model-value="handleAdvancedChange"
          />
        </div>
      </div>
    </div>

    <!-- 第9行:营销指数 -->
    <div class="filter-row">
      <span class="filter-label">营销指数</span>
      <div class="filter-content advanced-grid">
        <div class="advanced-item">
          <span class="advanced-label">最低转化</span>
          <PickerInput
            v-model="advancedFilters.minConvertIndex"
            :options="MARKETING_INDEX_OPTIONS"
            placeholder="≥ 不限"
            @update:model-value="handleAdvancedChange"
          />
        </div>
        <div class="advanced-item">
          <span class="advanced-label">最低种草</span>
          <PickerInput
            v-model="advancedFilters.minShoppingIndex"
            :options="MARKETING_INDEX_OPTIONS"
            placeholder="≥ 不限"
            @update:model-value="handleAdvancedChange"
          />
        </div>
        <div class="advanced-item">
          <span class="advanced-label">最低传播</span>
          <PickerInput
            v-model="advancedFilters.minSpreadIndex"
            :options="MARKETING_INDEX_OPTIONS"
            placeholder="≥ 不限"
            @update:model-value="handleAdvancedChange"
          />
        </div>
      </div>
    </div>

    <!-- 筛选状态总览 -->
    <div v-if="hasActiveFilters" class="filter-summary">
      <div class="summary-content">
        <span class="summary-label">当前筛选:</span>
        <el-tag
          v-for="filter in activeFilterTags"
          :key="filter.key"
          closable
          type="info"
          @close="removeFilter(filter.key)"
        >
          {{ filter.label }}
        </el-tag>
        <el-button link type="primary" size="small" @click="clearAllFilters">
          清空全部
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { IconifyIcon as Icon } from '@vben/icons'
import { getPopularTags, type QuickFilterParams, type AdvancedFilterParams } from '#/api/influencer-filter'
import { useDebounceFn } from '@vueuse/core'
import { log } from '#/utils/logger'
import DiscreteRangePicker from '../DiscreteRangePicker.vue'
import PickerInput from '../PickerInput.vue'
import BasicInfoFilter from './filters/BasicInfoFilter.vue'
import DouyinCooperationFilter from './filters/DouyinCooperationFilter.vue'
import DouyinCertFilter from './filters/DouyinCertFilter.vue'
import DouyinScenarioFilter from './filters/DouyinScenarioFilter.vue'
import DouyinContentTagsFilter from './filters/DouyinContentTagsFilter.vue'
import { 
  FOLLOWER_OPTIONS, 
  PRICE_OPTIONS, 
  INTERACT_RATE_OPTIONS,
  PLAY_OVER_RATE_OPTIONS,
  GROWTH_RATE_OPTIONS,
  GMV_OPTIONS,
  MARKETING_INDEX_OPTIONS,
  EXPECTED_PLAY_OPTIONS,
  EXPECTED_CPM_OPTIONS,
  EXPECTED_CPE_OPTIONS,
  BURST_RATE_OPTIONS
} from '../../constants/filter-options'
import { 
  DOUYIN_CONTENT_TAGS, 
  COOPERATION_TYPES, 
  SCENARIO_OPTIONS, 
  CERT_TYPE_LABELS,
  type ContentTagCategory 
} from './douyin-config'

// ========== 数据定义 ==========

const cooperationTypes = COOPERATION_TYPES
const selectedCooperation = ref('')
const selectedTags = ref<string[]>([])
const hotTags = ref<{ tag: string; count: number }[]>([])
const showAllTags = ref(false)  // 控制是否显示所有标签

// 内容标签层级结构（使用配置文件）
const contentTagsHierarchy = ref<ContentTagCategory[]>(DOUYIN_CONTENT_TAGS)

const filters = ref<QuickFilterParams>({})

// 基础信息筛选
const basicInfo = ref<{
  keyword: string
  gender: 'M' | 'F' | 'U' | undefined
  province: string
  city: string
}>({
  keyword: '',
  gender: undefined,
  province: '',
  city: ''
})

// 达人属性筛选(仅保留特殊认证)
const influencerAttrs = ref<{
  certType?: 'shenguangxingmei' | 'xingliandaren' | 'excellentAuthor' | 'blackHorse' | 'risingStart' | 'highPotential'
}>({
  certType: undefined
})

// 智能场景
const selectedScenario = ref('')
const scenarios = SCENARIO_OPTIONS

// 高级筛选
const advancedFilters = ref<AdvancedFilterParams>({
  minFollowers: undefined, 
  maxFollowers: undefined, 
  minGrowthRate30d: undefined, 
  maxGrowthRate30d: undefined,
  minInteractRate: undefined, 
  maxInteractRate: undefined, 
  minPlayOverRate: undefined, 
  maxPlayOverRate: undefined,
  minVvMedian: undefined, 
  maxVvMedian: undefined,
  minGmv30d: undefined, 
  maxGmv30d: undefined, 
  minConvertIndex: undefined, 
  minShoppingIndex: undefined,
  minSpreadIndex: undefined, 
  minCpmEfficiency: undefined, 
  maxCpmEfficiency: undefined, 
  minPrice20_60: undefined,
  maxPrice20_60: undefined,
  minExpectedPlayNum: undefined,
  maxExpectedPlayNum: undefined,
  minExpectedCpm: undefined,
  maxExpectedCpm: undefined,
  minExpectedCpe: undefined,
  maxExpectedCpe: undefined,
  minBurstRate: undefined,
  maxBurstRate: undefined
})

// 高级筛选范围计算属性
const followerRange = computed({
  get: (): [number | undefined, number | undefined] => [advancedFilters.value.minFollowers, advancedFilters.value.maxFollowers],
  set: (value: [number | undefined, number | undefined]) => {
    advancedFilters.value.minFollowers = value[0]
    advancedFilters.value.maxFollowers = value[1]
  }
})

const priceRange = computed({
  get: (): [number | undefined, number | undefined] => [advancedFilters.value.minPrice20_60, advancedFilters.value.maxPrice20_60],
  set: (value: [number | undefined, number | undefined]) => {
    advancedFilters.value.minPrice20_60 = value[0]
    advancedFilters.value.maxPrice20_60 = value[1]
  }
})

const interactRateRange = computed({
  get: (): [number | undefined, number | undefined] => [advancedFilters.value.minInteractRate, advancedFilters.value.maxInteractRate],
  set: (value: [number | undefined, number | undefined]) => {
    advancedFilters.value.minInteractRate = value[0]
    advancedFilters.value.maxInteractRate = value[1]
  }
})

const playOverRateRange = computed({
  get: (): [number | undefined, number | undefined] => [advancedFilters.value.minPlayOverRate, advancedFilters.value.maxPlayOverRate],
  set: (value: [number | undefined, number | undefined]) => {
    advancedFilters.value.minPlayOverRate = value[0]
    advancedFilters.value.maxPlayOverRate = value[1]
  }
})

const growthRateRange = computed({
  get: (): [number | undefined, number | undefined] => [advancedFilters.value.minGrowthRate30d, advancedFilters.value.maxGrowthRate30d],
  set: (value: [number | undefined, number | undefined]) => {
    advancedFilters.value.minGrowthRate30d = value[0]
    advancedFilters.value.maxGrowthRate30d = value[1]
  }
})

const gmvRange = computed({
  get: (): [number | undefined, number | undefined] => [advancedFilters.value.minGmv30d, advancedFilters.value.maxGmv30d],
  set: (value: [number | undefined, number | undefined]) => {
    advancedFilters.value.minGmv30d = value[0]
    advancedFilters.value.maxGmv30d = value[1]
  }
})

const expectedPlayRange = computed({
  get: (): [number | undefined, number | undefined] => [advancedFilters.value.minExpectedPlayNum, advancedFilters.value.maxExpectedPlayNum],
  set: (value: [number | undefined, number | undefined]) => {
    advancedFilters.value.minExpectedPlayNum = value[0]
    advancedFilters.value.maxExpectedPlayNum = value[1]
  }
})

const expectedCpmRange = computed({
  get: (): [number | undefined, number | undefined] => [advancedFilters.value.minExpectedCpm, advancedFilters.value.maxExpectedCpm],
  set: (value: [number | undefined, number | undefined]) => {
    advancedFilters.value.minExpectedCpm = value[0]
    advancedFilters.value.maxExpectedCpm = value[1]
  }
})

const expectedCpeRange = computed({
  get: (): [number | undefined, number | undefined] => [advancedFilters.value.minExpectedCpe, advancedFilters.value.maxExpectedCpe],
  set: (value: [number | undefined, number | undefined]) => {
    advancedFilters.value.minExpectedCpe = value[0]
    advancedFilters.value.maxExpectedCpe = value[1]
  }
})

const burstRateRange = computed({
  get: (): [number | undefined, number | undefined] => [advancedFilters.value.minBurstRate, advancedFilters.value.maxBurstRate],
  set: (value: [number | undefined, number | undefined]) => {
    advancedFilters.value.minBurstRate = value[0]
    advancedFilters.value.maxBurstRate = value[1]
  }
})

const estimatedCount = ref(0)

// ========== Emits ==========

const emit = defineEmits<{
  filterChange: [filters: QuickFilterParams]
}>()

// ========== 计算属性 ==========

const hasActiveFilters = computed(() => {
  return selectedCooperation.value !== '' ||
    selectedTags.value.length > 0 ||
    basicInfo.value.keyword !== '' ||
    basicInfo.value.gender !== undefined ||
    basicInfo.value.province !== '' ||
    basicInfo.value.city !== '' ||
    influencerAttrs.value.certType !== undefined ||
    Object.values(advancedFilters.value).some(v => v !== undefined && v !== null)
})

const activeFilterTags = computed(() => {
  const tags: { key: string; label: string }[] = []
  
  // 1. 基础信息
  if (basicInfo.value.keyword) {
    tags.push({ key: 'keyword', label: `关键词: ${basicInfo.value.keyword}` })
  }
  if (basicInfo.value.gender) {
    const genderLabel = basicInfo.value.gender === 'M' ? '男' : basicInfo.value.gender === 'F' ? '女' : '未知'
    tags.push({ key: 'gender', label: `性别: ${genderLabel}` })
  }
  if (basicInfo.value.province) {
    tags.push({ key: 'province', label: `省份: ${basicInfo.value.province}` })
  }
  if (basicInfo.value.city) {
    tags.push({ key: 'city', label: `城市: ${basicInfo.value.city}` })
  }
  
  // 2. 合作类型
  if (selectedCooperation.value) {
    const type = cooperationTypes.find(t => t.value === selectedCooperation.value)
    tags.push({ key: 'cooperation', label: `合作: ${type?.label}` })
  }
  
  // 3. 内容标签
  if (selectedTags.value.length > 0) {
    tags.push({ key: 'tags', label: `标签: ${selectedTags.value.map(t => getTagDisplayName(t)).join(', ')}` })
  }
  
  // 4. 认证类型
  const certLabels = { 
    shenguangxingmei: '省广星媒',
    xingliandaren: '星链计划',
    excellentAuthor: '优质达人', 
    risingStart: '新星达人', 
    highPotential: '高潜达人', 
    blackHorse: '黑马达人' 
  }
  if (influencerAttrs.value.certType) {
    tags.push({ key: 'certType', label: `认证: ${certLabels[influencerAttrs.value.certType]}` })
  }
  
  // 5. 场景推荐
  if (selectedScenario.value) {
    const scenario = scenarios.find(s => s.key === selectedScenario.value)
    tags.push({ key: 'scenario', label: `场景: ${scenario?.label}` })
  }
  
  // 6. 核心指标
  const formatRange = (min: number | undefined, max: number | undefined, unit = '') => {
    if (min !== undefined && max !== undefined) return `${min}${unit} ~ ${max}${unit}`
    if (min !== undefined) return `≥ ${min}${unit}`
    if (max !== undefined) return `≤ ${max}${unit}`
    return ''
  }
  
  if (advancedFilters.value.minFollowers !== undefined || advancedFilters.value.maxFollowers !== undefined) {
    tags.push({ 
      key: 'followers', 
      label: `粉丝: ${formatRange(advancedFilters.value.minFollowers, advancedFilters.value.maxFollowers)}` 
    })
  }
  
  if (advancedFilters.value.minPrice20_60 !== undefined || advancedFilters.value.maxPrice20_60 !== undefined) {
    tags.push({ 
      key: 'price', 
      label: `报价: ${formatRange(advancedFilters.value.minPrice20_60, advancedFilters.value.maxPrice20_60, '元')}` 
    })
  }
  
  if (advancedFilters.value.minGmv30d !== undefined || advancedFilters.value.maxGmv30d !== undefined) {
    tags.push({ 
      key: 'gmv', 
      label: `GMV: ${formatRange(advancedFilters.value.minGmv30d, advancedFilters.value.maxGmv30d)}` 
    })
  }
  
  if (advancedFilters.value.minExpectedPlayNum !== undefined || advancedFilters.value.maxExpectedPlayNum !== undefined) {
    tags.push({ 
      key: 'expectedPlay', 
      label: `预期播放: ${formatRange(advancedFilters.value.minExpectedPlayNum, advancedFilters.value.maxExpectedPlayNum)}` 
    })
  }
  
  if (advancedFilters.value.minExpectedCpm !== undefined || advancedFilters.value.maxExpectedCpm !== undefined) {
    tags.push({ 
      key: 'expectedCpm', 
      label: `预期CPM: ${formatRange(advancedFilters.value.minExpectedCpm, advancedFilters.value.maxExpectedCpm)}` 
    })
  }
  
  if (advancedFilters.value.minExpectedCpe !== undefined || advancedFilters.value.maxExpectedCpe !== undefined) {
    tags.push({ 
      key: 'expectedCpe', 
      label: `预期CPE: ${formatRange(advancedFilters.value.minExpectedCpe, advancedFilters.value.maxExpectedCpe)}` 
    })
  }
  
  if (advancedFilters.value.minBurstRate !== undefined || advancedFilters.value.maxBurstRate !== undefined) {
    const min = advancedFilters.value.minBurstRate !== undefined ? (advancedFilters.value.minBurstRate * 100).toFixed(1) : undefined
    const max = advancedFilters.value.maxBurstRate !== undefined ? (advancedFilters.value.maxBurstRate * 100).toFixed(1) : undefined
    tags.push({ 
      key: 'burstRate', 
      label: `爆文率: ${formatRange(min ? Number(min) : undefined, max ? Number(max) : undefined, '%')}` 
    })
  }
  
  // 7. 内容质量
  if (advancedFilters.value.minInteractRate !== undefined || advancedFilters.value.maxInteractRate !== undefined) {
    const min = advancedFilters.value.minInteractRate !== undefined ? (advancedFilters.value.minInteractRate * 100).toFixed(1) : undefined
    const max = advancedFilters.value.maxInteractRate !== undefined ? (advancedFilters.value.maxInteractRate * 100).toFixed(1) : undefined
    tags.push({ 
      key: 'interactRate', 
      label: `互动率: ${formatRange(min ? Number(min) : undefined, max ? Number(max) : undefined, '%')}` 
    })
  }
  
  if (advancedFilters.value.minPlayOverRate !== undefined || advancedFilters.value.maxPlayOverRate !== undefined) {
    const min = advancedFilters.value.minPlayOverRate !== undefined ? (advancedFilters.value.minPlayOverRate * 100).toFixed(1) : undefined
    const max = advancedFilters.value.maxPlayOverRate !== undefined ? (advancedFilters.value.maxPlayOverRate * 100).toFixed(1) : undefined
    tags.push({ 
      key: 'playOverRate', 
      label: `完播率: ${formatRange(min ? Number(min) : undefined, max ? Number(max) : undefined, '%')}` 
    })
  }
  
  if (advancedFilters.value.minGrowthRate30d !== undefined || advancedFilters.value.maxGrowthRate30d !== undefined) {
    const min = advancedFilters.value.minGrowthRate30d !== undefined ? (advancedFilters.value.minGrowthRate30d * 100).toFixed(1) : undefined
    const max = advancedFilters.value.maxGrowthRate30d !== undefined ? (advancedFilters.value.maxGrowthRate30d * 100).toFixed(1) : undefined
    tags.push({ 
      key: 'growthRate', 
      label: `增长率: ${formatRange(min ? Number(min) : undefined, max ? Number(max) : undefined, '%')}` 
    })
  }
  
  // 8. 营销指数
  if (advancedFilters.value.minConvertIndex !== undefined) {
    tags.push({ key: 'convertIndex', label: `转化指数: ≥ ${advancedFilters.value.minConvertIndex}` })
  }
  if (advancedFilters.value.minShoppingIndex !== undefined) {
    tags.push({ key: 'shoppingIndex', label: `种草指数: ≥ ${advancedFilters.value.minShoppingIndex}` })
  }
  if (advancedFilters.value.minSpreadIndex !== undefined) {
    tags.push({ key: 'spreadIndex', label: `传播指数: ≥ ${advancedFilters.value.minSpreadIndex}` })
  }
  
  return tags
})

// ========== 方法 ==========

const formatCount = (count: number) => {
  if (count >= 10000) return `${(count / 10000).toFixed(1)}万`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`
  return count.toString()
}

const handleCooperationChange = (value: string) => {
  selectedCooperation.value = value
  emitFilterChange()
}

const toggleTag = (tag: string) => {
  const index = selectedTags.value.indexOf(tag)
  if (index > -1) {
    selectedTags.value.splice(index, 1)
  } else {
    if (selectedTags.value.length < 5) {
      selectedTags.value.push(tag)
    }
  }
  emitFilterChange()
}

// 判断一级分类是否被选中（包括自身或任意二级标签）
const isTagSelected = (categoryCode: string) => {
  return selectedTags.value.some(tag => tag.startsWith(categoryCode))
}

// 判断是否只选中了一级分类（没有选二级）
const isOnlyCategorySelected = (categoryCode: string) => {
  return selectedTags.value.includes(categoryCode)
}

// 判断二级标签是否被选中
const isSubcategorySelected = (categoryCode: string, subcategoryCode: string) => {
  const fullCode = `${categoryCode}.${subcategoryCode}`
  return selectedTags.value.includes(fullCode)
}

// 切换一级分类选中状态（不选二级）
const toggleCategoryOnly = (categoryCode: string) => {
  // 移除所有该分类的标签（包括一级和二级）
  selectedTags.value = selectedTags.value.filter(tag => !tag.startsWith(categoryCode))
  
  // 如果之前没选中，则添加一级标签
  if (!isTagSelected(categoryCode)) {
    if (selectedTags.value.length < 5) {
      selectedTags.value.push(categoryCode)
    }
  }
  
  emitFilterChange()
}

// 选择二级标签 - 已注释隐藏
// const handleSubcategorySelect = (categoryCode: string, subcategoryCode: string | null) => {
//   if (subcategoryCode === null) {
//     // 点击了"全选"，切换一级分类
//     toggleCategoryOnly(categoryCode)
//     return
//   }
//   
//   const fullCode = `${categoryCode}.${subcategoryCode}`
//   const index = selectedTags.value.indexOf(fullCode)
//   
//   // 先移除一级标签（如果存在）
//   const categoryIndex = selectedTags.value.indexOf(categoryCode)
//   if (categoryIndex > -1) {
//     selectedTags.value.splice(categoryIndex, 1)
//   }
//   
//   // 切换二级标签
//   if (index > -1) {
//     selectedTags.value.splice(index, 1)
//   } else {
//     if (selectedTags.value.length < 5) {
//       selectedTags.value.push(fullCode)
//     }
//   }
//   
//   emitFilterChange()
// }

// 获取分类统计数量（从hotTags中查找）
const getCategoryCount = (categoryCode: string) => {
  const category = contentTagsHierarchy.value.find(c => c.code === categoryCode)
  if (!category) return 0
  
  // 查找该分类在hotTags中的数量
  const hotTag = hotTags.value.find(t => t.tag === category.category)
  return hotTag ? hotTag.count : 0
}

// 获取标签的中文显示名称
const getTagDisplayName = (tag: string): string => {
  // 一级标签
  const category = contentTagsHierarchy.value.find(c => c.code === tag)
  if (category) {
    return `${category.category}`
  }
  
  // 二级标签 - 已注释隐藏
  // if (tag.includes('.')) {
  //   const [categoryCode, subcategoryCode] = tag.split('.')
  //   const parentCategory = contentTagsHierarchy.value.find(c => c.code === categoryCode)
  //   if (parentCategory && parentCategory.children) {
  //     const subcategory = parentCategory.children.find(s => s.code === subcategoryCode)
  //     if (subcategory) {
  //       return `${parentCategory.category} > ${subcategory.name}`
  //     }
  //   }
  // }
  
  return tag
}

const removeTag = (tag: string) => {
  const index = selectedTags.value.indexOf(tag)
  if (index > -1) {
    selectedTags.value.splice(index, 1)
    emitFilterChange()
  }
}

const clearTags = () => {
  selectedTags.value = []
  emitFilterChange()
}

const handleTagChange = () => {
  emitFilterChange()
}

const handleFilterChange = () => {
  emitFilterChange()
}

const removeFilter = (key: string) => {
  switch (key) {
    case 'keyword':
      basicInfo.value.keyword = ''
      break
    case 'gender':
      basicInfo.value.gender = undefined
      break
    case 'province':
      basicInfo.value.province = ''
      break
    case 'city':
      basicInfo.value.city = ''
      break
    case 'cooperation':
      selectedCooperation.value = ''
      break
    case 'tags':
      selectedTags.value = []
      break
    case 'certType':
      influencerAttrs.value.certType = undefined
      break
    case 'scenario':
      selectedScenario.value = ''
      resetAdvancedFilters()
      break
    case 'followers':
      advancedFilters.value.minFollowers = undefined
      advancedFilters.value.maxFollowers = undefined
      break
    case 'price':
      advancedFilters.value.minPrice20_60 = undefined
      advancedFilters.value.maxPrice20_60 = undefined
      break
    case 'gmv':
      advancedFilters.value.minGmv30d = undefined
      advancedFilters.value.maxGmv30d = undefined
      break
    case 'expectedPlay':
      advancedFilters.value.minExpectedPlayNum = undefined
      advancedFilters.value.maxExpectedPlayNum = undefined
      break
    case 'expectedCpm':
      advancedFilters.value.minExpectedCpm = undefined
      advancedFilters.value.maxExpectedCpm = undefined
      break
    case 'expectedCpe':
      advancedFilters.value.minExpectedCpe = undefined
      advancedFilters.value.maxExpectedCpe = undefined
      break
    case 'burstRate':
      advancedFilters.value.minBurstRate = undefined
      advancedFilters.value.maxBurstRate = undefined
      break
    case 'interactRate':
      advancedFilters.value.minInteractRate = undefined
      advancedFilters.value.maxInteractRate = undefined
      break
    case 'playOverRate':
      advancedFilters.value.minPlayOverRate = undefined
      advancedFilters.value.maxPlayOverRate = undefined
      break
    case 'growthRate':
      advancedFilters.value.minGrowthRate30d = undefined
      advancedFilters.value.maxGrowthRate30d = undefined
      break
    case 'convertIndex':
      advancedFilters.value.minConvertIndex = undefined
      break
    case 'shoppingIndex':
      advancedFilters.value.minShoppingIndex = undefined
      break
    case 'spreadIndex':
      advancedFilters.value.minSpreadIndex = undefined
      break
  }
  emitFilterChange()
}

const clearAllFilters = () => {
  basicInfo.value = {
    keyword: '',
    gender: undefined,
    province: '',
    city: ''
  }
  selectedCooperation.value = ''
  selectedTags.value = []
  filters.value = {}
  influencerAttrs.value = {
    certType: undefined
  }
  resetAdvancedFilters()
  emitFilterChange()
}

const handleBasicInfoChange = () => {
  emitFilterChange()
}

const handleAttrChange = () => {
  emitFilterChange()
}

// 智能场景应用
const applyScenario = (scenario: typeof scenarios[0]) => {
  if (selectedScenario.value === scenario.key) {
    // 再次点击同一场景，清空
    selectedScenario.value = ''
    resetAdvancedFilters()
    return
  }
  selectedScenario.value = scenario.key
  // 应用场景筛选
Object.assign(advancedFilters.value, scenario.filters)
  emitFilterChange()
}

// 高级筛选变化
const handleAdvancedChange = () => {
  emitFilterChange()
}

// 重置高级筛选
const resetAdvancedFilters = () => {
  advancedFilters.value = {
    minFollowers: undefined, 
    maxFollowers: undefined, 
    minGrowthRate30d: undefined, 
    maxGrowthRate30d: undefined,
    minInteractRate: undefined, 
    maxInteractRate: undefined, 
    minPlayOverRate: undefined, 
    maxPlayOverRate: undefined,
    minVvMedian: undefined, 
    maxVvMedian: undefined,
    minGmv30d: undefined, 
    maxGmv30d: undefined, 
    minConvertIndex: undefined, 
    minShoppingIndex: undefined,
    minSpreadIndex: undefined, 
    minCpmEfficiency: undefined, 
    maxCpmEfficiency: undefined, 
    minPrice20_60: undefined,
    maxPrice20_60: undefined,
    minExpectedPlayNum: undefined,
    maxExpectedPlayNum: undefined,
    minExpectedCpm: undefined,
    maxExpectedCpm: undefined,
    minExpectedCpe: undefined,
    maxExpectedCpe: undefined,
    minBurstRate: undefined,
    maxBurstRate: undefined
  }
}

const emitFilterChange = useDebounceFn(() => {
  // 将前端选中的标签转换为中文标签名（与数据库一致）
  const chineseTagNames = selectedTags.value.map(tag => {
    // 处理一级标签
    const category = contentTagsHierarchy.value.find(c => c.code === tag)
    if (category) {
      return category.category  // 返回中文名："美妆"
    }
    
    // 处理二级标签 - 已注释隐藏，数据库中不存在二级标签数据
    // if (tag.includes('.')) {
    //   const [categoryCode, subcategoryCode] = tag.split('.')
    //   const parentCategory = contentTagsHierarchy.value.find(c => c.code === categoryCode)
    //   if (parentCategory && parentCategory.children) {
    //     const subcategory = parentCategory.children.find(s => s.code === subcategoryCode)
    //     if (subcategory) {
    //       return subcategory.name  // 返回二级标签中文名："护肤保养"
    //     }
    //   }
    // }
    
    return tag  // fallback
  })
  
  // 处理特殊认证和机构筛选
  const certMapping: any = {}
  if (influencerAttrs.value.certType) {
    // 如果是机构筛选,映射到orgName参数
    if (influencerAttrs.value.certType === 'shenguangxingmei') {
      certMapping.orgName = '省广星媒'
      // 清除其他认证标签
      certMapping.excellentAuthor = undefined
      certMapping.blackHorse = undefined
      certMapping.risingStart = undefined
      certMapping.highPotential = undefined
    } else if (influencerAttrs.value.certType === 'xingliandaren') {
      certMapping.orgName = '星链计划'
      // 清除其他认证标签
      certMapping.excellentAuthor = undefined
      certMapping.blackHorse = undefined
      certMapping.risingStart = undefined
      certMapping.highPotential = undefined
    } else {
      // 其他认证类型，仅设置当前选中的为true，其他为undefined
      certMapping.orgName = undefined
      certMapping.excellentAuthor = influencerAttrs.value.certType === 'excellentAuthor' ? true : undefined
      certMapping.blackHorse = influencerAttrs.value.certType === 'blackHorse' ? true : undefined
      certMapping.risingStart = influencerAttrs.value.certType === 'risingStart' ? true : undefined
      certMapping.highPotential = influencerAttrs.value.certType === 'highPotential' ? true : undefined
    }
  } else {
    // 如果没有选中认证类型,清除所有认证标签
    certMapping.orgName = undefined
    certMapping.excellentAuthor = undefined
    certMapping.blackHorse = undefined
    certMapping.risingStart = undefined
    certMapping.highPotential = undefined
  }
  
  // 构建筛选参数 - 直接构建完整状态，保留undefined以通知父组件清除
  const params: any = {
    // 基础信息
    keyword: basicInfo.value.keyword || undefined,
    gender: basicInfo.value.gender,
    province: basicInfo.value.province || undefined,
    city: basicInfo.value.city || undefined,
    // 标签
    primaryTags: chineseTagNames.length > 0 ? chineseTagNames : undefined,
    // 达人属性 - 认证标签
    ...certMapping,
    // 高级筛选参数 - 包含undefined，确保清除操作生效
    minFollowers: advancedFilters.value.minFollowers,
    maxFollowers: advancedFilters.value.maxFollowers,
    minGrowthRate30d: advancedFilters.value.minGrowthRate30d,
    maxGrowthRate30d: advancedFilters.value.maxGrowthRate30d,
    minInteractRate: advancedFilters.value.minInteractRate,
    maxInteractRate: advancedFilters.value.maxInteractRate,
    minPlayOverRate: advancedFilters.value.minPlayOverRate,
    maxPlayOverRate: advancedFilters.value.maxPlayOverRate,
    minVvMedian: advancedFilters.value.minVvMedian,
    maxVvMedian: advancedFilters.value.maxVvMedian,
    minGmv30d: advancedFilters.value.minGmv30d,
    maxGmv30d: advancedFilters.value.maxGmv30d,
    minConvertIndex: advancedFilters.value.minConvertIndex,
    minShoppingIndex: advancedFilters.value.minShoppingIndex,
    minSpreadIndex: advancedFilters.value.minSpreadIndex,
    minCpmEfficiency: advancedFilters.value.minCpmEfficiency,
    maxCpmEfficiency: advancedFilters.value.maxCpmEfficiency,
    minPrice20_60: advancedFilters.value.minPrice20_60,
    maxPrice20_60: advancedFilters.value.maxPrice20_60,
    minExpectedPlayNum: advancedFilters.value.minExpectedPlayNum,
    maxExpectedPlayNum: advancedFilters.value.maxExpectedPlayNum,
    minExpectedCpm: advancedFilters.value.minExpectedCpm,
    maxExpectedCpm: advancedFilters.value.maxExpectedCpm,
    minExpectedCpe: advancedFilters.value.minExpectedCpe,
    maxExpectedCpe: advancedFilters.value.maxExpectedCpe,
    minBurstRate: advancedFilters.value.minBurstRate,
    maxBurstRate: advancedFilters.value.maxBurstRate
  }
  
  emit('filterChange', params)
}, 300)

// 加载热门标签
const loadHotTags = async () => {
  try {
    const tags = await getPopularTags(30)
    hotTags.value = tags
  } catch (error) {
    log.error('加载热门标签失败:', error)
  }
}

// ========== 生命周期 ==========

onMounted(() => {
  loadHotTags()
})
</script>

<style scoped lang="scss">
.quick-filters-optimized {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
}

.filter-row {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;  // 统一间距为16px
  
  &:last-child {
    margin-bottom: 0;
  }
  
  &.basic-info-row {
    padding-bottom: 16px;
    margin-bottom: 16px;  // 保持一致
    border-bottom: 2px solid #e5e7eb;
  }
}

.filter-label {
  min-width: 90px;
  font-weight: 500;
  color: #303133;
  line-height: 32px;
  margin-right: 16px;
}

.filter-buttons {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;  // 调整为12px统一间距
}

.filter-content {
  flex: 1;
  
  &.dual-dimension {
    display: grid;
    grid-template-columns: 0.5fr 1fr;
    gap: 8px 24px;
    align-items: flex-start;
  }
  
  &.basic-info-grid {
    display: grid;
    grid-template-columns: 0.5fr 0.35fr 0.35fr 1.5fr;
    gap: 18px;
    align-items: center;
  }
  
  &.attribute-grid {
    display: grid;
    grid-template-columns: 0.5fr 1fr;
    gap: 8px 24px;
    align-items: flex-start;
  }
}

.dimension-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.dimension-label {
  min-width: 80px;
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
}

.attribute-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.attribute-label {
  min-width: 80px;
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
}

.info-icon {
  font-size: 14px;
  color: #909399;
  cursor: help;
  
  &.trend-icon {
    color: #67c23a;
  }
}

.hot-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;  // 调整为12px统一间距
  margin-bottom: 12px;
}

.tag-count {
  font-size: 12px;
  color: #909399;
  margin-left: 4px;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;  // 调整为12px统一间距
}

.all-tags-panel {
  max-height: 400px;
  overflow-y: auto;
}

.tag-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.basic-item {
  :deep(.el-input__wrapper) {
    transition: all 0.3s;
    
    &:hover {
      box-shadow: 0 0 0 1px #409eff inset;
    }
  }
  
  :deep(.el-radio-group) {
    display: flex;
    width: 100%;
  }
}

.filter-summary {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-content {
  display: flex;
  align-items: center;
  gap: 12px;  // 调整为12px统一间距
  flex-wrap: wrap;
}

.summary-label {
  font-size: 13px;
  color: #606266;
}

/* 二级标签下拉菜单样式 */
.el-dropdown-menu__item {
  &.is-active {
    background-color: #ecf5ff;
    color: #409eff;
  }
}

/* Checkbox 在下拉菜单中的样式 */
:deep(.el-dropdown-menu__item) {
  .el-checkbox {
    width: 100%;
    
    .el-checkbox__label {
      width: 100%;
    }
  }
}

/* 高级筛选网格布局 */
.advanced-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px 20px;  
  max-width: 1000px;
  
  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.advanced-item {
  display: flex;
  align-items: center;  // 改为水平布局
  gap: 12px;  // 增加间距
  min-width: 0;  // 正字暗示元素能偏缩
}

.advanced-label {
  font-size: 13px;  // 稍微增大字号
  color: #374151;  // 加深颜色，提高可读性
  font-weight: 500;
  white-space: nowrap;
  min-width: 70px;  // 确保标签宽度一致
}
</style>
