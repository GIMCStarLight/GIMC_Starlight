<template>
  <el-card class="distribution-card" shadow="never" v-if="scoreDistribution.length > 0">
    <!-- <div class="distribution-header">
      <el-icon class="distribution-icon"><DataAnalysis /></el-icon>
      <span class="distribution-title">评分分布分析</span>
    </div> -->
    <div class="distribution-content">
      <el-row :gutter="16">
        <!-- <el-col :span="24" :lg="12">
          <div ref="chartRef" class="distribution-chart" style="width: 100%; height: 400px;"></div>
        </el-col> -->
        <el-col :span="24" :lg="12">
          <!-- 原汇总卡片已注释
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
          -->
          <!-- 新增的 ECharts 图表 -->
          <div ref="statsChartRef" class="stats-chart" style="width: 100%; height: 400px;"></div>
        </el-col>
        <el-col :span="24" :lg="12">
          <div ref="chartRef" class="distribution-chart" style="width: 100%; height: 400px;"></div>
        </el-col>
      </el-row>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue'
import { DataAnalysis, Star, Select, Minus, WarningFilled } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import type { ECharts } from 'echarts'

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

interface Statistics {
  totalInfluencers?: number
  totalReviews?: number
  todayReviews?: number
}

defineOptions({
  name: 'ScoreDistributionChart',
})

const props = defineProps<{
  scoreDistribution: ScoreItem[]
  scoreStats: ScoreStats
  statistics?: Statistics
}>()

const chartRef = ref<HTMLElement>()
const statsChartRef = ref<HTMLElement>()
let chartInstance: ECharts | null = null
let statsChartInstance: ECharts | null = null


const initChart = () => {
  if (!chartRef.value) return
  
  // 检查容器高度
  if (chartRef.value.offsetHeight === 0) {
    setTimeout(() => initChart(), 100)
    return
  }
  
  // 销毁旧实例
  if (chartInstance) {
    chartInstance.dispose()
  }
  
  chartInstance = echarts.init(chartRef.value)
  
  const total = props.scoreDistribution.reduce((sum, d) => sum + d.count, 0)
  
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{c}个达人 ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: '15%',
      top: 'center',
      itemGap: 12,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: {
        fontSize: 13,
        color: '#333'
      },
      formatter: function(name: string) {
        return name.length > 10 ? name.substring(0, 10) + '...' : name;
      }
    },
    series: [
      {
        name: '评分分布',
        type: 'pie',
         // roseType: 'area',
        radius: ['40%', '55%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: true,
        label: {
          position: 'outside',
          formatter: (params: any) => {
            // 通过名称找到对应的分数
            let score = '';
            if (params.name === '优秀达人') {
              score = '5';
            } else if (params.name === '良好达人') {
              score = '4';
            } else if (params.name === '一般达人') {
              score = '3';
            } else if (params.name === '待改进') {
              score = '1-2';
            }
            return `${params.name}\n${score}分`
          },
          lineHeight: 25,
          fontSize: 14,
          color: '#333'
        },
        labelLine: {
          length: 25,
          length2: 70,
          maxSurfaceAngle: 90
        },
        labelLayout: (params: any) => {
          const isLeft = params.labelRect.x < chartInstance!.getWidth() / 2
          const points = params.labelLinePoints
          // 调整引导线终点
          points[2][0] = isLeft
            ? params.labelRect.x
            : params.labelRect.x + params.labelRect.width
          
          // 同时调整标签位置，让文字紧贴线的末端
          return {
            labelLinePoints: points,
            x: points[2][0],
            verticalAlign: 'middle',
            align: isLeft ? 'left' : 'right'
          }
        },
        data: props.scoreDistribution.map(item => {
          let scoreName = '';
          if (item.score >= 5) {
            scoreName = '优秀达人';
          } else if (item.score >= 4) {
            scoreName = '良好达人';
          } else if (item.score >= 3) {
            scoreName = '一般达人';
          } else {
            scoreName = '待改进';
          }
          return {
            name: `${scoreName}`,
            value: item.count,
          };
        })
      }
    ]
  }
  
  chartInstance.setOption(option)
}

const initStatsChart = () => {
  if (!statsChartRef.value) return
  
  if (statsChartRef.value.offsetHeight === 0) {
    setTimeout(() => initStatsChart(), 100)
    return
  }
  
  if (statsChartInstance) {
    statsChartInstance.dispose()
  }
  
  statsChartInstance = echarts.init(statsChartRef.value)
  
  // 使用正确的数据源
  // 已评价达人数 = 后端统计的唯一达人数量
  const totalInfluencers = props.statistics?.totalInfluencers || 0
  // 总评价数 = 所有评价记录数
  const totalReviews = props.statistics?.totalReviews || 0
  // 优质达人数 = 4-5分的达人数
  const highScoreInfluencers = (props.scoreStats.excellentCount || 0) + (props.scoreStats.goodCount || 0)
  // 今日新增评价数
  const todayReviews = props.statistics?.todayReviews || 0
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: ['总评价数', '已评价达人', '优质达人(4-5分)', '今日新增'],
      axisLabel: {
        fontSize: 12,
        color: '#666'
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        fontSize: 12,
        color: '#666'
      }
    },
    series: [
      {
        name: '统计数据',
        type: 'bar',
        data: [
          totalReviews,
          totalInfluencers,
          highScoreInfluencers,
          todayReviews
        ],
        label: {
          show: true,
          position: 'top',
          fontSize: 12,
          color: '#333'
        }
      }
    ]
  }
  
  statsChartInstance.setOption(option)
}

onMounted(() => {
  nextTick(() => {
    initChart()
    initStatsChart()
  })
  
  window.addEventListener('resize', () => {
    chartInstance?.resize()
    statsChartInstance?.resize()
  })
})

watch(() => props.scoreDistribution, () => {
  nextTick(() => {
    initChart()
    initStatsChart()
  })
}, { deep: true })
</script>

<style scoped lang="scss">
.distribution-card {
  margin-bottom: 16px;
  border-radius: 8px;

  :deep(.el-card__body) {
    padding-top: 24px;
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
    padding: 0px 0;
    min-height: 400px;
  }

  .distribution-summary {
    padding: 16px;
    background: #0c76df;
    // background: #f9fafb;
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
