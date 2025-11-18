<template>
  <div class="stats-cards">
    <el-row :gutter="16">
      <el-col :xs="12" :sm="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon stat-icon-primary">
              <el-icon :size="28"><User /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ statistics.totalInfluencers || 0 }}</div>
              <div class="stat-label">已评价达人</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon stat-icon-success">
              <el-icon :size="28"><ChatDotRound /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ statistics.totalReviews || 0 }}</div>
              <div class="stat-label">总评价数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card class="stat-card" shadow="hover" @click="onHighScoreClick">
          <div class="stat-content">
            <div class="stat-icon stat-icon-warning">
              <el-icon :size="28"><Medal /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ scoreStats.highScoreCount || 0 }}</div>
              <div class="stat-label">优质达人 (4-5分)</div>
              <div class="stat-percent">{{ scoreStats.highScorePercent }}%</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :xs="12" :sm="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon stat-icon-danger">
              <el-icon :size="28"><TrendCharts /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">+{{ statistics.todayReviews || 0 }}</div>
              <div class="stat-label">今日新增</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { User, ChatDotRound, Medal, TrendCharts } from '@element-plus/icons-vue'

interface Statistics {
  totalInfluencers?: number
  totalReviews?: number
  todayReviews?: number
}

interface ScoreStats {
  highScoreCount?: number
  highScorePercent?: number | string
}

defineOptions({
  name: 'ReviewStatsCards',
})

defineProps<{
  statistics: Statistics
  scoreStats: ScoreStats
}>()

const emit = defineEmits<{
  'high-score-click': []
}>()

const onHighScoreClick = () => {
  emit('high-score-click')
}
</script>

<style scoped lang="scss">
.stats-cards {
  margin-bottom: 16px;
}

.stat-card {
  border-radius: 8px;
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
  }

  :deep(.el-card__body) {
    padding: 20px;
  }
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 12px;

  &.stat-icon-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  &.stat-icon-success {
    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    color: white;
  }

  &.stat-icon-warning {
    background: linear-gradient(135deg, #ffa726 0%, #fb8c00 100%);
    color: white;
  }

  &.stat-icon-danger {
    background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    color: white;
  }
}

.stat-info {
  flex: 1;
}

.stat-number {
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #6b7280;
}

.stat-percent {
  margin-top: 4px;
  font-size: 12px;
  color: #059669;
  font-weight: 500;
}
</style>
