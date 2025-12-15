<template>
  <div class="influencer-list">
    <StandardTable
      ref="tableRef"
      :data-source="props.influencers"
      :columns="tableColumns"
      row-key="author_id"
      :selected-rows="selectedRows"
      @update:selected-rows="handleTableSelectionChange"
      @sortChange="handleSortChange"
    >
      <template #authorInfo="{ record }">
        <div class="author-info-cell">
          <div class="author-avatar-wrapper">
            <img v-if="record.avatar_uri" :src="record.avatar_uri" :alt="record.nick_name" class="author-avatar-img" loading="lazy" />
            <div v-else class="author-avatar-img avatar-placeholder"></div>
          </div>
          <div class="author-detail-info">
            <div class="author-name-row">
              <span class="author-name">{{ record.nick_name }}</span>
            </div>
            <div class="author-meta-row">
              <span class="author-gender">{{ formatGender(record.gender) }}</span>
              <div class="meta-divider"></div>
              <span class="author-location">{{ record.city || record.province || '-' }}</span>
            </div>
          </div>
        </div>
      </template>
      
      <template #growth="{ record }">
        <div style="display: flex; align-items: center; justify-content: center; gap: 4px;">
          <Icon
            v-if="getGrowthIcon(record.fans_increment_rate_30d)"
            :icon="getGrowthIcon(record.fans_increment_rate_30d)"
            :style="{ color: getGrowthColor(record.fans_increment_rate_30d), fontSize: '14px' }"
          />
          <span :class="getGrowthClass(record.fans_increment_rate_30d)">{{ formatPercent(record.fans_increment_rate_30d) }}</span>
        </div>
      </template>
      
      <template #starIndex="{ record }">
        <span v-if="record.star_index !== undefined && record.star_index !== null">{{ formatNumber(record.star_index) }}</span>
        <span v-else>-</span>
      </template>
      
      <template #price="{ record }">
        <span v-if="record.price_60" class="price-text">{{ formatPrice(record.price_60) }}</span>
        <span v-else>-</span>
      </template>
      
      <template #featureTags="{ record }">
        <div class="feature-tags-cell">
          <el-tag v-if="record.star_excellent_author" size="small" effect="plain" class="tag-item">优质达人</el-tag>
          <el-tag v-if="record.is_black_horse_author" size="small" effect="plain" class="tag-item">黑马达人</el-tag>
          <el-tag v-if="record.e_commerce_enable" size="small" effect="plain" class="tag-item">电商达人</el-tag>
          <el-tag v-if="record.is_rising_star" size="small" effect="plain" class="tag-item">新星达人</el-tag>
        </div>
      </template>
      
      <template #contentTags="{ record }">
        <div class="content-tags-cell">
          <el-tag 
            v-for="(tag, index) in getContentTags(record)" 
            :key="index" 
            size="small" 
            effect="plain"
            class="tag-item"
          >
            {{ tag }}
          </el-tag>
        </div>
      </template>
      
      <template #actions="{ record }">
        <div class="table-actions">
          <!-- 查看详情 -->
          <ToolTipPicker>
            <template #content>
              <div class="simple-tooltip-text">查看详情</div>
            </template>
            <template #trigger>
              <div class="action-icon-wrapper" @click="handleViewDetail(record)">
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
              <div class="action-icon-wrapper" @click="handleCompare(record)">
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
              <div class="action-icon-wrapper" @click="handleEvaluate(record)">
                <Icon icon="lucide:message-circle-more" class="action-icon" />
              </div>
            </template>
          </ToolTipPicker>

          <!-- 收藏 -->
          <ToolTipPicker>
            <template #content>
              <div class="simple-tooltip-text">{{ record.isFavorited ? '取消收藏' : '收藏' }}</div>
            </template>
            <template #trigger>
              <div
                class="action-icon-wrapper"
                :class="{ 'is-favorited': record.isFavorited }"
                @click="handleFavorite(record)"
              >
                <Icon :icon="record.isFavorited ? 'heroicons:star-solid' : 'lucide:star'" class="action-icon" />
              </div>
            </template>
          </ToolTipPicker>

          <!-- 更新数据 -->
          <ToolTipPicker>
            <template #content>
              <div class="simple-tooltip-text">{{ record.updating ? '更新中...' : '更新数据' }}</div>
            </template>
            <template #trigger>
              <div
                class="action-icon-wrapper update-btn"
                :class="{ 'is-updating': record.updating }"
                @click="handleUpdateData(record)"
              >
                <Icon icon="lucide:refresh-cw" class="action-icon" :class="{ 'rotating': record.updating }" />
              </div>
            </template>
          </ToolTipPicker>
        </div>
      </template>
      
      <template #matchStatus="{ record }">
        <el-tag v-if="record.is_matched" type="success" size="small" effect="dark">已建联</el-tag>
        <el-tag v-else type="info" size="small" effect="plain">未建联</el-tag>
      </template>
      
      <template #rebateRange="{ record }">
        <span v-if="record.rebate_range" class="rebate-highlight">{{ record.rebate_range }}</span>
        <span v-else>-</span>
      </template>
      
        
      <template #starId="{ record }">
        <div style="font-family: monospace; font-size: 12px;">{{ record.star_id }}</div>
      </template>
    </StandardTable>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { IconifyIcon as Icon } from '@vben/icons'
import { useRouter } from 'vue-router'
import StandardTable from '../../../components/standTable/index.vue'
import ToolTipPicker from './ToolTipPicker.vue'
import { useInfluencerSquareStore } from '#/store'

const props = defineProps({
  influencers: {
    type: Array,
    default: () => []
  }
})

const router = useRouter()
const store = useInfluencerSquareStore()
const tableRef = ref()
const selectedRows = ref([])
//{ label: '星图ID', prop: 'starId', dataIndex: 'star_id', width: 160, align: 'center' },
const tableColumns = [
  { label: '达人信息', prop: 'authorInfo', width: 200, align: 'center' },
  { label: '粉丝数', prop: 'follower', dataIndex: 'follower', width: 120, align: 'center', sortable: true, formatter: (row) => formatFollower(row.follower) },
  { label: '星图指数', prop: 'starIndex', dataIndex: 'star_index', width: 100, align: 'center', sortable: true },
  { label: '粉丝增长率', prop: 'growth', dataIndex: 'fans_increment_rate_30d', width: 100, align: 'center', sortable: true },
  { label: '互动率', prop: 'interact_rate_30d', dataIndex: 'interact_rate_30d', width: 100, align: 'center', sortable: true, formatter: (row) => formatPercent(row.interact_rate_30d) },
  { label: '完播率', prop: 'play_over_rate_30d', dataIndex: 'play_over_rate_30d', width: 100, align: 'center', sortable: true, formatter: (row) => formatPercent(row.play_over_rate_30d) },
  { label: '特征标签', prop: 'featureTags', width: 150, align: 'center' },
  { label: '内容标签', prop: 'contentTags', width: 150, align: 'center' },
  { label: '地域', prop: 'province', dataIndex: 'province', width: 100, align: 'center', formatter: (row) => row.province || '-' },
  { label: '匹配状态', prop: 'matchStatus', width: 100, align: 'center' },
  { label: '所属机构', prop: 'org_name', dataIndex: 'org_name', width: 150, align: 'center', formatter: (row) => row.org_name || '-' },
  { label: '返点政策', prop: 'rebate_policy', dataIndex: 'rebate_policy', width: 150, align: 'center', formatter: (row) => row.rebate_policy || '-' },
  { label: '返点区间', prop: 'rebateRange', dataIndex: 'rebate_range', width: 120, align: 'center' },
  { label: '政策等级', prop: 'policyLevel', dataIndex: 'policy_level', width: 100, align: 'center', formatter: (row) => row.policy_level ? `${row.policy_level}级` : '-' },
  { label: '返点账期', prop: 'rebate_period', dataIndex: 'rebate_period', width: 120, align: 'center', formatter: (row) => row.rebate_period || '-' },
  { label: '支付账期', prop: 'pay_period', dataIndex: 'pay_period', width: 120, align: 'center', formatter: (row) => row.pay_period || '-' },
  { label: '60s报价', prop: 'price', dataIndex: 'price_60', width: 120, align: 'center', sortable: true, fixed: 'right' },
  { label: '操作', prop: 'actions', width: 200, align: 'center', fixed: 'right' },
]

function formatFollower(count) {
  if (!count) return '0'
  return count.toLocaleString()
}

function formatPercent(value) {
  if (value === undefined || value === null) return '-'
  return `${(value * 100).toFixed(1)}%`
}

function formatNumber(value) {
  if (value === undefined || value === null) return '-'
  const roundedValue = Math.round(value * 10) / 10
  return roundedValue.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

function formatGender(gender) {
  if (gender === 1) return '男'
  if (gender === 2) return '女'
  return '-'
}

function formatPrice(value) {
  if (!value) return '0'
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(numValue)) return '0'
  if (numValue >= 10000) return `${(numValue / 10000).toFixed(1)}万`
  return numValue.toLocaleString()
}

function getGrowthClass(rate) {
  if (!rate) return ''
  if (rate >= 0.001) return 'growth-high'
  if (rate >= 0) return ''
  return 'growth-low'
}

function getGrowthIcon(rate) {
  if (rate >= 0.01) return 'lucide:trending-up'
  if (rate > 0) return null
  return 'lucide:trending-down'
}

function getGrowthColor(rate) {
  if (rate >= 0.01) return '#f56c6c' // red
  if (rate > 0) return '#333' // gray
  return '#67c23a' // green
}

function getContentTags(row) {
  const tags = row.primary_tags || []
  return Array.isArray(tags) ? tags.slice(0, 3) : []
}


function handleTableSelectionChange(rows) {
  selectedRows.value = rows
}

/**
 * 表格列 dataIndex 到后端 sortBy 字段的映射
 * 后端支持: follower, star_index, interact_rate, price, growth_rate, gmv
 */
const sortFieldMap = {
  'follower': 'follower',
  'star_index': 'star_index',
  'fans_increment_rate_30d': 'growth_rate',
  'interact_rate_30d': 'interact_rate',
  'play_over_rate_30d': 'interact_rate', // 完播率映射到互动率
  'price_60': 'price'
}

function handleSortChange(sort) {
  console.log('排序变化:', sort)
  
  if (!sort || !sort.prop || !sort.order) {
    // 如果没有排序，恢复默认排序
    store.setSortBy('star_index_desc')
    store.loadInfluencers()
    return
  }
  
  // 获取映射后的排序字段
  const mappedField = sortFieldMap[sort.prop] || sort.prop
  
  // 根据排序方向确定后缀
  const orderSuffix = sort.order === 'ascending' ? '_asc' : '_desc'
  
  // 构建排序选项
  const sortOption = `${mappedField}${orderSuffix}`
  
  console.log('应用排序:', sortOption)
  store.setSortBy(sortOption)
  store.loadInfluencers()
}

function handleViewDetail(data) {
  const targetPath = `/influencer-detail/${data.author_id}`
  try {
    router.push(targetPath)
  } catch (error) {
    console.error('路由跳转失败:', error)
    ElMessage.error('跳转失败: ' + error.message)
  }
}

function handleCompare(data) {
  ElMessage.info('对比功能开发中...')
}

function handleFavorite(data) {
  data.isFavorited = !data.isFavorited
  ElMessage.success(data.isFavorited ? '已收藏' : '取消收藏')
}

function handleEvaluate(data) {
  ElMessage.info('评价功能开发中...')
}

function handleUpdateData(data) {
  data.updating = true
  setTimeout(() => {
    data.updating = false
    ElMessage.success('数据更新成功')
  }, 1500)
}
</script>

<style scoped lang="scss">
.influencer-list {
  // 达人信息单元格样式
  .author-info-cell {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;

    .author-avatar-wrapper {
      padding-left: 20px;
      flex-shrink: 0;

      .author-avatar-img {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        object-fit: cover;
        display: block;
      }

      .avatar-placeholder {
        background-color: #f0f0f0;
      }
    }

    .author-detail-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;

      .author-name-row {
        display: flex;
        align-items: center;
        gap: 6px;

        .author-name {
          font-size: 14px;
          font-weight: 500;
          color: var(--el-text-color-primary);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }

      .author-meta-row {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        color: var(--el-text-color-secondary);

        .author-gender {
          color: var(--el-text-color-regular);
        }

        .meta-divider {
          width: 1px;
          height: 12px;
          background-color: var(--el-border-color);
        }

        .author-location {
          color: var(--el-text-color-regular);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      }
    }
  }

  .price-text {
    font-weight: 500;
    color: #1677ff; // 改为蓝色
    font-size: 17px;
  }

  // 特征标签单元格
  .feature-tags-cell {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    justify-content: center;
    padding: 4px 0;

    .tag-item {
      margin: 0;
      font-size: 12px;
      padding: 0 8px;
      height: 22px;
      line-height: 22px;
      border-radius: 2px;
      background-color: var(--el-fill-color-light);
      border: 1px solid var(--el-border-color-lighter);
      color: var(--el-text-color-regular);
    }
  }

  // 内容标签单元格
  .content-tags-cell {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    justify-content: center;
    padding: 4px 0;

    .tag-item {
      margin: 0;
      font-size: 12px;
      padding: 0 8px;
      height: 22px;
      line-height: 22px;
      border-radius: 2px;
      background-color: var(--el-fill-color-light);
      border: 1px solid var(--el-border-color-lighter);
      color: var(--el-text-color-regular);
    }
  }

  .rebate-highlight {
    font-weight: 500;
    color: #1677ff; // 改为蓝色
    font-size: 15px;
  }

  .growth-high {
    color: #f56c6c;
    font-weight: 600;
  }

  .growth-low {
    color: #67c23a;
  }

  .growth-negative {
    color: #909399;
  }

  // 操作按钮样式
  .table-actions {
    display: flex;
    gap: 8px;
    justify-content: center;
    align-items: center;

    .action-icon-wrapper {
      cursor: pointer;
      padding: 6px;
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
      }

      &.is-favorited {
        .action-icon {
          color: var(--el-color-warning);
          transform: scale(1.2);
        }
      }

      &.is-updating {
        .action-icon {
          &.rotating {
            animation: rotate 1s linear infinite;
          }
        }
      }
    }
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.simple-tooltip-text {
  font-size: 12px;
  color: #606266;
  padding: 2px 4px;
}
</style>
