<template>
  <div class="filter-row">
    <span class="filter-label">核心指标</span>
    <div class="filter-content advanced-grid">
      <div class="advanced-item">
        <span class="advanced-label">粉丝规模</span>
        <DiscreteRangePicker
          :model-value="modelValue.followerRange"
          :options="FOLLOWER_OPTIONS"
          @update:model-value="updateRange('followerRange', $event)"
        />
      </div>
      <div class="advanced-item">
        <span class="advanced-label">报价区间</span>
        <DiscreteRangePicker
          :model-value="modelValue.priceRange"
          :options="PRICE_OPTIONS"
          @update:model-value="updateRange('priceRange', $event)"
        />
      </div>
      <div class="advanced-item">
        <span class="advanced-label">30日GMV</span>
        <DiscreteRangePicker
          :model-value="modelValue.gmvRange"
          :options="GMV_OPTIONS"
          @update:model-value="updateRange('gmvRange', $event)"
        />
      </div>
      <div class="advanced-item">
        <span class="advanced-label">预期播放量</span>
        <DiscreteRangePicker
          :model-value="modelValue.expectedPlayRange"
          :options="EXPECTED_PLAY_OPTIONS"
          @update:model-value="updateRange('expectedPlayRange', $event)"
        />
      </div>
      <div class="advanced-item">
        <span class="advanced-label">预期CPM</span>
        <DiscreteRangePicker
          :model-value="modelValue.expectedCpmRange"
          :options="EXPECTED_CPM_OPTIONS"
          @update:model-value="updateRange('expectedCpmRange', $event)"
        />
      </div>
      <div class="advanced-item">
        <span class="advanced-label">预期CPE</span>
        <DiscreteRangePicker
          :model-value="modelValue.expectedCpeRange"
          :options="EXPECTED_CPE_OPTIONS"
          @update:model-value="updateRange('expectedCpeRange', $event)"
        />
      </div>
      <div class="advanced-item">
        <span class="advanced-label">爆文率</span>
        <DiscreteRangePicker
          :model-value="modelValue.burstRateRange"
          :options="BURST_RATE_OPTIONS"
          @update:model-value="updateRange('burstRateRange', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import DiscreteRangePicker from '../../DiscreteRangePicker.vue'
import { 
  FOLLOWER_OPTIONS, 
  PRICE_OPTIONS, 
  GMV_OPTIONS,
  EXPECTED_PLAY_OPTIONS,
  EXPECTED_CPM_OPTIONS,
  EXPECTED_CPE_OPTIONS,
  BURST_RATE_OPTIONS
} from '../../../constants/filter-options'

export interface CoreMetricsData {
  followerRange: [number | undefined, number | undefined]
  priceRange: [number | undefined, number | undefined]
  gmvRange: [number | undefined, number | undefined]
  expectedPlayRange: [number | undefined, number | undefined]
  expectedCpmRange: [number | undefined, number | undefined]
  expectedCpeRange: [number | undefined, number | undefined]
  burstRateRange: [number | undefined, number | undefined]
}

defineProps<{
  modelValue: CoreMetricsData
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: CoreMetricsData): void
  (e: 'change'): void
}>()

const updateRange = (key: keyof CoreMetricsData, value: [number | undefined, number | undefined]) => {
  emit('update:modelValue', { 
    ...defineProps<{ modelValue: CoreMetricsData }>().modelValue, 
    [key]: value 
  })
  emit('change')
}
</script>

<style scoped lang="scss">
.filter-row {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.filter-label {
  min-width: 80px;
  font-weight: 500;
  color: #606266;
  padding-top: 8px;
}

.filter-content {
  flex: 1;
}

.advanced-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.advanced-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.advanced-label {
  font-size: 13px;
  color: #909399;
}
</style>
