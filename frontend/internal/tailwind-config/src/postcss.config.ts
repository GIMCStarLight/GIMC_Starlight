import config from '.';

export default {
  plugins: {
    // 先处理 @import 保证外部样式被正确解析
    'postcss-import': {},
    // Tailwind 的嵌套语法需要在 Tailwind 主插件之前
    'tailwindcss/nesting': {},
    // 核心：Tailwind 在最前以正确处理 @apply/@screen 等指令
    tailwindcss: { config },
    // 组件库修复，放在 Tailwind 之后以避免覆盖
    'postcss-antd-fixes': { prefixes: ['ant', 'el'] },
    // 现代 CSS 转换
    'postcss-preset-env': {},
    // 浏览器前缀应在所有转换之后
    autoprefixer: {},
    // 生产环境压缩放到最后
    ...(process.env.NODE_ENV === 'production' ? { cssnano: {} } : {}),
  },
};
