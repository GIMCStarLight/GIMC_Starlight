<template>
  <div class="influencer-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">省广达人库</h2>
      </div>
      <!-- 公海达人数据的按钮 -->
      <div v-if="activeTab === 'public'">
        <el-badge :value="publicSelectedCount" :hidden="publicSelectedCount === 0" type="primary">
          <el-button @click="handlePublicClearSelection" :disabled="publicSelectedCount === 0">
            <Icon icon="lucide:x-circle" />
            清空选中
          </el-button>
        </el-badge>
        <el-button @click="handlePublicRefresh" :loading="publicRefreshing">
          <Icon icon="lucide:refresh-cw" />
          刷新视图
        </el-button>
        <el-button type="primary" @click="handlePublicExport" :disabled="publicSelectedCount === 0">
          <Icon icon="lucide:download" />
          导出选中 ({{ publicSelectedCount }})
        </el-button>
      </div>
      <!-- 自有达人数据的按钮 -->
      <div v-else-if="activeTab === 'private'">
        <el-button @click="navigateToImportHistory" class="action-btn">
          <Icon icon="lucide:clock" class="mr-1" />
          导入历史
        </el-button>
        <el-button @click="handleImportData" class="action-btn">
          <Icon icon="lucide:download" class="mr-1" />
          导入数据
        </el-button>
        <el-button 
          type="success" 
          :disabled="selectedDouyinCount === 0" 
          @click="handleBatchSync"
          :loading="batchSyncing"
          class="action-btn"
        >
          <Icon icon="lucide:refresh-cw" class="mr-1" />
          批量同步
          <el-badge v-if="selectedDouyinCount > 0" :value="selectedDouyinCount" class="badge-count" />
        </el-button>
        <el-button 
          type="warning" 
          @click="handleRetryFailed"
          :loading="retrying"
          class="action-btn"
        >
          <Icon icon="lucide:rotate-ccw" class="mr-1" />
          重试失败
        </el-button>
      </div>
    </div>

    <!-- Tab切换 -->
    <div class="tabs-wrapper">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange as any" class="data-tabs">
        <el-tab-pane label="公海达人数据" name="public">
          <template #label>
            <div class="tab-label">
              <Icon icon="lucide:users" />
              <span>公海达人数据</span>
            </div>
          </template>
        </el-tab-pane>
        <el-tab-pane label="自有达人数据" name="private">
          <template #label>
            <div class="tab-label">
              <Icon icon="lucide:database" />
              <span>自有达人数据</span>
            </div>
          </template>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 公海达人数据Tab内容 -->
    <div v-if="activeTab === 'public'" class="public-data-content">
      <!-- 达人广场的抖音组件 -->
      <DouyinQuickFilter @filter-change="handlePublicFilterChange" />
      
      <div class="influencer-display-area">
        <!-- 工具栏 -->
        <div class="display-toolbar">
          <div class="toolbar-left">
            <span class="result-count">
              找到 <strong>{{ publicTotalCount }}</strong> 位达人
            </span>
          </div>
          
          <div class="toolbar-right">
            <!-- 排序选择 -->
            <div class="toolbar-group">
              <span class="group-label">排序</span>
              <el-select v-model="publicSortBy" size="default" style="width: 140px" @change="handlePublicSortChange">
                <el-option label="综合推荐" value="recommended" />
                <el-option label="粉丝数↓" value="follower_desc" />
                <el-option label="星图指数↓" value="star_index_desc" />
                <el-option label="互动率↓" value="interact_rate_desc" />
                <el-option label="价格↑" value="price_asc" />
                <el-option label="价格↓" value="price_desc" />
              </el-select>
            </div>

            <!-- 视图切换 -->
            <div class="toolbar-group">
              <span class="group-label">视图</span>
              <el-select v-model="publicViewMode" size="default" style="width: 100px">
                <el-option label="卡片" value="card" />
                <el-option label="列表" value="table" />
              </el-select>
            </div>

            <!-- 卡片尺寸 -->
            <div v-if="publicViewMode === 'card'" class="toolbar-group">
              <span class="group-label">尺寸</span>
              <el-select v-model="publicCardSize" size="default" style="width: 100px">
                <el-option label="紧凑" value="compact" />
                <el-option label="标准" value="standard" />
                <el-option label="详细" value="detailed" />
              </el-select>
            </div>
          </div>
        </div>

        <!-- 抖音Grid组件 -->
        <DouyinGrid
          :view-mode="publicViewMode"
          :card-size="publicCardSize"
          :loading="publicLoading"
          :use-store-selection="false"
          platform="douyin"
          @update-data="updatePublicInfluencerData"
          @evaluate="handleEvaluate"
          @selection-change="handleKolPublicSelectionChange"
        />

        <!-- 分页 -->
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="publicCurrentPage"
            v-model:page-size="publicPageSize"
            :page-sizes="[20, 40, 60, 100]"
            :total="publicTotalCount"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handlePublicSizeChange"
            @current-change="handlePublicPageChange"
          />
        </div>
      </div>
    </div>

    <!-- 自有达人数据Tab内容 -->
    <div v-else-if="activeTab === 'private'" class="private-data-content">
      <!-- 智能筛选组件 -->
      <KolQuickFilters :filters="searchForm" @filter-change="handleFilterChange" />

      <!-- 同步统计信息卡片 - 已注释 -->
      <!-- <SyncStatsCards :stats="syncStats" /> -->

      <!-- 筛选条件卡片 -->
      <!-- 已移至高级筛选弹窗中，此处删除旧代码 -->
      
      <!-- 自有达人数据显示区域 -->
      <div class="private-display-area">
        <!-- 工具栏 -->
        <div class="display-toolbar">
          <div class="toolbar-left">
            <span class="result-count">
              找到 <strong>{{ pagination.total }}</strong> 位达人
              <ToolTipPicker>
                <template #content>
                  <div class="stats-tooltip-content">
                    <div class="stats-tooltip-item">总计 <span class="stats-tooltip-number">{{ syncStats.total }}</span> 位达人</div>
                    <div class="stats-tooltip-item">未匹配 <span class="stats-tooltip-number">{{ syncStats.unmatched }}</span> 位达人&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;待同步 <span class="stats-tooltip-number">{{ syncStats.pending }}</span> 位达人</div>
                    <!-- <div class="stats-tooltip-item">待同步 <span class="stats-tooltip-number">{{ syncStats.pending }}</span> 位达人</div> -->
                    <div class="stats-tooltip-item">已匹配 <span class="stats-tooltip-number">{{ syncStats.matched }}</span> 位达人&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;同步失败 <span class="stats-tooltip-number">{{ syncStats.rejected }}</span> 位达人</div>
                    <!-- <div class="stats-tooltip-item">同步失败 <span class="stats-tooltip-number">{{ syncStats.rejected }}</span> 位达人</div> -->
                  </div>
                </template>
                <template #trigger>
                  <el-icon class="stats-info-icon"><InfoFilled /></el-icon>
                </template>
              </ToolTipPicker>
            </span>
          </div>
        </div>

        <!-- 数据表格 -->
      <StandardTable
        ref="tableRef"
        :loading="loading"
        :data-source="tableData"
        :columns="tableColumns"
        :pagination="{
          current: pagination.page,
          pageSize: pagination.limit,
          total: pagination.total
        }"
        :selected-rows="selectedRows"
        @update:selected-rows="handleSelectionChange"
        @change="handleTableChange"
        row-key="id"
      >
        <!-- 平台列插槽 -->
        <template #platform="{ record }">
          {{ getPlatformLabel(record.platform) }}
        </template>

        <!-- 账号名称列插槽 -->
        <template #account_name="{ record }">
          <div class="account-cell">
            <span class="account-name">{{ record.account_name }}</span>
            <el-tag v-if="record.is_exclusive === 1" type="success" size="small" class="ml-2">独家</el-tag>
          </div>
        </template>

        <!-- 机构名列插槽 -->
        <template #org_name="{ record }">
          <span v-if="record.org_name" class="org-name">{{ record.org_name }}</span>
          <span v-else class="text-gray">-</span>
        </template>

        <!-- 粉丝列插槽 -->
        <template #followers_w="{ record }">
          <span>{{ record.followers_w }}</span>
        </template>

        <!-- 报价范围列插槽 -->
        <template #price_range="{ record }">
          <div class="price-range">
            <div v-if="record.star_quote_21_60s || record.star_quote_60s_plus" class="price-info">
              <span class="price-currency">¥</span>
              <span class="price-min">{{ formatPrice(Math.min(record.star_quote_21_60s || Infinity, record.star_quote_60s_plus || Infinity)) }}</span>
              <span v-if="(record.star_quote_21_60s || 0) !== (record.star_quote_60s_plus || 0)" class="price-separator">~</span>
              <span v-if="(record.star_quote_21_60s || 0) !== (record.star_quote_60s_plus || 0)" class="price-currency">¥</span>
              <span v-if="(record.star_quote_21_60s || 0) !== (record.star_quote_60s_plus || 0)" class="price-max">{{ formatPrice(Math.max(record.star_quote_21_60s || 0, record.star_quote_60s_plus || 0)) }}</span>
            </div>
            <span v-else class="text-gray">-</span>
          </div>
        </template>

        <!-- 配合度列插槽 -->
        <template #cooperation_degree="{ record }">
          <span v-if="record.cooperation_degree">{{ getCooperationDegreeText(record.cooperation_degree) }}</span>
          <span v-else class="text-gray">-</span>
        </template>

        <!-- 返点列插槽 -->
        <template #rebate_policy="{ record }">
          <span v-if="record.rebate_policy" class="rebate-text">{{ record.rebate_policy }}</span>
          <span v-else class="text-gray">-</span>
        </template>

        <!-- 政策列插槽 -->
        <template #policy_level="{ record }">
          <span v-if="record.policy_level">{{ record.policy_level }}</span>
          <span v-else class="text-gray">-</span>
        </template>

        <!-- 同步状态列插槽 -->
        <template #match_status="{ record }">
          <el-tooltip
            v-if="record.match_status === 'rejected'"
            content="未匹配到达人公开数据，请检查账号ID等是否正确"
            placement="top"
            effect="dark"
          >
            <span>{{ getSyncStatusText(record.match_status || 'unmatched') }}</span>
          </el-tooltip>
          <span v-else>{{ getSyncStatusText(record.match_status || 'unmatched') }}</span>
        </template>

        <!-- 匹配达人列插槽 -->
        <template #matched_author_id="{ record }">
          <el-link v-if="record.matched_author_id" type="primary" :underline="false" @click="handleViewAuthor(record.matched_author_id)">
            {{ record.matched_author_id }}
          </el-link>
          <span v-else class="text-gray">-</span>
        </template>

        <!-- 操作列插槽 -->
        <template #actions="{ record }">
          <div class="action-buttons">
            <!-- 详情图标 -->
            <ToolTipPicker>
              <template #content>
                <div class="simple-tooltip-text">详情</div>
              </template>
              <template #trigger>
                <div class="action-icon-wrapper" @click="handleView(record)">
                  <Icon icon="lucide:eye" class="action-icon" />
                </div>
              </template>
            </ToolTipPicker>

            <!-- 同步图标 -->
            <ToolTipPicker v-if="canSync(record)">
              <template #content>
                <div class="simple-tooltip-text">同步</div>
              </template>
              <template #trigger>
                <div class="action-icon-wrapper" @click="handleSingleSync(record)">
                  <Icon icon="lucide:refresh-cw" class="action-icon" />
                </div>
              </template>
            </ToolTipPicker>

            <!-- 评价图标 -->
            <ToolTipPicker>
              <template #content>
                <div class="simple-tooltip-text">评价</div>
              </template>
              <template #trigger>
                <div class="action-icon-wrapper" @click="handleEvaluate(record)">
                  <Icon icon="lucide:message-circle" class="action-icon" />
                </div>
              </template>
            </ToolTipPicker>

            <!-- 更多操作下拉菜单 -->
            <el-dropdown trigger="click">
              <div class="action-icon-wrapper">
                <Icon icon="lucide:more-horizontal" class="action-icon" />
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="handleEdit(record)">
                    <Icon icon="lucide:edit" class="mr-1" />
                    编辑
                  </el-dropdown-item>
                  <el-dropdown-item @click="handleDelete(record)" divided>
                    <Icon icon="lucide:trash-2" class="mr-1" />
                    删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </template>
      </StandardTable>
      </div>
    </div>
  
  <!-- 导入映射配置弹窗 -->
  <el-dialog v-model="mappingDialogVisible" title="配置导入映射" width="640px">
    <div class="mapping-grid">
      <div class="mapping-row" v-for="letter in excelLetters" :key="letter">
        <div class="mapping-col-letter">列 {{ letter }}</div>
        <el-select v-model="excelMappingRef[letter]" filterable style="width: 360px" placeholder="选择字段">
          <el-option v-for="opt in mappingFieldOptions" :key="opt" :label="opt" :value="opt" />
        </el-select>
      </div>
    </div>
    <template #footer>
      <el-button @click="resetMapping">恢复默认</el-button>
      <el-button type="primary" @click="saveMapping">应用</el-button>
    </template>
  </el-dialog>
  
  <!-- 导入加载弹窗 -->
  <el-dialog v-model="importLoading" title="正在导入" width="360px" :close-on-click-modal="false" :show-close="false">
    <div class="loading-content">
      <el-icon class="is-loading" :size="24"><LoadingIcon /></el-icon>
      <span>正在解析 Excel，请稍候…</span>
    </div>
  </el-dialog>
      
  <!-- 上传加载弹窗 -->
  <el-dialog v-model="uploadLoading" title="正在上传" width="360px" :close-on-click-modal="false" :show-close="false">
    <div class="loading-content">
      <el-icon class="is-loading" :size="24"><LoadingIcon /></el-icon>
      <span>正在上传到数据库，请稍候…</span>
    </div>
  </el-dialog>

    <!-- 编辑弹窗（新版，与 kol_list 字段对齐） -->
    <KolEditDialog
      v-model="editDialogVisible"
      :kol-data="editKolData"
      @kol-updated="handleKolUpdated"
    />

    <EvaluateDialog 
      v-model:visible="evaluateDialogVisible" 
      :author-id="currentEvaluateAuthorId"
      :reviewer="'系统用户'"
      @review-submitted="handleReviewSubmitted"
    />
    
    <!-- 数据导入对话框 -->
    <ImportDataDialog
      v-model="importDialogVisible"
      @import-completed="handleImportCompleted"
    />
    
    <!-- KOL详情对话框 -->
    <KolDetailDialog
      v-if="detailDialogVisible && currentDetailKol"
      v-model="detailDialogVisible"
      :kol-data="currentDetailKol"
      @edit="handleDetailEdit"
      @sync-updated="handleSyncUpdated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'
import { IconifyIcon as Icon } from '@vben/icons'
import { requestClient } from '../../api/request'
import { Excel, mapExcelKolList } from '../../utils/excel'
import ExcelJS from 'exceljs'
import { useRouter } from 'vue-router'
import EvaluateDialog from '../../components/EvaluateDialog/index.vue'
import { id } from 'element-plus/es/locales.mjs'
import { batchCreateKolListApi } from '../../api/kol-list'
import { KolSyncApi } from '../../api/kol-sync.api'
import ImportDataDialog from './components/ImportDataDialog.vue'
import SyncStatusTag from './components/SyncStatusTag.vue'
import KolDetailDialog from './components/KolDetailDialog.vue'
import KolEditDialog from './components/KolEditDialog.vue'
import KolQuickFilters from './components/KolQuickFilters.vue'
import ToolTipPicker from '../../views/influencer-authors/components/ToolTipPicker.vue'
import { log } from '../../utils/logger'
import KolActionBar from './components/KolActionBar.vue'
import SyncStatsCards from './components/SyncStatsCards.vue'
import DouyinGrid from '../influencer-authors/components/platform-grids/DouyinGrid.vue'
import DouyinQuickFilter from '../influencer-authors/components/platform-filters/DouyinQuickFilter.vue'
import { useInfluencerSquareStore } from '../../store/modules/influencer-square'
import { storeToRefs } from 'pinia'
import { InfluencerNormalizer } from '../../utils/influencer-normalizer'
import StandardTable from '../../components/standTable/index.vue'

const router = useRouter()

// 达人广场Store（用于公海达人数据）
const influencerStore = useInfluencerSquareStore()
const { 
  influencers: publicInfluencers, 
  totalCount: storeTotalCount,
  loading: storeLoading
} = storeToRefs(influencerStore)

// 省广达人库公海数据的独立选中状态（与达人广场隔离）
const kolPublicSelectedIds = ref<Set<string>>(new Set())
const kolPublicSelectedCount = computed(() => kolPublicSelectedIds.value.size)

// Tab切换状态
const activeTab = ref('public') // 'public' 或 'private'

// 公海达人数据相关状态
const publicLoading = ref(false)
const publicTotalCount = ref(0)
const publicCurrentPage = ref(1)
const publicPageSize = ref(20)
const publicSortBy = ref('recommended')
const publicViewMode = ref<'card' | 'table'>('card')
const publicCardSize = ref<'compact' | 'standard' | 'detailed'>('standard')
const publicFilterParams = ref<any>({})

// 使用省广达人库独立的选中数量
const publicSelectedCount = computed(() => kolPublicSelectedCount.value)
const publicRefreshing = ref(false)

// 公海达人数据 - 清空选中
const handlePublicClearSelection = () => {
  kolPublicSelectedIds.value.clear()
  // 清空当前页面达人的isSelected状态
  if (publicInfluencers.value) {
    publicInfluencers.value.forEach(item => {
      item.isSelected = false
    })
  }
  ElMessage.success('已清空选中')
}

// 公海达人数据 - 刷新视图
const handlePublicRefresh = async () => {
  publicRefreshing.value = true
  try {
    // 这里可以调用API刷新数据
    await new Promise(resolve => setTimeout(resolve, 500))
    ElMessage.success('刷新成功')
  } finally {
    publicRefreshing.value = false
  }
}

// 公海达人数据 - 导出选中
const handlePublicExport = async () => {
  if (kolPublicSelectedCount.value === 0) {
    ElMessage.warning('请先选中要导出的达人')
    return
  }

  try {
    ElMessage.info(`正在获取 ${kolPublicSelectedCount.value} 位达人的完整数据...`)

    // 获取所有选中的 author_id（使用省广达人库独立的选中状态）
    const selectedAuthorIds = Array.from(kolPublicSelectedIds.value)
    log.debug('导出请求 - 选中的author_id:', selectedAuthorIds)

    // 调用后端API批量获取完整原始数据
    const response = await fetch('/api/influencer-authors/batch-export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ authorIds: selectedAuthorIds }),
    })

    log.debug('API响应状态:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      log.error('API错误响应:', errorText)
      throw new Error(`API请求失败: ${response.statusText}`)
    }

    const result = await response.json()
    log.debug('API返回结果:', result)

    if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
      log.warn('数据为空或格式错误:', result)
      ElMessage.warning('未获取到达人数据')
      return
    }

    const fullData = result.data
    log.debug('完整数据数组长度:', fullData.length)
    log.debug('第一条数据样例:', fullData[0])

    // 检查第一条数据是否有效
    if (!fullData[0] || typeof fullData[0] !== 'object') {
      log.error('第一条数据无效:', fullData[0])
      throw new Error('数据格式错误：第一条数据无效')
    }

    // 获取所有字段名（从第一条数据）
    const allFields = Object.keys(fullData[0])
    log.debug('字段总数:', allFields.length)
    log.debug('字段列表:', allFields)

    // 创建CSV内容（包含所有字段）
    const headers = allFields
    const rows = fullData.map((item: any) =>
      allFields.map((field: string) => {
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
      ...rows.map((row: any[]) => row.map((cell: any) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
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
    log.error('导出失败:', error)
    ElMessage.error('导出失败: ' + ((error as Error).message || '未知错误'))
  }
}

// Tab切换处理
const handleTabChange = async (tabName: string) => {
  log.debug('🔄 切换Tab:', tabName)

  if (tabName === 'private') {
    // 切换到自有达人数据，加载原有数据
    log.debug('🔄 切换到自有达人数据 tab')
    await loadData()
    await loadSyncStats()
  } else if (tabName === 'public') {
    // 切换到公海达人数据，加载达人广场数据
    log.debug('🔄 切换到公海达人数据 tab')
    await loadPublicData()
  }
}


// 加载公海达人数据
const loadPublicData = async () => {
  try {
    log.debug('开始加载省广达人库公海数据...')
    publicLoading.value = true

    // 设置筛选条件：抖音平台 + 已建联
    influencerStore.setFilters({ 
      platform: 'douyin',
      matchedOnly: true  // 只显示已建联的达人
    })
    influencerStore.setCurrentPage(1)
    influencerStore.setPageSize(20)
    influencerStore.setSortBy('recommended')

    // 加载达人广场的已建联数据
    await influencerStore.loadInfluencers()

    // 更新本地总数
    publicTotalCount.value = storeTotalCount.value
    
    // ⚠️ 关键：覆盖store设置的isSelected，使用省广达人库独立的选中状态
    if (publicInfluencers.value) {
      publicInfluencers.value.forEach(item => {
        item.isSelected = kolPublicSelectedIds.value.has(item.author_id)
      })
    }

    log.debug('省广达人库数据加载完成，总数:', publicTotalCount.value, '（仅已建联）')
  } catch (error) {
    log.error('加载省广达人库数据失败:', error)
    ElMessage.error('加载省广达人库数据失败')
  } finally {
    publicLoading.value = false
  }
}

// 公海达人数据 - 筛选变化
const handlePublicFilterChange = async (filters: any) => {
  publicFilterParams.value = filters
  publicCurrentPage.value = 1
  log.debug('公海达人数据筛选变化:', filters)

  // 使用 store 的筛选方法，保持matchedOnly
  influencerStore.setFilters({
    ...filters,
    platform: 'douyin',
    matchedOnly: true  // 始终只显示已建联的达人
  })
  influencerStore.setCurrentPage(1)

  await influencerStore.loadInfluencers()
  publicTotalCount.value = storeTotalCount.value
  
  // ⚠️ 关键：覆盖store设置的isSelected
  if (publicInfluencers.value) {
    publicInfluencers.value.forEach(item => {
      item.isSelected = kolPublicSelectedIds.value.has(item.author_id)
    })
  }
}

// 公海达人数据 - 排序变化
const handlePublicSortChange = async () => {
  log.debug('公海达人数据排序变化:', publicSortBy.value)
  publicCurrentPage.value = 1

  // 使用 store 的排序方法
  influencerStore.setSortBy(publicSortBy.value as any)
  influencerStore.setCurrentPage(1)

  await influencerStore.loadInfluencers()
  publicTotalCount.value = storeTotalCount.value
  
  // ⚠️ 关键：覆盖store设置的isSelected
  if (publicInfluencers.value) {
    publicInfluencers.value.forEach(item => {
      item.isSelected = kolPublicSelectedIds.value.has(item.author_id)
    })
  }
}

// 公海达人数据 - 分页处理
const handlePublicSizeChange = async (size: number) => {
  publicPageSize.value = size
  publicCurrentPage.value = 1

  // 使用 store 的分页方法
  influencerStore.setPageSize(size)
  influencerStore.setCurrentPage(1)

  await influencerStore.loadInfluencers()
  publicTotalCount.value = storeTotalCount.value
  
  // ⚠️ 关键：覆盖store设置的isSelected
  if (publicInfluencers.value) {
    publicInfluencers.value.forEach(item => {
      item.isSelected = kolPublicSelectedIds.value.has(item.author_id)
    })
  }
}

const handlePublicPageChange = async (page: number) => {
  publicCurrentPage.value = page

  // 使用 store 的分页方法
  influencerStore.setCurrentPage(page)

  await influencerStore.loadInfluencers()
  publicTotalCount.value = storeTotalCount.value
  
  // ⚠️ 关键：覆盖store设置的isSelected
  if (publicInfluencers.value) {
    publicInfluencers.value.forEach(item => {
      item.isSelected = kolPublicSelectedIds.value.has(item.author_id)
    })
  }
}

// 公海达人数据 - 更新达人
const updatePublicInfluencerData = (data: any) => {
  log.debug('更新公海达人数据:', data)
}

// 公海达人数据 - 处理选中状态变化（与达人广场独立）
const handleKolPublicSelectionChange = (data: any, selected: boolean) => {
  log.debug('省广达人库公海数据选中状态变化:', data.author_id, selected)
  
  // 只更新省广达人库的选中状态，不影响达人广场store
  if (selected) {
    kolPublicSelectedIds.value.add(data.author_id)
  } else {
    kolPublicSelectedIds.value.delete(data.author_id)
  }
  
  // 同步更新当前达人的isSelected状态
  const influencer = publicInfluencers.value?.find(item => item.author_id === data.author_id)
  if (influencer) {
    influencer.isSelected = selected
  }
}

// 导航到导入历史页面
const navigateToImportHistory = () => {
  router.push('/import-history')
}

// 响应式数据
const loading = ref(false)
const submitting = ref(false)
const editDialogVisible = ref(false)
const selectedRows = ref<any[]>([])
const tableData = ref<any[]>([])
const tableRef = ref() // 表格引用
const statistics = ref<any>({})
const genderStats = computed(() => statistics.value?.genderStats || [])
const evaluateDialogVisible = ref(false)
const currentEvaluateAuthorId = ref('')

// 同步相关状态
const batchSyncing = ref(false)
const retrying = ref(false)
const detailDialogVisible = ref(false)
const currentDetailKol = ref<any>(null)

// 导入对话框状态
const importDialogVisible = ref(false)

// 同步统计信息
const syncStats = ref({
  total: 0,
  unmatched: 0,
  pending: 0,
  matched: 0,
  rejected: 0
})

// 搜索表单
const searchForm = reactive({
  platform: '',
  account_name: '',
  account_id: '',
  org_name: '',
  category: '',
  min_followers_w: undefined,
  max_followers_w: undefined,
  is_exclusive: undefined,
  rebate_policy: undefined,
  policy_level: '',
  match_status: '', // 新增同步状态筛选
  sort_by: 'id',
  sort_order: 'DESC',
})

// 分页
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
})

// 新版编辑弹窗数据
const editKolData = ref<any | null>(null)

// 计算当前筛选状态对应的达人数量和标签
const currentStatusCount = computed(() => {
  const status = searchForm.match_status
  if (!status || status === '') {
    return syncStats.value.total
  }
  switch (status) {
    case 'unmatched':
      return syncStats.value.unmatched
    case 'pending':
      return syncStats.value.pending
    case 'matched':
      return syncStats.value.matched
    case 'rejected':
      return syncStats.value.rejected
    default:
      return syncStats.value.total
  }
})

// 旧表单相关逻辑已替换为 KolEditDialog

// 方法
const loadData = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...searchForm,
    }
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === undefined) {
        delete params[key]
      }
    })
    const response = await requestClient.get('kol-lists', { params, responseReturn: 'raw' })
    const body = (response && (response as any).data !== undefined) ? (response as any).data : response
    let items: any[] = []
    let page = 1
    let limit = 20
    let total = 0
    if (Array.isArray(body)) {
      // 兼容返回已提取为数组的情况
      items = body
      // 保持现有分页或使用默认值
      page = pagination.page
      limit = pagination.limit
      total = pagination.total
    } else {
      const p = body?.pagination || {}
      items = body?.data || body?.items || []
      page = (p?.page ?? body?.page ?? 1) as number
      limit = (p?.pageSize ?? body?.limit ?? 20) as number
      total = (p?.total ?? body?.total ?? 0) as number
    }
    
    tableData.value = items
    pagination.page = page
    pagination.limit = limit
    pagination.total = total
  } catch (error: any) {
    log.error('API请求失败:', error)
    const status = error?.response?.status
    if (status === 404 || status === 204) {
      // 空数据场景：不提示错误，展示空表格
      tableData.value = []
      pagination.total = 0
    } else {
      ElMessage.error('加载数据失败: ' + (error?.message || '未知错误'))
    }
  } finally {
    loading.value = false
  }
}

const loadStatistics = async () => {
  try {
    const response = await requestClient.get('influencer-current/stats')
    statistics.value = response.data || response
  } catch (error) {
    log.error('加载统计数据失败:', error)
  }
}

const handleSearch = () => {
  pagination.page = 1
  loadData()
}

const handleReset = () => {
  // 重置所有筛选条件，保留默认排序
  Object.assign(searchForm, {
    platform: '',
    account_name: '',
    account_id: '',
    org_name: '',
    category: '',
    min_followers_w: undefined,
    max_followers_w: undefined,
    is_exclusive: undefined,
    rebate_policy: undefined,
    policy_level: '',
    match_status: '',
    sort_by: 'id',
    sort_order: 'DESC'
  })
  pagination.page = 1
  loadData()
}

// 处理筛选变化
const handleFilterChange = (filters: any) => {
  Object.assign(searchForm, filters)
  pagination.page = 1
  loadData()
}

const handleAdd = () => {
  editKolData.value = null
  editDialogVisible.value = true
}

const handleEdit = (row) => {
  editKolData.value = row
  editDialogVisible.value = true
}

const handleView = (row: any) => {
  log.debug('[handleView] 传入数据:', row)
  currentDetailKol.value = row
  log.debug('[handleView] currentDetailKol.value:', currentDetailKol.value)
  detailDialogVisible.value = true
  log.debug('[handleView] detailDialogVisible.value:', detailDialogVisible.value)
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除账号\"${row.account_name}\"吗？`,
      '确认删除',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    await requestClient.delete(`kol-lists/${row.id}`)
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}

const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRows.value.length} 条记录吗？`,
      '确认批量删除',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' }
    )
    const ids = selectedRows.value.map(row => row.id)
    await requestClient.delete('kol-lists', { data: { ids } })
    ElMessage.success('批量删除成功')
    selectedRows.value = []
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量删除失败: ' + error.message)
    }
  }
}

const handleExport = async () => {
  try {
    const params = { ...searchForm, page: 1, limit: 1000 }
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === undefined) delete params[key]
    })
    const response = await requestClient.get('/kol-lists', { params, responseReturn: 'raw' })
    const body = (response && (response as any).data !== undefined) ? (response as any).data : response
    const rows = Array.isArray(body) ? body : (body?.data || body?.items || [])
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('KOL列表')
    sheet.columns = [
      { header: '平台', key: 'platform', width: 12 },
      { header: '账号名称', key: 'account_name', width: 20 },
      { header: '账号ID', key: 'account_id', width: 20 },
      { header: '主页链接', key: 'home_link', width: 30 },
      { header: '粉丝(万)', key: 'followers_w', width: 12 },
      { header: '机构名', key: 'org_name', width: 18 },
      { header: '类型', key: 'category', width: 12 },
      { header: '21-60s报价', key: 'star_quote_21_60s', width: 14 },
      { header: '60s+报价', key: 'star_quote_60s_plus', width: 14 },
      { header: '独家', key: 'is_exclusive', width: 10 },
      { header: '返点政策', key: 'rebate_policy', width: 20 },
      { header: '返点区间', key: 'rebate_range', width: 14 },
      { header: '政策等级', key: 'policy_level', width: 12 },
      { header: '返点账期', key: 'rebate_period', width: 14 },
      { header: '支付账期', key: 'pay_period', width: 14 },
      { header: '备注', key: 'remark', width: 24 },
      { header: '创建时间', key: 'created_at', width: 20 },
    ]
    rows.forEach((row: any) => {
      sheet.addRow({
        ...row,
        is_exclusive: row.is_exclusive === 1 ? '是' : '否',
        // rebate_policy 已经是文本内容，直接使用
      })
    })
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kol-list-${Date.now()}.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (error) {
    log.error(error)
    ElMessage.error('导出失败: ' + error.message)
  }
}

// 新版编辑弹窗更新回调
const handleKolUpdated = () => {
  editDialogVisible.value = false
  loadData()
}

const uploadExcelRef = ref()
const excelMappingRef = ref({ ...mapExcelKolList })
const mappingDialogVisible = ref(false)
const excelLetters = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q']
const mappingFieldOptions = Object.values(mapExcelKolList)
const importLoading = ref(false)
const uploadLoading = ref(false)

// 数值字段转换辅助
const toInt = (v: any) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.trunc(n) : undefined
}
const toFloat = (v: any) => {
  const n = Number(v)
  return Number.isFinite(n) ? Number(n.toFixed(2)) : undefined
}

// 导入数据处理
const handleImportData = () => {
  importDialogVisible.value = true
}

const handleImportCompleted = () => {
  importDialogVisible.value = false
  loadData()
}
// 格式化报价显示
const formatPrice = (v: any) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return '-'
  if (n === 0) return '0'
  return n.toLocaleString('zh-CN')
}

// 配合度级别映射
const getCooperationDegreeType = (degree: string): 'success' | 'warning' | 'info' | 'danger' | '' => {
  const degreeMap: Record<string, 'success' | 'warning' | 'info' | 'danger' | ''> = {
    'high': 'success',
    'medium': 'warning',
    'low': 'info',
    'very_high': 'danger'
  }
  return degreeMap[degree] || ''
}

const getCooperationDegreeText = (degree: string): string => {
  const textMap: Record<string, string> = {
    'very_high': '非常高',
    'high': '高',
    'medium': '中',
    'low': '低'
  }
  return textMap[degree] || degree
}

// 获取同步状态文本
const getSyncStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    'unmatched': '未匹配',
    'pending': '待同步',
    'in_progress': '同步中',
    'matched': '已匹配',
    'rejected': '同步失败'
  }
  return statusMap[status] || '未匹配'
}

// 平台名称映射
const getPlatformLabel = (platform: string): string => {
  const platformMap: Record<string, string> = {
    'douyin': '抖音',
    'xiaohongshu': '小红书',
    'weibo': '微博',
    'bilibili': 'B站',
    'kuaishou': '快手',
    'wechat': '微信',
    '微信公众号': '微信公众号',
    '微信视频号': '微信视频号',
    'B站': 'B站',
    '小红书': '小红书',
    '快手': '快手',
    '微博': '微博',
    '今日头条': '今日头条'
  }
  return platformMap[platform] || platform
}

// 格式化日期显示
const formatDate = (v: any) => {
  if (!v) return '-'
  try {
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return '-'
    const Y = d.getFullYear()
    const M = String(d.getMonth() + 1).padStart(2, '0')
    const D = String(d.getDate()).padStart(2, '0')
    const h = String(d.getHours()).padStart(2, '0')
    const m = String(d.getMinutes()).padStart(2, '0')
    const s = String(d.getSeconds()).padStart(2, '0')
    return `${Y}-${M}-${D} ${h}:${m}:${s}`
  } catch {
    return '-'
  }
}
// 表格选择变更 - StandardTable组件已经处理了跨页选中
const handleSelectionChange = (rows: any[]) => {
  selectedRows.value = rows
  log.debug('[选中变化] 当前选中:', rows.length, '个记录')
}

const openMappingDialog = () => {
  mappingDialogVisible.value = true
}
const resetMapping = () => {
  excelMappingRef.value = { ...mapExcelKolList }
}
const saveMapping = () => {
  mappingDialogVisible.value = false
  ElMessage.success('映射已应用')
}


const handleEvaluation = (row: any) => {
  evaluateDialogVisible.value = true
}

// 重置form函数（已废弃，由KolEditDialog管理）
// const resetForm = () => {
//   ...
// }

// 加载同步统计信息
const loadSyncStats = async () => {
  try {
    const stats = await KolSyncApi.getSyncStats()
    syncStats.value = stats
  } catch (error) {
    log.error('加载同步统计失败:', error)
  }
}

// ==========  同步功能 =========
// 计算选中的数量（用于批量同步按钮显示）
const selectedDouyinCount = computed(() => {
  return selectedRows.value.length
})

// 判断是否可以同步
const canSync = (row: any): boolean => {
  const platform = String(row.platform || '').trim();
  const platformLower = platform.toLowerCase();
  const isDouyin = platform === '抖音' || platformLower === 'douyin';
  const hasAccountId = !!row.account_id && String(row.account_id).trim().length > 0;
  
  log.debug(`[前端.canSync] 🤔 检查是否可以同步:`, {
    id: row.id,
    platform,
    platformLower,
    isDouyin,
    account_id: row.account_id,
    hasAccountId,
    canSync: isDouyin && hasAccountId
  });
  
  return isDouyin && hasAccountId;
}

// 单个同步
const handleSingleSync = async (row: any) => {
  const startTime = Date.now();
  log.debug(`====== [前端.index] 开始同步流程 ======`);
  log.debug(`[前端.index] 📋 KOL信息:`, {
    id: row.id,
    account_id: row.account_id,
    account_name: row.account_name,
    platform: row.platform,
    match_status: row.match_status
  });
  
  try {
    loading.value = true;
    log.debug(`[前端.index] 🔄 设置加载状态: true`);
    log.debug(`[前端.index] 🚀 调用KolSyncApi.syncSingleKol(${row.id}, ${row.account_id})`);
    
    const result = await KolSyncApi.syncSingleKol(row.id, row.account_id);
    
    const duration = Date.now() - startTime;
    log.debug(`[前端.index] 📊 同步结果:`, result);
    log.debug(`[前端.index] ⏱️ 总耗时: ${duration}ms`);
    
    if (result.status === 'success') {
      log.debug(`[前端.index] ✅ 同步成功`);
      ElMessage.success(`同步成功：${row.account_name}`);
      log.debug(`[前端.index] 🔄 刷新列表数据和统计信息...`);
      loadData(); // 刷新列表
      loadSyncStats(); // 刷新统计
    } else if (result.status === 'failed') {
      log.warn(`[前端.index] ⚠️ 同步失败: ${result.errorMessage}`);
      ElMessage.warning(`同步失败：${result.errorMessage || '未知错误'}`);
    } else {
      log.debug(`[前端.index] 📝 同步状态: ${result.status}`);
      ElMessage.info('同步任务已提交，请稍后查看结果');
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    log.error(`[前端.index] 💥 同步异常 - 耗时: ${duration}ms`);
    log.error(`[前端.index] 💥 错误类型: ${error.constructor?.name || typeof error}`);
    log.error(`[前端.index] 💥 错误信息: ${error.message}`);
    log.error(`[前端.index] 💥 完整错误:`, error);
    
    if (error.response) {
      log.error(`[前端.index] 📥 响应数据:`, error.response.data);
    }
    
    ElMessage.error(`同步失败: ${error.message || '请稍后重试'}`);
  } finally {
    loading.value = false;
    const totalDuration = Date.now() - startTime;
    log.debug(`[前端.index] 🔄 恢复加载状态: false`);
    log.debug(`====== [前端.index] 同步流程结束 - 总耗时: ${totalDuration}ms ======`);
  }
}

// 批量同步
const handleBatchSync = async () => {
  if (selectedDouyinCount.value === 0) {
    ElMessage.warning('请选择需要同步的账号')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确认同步 ${selectedDouyinCount.value} 个账号吗？`,
      '批量同步',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info',
      }
    )

    batchSyncing.value = true
    const kolIds = selectedRows.value.map(row => Number(row.id))
    log.debug('[批量同步] 选中的KOL IDs:', kolIds)
    
    const result = await KolSyncApi.syncBatchKols(kolIds)

    ElMessage.success(
      `批量同步完成：成功 ${result.successCount} 个，失败 ${result.failedCount} 个`
    )
    loadData() // 刷新列表
    loadSyncStats() // 刷新统计
  } catch (error: any) {
    if (error !== 'cancel') {
      log.error('批量同步失败:', error)
      ElMessage.error(`批量同步失败: ${error.message || '请稍后重试'}`)
    }
  } finally {
    batchSyncing.value = false
  }
}

// 重试失败项
const handleRetryFailed = async () => {
  try {
    await ElMessageBox.confirm(
      '确认重试所有同步失败的记录吗？',
      '重试失败项',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )

    retrying.value = true
    const result = await KolSyncApi.retryFailedSyncs()

    if (result.totalCount === 0) {
      ElMessage.info('没有需要重试的失败项')
    } else {
      ElMessage.success(
        `重试完成：成功 ${result.successCount} 个，失败 ${result.failedCount} 个`
      )
      loadData() // 刷新列表
      loadSyncStats() // 刷新统计
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      log.error('重试失败:', error)
      ElMessage.error(`重试失败: ${error.message || '请稍后重试'}`)
    }
  } finally {
    retrying.value = false
  }
}

// 同步更新后刷新
const handleSyncUpdated = () => {
  detailDialogVisible.value = false
  loadData()
  loadSyncStats() // 刷新统计
}

const handleDetailEdit = (row: any) => {
  detailDialogVisible.value = false
  handleEdit(row)
}

// 查看达人详情
const handleViewAuthor = (authorId: string) => {
  // 跳转到达人详情页面
  router.push(`/influencer-detail/${authorId}`)
}

// 评价达人
const handleEvaluate = (row: any) => {
  log.debug('评价达人:', row)
  // 使用 matched_author_id 或 account_id
  currentEvaluateAuthorId.value = row.matched_author_id || row.account_id || ''
  if (!currentEvaluateAuthorId.value) {
    ElMessage.warning('该达人没有匹配的Author ID，无法评价')
    return
  }
  evaluateDialogVisible.value = true
}

// 评价提交成功后
const handleReviewSubmitted = () => {
  ElMessage.success('评价已提交')
  // 可以在这里刷新列表或做其他操作
}

// 表格列配置
const tableColumns = [
  {
    prop: 'platform',
    label: '平台',
    width: 90
  },
  {
    prop: 'account_name',
    label: '账号名称',
    width: 180
  },
  {
    prop: 'account_id',
    label: '账号ID',
    width: 140
  },
  {
    prop: 'org_name',
    label: '机构名',
    width: 130
  },
  {
    prop: 'followers_w',
    label: '粉丝(万)',
    width: 100,
    sortable: true
  },
  {
    prop: 'category',
    label: '类型',
    width: 110
  },
  {
    prop: 'matched_author_id',
    label: '匹配达人',
    width: 180
  },
  {
    prop: 'cooperation_degree',
    label: '配合度',
    width: 90,
    align: 'center'
  },
  {
    prop: 'rebate_policy',
    label: '返点',
    width: 90
  },
  {
    prop: 'policy_level',
    label: '政策',
    width: 80,
    align: 'center'
  },
  {
    prop: 'match_status',
    label: '同步状态',
    width: 110
  },
  {
    prop: 'price_range',
    label: '报价范围',
    width: 180,
    fixed: 'right'
  },
  {
    prop: 'actions',
    label: '操作',
    width: 200,
    fixed: 'right'
  }
]

// 分页处理（适配 StandardTable 组件）
const handleTableChange = (paginationData: any) => {
  pagination.page = paginationData.current
  pagination.limit = paginationData.pageSize
  loadData()
}
// ========== 同步功能结束 ==========

// handleClose 已废弃（由KolEditDialog管理）
// const handleClose = () => {
//   resetForm()
//   dialogVisible.value = false
// }



// 生命周期
onMounted(() => {
  // 默认加载公海达人数据（因为activeTab默认为'public'）
  loadPublicData()
})
</script>

<style scoped lang="scss">
.influencer-management {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    padding: 16px 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;

      .page-title {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        color: #303133;
      }
    }
  }

  .tabs-wrapper {
    margin-bottom: 20px;

    .data-tabs {
      background: white;
      padding: 0 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

      :deep(.el-tabs__header) {
        margin-bottom: 0;
      }

      .tab-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
      }
    }
  }

  .public-data-content,
  .private-data-content {
    background: white;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    margin-bottom: 20px;

    // 确保内部组件也是白色背景
    :deep(.kol-quick-filters) {
      background: white;
    }

    :deep(.filter-container) {
      background: white;
    }

    .influencer-display-area,
    .private-display-area {
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

      .display-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 1px solid #ebeef5;

        .toolbar-left {
          .result-count {
            font-size: 14px;
            color: #606266;

            strong {
              font-size: 18px;
              font-weight: 600;
              color: var(--el-color-primary);
              margin: 0 4px;
            }

            .stats-info-icon {
              font-size: 16px;
              color: var(--el-color-info);
              cursor: pointer;
              margin-left: 8px;
              transition: color 0.3s;
              vertical-align: middle;

              &:hover {
                color: var(--el-color-primary);
              }
            }
          }
        }

        .toolbar-right {
          display: flex;
          gap: 16px;
          align-items: center;

          .toolbar-group {
            display: flex;
            align-items: center;
            gap: 8px;

            .group-label {
              font-size: 14px;
              color: #909399;
              white-space: nowrap;
            }
          }
        }
      }

      .pagination-container {
        margin-top: 20px;
        display: flex;
        justify-content: flex-end;
      }
    }
  }

  .stats-tooltip-content {
    padding: 4px 0;

    .stats-tooltip-item {
      padding: 6px 0;
      font-size: 13px;
      color: var(--el-text-color-primary);
      line-height: 1.5;

      .stats-tooltip-number {
        font-weight: 600;
        margin: 0 4px;
    }
  }
}

  :global(.stats-tooltip) {
    &.el-tooltip__popper.is-dark {
      &[data-popper-placement^="top"] > .el-popper__arrow::before {
        border-top-color: var(--el-tooltip-bg-color);
        margin-left: -2px; // 调整箭头水平位置
      }
    }
  }

  .org-name {
    color: #606266;
  }

  .text-gray {
    color: #909399;
  }

  .high-followers {
    color: var(--el-color-danger);
    font-weight: 600;
  }

  .price-range {
    display: flex;
    justify-content: center; // 添加居中对齐

    .price-info {
      display: flex;
      align-items: center;
      gap: 4px;

      .price-currency {
        color: #1677ff;
        font-weight: 500;
        font-size: 12px;
      }

      .price-min,
      .price-max {
        font-weight: 500;
        color: #1677ff; // 改为蓝色
        font-size: 17px; // 放大3px (从14px到17px)
      }

      .price-separator {
        color: #909399;
      }
    }
  }

  .rebate-text {
    color: #606266; // 改回正常灰色
    font-weight: 500;
  }

  .action-buttons {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    justify-content: center;
  }

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
    }
  }

  .simple-tooltip-text {
    padding: 6px 12px;
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .mapping-grid {
    max-height: 400px;
    overflow-y: auto;

    .mapping-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;

      .mapping-col-letter {
        width: 60px;
        font-weight: 500;
        color: #606266;
      }
    }
  }

  .loading-content {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 20px;
    color: #606266;
  }
}
</style>
