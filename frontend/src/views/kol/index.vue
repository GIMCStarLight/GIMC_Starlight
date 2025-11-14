<template>
  <div class="influencer-management">
    <!-- 顶部操作栏 -->
    <div class="top-bar">
      <div class="bar-left">
        <h1 class="page-title">机构达人管理</h1>
      </div>
      <div class="bar-right">
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
          :disabled="!selectedDouyinRows.length" 
          @click="handleBatchSync"
          :loading="batchSyncing"
          class="action-btn"
        >
          <Icon icon="lucide:refresh-cw" class="mr-1" />
          批量同步
          <el-badge v-if="selectedDouyinRows.length" :value="selectedDouyinRows.length" class="badge-count" />
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

    <!-- 智能筛选组件 -->
    <KolQuickFilters :filters="searchForm" @filter-change="handleFilterChange" />

    <!-- 同步统计信息卡片 -->
    <el-row :gutter="16" class="stats-cards">
      <el-col :xs="24" :sm="12" :md="6" :lg="4">
        <el-card shadow="hover" class="stat-card stat-total">
          <div class="stat-content">
            <div class="stat-icon">
              <Icon icon="lucide:database" :size="32" />
            </div>
            <div class="stat-info">
              <div class="stat-label">总计</div>
              <div class="stat-value">{{ syncStats.total }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6" :lg="4">
        <el-card shadow="hover" class="stat-card stat-unmatched">
          <div class="stat-content">
            <div class="stat-icon">
              <Icon icon="lucide:help-circle" :size="32" />
            </div>
            <div class="stat-info">
              <div class="stat-label">未匹配</div>
              <div class="stat-value">{{ syncStats.unmatched }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6" :lg="4">
        <el-card shadow="hover" class="stat-card stat-pending">
          <div class="stat-content">
            <div class="stat-icon">
              <Icon icon="lucide:clock" :size="32" />
            </div>
            <div class="stat-info">
              <div class="stat-label">待同步</div>
              <div class="stat-value">{{ syncStats.pending }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6" :lg="4">
        <el-card shadow="hover" class="stat-card stat-matched">
          <div class="stat-content">
            <div class="stat-icon">
              <Icon icon="lucide:check-circle" :size="32" />
            </div>
            <div class="stat-info">
              <div class="stat-label">已匹配</div>
              <div class="stat-value">{{ syncStats.matched }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="24" :sm="12" :md="6" :lg="4">
        <el-card shadow="hover" class="stat-card stat-rejected">
          <div class="stat-content">
            <div class="stat-icon">
              <Icon icon="lucide:x-circle" :size="32" />
            </div>
            <div class="stat-info">
              <div class="stat-label">同步失败</div>
              <div class="stat-value">{{ syncStats.rejected }}</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 筛选条件卡片 -->
    <!-- 已移至高级筛选弹窗中，此处删除旧代码 -->    <!-- 数据表格 -->
    <el-card shadow="never">
      <el-table v-loading="loading" :data="tableData" @selection-change="handleSelectionChange" stripe border
        :empty-text="'暂无数据'">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="platform" label="平台" width="90">
          <template #default="{ row }">
            {{ getPlatformLabel(row.platform) }}
          </template>
        </el-table-column>
        <el-table-column prop="account_name" label="账号名称" width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="account-cell">
              <span class="account-name">{{ row.account_name }}</span>
              <el-tag v-if="row.is_exclusive === 1" type="success" size="small" class="ml-2">独家</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="account_id" label="账号ID" width="140" show-overflow-tooltip />
        <el-table-column prop="org_name" label="机构名" width="130" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.org_name" class="org-name">{{ row.org_name }}</span>
            <span v-else class="text-gray">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="followers_w" label="粉丝(万)" width="100" sortable>
          <template #default="{ row }">
            <span :class="{'high-followers': row.followers_w >= 100}">{{ row.followers_w }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="类型" width="110" show-overflow-tooltip />
        <el-table-column label="报价范围" width="130">
          <template #default="{ row }">
            <div class="price-range">
              <div v-if="row.star_quote_21_60s || row.star_quote_60s_plus" class="price-info">
                <span class="price-min">{{ formatPrice(Math.min(row.star_quote_21_60s || 999999, row.star_quote_60s_plus || 999999)) }}</span>
                <span class="price-separator">~</span>
                <span class="price-max">{{ formatPrice(Math.max(row.star_quote_21_60s || 0, row.star_quote_60s_plus || 0)) }}</span>
              </div>
              <span v-else class="text-gray">-</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="cooperation_degree" label="配合度" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.cooperation_degree" :type="getCooperationDegreeType(row.cooperation_degree)" size="small">
              {{ getCooperationDegreeText(row.cooperation_degree) }}
            </el-tag>
            <span v-else class="text-gray">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="rebate_policy" label="返点" width="120" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.rebate_policy" class="rebate-text">{{ row.rebate_policy }}</span>
            <span v-else class="text-gray">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="policy_level" label="政策" width="80" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.policy_level" :type="row.policy_level === 'A' ? 'danger' : row.policy_level === 'B' ? 'warning' : 'info'" size="small">
              {{ row.policy_level }}
            </el-tag>
            <span v-else class="text-gray">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="match_status" label="同步状态" width="110">
          <template #default="{ row }">
            <SyncStatusTag :status="row.match_status || 'unmatched'" />
          </template>
        </el-table-column>
        <el-table-column prop="matched_author_id" label="匹配达人" width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <el-link v-if="row.matched_author_id" type="primary" :underline="false" @click="handleViewAuthor(row.matched_author_id)">
              {{ row.matched_author_id }}
            </el-link>
            <span v-else class="text-gray">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button size="small" type="primary" link @click="handleView(row)">
                <Icon icon="lucide:eye" class="mr-1" />
                详情
              </el-button>
              <el-button 
                v-if="canSync(row)" 
                size="small" 
                type="success" 
                link 
                @click="handleSingleSync(row)"
              >
                <Icon icon="lucide:refresh-cw" class="mr-1" />
                同步
              </el-button>
              <el-button 
                size="small" 
                type="warning" 
                link 
                @click="handleEvaluate(row)"
              >
                <Icon icon="lucide:star" class="mr-1" />
                评价
              </el-button>
              <el-dropdown trigger="click">
                <el-button size="small" link>
                  <Icon icon="lucide:more-horizontal" />
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="handleEdit(row)">
                      <Icon icon="lucide:edit" class="mr-1" />
                      编辑
                    </el-dropdown-item>
                    <el-dropdown-item @click="handleDelete(row)" divided>
                      <Icon icon="lucide:trash-2" class="mr-1" />
                      删除
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination :current-page="pagination.page" :page-size="pagination.limit" :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]" layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange" @current-change="handleCurrentChange" />
      </div>
    </el-card>

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
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { IconifyIcon as Icon } from '@vben/icons'
import { requestClient } from '#/api/request'
import { Excel, mapExcelKolList } from '#/utils/excel'
import ExcelJS from 'exceljs'
import { useRouter } from 'vue-router'
import EvaluateDialog from '#/components/EvaluateDialog/index.vue'
import { id } from 'element-plus/es/locales.mjs'
import { batchCreateKolListApi } from '#/api/kol-list'
import { KolSyncApi } from '../../api/kol-sync.api'
import ImportDataDialog from './components/ImportDataDialog.vue'
import SyncStatusTag from './components/SyncStatusTag.vue'
import KolDetailDialog from './components/KolDetailDialog.vue'
import KolEditDialog from './components/KolEditDialog.vue'
import KolQuickFilters from './components/KolQuickFilters.vue'

const router = useRouter()

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
    console.error('API请求失败:', error)
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
    console.error('加载统计数据失败:', error)
  }
}

const handleSearch = () => {
  pagination.page = 1
  loadData()
}

const handleReset = () => {
  Object.keys(searchForm).forEach(key => {
    searchForm[key] = key === 'search' ? '' : undefined
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
  console.log('[handleView] 传入数据:', row)
  currentDetailKol.value = row
  console.log('[handleView] currentDetailKol.value:', currentDetailKol.value)
  detailDialogVisible.value = true
  console.log('[handleView] detailDialogVisible.value:', detailDialogVisible.value)
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
    console.error(error)
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
  if (!Number.isFinite(n) || n <= 0) return '-'
  return n.toLocaleString('zh-CN')
}

// 配合度级别映射
const getCooperationDegreeType = (degree: string): string => {
  const degreeMap: Record<string, string> = {
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
// 表格选择变更
const handleSelectionChange = (rows: any[]) => {
  selectedRows.value = Array.isArray(rows) ? rows : []
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

// 重置form函数
const resetForm = () => {
  Object.assign(formData, {
    id: undefined,
    canonical_name: '',
    canonical_name_source: 'douyin_star',
    main_platform: 'douyin',
    gender: 'female',
    author_type: 'individual',
    province: '',
    city: '',
    follower: 0,
    interact_rate_within_30d: 0,
    star_index: 0,
    price_1_20: 0,
    price_20_60: 0,
    price_60: 0,
    is_excellent_author: true,
    is_black_horse_author: false,
    is_cocreate_author: false,
    is_excellenct_author: true,
    is_cpm_project_author: false,
    is_short_drama: false,
    e_commerce_enable: false,
    star_id: '',
    tags_relation: '',
  })
  formRef.value?.clearValidate()
}

// 加载同步统计信息
const loadSyncStats = async () => {
  try {
    const stats = await KolSyncApi.getSyncStats()
    syncStats.value = stats
  } catch (error) {
    console.error('加载同步统计失败:', error)
  }
}

// ==========  同步功能 =========
// 计算选中的抖音账号（可同步）
const selectedDouyinRows = computed(() => {
  return selectedRows.value.filter(row => canSync(row))
})

// 判断是否可以同步
const canSync = (row: any): boolean => {
  const platform = String(row.platform || '').trim();
  const platformLower = platform.toLowerCase();
  const isDouyin = platform === '抖音' || platformLower === 'douyin';
  const hasAccountId = !!row.account_id && String(row.account_id).trim().length > 0;
  
  console.log(`[前端.canSync] 🤔 检查是否可以同步:`, {
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
  console.log(`====== [前端.index] 开始同步流程 ======`);
  console.log(`[前端.index] 📋 KOL信息:`, {
    id: row.id,
    account_id: row.account_id,
    account_name: row.account_name,
    platform: row.platform,
    match_status: row.match_status
  });
  
  try {
    loading.value = true;
    console.log(`[前端.index] 🔄 设置加载状态: true`);
    console.log(`[前端.index] 🚀 调用KolSyncApi.syncSingleKol(${row.id}, ${row.account_id})`);
    
    const result = await KolSyncApi.syncSingleKol(row.id, row.account_id);
    
    const duration = Date.now() - startTime;
    console.log(`[前端.index] 📊 同步结果:`, result);
    console.log(`[前端.index] ⏱️ 总耗时: ${duration}ms`);
    
    if (result.status === 'success') {
      console.log(`[前端.index] ✅ 同步成功`);
      ElMessage.success(`同步成功：${row.account_name}`);
      console.log(`[前端.index] 🔄 刷新列表数据和统计信息...`);
      loadData(); // 刷新列表
      loadSyncStats(); // 刷新统计
    } else if (result.status === 'failed') {
      console.warn(`[前端.index] ⚠️ 同步失败: ${result.errorMessage}`);
      ElMessage.warning(`同步失败：${result.errorMessage || '未知错误'}`);
    } else {
      console.log(`[前端.index] 📝 同步状态: ${result.status}`);
      ElMessage.info('同步任务已提交，请稍后查看结果');
    }
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[前端.index] 💥 同步异常 - 耗时: ${duration}ms`);
    console.error(`[前端.index] 💥 错误类型: ${error.constructor?.name || typeof error}`);
    console.error(`[前端.index] 💥 错误信息: ${error.message}`);
    console.error(`[前端.index] 💥 完整错误:`, error);
    
    if (error.response) {
      console.error(`[前端.index] 📥 响应数据:`, error.response.data);
    }
    
    ElMessage.error(`同步失败: ${error.message || '请稍后重试'}`);
  } finally {
    loading.value = false;
    const totalDuration = Date.now() - startTime;
    console.log(`[前端.index] 🔄 恢复加载状态: false`);
    console.log(`====== [前端.index] 同步流程结束 - 总耗时: ${totalDuration}ms ======`);
  }
}

// 批量同步
const handleBatchSync = async () => {
  if (selectedDouyinRows.value.length === 0) {
    ElMessage.warning('请选择需要同步的抖音账号')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确认同步 ${selectedDouyinRows.value.length} 个账号吗？`,
      '批量同步',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info',
      }
    )

    batchSyncing.value = true
    const kolIds = selectedDouyinRows.value.map(row => row.id)
    const result = await KolSyncApi.syncBatchKols(kolIds)

    ElMessage.success(
      `批量同步完成：成功 ${result.successCount} 个，失败 ${result.failedCount} 个`
    )
    loadData() // 刷新列表
    loadSyncStats() // 刷新统计
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('批量同步失败:', error)
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
      console.error('重试失败:', error)
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
  console.log('评价达人:', row)
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

// 分页处理
const handleSizeChange = (size: number) => {
  pagination.limit = size
  pagination.page = 1
  loadData()
}

const handleCurrentChange = (page: number) => {
  pagination.page = page
  loadData()
}
// ========== 同步功能结束 ==========

const handleClose = () => {
  resetForm()
  dialogVisible.value = false
}



// 生命周期
onMounted(() => {
  loadData()
  loadSyncStats()
})
</script>

<style scoped>
.influencer-management {
  padding: 20px;
  background: var(--el-bg-color-page);
}

/* ===== 顶部操作栏 ===== */
.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 0 4px;
}

.bar-left {
  flex: 1;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.bar-right {
  display: flex;
  gap: 12px;
  align-items: center;
}

.action-btn {
  border-radius: 6px;
  white-space: nowrap;
}

.badge-count {
  margin-left: 8px;
}

/* ===== 同步统计卡片 ===== */
.stats-cards {
  margin-bottom: 24px;
}

.stat-card {
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 8px;
  background: var(--el-fill-color-light);
}

.stat-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.stat-content {
  display: flex;
  align-items: center;
  padding: 24px;
  gap: 16px;
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  flex-shrink: 0;
  font-size: 28px;
}

.stat-info {
  flex: 1;
  min-width: 0;
}

.stat-label {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 500;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
}

/* 统计卡片颜色主题 */
.stat-total .stat-icon {
  background-color: #ecf5ff;
  color: #409eff;
}

.stat-total .stat-value {
  color: #409eff;
}

.stat-unmatched .stat-icon {
  background-color: #f4f4f5;
  color: #909399;
}

.stat-unmatched .stat-value {
  color: #909399;
}

.stat-pending .stat-icon {
  background-color: #fdf6ec;
  color: #e6a23c;
}

.stat-pending .stat-value {
  color: #e6a23c;
}

.stat-matched .stat-icon {
  background-color: #f0f9ff;
  color: #67c23a;
}

.stat-matched .stat-value {
  color: #67c23a;
}

.stat-rejected .stat-icon {
  background-color: #fef0f0;
  color: #f56c6c;
}

.stat-rejected .stat-value {
  color: #f56c6c;
}

/* ===== 表格样式 ===== */
.account-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.account-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.high-followers {
  color: #f56c6c;
  font-weight: 600;
}

.price-range {
  font-size: 13px;
  color: var(--el-text-color-primary);
}

.price-info {
  display: flex;
  align-items: center;
  gap: 4px;
}

.price-separator {
  color: var(--el-text-color-secondary);
}

.text-gray {
  color: var(--el-text-color-placeholder);
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.action-buttons :deep(.el-button) {
  padding: 6px 12px;
  height: auto;
}

/* ===== 分页 ===== */
.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 24px;
  padding: 16px 0;
}

.mx-2 {
  margin: 0 8px;
}

.mr-1 {
  margin-right: 6px;
}

.ml-2 {
  margin-left: 8px;
}

/* ===== 加载对话框 ===== */
.loading-content {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 0;
}

.loading-content .el-icon {
  animation: spin 2s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* ===== 映射配置 ===== */
.mapping-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.mapping-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.mapping-col-letter {
  width: 80px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

/* ===== 表格样式 ===== */
.account-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.account-name {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.org-name {
  color: var(--el-text-color-regular);
  font-size: 13px;
}

.high-followers {
  color: #f56c6c;
  font-weight: 600;
}

.price-range {
  display: flex;
  align-items: center;
  justify-content: center;
}

.price-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.price-min,
.price-max {
  color: var(--el-text-color-primary);
  font-weight: 500;
}

.price-separator {
  color: var(--el-text-color-secondary);
}

.text-gray {
  color: var(--el-text-color-placeholder);
}

.rebate-text {
  color: var(--el-text-color-regular);
  font-size: 13px;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.action-buttons {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-wrap: wrap;
}

.ml-2 {
  margin-left: 8px;
}

/* ===== 响应式设计 ===== */
@media (max-width: 1200px) {
  .quick-search-bar {
    flex-wrap: wrap;
  }
  
  .search-input {
    max-width: 100%;
    flex: 1 1 100%;
  }
}

@media (max-width: 768px) {
  .influencer-management {
    padding: 12px;
  }
  
  .top-bar {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .bar-left,
  .bar-right {
    width: 100%;
  }
  
  .bar-right {
    flex-direction: column;
  }
  
  .action-btn {
    width: 100%;
  }
  
  .quick-search-bar {
    flex-direction: column;
    gap: 8px;
  }
  
  .search-input {
    max-width: 100%;
    width: 100%;
  }
  
  .stat-content {
    padding: 16px;
  }
  
  .stat-icon {
    width: 44px;
    height: 44px;
    font-size: 20px;
  }
  
  .stat-value {
    font-size: 20px;
  }
  
  .stat-label {
    font-size: 12px;
  }
  
  .action-buttons {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 18px;
  }
  
  .stat-value {
    font-size: 18px;
  }
  
  .advanced-filter-panel .el-form-item {
    margin-bottom: 12px;
  }
}
</style>