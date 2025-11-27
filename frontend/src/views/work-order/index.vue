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

    workOrderList.value = response.data.items
    pagination.total = response.data.total
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
  <div class="work-order-management p-4">
    <!-- 统计卡片 -->
    <div class="mb-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
      <div class="stat-card">
        <div class="stat-label">全部工单</div>
        <div class="stat-value">{{ statistics.total }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">待接收</div>
        <div class="stat-value text-blue-500">{{ statistics.pending }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">已接收</div>
        <div class="stat-value text-green-500">{{ statistics.received }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">处理中</div>
        <div class="stat-value text-orange-500">{{ statistics.inProgress }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">已完成</div>
        <div class="stat-value text-green-600">{{ statistics.completed }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">我创建的</div>
        <div class="stat-value text-purple-500">{{ statistics.myCreated }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">分配给我</div>
        <div class="stat-value text-indigo-500">{{ statistics.assignedToMe }}</div>
      </div>
    </div>

    <!-- 页面头部 -->
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold">工单管理</h2>
        <p class="mt-1 text-sm text-gray-500">管理和跟踪开发工单</p>
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

    <!-- 搜索栏 -->
    <div class="mb-4 rounded-lg bg-white p-4 shadow-sm">
      <el-form :model="queryParams" inline>
        <el-form-item label="关键词">
          <el-input
            v-model="queryParams.keyword"
            placeholder="搜索标题或描述"
            clearable
            style="width: 200px"
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="事务类型">
          <el-select
            v-model="queryParams.type"
            placeholder="请选择"
            clearable
            style="width: 150px"
          >
            <el-option
              v-for="item in typeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="工单状态">
          <el-select
            v-model="queryParams.status"
            placeholder="请选择"
            clearable
            style="width: 120px"
          >
            <el-option
              v-for="item in statusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-select
            v-model="queryParams.priority"
            placeholder="请选择"
            clearable
            style="width: 100px"
          >
            <el-option
              v-for="item in priorityOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <Icon icon="lucide:search" class="mr-1" />
            搜索
          </el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 标签页 -->
    <el-tabs v-model="activeTab" @tab-change="handleTabChange">
      <el-tab-pane label="全部工单" name="all" />
      <el-tab-pane label="我创建的" name="myCreated" />
      <el-tab-pane label="分配给我" name="assignedToMe" />
    </el-tabs>

    <!-- 工单列表 -->
    <div class="rounded-lg bg-white shadow-sm">
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

        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <div class="flex gap-1">
              <el-button type="primary" size="small" @click="handleViewDetail(row)">
                <Icon icon="lucide:eye" size="14" />
              </el-button>
              <el-button
                v-if="row.status === WorkOrderStatus.PENDING"
                type="danger"
                size="small"
                @click="handleDelete(row)"
              >
                <Icon icon="lucide:trash-2" size="14" />
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="flex justify-end p-4">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </div>

    <!-- 创建工单对话框 - 将在单独组件中实现 -->
    <div v-if="createDialogVisible">
      <!-- TODO: 创建工单表单组件 -->
    </div>

    <!-- 工单详情对话框 - 将在单独组件中实现 -->
    <div v-if="detailDialogVisible && currentWorkOrder">
      <!-- TODO: 工单详情组件 -->
    </div>
  </div>
</template>

<style scoped>
.stat-card {
  @apply rounded-lg bg-white p-4 shadow-sm;
}

.stat-label {
  @apply text-sm text-gray-500 mb-1;
}

.stat-value {
  @apply text-2xl font-bold;
}

:deep(.el-table .el-table__cell) {
  padding: 12px 0;
}
</style>
