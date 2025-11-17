<template>
  <div class="filter-row">
    <span class="filter-label">场景推荐</span>
    <div class="filter-buttons">
      <el-button
        v-for="scenario in scenarios"
        :key="scenario.key"
        :type="modelValue === scenario.key ? 'primary' : ''"
        size="default"
        @click="handleScenarioClick(scenario)"
      >
        <Icon :icon="scenario.icon" />
        {{ scenario.label }}
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IconifyIcon as Icon } from '@vben/icons'
import { SCENARIO_OPTIONS } from '../douyin-config'

const scenarios = SCENARIO_OPTIONS

defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'apply-scenario', scenario: typeof SCENARIO_OPTIONS[number]): void
}>()

const handleScenarioClick = (scenario: typeof SCENARIO_OPTIONS[number]) => {
  emit('update:modelValue', scenario.key)
  emit('apply-scenario', scenario)
}
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
  
  :deep(.el-button) {
    .iconify {
      margin-right: 4px;
    }
  }
}
</style>
