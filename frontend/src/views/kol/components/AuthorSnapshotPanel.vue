<template>
  <div class="author-snapshot-panel">
    <a-card :bordered="false" class="snapshot-card">
      <!-- 卡片头部 -->
      <template #title>
        <div class="card-header">
          <div class="header-left">
            <UserOutlined class="header-icon" />
            <span class="header-title">匹配的公海达人信息</span>
          </div>
          <a-tag v-if="snapshot" color="success">
            <template #icon>
              <CheckCircleOutlined />
            </template>
            已匹配
          </a-tag>
        </div>
      </template>

      <!-- 有数据时显示 -->
      <div v-if="snapshot" class="snapshot-content">
        <!-- 核心数据统计卡片 -->
        <a-row :gutter="16" class="stats-row">
          <a-col :span="8">
            <a-statistic
              title="粉丝数"
              :value="formatFollowerCount(snapshot.follower)"
              class="stat-card"
            >
              <template #prefix>
                <TeamOutlined class="stat-icon" />
              </template>
            </a-statistic>
          </a-col>
          <a-col :span="8">
            <a-statistic
              title="互动率"
              :value="(snapshot.interact_rate_within_30d || 0) * 100"
              :precision="2"
              suffix="%"
              class="stat-card"
            >
            </a-statistic>
          </a-col>
          <a-col :span="8">
            <a-statistic
              title="达人等级"
              :value="snapshot.grade"
              class="stat-card"
            >
            </a-statistic>
          </a-col>
        </a-row>

        <a-divider />

        <!-- 基础信息 -->
        <div class="info-section">
          <div class="section-title">
            <IdcardOutlined class="title-icon" />
            <span>基础信息</span>
          </div>
          <a-row :gutter="[16, 16]" class="info-grid">
            <a-col :span="12">
              <div class="info-item">
                <span class="item-label">达人 ID</span>
                <a-typography-text copyable class="item-value">
                  {{ snapshot.author_id }}
                </a-typography-text>
              </div>
            </a-col>
            <a-col :span="12">
              <div class="info-item">
                <span class="item-label">星图 ID</span>
                <a-typography-text copyable class="item-value">
                  {{ snapshot.star_id }}
                </a-typography-text>
              </div>
            </a-col>
            <a-col :span="12">
              <div class="info-item">
                <span class="item-label">昵称</span>
                <span class="item-value">{{ snapshot.nick_name }}</span>
              </div>
            </a-col>
             <a-col :span="12">
              <div class="info-item">
                <span class="item-label">性别</span>
                <span class="item-value">
                  <ManOutlined v-if="snapshot.gender === 1"/>
                  <WomanOutlined v-else-if="snapshot.gender === 2"/>
                  <!-- {{ getGenderText(snapshot.gender) }} -->
                </span>
              </div>
            </a-col>
            <a-col :span="12">
              <div class="info-item">
                <span class="item-label">20-60s 视频报价</span>
                <span class="item-value price-text">
                  <!-- <DollarOutlined class="price-icon" /> -->
                  {{ formatPrice(snapshot.price_20_60) || '-' }}
                </span>
              </div>
            </a-col>
             
            <a-col :span="12">
              <div class="info-item">
                <span class="item-label">60s+ 视频报价</span>
                <span class="item-value price-text">
                  <!-- <DollarOutlined class="price-icon" /> -->
                  {{ formatPrice(snapshot.price_60) || '-' }}
                </span>
              </div>
            </a-col>
          </a-row>
        </div>

        <!-- 地理位置（独占一行） -->
        <div class="location-card">
          <EnvironmentOutlined class="location-icon" />
          <span class="location-label">地理位置：</span>
          <span class="location-value">{{ snapshot.province }} {{ snapshot.city }}</span>
        </div>

        <a-divider />

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

        <!-- 同步时间 -->
        <div class="sync-time-card">
          <ClockCircleOutlined class="sync-icon" />
          <span class="sync-label">数据同步时间：</span>
          <span class="sync-value">{{ formatDateTime(snapshot.synced_at) }}</span>
        </div>
      </div>

      <!-- 无数据时显示 -->
      <a-empty v-else description="暂无匹配的公海达人信息">
        <template #image>
          <InboxOutlined :style="{ fontSize: '64px', color: '#d9d9d9' }" />
        </template>
      </a-empty>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  UserOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  HeartOutlined,
  CrownOutlined,
  ManOutlined,
  WomanOutlined,
  EnvironmentOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  InboxOutlined,
  IdcardOutlined
} from '@ant-design/icons-vue'

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

.snapshot-card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border-radius: 8px;
  
  :deep(.ant-card-head) {
    background: #ffffff;
    border-radius: 8px 8px 0 0;
    border-bottom: 1px solid #e8e8e8;
    
    .ant-card-head-title {
      padding: 16px 0;
    }
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  
  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
    
    .header-icon {
      font-size: 20px;
      color: #303133;
    }
    
    .header-title {
      font-size: 16px;
      font-weight: 600;
      color: #303133;
    }
  }
}

.snapshot-content {
  padding: 8px 0;
}

// 统计卡片样式
.stats-row {
  margin-bottom: 16px;
  
  .stat-card {
    padding: 16px;
    background: #ffffff;
    border: 1px solid #d9d9d9;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease;
    
    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
    }
    
    :deep(.ant-statistic) {
      text-align: center;
    }
    
    :deep(.ant-statistic-title) {
      font-size: 14px;
      color: #606266;
      margin-bottom: 12px;
    }
    
    :deep(.ant-statistic-content) {
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      font-weight: 600;
      color: #303133;
      
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
      font-size: 20px;
      color: #1890ff;
    }
  }
}

// 信息区域样式
.info-section {
  margin-bottom: 24px;
  
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
  
  .info-grid {
    .info-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: #fafafa;
      border-radius: 8px;
      border-left: 3px solid #1890ff;
      transition: all 0.3s ease;

      &:hover {
        background: #f0f9ff;
        transform: translateX(4px);
        box-shadow: 0 2px 8px rgba(24, 144, 255, 0.1);
      }

      .item-label {
        font-size: 14px;
        color: #606266;
        font-weight: 500;
        flex-shrink: 0;
      }

      .item-value {
        font-size: 14px;
        color: #303133;
        font-weight: 400;
        flex-shrink: 0;
        
        &.location-text {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          
          .location-icon {
            color: #52c41a;
            font-size: 14px;
          }
        }
        
        &.price-text {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #1890ff;
          font-weight: 600;
          font-size: 15px;
          
          .price-icon {
            font-size: 14px;
          }
        }
      }
    }
  }
}

// 同步时间卡片样式
.sync-time-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #fafbfc 0%, #e8eef5 100%);
  border-radius: 8px;
  border-left: 4px solid #409eff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  
  .sync-icon {
    font-size: 18px;
    color: #409eff;
  }
  
  .sync-label {
    font-size: 14px;
    color: #606266;
    font-weight: 500;
  }
  
  .sync-value {
    font-size: 14px;
    color: #303133;
    font-weight: 600;
    font-family: 'Courier New', monospace;
  }
}

// 地理位置卡片样式（独占一行）
.location-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  margin-bottom: 16px;
   background: linear-gradient(135deg, #fafbfc 0%, #e8eef5 100%);
  border-radius: 8px;
  border-left: 4px solid #409eff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  
  .location-icon {
    font-size: 18px;
    color: #409eff;
  }
  
  .location-label {
    font-size: 14px;
    color: #606266;
    font-weight: 500;
  }
  
  .location-value {
    font-size: 14px;
    color: #303133;
    font-weight: 600;
  }
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
</style>
