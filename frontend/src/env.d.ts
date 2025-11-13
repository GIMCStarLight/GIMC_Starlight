/// <reference types="vite/client" />
/// <reference types="element-plus/global" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

/**
 * Vite 环境变量类型声明
 * 补充项目中实际使用的变量，便于 TS 识别 `import.meta.env`
 */
interface ImportMetaEnv {
  readonly VITE_BASE: string
  readonly VITE_GLOB_API_URL: string
  readonly VITE_GLOB_API_V2_URL: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_CRAWLER_API_BASE_URL: string
  readonly VITE_COMPRESS?: 'none' | 'brotli' | 'gzip'
  readonly VITE_PWA?: boolean | 'true' | 'false'
  readonly VITE_ROUTER_HISTORY?: 'hash' | 'history'
  readonly VITE_INJECT_APP_LOADING?: boolean | 'true' | 'false'
  readonly VITE_ARCHIVER?: boolean | 'true' | 'false'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}