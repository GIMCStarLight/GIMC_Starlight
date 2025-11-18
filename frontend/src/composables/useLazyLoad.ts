/**
 * 图片懒加载 Composable
 * 使用 Intersection Observer API 实现高性能的图片懒加载
 */

import { ref, onMounted, onBeforeUnmount, type Ref } from 'vue'
import { log } from '#/utils/logger'

interface LazyLoadOptions {
  /** 预加载距离（像素），默认100px */
  rootMargin?: string
  /** 可见度阈值，0-1，默认0.01 */
  threshold?: number
  /** 占位图 */
  placeholder?: string
  /** 错误图 */
  errorImage?: string
  /** 加载完成回调 */
  onLoad?: (el: HTMLElement) => void
  /** 加载失败回调 */
  onError?: (el: HTMLElement, error: Event) => void
}

const defaultOptions: LazyLoadOptions = {
  rootMargin: '100px',
  threshold: 0.01,
  placeholder: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE4IiBmaWxsPSIjY2NjIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+TG9hZGluZy4uLjwvdGV4dD48L3N2Zz4=',
  errorImage: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE4IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+TG9hZCBGYWlsZWQ8L3RleHQ+PC9zdmc+',
}

/**
 * 图片懒加载 Hook
 */
export function useLazyLoad(options: LazyLoadOptions = {}) {
  const mergedOptions = { ...defaultOptions, ...options }
  const observer = ref<IntersectionObserver | null>(null)
  const loadedImages = new Set<string>()
  const stats = ref({
    total: 0,
    loaded: 0,
    failed: 0,
  })

  /**
   * 加载图片
   */
  const loadImage = (el: HTMLElement, src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      
      img.onload = () => {
        if (el.tagName === 'IMG') {
          (el as HTMLImageElement).src = src
        } else {
          el.style.backgroundImage = `url(${src})`
        }
        
        el.classList.add('lazy-loaded')
        el.classList.remove('lazy-loading')
        
        loadedImages.add(src)
        stats.value.loaded++
        
        mergedOptions.onLoad?.(el)
        log.debug(`[LazyLoad] 图片加载成功: ${src.substring(0, 50)}...`)
        resolve()
      }
      
      img.onerror = (error) => {
        el.classList.add('lazy-error')
        el.classList.remove('lazy-loading')
        
        stats.value.failed++
        
        // 设置错误图
        if (mergedOptions.errorImage) {
          if (el.tagName === 'IMG') {
            (el as HTMLImageElement).src = mergedOptions.errorImage
          } else {
            el.style.backgroundImage = `url(${mergedOptions.errorImage})`
          }
        }
        
        mergedOptions.onError?.(el, error)
        log.warn(`[LazyLoad] 图片加载失败: ${src}`, error)
        reject(error)
      }
      
      img.src = src
    })
  }

  /**
   * 处理元素进入视口
   */
  const handleIntersection = (entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const el = entry.target as HTMLElement
        const src = el.dataset.lazySrc
        
        if (src && !loadedImages.has(src)) {
          el.classList.add('lazy-loading')
          loadImage(el, src).catch(() => {
            // 错误已在 loadImage 中处理
          })
          
          // 加载后停止观察
          observer.value?.unobserve(el)
        }
      }
    })
  }

  /**
   * 初始化观察器
   */
  const initObserver = () => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      log.warn('[LazyLoad] IntersectionObserver 不支持，将直接加载所有图片')
      return null
    }

    observer.value = new IntersectionObserver(handleIntersection, {
      rootMargin: mergedOptions.rootMargin,
      threshold: mergedOptions.threshold,
    })

    log.debug('[LazyLoad] 观察器已初始化')
    return observer.value
  }

  /**
   * 观察元素
   */
  const observe = (el: HTMLElement, src: string) => {
    if (!observer.value) {
      initObserver()
    }

    // 设置占位图
    if (mergedOptions.placeholder) {
      if (el.tagName === 'IMG') {
        (el as HTMLImageElement).src = mergedOptions.placeholder
      } else {
        el.style.backgroundImage = `url(${mergedOptions.placeholder})`
      }
    }

    // 保存真实图片地址
    el.dataset.lazySrc = src
    stats.value.total++

    // 开始观察
    observer.value?.observe(el)
  }

  /**
   * 取消观察元素
   */
  const unobserve = (el: HTMLElement) => {
    observer.value?.unobserve(el)
  }

  /**
   * 清理
   */
  const cleanup = () => {
    observer.value?.disconnect()
    observer.value = null
    loadedImages.clear()
    log.debug('[LazyLoad] 观察器已清理')
  }

  /**
   * 获取统计信息
   */
  const getStats = () => {
    return {
      ...stats.value,
      loadRate: stats.value.total > 0
        ? ((stats.value.loaded / stats.value.total) * 100).toFixed(2) + '%'
        : '0%',
      pending: stats.value.total - stats.value.loaded - stats.value.failed,
    }
  }

  onMounted(() => {
    initObserver()
  })

  onBeforeUnmount(() => {
    cleanup()
  })

  return {
    observe,
    unobserve,
    cleanup,
    getStats,
    stats,
  }
}

/**
 * 简化版本 - 用于单个图片元素
 */
export function useLazyImage(imageRef: Ref<HTMLElement | null>, src: string, options: LazyLoadOptions = {}) {
  const { observe, unobserve } = useLazyLoad(options)
  const isLoaded = ref(false)

  onMounted(() => {
    if (imageRef.value && src) {
      observe(imageRef.value, src)
    }
  })

  onBeforeUnmount(() => {
    if (imageRef.value) {
      unobserve(imageRef.value)
    }
  })

  return {
    isLoaded,
  }
}
