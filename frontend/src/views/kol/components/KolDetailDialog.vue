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
        <div class="title-group">
          <div class="title-row">
            <span class="kol-name">{{ kolData.account_name || '-' }}</span>
            <el-tag size="small" type="info" class="platform-tag">{{ kolData.platform || '-' }}</el-tag>
            <el-tag v-if="kolData.followers_w" size="small" type="success" class="followers-tag">
              粉丝 {{ kolData.followers_w }} 万
            </el-tag>
          </div>
          <div class="sub-row">
            <span class="sub-id">ID：{{ kolData.account_id || '-' }}</span>
            <el-divider direction="vertical" />
            <span class="sub-org">机构：{{ kolData.org_name || '-' }}</span>
            <el-divider direction="vertical" />
            <span class="sub-category">类型：{{ kolData.category || '-' }}</span>
          </div>
        </div>
        <div class="header-actions">
          <a v-if="kolData.home_link" :href="kolData.home_link" target="_blank" class="link">访问主页</a>
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

        <el-row :gutter="16" class="status-info">
          <el-col :span="8">
            <div class="status-item">
              <span class="label">同步状态:</span>
              <SyncStatusTag :status="kolData.match_status || 'unmatched'" />
            </div>
          </el-col>
          <el-col :span="8">
            <div class="status-item">
              <span class="label">匹配置信度:</span>
              <span v-if="kolData.match_confidence" class="value">
                {{ (kolData.match_confidence * 100).toFixed(1) }}%
              </span>
              <span v-else class="value">-</span>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="status-item">
              <span class="label">匹配时间:</span>
              <span class="value">
                {{ kolData.matched_at ? formatDateTime(kolData.matched_at) : '-' }}
              </span>
            </div>
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
      <div class="info-section">
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
      </div>

      <!-- 报价信息 -->
      <div class="info-section">
        <h4 class="section-title">报价信息</h4>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="21-60s报价">
            <span v-if="kolData.star_quote_21_60s" class="price">
              ¥{{ kolData.star_quote_21_60s.toLocaleString() }}
            </span>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="60s+报价">
            <span v-if="kolData.star_quote_60s_plus" class="price">
              ¥{{ kolData.star_quote_60s_plus.toLocaleString() }}
            </span>
            <span v-else>-</span>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 合作信息 -->
      <div class="info-section">
        <h4 class="section-title">合作信息</h4>
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="是否独家">
            <el-tag :type="kolData.is_exclusive === 1 ? 'success' : 'info'" size="small">
              {{ kolData.is_exclusive === 1 ? '是' : '否' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="返点政策">
            <el-tag :type="kolData.rebate_policy === 1 ? 'warning' : 'info'" size="small">
              {{ kolData.rebate_policy === 1 ? '有' : '无' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="返点区间">{{ kolData.rebate_range || '-' }}</el-descriptions-item>
          <el-descriptions-item label="政策等级">{{ kolData.policy_level || '-' }}</el-descriptions-item>
          <el-descriptions-item label="返点账期">{{ kolData.rebate_period || '-' }}</el-descriptions-item>
          <el-descriptions-item label="支付账期">{{ kolData.pay_period || '-' }}</el-descriptions-item>
          <el-descriptions-item label="配合度">
            <el-tag 
              :type="cooperationDegreeType(kolData.cooperation_degree)" 
              size="small"
            >
              {{ cooperationDegreeText(kolData.cooperation_degree) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="资源属性">
            <el-tag 
              :type="resourceAttributeType(kolData.resource_attribute)" 
              size="small"
            >
              {{ resourceAttributeText(kolData.resource_attribute) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="年框机构" :span="2">
            {{ kolData.annual_contract_org || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="合作简介" :span="2">
            {{ kolData.cooperation_intro || '-' }}
          </el-descriptions-item>
        </el-descriptions>
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
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Edit } from '@element-plus/icons-vue'
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
    console.log('[handleRetrySync] kolData:', props.kolData)
    const kolId = typeof props.kolData.id === 'string' ? parseInt(props.kolData.id) : props.kolData.id
    console.log('[handleRetrySync] kolId:', kolId)
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
    console.error('同步失败:', error)
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
  display: grid;
  grid-template-columns: 60px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 8px 4px 0 4px;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #409eff;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  font-size: 18px;
}

.title-group {
  display: flex;
  flex-direction: column;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sub-row {
  margin-top: 6px;
  color: #909399;
  font-size: 13px;
}

.kol-name {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.platform-tag {
  border-color: #e4e7ed;
}

.followers-tag {
  border-color: #e1f3d8;
}

.header-actions {
  display: flex;
  align-items: center;
}

.sync-status-section {
  background: #f5f7fa;
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

.status-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.status-item .label {
  color: #909399;
  font-size: 13px;
}

.status-item .value {
  color: #303133;
  font-size: 14px;
  font-weight: 500;
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
</style>
