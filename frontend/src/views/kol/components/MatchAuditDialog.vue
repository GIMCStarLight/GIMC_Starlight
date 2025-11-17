<template>
  <el-dialog
    v-model="visible"
    title="匹配审核"
    width="80%"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="audit-dialog">
      <!-- 私域达人信息 -->
      <el-card class="kol-info-card" header="私域达人信息">
        <div class="kol-info" v-if="kolData">
          <div class="info-row">
            <div class="info-item">
              <label>账号名称:</label>
              <span>{{ kolData.accountName }}</span>
            </div>
            <div class="info-item">
              <label>平台:</label>
              <span>{{ kolData.platform }}</span>
            </div>
            <div class="info-item">
              <label>粉丝数:</label>
              <span>{{ kolData.followersW }}万</span>
            </div>
          </div>
          <div class="info-row">
            <div class="info-item">
              <label>机构:</label>
              <span>{{ kolData.orgName || '-' }}</span>
            </div>
            <div class="info-item">
              <label>类型:</label>
              <span>{{ kolData.category || '-' }}</span>
            </div>
            <div class="info-item">
              <label>备注:</label>
              <span>{{ kolData.remark || '-' }}</span>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 匹配候选列表 -->
      <el-card class="candidates-card" header="匹配候选">
        <div class="candidates-header">
          <span>找到 {{ candidates.length }} 个匹配候选</span>
          <div class="filter-controls">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索候选"
              size="small"
              style="width: 200px"
              clearable
            />
            <el-select
              v-model="confidenceFilter"
              placeholder="置信度筛选"
              size="small"
              style="width: 150px; margin-left: 10px"
              clearable
            >
              <el-option label="高置信度 (>0.8)" value="high" />
              <el-option label="中置信度 (0.6-0.8)" value="medium" />
              <el-option label="低置信度 (<0.6)" value="low" />
            </el-select>
          </div>
        </div>

        <el-table
          :data="filteredCandidates"
          @selection-change="handleCandidateSelection"
          height="400"
        >
          <el-table-column type="selection" width="55" />
          
          <el-table-column prop="publicKolName" label="公海达人" width="150" />
          <el-table-column prop="platform" label="平台" width="80" />
          <el-table-column prop="followersW" label="粉丝(万)" width="100" sortable />
          
          <el-table-column prop="confidence" label="置信度" width="100" sortable>
            <template #default="{ row }">
              <div class="confidence-cell">
                <el-progress
                  :percentage="Math.round(row.confidence * 100)"
                  :color="getConfidenceColor(row.confidence)"
                  :stroke-width="6"
                  text-inside
                />
              </div>
            </template>
          </el-table-column>
          
          <el-table-column prop="matchReason" label="匹配原因" width="200" show-overflow-tooltip />
          
          <el-table-column label="相似度详情" width="150">
            <template #default="{ row }">
              <el-popover placement="top" width="300" trigger="hover">
                <div class="similarity-details">
                  <div class="detail-item">
                    <span>名称相似度:</span>
                    <el-progress :percentage="Math.round(row.nameSimilarity * 100)" size="small" />
                  </div>
                  <div class="detail-item">
                    <span>粉丝数匹配:</span>
                    <el-progress :percentage="Math.round(row.followersSimilarity * 100)" size="small" />
                  </div>
                  <div class="detail-item">
                    <span>平台匹配:</span>
                    <el-progress :percentage="row.platformMatch ? 100 : 0" size="small" />
                  </div>
                </div>
                <template #reference>
                  <el-button size="small" type="text">查看详情</el-button>
                </template>
              </el-popover>
            </template>
          </el-table-column>
          
          <el-table-column prop="orgName" label="机构" width="120" show-overflow-tooltip />
          <el-table-column prop="category" label="类型" width="100" />
          
          <el-table-column label="操作" width="120">
            <template #default="{ row }">
              <el-button
                size="small"
                type="success"
                @click="confirmSingleMatch(row)"
              >
                确认匹配
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>

      <!-- 审核意见 -->
      <el-card class="review-card" header="审核意见">
        <el-form :model="reviewForm" label-width="100px">
          <el-form-item label="审核结果">
            <el-radio-group v-model="reviewForm.decision">
              <el-radio value="approve">通过</el-radio>
              <el-radio value="reject">拒绝</el-radio>
              <el-radio value="need_info">需要更多信息</el-radio>
            </el-radio-group>
          </el-form-item>
          
          <el-form-item label="审核意见">
            <el-input
              v-model="reviewForm.comment"
              type="textarea"
              :rows="3"
              placeholder="请输入审核意见..."
            />
          </el-form-item>
          
          <el-form-item v-if="reviewForm.decision === 'approve'" label="选择匹配">
            <div class="selected-matches">
              <div v-if="selectedCandidates.length === 0" class="no-selection">
                请从上方候选列表中选择要确认的匹配
              </div>
              <div v-else>
                <div
                  v-for="candidate in selectedCandidates"
                  :key="candidate.id"
                  class="selected-match-item"
                >
                  <span>{{ candidate.publicKolName }}</span>
                  <span class="confidence">置信度: {{ (candidate.confidence * 100).toFixed(1) }}%</span>
                  <el-button
                    size="small"
                    type="text"
                    @click="removeSelectedCandidate(candidate)"
                  >
                    移除
                  </el-button>
                </div>
              </div>
            </div>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="submitReview"
          :disabled="!canSubmit"
        >
          提交审核
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  type ExtendedKolInfo,
  type MatchCandidate,
  ReviewStatus
} from '../../../types/kol-match.types'
import { KolMatchApi } from '../../../api/kol-match.api'

// 扩展的候选类型，用于显示
interface DisplayCandidate extends MatchCandidate {
  id: string
  publicKolName: string
  platform: string
  followersW: number
  matchReason: string
  nameSimilarity: number
  followersSimilarity: number
  platformMatch: boolean
  orgName: string
  category: string
  createdAt: string
}

// Props & Emits
interface Props {
  modelValue: boolean
  kolData: ExtendedKolInfo | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'audit-completed'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 响应式数据
const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const submitting = ref(false)
const searchKeyword = ref('')
const confidenceFilter = ref('')

// 候选数据
const candidates = ref<DisplayCandidate[]>([])
const selectedCandidates = ref<DisplayCandidate[]>([])

// 审核表单
const reviewForm = reactive({
  decision: 'approve',
  comment: '',
  selectedMatches: [] as string[]
})

// 计算属性
const filteredCandidates = computed(() => {
  let filtered = candidates.value

  // 关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter(candidate =>
      candidate.publicKolName.toLowerCase().includes(keyword) ||
      candidate.matchReason.toLowerCase().includes(keyword)
    )
  }

  // 置信度筛选
  if (confidenceFilter.value) {
    filtered = filtered.filter(candidate => {
      switch (confidenceFilter.value) {
        case 'high':
          return candidate.confidence > 0.8
        case 'medium':
          return candidate.confidence >= 0.6 && candidate.confidence <= 0.8
        case 'low':
          return candidate.confidence < 0.6
        default:
          return true
      }
    })
  }

  return filtered
})

const canSubmit = computed(() => {
  if (reviewForm.decision === 'approve') {
    return selectedCandidates.value.length > 0
  }
  return reviewForm.comment.trim().length > 0
})

// 监听器
watch(() => props.modelValue, (newVal) => {
  if (newVal && props.kolData) {
    loadCandidates()
  }
})

watch(() => props.kolData, (newVal) => {
  if (newVal && props.modelValue) {
    loadCandidates()
  }
})

// 方法
const loadCandidates = async () => {
  if (!props.kolData) return

  try {
    // 生成模拟候选数据
    const mockCandidates: DisplayCandidate[] = []
    for (let i = 1;
import { log } from '#/utils/logger'; i <= 5; i++) {
      mockCandidates.push({
        id: `candidate-${i}`,
        publicAuthorId: `public-${i}`,
        publicKolName: `公海达人${i}`,
        platform: props.kolData.platform,
        followersW: props.kolData.followersW + Math.floor(Math.random() * 20) - 10,
        confidence: Math.random() * 0.4 + 0.6, // 0.6-1.0
        method: 'similarity_match',
        details: {
          nameSimilarity: Math.random() * 0.3 + 0.7,
          followersSimilarity: Math.random() * 0.3 + 0.7,
          platformMatch: true
        },
        matchReason: `名称相似度高，粉丝数接近`,
        nameSimilarity: Math.random() * 0.3 + 0.7,
        followersSimilarity: Math.random() * 0.3 + 0.7,
        platformMatch: true,
        orgName: `机构${i}`,
        category: props.kolData.category || '生活',
        createdAt: new Date().toISOString()
      })
    }
    
    candidates.value = mockCandidates.sort((a, b) => b.confidence - a.confidence)
  } catch (error) {
    log.error('加载候选失败:', error)
    ElMessage.error('加载匹配候选失败')
  }
}

const handleCandidateSelection = (selection: DisplayCandidate[]) => {
  selectedCandidates.value = selection
}

const confirmSingleMatch = async (candidate: DisplayCandidate) => {
  try {
    await ElMessageBox.confirm(
      `确定要将"${props.kolData?.accountName}"匹配到"${candidate.publicKolName}"吗？`,
      '确认匹配',
      { type: 'warning' }
    )

    if (!props.kolData) return

    await KolMatchApi.confirmMatch(props.kolData.id, {
      publicAuthorId: candidate.publicAuthorId
    })

    ElMessage.success('匹配确认成功')
    emit('audit-completed')
    handleClose()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('确认匹配失败: ' + (error?.message || '未知错误'))
    }
  }
}

const removeSelectedCandidate = (candidate: DisplayCandidate) => {
  const index = selectedCandidates.value.findIndex(c => c.id === candidate.id)
  if (index > -1) {
    selectedCandidates.value.splice(index, 1)
  }
}

const submitReview = async () => {
  if (!props.kolData) return

  submitting.value = true
  try {
    if (reviewForm.decision === 'approve') {
      // 批量确认匹配
      for (const candidate of selectedCandidates.value) {
        await KolMatchApi.confirmMatch(props.kolData.id, {
          publicAuthorId: candidate.publicAuthorId
        })
      }
      ElMessage.success('审核通过，匹配已确认')
    } else if (reviewForm.decision === 'reject') {
      // 拒绝匹配
      await KolMatchApi.rejectMatch(props.kolData.id, {
        publicAuthorId: selectedCandidates.value[0]?.publicAuthorId || '',
        remark: reviewForm.comment
      })
      ElMessage.success('审核拒绝已提交')
    } else {
      // 需要更多信息
      ElMessage.info('已标记为需要更多信息')
    }

    emit('audit-completed')
    handleClose()
  } catch (error: any) {
    ElMessage.error('提交审核失败: ' + (error?.message || '未知错误'))
  } finally {
    submitting.value = false
  }
}

const handleClose = () => {
  visible.value = false
  // 重置表单
  reviewForm.decision = 'approve'
  reviewForm.comment = ''
  selectedCandidates.value = []
  searchKeyword.value = ''
  confidenceFilter.value = ''
}

// 辅助方法
const getConfidenceColor = (confidence: number) => {
  if (confidence >= 0.8) return '#67c23a'
  if (confidence >= 0.6) return '#e6a23c'
  return '#f56c6c'
}
</script>

<style scoped>
.audit-dialog {
  max-height: 70vh;
  overflow-y: auto;
}

.kol-info-card,
.candidates-card,
.review-card {
  margin-bottom: 20px;
}

.kol-info {
  padding: 10px 0;
}

.info-row {
  display: flex;
  margin-bottom: 15px;
}

.info-item {
  flex: 1;
  display: flex;
  align-items: center;
}

.info-item label {
  font-weight: bold;
  margin-right: 8px;
  min-width: 80px;
}

.candidates-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.filter-controls {
  display: flex;
  align-items: center;
}

.confidence-cell {
  padding: 5px 0;
}

.similarity-details {
  padding: 10px 0;
}

.detail-item {
  margin-bottom: 10px;
}

.detail-item span {
  display: inline-block;
  width: 100px;
  font-size: 12px;
  margin-bottom: 5px;
}

.selected-matches {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 10px;
  min-height: 60px;
}

.no-selection {
  color: #999;
  text-align: center;
  padding: 20px 0;
}

.selected-match-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 8px;
}

.selected-match-item:last-child {
  margin-bottom: 0;
}

.confidence {
  color: #666;
  font-size: 12px;
}

.dialog-footer {
  text-align: right;
}
</style>