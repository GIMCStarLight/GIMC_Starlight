<template>
  <div class="influencer-evaluation">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">达人评价管理</h1>
        <p class="page-description">管理和查看达人的评价信息</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="handleAdd">
          <el-icon><Plus /></el-icon>
          新增评价
        </el-button>
      </div>
    </div>

    <!-- 搜索筛选区域 -->
    <el-card class="search-card" shadow="never">
      <el-form :model="searchForm" inline>
        <el-form-item label="达人姓名">
          <el-input
            v-model="searchForm.influencerName"
            placeholder="请输入达人姓名"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="评价状态">
          <el-select
            v-model="searchForm.status"
            placeholder="请选择状态"
            clearable
            style="width: 150px"
          >
            <el-option label="活跃" value="active" />
            <el-option label="已删除" value="deleted" />
          </el-select>
        </el-form-item>
        <el-form-item label="评分范围">
          <el-slider
            v-model="searchForm.scoreRange"
            range
            :min="1"
            :max="5"
            :step="0.1"
            style="width: 200px"
          />
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

    <!-- 评价列表 -->
    <el-card class="table-card" shadow="never">
      <el-table
        v-loading="loading"
        :data="evaluations"
        stripe
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="targetName" label="达人姓名" width="120" />
        <el-table-column prop="evaluatorName" label="评价人" width="120" />
        <el-table-column prop="overallScore" label="综合评分" width="100">
          <template #default="{ row }">
            <el-rate
              v-model="row.overallScore"
              disabled
              show-score
              text-color="#ff9900"
              score-template="{value}"
            />
          </template>
        </el-table-column>
        <el-table-column prop="comment" label="评价内容" min-width="200">
          <template #default="{ row }">
            <el-tooltip :content="row.comment" placement="top">
              <span class="comment-text">{{ row.comment }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="tags" label="标签" width="150">
          <template #default="{ row }">
            <el-tag
              v-for="tag in row.tags.slice(0, 2)"
              :key="tag"
              size="small"
              class="tag-item"
            >
              {{ tag }}
            </el-tag>
            <el-tag v-if="row.tags.length > 2" size="small" type="info">
              +{{ row.tags.length - 2 }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="评价时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
              {{ row.status === 'active' ? '活跃' : '已删除' }}
            </el-tag>
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

    <!-- 评价详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      title="评价详情"
      width="800px"
      :before-close="handleDetailClose"
    >
      <div v-if="selectedEvaluation" class="evaluation-detail">
        <div class="detail-header">
          <div class="influencer-info">
            <h3>{{ selectedEvaluation.targetName }}</h3>
            <p>评价人：{{ selectedEvaluation.evaluatorName }}</p>
            <p>评价时间：{{ formatDate(selectedEvaluation.createdAt) }}</p>
          </div>
          <div class="overall-score">
            <div class="score-label">综合评分</div>
            <div class="score-value">{{ selectedEvaluation.overallScore }}</div>
            <el-rate
              v-model="selectedEvaluation.overallScore"
              disabled
              show-score
              text-color="#ff9900"
            />
          </div>
        </div>

        <div class="detail-content">
          <div class="ratings-section">
            <h4>各维度评分</h4>
            <div class="ratings-grid">
              <div
                v-for="rating in selectedEvaluation.ratings"
                :key="rating.dimension"
                class="rating-item"
              >
                <div class="rating-header">
                  <span class="dimension-name">{{ getDimensionName(rating.dimension) }}</span>
                  <span class="rating-score">{{ rating.score }}</span>
                </div>
                <el-rate v-model="rating.score" disabled />
                <p class="rating-comment">{{ rating.comment }}</p>
              </div>
            </div>
          </div>

          <div class="comment-section">
            <h4>评价内容</h4>
            <p class="comment-content">{{ selectedEvaluation.comment }}</p>
          </div>

          <div class="tags-section">
            <h4>评价标签</h4>
            <div class="tags-list">
              <el-tag
                v-for="tag in selectedEvaluation.tags"
                :key="tag"
                class="tag-item"
              >
                {{ tag }}
              </el-tag>
            </div>
          </div>

          <div v-if="selectedEvaluation.cooperationProject" class="project-section">
            <h4>合作项目</h4>
            <p>{{ selectedEvaluation.cooperationProject }}</p>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 新增/编辑评价对话框 -->
    <el-dialog
      v-model="showFormDialog"
      :title="isEdit ? '编辑评价' : '新增评价'"
      width="700px"
      :before-close="handleFormClose"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="达人" prop="targetId">
          <el-select
            v-model="formData.targetId"
            placeholder="请选择达人"
            filterable
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

        <el-form-item label="各维度评分">
          <div class="rating-form-grid">
            <div
              v-for="dimension in INFLUENCER_RATING_DIMENSIONS"
              :key="dimension.key"
              class="rating-form-item"
            >
              <div class="dimension-label">{{ dimension.name }}</div>
              <el-rate v-model="formData.ratings[dimension.key]" show-score />
              <el-input
                v-model="formData.ratingComments[dimension.key]"
                placeholder="评价说明"
                type="textarea"
                :rows="2"
                class="rating-comment-input"
              />
            </div>
          </div>
        </el-form-item>

        <el-form-item label="评价内容" prop="comment">
          <el-input
            v-model="formData.comment"
            type="textarea"
            :rows="4"
            placeholder="请输入详细的评价内容"
          />
        </el-form-item>

        <el-form-item label="评价标签">
          <el-select
            v-model="formData.tags"
            multiple
            placeholder="请选择评价标签"
            style="width: 100%"
          >
            <el-option
              v-for="tag in EVALUATION_TAGS"
              :key="tag"
              :label="tag"
              :value="tag"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="合作项目">
          <el-input
            v-model="formData.cooperationProject"
            placeholder="请输入合作项目名称"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showFormDialog = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'

// 常量
const INFLUENCER_RATING_DIMENSIONS = [
  { key: 'content_quality', name: '内容质量' },
  { key: 'engagement', name: '互动效果' },
  { key: 'professionalism', name: '专业度' },
  { key: 'cooperation', name: '合作配合度' }
]

const EVALUATION_TAGS = [
  '内容优质', '互动良好', '专业可靠', '配合度高',
  '创意突出', '执行力强', '粉丝活跃', '转化效果好'
]

// 响应式数据
const loading = ref(false)
const showDetailDialog = ref(false)
const showFormDialog = ref(false)
const isEdit = ref(false)
const selectedEvaluation = ref(null)

const searchForm = reactive({
  influencerName: '',
  status: '',
  scoreRange: [1, 5]
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const formData = reactive({
  targetId: '',
  ratings: {},
  ratingComments: {},
  comment: '',
  tags: [],
  cooperationProject: ''
})

const formRules = {
  targetId: [{ required: true, message: '请选择达人', trigger: 'change' }],
  comment: [{ required: true, message: '请输入评价内容', trigger: 'blur' }]
}

const evaluations = ref([
  {
    id: 1,
    targetName: '美妆达人小王',
    evaluatorName: '项目经理张三',
    overallScore: 4.5,
    comment: '合作愉快，内容质量很高，粉丝互动效果良好，期待下次合作。',
    tags: ['内容优质', '互动良好', '专业可靠'],
    createdAt: '2024-01-15',
    status: 'active',
    ratings: [
      { dimension: 'content_quality', score: 5, comment: '内容制作精良' },
      { dimension: 'engagement', score: 4, comment: '粉丝互动积极' },
      { dimension: 'professionalism', score: 4, comment: '专业度较高' },
      { dimension: 'cooperation', score: 5, comment: '配合度很好' }
    ],
    cooperationProject: '春季美妆推广活动'
  },
  {
    id: 2,
    targetName: '时尚博主Lisa',
    evaluatorName: '品牌经理李四',
    overallScore: 4.2,
    comment: '时尚感很强，但有时候沟通需要更及时一些。',
    tags: ['创意突出', '时尚感强'],
    createdAt: '2024-01-20',
    status: 'active',
    ratings: [
      { dimension: 'content_quality', score: 5, comment: '创意很棒' },
      { dimension: 'engagement', score: 4, comment: '互动不错' },
      { dimension: 'professionalism', score: 3, comment: '需要提升' },
      { dimension: 'cooperation', score: 4, comment: '总体良好' }
    ],
    cooperationProject: '夏日时尚穿搭'
  }
])

const influencerOptions = ref([
  { id: 1, name: '美妆达人小王' },
  { id: 2, name: '时尚博主Lisa' },
  { id: 3, name: '健身达人Mike' }
])

// 方法
const handleAdd = () => {
  isEdit.value = false
  resetFormData()
  showFormDialog.value = true
}

const handleSearch = () => {
  ElMessage.info('搜索功能')
}

const handleReset = () => {
  searchForm.influencerName = ''
  searchForm.status = ''
  searchForm.scoreRange = [1, 5]
  ElMessage.success('重置成功')
}

const handleSelectionChange = (selection: any[]) => {
  // 处理选择变化
}

const handleView = (row: any) => {
  selectedEvaluation.value = row
  showDetailDialog.value = true
}

const handleEdit = (row: any) => {
  isEdit.value = true
  Object.assign(formData, row)
  showFormDialog.value = true
}

const handleDelete = (row: any) => {
  ElMessageBox.confirm(`确定删除对 ${row.targetName} 的评价吗？`, '提示', {
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

const handleDetailClose = () => {
  selectedEvaluation.value = null
}

const handleFormClose = () => {
  resetFormData()
}

const handleSubmit = () => {
  ElMessage.success('保存成功')
  showFormDialog.value = false
}

const resetFormData = () => {
  formData.targetId = ''
  formData.ratings = {}
  formData.ratingComments = {}
  formData.comment = ''
  formData.tags = []
  formData.cooperationProject = ''
}

// 工具方法
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const getDimensionName = (dimension: string) => {
  const dimensionMap: Record<string, string> = {
    content_quality: '内容质量',
    engagement: '互动效果',
    professionalism: '专业度',
    cooperation: '合作配合度'
  }
  return dimensionMap[dimension] || dimension
}

onMounted(() => {
  pagination.total = evaluations.value.length
})
</script>

<style scoped>
.influencer-evaluation {
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

.comment-text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.tag-item {
  margin-right: 8px;
  margin-bottom: 4px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.evaluation-detail {
  padding: 16px 0;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.influencer-info h3 {
  margin: 0 0 8px 0;
  color: #303133;
}

.influencer-info p {
  margin: 4px 0;
  color: #606266;
  font-size: 14px;
}

.overall-score {
  text-align: center;
}

.score-label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
}

.score-value {
  font-size: 32px;
  font-weight: 600;
  color: #ff9900;
  margin-bottom: 8px;
}

.detail-content h4 {
  margin: 24px 0 16px 0;
  color: #303133;
  font-size: 16px;
}

.ratings-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.rating-item {
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.rating-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.dimension-name {
  font-weight: 600;
  color: #303133;
}

.rating-score {
  font-size: 18px;
  font-weight: 600;
  color: #ff9900;
}

.rating-comment {
  margin: 8px 0 0 0;
  font-size: 13px;
  color: #606266;
}

.comment-content {
  background: #f5f7fa;
  padding: 16px;
  border-radius: 8px;
  line-height: 1.6;
  color: #303133;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.project-section p {
  background: #f0f9ff;
  padding: 12px;
  border-radius: 6px;
  color: #1f2937;
  border-left: 4px solid #3b82f6;
}

.rating-form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.rating-form-item {
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.dimension-label {
  font-weight: 600;
  margin-bottom: 8px;
  color: #303133;
}

.rating-comment-input {
  margin-top: 8px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>