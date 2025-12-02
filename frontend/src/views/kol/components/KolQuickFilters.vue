<template>
  <div class="kol-quick-filters">
    <!-- 第1行: 基础搜索 -->
    <div class="filter-row basic-search-row">
      <span class="filter-label">快速搜索</span>
      <div class="filter-content">
        <el-input 
          v-model="localFilters.account_name" 
          placeholder="搜索账号名称或ID" 
          clearable 
          size="default"
          @input="handleFilterChange"
          class="search-input"
        >
          <template #prefix><Icon icon="lucide:search" /></template>
        </el-input>
        
        <el-select 
          v-model="localFilters.platform" 
          placeholder="平台" 
          clearable
          size="default"
          @change="handleFilterChange"
          class="platform-select"
        >
          <el-option label="抖音" value="抖音" />
          <el-option label="小红书" value="小红书" />
          <el-option label="B站" value="B站" />
          <el-option label="快手" value="快手" />
        </el-select>

        <el-input 
          v-model="localFilters.org_name" 
          placeholder="机构名" 
          clearable 
          size="default"
          @input="handleFilterChange"
          class="org-input"
        >
          <template #prefix><Icon icon="lucide:building-2" /></template>
        </el-input>
      </div>
    </div>

    <!-- 第2行: 同步状态 -->
    <div class="filter-row status-row">
      <span class="filter-label">同步状态</span>
      <div class="filter-buttons">
        <el-button
          v-for="status in syncStatuses"
          :key="status.value"
          :type="localFilters.match_status === status.value ? 'primary' : ''"
          size="default"
          @click="handleStatusChange(status.value)"
        >
          <Icon :icon="status.icon" class="mr-1" />
          {{ status.label }}
        </el-button>
      </div>
    </div>

    <!-- 第3行: 达人属性 -->
    <div class="filter-row attribute-row">
      <span class="filter-label">达人属性</span>
      <div class="filter-content dual-dimension">
        <div class="dimension-group">
          <span class="dimension-label">独家:</span>
          <el-radio-group
            v-model="localFilters.is_exclusive"
            @change="handleFilterChange"
          >
            <el-radio-button :value="undefined">不限</el-radio-button>
            <el-radio-button :value="1">是</el-radio-button>
            <el-radio-button :value="0">否</el-radio-button>
          </el-radio-group>
        </div>

        <div class="dimension-group">
          <span class="dimension-label">返点:</span>
          <el-radio-group
            v-model="localFilters.rebate_policy"
            @change="handleFilterChange"
          >
            <el-radio-button :value="undefined">不限</el-radio-button>
            <el-radio-button :value="1">有</el-radio-button>
            <el-radio-button :value="0">无</el-radio-button>
          </el-radio-group>
        </div>

        <div class="dimension-group">
          <span class="dimension-label">政策:</span>
          <el-radio-group
            v-model="localFilters.policy_level"
            @change="handleFilterChange"
          >
            <el-radio-button :value="undefined">不限</el-radio-button>
            <el-radio-button value="S">S级</el-radio-button>
            <el-radio-button value="A">A级</el-radio-button>
            <el-radio-button value="B">B级</el-radio-button>
            <el-radio-button value="C">C级</el-radio-button>
            <el-radio-button value="D">D级</el-radio-button>
          </el-radio-group>
        </div>
      </div>
    </div>

    <!-- 第4行: 内容分类 -->
    <div class="filter-row category-row">
      <span class="filter-label">内容分类</span>
      <div class="filter-content">
        <el-input 
          v-model="localFilters.category" 
          placeholder="如: 美妆、汽车等" 
          clearable 
          size="default"
          @input="handleFilterChange"
          class="category-input"
        >
          <template #prefix><Icon icon="lucide:tag" /></template>
        </el-input>
      </div>
    </div>

    <!-- 第5行: 粉丝规模（使用滚轮选择器）-->
    <div class="filter-row followers-row">
      <span class="filter-label">粉丝规模</span>
      <div class="filter-content">
        <div class="compact-range-picker">
          <DiscreteRangePicker
            v-model="followerRange"
            :options="FOLLOWER_OPTIONS"
            min-placeholder="最低"
            max-placeholder="最高"
            @update:model-value="handleFollowerChange"
          />
        </div>
      </div>
    </div>

    <!-- 已选筛选条件展示 -->
    <div v-if="hasActiveFilters" class="filter-summary">
      <div class="summary-content">
        <span class="summary-label">当前筛选:</span>
        <el-tag
          v-for="tag in activeFilterTags"
          :key="tag.key"
          closable
          type="info"
          size="small"
          @close="removeFilterTag(tag.key)"
        >
          {{ tag.label }}
        </el-tag>
        <el-button link type="primary" size="small" @click="handleClearAll">
          清空全部
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { IconifyIcon as Icon } from '@vben/icons'
import DiscreteRangePicker from '../../influencer-authors/components/DiscreteRangePicker.vue'

interface KolFilters {
  account_name?: string
  platform?: string
  org_name?: string
  category?: string
  match_status?: string
  is_exclusive?: number
  rebate_policy?: number
  policy_level?: string
  min_followers_w?: number
  max_followers_w?: number
  sort_by?: string
  sort_order?: string
}

const props = defineProps<{
  filters: KolFilters
}>()

const emit = defineEmits<{
  filterChange: [filters: KolFilters]
}>()

// 同步状态选项
const syncStatuses = [
  { value: undefined, label: '全部', icon: 'lucide:layers' },
  { value: 'unmatched', label: '未匹配', icon: 'lucide:help-circle' },
  { value: 'pending', label: '待同步', icon: 'lucide:clock' },
  { value: 'matched', label: '已匹配', icon: 'lucide:check-circle' },
  { value: 'rejected', label: '同步失败', icon: 'lucide:x-circle' }
]

// 粉丝规模选项（万为单位）
const FOLLOWER_OPTIONS = [
  { label: '不限', value: undefined },
  { label: '1万', value: 1 },
  { label: '5万', value: 5 },
  { label: '10万', value: 10 },
  { label: '30万', value: 30 },
  { label: '50万', value: 50 },
  { label: '100万', value: 100 },
  { label: '300万', value: 300 },
  { label: '500万', value: 500 },
  { label: '1000万', value: 1000 }
]

const localFilters = ref<KolFilters>({ ...props.filters })

// 粉丝范围
const followerRange = computed({
  get: (): [number | undefined, number | undefined] => {
    return [localFilters.value.min_followers_w, localFilters.value.max_followers_w]
  },
  set: (val: [number | undefined, number | undefined]) => {
    localFilters.value.min_followers_w = val[0]
    localFilters.value.max_followers_w = val[1]
  }
})

// 监听 props 变化
watch(() => props.filters, (newFilters) => {
  localFilters.value = { ...newFilters }
}, { deep: true })

// 处理筛选条件变化
const handleFilterChange = () => {
  emit('filterChange', { ...localFilters.value })
}

// 处理同步状态变化
const handleStatusChange = (status: string | undefined) => {
  localFilters.value.match_status = status
  handleFilterChange()
}

// 处理粉丝范围变化
const handleFollowerChange = () => {
  handleFilterChange()
}

// 是否有激活的筛选条件
const hasActiveFilters = computed(() => {
  const { sort_by, sort_order, ...filterValues } = localFilters.value
  return Object.values(filterValues).some(val =>
    val !== undefined && val !== null && val !== ''
  )
})

// 激活的筛选条件标签
const activeFilterTags = computed(() => {
  const tags: Array<{ key: string; label: string }> = []
  
  if (localFilters.value.account_name) {
    tags.push({ key: 'account_name', label: `账号: ${localFilters.value.account_name}` })
  }
  if (localFilters.value.platform) {
    tags.push({ key: 'platform', label: `平台: ${localFilters.value.platform}` })
  }
  if (localFilters.value.org_name) {
    tags.push({ key: 'org_name', label: `机构: ${localFilters.value.org_name}` })
  }
  if (localFilters.value.category) {
    tags.push({ key: 'category', label: `分类: ${localFilters.value.category}` })
  }
  if (localFilters.value.match_status) {
    const status = syncStatuses.find(s => s.value === localFilters.value.match_status)
    if (status) {
      tags.push({ key: 'match_status', label: `状态: ${status.label}` })
    }
  }
  if (localFilters.value.is_exclusive !== undefined) {
    tags.push({ key: 'is_exclusive', label: `独家: ${localFilters.value.is_exclusive === 1 ? '是' : '否'}` })
  }
  if (localFilters.value.rebate_policy !== undefined) {
    tags.push({ key: 'rebate_policy', label: `返点: ${localFilters.value.rebate_policy === 1 ? '有' : '无'}` })
  }
  if (localFilters.value.policy_level) {
    tags.push({ key: 'policy_level', label: `政策: ${localFilters.value.policy_level}级` })
  }
  if (localFilters.value.min_followers_w || localFilters.value.max_followers_w) {
    const min = localFilters.value.min_followers_w || '不限'
    const max = localFilters.value.max_followers_w || '不限'
    tags.push({ key: 'follower_range', label: `粉丝: ${min}万 - ${max}万` })
  }
  
  return tags
})

// 移除单个筛选标签
const removeFilterTag = (key: string) => {
  if (key === 'account_name') localFilters.value.account_name = ''
  else if (key === 'platform') localFilters.value.platform = ''
  else if (key === 'org_name') localFilters.value.org_name = ''
  else if (key === 'category') localFilters.value.category = ''
  else if (key === 'match_status') localFilters.value.match_status = ''
  else if (key === 'is_exclusive') localFilters.value.is_exclusive = undefined
  else if (key === 'rebate_policy') localFilters.value.rebate_policy = undefined
  else if (key === 'policy_level') localFilters.value.policy_level = ''
  else if (key === 'follower_range') {
    localFilters.value.min_followers_w = undefined
    localFilters.value.max_followers_w = undefined
  }

  handleFilterChange()
}

// 清空所有筛选
const handleClearAll = () => {
  // 保留原有的字段结构，只清空筛选相关的值
  localFilters.value = {
    platform: '',
    account_name: '',
    org_name: '',
    category: '',
    min_followers_w: undefined,
    max_followers_w: undefined,
    is_exclusive: undefined,
    rebate_policy: undefined,
    policy_level: '',
    match_status: ''
  }
  handleFilterChange()
}
</script>

<style scoped lang="scss">
.kol-quick-filters {
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
}

.filter-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
  
  &:last-of-type {
    margin-bottom: 0;
  }
}

.filter-label {
  flex-shrink: 0;
  width: 80px;
  font-weight: 500;
  font-size: 14px;
  color: var(--el-text-color-primary);
  padding-top: 6px;
  text-align: right;
}

.filter-content {
  flex: 1;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.search-input,
.platform-select,
.org-input,
.category-input {
  width: 200px;
}

.filter-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.dual-dimension {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.dimension-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dimension-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.filter-summary {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px dashed var(--el-border-color);
}

.summary-content {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.summary-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  font-weight: 500;
}

.mr-1 {
  margin-right: 4px;
}

/* 粉丝规模选择器紧凑样式 */
.compact-range-picker {
  max-width: 360px;
}

/* 响应式设计 */
@media (max-width: 2000px) {
  .search-input,
  .platform-select,
  .org-input,
  .category-input {
    width: 160px;
  }
  
  .dual-dimension {
    gap: 16px;
  }
}

@media (max-width: 768px) {
  .filter-row {
    flex-direction: column;
    gap: 8px;
  }
  
  .filter-label {
    width: 100%;
    text-align: left;
    padding-top: 0;
  }
  
  .filter-content {
    width: 100%;
  }
  
  .search-input,
  .platform-select,
  .org-input,
  .category-input {
    width: 100%;
  }
  
  .dual-dimension {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
