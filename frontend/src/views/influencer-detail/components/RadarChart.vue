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
  indicators: RadarIndicator[]
  seriesData: RadarSeriesData[]
  height?: string
  tooltipFormatter?: (params: any) => string
}

const props = withDefaults(defineProps<RadarChartProps>(), {
  height: '350px',
  tooltipFormatter: undefined
})

const chartRef = ref<HTMLElement | null>(null)
let chart: echarts.ECharts | null = null

const initChart = () => {
  if (!chartRef.value || !props.indicators?.length) return

  if (chart) {
    chart.dispose()
  }
  chart = echarts.init(chartRef.value)

  const option: echarts.EChartsOption = {
    tooltip: {
      trigger: 'item',
      formatter: props.tooltipFormatter
    },
    legend: {
      show: true,
      icon: 'circle',
      left: 0,
      textStyle: {
        fontSize: 12,
        color: '#666'
      }
    },
    radar: {
      indicator: props.indicators,
      center: ['50%', '60%'],
      radius: '70%',
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
      data: props.seriesData,
      animation: true,
      animationDuration: 1000,
      animationEasing: 'cubicOut'
    }]
  }

  chart.setOption(option)
}

const updateChart = () => {
  if (!chart || !props.indicators?.length) return

  const option: echarts.EChartsOption = {
    radar: {
      indicator: props.indicators
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

watch(
  () => [props.indicators, props.seriesData],
  () => {
    nextTick(updateChart)
  },
  { deep: true }
)

onMounted(() => {
  nextTick(initChart)
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
  height: 100%;
}
</style>
