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
      <template #avatar="{ record }">
        <div class="avatar-wrapper">
          <img v-if="record.avatar_uri" :src="record.avatar_uri" :alt="record.nick_name" class="table-avatar" loading="lazy" />
          <div v-else class="table-avatar avatar-placeholder"></div>
        </div>
      </template>
      
      <template #growth="{ record }">
        <span :class="getGrowthClass(record.fans_increment_rate_30d)">{{ formatPercent(record.fans_increment_rate_30d) }}</span>
      </template>
      
      <template #starIndex="{ record }">
        <el-tag v-if="record.star_index !== undefined && record.star_index !== null" type="success" size="small">{{ formatNumber(record.star_index) }}</el-tag>
        <span v-else>-</span>
      </template>
      
      <template #price="{ record }">
        <span v-if="record.price_60" class="price-text">{{ formatPrice(record.price_60) }}</span>
        <span v-else>-</span>
      </template>
      
      <template #featureTags="{ record }">
        <div class="tags-container">
          <el-tag v-if="record.star_excellent_author" type="warning" size="small">优质</el-tag>
          <el-tag v-if="record.is_black_horse_author" type="danger" size="small">黑马</el-tag>
          <el-tag v-if="record.e_commerce_enable" type="success" size="small">电商</el-tag>
          <el-tag v-if="record.is_rising_star" type="info" size="small">新星</el-tag>
        </div>
      </template>
      
      <template #contentTags="{ record }">
        <div class="content-tags">
          <el-tag v-for="(tag, index) in getContentTags(record)" :key="index" size="small" effect="plain" style="margin-right: 4px">{{ tag }}</el-tag>
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
                <Icon :icon="record.isFavorited ? 'heroicons:star-solid' : 'lucide:star-off'" class="action-icon" />
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
      
      <template #policyLevel="{ record }">
        <el-tag v-if="record.policy_level" :type="getPolicyLevelType(record.policy_level)" size="small">{{ record.policy_level }}级</el-tag>
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

const props = defineProps({
  influencers: {
    type: Array,
    default: () => []
  }
})

const router = useRouter()
const tableRef = ref()
const selectedRows = ref([])

const tableColumns = [
  { label: '头像', prop: 'avatar', width: 80, align: 'center' },
  { label: '昵称', prop: 'nick_name', dataIndex: 'nick_name', width: 150 },
  { label: '粉丝数', prop: 'follower', dataIndex: 'follower', width: 120, align: 'right', sortable: true, formatter: (row) => formatFollower(row.follower) },
  { label: '粉丝增长率', prop: 'growth', dataIndex: 'fans_increment_rate_30d', width: 120, align: 'right', sortable: true },
  { label: '互动率', prop: 'interact_rate_30d', dataIndex: 'interact_rate_30d', width: 100, align: 'right', sortable: true, formatter: (row) => formatPercent(row.interact_rate_30d) },
  { label: '完播率', prop: 'play_over_rate_30d', dataIndex: 'play_over_rate_30d', width: 100, align: 'right', sortable: true, formatter: (row) => formatPercent(row.play_over_rate_30d) },
  { label: '星图指数', prop: 'starIndex', dataIndex: 'star_index', width: 110, align: 'right', sortable: true },
  { label: '60s报价', prop: 'price', dataIndex: 'price_60', width: 120, align: 'right', sortable: true },
  { label: '特征标签', prop: 'featureTags', width: 200 },
  { label: '内容标签', prop: 'contentTags', width: 250 },
  { label: '地域', prop: 'province', dataIndex: 'province', width: 100, formatter: (row) => row.province || '-' },
  { label: '匹配状态', prop: 'matchStatus', width: 100, align: 'center' },
  { label: '所属机构', prop: 'org_name', dataIndex: 'org_name', width: 150, formatter: (row) => row.org_name || '-' },
  { label: '返点政策', prop: 'rebate_policy', dataIndex: 'rebate_policy', width: 150, formatter: (row) => row.rebate_policy || '-' },
  { label: '返点区间', prop: 'rebateRange', dataIndex: 'rebate_range', width: 120, align: 'center' },
  { label: '政策等级', prop: 'policyLevel', dataIndex: 'policy_level', width: 100, align: 'center' },
  { label: '返点账期', prop: 'rebate_period', dataIndex: 'rebate_period', width: 120, formatter: (row) => row.rebate_period || '-' },
  { label: '支付账期', prop: 'pay_period', dataIndex: 'pay_period', width: 120, formatter: (row) => row.pay_period || '-' },
  { label: '星图ID', prop: 'starId', dataIndex: 'star_id', width: 160 },
  { label: '操作', prop: 'actions', width: 200, fixed: 'right' },
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
  return value.toLocaleString()
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
  if (rate > 0.1) return 'growth-high'
  if (rate > 0.05) return 'growth-medium'
  if (rate > 0) return 'growth-low'
  return 'growth-negative'
}

function getContentTags(row) {
  const tags = row.primary_tags || []
  return Array.isArray(tags) ? tags.slice(0, 3) : []
}

function getPolicyLevelType(level) {
  const types = {
    'A': 'danger',
    'B': 'warning',
    'C': 'info',
  }
  return types[level] || 'info'
}

function handleTableSelectionChange(rows) {
  selectedRows.value = rows
}

function handleSortChange(sort) {
  console.log('排序变化:', sort)
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
  .avatar-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .table-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
  }

  .avatar-placeholder {
    background-color: #f0f0f0;
  }

  .price-text {
    color: #f56c6c;
    font-weight: 500;
  }

  .tags-container {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .content-tags {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .rebate-highlight {
    color: #67c23a;
    font-weight: 500;
  }

  .growth-high {
    color: #f56c6c;
    font-weight: 600;
  }

  .growth-medium {
    color: #e6a23c;
    font-weight: 500;
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
