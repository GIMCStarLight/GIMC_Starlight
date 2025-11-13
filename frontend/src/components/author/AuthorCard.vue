<template>
  <div class="author-card" :class="{ 'is-selected': selected }" @click="handleClick">
    <!-- 选择框 -->
    <div v-if="selectable" class="card-checkbox" @click.stop>
      <el-checkbox v-model="isSelected" @change="handleSelect" />
    </div>

    <!-- 头像和基础信息 -->
    <div class="card-header">
      <el-avatar :size="64" :src="author.avatar_uri" class="author-avatar">
        {{ author.nick_name?.charAt(0) }}
      </el-avatar>
      
      <div class="author-basic">
        <div class="author-name-row">
          <h3 class="author-name">{{ author.nick_name }}</h3>
          <el-tag v-if="author.gender" :type="author.gender === 1 ? 'primary' : 'danger'" size="small">
            {{ formatGender(author.gender) }}
          </el-tag>
        </div>
        
        <div class="author-location">
          <Icon icon="lucide:map-pin" class="location-icon" />
          <span>{{ author.province || '-' }} {{ author.city || '' }}</span>
        </div>
        
        <!-- 特殊标签 -->
        <div v-if="specialTags.length > 0" class="special-tags">
          <el-tag
            v-for="tag in specialTags.slice(0, 3)"
            :key="tag.text"
            :type="tag.type"
            size="small"
            effect="plain"
          >
            {{ tag.text }}
          </el-tag>
        </div>
      </div>
    </div>

    <!-- 核心数据指标 -->
    <div class="card-metrics">
      <div class="metric-item">
        <div class="metric-label">粉丝数</div>
        <div class="metric-value primary">{{ formatFollower(author.follower) }}</div>
      </div>
      
      <div class="metric-item">
        <div class="metric-label">星图指数</div>
        <div class="metric-value">{{ formatStarIndex(author.star_index) }}</div>
      </div>
      
      <div v-if="author.engagement_metrics" class="metric-item">
        <div class="metric-label">30日互动率</div>
        <div class="metric-value success">
          {{ formatInteractRate(author.engagement_metrics.interact_rate_within_30d) }}
        </div>
      </div>
      
      <div v-if="author.engagement_metrics" class="metric-item">
        <div class="metric-label">30日播放中位数</div>
        <div class="metric-value">
          {{ formatVvMedian(author.engagement_metrics.vv_median_30d) }}
        </div>
      </div>
    </div>

    <!-- 价格信息 -->
    <div v-if="author.pricing" class="card-pricing">
      <div class="pricing-item">
        <span class="pricing-label">1-20s</span>
        <span class="pricing-value">{{ formatPrice(author.pricing.price_1_20) }}</span>
      </div>
      <div class="pricing-item">
        <span class="pricing-label">21-60s</span>
        <span class="pricing-value">{{ formatPrice(author.pricing.price_21_60) }}</span>
      </div>
      <div class="pricing-item">
        <span class="pricing-label">61s+</span>
        <span class="pricing-value">{{ formatPrice(author.pricing.price_61_plus) }}</span>
      </div>
    </div>

    <!-- 粉丝增长趋势 -->
    <div v-if="author.fans_metrics" class="card-growth">
      <div class="growth-item">
        <span class="growth-label">7日增长</span>
        <el-tag
          :type="getGrowthLevelColor(author.fans_metrics.fans_growth_level_7d)"
          size="small"
        >
          {{ formatGrowthRate(author.fans_metrics.fans_growth_rate_7d) }}
        </el-tag>
      </div>
      <div class="growth-item">
        <span class="growth-label">30日增长</span>
        <el-tag
          :type="getGrowthLevelColor(author.fans_metrics.fans_growth_level_30d)"
          size="small"
        >
          {{ formatGrowthRate(author.fans_metrics.fans_growth_rate_30d) }}
        </el-tag>
      </div>
    </div>

    <!-- 内容标签 -->
    <div v-if="author.content_tags?.primary_tags" class="card-tags">
      <el-tag
        v-for="tag in author.content_tags.primary_tags.slice(0, 4)"
        :key="tag"
        size="small"
        effect="plain"
      >
        {{ tag }}
      </el-tag>
    </div>

    <!-- 数据新鲜度 -->
    <div class="card-footer">
      <div class="data-freshness">
        <el-tag :type="dataFreshness.type" size="small" effect="plain">
          {{ dataFreshness.text }}
        </el-tag>
        <span class="update-time">{{ formatDate(author.last_crawled_at) }}</span>
      </div>
      
      <!-- 操作按钮 -->
      <div class="card-actions">
        <el-button size="small" type="primary" link @click.stop="handleViewDetail">
          查看详情
        </el-button>
        <el-button size="small" type="success" link @click.stop="handleContact">
          联系合作
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { IconifyIcon as Icon } from '@vben/icons'
import type { AuthorDetail } from '../../types/author'
import {
  formatFollower,
  formatStarIndex,
  formatInteractRate,
  formatVvMedian,
  formatPrice,
  formatGender,
  formatGrowthRate,
  formatDate,
  getGrowthLevelColor,
  getAuthorSpecialTags,
  getDataFreshnessTag,
} from '../../utils/author-formatters'

interface Props {
  author: AuthorDetail
  selectable?: boolean
  selected?: boolean
}

interface Emits {
  (e: 'click', author: AuthorDetail): void
  (e: 'select', author: AuthorDetail, selected: boolean): void
  (e: 'view-detail', author: AuthorDetail): void
  (e: 'contact', author: AuthorDetail): void
}

const props = withDefaults(defineProps<Props>(), {
  selectable: false,
  selected: false,
})

const emit = defineEmits<Emits>()

const isSelected = ref(props.selected)

// 计算特殊标签
const specialTags = computed(() => getAuthorSpecialTags(props.author))

// 计算数据新鲜度
const dataFreshness = computed(() => getDataFreshnessTag(props.author.last_crawled_at))

// 事件处理
const handleClick = () => {
  emit('click', props.author)
}

const handleSelect = (value: boolean) => {
  emit('select', props.author, value)
}

const handleViewDetail = () => {
  emit('view-detail', props.author)
}

const handleContact = () => {
  emit('contact', props.author)
}
</script>

<style scoped>
.author-card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.author-card:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.author-card.is-selected {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.card-checkbox {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
}

/* 头部 */
.card-header {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.author-avatar {
  flex-shrink: 0;
}

.author-basic {
  flex: 1;
  min-width: 0;
}

.author-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.author-name {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.author-location {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: var(--el-text-color-regular);
  margin-bottom: 8px;
}

.location-icon {
  font-size: 14px;
}

.special-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* 指标 */
.card-metrics {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 16px;
  padding: 16px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
}

.metric-item {
  text-align: center;
}

.metric-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.metric-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.metric-value.primary {
  color: var(--el-color-primary);
}

.metric-value.success {
  color: var(--el-color-success);
}

/* 价格 */
.card-pricing {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
  margin-bottom: 16px;
}

.pricing-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.pricing-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.pricing-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-color-warning);
}

/* 增长趋势 */
.card-growth {
  display: flex;
  justify-content: space-around;
  padding: 12px;
  background: var(--el-fill-color-lighter);
  border-radius: 8px;
  margin-bottom: 16px;
}

.growth-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.growth-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

/* 标签 */
.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
}

/* 底部 */
.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.data-freshness {
  display: flex;
  align-items: center;
  gap: 8px;
}

.update-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.card-actions {
  display: flex;
  gap: 8px;
}
</style>
