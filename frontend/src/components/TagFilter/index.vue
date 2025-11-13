<template>
  <div class="tag-filter-component">
    <!-- 筛选条件展示区域 -->
    <div class="filter-summary" v-if="hasActiveFilters">
      <div class="summary-header">
        <Icon icon="lucide:filter" class="summary-icon" />
        <span class="summary-title">当前筛选条件</span>
        <el-button type="text" size="small" @click="clearAllFilters">
          <Icon icon="lucide:x" class="mr-1" />
          清空所有
        </el-button>
      </div>
      <div class="summary-tags">
        <el-tag
          v-for="filter in activeFilters"
          :key="filter.key"
          closable
          @close="removeFilter(filter.key)"
          class="filter-tag"
        >
          {{ filter.label }}: {{ filter.value }}
        </el-tag>
      </div>
    </div>

    <!-- 快速筛选按钮 -->
    <div class="quick-filters">
      <div class="quick-filter-group">
        <span class="group-label">快速筛选:</span>
        <el-button
          v-for="quickFilter in quickFilters"
          :key="quickFilter.key"
          :type="isQuickFilterActive(quickFilter.key) ? 'primary' : 'default'"
          size="small"
          @click="toggleQuickFilter(quickFilter.key)"
        >
          <Icon :icon="quickFilter.icon" class="mr-1" />
          {{ quickFilter.label }}
        </el-button>
      </div>
    </div>

    <!-- 高级筛选面板 -->
    <el-collapse v-model="activeCollapse" class="filter-collapse">
      <!-- 合作诉求 -->
      <el-collapse-item name="cooperation" title="合作诉求">
        <template #title>
          <div class="collapse-title">
            <Icon icon="lucide:handshake" class="title-icon" />
            <span>合作诉求</span>
            <el-badge v-if="getFilterCount('cooperation') > 0" :value="getFilterCount('cooperation')" class="title-badge" />
          </div>
        </template>
        
        <div class="filter-content">
          <!-- 题材类型 -->
          <div class="filter-group">
            <div class="group-header">
              <span class="group-title">题材类型</span>
              <el-button type="text" size="small" @click="resetGroup('contentType')">重置</el-button>
            </div>
            <div class="group-content">
              <el-radio-group v-model="filters.cooperationRequest.contentType.value" class="radio-group">
                <el-radio-button
                  v-for="option in cooperationRequest.contentType.options"
                  :key="option.value"
                  :label="option.value"
                >
                  {{ option.label }}
                </el-radio-button>
              </el-radio-group>
              <el-select
                v-model="filters.cooperationRequest.contentType.other"
                placeholder="其它题材"
                class="filter-select"
                clearable
                filterable
              >
                <el-option
                  v-for="option in cooperationRequest.contentType.otherOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </div>
          </div>

          <!-- 适配行业 -->
          <div class="filter-group">
            <div class="group-header">
              <span class="group-title">适配行业</span>
              <el-button type="text" size="small" @click="resetGroup('industry')">重置</el-button>
            </div>
            <div class="group-content">
              <el-select
                v-model="filters.cooperationRequest.industry.value"
                placeholder="选择行业"
                class="filter-select"
                clearable
                filterable
                multiple
                collapse-tags
                collapse-tags-tooltip
              >
                <el-option
                  v-for="option in cooperationRequest.industry.options"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </div>
          </div>

          <!-- 营销目标 -->
          <div class="filter-group">
            <div class="group-header">
              <span class="group-title">营销目标</span>
              <el-button type="text" size="small" @click="resetGroup('marketingGoal')">重置</el-button>
            </div>
            <div class="group-content">
              <el-checkbox-group v-model="filters.cooperationRequest.marketingGoal.value" class="checkbox-group">
                <el-checkbox
                  v-for="option in cooperationRequest.marketingGoal.options"
                  :key="option.value"
                  :label="option.value"
                  class="filter-checkbox"
                >
                  {{ option.label }}
                </el-checkbox>
              </el-checkbox-group>
              <div class="select-group">
                <el-select
                  v-model="filters.cooperationRequest.marketingGoal.audience"
                  placeholder="八大人群"
                  class="filter-select"
                  clearable
                  filterable
                >
                  <el-option
                    v-for="option in cooperationRequest.marketingGoal.audienceOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
                <el-select
                  v-model="filters.cooperationRequest.marketingGoal.customAudience"
                  placeholder="自定义人群"
                  class="filter-select"
                  clearable
                  filterable
                >
                  <el-option
                    v-for="option in cooperationRequest.marketingGoal.customAudienceOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </div>
            </div>
          </div>
        </div>
      </el-collapse-item>

      <!-- 匹配度 -->
      <el-collapse-item name="matching" title="匹配度">
        <template #title>
          <div class="collapse-title">
            <Icon icon="lucide:target" class="title-icon" />
            <span>匹配度</span>
            <el-badge v-if="getFilterCount('matching') > 0" :value="getFilterCount('matching')" class="title-badge" />
          </div>
        </template>
        
        <div class="filter-content">
          <!-- 达人类型 -->
          <div class="filter-group">
            <div class="group-header">
              <span class="group-title">达人类型</span>
              <el-button type="text" size="small" @click="resetGroup('talentTypes')">重置</el-button>
            </div>
            <div class="group-content">
              <div class="select-grid">
                <el-select
                  v-for="(type, index) in matchingDegree.talentTypes"
                  :key="index"
                  v-model="type.value"
                  :placeholder="type.placeholder"
                  class="filter-select"
                  clearable
                  filterable
                >
                  <el-option
                    v-for="option in type.options"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </div>
            </div>
          </div>

          <!-- 达人人设 -->
          <div class="filter-group">
            <div class="group-header">
              <span class="group-title">达人人设</span>
              <el-button type="text" size="small" @click="resetGroup('talentPersonas')">重置</el-button>
            </div>
            <div class="group-content">
              <div class="select-grid">
                <el-select
                  v-for="(persona, index) in matchingDegree.talentPersonas"
                  :key="index"
                  v-model="persona.value"
                  :placeholder="persona.placeholder"
                  class="filter-select"
                  clearable
                  filterable
                >
                  <el-option
                    v-for="option in persona.options"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </div>
            </div>
          </div>

          <!-- 内容主题 -->
          <div class="filter-group">
            <div class="group-header">
              <span class="group-title">内容主题</span>
              <el-button type="text" size="small" @click="resetGroup('contentThemes')">重置</el-button>
            </div>
            <div class="group-content">
              <div class="select-grid">
                <el-select
                  v-for="(theme, index) in matchingDegree.contentThemes"
                  :key="index"
                  v-model="theme.value"
                  :placeholder="theme.placeholder"
                  class="filter-select"
                  clearable
                  filterable
                >
                  <el-option
                    v-for="option in theme.options"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </div>
            </div>
          </div>

          <!-- 背景信息 -->
          <div class="filter-group">
            <div class="group-header">
              <span class="group-title">背景信息</span>
              <el-button type="text" size="small" @click="resetGroup('backgroundInfo')">重置</el-button>
            </div>
            <div class="group-content">
              <div class="select-group">
                <el-select
                  v-for="(info, index) in matchingDegree.backgroundInfo"
                  :key="index"
                  v-model="info.value"
                  :placeholder="info.placeholder"
                  class="filter-select"
                  clearable
                  filterable
                >
                  <el-option
                    v-for="option in info.options"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </div>
              <el-checkbox-group v-model="matchingDegree.backgroundInfo.checkboxes" class="checkbox-group">
                <el-checkbox
                  v-for="checkbox in matchingDegree.backgroundInfo.checkboxes"
                  :key="checkbox.value"
                  :label="checkbox.value"
                  class="filter-checkbox"
                >
                  {{ checkbox.label }}
                </el-checkbox>
              </el-checkbox-group>
            </div>
          </div>

          <!-- 受众画像 -->
          <div class="filter-group">
            <div class="group-header">
              <span class="group-title">受众画像</span>
              <el-button type="text" size="small" @click="resetGroup('audienceProfile')">重置</el-button>
            </div>
            <div class="group-content">
              <div class="select-group">
                <el-select
                  v-for="(audience, index) in matchingDegree.audienceProfile"
                  :key="index"
                  v-model="audience.value"
                  :placeholder="audience.placeholder"
                  class="filter-select"
                  clearable
                  filterable
                >
                  <el-option
                    v-for="option in audience.options"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </div>
            </div>
          </div>
        </div>
      </el-collapse-item>

      <!-- 性价比 -->
      <el-collapse-item name="cost" title="性价比">
        <template #title>
          <div class="collapse-title">
            <Icon icon="lucide:trending-up" class="title-icon" />
            <span>性价比</span>
            <el-badge v-if="getFilterCount('cost') > 0" :value="getFilterCount('cost')" class="title-badge" />
          </div>
        </template>
        
        <div class="filter-content">
          <!-- 合作数据 -->
          <div class="filter-group">
            <div class="group-header">
              <span class="group-title">合作数据</span>
              <el-button type="text" size="small" @click="resetGroup('cooperationData')">重置</el-button>
            </div>
            <div class="group-content">
              <div class="select-grid">
                <el-select
                  v-for="(data, index) in costEffectiveness.cooperationData"
                  :key="index"
                  v-model="data.value"
                  :placeholder="data.placeholder"
                  class="filter-select"
                  clearable
                  filterable
                >
                  <el-option
                    v-for="option in data.options"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
              </div>
            </div>
          </div>
        </div>
      </el-collapse-item>

      <!-- 主题推荐 -->
      <el-collapse-item name="theme" title="主题推荐">
        <template #title>
          <div class="collapse-title">
            <Icon icon="lucide:star" class="title-icon" />
            <span>主题推荐</span>
            <el-badge v-if="getFilterCount('theme') > 0" :value="getFilterCount('theme')" class="title-badge" />
          </div>
        </template>
        
        <div class="filter-content">
          <div class="filter-group">
            <div class="group-header">
              <span class="group-title">推荐标签</span>
              <el-button type="text" size="small" @click="resetGroup('themeRecommendations')">重置</el-button>
            </div>
            <div class="group-content">
              <el-checkbox-group v-model="themeRecommendations" class="checkbox-grid">
                <el-checkbox
                  v-for="recommendation in themeRecommendations"
                  :key="recommendation.value"
                  :label="recommendation.value"
                  class="filter-checkbox"
                >
                  {{ recommendation.label }}
                </el-checkbox>
              </el-checkbox-group>
            </div>
          </div>
        </div>
      </el-collapse-item>
    </el-collapse>

    <!-- 操作按钮 -->
    <div class="filter-actions">
      <el-button @click="resetAllFilters">
        <Icon icon="lucide:rotate-ccw" class="mr-1" />
        重置所有
      </el-button>
      <el-button type="primary" @click="applyFilters">
        <Icon icon="lucide:search" class="mr-1" />
        应用筛选
      </el-button>
      <el-button type="success" @click="saveFilterPreset">
        <Icon icon="lucide:bookmark" class="mr-1" />
        保存预设
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { IconifyIcon as Icon } from '@vben/icons'

// Props
interface Props {
  modelValue?: any
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => ({})
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: any]
  'filter-change': [filters: any]
  'apply-filters': [filters: any]
}>()

// 响应式数据
const activeCollapse = ref(['cooperation'])
const filters = reactive({
  cooperationRequest: {
    contentType: {
      value: 'shortVideo',
      other: ''
    },
    industry: {
      value: []
    },
    marketingGoal: {
      value: [],
      audience: '',
      customAudience: ''
    }
  },
  matchingDegree: {
    talentTypes: [],
    talentPersonas: [],
    contentThemes: [],
    backgroundInfo: [],
    audienceProfile: []
  },
  costEffectiveness: {
    cooperationData: []
  },
  themeRecommendations: []
})

// 快速筛选
const quickFilters = ref([
  { key: 'hot', label: '热门标签', icon: 'lucide:flame' },
  { key: 'new', label: '最新标签', icon: 'lucide:sparkles' },
  { key: 'recommended', label: '推荐标签', icon: 'lucide:star' },
  { key: 'verified', label: '认证标签', icon: 'lucide:check-circle' }
])

const activeQuickFilters = ref([])

// 模拟数据（这里应该从API获取）
const cooperationRequest = reactive({
  contentType: {
    options: [
      { value: 'shortVideo', label: '短视频达人' },
      { value: 'customDrama', label: '定制短剧达人' }
    ],
    otherOptions: [
      { value: 'other1', label: '其它题材1' },
      { value: 'other2', label: '其它题材2' }
    ]
  },
  industry: {
    options: [
      { value: 'beauty', label: '美妆' },
      { value: 'fashion', label: '时尚' },
      { value: 'food', label: '美食' },
      { value: 'tech', label: '科技' },
      { value: 'sports', label: '运动' }
    ]
  },
  marketingGoal: {
    options: [
      { value: 'brandExposure', label: '品牌曝光' },
      { value: 'breakCircle', label: '破圈种草' },
      { value: 'actionConversion', label: '行动转化' },
      { value: 'matchingAudience', label: '匹配人群' }
    ],
    audienceOptions: [
      { value: 'audience1', label: '八大人群1' },
      { value: 'audience2', label: '八大人群2' }
    ],
    customAudienceOptions: [
      { value: 'custom1', label: '自定义人群1' },
      { value: 'custom2', label: '自定义人群2' }
    ]
  }
})

const matchingDegree = reactive({
  talentTypes: [
    { value: '', placeholder: '美妆', options: [{ value: 'beauty1', label: '美妆选项1' }] },
    { value: '', placeholder: '时尚', options: [{ value: 'fashion1', label: '时尚选项1' }] },
    { value: '', placeholder: '萌宠', options: [{ value: 'pet1', label: '萌宠选项1' }] },
    { value: '', placeholder: '测评', options: [{ value: 'review1', label: '测评选项1' }] },
    { value: '', placeholder: '游戏', options: [{ value: 'game1', label: '游戏选项1' }] },
    { value: '', placeholder: '二次元', options: [{ value: 'anime1', label: '二次元选项1' }] }
  ],
  talentPersonas: [
    { value: '', placeholder: '美妆', options: [{ value: 'beauty_persona1', label: '美妆人设1' }] },
    { value: '', placeholder: '母婴宠物', options: [{ value: 'parenting_persona1', label: '母婴宠物人设1' }] },
    { value: '', placeholder: '服装配饰', options: [{ value: 'fashion_persona1', label: '服装配饰人设1' }] }
  ],
  contentThemes: [
    { value: '', placeholder: '妆容妆造', options: [{ value: 'makeup1', label: '妆容妆造主题1' }] },
    { value: '', placeholder: '穿搭指南', options: [{ value: 'outfit1', label: '穿搭指南主题1' }] },
    { value: '', placeholder: '亲子育儿', options: [{ value: 'parenting1', label: '亲子育儿主题1' }] }
  ],
  backgroundInfo: [
    { value: '', placeholder: '达人性别', options: [{ value: 'male', label: '男' }, { value: 'female', label: '女' }] },
    { value: '', placeholder: '所在地域', options: [{ value: 'beijing', label: '北京' }, { value: 'shanghai', label: '上海' }] },
    { value: '', placeholder: '学历', options: [{ value: 'bachelor', label: '本科' }, { value: 'master', label: '硕士' }] }
  ],
  checkboxes: [
    { value: 'yellowV', label: '黄V认证', checked: false },
    { value: 'celebrity', label: '明星', checked: false },
    { value: 'agency', label: '是否机构达人', checked: false }
  ],
  audienceProfile: [
    { value: '', placeholder: '连接用户数', options: [{ value: 'users1', label: '用户数选项1' }] },
    { value: '', placeholder: '粉丝数量', options: [{ value: 'followers1', label: '粉丝数选项1' }] },
    { value: '', placeholder: '观众画像', options: [{ value: 'audience1', label: '观众画像选项1' }] }
  ]
})

const costEffectiveness = reactive({
  cooperationData: [
    { value: '', placeholder: '星图指数', options: [{ value: 'index1', label: '指数选项1' }] },
    { value: '', placeholder: '预期播放量', options: [{ value: 'play1', label: '播放量选项1' }] },
    { value: '', placeholder: '预期CPM', options: [{ value: 'cpm1', label: 'CPM选项1' }] },
    { value: '', placeholder: '预期CPE', options: [{ value: 'cpe1', label: 'CPE选项1' }] }
  ]
})

const themeRecommendations = ref([
  { value: 'preferred', label: '优选达人', checked: false },
  { value: 'starProject', label: '星图繁星企划', checked: false },
  { value: 'featured', label: '抖音精选计划达人', checked: false },
  { value: 'discounted', label: '近期降价达人', checked: false },
  { value: 'newFace', label: '新面孔达人', checked: false }
])

// 计算属性
const hasActiveFilters = computed(() => {
  return activeFilters.value.length > 0
})

const activeFilters = computed(() => {
  const chips: any[] = []
  
  // 合作诉求筛选
  if (filters.cooperationRequest.contentType.value) {
    chips.push({
      key: 'contentType',
      label: '题材类型',
      value: cooperationRequest.contentType.options.find(opt => opt.value === filters.cooperationRequest.contentType.value)?.label || filters.cooperationRequest.contentType.value
    })
  }
  
  if (filters.cooperationRequest.industry.value.length > 0) {
    chips.push({
      key: 'industry',
      label: '适配行业',
      value: filters.cooperationRequest.industry.value.join(', ')
    })
  }
  
  if (filters.cooperationRequest.marketingGoal.value.length > 0) {
    chips.push({
      key: 'marketingGoal',
      label: '营销目标',
      value: filters.cooperationRequest.marketingGoal.value.join(', ')
    })
  }
  
  return chips
})

// 方法
const getFilterCount = (category: string) => {
  // 这里应该根据实际筛选条件计算数量
  return 0
}

const isQuickFilterActive = (key: string) => {
  return activeQuickFilters.value.includes(key)
}

const toggleQuickFilter = (key: string) => {
  const index = activeQuickFilters.value.indexOf(key)
  if (index > -1) {
    activeQuickFilters.value.splice(index, 1)
  } else {
    activeQuickFilters.value.push(key)
  }
}

const removeFilter = (key: string) => {
  // 根据key移除对应的筛选条件
  switch (key) {
    case 'contentType':
      filters.cooperationRequest.contentType.value = ''
      break
    case 'industry':
      filters.cooperationRequest.industry.value = []
      break
    case 'marketingGoal':
      filters.cooperationRequest.marketingGoal.value = []
      break
  }
}

const clearAllFilters = () => {
  // 清空所有筛选条件
  filters.cooperationRequest.contentType.value = ''
  filters.cooperationRequest.contentType.other = ''
  filters.cooperationRequest.industry.value = []
  filters.cooperationRequest.marketingGoal.value = []
  filters.cooperationRequest.marketingGoal.audience = ''
  filters.cooperationRequest.marketingGoal.customAudience = ''
  
  // 清空匹配度
  matchingDegree.talentTypes.forEach(type => type.value = '')
  matchingDegree.talentPersonas.forEach(persona => persona.value = '')
  matchingDegree.contentThemes.forEach(theme => theme.value = '')
  matchingDegree.backgroundInfo.forEach(info => info.value = '')
  matchingDegree.backgroundInfo.checkboxes.forEach(checkbox => checkbox.checked = false)
  matchingDegree.audienceProfile.forEach(audience => audience.value = '')
  
  // 清空性价比
  costEffectiveness.cooperationData.forEach(data => data.value = '')
  
  // 清空主题推荐
  themeRecommendations.value.forEach(rec => rec.checked = false)
  
  activeQuickFilters.value = []
  
  ElMessage.success('已清空所有筛选条件')
}

const resetGroup = (groupName: string) => {
  // 重置特定组的筛选条件
  ElMessage.info(`重置${groupName}筛选条件`)
}

const resetAllFilters = () => {
  clearAllFilters()
}

const applyFilters = () => {
  const allFilters = {
    cooperationRequest: filters.cooperationRequest,
    matchingDegree,
    costEffectiveness,
    themeRecommendations: themeRecommendations.value.filter(r => r.checked),
    quickFilters: activeQuickFilters.value
  }
  
  emit('apply-filters', allFilters)
  ElMessage.success('筛选条件已应用')
}

const saveFilterPreset = () => {
  ElMessage.info('保存预设功能开发中')
}

// 监听筛选条件变化
watch(filters, (newFilters) => {
  emit('update:modelValue', newFilters)
  emit('filter-change', newFilters)
}, { deep: true })
</script>

<style scoped>
.tag-filter-component {
  background: var(--el-bg-color);
  border-radius: 12px;
  padding: 20px;
  box-shadow: var(--el-box-shadow-light);
}

/* 筛选条件展示 */
.filter-summary {
  margin-bottom: 20px;
  padding: 16px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
}

.summary-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.summary-icon {
  margin-right: 8px;
  color: var(--el-color-primary);
}

.summary-title {
  font-weight: 600;
  color: var(--el-text-color-primary);
  flex: 1;
}

.summary-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-tag {
  border-radius: 6px;
}

/* 快速筛选 */
.quick-filters {
  margin-bottom: 20px;
}

.quick-filter-group {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.group-label {
  font-weight: 600;
  color: var(--el-text-color-regular);
}

/* 折叠面板 */
.filter-collapse {
  margin-bottom: 20px;
}

.collapse-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  color: var(--el-color-primary);
}

.title-badge {
  margin-left: auto;
}

/* 筛选内容 */
.filter-content {
  padding: 16px 0;
}

.filter-group {
  margin-bottom: 24px;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.group-title {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.group-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 选择器网格 */
.select-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.select-group {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-select {
  min-width: 150px;
}

.filter-select :deep(.el-input__wrapper) {
  border-radius: 6px;
}

/* 单选按钮组 */
.radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.radio-group :deep(.el-radio-button__inner) {
  border-radius: 6px;
  border: 1px solid var(--el-border-color);
  transition: all 0.3s ease;
}

.radio-group :deep(.el-radio-button__inner:hover) {
  border-color: var(--el-color-primary);
}

.radio-group :deep(.el-radio-button.is-active .el-radio-button__inner) {
  background: var(--el-color-primary);
  border-color: var(--el-color-primary);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

/* 复选框组 */
.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.checkbox-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.filter-checkbox {
  margin-right: 0;
}

.filter-checkbox :deep(.el-checkbox__label) {
  font-weight: 500;
  color: var(--el-text-color-regular);
}

/* 操作按钮 */
.filter-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.filter-actions .el-button {
  border-radius: 6px;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .tag-filter-component {
    padding: 16px;
  }
  
  .select-grid {
    grid-template-columns: 1fr;
  }
  
  .select-group {
    flex-direction: column;
  }
  
  .filter-actions {
    flex-direction: column;
  }
  
  .quick-filter-group {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
