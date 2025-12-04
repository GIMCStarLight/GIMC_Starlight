<script setup lang="ts">
import { log } from '../../utils/logger'
import { ref, onMounted, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { IconifyIcon } from '@vben/icons'
import { getKolReviewsByAuthorIdApi, type KolReviewInfo } from '../../api/kol-reviews'
import EvaluateDialog from '../EvaluateDialog/index.vue'

interface Props {
  authorId: string
  authorName?: string
}

const props = defineProps<Props>()

const reviews = ref<KolReviewInfo[]>([])
const loading = ref(false)
const showEvaluateDialog = ref(false)

// 加载评价列表
const loadReviews = async () => {
  if (!props.authorId) return
  
  loading.value = true
  try {
    const data = await getKolReviewsByAuthorIdApi(props.authorId)
    reviews.value = data || []
  } catch (error) {
    log.error('加载评价失败:', error)
    ElMessage.error('加载评价失败')
  } finally {
    loading.value = false
  }
}

// 打开评价弹窗
const handleAddReview = () => {
  showEvaluateDialog.value = true
}

// 评价提交成功回调
const handleReviewSubmitted = () => {
  loadReviews()
  showEvaluateDialog.value = false
}

// 显式处理弹窗可见性更新，替代 v-model 语法
const updateDialogVisible = (val: boolean) => {
  showEvaluateDialog.value = val
}

// 格式化日期
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 获取状态标签类型
const getStatusType = (status?: string) => {
  if (!status) return 'info'
  const map: Record<string, any> = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger'
  }
  return map[status] || 'info'
}

// 获取状态文本
const getStatusText = (status?: string) => {
  if (!status) return '未知'
  const map: Record<string, string> = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已驳回'
  }
  return map[status] || status
}

// 获取评分描述
const getScoreDesc = (score: number) => {
  if (score >= 4.5) return '非常满意'
  if (score >= 3.5) return '比较满意'
  if (score >= 2.5) return '一般'
  if (score >= 1.5) return '不太满意'
  return '非常不满意'
}

// 计算统计数据
const statistics = computed(() => {
  const total = reviews.value.length
  const avgScore = total > 0 
    ? (reviews.value.reduce((sum, r) => sum + r.score, 0) / total).toFixed(1)
    : '0.0'
  
  const statusCount = reviews.value.reduce((acc, r) => {
    const status = r.status || 'unknown'
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  return {
    total,
    avgScore,
    pending: statusCount.pending || 0,
    approved: statusCount.approved || 0,
    rejected: statusCount.rejected || 0
  }
})

watch(() => props.authorId, () => {
  if (props.authorId) {
    loadReviews()
  }
}, { immediate: true })
</script>

<template>
  <div class="kol-reviews-tab">
    <!-- 统计卡片 -->
    <el-row :gutter="16" class="statistics-row">
      <el-col :span="6">
        <el-card shadow="never">
          <div class="price-info-item">
            <span class="price-info-label">总评价数</span>
            <div class="price-info-value">
              <span class="price-amount">
                <span class="price-number">{{ statistics.total }}</span>
                <span class="price-unit">条</span>
              </span>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="never">
          <div class="price-info-item">
            <span class="price-info-label">平均评分</span>
            <div class="price-info-value">
              <span class="price-amount">
                <span class="price-number">{{ statistics.avgScore }}</span>
                <span class="price-unit">分</span>
              </span>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="never">
          <div class="price-info-item">
            <span class="price-info-label">已通过</span>
            <div class="price-info-value">
              <span class="price-amount">
                <span class="price-number">{{ statistics.approved }}</span>
                <span class="price-unit">条</span>
              </span>
            </div>
          </div>
        </el-card>
      </el-col>

      <el-col :span="6">
        <el-card shadow="never">
          <div class="price-info-item">
            <span class="price-info-label">待审核</span>
            <div class="price-info-value">
              <span class="price-amount">
                <span class="price-number">{{ statistics.pending }}</span>
                <span class="price-unit">条</span>
              </span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 操作栏 -->
    <div class="action-bar">
      <el-button type="primary" @click="handleAddReview">
        <IconifyIcon icon="lucide:plus" class="btn-icon" />
        添加评价
      </el-button>
      <el-button @click="loadReviews">
        <IconifyIcon icon="lucide:refresh-cw" class="btn-icon" />
        刷新
      </el-button>
    </div>

    <!-- 评价列表 -->
    <div v-loading="loading" class="reviews-list">
      <el-empty v-if="!loading && reviews.length === 0" description="暂无评价数据" />
      
      <div v-else class="reviews-container">
        <el-card
          v-for="review in reviews"
          :key="review.id"
          shadow="hover"
          class="review-card"
        >
          <!-- 评价头部 -->
          <div class="review-header">
            <div class="reviewer-info">
              <el-avatar :size="40" class="reviewer-avatar">
                {{ review.reviewer?.[0] || 'U' }}
              </el-avatar>
              <div class="reviewer-details">
                <div class="reviewer-name">{{ review.reviewer }}</div>
                <div class="review-time">{{ formatDate(review.createdAt) }}</div>
              </div>
            </div>
            
            <div class="review-status">
              <el-tag :type="getStatusType(review.status)" size="small">
                {{ getStatusText(review.status) }}
              </el-tag>
            </div>
          </div>

          <!-- 评分展示 -->
          <div class="review-rating">
            <div class="stars">
              <IconifyIcon
                v-for="star in 5"
                :key="star"
                class="star"
                :class="{ 'star-filled': star <= review.score }"
                icon="lucide:star"
              />
            </div>
            <div class="score-info">
              <span class="score-value">{{ review.score }}</span>
              <span class="score-desc">{{ getScoreDesc(review.score) }}</span>
            </div>
          </div>

          <!-- 评价内容 -->
          <div class="review-content">
            {{ review.content }}
          </div>

          <!-- 评价标签 -->
          <div v-if="review.reviewTags && review.reviewTags.length > 0" class="review-tags">
            <el-tag
              v-for="tag in review.reviewTags"
              :key="tag"
              size="small"
              effect="plain"
              class="tag-item"
            >
              {{ tag }}
            </el-tag>
          </div>

          <!-- 评价类型 -->
          <div class="review-footer">
            <el-tag v-if="review.reviewType" size="small" effect="plain">
              {{ review.reviewType === 'internal' ? '内部评价' : '外部评价' }}
            </el-tag>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 评价弹窗 -->
    <EvaluateDialog
      :visible="showEvaluateDialog"
      :author-id="authorId"
      reviewer="系统管理员"
      @update:visible="updateDialogVisible"
      @review-submitted="handleReviewSubmitted"
    />
  </div>
</template>

<style scoped>
.kol-reviews-tab {
  padding: 20px;
}

/* 统计卡片样式 */
.statistics-row {
  margin-bottom: 20px;
}

/* 预期播放量数据项样式 */
.price-info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  transition: all 0.3s ease;
}

.price-info-item:hover {
  background-color: #f8f9fa;
}

.price-info-label {
  color: #909399;
  font-size: 13px;
  font-weight: 500;
}

.price-info-value {
  margin-top: 4px;
}

.price-amount {
  font-size: 18px;
  font-weight: 400;
  color: #409eff;
}

.price-amount .price-number {
  margin-left: 2px;
}

.price-unit {
  font-size: 13px;
  color: #909399;
  font-weight: normal;
  margin-left: 4px;
}

/* 操作栏样式 */
.action-bar {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}

.btn-icon {
  margin-right: 4px;
}

/* 评价列表样式 */
.reviews-list {
  min-height: 300px;
}

.reviews-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.review-card {
  transition: all 0.3s;
}

.review-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 评价头部 */
.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.reviewer-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.reviewer-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
}

.reviewer-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.reviewer-name {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}

.review-time {
  font-size: 12px;
  color: #909399;
}

/* 评分展示 */
.review-rating {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 15px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.stars {
  display: flex;
  gap: 4px;
}

.star {
  font-size: 18px;
  color: #dcdfe6;
}

.star.star-filled {
  color: #f7ba2a;
}

.score-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.score-value {
  font-size: 20px;
  font-weight: 600;
  color: #f7ba2a;
}

.score-desc {
  font-size: 13px;
  color: #606266;
}

/* 评价内容 */
.review-content {
  color: #606266;
  line-height: 1.6;
  margin-bottom: 15px;
  word-break: break-word;
}

/* 评价标签 */
.review-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 15px;
}

.tag-item {
  cursor: default;
}

/* 评价底部 */
.review-footer {
  padding-top: 12px;
  border-top: 1px solid #ebeef5;
}
</style>
