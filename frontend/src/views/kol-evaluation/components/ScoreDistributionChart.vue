<template>
  <el-card class="distribution-card" shadow="never" v-if="scoreDistribution.length > 0">
    <div class="distribution-header">
      <el-icon class="distribution-icon"><DataAnalysis /></el-icon>
      <span class="distribution-title">评分分布分析</span>
    </div>
    <div class="distribution-content">
      <el-row :gutter="16">
        <el-col :span="24" :lg="16">
          <div class="distribution-chart">
            <div v-for="item in scoreDistribution" :key="item.score" class="chart-item">
              <div class="chart-label">
                <el-rate :model-value="item.score" disabled :max="5" size="small" />
                <span class="score-text">{{ item.score }}分</span>
              </div>
              <div class="chart-bar-wrapper">
                <div 
                  class="chart-bar" 
                  :style="{ width: getBarWidth(item.count) + '%' }"
                  :class="getBarClass(item.score)"
                >
                  <span class="bar-count">{{ item.count }}个达人</span>
                </div>
              </div>
              <div class="chart-percent">{{ getPercent(item.count) }}%</div>
            </div>
          </div>
        </el-col>
        <el-col :span="24" :lg="8">
          <div class="distribution-summary">
            <div class="summary-item">
              <el-icon class="summary-icon summary-icon-excellent"><Star /></el-icon>
              <div class="summary-content">
                <div class="summary-label">优秀达人 (5分)</div>
                <div class="summary-value">{{ scoreStats.excellentCount }} 个 ({{ scoreStats.excellentPercent }}%)</div>
              </div>
            </div>
            <div class="summary-item">
              <el-icon class="summary-icon summary-icon-good"><Select /></el-icon>
              <div class="summary-content">
                <div class="summary-label">良好达人 (4分)</div>
                <div class="summary-value">{{ scoreStats.goodCount }} 个 ({{ scoreStats.goodPercent }}%)</div>
              </div>
            </div>
            <div class="summary-item">
              <el-icon class="summary-icon summary-icon-average"><Minus /></el-icon>
              <div class="summary-content">
                <div class="summary-label">一般达人 (3分)</div>
                <div class="summary-value">{{ scoreStats.averageCount }} 个 ({{ scoreStats.averagePercent }}%)</div>
              </div>
            </div>
            <div class="summary-item">
              <el-icon class="summary-icon summary-icon-poor"><WarningFilled /></el-icon>
              <div class="summary-content">
                <div class="summary-label">待改进 (1-2分)</div>
                <div class="summary-value">{{ scoreStats.poorCount }} 个 ({{ scoreStats.poorPercent }}%)</div>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { DataAnalysis, Star, Select, Minus, WarningFilled } from '@element-plus/icons-vue'

interface ScoreItem {
  score: number
  count: number
}

interface ScoreStats {
  excellentCount?: number
  excellentPercent?: number | string
  goodCount?: number
  goodPercent?: number | string
  averageCount?: number
  averagePercent?: number | string
  poorCount?: number
  poorPercent?: number | string
}

defineOptions({
  name: 'ScoreDistributionChart',
})

const props = defineProps<{
  scoreDistribution: ScoreItem[]
  scoreStats: ScoreStats
}>()

const getBarWidth = (count: number) => {
  const maxCount = Math.max(...props.scoreDistribution.map(d => d.count), 1)
  return Math.min((count / maxCount) * 100, 100)
}

const getBarClass = (score: number) => {
  if (score >= 5) return 'bar-excellent'
  if (score >= 4) return 'bar-good'
  if (score >= 3) return 'bar-average'
  return 'bar-poor'
}

const getPercent = (count: number) => {
  const total = props.scoreDistribution.reduce((sum, d) => sum + d.count, 0)
  return total > 0 ? ((count / total) * 100).toFixed(1) : '0.0'
}
</script>

<style scoped lang="scss">
.distribution-card {
  margin-bottom: 16px;
  border-radius: 8px;

  :deep(.el-card__body) {
    padding: 24px;
  }
}

.distribution-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.distribution-icon {
  font-size: 20px;
  color: #3b82f6;
}

.distribution-content {
  .distribution-chart {
    padding: 0;
  }

  .chart-item {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .chart-label {
    width: 140px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
  }

  .score-text {
    font-weight: 500;
    color: #4b5563;
  }

  .chart-bar-wrapper {
    flex: 1;
    height: 32px;
    background: #f3f4f6;
    border-radius: 6px;
    overflow: hidden;
  }

  .chart-bar {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 12px;
    transition: width 0.3s ease;
    border-radius: 6px;

    &.bar-excellent {
      background: linear-gradient(90deg, #34d399, #10b981);
    }

    &.bar-good {
      background: linear-gradient(90deg, #60a5fa, #3b82f6);
    }

    &.bar-average {
      background: linear-gradient(90deg, #fbbf24, #f59e0b);
    }

    &.bar-poor {
      background: linear-gradient(90deg, #f87171, #ef4444);
    }
  }

  .bar-count {
    color: white;
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
  }

  .chart-percent {
    width: 60px;
    text-align: right;
    font-size: 14px;
    font-weight: 500;
    color: #6b7280;
  }

  .distribution-summary {
    padding: 16px;
    background: #f9fafb;
    border-radius: 8px;
  }

  .summary-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: white;
    border-radius: 6px;
    margin-bottom: 12px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .summary-icon {
    font-size: 24px;

    &.summary-icon-excellent {
      color: #10b981;
    }

    &.summary-icon-good {
      color: #3b82f6;
    }

    &.summary-icon-average {
      color: #f59e0b;
    }

    &.summary-icon-poor {
      color: #ef4444;
    }
  }

  .summary-content {
    flex: 1;
  }

  .summary-label {
    font-size: 13px;
    color: #6b7280;
    margin-bottom: 4px;
  }

  .summary-value {
    font-size: 15px;
    font-weight: 600;
    color: #1f2937;
  }
}
</style>
