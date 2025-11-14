<template>
  <div class="discrete-range-picker">
    <PickerInput
      v-model="minValue"
      :options="filteredMinOptions"
      :placeholder="minPlaceholder"
    />

    <span class="separator">{{ separator }}</span>

    <PickerInput
      v-model="maxValue"
      :options="filteredMaxOptions"
      :placeholder="maxPlaceholder"
    />
  </div>
</template>

<script setup lang="ts">
// ... (脚本与 18:03 版本的完全相同，无需改动) ...
import { computed, type PropType } from 'vue'
import PickerInput from './PickerInput.vue'
interface RangeOption {
  label: string
  value: number | string | undefined;
}
type RangeValue = [number | string | undefined, number | string | undefined]
const props = defineProps({
  modelValue: {
    type: Object as PropType<RangeValue>,
    required: true,
    default: () => [undefined, undefined] as RangeValue
  },
  options: {
    type: Array as PropType<RangeOption[]>,
    required: true
  },
  minPlaceholder: {
    type: String,
    default: '最低'
  },
  maxPlaceholder: {
    type: String,
    default: '最高'
  },
  separator: {
    type: String,
    default: '—'
  },
  smartFilter: {
    type: Boolean,
    default: true
  }
})
const emit = defineEmits<{
  (e: 'update:modelValue', value: [number | string | undefined, number | string | undefined]): void
}>()
const filteredMinOptions = computed(() => {
  if (!props.smartFilter || props.modelValue[1] === undefined) {
    return props.options
  }
  const maxVal = props.modelValue[1]
  return props.options.filter(opt => opt.value === undefined || opt.value <= maxVal)
})
const filteredMaxOptions = computed(() => {
  if (!props.smartFilter || props.modelValue[0] === undefined) {
    return props.options
  }
  const minVal = props.modelValue[0]
  return props.options.filter(opt => opt.value === undefined || opt.value >= minVal)
})
const minValue = computed({
  get: () => props.modelValue[0],
  set: (val) => {
    const currentMax = props.modelValue[1]
    if (currentMax !== undefined && val !== undefined && val > currentMax) {
      emit('update:modelValue', [val, val])
    } else {
      emit('update:modelValue', [val, currentMax])
    }
  }
})
const maxValue = computed({
  get: () => props.modelValue[1],
  set: (val) => {
    const currentMin = props.modelValue[0]
    if (currentMin !== undefined && val !== undefined && val < currentMin) {
      emit('update:modelValue', [val, val])
    } else {
      emit('update:modelValue', [currentMin, val])
    }
  }
})
</script>

<style scoped lang="scss">
.discrete-range-picker {
  display: flex;
  align-items: center;
  gap: 4px;  // 缩小网格内间距
  flex: 1;  // 让组件占满剩余空间
  min-width: 0;  // 防止flex子元素溢出
  width: auto;  // 根据内容自动调整

  :deep(.el-popover) {
    flex: 0 1 auto;  // 不扩张，根据内容调整
    min-width: 0;
  }

  .separator {
    color: #6b7280;  // 加深分隔符颜色
    font-size: 14px;
    font-weight: 400;  // 稍微加重
    user-select: none;
    flex-shrink: 0;  // 防止分隔符被压缩
    margin: 0 2px;  // 两侧一点间距
  }
}
</style>