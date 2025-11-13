<template>
  <el-dialog
    v-model="visible"
    title="数据导入"
    width="70%"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="import-dialog">
      <!-- 导入步骤 -->
      <el-steps :active="currentStep" finish-status="success" align-center>
        <el-step title="选择文件" />
        <el-step title="数据验证" />
        <el-step title="导入执行" />
        <el-step title="完成" />
      </el-steps>

      <!-- 步骤内容 -->
      <div class="step-content">
        <!-- 步骤1: 文件选择 -->
        <div v-if="currentStep === 0" class="step-panel">
          <el-card header="选择导入文件">
            <div class="file-upload-area">
              <el-upload
                ref="uploadRef"
                class="upload-demo"
                drag
                :auto-upload="false"
                :on-change="handleFileChange"
                :before-upload="beforeUpload"
                accept=".xlsx,.xls,.csv"
                :limit="1"
              >
                <el-icon class="el-icon--upload"><upload-filled /></el-icon>
                <div class="el-upload__text">
                  将文件拖到此处，或<em>点击上传</em>
                </div>
                <template #tip>
                  <div class="el-upload__tip">
                    支持 .xlsx, .xls, .csv 格式，文件大小不超过 10MB
                  </div>
                </template>
              </el-upload>
            </div>

            <div v-if="selectedFile" class="file-info">
              <h4>已选择文件:</h4>
              <div class="file-details">
                <el-icon><document /></el-icon>
                <span>{{ selectedFile.name }}</span>
                <span class="file-size">({{ formatFileSize(selectedFile.size) }})</span>
                <el-button type="text" @click="removeFile">移除</el-button>
              </div>
            </div>

            <!-- 导入配置 -->
            <div class="import-config">
              <h4>导入配置:</h4>
              <el-form :model="importConfig" label-width="120px">
                <el-form-item label="数据源类型">
                  <el-radio-group v-model="importConfig.dataSource">
                    <el-radio value="private">私域达人</el-radio>
                    <el-radio value="public">公海达人</el-radio>
                  </el-radio-group>
                </el-form-item>
                
                <el-form-item label="重复处理">
                  <el-select v-model="importConfig.duplicateHandling" placeholder="选择重复数据处理方式">
                    <el-option label="跳过重复数据" value="skip" />
                    <el-option label="更新重复数据" value="update" />
                    <el-option label="覆盖重复数据" value="overwrite" />
                  </el-select>
                </el-form-item>
                
                <el-form-item label="批量大小">
                  <el-input-number
                    v-model="importConfig.batchSize"
                    :min="10"
                    :max="1000"
                    :step="10"
                  />
                  <span class="form-tip">每批处理的记录数，建议100-500</span>
                </el-form-item>
              </el-form>
            </div>

            <!-- 模板下载 -->
            <div class="template-section">
              <h4>导入模板:</h4>
              <p>请下载对应的模板文件，按照模板格式准备数据</p>
              <div class="template-buttons">
                <el-button type="primary" @click="downloadTemplate('private')">
                  <el-icon><download /></el-icon>
                  私域达人模板
                </el-button>
                <el-button type="success" @click="downloadTemplate('public')">
                  <el-icon><download /></el-icon>
                  公海达人模板
                </el-button>
              </div>
            </div>
          </el-card>
        </div>

        <!-- 步骤2: 数据验证 -->
        <div v-if="currentStep === 1" class="step-panel">
          <el-card header="数据验证">
            <div v-if="validationLoading" class="validation-loading">
              <el-icon class="is-loading"><loading /></el-icon>
              <span>正在验证数据...</span>
            </div>

            <div v-else-if="validationResult" class="validation-result">
              <div class="validation-summary">
                <div class="summary-item success">
                  <el-icon><circle-check /></el-icon>
                  <span>有效记录: {{ validationResult.validCount }}</span>
                </div>
                <div class="summary-item error">
                  <el-icon><circle-close /></el-icon>
                  <span>错误记录: {{ validationResult.errorCount }}</span>
                </div>
                <div class="summary-item warning">
                  <el-icon><warning /></el-icon>
                  <span>警告记录: {{ validationResult.warningCount }}</span>
                </div>
              </div>

              <!-- 错误详情 -->
              <div v-if="validationResult.errors.length > 0" class="error-details">
                <h4>错误详情:</h4>
                <el-table :data="validationResult.errors" height="300">
                  <el-table-column prop="row" label="行号" width="80" />
                  <el-table-column prop="field" label="字段" width="120" />
                  <el-table-column prop="message" label="错误信息" />
                  <el-table-column prop="value" label="原始值" width="150" show-overflow-tooltip />
                </el-table>
              </div>

              <!-- 数据预览 -->
              <div class="data-preview">
                <h4>数据预览 (前10条):</h4>
                <el-table :data="validationResult.preview" height="300">
                  <el-table-column prop="account_name" label="账号名称" width="150" />
                  <el-table-column prop="platform" label="平台" width="100" />
                  <el-table-column prop="followers_w" label="粉丝(万)" width="100" />
                  <el-table-column prop="org_name" label="机构" width="120" />
                  <el-table-column prop="category" label="类型" width="100" />
                  <el-table-column label="状态" width="100">
                    <template #default="{ row }">
                      <el-tag v-if="row._status === 'valid'" type="success">有效</el-tag>
                      <el-tag v-else-if="row._status === 'error'" type="danger">错误</el-tag>
                      <el-tag v-else type="warning">警告</el-tag>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </div>
          </el-card>
        </div>

        <!-- 步骤3: 导入执行 -->
        <div v-if="currentStep === 2" class="step-panel">
          <el-card header="导入执行">
            <div class="import-progress">
              <div class="progress-info">
                <h4>导入进度:</h4>
                <el-progress
                  :percentage="importProgress.percentage"
                  :status="importProgress.status"
                  :stroke-width="8"
                />
                <div class="progress-details">
                  <span>已处理: {{ importProgress.processed }} / {{ importProgress.total }}</span>
                  <span>成功: {{ importProgress.success }}</span>
                  <span>失败: {{ importProgress.failed }}</span>
                </div>
              </div>

              <div class="import-logs">
                <h4>导入日志:</h4>
                <div class="log-container">
                  <div
                    v-for="(log, index) in importLogs"
                    :key="index"
                    :class="['log-item', log.type]"
                  >
                    <span class="log-time">{{ formatTime(log.time) }}</span>
                    <span class="log-message">{{ log.message }}</span>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </div>

        <!-- 步骤4: 完成 -->
        <div v-if="currentStep === 3" class="step-panel">
          <el-card header="导入完成">
            <div class="import-result">
              <div class="result-summary">
                <el-result
                  :icon="importResult.isSuccess ? 'success' : 'error'"
                  :title="importResult.isSuccess ? '导入成功' : '导入失败'"
                  :sub-title="importResult.message"
                >
                  <template #extra>
                    <div class="result-stats">
                      <div class="stat-item">
                        <span class="stat-label">总记录数:</span>
                        <span class="stat-value">{{ importResult.total }}</span>
                      </div>
                      <div class="stat-item">
                        <span class="stat-label">成功导入:</span>
                        <span class="stat-value success">{{ importResult.successCount }}</span>
                      </div>
                      <div class="stat-item">
                        <span class="stat-label">导入失败:</span>
                        <span class="stat-value error">{{ importResult.failedCount }}</span>
                      </div>
                      <div class="stat-item">
                        <span class="stat-label">耗时:</span>
                        <span class="stat-value">{{ importResult.duration }}秒</span>
                      </div>
                    </div>
                  </template>
                </el-result>
              </div>

              <!-- 失败记录下载 -->
              <div v-if="importResult.failedCount > 0" class="failed-records">
                <el-button type="warning" @click="downloadFailedRecords">
                  <el-icon><download /></el-icon>
                  下载失败记录
                </el-button>
              </div>
            </div>
          </el-card>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button v-if="currentStep > 0" @click="prevStep">上一步</el-button>
        <el-button @click="handleClose">
          {{ currentStep === 3 ? '关闭' : '取消' }}
        </el-button>
        <!-- 静默导入按钮：在步骤1（验证完成）时显示 -->
        <el-button
          v-if="currentStep === 1 && validationResult && validationResult.errorCount === 0"
          type="warning"
          :loading="silentImportLoading"
          @click="startSilentImport"
        >
          <el-icon><bell /></el-icon>
          静默导入
        </el-button>
        <el-button
          v-if="currentStep < 3"
          type="primary"
          :loading="stepLoading"
          :disabled="!canNextStep"
          @click="nextStep"
        >
          {{ getNextButtonText() }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UploadFilled, Document, Download, Loading, CircleCheck, CircleClose, Warning, Bell } from '@element-plus/icons-vue'
import type { UploadFile, UploadInstance } from 'element-plus'
import { 
  type ImportTask,
  type ImportError,
  DataSource
} from '../../../types/kol-match.types'
import { FileUploadApi } from '../../../api/kol-match.api'
import { startAsyncImport } from '../../../api/import-async'

// Props & Emits
interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'import-completed'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 响应式数据
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const uploadRef = ref<UploadInstance>()
const currentStep = ref(0)
const stepLoading = ref(false)
const validationLoading = ref(false)
const silentImportLoading = ref(false)

// 文件相关
const selectedFile = ref<File | null>(null)
const fileId = ref<string | null>(null)

// 导入配置
const importConfig = reactive({
  dataSource: 'private' as DataSource,
  duplicateHandling: 'skip',
  batchSize: 100
})

// 验证结果
const validationResult = ref<{
  validCount: number
  errorCount: number
  warningCount: number
  errors: ImportError[]
  preview: any[]
} | null>(null)

// 导入进度
const importProgress = reactive({
  percentage: 0,
  status: 'active' as 'active' | 'success' | 'exception',
  processed: 0,
  total: 0,
  success: 0,
  failed: 0
})

// 导入日志
const importLogs = ref<Array<{
  time: Date
  type: 'info' | 'success' | 'error' | 'warning'
  message: string
}>>([])

// 导入结果
const importResult = reactive({
  isSuccess: false,
  message: '',
  total: 0,
  successCount: 0,
  failedCount: 0,
  duration: 0
})

// 计算属性
const canNextStep = computed(() => {
  switch (currentStep.value) {
    case 0:
      return fileId.value !== null
    case 1:
      return validationResult.value !== null && validationResult.value.errorCount === 0
    case 2:
      return importProgress.percentage === 100
    default:
      return false
  }
})

// 方法
const handleFileChange = async (file: UploadFile) => {
  selectedFile.value = file.raw || null
  
  if (selectedFile.value) {
    try {
      stepLoading.value = true
      console.log('[ImportDialog] 开始上传文件:', selectedFile.value.name)
      const response = await FileUploadApi.uploadExcel(selectedFile.value)
      console.log('[ImportDialog] 文件上传响应:', response)
      
      // 处理上传响应：响应拦截器可能已经提取过data字段
      let uploadData: any = null
      if (response && typeof response === 'object') {
        // 检查是否已经被提取成 data 字段
        if ((response as any).fileId !== undefined) {
          // 已经被提取，直接使用
          uploadData = response
        } else if ((response as any).data) {
          // 还在嵌套结构中，提取data字段
          uploadData = (response as any).data
        }
      }
      
      console.log('[ImportDialog] 解析后的上传数据:', uploadData)
      
      if (uploadData && uploadData.fileId) {
        fileId.value = uploadData.fileId
        const rowCount = uploadData.rowCount || 0
        
        // 优化提示信息，展示已完成的步骤
        ElMessage.success(`文件解析完成，共${rowCount}条记录`)
        console.log('[ImportDialog] 文件上传成功，fileId:', fileId.value)
        
        // 自动触发数据验证流程
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // 调用验证
        console.log('[ImportDialog] 开始验证数据')
        validationLoading.value = true
        const type = importConfig.dataSource === DataSource.PRIVATE ? 'private' : 'public'
        console.log('[ImportDialog] 验证类型:', type)
        
        if (!fileId.value) {
          throw new Error('文件ID不存在')
        }
        const validateResponse = await FileUploadApi.validateImportData(fileId.value, type)
        console.log('[ImportDialog] 验证响应:', validateResponse)
        console.log('[ImportDialog] 验证响应 JSON:', JSON.stringify(validateResponse, null, 2))
        
        // 处理响应：可能已经被回调中间件提取过了数据字段
        let validationData: any = null
        if (validateResponse && typeof validateResponse === 'object') {
          // 先检查是否已经被提取成 data 字段
          if ((validateResponse as any).validCount !== undefined) {
            // 已经被提取，直接使用
            validationData = validateResponse
          } else if ((validateResponse as any).data) {
            // 根据指定的 dataField 提取
            validationData = (validateResponse as any).data
          }
        }
        
        console.log('[ImportDialog] 解析后的验证数据:', validationData)
        
        if (validationData && (validationData as any).validCount !== undefined) {
          const data = validationData as any
          console.log('[ImportDialog] 验证数据:', data)
          validationResult.value = {
            validCount: data.validCount || 0,
            errorCount: data.errorCount || 0,
            warningCount: data.warningCount || 0,
            errors: data.errors || [],
            preview: data.preview || []
          }
          
          if (data.errorCount > 0) {
            ElMessage.warning(`数据验证完成，发现 ${data.errorCount} 个错误，请检查并修正数据`)
            // 跳转到验证步骤让用户查看错误
            await new Promise(resolve => setTimeout(resolve, 500))
            currentStep.value = 1
          } else {
            ElMessage.success(`数据验证成功，共 ${data.validCount} 条有效记录，请选择导入方式`)
            // 跳转到验证步骤，让用户选择"静默导入"或"开始导入"
            console.log('[ImportDialog] 验证成功，跳转到步骤1让用户选择导入方式')
            await new Promise(resolve => setTimeout(resolve, 500))
            currentStep.value = 1
            console.log('[ImportDialog] 已跳转到步骤1（数据验证）')
          }
        } else {
          console.error('[ImportDialog] 验证响应数据格式错误:', validateResponse)
          throw new Error('数据验证响应格式错误')
        }
      } else {
        console.error('[ImportDialog] 上传响应数据格式错误，未找到fileId:', response)
        throw new Error('文件上传响应格式错误')
      }
    } catch (error) {
      console.error('[ImportDialog] 整个流程错误:', error)
      let errorMsg = '文件处理失败'
      
      if (error instanceof Error) {
        errorMsg = error.message
      } else if (typeof error === 'object' && error !== null) {
        errorMsg = (error as any).message || (error as any).msg || JSON.stringify(error)
      }
      
      console.error('[ImportDialog] 错误类庋:', typeof error, '错误内容:', error)
      ElMessage.error('文件处理失败: ' + errorMsg)
      selectedFile.value = null
      fileId.value = null
      uploadRef.value?.clearFiles()
    } finally {
      stepLoading.value = false
      validationLoading.value = false
    }
  }
}

const beforeUpload = (file: File) => {
  const isValidType = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
                       'application/vnd.ms-excel', 
                       'text/csv'].includes(file.type)
  const isValidSize = file.size / 1024 / 1024 < 10

  if (!isValidType) {
    ElMessage.error('只支持 Excel 和 CSV 文件!')
    return false
  }
  if (!isValidSize) {
    ElMessage.error('文件大小不能超过 10MB!')
    return false
  }
  return false // 阻止自动上传
}

const removeFile = () => {
  selectedFile.value = null
  fileId.value = null
  uploadRef.value?.clearFiles()
}

const formatFileSize = (size: number) => {
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB'
  return (size / 1024 / 1024).toFixed(1) + ' MB'
}

const downloadTemplate = async (type: 'private' | 'public') => {
  try {
    // 统一字段名称格式，与后端映射逻辑保持一致
    const templateData = type === 'private' ? 
      '达人昵称,平台,账号,主页链接,粉丝数(万),机构名称,类目,星图报价21-60s,星图报价60s+,是否独家,返点政策,返点范围,政策等级,返点周期,结算周期,备注\n' +
      '示例达人,抖音,123456,https://example.com,100,示例机构,生活,1000,2000,是,有,10-15%,A,月结,月结,示例备注'
      :
      '达人昵称,平台,账号,主页链接,粉丝数(万),机构名称,类目,备注\n' +
      '公海达人,抖音,789012,https://example.com,200,公海机构,美食,公海示例'

    const blob = new Blob(['\ufeff' + templateData], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${type === 'private' ? '私域' : '公海'}达人导入模板.csv`
    link.click()
    URL.revokeObjectURL(url)
    
    ElMessage.success('模板下载成功')
  } catch (error) {
    ElMessage.error('模板下载失败')
  }
}

const validateData = async () => {
  if (!fileId.value) {
    ElMessage.error('请先上传文件')
    return
  }

  validationLoading.value = true
  try {
    const type = importConfig.dataSource === DataSource.PRIVATE ? 'private' : 'public'
    console.log('[ImportDialog] validateData - 开始验证数据，类型:', type, 'fileId:', fileId.value)
    
    const response = await FileUploadApi.validateImportData(fileId.value, type)
    console.log('[ImportDialog] validateData - 验证响应:', response)
    console.log('[ImportDialog] validateData - 验证响应 JSON:', JSON.stringify(response, null, 2))
    
    // 处理响应：使用与handleFileChange相同的逻辑
    let validationData: any = null
    if (response && typeof response === 'object') {
      // 先检查是否已经被提取成 data 字段
      if ((response as any).validCount !== undefined) {
        // 已经被提取，直接使用
        validationData = response
        console.log('[ImportDialog] validateData - 使用直接响应数据')
      } else if ((response as any).data) {
        // 根据指定的 dataField 提取
        validationData = (response as any).data
        console.log('[ImportDialog] validateData - 从data字段提取数据')
      }
    }
    
    console.log('[ImportDialog] validateData - 解析后的验证数据:', validationData)
    
    if (validationData && (validationData as any).validCount !== undefined) {
      const data = validationData as any
      console.log('[ImportDialog] validateData - 设置验证结果:', data)
      
      validationResult.value = {
        validCount: data.validCount || 0,
        errorCount: data.errorCount || 0,
        warningCount: data.warningCount || 0,
        errors: data.errors || [],
        preview: data.preview || []
      }
      
      if (data.errorCount > 0) {
        ElMessage.warning(`数据验证完成，发现 ${data.errorCount} 个错误，请检查并修正数据`)
      } else {
        ElMessage.success(`数据验证成功，共 ${data.validCount} 条有效记录`)
      }
    } else {
      console.error('[ImportDialog] validateData - 验证响应数据格式错误:', response)
      throw new Error('数据验证响应格式错误')
    }
  } catch (error) {
    console.error('[ImportDialog] validateData - 验证错误:', error)
    ElMessage.error(error instanceof Error ? error.message : '数据验证失败')
    validationResult.value = null
  } finally {
    validationLoading.value = false
  }
}

const executeImport = async () => {
  if (!fileId.value || !validationResult.value) {
    ElMessage.error('请先验证数据')
    return
  }

  // 重置进度
  Object.assign(importProgress, {
    percentage: 0,
    status: 'active',
    processed: 0,
    total: validationResult.value.validCount,
    success: 0,
    failed: 0
  })
  
  importLogs.value = []
  
  try {
    const startTime = Date.now()
    addLog('info', '开始导入数据...')
    
    const type = importConfig.dataSource === DataSource.PRIVATE ? 'private' : 'public'
    const response = await FileUploadApi.importData(fileId.value, type)
    
    if (response.code === 200 && response.data) {
      const data = response.data
      
      // 更新进度
      importProgress.percentage = 100
      importProgress.processed = data.total || 0
      importProgress.success = data.successCount || 0
      importProgress.failed = data.failedCount || 0
      importProgress.status = data.failedCount === 0 ? 'success' : 'active'
      
      // 更新结果
      const duration = data.duration ? Math.round(data.duration / 1000) : Math.round((Date.now() - startTime) / 1000)
      
      Object.assign(importResult, {
        isSuccess: data.isSuccess || data.failedCount === 0,
        message: data.message || `导入完成，成功 ${data.successCount} 条，失败 ${data.failedCount} 条`,
        total: data.total || 0,
        successCount: data.successCount || 0,
        failedCount: data.failedCount || 0,
        duration: duration
      })
      
      addLog('success', `导入完成，成功 ${data.successCount} 条，失败 ${data.failedCount} 条`)
      addLog('info', `导入完成，耗时 ${duration} 秒`)
      
      if (data.isSuccess || data.failedCount === 0) {
        ElMessage.success(`数据导入成功，共导入 ${data.successCount} 条记录`)
        // 自动进入完成步骤
        setTimeout(() => {
          currentStep.value = 3
        }, 1000)
      } else {
        ElMessage.warning(`导入完成，部分数据导入失败，成功导入 ${data.successCount} 条记录`)
        // 自动进入完成步骤
        setTimeout(() => {
          currentStep.value = 3
        }, 1000)
      }
    } else {
      throw new Error(response.message || '数据导入失败')
    }
    
  } catch (error) {
    importProgress.status = 'exception'
    addLog('error', error instanceof Error ? error.message : '导入过程中发生错误')
    ElMessage.error(error instanceof Error ? error.message : '导入失败')
    
    Object.assign(importResult, {
      isSuccess: false,
      message: error instanceof Error ? error.message : '导入失败',
      total: validationResult.value?.validCount || 0,
      successCount: 0,
      failedCount: validationResult.value?.validCount || 0,
      duration: Math.round((Date.now() - Date.now()) / 1000)
    })
  }
}

const addLog = (type: 'info' | 'success' | 'error' | 'warning', message: string) => {
  importLogs.value.push({
    time: new Date(),
    type,
    message
  })
}

const formatTime = (time: Date) => {
  return time.toLocaleTimeString()
}

const downloadFailedRecords = () => {
  // 检查是否有导入失败记录
  if (!importResult.value || !importResult.value.failedRecords || importResult.value.failedRecords.length === 0) {
    ElMessage.warning('没有失败记录可下载')
    return
  }

  // 构建 CSV头部
  const headers = ['行号', '错误信息', '达人昵称', '平台', '账号', '粉丝数(万)', '机构名称', '类目']
  
  // 构建CSV数据行
  const csvRows = importResult.value.failedRecords.map(record => {
    const row = record.row || ''
    const error = record.error || ''
    const data = record.data || {}
    
    // 转义CSV中的特殊字符
    const escapeCSV = (str: string | number) => {
      const strValue = String(str)
      if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        return `"${strValue.replace(/"/g, '""')}"`
      }
      return strValue
    }
    
    return [
      row,
      escapeCSV(error),
      escapeCSV(data['达人昵称'] || data['account_name'] || ''),
      escapeCSV(data['平台'] || data['platform'] || ''),
      escapeCSV(data['账号'] || data['account_id'] || ''),
      escapeCSV(data['粉丝数(万)'] || data['followers_w'] || ''),
      escapeCSV(data['机构名称'] || data['org_name'] || ''),
      escapeCSV(data['类目'] || data['category'] || '')
    ].join(',')
  })
  
  // 组合完整的CSV内容
  const csvContent = [headers.join(','), ...csvRows].join('\n')
  
  // 添加BOM以支持中文
  const bom = '\uFEFF'
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `导入失败记录_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('失败记录下载成功')
}

const nextStep = async () => {
  stepLoading.value = true
  try {
    switch (currentStep.value) {
      case 0:
        // 验证数据
        await validateData()
        // 如果验证成功且没有错误，自动进入导入步骤（步骤2）
        if (validationResult.value && validationResult.value.errorCount === 0) {
          setTimeout(() => {
            currentStep.value = 2
            // 自动开始导入
            executeImport()
          }, 1500)
        } else {
          // 有错误时，跳转到验证步骤让用户查看错误
          setTimeout(() => {
            currentStep.value = 1
          }, 1500)
        }
        break
      case 1:
        // 从验证步骤进入导入步骤
        currentStep.value = 2
        await executeImport()
        break
      case 2:
        // 查看结果，进入完成步骤
        currentStep.value = 3
        break
    }
  } catch (error) {
    ElMessage.error('操作失败: ' + (error instanceof Error ? error.message : '未知错误'))
  } finally {
    stepLoading.value = false
  }
}

const prevStep = () => {
  if (currentStep.value > 0) {
    currentStep.value--
  }
}

const getNextButtonText = () => {
  switch (currentStep.value) {
    case 0:
      return '验证数据'
    case 1:
      return '开始导入'
    case 2:
      return '查看结果'
    default:
      return '下一步'
  }
}

const startSilentImport = async () => {
  if (!fileId.value || !selectedFile.value) {
    ElMessage.error('请先上传文件')
    return
  }

  try {
    silentImportLoading.value = true
    
    const type = importConfig.dataSource === DataSource.PRIVATE ? 'private' : 'public'
    const fileName = selectedFile.value.name
    
    const result = await startAsyncImport({
      fileId: fileId.value,
      type,
      fileName
    })
    
    ElMessage.success({
      message: `静默导入任务已启动！任务ID: ${result.taskId}`,
      duration: 5000,
      showClose: true
    })
    
    ElMessageBox.alert(
      `<div style="line-height: 1.8;">
        <p><strong>导入任务已在后台启动</strong></p>
        <p>任务ID: <code>${result.taskId}</code></p>
        <p>总记录数: ${result.totalRows} 条</p>
        <p>预计耗时: ${Math.round(result.estimatedDuration / 60)} 分钟</p>
        <p style="margin-top: 12px; color: #67c23a;">
          ✓ 您现在可以关闭此窗口，导入将在后台继续进行
        </p>
        <p style="color: #909399;">
          可在"导入历史"页面查看进度和结果
        </p>
      </div>`,
      '静默导入已启动',
      {
        dangerouslyUseHTMLString: true,
        confirmButtonText: '查看导入历史',
        cancelButtonText: '关闭',
        showCancelButton: true,
        type: 'success'
      }
    ).then(() => {
      // 跳转到导入历史页面
      window.location.href = '/#/import-history'
    }).catch(() => {
      // 用户点击关闭，直接关闭对话框
      handleClose()
    })
    
  } catch (error) {
    console.error('启动静默导入失败:', error)
    ElMessage.error(error instanceof Error ? error.message : '启动静默导入失败')
  } finally {
    silentImportLoading.value = false
  }
}

const handleClose = () => {
  const wasSuccessful = currentStep.value === 3 && importResult.isSuccess
  
  visible.value = false
  // 重置状态
  currentStep.value = 0
  selectedFile.value = null
  fileId.value = null
  validationResult.value = null
  importLogs.value = []
  Object.assign(importProgress, {
    percentage: 0,
    status: 'active',
    processed: 0,
    total: 0,
    success: 0,
    failed: 0
  })
  Object.assign(importResult, {
    isSuccess: false,
    message: '',
    total: 0,
    successCount: 0,
    failedCount: 0,
    duration: 0
  })
  uploadRef.value?.clearFiles()
  
  // 确保在关闭对话框时触发导入完成事件
  if (wasSuccessful) {
    emit('import-completed')
  }
}
</script>

<style scoped>
.import-dialog {
  padding: 20px 0;
}

.step-content {
  margin-top: 30px;
}

.step-panel {
  min-height: 400px;
}

.file-upload-area {
  margin-bottom: 20px;
}

.file-info {
  margin: 20px 0;
  padding: 15px;
  background: #f5f7fa;
  border-radius: 4px;
}

.file-details {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.file-size {
  color: #666;
  font-size: 12px;
}

.import-config {
  margin: 30px 0;
}

.form-tip {
  color: #666;
  font-size: 12px;
  margin-left: 10px;
}

.template-section {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

.template-buttons {
  margin-top: 10px;
}

.template-buttons .el-button {
  margin-right: 10px;
}

.validation-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 50px;
  gap: 10px;
}

.validation-summary {
  display: flex;
  gap: 30px;
  margin-bottom: 20px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 15px;
  border-radius: 4px;
}

.summary-item.success {
  background: #f0f9ff;
  color: #67c23a;
}

.summary-item.error {
  background: #fef0f0;
  color: #f56c6c;
}

.summary-item.warning {
  background: #fdf6ec;
  color: #e6a23c;
}

.error-details,
.data-preview {
  margin-top: 20px;
}

.import-progress {
  padding: 20px 0;
}

.progress-info {
  margin-bottom: 30px;
}

.progress-details {
  display: flex;
  gap: 20px;
  margin-top: 10px;
  color: #666;
}

.log-container {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 10px;
  background: #fafafa;
}

.log-item {
  display: flex;
  gap: 10px;
  margin-bottom: 5px;
  font-size: 12px;
}

.log-time {
  color: #999;
  min-width: 80px;
}

.log-item.info .log-message {
  color: #666;
}

.log-item.success .log-message {
  color: #67c23a;
}

.log-item.error .log-message {
  color: #f56c6c;
}

.log-item.warning .log-message {
  color: #e6a23c;
}

.result-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin-top: 20px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 4px;
}

.stat-value.success {
  color: #67c23a;
}

.stat-value.error {
  color: #f56c6c;
}

.failed-records {
  margin-top: 20px;
  text-align: center;
}

.dialog-footer {
  text-align: right;
}
</style>