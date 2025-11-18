<template>
  <div class="rebate-policy-config">
    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="政策名称">
          <el-input v-model="searchForm.policyName" placeholder="请输入政策名称" clearable />
        </el-form-item>
        <el-form-item label="政策类型">
          <el-select v-model="searchForm.policyType" placeholder="请选择政策类型" clearable>
            <el-option label="百分比" value="percentage" />
            <el-option label="固定金额" value="fixed" />
            <el-option label="阶梯式" value="tiered" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
            <el-option label="启用" value="active" />
            <el-option label="禁用" value="inactive" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作区域 -->
    <el-card class="action-card">
      <div class="card-header">
        <span>政策列表</span>
        <div class="header-actions">
          <el-button 
            type="danger" 
            :disabled="selectedIds.length === 0"
            @click="handleBatchDelete"
          >
            批量删除
          </el-button>
          <el-button type="primary" @click="handleCreate">
            新建政策
          </el-button>
        </div>
      </div>

      <!-- 表格 -->
      <el-table 
        :data="policyList" 
        v-loading="loading"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="policyName" label="政策名称" min-width="150" />
        <el-table-column prop="policyType" label="政策类型" width="120">
          <template #default="{ row }">
            <el-tag :type="getPolicyTypeColor(row.policyType)">
              {{ getPolicyTypeLabel(row.policyType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="政策描述" min-width="200" show-overflow-tooltip />
        <el-table-column label="返点配置" width="200">
          <template #default="{ row }">
            <div v-if="row.policyType === 'percentage'">
              {{ row.percentage }}%
            </div>
            <div v-else-if="row.policyType === 'fixed'">
              {{ formatCurrency(row.fixedAmount) }}
            </div>
            <div v-else-if="row.policyType === 'tiered'">
              {{ row.tiers?.length || 0 }}个阶梯
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="baseAmount" label="基础金额" width="120">
          <template #default="{ row }">
            {{ formatCurrency(row.baseAmount) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusColor(row.status)">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.updatedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="handleCalculate(row)">
              计算
            </el-button>
            <el-button type="primary" size="small" @click="handleEdit(row)">
              编辑
            </el-button>
            <el-button type="danger" size="small" @click="handleDelete(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <el-pagination
        v-model:current-page="pagination.currentPage"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </el-card>

    <!-- 新建/编辑政策对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑政策' : '新建政策'"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="政策名称" prop="policyName">
          <el-input v-model="formData.policyName" placeholder="请输入政策名称" />
        </el-form-item>
        <el-form-item label="政策类型" prop="policyType">
          <el-select v-model="formData.policyType" @change="handleTypeChange">
            <el-option label="百分比" value="percentage" />
            <el-option label="固定金额" value="fixed" />
            <el-option label="阶梯式" value="tiered" />
          </el-select>
        </el-form-item>
        <el-form-item label="政策描述">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入政策描述"
          />
        </el-form-item>
        <el-form-item label="基础金额">
          <el-input-number v-model="formData.baseAmount" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item v-if="formData.policyType === 'percentage'" label="返点百分比">
          <el-input-number 
            v-model="formData.percentage" 
            :min="0" 
            :max="100" 
            :precision="2"
            placeholder="请输入百分比"
          />
          <span style="margin-left: 8px;">%</span>
        </el-form-item>
        <el-form-item v-if="formData.policyType === 'fixed'" label="固定返点">
          <el-input-number 
            v-model="formData.fixedAmount" 
            :min="0" 
            :precision="2"
            placeholder="请输入固定金额"
          />
        </el-form-item>
        <el-form-item v-if="formData.policyType === 'tiered'" label="阶梯配置">
          <div v-for="(tier, index) in formData.tiers" :key="index" class="tier-item">
            <el-input-number 
              v-model="tier.threshold[0]" 
              :min="0" 
              :precision="2"
              placeholder="最小值"
              style="width: 120px;"
            />
            <span style="margin: 0 8px;">-</span>
            <el-input-number 
              v-model="tier.threshold[1]" 
              :min="tier.threshold[0]" 
              :precision="2"
              placeholder="最大值"
              style="width: 120px;"
            />
            <span style="margin: 0 8px;">返点率:</span>
            <el-input-number 
              v-model="tier.rate" 
              :min="0" 
              :max="100"
              :precision="2"
              placeholder="返点率"
              style="width: 100px;"
            />
            <span style="margin-left: 4px;">%</span>
            <el-button 
              type="danger" 
              size="small" 
              style="margin-left: 8px;"
              @click="removeTier(index)"
            >
              删除
            </el-button>
          </div>
          <el-button type="primary" size="small" @click="addTier">
            添加阶梯
          </el-button>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="formData.status">
            <el-radio value="active">启用</el-radio>
            <el-radio value="inactive">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 计算返点对话框 -->
    <el-dialog
      v-model="calculateVisible"
      title="计算返点"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form :model="calculateForm" label-width="100px">
        <el-form-item label="基础金额">
          <el-input-number 
            v-model="calculateForm.baseAmount" 
            :min="0" 
            :precision="2"
            placeholder="请输入基础金额"
          />
        </el-form-item>
      </el-form>
      
      <div v-if="calculateResult" class="calculate-result">
        <h4>计算结果</h4>
        <p>基础金额: {{ formatCurrency(calculateResult.baseAmount) }}</p>
        <p>返点金额: {{ formatCurrency(calculateResult.rebateAmount) }}</p>
        <p>返点率: {{ calculateResult.rebateRate }}%</p>
        <p v-if="calculateResult.appliedTier">
          适用阶梯: {{ calculateResult.appliedTier.threshold[0] }} - {{ calculateResult.appliedTier.threshold[1] }}
        </p>
      </div>
      
      <template #footer>
        <el-button @click="calculateVisible = false">关闭</el-button>
        <el-button type="primary" :loading="calculateLoading" @click="handleCalculateSubmit">
          计算
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { log } from '../../../utils/logger'

// 模拟API接口
const rebatePolicyConfigApi = {
  getPolicies: async (params: any) => {
    // 模拟数据
    const mockData: RebatePolicy[] = [
      {
        id: 1,
        policyName: '标准返点政策',
        policyType: 'percentage',
        description: '标准百分比返点政策',
        baseAmount: 1000,
        percentage: 5.5,
        fixedAmount: 0,
        tiers: [],
        status: 'active',
        updatedAt: '2024-01-15 10:30:00'
      },
      {
        id: 2,
        policyName: '固定返点政策',
        policyType: 'fixed',
        description: '固定金额返点政策',
        baseAmount: 500,
        percentage: 0,
        fixedAmount: 50,
        tiers: [],
        status: 'active',
        updatedAt: '2024-01-14 15:20:00'
      },
      {
        id: 3,
        policyName: '阶梯返点政策',
        policyType: 'tiered',
        description: '阶梯式返点政策',
        baseAmount: 0,
        percentage: 0,
        fixedAmount: 0,
        tiers: [
          { threshold: [0, 1000], rate: 3 },
          { threshold: [1000, 5000], rate: 5 },
          { threshold: [5000, 10000], rate: 8 }
        ],
        status: 'active',
        updatedAt: '2024-01-13 09:15:00'
      }
    ]
    
    return {
      success: true,
      data: {
        items: mockData,
        total: mockData.length
      },
      message: '获取成功'
    }
  },
  
  createPolicy: async (data: any) => {
    log.debug('创建政策:', data)
    return { success: true, message: '创建成功' }
  },
  
  updatePolicy: async (id: number, data: any) => {
    log.debug('更新政策:', id, data)
    return { success: true, message: '更新成功' }
  },
  
  deletePolicy: async (id: number) => {
    log.debug('删除政策:', id)
    return { success: true, message: '删除成功' }
  },
  
  batchDeletePolicies: async (ids: number[]) => {
    log.debug('批量删除政策:', ids)
    return { success: true, message: '批量删除成功' }
  },
  
  calculateRebate: async (data: any) => {
    log.debug('计算返点:', data)
    // 模拟计算结果
    const result = {
      baseAmount: data.baseAmount,
      rebateAmount: data.baseAmount * 0.05,
      rebateRate: 5,
      appliedTier: null
    }
    return { success: true, data: result, message: '计算成功' }
  }
}

// 类型定义
interface RebatePolicy {
  id: number
  policyName: string
  policyType: 'percentage' | 'fixed' | 'tiered'
  description: string
  baseAmount: number
  percentage: number
  fixedAmount: number
  tiers: Array<{ threshold: [number, number]; rate: number }>
  status: 'active' | 'inactive'
  updatedAt: string
}

interface Tier {
  threshold: [number, number]
  rate: number
}

// 响应式数据
const loading = ref(false)
const dialogVisible = ref(false)
const calculateVisible = ref(false)
const isEdit = ref(false)
const submitLoading = ref(false)
const calculateLoading = ref(false)

const searchForm = reactive({
  policyName: '',
  policyType: '',
  status: ''
})

const policyList = ref<RebatePolicy[]>([])
const selectedIds = ref<number[]>([])

const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

const formData = reactive({
  id: '',
  policyName: '',
  policyType: 'percentage' as 'percentage' | 'fixed' | 'tiered',
  description: '',
  baseAmount: 0,
  percentage: 0,
  fixedAmount: 0,
  tiers: [] as Tier[],
  status: 'active'
})

const formRules = {
  policyName: [{ required: true, message: '请输入政策名称', trigger: 'blur' }],
  policyType: [{ required: true, message: '请选择政策类型', trigger: 'change' }]
}

const calculateForm = reactive({
  policyId: '',
  baseAmount: 0
})

const calculateResult = ref<any>(null)

const formRef = ref<FormInstance>()

// 方法
const handleSearch = () => {
  pagination.currentPage = 1
  loadPolicies()
}

const handleReset = () => {
  searchForm.policyName = ''
  searchForm.policyType = ''
  searchForm.status = ''
  pagination.currentPage = 1
  loadPolicies()
}

const handleCreate = () => {
  isEdit.value = false
  Object.assign(formData, {
    id: '',
    policyName: '',
    policyType: 'percentage',
    description: '',
    baseAmount: 0,
    percentage: 0,
    fixedAmount: 0,
    tiers: [],
    status: 'active'
  })
  dialogVisible.value = true
}

const handleBatchDelete = async () => {
  if (selectedIds.value.length === 0) {
    ElMessage.warning('请选择要删除的数据')
    return
  }
  
  try {
    await ElMessageBox.confirm('确认删除选中的返点政策？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const response = await rebatePolicyConfigApi.batchDeletePolicies(selectedIds.value)
    if (response.success) {
      ElMessage.success(response.message)
      selectedIds.value = []
      loadPolicies()
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    // 用户取消删除
  }
}

const handleSelectionChange = (selection: RebatePolicy[]) => {
  selectedIds.value = selection.map(item => item.id)
}

const getPolicyTypeColor = (type: string): 'success' | 'primary' | 'warning' | 'danger' | 'info' => {
  const colorMap: { [key: string]: 'success' | 'primary' | 'warning' | 'danger' | 'info' } = {
    percentage: 'primary',
    fixed: 'success',
    tiered: 'warning'
  }
  return colorMap[type] || 'info'
}

const getPolicyTypeLabel = (type: string) => {
  const labelMap: { [key: string]: string } = {
    percentage: '百分比',
    fixed: '固定金额',
    tiered: '阶梯式'
  }
  return labelMap[type] || type
}

const getStatusColor = (status: string): 'success' | 'primary' | 'warning' | 'danger' | 'info' => {
  const colorMap: { [key: string]: 'success' | 'primary' | 'warning' | 'danger' | 'info' } = {
    active: 'success',
    inactive: 'info'
  }
  return colorMap[status] || 'info'
}

const getStatusLabel = (status: string) => {
  const labelMap: { [key: string]: string } = {
    active: '启用',
    inactive: '禁用'
  }
  return labelMap[status] || status
}

const formatCurrency = (amount: number) => {
  return `¥${amount.toFixed(2)}`
}

const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString()
}

const handleEdit = (row: RebatePolicy) => {
  isEdit.value = true
  Object.assign(formData, {
    ...row,
    tiers: row.tiers || []
  })
  dialogVisible.value = true
}

const handleCalculate = (row: RebatePolicy) => {
  calculateForm.policyId = row.id.toString()
  calculateForm.baseAmount = 0
  calculateResult.value = null
  calculateVisible.value = true
}

const handleDelete = async (row: RebatePolicy) => {
  try {
    await ElMessageBox.confirm('确认删除该返点政策？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const response = await rebatePolicyConfigApi.deletePolicy(row.id)
    if (response.success) {
      ElMessage.success(response.message)
      loadPolicies()
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    // 用户取消删除
  }
}

const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  pagination.currentPage = 1
  loadPolicies()
}

const handleCurrentChange = (page: number) => {
  pagination.currentPage = page
  loadPolicies()
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
  } catch (error) {
    return
  }
  
  submitLoading.value = true
  try {
    const requestData = {
      policyName: formData.policyName,
      policyType: formData.policyType,
      description: formData.description,
      baseAmount: formData.baseAmount,
      percentage: formData.percentage,
      fixedAmount: formData.fixedAmount,
      status: formData.status,
      tiers: formData.tiers
    }
    
    let response
    if (isEdit.value && formData.id) {
      response = await rebatePolicyConfigApi.updatePolicy(Number(formData.id), requestData)
    } else {
      response = await rebatePolicyConfigApi.createPolicy(requestData)
    }
    
    if (response.success) {
      ElMessage.success(response.message)
      dialogVisible.value = false
      loadPolicies()
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    ElMessage.error('保存失败')
  } finally {
    submitLoading.value = false
  }
}

const handleTypeChange = (type: string) => {
  if (type === 'percentage') {
    formData.fixedAmount = 0
    formData.tiers = []
  } else if (type === 'fixed') {
    formData.percentage = 0
    formData.tiers = []
  } else if (type === 'tiered') {
    formData.percentage = 0
    formData.fixedAmount = 0
  }
}

const addTier = () => {
  formData.tiers.push({
    threshold: [0, 1000] as [number, number],
    rate: 0
  })
}

const removeTier = (index: number) => {
  formData.tiers.splice(index, 1)
}

const handleCalculateSubmit = async () => {
  calculateLoading.value = true
  try {
    const requestData = {
      policyId: Number(calculateForm.policyId),
      baseAmount: calculateForm.baseAmount
    }
    
    const response = await rebatePolicyConfigApi.calculateRebate(requestData)
    if (response.success) {
      calculateResult.value = response.data
      ElMessage.success(response.message)
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    ElMessage.error('计算失败')
  } finally {
    calculateLoading.value = false
  }
}

// 数据加载方法
const loadPolicies = async () => {
  loading.value = true
  try {
    const params = {
      policyName: searchForm.policyName || undefined,
      policyType: searchForm.policyType || undefined,
      status: searchForm.status || undefined,
      page: pagination.currentPage,
      pageSize: pagination.pageSize
    }
    
    const response = await rebatePolicyConfigApi.getPolicies(params)
    if (response.success) {
      policyList.value = response.data.items as RebatePolicy[]
      pagination.total = response.data.total
    } else {
      ElMessage.error(response.message)
    }
  } catch (error) {
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadPolicies()
})
</script>

<style scoped>
.rebate-policy-config {
  padding: 20px;
}

.search-card {
  margin-bottom: 20px;
}

.action-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.tier-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  padding: 10px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}

.calculate-result {
  margin-top: 20px;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.calculate-result h4 {
  margin: 0 0 10px 0;
  color: #303133;
}

.calculate-result p {
  margin: 5px 0;
  color: #606266;
}
</style>