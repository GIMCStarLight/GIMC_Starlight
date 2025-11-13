<template>
  <div class="single-wheel-picker">
    <WheelPicker
      v-model="internalValue"
      :options="options"
      :item-height="32"  
      :visible-items="3"
      @change="handleChange"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue'
import WheelPicker from './WheelPicker.vue'

interface Option {
  label: string
  value: number | string
}

const props = defineProps({
  modelValue: {
    type: [Number, String],
    default: undefined
  },
  options: {
    type: Array as PropType<Option[]>,
    required: true
  },
  label: { // 这个 label 属性现在没用了，因为我们用了 el-form-item 的 label
    type: String,
    default: '选择'
  }
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | string | undefined): void
  (e: 'change', value: number | string | undefined): void
}>()

const internalValue = computed({
  get: () => props.modelValue,
  set: (val) => {
    emit('update:modelValue', val)
  }
})

const handleChange = (val: number | string | undefined) => {
  emit('change', val)
}
</script>

<style scoped lang="scss">
.single-wheel-picker {
  width: 100%;
}
</style>