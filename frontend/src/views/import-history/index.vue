<template>
  <div class="import-history-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <h3>导入历史</h3>
          <el-button type="primary" @click="refreshList">
            <el-icon><refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>

      <!-- 数据表格 -->
      <el-table :data="historyList" v-loading="loading" stripe>
        <el-table-column prop="file_name" label="文件名" min-width="200" show-overflow-tooltip />
        <el-table-column prop="total_rows" label="总记录数" width="100" align="center" />
        <el-table-column prop="success_count" label="成功" width="80" align="center">
          <template #default="{ row }">
            <el-tag type="success" size="small">{{ row.success_count }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="failed_count" label="失败" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.failed_count > 0" type="danger" size="small">{{ row.failed_count }}</el-tag>
            <span v-else>0</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.status === 'completed'" type="success">已完成</el-tag>
            <el-tag v-else-if="row.status === 'processing'" type="primary">进行中</el-tag>
            <el-tag v-else-if="row.status === 'failed'" type="danger">失败</el-tag>
            <el-tag v-else type="info">等待中</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="progress" label="进度" width="120" align="center">
          <template #default="{ row }">
            <el-progress :percentage="row.progress" :status="row.status === 'completed' ? 'success' : undefined" />
          </template>
        </el-table-column>
        <el-table-column prop="duration" label="耗时" width="100" align="center">
          <template #default="{ row }">
            {{ row.duration ? Math.round(row.duration / 1000) + 's' : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="text" @click="viewDetail(row)">查看详情</el-button>
            <el-button v-if="row.failed_count > 0" type="text" @click="downloadFailed(row)">下载失败</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 详情对话框 -->
    <el-dialog v-model="detailVisible" title="导入详情" width="70%">
      <div v-if="currentDetail" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="任务ID">{{ currentDetail.task_id }}</el-descriptions-item>
          <el-descriptions-item label="文件名">{{ currentDetail.file_name }}</el-descriptions-item>
          <el-descriptions-item label="总记录数">{{ currentDetail.total_rows }}</el-descriptions-item>
          <el-descriptions-item label="已处理">{{ currentDetail.processed_rows }}</el-descriptions-item>
          <el-descriptions-item label="成功数">
            <el-tag type="success">{{ currentDetail.success_count }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="失败数">
            <el-tag v-if="currentDetail.failed_count > 0" type="danger">{{ currentDetail.failed_count }}</el-tag>
            <span v-else>0</span>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag v-if="currentDetail.status === 'completed'" type="success">已完成</el-tag>
            <el-tag v-else-if="currentDetail.status === 'processing'" type="primary">进行中</el-tag>
            <el-tag v-else-if="currentDetail.status === 'failed'" type="danger">失败</el-tag>
            <el-tag v-else type="info">等待中</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="进度">{{ currentDetail.progress }}%</el-descriptions-item>
          <el-descriptions-item label="开始时间">{{ formatTime(currentDetail.start_time) }}</el-descriptions-item>
          <el-descriptions-item label="结束时间">{{ currentDetail.end_time ? formatTime(currentDetail.end_time) : '-' }}</el-descriptions-item>
          <el-descriptions-item label="耗时">
            {{ currentDetail.duration ? Math.round(currentDetail.duration / 1000) + '秒' : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="错误信息" :span="2">
            <span v-if="currentDetail.error_message" style="color: #f56c6c;">{{ currentDetail.error_message }}</span>
            <span v-else>-</span>
          </el-descriptions-item>
        </el-descriptions>

        <!-- 失败记录 -->
        <div v-if="currentDetail.failed_records && currentDetail.failed_records.length > 0" class="failed-records">
          <h4>失败记录 (前10条)</h4>
          <el-table :data="currentDetail.failed_records.slice(0, 10)" max-height="300">
            <el-table-column prop="row" label="行号" width="80" />
            <el-table-column prop="error" label="错误信息" min-width="200" />
            <el-table-column label="数据" min-width="300">
              <template #default="{ row }">
                <pre style="margin: 0;">{{ JSON.stringify(row.data, null, 2) }}</pre>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { getImportHistory, getImportHistoryDetail } from '../../api/import-async'

const loading = ref(false)
const historyList = ref<any[]>([])
const pagination = ref({
  page: 1,
  pageSize: 20,
  total: 0
})

const detailVisible = ref(false)
const currentDetail = ref<any>(null)

const loadHistory = async () => {
  loading.value = true
  try {
    const result = await getImportHistory({
      page: pagination.value.page,
      pageSize: pagination.value.pageSize
    })
    
    historyList.value = result.items
    pagination.value.total = result.total
  } catch (error) {
    console.error('加载导入历史失败:', error)
    ElMessage.error('加载导入历史失败')
  } finally {
    loading.value = false
  }
}

const refreshList = () => {
  loadHistory()
}

const handlePageChange = (page: number) => {
  pagination.value.page = page
  loadHistory()
}

const handleSizeChange = (size: number) => {
  pagination.value.pageSize = size
  pagination.value.page = 1
  loadHistory()
}

const viewDetail = async (row: any) => {
  try {
    const detail = await getImportHistoryDetail(row.task_id)
    currentDetail.value = detail
    detailVisible.value = true
  } catch (error) {
    console.error('加载详情失败:', error)
    ElMessage.error('加载详情失败')
  }
}

const downloadFailed = (row: any) => {
  if (!row.failed_records || row.failed_records.length === 0) {
    ElMessage.warning('没有失败记录')
    return
  }

  const headers = ['行号', '错误信息', '数据']
  const csvRows = row.failed_records.map((record: any) => {
    const escapeCSV = (str: string) => {
      const strValue = String(str)
      if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        return `"${strValue.replace(/"/g, '""')}"`
      }
      return strValue
    }
    
    return [
      record.row,
      escapeCSV(record.error),
      escapeCSV(JSON.stringify(record.data))
    ].join(',')
  })
  
  const csvContent = [headers.join(','), ...csvRows].join('\n')
  const bom = '\uFEFF'
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `导入失败记录_${row.task_id}.csv`
  link.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('失败记录下载成功')
}

const formatTime = (time: string) => {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN')
}

// 定时器引用
let refreshTimer: NodeJS.Timeout | null = null

onMounted(() => {
  loadHistory()
  
  // 每30秒自动刷新一次
  refreshTimer = setInterval(() => {
    loadHistory()
  }, 30000)
})

// 组件卸载时清理定时器
onUnmounted(() => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
})
</script>

<style scoped>
.import-history-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.detail-content {
  padding: 20px 0;
}

.failed-records {
  margin-top: 30px;
}

.failed-records h4 {
  margin-bottom: 15px;
}
</style>
