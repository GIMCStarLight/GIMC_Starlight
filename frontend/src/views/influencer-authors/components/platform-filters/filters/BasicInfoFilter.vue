<template>
  <div class="filter-row basic-info-row">
    <span class="filter-label">基础筛选</span>
    <div class="filter-content basic-info-grid">
      <div class="basic-item">
        <el-input 
          :model-value="modelValue.keyword"
          @update:model-value="handleUpdate('keyword', $event)"
          placeholder="搜索昵称或ID" 
          clearable 
          size="default"
        >
          <template #prefix><Icon icon="lucide:search" /></template>
        </el-input>
      </div>
      <div class="basic-item">
        <el-input 
          :model-value="modelValue.province"
          @update:model-value="handleUpdate('province', $event)"
          placeholder="省份(如: 北京)" 
          clearable 
          size="default"
        >
          <template #prefix><Icon icon="lucide:map-pin" /></template>
        </el-input>
      </div>
      <div class="basic-item">
        <el-input 
          :model-value="modelValue.city"
          @update:model-value="handleUpdate('city', $event)"
          placeholder="城市(如: 北京市)" 
          clearable 
          size="default"
        >
          <template #prefix><Icon icon="lucide:map" /></template>
        </el-input>
      </div>
      <div class="basic-item">
        <el-radio-group 
          :model-value="modelValue.gender" 
          @update:model-value="handleUpdate('gender', $event)"
          size="default"
        >
          <el-radio-button :value="undefined">不限性别</el-radio-button>
          <el-radio-button value="M">男</el-radio-button>
          <el-radio-button value="F">女</el-radio-button>
        </el-radio-group>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IconifyIcon as Icon } from '@vben/icons'

interface BasicInfo {
  keyword?: string
  province?: string
  city?: string
  gender?: 'M' | 'F' | undefined
}

const props = defineProps<{
  modelValue: BasicInfo
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: BasicInfo): void
}>()

const handleUpdate = (key: keyof BasicInfo, value: any) => {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>

<style scoped lang="scss">
.filter-row {
  margin-bottom: 16px;
}

.filter-label {
  min-width: 80px;
  font-weight: 500;
  color: #606266;
  margin-right: 16px;
}

.basic-info-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.basic-info-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.basic-item {
  min-width: 0;
}

@media (max-width: 1400px) {
  .basic-info-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
