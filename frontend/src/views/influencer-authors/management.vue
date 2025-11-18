<template>
  <div class="influencer-management">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <el-button type="primary" @click="handleAdd">
          <Icon icon="lucide:plus" class="mr-1" />
          新增达人
        </el-button>
        <el-button 
          type="danger" 
          :disabled="!selectedRows.length" 
          @click="handleBatchDelete"
        >
          <Icon icon="lucide:trash-2" class="mr-1" />
          批量删除
        </el-button>

        <el-upload
          ref="uploadExcelRef"
          :on-change="uploadFile"
          :auto-upload="false"
          :limit="1"
        >
          <el-button>
            <Icon icon="lucide:download" class="mr-1" />
            导入数据
          </el-button>
        </el-upload>

        <el-button @click="handleExport">
          <Icon icon="lucide:upload" class="mr-1" />
          导出数据
        </el-button>
      </div>
      <div class="toolbar-right">
        <el-input
          v-model="searchForm.search"
          placeholder="搜索达人昵称"
          style="width: 200px"
          clearable
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <Icon icon="lucide:search" />
          </template>
        </el-input>
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button @click="handleReset">重置</el-button>
      </div>
    </div>

    <!-- 筛选条件 -->
    <el-card class="filter-card" shadow="never">
      <el-form :model="searchForm" inline>
        <el-form-item label="城市">
          <el-input v-model="searchForm.city" placeholder="请输入城市" clearable />
        </el-form-item>
        <el-form-item label="省份">
          <el-input v-model="searchForm.province" placeholder="请输入省份" clearable />
        </el-form-item>
        <el-form-item label="达人类型">
          <el-select v-model="searchForm.author_type" placeholder="请选择" clearable>
            <el-option label="个人" value="individual" />
            <el-option label="机构" value="institution" />
            <el-option label="品牌" value="brand" />
          </el-select>
        </el-form-item>
        <el-form-item label="性别">
          <el-select v-model="searchForm.gender" placeholder="请选择" clearable>
            <el-option label="男" value="male" />
            <el-option label="女" value="female" />
            <el-option label="未知" value="unknown" />
          </el-select>
        </el-form-item>
        <el-form-item label="粉丝数范围">
          <el-input-number v-model="searchForm.min_follower" placeholder="最小值" :min="0" />
          <span class="mx-2">-</span>
          <el-input-number v-model="searchForm.max_follower" placeholder="最大值" :min="0" />
        </el-form-item>
        <el-form-item label="电商功能">
          <el-select v-model="searchForm.e_commerce_enable" placeholder="请选择" clearable>
            <el-option label="已开通" :value="true" />
            <el-option label="未开通" :value="false" />
          </el-select>
        </el-form-item>
        <el-form-item label="优质达人">
          <el-select v-model="searchForm.is_excellenct_author" placeholder="请选择" clearable>
            <el-option label="是" :value="true" />
            <el-option label="否" :value="false" />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 统计信息 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-content">
            <div class="stats-number">{{ statistics.totalCount || 0 }}</div>
            <div class="stats-label">总达人数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-content">
            <div class="stats-number">{{ genderStats[0]?.count || 0 }}</div>
            <div class="stats-label">男性达人</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-content">
            <div class="stats-number">{{ genderStats[1]?.count || 0 }}</div>
            <div class="stats-label">女性达人</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stats-card">
          <div class="stats-content">
            <div class="stats-number">{{ statistics?.ecommerceEnabledCount || 0 }}</div>
            <div class="stats-label">电商达人</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 数据表格 -->
    <el-card shadow="never">
      <el-table
        v-loading="loading"
        :data="tableData"
        @selection-change="handleSelectionChange"
        stripe
        border
      >
        <el-table-column type="selection" width="55" />
        
        <!-- 头像 -->
        <el-table-column label="头像" width="80" align="center">
          <template #default="{ row }">
            <el-avatar :size="40" :src="row.avatarUri" fit="cover">
              {{ row.canonical_name?.charAt(0) }}
            </el-avatar>
          </template>
        </el-table-column>
        
        <!-- 昵称 -->
        <el-table-column prop="canonical_name" label="昵称" width="150" show-overflow-tooltip />
        
        <!-- 粉丝数 -->
        <el-table-column label="粉丝数" width="100" align="right" sortable>
          <template #default="{ row }">
            <span class="number-value">{{ formatFollower(row.follower) }}</span>
          </template>
        </el-table-column>
        
        <!-- 30日播放量中位数 -->
        <el-table-column label="30日播放量中位数" width="140" align="right">
          <template #default="{ row }">
            <span class="number-value">{{ formatVvMedian(row.vv_median_30d) }}</span>
          </template>
        </el-table-column>
        
        <!-- 30日互动率 -->
        <el-table-column label="30日互动率" width="120" align="right">
          <template #default="{ row }">
            <span class="number-value">{{ formatInteractRate(row.interact_rate_within_30d) }}</span>
          </template>
        </el-table-column>
        
        <!-- 省份 -->
        <el-table-column prop="province" label="省份" width="100" align="center" show-overflow-tooltip />
        
        <!-- 性别 -->
        <el-table-column label="性别" width="80" align="center">
          <template #default="{ row }">
            <span>{{ formatGender(row.gender) }}</span>
          </template>
        </el-table-column>
        
        <!-- 星级指数 -->
        <el-table-column label="星级指数" width="100" align="right" sortable>
          <template #default="{ row }">
            <span class="star-index">{{ formatStarIndex(row.star_index) }}</span>
          </template>
        </el-table-column>
        
        <!-- 20-60s价格 -->
        <el-table-column label="20-60s价格" width="120" align="right" sortable>
          <template #default="{ row }">
            <span class="price-value">{{ formatPrice(row.price_20_60) }}</span>
          </template>
        </el-table-column>
        
        <!-- 90日星图视频数 -->
        <el-table-column label="90日星图视频数" width="130" align="right">
          <template #default="{ row }">
            <span class="number-value">{{ row.star_video_cnt_90d || 0 }}</span>
          </template>
        </el-table-column>
        
        <!-- 电商能力 -->
        <el-table-column label="电商能力" width="100" align="center">
          <template #default="{ row }">
            <span>{{ formatEcommerce(row.e_commerce_enable) }}</span>
          </template>
        </el-table-column>
        
        <!-- 内容主题标签 -->
        <el-table-column label="内容主题标签" width="200">
          <template #default="{ row }">
            <span>{{ formatContentTheme(row.content_theme_labels_180d) }}</span>
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="warning" link @click="handleEvaluate(row)">
              评价
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          :current-page="pagination.page"
          :page-size="pagination.limit"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="800px"
      :close-on-click-modal="false"
      @close="handleClose"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="120px"
      >
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="星图ID" prop="star_id">
              <el-input v-model="formData.star_id" placeholder="请输入星图ID" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="昵称" prop="canonical_name">
              <el-input v-model="formData.canonical_name" placeholder="请输入昵称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="粉丝数" prop="follower">
              <el-input-number v-model="formData.follower" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="达人类型" prop="author_type">
              <el-select v-model="formData.author_type" style="width: 100%">
                <el-option label="个人" value="individual" />
                <el-option label="机构" value="institution" />
                <el-option label="品牌" value="brand" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="性别">
              <el-select v-model="formData.gender" style="width: 100%">
                <el-option label="男" value="male" />
                <el-option label="女" value="female" />
                <el-option label="未知" value="unknown" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="城市">
              <el-input v-model="formData.city" placeholder="请输入城市" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="省份">
              <el-input v-model="formData.province" placeholder="请输入省份" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="星图指数">
              <el-input-number v-model="formData.star_index" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="8">
            <el-form-item label="1-20秒报价">
              <el-input-number v-model="formData.price_1_20" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="20-60秒报价">
              <el-input-number v-model="formData.price_20_60" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="60秒以上报价">
              <el-input-number v-model="formData.price_60" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="24">
            <el-form-item label="特征标签">
              <el-checkbox v-model="formData.e_commerce_enable" :true-label="1" :false-label="0">
                电商功能
              </el-checkbox>
              <el-checkbox v-model="formData.is_excellenct_author" :true-label="1" :false-label="0">
                优质达人
              </el-checkbox>
              <el-checkbox v-model="formData.is_black_horse_author" :true-label="1" :false-label="0">
                黑马达人
              </el-checkbox>
              <el-checkbox v-model="formData.is_cocreate_author" :true-label="1" :false-label="0">
                共创达人
              </el-checkbox>
              <el-checkbox v-model="formData.is_cpm_project_author" :true-label="1" :false-label="0">
                CPM项目达人
              </el-checkbox>
              <el-checkbox v-model="formData.is_short_drama" :true-label="1" :false-label="0">
                短剧达人
              </el-checkbox>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="标签关系">
          <el-input
            v-model="formData.tags_relation"
            type="textarea"
            :rows="3"
            placeholder="请输入标签关系（逗号分隔的标签ID）"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          确定
        </el-button>
      </template>
    </el-dialog>
  
    <EvaluateDialog 
      v-model:visible="evaluateDialogVisible" 
      :author-id="currentStarId"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { IconifyIcon as Icon } from '@vben/icons'
import { log } from '../../utils/logger'
import { requestClient } from '../../api/request'
import { Excel, mapExcelInfluencer } from '../../utils/excel'
import { useRouter } from 'vue-router'
import EvaluateDialog from '../../components/EvaluateDialog/index.vue'
import { formatters } from '../shared/influencer-columns'
import { id } from 'element-plus/es/locales.mjs'

const router = useRouter()

// 格式化函数
const formatFollower = formatters.formatFollower
const formatVvMedian = formatters.formatVvMedian
const formatInteractRate = formatters.formatInteractRate
const formatStarIndex = formatters.formatStarIndex
const formatGender = formatters.formatGender
const formatEcommerce = formatters.formatEcommerce
const formatContentTheme = formatters.formatContentTheme

// 响应式数据
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const selectedRows = ref<any[]>([])
const tableData = ref<any[]>([])
const statistics = ref<{
  totalCount?: number
  ecommerceEnabledCount?: number
  genderStats?: Array<{ gender: string; count: number }>
}>({})
const genderStats = computed(() => statistics.value?.genderStats || [])

// 搜索表单
const searchForm = reactive({
  search: '',
  city: '',
  province: '',
  author_type: undefined,
  gender: undefined,
  min_follower: undefined,
  max_follower: undefined,
  e_commerce_enable: undefined,
  is_excellenct_author: undefined,
})

// 分页
const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0,
})

// 表单数据
// const formData = reactive({
//   id: undefined,
//   star_id: '',
//   nick_name: '',
//   follower: 0,
//   author_type: 1,
//   gender: undefined,
//   city: '',
//   province: '',
//   star_index: 0,
//   price_1_20: 0,
//   price_20_60: 0,
//   price_60: 0,
//   e_commerce_enable: 0,
//   is_excellenct_author: 0,
//   is_black_horse_author: 0,
//   is_cocreate_author: 0,
//   is_cpm_project_author: 0,
//   is_short_drama: 0,
//   tags_relation: '',
// })

// const formData = reactive(
//  {
//   id: undefined,
//   canonical_name: '',
//   star_id: '',
//   canonical_name_source: '',
//   canonical_avatar: '',
//   canonical_avatar_source: '',
//   // main_platform: '',
//   gender: 'male',
//   gender_source: '',
//   city: '',
//   city_source: '',
//   province: '',
//   province_source: '',
//   author_type: 'individual',
//   author_type_source: '',
//   account_status: 'active',
//   author_level: 10,
//   follower: 0,
//   follower_source: '',
//   fans_increment_within_15d: 0,
//   fans_increment_within_30d: 0,
//   fans_increment_rate_within_15d: 0,
//   interact_rate_within_30d: 0,
//   interaction_median_30d: 0,
//   play_over_rate_within_30d: 0,
//   vv_median_30d: 0,
//   star_item_count_within_30d: 0,
//   star_video_cnt_90d: 0,
//   star_video_interact_rate_90d: 0,
//   star_video_finish_vv_rate_90d: 0,
//   star_video_median_vv_90d: 0,
//   content_theme_labels_180d: [
//     ''
//   ],
//   tags_relation: '',
//   price_1_20: 0,
//   price_20_60: 0,
//   price_60: 0,
//   assign_task_price_list: '',
//   expected_play_num: 0,
//   expected_natural_play_num: 0,
//   star_index: 0,
//   e_commerce_enable: false,
//   author_ecom_level: '',
//   ecom_gmv_30d_range: '',
//   is_excellent_author: false,
//   star_excellent_author: true,
//   is_black_horse_author: false,
//   is_cocreate_author: false,
//   is_excellenct_author: true,
//   is_cpm_project_author: false,
//   is_short_drama: false,
//   last_10_items: {},
//   items: {},
//   task_infos: {},
//   embedding_version: '',
//   // embedding_id: '',
//   data_quality: {},
//   // last_seen_at: '',
//   // last_ingest_id: ''
//  }
// )
const formData = reactive(
  {
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
}
)

// 表单验证规则
const formRules = {
  star_id: [{ required: true, message: '请输入星图ID', trigger: 'blur' }],
  canonical_name: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  author_type: [{ required: true, message: '请选择达人类型', trigger: 'change' }],
}

const formRef = ref()

// 计算属性
const dialogTitle = computed(() => {
  return formData.id ? '编辑达人' : '新增达人'
})

// 方法
const loadData = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...searchForm,
    }
    
    // 清理空值
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === undefined) {
        delete params[key]
      }
    })

    log.debug('发送API请求参数:', params)
    // 使用统一的API前缀
    const response = await requestClient.get('/influencers', { 
      params
    })
    log.debug('API完整响应:', response)
    
    // 处理v2 API响应格式: { data: [...], pagination: {...} }
    if (response && response.data) {
      log.debug('解析后的响应数据:', response)
      
      tableData.value = response.data || []
      log.debug('设置表格数据:', tableData.value.length, '条记录')
      
      // 调试：检查表格数据中的字段
      if (tableData.value.length > 0) {
        log.debug('=== 表格数据字段调试 ===')
        log.debug('第一条记录:', tableData.value[0])
        log.debug('第一条记录的所有键:', Object.keys(tableData.value[0]))
        log.debug('是否包含author_id:', 'author_id' in tableData.value[0])
        log.debug('是否包含influencer_id:', 'influencer_id' in tableData.value[0])
        log.debug('author_id值:', tableData.value[0].author_id)
        log.debug('influencer_id值:', tableData.value[0].influencer_id)
      }
      
      // 使用后端返回的完整分页信息
      if (response.pagination) {
        const paginationInfo = response.pagination
        pagination.page = paginationInfo.page || 1
        pagination.limit = paginationInfo.limit || 20
        pagination.total = paginationInfo.total || 0
        
        log.debug('分页信息解析:', {
          原始分页数据: paginationInfo,
          解析后分页: pagination
        })
      } else {
        log.debug('未找到分页信息，使用默认值')
        pagination.total = tableData.value.length
      }
    } else {
      log.debug('API响应格式错误')
      tableData.value = []
      pagination.total = 0
    }
  } catch (error) {
    log.error('API请求失败:', error)
    ElMessage.error('加载数据失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

const loadStatistics = async () => {
  try {
    const response = await requestClient.get('/influencers/stats')
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
  Object.keys(searchForm).forEach(key => {
    searchForm[key] = key === 'search' ? '' : undefined
  })
  pagination.page = 1
  loadData()
}

const handleAdd = () => {
  resetForm()
  dialogVisible.value = true
}

const handleEdit = (row) => {
  Object.assign(formData, row)
  dialogVisible.value = true
}

const handleView = (row: any) => {
  // 可以跳转到详情页或显示详情对话框
  // ElMessage.info('查看功能待实现')
  router.push({path: '/influencer-detail', query: {id: row.id}})
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除达人"${row.canonical_name}"吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    await requestClient.delete(`influencer-current/${row.id}`)
    ElMessage.success('删除成功')
    loadData()
    loadStatistics()
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
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    const ids = selectedRows.value.map(row => row.id).join(',')
    await requestClient.delete(`influencer-current`, {data: {ids}})
    ElMessage.success('批量删除成功')
    selectedRows.value = []
    loadData()
    loadStatistics()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量删除失败: ' + error.message)
    }
  }
}

const handleExport = () => {
  ElMessage.info('导出功能待实现')
}

const handleSubmit = async () => {
  try {
    await formRef.value.validate()
    submitting.value = true
    
    const data = { ...formData }
    delete data.id
   if(!data.tags_relation) {
      data.tags_relation = '' as any
    }
    
    if (formData.id) {
      await requestClient.patch(`influencer-current/${formData.id}`, data)
      ElMessage.success('更新成功')
    } else {
      await requestClient.post('influencer-current', data)
      ElMessage.success('创建成功')
    }
    
    dialogVisible.value = false
    loadData()
    loadStatistics()
  } catch (error) {
    ElMessage.error('操作失败: ' + error.message)
  } finally {
    submitting.value = false
  }
}

const handleSelectionChange = (selection) => {
  selectedRows.value = selection
}

const handleSizeChange = (size) => {
  log.debug('分页大小改变:', size)
  pagination.limit = size
  pagination.page = 1
  log.debug('更新后的分页参数:', pagination)
  loadData()
}

const handleCurrentChange = (page) => {
  log.debug('页码改变:', page)
  pagination.page = page
  log.debug('更新后的分页参数:', pagination)
  loadData()
}

const resetForm = () => {
//   Object.assign(formData,
//  {
//   id: undefined,
//   star_id: '',
//   canonical_name: '',
//   canonical_name_source: '',
//   canonical_avatar: '',
//   canonical_avatar_source: '',
//   // main_platform: '',
//   gender: 'male',
//   gender_source: '',
//   city: '',
//   city_source: '',
//   province: '',
//   province_source: '',
//   author_type: 'individual',
//   author_type_source: '',
//   account_status: 'active',
//   author_level: 10,
//   follower: 0,
//   follower_source: '',
//   fans_increment_within_15d: 0,
//   fans_increment_within_30d: 0,
//   fans_increment_rate_within_15d: 0,
//   interact_rate_within_30d: 0,
//   interaction_median_30d: 0,
//   play_over_rate_within_30d: 0,
//   vv_median_30d: 0,
//   star_item_count_within_30d: 0,
//   star_video_cnt_90d: 0,
//   star_video_interact_rate_90d: 0,
//   star_video_finish_vv_rate_90d: 0,
//   star_video_median_vv_90d: 0,
//   content_theme_labels_180d: [
//     ''
//   ],
//   tags_relation: '',
//   price_1_20: 0,
//   price_20_60: 0,
//   price_60: 0,
//   assign_task_price_list: '',
//   expected_play_num: 0,
//   expected_natural_play_num: 0,
//   star_index: 0,
//   e_commerce_enable: false,
//   author_ecom_level: '',
//   ecom_gmv_30d_range: '',
//   is_excellent_author: false,
//   star_excellent_author: true,
//   is_black_horse_author: false,
//   is_cocreate_author: false,
//   is_excellenct_author: true,
//   is_cpm_project_author: false,
//   is_short_drama: false,
//   last_10_items: {},
//   items: {},
//   task_infos: {},
//   embedding_version: '',
//   // embedding_id: '',
//   data_quality: {},
//   // last_seen_at: '',
//   // last_ingest_id: ''
//  })
Object.assign(formData,{
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

// 工具函数
const formatNumber = (num) => {
  if (!num) return '0'
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w'
  }
  return num.toLocaleString()
}

const formatPrice = (price) => {
  if (!price) return '-'
  return '¥' + price.toLocaleString()
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString()
}

// 导入数据
const uploadExcelRef = ref()
 const uploadFile = async (file: any) => {
  // 表头字段数组
  const header = Object.values(mapExcelInfluencer);
  if (file.raw?.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      && file.raw?.type !== 'application/vnd.ms-excel') {
    ElMessage.error('文件格式错误，请重新上传！')
    // 移除上传的文件
     uploadExcelRef.value!.handleRemove(file)
    return false
  }
  // 对excel文件进行处理
  try {
    const excel = new Excel(file.raw);
    // 导入文件获取数据
    const res = await excel.importExcel({ header });
    res.shift()
    log.debug(res);
  } catch (err) {
    log.debug(err);
  }finally{
    ElMessage.success('导入成功')
    uploadExcelRef.value!.handleRemove(file)
  }
}

// 评价达人
const evaluateDialogVisible = ref(false)
const currentStarId = ref<string>('')
const handleEvaluate = (row) => {
  log.debug('=== 评价达人调试信息 ===')
  log.debug('完整row对象:', row)
  log.debug('row.id:', row.id)
  log.debug('row.author_id:', row.author_id)
  log.debug('row.influencer_id:', row.influencer_id)
  log.debug('row对象的所有键:', Object.keys(row))
  log.debug('row对象的所有值:', Object.values(row))
  
  // 设置当前要评价的达人ID，v2 API返回的是id字段，兼容旧的author_id和influencer_id
  const starId = String(row.id || row.author_id || row.influencer_id)
  log.debug('最终设置的starId:', starId)
  
  currentStarId.value = starId
  evaluateDialogVisible.value = true
}

// 关闭新增/编辑对话框 
const handleClose = () => {
  resetForm()
  dialogVisible.value = false
}



// 生命周期
onMounted(() => {
  loadData()
  loadStatistics()
})
</script>

<style scoped>
.influencer-management {
  padding: 16px;
  background: var(--el-bg-color-page);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.toolbar-left {
  display: flex;
  gap: 8px;
}

.toolbar-right {
  display: flex;
  gap: 8px;
  align-items: center;
}

.filter-card {
  margin-bottom: 16px;
}

.stats-row {
  margin-bottom: 16px;
}

.stats-card {
  text-align: center;
}

.stats-content {
  padding: 16px;
}

.stats-number {
  font-size: 24px;
  font-weight: bold;
  color: var(--el-color-primary);
  margin-bottom: 8px;
}

.stats-label {
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.feature-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

.mx-2 {
  margin: 0 8px;
}
</style>
