<template>
  <div class="filter-row">
    <span class="filter-label">达人类型</span>
    <div class="filter-buttons">
      <el-button 
        v-for="option in tierOptions"
        :key="option.value"
        :type="modelValue === option.value ? 'primary' : ''"
        size="default"
        @click="$emit('update:modelValue', option.value)"
      >
        {{ option.label }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
const tierOptions = [
  { label: '不限', value: '' },
  { label: '顶流(100万+)', value: 'mega' },
  { label: '头部(10-100万)', value: 'macro' },
  { label: '腰部(1-10万)', value: 'micro' },
  { label: '新星(1万以下)', value: 'nano' },
]

defineProps<{
  modelValue: string
}>()

defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()
</script>

<style scoped>
.filter-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 12px 0;
}

.filter-label {
  min-width: 80px;
  font-weight: 500;
  line-height: 32px;
  color: #606266;
}

.filter-buttons {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
