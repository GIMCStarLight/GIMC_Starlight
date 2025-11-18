<template>
  <div class="page-container">
    <div class="content-card">
      <!-- 简洁页面标题 -->
      <div class="simple-page-header">
        <div class="header-content">
          <h1 class="page-title">达人管理</h1>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增达人
          </el-button>
        </div>
      </div>

      <!-- 搜索筛选 -->
      <UnifiedSearchPanel
        v-model="unifiedSearchForm"
        :basic-fields="influencerBasicFields"
        :advanced-groups="influencerAdvancedGroups"
        :show-result-stats="true"
        :result-stats="{ total: pagination?.total || 0, filtered: tableData.length }"
        @search="handleSearch"
        @reset="handleReset"
        @field-change="handleFieldChange"
      />

      <div class="table-section">
        <el-card class="table-card" shadow="never">
          <template #header>
            <div class="table-header">
              <span class="table-title">
                <el-icon><User /></el-icon>
                达人列表
              </span>
              <div class="table-info">
                <el-text type="info">共 {{ pagination.total }} 条记录</el-text>
              </div>
            </div>
          </template>

          <!-- 批量操作工具栏 -->
          <div v-if="selectedInfluencers.length > 0" class="batch-toolbar">
            <div class="batch-info">
              <span>已选择 {{ selectedInfluencers.length }} 个达人</span>
              <el-button text type="primary" @click="clearSelection">取消选择</el-button>
            </div>
            <div class="batch-actions">
              <el-button
                type="primary"
                @click="handleBatchView"
                :disabled="selectedInfluencers.length === 0"
              >
                <el-icon><View /></el-icon>
                批量查看
              </el-button>
              <el-button
                type="warning"
                @click="handleBatchEdit"
                :disabled="selectedInfluencers.length !== 1"
              >
                <el-icon><Edit /></el-icon>
                编辑（单选）
              </el-button>
              <el-button
                type="danger"
                @click="handleBatchDelete"
                :disabled="selectedInfluencers.length === 0"
              >
                <el-icon><Delete /></el-icon>
                批量删除
              </el-button>
            </div>
          </div>
          <el-table
            ref="tableRef"
            v-loading="loading"
            :data="tableData"
            style="width: 100%"
            @sort-change="handleSortChange"
            @row-click="handleRowClick"
            @selection-change="handleSelectionChange"
            class="modern-table"
          >
            <el-table-column type="selection" width="48" align="center" />
            <el-table-column prop="nickname" label="达人信息" min-width="160" sortable="custom">
              <template #default="{ row }">
                <div class="user-info">
                  <div class="user-avatar">
                    <el-avatar :size="40" :src="getInfluencerAvatar(row)">
                      {{ row.nickname?.charAt(0) }}
                    </el-avatar>
                  </div>
                  <div class="user-details">
                    <div class="user-name">
                      <el-link type="primary" @click="handleViewDetail(row)">
                        {{ row.nickname }}
                      </el-link>
                    </div>
                  </div>
                </div>
              </template>
            </el-table-column>

            <!-- 1. 平台信息 - 使用logo -->
            <el-table-column prop="platform" label="平台信息" width="120" align="center">
              <template #default="{ row }">
                <div class="platform-info">
                  <div class="platform-logo" v-if="getPlatformLogo(row.platform)">
                    <img :src="getPlatformLogo(row.platform)" :alt="getPlatformLabel(row.platform)" class="platform-icon" />
                  </div>
                  <div class="platform-text" v-else>
                    {{ getPlatformLabel(row.platform) }}
                  </div>
                  <div class="account-type">{{ getAccountTypeLabel(row.accountType) }}</div>
                </div>
              </template>
            </el-table-column>

            <!-- 2. 粉丝量 -->
            <el-table-column prop="fansCount" label="粉丝量" width="120" sortable="custom">
              <template #default="{ row }">
                <div class="followers-count">{{ formatNumber(row.fansCount) }}</div>
              </template>
            </el-table-column>

            <!-- 3. 状态 -->
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getStatusTagType(row.status)" size="small">
                  {{ getStatusLabel(row.status) }}
                </el-tag>
              </template>
            </el-table-column>

            <!-- 4. 内容分类 -->
            <el-table-column prop="contentCategory" label="内容分类" width="120">
              <template #default="{ row }">
                <el-tag size="small" type="info">
                  {{ getContentCategoryLabel(row.contentCategory) }}
                </el-tag>
              </template>
            </el-table-column>

            <!-- 5. 合作政策 -->
            <el-table-column prop="cooperationPolicy" label="合作政策" width="120" align="center">
              <template #default="{ row }">
                <el-tooltip effect="light" placement="top" trigger="hover">
                  <template #content>
                    <div class="policy-tooltip">
                      <h4>合作政策详情</h4>
                      <p><strong>返点比例：</strong>{{ getPolicyInfo(row).returnRate }}</p>
                      <p><strong>资源支持：</strong>{{ getPolicyInfo(row).resourceSupport }}</p>
                      <p><strong>项目自主性：</strong>{{ getPolicyInfo(row).projectAutonomy }}</p>
                      <p><strong>政策描述：</strong>{{ getPolicyInfo(row).description }}</p>
                    </div>
                  </template>
                  <div class="policy-stars">
                    <el-rate
                      :model-value="getPolicyInfo(row).stars"
                      disabled
                      :max="5"
                      size="small"
                      :colors="['#99A9BF', '#F7BA2A', '#FF9900']"
                    />
                  </div>
                </el-tooltip>
              </template>
            </el-table-column>

            <!-- 6. 合作次数 -->
            <el-table-column label="合作次数" width="100" align="center">
              <template #default="{ row }">
                <div class="cooperation-count">
                  <span class="count-number">{{ row.cooperationCount || 0 }}</span>
                  <span class="count-unit">次</span>
                </div>
              </template>
            </el-table-column>

            <!-- 7. 价格范围 - 简洁展示 -->
            <el-table-column label="价格范围" width="120">
              <template #default="{ row }">
                <div class="price-info" v-if="row.priceRange && row.priceRange.min && row.priceRange.max">
                  <div class="price-range">
                    ¥{{ formatPrice(row.priceRange.min) }}-{{ formatPrice(row.priceRange.max) }}
                  </div>
                </div>
                <span v-else class="no-data">-</span>
              </template>
            </el-table-column>

            <!-- 8. 账号ID -->
            <el-table-column prop="accountId" label="账号ID" width="120">
              <template #default="{ row }">
                <div class="account-id">
                  {{ row.accountId || '-' }}
                </div>
              </template>
            </el-table-column>

            <!-- 操作列 -->
            <el-table-column label="操作" width="260" fixed="right">
              <template #default="{ row }">
                <!-- <el-button type="primary" size="small" @click="handleEdit(row)">
                  编辑
                </el-button> -->
                <!-- <el-button type="info" size="small" @click="handleViewDetail(row)">
                  详情
                </el-button> -->
                <el-button type="warning" size="small" @click="handleEvaluate(row)">
                  评价111
                </el-button>
                <!-- <el-button type="danger" size="small" @click="handleDelete(row)">
                  删除
                </el-button> -->
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
      </div>
    </div>

    <!-- 评价对话框 -->
    <EvaluateDialog
      v-model:visible="evaluateDialogVisible"
      :author-id="currentInfluencer?.influencer_id || currentInfluencer?.accountId || ''"
      :reviewer="'当前用户'"
      @submit="handleEvaluateSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { log } from '../../../utils/logger'
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, User, View, Edit, Delete } from '@element-plus/icons-vue'
import EvaluateDialog from '#/components/EvaluateDialog/index.vue'
import { getKolReviewsApi } from '#/api/kol-reviews'

// 响应式数据
const loading = ref(false)
const tableData = ref([])
const selectedInfluencers = ref([])
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 评价相关数据
const evaluateDialogVisible = ref(false)
const currentInfluencer = ref<any>(null)

// 搜索表单
const unifiedSearchForm = ref({})
const influencerBasicFields = ref([
  { key: 'nickname', label: '达人昵称', type: 'input' },
  { key: 'platform', label: '平台', type: 'select', options: [] },
  { key: 'status', label: '状态', type: 'select', options: [] }
])
const influencerAdvancedGroups = ref([])

// 方法
const handleAdd = () => {
  ElMessage.info('新增达人功能')
}

const handleSearch = () => {
  ElMessage.info('搜索功能')
}

const handleReset = () => {
  ElMessage.info('重置功能')
}

const handleFieldChange = () => {
  // 字段变化处理
}

const handleBatchView = () => {
  ElMessage.info('批量查看功能')
}

const handleBatchEdit = () => {
  ElMessage.info('批量编辑功能')
}

const handleBatchDelete = () => {
  ElMessage.info('批量删除功能')
}

const clearSelection = () => {
  selectedInfluencers.value = []
}

const handleSortChange = () => {
  ElMessage.info('排序功能')
}

const handleRowClick = () => {
  // 行点击处理
}

const handleSelectionChange = (selection: any[]) => {
  selectedInfluencers.value = selection
}

const handleViewDetail = (row: any) => {
  ElMessage.info(`查看达人详情: ${row.nickname}`)
}

const handleEdit = (row: any) => {
  ElMessage.info(`编辑达人: ${row.nickname}`)
}

const handleDelete = (row: any) => {
  ElMessageBox.confirm(`确定删除达人 ${row.nickname} 吗？`, '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    ElMessage.success('删除成功')
  })
}

// 评价相关方法
const handleEvaluate = async (row: any) => {
  log.debug('评价达人:', row)
  currentInfluencer.value = row
  
  try {
    // 检查是否已有评价数据，使用 influencer_id 作为达人ID
    const starId = row.influencer_id || row.accountId || row.id
    if (starId) {
      const response = await getKolReviewsApi(starId)
      if (response.data && response.data.length > 0) {
        // 有评价数据，显示查看模式
        ElMessage.info(`${row.nickname} 已有评价数据，点击查看详情`)
        // 这里可以扩展为显示评价详情的对话框
        showExistingReviews(response.data)
      } else {
        // 无评价数据，打开新增评价对话框
        evaluateDialogVisible.value = true
      }
    } else {
      ElMessage.warning('该达人缺少必要的ID信息，无法进行评价')
    }
  } catch (error) {
    log.error('获取评价数据失败:', error)
    // 如果API调用失败，仍然允许新增评价
    evaluateDialogVisible.value = true
  }
}

const showExistingReviews = (reviews: any[]) => {
  // 显示现有评价的详情
  const reviewsText = reviews.map(review => 
    `评分: ${review.score}分\n评价: ${review.comment}\n评价时间: ${review.createdAt}`
  ).join('\n\n')
  
  ElMessageBox.alert(reviewsText, `${currentInfluencer.value?.nickname} 的评价记录`, {
    confirmButtonText: '确定',
    type: 'info'
  })
}

const handleEvaluateSubmit = (data: any) => {
  ElMessage.success(`评价提交成功！评分: ${data.score}分`)
  evaluateDialogVisible.value = false
  currentInfluencer.value = null
}

const handleSizeChange = (size: number) => {
  pagination.pageSize = size
}

const handleCurrentChange = (page: number) => {
  pagination.page = page
}

// 工具方法
const getInfluencerAvatar = (row: any) => {
  return row.avatar || ''
}

const getPlatformLogo = (platform: string) => {
  // 返回平台logo
  return ''
}

const getPlatformLabel = (platform: string) => {
  const platformMap: Record<string, string> = {
    douyin: '抖音',
    xiaohongshu: '小红书',
    weibo: '微博',
    bilibili: 'B站'
  }
  return platformMap[platform] || platform
}

const getAccountTypeLabel = (type: string) => {
  const typeMap: Record<string, string> = {
    personal: '个人',
    enterprise: '企业'
  }
  return typeMap[type] || type
}

const formatNumber = (num: number) => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w'
  }
  return num?.toString() || '0'
}

const getStatusTagType = (status: string) => {
  const statusMap: Record<string, string> = {
    active: 'success',
    inactive: 'danger',
    pending: 'warning'
  }
  return statusMap[status] || 'info'
}

const getStatusLabel = (status: string) => {
  const statusMap: Record<string, string> = {
    active: '活跃',
    inactive: '不活跃',
    pending: '待审核'
  }
  return statusMap[status] || status
}

const getContentCategoryLabel = (category: string) => {
  const categoryMap: Record<string, string> = {
    beauty: '美妆',
    fashion: '时尚',
    food: '美食',
    travel: '旅行'
  }
  return categoryMap[category] || category
}

const getPolicyInfo = (row: any) => {
  return {
    returnRate: '15%',
    resourceSupport: '高',
    projectAutonomy: '中',
    description: '优质合作政策',
    stars: 4
  }
}

const formatPrice = (price: number) => {
  return price?.toLocaleString() || '0'
}

onMounted(() => {
  // 初始化数据
  tableData.value = [
    {
      id: 1,
      influencer_id: 1001,  // 添加达人专用ID
      nickname: '美妆达人小王',
      platform: 'douyin',
      accountType: 'personal',
      fansCount: 150000,
      status: 'active',
      contentCategory: 'beauty',
      cooperationCount: 5,
      priceRange: { min: 5000, max: 15000 },
      accountId: 'xiaowang123'
    },
    {
      id: 2,
      influencer_id: 1002,  // 添加第二个测试数据
      nickname: '时尚博主Lisa',
      platform: 'xiaohongshu',
      accountType: 'personal',
      fansCount: 280000,
      status: 'active',
      contentCategory: 'fashion',
      cooperationCount: 8,
      priceRange: { min: 8000, max: 25000 },
      accountId: 'lisa_fashion'
    },
    {
      id: 3,
      influencer_id: 1003,  // 添加第三个测试数据
      nickname: '美食探店王',
      platform: 'douyin',
      accountType: 'business',
      fansCount: 520000,
      status: 'active',
      contentCategory: 'food',
      cooperationCount: 12,
      priceRange: { min: 10000, max: 30000 },
      accountId: 'foodie_wang'
    }
  ]
  pagination.total = 3
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

.table-section {
  margin-top: 20px;
}

.table-card {
  border: 1px solid #e4e7ed;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.batch-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f5f7fa;
  border-radius: 4px;
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

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-details {
  flex: 1;
}

.user-name {
  font-weight: 500;
}

.platform-info {
  text-align: center;
}

.platform-icon {
  width: 24px;
  height: 24px;
}

.account-type {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.followers-count {
  font-weight: 500;
  color: #409eff;
}

.policy-tooltip h4 {
  margin: 0 0 8px 0;
  color: #303133;
}

.policy-tooltip p {
  margin: 4px 0;
  font-size: 13px;
}

.cooperation-count {
  text-align: center;
}

.count-number {
  font-weight: 600;
  color: #409eff;
}

.count-unit {
  font-size: 12px;
  color: #909399;
  margin-left: 2px;
}

.price-info {
  text-align: center;
}

.price-range {
  font-weight: 500;
  color: #e6a23c;
}

.account-id {
  font-family: monospace;
  font-size: 13px;
  color: #606266;
}

.no-data {
  color: #c0c4cc;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.modern-table {
  --el-table-border-color: #e4e7ed;
  --el-table-header-bg-color: #f5f7fa;
}
</style>
