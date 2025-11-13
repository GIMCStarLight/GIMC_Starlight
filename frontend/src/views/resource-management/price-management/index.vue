<template>
  <div class="price-management">
    <el-card class="search-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>价格策略管理</span>
        </div>
      </template>
      
      <!-- 搜索筛选区域 -->
      <el-form :model="searchForm" :inline="true" class="search-form">
        <el-form-item label="达人名称">
          <el-input
            v-model="searchForm.influencerName"
            placeholder="请输入达人名称"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="内容类型">
          <el-select v-model="searchForm.contentType" placeholder="请选择内容类型" clearable style="width: 150px">
            <el-option label="短视频" value="short_video" />
            <el-option label="长视频" value="long_video" />
            <el-option label="直播" value="live_stream" />
            <el-option label="图文" value="image_text" />
          </el-select>
        </el-form-item>
        <el-form-item label="价格范围">
          <div class="price-range-input">
            <el-input-number
              v-model="searchForm.priceMin"
              :min="0"
              :precision="2"
              placeholder="最低价格"
              style="width: 120px"
            />
            <span class="range-separator">至</span>
            <el-input-number
              v-model="searchForm.priceMax"
              :min="0"
              :precision="2"
              placeholder="最高价格"
              style="width: 120px"
            />
          </div>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable style="width: 120px">
            <el-option label="生效中" value="active" />
            <el-option label="已过期" value="expired" />
            <el-option label="待生效" value="pending" />
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

    <!-- 操作工具栏 -->
    <el-card class="toolbar-card" shadow="never">
      <div class="toolbar">
        <div class="toolbar-left">
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新建价格策略
          </el-button>
          <el-button type="warning" @click="handleBatchAdjust" :disabled="!selectedRows.length">
            <el-icon><Edit /></el-icon>
            批量调整
          </el-button>
          <el-button type="danger" @click="handleBatchDelete" :disabled="!selectedRows.length">
            <el-icon><Delete /></el-icon>
            批量删除
          </el-button>
        </div>
        <div class="toolbar-right">
          <el-button @click="handleExport">
            <el-icon><Download /></el-icon>
            导出
          </el-button>
          <el-button @click="handleImport">
            <el-icon><Upload /></el-icon>
            导入
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 价格策略列表 -->
    <el-card class="table-card" shadow="never">
      <el-table
        :data="tableData"
        v-loading="loading"
        @selection-change="handleSelectionChange"
        stripe
        style="width: 100%"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="influencerName" label="达人名称" width="150" />
        <el-table-column prop="contentType" label="内容类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getContentTypeColor(row.contentType)" size="small">
              {{ getContentTypeLabel(row.contentType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="price" label="价格" width="120">
          <template #default="{ row }">
            <span class="price-text">¥{{ row.price }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="unit" label="单位" width="80" />
        <el-table-column prop="validFrom" label="生效时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.validFrom) }}
          </template>
        </el-table-column>
        <el-table-column prop="validTo" label="失效时间" width="180">
          <template #default="{ row }">
            {{ row.validTo ? formatDate(row.validTo) : '永久有效' }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusColor(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastUpdated" label="更新时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.lastUpdated) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleEdit(row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button type="warning" size="small" @click="handleCopy(row)">
              <el-icon><CopyDocument /></el-icon>
              复制
            </el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          :current-page="pagination.page"
          :page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 新建/编辑价格策略弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      @close="handleDialogClose"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
        <el-form-item label="达人" prop="influencerId">
          <el-select
            v-model="formData.influencerId"
            placeholder="请选择达人"
            filterable
            remote
            :remote-method="searchInfluencers"
            style="width: 100%"
          >
            <el-option
              v-for="item in influencerOptions"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="内容类型" prop="contentType">
          <el-select v-model="formData.contentType" placeholder="请选择内容类型" style="width: 100%">
            <el-option label="短视频" value="short_video" />
            <el-option label="长视频" value="long_video" />
            <el-option label="直播" value="live_stream" />
            <el-option label="图文" value="image_text" />
          </el-select>
        </el-form-item>
        <el-form-item label="价格" prop="price">
          <el-input-number
            v-model="formData.price"
            :min="0"
            :precision="2"
            style="width: 100%"
            placeholder="请输入价格"
          />
        </el-form-item>
        <el-form-item label="单位" prop="unit">
          <el-select v-model="formData.unit" placeholder="请选择单位" style="width: 100%">
            <el-option label="条" value="piece" />
            <el-option label="小时" value="hour" />
            <el-option label="天" value="day" />
            <el-option label="场" value="session" />
          </el-select>
        </el-form-item>
        <el-form-item label="生效时间" prop="validFrom">
          <el-date-picker
            v-model="formData.validFrom"
            type="datetime"
            placeholder="请选择生效时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="失效时间">
          <el-date-picker
            v-model="formData.validTo"
            type="datetime"
            placeholder="请选择失效时间（可选）"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="formData.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>
      <template #footer>
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
import { 
  Search, Refresh, Plus, Edit, Delete, Download, Upload, CopyDocument 
} from '@element-plus/icons-vue'

// 响应式数据
const loading = ref(false)
const dialogVisible = ref(false)
const dialogTitle = ref('新建价格策略')
const selectedRows = ref([])

const searchForm = reactive({
  influencerName: '',
  contentType: '',
  priceMin: null,
  priceMax: null,
  status: ''
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const formData = reactive({
  influencerId: '',
  contentType: '',
  price: null,
  unit: '',
  validFrom: '',
  validTo: '',
  remark: ''
})

const formRules = {
  influencerId: [{ required: true, message: '请选择达人', trigger: 'change' }],
  contentType: [{ required: true, message: '请选择内容类型', trigger: 'change' }],
  price: [{ required: true, message: '请输入价格', trigger: 'blur' }],
  unit: [{ required: true, message: '请选择单位', trigger: 'change' }],
  validFrom: [{ required: true, message: '请选择生效时间', trigger: 'change' }]
}

const tableData = ref([
  {
    id: 1,
    influencerName: '美妆达人小王',
    contentType: 'short_video',
    price: 5000,
    unit: '条',
    validFrom: '2024-01-01',
    validTo: null,
    status: 'active',
    lastUpdated: '2024-01-15'
  },
  {
    id: 2,
    influencerName: '时尚博主Lisa',
    contentType: 'live_stream',
    price: 8000,
    unit: '场',
    validFrom: '2024-02-01',
    validTo: '2024-12-31',
    status: 'active',
    lastUpdated: '2024-02-10'
  }
])

const influencerOptions = ref([
  { id: 1, name: '美妆达人小王' },
  { id: 2, name: '时尚博主Lisa' }
])

// 方法
const handleSearch = () => {
  ElMessage.info('搜索功能')
}

const handleReset = () => {
  Object.keys(searchForm).forEach(key => {
    searchForm[key] = ''
  })
  ElMessage.success('重置成功')
}

const handleAdd = () => {
  dialogTitle.value = '新建价格策略'
  resetFormData()
  dialogVisible.value = true
}

const handleBatchAdjust = () => {
  ElMessage.info('批量调整功能')
}

const handleBatchDelete = () => {
  ElMessageBox.confirm('确定删除选中的价格策略吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    ElMessage.success('删除成功')
  })
}

const handleExport = () => {
  ElMessage.info('导出功能')
}

const handleImport = () => {
  ElMessage.info('导入功能')
}

const handleSelectionChange = (selection: any[]) => {
  selectedRows.value = selection
}

const handleEdit = (row: any) => {
  dialogTitle.value = '编辑价格策略'
  Object.assign(formData, row)
  dialogVisible.value = true
}

const handleCopy = (row: any) => {
  dialogTitle.value = '复制价格策略'
  Object.assign(formData, { ...row, id: null })
  dialogVisible.value = true
}

const handleDelete = (row: any) => {
  ElMessageBox.confirm(`确定删除 ${row.influencerName} 的价格策略吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
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
  resetFormData()
}

const handleSubmit = () => {
  ElMessage.success('保存成功')
  dialogVisible.value = false
}

const searchInfluencers = (query: string) => {
  // 搜索达人
}

const resetFormData = () => {
  Object.keys(formData).forEach(key => {
    formData[key] = ''
  })
}

// 工具方法
const getContentTypeColor = (type: string) => {
  const colorMap: Record<string, string> = {
    short_video: 'primary',
    long_video: 'success',
    live_stream: 'warning',
    image_text: 'info'
  }
  return colorMap[type] || 'info'
}

const getContentTypeLabel = (type: string) => {
  const labelMap: Record<string, string> = {
    short_video: '短视频',
    long_video: '长视频',
    live_stream: '直播',
    image_text: '图文'
  }
  return labelMap[type] || type
}

const getStatusColor = (status: string) => {
  const colorMap: Record<string, string> = {
    active: 'success',
    expired: 'danger',
    pending: 'warning'
  }
  return colorMap[status] || 'info'
}

const getStatusLabel = (status: string) => {
  const labelMap: Record<string, string> = {
    active: '生效中',
    expired: '已过期',
    pending: '待生效'
  }
  return labelMap[status] || status
}

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

onMounted(() => {
  pagination.total = tableData.value.length
})
</script>

<style scoped>
.price-management {
  padding: 20px;
}

.search-card,
.toolbar-card,
.table-card {
  margin-bottom: 20px;
  border: 1px solid #e4e7ed;
}

.card-header {
  font-weight: 600;
  font-size: 16px;
}

.search-form {
  margin: 0;
}

.price-range-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.range-separator {
  color: #909399;
  font-size: 14px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  gap: 12px;
}

.price-text {
  font-weight: 600;
  color: #e6a23c;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>