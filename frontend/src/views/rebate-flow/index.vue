<template>
  <div class="rebate-flow-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">返点流程跟进</h1>
        <p class="page-description">管理返点项目的完整流程跟进</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="createProject">
          <el-icon><Plus /></el-icon>
          新建项目
        </el-button>
        <el-button @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 数据概览 -->
    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ stats.totalProjects }}</div>
              <div class="stat-label">总项目数</div>
            </div>
            <div class="stat-icon total">
              <el-icon><Folder /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ stats.pendingProjects }}</div>
              <div class="stat-label">进行中项目</div>
            </div>
            <div class="stat-icon pending">
              <el-icon><Clock /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ stats.completedProjects }}</div>
              <div class="stat-label">已完成项目</div>
            </div>
            <div class="stat-icon completed">
              <el-icon><Check /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ formatCurrency(stats.totalAmount) }}</div>
              <div class="stat-label">总返点金额</div>
            </div>
            <div class="stat-icon amount">
              <el-icon><Money /></el-icon>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 流程步骤条 -->
    <div class="process-section">
      <el-card>
        <template #header>
          <span>流程步骤</span>
        </template>
        <el-steps :active="currentStep" finish-status="success">
          <el-step title="创建项目" description="填写项目基本信息"></el-step>
          <el-step title="合同审批" description="合同审核与签署"></el-step>
          <el-step title="签署开票" description="合同签署与开票"></el-step>
          <el-step title="客户汇款" description="等待客户付款"></el-step>
          <el-step title="返点结算" description="计算并发放返点"></el-step>
        </el-steps>
      </el-card>
    </div>

    <!-- 项目列表 -->
    <div class="table-section">
      <el-card>
        <template #header>
          <div class="table-header">
            <span>项目列表</span>
            <div class="table-actions">
              <el-input
                v-model="searchKeyword"
                placeholder="搜索项目名称或客户"
                style="width: 200px"
                clearable
              >
                <template #prefix>
                  <el-icon><Search /></el-icon>
                </template>
              </el-input>
            </div>
          </div>
        </template>

        <el-table
          :data="filteredProjects"
          v-loading="loading"
          style="width: 100%"
          @selection-change="handleSelectionChange"
        >
          <el-table-column type="selection" width="55"></el-table-column>
          <el-table-column prop="projectName" label="项目名称" min-width="150"></el-table-column>
          <el-table-column prop="client" label="客户" width="120"></el-table-column>
          <el-table-column prop="totalRebate" label="返点金额" width="120">
            <template #default="{ row }">
              {{ formatCurrency(row.totalRebate) }}
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="step" label="当前步骤" width="120">
            <template #default="{ row }">
              <el-progress :percentage="(row.step / 5) * 100" :show-text="false"></el-progress>
              <span class="step-text">步骤 {{ row.step }}/5</span>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="创建时间" width="180"></el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click="viewProject(row)">
                查看详情
              </el-button>
              <el-button type="success" size="small" @click="nextStep(row)" v-if="row.status === 'processing'">
                下一步
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </el-card>
    </div>

    <!-- 项目详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      title="项目详情"
      width="80%"
      :before-close="handleDetailClose"
    >
      <div v-if="selectedProject" class="project-detail">
        <el-descriptions title="项目信息" :column="2" border>
          <el-descriptions-item label="项目名称">{{ selectedProject.projectName }}</el-descriptions-item>
          <el-descriptions-item label="客户">{{ selectedProject.client }}</el-descriptions-item>
          <el-descriptions-item label="返点金额">{{ formatCurrency(selectedProject.totalRebate) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(selectedProject.status)">{{ getStatusText(selectedProject.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="当前步骤">步骤 {{ selectedProject.step }}/5</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ selectedProject.createTime }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { log } from '../../utils/logger'
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Refresh, Folder, Clock, Check, Money, Search } from '@element-plus/icons-vue'

// 响应式数据
const loading = ref(false)
const searchKeyword = ref('')
const currentStep = ref(0)
const showDetailDialog = ref(false)
const selectedProject = ref(null)

// 统计数据
const stats = reactive({
  totalProjects: 156,
  pendingProjects: 23,
  completedProjects: 133,
  totalAmount: 2580000
})

// 分页数据
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 项目数据
const projects = ref([
  {
    id: 1,
    projectName: '春季营销活动',
    client: '阿里巴巴',
    totalRebate: 150000,
    status: 'processing',
    step: 3,
    createTime: '2024-01-15 10:30:00'
  },
  {
    id: 2,
    projectName: '618大促',
    client: '京东科技',
    totalRebate: 280000,
    status: 'completed',
    step: 5,
    createTime: '2024-02-20 14:20:00'
  },
  {
    id: 3,
    projectName: '双11预热',
    client: '天猫国际',
    totalRebate: 320000,
    status: 'processing',
    step: 2,
    createTime: '2024-03-10 09:15:00'
  }
])

// 计算属性
const filteredProjects = computed(() => {
  if (!searchKeyword.value) return projects.value
  return projects.value.filter(project => 
    project.projectName.includes(searchKeyword.value) || 
    project.client.includes(searchKeyword.value)
  )
})

// 方法
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  }).format(amount)
}

const getStatusType = (status: string) => {
  const statusMap = {
    'pending': 'warning',
    'processing': 'primary',
    'completed': 'success',
    'overdue': 'danger'
  }
  return statusMap[status] || 'info'
}

const getStatusText = (status: string) => {
  const statusMap = {
    'pending': '待处理',
    'processing': '进行中',
    'completed': '已完成',
    'overdue': '已逾期'
  }
  return statusMap[status] || '未知'
}

const createProject = () => {
  ElMessage.info('新建项目功能开发中...')
}

const refreshData = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
    ElMessage.success('数据刷新成功')
  }, 1000)
}

const viewProject = (project: any) => {
  selectedProject.value = project
  showDetailDialog.value = true
}

const nextStep = (project: any) => {
  if (project.step < 5) {
    project.step++
    ElMessage.success('步骤推进成功')
  }
}

const handleSelectionChange = (selection: any[]) => {
  log.debug('选中项目:', selection)
}

const handleSizeChange = (size: number) => {
  pagination.pageSize = size
}

const handleCurrentChange = (page: number) => {
  pagination.page = page
}

const handleDetailClose = () => {
  showDetailDialog.value = false
  selectedProject.value = null
}

// 生命周期
onMounted(() => {
  pagination.total = projects.value.length
})
</script>

<style scoped lang="scss">
.rebate-flow-container {
  padding: 24px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  
  .header-content {
    .page-title {
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 600;
      color: #1f2937;
    }
    
    .page-description {
      margin: 0;
      color: #6b7280;
      font-size: 14px;
    }
  }
  
  .header-actions {
    display: flex;
    gap: 12px;
  }
}

.stats-section {
  margin-bottom: 24px;
  
  .stat-card {
    .stat-content {
      display: flex;
      flex-direction: column;
      
      .stat-value {
        font-size: 24px;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 4px;
      }
      
      .stat-label {
        font-size: 14px;
        color: #6b7280;
      }
    }
    
    .stat-icon {
      position: absolute;
      top: 16px;
      right: 16px;
      width: 40px;
      height: 40px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      
      &.total {
        background-color: #e3f2fd;
        color: #1976d2;
      }
      
      &.pending {
        background-color: #fff3e0;
        color: #f57c00;
      }
      
      &.completed {
        background-color: #e8f5e8;
        color: #388e3c;
      }
      
      &.amount {
        background-color: #fce4ec;
        color: #c2185b;
      }
    }
  }
}

.process-section {
  margin-bottom: 24px;
}

.table-section {
  .table-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .step-text {
    font-size: 12px;
    color: #6b7280;
    margin-left: 8px;
  }
  
  .pagination-wrapper {
    display: flex;
    justify-content: center;
    margin-top: 20px;
  }
}

.project-detail {
  padding: 16px 0;
}

:deep(.el-card) {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

:deep(.el-card__header) {
  background-color: #fafafa;
  border-bottom: 1px solid #e5e7eb;
}
</style>