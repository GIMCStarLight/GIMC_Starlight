<template>
  <div class="influencer-square-v3">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">达人广场</h2>
      </div>
      <div class="header-right">
        <el-badge :value="store.selectedCount" :hidden="store.selectedCount === 0" type="primary">
          <el-button @click="handleClearSelection" :disabled="store.selectedCount === 0">
            <Icon icon="lucide:x-circle" />
            清空选中
          </el-button>
        </el-badge>
        <el-button @click="handleRefreshView" :loading="refreshingView">
          <Icon icon="lucide:refresh-cw" />
          刷新视图
        </el-button>
        <el-button type="primary" @click="handleExport" :disabled="store.selectedCount === 0">
          <Icon icon="lucide:download" />
          导出选中 ({{ store.selectedCount }})
        </el-button>
      </div>
    </div>

    <!-- 平台切换Tab栏 -->
    <div class="platform-tabs-wrapper">
      <el-tabs v-model="currentPlatform" @tab-change="handlePlatformChange" class="platform-tabs">
        <el-tab-pane 
          v-for="platform in platforms" 
          :key="platform.value" 
          :label="platform.label" 
          :name="platform.value"
          :disabled="platform.value !== 'douyin'"
        >
          <template #label>
            <div class="platform-tab-label">
              <div class="platform-icon">
                <img v-if="platform.icon.startsWith('http') || platform.icon.startsWith('data:')" :src="platform.icon" :alt="platform.label" />
                <Icon v-else :icon="platform.icon" />
              </div>
              <span class="platform-name">{{ platform.label }}</span>
              <el-badge 
                v-if="platform.count !== undefined" 
                :value="platform.count" 
                :max="9999" 
                class="platform-count-badge"
              />
            </div>
          </template>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 根据平台动态显示筛选组件 -->
    <component 
      :is="getQuickFilterComponent(currentPlatform)"
      :key="`quick-filter-${currentPlatform}`"
      @filter-change="handleQuickFilterChange"
    />

    <!-- 达人数据展示区 -->
    <div class="influencer-display-area">
      <!-- 工具栏：视图切换、排序、高级筛选按钮 -->
      <div class="display-toolbar">
        <div class="toolbar-left">
          <span class="result-count">
            找到 <strong>{{ totalCount }}</strong> 位达人
          </span>
        </div>
        
        <div class="toolbar-right">
          <!-- 排序选择 -->
          <div class="toolbar-group">
            <span class="group-label">排序</span>
            <el-select
              v-model="sortBy"
              size="default"
              style="width: 140px"
              @change="handleSortChange"
            >
              <el-option label="综合推荐" value="recommended" />
              <el-option label="粉丝数↓" value="follower_desc" />
              <el-option label="星图指数↓" value="star_index_desc" />
              <el-option label="互动率↓" value="interact_rate_desc" />
              <el-option label="价格↑" value="price_asc" />
              <el-option label="价格↓" value="price_desc" />
            </el-select>
          </div>

          <!-- 筛选控制 -->
          <div class="toolbar-group">
            <span class="group-label">筛选</span>
            <el-select
              v-model="matchedOnly"
              size="default"
              style="width: 120px"
              @change="handleMatchedOnlyToggle"
            >
              <el-option label="全部达人" :value="false" />
              <el-option label="已建联" :value="true" />
            </el-select>
          </div>

          <!-- 视图切换 -->
          <div class="toolbar-group">
            <span class="group-label">视图</span>
            <el-select
              v-model="viewMode"
              size="default"
              style="width: 100px"
            >
              <el-option label="卡片" value="card">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <Icon icon="lucide:layout-grid" />
                  <span>卡片</span>
                </div>
              </el-option>
              <el-option label="列表" value="table">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <Icon icon="lucide:layout-list" />
                  <span>列表</span>
                </div>
              </el-option>
            </el-select>
          </div>

          <!-- 卡片尺寸选择 (仅卡片视图) -->
          <div v-if="viewMode === 'card'" class="toolbar-group">
            <span class="group-label">尺寸</span>
            <el-select
              v-model="cardSize"
              size="default"
              style="width: 100px"
            >
              <el-option label="紧凑" value="compact" />
              <el-option label="标准" value="standard" />
              <el-option label="详细" value="detailed" />
            </el-select>
          </div>
        </div>
      </div>

      <!-- 达人列表 - 根据平台动态切换展示组件 -->
      <component
        :is="getGridComponent(currentPlatform)"
        :key="`grid-${currentPlatform}`"
        :view-mode="viewMode"
        :card-size="cardSize"
        :loading="loading"
        :platform="currentPlatform"
        @update-data="handleUpdateData"
        @evaluate="handleEvaluate"
      />

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[20, 40, 60, 100]"
          :total="totalCount"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <!-- 评价对话框 -->
    <EvaluateDialog 
      v-model:visible="evaluateDialogVisible" 
      :author-id="currentEvaluateAuthorId"
      :reviewer="'系统用户'"
      @review-submitted="handleReviewSubmitted"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, markRaw } from 'vue'
import { IconifyIcon as Icon } from '@vben/icons'
import { ElMessage, ElMessageBox } from 'element-plus'
import EvaluateDialog from '#/components/EvaluateDialog/index.vue'
import { useInfluencerSquareStore } from '#/store/influencer-square'
import { storeToRefs } from 'pinia'
import {
  advancedFilter,
  refreshMaterializedView,
  type AdvancedFilterParams
} from '#/api/influencer-filter'

// Composables
import { useInfluencerExport } from './composables/useInfluencerExport'
import { useInfluencerUpdate } from './composables/useInfluencerUpdate'

// 平台特色筛选组件
import AllPlatformsQuickFilter from './components/platform-filters/AllPlatformsQuickFilter.vue'
import DouyinQuickFilter from './components/platform-filters/DouyinQuickFilter.vue' // 抖音平台的筛选组件(已合并高级筛选)
import XiaohongshuQuickFilter from './components/platform-filters/XiaohongshuQuickFilter.vue'
import WeiboQuickFilter from './components/platform-filters/WeiboQuickFilter.vue'
import BilibiliQuickFilter from './components/platform-filters/BilibiliQuickFilter.vue'
import KuaishouQuickFilter from './components/platform-filters/KuaishouQuickFilter.vue'
import WechatQuickFilter from './components/platform-filters/WechatQuickFilter.vue'

// 平台展示组件
import AllPlatformsGrid from './components/platform-grids/AllPlatformsGrid.vue'
import DouyinGrid from './components/platform-grids/DouyinGrid.vue' // 抖音平台的展示组件
import XiaohongshuGrid from './components/platform-grids/XiaohongshuGrid.vue'
import WeiboGrid from './components/platform-grids/WeiboGrid.vue'
import BilibiliGrid from './components/platform-grids/BilibiliGrid.vue'
import KuaishouGrid from './components/platform-grids/KuaishouGrid.vue'
import WechatGrid from './components/platform-grids/WechatGrid.vue'

// 平台配置
interface PlatformConfig {
  value: string
  label: string
  icon: string
  count?: number
}

const platforms = ref<PlatformConfig[]>([
  { value: 'all', label: '全部平台', icon: 'lucide:globe', count: undefined },
  { value: 'douyin', label: '抖音', icon: 'https://th.bing.com/th/id/ODF.6ZkCjv2hR5s6SR35yaulqQ?w=32&h=32&qlt=90&pcl=fffffc&o=6&cb=ucfimg1&pid=1.2&ucfimg=1', count: undefined },
  { value: 'xiaohongshu', label: '小红书', icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsIAAA7CARUoSoAAAAIBSURBVDhPpZPLS5RhFIfnX9CERJE0G2dGiLLMCS98c4mQNlHwFV6qTYEJZZEhXqiggoSuFilhakkhRSphYFBRUUQJ5SyaFi5c5CJq2QUSPE/n/d6ZbBUDszi8F87vOe93fufzscZxpSzylbII4neWdC//Dc3xco1GtT4JRBYIxKw4Q4AHMRrV+vTSXiiVQDSzWH7tkgFYciAqBGN/E7zVnNN7s5qzhs23OgswYr8DKzfaxJAmFm22UVwDhVWwuhbyK21OaR1SXJMCqFiKwkJ5HE5eBL8C8irAbYWmNog3wp6jUOdCxzno7IUN25CtzV5hn5TUimxpFNyDkPgEOw6AswvevIfrozA6Dr8XFXIE3s3Cz1/w6Bly4kIKkF8pMvZQuHEXJh7D7QdwcwxevoXp59BwyK71e2E2CfOf4cs3pKlNZFW1Asy3TL8Qus/D1FMYuANXhuDSIB40stsmFVy9E5Jz8HoGrt1CZhIiwVgKcLpPOHUZPny0FXv74ckr6BuGe1Pw/Qds3w9XRzT0bt8xJJEUCcUVYFwo1CYa4fGzULBJG9dgxS1dMKifM3IfWnu0qYdtL9rPIC1dYopbFxTiWWZsCqrnJWrdivUKU/ty10HOWrUyvGytFpGCqlQTzQvSs/Dv4KSHyqwhtdjsvXMUCWpRE94cZD3K2f5M2f3OjvsHKgyYDgVwnokAAAAASUVORK5CYII=', count: undefined },
  { value: 'weibo', label: '微博', icon: 'https://th.bing.com/th/id/ODF.qJ-ykoFwP262TObc-fcbNQ?w=32&h=32&qlt=90&pcl=fffffa&o=6&cb=ucfimg1&pid=1.2&ucfimg=1', count: undefined },
  { value: 'bilibili', label: 'B站', icon: 'https://th.bing.com/th/id/ODF.HcIfqnk4n-lbffGcaqDC2w?w=32&h=32&qlt=97&pcl=fffffa&o=6&cb=ucfimg1&pid=1.2&ucfimg=1', count: undefined },
  { value: 'kuaishou', label: '快手', icon: 'https://th.bing.com/th/id/ODF.gZu0GMZwmj-vdqhMRZZODQ?w=32&h=32&qlt=90&pcl=fffffa&o=6&cb=ucfimg1&pid=1.2&ucfimg=1', count: undefined },
  { value: 'wechat', label: '微信', icon: 'https://th.bing.com/th/id/ODF.BvtHqZTl6qLypPDIASUGoA?w=32&h=32&qlt=90&pcl=fffffa&o=6&cb=ucfimg1&pid=1.2&ucfimg=1', count: undefined },
])

const currentPlatform = ref('douyin')

console.log('🎯 [index-v3] 页面组件初始化')

// 使用状态管理
const store = useInfluencerSquareStore()
const {
  loading,
  influencers,
  totalCount,
  currentPage,
  pageSize,
  sortBy,
  viewMode,
  cardSize,
  activeFiltersCount,
} = storeToRefs(store)

// 使用Composables
const { exportInfluencers } = useInfluencerExport()
const { updateInfluencerData } = useInfluencerUpdate()

// 高级筛选面板显示状态
const showAdvancedFilters = ref(false)
const advancedFiltersRef = ref()
const refreshingView = ref(false)

// 评价相关状态
const evaluateDialogVisible = ref(false)
const currentEvaluateAuthorId = ref('')

// 筛选参数
const currentFilters = ref<AdvancedFilterParams>({})
// 仅展示已匹配达人开关
const matchedOnly = ref(false)

// 平台切换处理
const handlePlatformChange = (platformValue: string) => {
  console.log('🔄 平台切换:', platformValue)
  currentPlatform.value = platformValue
  
  // 清空筛选条件
  currentFilters.value = {}
  
  // 根据平台设置筛选条件
  if (platformValue !== 'all') {
    currentFilters.value.platform = platformValue
  }
  
  // 重新加载数据
  store.setFilters(currentFilters.value)
  store.setCurrentPage(1)
  store.loadInfluencers()
}

// 根据平台获取对应的筛选组件
const getQuickFilterComponent = (platform: string) => {
  const filterMap: Record<string, any> = {
    'all': AllPlatformsQuickFilter,      // 全部平台 - 待补充
    'douyin': DouyinQuickFilter,          // 抖音 - 已合并高级筛选
    'xiaohongshu': XiaohongshuQuickFilter, // 小红书 - 待补充
    'weibo': WeiboQuickFilter,            // 微博 - 待补充
    'bilibili': BilibiliQuickFilter,      // B站 - 待补充
    'kuaishou': KuaishouQuickFilter,      // 快手 - 待补充
    'wechat': WechatQuickFilter,          // 微信 - 待补充
  }
  return markRaw(filterMap[platform] || AllPlatformsQuickFilter)
}

const getGridComponent = (platform: string) => {
  const gridMap: Record<string, any> = {
    'all': AllPlatformsGrid,              // 全部平台 - 待补充
    'douyin': DouyinGrid,                 // 抖音 - 当前已有实现
    'xiaohongshu': XiaohongshuGrid,       // 小红书 - 待补充
    'weibo': WeiboGrid,                   // 微博 - 待补充
    'bilibili': BilibiliGrid,             // B站 - 待补充
    'kuaishou': KuaishouGrid,             // 快手 - 待补充
    'wechat': WechatGrid,                 // 微信 - 待补充
  }
  return markRaw(gridMap[platform] || AllPlatformsGrid)
}

// 监听store状态变化
watch(
  () => ({
    influencersCount: store.influencers.length,
    totalCount: totalCount.value,
    loading: loading.value,
  }),
  (newVal) => {
    console.log('🎯 [index-v3] Store状态变化:', newVal)
  },
  { immediate: true, deep: true }
)

// 刷新数据
const handleRefresh = async () => {
  try {
    await store.loadInfluencers()
    ElMessage.success('数据已刷新')
  } catch (error) {
    ElMessage.error('刷新失败')
  }
}

// 刷新物化视图
const handleRefreshView = async () => {
  try {
    refreshingView.value = true
    await refreshMaterializedView()
    ElMessage.success('物化视图刷新成功')
    // 刷新后重新加载数据
    await store.loadInfluencers()
  } catch (error) {
    ElMessage.error('刷新视图失败: ' + ((error as Error).message || '未知错误'))
  } finally {
    refreshingView.value = false
  }
}

// 导出数据 - 使用Composable
const handleExport = async () => {
  await exportInfluencers(store.selectedInfluencerIds)
}

// 清空选中
const handleClearSelection = () => {
  store.clearSelection()
  ElMessage.success('已清空选中')
}

// 排序变化
const handleSortChange = () => {
  store.loadInfluencers()
}

// 分页变化
const handlePageChange = (page: number) => {
  console.log('📄 [index-v3] 页码变化:', {
    newPage: page,
    currentPageBeforeSet: currentPage.value
  })
  store.setCurrentPage(page)
  console.log('📄 [index-v3] 页码更新后:', currentPage.value)
  store.loadInfluencers()
}

const handleSizeChange = (size: number) => {
  console.log('📏 [index-v3] 每页数量变化:', size)
  store.setPageSize(size)
  store.loadInfluencers()
}

// 处理快速筛选变化
const handleQuickFilterChange = (filters: AdvancedFilterParams) => {
  console.log('🛠️ 快速筛选变化:', filters)
  // 保留平台筛选
  const platformFilter = currentPlatform.value !== 'all' ? { platform: currentPlatform.value } : {}
  currentFilters.value = { ...currentFilters.value, ...filters, ...platformFilter, matchedOnly: matchedOnly.value }
  // 更新store的筛选条件并重新加载数据
  store.setFilters(currentFilters.value)
  store.setCurrentPage(1)
  store.loadInfluencers()
}

// 处理高级筛选变化
const handleAdvancedFilterChange = (filters: AdvancedFilterParams) => {
  console.log('⚙️ 高级筛选变化:', filters)
  // 保留平台筛选
  const platformFilter = currentPlatform.value !== 'all' ? { platform: currentPlatform.value } : {}
  currentFilters.value = { ...currentFilters.value, ...filters, ...platformFilter, matchedOnly: matchedOnly.value }
  // 更新store的筛选条件并重新加载数据
  store.setFilters(currentFilters.value)
  store.setCurrentPage(1)
  store.loadInfluencers()
}

// 处理"仅展示已匹配"切换
const handleMatchedOnlyToggle = () => {
  console.log('🔄 [匹配筛选] 开关状态:', matchedOnly.value)
  // 保留平台筛选
  const platformFilter = currentPlatform.value !== 'all' ? { platform: currentPlatform.value } : {}
  currentFilters.value = { ...currentFilters.value, ...platformFilter, matchedOnly: matchedOnly.value }
  store.setFilters(currentFilters.value)
  store.setCurrentPage(1)
  store.loadInfluencers()
}

// 更新达人数据方法 - 使用Composable封装
const handleUpdateData = async (influencer: any) => {
  await updateInfluencerData(influencer, () => store.loadInfluencers())
}

// 评价达人
const handleEvaluate = (influencer: any) => {
  console.log('评价达人:', influencer)
  currentEvaluateAuthorId.value = influencer.author_id || ''
  if (!currentEvaluateAuthorId.value) {
    ElMessage.warning('缺少达人 ID，无法评价')
    return
  }
  evaluateDialogVisible.value = true
}

// 评价提交成功后
const handleReviewSubmitted = () => {
  ElMessage.success('评价已提交')
  evaluateDialogVisible.value = false
}

// 向子组件暴露更新方法
defineExpose({
  updateInfluencerData: handleUpdateData
})

// 初始化加载数据
console.log('🎯 [index-v3] 开始加载初始数据')
store.loadInfluencers()

// 暴露调试变量到 window，便于控制台查看与触发刷新
if (typeof window !== 'undefined') {
  ;(window as any).__v3Influencers = influencers
  ;(window as any).__loadV3Influencers = store.loadInfluencers
  ;(window as any).__v3Store = {
    loading,
    totalCount,
    currentPage,
    pageSize,
    sortBy,
    viewMode,
    cardSize,
  }
}
</script>

<style scoped lang="scss">
.influencer-square-v3 {
  padding: 20px;
  background: var(--el-bg-color-page);
  min-height: 100vh;

  /* 页面标题 */
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0;
    padding: 24px;
    background: var(--el-bg-color);
    border-radius: 8px 8px 0 0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

    .header-left {
      .page-title {
        margin: 0 0 8px 0;
        font-size: 24px;
        font-weight: 600;
        color: var(--el-text-color-primary);
      }

      .page-subtitle {
        margin: 0;
        font-size: 14px;
        color: var(--el-text-color-secondary);
      }
    }

    .header-right {
      display: flex;
      gap: 12px;
    }
  }

  /* 平台切换Tab栏 */
  .platform-tabs-wrapper {
    position: relative;
    background: linear-gradient(to bottom, #fafafa, #ffffff);
    padding: 20px 24px 0;
    border-bottom: 1px solid #e8e8e8;
    margin-bottom: 20px;
    border-radius: 0 0 8px 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

    .platform-tabs {
      :deep(.el-tabs__header) {
        margin-bottom: 0;
        border-bottom: none;
      }

      :deep(.el-tabs__nav-wrap) {
        &::after {
          display: none;
        }
      }

      :deep(.el-tabs__item) {
        padding: 0 24px;
        height: 52px;
        line-height: 52px;
        font-size: 14px;
        font-weight: 500;
        color: #606266;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 8px 8px 0 0;
        margin-right: 4px;
        position: relative;

        &:hover:not(.is-disabled) {
          color: var(--el-color-primary);
          background: rgba(64, 158, 255, 0.05);
        }

        &.is-active {
          color: var(--el-color-primary);
          font-weight: 600;
          background: #ffffff;
          box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
          
          &::before {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, var(--el-color-primary), #66b1ff);
            border-radius: 3px 3px 0 0;
          }
        }

        &.is-disabled {
          color: #c0c4cc;
          cursor: not-allowed;
          opacity: 0.5;
          
          &:hover {
            background: transparent;
          }
          
          .platform-icon {
            filter: grayscale(100%);
            opacity: 0.4;
          }
        }
      }

      :deep(.el-tabs__active-bar) {
        display: none;
      }

      .platform-tab-label {
        display: flex;
        align-items: center;
        gap: 10px;

        .platform-icon {
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
          
          :deep(img) {
            width: 22px;
            height: 22px;
            object-fit: contain;
            transition: all 0.3s;
          }
        }
        
        .platform-name {
          font-size: 14px;
        }

        .platform-count-badge {
          :deep(.el-badge__content) {
            background: linear-gradient(135deg, var(--el-color-primary), #66b1ff);
            border: none;
            font-size: 11px;
            height: 20px;
            line-height: 20px;
            padding: 0 7px;
            font-weight: 600;
            box-shadow: 0 2px 4px rgba(64, 158, 255, 0.3);
          }
        }
      }
      
      /* 激活状态下的图标发光效果 */
      :deep(.el-tabs__item.is-active) {
        .platform-icon img {
          filter: drop-shadow(0 0 4px rgba(64, 158, 255, 0.4));
        }
      }
    }
  }
  
  /* 达人展示区 */
  .influencer-display-area {
    background: var(--el-bg-color);
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);

    .display-toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--el-border-color-lighter);

      .toolbar-left {
        .result-count {
          font-size: 14px;
          color: var(--el-text-color-secondary);

          strong {
            color: var(--el-color-primary);
            font-size: 18px;
            font-weight: 600;
            margin: 0 4px;
          }
        }
      }

      .toolbar-right {
        display: flex;
        align-items: center;
        gap: 16px;
      }
      
      .toolbar-group {
        display: flex;
        align-items: center;
        gap: 8px;
        
        .group-label {
          font-size: 13px;
          color: var(--el-text-color-regular);
          font-weight: 500;
          white-space: nowrap;
        }
      }
    }
  }

  /* 分页 */
  .pagination-container {
    display: flex;
    justify-content: center;
    margin-top: 32px;
    padding-top: 20px;
    border-top: 1px solid var(--el-border-color-lighter);
  }
}
</style>
