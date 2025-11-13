<template>
  <div class="author-snapshot-panel">
    <div class="panel-header">
      <h4>匹配的公海达人信息</h4>
      <el-tag v-if="snapshot" type="success" size="small">
        <el-icon><Check /></el-icon>
        已匹配
      </el-tag>
    </div>

    <div v-if="snapshot" class="snapshot-content">
      <!-- 基础信息 -->
      <el-row :gutter="16" class="info-section">
        <el-col :span="24">
          <div class="section-title">基础信息</div>
        </el-col>
        <el-col :span="12">
          <div class="info-item">
            <span class="label">达人ID:</span>
            <span class="value">{{ snapshot.author_id }}</span>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="info-item">
            <span class="label">星图ID:</span>
            <span class="value">{{ snapshot.star_id }}</span>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="info-item">
            <span class="label">昵称:</span>
            <span class="value">{{ snapshot.nick_name }}</span>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="info-item">
            <span class="label">性别:</span>
            <span class="value">{{ getGenderText(snapshot.gender) }}</span>
          </div>
        </el-col>
      </el-row>

      <!-- 数据指标 -->
      <el-row :gutter="16" class="info-section">
        <el-col :span="24">
          <div class="section-title">数据指标</div>
        </el-col>
        <el-col :span="12">
          <div class="info-item">
            <span class="label">粉丝数:</span>
            <span class="value highlight">{{ formatFollower(snapshot.follower) }}</span>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="info-item">
            <span class="label">等级:</span>
            <el-tag size="small">{{ snapshot.grade }}</el-tag>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="info-item">
            <span class="label">互动率:</span>
            <span class="value">{{ formatPercent(snapshot.interact_rate_within_30d) }}</span>
          </div>
        </el-col>
      </el-row>

      <!-- 地理位置 -->
      <el-row :gutter="16" class="info-section">
        <el-col :span="24">
          <div class="section-title">地理位置</div>
        </el-col>
        <el-col :span="12">
          <div class="info-item">
            <span class="label">省份:</span>
            <span class="value">{{ snapshot.province || '-' }}</span>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="info-item">
            <span class="label">城市:</span>
            <span class="value">{{ snapshot.city || '-' }}</span>
          </div>
        </el-col>
      </el-row>

      <!-- 报价信息 -->
      <el-row :gutter="16" class="info-section">
        <el-col :span="24">
          <div class="section-title">报价信息</div>
        </el-col>
        <el-col :span="12">
          <div class="info-item">
            <span class="label">20-60s报价:</span>
            <span class="value price">{{ formatPrice(snapshot.price_20_60) }}</span>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="info-item">
            <span class="label">60s+报价:</span>
            <span class="value price">{{ formatPrice(snapshot.price_60) }}</span>
          </div>
        </el-col>
      </el-row>

      <!-- 同步时间 -->
      <div class="sync-time">
        <el-icon><Clock /></el-icon>
        <span>同步时间: {{ formatDateTime(snapshot.synced_at) }}</span>
      </div>
    </div>

    <el-empty v-else description="暂无匹配的公海达人信息" :image-size="100">
      <template #image>
        <el-icon :size="60" color="#909399">
          <InfoFilled />
        </el-icon>
      </template>
    </el-empty>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Check, Clock, InfoFilled } from '@element-plus/icons-vue'

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

// 格式化粉丝数
const formatFollower = (count: number): string => {
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

<style scoped>
.author-snapshot-panel {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e4e7ed;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 2px solid #e4e7ed;
}

.panel-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.snapshot-content {
  margin-top: 16px;
}

.info-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 12px;
  padding-left: 8px;
  border-left: 3px solid #409eff;
}

.info-item {
  display: flex;
  align-items: center;
  padding: 8px 0;
}

.info-item .label {
  min-width: 100px;
  color: #909399;
  font-size: 13px;
}

.info-item .value {
  color: #303133;
  font-size: 14px;
  font-weight: 500;
}

.info-item .value.highlight {
  color: #409eff;
  font-weight: 600;
}

.info-item .value.price {
  color: #67c23a;
  font-weight: 600;
}

.sync-time {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
  color: #909399;
  font-size: 13px;
  margin-top: 16px;
}

:deep(.el-empty) {
  padding: 40px 0;
}
</style>
