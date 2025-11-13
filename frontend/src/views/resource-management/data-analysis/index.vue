<template>
  <div class="page-container">
    <div class="content-card">
      <!-- 统一页头 -->
      <div class="simple-page-header">
        <div class="header-content">
          <h1 class="page-title">数据分析中心</h1>
        </div>
        <div class="header-actions">
          <el-button type="primary">
            <el-icon><User /></el-icon>
            新增监控
          </el-button>
        </div>
      </div>
    <!-- 关键指标卡片 -->
    <el-row :gutter="20" class="metrics-row">
      <el-col :span="6">
        <el-card class="metric-card">
          <div class="metric-content">
            <div class="metric-icon supplier">
              <el-icon><Shop /></el-icon>
            </div>
            <div class="metric-info">
              <div class="metric-value">{{ businessData.totalSuppliers }}</div>
              <div class="metric-label">总供应商数</div>
              <div class="metric-trend positive">+{{ businessData.monthlyGrowth.suppliers }}%</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="metric-card">
          <div class="metric-content">
            <div class="metric-icon influencer">
              <el-icon><User /></el-icon>
            </div>
            <div class="metric-info">
              <div class="metric-value">{{ businessData.totalInfluencers }}</div>
              <div class="metric-label">总达人数</div>
              <div class="metric-trend positive">
                +{{ businessData.monthlyGrowth.influencers }}%
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="metric-card">
          <div class="metric-content">
            <div class="metric-icon project">
              <el-icon><Document /></el-icon>
            </div>
            <div class="metric-info">
              <div class="metric-value">{{ businessData.totalProjects }}</div>
              <div class="metric-label">总项目数</div>
              <div class="metric-trend positive">+{{ businessData.monthlyGrowth.projects }}%</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="metric-card">
          <div class="metric-content">
            <div class="metric-icon revenue">
              <el-icon><Money /></el-icon>
            </div>
            <div class="metric-info">
              <div class="metric-value">{{ formatCurrency(businessData.totalRevenue) }}</div>
              <div class="metric-label">总收入</div>
              <div class="metric-trend positive">+{{ businessData.monthlyGrowth.revenue }}%</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 图表区域 -->
    <el-row :gutter="20" class="charts-row">
      <!-- 供应商增长趋势 -->
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>供应商增长趋势</span>
              <el-select v-model="supplierTimeRange" size="small" style="width: 120px">
                <el-option label="最近6个月" value="6months" />
                <el-option label="最近1年" value="1year" />
              </el-select>
            </div>
          </template>
          <div class="chart-container">
            <div class="chart-placeholder">
              <el-icon><TrendCharts /></el-icon>
              <p>供应商增长趋势图表</p>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 达人粉丝量分布 -->
      <el-col :span="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>达人粉丝量分布</span>
            </div>
          </template>
          <div class="chart-container">
            <div class="chart-placeholder">
              <el-icon><PieChart /></el-icon>
              <p>达人粉丝量分布图表</p>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="charts-row">
      <!-- 项目利润分析 -->
      <el-col :span="16">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>项目利润分析</span>
              <el-radio-group v-model="profitViewType" size="small">
                <el-radio-button label="monthly">月度趋势</el-radio-button>
                <el-radio-button label="category">项目类型</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div class="chart-container">
            <div class="chart-placeholder large">
              <el-icon><DataAnalysis /></el-icon>
              <p>项目利润分析图表</p>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 关键绩效指标 -->
      <el-col :span="8">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>关键绩效指标</span>
            </div>
          </template>
          <div class="kpi-container">
            <div v-for="(kpi, key) in performanceData.kpis" :key="key" class="kpi-item">
              <div class="kpi-label">{{ getKpiLabel(String(key)) }}</div>
              <div class="kpi-value">
                {{ kpi.value }}<span class="kpi-unit">{{ kpi.unit }}</span>
              </div>
              <div class="kpi-progress">
                <el-progress
                  :percentage="(kpi.value / kpi.target) * 100"
                  :color="getProgressColor(kpi.value, kpi.target)"
                  :show-text="false"
                  :stroke-width="6"
                />
              </div>
              <div class="kpi-trend" :class="{ positive: kpi.trend > 0, negative: kpi.trend < 0 }">
                {{ kpi.trend > 0 ? '+' : '' }}{{ kpi.trend }}%
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 收入趋势 -->
    <el-row :gutter="20" class="charts-row">
      <el-col :span="24">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>收入趋势分析</span>
              <el-radio-group v-model="revenueTimeRange" size="small">
                <el-radio-button label="daily">日收入</el-radio-button>
                <el-radio-button label="monthly">月收入</el-radio-button>
                <el-radio-button label="quarterly">季度收入</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div class="chart-container">
            <div class="chart-placeholder large">
              <el-icon><DataLine /></el-icon>
              <p>收入趋势分析图表</p>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 数据表格 -->
    <el-row :gutter="20" class="table-row">
      <el-col :span="24">
        <el-card class="table-card">
          <template #header>
            <div class="card-header">
              <span>最新项目数据</span>
              <el-button type="primary" size="small" @click="refreshData">
                <el-icon><Refresh /></el-icon>
                刷新数据
              </el-button>
            </div>
          </template>
          <el-table :data="projectTableData" style="width: 100%">
            <el-table-column prop="name" label="项目名称" width="200" />
            <el-table-column prop="type" label="项目类型" width="120" />
            <el-table-column prop="revenue" label="收入" width="120">
              <template #default="{ row }">
                <span class="revenue-text">¥{{ formatNumber(row.revenue) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="profit" label="利润" width="120">
              <template #default="{ row }">
                <span class="profit-text">¥{{ formatNumber(row.profit) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getProjectStatusType(row.status)" size="small">
                  {{ getProjectStatusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="startDate" label="开始时间" width="120">
              <template #default="{ row }">
                {{ formatDate(row.startDate) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150">
              <template #default="{ row }">
                <el-button type="primary" size="small" @click="viewProject(row)">
                  查看
                </el-button>
                <el-button type="info" size="small" @click="analyzeProject(row)">
                  分析
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  User, Shop, Document, Money, Refresh, 
  TrendCharts, PieChart, DataAnalysis, DataLine 
} from '@element-plus/icons-vue'

// 响应式数据
const supplierTimeRange = ref('6months')
const profitViewType = ref('monthly')
const revenueTimeRange = ref('monthly')

const businessData = reactive({
  totalSuppliers: 156,
  totalInfluencers: 2340,
  totalProjects: 89,
  totalRevenue: 12450000,
  monthlyGrowth: {
    suppliers: 12.5,
    influencers: 18.3,
    projects: 25.6,
    revenue: 15.8
  }
})

const performanceData = reactive({
  kpis: {
    conversion: {
      value: 85,
      unit: '%',
      target: 90,
      trend: 5.2
    },
    satisfaction: {
      value: 4.6,
      unit: '/5',
      target: 4.8,
      trend: 3.1
    },
    retention: {
      value: 78,
      unit: '%',
      target: 80,
      trend: -2.1
    },
    efficiency: {
      value: 92,
      unit: '%',
      target: 95,
      trend: 8.5
    }
  }
})

const projectTableData = ref([
  {
    id: 1,
    name: '春季美妆推广',
    type: '品牌合作',
    revenue: 580000,
    profit: 145000,
    status: 'active',
    startDate: '2024-03-01'
  },
  {
    id: 2,
    name: '夏日时尚穿搭',
    type: '内容营销',
    revenue: 320000,
    profit: 96000,
    status: 'completed',
    startDate: '2024-02-15'
  },
  {
    id: 3,
    name: '健康生活方式',
    type: '产品推广',
    revenue: 450000,
    profit: 112500,
    status: 'planning',
    startDate: '2024-04-01'
  }
])

// 方法
const formatCurrency = (amount: number) => {
  return `¥${(amount / 10000).toFixed(1)}万`
}

const formatNumber = (num: number) => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return num.toLocaleString()
}

const getKpiLabel = (key: string) => {
  const labels: Record<string, string> = {
    conversion: '转化率',
    satisfaction: '满意度',
    retention: '留存率',
    efficiency: '效率'
  }
  return labels[key] || key
}

const getProgressColor = (value: number, target: number) => {
  const percentage = (value / target) * 100
  if (percentage >= 90) return '#67c23a'
  if (percentage >= 70) return '#e6a23c'
  return '#f56c6c'
}

const getProjectStatusType = (status: string) => {
  const statusMap: Record<string, string> = {
    active: 'success',
    completed: 'info',
    planning: 'warning',
    cancelled: 'danger'
  }
  return statusMap[status] || 'info'
}

const getProjectStatusLabel = (status: string) => {
  const statusMap: Record<string, string> = {
    active: '进行中',
    completed: '已完成',
    planning: '计划中',
    cancelled: '已取消'
  }
  return statusMap[status] || status
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const refreshData = () => {
  ElMessage.success('数据已刷新')
}

const viewProject = (row: any) => {
  ElMessage.info(`查看项目: ${row.name}`)
}

const analyzeProject = (row: any) => {
  ElMessage.info(`分析项目: ${row.name}`)
}

onMounted(() => {
  // 初始化数据
})
</script>

<style scoped>
.page-container {
  padding: 20px;
}

.content-card {
  background: #fff;
  border-radius: 8px;
  padding: 24px;
}

.simple-page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.metrics-row {
  margin-bottom: 20px;
}

.metric-card {
  border: 1px solid #e4e7ed;
  transition: all 0.3s ease;
}

.metric-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.metric-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.metric-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #fff;
}

.metric-icon.supplier {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.metric-icon.influencer {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.metric-icon.project {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.metric-icon.revenue {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.metric-info {
  flex: 1;
}

.metric-value {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 4px;
}

.metric-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 4px;
}

.metric-trend {
  font-size: 12px;
  font-weight: 600;
}

.metric-trend.positive {
  color: #67c23a;
}

.metric-trend.negative {
  color: #f56c6c;
}

.charts-row {
  margin-bottom: 20px;
}

.chart-card {
  border: 1px solid #e4e7ed;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.chart-container {
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-placeholder {
  text-align: center;
  color: #909399;
}

.chart-placeholder.large {
  height: 350px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.chart-placeholder .el-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.kpi-container {
  padding: 16px 0;
}

.kpi-item {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.kpi-item:last-child {
  margin-bottom: 0;
  border-bottom: none;
}

.kpi-label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
}

.kpi-value {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.kpi-unit {
  font-size: 14px;
  color: #909399;
  margin-left: 4px;
}

.kpi-progress {
  margin-bottom: 8px;
}

.kpi-trend {
  font-size: 12px;
  font-weight: 600;
}

.kpi-trend.positive {
  color: #67c23a;
}

.kpi-trend.negative {
  color: #f56c6c;
}

.table-row {
  margin-top: 20px;
}

.table-card {
  border: 1px solid #e4e7ed;
}

.revenue-text {
  color: #67c23a;
  font-weight: 600;
}

.profit-text {
  color: #409eff;
  font-weight: 600;
}
</style>