<template>
  <el-popover
    v-model:visible="popoverVisible"
    placement="bottom"
    :width="popoverWidth"
    trigger="hover"
    :persistent="true"
    :show-arrow="false"
    ref="popoverRef"
    popper-class="picker-input-popper"
  >
    <template #reference>
      <div 
        class="picker-input-trigger" 
        :class="{ 'is-active': modelValue !== undefined }"
        @wheel.prevent="handleTriggerWheel" >
        <span>{{ displayLabel }}</span>
        <IconifyIcon icon="lucide:chevrons-up-down" class="trigger-icon" />
      </div>
    </template>
    
    <template #default>
      <WheelPicker
        v-model="internalValue"
        :options="options"
        :item-height="30" :visible-items="5"
        @change="handlePickerChange"
      />
    </template>
  </el-popover>
</template>

<script setup lang="ts">
import { ref, computed, type PropType } from 'vue'
import WheelPicker from './WheelPicker.vue'
import { IconifyIcon } from '@vben/icons'

interface Option {
  label: string;
  value: number | string | undefined;
}

const props = defineProps({
  modelValue: {
    type: [Number, String] as PropType<number | string | undefined>,
    default: undefined
  },
  options: {
    type: Array as PropType<Option[]>,
    required: true
  },
  placeholder: {
    type: String,
    default: '请选择'
  },
  popoverWidth: {
    type: Number,
    default: 180 }
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number | string | undefined): void;
}>()

const popoverRef = ref<any>(null) // Popover 实例
const popoverVisible = ref(false) // 控制 popover 显示状态

// 显示在输入框上的标签
const displayLabel = computed(() => {
  const selected = props.options.find(opt => opt.value === props.modelValue)
  return selected ? selected.label : props.placeholder
})

// 代理 v-model，用于 WheelPicker
const internalValue = computed({
  get: () => props.modelValue,
  set: (val) => {
    emit('update:modelValue', val)
  }
})

// 当滚轮值变化时，不关闭浮层 (因为是 hover)
const handlePickerChange = (val: number | string | undefined) => {
  emit('update:modelValue', val)
  // 悬停模式下不主动关闭
}

// 关键：在触发器上滚动滚轮时，手动打开浮层
const handleTriggerWheel = (event: WheelEvent) => {
  // 如果浮层未打开，则打开它
  if (!popoverVisible.value) {
    popoverVisible.value = true
  }
  // 注意：WheelPicker 内部自己会处理 wheel 事件，这里只是负责"激活"
  
  // 优化：直接在这里处理滚动逻辑，即使浮层未打开
  if (!popoverVisible.value) {
     // 找到当前索引
     let currentIndex = props.options.findIndex(opt => opt.value === props.modelValue);
     if (currentIndex === -1) {
       currentIndex = props.options.findIndex(opt => opt.value !== undefined); // 找到第一个非 "不限"
       if (currentIndex === -1) currentIndex = 0;
     }

     // 根据滚轮方向计算下一个索引
     let nextIndex = currentIndex;
     if (event.deltaY > 0) { // 向下滚动
       nextIndex = Math.min(props.options.length - 1, currentIndex + 1);
     } else { // 向上滚动
       nextIndex = Math.max(0, currentIndex - 1);
     }

     if (nextIndex !== currentIndex) {
       emit('update:modelValue', props.options[nextIndex].value);
     }
  }
}

</script>

<style scoped lang="scss">
.picker-input-trigger {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: auto;  // 改为auto，根据内容自动调整
  min-width: 80px;  // 最小宽度保证基本可操作
  max-width: 100%;  // 最大不超过父容器
  height: 32px;
  padding: 0 11px;
  background: #ffffff;  // 改为纯白色背景
  border: 1px solid #d1d5db;  // 增强边框对比度
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 13px;
  color: #9ca3af; // Placeholder color
  
  span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  &.is-active {
    color: #111827;  // 加深选中文字颜色
    border-color: #409eff;  // 选中后显示蓝色边框
    background: #f0f9ff;  // 选中后淡蓝色背景
  }
  
  &:hover {
    border-color: #409eff; // 悬停时高亮
    box-shadow: 0 0 0 1px rgba(64, 158, 255, 0.2);  // 添加微妙阴影
  }
  
  .trigger-icon {
    font-size: 14px;
    color: #9ca3af;
    flex-shrink: 0;
    margin-left: 4px;
    transition: color 0.2s;
  }
  
  &.is-active .trigger-icon {
    color: #409eff;  // 选中后图标也变蓝色
  }
}
</style>

<style lang="scss">
/* 浮层样式 */
.picker-input-popper {
  padding: 6px !important; // 更紧凑的 padding
  background: #ffffff !important;
  border: 1px solid #e5e7eb !important;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1) !important;
  border-radius: 8px !important;
}
</style>