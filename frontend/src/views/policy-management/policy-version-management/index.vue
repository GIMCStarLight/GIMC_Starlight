<template>
  <div class="page-container">
    <div class="content-card">
      <!-- 页面标题 -->
      <div class="simple-page-header">
        <div class="header-content">
          <h1 class="page-title">政策版本管理</h1>
        </div>
      </div>
      
      <!-- 搜索和操作区域 -->
      <el-card class="search-card" shadow="never">
        <el-form :model="searchForm" inline>
          <el-form-item label="政策名称">
            <el-input
              v-model="searchForm.policyName"
              placeholder="请输入政策名称"
              clearable
              style="width: 200px"
            />
          </el-form-item>
          <el-form-item label="政策类型">
            <el-select
              v-model="searchForm.policyType"
              placeholder="请选择政策类型"
              clearable
              style="width: 150px"
            >
              <el-option label="隐私政策" value="privacy" />
              <el-option label="用户协议" value="terms" />
              <el-option label="退款政策" value="refund" />
              <el-option label="数据政策" value="data" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select
              v-model="searchForm.status"
              placeholder="请选择状态"
              clearable
              style="width: 120px"
            >
              <el-option label="活跃" value="active" />
              <el-option label="草稿" value="draft" />
              <el-option label="已废弃" value="deprecated" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="Search" @click="handleSearch" :loading="loading">
              搜索
            </el-button>
            <el-button :icon="Refresh" @click="handleReset"> 重置 </el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 政策列表 -->
      <el-card class="table-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>政策列表</span>
            <el-button type="primary" :icon="Plus" @click="handleCreatePolicy">
              新建政策
            </el-button>
          </div>
        </template>

        <el-table
          :data="policyList"
          :loading="loading"
          @row-click="handleRowClick"
          style="width: 100%"
        >
          <el-table-column prop="name" label="政策名称" min-width="200">
            <template #default="{ row }">
              <div class="policy-name">
                <span class="name">{{ row.name }}</span>
                <el-tag :type="getPolicyTypeColor(row.type)" size="small" class="type-tag">
                  {{ getPolicyTypeLabel(row.type) }}
                </el-tag>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="currentVersion" label="当前版本" width="120">
            <template #default="{ row }">
              <el-tag type="success" size="small"> v{{ row.currentVersion }} </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="totalVersions" label="版本数量" width="100">
            <template #default="{ row }">
              <span class="version-count">{{ row.totalVersions }} 个版本</span>
            </template>
          </el-table-column>

          <el-table-column prop="lastModified" label="最后修改" width="180">
            <template #default="{ row }">
              <div class="last-modified">
                <div>{{ formatDateTime(row.lastModified) }}</div>
                <div class="modifier">{{ row.lastModifier }}</div>
              </div>
            </template>
          </el-table-column>

          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusColor(row.status)" size="small">
                {{ getStatusLabel(row.status) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" size="small" @click.stop="handleViewVersions(row)">
                版本历史
              </el-button>
              <el-button type="success" size="small" @click.stop="handleCreateVersion(row)">
                新建版本
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-wrapper">
          <el-pagination
            :current-page="pagination.page"
            :page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </el-card>

      <!-- 版本历史对话框 -->
      <el-dialog
        v-model="versionHistoryVisible"
        :title="`${selectedPolicy?.name} - 版本历史`"
        width="80%"
        top="5vh"
      >
        <div class="version-history-content">
          <!-- 版本操作栏 -->
          <div class="version-actions">
            <el-button
              type="primary"
              :icon="Plus"
              @click="handleCreateVersion(selectedPolicy || undefined)"
            >
              创建新版本
            </el-button>
            <el-button
              type="info"
              :icon="DocumentCopy"
              @click="handleCompareVersions"
              :disabled="selectedVersions.length !== 2"
            >
              版本对比 ({{ selectedVersions.length }}/2)
            </el-button>
          </div>

          <!-- 版本时间线 -->
          <div class="version-timeline">
            <el-timeline>
              <el-timeline-item
                v-for="version in versionHistory"
                :key="version.id"
                :timestamp="formatDateTime(version.createdAt)"
                :type="version.isActive ? 'primary' : 'info'"
                :hollow="!version.isActive"
              >
                <el-card class="version-card" :class="{ active: version.isActive }">
                  <div class="version-header">
                    <div class="version-info">
                      <span class="version-number">版本 {{ version.versionNumber }}</span>
                      <el-tag v-if="version.isActive" type="success" size="small">
                        当前活跃
                      </el-tag>
                      <el-tag v-else type="info" size="small">
                        {{ getVersionStatusLabel(version.status) }}
                      </el-tag>
                    </div>
                    <div class="version-actions-inline">
                      <el-checkbox v-model="selectedVersions" :value="version.id">
                        选择对比
                      </el-checkbox>
                      <el-button type="text" size="small" @click="handleViewVersionDetail(version)">
                        查看详情
                      </el-button>
                      <el-button
                        v-if="!version.isActive"
                        type="text"
                        size="small"
                        @click="handleActivateVersion(version)"
                      >
                        激活版本
                      </el-button>
                    </div>
                  </div>
                  <div class="version-content">
                    <p><strong>变更内容：</strong>{{ version.changeDescription }}</p>
                    <p><strong>变更原因：</strong>{{ version.changeReason }}</p>
                    <p><strong>变更人：</strong>{{ version.createdBy }}</p>
                    <p v-if="version.effectiveDate">
                      <strong>生效时间：</strong>{{ formatDateTime(version.effectiveDate) }}
                    </p>
                  </div>
                </el-card>
              </el-timeline-item>
            </el-timeline>
          </div>
        </div>
      </el-dialog>

      <!-- 版本详情对话框 -->
      <el-dialog
        v-model="versionDetailVisible"
        :title="`版本详情 - v${selectedVersion?.versionNumber}`"
        width="70%"
      >
        <div v-if="selectedVersion" class="version-detail">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="版本号">
              {{ selectedVersion.versionNumber }}
            </el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="selectedVersion.isActive ? 'success' : 'info'">
                {{
                  selectedVersion.isActive ? '活跃' : getVersionStatusLabel(selectedVersion.status)
                }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">
              {{ formatDateTime(selectedVersion.createdAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="创建人">
              {{ selectedVersion.createdBy }}
            </el-descriptions-item>
            <el-descriptions-item label="生效时间">
              {{
                selectedVersion.effectiveDate
                  ? formatDateTime(selectedVersion.effectiveDate)
                  : '立即生效'
              }}
            </el-descriptions-item>
            <el-descriptions-item label="变更原因">
              {{ selectedVersion.changeReason }}
            </el-descriptions-item>
          </el-descriptions>

          <div class="version-content-section">
            <h4>变更内容</h4>
            <div class="content-preview">
              {{ selectedVersion.changeDescription }}
            </div>
          </div>

          <div class="version-content-section">
            <h4>完整内容</h4>
            <div class="content-preview full-content">
              {{ selectedVersion.content }}
            </div>
          </div>
        </div>
      </el-dialog>

      <!-- 版本对比对话框 -->
      <el-dialog v-model="compareVersionsVisible" title="版本对比" width="90%" top="5vh">
        <div v-if="compareVersionsData.length === 2" class="version-compare">
          <div class="compare-header">
            <div class="version-info">
              <h4>版本 {{ compareVersionsData[0].versionNumber }}</h4>
              <p>{{ formatDateTime(compareVersionsData[0].createdAt) }}</p>
            </div>
            <div class="vs-divider">VS</div>
            <div class="version-info">
              <h4>版本 {{ compareVersionsData[1].versionNumber }}</h4>
              <p>{{ formatDateTime(compareVersionsData[1].createdAt) }}</p>
            </div>
          </div>

          <div class="compare-content">
            <div class="compare-section">
              <h5>基本信息对比</h5>
              <el-table :data="getCompareBasicInfo()" border>
                <el-table-column prop="field" label="字段" width="150" />
                <el-table-column
                  prop="version1"
                  :label="`v${compareVersionsData[0].versionNumber}`"
                />
                <el-table-column
                  prop="version2"
                  :label="`v${compareVersionsData[1].versionNumber}`"
                />
              </el-table>
            </div>

            <div class="compare-section">
              <h5>内容对比</h5>
              <div class="content-diff">
                <div class="diff-column">
                  <h6>版本 {{ compareVersionsData[0].versionNumber }}</h6>
                  <div class="content-box">
                    {{ compareVersionsData[0].content }}
                  </div>
                </div>
                <div class="diff-column">
                  <h6>版本 {{ compareVersionsData[1].versionNumber }}</h6>
                  <div class="content-box">
                    {{ compareVersionsData[1].content }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-dialog>

      <!-- 创建新版本对话框 -->
      <el-dialog
        v-model="createVersionVisible"
        :title="isEditingPolicy ? '新建政策' : `创建新版本 - ${selectedPolicy?.name}`"
        width="60%"
      >
        <el-form
          ref="versionFormRef"
          :model="versionForm"
          :rules="versionRules"
          label-width="120px"
        >
          <el-form-item v-if="isEditingPolicy" label="政策名称" prop="policyName">
            <el-input v-model="versionForm.policyName" placeholder="请输入政策名称" />
          </el-form-item>

          <el-form-item v-if="isEditingPolicy" label="政策类型" prop="policyType">
            <el-select v-model="versionForm.policyType" placeholder="请选择政策类型">
              <el-option label="隐私政策" value="privacy" />
              <el-option label="用户协议" value="terms" />
              <el-option label="退款政策" value="refund" />
              <el-option label="数据政策" value="data" />
            </el-select>
          </el-form-item>

          <el-form-item label="基于版本" prop="baseVersion">
            <el-select
              v-model="versionForm.baseVersion"
              placeholder="请选择基于的版本"
              :disabled="isEditingPolicy"
            >
              <el-option
                v-for="version in versionHistory"
                :key="version.id"
                :label="`v${version.versionNumber} (${formatDateTime(version.createdAt)})`"
                :value="version.id"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="版本号" prop="versionNumber">
            <el-input
              v-model="versionForm.versionNumber"
              placeholder="版本号将自动生成"
              :disabled="autoGenerateVersion"
            >
              <template #append>
                <el-checkbox v-model="autoGenerateVersion">自动生成</el-checkbox>
              </template>
            </el-input>
          </el-form-item>

          <el-form-item label="变更内容" prop="changeDescription">
            <el-input
              v-model="versionForm.changeDescription"
              type="textarea"
              :rows="3"
              placeholder="请描述本次版本的主要变更内容"
            />
          </el-form-item>

          <el-form-item label="变更原因" prop="changeReason">
            <el-input
              v-model="versionForm.changeReason"
              type="textarea"
              :rows="2"
              placeholder="请说明变更的原因或背景"
            />
          </el-form-item>

          <el-form-item label="政策内容" prop="content">
            <el-input
              v-model="versionForm.content"
              type="textarea"
              :rows="8"
              placeholder="请输入完整的政策内容"
            />
          </el-form-item>

          <el-form-item label="生效时间">
            <el-radio-group v-model="effectiveType">
              <el-radio value="immediate">立即生效</el-radio>
              <el-radio value="scheduled">定时生效</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item v-if="effectiveType === 'scheduled'" label="生效时间" prop="effectiveDate">
            <el-date-picker
              v-model="versionForm.effectiveDate"
              type="datetime"
              placeholder="选择生效时间"
              format="YYYY-MM-DD HH:mm:ss"
              value-format="YYYY-MM-DD HH:mm:ss"
            />
          </el-form-item>

          <el-form-item label="创建后操作">
            <el-checkbox v-model="activateAfterCreate">创建后立即激活此版本</el-checkbox>
          </el-form-item>
        </el-form>

        <template #footer>
          <el-button @click="createVersionVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmitVersion" :loading="submitLoading">
            {{ isEditingPolicy ? '创建政策' : '创建版本' }}
          </el-button>
        </template>
      </el-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import { Search, Refresh, Plus, DocumentCopy } from '@element-plus/icons-vue'

// 定义页面名称
defineOptions({
  name: 'PolicyVersionManagement',
})

// 接口定义
interface Policy {
  id: number
  name: string
  type: string
  currentVersion: string
  totalVersions: number
  lastModified: string
  lastModifier: string
  status: string
}

interface PolicyVersion {
  id: number
  policyId: number
  versionNumber: string
  content: string
  changeDescription: string
  changeReason: string
  createdAt: string
  createdBy: string
  effectiveDate?: string
  isActive: boolean
  status: string
}

interface SearchForm {
  policyName: string
  policyType: string
  status: string
}

interface VersionForm {
  policyName: string
  policyType: string
  baseVersion: number | null
  versionNumber: string
  changeDescription: string
  changeReason: string
  content: string
  effectiveDate: string
}

interface Pagination {
  page: number
  pageSize: number
  total: number
}

// 响应式数据
const loading = ref(false)
const submitLoading = ref(false)
const versionHistoryVisible = ref(false)
const versionDetailVisible = ref(false)
const compareVersionsVisible = ref(false)
const createVersionVisible = ref(false)
const isEditingPolicy = ref(false)
const autoGenerateVersion = ref(true)
const effectiveType = ref('immediate')
const activateAfterCreate = ref(false)

const versionFormRef = ref<FormInstance>()
const selectedPolicy = ref<Policy | null>(null)
const selectedVersion = ref<PolicyVersion | null>(null)
const selectedVersions = ref<number[]>([])
const compareVersionsData = ref<PolicyVersion[]>([])

const policyList = ref<Policy[]>([])
const versionHistory = ref<PolicyVersion[]>([])

const searchForm = reactive<SearchForm>({
  policyName: '',
  policyType: '',
  status: '',
})

const pagination = reactive<Pagination>({
  page: 1,
  pageSize: 20,
  total: 0,
})

const versionForm = reactive<VersionForm>({
  policyName: '',
  policyType: '',
  baseVersion: null,
  versionNumber: '',
  changeDescription: '',
  changeReason: '',
  content: '',
  effectiveDate: '',
})

// 表单验证规则
const versionRules = {
  policyName: [{ required: true, message: '请输入政策名称', trigger: 'blur' }],
  policyType: [{ required: true, message: '请选择政策类型', trigger: 'change' }],
  versionNumber: [{ required: true, message: '请输入版本号', trigger: 'blur' }],
  changeDescription: [{ required: true, message: '请输入变更内容', trigger: 'blur' }],
  changeReason: [{ required: true, message: '请输入变更原因', trigger: 'blur' }],
  content: [{ required: true, message: '请输入政策内容', trigger: 'blur' }],
  effectiveDate: [{ required: true, message: '请选择生效时间', trigger: 'change' }],
}

// 模拟API调用函数
const fetchPolicies = async () => {
  try {
    loading.value = true
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 模拟数据
    const mockData = [
      {
        id: 1,
        name: '用户隐私政策',
        type: 'privacy',
        currentVersion: '2.1.0',
        totalVersions: 5,
        lastModified: '2024-01-15 14:30:00',
        lastModifier: '张三',
        status: 'active'
      },
      {
        id: 2,
        name: '服务条款',
        type: 'terms',
        currentVersion: '1.3.2',
        totalVersions: 8,
        lastModified: '2024-01-10 09:15:00',
        lastModifier: '李四',
        status: 'active'
      },
      {
        id: 3,
        name: '退款政策',
        type: 'refund',
        currentVersion: '1.0.1',
        totalVersions: 2,
        lastModified: '2023-12-20 16:45:00',
        lastModifier: '王五',
        status: 'draft'
      }
    ]
    
    policyList.value = mockData
    pagination.total = mockData.length
  } catch (error) {
    log.error('获取政策列表失败:', error)
    ElMessage.error('获取政策列表失败')
  } finally {
    loading.value = false
  }
}

// 获取版本历史
const fetchVersionHistory = async (policyId: number) => {
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 模拟版本历史数据
    const mockVersions = [
      {
        id: 1,
        policyId,
        versionNumber: '2.1.0',
        content: '这是最新版本的政策内容...',
        changeDescription: '更新了数据收集条款',
        changeReason: '符合最新法规要求',
        createdAt: '2024-01-15 14:30:00',
        createdBy: '张三',
        effectiveDate: '2024-01-16 00:00:00',
        isActive: true,
        status: 'active'
      },
      {
        id: 2,
        policyId,
        versionNumber: '2.0.0',
        content: '这是上一版本的政策内容...',
        changeDescription: '重构了整体结构',
        changeReason: '提升用户体验',
        createdAt: '2023-12-01 10:00:00',
        createdBy: '李四',
        isActive: false,
        status: 'deprecated'
      }
    ]
    
    versionHistory.value = mockVersions
  } catch (error) {
    log.error('获取版本历史失败:', error)
    ElMessage.error('获取版本历史失败')
  }
}

// 处理搜索
const handleSearch = async () => {
  pagination.page = 1
  await fetchPolicies()
}

// 处理重置
const handleReset = () => {
  searchForm.policyName = ''
  searchForm.policyType = ''
  searchForm.status = ''
  handleSearch()
}

// 处理行点击
const handleRowClick = (row: Policy) => {
  selectedPolicy.value = row
  handleViewVersions(row)
}

// 查看版本历史
const handleViewVersions = async (policy: Policy) => {
  selectedPolicy.value = policy
  await fetchVersionHistory(policy.id)
  versionHistoryVisible.value = true
}

// 创建新政策
const handleCreatePolicy = () => {
  isEditingPolicy.value = true
  resetVersionForm()
  createVersionVisible.value = true
}

// 创建新版本
const handleCreateVersion = (policy?: Policy) => {
  if (policy) {
    selectedPolicy.value = policy
  }
  isEditingPolicy.value = false
  resetVersionForm()
  createVersionVisible.value = true
}

// 查看版本详情
const handleViewVersionDetail = (version: PolicyVersion) => {
  selectedVersion.value = version
  versionDetailVisible.value = true
}

// 激活版本
const handleActivateVersion = async (version: PolicyVersion) => {
  try {
    await ElMessageBox.confirm(`确定要激活版本 ${version.versionNumber} 吗？`, '确认激活', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    ElMessage.success('版本激活成功')
    await fetchVersionHistory(version.policyId)
    await fetchPolicies()
  } catch (error) {
    if (error !== 'cancel') {
      log.error('激活版本失败:', error)
      ElMessage.error('激活版本失败')
    }
  }
}

// 分页处理
const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  pagination.page = 1
  fetchPolicies()
}

const handleCurrentChange = (page: number) => {
  pagination.page = page
  fetchPolicies()
}

// 版本对比
const handleCompareVersions = async () => {
  if (selectedVersions.value.length !== 2) {
    ElMessage.warning('请选择2个版本进行对比')
    return
  }

  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 获取选中的版本数据
    const versions = versionHistory.value.filter(v => selectedVersions.value.includes(v.id))
    compareVersionsData.value = versions
    compareVersionsVisible.value = true
  } catch (error) {
    log.error('版本对比失败:', error)
    ElMessage.error('版本对比失败')
  }
}

// 提交版本表单
const handleSubmitVersion = async () => {
  try {
    await versionFormRef.value!.validate()
    submitLoading.value = true

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    if (isEditingPolicy.value) {
      ElMessage.success('政策创建成功')
      await fetchPolicies()
    } else {
      ElMessage.success('版本创建成功')
      await fetchVersionHistory(selectedPolicy.value!.id)
      await fetchPolicies()
    }

    createVersionVisible.value = false
  } catch (error) {
    log.error('提交失败:', error)
    ElMessage.error('提交失败')
  } finally {
    submitLoading.value = false
  }
}

// 重置版本表单
const resetVersionForm = () => {
  versionForm.policyName = ''
  versionForm.policyType = ''
  versionForm.baseVersion = null
  versionForm.versionNumber = ''
  versionForm.changeDescription = ''
  versionForm.changeReason = ''
  versionForm.content = ''
  versionForm.effectiveDate = ''
  autoGenerateVersion.value = true
  effectiveType.value = 'immediate'
  activateAfterCreate.value = false
}

// 格式化日期时间
const formatDateTime = (dateTime: string) => {
  if (!dateTime) return '-'
  return new Date(dateTime).toLocaleString('zh-CN')
}

// 获取政策类型标签
const getPolicyTypeLabel = (type: string) => {
  const typeMap: Record<string, string> = {
    privacy: '隐私政策',
    terms: '服务条款',
    refund: '退款政策',
    data: '数据政策',
  }
  return typeMap[type] || type
}

// 获取政策类型颜色
const getPolicyTypeColor = (type: string) => {
  const colorMap: Record<string, string> = {
    privacy: 'primary',
    terms: 'success',
    refund: 'warning',
    data: 'info',
  }
  return colorMap[type] || 'default'
}

// 获取状态标签
const getStatusLabel = (status: string) => {
  const statusMap: Record<string, string> = {
    active: '生效中',
    draft: '草稿',
    deprecated: '已废弃',
    pending: '待生效',
  }
  return statusMap[status] || status
}

// 获取状态颜色
const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    active: 'success',
    draft: 'warning',
    deprecated: 'danger',
  }
  return colors[status] || 'info'
}

// 获取版本状态标签
const getVersionStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    active: '活跃',
    deprecated: '已废弃',
    draft: '草稿',
  }
  return labels[status] || status
}

// 监听自动生成版本号
const generateVersionNumber = computed(() => {
  if (!autoGenerateVersion.value) return versionForm.versionNumber

  if (versionHistory.value.length === 0) {
    return '1.0.0'
  }

  const latestVersion = versionHistory.value[0]?.versionNumber || '1.0.0'
  const parts = latestVersion.split('.').map(Number)
  parts[2] = (parts[2] || 0) + 1

  return parts.join('.')
})

// 获取对比基本信息
const getCompareBasicInfo = () => {
  if (compareVersionsData.value.length !== 2) return []
  const [v1, v2] = compareVersionsData.value
  return [
    { field: '版本号', version1: v1.versionNumber, version2: v2.versionNumber },
    {
      field: '创建时间',
      version1: formatDateTime(v1.createdAt),
      version2: formatDateTime(v2.createdAt),
    },
    {
      field: '创建人',
      version1: v1.createdBy,
      version2: v2.createdBy,
    },
    {
      field: '状态',
      version1: getVersionStatusLabel(v1.status),
      version2: getVersionStatusLabel(v2.status),
    },
  ]
}

// 生命周期
onMounted(() => {
  fetchPolicies()
})
</script>

<style scoped>
.page-container {
  padding: 24px;
import { log } from '#/utils/logger';
  background-color: #f5f7fa;
  min-height: 100vh;
}

.content-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
}

.simple-page-header {
  padding: 24px 24px 0;
  border-bottom: 1px solid #e4e7ed;
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  margin: 0 0 16px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.search-card {
  margin: 0 24px 24px;
  border: none;
  box-shadow: none;
  background: #f8f9fa;
}

.table-card {
  margin: 0 24px 24px;
  border: none;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.policy-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.policy-name .name {
  font-weight: 500;
}

.type-tag {
  margin-left: 8px;
}

.version-count {
  color: #909399;
  font-size: 12px;
}

.last-modified {
  font-size: 12px;
}

.last-modified .modifier {
  color: #909399;
  margin-top: 2px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.version-history-content {
  max-height: 70vh;
  overflow-y: auto;
}

.version-actions {
  margin-bottom: 20px;
  display: flex;
  gap: 12px;
}

.version-timeline {
  padding: 0 20px;
}

.version-card {
  margin-bottom: 16px;
  transition: all 0.3s;
}

.version-card.active {
  border-color: #409eff;
  box-shadow: 0 2px 12px 0 rgba(64, 158, 255, 0.15);
}

.version-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.version-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.version-number {
  font-weight: 600;
  font-size: 16px;
}

.version-actions-inline {
  display: flex;
  align-items: center;
  gap: 8px;
}

.version-content p {
  margin: 4px 0;
  font-size: 14px;
  line-height: 1.5;
}

.version-detail {
  padding: 20px 0;
}

.version-content-section {
  margin-top: 24px;
}

.version-content-section h4 {
  margin: 0 0 12px 0;
  color: #303133;
}

.content-preview {
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 12px;
  font-size: 14px;
  line-height: 1.6;
  max-height: 200px;
  overflow-y: auto;
}

.content-preview.full-content {
  max-height: 300px;
}

.version-compare {
  padding: 20px 0;
}

.compare-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  padding: 0 20px;
}

.version-info h4 {
  margin: 0 0 4px 0;
  color: #303133;
}

.version-info p {
  margin: 0;
  color: #909399;
  font-size: 12px;
}

.vs-divider {
  background: #409eff;
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 600;
}

.compare-content {
  padding: 0 20px;
}

.compare-section {
  margin-bottom: 24px;
}

.compare-section h5 {
  margin: 0 0 12px 0;
  color: #303133;
}

.content-diff {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.diff-column h6 {
  margin: 0 0 8px 0;
  color: #606266;
}

.content-box {
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 12px;
  font-size: 14px;
  line-height: 1.6;
  min-height: 200px;
  max-height: 300px;
  overflow-y: auto;
}
</style>