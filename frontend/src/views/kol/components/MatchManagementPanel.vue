<template>
  <el-drawer
    v-model="visible"
    title="批量匹配管理"
    size="60%"
    direction="rtl"
    @close="handleClose"
  >
    <div class="match-panel">
      <!-- 匹配配置 -->
      <el-card class="config-card" header="匹配配置">
        <el-form :model="matchConfig" label-width="120px">
          <el-form-item label="批次大小">
            <el-input-number 
              v-model="matchConfig.batchSize" 
              :min="10" 
              :max="1000" 
              :step="10"
            />
            <span class="form-tip">每批处理的达人数量</span>
          </el-form-item>
          
          <el-form-item label="最低置信度">
            <el-slider 
              v-model="matchConfig.minConfidence" 
              :min="0" 
              :max="1" 
              :step="0.05"
              show-input
            />
            <span class="form-tip">低于此置信度的匹配将被过滤</span>
          </el-form-item>
          
          <el-form-item label="启用缓存">
            <el-switch v-model="matchConfig.enableCache" />
            <span class="form-tip">使用缓存可提高匹配速度</span>
          </el-form-item>
          
          <el-form-item label="目标平台">
            <el-select 
              v-model="matchConfig.platforms" 
              multiple 
              placeholder="选择要匹配的平台"
              style="width: 100%"
            >
              <el-option 
                v-for="platform in availablePlatforms" 
                :key="platform" 
                :label="platform" 
                :value="platform" 
              />
            </el-select>
          </el-form-item>
        </el-form>
        
        <div class="config-actions">
          <el-button 
            type="primary" 
            :loading="matching" 
            @click="startBatchMatch"
          >
            开始批量匹配
          </el-button>
          <el-button @click="resetConfig">重置配置</el-button>
        </div>
      </el-card>

      <!-- 匹配进度 -->
      <el-card v-if="matchProgress.show" class="progress-card" header="匹配进度">
        <div class="progress-info">
          <div class="progress-stats">
            <el-statistic title="总数" :value="matchProgress.total" />
            <el-statistic title="已处理" :value="matchProgress.processed" />
            <el-statistic title="成功匹配" :value="matchProgress.matched" />
            <el-statistic title="失败" :value="matchProgress.failed" />
          </div>
          
          <el-progress 
            :percentage="matchProgress.percentage" 
            :status="matchProgress.status === 'completed' ? 'success' : 'active'"
            :stroke-width="8"
          />
          
          <div class="progress-details">
            <p>当前状态: {{ matchProgress.statusText }}</p>
            <p v-if="matchProgress.estimatedTime">
              预计剩余时间: {{ matchProgress.estimatedTime }}
            </p>
          </div>
        </div>
      </el-card>

      <!-- 匹配结果 -->
      <el-card v-if="matchResults.length > 0" class="results-card" header="匹配结果">
        <el-table :data="matchResults" height="300">
          <el-table-column prop="privateKolName" label="私域达人" width="150" />
          <el-table-column prop="candidatesCount" label="候选数" width="80" />
          <el-table-column prop="bestConfidence" label="最佳置信度" width="100">
            <template #default="{ row }">
              <span v-if="row.bestConfidence">{{ (row.bestConfidence * 100).toFixed(1) }}%</span>
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column prop="bestMatchName" label="最佳匹配" width="150" />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getResultStatusType(row.status)">
                {{ getResultStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button 
                size="small" 
                type="primary" 
                @click="reviewMatch(row)"
                :disabled="row.candidatesCount === 0"
              >
                审核
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <div class="results-actions">
          <el-button @click="exportResults">导出结果</el-button>
          <el-button type="primary" @click="batchReview">批量审核</el-button>
        </div>
      </el-card>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  type BatchMatchParams
} from '../../../types/kol-match.types'
import { KolMatchApi } from '../../../api/kol-match.api'

// Props & Emits
interface Props {
  modelValue: boolean
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'match-completed'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 响应式数据
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const matching = ref(false)

// 匹配配置
const matchConfig = reactive<BatchMatchParams>({
  batchSize: 50,
  minConfidence: 0.7,
  enableCache: true,
  platforms: []
})

const availablePlatforms = ref(['抖音', '小红书', '微博', 'B站', '快手'])

// 匹配进度
const matchProgress = reactive({
  show: false,
  total: 0,
  processed: 0,
  matched: 0,
  failed: 0,
  percentage: 0,
  status: 'running',
  statusText: '运行中',
  estimatedTime: ''
})

// 匹配结果
const matchResults = ref<Array<{
  privateKolName: string
  candidatesCount: number
  bestConfidence: number | null
  bestMatchName: string
  status: string
}>>([])

// 方法
const startBatchMatch = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要开始批量匹配吗？这可能需要较长时间。',
      '确认批量匹配',
      { type: 'warning' }
    )
    
    matching.value = true
    matchProgress.show = true
    matchProgress.status = 'running'
    matchProgress.statusText = '正在启动匹配...'
    
    // 模拟批量匹配过程
    const response = await KolMatchApi.batchMatch(matchConfig)
    
    // 模拟进度更新
    simulateProgress()
    
    ElMessage.success('批量匹配已启动')
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('启动批量匹配失败: ' + (error?.message || '未知错误'))
      matchProgress.show = false
    }
  } finally {
    matching.value = false
  }
}

const simulateProgress = () => {
  // 模拟匹配进度
  matchProgress.total = 100
  matchProgress.processed = 0
  matchProgress.matched = 0
  matchProgress.failed = 0
  
  const interval = setInterval(() => {
    if (matchProgress.processed < matchProgress.total) {
      matchProgress.processed += Math.floor(Math.random() * 5) + 1
      matchProgress.matched += Math.floor(Math.random() * 3)
      matchProgress.failed += Math.floor(Math.random() * 2)
      matchProgress.percentage = Math.round((matchProgress.processed / matchProgress.total) * 100)
      
      if (matchProgress.processed >= matchProgress.total) {
        matchProgress.processed = matchProgress.total
        matchProgress.percentage = 100
        matchProgress.status = 'completed'
        matchProgress.statusText = '匹配完成'
        
        // 生成模拟结果
        generateMockResults()
        
        clearInterval(interval)
        emit('match-completed')
        ElMessage.success('批量匹配完成')
      }
    }
  }, 1000)
}

const generateMockResults = () => {
  const mockResults = []
  for (let i = 1; i <= 10; i++) {
    mockResults.push({
      privateKolName: `私域达人${i}`,
      candidatesCount: Math.floor(Math.random() * 5) + 1,
      bestConfidence: Math.random() * 0.4 + 0.6, // 0.6-1.0
      bestMatchName: `公海达人${i}`,
      status: Math.random() > 0.3 ? 'matched' : 'no_match'
    })
  }
  matchResults.value = mockResults
}

const resetConfig = () => {
  matchConfig.batchSize = 50
  matchConfig.minConfidence = 0.7
  matchConfig.enableCache = true
  matchConfig.platforms = []
}

const reviewMatch = (result: any) => {
  ElMessage.info(`审核匹配: ${result.privateKolName}`)
  // 这里可以触发审核对话框
}

const batchReview = () => {
  ElMessage.info('批量审核功能')
}

const exportResults = () => {
  ElMessage.info('导出结果功能')
}

const handleClose = () => {
  visible.value = false
}

// 辅助方法
const getResultStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    'matched': 'success',
    'no_match': 'warning',
    'failed': 'danger',
    'pending': 'info'
  }
  return typeMap[status] || 'info'
}

const getResultStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    'matched': '已匹配',
    'no_match': '无匹配',
    'failed': '失败',
    'pending': '待处理'
  }
  return textMap[status] || '未知'
}
</script>

<style scoped>
.match-panel {
  padding: 20px;
}

.config-card,
.progress-card,
.results-card {
  margin-bottom: 20px;
}

.form-tip {
  margin-left: 10px;
  color: #999;
  font-size: 12px;
}

.config-actions {
  margin-top: 20px;
  text-align: center;
}

.progress-info {
  margin-bottom: 20px;
}

.progress-stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 20px;
}

.progress-details {
  margin-top: 15px;
  color: #666;
}

.progress-details p {
  margin: 5px 0;
}

.results-actions {
  margin-top: 15px;
  text-align: center;
}

.results-actions .el-button {
  margin: 0 5px;
}
</style>