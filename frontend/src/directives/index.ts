import type { App } from 'vue'
import { setupPermissionDirective } from './permission'
import { lazyLoadDirective } from './lazyLoad'

/**
 * 注册全局指令
 * @param app Vue应用实例
 */
export function setupDirectives(app: App) {
  // 注册权限指令
  setupPermissionDirective(app)
  
  // 注册图片懒加载指令
  app.directive('lazy', lazyLoadDirective)
}

export * from './permission'
export * from './lazyLoad'