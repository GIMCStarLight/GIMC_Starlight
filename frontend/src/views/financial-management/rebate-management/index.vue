<template>
  <div class="rebate-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <h1 class="page-title">返点管理</h1>
      <p class="page-description">管理返点记录、查看财务指标和趋势分析</p>
    </div>

    <!-- 财务指标看板 -->
    <div class="dashboard-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="metric-card">
            <div class="metric-content">
              <div class="metric-value">{{ formatCurrency(dashboardData.totalRebate) }}</div>
              <div class="metric-label">总返点金额</div>
            </div>
            <div class="metric-icon total">
              <el-icon><Money /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="metric-card">
            <div class="metric-content">
              <div class="metric-value">{{ formatCurrency(dashboardData.pendingRebate) }}</div>
              <div class="metric-label">待收返点</div>
            </div>
            <div class="metric-icon pending">
              <el-icon><Clock /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="metric-card">
            <div class="metric-content">
              <div class="metric-value">{{ formatCurrency(dashboardData.collectedRebate) }}</div>
              <div class="metric-label">已收返点</div>
            </div>
            <div class="metric-icon collected">
              <el-icon><Check /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="metric-card">
            <div class="metric-content">
              <div class="metric-value">{{ dashboardData.recordCount }}</div>
              <div class="metric-label">返点记录数</div>
            </div>
            <div class="metric-icon count">
              <el-icon><Document /></el-icon>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 图表区域 -->
    <div class="charts-section">
      <el-row :gutter="20">
        <el-col :span="16">
          <el-card>
            <template #header>
              <span>返点趋势分析</span>
            </template>
            <div ref="trendChartRef" class="chart-container"></div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card>
            <template #header>
              <span>状态分布</span>
            </template>
            <div ref="statusChartRef" class="chart-container"></div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 搜索和筛选 -->
    <el-card class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="供应商">
          <el-input 
            v-model="searchForm.supplierName" 
            placeholder="请输入供应商名称" 
            clearable 
          />
        </el-form-item>
        <el-form-item label="达人">
          <el-input 
            v-model="searchForm.influencerName" 
            placeholder="请输入达人名称" 
            clearable 
          />
        </el-form-item>
        <el-form-item label="返点状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
            <el-option label="待收取" value="pending" />
            <el-option label="已收取" value="collected" />
            <el-option label="已过期" value="expired" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button type="success" @click="handleRefresh">刷新数据</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 返点记录列表 -->
    <el-card class="table-card">
      <template #header>
        <div class="table-header">
          <span>返点记录列表</span>
          <div class="header-actions">
            <el-button 
              type="success" 
              :disabled="selectedIds.length === 0"
              @click="handleBatchCollect"
            >
              批量收取
            </el-button>
          </div>
        </div>
      </template>

      <el-table 
        :data="rebateList" 
        v-loading="loading"
        @selection-change="handleSelectionChange"
        @sort-change="handleSortChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="记录ID" width="100" sortable="custom" />
        <el-table-column prop="supplierName" label="供应商" min-width="150" />
        <el-table-column prop="influencerName" label="达人" min-width="150" />
        <el-table-column prop="projectName" label="项目名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="baseAmount" label="基础金额" width="120" sortable="custom">
          <template #default="{ row }">
            {{ formatCurrency(row.baseAmount) }}
          </template>
        </el-table-column>
        <el-table-column prop="rebateRate" label="返点率" width="100">
          <template #default="{ row }">
            {{ row.rebateRate }}%
          </template>
        </el-table-column>
        <el-table-column prop="rebateAmount" label="返点金额" width="120" sortable="custom">
          <template #default="{ row }">
            {{ formatCurrency(row.rebateAmount) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusColor(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="dueDate" label="到期时间" width="120">
          <template #default="{ row }">
            {{ formatDate(row.dueDate) }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="120">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleViewDetail(row)">
              查看
            </el-button>
            <el-button 
              v-if="row.status === 'pending'" 
              type="success" 
              size="small" 
              @click="handleCollect(row)"
            >
              收取
            </el-button>
            <el-button 
              v-if="row.status === 'pending'" 
              type="warning" 
              size="small" 
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="pagination.currentPage"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </el-card>

    <!-- 返点详情对话框 -->
    <el-dialog
      v-model="detailVisible"
      title="返点详情"
      width="600px"
      :close-on-click-modal="false"
    >
      <div v-if="selectedRebate" class="rebate-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="记录ID">{{ selectedRebate.id }}</el-descriptions-item>
          <el-descriptions-item label="供应商">{{ selectedRebate.supplierName }}</el-descriptions-item>
          <el-descriptions-item label="达人">{{ selectedRebate.influencerName }}</el-descriptions-item>
          <el-descriptions-item label="项目名称">{{ selectedRebate.projectName }}</el-descriptions-item>
          <el-descriptions-item label="基础金额">{{ formatCurrency(selectedRebate.baseAmount) }}</el-descriptions-item>
          <el-descriptions-item label="返点率">{{ selectedRebate.rebateRate }}%</el-descriptions-item>
          <el-descriptions-item label="返点金额">{{ formatCurrency(selectedRebate.rebateAmount) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusColor(selectedRebate.status)">
              {{ getStatusLabel(selectedRebate.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="到期时间">{{ formatDate(selectedRebate.dueDate) }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(selectedRebate.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="收取时间" v-if="selectedRebate.collectedAt">
            {{ formatDate(selectedRebate.collectedAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="备注" span="2" v-if="selectedRebate.remark">
            {{ selectedRebate.remark }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
        <el-button 
          v-if="selectedRebate?.status === 'pending'" 
          type="success" 
          @click="handleCollect(selectedRebate)"
        >
          收取返点
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Money, Clock, Check, Document } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { log } from '../../../utils/logger'

// 模拟API接口
const rebateManagementApi = {
  getRebateRecords: async (params: any) => {
    // 模拟数据
    const mockData = [
      {
        id: 1,
        supplierName: '优质供应商A',
        influencerName: '时尚达人小王',
        projectName: '春季新品推广活动',
        baseAmount: 10000,
        rebateRate: 5.5,
        rebateAmount: 550,
        status: 'pending',
        dueDate: '2024-02-15',
        createdAt: '2024-01-15 10:30:00',
        collectedAt: null,
        remark: '春季推广项目返点'
      },
      {
        id: 2,
        supplierName: '品牌供应商B',
        influencerName: '美妆达人小李',
        projectName: '美妆产品测评',
        baseAmount: 8000,
        rebateRate: 6.0,
        rebateAmount: 480,
        status: 'collected',
        dueDate: '2024-01-30',
        createdAt: '2024-01-10 14:20:00',
        collectedAt: '2024-01-25 09:15:00',
        remark: '美妆测评项目返点'
      },
      {
        id: 3,
        supplierName: '科技供应商C',
        influencerName: '数码达人小张',
        projectName: '智能设备体验',
        baseAmount: 15000,
        rebateRate: 4.5,
        rebateAmount: 675,
        status: 'expired',
        dueDate: '2024-01-05',
        createdAt: '2023-12-20 16:45:00',
        collectedAt: null,
        remark: '数码产品体验返点'
      }
    ]
    
    return {
      success: true,
      data: {
        items: mockData,
        total: mockData.length
      },
      message: '获取成功'
    }
  },
  
  getDashboardData: async () => {
    return {
      success: true,
      data: {
        totalRebate: 125000,
        pendingRebate: 45000,
        collectedRebate: 80000,
        recordCount: 156
      },
      message: '获取成功'
    }
  },
  
  collectRebate: async (id: number) => {
    log.debug('收取返点:', id)
    return { success: true, message: '收取成功' }
  },
  
  batchCollectRebate: async (ids: number[]) => {
    log.debug('批量收取返点:', ids)
    return { success: true, message: '批量收取成功' }
  }
}

// 类型定义
interface RebateRecord {
  id: number
  supplierName: string
  influencerName: string
  projectName: string
  baseAmount: number
  rebateRate: number
  rebateAmount: number
  status: 'pending' | 'collected' | 'expired'
  dueDate: string
  createdAt: string
  collectedAt?: string | null
  remark?: string
}

interface DashboardData {
  totalRebate: number
  pendingRebate: number
  collectedRebate: number
  recordCount: number
}

// 响应式数据
const loading = ref(false)
const detailVisible = ref(false)

const searchForm = reactive({
  supplierName: '',
  influencerName: '',
  status: '',
  dateRange: [] as string[]
})

const rebateList = ref<RebateRecord[]>([])
const selectedIds = ref<number[]>([])
const selectedRebate = ref<RebateRecord | null>(null)

const dashboardData = ref<DashboardData>({
  totalRebate: 0,
  pendingRebate: 0,
  collectedRebate: 0,
  recordCount: 0
})

const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

const sortParams = reactive({
  prop: '',
  order: ''
})

// 图表引用
const trendChartRef = ref<HTMLElement>()
const statusChartRef = ref<HTMLElement>()
let trendChart: echarts.ECharts | null = null
let statusChart: echarts.ECharts | null = null

// 方法
const handleSearch = () => {
  pagination.currentPage = 1
  loadRebateRecords()
}

const handleReset = () => {
  searchForm.supplierName = ''
  searchForm.influencerName = ''
  searchForm.status = ''
  searchForm.dateRange = []
  pagination.currentPage = 1
  loadRebateRecords()
}

const handleRefresh = () => {
  loadRebateRecords()
  loadDashboardData()
}

const handleSelectionChange = (selection: RebateRecord[]) => {
  selectedIds.value = selection.map(item => item.id)
}

const handleSortChange = ({ prop, order }: { prop: string; order: string }) => {
  sortParams.prop = prop
  sortParams.order = order
  loadRebateRecords()
}

const handleViewDetail = (row: RebateRecord) => {
  selectedRebate.value = row
  detailVisible.value = true
}

const handleCollect = async (row: RebateRecord) => {
  try {
    await ElMessageBox.confirm('确认收取该返点？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const response = await rebateManagementApi.collectRebate(row.id)
    if (response.success) {
      ElMessage.success(response.message)
      detailVisible.value = false
      loadRebateRecords()
      loadDashboardData()
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    // 用户取消
  }
}

const handleBatchCollect = async () => {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请选择要收取的返点记录')
    return
  }
  
  try {
    await ElMessageBox.confirm(`确认收取选中的 ${selectedIds.value.length} 条返点记录？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const response = await rebateManagementApi.batchCollectRebate(selectedIds.value)
    if (response.success) {
      ElMessage.success(response.message)
      selectedIds.value = []
      loadRebateRecords()
      loadDashboardData()
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    // 用户取消
  }
}

const handleEdit = (row: RebateRecord) => {
  // 编辑返点记录的逻辑
  ElMessage.info('编辑功能待实现')
}

const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  pagination.currentPage = 1
  loadRebateRecords()
}

const handleCurrentChange = (page: number) => {
  pagination.currentPage = page
  loadRebateRecords()
}

const getStatusColor = (status: string) => {
  const colorMap: { [key: string]: string } = {
    pending: 'warning',
    collected: 'success',
    expired: 'danger'
  }
  return colorMap[status] || 'info'
}

const getStatusLabel = (status: string) => {
  const labelMap: { [key: string]: string } = {
    pending: '待收取',
    collected: '已收取',
    expired: '已过期'
  }
  return labelMap[status] || status
}

const formatCurrency = (amount: number) => {
  return `¥${amount.toFixed(2)}`
}

const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString()
}

// 数据加载方法
const loadRebateRecords = async () => {
  loading.value = true
  try {
    const params = {
      supplierName: searchForm.supplierName || undefined,
      influencerName: searchForm.influencerName || undefined,
      status: searchForm.status || undefined,
      startDate: searchForm.dateRange[0] || undefined,
      endDate: searchForm.dateRange[1] || undefined,
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      sortBy: sortParams.prop || undefined,
      sortOrder: sortParams.order || undefined
    }
    
    const response = await rebateManagementApi.getRebateRecords(params)
    if (response.success) {
      rebateList.value = response.data.items
      pagination.total = response.data.total
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const loadDashboardData = async () => {
  try {
    const response = await rebateManagementApi.getDashboardData()
    if (response.success) {
      dashboardData.value = response.data
    }
  } catch (error) {
    log.error('加载仪表板数据失败:', error)
  }
}

// 初始化图表
const initCharts = () => {
  nextTick(() => {
    if (trendChartRef.value) {
      trendChart = echarts.init(trendChartRef.value)
      const trendOption = {
        tooltip: {
          trigger: 'axis'
        },
        legend: {
          data: ['总返点', '已收取', '待收取']
        },
        xAxis: {
          type: 'category',
          data: ['1月', '2月', '3月', '4月', '5月', '6月']
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            formatter: '¥{value}'
          }
        },
        series: [
          {
            name: '总返点',
            type: 'line',
            data: [12000, 15000, 18000, 22000, 25000, 28000]
          },
          {
            name: '已收取',
            type: 'line',
            data: [8000, 10000, 12000, 15000, 18000, 20000]
          },
          {
            name: '待收取',
            type: 'line',
            data: [4000, 5000, 6000, 7000, 7000, 8000]
          }
        ]
      }
      trendChart.setOption(trendOption)
    }
    
    if (statusChartRef.value) {
      statusChart = echarts.init(statusChartRef.value)
      const statusOption = {
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        legend: {
          orient: 'vertical',
          left: 'left'
        },
        series: [
          {
            name: '返点状态',
            type: 'pie',
            radius: '50%',
            data: [
              { value: dashboardData.value.collectedRebate, name: '已收取' },
              { value: dashboardData.value.pendingRebate, name: '待收取' },
              { value: 5000, name: '已过期' }
            ]
          }
        ]
      }
      statusChart.setOption(statusOption)
    }
  })
}

onMounted(() => {
  loadRebateRecords()
  loadDashboardData()
  initCharts()
})
</script>

<style scoped>
.rebate-management {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
}

.page-description {
  color: #606266;
  margin: 0;
}

.dashboard-section {
  margin-bottom: 20px;
}

.metric-card {
  position: relative;
  overflow: hidden;
}

.metric-card .el-card__body {
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.metric-content {
  flex: 1;
}

.metric-value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.metric-label {
  font-size: 14px;
  color: #909399;
}

.metric-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.metric-icon.total {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.metric-icon.pending {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.metric-icon.collected {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.metric-icon.count {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.charts-section {
  margin-bottom: 20px;
}

.chart-container {
  height: 300px;
}

.search-card {
  margin-bottom: 20px;
}

.table-card .table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.rebate-detail {
  padding: 20px 0;
}
</style>