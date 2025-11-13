<template>
  <div class="ai-number-selection-page">
    <!-- SQLBot嵌入容器 -->
    <div class="page-content">
      <SqlbotEmbed />
    </div>
  </div>
</template>

<script setup lang="ts">
import SqlbotEmbed from './components/SqlbotEmbed.vue';

// AI选号页面逻辑
defineOptions({
  name: 'AiNumberSelection',
});
</script>

<style scoped>
.ai-number-selection-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f5f5;
}

.page-content {
  flex: 1;
  display: flex;
  padding: 16px;
  overflow: hidden;
}

.content-placeholder {
  text-align: center;
  padding: 48px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-width: 400px;
  width: 100%;
}

.placeholder-icon {
  margin-bottom: 24px;
  color: #1890ff;
  display: flex;
  justify-content: center;
}

.content-placeholder h3 {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 12px 0;
}

.content-placeholder p {
  font-size: 14px;
  color: #999;
  margin: 0;
}
</style>