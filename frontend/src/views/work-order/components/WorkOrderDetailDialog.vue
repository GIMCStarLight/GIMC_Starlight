<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { IconifyIcon as Icon } from '@vben/icons'
import {
  getWorkOrderDetail,
  getWorkOrderLogs,
  updateWorkOrderStatus,
  assignWorkOrder,
  type WorkOrder,
  type WorkOrderLog,
  WorkOrderType,
  WorkOrderStatus,
  WorkOrderPriority,
} from '../../../api/work-order'

const props = defineProps<{
  visible: boolean
  workOrderId?: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  success: []
}>()

const loading = ref(false)
const logsLoading = ref(false)
const workOrder = ref<WorkOrder | null>(null)
const logs = ref<WorkOrderLog[]>([])
const activeTab = ref('detail')

// 状态更新对话框
const statusDialogVisible = ref(false)
const statusComment = ref('')
const newStatus = ref<WorkOrderStatus | null>(null)

// 分配对话框
const assignDialogVisible = ref(false)
const assignComment = ref('')
const assigneeUserId = ref('')

// 工单类型映射
const typeLabels: Record<WorkOrderType, string> = {
  [WorkOrderType.NEW_FEATURE]: '新增功能',
  [WorkOrderType.SYSTEM_REFACTOR]: '系统改造',
  [WorkOrderType.BUG_FIX]: '问题调试',
  [WorkOrderType.OPTIMIZATION]: '性能优化',
  [WorkOrderType.REQUIREMENT_CHANGE]: '需求变更',
  [WorkOrderType.OTHER]: '其他',
}

// 状态映射
const statusLabels: Record<WorkOrderStatus, { label: string; color: string }> = {
  [WorkOrderStatus.PENDING]: { label: '待接收', color: 'info' },
  [WorkOrderStatus.RECEIVED]: { label: '已接收', color: 'primary' },
  [WorkOrderStatus.IN_PROGRESS]: { label: '处理中', color: 'warning' },
  [WorkOrderStatus.TESTING]: { label: '测试中', color: 'warning' },
  [WorkOrderStatus.COMPLETED]: { label: '已完成', color: 'success' },
  [WorkOrderStatus.REJECTED]: { label: '已拒绝', color: 'danger' },
  [WorkOrderStatus.CANCELLED]: { label: '已取消', color: 'info' },
}

// 优先级映射
const priorityLabels: Record<WorkOrderPriority, { label: string; color: string }> = {
  [WorkOrderPriority.LOW]: { label: '低', color: 'info' },
  [WorkOrderPriority.MEDIUM]: { label: '中', color: 'primary' },
  [WorkOrderPriority.HIGH]: { label: '高', color: 'warning' },
  [WorkOrderPriority.URGENT]: { label: '紧急', color: 'danger' },
}

// 可用的状态转换
const availableStatuses = computed(() => {
  if (!workOrder.value) return []
  
  const current = workOrder.value.status
  const transitions: Partial<Record<WorkOrderStatus, WorkOrderStatus[]>> = {
    [WorkOrderStatus.PENDING]: [WorkOrderStatus.RECEIVED, WorkOrderStatus.REJECTED],
    [WorkOrderStatus.RECEIVED]: [WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.REJECTED],
    [WorkOrderStatus.IN_PROGRESS]: [WorkOrderStatus.TESTING, WorkOrderStatus.COMPLETED],
    [WorkOrderStatus.TESTING]: [WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.COMPLETED],
  }
  
  return (transitions[current] || []).map(status => ({
    value: status,
    ...statusLabels[status],
  }))
})

// 格式化时间
const formatDate = (date?: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

// 加载工单详情
const loadDetail = async () => {
  if (!props.workOrderId) return
  
  loading.value = true
  try {
    workOrder.value = await getWorkOrderDetail(props.workOrderId)
  } catch (error: any) {
    ElMessage.error(error.message || '加载工单详情失败')
  } finally {
    loading.value = false
  }
}

// 加载工单日志
const loadLogs = async () => {
  if (!props.workOrderId) return
  
  logsLoading.value = true
  try {
    logs.value = await getWorkOrderLogs(props.workOrderId)
  } catch (error: any) {
    ElMessage.error(error.message || '加载工单日志失败')
  } finally {
    logsLoading.value = false
  }
}

// 监听对话框打开
watch(() => props.visible, (val) => {
  if (val && props.workOrderId) {
    loadDetail()
    loadLogs()
  }
})

// 打开状态更新对话框
const handleUpdateStatus = (status: WorkOrderStatus) => {
  newStatus.value = status
  statusDialogVisible.value = true
}

// 确认状态更新
const confirmStatusUpdate = async () => {
  if (!workOrder.value || !newStatus.value) return
  
  try {
    await updateWorkOrderStatus(workOrder.value.id, {
      status: newStatus.value,
      comment: statusComment.value,
    })
    ElMessage.success('状态更新成功')
    statusDialogVisible.value = false
    statusComment.value = ''
    newStatus.value = null
    await loadDetail()
    await loadLogs()
    emit('success')
  } catch (error: any) {
    ElMessage.error(error.message || '状态更新失败')
  }
}

// 打开分配对话框
const handleAssign = () => {
  assignDialogVisible.value = true
}

// 确认分配
const confirmAssign = async () => {
  if (!workOrder.value || !assigneeUserId.value) {
    ElMessage.warning('请输入分配人ID')
    return
  }
  
  try {
    await assignWorkOrder(workOrder.value.id, {
      assignedTo: assigneeUserId.value,
      comment: assignComment.value,
    })
    ElMessage.success('分配成功')
    assignDialogVisible.value = false
    assignComment.value = ''
    assigneeUserId.value = ''
    await loadDetail()
    await loadLogs()
    emit('success')
  } catch (error: any) {
    ElMessage.error(error.message || '分配失败')
  }
}

// 获取日志动作图标
const getLogIcon = (action: string) => {
  const icons: Record<string, string> = {
    CREATE: 'lucide:plus-circle',
    UPDATE: 'lucide:edit',
    STATUS_CHANGE: 'lucide:refresh-cw',
    ASSIGN: 'lucide:user-plus',
    COMMENT: 'lucide:message-circle',
  }
  return icons[action] || 'lucide:circle'
}

// 获取日志动作颜色
const getLogColor = (action: string) => {
  const colors: Record<string, string> = {
    CREATE: '#67c23a',
    UPDATE: '#409eff',
    STATUS_CHANGE: '#e6a23c',
    ASSIGN: '#909399',
    COMMENT: '#606266',
  }
  return colors[action] || '#909399'
}
</script>

<template>
  <el-dialog
    :model-value="visible"
    title="工单详情"
    width="900px"
    :close-on-click-modal="false"
    @update:model-value="emit('update:visible', $event)"
  >
    <div v-loading="loading">
      <el-tabs v-model="activeTab">
        <!-- 基本信息 -->
        <el-tab-pane label="基本信息" name="detail">
          <div v-if="workOrder" class="detail-content">
            <!-- 工单头部 -->
            <div class="detail-header mb-4 p-4 bg-gray-50 rounded">
              <h3 class="text-lg font-semibold mb-2">{{ workOrder.title }}</h3>
              <div class="flex gap-4 text-sm">
                <div>
                  <el-tag :type="statusLabels[workOrder.status]?.color as any">
                    {{ statusLabels[workOrder.status]?.label }}
                  </el-tag>
                </div>
                <div>
                  <el-tag :type="priorityLabels[workOrder.priority]?.color as any">
                    {{ priorityLabels[workOrder.priority]?.label }}
                  </el-tag>
                </div>
                <div>
                  <el-tag type="info">{{ typeLabels[workOrder.type] }}</el-tag>
                </div>
              </div>
            </div>

            <!-- 工单详情 -->
            <el-descriptions :column="2" border>
              <el-descriptions-item label="工单编号">
                {{ workOrder.id }}
              </el-descriptions-item>
              <el-descriptions-item label="创建时间">
                {{ formatDate(workOrder.createdAt) }}
              </el-descriptions-item>
              <el-descriptions-item label="创建人">
                {{ workOrder.creator?.profile?.name || workOrder.creator?.phone || workOrder.createdBy }}
              </el-descriptions-item>
              <el-descriptions-item label="处理人">
                {{ workOrder.assignee?.profile?.name || workOrder.assignee?.phone || workOrder.assignedTo || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="接收时间">
                {{ formatDate(workOrder.receivedAt) }}
              </el-descriptions-item>
              <el-descriptions-item label="开始时间">
                {{ formatDate(workOrder.startedAt) }}
              </el-descriptions-item>
              <el-descriptions-item label="完成时间">
                {{ formatDate(workOrder.completedAt) }}
              </el-descriptions-item>
              <el-descriptions-item label="预期完成时间">
                {{ formatDate(workOrder.expectedCompletionAt) }}
              </el-descriptions-item>
              <el-descriptions-item label="工单描述" :span="2">
                <div class="whitespace-pre-wrap">{{ workOrder.description }}</div>
              </el-descriptions-item>
              <el-descriptions-item v-if="workOrder.attachments && workOrder.attachments.length > 0" label="附件" :span="2">
                <div class="flex flex-col gap-1">
                  <a
                    v-for="(attachment, index) in workOrder.attachments"
                    :key="index"
                    :href="attachment.url"
                    target="_blank"
                    class="text-blue-500 hover:underline"
                  >
                    {{ attachment.name || `附件 ${index + 1}` }}
                  </a>
                </div>
              </el-descriptions-item>
            </el-descriptions>

            <!-- 操作按钮 -->
            <div class="mt-4 flex gap-2">
              <el-button
                v-for="status in availableStatuses"
                :key="status.value"
                :type="status.color as any"
                @click="handleUpdateStatus(status.value)"
              >
                {{ status.label }}
              </el-button>
              <el-button type="primary" plain @click="handleAssign">
                <Icon icon="lucide:user-plus" class="mr-1" />
                分配工单
              </el-button>
            </div>
          </div>
        </el-tab-pane>

        <!-- 操作日志 -->
        <el-tab-pane label="操作日志" name="logs">
          <div v-loading="logsLoading" class="logs-content">
            <el-timeline v-if="logs.length > 0">
              <el-timeline-item
                v-for="log in logs"
                :key="log.id"
                :timestamp="formatDate(log.createdAt)"
                placement="top"
              >
                <div class="flex items-start gap-2">
                  <Icon
                    :icon="getLogIcon(log.action)"
                    :style="{ color: getLogColor(log.action) }"
                    class="text-xl"
                  />
                  <div class="flex-1">
                    <div class="font-medium">{{ log.content }}</div>
                    <div class="text-sm text-gray-500">
                      操作人: {{ log.operator?.profile?.name || log.operator?.phone || '系统' }}
                    </div>
                    <div v-if="log.oldStatus && log.newStatus" class="text-sm text-gray-500">
                      {{ statusLabels[log.oldStatus]?.label }} → {{ statusLabels[log.newStatus]?.label }}
                    </div>
                  </div>
                </div>
              </el-timeline-item>
            </el-timeline>
            <el-empty v-else description="暂无操作日志" />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <template #footer>
      <el-button @click="emit('update:visible', false)">关闭</el-button>
    </template>

    <!-- 状态更新对话框 -->
    <el-dialog
      v-model="statusDialogVisible"
      title="更新工单状态"
      width="500px"
      append-to-body
    >
      <el-form label-width="80px">
        <el-form-item label="新状态">
          <el-tag v-if="newStatus" :type="statusLabels[newStatus]?.color as any">
            {{ statusLabels[newStatus]?.label }}
          </el-tag>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="statusComment"
            type="textarea"
            :rows="3"
            placeholder="请输入状态变更备注（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="statusDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmStatusUpdate">确定</el-button>
      </template>
    </el-dialog>

    <!-- 分配工单对话框 -->
    <el-dialog
      v-model="assignDialogVisible"
      title="分配工单"
      width="500px"
      append-to-body
    >
      <el-form label-width="80px">
        <el-form-item label="分配给" required>
          <el-input
            v-model="assigneeUserId"
            placeholder="请输入用户ID"
          />
          <div class="text-xs text-gray-500 mt-1">
            提示：请输入要分配的用户ID
          </div>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="assignComment"
            type="textarea"
            :rows="3"
            placeholder="请输入分配备注（可选）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAssign">确定</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<style scoped>
.detail-content {
  max-height: 60vh;
  overflow-y: auto;
}

.logs-content {
  max-height: 50vh;
  overflow-y: auto;
}
</style>
