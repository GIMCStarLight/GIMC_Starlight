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
            <el-tag v-if="kolData.followers_w" size="small" type="success" class="followers-tag">
              粉丝 {{ kolData.followers_w }} 万
            </el-tag>
          </div>
          <!-- 第二行：ID -->
          <div class="info-row">
            <span class="info-label">ID：</span>
            <span class="info-value">{{ kolData.account_id || '-' }}</span>
          </div>
          <!-- 第三行：机构和分类标签 -->
          <div class="info-row">
            <el-tag size="small" class="org-tag">
              <template #icon>
                <el-icon><OfficeBuilding /></el-icon>
              </template>
              {{ kolData.org_name || '暂无机构' }}
            </el-tag>
            <el-tag size="small" type="info" class="type-tags">
               {{ kolData.platform || '-' }}
            </el-tag>
          </div>
          <!-- 第四行：达人类型标签 -->
          <div class="info-row">
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

      <!-- 同步状态区域 -->
      <div class="sync-status-section">
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
            <el-card shadow="never">
              <div class="status-item">
                <span class="status-label">匹配置信度</span>
                <div class="status-value confidence">
                  <span v-if="kolData.match_confidence" class="confidence-number">
                    {{ (kolData.match_confidence * 100).toFixed(1) }}<span class="percent">%</span>
                  </span>
                  <span v-else class="confidence-number empty">-</span>
                </div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card shadow="never">
              <div class="status-item">
                <span class="status-label">匹配时间</span>
                <div class="status-value">
                  <span class="match-time">
                    {{ kolData.matched_at ? formatDateTime(kolData.matched_at) : '-' }}
                  </span>
                </div>
              </div>
            </el-card>
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

      <!-- 基本信息 -->
      <!-- <div class="info-section">
        <h4 class="section-title">基本信息</h4>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="平台">{{ kolData.platform }}</el-descriptions-item>
          <el-descriptions-item label="账号名称">{{ kolData.account_name }}</el-descriptions-item>
          <el-descriptions-item label="账号ID">{{ kolData.account_id }}</el-descriptions-item>
          <el-descriptions-item label="粉丝量(万)">{{ kolData.followers_w }}</el-descriptions-item>
          <el-descriptions-item label="机构名">{{ kolData.org_name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="账号类型">{{ kolData.category || '-' }}</el-descriptions-item>
          <el-descriptions-item label="主页链接" :span="2">
            <a v-if="kolData.home_link" :href="kolData.home_link" target="_blank" class="link">
              {{ kolData.home_link }}
            </a>
            <span v-else>-</span>
          </el-descriptions-item>
        </el-descriptions>
      </div> -->

      <!-- 报价信息 -->
      <div class="info-section price-info-section">
        <div class="section-header">
          <h4>报价信息</h4>
        </div>
        <el-row :gutter="12" class="price-info-cards">
          <el-col :span="12">
            <el-card shadow="never">
              <div class="price-info-item">
                <span class="price-info-label">21-60s报价</span>
                <div class="price-info-value">
                  <span v-if="kolData.star_quote_21_60s" class="price-amount">
                    ¥<span class="price-number">{{ kolData.star_quote_21_60s.toLocaleString() }}</span>
                  </span>
                  <span v-else class="price-amount empty">-</span>
                </div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card shadow="never">
              <div class="price-info-item">
                <span class="price-info-label">60s+报价</span>
                <div class="price-info-value">
                  <span v-if="kolData.star_quote_60s_plus" class="price-amount">
                    ¥<span class="price-number">{{ kolData.star_quote_60s_plus.toLocaleString() }}</span>
                  </span>
                  <span v-else class="price-amount empty">-</span>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 合作信息 -->
      <div class="info-section cooperation-section">
        <div class="section-header">
          <h4>合作信息</h4>
        </div>
        
       <!-- 新版卡片式布局（参考图片样式） -->
        <div class="cooperation-card-new">
          <!-- 统一卡片：所有数据项 -->
          <div class="coop-unified-card">
            <!-- 第一行：返点区间、政策等级、返点政策、返点账期 -->
            <div class="coop-unified-row">
              <div class="coop-unified-item">
                <div class="coop-label-new">返点区间</div>
                <div class="coop-value-new">{{ kolData.rebate_range || '-' }}</div>
              </div>
              <div class="coop-divider"></div>
              <div class="coop-unified-item">
                <div class="coop-label-new">政策等级</div>
                <div class="coop-value-new">{{ kolData.policy_level || '-' }}</div>
              </div>
              <div class="coop-divider"></div>
              <div class="coop-unified-item">
                <div class="coop-label-new">返点政策</div>
                <div class="coop-value-new">
                  <div class="coop-value-new">
                    {{ String(kolData.rebate_policy) === '1' ? '有' : '无' }}
                  </div>
                </div>
              </div>
              <div class="coop-divider"></div>
              <div class="coop-unified-item">
                <div class="coop-label-new">返点账期</div>
                <div class="coop-value-new">{{ kolData.rebate_period || '-' }}</div>
              </div>
            </div>

            <!-- 第二行：是否独家、配合度、年框机构、资源属性、支付账期 -->
            <div class="coop-unified-row">
              <div class="coop-unified-item">
                <div class="coop-label-new">是否独家</div>
                <div class="coop-value-new">
                  <div class="coop-value-new">
                    {{ kolData.is_exclusive === 1 ? '是' : '否' }}
                  </div>
                </div>
              </div>
              <div class="coop-divider"></div>
              <div class="coop-unified-item">
                <div class="coop-label-new">配合度</div>
                <div class="coop-value-new">
                  <div class="coop-value-new">
                    {{ cooperationDegreeText(kolData.cooperation_degree) }}
                  </div>
                </div>
              </div>
              <div class="coop-divider"></div>
              <div class="coop-unified-item">
                <div class="coop-label-new">年框机构</div>
                <div class="coop-value-new">{{ kolData.annual_contract_org || '-' }}</div>
              </div>
              <div class="coop-divider"></div>
              <div class="coop-unified-item">
                <div class="coop-label-new">资源属性</div>
                <div class="coop-value-new">
                  <div>
                    {{ resourceAttributeText(kolData.resource_attribute) }}
                  </div>
                </div>
              </div>
              <div class="coop-divider"></div>
              <div class="coop-unified-item">
                <div class="coop-label-new">支付账期</div>
                <div class="coop-value-new">{{ kolData.pay_period || '-' }}</div>
              </div>
            </div>
          </div>

          <!-- 第三行：合作简介 -->
          <div class="coop-intro-row">
            <div class="coop-label-new">合作简介</div>
            <div class="coop-intro-content">{{ kolData.cooperation_intro || '-' }}</div>
          </div>
        </div>
      </div>

      <!-- 公海达人信息快照 -->
      <div v-if="kolData.matched_snapshot" class="info-section">
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
  margin-bottom: 24px;
  background: #fcfcfd;
  border: 1px solid #eef2f6;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.03);
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
  background: #f5f7fa;
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
  font-weight: 600;
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
  padding: 0 16px;
  box-shadow: none;
}


/* 新版合作信息卡片样式（参考图片） */
.cooperation-card-new {
  background: #f8f9fa;
  background: transparent;
  border-radius: 12px;
  /* padding: 20px; */
}

/* 统一卡片容器 */
.coop-unified-card {
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

/* 统一卡片内的行 */
.coop-unified-row {
  display: flex;
  align-items: stretch;
}

.coop-unified-row:not(:last-child) {
  border-bottom: 1px solid #f0f0f0;
}

/* 统一卡片内的数据项 */
.coop-unified-item {
  flex: 1;
  padding: 16px;
  text-align: center;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

/* 灰色竖线分隔符（带上下边距） */
.coop-divider {
  width: 1px;
  background: #e5e7eb;
  margin: 25px 0;
}

.coop-label-new {
  font-size: 13px;
  color: #909399;
  margin-bottom: 8px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.coop-value-new {
  font-size: 18px;
  color: #303133;
  font-weight: 600;
  line-height: 1.4;
}

/* 合作简介单独行样式 */
.coop-intro-row {
  background: #ffffff;
  border-radius: 8px;
  padding: 16px;
  margin-top: 16px;
}

.coop-intro-row .coop-label-new {
  justify-content: flex-start;
  margin-bottom: 12px;
  font-size: 14px;
  color: #606266;
}

.coop-intro-content {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  white-space: pre-wrap;
  text-align: left;
}

/* 配合度标签样式：去掉背景色和边框，字体放大2px */
.coop-value-new .el-tag {
  background: transparent !important;
  border: none !important;
  font-size: 16px !important; /* 比默认的14px大2px */
}
</style>
