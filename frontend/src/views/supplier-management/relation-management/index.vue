<template>
  <div class="relation-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">供应商-达人关系管理</h1>
        <p class="page-description">管理供应商与达人之间的合作关系</p>
      </div>
      <div class="header-right">
        <el-button type="info" @click="handleViewStatistics">
          <el-icon><DataAnalysis /></el-icon>
          查看统计
        </el-button>
        <el-button type="primary" @click="handleAddRelation">
          <el-icon><Plus /></el-icon>
          新增关系
        </el-button>
      </div>
    </div>

    <!-- 搜索筛选区域 -->
    <el-card class="search-card" shadow="never">
      <el-form :model="searchForm" inline>
        <el-form-item label="供应商">
          <el-select
            v-model="searchForm.supplierId"
            placeholder="请选择供应商"
            clearable
            filterable
            remote
            :remote-method="searchSuppliers"
            style="width: 200px"
          >
            <el-option
              v-for="supplier in supplierOptions"
              :key="supplier.id"
              :label="supplier.name"
              :value="supplier.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="达人">
          <el-select
            v-model="searchForm.influencerId"
            placeholder="请选择达人"
            clearable
            filterable
            remote
            :remote-method="searchInfluencers"
            style="width: 200px"
          >
            <el-option
              v-for="influencer in influencerOptions"
              :key="influencer.id"
              :label="influencer.name"
              :value="influencer.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="关系类型">
          <el-select
            v-model="searchForm.relationType"
            placeholder="请选择关系类型"
            clearable
            style="width: 150px"
          >
            <el-option label="独家合作" value="EXCLUSIVE" />
            <el-option label="优先合作" value="PRIORITY" />
            <el-option label="普通合作" value="NORMAL" />
            <el-option label="试用合作" value="TRIAL" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="searchForm.status"
            placeholder="请选择状态"
            clearable
            style="width: 120px"
          >
            <el-option label="正常" value="ACTIVE" />
            <el-option label="暂停" value="PAUSED" />
            <el-option label="终止" value="TERMINATED" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 批量操作工具栏 -->
    <div v-if="selectedRelations.length > 0" class="batch-toolbar">
      <div class="batch-info">
        <span>已选择 {{ selectedRelations.length }} 个关系</span>
        <el-button text type="primary" @click="clearSelection">取消选择</el-button>
      </div>
      <div class="batch-actions">
        <el-button type="primary" @click="handleBatchView">
          <el-icon><View /></el-icon>
          批量查看
        </el-button>
        <el-button type="warning" @click="handleBatchEdit" :disabled="selectedRelations.length !== 1">
          <el-icon><Edit /></el-icon>
          编辑（单选）
        </el-button>
        <el-button type="danger" @click="handleBatchDelete">
          <el-icon><Delete /></el-icon>
          批量删除
        </el-button>
      </div>
    </div>

    <!-- 关系列表 -->
    <el-card class="table-card" shadow="never">
      <el-table
        v-loading="loading"
        :data="relations"
        stripe
        style="width: 100%"
        @selection-change="handleSelectionChange"
        @row-click="handleRowClick"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column label="供应商信息" min-width="200">
          <template #default="{ row }">
            <div class="supplier-info">
              <div class="supplier-name">{{ row.supplier.name }}</div>
              <div class="supplier-detail">
                <el-tag :type="getLevelType(row.supplier.level)" size="small">
                  {{ getLevelText(row.supplier.level) }}
                </el-tag>
                <span class="supplier-type">{{ getTypeText(row.supplier.type) }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="达人信息" min-width="200">
          <template #default="{ row }">
            <div class="influencer-info">
              <div class="influencer-name">{{ row.influencer.name }}</div>
              <div class="influencer-detail">
                <el-tag type="primary" size="small">{{ row.influencer.platform }}</el-tag>
                <span class="follower-count">{{ formatFollowerCount(row.influencer.followerCount) }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="relationType" label="关系类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getRelationTypeColor(row.relationType)" size="small">
              {{ getRelationTypeText(row.relationType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="合作期间" width="200">
          <template #default="{ row }">
            <div class="cooperation-period">
              <div>开始：{{ formatDate(row.startDate) }}</div>
              <div v-if="row.endDate">结束：{{ formatDate(row.endDate) }}</div>
              <div v-else class="no-end-date">长期合作</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="合作数据" width="150" align="center">
          <template #default="{ row }">
            <div class="cooperation-data">
              <div class="project-count">项目：{{ row.projectCount || 0 }}个</div>
              <div class="total-amount">总额：{{ formatAmount(row.totalAmount || 0) }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleView(row)">
              查看
            </el-button>
            <el-button link type="primary" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button link type="success" @click="handleViewProjects(row)">
              项目
            </el-button>
            <el-button link type="danger" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          :current-page="pagination.page"
          :page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 统计对话框 -->
    <el-dialog v-model="statisticsVisible" title="关系统计" width="80%">
      <div class="statistics-content">
        <el-row :gutter="24">
          <el-col :span="6">
            <el-card class="stat-card">
              <div class="stat-number">{{ statistics.totalRelations }}</div>
              <div class="stat-label">总关系数</div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card class="stat-card">
              <div class="stat-number">{{ statistics.activeRelations }}</div>
              <div class="stat-label">活跃关系</div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card class="stat-card">
              <div class="stat-number">{{ statistics.exclusiveRelations }}</div>
              <div class="stat-label">独家合作</div>
            </el-card>
          </el-col>
          <el-col :span="6">
            <el-card class="stat-card">
              <div class="stat-number">{{ formatAmount(statistics.totalAmount) }}</div>
              <div class="stat-label">总合作金额</div>
            </el-card>
          </el-col>
        </el-row>
        
        <div class="chart-section">
          <h3>关系类型分布</h3>
          <div class="chart-placeholder">
            [关系类型分布图表占位]
          </div>
        </div>
        
        <div class="chart-section">
          <h3>月度合作趋势</h3>
          <div class="chart-placeholder">
            [月度合作趋势图表占位]
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 关系详情/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="70%"
      :close-on-click-modal="!isViewDetail"
      @close="handleDialogClose"
    >
      <div v-if="isViewDetail">
        <!-- 详情模式 -->
        <div class="detail-content">
          <div class="detail-section">
            <h3>基本信息</h3>
            <el-row :gutter="24">
              <el-col :span="12">
                <div class="detail-item">
                  <span class="detail-label">供应商：</span>
                  <span class="detail-value">{{ form.supplier?.name }}</span>
                </div>
              </el-col>
              <el-col :span="12">
                <div class="detail-item">
                  <span class="detail-label">达人：</span>
                  <span class="detail-value">{{ form.influencer?.name }}</span>
                </div>
              </el-col>
            </el-row>
            <el-row :gutter="24">
              <el-col :span="12">
                <div class="detail-item">
                  <span class="detail-label">关系类型：</span>
                  <el-tag :type="getRelationTypeColor(form.relationType)" size="small">
                    {{ getRelationTypeText(form.relationType) }}
                  </el-tag>
                </div>
              </el-col>
              <el-col :span="12">
                <div class="detail-item">
                  <span class="detail-label">状态：</span>
                  <el-tag :type="getStatusType(form.status)" size="small">
                    {{ getStatusText(form.status) }}
                  </el-tag>
                </div>
              </el-col>
            </el-row>
            <el-row :gutter="24">
              <el-col :span="12">
                <div class="detail-item">
                  <span class="detail-label">开始时间：</span>
                  <span class="detail-value">{{ formatDate(form.startDate) }}</span>
                </div>
              </el-col>
              <el-col :span="12">
                <div class="detail-item">
                  <span class="detail-label">结束时间：</span>
                  <span class="detail-value">{{ form.endDate ? formatDate(form.endDate) : '长期合作' }}</span>
                </div>
              </el-col>
            </el-row>
            <el-row :gutter="24">
              <el-col :span="24">
                <div class="detail-item">
                  <span class="detail-label">关系描述：</span>
                  <span class="detail-value">{{ form.description }}</span>
                </div>
              </el-col>
            </el-row>
          </div>
        </div>
      </div>
      <div v-else>
        <!-- 编辑模式 -->
        <el-form
          ref="formRef"
          :model="form"
          :rules="formRules"
          label-width="120px"
        >
          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="供应商" prop="supplierId">
                <el-select
                  v-model="form.supplierId"
                  placeholder="请选择供应商"
                  filterable
                  remote
                  :remote-method="searchSuppliers"
                  style="width: 100%"
                >
                  <el-option
                    v-for="supplier in supplierOptions"
                    :key="supplier.id"
                    :label="supplier.name"
                    :value="supplier.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="达人" prop="influencerId">
                <el-select
                  v-model="form.influencerId"
                  placeholder="请选择达人"
                  filterable
                  remote
                  :remote-method="searchInfluencers"
                  style="width: 100%"
                >
                  <el-option
                    v-for="influencer in influencerOptions"
                    :key="influencer.id"
                    :label="influencer.name"
                    :value="influencer.id"
                  />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="关系类型" prop="relationType">
                <el-select v-model="form.relationType" placeholder="请选择关系类型" style="width: 100%">
                  <el-option label="独家合作" value="EXCLUSIVE" />
                  <el-option label="优先合作" value="PRIORITY" />
                  <el-option label="普通合作" value="NORMAL" />
                  <el-option label="试用合作" value="TRIAL" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="状态" prop="status">
                <el-select v-model="form.status" placeholder="请选择状态" style="width: 100%">
                  <el-option label="正常" value="ACTIVE" />
                  <el-option label="暂停" value="PAUSED" />
                  <el-option label="终止" value="TERMINATED" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="24">
            <el-col :span="12">
              <el-form-item label="开始时间" prop="startDate">
                <el-date-picker
                  v-model="form.startDate"
                  type="date"
                  placeholder="请选择开始时间"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="结束时间">
                <el-date-picker
                  v-model="form.endDate"
                  type="date"
                  placeholder="请选择结束时间（可选）"
                  style="width: 100%"
                />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="关系描述">
            <el-input
              v-model="form.description"
              type="textarea"
              :rows="4"
              placeholder="请输入关系描述"
            />
          </el-form-item>
        </el-form>
      </div>
      <template #footer v-if="!isViewDetail">
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Refresh, View, Edit, Delete, DataAnalysis } from '@element-plus/icons-vue'

// 响应式数据
const loading = ref(false)
const dialogVisible = ref(false)
const statisticsVisible = ref(false)
const dialogTitle = ref('')
const isViewDetail = ref(false)
const selectedRelations = ref([])

const searchForm = reactive({
  supplierId: '',
  influencerId: '',
  relationType: '',
  status: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const form = reactive({
  id: null,
  supplierId: '',
  influencerId: '',
  relationType: '',
  status: 'ACTIVE',
  startDate: '',
  endDate: '',
  description: '',
  supplier: null,
  influencer: null
})

const formRules = {
  supplierId: [{ required: true, message: '请选择供应商', trigger: 'change' }],
  influencerId: [{ required: true, message: '请选择达人', trigger: 'change' }],
  relationType: [{ required: true, message: '请选择关系类型', trigger: 'change' }],
  startDate: [{ required: true, message: '请选择开始时间', trigger: 'change' }]
}

const supplierOptions = ref([])
const influencerOptions = ref([])

const statistics = reactive({
  totalRelations: 156,
  activeRelations: 128,
  exclusiveRelations: 23,
  totalAmount: 15600000
})

// 模拟数据
const relations = ref([
  {
    id: 1,
    supplier: {
      id: 1,
      name: '优质供应商A',
      level: 'GOLD',
      type: 'MANUFACTURER'
    },
    influencer: {
      id: 1,
      name: '时尚达人小王',
      platform: '抖音',
      followerCount: 1200000
    },
    relationType: 'EXCLUSIVE',
    status: 'ACTIVE',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    projectCount: 15,
    totalAmount: 850000,
    description: '独家合作关系，主要负责时尚类产品推广',
    createdAt: '2024-01-01'
  },
  {
    id: 2,
    supplier: {
      id: 2,
      name: '可靠供应商B',
      level: 'SILVER',
      type: 'DISTRIBUTOR'
    },
    influencer: {
      id: 2,
      name: '美食博主李姐',
      platform: '小红书',
      followerCount: 800000
    },
    relationType: 'PRIORITY',
    status: 'ACTIVE',
    startDate: '2024-02-01',
    endDate: null,
    projectCount: 8,
    totalAmount: 420000,
    description: '优先合作关系，美食类产品推广',
    createdAt: '2024-02-01'
  }
])

// 方法
const handleViewStatistics = () => {
  statisticsVisible.value = true
}

const handleAddRelation = () => {
  dialogTitle.value = '新增关系'
  isViewDetail.value = false
  resetForm()
  dialogVisible.value = true
}

const handleSearch = () => {
  ElMessage.info('搜索功能')
}

const handleReset = () => {
  searchForm.supplierId = ''
  searchForm.influencerId = ''
  searchForm.relationType = ''
  searchForm.status = ''
  ElMessage.success('重置成功')
}

const handleSelectionChange = (selection: any[]) => {
  selectedRelations.value = selection
}

const clearSelection = () => {
  selectedRelations.value = []
}

const handleBatchView = () => {
  if (selectedRelations.value.length === 0) {
    ElMessage.warning('请先选择要查看的关系')
    return
  }
  handleView(selectedRelations.value[0])
}

const handleBatchEdit = () => {
  if (selectedRelations.value.length !== 1) {
    ElMessage.warning('编辑操作只能选择一个关系')
    return
  }
  handleEdit(selectedRelations.value[0])
}

const handleBatchDelete = () => {
  if (selectedRelations.value.length === 0) {
    ElMessage.warning('请先选择要删除的关系')
    return
  }
  
  ElMessageBox.confirm(
    `确定要删除选中的 ${selectedRelations.value.length} 个关系吗？`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    ElMessage.success(`成功删除 ${selectedRelations.value.length} 个关系`)
    selectedRelations.value = []
  })
}

const handleRowClick = (row: any) => {
  // 行点击处理
}

const handleView = (row: any) => {
  dialogTitle.value = '关系详情'
  isViewDetail.value = true
  Object.assign(form, row)
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  dialogTitle.value = '编辑关系'
  isViewDetail.value = false
  Object.assign(form, row)
  dialogVisible.value = true
}

const handleViewProjects = (row: any) => {
  ElMessage.info(`查看 ${row.supplier.name} 与 ${row.influencer.name} 的合作项目`)
}

const handleDelete = (row: any) => {
  ElMessageBox.confirm(
    `确定要删除 "${row.supplier.name}" 与 "${row.influencer.name}" 的合作关系吗？`,
    '删除确认',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    ElMessage.success('删除成功')
  })
}

const handleSizeChange = (size: number) => {
  pagination.pageSize = size
}

const handleCurrentChange = (page: number) => {
  pagination.page = page
}

const handleDialogClose = () => {
  resetForm()
}

const handleSubmit = () => {
  ElMessage.success('保存成功')
  dialogVisible.value = false
}

const resetForm = () => {
  form.id = null
  form.supplierId = ''
  form.influencerId = ''
  form.relationType = ''
  form.status = 'ACTIVE'
  form.startDate = ''
  form.endDate = ''
  form.description = ''
  form.supplier = null
  form.influencer = null
}

const searchSuppliers = (query: string) => {
  // 模拟远程搜索供应商
  if (query) {
    supplierOptions.value = [
      { id: 1, name: '优质供应商A' },
      { id: 2, name: '可靠供应商B' }
    ].filter(item => item.name.includes(query))
  } else {
    supplierOptions.value = []
  }
}

const searchInfluencers = (query: string) => {
  // 模拟远程搜索达人
  if (query) {
    influencerOptions.value = [
      { id: 1, name: '时尚达人小王' },
      { id: 2, name: '美食博主李姐' }
    ].filter(item => item.name.includes(query))
  } else {
    influencerOptions.value = []
  }
}

// 工具方法
const getLevelType = (level: string) => {
  const typeMap: Record<string, string> = {
    GOLD: 'warning',
    SILVER: 'info',
    BRONZE: 'success'
  }
  return typeMap[level] || 'info'
}

const getLevelText = (level: string) => {
  const textMap: Record<string, string> = {
    GOLD: '金牌',
    SILVER: '银牌',
    BRONZE: '铜牌'
  }
  return textMap[level] || level
}

const getTypeText = (type: string) => {
  const textMap: Record<string, string> = {
    MANUFACTURER: '制造商',
    DISTRIBUTOR: '分销商',
    AGENT: '代理商'
  }
  return textMap[type] || type
}

const getRelationTypeColor = (type: string) => {
  const colorMap: Record<string, string> = {
    EXCLUSIVE: 'danger',
    PRIORITY: 'warning',
    NORMAL: 'primary',
    TRIAL: 'info'
  }
  return colorMap[type] || 'info'
}

const getRelationTypeText = (type: string) => {
  const textMap: Record<string, string> = {
    EXCLUSIVE: '独家合作',
    PRIORITY: '优先合作',
    NORMAL: '普通合作',
    TRIAL: '试用合作'
  }
  return textMap[type] || type
}

const getStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    ACTIVE: 'success',
    PAUSED: 'warning',
    TERMINATED: 'danger'
  }
  return typeMap[status] || 'info'
}

const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    ACTIVE: '正常',
    PAUSED: '暂停',
    TERMINATED: '终止'
  }
  return textMap[status] || status
}

const formatFollowerCount = (count: number) => {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}万`
  }
  return count.toString()
}

const formatAmount = (amount: number) => {
  return `¥${(amount / 10000).toFixed(1)}万`
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

onMounted(() => {
  pagination.total = relations.value.length
})
</script>

<style scoped>
.relation-management {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.header-left {
  flex: 1;
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

.header-right {
  display: flex;
  gap: 12px;
}

.search-card,
.table-card {
  margin-bottom: 20px;
  border: 1px solid #e4e7ed;
}

.batch-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 6px;
  margin-bottom: 16px;
}

.batch-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.batch-actions {
  display: flex;
  gap: 8px;
}

.supplier-info,
.influencer-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.supplier-name,
.influencer-name {
  font-weight: 600;
  color: #303133;
}

.supplier-detail,
.influencer-detail {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #909399;
}

.supplier-type,
.follower-count {
  font-size: 12px;
  color: #909399;
}

.cooperation-period {
  font-size: 13px;
}

.no-end-date {
  color: #67c23a;
  font-weight: 500;
}

.cooperation-data {
  text-align: center;
}

.project-count,
.total-amount {
  font-size: 12px;
  color: #606266;
  margin-bottom: 2px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.statistics-content {
  padding: 16px 0;
}

.stat-card {
  text-align: center;
  padding: 20px;
}

.stat-number {
  font-size: 28px;
  font-weight: 600;
  color: #409eff;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #606266;
}

.chart-section {
  margin-top: 32px;
}

.chart-section h3 {
  margin: 0 0 16px 0;
  color: #303133;
  font-size: 16px;
}

.chart-placeholder {
  height: 300px;
  background: #f5f7fa;
  border: 2px dashed #dcdfe6;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 14px;
}

.detail-content {
  padding: 16px 0;
}

.detail-section {
  margin-bottom: 24px;
}

.detail-section h3 {
  margin: 0 0 16px 0;
  color: #303133;
  font-size: 16px;
  border-bottom: 1px solid #e4e7ed;
  padding-bottom: 8px;
}

.detail-item {
  margin-bottom: 12px;
}

.detail-label {
  font-weight: 600;
  color: #606266;
  margin-right: 8px;
}

.detail-value {
  color: #303133;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>