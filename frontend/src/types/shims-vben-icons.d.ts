declare module '@vben/icons' {
  // 仅提供最小的类型以通过TS诊断；运行时代码由实际包提供
  export const IconifyIcon: any
  export function listIcons(): string[]
  export function addCollection(collection: any): void
  export function addIcon(name: string, data: any): void
}