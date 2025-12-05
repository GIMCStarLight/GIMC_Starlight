<script setup lang="ts">
import { log } from '../../utils/logger'
import { ref, onMounted, onUnmounted, computed, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { getInfluencerFullData } from '../../api/influencer-v2'
import KolReviewsTab from '../../components/KolReviewsTab/index.vue'
import SingleCard from '../../components/SingleCard/index.vue'
import RadarChart from './components/RadarChart.vue'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const rawData = ref<Record<string, any>>({})
const activeTab = ref('overview')
const growthChartRef = ref<HTMLElement | null>(null)
const priceCpmChartRef = ref<HTMLElement | null>(null)
let growthChart: echarts.ECharts | null = null
let priceCpmChart: echarts.ECharts | null = null

// 加载达人完整数据
const loadInfluencerFullData = async () => {
  const id = route.params.id as string
  if (!id) {
    ElMessage.error('缺少达人ID参数')
    return
  }

  loading.value = true
  try {
    const fullData = await getInfluencerFullData(id)
    rawData.value = fullData || {}
    log.debug('完整数据:', rawData.value)
  } catch (error) {
    ElMessage.error('加载达人数据失败')
    log.error('加载失败:', error)
  } finally {
    loading.value = false
  }
}

// 格式化数字
const formatNumber = (num: any) => {
  const n = Number(num)
  if (!n || isNaN(n)) return '0'
  // 直接显示原始数值，不进行万/亿转换
  return n.toLocaleString()
}

// 格式化性别
const formatGender = (gender: any) => {
  if (gender === '1' || gender === 1) return '男'
  if (gender === '2' || gender === 2) return '女'
  return '未知'
}

// 格式化百分比
const formatPercent = (val: any) => {
  const n = Number(val)
  if (!n || isNaN(n)) return '0%'
  return (n * 100).toFixed(2) + '%'
}

// 计算属性：粉丝增长
const fansGrowth = computed(() => {
  return {
    increment15d: formatNumber(rawData.value.fans_increment_within_15d),
    increment30d: formatNumber(rawData.value.fans_increment_within_30d),
    rate15d: formatPercent(rawData.value.fans_increment_rate_within_15d),
    rate30d: formatPercent(rawData.value.fans_increment_rate_within_30d),
  }
})

// 计算属性：互动数据
const engagementData = computed(() => {
  return {
    interactRate: formatPercent(rawData.value.interact_rate_within_30d),
    playOverRate: formatPercent(rawData.value.play_over_rate_within_30d),
    vvMedian: formatNumber(rawData.value.vv_median_30d),
   interactionMedian: formatNumber(rawData.value.interaction_median_30d),
  }
})

// 计算属性:营销指数
const marketingIndices = computed(() => {
  return [
    { name: '转化指数', value: Number(rawData.value.link_convert_index || 0), color: '#67C23A' },
    { name: '购物指数', value: Number(rawData.value.link_shopping_index || 0), color: '#E6A23C' },
    { name: '传播指数', value: Number(rawData.value.link_spread_index || 0), color: '#409EFF' },
    { name: '星图指数', value: Number(rawData.value.link_star_index || 0), color: '#F56C6C' },
  ]
})

// 计算属性：营销能力雷达图数据
const marketingRadarData = computed(() => {
  const indices = marketingIndices.value
  const maxValue = Math.max(...indices.map(item => item.value), 10)
  const radarMax = maxValue < 100 ? 100 : maxValue

  return {
    indicators: indices.map(item => ({
      name: item.name,
      max: radarMax
    })),
    seriesData: [{
      value: indices.map(item => item.value),
      name: '营销指数',
      areaStyle: {
        color: 'rgba(64, 158, 255, 0.3)'
      },
      lineStyle: {
        color: '#409EFF',
        width: 2
      },
      itemStyle: {
        color: '#409EFF'
      }
    }]
  }
})

// 计算属性：增长与互动率雷达图数据
const growthRateRadarData = computed(() => {
  // 从字符串中提取数值
  const getNumericValue = (str: string) => {
    if (!str) return 0
    const num = parseFloat(str.replace('%', ''))
    return isNaN(num) ? 0 : num
  }

  const rate15d = getNumericValue(fansGrowth.value.rate15d)
  const rate30d = getNumericValue(fansGrowth.value.rate30d)
  const interactRate = getNumericValue(engagementData.value.interactRate)
  const playOverRate = getNumericValue(engagementData.value.playOverRate)

  const maxValue = Math.max(rate15d, rate30d, interactRate, playOverRate, 10)

  return {
    indicators: [
      { name: '15天增长率', max: maxValue },
      { name: '30天增长率', max: maxValue },
      { name: '互动率', max: maxValue },
      { name: '完播率', max: maxValue }
    ],
    seriesData: [{
      value: [rate15d, rate30d, interactRate, playOverRate],
      name: '增长与互动率',
      areaStyle: {
        color: 'rgba(103, 194, 58, 0.3)'
      },
      lineStyle: {
        color: '#67C23A',
        width: 2
      },
      itemStyle: {
        color: '#67C23A'
      }
    }]
  }
})

// 自定义 tooltip 格式化函数
const growthRateTooltipFormatter = (params: any) => {
  const indicators = ['15天增长率', '30天增长率', '互动率', '完播率']
  const values = params.value
  let result = `${params.name}<br/>`
  indicators.forEach((indicator, index) => {
    result += `${indicator}: ${values[index].toFixed(2)}%<br/>`
  })
  return result
}

// 计算属性：增长与互动量数据
const growthChartData = computed(() => {
  // 提取数值
  const getNumericValue = (str: string) => {
    if (!str) return 0
    const num = parseInt(str.replace(/[,，]/g, ''))
    return isNaN(num) ? 0 : num
  }

  return {
    categories: ['15天增长', '30天增长', '播放量中位数', '互动量中位数'],
    values: [
      getNumericValue(fansGrowth.value.increment15d),
      getNumericValue(fansGrowth.value.increment30d),
      getNumericValue(engagementData.value.vvMedian),
      getNumericValue(engagementData.value.interactionMedian)
    ]
  }
})

// 计算属性：价格数据
const pricingData = computed(() => {
  return {
    price1To20: formatNumber(rawData.value.price_1_20),
    price20To60: formatNumber(rawData.value.price_20_60),
    price60Plus: formatNumber(rawData.value.price_60),
    expectedPlayNum: formatNumber(rawData.value.expected_play_num),
    prospectiveVv: formatNumber(rawData.value.promotion_prospective_vv),
  }
})

// 价格卡片数据
const pricingCards = computed(() => [
  {
    label: '预期播放量',
    value: pricingData.value.expectedPlayNum || '-',
    unit: ''
  },
  {
    label: '预期自然播放量',
    value: formatNumber(rawData.value.expected_natural_play_num) || '-',
    unit: ''
  },
  {
    label: '推广预期播放量',
    value: pricingData.value.prospectiveVv || '-',
    unit: ''
  },
  {
    label: 'CPM建议价格',
    value: '',
    unit: '',
    slotContent: rawData.value.assign_cpm_suggest_price || '-'
  },
  {
    label: '预期CPA等级',
    value: rawData.value.expected_cpa3_level || '-',
    unit: ''
  }
])

// 计算属性：电商数据
const ecommerceData = computed(() => {
  return {
    enable: rawData.value.e_commerce_enable === '1' || rawData.value.e_commerce_enable === true,
    level: rawData.value.author_ecom_level,
    gmvRange: rawData.value.ecom_gmv_30d_range,
    gpmRange: rawData.value.ecom_gpm_30d_range,
    score: rawData.value.ecom_score,
    watchPv: rawData.value.ecom_watch_pv_30d,
  }
})

// 电商卡片数据
const ecommerceCards = computed(() => {
  return [
    {
      label: '电商开通',
      value: ecommerceData.value.enable ? '✓ 已开通' : '✗ 未开通',
      unit: ''
    },
    {
      label: '电商等级',
      value: ecommerceData.value.level || '-',
      unit: ''
    },
    {
      label: '电商评分',
      value: ecommerceData.value.score || '-',
      unit: ''
    },
    {
      label: '电商观看PV(30天)',
      value: ecommerceData.value.watchPv || '-',
      unit: '万'
    },
    {
      label: 'GMV区间(30天)',
      value: ecommerceData.value.gmvRange || '-',
      unit: ''
    },
    {
      label: 'GPM区间(30天)',
      value: ecommerceData.value.gpmRange || '-',
      unit: ''
    }
  ]
})

// 计算属性：最近作品
const recentWorks = computed(() => {
  try {
    const items = JSON.parse(rawData.value.last_10_items || '[]')
    return Array.isArray(items) ? items : []
  } catch {
    return []
  }
})

// 计算属性：内容标签
const contentTags = computed(() => {
  try {
    const tags = JSON.parse(rawData.value.content_theme_labels_180d || '[]')
    return Array.isArray(tags) ? tags : []
  } catch {
    return []
  }
})

// 计算属性：标签关系
const tagsRelation = computed(() => {
  try {
    const relation = JSON.parse(rawData.value.tags_relation || '{}')
    return typeof relation === 'object' ? relation : {}
  } catch {
    return {}
  }
})

// 计算属性：词语关联指数
const wordAssociationIndex = computed(() => {
  try {
    const association = JSON.parse(rawData.value.author_thin_mid_word_association_index || '{}')
    return typeof association === 'object' ? association : {}
  } catch {
    return {}
  }
})

// 计算属性：词语关联指数雷达图数据
const wordAssociationRadarData = computed(() => {
  const association = wordAssociationIndex.value
  const entries = Object.entries(association)

  if (entries.length === 0) {
    return {
      indicators: [],
      seriesData: []
    }
  }

  // 先计算数值
  const values = entries.map(([, value]) => Number(value) * 100)
  const maxValue = Math.max(...values, 5) // 至少为5，确保有足够的空间显示差异

  // 转换为雷达图格式
  const indicators = entries.map(([name]) => ({
    name: name,
    max: maxValue
  }))

  return {
    indicators,
    seriesData: [{
      name: '词语关联指数',
      value: values,
      areaStyle: {
        color: 'rgba(255, 99, 132, 0.3)'
      },
      lineStyle: {
        color: '#FF6384',
        width: 2
      },
      itemStyle: {
        color: '#FF6384'
      }
    }]
  }
})

// 自定义 tooltip 格式化函数
const wordAssociationTooltipFormatter = (params: any) => {
  const association = wordAssociationIndex.value
  const indicators = Object.keys(association)
  const values = params.value
  let result = `${params.name}<br/>`
  indicators.forEach((indicator, index) => {
    result += `${indicator}: ${values[index].toFixed(1)}%<br/>`
  })
  return result
}

// 格式化日期
const formatDate = (dateStr: any) => {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN')
  } catch {
    return String(dateStr)
  }
}

// 获取政策等级类型
const getPolicyLevelType = (level: string): string => {
  const types: Record<string, string> = {
    'A': 'danger',
    'B': 'warning',
    'C': 'info',
  }
  return types[level] || 'info'
}

// 获取配合度星级
const getCooperationStars = (degree: string): number => {
  const stars: Record<string, number> = {
    'high': 5,
    'medium': 3,
    'low': 1,
  }
  return stars[degree] || 0
}

// 格式化联系方式
const formatContactInfo = (info: any): string => {
  if (!info) return '-'
  if (typeof info === 'string') return info
  try {
    return JSON.stringify(info, null, 2)
  } catch {
    return String(info)
  }
}

// 初始化增长与互动量柱状图
const initGrowthChart = () => {
  if (!growthChartRef.value || growthChartRef.value.offsetHeight === 0) return

  if (growthChart) growthChart.dispose()
  growthChart = echarts.init(growthChartRef.value)

  const maxValue = Math.max(...growthChartData.value.values)

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: function(params: any) {
        return `${params[0].name}: ${params[0].value.toLocaleString()}`
      }
    },
    legend: {
      show: true,
      top: 11,
      left: 'center',
      textStyle: {
        fontSize: 12,
        color: '#666'
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
      data: growthChartData.value.categories,
      axisLabel: {
        fontSize: 12,
        color: '#666',
        rotate: 30
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        fontSize: 12,
        color: '#666',
        formatter: function(value: number) {
          if (value >= 1000000) {
            return (value / 1000000).toFixed(1) + 'M'
          } else if (value >= 1000) {
            return (value / 1000).toFixed(1) + 'K'
          }
          return value.toString()
        }
      },
      splitLine: {
        show: false
      }
    },
    series: [
      {
        name: '粉丝增量与数值',
        type: 'bar',
        data: growthChartData.value.values,
        barWidth: '30%',
        barMaxWidth: 50,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#409EFF' },
            { offset: 1, color: '#83BFF6' }
          ])
        },
        label: {
          show: true,
          position: 'top',
          fontSize: 11,
          color: '#409EFF',
          formatter: function(params: any) {
            return params.value.toLocaleString()
          }
        }
      }
    ]
  }

  growthChart.setOption(option)
}

// 初始化价格CPM对比图
const initPriceCpmChart = () => {
  if (!priceCpmChartRef.value || priceCpmChartRef.value.offsetHeight === 0) return

  if (priceCpmChart) priceCpmChart.dispose()
  priceCpmChart = echarts.init(priceCpmChartRef.value)

  const priceData = [
    Number(pricingData.value.price1To20.replace(/[^\d]/g, '') || 0),
    Number(pricingData.value.price20To60.replace(/[^\d]/g, '') || 0),
    Number(pricingData.value.price60Plus.replace(/[^\d]/g, '') || 0)
  ]

  const cpmData = [
    Number(rawData.value.prospective_1_20_cpm || 0),
    Number(rawData.value.prospective_20_60_cpm || 0),
    Number(rawData.value.prospective_60_cpm || 0)
  ]

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      formatter: function(params: any) {
        let result = params[0].name + '<br/>'
        params.forEach((item: any) => {
          if (item.seriesName === '报价') {
            result += `${item.marker}${item.seriesName}: ¥${item.value.toLocaleString()}<br/>`
          } else {
            result += `${item.marker}${item.seriesName}: ¥${item.value}<br/>`
          }
        })
        return result
      }
    },
    legend: {
      data: ['报价', '预期CPM'],
      top: 10
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: ['1-20秒', '20-60秒', '60秒+'],
      axisLabel: {
        fontSize: 12
      }
    },
    yAxis: [
      {
        type: 'value',
        name: '报价(元)',
        position: 'left',
        axisLabel: {
          fontSize: 12,
          formatter: function(value: number) {
            if (value >= 10000) {
              return (value / 10000).toFixed(1) + 'w'
            } else if (value >= 1000) {
              return (value / 1000).toFixed(1) + 'k'
            }
            return value.toString()
          }
        },
        nameTextStyle: {
          color: '#188df0'
        },
        splitLine: {
          show: false
        }
      },
      {
        type: 'value',
        name: '预期CPM(元)',
        position: 'right',
        axisLabel: {
          fontSize: 12,
          formatter: function(value: number) {
            return value.toString()
          }
        },
        nameTextStyle: {
          color: '#FF69B4'
        },
        splitLine: {
          show: false
        }
      }
    ],
    series: [
      {
        name: '报价',
        type: 'bar',
        yAxisIndex: 0,
        data: priceData,
        barWidth: '25%',
        barMaxWidth: 40,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#188df0' },
            { offset: 1, color: '#83bff6' }
          ])
        },
        label: {
          show: true,
          position: 'top',
          fontSize: 11,
          color: '#188df0',
          padding: [0, 0, 8, 0],
          backgroundColor: 'rgba(82, 196, 26, 0.1)',
          borderRadius: 4,
          formatter: function(params: any) {
            if (params.value >= 10000) {
              return (params.value / 10000).toFixed(1) + 'w'
            } else if (params.value >= 1000) {
              return (params.value / 1000).toFixed(1) + 'k'
            }
            return params.value.toString()
          }
        }
      },
      {
        name: '预期CPM',
        type: 'bar',
        yAxisIndex: 1,
        data: cpmData,
        barWidth: '25%',
        barMaxWidth: 40,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#FF69B4' },
            { offset: 1, color: '#FFB6C1' }
          ])
        },
        label: {
          show: true,
          position: 'top',
          fontSize: 11,
          color: '#FF69B4',
          padding: [0, 0, 8, 0],
          backgroundColor: 'rgba(255, 105, 180, 0.1)',
          borderRadius: 4,
          formatter: function(params: any) {
            return params.value.toString()
          }
        }
      }
    ]
  }

  priceCpmChart.setOption(option)
}

// 监听activeTab变化,切换到对应tab时初始化图表
watch(activeTab, (newVal) => {
  if (newVal === 'overview') {
    nextTick(() => {
      setTimeout(initGrowthChart, 100)
    })
  } else if (newVal === 'pricing') {
    nextTick(() => {
      setTimeout(initPriceCpmChart, 100)
    })
  }
})

// 返回上一页
const goBack = () => {
  router.back()
}

onMounted(async () => {
  await loadInfluencerFullData()
  if (activeTab.value === 'overview') {
    nextTick(() => {
      setTimeout(initGrowthChart, 200)
    })
  }

  // 添加窗口resize监听
  window.addEventListener('resize', () => {
    growthChart?.resize()
    priceCpmChart?.resize()
  })
})

onUnmounted(() => {
  growthChart?.dispose()
  priceCpmChart?.dispose()
  // 移除resize监听器
  window.removeEventListener('resize', () => {})
})
</script>

<template>
  <div class="influencer-detail-page">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-wrapper">
      <el-skeleton :rows="8" animated />
    </div>

    <!-- 详情内容 -->
    <div v-else-if="Object.keys(rawData).length > 0" class="detail-wrapper">
      <!-- 顶部导航 -->
      <div class="page-header">
        <el-button text @click="goBack">
          <template #icon>
            <span>←</span>
          </template>
          返回列表
        </el-button>
        <!-- <h1 class="page-title">达人详情 - 完整数据版</h1> -->
      </div>

      <!-- 核心信息卡片 -->
      <el-card class="profile-card" shadow="hover">
        <div class="profile-wrapper">
          <!-- 头像 -->
          <div class="avatar-section">
            <el-avatar :size="120" :src="rawData.avatar_uri" class="avatar">
              <span>{{ rawData.nick_name?.[0] || '达' }}</span>
            </el-avatar>
          </div>

          <!-- 基础信息 -->
          <div class="info-section">
            <div class="name-row">
              <h2 class="name">{{ rawData.nick_name || '未知达人' }}</h2>
              <div class="badges">
                <el-tag v-if="rawData.star_excellent_author === '1'" type="success" size="small">优质作者</el-tag>
                <el-tag v-if="rawData.is_black_horse_author === 'true'" type="warning" size="small">黑马作者</el-tag>
                <el-tag v-if="rawData.is_cocreate_author === 'true'" type="info" size="small">共创作者</el-tag>
                <el-tag v-if="ecommerceData.enable" type="primary" size="small">电商达人</el-tag>
              </div>
            </div>

            <div class="meta-info">
              <span class="meta-item">
                <span class="label">星图ID:</span>
                <a-typography-paragraph copyable class="value-copyable">
                  {{ rawData.id }}
                </a-typography-paragraph>
              </span>
              <span class="meta-item">
                <span class="label">核心用户ID:</span>
                <a-typography-paragraph copyable class="value-copyable">
                  {{ rawData.core_user_id }}
                </a-typography-paragraph>
              </span>
            </div>
          </div>

          <!-- 右侧核心数据 -->
          <div class="stats-right-section">
            <div class="stat-item">
              <span class="stat-label">粉丝数</span>
              <span class="stat-value highlight">{{ formatNumber(rawData.follower) }}</span>
            </div>
            <span class="divider">|</span>
            <div class="stat-item">
              <span class="stat-label">性别</span>
              <span class="stat-value">{{ formatGender(rawData.gender) }}</span>
            </div>
            <span class="divider">|</span>
            <div class="stat-item">
              <span class="stat-label">地区</span>
              <span class="stat-value">{{ rawData.city || rawData.province || '-' }}</span>
            </div>
            <span class="divider">|</span>
            <div class="stat-item">
              <span class="stat-label">作者类型</span>
              <span class="stat-value">{{ rawData.author_type === '1' ? 'mega' : 'normal' }}</span>
            </div>
          </div>
        </div>
      </el-card>

      <!-- Tab切换内容 -->
      <el-card class="tabs-card" shadow="hover">
        <el-tabs v-model="activeTab">
          <!-- Tab 1: 概览 -->
          <el-tab-pane label="数据概览" name="overview">
            <div class="tab-content">
              <el-row :gutter="20">
                <!-- 数据可视化区域 -->
                <el-col :span="8">
                  <div class="data-module">
                    <!-- <h3 class="module-title">增长与互动量</h3> -->
                    <div ref="growthChartRef" class="radar-chart" style="width: 100%;"></div>
                  </div>
                </el-col>

                <!-- 比率数据雷达图 -->
                <el-col :span="8">
                  <div class="data-module">
                    <!-- <h3 class="module-title" style="margin-bottom: 0;">增长与互动率</h3> -->
                    <RadarChart
                      :indicators="growthRateRadarData.indicators"
                      :series-data="growthRateRadarData.seriesData"
                      :tooltip-formatter="growthRateTooltipFormatter"
                      height="400px"
                    />
                  </div>
                </el-col>

                <!-- 营销能力指标 -->
                <el-col :span="8">
                  <div class="data-module">
                    <!-- <h3 class="module-title" style="margin-bottom: 0;">营销能力指数</h3> -->
                    <RadarChart
                      :indicators="marketingRadarData.indicators"
                      :series-data="marketingRadarData.seriesData"
                      height="400px"
                    />
                  </div>
                </el-col>
              </el-row>
            </div>
          </el-tab-pane>

          <!-- Tab 2: 价格与ROI -->
          <el-tab-pane label="价格与ROI" name="pricing">
            <div class="tab-content">
              <el-row :gutter="16">
                <el-col :span="24" :lg="12">
                  <div class="data-module">
                    <!-- <h3 class="module-title">💵 价格CPM对比</h3> -->
                    <div ref="priceCpmChartRef" class="price-cpm-chart" style="width: 100%; height: 400px;"></div>
                  </div>
                </el-col>
                <el-col :span="24" :lg="12">
                  <div class="data-module">
                    <!-- <h3 class="module-title">预期数据</h3> -->
                    <el-row :gutter="12">
                      <el-col
                        v-for="(card, index) in pricingCards"
                        :key="index"
                        :span="12"
                      >
                        <SingleCard
                          v-if="!card.slotContent"
                          :label="card.label"
                          :value="card.value"
                          :unit="card.unit"
                        />
                        <SingleCard
                          v-else
                          :label="card.label"
                          :value="card.value"
                          :unit="card.unit"
                        >
                          ¥{{ card.slotContent }}
                        </SingleCard>
                      </el-col>
                    </el-row>
                  </div>
                </el-col>
              </el-row>
            </div>
          </el-tab-pane>

          <!-- Tab 3: 电商数据 -->
          <el-tab-pane label="电商能力" name="ecommerce">
            <div class="tab-content">
              <div class="data-module">
                <!-- <h3 class="module-title">电商基础信息</h3> -->
                <el-row :gutter="16">
                  <el-col
                    v-for="(item, index) in ecommerceCards"
                    :key="index"
                    :span="6"
                  >
                    <SingleCard
                      :label="item.label"
                      :value="item.value"
                      :unit="item.unit"
                    />
                  </el-col>
                </el-row>
              </div>
            </div>
          </el-tab-pane>

          <!-- Tab 4: 内容标签 -->
          <el-tab-pane label="内容标签" name="tags">
            <div class="tab-content">
              <el-row :gutter="20">
                <!-- 内容主题标签和标签关系 -->
                <el-col :span="12">
                  <div class="data-module">
                    <h3 class="module-title">内容主题标签(180天)</h3>
                    <div v-if="contentTags.length > 0" class="tags-wrapper">
                      <el-tag v-for="(tag, index) in contentTags" :key="index" class="tag-item" type="success">
                        {{ tag }}
                      </el-tag>
                    </div>
                    <el-empty v-else description="暂无标签数据" :image-size="60" />
                  </div>

                  <div class="data-module" style="margin-top: 20px;">
                    <h3 class="module-title">标签关系</h3>
                    <div v-if="Object.keys(tagsRelation).length > 0" class="tags-relation">
                      <div v-for="(values, key) in tagsRelation" :key="key" class="relation-item">
                        <div class="relation-key">{{ key }}</div>
                        <div class="relation-values">
                          <el-tag v-for="(val, idx) in values" :key="idx" size="small" type="success">
                            {{ val }}
                          </el-tag>
                        </div>
                      </div>
                    </div>
                    <el-empty v-else description="暂无标签关系数据" :image-size="60" />
                  </div>
                </el-col>

                <!-- 词语关联指数 -->
                <el-col :span="12">
                  <div class="data-module" style="height: 400px;">
                    <!-- <h3 class="module-title">词语关联指数</h3> -->
                    <RadarChart
                      v-if="Object.keys(wordAssociationIndex).length > 0"
                      :indicators="wordAssociationRadarData.indicators"
                      :series-data="wordAssociationRadarData.seriesData"
                      :tooltip-formatter="wordAssociationTooltipFormatter"
                      height="400px"
                    />
                    <el-empty v-else description="暂无词语关联数据" :image-size="60" />
                  </div>
                </el-col>
              </el-row>
            </div>
          </el-tab-pane>

          <!-- Tab 5: 最近作品 -->
          <el-tab-pane label="最近作品" name="works">
            <div class="tab-content">
              <div class="data-module">
                <div class="result-count">最近 <strong>10</strong> 个作品</div>
                <div v-if="recentWorks.length > 0">
                  <el-table :data="recentWorks" stripe border>
                    <el-table-column type="index" label="#" width="50" />
                    <el-table-column prop="item_title" label="作品标题" min-width="200">
                      <template #default="{ row }">
                        {{ row.item_title || '未命名作品' }}
                      </template>
                    </el-table-column>
                    <el-table-column prop="vv" label="播放量" width="120">
                      <template #default="{ row }">
                        {{ formatNumber(row.vv) }}
                      </template>
                    </el-table-column>
                    <el-table-column prop="like_cnt" label="点赞" width="100">
                      <template #default="{ row }">
                        {{ formatNumber(row.like_cnt) }}
                      </template>
                    </el-table-column>
                    <el-table-column prop="comment_cnt" label="评论" width="100">
                      <template #default="{ row }">
                        {{ formatNumber(row.comment_cnt) }}
                      </template>
                    </el-table-column>
                    <el-table-column prop="share_cnt" label="分享" width="100">
                      <template #default="{ row }">
                        {{ formatNumber(row.share_cnt) }}
                      </template>
                    </el-table-column>
                    <el-table-column prop="is_high_quality_item" label="高质量" width="80">
                      <template #default="{ row }">
                        <el-tag v-if="row.is_high_quality_item === '1'" type="success" size="small">是</el-tag>
                        <el-tag v-else type="info" size="small">否</el-tag>
                      </template>
                    </el-table-column>
                  </el-table>
                </div>
                <el-empty v-else description="暂无作品数据" :image-size="100" />
              </div>
            </div>
          </el-tab-pane>

          <!-- Tab 6: 达人评价 -->
          <el-tab-pane label="达人评价" name="reviews">
            <KolReviewsTab 
              v-if="rawData.id" 
              :author-id="rawData.id" 
              :author-name="rawData.nick_name"
            />
          </el-tab-pane>

          <!-- Tab 7: 私域信息（仅已匹配达人显示） -->
          <el-tab-pane v-if="rawData.is_matched" label="合作信息" name="private">
            <div class="tab-content">
              <!-- 匹配状态标识 -->
              <div class="private-header">
                <el-tag type="success" size="large" effect="dark">
                  ✅ 已建联
                </el-tag>
                <span v-if="rawData.matched_at" class="matched-time">
                  匹配时间：{{ formatDate(rawData.matched_at) }}
                </span>
              </div>

              <!-- 基础信息模块 -->
              <div class="data-module">
                <h3 class="module-title">🏢 机构信息</h3>
                <el-descriptions :column="2" border size="large">
                  <el-descriptions-item label="所属机构">
                    <span class="highlight-text">{{ rawData.org_name || '-' }}</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="分类标签">
                    <el-tag v-if="rawData.category" type="info" size="small">
                      {{ rawData.category }}
                    </el-tag>
                    <span v-else>-</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="年框机构">
                    {{ rawData.annual_contract_org || '-' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="是否独家">
                    <el-tag v-if="rawData.is_exclusive === 1" type="danger" size="small" effect="dark">
                      ⭐ 独家资源
                    </el-tag>
                    <el-tag v-else type="info" size="small">-</el-tag>
                  </el-descriptions-item>
                </el-descriptions>
              </div>

              <!-- 返点政策模块 -->
              <div class="data-module">
                <h3 class="module-title">💰 返点政策</h3>
                <el-descriptions :column="2" border size="large">
                  <el-descriptions-item label="返点政策">
                    <span class="policy-text">{{ rawData.rebate_policy || '-' }}</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="返点区间">
                    <span class="rebate-highlight">{{ rawData.rebate_range || '-' }}</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="政策等级">
                    <el-tag v-if="rawData.policy_level" :type="getPolicyLevelType(rawData.policy_level)" size="small">
                      {{ rawData.policy_level }}级
                    </el-tag>
                    <span v-else>-</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="返点账期">
                    {{ rawData.rebate_period || '-' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="支付账期">
                    {{ rawData.pay_period || '-' }}
                  </el-descriptions-item>
                </el-descriptions>
              </div>

              <!-- 合作信息模块 -->
              <div class="data-module">
                <h3 class="module-title">🤝 合作信息</h3>
                <el-descriptions :column="1" border size="large">
                  <el-descriptions-item label="配合度">
                    <el-rate 
                      v-if="rawData.cooperation_degree" 
                      :model-value="getCooperationStars(rawData.cooperation_degree)" 
                      disabled 
                      show-text
                      :texts="['很差', '较差', '一般', '较好', '非常好']"
                    />
                    <span v-else>-</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="合作简介">
                    <div v-if="rawData.cooperation_intro" class="intro-box">
                      {{ rawData.cooperation_intro }}
                    </div>
                    <span v-else>-</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="联系方式">
                    <div v-if="rawData.contact_info" class="contact-box">
                      <pre>{{ formatContactInfo(rawData.contact_info) }}</pre>
                    </div>
                    <span v-else>-</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="备注">
                    <div v-if="rawData.remark" class="remark-box">
                      {{ rawData.remark }}
                    </div>
                    <span v-else>-</span>
                  </el-descriptions-item>
                </el-descriptions>
              </div>
            </div>
          </el-tab-pane>

        </el-tabs>
      </el-card>
    </div>

    <!-- 无数据状态 -->
    <el-empty v-else description="未找到达人信息" />
  </div>
</template>

<style scoped>
.influencer-detail-page {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 20px;
}

.loading-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px;
}

.detail-wrapper {
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-size: 26px;
  font-weight: 600;
  margin: 8px 0;
  color: #303133;
}

/* 个人信息卡片 */
.profile-card {
  margin-bottom: 20px;
}

.profile-wrapper {
  display: flex;
  gap: 30px;
  align-items: flex-start;
}

.avatar-section {
  flex-shrink: 0;
}

.avatar {
  border: 4px solid #f0f0f0;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.info-section {
  flex: 1;
  min-width: 0;
}

/* 右侧核心数据区域 */
.stats-right-section {
  flex-shrink: 0;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 30px;
  padding: 12px 0;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.stat-item .stat-label {
  font-size: 13px;
  color: #909399;
  font-weight: 500;
}

.stat-item .stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.stat-item .stat-value.highlight {
  color: #1890ff;
  font-size: 20px;
  font-weight: 700;
}

.divider {
  font-size: 20px;
  color: #d9d9d9;
  font-weight: 300;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.name {
  font-size: 28px;
  font-weight: 600;
  margin: 0;
  color: #303133;
}

.badges {
  display: flex;
  gap: 8px;
}

.meta-info {
  display: flex;
  gap: 30px;
  margin-bottom: 24px;
  font-size: 14px;
}

.meta-item .label {
  color: #909399;
  margin-right: 6px;
}

.meta-item .value {
  color: #606266;
  font-family: monospace;
  font-weight: 500;
}

.meta-item .value-copyable {
  color: #606266;
  font-family: monospace;
  font-weight: 500;
  margin: 0;
  display: inline;
}

/* 覆盖 ant-design typography 的默认样式 */
:deep(.value-copyable.ant-typography) {
  margin-bottom: 0;
  line-height: 1.5;
  display: inline;
}

:deep(.value-copyable .ant-typography-copy) {
  color: #909399;
  margin-left: 6px;
  position: relative;
  top: -5px;
  vertical-align: middle;
}

/* Tab内容 */
.tabs-card {
  margin-top: 20px;
}

.tab-content {
  padding: 16px 20px;
}

/* .data-module {
  margin-bottom: 20px;
} */

.module-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: #333;
  padding-bottom: 10px;
  border-bottom: 2px solid #e4e7ed;
}

.result-count {
  font-size: 14px !important;
  color: #606266 !important;
  font-weight: normal !important;
  margin: 0 0 16px 0 !important;
  padding-bottom: 10px !important;
 

  strong {
    font-size: 18px;
    font-weight: 600;
    color: var(--el-color-primary);
    margin: 0 4px;
  }
}

/* 营销指数卡片 */
.index-card {
  background: #fff;
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  transition: all 0.3s ease;
}

.index-card:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.index-name {
  font-size: 14px;
  color: #606266;
  margin-bottom: 12px;
}

.index-value {
  font-size: 32px;
  font-weight: 700;
}

/* 标签样式 */
.tags-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.tag-item {
  font-size: 14px;
  padding: 8px 16px;
}

.tags-relation {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.relation-item {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  background: #fafafa;
}

.relation-key {
  /* font-weight: 600; */
  color: #303133;
  margin-bottom: 10px;
  font-size: 16px;
}

.relation-values {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}


/* JSON查看器 */
.json-viewer {
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 20px;
  font-size: 13px;
  line-height: 1.8;
  overflow-x: auto;
  max-height: 700px;
  color: #303133;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

/* 响应式 */
@media (max-width: 768px) {
  .profile-wrapper {
    flex-direction: column;
  }

  .stats-right-section {
    width: 100%;
  }
}

/* 私域信息样式 */
.private-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding: 16px;
  background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
  border-radius: 8px;
  border-left: 4px solid #1890ff;
}

.matched-time {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.highlight-text {
  color: #1890ff;
  font-weight: 600;
  font-size: 16px;
}

.policy-text {
  color: #303133;
  font-weight: 500;
}

.rebate-highlight {
  color: #f56c6c;
  font-weight: 700;
  font-size: 18px;
}

.intro-box,
.contact-box,
.remark-box {
  background: #fafafa;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 12px;
  font-size: 14px;
  line-height: 1.6;
  color: #606266;
  white-space: pre-wrap;
  word-break: break-word;
}

.contact-box pre {
  margin: 0;
  font-family: inherit;
}

/* Tab间距设置 */
:deep(.el-tabs__item) {
  margin-right: 25px;
}

/* Tab底部灰色条改为阴影 */
:deep(.el-tabs__nav-wrap::after) {
  display: none;
}

:deep(.el-tabs__nav-wrap) {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 2px;
}

.radar-chart {
  width: 100%;
  height: 400px;
}

/* Tab容器左右padding与内容保持一致 */
:deep(.el-tabs__header) {
  padding: 0 20px;
}

</style>
