<template>
  <div 
    class="influencer-card"
    :class="[
      `card-size-${cardSize}`,
      { 'is-selected': data.isSelected },
      { 'is-favorited': data.isFavorited },
      { 'has-hover': isHovering }
    ]"
    @mouseenter="isHovering = true"
    @mouseleave="isHovering = false"
  >
    <!-- 第一层：核心识别信息 -->
    <div class="card-header">
      <div class="header-content">
        <div class="avatar-section" @click.stop="handleViewDetail">
          <img
            v-lazy="data.avatar_uri"
            :alt="data.nick_name"
            class="avatar-img"
          />
          <div class="tier-badge" :class="`tier-${data.influencer_tier}`">
            {{ getTierLabel(data.influencer_tier) }}
          </div>
        </div>

        <div class="basic-info">
          <div class="name-line">
            <h3 class="nick-name">{{ data.nick_name }}</h3>
            <div class="special-badges">
              <el-tag
                v-if="data.star_excellent_author"
                type="warning"
                size="small"
                effect="dark"
              >
              
                优质
              </el-tag>
              <el-tag
                v-if="data.is_black_horse_author"
                type="danger"
                size="small"
              >
                黑马
              </el-tag>
              <el-tag
                v-if="data.star_qianchuan_high_potential"
                type="success"
                size="small"
              >
                高潜
              </el-tag>
            </div>
          </div>

          <div class="star-id">@星图ID: {{ data.star_id }}</div>

          <div class="meta-info">
            <span class="location">
              <ToolTipPicker>
                <template #content>
                  <div class="simple-tooltip-text">所在地区</div>
                </template>
                <template #trigger>
                  <Icon icon="lucide:map-pin" />
                </template>
              </ToolTipPicker>
              {{ data.province }}{{ data.city }}
            </span>
            <span class="follower">
              <ToolTipPicker>
                <template #content>
                  <div class="simple-tooltip-text">粉丝数量</div>
                </template>
                <template #trigger>
                  <Icon icon="lucide:users" />
                </template>
              </ToolTipPicker>
              {{ formatFollower(data.follower) }}
            </span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 第二层：内容定位 -->
    <div class="content-position">
      <div class="tags-section" v-if="data.primary_tags && data.primary_tags.length > 0">
        <div class="section-title">内容标签</div>
        <div class="tags-list">
          <el-tag 
            v-for="tag in data.primary_tags.slice(0, 3)" 
            :key="tag"
            type="info"
            size="small"
          >
            {{ tag }}
          </el-tag>
          <el-tag 
            v-if="data.tag_count > 3" 
            size="small"
            type="info"
            plain
          >
            +{{ data.tag_count - 3 }}
          </el-tag>
        </div>
      </div>
      
      <div class="growth-indicator" v-if="data.fans_increment_rate_30d !== undefined">
        <span class="growth-label">30天增长</span>
        <span 
          class="growth-value"
          :class="getGrowthClass(data.fans_increment_rate_30d)"
        >
          <Icon :icon="getGrowthIcon(data.fans_increment_rate_30d)" />
          {{ formatPercent(data.fans_increment_rate_30d) }}
        </span>
      </div>
    </div>
    
    <!-- 第三层：核心数据指标 -->
    <div class="core-metrics">
      <!-- 互动数据 -->
      <div class="metric-group">
        <div class="group-title">互动数据</div>
        <div class="metric-item">
          <span class="metric-label">互动率</span>
          <span class="metric-value" :class="getInteractClass(data.interact_rate_30d)">
            {{ formatPercent(data.interact_rate_30d) }}
          </span>
        </div>
        <div class="metric-item">
          <span class="metric-label">完播率</span>
          <span class="metric-value">
            {{ formatPercent(data.play_over_rate_30d) }}
          </span>
        </div>
        <div class="metric-item">
          <span class="metric-label">播放量</span>
          <span class="metric-value">
            {{ formatNumber(data.vv_median_30d) }}
          </span>
        </div>
      </div>
      
      <!-- 营销能力 -->
      <div class="metric-group" v-if="showMarketingMetrics">
        <div class="group-title">营销能力</div>
        <div class="metric-item">
          <span class="metric-label">转化</span>
          <el-rate 
            :model-value="getStarRating(data.link_convert_index)" 
            disabled 
            size="small"
          />
        </div>
        <div class="metric-item">
          <span class="metric-label">购物</span>
          <el-rate 
            :model-value="getStarRating(data.link_shopping_index)" 
            disabled 
            size="small"
          />
        </div>
        <div class="metric-item">
          <span class="metric-label">星图指数</span>
          <span class="metric-value star-index">
            {{ (data.star_index !== undefined && data.star_index !== null) ? formatNumber(data.star_index) : '-' }}
          </span>
        </div>
      </div>
      
      <!-- 价格信息 -->
      <div class="metric-group" v-if="showPriceInfo">
        <div class="group-title">价格区间</div>
        <div class="price-list">
          <div class="price-item" v-if="data.price_1_20">
            <span class="duration">1-20s</span>
            <span class="price">{{ formatPrice(data.price_1_20) }}</span>
          </div>
          <div class="price-item" v-if="data.price_20_60">
            <span class="duration">21-60s</span>
            <span class="price">{{ formatPrice(data.price_20_60) }}</span>
          </div>
          <div class="price-item" v-if="data.price_60">
            <span class="duration">60s+</span>
            <span class="price">{{ formatPrice(data.price_60) }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 第四层：电商能力（条件显示）-->
    <!-- <div 
      v-if="showSpecialCapabilities" 
      class="special-capabilities"
    >
      <div 
        v-if="data.e_commerce_enable && data.star_ecom_video_num_30d > 0"
        class="capability-item ecommerce"
      >
        <div class="capability-title">
          <Icon icon="lucide:shopping-bag" />
          电商带货
          <el-tag :type="getEcomLevelType(data.author_ecom_level)" size="small">
            {{ data.author_ecom_level }}级
          </el-tag>
        </div>
        <div class="capability-data">
          <span v-if="data.ecom_gmv_30d_range">GMV: {{ data.ecom_gmv_30d_range }}</span>
          <span>视频: {{ data.star_ecom_video_num_30d }}条</span>
          <span v-if="data.ecom_score">评分: {{ data.ecom_score.toFixed(2) }}</span>
        </div>
      </div>
    </div> -->
    
    <!-- 私域信息区域（仅已匹配达人显示）-->
    <div v-if="data.is_matched" class="private-section">
      <div class="section-header">
        <div class="section-title">
          <Icon icon="lucide:building-2" />
          合作状态
        </div>
        <el-tag type="success" size="small" effect="dark">
          已建联
        </el-tag>
      </div>
      
      <div class="private-info-grid">
        <div v-if="data.org_name" class="info-item">
          <span class="label">机构:</span>
          <span class="value">{{ data.org_name }}</span>
        </div>
        
        <div v-if="data.is_exclusive === 1" class="info-item exclusive">
          <el-tag type="danger" size="small" effect="dark">
            <Icon icon="lucide:star" />
            独家资源
          </el-tag>
        </div>
        
        <div v-if="data.rebate_range" class="info-item">
          <span class="label">返点:</span>
          <span class="value highlighted">{{ data.rebate_range }}</span>
        </div>
        
        <div v-if="data.policy_level" class="info-item">
          <span class="label">政策等级:</span>
          <span class="value">{{ data.policy_level }}级</span>
        </div>
        
        <div v-if="data.cooperation_degree" class="info-item">
          <span class="label">配合度:</span>
          <el-rate 
            :model-value="getCooperationStars(data.cooperation_degree)" 
            disabled 
            size="small"
          />
        </div>
        
        <div v-if="data.rebate_period" class="info-item">
          <span class="label">账期:</span>
          <span class="value">{{ data.rebate_period }}</span>
        </div>
        
        <div v-if="data.annual_contract_org" class="info-item">
          <span class="label">年框:</span>
          <span class="value">{{ data.annual_contract_org }}</span>
        </div>
      </div>
      
      <div v-if="data.cooperation_intro" class="cooperation-intro">
        <div class="intro-label">
          <Icon icon="lucide:info" />
          合作简介
        </div>
        <p>{{ data.cooperation_intro }}</p>
      </div>
      
      <div v-if="data.remark" class="remark-section">
        <div class="remark-label">
          <Icon icon="lucide:message-square" />
          备注
        </div>
        <p>{{ data.remark }}</p>
      </div>
    </div>
    
    <!-- 第五层：快速操作 -->
    <div class="card-actions">
      <div class="action-buttons">
        <!-- 查看详情 -->
        <ToolTipPicker>
          <template #content>
            <div class="simple-tooltip-text">查看详情</div>
          </template>
          <template #trigger>
            <div class="action-icon-wrapper" @click.stop="handleViewDetail">
              <Icon icon="lucide:eye" class="action-icon" />
            </div>
          </template>
        </ToolTipPicker>

        <!-- 对比 -->
        <ToolTipPicker>
          <template #content>
            <div class="simple-tooltip-text">对比</div>
          </template>
          <template #trigger>
            <div class="action-icon-wrapper" @click.stop="handleCompare">
              <Icon icon="lucide:git-compare" class="action-icon" />
            </div>
          </template>
        </ToolTipPicker>

        <!-- 评价 -->
        <ToolTipPicker>
          <template #content>
            <div class="simple-tooltip-text">评价</div>
          </template>
          <template #trigger>
            <div class="action-icon-wrapper" @click.stop="handleEvaluate">
              <Icon icon="lucide:message-circle-more" class="action-icon" />
            </div>
          </template>
        </ToolTipPicker>

        <!-- 收藏 -->
        <ToolTipPicker>
          <template #content>
            <div class="simple-tooltip-text">{{ data.isFavorited ? '取消收藏' : '收藏' }}</div>
          </template>
          <template #trigger>
            <div 
              class="action-icon-wrapper" 
              :class="{ 'is-favorited': data.isFavorited }"
              @click.stop="handleFavorite"
            >
              <Icon :icon="data.isFavorited ? 'heroicons:star-solid' : 'lucide:star'" class="action-icon" />
            </div>
          </template>
        </ToolTipPicker>

        <!-- 更新数据 -->
        <ToolTipPicker>
          <template #content>
            <div class="simple-tooltip-text">{{ data.updating ? '更新中...' : '更新数据' }}</div>
          </template>
          <template #trigger>
            <div 
              class="action-icon-wrapper update-btn" 
              :class="{ 'is-updating': data.updating }"
              @click.stop="handleUpdateData"
            >
              <Icon icon="lucide:refresh-cw" class="action-icon" :class="{ 'rotating': data.updating }" />
            </div>
          </template>
        </ToolTipPicker>
      </div>
      
      <div class="selection-indicator">
        <el-checkbox 
          v-model="data.isSelected"
          @change="handleSelectionChange"
        >
          已选
        </el-checkbox>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { log } from '../../../utils/logger'
import { ref, computed, toRefs } from 'vue'
import { IconifyIcon as Icon } from '@vben/icons'
import { ElMessage } from 'element-plus'
import ToolTipPicker from './ToolTipPicker.vue'

interface InfluencerCardData {
  // 基础信息
  author_id: string
  star_id: string
  nick_name: string
  avatar_uri: string
  gender: number
  city: string
  province: string
  follower: number
  influencer_tier: 'mega' | 'macro' | 'micro' | 'nano'
  
  // 认证标签
  star_excellent_author: boolean
  is_black_horse_author: boolean
  star_qianchuan_high_potential: boolean
  
  // 内容标签
  primary_tags: string[]
  tag_count: number
  
  // 粉丝增长
  fans_increment_rate_30d: number
  
  // 互动数据
  interact_rate_30d: number
  play_over_rate_30d: number
  vv_median_30d: number
  
  // 营销能力
  link_convert_index: number
  link_shopping_index: number
  star_index: number
  
  // 价格信息
  price_1_20: number
  price_20_60: number
  price_60: number
  
  // 电商数据
  e_commerce_enable: boolean
  author_ecom_level: string
  star_ecom_video_num_30d: number
  ecom_gmv_30d_range: string
  ecom_score: number
  
  // 操作状态
  isSelected: boolean
  isFavorited: boolean
  updating?: boolean
  updateProgress?: number
  updateStatus?: string
  
  // 私域达人库字段（仅已匹配达人有值）
  is_matched?: boolean
  match_status?: string
  org_name?: string
  category?: string
  is_exclusive?: number
  rebate_policy?: string
  rebate_range?: string
  policy_level?: string
  rebate_period?: string
  pay_period?: string
  cooperation_degree?: string
  cooperation_intro?: string
  contact_info?: any
  remark?: string
  annual_contract_org?: string
  matched_at?: Date
}

const props = defineProps<{
  data: InfluencerCardData
  cardSize: 'compact' | 'standard' | 'detailed'
}>()

const emit = defineEmits<{
  'view-detail': [data: InfluencerCardData]
  'compare': [data: InfluencerCardData]
  'favorite': [data: InfluencerCardData]
  'selection-change': [data: InfluencerCardData, selected: boolean]
  'update-data': [data: InfluencerCardData]
  'evaluate': [data: InfluencerCardData]
}>()

const isHovering = ref(false)
const { data, cardSize } = toRefs(props)

// 计算属性
const showMarketingMetrics = computed(() => {
  const d = props.data
  const hasConvert = d.link_convert_index !== undefined && d.link_convert_index !== null
  const hasShopping = d.link_shopping_index !== undefined && d.link_shopping_index !== null
  const hasStarIndex = d.star_index !== undefined && d.star_index !== null
  return hasConvert || hasShopping || hasStarIndex
})

const showPriceInfo = computed(() => {
  return props.data.price_1_20 > 0 || props.data.price_20_60 > 0 || props.data.price_60 > 0
})

const showSpecialCapabilities = computed(() => {
  // 只有当电商开通且有电商视频时才显示
  return props.data.e_commerce_enable && props.data.star_ecom_video_num_30d > 0
})

// 格式化函数
const formatFollower = (count: number): string => {
  if (!count) return '0'
  // 显示原始数值，使用千分位分隔符
  return count.toLocaleString()
}

const formatPercent = (value: number): string => {
  if (value === undefined || value === null) return '-'
  return `${(value * 100).toFixed(1)}%`
}

const formatPrice = (price: number): string => {
  if (!price) return '-'
  if (price >= 10000) return `¥${(price / 10000).toFixed(1)}万`
  return `¥${price.toLocaleString()}`
}

const formatNumber = (num: number): string => {
  if (!num && num !== 0) return '-'
  // 直接显示原始数值，不进行万/亿转换
  return num.toLocaleString()
}

const getStarRating = (index: number): number => {
  if (index === undefined || index === null) return 0
  // 转换 0-100 的分数为 0-5 的星级
  const rating = (index / 100) * 5
  return Math.round(rating * 2) / 2  // 四舍五入到 0.5
}

const getTierLabel = (tier: string): string => {
  const labels = {
    mega: '顶流',
    macro: '头部',
    micro: '腰部',
    nano: '新星',
  }
  return labels[tier as keyof typeof labels] || '未知'
}
//if (rate >= 0.1) return 'lucide:arrow-up'→ trending-down红色、trending-up绿色、lucide:minus横岗
const getGrowthIcon = (rate: number): string => {
  if (rate >= 0.0001) return 'lucide:trending-up'
  if (rate <= 0) return 'lucide:trending-down'
  return ''
}

const getGrowthClass = (rate: number): string => {
  if (rate >= 0.0001) return 'growth-high'
  if (rate <= 0) return 'growth-low'
  return 'growth-medium'
}

const getInteractClass = (rate: number): string => {
  const avgRate = 0.06 // 假设平均互动率6%
  if (rate > avgRate * 1.2) return 'interact-high'
  if (rate < avgRate * 0.8) return 'interact-low'
  return 'interact-medium'
}

const getEcomLevelType = (level: string): string => {
  const types: Record<string, string> = {
    'A': 'danger',
    'B': 'warning',
    'C': 'info',
  }
  return types[level] || 'info'
}

const getCooperationStars = (degree: string): number => {
  const stars: Record<string, number> = {
    'high': 5,
    'medium': 3,
    'low': 1,
  }
  return stars[degree] || 0
}

// 事件处理
const handleViewDetail = () => {
  log.debug('🔵 [InfluencerCard] handleViewDetail 被触发！data:', props.data.nick_name)
  // 显示一个明显的提示
  ElMessage.info('正在跳转：' + props.data.nick_name)
  emit('view-detail', props.data)
}

const handleCompare = () => {
  emit('compare', props.data)
}

const handleFavorite = () => {
  emit('favorite', props.data)
}

const handleEvaluate = () => {
  emit('evaluate', props.data)
}

const handleSelectionChange = (selected: boolean) => {
  emit('selection-change', props.data, selected)
}

const handleUpdateData = () => {
  emit('update-data', props.data)
}
</script>

<style scoped lang="scss">
.influencer-card {
  background: var(--el-bg-color);
  border-radius: 12px;
  border: 1px solid var(--el-border-color-lighter);
  transition: all 0.3s ease;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    border-color: var(--el-color-primary);
  }

  &.is-selected {
    border-color: var(--el-color-primary);
    box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
  }

  &.is-favorited {
    .card-header::before {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      width: 0;
      height: 0;
      border-style: solid;
      border-width: 0 40px 40px 0;
      border-color: transparent var(--el-color-warning) transparent transparent;
    }
  }

  // 卡片尺寸
  &.card-size-compact {
    min-height: 360px;
  }

  &.card-size-standard {
    min-height: 480px;
  }

  &.card-size-detailed {
    min-height: 560px;
  }

  /* 第一层：核心识别信息 */
  .card-header {
    position: relative;
    padding: 20px;
    border-bottom: 1px solid var(--el-border-color-lighter);

    .header-content {
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }

    .avatar-section {
      position: relative;
      flex-shrink: 0;
      cursor: pointer;
      transition: transform 0.2s ease;

      &:hover {
        transform: scale(1.05);
      }

      .avatar-img {
        width: 60px;
        height: 60px;
        border-radius: 50%;
        object-fit: cover;
        background: var(--el-fill-color-lighter);
        transition: opacity 0.3s ease;
        
        &.lazy-loading {
          opacity: 0.6;
        }
        
        &.lazy-loaded {
          opacity: 1;
        }
        
        &.lazy-error {
          opacity: 0.4;
        }
      }

      .tier-badge {
        position: absolute;
        bottom: -4px;
        left: 50px;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 11px;
        font-weight: 600;
        color: white;
        
        &.tier-mega {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        &.tier-macro {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }
        
        &.tier-micro {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }
        
        &.tier-nano {
          background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
        }
      }
    }

    .basic-info {
      flex: 1;
      min-width: 0; /* 防止内容溢出 */

      .name-line {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;

        .nick-name {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: var(--el-text-color-primary);
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .special-badges {
          display: flex;
          gap: 4px;
          flex-shrink: 0;

          :deep(.el-tag) {
            font-style: italic;
          }
        }
      }

      .star-id {
        font-size: 12px;
        color: var(--el-text-color-secondary);
        margin-bottom: 8px;
      }

      .meta-info {
        display: flex;
        align-items: center;
        gap: 16px;
        font-size: 13px;
        color: var(--el-text-color-regular);

        span {
          display: flex;
          align-items: center;
          gap: 4px;
        }
      }
    }
  }

  /* 第二层：内容定位 */
  .content-position {
    padding: 16px 20px;
    border-bottom: 1px solid var(--el-border-color-lighter);

    .tags-section {
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;

      .section-title {
        font-size: 12px;
        color: var(--el-text-color-secondary);
        flex-shrink: 0;
      }

      .tags-list {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        justify-content: center;
        align-items: center;
      }
    }

    .growth-indicator {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 0px;
      
      .growth-label {
        font-size: 12px;
        color: var(--el-text-color-secondary);
      }

      .growth-value {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 14px;
        font-weight: 600;

        &.growth-high {
          color: var(--el-color-danger);
          
        }

        &.growth-medium {
          color: #333;
        }

        &.growth-low {
          color: var(--el-color-success);
        }
      }
    }
  }

  /* 第三层：核心数据指标 */
  .core-metrics {
    flex: 1;
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;

    .metric-group {
      .group-title {
        font-size: 13px;
        font-weight: 600;
        color: var(--el-text-color-primary);
        margin-bottom: 12px;
      }

      .metric-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        font-size: 13px;

        .metric-label {
          color: var(--el-text-color-secondary);
        }

        .metric-value {
          font-weight: 600;
          color: var(--el-text-color-primary);

          &.interact-high {
            color: var(--el-color-danger);
          }

          &.interact-low {
            color: var(--el-color-success);
          }

          &.star-index {
            color: var(--el-color-warning);
          }
        }
      }

      .price-list {
        display: flex;
        flex-direction: column;
        gap: 8px;

        .price-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 10px;
          background: var(--el-fill-color-lighter);
          border-radius: 4px;
          font-size: 13px;

          .duration {
            color: var(--el-text-color-secondary);
          }

          .price {
            font-weight: 600;
            color: var(--el-color-primary);
          }
        }
      }
    }
  }

  /* 第四层：专项能力 */
  .special-capabilities {
    padding: 16px 20px;
    border-top: 1px solid var(--el-border-color-lighter);
    background: var(--el-fill-color-lighter);

    .capability-item {
      .capability-title {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        font-weight: 600;
        color: var(--el-text-color-primary);
        margin-bottom: 8px;
      }

      .capability-data {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        font-size: 12px;
        color: var(--el-text-color-secondary);
      }
    }
  }

  /* 第五层：快速操作 */
  .card-actions {
    padding: 12px 16px;
    border-top: 1px solid var(--el-border-color-lighter);
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    background: var(--el-bg-color);
    flex-wrap: wrap;

    .action-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      flex: 1;
      min-width: 0;
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

    &.rotating {
      animation: rotate 1s linear infinite;
    }
  }

  &.is-updating {
    .action-icon {
      &.rotating {
        animation: rotate 1s linear infinite;
      }
    }
  }
  &.is-favorited {
      .action-icon {
        color: var(--el-color-warning);
        transform: scale(1.2);
      }
    }
}

      :deep(.el-button) {
        padding: 5px 10px;
        font-size: 12px;
        flex-shrink: 0;

        .iconify {
          font-size: 14px;
        }
      }
    }

    .selection-indicator {
      flex-shrink: 0;
      
      :deep(.el-checkbox) {
        .el-checkbox__label {
          font-size: 12px;
          padding-left: 6px;
        }
      }
    }
  }

  /* 私域信息区域 */
  .private-section {
    padding: 16px 20px;
    //border-top: 2px solid var(--el-color-success-light-7);
    //background: linear-gradient(135deg, var(--el-color-success-light-9) 0%, var(--el-fill-color) 100%);
    border-top: 1px solid var(--el-border-color-lighter);

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;

      // 已建联标签斜体样式
      :deep(.el-tag) {
        font-style: italic;
      }

      .section-title {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 14px;
        font-weight: 600;
        color: var(--el-color-success);
        .iconify {
          font-size: 16px;
        }
      }
    }

    .private-info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 12px;
      margin-bottom: 12px;

      .info-item {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 12px;

        .label {
          color: var(--el-text-color-secondary);
          white-space: nowrap;
        }

        .value {
          font-weight: 500;
          color: var(--el-text-color-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;

          &.highlighted {
            //color: var(--el-color-danger);
            font-weight: 500;
            font-size: 13px;
          }
        }

        &.exclusive {
          grid-column: span 2;
        }
      }
    }

    .cooperation-intro,
    .remark-section {
      margin-top: 12px;
      padding: 10px;
      background: var(--el-bg-color);
      border-radius: 6px;
      border-left: 3px solid var(--el-color-success);

      .intro-label,
      .remark-label {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        font-weight: 600;
        color: var(--el-color-success);
        margin-bottom: 6px;

        .iconify {
          font-size: 14px;
        }
      }

      p {
        margin: 0;
        font-size: 12px;
        line-height: 1.6;
        color: var(--el-text-color-regular);
      }
    }
  }
}

.simple-tooltip-text {
  font-size: 12px;
  color: #606266;
  padding: 2px 4px;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>