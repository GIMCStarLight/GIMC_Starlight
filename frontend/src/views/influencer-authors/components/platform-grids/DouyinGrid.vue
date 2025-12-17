<template>
  <div class="influencer-grid" v-loading="loading">
    <el-empty v-if="!loading && (!influencers || influencers.length === 0)" description="暂无数据" />

    <!-- 卡片视图 - 现在显示表格内容 -->
    <div v-else-if="viewMode === 'card' && influencers" class="card-view table-content">
      <InfluencerCard
        v-for="item in influencers"
        :key="item.author_id"
        :data="item"
        :card-size="cardSize"
        @view-detail="handleViewDetail"
        @compare="handleCompare"
        @favorite="handleFavorite"
        @selection-change="handleSelectionChange"
        @update-data="handleUpdateData"
        @evaluate="handleEvaluate"
      />
    </div>

    <!-- 列表视图 - 现在显示原来的卡片内容 -->
    <div v-else class="table-view card-content" :class="`card-size-${cardSize}`">
      <!-- 达人卡片内容 -->
      <div
        v-for="item in influencers"
        :key="item.author_id"
        class="influencer-card"
        :class="[
          `card-size-${cardSize}`,
          { 'is-selected': item.isSelected },
          { 'is-favorited': item.isFavorited },
          { 'has-hover': hoveredCardId === item.author_id }
        ]"
        @mouseenter="hoveredCardId = item.author_id"
        @mouseleave="hoveredCardId = ''"
      >
        <!-- 头像区域 -->
        <div class="card-section avatar-section">
          <img
            v-lazy="item.avatar_uri"
            :alt="item.nick_name"
            class="avatar-img"
          />
          <div class="tier-badge" :class="`tier-${item.influencer_tier}`">
            {{ getTierLabel(item.influencer_tier) }}
          </div>
        </div>

        <!-- 基本信息区域 -->
        <div class="card-section basic-info">
          <div class="nick-name">{{ item.nick_name }}</div>
          <div class="star-id">@星图ID: {{ item.star_id }}</div>
          <div class="special-badges">
            <el-tag
              v-if="item.star_excellent_author"
              type="warning"
              size="small"
              effect="dark"
            >
              ⭐ 优质
            </el-tag>
            <el-tag
              v-if="item.is_black_horse_author"
              type="danger"
              size="small"
            >
              🐴 黑马
            </el-tag>
            <el-tag
              v-if="item.star_qianchuan_high_potential"
              type="success"
              size="small"
            >
              🚀 高潜
            </el-tag>
          </div>
          <div class="location">
            <Icon icon="lucide:map-pin" />
            {{ item.province }}{{ item.city }}
          </div>
          <!-- 内容标签放在这里 -->
          <div class="tags-wrapper" v-if="item.primary_tags && item.primary_tags.length > 0">
            <span class="tags-label">标签:</span>
            <div class="tags-list">
              <el-tag
                v-for="tag in item.primary_tags.slice(0, 3)"
                :key="tag"
                type="info"
                size="small"
              >
                {{ tag }}
              </el-tag>
              <el-tag
                v-if="item.tag_count > 3"
                size="small"
                type="info"
                plain
              >
                +{{ item.tag_count - 3 }}
              </el-tag>
            </div>
          </div>
        </div>

        <!-- 中间内容区域 - 包含所有数据指标 -->
        <div class="card-section middle-content">
          <!-- 粉丝数据区域 -->
          <div class="fans-section">
            <div class="fans-item">
              <div class="fans-value">{{ formatFollower(item.follower) }}</div>
              <div class="fans-label">粉丝数</div>
            </div>
            <div class="fans-item" v-if="item.fans_increment_rate_30d !== undefined">
              <div class="fans-value" :class="getGrowthClass(item.fans_increment_rate_30d)">
                {{ formatPercent(item.fans_increment_rate_30d) }}
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
                <div class="metric-value" :class="getInteractClass(item.interact_rate_30d)">
                  {{ formatPercent(item.interact_rate_30d) }}
                </div>
              </div>
              <div class="metric-item">
                <div class="metric-label">完播率</div>
                <div class="metric-value">
                  {{ formatPercent(item.play_over_rate_30d) }}
                </div>
              </div>
              <div class="metric-item">
                <div class="metric-label">播放量</div>
                <div class="metric-value">
                  {{ formatNumber(item.vv_median_30d) }}
                </div>
              </div>
            </div>
          </div>

          <!-- 营销能力区域 -->
          <div class="metric-section" v-if="showMarketingMetrics(item)">
            <div class="section-content">
              <div class="section-title">营销能力</div>
              <div class="metric-item">
                <div class="metric-label">转化</div>
                <el-rate
                  :model-value="getStarRating(item.link_convert_index)"
                  disabled
                  size="small"
                />
              </div>
              <div class="metric-item">
                <div class="metric-label">购物</div>
                <el-rate
                  :model-value="getStarRating(item.link_shopping_index)"
                  disabled
                  size="small"
                />
              </div>
              <div class="metric-item">
                <div class="metric-label">星图指数</div>
                <div class="metric-value star-index">
                  {{ (item.star_index !== undefined && item.star_index !== null) ? formatNumber(item.star_index) : '-' }}
                </div>
              </div>
            </div>
          </div>

          <!-- 价格信息区域 -->
          <div class="price-section" v-if="showPriceInfo(item)">
            <div class="section-content">
              <div class="section-title">价格区间</div>
              <div class="price-item" v-if="item.price_1_20">
                <span class="duration">1-20s</span>
                <span class="price">{{ formatPrice(item.price_1_20) }}</span>
              </div>
              <div class="price-item" v-if="item.price_20_60">
                <span class="duration">21-60s</span>
                <span class="price highlighted">{{ formatPrice(item.price_20_60) }}</span>
              </div>
              <div class="price-item" v-if="item.price_60">
                <span class="duration">60s+</span>
                <span class="price">{{ formatPrice(item.price_60) }}</span>
              </div>
            </div>
          </div>

          <!-- 电商能力区域 -->
          <div
            v-if="showSpecialCapabilities(item)"
            class="ecommerce-section"
          >
            <div class="section-title">
              <Icon icon="lucide:shopping-bag" />
              电商带货
              <el-tag :type="getEcomLevelType(item.author_ecom_level)" size="small">
                {{ item.author_ecom_level }}级
              </el-tag>
            </div>
            <div class="ecommerce-data">
              <span v-if="item.ecom_gmv_30d_range">GMV: {{ item.ecom_gmv_30d_range }}</span>
              <span>视频: {{ item.star_ecom_video_num_30d }}条</span>
              <span v-if="item.ecom_score">评分: {{ item.ecom_score.toFixed(2) }}</span>
            </div>
          </div>
        </div>

        <!-- 私域信息区域 -->
        <div v-if="item.is_matched" class="card-section private-section">
          <div class="section-header">
            <Icon icon="lucide:building-2" />
            合作信息
            <el-tag type="success" size="small" effect="dark">已建联</el-tag>
          </div>
          <div class="private-info">
            <div v-if="item.org_name" class="info-item">
              <span class="label">机构:</span>
              <span class="value">{{ item.org_name }}</span>
            </div>
            <div v-if="item.is_exclusive === 1" class="info-item">
              <el-tag type="danger" size="small" effect="dark">
                <Icon icon="lucide:star" />
                独家资源
              </el-tag>
            </div>
            <div v-if="item.rebate_range" class="info-item">
              <span class="label">返点:</span>
              <span class="value highlighted">{{ item.rebate_range }}</span>
            </div>
            <div v-if="item.policy_level" class="info-item">
              <span class="label">政策等级:</span>
              <el-tag :type="getPolicyLevelType(item.policy_level)" size="small">
                {{ item.policy_level }}级
              </el-tag>
            </div>
            <div v-if="item.cooperation_degree" class="info-item">
              <span class="label">配合度:</span>
              <el-rate
                :model-value="getCooperationStars(item.cooperation_degree)"
                disabled
                size="small"
              />
            </div>
            <div v-if="item.rebate_period" class="info-item">
              <span class="label">账期:</span>
              <span class="value">{{ item.rebate_period }}</span>
            </div>
            <div v-if="item.annual_contract_org" class="info-item">
              <span class="label">年框:</span>
              <span class="value">{{ item.annual_contract_org }}</span>
            </div>
          </div>
          <div v-if="item.cooperation_intro" class="cooperation-intro">
            <Icon icon="lucide:info" />
            合作简介: {{ item.cooperation_intro }}
          </div>
          <div v-if="item.remark" class="remark-section">
            <Icon icon="lucide:message-square" />
            备注: {{ item.remark }}
          </div>
        </div>

        <!-- 操作按钮区域 -->
        <div class="card-section actions-section">

          <el-button size="small" @click.stop="handleViewDetail(item)">
            <Icon icon="lucide:eye" />
            详情
          </el-button>
          <el-button size="small" @click.stop="handleCompare(item)">
            <Icon icon="lucide:git-compare" />
            对比
          </el-button>
          <el-button size="small" @click.stop="handleEvaluate(item)">
            <Icon icon="lucide:star" />
            评价
          </el-button>
          <el-button
            size="small"
            :type="item.isFavorited ? 'warning' : 'default'"
            @click.stop="handleFavorite(item)"
          >
            <Icon :icon="item.isFavorited ? 'lucide:star' : 'lucide:star-off'" />
          </el-button>
          <el-button
            size="small"
            type="warning"
            @click.stop="handleUpdateData(item)"
            :loading="item.updating"
          >
            <Icon icon="lucide:refresh-cw" />
            {{ item.updating ? '更新中...' : '更新' }}
          </el-button>
          <el-checkbox
            v-model="item.isSelected"
            @change="handleSelectionChange(item, $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { log } from '../../../../utils/logger'
import { watch, ref, nextTick, computed } from 'vue'
import { ElMessage, type ElTable } from 'element-plus'
import { IconifyIcon as Icon } from '@vben/icons'
import InfluencerCard from '../InfluencerCard.vue'
import { useInfluencerSquareStore } from '#/store'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'

const props = defineProps<{
  viewMode: 'card' | 'table'
  cardSize: 'compact' | 'standard' | 'detailed'
  loading: boolean
  useStoreSelection?: boolean // 是否使用store管理选中状态，默认true
  influencers?: any[] // 外部传入的达人数据，如果不提供则使用store
  platform?: string
}>()

const store = useInfluencerSquareStore()
const storeRefs = storeToRefs(store)

// 使用外部传入的 influencers，或者使用 store 的数据
const influencers = computed(() => props.influencers || storeRefs.influencers.value)
const currentPage = computed(() => storeRefs.currentPage.value)
const router = useRouter()
const tableRef = ref<InstanceType<typeof ElTable>>()
const hoveredCardId = ref('')

// 是否正在恢复选中状态(防止触发 selection-change)
let isRestoring = false

// 确保 influencers 总是有值
if (!influencers.value) {
  log.warn('⚠️ [InfluencerGrid] influencers.value 为空，初始化为空数组')
  influencers.value = []
}

// 格式化函数
const formatFollower = (count: number): string => {
  if (!count) return '0'
  // 直接显示原始数值
  return count.toLocaleString()
}

const formatPercent = (value: number): string => {
  if (value === undefined || value === null) return '-'
  return `${(value * 100).toFixed(1)}%`
}

const formatNumber = (value: number): string => {
  if (value === undefined || value === null) return '-'
  return value.toLocaleString()
}

const formatPrice = (value: number | string): string => {
  if (!value) return '0'
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(numValue)) return '0'
  if (numValue >= 10000) return `¥${(numValue / 10000).toFixed(1)}万`
  return numValue.toLocaleString()
}

const getGrowthClass = (rate: number): string => {
  if (!rate) return ''
  if (rate > 0.1) return 'growth-high'  // >10%
  if (rate > 0.05) return 'growth-medium'  // >5%
  if (rate > 0) return 'growth-low'  // >0%
  return 'growth-negative'
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

const getInteractClass = (rate: number): string => {
  const avgRate = 0.06 // 假设平均互动率6%
  if (rate > avgRate * 1.2) return 'interact-high'
  if (rate < avgRate * 0.8) return 'interact-low'
  return 'interact-medium'
}

const getStarRating = (index: number): number => {
  if (index === undefined || index === null) return 0
  // 转换 0-100 的分数为 0-5 的星级
  const rating = (index / 100) * 5
  return Math.round(rating * 2) / 2  // 四舍五入到 0.5
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

// 计算属性
const showMarketingMetrics = (item: any) => {
  const hasConvert = item.link_convert_index !== undefined && item.link_convert_index !== null
  const hasShopping = item.link_shopping_index !== undefined && item.link_shopping_index !== null
  const hasStarIndex = item.star_index !== undefined && item.star_index !== null
  return hasConvert || hasShopping || hasStarIndex
}

const showPriceInfo = (item: any) => {
  return item.price_1_20 > 0 || item.price_20_60 > 0 || item.price_60 > 0
}

const showSpecialCapabilities = (item: any) => {
  // 只有当电商开通且有电商视频时才显示
  return item.e_commerce_enable && item.star_ecom_video_num_30d > 0
}

// 事件处理
const handleViewDetail = (data: any) => {
  log.debug('📤 [跳转详情] author_id:', data.author_id, 'nick_name:', data.nick_name)
  const targetPath = `/influencer-detail/${data.author_id}`
  log.debug('📤 [跳转详情] 目标路径:', targetPath)

  try {
    router.push(targetPath)
    log.debug('✅ [跳转详情] 路由跳转成功')
  } catch (error) {
    log.error('❌ [跳转详情] 路由跳转失败:', error)
    ElMessage.error('跳转失败: ' + (error as Error).message)
  }
}

const handleCompare = (data: any) => {
  ElMessage.info('对比功能开发中...')
}

const handleFavorite = (data: any) => {
  data.isFavorited = !data.isFavorited
  ElMessage.success(data.isFavorited ? '已收藏' : '取消收藏')
}

const handleSelectionChange = (data: any, selected: boolean) => {
  log.debug('[DouyinGrid] 选中状态变化:', {
    author_id: data.author_id,
    nick_name: data.nick_name,
    selected,
    useStoreSelection: props.useStoreSelection
  })
  
  // 先emit事件，让父组件可以拦截处理
  emit('selection-change', data, selected)
  
  // 如果useStoreSelection为false，则不更新store
  if (props.useStoreSelection !== false) {
    log.debug('[DouyinGrid] 更新store选中状态')
    store.toggleInfluencerSelection(data.author_id)
    log.debug('[DouyinGrid] store当前选中数量:', store.selectedCount)
  } else {
    log.debug('[DouyinGrid] 跳过store更新（useStoreSelection=false）')
  }
}

// 更新达人数据
const handleUpdateData = (row: any) => {
  // 向父组件发送更新事件
  emit('update-data', row)
}

// 评价达人
const handleEvaluate = (row: any) => {
  emit('evaluate', row)
}

// 定义 emit
const emit = defineEmits<{
  'update-data': [data: any]
  'evaluate': [data: any]
  'selection-change': [data: any, selected: boolean]
}>()
</script>

<style scoped lang="scss">
.influencer-grid {
  min-height: 400px;

  .table-view {
    &.card-content {
      // 卡片内容显示在列表视图模式下
      display: flex;
      flex-direction: column;
      gap: 16px;

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

      .placeholder-card {
        background: var(--el-fill-color-lighter);
        border-radius: 8px;
        padding: 20px;
        height: 400px;

        .placeholder-header {
          height: 60px;
          background: var(--el-fill-color);
          border-radius: 4px;
          margin-bottom: 16px;
        }

        .placeholder-content {
          height: 200px;
          background: var(--el-fill-color);
          border-radius: 4px;
          margin-bottom: 16px;
        }

        .placeholder-footer {
          height: 40px;
          background: var(--el-fill-color);
          border-radius: 4px;
        }
      }
    }
  }

  .card-view {
    &.table-content {
      // 卡片网格布局
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
      padding: 20px;
    }
  }
}
</style>