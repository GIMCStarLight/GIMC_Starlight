<template>
  <el-dialog
    v-model="visible"
    title="KOL详情"
    width="900px"
    :before-close="handleClose"
    destroy-on-close
  >
    <div v-loading="loading" class="kol-detail-content">
      <!-- 头部信息摘要 -->
      <div class="profile-header">
        <div class="avatar">
          <span>{{ (kolData.account_name || '-').slice(0, 1) }}</span>
        </div>
        <div class="info-group">
          <!-- 第一行：昵称 + 粉丝标签 -->
          <div class="info-row">
            <span class="kol-name">{{ kolData.account_name || '-' }}</span>
            <el-tag v-if="kolData.followers_w" size="small" class="category-tag">
              粉丝 {{ kolData.followers_w }} 万
            </el-tag>
          </div>
          <!-- 第二行：ID、机构、平台、达人类型 -->
          <div class="info-row">
            <span class="info-label">ID:</span>
            <span class="info-value">{{ kolData.account_id || '-' }}</span>

            <div class="divider">|</div>

            <span class="info-label">机构名</span>
            <el-tag size="small" class="category-tag">
              <template #icon>
                <el-icon><OfficeBuilding /></el-icon>
              </template>
              {{ kolData.org_name || '暂无机构' }}
            </el-tag>

            <div class="divider">|</div>

            <span class="info-label">平台</span>
            <el-tag size="small" class="category-tag">
               {{ kolData.platform || '-' }}
            </el-tag>

            <div class="divider">|</div>

            <span class="info-label">达人类型</span>
            <el-tag size="small" class="category-tag">
              {{ kolData.category || '未分类' }}
            </el-tag>
          </div>
          <!-- 第五行：主页链接 -->
          <div class="info-row">
            <span class="info-label">主页链接</span>
            <a v-if="kolData.home_link" :href="kolData.home_link" target="_blank" class="link">
              {{ kolData.home_link }}
            </a>
            <span v-else class="info-value">-</span>
          </div>
        </div>
      </div>

      <el-divider />

      <!-- 综合信息区域 - 同步状态、报价信息、合作信息统一放在一个卡片中 -->
      <div class="sync-status-section">
        <el-card :bordered="false" class="snapshot-card">
        <div class="snapshot-content">
          <!-- 同步状态区域 -->
          <div class="info-section">
            <div class="section-header">
              <h4>同步状态</h4>
              <div class="status-actions">
                <SyncStatusTag :status="kolData.match_status || 'unmatched'" size="default" />
                <el-button
                  v-if="canRetrySync"
                  type="primary"
                  size="small"
                  :loading="syncing"
                  @click="handleRetrySync"
                >
                  <el-icon><Refresh /></el-icon>
                  重新同步
                </el-button>
              </div>
            </div>

            <el-row :gutter="12" class="status-info">
              <el-col :span="12">
                <SingleCard
                  label="匹配置信度"
                  :value="kolData.match_confidence ? `${(kolData.match_confidence * 100).toFixed(1)}%` : '-'"
                  unit=""
                />
              </el-col>
              <el-col :span="12">
                <SingleCard
                  label="匹配时间"
                  :value="kolData.matched_at ? formatDateTime(kolData.matched_at) : '-'"
                  unit=""
                />
              </el-col>
            </el-row>

            <!-- 失败原因显示 -->
            <el-alert
              v-if="kolData.match_status === 'rejected' && errorMessage"
              type="error"
              :title="errorMessage"
              :closable="false"
              show-icon
              class="error-alert"
            />
          </div>

          <!-- 分割线 -->
          <el-divider />

          <!-- 报价信息 -->
          <div class="info-section">
            <div class="section-header">
              <h4>报价信息</h4>
            </div>
            <el-row :gutter="12" class="price-info-cards">
              <el-col :span="12">
                <SingleCard
                  v-if="!kolData.star_quote_21_60s"
                  label="21-60s报价"
                  value="-"
                  unit=""
                />
                <SingleCard
                  v-else
                  label="21-60s报价"
                  value=""
                  unit=""
                >
                  ¥{{ kolData.star_quote_21_60s.toLocaleString() }}
                </SingleCard>
              </el-col>
              <el-col :span="12">
                <SingleCard
                  v-if="!kolData.star_quote_60s_plus"
                  label="60s+报价"
                  value="-"
                  unit=""
                />
                <SingleCard
                  v-else
                  label="60s+报价"
                  value=""
                  unit=""
                >
                  ¥{{ kolData.star_quote_60s_plus.toLocaleString() }}
                </SingleCard>
              </el-col>
            </el-row>
          </div>

          <!-- 分割线 -->
          <el-divider />

          <!-- 合作信息 -->
          <div class="info-section">
            <div class="section-header">
              <h4>合作信息</h4>
            </div>

            <!-- 采用与同步状态区域一致的卡片式布局 -->
            <el-row :gutter="12" class="status-info">
              <el-col :span="12">
                <SingleCard
                  label="返点区间"
                  :value="kolData.rebate_range || '-'"
                  unit=""
                />
              </el-col>
              <el-col :span="12">
                <SingleCard
                  label="政策等级"
                  :value="kolData.policy_level || '-'"
                  unit=""
                />
              </el-col>
            </el-row>

            <el-row :gutter="12" class="status-info">
              <el-col :span="12">
                <SingleCard
                  label="返点政策"
                  :value="String(kolData.rebate_policy) === '1' ? '有' : '无'"
                  unit=""
                />
              </el-col>
              <el-col :span="12">
                <SingleCard
                  label="返点账期"
                  :value="kolData.rebate_period || '-'"
                  unit=""
                />
              </el-col>
            </el-row>

            <el-row :gutter="12" class="status-info">
              <el-col :span="12">
                <SingleCard
                  label="是否独家"
                  :value="kolData.is_exclusive === 1 ? '是' : '否'"
                  unit=""
                />
              </el-col>
              <el-col :span="12">
                <SingleCard
                  label="配合度"
                  :value="cooperationDegreeText(kolData.cooperation_degree)"
                  unit=""
                />
              </el-col>
            </el-row>

            <el-row :gutter="12" class="status-info">
              <el-col :span="12">
                <SingleCard
                  label="年框机构"
                  :value="kolData.annual_contract_org || '-'"
                  unit=""
                />
              </el-col>
              <el-col :span="12">
                <SingleCard
                  label="资源属性"
                  :value="resourceAttributeText(kolData.resource_attribute)"
                  unit=""
                />
              </el-col>
            </el-row>

            <el-row :gutter="12" class="status-info">
              <el-col :span="12">
                <SingleCard
                  label="支付账期"
                  :value="kolData.pay_period || '-'"
                  unit=""
                />
              </el-col>
              <el-col :span="12">
                <SingleCard
                  label="合作简介"
                  :value="kolData.cooperation_intro || '-'"
                  unit=""
                />
              </el-col>
            </el-row>
          </div>
        </div>
      </el-card>
      </div>

      <!-- 公海达人信息快照 -->
      <div v-if="kolData.matched_snapshot" class="sync-status-section">
        <AuthorSnapshotPanel :snapshot="kolData.matched_snapshot" />
      </div>

      <!-- 备注 -->
      <div v-if="kolData.remark" class="info-section">
        <h4 class="section-title">备注</h4>
        <div class="remark-content">{{ kolData.remark }}</div>
      </div>

      <!-- 时间戳 -->
      <div class="timestamp-info">
        <span>创建时间: {{ formatDateTime(kolData.created_at) }}</span>
        <span>更新时间: {{ formatDateTime(kolData.updated_at) }}</span>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
        <el-button type="primary" @click="handleEdit">
          <el-icon><Edit /></el-icon>
          编辑
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { log } from '../../../utils/logger'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Edit, OfficeBuilding } from '@element-plus/icons-vue'
import { KolSyncApi } from '../../../api/kol-sync.api'
import SyncStatusTag from './SyncStatusTag.vue'
import AuthorSnapshotPanel from './AuthorSnapshotPanel.vue'
import SingleCard from '../../../components/SingleCard/index.vue'

interface KolData {
  id: number
  platform: string
  account_name: string
  account_id: string
  home_link: string
  followers_w: number
  org_name?: string
  category?: string
  star_quote_21_60s?: number
  star_quote_60s_plus?: number
  is_exclusive: number
  rebate_policy: number
  rebate_range?: string
  policy_level?: string
  rebate_period?: string
  pay_period?: string
  cooperation_degree?: string
  resource_attribute?: string
  annual_contract_org?: string
  cooperation_intro?: string
  matched_author_id?: string
  match_confidence?: number
  match_status?: string
  matched_snapshot?: any
  matched_at?: string
  remark?: string
  created_at: string
  updated_at: string
}

interface Props {
  modelValue: boolean
  kolData: KolData
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'edit', data: KolData): void
  (e: 'sync-updated'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const loading = ref(false)
const syncing = ref(false)
const errorMessage = ref('')

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 判断是否可以重试同步
const canRetrySync = computed(() => {
  const { platform, account_id, match_status } = props.kolData
  const isDouyin = platform?.toLowerCase() === '抖音' || platform?.toLowerCase() === 'douyin'
  const hasAccountId = !!account_id && account_id.trim().length > 0
  const canRetry = match_status === 'rejected' || match_status === 'unmatched'
  
  return isDouyin && hasAccountId && canRetry
})

// 配合度类型
const cooperationDegreeType = (degree?: string) => {
  const map: Record<string, string> = {
    'high': 'success',
    'medium': 'warning',
    'low': 'info'
  }
  return map[degree || ''] || 'info'
}

// 配合度文本
const cooperationDegreeText = (degree?: string) => {
  const map: Record<string, string> = {
    'high': '高',
    'medium': '中',
    'low': '低'
  }
  return map[degree || ''] || '未知'
}

// 资源属性类型
const resourceAttributeType = (attr?: string) => {
  const map: Record<string, string> = {
    'exclusive': 'success',
    'sgxm': 'warning',
    'other': 'info'
  }
  return map[attr || ''] || 'info'
}

// 资源属性文本
const resourceAttributeText = (attr?: string) => {
  const map: Record<string, string> = {
    'exclusive': '独家',
    'sgxm': '星光',
    'other': '其他'
  }
  return map[attr || ''] || '其他'
}

// 格式化日期时间
const formatDateTime = (dateStr: string | undefined): string => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

// 重试同步
const handleRetrySync = async () => {
  try {
    syncing.value = true
    log.debug('[handleRetrySync] kolData:', props.kolData)
    const kolId = typeof props.kolData.id === 'string' ? parseInt(props.kolData.id) : props.kolData.id
    log.debug('[handleRetrySync] kolId:', kolId)
    const result = await KolSyncApi.retrySyncKol(kolId)
    
    if (result.status === 'success') {
      ElMessage.success('同步成功')
      emit('sync-updated')
    } else if (result.status === 'failed') {
      ElMessage.warning(`同步失败: ${result.errorMessage || '未知错误'}`)
      errorMessage.value = result.errorMessage || ''
    } else {
      ElMessage.info('同步任务已提交，请稍后查看结果')
    }
  } catch (error: any) {
    log.error('同步失败:', error)
    ElMessage.error(`同步失败: ${error.message || '请稍后重试'}`)
  } finally {
    syncing.value = false
  }
}

// 编辑
const handleEdit = () => {
  emit('edit', props.kolData)
  handleClose()
}

// 关闭对话框
const handleClose = () => {
  errorMessage.value = ''
  visible.value = false
}
</script>

<style scoped>
.kol-detail-content {
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 8px;
}

.profile-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 16px;
}

.avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  font-size: 22px;
  flex-shrink: 0;
}

.info-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.info-row:first-child {
  margin-bottom: 4px;
}

.divider {
  color: #d9d9d9;
  font-size: 16px;
  margin: 0 4px;
  user-select: none;
}

.kol-name {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-right: 4px;
}

.info-label {
  color: #909399;
  font-size: 13px;
}

.info-value {
  color: #606266;
  font-size: 13px;
}

.followers-tag {
  background: #f0f9ff;
  color: #10b981;
  border-color: #d1fae5;
  font-weight: 500;
}

.org-tag {
  background: #eff6ff;
  color: #3b82f6;
  border-color: #dbeafe;
}

.category-tag {
  background: #f3f4f6;
  color: #6b7280;
  border-color: #e5e7eb;
}

.type-tags {
  background: #fef3c7;
  color: #d97706;
  border-color: #fde68a;
}

.sync-status-section {
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.section-title::before {
  content: '';
  position: absolute;
  left: -8px;
  top: 2px;
  width: 4px;
  height: 16px;
  border-radius: 2px;
  background: #409eff;
}

.status-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-info {
  margin-top: 12px;
}

/* .status-card {
  flex: 1;
  background: white;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #e4e7ed;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
} */

.status-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-label {
  color: #909399;
  font-size: 13px;
  font-weight: 500;
}

.status-value {
  margin-top: 4px;
}

.confidence .confidence-number {
  font-size: 24px;
  font-weight: 600;
  color: #409eff;
}

.confidence .confidence-number .percent {
  font-size: 16px;
  margin-left: 2px;
}

.confidence .confidence-number.empty {
  font-size: 16px;
  color: #999;
  font-weight: 500;
}

.match-time {
  font-size: 23px;
  font-weight: 600;
  color: #303133;
}

.error-alert {
  margin-top: 16px;
}

.info-section {
  margin-bottom: 16px;
  background: transparent;
  border: none;
  padding: 0;
  box-shadow: none;
}

.info-section:last-child {
  margin-bottom: 0;
}

/* 卡片样式，与AuthorSnapshotPanel保持一致 */
.snapshot-card {
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.snapshot-content {
  padding: 8px 0;
}

/* 统一卡片内的分割线样式 */
.snapshot-content :deep(.el-divider) {
  margin: 16px 0;
}

.section-title {
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  border-bottom: 2px solid #e4e7ed;
  position: relative;
}

.link {
  color: #409eff;
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

.price {
  color: #67c23a;
  font-weight: 600;
}

.remark-content {
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
  color: #606266;
  line-height: 1.6;
  white-space: pre-wrap;
  border: 1px dashed #e4e7ed;
}

.timestamp-info {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  /* background: #f5f7fa; */
  border-radius: 4px;
  color: #909399;
  font-size: 13px;
  margin-top: 16px;
}

.dialog-footer {
  text-align: right;
}

/* 滚动条样式 */
.kol-detail-content::-webkit-scrollbar {
  width: 6px;
}

.kol-detail-content::-webkit-scrollbar-thumb {
  background-color: #dcdfe6;
  border-radius: 3px;
}

.kol-detail-content::-webkit-scrollbar-thumb:hover {
  background-color: #c0c4cc;
}

/* 报价信息样式 */
.price-info-section {
  background: transparent;
  border: none;
  padding: 0 16px;
  box-shadow: none;
}

/* .price-info-cards {
  display: flex;
  gap: 12px;
}

.price-info-card {
  flex: 1;
  background: white;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #e4e7ed;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
} */

.price-info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.price-info-label {
  color: #909399;
  font-size: 13px;
  font-weight: 500;
}

.price-info-value {
  margin-top: 4px;
}

.price-amount {
  font-size: 18px;
  font-weight: 400;
  color: #409eff;
}

.price-amount .price-number {
  margin-left: 2px;
}

.price-amount.empty {
  font-size: 16px;
  color: #999;
  font-weight: 500;
}

/* 合作信息区域样式 */
.cooperation-section {
  background: transparent;
  border: none;
  padding: 0;
  box-shadow: none;
}

/* 合作信息区域使用与同步状态区域一致的样式 */
.cooperation-section .status-info {
  margin-top: 12px;
}


</style>
