<template>
  <div class="influencer-list">
    <!-- 表格列表视图 -->
    <el-table
      ref="tableRef"
      :data="influencers"
      row-key="author_id"
      stripe
      border
      style="width: 100%"
      @selection-change="handleTableSelectionChange"
      @sort-change="handleSortChange"
    >
      <el-table-column type="selection" width="55" reserve-selection />
      
      <el-table-column label="头像" width="80" align="center" fixed="left">
        <template #default="{ row }">
          <div class="avatar-wrapper">
            <img 
              v-lazy="row.avatar_uri" 
              :alt="row.nick_name"
              class="table-avatar"
            />
          </div>
        </template>
      </el-table-column>
      
      <el-table-column label="昵称" prop="nick_name" width="150" show-overflow-tooltip fixed="left" />
      
      <el-table-column label="粉丝数" prop="follower" width="120" align="right" sortable="custom">
        <template #default="{ row }">
          {{ formatFollower(row.follower) }}
        </template>
      </el-table-column>
      
      <el-table-column label="粉丝增长率" prop="fans_increment_rate_30d" width="120" align="right" sortable="custom">
        <template #default="{ row }">
          <span :class="getGrowthClass(row.fans_increment_rate_30d)">
            {{ formatPercent(row.fans_increment_rate_30d) }}
          </span>
        </template>
      </el-table-column>
      
      <el-table-column label="互动率" prop="interact_rate_30d" width="100" align="right" sortable="custom">
        <template #default="{ row }">
          {{ formatPercent(row.interact_rate_30d) }}
        </template>
      </el-table-column>
      
      <el-table-column label="完播率" prop="play_over_rate_30d" width="100" align="right" sortable="custom">
        <template #default="{ row }">
          {{ formatPercent(row.play_over_rate_30d) }}
        </template>
      </el-table-column>
      
      <el-table-column label="星图指数" prop="star_index" width="110" align="right" sortable="custom">
        <template #default="{ row }">
          <el-tag v-if="row.star_index !== undefined && row.star_index !== null" type="success" size="small">
            {{ formatNumber(row.star_index) }}
          </el-tag>
          <span v-else>-</span>
        </template>
      </el-table-column>
      
      <el-table-column label="60s报价" prop="price_60" width="120" align="right" sortable="custom">
        <template #default="{ row }">
          <span v-if="row.price_60" class="price-text">
            ¥{{ formatPrice(row.price_60) }}
          </span>
          <span v-else>-</span>
        </template>
      </el-table-column>
      
      <el-table-column label="特征标签" width="200" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="tags-container">
            <el-tag v-if="row.star_excellent_author" type="warning" size="small">优质</el-tag>
            <el-tag v-if="row.is_black_horse_author" type="danger" size="small">黑马</el-tag>
            <el-tag v-if="row.e_commerce_enable" type="success" size="small">电商</el-tag>
            <el-tag v-if="row.is_rising_star" type="info" size="small">新星</el-tag>
          </div>
        </template>
      </el-table-column>
      
      <el-table-column label="内容标签" width="250" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="content-tags">
            <el-tag
              v-for="(tag, index) in getContentTags(row)"
              :key="index"
              size="small"
              effect="plain"
              style="margin-right: 4px"
            >
              {{ tag }}
            </el-tag>
          </div>
        </template>
      </el-table-column>
      
      <el-table-column label="地域" width="100">
        <template #default="{ row }">
          {{ row.province || '-' }}
        </template>
      </el-table-column>
      
      <el-table-column label="操作" width="320" fixed="right">
        <template #default="{ row }">
          <el-button size="small" type="primary" link @click="handleViewDetail(row)">
            查看
          </el-button>
          <el-button size="small" type="success" link @click="handleCompare(row)">
            对比
          </el-button>
          <el-button size="small" type="warning" link @click="handleFavorite(row)">
            收藏
          </el-button>
          <el-button size="small" type="info" link @click="handleEvaluate(row)">
            评价
          </el-button>
          <el-button 
            size="small" 
            type="warning" 
            link 
            @click="handleUpdateData(row)"
            :loading="row.updating"
          >
            {{ row.updating ? '更新中...' : '更新数据' }}
          </el-button>
        </template>
      </el-table-column>
      
      <!-- 已匹配达人的额外字段 -->
      <el-table-column label="匹配状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.is_matched" type="success" size="small" effect="dark">
            已建联
          </el-tag>
          <el-tag v-else type="info" size="small" effect="plain">
            未建联
          </el-tag>
        </template>
      </el-table-column>
      
      <el-table-column label="所属机构" prop="org_name" width="150" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.org_name || '-' }}
        </template>
      </el-table-column>
      
      <el-table-column label="返点政策" prop="rebate_policy" width="150" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.rebate_policy || '-' }}
        </template>
      </el-table-column>
      
      <el-table-column label="返点区间" prop="rebate_range" width="120" align="center">
        <template #default="{ row }">
          <span v-if="row.rebate_range" class="rebate-highlight">
            {{ row.rebate_range }}
          </span>
          <span v-else>-</span>
        </template>
      </el-table-column>
      
      <el-table-column label="政策等级" prop="policy_level" width="100" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.policy_level" :type="getPolicyLevelType(row.policy_level)" size="small">
            {{ row.policy_level }}级
          </el-tag>
          <span v-else>-</span>
        </template>
      </el-table-column>
      
      <el-table-column label="返点账期" prop="rebate_period" width="120" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.rebate_period || '-' }}
        </template>
      </el-table-column>
      
      <el-table-column label="支付账期" prop="pay_period" width="120" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.pay_period || '-' }}
        </template>
      </el-table-column>
      
      <el-table-column label="星图ID" width="160" show-overflow-tooltip>
        <template #default="{ row }">
          <div style="font-family: monospace; font-size: 12px;">
            {{ row.star_id }}
          </div>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { log } from '#/utils/logger'
import { computed, ref, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import type { ElTable } from 'element-plus'
import { useInfluencerSquareStore } from '#/store'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'

const props = defineProps<{
  cardSize: 'compact' | 'standard' | 'detailed'
  useStoreSelection?: boolean // 是否使用store管理选中状态，默认true
  influencers?: any[] // 外部传入的达人数据，如果不提供则使用store
}>()

const store = useInfluencerSquareStore()
const storeRefs = storeToRefs(store)

// 使用外部传入的 influencers，或者使用 store 的数据
const influencers = computed(() => props.influencers || storeRefs.influencers.value)
const router = useRouter()
const tableRef = ref<InstanceType<typeof ElTable>>()
const isInternalUpdate = ref(false)

// 监听数据变化，恢复选中状态
watch(
  () => influencers.value,
  (newVal, oldVal) => {
    // 避免在内部更新时重复执行
    if (isInternalUpdate.value) {
      isInternalUpdate.value = false
      return
    }
    
    // 只在数据源变化（如换页）时恢复选中状态
    if (newVal && newVal.length > 0 && tableRef.value && newVal !== oldVal) {
      nextTick(() => {
        // 清除所有选中
        tableRef.value?.clearSelection()
        
        // 恢复之前选中的行
        newVal.forEach((row: any) => {
          if (row.isSelected) {
            tableRef.value?.toggleRowSelection(row, true)
          }
        })
      })
    }
  }
)

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
  if (numValue >= 10000) return `${(numValue / 10000).toFixed(1)}万`
  return numValue.toLocaleString()
}

const getGrowthClass = (rate: number): string => {
  if (!rate) return ''
  if (rate > 0.1) return 'growth-high'  // >10%
  if (rate > 0.05) return 'growth-medium'  // >5%
  if (rate > 0) return 'growth-low'  // >0%
  return 'growth-negative'
}

const getContentTags = (row: any): string[] => {
  const tags = row.primary_tags || []
  return Array.isArray(tags) ? tags.slice(0, 3) : []  // 最多显示3个标签
}

const getPolicyLevelType = (level: string): string => {
  const types: Record<string, string> = {
    'A': 'danger',
    'B': 'warning',
    'C': 'info',
  }
  return types[level] || 'info'
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

const handleTableSelectionChange = (selection: any[]) => {
  log.debug('[InfluencerList] 表格选中变化:', {
    selectionLength: selection.length,
    selectedIds: selection.map((item: any) => item.author_id)
  })
  
  // 标记为内部更新，避免 watch 重复执行
  isInternalUpdate.value = true
  
  const selectedIds = selection.map((item: any) => item.author_id)
  const allCurrentPageIds = influencers.value.map((item: any) => item.author_id)
  
  // 如果useStoreSelection为false，则不更新store
  if (props.useStoreSelection === false) {
    log.debug('[InfluencerList] 跳过store更新（useStoreSelection=false）')
    // 对每个选中项发送事件
    selection.forEach((item: any) => {
      emit('selection-change', item, true)
    })
    return
  }
  
  // 移除当前页未选中的
  const unselectedIds = allCurrentPageIds.filter((id: string) => !selectedIds.includes(id))
  store.setInfluencerSelection(unselectedIds, false)
  
  // 添加当前页选中的
  store.setInfluencerSelection(selectedIds, true)
  
  log.debug('[InfluencerList] store当前选中数量:', store.selectedCount)
}

// 处理表格排序
const handleSortChange = ({ column, prop, order }: any) => {
  log.debug('[InfluencerList] 排序变化:', { prop, order })
  
  if (!prop || !order) {
    // 清除排序，恢复默认
    store.setSortBy('recommended')
  } else {
    // 根据字段和顺序设置排序
    const sortOrder = order === 'ascending' ? 'asc' : 'desc'
    store.setSortBy(`${prop}_${sortOrder}`)
  }
  
  // 重新加载数据
  store.loadInfluencersDebounced()
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
  'view-detail': [data: any]
  'compare': [data: any]
  'favorite': [data: any]
  'selection-change': [data: any, selected: boolean]
  'update-data': [data: any]
  'evaluate': [data: any]
}>()
</script>

<style scoped lang="scss">
.influencer-list {
  :deep(.el-table) {
    font-size: 13px;
    
    .price-text {
      color: #f56c6c;
      font-weight: 600;
    }
    
    .growth-high {
      color: #67c23a;
      font-weight: 600;
    }
    
    .growth-medium {
      color: #409eff;
      font-weight: 500;
    }
    
    .growth-low {
      color: #909399;
    }
    
    .growth-negative {
      color: #f56c6c;
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
      max-width: 100%;
    }
    
    .rebate-highlight {
      color: #f56c6c;
      font-weight: 600;
    }
    
    .avatar-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      
      .table-avatar {
        width: 40px;
        height: 40px;
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
    }
  }
}
</style>
