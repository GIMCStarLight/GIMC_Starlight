<template>
  <el-card class="search-card" shadow="never">
    <div class="search-header">
      <el-icon class="search-icon"><Filter /></el-icon>
      <span class="search-title">筛选条件</span>
    </div>
    <el-form :model="formData" label-width="80px">
      <el-row :gutter="16">
        <el-col :xs="24" :sm="12" :md="8" :lg="6">
          <el-form-item label="达人 ID">
            <el-input
              v-model="formData.authorId"
              placeholder="请输入达人 ID"
              clearable
              prefix-icon="Search"
              @input="handleInput"
            />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12" :md="8" :lg="6">
          <el-form-item label="评价人">
            <el-input
              v-model="formData.reviewer"
              placeholder="请输入评价人"
              clearable
              prefix-icon="User"
              @input="handleInput"
            />
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12" :md="8" :lg="6">
          <el-form-item label="评分范围">
            <el-select
              v-model="formData.scoreRange"
              placeholder="请选择评分"
              clearable
              @change="handleInput"
            >
              <el-option label="⭐ 1分" value="1-1" />
              <el-option label="⭐⭐ 2分" value="2-2" />
              <el-option label="⭐⭐⭐ 3分" value="3-3" />
              <el-option label="⭐⭐⭐⭐ 4分" value="4-4" />
              <el-option label="⭐⭐⭐⭐⭐ 5分" value="5-5" />
              <el-option label="低分 (1-2分)" value="1-2" />
              <el-option label="中等 (3分)" value="3-3" />
              <el-option label="高分 (4-5分)" value="4-5" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :xs="24" :sm="12" :md="8" :lg="6">
          <el-form-item label="时间范围">
            <el-date-picker
              v-model="formData.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              style="width: 100%"
              :shortcuts="dateShortcuts"
              @change="handleInput"
            />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row>
        <el-col :span="24" class="search-actions">
          <el-button type="primary" @click="handleSearch" :loading="loading">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
          <div class="search-stats">
            <el-tag v-if="(total ?? 0) > 0" type="info" size="large">
              找到 <strong>{{ total }}</strong> 条评价
            </el-tag>
          </div>
        </el-col>
      </el-row>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue'
import { Filter, Search, Refresh } from '@element-plus/icons-vue'

interface SearchForm {
  authorId?: string
  reviewer?: string
  scoreRange?: string
  dateRange?: [Date, Date] | null
}

defineOptions({
  name: 'ReviewSearchForm',
})

const props = defineProps<{
  modelValue: SearchForm
  loading?: boolean
  total?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: SearchForm]
  'search': []
  'reset': []
}>()

const formData = reactive<SearchForm>({ ...props.modelValue })

// 日期快捷选项
const dateShortcuts = [
  {
    text: '最近一周',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 7)
      return [start, end]
    },
  },
  {
    text: '最近一个月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 30)
      return [start, end]
    },
  },
  {
    text: '最近三个月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 90)
      return [start, end]
    },
  },
]

const handleInput = () => {
  emit('update:modelValue', { ...formData })
}

const handleSearch = () => {
  emit('search')
}

const handleReset = () => {
  Object.assign(formData, {
    authorId: undefined,
    reviewer: undefined,
    scoreRange: undefined,
    dateRange: null,
  })
  emit('update:modelValue', { ...formData })
  emit('reset')
}

// 监听外部变化
watch(() => props.modelValue, (newVal) => {
  Object.assign(formData, newVal)
}, { deep: true })
</script>

<style scoped lang="scss">
.search-card {
  margin-bottom: 16px;
  border-radius: 8px;

  :deep(.el-card__body) {
    padding: 20px;
  }
}

.search-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.search-icon {
  font-size: 20px;
  color: #3b82f6;
}

.search-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 8px;

  .search-stats {
    margin-left: auto;

    strong {
      color: #3b82f6;
      font-size: 16px;
    }
  }
}

:deep(.el-form-item) {
  margin-bottom: 16px;
}

:deep(.el-button) {
  min-width: 100px;
}
</style>
