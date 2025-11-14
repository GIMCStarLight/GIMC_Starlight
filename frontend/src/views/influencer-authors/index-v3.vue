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
        >
          <template #label>
            <div class="platform-tab-label">
              <div class="platform-icon">
                <img v-if="platform.icon.startsWith('http') || platform.icon.startsWith('data:')" :src="platform.icon" :alt="platform.label" />
                <Icon v-else :icon="platform.icon" />
              </div>
              <span>{{ platform.label }}</span>
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
        
        <div class="toolbar-center">
          <!-- 排序选择 -->
          <el-select
            v-model="sortBy"
            placeholder="排序方式"
            style="width: 150px"
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

        <div class="toolbar-right">
          <!-- 仅展示已匹配达人开关 -->
          <el-tooltip content="仅显示已匹配到作者的达人" placement="top">
            <div style="display: inline-flex; align-items: center; gap: 8px;">
              <span style="font-size: 13px; color: var(--el-text-color-secondary)">仅展示已建联</span>
              <el-switch v-model="matchedOnly" @change="handleMatchedOnlyToggle" />
            </div>
          </el-tooltip>

          <!-- 视图切换 -->
          <el-radio-group v-model="viewMode" size="default">
            <el-radio-button value="card">
              <Icon icon="lucide:layout-grid" />
              卡片
            </el-radio-button>
            <el-radio-button value="table">
              <Icon icon="lucide:layout-list" />
              列表
            </el-radio-button>
          </el-radio-group>

          <!-- 卡片尺寸选择 (仅卡片视图) -->
          <el-select
            v-if="viewMode === 'card'"
            v-model="cardSize"
            placeholder="卡片尺寸"
            style="width: 120px; margin-left: 12px"
          >
            <el-option label="紧凑" value="compact" />
            <el-option label="标准" value="standard" />
            <el-option label="详细" value="detailed" />
          </el-select>
        </div>
      </div>

      <!-- 达人列表 - 根据平台动态切换展示组件 -->
      <component
        :is="getGridComponent(currentPlatform)"
        :key="`grid-${currentPlatform}-${currentPage}-${influencers.length}`"
        :view-mode="viewMode"
        :card-size="cardSize"
        :loading="loading"
        :platform="currentPlatform"
        @update-data="updateInfluencerData"
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
import { createCrawlJob, pollCrawlJobStatus, type CrawlJobStatus, type CrawlJobDetailResponse } from '#/api/crawler'

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

const currentPlatform = ref('all')

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

// 导出数据
const handleExport = async () => {
  if (store.selectedCount === 0) {
    ElMessage.warning('请先选中要导出的达人')
    return
  }

  try {
    ElMessage.info(`正在获取 ${store.selectedCount} 位达人的完整数据...`)
    
    // 获取所有选中的 author_id
    const selectedAuthorIds = Array.from(store.selectedInfluencerIds)
    console.log('导出请求 - 选中的author_id:', selectedAuthorIds)
    
    // 调用后端API批量获取完整原始数据
    const response = await fetch('/api/v2/influencers/v3/batch-export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ authorIds: selectedAuthorIds }),
    })
    
    console.log('API响应状态:', response.status, response.statusText)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('API错误响应:', errorText)
      throw new Error(`API请求失败: ${response.statusText}`)
    }
    
    const result = await response.json()
    console.log('API返回结果:', result)
    
    if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
      console.warn('数据为空或格式错误:', result)
      ElMessage.warning('未获取到达人数据')
      return
    }
    
    const fullData = result.data
    console.log('完整数据数组长度:', fullData.length)
    console.log('第一条数据样例:', fullData[0])
    
    // 检查第一条数据是否有效
    if (!fullData[0] || typeof fullData[0] !== 'object') {
      console.error('第一条数据无效:', fullData[0])
      throw new Error('数据格式错误：第一条数据无效')
    }
    
    // 获取所有字段名（从第一条数据）
    const allFields = Object.keys(fullData[0])
    console.log('字段总数:', allFields.length)
    console.log('字段列表:', allFields)
    
    // 创建CSV内容（包含所有字段）
    const headers = allFields
    const rows = fullData.map(item => 
      allFields.map(field => {
        const value = item[field]
        // 处理不同类型的值
        if (value === null || value === undefined) {
          return '-'
        } else if (Array.isArray(value)) {
          return value.join('; ')
        } else if (typeof value === 'object') {
          return JSON.stringify(value)
        } else {
          return String(value)
        }
      })
    )
    
    // 创建 CSV 内容
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')
    
    // 创建 Blob 并下载
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
    link.href = url
    link.download = `达人完整数据_${fullData.length}位_${timestamp}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    ElMessage.success(`已导出 ${fullData.length} 位达人的完整数据（包含 ${allFields.length} 个字段）`)
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败: ' + ((error as Error).message || '未知错误'))
  }
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

// 更新达人数据方法
const updateInfluencerData = async (influencer: any) => {
  if (!influencer.star_id) {
    ElMessage.error('该达人缺少星图id,无法更新数据')
    return
  }

  try {
    // 显示确认弹窗
    await ElMessageBox.confirm(
      `确定要更新达人「${influencer.nick_name}」的数据吗？`,
      '确认更新',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
  } catch (error) {
    // 用户取消操作
    return
  }

  // 设置加载状态
  influencer.updating = true
  influencer.updateProgress = 0
  influencer.updateStatus = '正在启动任务...'

  try {
    console.log(`开始更新达人数据: ${influencer.nick_name} (${influencer.star_id})`)
    
    // 创建爬虫任务
    const response = await createCrawlJob({
      task_type: 'single_star_id',
      target: {
        star_id: influencer.star_id
      },
      options: {
        cookies_file: 'cookies.txt',
        output_dir: 'task_control/results',
        report_dir: 'reports',
        save_pg: true
      }
    })

    console.log('爬虫任务创建响应:', response)

    if (response.success && response.data?.job_id) {
      const jobId = response.data.job_id
      ElMessage.success(`达人"${influencer.nick_name}"数据更新任务已启动`)
      
      // 开始轮询任务状态，每2秒查询一次，最多持续5分钟
      try {
        const result = await pollCrawlJobStatus(
          jobId,
          (status: CrawlJobStatus, detail: CrawlJobDetailResponse['data']) => {
            // 实时更新UI进度反馈
            influencer.updateProgress = detail.progress.percentage
            
            // 根据状态显示不同的提示
            if (status === 'running') {
              influencer.updateStatus = `正在更新: ${detail.progress.percentage.toFixed(0)}%`
              if (detail.progress.current_keyword) {
                influencer.updateStatus += ` (${detail.progress.current_keyword})`
              }
            } else if (status === 'queued') {
              influencer.updateStatus = '任务排队中...'
            }
            
            console.log(`任务进度更新: ${status} - ${detail.progress.percentage}%`, detail)
          },
          2000,  // 每2秒查询一次
          150    // 最多持续5分钟 (150次 * 2秒 = 300秒)
        )
        
        // 任务完成
        if (result.status === 'completed') {
          influencer.updateStatus = '更新成功'
          ElMessage.success({
            message: `达人"${influencer.nick_name}"数据更新完成`,
            duration: 3000
          })
          
          // 刷新列表数据
          setTimeout(() => {
            store.loadInfluencers()
          }, 1000)
        } else if (result.status === 'failed') {
          influencer.updateStatus = '更新失败'
          ElMessage.error(`更新失败: ${result.error_message || '任务执行失败'}`)
        } else if (result.status === 'cancelled') {
          influencer.updateStatus = '已取消'
          ElMessage.warning('任务已取消')
        }
      } catch (pollError) {
        console.error('轮询任务状态失败:', pollError)
        influencer.updateStatus = '轮询超时'
        ElMessage.warning('任务执行时间较长，请稍后刷新查看结果')
        
        // 即使轮询超时，也尝试刷新数据
        setTimeout(() => {
          store.loadInfluencers()
        }, 2000)
      }
    } else {
      ElMessage.error(`更新失败: ${response.message || '未知错误'}`)
    }
  } catch (error) {
    console.error('更新达人数据失败:', error)
    ElMessage.error(`更新失败: ${(error as Error).message || '网络错误'}`)
  } finally {
    // 清除加载状态
    influencer.updating = false
    influencer.updateProgress = 0
    influencer.updateStatus = ''
  }
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
  updateInfluencerData
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
    margin-bottom: 24px;
    padding: 24px;
    background: var(--el-bg-color);
    border-radius: 8px;
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
    margin-bottom: 20px;
    background: var(--el-bg-color);
    border-radius: 8px;
    padding: 16px 20px 0;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

    .platform-tabs {
      :deep(.el-tabs__header) {
        margin-bottom: 0;
        border-bottom: 2px solid var(--el-border-color-light);
      }

      :deep(.el-tabs__nav-wrap) {
        &::after {
          display: none;
        }
      }

      :deep(.el-tabs__item) {
        padding: 0 20px;
        height: 48px;
        line-height: 48px;
        font-size: 14px;
        font-weight: 500;
        color: var(--el-text-color-regular);
        transition: all 0.3s;

        &:hover {
          color: var(--el-color-primary);
        }

        &.is-active {
          color: var(--el-color-primary);
          font-weight: 600;
        }
      }

      :deep(.el-tabs__active-bar) {
        height: 3px;
        background: var(--el-color-primary);
      }

      .platform-tab-label {
        display: flex;
        align-items: center;
        gap: 8px;

        .platform-icon {
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          
          /* 处理图标为URL时的显示 */
          :deep(img) {
            width: 20px;
            height: 20px;
            object-fit: contain;
          }
        }

        .platform-count-badge {
          :deep(.el-badge__content) {
            background-color: var(--el-color-primary);
            border: none;
            font-size: 11px;
            height: 18px;
            line-height: 18px;
            padding: 0 6px;
          }
        }
      }
    }
  }
  
  /* 高级筛选包装器 */
  .advanced-filters-wrapper {
    margin-bottom: 20px;
    background: var(--el-bg-color);
    border-radius: 8px;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
    overflow: hidden;
    
    .advanced-filters-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      cursor: pointer;
      user-select: none;
      transition: background-color 0.3s;
      
      &:hover {
        background: var(--el-fill-color-light);
      }
      
      .header-left {
        display: flex;
        align-items: center;
        gap: 8px;
        
        .title {
          font-size: 14px;
          font-weight: 500;
          color: var(--el-text-color-regular);
        }
        
        .filter-badge {
          margin-left: 4px;
        }
      }
    }
    
    .advanced-filters-content {
      padding: 0 24px 20px;
    }
  }

  /* 达人展示区 */
  .influencer-display-area {
    background: var(--el-bg-color);
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

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

      .toolbar-center {
        flex: 1;
        display: flex;
        justify-content: right;
      }

      .toolbar-right {
        display: flex;
        align-items: center;
        gap: 12px;

        .is-active {
          background: var(--el-color-primary);
          color: white;
        }

        .filter-badge {
          margin-left: 8px;
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
