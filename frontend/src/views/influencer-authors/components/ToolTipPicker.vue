<template>
  <el-tooltip
    placement="top"
    effect="light"
    popper-class="stats-tooltip"
    :show-arrow="true"
  >
    <template #content>
      <slot name="content">
        <!-- 默认空内容，由父组件传入 -->
      </slot>
    </template>
    <slot name="trigger">
      <!-- 默认触发器，由父组件传入 -->
      <el-icon class="stats-info-icon"><InfoFilled /></el-icon>
    </slot>
  </el-tooltip>
</template>

<script setup lang="ts">
import { InfoFilled } from '@element-plus/icons-vue'

defineSlots<{
  content?: any
  trigger?: any
}>()
</script>

<style scoped lang="scss">
/* 使用更具体的选择器和!important确保样式生效 */
:deep(.el-icon.stats-info-icon) {
  font-size: 16px !important;
  color: var(--el-color-info) !important;
  cursor: pointer !important;
  transition: color 0.3s !important;
  margin-left: 0px !important;
  position: relative !important;
  top: -2px !important;

  &:hover {
    color: var(--el-color-primary) !important;
  }
}

/* 同时也保留原有的选择器作为后备 */
.stats-info-icon {
  font-size: 16px !important;
  color: var(--el-color-info) !important;
  cursor: pointer !important;
  transition: color 0.3s !important;
  margin-left: 8px !important;
  position: relative !important;
  top: -2px !important;

  &:hover {
    color: var(--el-color-primary) !important;
  }
}
</style>

<style lang="scss">
/* 弹窗样式 */
.stats-tooltip {
  max-width: 800px !important;
  line-height: 1.6 !important;
  word-wrap: break-word !important;
  word-break: break-word !important;
  white-space: pre-wrap !important;

  .stats-tooltip-content {
    padding: 4px 0;

    .stats-tooltip-item {
      padding: 6px 0;
      font-size: 13px;
      color: var(--el-text-color-primary);
      line-height: 1.5;

      .stats-tooltip-number {
        font-weight: 600;
        margin: 0 4px;
        color: var(--el-color-primary);
      }
    }
  }
}
</style>