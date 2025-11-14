<template>
  <div class="all-platforms-grid">
    <el-empty description="全部平台数据展示待补充">
      <template #description>
        <p>全部平台的数据展示功能正在开发中</p>
        <p style="color: var(--el-text-color-secondary); font-size: 12px; margin-top: 8px;">
          请先选择具体平台查看达人数据
        </p>
      </template>
      <template #image>
        <div style="font-size: 48px; color: var(--el-color-info-light-5);">
          <Icon icon="lucide:database" />
        </div>
      </template>
    </el-empty>
  </div>
</template>

<script setup lang="ts">
import { IconifyIcon as Icon } from '@vben/icons'

defineProps<{
  viewMode: 'card' | 'table'
  cardSize: 'compact' | 'standard' | 'detailed'
  loading: boolean
  platform: string
}>()

defineEmits<{
  'update-data': [data: any]
  'evaluate': [data: any]
}>()
</script>

<style scoped lang="scss">
.all-platforms-grid {
  min-height: 450px;
  background: #ffffff;
  border-radius: 8px;
  padding: 80px 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  :deep(.el-empty__description) {
    p {
      margin: 0;
      padding: 4px 0;
    }
  }
}
</style>
