<template>
  <el-card shadow="never" class="single-card">
    <div class="price-info-item">
      <span class="price-info-label">{{ label }}</span>
      <div class="price-info-value">
        <span v-if="$slots.default" class="price-amount">
          <slot />
        </span>
        <span v-else class="price-amount">
          <span class="price-number">{{ displayValue }}</span>
          <span v-if="unit" class="price-unit">{{ unit }}</span>
        </span>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  label: string           
  value?: string | number  
  unit?: string        
}

const props = withDefaults(defineProps<Props>(), {
  value: '-',
  unit: ''
})


const displayValue = computed(() => {
  if (props.value === null || props.value === undefined || props.value === '') {
    return '-'
  }

  if (typeof props.value === 'number') {
    return props.value.toLocaleString('zh-CN')
  }

  return String(props.value)
})
</script>

<style scoped lang="scss">
.single-card {
  margin-bottom: 6px;
  border-radius: 8px;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
}

.price-info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  transition: all 0.3s ease;
  cursor: default;

  &:hover {
    background-color: #f8f9fa;
    border-radius: 4px;
  }
}

.price-info-label {
  color: #909399;
  font-size: 13px;
  font-weight: 500;
}

.price-info-value {
  display: flex;
  align-items: center;
}

.price-amount {
  font-size: 18px;
  font-weight: 400;
  color: #409eff;
  display: flex;
  align-items: baseline;
}

.price-amount .price-number {
  margin-left: 2px;
}

.price-unit {
  font-size: 13px;
  color: #909399;
  font-weight: normal;
  margin-left: 4px;
}


:deep(.el-card__body) {
  padding: 16px;
}
</style>