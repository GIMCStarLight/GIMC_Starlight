<template>
  <div class="filter-row">
    <span class="filter-label">合作诉求</span>
    <div class="filter-buttons">
      <el-button
        v-for="item in cooperationTypes"
        :key="item.value"
        :type="modelValue === item.value ? 'primary' : ''"
        size="default"
        @click="emit('update:modelValue', item.value)"
      >
        {{ item.label }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { COOPERATION_TYPES } from '../douyin-config'

const cooperationTypes = COOPERATION_TYPES

defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()
</script>

<style scoped lang="scss">
.filter-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.filter-label {
  min-width: 80px;
  font-weight: 500;
  color: #606266;
}

.filter-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
