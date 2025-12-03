<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { IconifyIcon as Icon } from '@vben/icons'
import {
  getWorkOrderList,
  getMyCreatedWorkOrders,
  getAssignedToMeWorkOrders,
  getWorkOrderStatistics,
  deleteWorkOrder,
  updateWorkOrderStatus,
  assignWorkOrder,
  type WorkOrder,
  type QueryWorkOrderParams,
  type WorkOrderStatistics,
  WorkOrderType,
  WorkOrderStatus,
  WorkOrderPriority,
} from '../../api/work-order'
import CreateWorkOrderDialog from './components/CreateWorkOrderDialog.vue'
import WorkOrderDetailDialog from './components/WorkOrderDetailDialog.vue'

// 页面状态
const loading = ref(false)
const workOrderList = ref<WorkOrder[]>([])
const statistics = ref<WorkOrderStatistics>({
  total: 0,
  pending: 0,
  received: 0,
  inProgress: 0,
  completed: 0,
  myCreated: 0,
  assignedToMe: 0,
})

// 分页参数
const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0,
})

// 查询参数
const queryParams = reactive<QueryWorkOrderParams>({
  keyword: '',
  type: undefined,
  status: undefined,
  priority: undefined,
  sortBy: 'created_at',
  sortOrder: 'DESC',
})

// 当前选择的标签页
const activeTab = ref<'all' | 'myCreated' | 'assignedToMe'>('all')

// 工单类型选项
const typeOptions = [
  { label: '新增功能', value: WorkOrderType.NEW_FEATURE },
  { label: '系统改造', value: WorkOrderType.SYSTEM_REFACTOR },
  { label: '问题调试', value: WorkOrderType.BUG_FIX },
  { label: '性能优化', value: WorkOrderType.OPTIMIZATION },
  { label: '需求变更', value: WorkOrderType.REQUIREMENT_CHANGE },
  { label: '其他', value: WorkOrderType.OTHER },
]

// 工单状态选项
const statusOptions = [
  { label: '待接收', value: WorkOrderStatus.PENDING, color: 'info' },
  { label: '已接收', value: WorkOrderStatus.RECEIVED, color: 'primary' },
  { label: '处理中', value: WorkOrderStatus.IN_PROGRESS, color: 'warning' },
  { label: '测试中', value: WorkOrderStatus.TESTING, color: 'warning' },
  { label: '已完成', value: WorkOrderStatus.COMPLETED, color: 'success' },
  { label: '已拒绝', value: WorkOrderStatus.REJECTED, color: 'danger' },
  { label: '已取消', value: WorkOrderStatus.CANCELLED, color: 'info' },
]

// 优先级选项
const priorityOptions = [
  { label: '低', value: WorkOrderPriority.LOW, color: 'info' },
  { label: '中', value: WorkOrderPriority.MEDIUM, color: 'primary' },
  { label: '高', value: WorkOrderPriority.HIGH, color: 'warning' },
  { label: '紧急', value: WorkOrderPriority.URGENT, color: 'danger' },
]

// 创建工单对话框
const createDialogVisible = ref(false)
const detailDialogVisible = ref(false)
const currentWorkOrder = ref<WorkOrder | null>(null)

// 获取类型标签
const getTypeLabel = (type: WorkOrderType) => {
  return typeOptions.find(t => t.value === type)?.label || type
}

// 获取状态标签
const getStatusOption = (status: WorkOrderStatus) => {
  return statusOptions.find(s => s.value === status) || { label: status, color: 'info' }
}

// 获取优先级标签
const getPriorityOption = (priority: WorkOrderPriority) => {
  return priorityOptions.find(p => p.value === priority) || { label: priority, color: 'info' }
}

// 格式化时间
const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

// 加载工单列表
const loadWorkOrders = async () => {
  loading.value = true
  try {
    const params = {
      ...queryParams,
      page: pagination.page,
      limit: pagination.limit,
    }

    let response
    if (activeTab.value === 'myCreated') {
      response = await getMyCreatedWorkOrders(params)
    } else if (activeTab.value === 'assignedToMe') {
      response = await getAssignedToMeWorkOrders(params)
    } else {
      response = await getWorkOrderList(params)
    }

    // requestClient 已自动解包 response.data.data，直接使用 response
    workOrderList.value = response.items
    pagination.total = response.total
  } catch (error: any) {
    ElMessage.error(error.message || '加载工单列表失败')
  } finally {
    loading.value = false
  }
}

// 加载统计信息
const loadStatistics = async () => {
  try {
    const response = await getWorkOrderStatistics()
    statistics.value = response
  } catch (error: any) {
    console.error('加载统计信息失败:', error)
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  loadWorkOrders()
}

// 重置搜索
const handleReset = () => {
  queryParams.keyword = ''
  queryParams.type = undefined
  queryParams.status = undefined
  queryParams.priority = undefined
  handleSearch()
}

// 快速筛选状态
const quickFilter = (status: WorkOrderStatus) => {
  queryParams.status = status
  pagination.page = 1
  activeTab.value = 'all'
  loadWorkOrders()
}

// 切换标签
const handleTabChange = () => {
  pagination.page = 1
  loadWorkOrders()
}

// 查看详情
const handleViewDetail = (row: WorkOrder) => {
  currentWorkOrder.value = row
  detailDialogVisible.value = true
}

// 创建工单
const handleCreate = () => {
  createDialogVisible.value = true
}

// 创建成功回调
const handleCreateSuccess = () => {
  loadWorkOrders()
  loadStatistics()
}

// 详情对话框操作成功回调
const handleDetailSuccess = () => {
  loadWorkOrders()
  loadStatistics()
}

// 删除工单
const handleDelete = async (row: WorkOrder) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除这个工单吗？删除后无法恢复。',
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    await deleteWorkOrder(row.id)
    ElMessage.success('删除成功')
    loadWorkOrders()
    loadStatistics()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '删除失败')
    }
  }
}

// 刷新
const handleRefresh = () => {
  loadWorkOrders()
  loadStatistics()
}

// 页码改变
const handlePageChange = (page: number) => {
  pagination.page = page
  loadWorkOrders()
}

// 每页数量改变
const handleSizeChange = (size: number) => {
  pagination.limit = size
  pagination.page = 1
  loadWorkOrders()
}

// 挂载时加载数据
onMounted(() => {
  loadWorkOrders()
  loadStatistics()
})
</script>

<template>
  <div class="work-order-management">
    <!-- 统计条 - 精简版 -->
    <div class="stats-bar">
      <div class="stat-item stat-item-total">
        <Icon icon="lucide:clipboard-list" :size="20" />
        <span class="stat-text">全部</span>
        <span class="stat-number">{{ statistics.total }}</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item stat-item-pending" @click="quickFilter(WorkOrderStatus.PENDING)">
        <Icon icon="lucide:clock" :size="18" />
        <span class="stat-text">待接收</span>
        <span class="stat-number">{{ statistics.pending }}</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item stat-item-received" @click="quickFilter(WorkOrderStatus.RECEIVED)">
        <Icon icon="lucide:check-circle" :size="18" />
        <span class="stat-text">已接收</span>
        <span class="stat-number">{{ statistics.received }}</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item stat-item-progress" @click="quickFilter(WorkOrderStatus.IN_PROGRESS)">
        <Icon icon="lucide:loader" :size="18" />
        <span class="stat-text">处理中</span>
        <span class="stat-number">{{ statistics.inProgress }}</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item stat-item-completed" @click="quickFilter(WorkOrderStatus.COMPLETED)">
        <Icon icon="lucide:check-circle-2" :size="18" />
        <span class="stat-text">已完成</span>
        <span class="stat-number">{{ statistics.completed }}</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item stat-item-my" @click="activeTab = 'myCreated'; handleTabChange()">
        <Icon icon="lucide:user" :size="18" />
        <span class="stat-text">我创建的</span>
        <span class="stat-number">{{ statistics.myCreated }}</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat-item stat-item-assigned" @click="activeTab = 'assignedToMe'; handleTabChange()">
        <Icon icon="lucide:user-check" :size="18" />
        <span class="stat-text">分配给我</span>
        <span class="stat-number">{{ statistics.assignedToMe }}</span>
      </div>
    </div>

    <!-- 页面头部 -->
    <el-card class="mb-4" shadow="never">
      <div class="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 class="text-xl font-semibold flex items-center gap-2">
            <Icon icon="lucide:clipboard-list" :size="24" />
            工单管理
          </h2>
          <p class="mt-1 text-sm text-gray-500">管理和跟踪开发工单，协作高效完成任务</p>
        </div>
        <div class="flex gap-2">
          <el-button type="primary" @click="handleCreate">
            <Icon icon="lucide:plus" class="mr-1" />
            创建工单
          </el-button>
          <el-button @click="handleRefresh">
            <Icon icon="lucide:refresh-cw" class="mr-1" />
            刷新
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 搜索栏 -->
    <el-card class="mb-4" shadow="never">
      <el-form :model="queryParams">
        <el-row :gutter="16">
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label="关键词">
              <el-input
                v-model="queryParams.keyword"
                placeholder="搜索标题或描述"
                clearable
                @keyup.enter="handleSearch"
              >
                <template #prefix>
                  <Icon icon="lucide:search" />
                </template>
              </el-input>
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="6" :md="6" :lg="4">
            <el-form-item label="事务类型">
              <el-select
                v-model="queryParams.type"
                placeholder="请选择"
                clearable
              >
                <el-option
                  v-for="item in typeOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="6" :md="6" :lg="4">
            <el-form-item label="工单状态">
              <el-select
                v-model="queryParams.status"
                placeholder="请选择"
                clearable
              >
                <el-option
                  v-for="item in statusOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="12" :sm="6" :md="6" :lg="4">
            <el-form-item label="优先级">
              <el-select
                v-model="queryParams.priority"
                placeholder="请选择"
                clearable
              >
                <el-option
                  v-for="item in priorityOptions"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :xs="24" :sm="12" :md="8" :lg="6">
            <el-form-item label=" ">
              <div class="flex gap-2 w-full">
                <el-button type="primary" @click="handleSearch" class="flex-1">
                  <Icon icon="lucide:search" class="mr-1" />
                  搜索
                </el-button>
                <el-button @click="handleReset" class="flex-1">
                  <Icon icon="lucide:rotate-ccw" class="mr-1" />
                  重置
                </el-button>
              </div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <!-- 标签页 -->
    <el-card shadow="never" class="work-order-table-card">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane name="all">
          <template #label>
            <span class="flex items-center gap-1">
              <Icon icon="lucide:list" />
              全部工单
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane name="myCreated">
          <template #label>
            <span class="flex items-center gap-1">
              <Icon icon="lucide:user" />
              我创建的
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane name="assignedToMe">
          <template #label>
            <span class="flex items-center gap-1">
              <Icon icon="lucide:user-check" />
              分配给我
            </span>
          </template>
        </el-tab-pane>
      </el-tabs>
      <el-table
        v-loading="loading"
        :data="workOrderList"
        class="w-full"
        stripe
      >
        <el-table-column prop="title" label="工单标题" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="flex items-center">
              <el-tag
                :type="getPriorityOption(row.priority).color"
                size="small"
                class="mr-2"
              >
                {{ getPriorityOption(row.priority).label }}
              </el-tag>
              <span class="font-medium cursor-pointer hover:text-blue-500" @click="handleViewDetail(row)">
                {{ row.title }}
              </span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="type" label="事务类型" width="120">
          <template #default="{ row }">
            <el-tag size="small">{{ getTypeLabel(row.type) }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusOption(row.status).color" size="small">
              {{ getStatusOption(row.status).label }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="creator" label="创建人" width="120">
          <template #default="{ row }">
            {{ row.creator?.profile?.name || row.creator?.phone || '-' }}
          </template>
        </el-table-column>

        <el-table-column prop="assignee" label="处理人" width="120">
          <template #default="{ row }">
            {{ row.assignee?.profile?.name || row.assignee?.phone || '未分配' }}
          </template>
        </el-table-column>

        <el-table-column prop="createdAt" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <div class="flex gap-1">
              <el-button type="primary" size="small" link @click="handleViewDetail(row)">
                <Icon icon="lucide:eye" class="mr-1" :size="14" />
                查看
              </el-button>
              <el-button
                v-if="row.status === WorkOrderStatus.PENDING"
                type="danger"
                size="small"
                link
                @click="handleDelete(row)"
              >
                <Icon icon="lucide:trash-2" class="mr-1" :size="14" />
                删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="flex justify-between items-center p-4 border-t">
        <div class="text-sm text-gray-500">
          共 {{ pagination.total }} 条记录，当前第 {{ pagination.page }} / {{ Math.ceil(pagination.total / pagination.limit) }} 页
        </div>
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="sizes, prev, pager, next, jumper"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <!-- 创建工单对话框 -->
    <CreateWorkOrderDialog
      v-model:visible="createDialogVisible"
      @success="handleCreateSuccess"
    />

    <!-- 工单详情对话框 -->
    <WorkOrderDetailDialog
      v-model:visible="detailDialogVisible"
      :work-order-id="currentWorkOrder?.id"
      @success="handleDetailSuccess"
    />
  </div>
</template>

<style scoped>
.work-order-management {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 60px);
}

/* 精简统计条 */
.stats-bar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 12px 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  margin-bottom: 16px;
  overflow-x: auto;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.stat-item:hover {
  background: #f5f7fa;
}

.stat-item-total {
  cursor: default;
}

.stat-item-total:hover {
  background: transparent;
}

.stat-text {
  font-size: 13px;
  color: #606266;
  font-weight: 500;
}

.stat-number {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.stat-divider {
  width: 1px;
  height: 24px;
  background: #e5e7eb;
  flex-shrink: 0;
}

/* 统计项颜色 */
.stat-item-total {
  color: #667eea;
}

.stat-item-pending {
  color: #3b82f6;
}

.stat-item-received {
  color: #10b981;
}

.stat-item-progress {
  color: #f59e0b;
}

.stat-item-completed {
  color: #059669;
}

.stat-item-my {
  color: #8b5cf6;
}

.stat-item-assigned {
  color: #6366f1;
}

/* 表格卡片 */
.work-order-table-card {
  border-radius: 8px;
  overflow: hidden;
}

.work-order-table-card :deep(.el-card__body) {
  padding: 0;
}

.work-order-table-card :deep(.el-tabs__header) {
  padding: 0 20px;
  margin: 0;
}

.work-order-table-card :deep(.el-tabs__nav-wrap) {
  padding-top: 12px;
}

.work-order-table {
  min-height: 400px;
}

:deep(.el-table) {
  font-size: 14px;
}

:deep(.el-table .el-table__cell) {
  padding: 14px 0;
}

:deep(.el-table thead) {
  background: #fafafa;
}

:deep(.el-table thead th) {
  background: #fafafa;
  color: #606266;
  font-weight: 600;
}

/* 响应式调整 */
@media (max-width: 1200px) {
  .stats-bar {
    justify-content: flex-start;
  }
}

@media (max-width: 768px) {
  .work-order-management {
    padding: 12px;
  }
  
  .stats-bar {
    padding: 10px 12px;
    gap: 1px;
  }
  
  .stat-item {
    padding: 6px 10px;
    gap: 6px;
  }
  
  .stat-text {
    font-size: 12px;
  }
  
  .stat-number {
    font-size: 16px;
  }
}
</style>
