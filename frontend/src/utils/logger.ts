/**
 * 统一日志工具
 * 使用 consola 替代直接的 console.* 调用
 * 
 * 优势：
 * 1. 统一的日志格式和颜色
 * 2. 支持日志级别控制
 * 3. 生产环境自动降低日志级别
 * 4. 更好的可读性
 */

import { createConsola } from 'consola'

/**
 * 日志级别说明：
 * 0: Fatal and Error
 * 1: Warnings
 * 2: Normal logs
 * 3: Informational logs, success, fail, ready, start, ...
 * 4: Debug logs
 * 5: Trace logs
 */
const logger = createConsola({
  // 开发环境显示所有日志，生产环境只显示警告和错误
  level: import.meta.env.DEV ? 4 : 1,
  formatOptions: {
    date: true,
    colors: true,
  },
})

// 导出常用的日志方法
export const log = {
  // 基础日志
  info: logger.info.bind(logger),
  warn: logger.warn.bind(logger),
  error: logger.error.bind(logger),
  debug: logger.debug.bind(logger),
  
  // 成功/失败
  success: logger.success.bind(logger),
  fail: logger.fail.bind(logger),
  
  // 特殊状态
  ready: logger.ready.bind(logger),
  start: logger.start.bind(logger),
  
  // 追踪
  trace: logger.trace.bind(logger),
}

// 默认导出
export default logger
