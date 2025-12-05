<template>
  <div ref="chartRef" class="radar-chart-container" :style="{ height: height }"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'

interface RadarIndicator {
  name: string
  max: number
}

interface RadarSeriesData {
  name: string
  value: number[]
  areaStyle?: {
    color?: string
  }
  lineStyle?: {
    color?: string
    width?: number
  }
  itemStyle?: {
    color?: string
  }
}

interface RadarChartProps {
  // 雷达图指标数据
  indicators: RadarIndicator[]
  // 雷达图系列数据
  seriesData: RadarSeriesData[]
  // 图表高度
  height?: string
  // 图例名称（可选）
  legendName?: string
  // 自定义 tooltip 格式化函数（可选）
  tooltipFormatter?: (params: any) => string
}

const props = withDefaults(defineProps<RadarChartProps>(), {
  height: '350px',
  legendName: '',
  tooltipFormatter: undefined
})

const chartRef = ref<HTMLElement | null>(null)
let chart: echarts.ECharts | null = null

const initChart = () => {
  if (!chartRef.value) return
  if (!props.indicators || props.indicators.length === 0) return

  if (chart) chart.dispose()
  chart = echarts.init(chartRef.value)
  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: props.tooltipFormatter
    },
    legend: {
      show: true,
      top: 10,
      left: 'center',
      textStyle: {
        fontSize: 12,
        color: '#666'
      }
    },
    radar: {
      indicator: props.indicators,
      center: ['50%', '55%'],
      radius: '60%',
      splitNumber: 4,
      axisName: {
        color: '#666',
        fontSize: 12
      },
      splitLine: {
        lineStyle: {
          color: '#E4E7ED'
        }
      },
      splitArea: {
        show: true,
        areaStyle: {
          color: ['#F5F7FA', '#FFFFFF']
        }
      }
    },
    series: [{
      type: 'radar',
      data: props.seriesData
    }]
  }
  chart.setOption(option)
}

const resize = () => {
  chart?.resize()
}

// 监听数据变化
watch(
  () => [props.indicators, props.seriesData],
  () => {
    if (props.indicators && props.indicators.length > 0) {
      nextTick(() => {
        setTimeout(initChart, 100)
      })
    }
  },
  { deep: true }
)

onMounted(() => {
  nextTick(() => {
    setTimeout(initChart, 100)
  })
  window.addEventListener('resize', resize)
})

onUnmounted(() => {
  chart?.dispose()
  window.removeEventListener('resize', resize)
})
</script>

<style scoped>
.radar-chart-container {
  width: 100%;
}
</style>
