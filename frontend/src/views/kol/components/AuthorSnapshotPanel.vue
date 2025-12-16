<template>
  <div class="author-snapshot-panel">
    <div class="snapshot-header">
      <div class="section-header">
        <h4>匹配的公海达人信息</h4>
        <div class="status-actions">
          <SyncStatusTag :status="'matched'" size="default" />
        </div>
      </div>
    </div>

    <el-card class="snapshot-card">

      <!-- 有数据时显示 -->
      <div v-if="snapshot" class="snapshot-content">
        <!-- 基础信息 -->
        <div class="info-section">
          <!-- <div class="section-title">
            <IdcardOutlined class="title-icon" />
            <span>基础信息</span>
          </div> -->
          <!-- 第一行：昵称和粉丝数，采用KolEditDialog样式 -->
        <div class="info-row">
          <span class="kol-name">{{ snapshot.nick_name || '-' }}</span>
          <el-tag v-if="snapshot.follower" size="small" class="category-tag">
            粉丝 {{ formatFollowerCount(snapshot.follower) }}
          </el-tag>
        </div>

        <!-- 第二行：ID、性别信息 -->
        <div class="info-row">
          <span class="info-label">达人ID:</span>
          <span class="info-value">{{ snapshot.author_id || '-' }}</span>

          <div class="divider">|</div>

          <span class="info-label">星图ID:</span>
          <span class="info-value">{{ snapshot.star_id || '-' }}</span>

          <div class="divider">|</div>

          <span class="info-label">性别:</span>
          <span class="info-value">
            <span v-if="snapshot.gender === 1">♂ 男</span>
            <span v-else-if="snapshot.gender === 2">♀ 女</span>
            <span v-else>-</span>
          </span>
        </div>

        <!-- 统计数据（互动率和达人等级），采用与同步状态区域一致的样式 -->
        <el-row :gutter="12" class="status-info">
          <el-col :span="12">
            <el-card shadow="never">
              <div class="price-info-item">
                <span class="price-info-label">互动率</span>
                <div class="price-info-value">
                  <span class="price-amount">
                    <span class="price-number">{{ ((snapshot.interact_rate_within_30d || 0) * 100).toFixed(2) }}%</span>
                  </span>
                </div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card shadow="never">
              <div class="price-info-item">
                <span class="price-info-label">达人等级</span>
                <div class="price-info-value">
                  <span class="price-amount">
                    <span class="price-number">{{ snapshot.grade || '-' }}</span>
                  </span>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>

        <!-- 报价信息数据项，采用卡片式布局 -->
          <el-row :gutter="12" class="price-info-cards">
            <el-col :span="12">
              <el-card shadow="never">
                <div class="price-info-item">
                  <span class="price-info-label">20-60s 视频报价</span>
                  <div class="price-info-value">
                    <span class="price-amount">{{ formatPrice(snapshot.price_20_60) || '-' }}</span>
                  </div>
                </div>
              </el-card>
            </el-col>
            <el-col :span="12">
              <el-card shadow="never">
                <div class="price-info-item">
                  <span class="price-info-label">60s+ 视频报价</span>
                  <div class="price-info-value">
                    <span class="price-amount">{{ formatPrice(snapshot.price_60) || '-' }}</span>
                  </div>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </div>

    
        <!-- 报价信息 -->
        <!-- <div class="info-section">
          <div class="section-title">
            <DollarOutlined class="title-icon" />
            <span>报价信息</span>
          </div>
          <a-row :gutter="[16, 16]" class="info-grid">
            <a-col :span="12">
              <div class="info-item">
                <span class="item-label">20-60s 视频报价</span>
                <span class="item-value price-text">
                  {{ formatPrice(snapshot.price_20_60) || '-' }}
                </span>
              </div>
            </a-col>
            <a-col :span="12">
              <div class="info-item">
                <span class="item-label">60s+ 视频报价</span>
                <span class="item-value price-text">
                  {{ formatPrice(snapshot.price_60) || '-' }}
                </span>
              </div>
            </a-col>
          </a-row>
        </div> -->

        <!-- 地理位置和数据同步时间，采用与同步状态区域一致的样式，在同一行显示 -->
        <el-row :gutter="12" class="status-info">
          <el-col :span="12">
            <el-card shadow="never">
              <div class="price-info-item">
                <span class="price-info-label">地理位置</span>
                <div class="price-info-value">
                  <span class="price-amount">
                    <span class="price-number">{{ snapshot.province }} {{ snapshot.city }}</span>
                  </span>
                </div>
              </div>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card shadow="never">
              <div class="price-info-item">
                <span class="price-info-label">数据同步时间</span>
                <div class="price-info-value">
                  <span class="price-amount">
                    <span class="price-number">{{ formatDateTime(snapshot.synced_at) }}</span>
                  </span>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 无数据时显示 -->
      <el-empty description="暂无匹配的公海达人信息">
        <template #default>
          <div style="text-align: center; color: #d9d9d9; font-size: 64px;">
            📄
          </div>
        </template>
      </el-empty>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import SyncStatusTag from './SyncStatusTag.vue'

interface AuthorSnapshot {
  author_id: string
  star_id: string
  nick_name: string
  follower: number
  gender: number
  city: string
  province: string
  grade: string
  price_20_60: number
  price_60: number
  interact_rate_within_30d: number
  synced_at: string
}

interface Props {
  snapshot: AuthorSnapshot | null
}

const props = defineProps<Props>()

// 格式化性别
const getGenderText = (gender: number): string => {
  const map: Record<number, string> = {
    1: '男',
    2: '女',
    0: '未知'
  }
  return map[gender] || '未知'
}

// 获取性别颜色
const getGenderColor = (gender: number): string => {
  const map: Record<number, string> = {
    1: 'blue',
    2: 'pink',
    0: 'default'
  }
  return map[gender] || 'default'
}

// 格式化粉丝数（用于Statistic组件）
const formatFollowerCount = (count: number): string => {
  if (count >= 100000000) {
    return `${(count / 100000000).toFixed(2)}亿`
  }
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1)}万`
  }
  return count.toLocaleString()
}

// 格式化百分比
const formatPercent = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '-'
  return `${(value * 100).toFixed(2)}%`
}

// 格式化价格
const formatPrice = (price: number | null | undefined): string => {
  if (!price) return '-'
  return `¥${price.toLocaleString()}`
}

// 格式化日期时间
const formatDateTime = (dateStr: string): string => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}
</script>

<style scoped lang="scss">
.author-snapshot-panel {
  width: 100%;
}

.snapshot-header {
  margin-bottom: 0;
}

.snapshot-card {
  background: #ffffff;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
  overflow: hidden;
}

.snapshot-content {
  padding: 8px 0;
}

// 统计卡片样式 - 在基本信息中显示
.stats-row {
  margin-bottom: 20px;

  .stat-card {
    background: #ffffff;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);

    &:deep(.ant-card) {
      box-shadow: none;
      border: none;
    }

    :deep(.ant-statistic) {
      text-align: center;
    }

    :deep(.ant-statistic-title) {
      font-size: 13px;
      color: #909399;
      margin-bottom: 8px;
    }

    :deep(.ant-statistic-content) {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 600;
      color: #409eff;

      .ant-statistic-content-prefix {
        display: inline-flex;
        align-items: center;
        margin-right: 8px;
      }

      .ant-statistic-content-value {
        display: inline-flex;
        align-items: center;
      }

      .ant-statistic-content-suffix {
        display: inline-flex;
        align-items: center;
        margin-left: 4px;
      }
    }

    .stat-icon {
      font-size: 16px;
      color: #409eff;
    }
  }
}

// 信息区域样式
.info-section {
  margin-bottom: 24px;
  background: transparent;
  border: none;
  padding: 0;
  box-shadow: none;

  .section-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 2px solid #f0f0f0;

    .title-icon {
      font-size: 18px;
      color: #1890ff;
    }
  }
}

// info-row样式，与KolDetailDialog一致
.info-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.divider {
  color: #d9d9d9;
  font-size: 16px;
  margin: 0 4px;
  user-select: none;
}

.info-label {
  color: #909399;
  font-size: 13px;
}

.info-value {
  color: #606266;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 修复Ant Design图标垂直对齐问题 */
.info-value :deep(.anticon) {
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
}

// 第一行昵称和粉丝数样式，与KolEditDialog一致
.kol-name {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-right: 4px;
}

.category-tag {
  background: #f3f4f6;
  color: #6b7280;
  border-color: #e5e7eb;
}

// 统计信息卡片样式，与同步状态区域一致
.status-info {
  margin-top: 12px;
}

// 报价信息卡片样式 - 基础信息区域使用
.price-info-cards {
  margin-top: 12px;
}

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


// 同步时间提示
.sync-alert {
  margin-top: 20px;
  border-radius: 6px;
  background-color: #f5f5f5;
  border: none;
  border: 1px solid #d9d9d9;
  
  :deep(.ant-alert-message) {
    color: #606266;
    font-size: 13px;
  }
}

// 分割线
:deep(.ant-divider) {
  margin: 20px 0;
}

// 空状态
:deep(.ant-empty) {
  padding: 60px 0;

  .ant-empty-description {
    color: #909399;
    font-size: 14px;
  }
}

// 标签图标对齐
:deep(.ant-tag) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

// 头部样式，匹配同步状态区域
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

.status-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
