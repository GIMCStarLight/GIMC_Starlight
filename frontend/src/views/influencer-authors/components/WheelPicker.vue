<template>
  <div class="wheel-picker-container" :style="{ '--picker-height': itemHeight * visibleItems + 'px' }">
    <div class="wheel-picker" ref="pickerRef" @wheel.prevent="handleWheel">
      <div 
        class="picker-item-wrapper" 
        :style="{ 
          transform: `translateY(${offsetY}px)`, 
          transition: isScrolling ? 'none' : 'transform 0.2s ease-out' 
        }"
        @mousedown="startDrag"
      >
        <div 
          v-for="(item, index) in internalOptions" 
          :key="item.value + '_' + index" 
          class="picker-item"
          :style="{ height: itemHeight + 'px', lineHeight: itemHeight + 'px' }"
          :class="{ 'is-selected': internalSelectedIndex === index }"
        >
          {{ item.label }}
        </div>
      </div>
    </div>
    <div class="picker-overlay"></div>
    <div class="picker-selection-bar" :style="{ height: itemHeight + 'px', top: itemHeight * Math.floor(visibleItems / 2) + 'px' }"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

interface Option {
  label: string;
import { log } from '#/utils/logger';
  value: number | string | undefined;
}

const props = defineProps({
  modelValue: {
    type: [Number, String, undefined],
    default: undefined
  },
  options: {
    type: Array as () => Option[],
    required: true
  },
  itemHeight: { // 优化：更小的行高
    type: Number,
    default: 30
  },
  visibleItems: {
    type: Number,
    default: 5,
    validator: (val: number) => val % 2 === 1 && val >= 3
  }
})

// ... (脚本与 18:03 版本的完全相同) ...
const emit = defineEmits<{
  (e: 'update:modelValue', value: number | string | undefined): void;
  (e: 'change', value: number | string | undefined): void;
}>()
const pickerRef = ref<HTMLElement | null>(null)
const internalOptions = ref<Option[]>([])
const internalSelectedIndex = ref(0)
const offsetY = ref(0) 
const isScrolling = ref(false)
const centerItemIndex = computed(() => Math.floor(props.visibleItems / 2))
const isDragging = ref(false)
const startY = ref(0)
const startOffsetY = ref(0)
const velocity = ref(0)
let animationFrame: number | null = null;
let lastMoveTime = 0;
const minOffsetY = computed(() => - (internalOptions.value.length - centerItemIndex.value - 1) * props.itemHeight)
const maxOffsetY = computed(() => centerItemIndex.value * props.itemHeight)
onMounted(() => {
  if (props.visibleItems % 2 === 0) {
    log.warn('WheelPicker: visibleItems should be an odd number to center the selection.')
  }
  updateInternalOptions();
  updateSelectedIndex(props.modelValue)
  snapToSelection()
})
watch(() => props.modelValue, (newValue) => {
  updateSelectedIndex(newValue)
  snapToSelection()
})
watch(() => props.options, () => {
  updateInternalOptions();
  updateSelectedIndex(props.modelValue);
  snapToSelection();
}, { deep: true });
const updateInternalOptions = () => {
  const placeholderItem: Option = { label: '', value: 'placeholder' };
  internalOptions.value = [
    ...Array(centerItemIndex.value).fill(placeholderItem),
    ...props.options,
    ...Array(centerItemIndex.value).fill(placeholderItem),
  ];
}
const updateSelectedIndex = (value: number | string | undefined) => {
  let index = -1;
  if (value === undefined) {
    index = internalOptions.value.findIndex(item => item.value === undefined);
  } else {
    index = internalOptions.value.findIndex(item => item.value === value);
  }
  if (index !== -1) {
    internalSelectedIndex.value = index;
  } else {
    const firstOptionIndex = internalOptions.value.findIndex(item => item.value !== 'placeholder');
    internalSelectedIndex.value = firstOptionIndex >= 0 ? firstOptionIndex : centerItemIndex.value;
  }
}
const handleWheel = (event: WheelEvent) => {
  event.preventDefault();
  if (isDragging.value) return;
  isScrolling.value = true;
  let newIndex = internalSelectedIndex.value;
  const findNextValidIndex = (startIndex: number, direction: number) => {
    let next = startIndex + direction;
    while(next >= 0 && next < internalOptions.value.length) {
      if (internalOptions.value[next] && internalOptions.value[next].value !== 'placeholder') {
        return next;
      }
      if (direction > 0 && next >= (internalOptions.value.length - centerItemIndex.value - 1)) break;
      if (direction < 0 && next <= centerItemIndex.value) break;
      next += direction;
    }
    return startIndex;
  }
  if (event.deltaY > 0) {
    newIndex = findNextValidIndex(newIndex, 1);
  } else {
    newIndex = findNextValidIndex(newIndex, -1);
  }
  newIndex = Math.max(centerItemIndex.value, newIndex);
  newIndex = Math.min(internalOptions.value.length - centerItemIndex.value - 1, newIndex);
  if (newIndex !== internalSelectedIndex.value) {
    internalSelectedIndex.value = newIndex;
    snapToSelection();
    emitValue();
  }
};
const startDrag = (event: MouseEvent) => {
  isDragging.value = true;
  startY.value = event.clientY;
  startOffsetY.value = offsetY.value;
  isScrolling.value = true;
  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', onDragEnd);
  lastMoveTime = Date.now();
  if (animationFrame) cancelAnimationFrame(animationFrame);
};
const onDragMove = (event: MouseEvent) => {
  if (!isDragging.value) return;
  const deltaY = event.clientY - startY.value;
  let newOffsetY = startOffsetY.value + deltaY;
  newOffsetY = Math.max(minOffsetY.value - props.itemHeight, newOffsetY);
  newOffsetY = Math.min(maxOffsetY.value + props.itemHeight, newOffsetY);
  offsetY.value = newOffsetY;
  const currentTime = Date.now();
  if (currentTime - lastMoveTime > 50) {
    velocity.value = (deltaY / (currentTime - lastMoveTime)) * 1000;
    lastMoveTime = currentTime;
    startY.value = event.clientY;
    startOffsetY.value = offsetY.value;
  }
};
const onDragEnd = () => {
  if (!isDragging.value) return;
  isDragging.value = false;
  document.removeEventListener('mousemove', onDragMove);
  document.removeEventListener('mouseup', onDragEnd);
  if (Math.abs(velocity.value) > 50) {
    startInertiaScroll();
  } else {
    snapToNearest();
  }
  velocity.value = 0;
};
const startInertiaScroll = () => {
  let friction = 0.95;
  const animate = () => {
    velocity.value *= friction;
    offsetY.value += velocity.value / 60;
    if (offsetY.value < minOffsetY.value || offsetY.value > maxOffsetY.value) {
      velocity.value *= 0.8;
    }
    if (Math.abs(velocity.value) > 1) {
      animationFrame = requestAnimationFrame(animate);
    } else {
      snapToNearest();
    }
  };
  animationFrame = requestAnimationFrame(animate);
};
const snapToNearest = () => {
  isScrolling.value = false;
  let targetIndex = Math.round((offsetY.value - centerItemIndex.value * props.itemHeight) / -props.itemHeight);
  targetIndex = Math.max(centerItemIndex.value, targetIndex);
  targetIndex = Math.min(internalOptions.value.length - centerItemIndex.value - 1, targetIndex);
  internalSelectedIndex.value = targetIndex;
  snapToSelection();
  emitValue();
};
const snapToSelection = () => {
  isScrolling.value = false;
  offsetY.value = centerItemIndex.value * props.itemHeight - internalSelectedIndex.value * props.itemHeight;
}
const emitValue = () => {
  const selectedOption = internalOptions.value[internalSelectedIndex.value];
  if (selectedOption && selectedOption.value !== 'placeholder') {
    emit('update:modelValue', selectedOption.value);
    emit('change', selectedOption.value);
  } else {
    const firstOptionIndex = internalOptions.value.findIndex(item => item.value !== 'placeholder');
    internalSelectedIndex.value = firstOptionIndex >= 0 ? firstOptionIndex : centerItemIndex.value;
    snapToSelection();
    emit('update:modelValue', internalOptions.value[internalSelectedIndex.value].value);
    emit('change', internalOptions.value[internalSelectedIndex.value].value);
  }
}
onUnmounted(() => {
  if (animationFrame) cancelAnimationFrame(animationFrame);
  document.removeEventListener('mousemove', onDragMove);
  document.removeEventListener('mouseup', onDragEnd);
});
defineExpose({
  setValue: (value: number | string | undefined) => {
    updateSelectedIndex(value);
    snapToSelection();
  }
});
</script>

<style scoped lang="scss">
.wheel-picker-container {
  position: relative;
  overflow: hidden;
  height: var(--picker-height);
  width: 100%;
  text-align: center;
  user-select: none;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
  background: #ffffff;
  
  mask-image: linear-gradient(
    to bottom,
    transparent,
    black 20%,
    black 80%,
    transparent
  );
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent,
    black 20%,
    black 80%,
    transparent
  );
}
.wheel-picker {
  position: relative;
  height: 100%;
  width: 100%;
  cursor: grab;
  &:active {
    cursor: grabbing;
  }
}
.picker-item-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
}
.picker-item {
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 13px; // 优化：字体更小
  color: #9ca3af;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
  transition: all 0.15s ease;
  
  &.is-selected {
    font-size: 14px; // 优化：选中字体也更小
    font-weight: 600;
    color: #1f2937;
    transform: scale(1.0); // 移除缩放，更紧凑
  }
}
.picker-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.9) 0%,
    rgba(255, 255, 255, 0.2) 30%,
    rgba(255, 255, 255, 0) 50%,
    rgba(255, 255, 255, 0.2) 70%,
    rgba(255, 255, 255, 0.9) 100%
  );
}
.picker-selection-bar {
  position: absolute;
  left: 0;
  width: 100%;
  box-sizing: border-box;
  background: rgba(64, 158, 255, 0.05);
  border-top: 1px solid #e0e7ff;
  border-bottom: 1px solid #e0e7ff;
  pointer-events: none;
}
</style>