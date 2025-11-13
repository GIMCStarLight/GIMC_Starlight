<script lang="ts" setup>
import { onMounted } from 'vue';
import { useElementPlusDesignTokens } from '@vben/hooks';

import { ElConfigProvider } from 'element-plus';

import { elementLocale } from '#/locales';

defineOptions({ name: 'App' });

// 延迟到组件挂载后执行，确保 Pinia 已经初始化
onMounted(() => {
  useElementPlusDesignTokens();
});
</script>

<template>
  <ElConfigProvider :locale="elementLocale">
    <RouterView />
  </ElConfigProvider>
</template>
