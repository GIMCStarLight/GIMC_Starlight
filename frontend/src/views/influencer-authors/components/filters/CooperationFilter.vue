<template>
  <div class="filter-row">
    <span class="filter-label">合作诉求</span>
    <div class="filter-buttons">
      <el-button 
        v-for="option in cooperationOptions"
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
const cooperationOptions = [
  { label: '不限', value: '' },
  { label: '短视频达人', value: 'short_video' },
  { label: '电商带货', value: 'ecommerce' },
  { label: '品牌曝光', value: 'brand' },
  { label: '内容定制', value: 'content' },
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
