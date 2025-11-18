import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  clean: true,
  declaration: true,
  entries: ['src/index'],
  externals: [
    'vite',
    'rollup',
    '@vitejs/plugin-vue',
    '@vitejs/plugin-vue-jsx',
    'fsevents',
  ],
});
