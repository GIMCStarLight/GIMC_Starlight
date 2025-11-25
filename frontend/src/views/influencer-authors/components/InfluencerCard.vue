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
    <!-- 头像区域 -->
    <div class="card-section avatar-section">
      <img 
        v-lazy="data.avatar_uri" 
        :alt="data.nick_name"
        class="avatar-img"
      />
      <div class="tier-badge" :class="`tier-${data.influencer_tier}`">
        {{ getTierLabel(data.influencer_tier) }}
      </div>
    </div>
    
    <!-- 基本信息区域 -->
    <div class="card-section basic-info">
      <div class="nick-name">{{ data.nick_name }}</div>
      <div class="star-id">@星图ID: {{ data.star_id }}</div>
      <div class="special-badges">
        <el-tag 
          v-if="data.star_excellent_author" 
          type="warning" 
          size="small"
          effect="dark"
        >
          ⭐ 优质
        </el-tag>
        <el-tag 
          v-if="data.is_black_horse_author" 
          type="danger" 
          size="small"
        >
          🐴 黑马
        </el-tag>
        <el-tag 
          v-if="data.star_qianchuan_high_potential" 
          type="success" 
          size="small"
        >
          🚀 高潜
        </el-tag>
      </div>
      <div class="location">
        <Icon icon="lucide:map-pin" />
        {{ data.province }}{{ data.city }}
      </div>
      <!-- 内容标签放在这里 -->
      <div class="tags-wrapper" v-if="data.primary_tags && data.primary_tags.length > 0">
        <span class="tags-label">标签:</span>
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
    </div>
    
    <!-- 中间内容区域 - 包含所有数据指标 -->
    <div class="card-section middle-content">
      <!-- 粉丝数据区域 -->
      <div class="fans-section">
        <div class="fans-item">
          <div class="fans-value">{{ formatFollower(data.follower) }}</div>
          <div class="fans-label">粉丝数</div>
        </div>
        <div class="fans-item" v-if="data.fans_increment_rate_30d !== undefined">
          <div class="fans-value" :class="getGrowthClass(data.fans_increment_rate_30d)">
            {{ formatPercent(data.fans_increment_rate_30d) }}
          </div>
          <div class="fans-label">30天增长</div>
        </div>
      </div>

      <!-- 互动数据区域 -->
      <div class="metric-section">
        <div class="section-content">
          <div class="section-title">互动数据</div>
          <div class="metric-item">
            <div class="metric-label">互动率</div>
            <div class="metric-value" :class="getInteractClass(data.interact_rate_30d)">
              {{ formatPercent(data.interact_rate_30d) }}
            </div>
          </div>
          <div class="metric-item">
            <div class="metric-label">完播率</div>
            <div class="metric-value">
              {{ formatPercent(data.play_over_rate_30d) }}
            </div>
          </div>
          <div class="metric-item">
            <div class="metric-label">播放量</div>
            <div class="metric-value">
              {{ formatNumber(data.vv_median_30d) }}
            </div>
          </div>
        </div>
      </div>

      <!-- 营销能力区域 -->
      <div class="metric-section" v-if="showMarketingMetrics">
        <div class="section-content">
          <div class="section-title">营销能力</div>
          <div class="metric-item">
            <div class="metric-label">转化</div>
            <el-rate
              :model-value="getStarRating(data.link_convert_index)"
              disabled
              size="small"
            />
          </div>
          <div class="metric-item">
            <div class="metric-label">购物</div>
            <el-rate
              :model-value="getStarRating(data.link_shopping_index)"
              disabled
              size="small"
            />
          </div>
          <div class="metric-item">
            <div class="metric-label">星图指数</div>
            <div class="metric-value star-index">
              {{ (data.star_index !== undefined && data.star_index !== null) ? formatNumber(data.star_index) : '-' }}
            </div>
          </div>
        </div>
      </div>

      <!-- 价格信息区域 -->
      <div class="price-section" v-if="showPriceInfo">
        <div class="section-content">
          <div class="section-title">价格区间</div>
          <div class="price-item" v-if="data.price_1_20">
            <span class="duration">1-20s</span>
            <span class="price">{{ formatPrice(data.price_1_20) }}</span>
          </div>
          <div class="price-item" v-if="data.price_20_60">
            <span class="duration">21-60s</span>
            <span class="price highlighted">{{ formatPrice(data.price_20_60) }}</span>
          </div>
          <div class="price-item" v-if="data.price_60">
            <span class="duration">60s+</span>
            <span class="price">{{ formatPrice(data.price_60) }}</span>
          </div>
        </div>
      </div>

      <!-- 电商能力区域 -->
      <div
        v-if="showSpecialCapabilities"
        class="ecommerce-section"
      >
        <div class="section-title">
          <Icon icon="lucide:shopping-bag" />
          电商带货
          <el-tag :type="getEcomLevelType(data.author_ecom_level)" size="small">
            {{ data.author_ecom_level }}级
          </el-tag>
        </div>
        <div class="ecommerce-data">
          <span v-if="data.ecom_gmv_30d_range">GMV: {{ data.ecom_gmv_30d_range }}</span>
          <span>视频: {{ data.star_ecom_video_num_30d }}条</span>
          <span v-if="data.ecom_score">评分: {{ data.ecom_score.toFixed(2) }}</span>
        </div>
      </div>
    </div>
    
    <!-- 私域信息区域 -->
    <div v-if="data.is_matched" class="card-section private-section">
      <div class="section-header">
        <Icon icon="lucide:building-2" />
        合作信息
        <el-tag type="success" size="small" effect="dark">已建联</el-tag>
      </div>
      <div class="private-info">
        <div v-if="data.org_name" class="info-item">
          <span class="label">机构:</span>
          <span class="value">{{ data.org_name }}</span>
        </div>
        <div v-if="data.is_exclusive === 1" class="info-item">
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
          <el-tag :type="getPolicyLevelType(data.policy_level)" size="small">
            {{ data.policy_level }}级
          </el-tag>
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
        <Icon icon="lucide:info" />
        合作简介: {{ data.cooperation_intro }}
      </div>
      <div v-if="data.remark" class="remark-section">
        <Icon icon="lucide:message-square" />
        备注: {{ data.remark }}
      </div>
    </div>
    
    <!-- 操作按钮区域 -->
    <div class="card-section actions-section">
      
      <el-button size="small" @click.stop="handleViewDetail">
        <Icon icon="lucide:eye" />
        详情
      </el-button>
      <el-button size="small" @click.stop="handleCompare">
        <Icon icon="lucide:git-compare" />
        对比
      </el-button>
      <el-button size="small" @click.stop="handleEvaluate">
        <Icon icon="lucide:star" />
        评价
      </el-button>
      <el-button 
        size="small" 
        :type="data.isFavorited ? 'warning' : 'default'"
        @click.stop="handleFavorite"
      >
        <Icon :icon="data.isFavorited ? 'lucide:star' : 'lucide:star-off'" />
      </el-button>
      <el-button 
        size="small" 
        type="warning"
        @click.stop="handleUpdateData"
        :loading="data.updating"
      >
        <Icon icon="lucide:refresh-cw" />
        {{ data.updating ? '更新中...' : '更新' }}
      </el-button>
      <el-checkbox 
        v-model="data.isSelected"
        @change="handleSelectionChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { log } from '../../../utils/logger'
import { ref, computed, toRefs } from 'vue'
import { IconifyIcon as Icon } from '@vben/icons'
import { ElMessage } from 'element-plus'

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

const getGrowthIcon = (rate: number): string => {
  if (rate >= 0.2) return 'lucide:trending-up'
  if (rate >= 0.1) return 'lucide:arrow-up'
  if (rate >= 0) return 'lucide:minus'
  return 'lucide:trending-down'
}

const getGrowthClass = (rate: number): string => {
  if (rate >= 0.1) return 'growth-high'
  if (rate >= 0) return 'growth-medium'
  return 'growth-low'
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

const getPolicyLevelType = (level: string): string => {
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
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
  transition: all 0.3s ease;
  overflow: hidden;
  
  // Grid自适应布局，头尾布局
  display: grid;
  grid-template-columns: auto auto 1fr auto auto;
  align-items: center;
  gap: 20px;
  padding: 16px 20px;
  min-height: 100px;

  &:hover {
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
    border-color: var(--el-color-primary-light-5);
    background: var(--el-fill-color-extra-light);
  }

  &.is-selected {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  &.is-favorited {
    border-left: 3px solid var(--el-color-warning);
  }

  // 每个card-section使用grid不换行
  .card-section {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(auto, max-content);
    gap: 8px;
    align-items: center;
    justify-content: start;
    white-space: nowrap;
  }

  // 头像区域
  .avatar-section {
    position: relative;
    grid-auto-flow: row;
    justify-content: center;
    gap: 0;

    .avatar-img {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      object-fit: cover;
      background: var(--el-fill-color-lighter);
    }

    .tier-badge {
      position: absolute;
      bottom: -4px;
      left: 50%;
      transform: translateX(-50%);
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
      color: white;
      white-space: nowrap;
      
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

  // 基本信息区域
  .basic-info {
    grid-auto-flow: row;
    grid-auto-rows: minmax(auto, max-content);
    gap: 4px;
    min-width: 180px;
    max-width: 250px;

    .nick-name {
      font-size: 16px;
      font-weight: 600;
      color: var(--el-text-color-primary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .star-id {
      font-size: 13px;
      color: var(--el-text-color-secondary);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .special-badges {
      display: grid;
      grid-auto-flow: column;
      gap: 4px;
      justify-content: start;
    }

    .location {
      font-size: 13px;
      color: var(--el-text-color-regular);
      display: grid;
      grid-auto-flow: column;
      align-items: center;
      gap: 2px;
      justify-content: start;
    }

    // 标签包装器
    .tags-wrapper {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 6px;
      align-items: center;
      margin-top: 4px;

      .tags-label {
        font-size: 13px;
        color: var(--el-text-color-secondary);
        white-space: nowrap;
      }

      .tags-list {
        display: grid;
        grid-auto-flow: column;
        gap: 4px;
        justify-content: start;
        overflow-x: auto;
        max-width: 180px;

        &::-webkit-scrollbar {
          height: 4px;
        }
      }
    }
  }

  // 中间内容区域
  .middle-content {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(auto, max-content);
    gap: 20px;
    justify-content: start;
    align-items: center; // 改为居中对齐
    overflow: visible;
    min-width: 0; // 允许内容收缩
  }

  // 粉丝数据区域
  .fans-section {
    width: 120px; // 固定宽度
    display: flex;
    flex-direction: column;
    gap: 8px;
    //justify-content: center;
    justify-content: flex-start; // 从顶部开始排列
    align-items: center;
    flex-shrink: 0; // 防止被压缩
    height: 100%; // 确保有足够高度

    .fans-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
      align-items: center;
      text-align: center;

      .fans-value {
        font-size: 18px;
        font-weight: 600;
        color: var(--el-text-color-primary);
        white-space: nowrap;

        &.growth-high {
          color: var(--el-color-success);
        }

        &.growth-medium {
          color: var(--el-color-primary);
        }

        &.growth-low {
          color: var(--el-color-danger);
        }
      }

      .fans-label {
        font-size: 13px;
        color: var(--el-text-color-secondary);
        white-space: nowrap;
      }
    }
  }

  // 指标区域
  .metric-section {
    width: 140px; // 固定宽度，包含互动数据和营销能力
    flex-shrink: 0; // 防止被压缩;
    height: 120px; // 固定总高度，与价格区域一致

    .section-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
      height: 100%;
    }

    .section-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--el-text-color-primary);
      white-space: nowrap;
      text-align: left;
      padding-bottom: 4px;
      border-bottom: 1px solid var(--el-border-color-lighter);
      flex-shrink: 0;
    }

    .metric-item {
      display: grid;
      grid-template-columns: auto auto;
      gap: 6px;
      align-items: center;
      font-size: 14px;
      justify-content: left;

      .metric-label {
        color: var(--el-text-color-secondary);
        white-space: nowrap;
      }

      .metric-value {
        font-weight: 600;
        color: var(--el-text-color-primary);
        white-space: nowrap;
        display: grid;
        grid-auto-flow: column;
        align-items: center;
        gap: 2px;

        &.growth-high {
          color: var(--el-color-success);
        }

        &.growth-medium {
          color: var(--el-color-primary);
        }

        &.growth-low {
          color: var(--el-color-danger);
        }

        &.interact-high {
          color: var(--el-color-success);
        }

        &.interact-low {
          color: var(--el-color-danger);
        }

        &.star-index {
          color: var(--el-color-warning);
        }
      }
    }
  }

  // 价格区域
  .price-section {
    width: 120px; // 固定宽度
    flex-shrink: 0; // 防止被压缩;
    height: 120px; // 固定总高度，与指标区域一致

    .section-content {
      display: flex;
      flex-direction: column;
      gap: 8px;
      height: 100%;
    }

    .section-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--el-text-color-primary);
      white-space: nowrap;
      text-align: left;
      padding-bottom: 4px;
      border-bottom: 1px solid var(--el-border-color-lighter);
      flex-shrink: 0;
    }

    .price-item {
      display: grid;
      grid-template-columns: auto auto;
      gap: 6px;
      align-items: center;
      font-size: 13px;
      justify-content: left;

      .duration {
        color: var(--el-text-color-secondary);
        white-space: nowrap;
      }

      .price {
        font-weight: 600;
        color: var(--el-color-primary);
        white-space: nowrap;

        &.highlighted {
          color: var(--el-color-danger);
          font-size: 12px;
        }
      }
    }
  }

  // 电商能力区域
  .ecommerce-section {
    grid-auto-flow: row;
    grid-auto-rows: minmax(auto, max-content);
    gap: 4px;
    width: 160px; // 固定宽度，比其他区域稍宽以容纳更多信息
    flex-shrink: 0; // 防止被压缩
    padding: 8px 12px;
    background: var(--el-fill-color-lighter);
    border-radius: 6px;

    .section-title {
      display: grid;
      grid-auto-flow: column;
      gap: 4px;
      align-items: center;
      font-size: 13px;
      font-weight: 600;
      color: var(--el-text-color-primary);
      white-space: nowrap;
    }

    .ecommerce-data {
      display: grid;
      grid-auto-flow: row;
      gap: 4px;
      font-size: 13px;
      color: var(--el-text-color-secondary);
      justify-content: center; // 居中显示
      text-align: center;

      span {
        white-space: nowrap;
      }
    }
  }

  // 私域信息区域
  .private-section {
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-rows: auto auto;
    gap: 8px 16px;
    padding: 12px 16px;
    background: linear-gradient(135deg, var(--el-color-success-light-9) 0%, var(--el-fill-color) 100%);
    border-radius: 6px;
    min-width: 200px;
    max-width: 280px;

    .section-header {
      grid-column: 1 / -1;
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 6px;
      align-items: center;
      font-size: 14px;
      font-weight: 600;
      color: var(--el-color-success);
      white-space: nowrap;
      margin-bottom: 4px;

      .iconify {
        font-size: 16px;
      }
    }

    .private-info {
      grid-column: 1 / -1;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px 12px;

      .info-item {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 6px;
        align-items: center;
        font-size: 13px;

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
            color: var(--el-color-danger);
            font-weight: 600;
          }
        }
      }
    }

    .cooperation-intro,
    .remark-section {
      grid-column: 1 / -1;
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 4px;
      align-items: start;
      font-size: 13px;
      color: var(--el-text-color-regular);
      margin-top: 4px;

      .iconify {
        font-size: 14px;
        color: var(--el-color-success);
        margin-top: 2px;
      }
    }
  }

  // 操作按钮区域
  .actions-section {
    gap: 6px;
    justify-content: end;

    :deep(.el-button) {
      padding: 4px 8px;
      font-size: 13px;

      .iconify {
        font-size: 15px;
      }
    }
  }
}
</style>
