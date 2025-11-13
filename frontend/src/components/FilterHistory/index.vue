<template>
  <div class="filter-history">
    <div class="history-header">
      <Icon icon="lucide:history" class="history-icon" />
      <span class="history-title">筛选历史</span>
      <el-button
        type="text"
        size="small"
        @click="clearHistory"
        :disabled="historyItems.length === 0"
      >
        <Icon icon="lucide:trash-2" class="mr-1" />
        清空历史
      </el-button>
    </div>
    
    <div class="history-list">
      <div
        v-for="(item, index) in historyItems"
        :key="item.id"
        class="history-item"
        @click="applyHistoryItem(item)"
      >
        <div class="history-info">
          <div class="history-name">{{ item.name }}</div>
          <div class="history-meta">
            <span class="history-time">{{ formatTime(item.timestamp) }}</span>
            <span class="history-count">{{ item.resultCount }} 个结果</span>
          </div>
        </div>
        <div class="history-actions">
          <el-button
            type="text"
            size="small"
            @click.stop="removeHistoryItem(index)"
          >
            <Icon icon="lucide:x" />
          </el-button>
        </div>
      </div>
      
      <div v-if="historyItems.length === 0" class="empty-history">
        <Icon icon="lucide:clock" class="empty-icon" />
        <p>暂无筛选历史</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { IconifyIcon as Icon } from '@vben/icons'

// Props
interface Props {
  modelValue?: any[]
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: () => []
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: any[]]
  'apply-history': [item: any]
}>()

// 响应式数据
const historyItems = ref([
  {
    id: 1,
    name: '美妆达人筛选',
    filters: {
      cooperationRequest: {
        contentType: { value: 'shortVideo' },
        industry: { value: ['beauty'] }
      }
    },
    resultCount: 25,
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30分钟前
  },
  {
    id: 2,
    name: '时尚类标签',
    filters: {
      cooperationRequest: {
        contentType: { value: 'customDrama' },
        industry: { value: ['fashion'] }
      }
    },
    resultCount: 18,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() // 2小时前
  },
  {
    id: 3,
    name: '高性价比筛选',
    filters: {
      costEffectiveness: {
        cooperationData: [{ value: 'high' }]
      }
    },
    resultCount: 32,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() // 1天前
  }
])

// 方法
const applyHistoryItem = (item: any) => {
  emit('apply-history', item)
  ElMessage.success(`已应用筛选: ${item.name}`)
}

const removeHistoryItem = async (index: number) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除这条筛选历史吗？',
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    historyItems.value.splice(index, 1)
    emit('update:modelValue', historyItems.value)
    ElMessage.success('删除成功')
  } catch (error) {
    // 用户取消删除
  }
}

const clearHistory = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有筛选历史吗？',
      '确认清空',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    historyItems.value = []
    emit('update:modelValue', historyItems.value)
    ElMessage.success('历史记录已清空')
  } catch (error) {
    // 用户取消清空
  }
}

const formatTime = (timestamp: string) => {
  const now = new Date()
  const time = new Date(timestamp)
  const diff = now.getTime() - time.getTime()
  
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (minutes < 60) {
    return `${minutes}分钟前`
  } else if (hours < 24) {
    return `${hours}小时前`
  } else {
    return `${days}天前`
  }
}

// 添加新的历史记录
const addHistoryItem = (name: string, filters: any, resultCount: number) => {
  const newItem = {
    id: Date.now(),
    name,
    filters,
    resultCount,
    timestamp: new Date().toISOString()
  }
  
  // 添加到开头
  historyItems.value.unshift(newItem)
  
  // 限制历史记录数量
  if (historyItems.value.length > 20) {
    historyItems.value = historyItems.value.slice(0, 20)
  }
  
  emit('update:modelValue', historyItems.value)
}

// 暴露方法给父组件
defineExpose({
  addHistoryItem
})
</script>

<style scoped>
.filter-history {
  background: var(--el-bg-color);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
}

.history-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.history-icon {
  margin-right: 8px;
  color: var(--el-color-primary);
}

.history-title {
  font-weight: 600;
  color: var(--el-text-color-primary);
  flex: 1;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: var(--el-fill-color-lighter);
}

.history-item:hover {
  border-color: var(--el-color-primary-light-7);
  background: var(--el-fill-color-light);
}

.history-info {
  flex: 1;
}

.history-name {
  font-weight: 500;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
}

.history-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.history-actions {
  display: flex;
  gap: 4px;
}

.history-actions .el-button {
  padding: 4px;
  min-height: auto;
}

.empty-history {
  text-align: center;
  padding: 40px 20px;
  color: var(--el-text-color-placeholder);
}

.empty-icon {
  font-size: 32px;
  margin-bottom: 12px;
  opacity: 0.5;
}

/* 滚动条样式 */
.history-list::-webkit-scrollbar {
  width: 6px;
}

.history-list::-webkit-scrollbar-track {
  background: var(--el-fill-color-lighter);
  border-radius: 3px;
}

.history-list::-webkit-scrollbar-thumb {
  background: var(--el-border-color);
  border-radius: 3px;
}

.history-list::-webkit-scrollbar-thumb:hover {
  background: var(--el-border-color-dark);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .history-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .history-actions {
    align-self: flex-end;
  }
  
  .history-meta {
    flex-direction: column;
    gap: 4px;
  }
}
</style>
