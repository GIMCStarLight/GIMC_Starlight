import type { App } from 'vue'
import { setupPermissionDirective } from './permission'

/**
 * 注册全局指令
 * @param app Vue应用实例
 */
export function setupDirectives(app: App) {
  // 注册权限指令
  setupPermissionDirective(app)
}

export * from './permission'