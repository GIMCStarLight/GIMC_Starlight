<template>
  <img
    ref="imageRef"
    :class="[
      'lazy-image',
      {
        'lazy-loading': isLoading,
        'lazy-loaded': isLoaded,
        'lazy-error': hasError
      }
    ]"
    :alt="alt"
    @load="handleLoad"
    @error="handleError"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

interface Props {
  /** 图片地址 */
  src: string
  /** Alt 文本 */
  alt?: string
  /** 占位图 */
  placeholder?: string
  /** 错误图 */
  errorImage?: string
  /** 预加载距离 */
  rootMargin?: string
}

const props = withDefaults(defineProps<Props>(), {
  alt: '',
  placeholder: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2YwZjBmMCIvPjwvc3ZnPg==',
  errorImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2Y1ZjVmNSIvPjwvc3ZnPg==',
  rootMargin: '50px',
})

const emit = defineEmits<{
  load: []
  error: [error: Event]
}>()

const imageRef = ref<HTMLImageElement>()
const isLoading = ref(false)
const isLoaded = ref(false)
const hasError = ref(false)
let observer: IntersectionObserver | null = null

const loadImage = () => {
  if (!imageRef.value || !props.src) return
  
  isLoading.value = true
  const img = new Image()
  
  img.onload = () => {
    if (imageRef.value) {
      imageRef.value.src = props.src
      isLoading.value = false
      isLoaded.value = true
    }
  }
  
  img.onerror = (error) => {
    if (imageRef.value) {
      imageRef.value.src = props.errorImage
      isLoading.value = false
      hasError.value = true
    }
    emit('error', error)
  }
  
  img.src = props.src
}

const handleLoad = () => {
  emit('load')
}

const handleError = (error: Event) => {
  hasError.value = true
  emit('error', error)
}

onMounted(() => {
  if (!imageRef.value) return
  
  // 设置占位图
  imageRef.value.src = props.placeholder
  
  // 检查是否支持 IntersectionObserver
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            loadImage()
            observer?.unobserve(entry.target)
          }
        })
      },
      {
        rootMargin: props.rootMargin,
        threshold: 0.01,
      }
    )
    
    observer.observe(imageRef.value)
  } else {
    // 不支持时直接加载
    loadImage()
  }
})

// 监听 src 变化
watch(() => props.src, () => {
  isLoaded.value = false
  hasError.value = false
  loadImage()
})

// 清理
const cleanup = () => {
  if (observer && imageRef.value) {
    observer.unobserve(imageRef.value)
    observer.disconnect()
    observer = null
  }
}

defineExpose({
  reload: loadImage,
  cleanup,
})
</script>

<style scoped>
.lazy-image {
  display: block;
  transition: opacity 0.3s ease;
}

.lazy-loading {
  opacity: 0.6;
  filter: blur(5px);
}

.lazy-loaded {
  opacity: 1;
  filter: none;
}

.lazy-error {
  opacity: 0.5;
}
</style>
