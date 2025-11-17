import { defineConfig } from "@vben/vite-config";
import { loadEnv, type PluginOption, type ConfigEnv } from "vite";

import AutoImport from "unplugin-auto-import/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
import Components from "unplugin-vue-components/vite";
import ElementPlus from "unplugin-element-plus/vite";

const mode = process.env.NODE_ENV ?? "development";
const env = loadEnv(mode, process.cwd(), "");
const isDev = mode === "development";

export default defineConfig(async (config?: ConfigEnv) => ({  application: {},
  vite: {
      plugins: [
        AutoImport({
          resolvers: [ElementPlusResolver()],
        }),
        Components({
          resolvers: [ElementPlusResolver()],
        }),
        ElementPlus({
          format: "esm",
        }),
      ] as PluginOption[],
      // 优化缓存配置
      optimizeDeps: {
        include: [
          "vue",
          "vue-router",
          "pinia",
          "element-plus",
          "@element-plus/icons-vue",
          "dayjs",
          "echarts",
        ],
        exclude: ["@nuxt/kit", "jiti", "c12", "untyped"],
        force: false,
      },
      server: {
        // 启用文件系统缓存
        fs: {
          cachedChecks: true,
        },
        // 开发环境不设置长期缓存，避免更新不及时
        // headers: isDev ? { "Cache-Control": "no-cache" } : undefined,
        proxy: {
          "/api": {
            changeOrigin: true,
            // 保留 /api 前缀，直接转发到后端
            target: env.VITE_API_BASE_URL || "http://localhost:3000",
            ws: true,
            rewrite: (path: string) => path, // 不重写路径，保持原样
          },
          "/crawler-api": {
            changeOrigin: true,
            // 将前端的 /crawler-api 前缀转发到爬虫服务基址
            // 若已设置 VITE_CRAWLER_API_BASE_URL（如 http://localhost:8009/api/v1），则使用该地址
            // 否则默认指向本地爬虫服务 http://localhost:8009/api/v1
            target: env.VITE_CRAWLER_API_BASE_URL || "http://localhost:8009/api/v1",
            ws: true,
            // /crawler-api/crawl-jobs -> /crawl-jobs（使其附加到 target 的 /api/v1 后）
            rewrite: (path: string) => path.replace(/^\/crawler-api/, ""),
          },
        },
        // 预热更多文件
        warmup: {
          clientFiles: ["./src/**/*.vue", "./src/**/*.ts", "./src/**/*.js"],
        },
      },
      // 构建优化
      build: {
        // 启用 CSS 代码分割
        cssCodeSplit: true,
        // 设置 chunk 大小警告限制
        chunkSizeWarningLimit: 1000,
        // 生产环境关闭 sourcemap
        sourcemap: false,
        // 压缩配置
        minify: 'terser',
        terserOptions: {
          compress: {
            drop_console: true, // 移除console
            drop_debugger: true, // 移除debugger
            pure_funcs: ['console.log'], // 移除特定函数
          },
        },
        rollupOptions: {
          // 外部化 Node.js 专用模块
          external: (id: string) => {
            // 排除 @nuxt/kit 及其依赖（jiti, c12, untyped）
            if (
              id.includes("@nuxt/kit") ||
              id.includes("jiti") ||
              id.includes("c12") ||
              id.includes("untyped")
            ) {
              return true;
            }
            return false;
          },
          output: {
            // 使用函数形式的代码分割
            manualChunks(id: string) {
              // Element Plus 相关
              if (id.includes("element-plus")) {
                return "element-plus";
              }
              // Vue 核心库
              if (id.includes("vue") && !id.includes("node_modules")) {
                return "vue-core";
              }
              if (id.includes("vue-router")) {
                return "vue-router";
              }
              if (id.includes("pinia")) {
                return "pinia";
              }
              // 工具库
              if (id.includes("dayjs")) {
                return "utils";
              }
              // 第三方库
              if (id.includes("node_modules")) {
                return "vendor";
              }
            },
          },
        },
      },
    },
}));
