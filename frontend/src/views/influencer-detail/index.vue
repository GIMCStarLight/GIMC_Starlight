<script setup lang="ts">
import { log } from '../../utils/logger'
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getInfluencerFullData } from '../../api/influencer-v2'
import KolReviewsTab from '../../components/KolReviewsTab/index.vue'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const rawData = ref<Record<string, any>>({})
const activeTab = ref('overview')

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

// 计算属性：营销指数
const marketingIndices = computed(() => {
  return [
    { name: '转化指数', value: Number(rawData.value.link_convert_index || 0).toFixed(2), color: '#67C23A' },
    { name: '购物指数', value: Number(rawData.value.link_shopping_index || 0).toFixed(2), color: '#E6A23C' },
    { name: '传播指数', value: Number(rawData.value.link_spread_index || 0).toFixed(2), color: '#409EFF' },
    { name: '星图指数', value: Number(rawData.value.link_star_index || 0).toFixed(2), color: '#F56C6C' },
  ]
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

// 平台名称映射
const getPlatformName = (platformId: number): string => {
  const platformMap: Record<number, string> = {
    1: '抖音',
    2: '快手',
    3: '视频号',
    4: '小红书',
    5: '微博',
    6: 'B站',
  }
  return platformMap[platformId] || `平台${platformId}`
}

// 渠道名称映射
const getChannelName = (channelId: number): string => {
  const channelMap: Record<number, string> = {
    1: '通用渠道',
    2: '小店随心推',
    3: '千川',
    10: '巨量引擎',
    21: '星图',
  }
  return channelMap[channelId] || `渠道${channelId}`
}

// 返回上一页
const goBack = () => {
  router.back()
}

onMounted(() => {
  loadInfluencerFullData()
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
        <h1 class="page-title">达人详情 - 完整数据版</h1>
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
                <span class="value">{{ rawData.id }}</span>
              </span>
              <span class="meta-item">
                <span class="label">核心用户ID:</span>
                <span class="value">{{ rawData.core_user_id }}</span>
              </span>
            </div>

            <!-- 核心数据 -->
            <div class="stats-grid">
              <div class="stat-box highlight">
                <div class="stat-label">粉丝数</div>
                <div class="stat-value">{{ formatNumber(rawData.follower) }}</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">性别</div>
                <div class="stat-value">{{ formatGender(rawData.gender) }}</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">地区</div>
                <div class="stat-value">{{ rawData.city || rawData.province || '-' }}</div>
              </div>
              <div class="stat-box">
                <div class="stat-label">作者类型</div>
                <div class="stat-value">{{ rawData.author_type === '1' ? 'mega' : 'normal' }}</div>
              </div>
            </div>
          </div>
        </div>
      </el-card>

      <!-- Tab切换内容 -->
      <el-card class="tabs-card" shadow="hover">
        <el-tabs v-model="activeTab">
          <!-- Tab 1: 概览 -->
          <el-tab-pane label="📊 数据概览" name="overview">
            <div class="tab-content">
              <el-row :gutter="20">
                <!-- 粉丝增长 -->
                <el-col :span="12">
                  <div class="data-module">
                    <h3 class="module-title">📈 粉丝增长数据</h3>
                    <el-descriptions :column="2" border>
                      <el-descriptions-item label="15天增长">{{ fansGrowth.increment15d }}</el-descriptions-item>
                      <el-descriptions-item label="30天增长">{{ fansGrowth.increment30d }}</el-descriptions-item>
                      <el-descriptions-item label="15天增长率">{{ fansGrowth.rate15d }}</el-descriptions-item>
                      <el-descriptions-item label="当前粉丝">{{ formatNumber(rawData.follower) }}</el-descriptions-item>
                    </el-descriptions>
                  </div>
                </el-col>

                <!-- 互动数据 -->
                <el-col :span="12">
                  <div class="data-module">
                    <h3 class="module-title">💬 互动表现数据</h3>
                    <el-descriptions :column="2" border>
                      <el-descriptions-item label="互动率(30天)">{{ engagementData.interactRate }}</el-descriptions-item>
                      <el-descriptions-item label="完播率(30天)">{{ engagementData.playOverRate }}</el-descriptions-item>
                      <el-descriptions-item label="播放量中位数">{{ engagementData.vvMedian }}</el-descriptions-item>
                      <el-descriptions-item label="互动量中位数">{{ engagementData.interactionMedian }}</el-descriptions-item>
                    </el-descriptions>
                  </div>
                </el-col>
              </el-row>

              <!-- 营销能力指标 -->
              <div class="data-module" style="margin-top: 20px;
">
                <h3 class="module-title">🎯 营销能力指数</h3>
                <el-row :gutter="20">
                  <el-col v-for="item in marketingIndices" :key="item.name" :span="6">
                    <div class="index-card" :style="{ borderColor: item.color }">
                      <div class="index-name">{{ item.name }}</div>
                      <div class="index-value" :style="{ color: item.color }">{{ item.value }}</div>
                    </div>
                  </el-col>
                </el-row>
              </div>
            </div>
          </el-tab-pane>

          <!-- Tab 2: 价格与ROI -->
          <el-tab-pane label="💰 价格与ROI" name="pricing">
            <div class="tab-content">
              <div class="data-module">
                <h3 class="module-title">💵 报价体系</h3>
                <el-descriptions :column="3" border size="large">
                  <el-descriptions-item label="1-20秒报价">¥{{ pricingData.price1To20 }}</el-descriptions-item>
                  <el-descriptions-item label="20-60秒报价">¥{{ pricingData.price20To60 }}</el-descriptions-item>
                  <el-descriptions-item label="60秒+报价">¥{{ pricingData.price60Plus }}</el-descriptions-item>
                </el-descriptions>
              </div>

              <div class="data-module" style="margin-top: 20px;">
                <h3 class="module-title">📊 预期数据</h3>
                <el-descriptions :column="2" border>
                  <el-descriptions-item label="预期播放量">{{ pricingData.expectedPlayNum }}</el-descriptions-item>
                  <el-descriptions-item label="预期自然播放量">{{ formatNumber(rawData.expected_natural_play_num) }}</el-descriptions-item>
                  <el-descriptions-item label="推广预期播放量">{{ pricingData.prospectiveVv }}</el-descriptions-item>
                  <el-descriptions-item label="CPM建议价格">¥{{ rawData.assign_cpm_suggest_price }}</el-descriptions-item>
                  <el-descriptions-item label="1-20秒预期CPM">¥{{ Number(rawData.prospective_1_20_cpm || 0).toFixed(2) }}</el-descriptions-item>
                  <el-descriptions-item label="20-60秒预期CPM">¥{{ Number(rawData.prospective_20_60_cpm || 0).toFixed(2) }}</el-descriptions-item>
                  <el-descriptions-item label="60秒+预期CPM">¥{{ Number(rawData.prospective_60_cpm || 0).toFixed(2) }}</el-descriptions-item>
                  <el-descriptions-item label="预期CPA等级">{{ rawData.expected_cpa3_level }}</el-descriptions-item>
                </el-descriptions>
              </div>
            </div>
          </el-tab-pane>

          <!-- Tab 3: 电商数据 -->
          <el-tab-pane label="🛒 电商能力" name="ecommerce">
            <div class="tab-content">
              <div class="data-module">
                <h3 class="module-title">🏪 电商基础信息</h3>
                <el-descriptions :column="2" border>
                  <el-descriptions-item label="电商开通">{{ ecommerceData.enable ? '✓ 已开通' : '✗ 未开通' }}</el-descriptions-item>
                  <el-descriptions-item label="电商等级">{{ ecommerceData.level || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="电商评分">{{ ecommerceData.score }}</el-descriptions-item>
                  <el-descriptions-item label="电商观看PV(30天)">{{ ecommerceData.watchPv }}万</el-descriptions-item>
                  <el-descriptions-item label="GMV区间(30天)">{{ ecommerceData.gmvRange || '-' }}</el-descriptions-item>
                  <el-descriptions-item label="GPM区间(30天)">{{ ecommerceData.gpmRange || '-' }}</el-descriptions-item>
                </el-descriptions>
              </div>
            </div>
          </el-tab-pane>

          <!-- Tab 4: 内容标签 -->
          <el-tab-pane label="🏷️ 内容标签" name="tags">
            <div class="tab-content">
              <div class="data-module">
                <h3 class="module-title">🎨 内容主题标签(180天)</h3>
                <div v-if="contentTags.length > 0" class="tags-wrapper">
                  <el-tag v-for="(tag, index) in contentTags" :key="index" class="tag-item" type="success">
                    {{ tag }}
                  </el-tag>
                </div>
                <el-empty v-else description="暂无标签数据" :image-size="80" />
              </div>

              <div class="data-module" style="margin-top: 20px;">
                <h3 class="module-title">🔗 标签关系</h3>
                <div v-if="Object.keys(tagsRelation).length > 0" class="tags-relation">
                  <div v-for="(values, key) in tagsRelation" :key="key" class="relation-item">
                    <div class="relation-key">{{ key }}</div>
                    <div class="relation-values">
                      <el-tag v-for="(val, idx) in values" :key="idx" size="small" type="info">
                        {{ val }}
                      </el-tag>
                    </div>
                  </div>
                </div>
                <el-empty v-else description="暂无标签关系数据" :image-size="80" />
              </div>
            </div>
          </el-tab-pane>

          <!-- Tab 5: 最近作品 -->
          <el-tab-pane label="📹 最近作品" name="works">
            <div class="tab-content">
              <div class="data-module">
                <h3 class="module-title">🎬 最近10个作品</h3>
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
          <el-tab-pane label="⭐ 达人评价" name="reviews">
            <KolReviewsTab 
              v-if="rawData.id" 
              :author-id="rawData.id" 
              :author-name="rawData.nick_name"
            />
          </el-tab-pane>

          <!-- Tab 7: 爬虫数据 -->
          <el-tab-pane label="🕷️ 爬虫数据" name="crawler">
            <div class="tab-content">
              <!-- get_author_base_info 数据模块 -->
              <div class="data-module">
                <h3 class="module-title">📋 达人基础信息（get_author_base_info）</h3>
                <el-descriptions :column="2" border size="large">
                  <el-descriptions-item label="达人ID">
                    <span class="mono-text">{{ rawData.author_id || rawData.id || '-' }}</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="星图ID">
                    <span class="mono-text">{{ rawData.star_id || rawData.id || '-' }}</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="核心用户ID">
                    <span class="mono-text">{{ rawData.core_user_id || '-' }}</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="昵称">
                    {{ rawData.nick_name || '-' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="抖音号（unique_id）">
                    <span class="mono-text">{{ rawData.unique_id || '-' }}</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="抖音短ID（short_id）">
                    <span class="mono-text">{{ rawData.short_id || '-' }}</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="安全ID（sec_uid）">
                    <span class="mono-text">{{ rawData.sec_uid || '-' }}</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="是否有手机号">
                    <el-tag :type="rawData.has_phone ? 'success' : 'info'" size="small">
                      {{ rawData.has_phone ? '✓ 已绑定' : '✗ 未绑定' }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="MCN机构">
                    <span class="highlight-text">{{ rawData.mcn_name || '-' }}</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="支持平台">
                    <div v-if="rawData.platform && rawData.platform.length > 0" class="platform-tags">
                      <el-tag 
                        v-for="(platformId, idx) in rawData.platform" 
                        :key="idx"
                        type="primary"
                        size="small"
                        class="platform-tag"
                      >
                        {{ getPlatformName(platformId) }}
                      </el-tag>
                    </div>
                    <span v-else>-</span>
                  </el-descriptions-item>
                  <el-descriptions-item label="支持渠道">
                    <div v-if="rawData.platform_channel && rawData.platform_channel.length > 0" class="channel-tags">
                      <el-tag 
                        v-for="(channelId, idx) in rawData.platform_channel" 
                        :key="idx"
                        type="success"
                        size="small"
                        class="channel-tag"
                      >
                        {{ getChannelName(channelId) }}
                      </el-tag>
                    </div>
                    <span v-else>-</span>
                  </el-descriptions-item>
                </el-descriptions>
              </div>

              <!-- get_author_platform_channel_info_v2 数据模块 -->
              <div class="data-module" style="margin-top: 24px;">
                <h3 class="module-title">🎯 平台渠道信息（get_author_platform_channel_info_v2）</h3>
                <el-descriptions :column="1" border size="large">
                  <el-descriptions-item label="自我介绍（self_intro）">
                    <div v-if="rawData.self_intro" class="intro-box">
                      {{ rawData.self_intro }}
                    </div>
                    <span v-else class="text-muted">暂无自我介绍</span>
                  </el-descriptions-item>
                </el-descriptions>
              </div>

              <!-- 其他爬虫数据字段 -->
              <div class="data-module" style="margin-top: 24px;">
                <h3 class="module-title">🔍 其他爬虫字段</h3>
                <el-descriptions :column="2" border size="large">
                  <el-descriptions-item label="头像URI">
                    <div class="avatar-preview">
                      <el-avatar :size="50" :src="rawData.avatar_uri" />
                      <span class="mono-text small">{{ rawData.avatar_uri || '-' }}</span>
                    </div>
                  </el-descriptions-item>
                  <el-descriptions-item label="粉丝数">
                    {{ formatNumber(rawData.follower) }}
                  </el-descriptions-item>
                  <el-descriptions-item label="性别">
                    {{ formatGender(rawData.gender) }}
                  </el-descriptions-item>
                  <el-descriptions-item label="地区">
                    {{ rawData.province || '' }} {{ rawData.city || '' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="作者类型">
                    <el-tag :type="rawData.author_type === 1 ? 'warning' : 'info'" size="small">
                      {{ rawData.author_type === 1 ? 'Mega作者' : '普通作者' }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="作者状态">
                    {{ rawData.author_status || '-' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="等级">
                    {{ rawData.grade || '-' }}
                  </el-descriptions-item>
                  <el-descriptions-item label="星图指数">
                    {{ formatNumber(rawData.star_index) }}
                  </el-descriptions-item>
                  <el-descriptions-item label="最后爬取时间">
                    {{ formatDate(rawData.last_crawled_at) }}
                  </el-descriptions-item>
                </el-descriptions>
              </div>
            </div>
          </el-tab-pane>

          <!-- Tab 8: 私域信息（仅已匹配达人显示） -->
          <el-tab-pane v-if="rawData.is_matched" label="🔗 合作信息" name="private">
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

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.stat-box {
  background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
  border: 2px solid #e4e7ed;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  transition: all 0.3s ease;
}

.stat-box:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.stat-box.highlight {
  background: linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%);
  border-color: #1890ff;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-bottom: 10px;
  font-weight: 500;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
}

/* Tab内容 */
.tabs-card {
  margin-top: 20px;
}

.tab-content {
  padding: 16px 0;
}

.data-module {
  margin-bottom: 20px;
}

.module-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 16px 0;
  color: #303133;
  padding-bottom: 10px;
  border-bottom: 2px solid #e4e7ed;
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
  font-weight: 600;
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

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
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

/* 爬虫数据样式 */
.mono-text {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  color: #606266;
  font-size: 13px;
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 3px;
}

.mono-text.small {
  font-size: 11px;
  color: #909399;
  display: block;
  margin-top: 4px;
  word-break: break-all;
}

.platform-tags,
.channel-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.platform-tag,
.channel-tag {
  margin-right: 0 !important;
}

.avatar-preview {
  display: flex;
  align-items: center;
  gap: 12px;
}

.text-muted {
  color: #909399;
  font-style: italic;
}

.intro-box {
  background: #fafafa;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 12px;
  font-size: 14px;
  line-height: 1.8;
  color: #606266;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
