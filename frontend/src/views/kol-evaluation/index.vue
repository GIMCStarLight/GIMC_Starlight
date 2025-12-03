<template>
  <div class="kol-evaluation">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">
          <!-- <el-icon class="title-icon"><Star /></el-icon> -->
          达人评价分析
        </h1>
        <p class="page-description">全面管理和分析达人评价数据，提升合作质量</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="handleRefresh" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新数据
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <!-- <ReviewStatsCards 
      :statistics="statistics" 
      :score-stats="scoreStats"
      @high-score-click="showHighScoreList"
    /> -->

    <!-- 评分分布可视化卡片 -->
    <ScoreDistributionChart 
      :score-distribution="scoreDistribution"
      :score-stats="scoreStats"
      :statistics="statistics"
    />
 <el-card class="table-card" shadow="never">
    <!-- 搜索筛选区域 -->
    <ReviewSearchForm 
      :search-form="searchForm"
      :loading="loading"
      :total="pagination.total"
      @search="handleSearch"
      @reset="handleReset"
    />

    <!-- 评价列表 -->
   
      <template #header>
        <div class="card-header">
          <span class="card-title">
            <!-- <el-icon><List /></el-icon> -->
            评价列表
          </span>
          <div class="card-extra">
            <!-- 批量审核按钮 -->
            <el-button 
              v-if="selectedReviews.length > 0" 
              type="success" 
              size="small"
              @click="handleBatchApprove"
            >
              <el-icon><Check /></el-icon>
              批量通过 ({{ selectedReviews.length }})
            </el-button>
            <el-button 
              v-if="selectedReviews.length > 0" 
              type="danger" 
              size="small"
              @click="handleBatchReject"
            >
              <el-icon><Close /></el-icon>
              批量拒绝 ({{ selectedReviews.length }})
            </el-button>
            <el-tooltip content="刷新列表" placement="top">
              <el-button size="small" circle @click="loadReviews" :loading="loading">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </el-tooltip>
          </div>
        </div>
      </template>

      <StandardTable
        :loading="loading"
        :columns="tableColumns"
        :data-source="tableData"
        :pagination="{
          current: pagination.page,
          pageSize: pagination.limit,
          total: pagination.total
        }"
        :selected-rows="selectedReviews"
        row-key="id"
        @update:selected-rows="handleSelectionChange"
        @change="handleTableChange"
        @sort-change="handleSortChange"
      >
        <!-- 达人昵称列 -->
        <template #influencerNickName="{ record }">
          <div class="user-cell">
            <el-avatar :size="32" :src="record.influencerAvatarUri">
              {{ record.influencerNickName?.substring(0, 1) || '达' }}
            </el-avatar>
            <span class="user-name">{{ record.influencerNickName || '未知达人' }}</span>
          </div>
        </template>

  
        <!-- 评分列 -->
        <template #score="{ record }">
          <div class="score-display">
            <el-rate
              :model-value="record.score"
              disabled
              text-color="#ff9900"
            />
          </div>
        </template>

        <!-- 评价内容列 -->
        <template #content="{ record }">
          <div class="content-cell">
            <ToolTipPicker v-if="record.content && record.content.length >45 ">
              <template #content>
                <div class="tooltip-content">{{ record.content }}</div>
              </template>
              <template #trigger>
                <div class="content-preview">{{ record.content.substring(0, 45) }}...</div>
              </template>
            </ToolTipPicker>
            <div v-else class="content-preview">{{ record.content || '-' }}</div>
          </div>
        </template>

    
        <!-- 评价时间列 -->
        <template #createdAt="{ record }">
          <div class="time-cell">
            <!-- <el-icon><Clock /></el-icon> -->
            {{ formatDate(record.createdAt) }}
          </div>
        </template>

        <!-- 操作列 -->
        <template #action="{ record }">
          <div class="action-buttons">
            <!-- 查看图标 -->
            <ToolTipPicker>
              <template #content>
                <div class="simple-tooltip-text">查看</div>
              </template>
              <template #trigger>
                <div class="action-icon-wrapper" @click="handleView(record)">
                  <el-icon class="action-icon"><View /></el-icon>
                </div>
              </template>
            </ToolTipPicker>

            <!-- 删除图标 -->
            <ToolTipPicker>
              <template #content>
                <div class="simple-tooltip-text">删除</div>
              </template>
              <template #trigger>
                <div class="action-icon-wrapper" @click="handleDelete(record)">
                  <el-icon class="action-icon"><Delete /></el-icon>
                </div>
              </template>
            </ToolTipPicker>
          </div>
        </template>
      </StandardTable>
    </el-card>

    <!-- 评价详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="评价详情"
      width="700px"
      :close-on-click-modal="false"
    >
      <div v-if="currentReview" class="review-detail">
        <el-descriptions :column="2" border size="large">
          <el-descriptions-item label="评价ID" label-class-name="detail-label">
            <el-tag>{{ currentReview.id }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="达人昵称" label-class-name="detail-label">
            <div class="detail-user">
              <el-avatar :size="24" :src="currentReview.influencerAvatarUri">
                {{ currentReview.influencerNickName?.substring(0, 1) }}
              </el-avatar>
              <span>{{ currentReview.influencerNickName || '未知达人' }}</span>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="评价人" label-class-name="detail-label">
            <el-tag type="info">{{ currentReview.reviewer }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="评分" label-class-name="detail-label">
            <el-rate
              v-model="currentReview.score"
              disabled
              show-score
              text-color="#ff9900"
              score-template="{value}分"
            />
          </el-descriptions-item>
          <el-descriptions-item label="状态" label-class-name="detail-label">
            <el-tag 
              :type="currentReview.status === 'approved' ? 'success' : currentReview.status === 'pending' ? 'warning' : 'danger'"
            >
              {{ currentReview.status === 'approved' ? '已审核' : currentReview.status === 'pending' ? '待审核' : '已拒绝' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="评价类型" label-class-name="detail-label">
            <el-tag type="primary">{{ currentReview.reviewType || 'internal' }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="评价时间" label-class-name="detail-label" :span="2">
            <el-icon><Clock /></el-icon>
            {{ formatDate(currentReview.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间" label-class-name="detail-label" :span="2">
            <el-icon><Clock /></el-icon>
            {{ formatDate(currentReview.updatedAt) }}
          </el-descriptions-item>
        </el-descriptions>
        
        <div class="content-section">
          <h4><el-icon><Document /></el-icon> 评价内容</h4>
          <div class="content-text">
            {{ currentReview.content || '暂无评价内容' }}
          </div>
        </div>

        <div v-if="currentReview.reviewTags && currentReview.reviewTags.length > 0" class="tags-section">
          <h4><el-icon><PriceTag /></el-icon> 评价标签</h4>
          <el-space wrap>
            <el-tag v-for="tag in currentReview.reviewTags" :key="tag" type="success">
              {{ tag }}
            </el-tag>
          </el-space>
        </div>
      </div>

      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  User, 
  ChatDotRound, 
  Star, 
  TrendCharts, 
  Search, 
  Refresh, 
  Download,
  Plus,
  Filter,
  List,
  Clock,
  View,
  Delete,
  Check,
  Close,
  Document,
  PriceTag,
  Medal,
  DataAnalysis,
  Select,
  Minus,
  WarningFilled
} from '@element-plus/icons-vue'
import { requestClient } from '../../api/request'
import { getReviewStatisticsApi, deleteKolReviewApi, updateKolReviewApi, batchAuditKolReviewsApi, type KolReviewInfo } from '../../api/kol-reviews'
import { log } from '../../utils/logger'
import ReviewStatsCards from './components/ReviewStatsCards.vue'
import ScoreDistributionChart from './components/ScoreDistributionChart.vue'
import ReviewSearchForm from './components/ReviewSearchForm.vue'
import StandardTable from '../kol/components/StandardTable.vue'
import ToolTipPicker from '../influencer-authors/components/ToolTipPicker.vue'

// 页面状态
const loading = ref(false)
const detailDialogVisible = ref(false)
const editDialogVisible = ref(false)
const currentReview = ref<KolReviewInfo | null>(null)

// 统计数据
const statistics = ref({
  totalInfluencers: 0,
  totalReviews: 0,
  averageScore: 0 as string | number,
  todayReviews: 0,
  scoreDistribution: [] as Array<{ score: number; count: number }>
})

// 评分统计
const scoreStats = ref({
  excellentCount: 0,  // 5分
  excellentPercent: '0',
  goodCount: 0,  // 4分
  goodPercent: '0',
  averageCount: 0,  // 3分
  averagePercent: '0',
  poorCount: 0,  // 1-2分
  poorPercent: '0',
  highScoreCount: 0,  // 4-5分
  highScorePercent: '0'
})

// 评分分布数据
const scoreDistribution = ref<Array<{ score: number; count: number }>>([])

// 搜索表单
const searchForm = reactive({
  authorId: '',
  reviewer: '',
  scoreRange: '',
  dateRange: null as any
})

// 表格数据
const tableData = ref<KolReviewInfo[]>([])

// 选中的评价
const selectedReviews = ref<KolReviewInfo[]>([])

// 分页
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

// 排序
const sortConfig = ref({
  prop: '',
  order: ''
})

// 编辑表单
const editForm = reactive({
  score: 0,
  content: ''
})

// 表格列配置
const tableColumns = [
  {
    prop: 'influencerNickName',
    label: '达人昵称',
    width: 140
  },
  {
    prop: 'reviewer',
    label: '评价人',
    width: 120
  },
  {
    prop: 'score',
    label: '评分',
    width: 180,
    sortable: true
  },
  {
    prop: 'content',
    label: '评价内容',
    minWidth: 300
  },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    formatter: (record: KolReviewInfo) => {
      return record.status === 'approved' ? '已审核' : record.status === 'pending' ? '待审核' : '已拒绝'
    }
  },
  {
    prop: 'createdAt',
    label: '评价时间',
    width: 160,
    sortable: true
  },
  {
    prop: 'action',
    label: '操作',
    width: 150,
    fixed: 'right'
  }
]

// 格式化日期
const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).replace(/\//g, '-')
}

// 获取所有评价数据
const loadReviews = async () => {
  try {
    loading.value = true
    
    const params: any = {
      page: pagination.page,
      limit: pagination.limit,
    }

    // 添加筛选条件
    if (searchForm.authorId) {
      params.authorId = searchForm.authorId
    }
    
    if (searchForm.reviewer) {
      params.reviewer = searchForm.reviewer
    }

    // 处理日期范围
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }

    // 处理评分范围
    if (searchForm.scoreRange) {
      const [minScore, maxScore] = searchForm.scoreRange.split('-').map(Number)
      params.minScore = minScore
      params.maxScore = maxScore
    }

    // 添加排序参数
    if (sortConfig.value.prop) {
      params.sortBy = sortConfig.value.prop
      params.sortOrder = sortConfig.value.order === 'ascending' ? 'ASC' : 'DESC'
    }

    const response = await requestClient.get('kol-reviews', { params })

    log.debug('API响应:', response)
    log.debug('response类型:', typeof response, '是否为数组:', Array.isArray(response))
    
    // requestClient的defaultResponseInterceptor会自动解包，所以response可能是：
    // 1. 原始数组：[...]
    // 2. 包含分页的对象：{ data: [...], pagination: {...} }
    
    let dataArray: any[] = []
    let paginationInfo: any = null
    
    if (Array.isArray(response)) {
      // 情兵1：直接返回数组
      dataArray = response
      log.debug('直接返回数组，长度:', dataArray.length)
    } else if (response && typeof response === 'object') {
      // 情兵2：返回对象
      if (response.data && Array.isArray(response.data)) {
        dataArray = response.data
        paginationInfo = response.pagination
        log.debug('对象包含data数组，长度:', dataArray.length)
      } else if (Array.isArray(response)) {
        dataArray = response
        log.debug('对象本身是数组，长度:', dataArray.length)
      }
    }
    
    tableData.value = dataArray
    
    // 设置分页信息
    if (paginationInfo) {
      pagination.total = paginationInfo.total || 0
      pagination.page = paginationInfo.page || 1
      pagination.limit = paginationInfo.pageSize || 20
      log.debug('分页信息:', pagination)
    } else {
      // 如果没有分页信息，使用数据长度
      pagination.total = dataArray.length
      log.debug('无分页信息，使用数据长度:', pagination.total)
    }
  } catch (error) {
    log.error('获取评价数据失败:', error)
    ElMessage.error('获取评价数据失败: ' + (error?.message || '未知错误'))
    tableData.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

// 加载统计数据
const loadStatistics = async () => {
  try {
    const stats = await getReviewStatisticsApi()
    log.debug('统计API响应:', stats)
    statistics.value = {
      totalInfluencers: stats.totalInfluencers || 0,
      totalReviews: stats.totalReviews || 0,
      averageScore: stats.averageScore || 0,
      todayReviews: stats.todayReviews || 0,
      scoreDistribution: stats.scoreDistribution || []
    }
    
    // 计算评分分布统计
    calculateScoreStats(stats.scoreDistribution || [])
  } catch (error) {
    log.error('获取统计数据失败:', error)
  }
}

// 计算评分统计
const calculateScoreStats = (distribution: Array<{ score: number; count: number }>) => {
  scoreDistribution.value = distribution
  
  const total = distribution.reduce((sum, item) => sum + item.count, 0)
  if (total === 0) {
    scoreStats.value = {
      excellentCount: 0,
      excellentPercent: '0',
      goodCount: 0,
      goodPercent: '0',
      averageCount: 0,
      averagePercent: '0',
      poorCount: 0,
      poorPercent: '0',
      highScoreCount: 0,
      highScorePercent: '0'
    }
    return
  }
  
  const excellent = distribution.find(d => d.score === 5)?.count || 0
  const good = distribution.find(d => d.score === 4)?.count || 0
  const average = distribution.find(d => d.score === 3)?.count || 0
  const poor = (distribution.find(d => d.score === 2)?.count || 0) + 
               (distribution.find(d => d.score === 1)?.count || 0)
  const highScore = excellent + good
  
  scoreStats.value = {
    excellentCount: excellent,
    excellentPercent: ((excellent / total) * 100).toFixed(1),
    goodCount: good,
    goodPercent: ((good / total) * 100).toFixed(1),
    averageCount: average,
    averagePercent: ((average / total) * 100).toFixed(1),
    poorCount: poor,
    poorPercent: ((poor / total) * 100).toFixed(1),
    highScoreCount: highScore,
    highScorePercent: ((highScore / total) * 100).toFixed(1)
  }
}

// 获取进度条宽度（相对于最大值）
const getBarWidth = (count: number) => {
  const maxCount = Math.max(...scoreDistribution.value.map(d => d.count), 1)
  return (count / maxCount) * 100
}

// 获取进度条样式类
const getBarClass = (score: number) => {
  if (score === 5) return 'bar-excellent'
  if (score === 4) return 'bar-good'
  if (score === 3) return 'bar-average'
  return 'bar-poor'
}

// 获取百分比
const getPercent = (count: number) => {
  const total = scoreDistribution.value.reduce((sum, d) => sum + d.count, 0)
  if (total === 0) return '0'
  return ((count / total) * 100).toFixed(1)
}

// 显示高分达人列表
const showHighScoreList = () => {
  searchForm.scoreRange = '4-5'
  handleSearch()
}

// 日期快捷选项
const dateShortcuts = [
  {
    text: '最近一周',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 7)
      return [start, end]
    },
  },
  {
    text: '最近一个月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 30)
      return [start, end]
    },
  },
  {
    text: '最近三个月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24 * 90)
      return [start, end]
    },
  },
]

// 搜索
const handleSearch = () => {
  pagination.page = 1
  loadReviews()
}

// 重置搜索
const handleReset = () => {
  Object.assign(searchForm, {
    authorId: '',
    reviewer: '',
    scoreRange: '',
    dateRange: null
  })
  pagination.page = 1
  loadReviews()
}

// 刷新数据
const handleRefresh = () => {
  loadReviews()
}

// 分页大小改变
const handleSizeChange = (size: number) => {
  pagination.limit = size
  pagination.page = 1
  loadReviews()
}

// 当前页改变
const handleCurrentChange = (page: number) => {
  pagination.page = page
  loadReviews()
}

// 排序改变
const handleSortChange = ({ prop, order }: any) => {
  sortConfig.value = { prop, order }
  loadReviews()
}

// 查看详情
const handleView = (row: KolReviewInfo) => {
  currentReview.value = row
  detailDialogVisible.value = true
}

// 删除评价
const handleDelete = async (row: KolReviewInfo) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除对达人 "${row.influencerNickName || row.authorId}" 的评价吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await deleteKolReviewApi(row.id)
    ElMessage.success('删除成功')
    loadReviews()
    loadStatistics()
  } catch (error) {
    if (error !== 'cancel') {
      log.error('删除失败:', error)
      ElMessage.error('删除失败: ' + (error?.message || '未知错误'))
    }
  }
}

// 选择变化
const handleSelectionChange = (val: KolReviewInfo[]) => {
  selectedReviews.value = val
}

// 表格变化(分页/排序)
const handleTableChange = (paginationInfo: any) => {
  pagination.page = paginationInfo.current
  pagination.limit = paginationInfo.pageSize
  loadReviews()
}

// 批量通过
const handleBatchApprove = async () => {
  if (selectedReviews.value.length === 0) {
    ElMessage.warning('请先选择要审核的评价')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要通过选中的 ${selectedReviews.value.length} 条评价吗？`,
      '批量通过',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'success'
      }
    )

    const ids = selectedReviews.value.map(r => r.id)
    await batchAuditKolReviewsApi({
      ids,
      status: 'approved',
      auditor: '系统管理员',
      comment: '批量审核通过'
    })

    ElMessage.success(`已成功通过 ${selectedReviews.value.length} 条评价`)
    selectedReviews.value = []
    loadReviews()
    loadStatistics()
  } catch (error) {
    if (error !== 'cancel') {
      log.error('批量通过失败:', error)
      ElMessage.error('批量通过失败: ' + (error?.message || '未知错误'))
    }
  }
}

// 批量拒绝
const handleBatchReject = async () => {
  if (selectedReviews.value.length === 0) {
    ElMessage.warning('请先选择要拒绝的评价')
    return
  }

  try {
    const { value: comment } = await ElMessageBox.prompt(
      `确定要拒绝选中的 ${selectedReviews.value.length} 条评价吗？请输入拒绝理由：`,
      '批量拒绝',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPlaceholder: '请输入拒绝理由',
        inputValidator: (value) => {
          if (!value || value.trim() === '') {
            return '请输入拒绝理由'
          }
          return true
        },
        type: 'warning'
      }
    )

    const ids = selectedReviews.value.map(r => r.id)
    await batchAuditKolReviewsApi({
      ids,
      status: 'rejected',
      auditor: '系统管理员',
      comment: comment || '批量审核拒绝'
    })

    ElMessage.success(`已成功拒绝 ${selectedReviews.value.length} 条评价`)
    selectedReviews.value = []
    loadReviews()
    loadStatistics()
  } catch (error) {
    if (error !== 'cancel') {
      log.error('批量拒绝失败:', error)
      ElMessage.error('批量拒绝失败: ' + (error?.message || '未知错误'))
    }
  }
}

// 编辑评价
const handleEdit = (row: KolReviewInfo) => {
  currentReview.value = row
  editForm.score = row.score
  editForm.content = row.content
  editDialogVisible.value = true
}

// 提交编辑
const handleEditSubmit = async () => {
  if (!currentReview.value) return
  
  try {
    await updateKolReviewApi(currentReview.value.id, {
      score: editForm.score,
      content: editForm.content
    })
    
    ElMessage.success('更新成功')
    editDialogVisible.value = false
    loadReviews()
  } catch (error) {
    log.error('更新失败:', error)
    ElMessage.error('更新失败: ' + (error?.message || '未知错误'))
  }
}

// 生命周期
onMounted(() => {
  loadReviews()
  loadStatistics()
})
</script>

<style scoped>
.kol-evaluation {
  padding: 24px;
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.06);
}

.header-left {
  flex: 1;
}

.page-title {
  margin: 0 0 8px 0;
  font-size: 26px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-icon {
  color: #409eff;
  font-size: 28px;
}

.page-description {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.header-right {
  display: flex;
  gap: 12px;
}

/* 统计卡片样式 */
.stats-cards {
  margin-bottom: 20px;
}

.stat-card {
  border: none;
  border-radius: 12px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.stat-card:hover {
  transform: translateY(-4px);
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 0;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.stat-icon-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon-success {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon-warning {
  background: linear-gradient(135deg, #fccb90 0%, #d57eeb 100%);
}

.stat-icon-danger {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 32px;
  font-weight: 700;
  color: #303133;
  line-height: 1;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 4px;
}

.stat-percent {
  font-size: 12px;
  color: #67c23a;
  font-weight: 600;
}

/* 评分分布卡片样式 */
.distribution-card {
  margin-bottom: 20px;
  border: none;
  border-radius: 12px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.06);
}

.distribution-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}

.distribution-icon {
  font-size: 20px;
  color: #409eff;
}

.distribution-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.distribution-content {
  padding: 0;
}

.distribution-chart {
  padding-right: 20px;
}

.chart-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.chart-item:hover {
  background: #f5f7fa;
}

.chart-label {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 140px;
}

.score-text {
  font-size: 14px;
  font-weight: 500;
  color: #606266;
}

.chart-bar-wrapper {
  flex: 1;
  height: 32px;
  background: #f5f7fa;
  border-radius: 16px;
  overflow: hidden;
  position: relative;
}

.chart-bar {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 12px;
  transition: width 0.5s ease;
  border-radius: 16px;
}

.bar-excellent {
  background: linear-gradient(90deg, #ffd700, #ff8c00);
}

.bar-good {
  background: linear-gradient(90deg, #67c23a, #85ce61);
}

.bar-average {
  background: linear-gradient(90deg, #409eff, #66b1ff);
}

.bar-poor {
  background: linear-gradient(90deg, #f56c6c, #f78989);
}

.bar-count {
  color: white;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.chart-percent {
  min-width: 50px;
  text-align: right;
  font-size: 14px;
  font-weight: 600;
  color: #606266;
}

/* 分布汇总样式 */
.distribution-summary {
  background: linear-gradient(135deg, #f5f7fa 0%, #e8eaf0 100%);
  border-radius: 12px;
  padding: 20px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  margin-bottom: 12px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.summary-item:last-child {
  margin-bottom: 0;
}

.summary-item:hover {
  transform: translateX(4px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.summary-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 18px;
}

.summary-icon-excellent {
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: white;
}

.summary-icon-good {
  background: linear-gradient(135deg, #67c23a, #85ce61);
  color: white;
}

.summary-icon-average {
  background: linear-gradient(135deg, #409eff, #66b1ff);
  color: white;
}

.summary-icon-poor {
  background: linear-gradient(135deg, #f56c6c, #f78989);
  color: white;
}

.summary-content {
  flex: 1;
}

.summary-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 4px;
}

.summary-value {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

/* 搜索卡片样式 */
.search-card {
  margin-bottom: 20px;
  border: none;
  border-radius: 12px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.06);
}

.search-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 16px;
  margin-bottom: 16px;
  border-bottom: 1px solid #ebeef5;
}

.search-icon {
  font-size: 18px;
  color: #409eff;
}

.search-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.search-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 8px;
}

.search-stats {
  margin-left: auto;
}

.search-stats strong {
  color: #409eff;
  font-size: 18px;
}

/* 表格卡片样式 */
.table-card {
  border: none;
  border-radius: 12px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.06);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-extra {
  display: flex;
  gap: 8px;
}

/* 表格单元格样式 */
.user-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-name {
  font-weight: 500;
  color: #303133;
}

.score-display {
  display: flex;
  align-items: center;
  justify-content: center;
}

.content-cell {
  line-height: 1.6;
}

.content-preview {
  color: #606266;
  line-height: 1.6;
}

.time-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #31343B;
  font-size: 16px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

/* 表格样式 */
:deep(.standard-table) {
  .ant-table-thead > tr > th {
    text-align: center;
    color: #31343B;
    font-size: 12px;
    font-weight: 600;
  }

  .ant-table-tbody > tr > td {
    text-align: center;
    color: #31343B;
    font-size: 14px;
  }

  /* 达人昵称列标题左对齐 */
  .ant-table-thead > tr > th:nth-child(2) {
    text-align: left !important;
    padding-left: 16px !important;
  }

  /* 达人昵称列内容左对齐 */
  /* .ant-table-tbody > tr > td:nth-child(2) {
    text-align: left !important;
    padding-left: 16px !important;
  } */
}

/* 操作按钮样式 */
.action-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
}

.action-icon-wrapper {
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    background-color: var(--el-fill-color-light);
  }

  .action-icon {
    font-size: 16px;
    color: #909399;
    transition: color 0.2s;

    &:hover {
      color: var(--el-color-primary);
    }
  }
}

.simple-tooltip-text {
  font-size: 12px;
  color: #606266;
  padding: 2px 4px;
}

/* 详情对话框样式 */
.review-detail {
  padding: 10px 0;
}

:deep(.detail-label) {
  font-weight: 600;
  color: #606266;
}

.detail-user {
  display: flex;
  align-items: center;
  gap: 8px;
}

.content-section,
.tags-section {
  margin-top: 24px;
}

.content-section h4,
.tags-section h4 {
  margin: 0 0 12px 0;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 6px;
}
.tooltip-content{
  font-size: 14px;
  color: #606266;
  padding: 4px 8px;
}
.content-text {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  line-height: 1.8;
  color: #303133;
  min-height: 100px;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
