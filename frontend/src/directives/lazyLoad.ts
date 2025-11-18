/**
 * 图片懒加载指令
 * v-lazy="imageSrc"
 * v-lazy="{ src: imageSrc, placeholder: placeholderSrc, error: errorSrc }"
 */

import type { Directive, DirectiveBinding } from 'vue'
import { log } from '#/utils/logger'

interface LazyLoadConfig {
  src: string
  placeholder?: string
  error?: string
  loading?: string
}

// 默认占位图和错误图
const DEFAULT_PLACEHOLDER = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE4IiBmaWxsPSIjY2NjIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+TG9hZGluZy4uLjwvdGV4dD48L3N2Zz4='
const DEFAULT_ERROR = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0iI2Y1ZjVmNSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE4IiBmaWxsPSIjOTk5IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkeT0iLjNlbSI+TG9hZCBGYWlsZWQ8L3RleHQ+PC9zdmc+'

// 全局观察器
let observer: IntersectionObserver | null = null
const loadedImages = new Set<string>()

/**
 * 初始化观察器
 */
function initObserver() {
  if (observer) return observer

  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    log.warn('[v-lazy] IntersectionObserver 不支持')
    return null
  }

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target as HTMLImageElement
          const src = el.dataset.lazySrc

          if (src && !loadedImages.has(src)) {
            loadImage(el, src)
            observer?.unobserve(el)
          }
        }
      })
    },
    {
      rootMargin: '50px',
      threshold: 0.01,
    }
  )

  return observer
}

/**
 * 加载图片
 */
function loadImage(el: HTMLImageElement, src: string) {
  const img = new Image()
  const errorImg = el.dataset.lazyError || DEFAULT_ERROR

  // 添加加载状态
  el.classList.add('lazy-loading')

  img.onload = () => {
    el.src = src
    el.classList.remove('lazy-loading')
    el.classList.add('lazy-loaded')
    loadedImages.add(src)
    log.debug(`[v-lazy] 图片加载成功: ${src.substring(0, 50)}...`)
  }

  img.onerror = () => {
    el.src = errorImg
    el.classList.remove('lazy-loading')
    el.classList.add('lazy-error')
    log.warn(`[v-lazy] 图片加载失败: ${src}`)
  }

  img.src = src
}

/**
 * 解析指令绑定值
 */
function parseBinding(binding: DirectiveBinding): LazyLoadConfig {
  if (typeof binding.value === 'string') {
    return { src: binding.value }
  }
  return binding.value as LazyLoadConfig
}

/**
 * 懒加载指令
 */
export const lazyLoadDirective: Directive = {
  mounted(el: HTMLImageElement, binding) {
    const config = parseBinding(binding)
    const { src, placeholder = DEFAULT_PLACEHOLDER, error = DEFAULT_ERROR } = config

    if (!src) {
      log.warn('[v-lazy] 缺少图片地址')
      return
    }

    // 初始化观察器
    const obs = initObserver()

    // 设置占位图
    el.src = placeholder
    
    // 保存真实地址和错误图
    el.dataset.lazySrc = src
    el.dataset.lazyError = error

    // 添加初始类名
    el.classList.add('lazy-image')

    // 开始观察
    if (obs) {
      obs.observe(el)
    } else {
      // 不支持 IntersectionObserver，直接加载
      loadImage(el, src)
    }
  },

  updated(el: HTMLImageElement, binding) {
    const config = parseBinding(binding)
    const newSrc = config.src
    const oldSrc = el.dataset.lazySrc

    // 如果地址改变，重新加载
    if (newSrc && newSrc !== oldSrc) {
      el.dataset.lazySrc = newSrc
      
      // 如果已经在视口内，立即加载
      if (el.classList.contains('lazy-loaded') || el.classList.contains('lazy-loading')) {
        loadImage(el, newSrc)
      }
    }
  },

  beforeUnmount(el: HTMLImageElement) {
    // 停止观察
    observer?.unobserve(el)
    
    // 清理数据
    delete el.dataset.lazySrc
    delete el.dataset.lazyError
  },
}

/**
 * 清理全局观察器（应用卸载时调用）
 */
export function cleanupLazyLoad() {
  if (observer) {
    observer.disconnect()
    observer = null
  }
  loadedImages.clear()
  log.debug('[v-lazy] 全局观察器已清理')
}
