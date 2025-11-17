<script setup lang="ts">
import { ref, watch } from 'vue'
import { IconifyIcon } from '@vben/icons'
import { ElMessage } from 'element-plus'
import { getInfluencerFullData } from '../../api/influencer-v2'
import { createKolReviewApi, getKolReviewsByAuthorIdApi, type CreateKolReviewDto, type KolReviewInfo } from '../../api/kol-reviews'

interface Props {
    visible: boolean
    authorId?: string  // 改为string类型
    reviewer?: string
}

const props = withDefaults(defineProps<Props>(), {
    visible: false,
    authorId: '',  // 默认空字符串
    reviewer: '系统用户'
})

const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void
    (e: 'review-submitted', review: KolReviewInfo): void
}>()

// 达人信息
const authorInfo = ref<{
  nickName?: string
  avatarUri?: string
  authorType?: string
  follower?: number
}>({});
import { log } from '#/utils/logger';
const loadingAuthorInfo = ref(false)

// 加载达人信息
const loadAuthorInfo = async () => {
  if (!props.authorId) return
  
  try {
    loadingAuthorInfo.value = true
    const data = await getInfluencerFullData(props.authorId)
    authorInfo.value = {
      nickName: data.nick_name || '未知达人',
      avatarUri: data.avatar_uri,
      authorType: data.author_type === '1' ? 'mega' : 'normal',
      follower: data.follower
    }
  } catch (error) {
    log.error('加载达人信息失败:', error)
    authorInfo.value = {
      nickName: '未知达人'
    }
  } finally {
    loadingAuthorInfo.value = false
  }
}

// 格式化粉丝数
const formatFollower = (num?: number) => {
  if (!num) return '0'
  // 显示原始数值，使用千分位分隔符
  return num.toLocaleString()
}

// 预定义标签列表
const availableTags = [
  '内容优质',
  '数据真实',
  '性价比高',
  '配合度高',
  '回复及时',
  '粉丝活跃',
  '转化率高',
  '专业性强',
  '创意新颖',
  '态度认真',
  '数据虚假',
  '价格虚高',
  '配合度差',
  '内容质量低',
  '粉丝质量差'
]

// 选中的标签
const selectedTags = ref<string[]>([])

// 切换标签选择
const toggleTag = (tag: string) => {
  const index = selectedTags.value.indexOf(tag)
  if (index > -1) {
    selectedTags.value.splice(index, 1)
  } else {
    if (selectedTags.value.length >= 5) {
      ElMessage.warning('最多选择5个标签')
      return
    }
    selectedTags.value.push(tag)
  }
}

// 星星评分相关
const currentScore = ref(0)
const hoverScore = ref(0)

const handleStarClick = (score: number) => {
    currentScore.value = score
}

const handleStarHover = (score: number) => {
    hoverScore.value = score
}

const handleStarLeave = () => {
    hoverScore.value = 0
}

// 评论内容
const reviewContent = ref('')

// 提交状态
const isSubmitting = ref(false)

// 已有评价数据
const existingReviews = ref<KolReviewInfo[]>([])
const isLoadingReviews = ref(false)

// 获取已有评价
const loadExistingReviews = async () => {
    if (!props.authorId) return
    
    try {
        isLoadingReviews.value = true
        const reviews = await getKolReviewsByAuthorIdApi(props.authorId)
        existingReviews.value = reviews || []
    } catch (error) {
        log.error('获取评价失败:', error)
        existingReviews.value = []
    } finally {
        isLoadingReviews.value = false
    }
}

// 重置表单
const resetForm = () => {
    currentScore.value = 0
    hoverScore.value = 0
    reviewContent.value = ''
    selectedTags.value = []
    isSubmitting.value = false
}

const handleClose = () => {
    resetForm()
    emit('update:visible', false)
}

// 提交评价
const handleSubmit = async () => {
    log.debug('=== EvaluateDialog 提交评价调试信息 ===')
    log.debug('props.authorId:', props.authorId)
    log.debug('currentScore.value:', currentScore.value)
    log.debug('reviewContent.value:', reviewContent.value)
    
    if (currentScore.value === 0) {
        ElMessage.warning('请选择评分')
        return
    }
    
    if (!reviewContent.value.trim()) {
        ElMessage.warning('请输入评价内容')
        return
    }

    if (!props.authorId) {
        ElMessage.error('缺少达人ID')
        return
    }

    try {
        isSubmitting.value = true
        
        const reviewData: CreateKolReviewDto = {
            authorId: props.authorId,
            reviewer: props.reviewer,
            score: currentScore.value,
            content: reviewContent.value.trim(),
            reviewTags: selectedTags.value.length > 0 ? selectedTags.value : undefined
        }
        
        log.debug('准备提交的评价数据:', reviewData)

        const result = await createKolReviewApi(reviewData)
        
        ElMessage.success('评价提交成功')
        emit('review-submitted', result)
        
        // 重新加载已有评价
        await loadExistingReviews()
        
        // 重置表单但不关闭对话框，让用户看到新提交的评价
        resetForm()
    } catch (error) {
        log.error('提交评价失败:', error)
        ElMessage.error('提交评价失败，请重试')
    } finally {
        isSubmitting.value = false
    }
}

// 监听visible和authorId变化
watch(() => props.visible, (newVal) => {
    if (newVal && props.authorId) {
        loadExistingReviews()
        loadAuthorInfo()
    } else if (!newVal) {
        resetForm()
    }
})

watch(() => props.authorId, (newVal) => {
    if (newVal && props.visible) {
        loadExistingReviews()
        loadAuthorInfo()
    }
})
</script>

<template>
    <el-dialog
        title="达人评价"
        :model-value="visible"
        @update:model-value="handleClose"
        width="600px"
        :close-on-click-modal="false"
    >
        <div class="evaluate-dialog">
            <!-- 已有评价显示区域 -->
            <div class="existing-reviews-section" v-if="existingReviews.length > 0">
                <h4 class="section-title">已有评价</h4>
                <div v-loading="isLoadingReviews" class="reviews-list">
                    <div 
                        v-for="review in existingReviews" 
                        :key="review.id"
                        class="review-item"
                    >
                        <div class="review-header">
                            <div class="reviewer-info">
                                <span class="reviewer-name">{{ review.reviewer }}</span>
                                <div class="review-stars">
                                    <IconifyIcon
                                        v-for="star in 5"
                                        :key="star"
                                        class="star-small"
                                        :class="{
                                            'star-filled': star <= review.score,
                                            'star-empty': star > review.score
                                        }"
                                        icon="lucide:star"
                                    />
                                    <span class="score-number">({{ review.score }}分)</span>
                                </div>
                            </div>
                            <div class="review-date">
                                {{ new Date(review.createdAt).toLocaleDateString() }}
                            </div>
                        </div>
                        <div class="review-content">
                            {{ review.content }}
                        </div>
                    </div>
                </div>
                <el-divider />
            </div>

            <!-- 新增评价区域 -->
            <div class="new-review-section">
                <h4 class="section-title">{{ existingReviews.length > 0 ? '添加新评价' : '评价达人' }}</h4>
                
                <!-- 达人信息卡片 -->
                <div v-if="authorInfo.nickName" class="author-card" v-loading="loadingAuthorInfo">
                    <el-avatar :size="50" :src="authorInfo.avatarUri" class="author-avatar">
                        {{ authorInfo.nickName?.[0] || '达' }}
                    </el-avatar>
                    <div class="author-info">
                        <div class="author-name">{{ authorInfo.nickName }}</div>
                        <div class="author-meta">
                            <el-tag size="small" type="primary">{{ authorInfo.authorType === 'mega' ? '头部达人' : '普通达人' }}</el-tag>
                            <span class="follower-count">
                                <IconifyIcon icon="lucide:users" />
                                {{ formatFollower(authorInfo.follower) }}
                            </span>
                        </div>
                    </div>
                </div>
                
                <!-- 星星评分区域 -->
                <div class="rating-section">
                    <h5 class="sub-title">评分 (1-5星)</h5>
                    <div class="star-rating">
                        <IconifyIcon
                            v-for="star in 5"
                            :key="star"
                            class="star"
                            :class="{
                                'star-filled': star <= (hoverScore || currentScore),
                                'star-empty': star > (hoverScore || currentScore)
                            }"
                            icon="lucide:star"
                            @click="handleStarClick(star)"
                            @mouseenter="handleStarHover(star)"
                            @mouseleave="handleStarLeave"
                        />
                    </div>
                    <div class="score-text" v-if="currentScore > 0">
                        当前评分: {{ currentScore }} 星
                    </div>
                </div>

                <!-- 评价标签选择 -->
                <div class="tags-section">
                    <h5 class="sub-title">评价标签 (最多5个)</h5>
                    <div class="tags-grid">
                        <el-tag
                            v-for="tag in availableTags"
                            :key="tag"
                            :type="selectedTags.includes(tag) ? 'success' : 'info'"
                            :effect="selectedTags.includes(tag) ? 'dark' : 'plain'"
                            class="tag-selectable"
                            @click="toggleTag(tag)"
                        >
                            <IconifyIcon v-if="selectedTags.includes(tag)" icon="lucide:check" class="tag-icon" />
                            {{ tag }}
                        </el-tag>
                    </div>
                    <div v-if="selectedTags.length > 0" class="selected-tags-info">
                        已选择: {{ selectedTags.length }}/5
                    </div>
                </div>

                <!-- 评论输入区域 -->
                <div class="comment-section">
                    <h5 class="sub-title">评价内容</h5>
                    <el-input
                        v-model="reviewContent"
                        type="textarea"
                        :rows="4"
                        placeholder="请输入您对这位达人的评价..."
                        maxlength="500"
                        show-word-limit
                    />
                </div>
            </div>
        </div>

        <template #footer>
            <div class="dialog-footer">
                <el-button @click="handleClose" :disabled="isSubmitting">
                    取消
                </el-button>
                <el-button 
                    type="primary" 
                    @click="handleSubmit"
                    :loading="isSubmitting"
                >
                    {{ isSubmitting ? '提交中...' : '提交评价' }}
                </el-button>
            </div>
        </template>
    </el-dialog>
</template>

<style scoped>
.evaluate-dialog {
    padding: 10px 0;
}

.section-title {
    margin: 0 0 15px 0;
    font-size: 16px;
    font-weight: 600;
    color: #303133;
}

.sub-title {
    margin: 0 0 10px 0;
    font-size: 14px;
    font-weight: 500;
    color: #606266;
}

/* 已有评价样式 */
.existing-reviews-section {
    margin-bottom: 20px;
}

.reviews-list {
    max-height: 300px;
    overflow-y: auto;
}

.review-item {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 10px;
}

.review-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 10px;
}

.reviewer-info {
    flex: 1;
}

.reviewer-name {
    font-weight: 600;
    color: #303133;
    margin-right: 10px;
}

.review-stars {
    display: flex;
    align-items: center;
    gap: 2px;
    margin-top: 5px;
}

.star-small {
    font-size: 14px;
}

.star-filled {
    color: #f7ba2a;
}

.star-empty {
    color: #dcdfe6;
}

.score-number {
    margin-left: 5px;
    font-size: 12px;
    color: #909399;
}

.review-date {
    font-size: 12px;
    color: #909399;
}

.review-content {
    color: #606266;
    line-height: 1.5;
    word-break: break-word;
}

/* 新增评价区域样式 */
.new-review-section {
    margin-top: 10px;
}

/* 达人信息卡片样式 */
.author-card {
    display: flex;
    align-items: center;
    background-color: #f5f7fa;
    padding: 15px;
    border-radius: 6px;
    margin-bottom: 10px;
}

.author-avatar {
    margin-right: 15px;
}

.author-info {
    flex: 1;
}

.author-name {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 5px;
}

.author-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    color: #909399;
}

.follower-count {
    display: flex;
    align-items: center;
    gap: 2px;
}

/* 星星评分样式 */
.rating-section {
    margin-bottom: 25px;
}

.star-rating {
    display: flex;
    gap: 8px;
    margin-bottom: 10px;
}

.star {
    font-size: 28px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.star:hover {
    transform: scale(1.1);
}

.score-text {
    font-size: 14px;
    color: #606266;
    font-weight: 500;
}

/* 评价标签选择样式 */
.tags-section {
    margin-bottom: 25px;
}

.tags-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 10px;
}

.tag-selectable {
    cursor: pointer;
    transition: all 0.2s ease;
}

.tag-selectable:hover {
    transform: scale(1.05);
}

.tag-icon {
    margin-right: 4px;
}

.selected-tags-info {
    margin-top: 10px;
    font-size: 12px;
    color: #909399;
}

/* 评论区域样式 */
.comment-section {
    margin-bottom: 25px;
}

/* 对话框底部按钮 */
.dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}
</style>
