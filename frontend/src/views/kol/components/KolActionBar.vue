<template>
  <div class="top-bar">
    <div class="bar-left">
      <h1 class="page-title">省广达人库</h1>
    </div>
    <div class="bar-right">
      <el-button @click="emit('import-history')" class="action-btn">
        <Icon icon="lucide:clock" class="mr-1" />
        导入历史
      </el-button>
      
      <el-button @click="emit('import-data')" class="action-btn">
        <Icon icon="lucide:download" class="mr-1" />
        导入数据
      </el-button>
      
      <el-button 
        type="success" 
        :disabled="selectedCount === 0" 
        @click="emit('batch-sync')"
        :loading="batchSyncing"
        class="action-btn"
      >
        <Icon icon="lucide:refresh-cw" class="mr-1" />
        批量同步
        <el-badge v-if="selectedCount > 0" :value="selectedCount" class="badge-count" />
      </el-button>
      
      <el-button 
        type="warning" 
        @click="emit('retry-failed')"
        :loading="retrying"
        class="action-btn"
      >
        <Icon icon="lucide:rotate-ccw" class="mr-1" />
        重试失败
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IconifyIcon as Icon } from '@vben/icons'

defineOptions({
  name: 'KolActionBar',
})

defineProps<{
  selectedCount: number
  batchSyncing?: boolean
  retrying?: boolean
}>()

const emit = defineEmits<{
  'import-history': []
  'import-data': []
  'batch-sync': []
  'retry-failed': []
}>()
</script>

<style scoped lang="scss">
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.bar-left {
  flex: 1;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
}

.bar-right {
  display: flex;
  gap: 12px;
  align-items: center;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  
  .mr-1 {
    margin-right: 4px;
  }
}

.badge-count {
  margin-left: 8px;
  
  :deep(.el-badge__content) {
    background-color: #fff;
    color: #67c23a;
    border: 1px solid #67c23a;
  }
}
</style>
