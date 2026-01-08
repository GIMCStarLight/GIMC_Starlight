<template>
  <div class="influencer-sorting-algorithm">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="page-header-left">
        <h2 class="page-title">达人排序算法配置</h2>
        <p class="page-description">
          总分 = 私域价值分 × 业务权重 + 平台质量分 × 质量权重 + ⽤⼾偏好分 × 偏好权重
        </p>
      </div>
      <div class="page-header-right">
        <a-space>
          <a-button type="primary" size="large" @click="handleSave">
            <SaveOutlined />
            保存应用
          </a-button>
          <a-button size="large" @click="handleReset">
            <ReloadOutlined />
            恢复默认
          </a-button>
        </a-space>
      </div>
    </div>

    <!-- 主权重配置 -->
    <a-card class="config-card" :bordered="false">
      <template #title>
        <span class="card-title">
          <ControlOutlined />
          动态权重策略
        </span>
      </template>
      
      <div class="weights-wrapper">
        <!-- 系统默认推荐 -->
        <div class="weight-section">
          <div class="section-title">系统默认推荐</div>
          <div class="weights-config">
            <div class="weight-item readonly">
              <div class="weight-label">
                <span class="label-text">私域价值权重</span>
                <span class="label-value">{{ recommendedWeights.private }}%</span>
              </div>
              <a-slider
                :value="recommendedWeights.private"
                :min="0"
                :max="100"
                :step="5"
                :tooltip="{ formatter: (val: number) => `${val}%` }"
                disabled
              />
            </div>

            <div class="weight-item readonly">
              <div class="weight-label">
                <span class="label-text">平台质量权重</span>
                <span class="label-value">{{ recommendedWeights.quality }}%</span>
              </div>
              <a-slider
                :value="recommendedWeights.quality"
                :min="0"
                :max="100"
                :step="5"
                :tooltip="{ formatter: (val: number) => `${val}%` }"
                disabled
              />
            </div>

            <div class="weight-item readonly">
              <div class="weight-label">
                <span class="label-text">用户偏好权重</span>
                <span class="label-value">{{ recommendedWeights.preference }}%</span>
              </div>
              <a-slider
                :value="recommendedWeights.preference"
                :min="0"
                :max="100"
                :step="5"
                :tooltip="{ formatter: (val: number) => `${val}%` }"
                disabled
              />
            </div>
          </div>
        </div>

        <!-- 用户主动排序 -->
        <div class="weight-section">
          <div class="section-title">用户主动排序</div>
          <div class="weights-config">
            <div class="weight-item">
              <div class="weight-label">
                <span class="label-text">私域价值权重</span>
                <span class="label-value">{{ customWeights.private }}%</span>
              </div>
              <a-slider
                v-model:value="customWeights.private"
                :min="0"
                :max="100"
                :step="5"
                :tooltip="{ formatter: (val: number) => `${val}%` }"
              />
            </div>

            <div class="weight-item">
              <div class="weight-label">
                <span class="label-text">平台质量权重</span>
                <span class="label-value">{{ customWeights.quality }}%</span>
              </div>
              <a-slider
                v-model:value="customWeights.quality"
                :min="0"
                :max="100"
                :step="5"
                :tooltip="{ formatter: (val: number) => `${val}%` }"
              />
            </div>

            <div class="weight-item">
              <div class="weight-label">
                <span class="label-text">用户偏好权重</span>
                <span class="label-value">{{ customWeights.preference }}%</span>
              </div>
              <a-slider
                v-model:value="customWeights.preference"
                :min="0"
                :max="100"
                :step="5"
                :tooltip="{ formatter: (val: number) => `${val}%` }"
              />
            </div>
          </div>

          <a-alert
            v-if="customWeightSum !== 100"
            message="权重总和必须等于100%"
            type="warning"
            show-icon
            class="weight-warning"
          />
        </div>
      </div>
    </a-card>

    <!-- 私域价值分配置 -->
    <a-card class="config-card" :bordered="false">
      <template #title>
        <span class="card-title">
          <DatabaseOutlined />
          私域价值分（0-100分）
        </span>
      </template>
      
      <div class="content-with-summary">
        <div class="score-summary-vertical">
          <div class="summary-text">私域价值分总计上限：{{ privateMaxScore }}分 / 100分</div>
          <a-progress
            type="circle"
            :percent="privateMaxScore"
            :format="formatPercent"
            :stroke-color="{ '0%': '#87CEEB', '100%': '#FFB6C1' }"
            trail-color="#f0f0f0"
            :width="120"
          />
          <div class="summary-note">注：同组内取最高值，不累加</div>
        </div>
        
        <div class="dimension-groups">
          <!-- 机构价值组 -->
          <div class="dimension-group">
            <div class="group-header">
              <span class="group-title">机构价值</span>
              <span class="group-max">上限：{{ Math.max(privateWeights.xinglian, privateWeights.sgxingmei) }}分 / 50分</span>
            </div>
            <div class="group-items-vertical">
              <div class="dimension-item-vertical">
                <span class="item-value">{{ privateWeights.xinglian }}分</span>
                <a-slider
                  v-model:value="privateWeights.xinglian"
                  :min="0"
                  :max="50"
                  :step="1"
                  :tooltip="{ formatter: (val: number) => `${val}分` }"
                  vertical
                  :style="{ height: '150px' }"
                  @change="(val: number) => handlePrivateChange('xinglian', val)"
                />
                <span class="item-label">星链计划</span>
              </div>
              <div class="dimension-item-vertical">
                <span class="item-value">{{ privateWeights.sgxingmei }}分</span>
                <a-slider
                  v-model:value="privateWeights.sgxingmei"
                  :min="0"
                  :max="50"
                  :step="1"
                  :tooltip="{ formatter: (val: number) => `${val}分` }"
                  vertical
                  :style="{ height: '150px' }"
                  @change="(val: number) => handlePrivateChange('sgxingmei', val)"
                />
                <span class="item-label">省广星媒</span>
              </div>
            </div>
          </div>

          <!-- 政策等级组 -->
          <div class="dimension-group">
            <div class="group-header">
              <span class="group-title">政策等级</span>
              <span class="group-max">上限：{{ Math.max(privateWeights.policyS, privateWeights.policyA, privateWeights.policyB, privateWeights.policyC, privateWeights.policyD) }}分 / 35分</span>
            </div>
            <div class="group-items-vertical">
              <div class="dimension-item-vertical">
                <span class="item-value">{{ privateWeights.policyS }}分</span>
                <a-slider
                  v-model:value="privateWeights.policyS"
                  :min="0"
                  :max="35"
                  :step="1"
                  :tooltip="{ formatter: (val: number) => `${val}分` }"
                  vertical
                  :style="{ height: '150px' }"
                  @change="(val: number) => handlePrivateChange('policyS', val)"
                />
                <span class="item-label">S级</span>
              </div>
              <div class="dimension-item-vertical">
                <span class="item-value">{{ privateWeights.policyA }}分</span>
                <a-slider
                  v-model:value="privateWeights.policyA"
                  :min="0"
                  :max="35"
                  :step="1"
                  :tooltip="{ formatter: (val: number) => `${val}分` }"
                  vertical
                  :style="{ height: '150px' }"
                  @change="(val: number) => handlePrivateChange('policyA', val)"
                />
                <span class="item-label">A级</span>
              </div>
              <div class="dimension-item-vertical">
                <span class="item-value">{{ privateWeights.policyB }}分</span>
                <a-slider
                  v-model:value="privateWeights.policyB"
                  :min="0"
                  :max="35"
                  :step="1"
                  :tooltip="{ formatter: (val: number) => `${val}分` }"
                  vertical
                  :style="{ height: '150px' }"
                  @change="(val: number) => handlePrivateChange('policyB', val)"
                />
                <span class="item-label">B级</span>
              </div>
              <div class="dimension-item-vertical">
                <span class="item-value">{{ privateWeights.policyC }}分</span>
                <a-slider
                  v-model:value="privateWeights.policyC"
                  :min="0"
                  :max="35"
                  :step="1"
                  :tooltip="{ formatter: (val: number) => `${val}分` }"
                  vertical
                  :style="{ height: '150px' }"
                  @change="(val: number) => handlePrivateChange('policyC', val)"
                />
                <span class="item-label">C级</span>
              </div>
              <div class="dimension-item-vertical">
                <span class="item-value">{{ privateWeights.policyD }}分</span>
                <a-slider
                  v-model:value="privateWeights.policyD"
                  :min="0"
                  :max="35"
                  :step="1"
                  :tooltip="{ formatter: (val: number) => `${val}分` }"
                  vertical
                  :style="{ height: '150px' }"
                  @change="(val: number) => handlePrivateChange('policyD', val)"
                />
                <span class="item-label">D级</span>
              </div>
            </div>
          </div>

          <!-- 其他维度 -->
          <div class="dimension-group">
            <div class="group-header">
              <span class="group-title">其他维度</span>
              <span class="group-max">累加：{{ privateWeights.exclusive + privateWeights.rebate + privateWeights.annual }}分 / 40分</span>
            </div>
            <div class="group-items-vertical">
              <div class="dimension-item-vertical">
                <span class="item-value">{{ privateWeights.exclusive }}分</span>
                <a-slider
                  v-model:value="privateWeights.exclusive"
                  :min="0"
                  :max="25"
                  :step="1"
                  :tooltip="{ formatter: (val: number) => `${val}分` }"
                  vertical
                  :style="{ height: '150px' }"
                  @change="(val: number) => handlePrivateChange('exclusive', val)"
                />
                <span class="item-label">独家资源</span>
              </div>
              <div class="dimension-item-vertical">
                <span class="item-value">{{ privateWeights.rebate }}分</span>
                <a-slider
                  v-model:value="privateWeights.rebate"
                  :min="0"
                  :max="15"
                  :step="1"
                  :tooltip="{ formatter: (val: number) => `${val}分` }"
                  vertical
                  :style="{ height: '150px' }"
                  @change="(val: number) => handlePrivateChange('rebate', val)"
                />
                <span class="item-label">返点优惠</span>
              </div>
              <div class="dimension-item-vertical">
                <span class="item-value">{{ privateWeights.annual }}分</span>
                <a-slider
                  v-model:value="privateWeights.annual"
                  :min="0"
                  :max="10"
                  :step="1"
                  :tooltip="{ formatter: (val: number) => `${val}分` }"
                  vertical
                  :style="{ height: '150px' }"
                  @change="(val: number) => handlePrivateChange('annual', val)"
                />
                <span class="item-label">年框合作</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </a-card>

    <!-- 平台质量分配置 -->
    <a-card class="config-card" :bordered="false">
      <template #title>
        <span class="card-title">
          <StarOutlined />
          平台质量分（0-100分）
        </span>
      </template>
      
      <div class="content-with-summary">
        <div class="score-summary-horizontal">
          <div class="summary-text">平台质量分总计上限：{{ qualityMaxScore }}分 / 100分</div>
          <a-progress
            type="circle"
            :percent="qualityMaxScore"
            :format="formatPercent"
            :stroke-color="{ '0%': '#87CEEB', '100%': '#FFB6C1' }"
            trail-color="#f0f0f0"
            :width="120"
          />
          <div class="summary-note">注：同组内取最高值，不累加</div>
        </div>
        
        <div class="dimension-groups">
          <!-- 官方认证组 -->
          <div class="dimension-group">
            <div class="group-header">
              <span class="group-title">官方认证</span>
              <span class="group-max">上限：{{ Math.max(qualityWeights.qualityAuthor, qualityWeights.darkHorse, qualityWeights.highPotential) }}分 / 35分</span>
            </div>
            <div class="group-items-vertical">
              <div class="dimension-item-vertical">
                <span class="item-value">{{ qualityWeights.qualityAuthor }}分</span>
                <a-slider
                  v-model:value="qualityWeights.qualityAuthor"
                  :min="0"
                  :max="35"
                  :step="1"
                  :tooltip="{ formatter: (val: number) => `${val}分` }"
                  vertical
                  :style="{ height: '150px' }"
                  @change="(val: number) => handleQualityChange('qualityAuthor', val)"
                />
                <span class="item-label">优质作者</span>
              </div>
              <div class="dimension-item-vertical">
                <span class="item-value">{{ qualityWeights.darkHorse }}分</span>
                <a-slider
                  v-model:value="qualityWeights.darkHorse"
                  :min="0"
                  :max="35"
                  :step="1"
                  :tooltip="{ formatter: (val: number) => `${val}分` }"
                  vertical
                  :style="{ height: '150px' }"
                  @change="(val: number) => handleQualityChange('darkHorse', val)"
                />
                <span class="item-label">黑马作者</span>
              </div>
              <div class="dimension-item-vertical">
                <span class="item-value">{{ qualityWeights.highPotential }}分</span>
                <a-slider
                  v-model:value="qualityWeights.highPotential"
                  :min="0"
                  :max="35"
                  :step="1"
                  :tooltip="{ formatter: (val: number) => `${val}分` }"
                  vertical
                  :style="{ height: '150px' }"
                  @change="(val: number) => handleQualityChange('highPotential', val)"
                />
                <span class="item-label">高潜作者</span>
              </div>
            </div>
          </div>

          <!-- 其他维度 -->
          <div class="dimension-group">
            <div class="group-header">
              <span class="group-title">其他维度</span>
              <span class="group-max">累加：{{ qualityWeights.followers + qualityWeights.interaction + qualityWeights.growth + qualityWeights.starIndex }}分 / 100分</span>
            </div>
            <div class="group-items-vertical">
              <div class="dimension-item-vertical">
                <span class="item-value">{{ qualityWeights.followers }}分</span>
                <a-slider
                  v-model:value="qualityWeights.followers"
                  :min="0"
                  :max="40"
                  :step="1"
                  :tooltip="{ formatter: (val: number) => `${val}分` }"
                  vertical
                  :style="{ height: '150px' }"
                  @change="(val: number) => handleQualityChange('followers', val)"
                />
                <span class="item-label">粉丝规模</span>
              </div>
              <div class="dimension-item-vertical">
                <span class="item-value">{{ qualityWeights.interaction }}分</span>
                <a-slider
                  v-model:value="qualityWeights.interaction"
                  :min="0"
                  :max="25"
                  :step="1"
                  :tooltip="{ formatter: (val: number) => `${val}分` }"
                  vertical
                  :style="{ height: '150px' }"
                  @change="(val: number) => handleQualityChange('interaction', val)"
                />
                <span class="item-label">互动质量</span>
              </div>
              <div class="dimension-item-vertical">
                <span class="item-value">{{ qualityWeights.growth }}分</span>
                <a-slider
                  v-model:value="qualityWeights.growth"
                  :min="0"
                  :max="20"
                  :step="1"
                  :tooltip="{ formatter: (val: number) => `${val}分` }"
                  vertical
                  :style="{ height: '150px' }"
                  @change="(val: number) => handleQualityChange('growth', val)"
                />
                <span class="item-label">粉丝增长</span>
              </div>
              <div class="dimension-item-vertical">
                <span class="item-value">{{ qualityWeights.starIndex }}分</span>
                <a-slider
                  v-model:value="qualityWeights.starIndex"
                  :min="0"
                  :max="15"
                  :step="1"
                  :tooltip="{ formatter: (val: number) => `${val}分` }"
                  vertical
                  :style="{ height: '150px' }"
                  @change="(val: number) => handleQualityChange('starIndex', val)"
                />
                <span class="item-label">星图指数</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </a-card>

    <!-- 用户偏好配置 -->
    <a-card class="config-card" :bordered="false">
      <template #title>
        <span class="card-title">
          <UserOutlined />
          用户偏好分（动态计算）
        </span>
      </template>

      <a-table
        :columns="preferenceColumns"
        :data-source="preferenceData"
        :pagination="false"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'type'">
            <a-tag :color="record.type === 'recommended' ? 'blue' : 'green'">
              {{ record.typeName }}
            </a-tag>
          </template>
          <template v-if="column.key === 'formula'">
            <code class="formula-code">{{ record.formula }}</code>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, computed, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import {
  ControlOutlined,
  DatabaseOutlined,
  StarOutlined,
  UserOutlined,
  SaveOutlined,
  ReloadOutlined
} from '@ant-design/icons-vue'

// 系统默认推荐权重配置
const recommendedWeights = reactive({
  private: 40,
  quality: 60,
  preference: 0
})

// 用户主动排序权重配置
const customWeights = reactive({
  private: 20,
  quality: 20,
  preference: 60
})

// 私域价值分配置
const privateWeights = reactive({
  // 机构价值
  xinglian: 40,
  sgxingmei: 40,
  // 政策等级
  policyS: 30,
  policyA: 24,
  policyB: 18,
  policyC: 12,
  policyD: 6,
  // 其他
  exclusive: 15,
  rebate: 10,
  annual: 5
})

// 平台质量分配置
const qualityWeights = reactive({
  // 官方认证
  qualityAuthor: 25,
  darkHorse: 20,
  highPotential: 15,
  // 其他
  followers: 30,
  interaction: 20,
  growth: 15,
  starIndex: 10
})

// 计算系统默认推荐权重总和
const recommendedWeightSum = computed(() => {
  return recommendedWeights.private + recommendedWeights.quality + recommendedWeights.preference
})

// 计算用户主动排序权重总和
const customWeightSum = computed(() => {
  return customWeights.private + customWeights.quality + customWeights.preference
})

// 计算私域价值分最大值（同组取最高值）
const privateMaxScore = computed(() => {
  const organizationMax = Math.max(privateWeights.xinglian, privateWeights.sgxingmei)
  const policyMax = Math.max(
    privateWeights.policyS,
    privateWeights.policyA,
    privateWeights.policyB,
    privateWeights.policyC,
    privateWeights.policyD
  )
  const othersSum = privateWeights.exclusive + privateWeights.rebate + privateWeights.annual
  return organizationMax + policyMax + othersSum
})

// 计算平台质量分最大值（同组取最高值）
const qualityMaxScore = computed(() => {
  const certificationMax = Math.max(
    qualityWeights.qualityAuthor,
    qualityWeights.darkHorse,
    qualityWeights.highPotential
  )
  const othersSum = qualityWeights.followers + qualityWeights.interaction + qualityWeights.growth + qualityWeights.starIndex
  return certificationMax + othersSum
})

// 记录上次的值，用于回滚
let lastPrivateWeights = { ...privateWeights }
let lastQualityWeights = { ...qualityWeights }

// 防抖定时器
let warningTimer: number | null = null

// 防抖提示函数
const showWarning = (msg: string) => {
  if (warningTimer) {
    clearTimeout(warningTimer)
  }
  warningTimer = setTimeout(() => {
    message.warning(msg)
    warningTimer = null
  }, 100) as unknown as number
}

// 处理私域价值分变化
const handlePrivateChange = (key: keyof typeof privateWeights, newValue: number) => {
  const oldValue = lastPrivateWeights[key]
  
  // 先计算如果设置新值后的总分
  const tempWeights = { ...privateWeights, [key]: newValue }
  const organizationMax = Math.max(tempWeights.xinglian, tempWeights.sgxingmei)
  const policyMax = Math.max(
    tempWeights.policyS,
    tempWeights.policyA,
    tempWeights.policyB,
    tempWeights.policyC,
    tempWeights.policyD
  )
  const othersSum = tempWeights.exclusive + tempWeights.rebate + tempWeights.annual
  const newTotal = organizationMax + policyMax + othersSum
  
  // 如果超过100且是增加操作，则阻止并提示
  if (newTotal > 100 && newValue > oldValue) {
    nextTick(() => {
      privateWeights[key] = oldValue
    })
    showWarning('总和不能超过100分')
    return
  }
  
  // 更新记录
  lastPrivateWeights[key] = newValue
}

// 处理平台质量分变化
const handleQualityChange = (key: keyof typeof qualityWeights, newValue: number) => {
  const oldValue = lastQualityWeights[key]
  
  // 先计算如果设置新值后的总分
  const tempWeights = { ...qualityWeights, [key]: newValue }
  const certificationMax = Math.max(
    tempWeights.qualityAuthor,
    tempWeights.darkHorse,
    tempWeights.highPotential
  )
  const othersSum = tempWeights.followers + tempWeights.interaction + tempWeights.growth + tempWeights.starIndex
  const newTotal = certificationMax + othersSum
  
  // 如果超过100且是增加操作，则阻止并提示
  if (newTotal > 100 && newValue > oldValue) {
    nextTick(() => {
      qualityWeights[key] = oldValue
    })
    showWarning('总和不能超过100分')
    return
  }
  
  // 更新记录
  lastQualityWeights[key] = newValue
}

// 圆环图百分比格式化
const formatPercent = (percent: number) => {
  return `${percent}%`
}

// 用户偏好表格配置
const preferenceColumns = [
  { title: '排序类型', dataIndex: 'type', key: 'type', width: 150 },
  { title: '类型名称', dataIndex: 'typeName', key: 'typeName', width: 150 },
  { title: '偏好分计算公式', dataIndex: 'formula', key: 'formula' },
  { title: '说明', dataIndex: 'description', key: 'description' }
]

const preferenceData = [
  {
    key: '1',
    type: 'recommended',
    typeName: '综合推荐',
    formula: '0',
    description: '综合推荐不额外加偏好分'
  },
  {
    key: '2',
    type: 'follower_desc',
    typeName: '粉丝数降序',
    formula: 'LOG10(粉丝数) × 10',
    description: '粉丝数越多分越高'
  },
  {
    key: '3',
    type: 'star_index_desc',
    typeName: '星图指数降序',
    formula: 'star_index',
    description: '星图指数原值'
  },
  {
    key: '4',
    type: 'interact_rate_desc',
    typeName: '互动率降序',
    formula: '互动率 × 500',
    description: '10%互动率=50分'
  },
  {
    key: '5',
    type: 'price_asc',
    typeName: '价格升序',
    formula: '100 - (价格÷1000)',
    description: '价格越低分越高'
  },
  {
    key: '6',
    type: 'price_desc',
    typeName: '价格降序',
    formula: '价格 ÷ 1000',
    description: '价格越高分越高'
  }
]

// 保存配置
const handleSave = () => {
  if (recommendedWeightSum.value !== 100) {
    message.warning('系统默认推荐权重总和必须等于100%')
    return
  }
  if (customWeightSum.value !== 100) {
    message.warning('用户主动排序权重总和必须等于100%')
    return
  }

  // TODO: 调用API保存配置
  message.success('配置保存成功')
}

// 恢复默认
const handleReset = () => {
  recommendedWeights.private = 40
  recommendedWeights.quality = 60
  recommendedWeights.preference = 0

  customWeights.private = 20
  customWeights.quality = 20
  customWeights.preference = 60
  
  // 私域价值分
  privateWeights.xinglian = 40
  privateWeights.sgxingmei = 40
  privateWeights.policyS = 30
  privateWeights.policyA = 24
  privateWeights.policyB = 18
  privateWeights.policyC = 12
  privateWeights.policyD = 6
  privateWeights.exclusive = 15
  privateWeights.rebate = 10
  privateWeights.annual = 5
  
  // 平台质量分
  qualityWeights.qualityAuthor = 25
  qualityWeights.darkHorse = 20
  qualityWeights.highPotential = 15
  qualityWeights.followers = 30
  qualityWeights.interaction = 20
  qualityWeights.growth = 15
  qualityWeights.starIndex = 10
  
  // 更新记录值
  lastPrivateWeights = { ...privateWeights }
  lastQualityWeights = { ...qualityWeights }
  
  message.info('已恢复默认配置')
}
</script>

<style scoped lang="scss">
.influencer-sorting-algorithm {
  padding: 24px;
  background: #f0f2f5;
  min-height: 100vh;

  .page-header {
    margin-bottom: 24px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 24px;

    .page-header-left {
      flex: 1;
    }

    .page-header-right {
      flex-shrink: 0;
    }

    .page-title {
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 600;
    }

    .page-description {
      margin: 0;
      font-size: 14px;
      color: #666666;
      line-height: 22px;
    }
  }

  .config-card {
    margin-bottom: 16px;
    
    .card-title {
      font-size: 20px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #666666;
    }
    
    .weights-wrapper {
      display: flex;
      gap: 0;
      position: relative;

      &::before {
        content: '';
        position: absolute;
        left: 50%;
        top: 0;
        bottom: 0;
        width: 1px;
        background: #e8e8e8;
        transform: translateX(-50%);
      }

      .weight-section {
        flex: 1;
        padding: 0 24px;

        &:first-child {
          padding-left: 0;
        }

        &:last-child {
          padding-right: 0;
        }

        .section-title {
          text-align: center;
          font-size: 18px;
          color: #666;
          margin-bottom: 20px;
        }
      }
    }

    .weights-config {
      display: grid;
      gap: 24px;
      
      .weight-item {
        .weight-label {
          display: flex;
          justify-content: space-between;
          margin-bottom: 12px;
          
          .label-text {
            color: #666;
            font-size: 16px;
            font-weight: 500;
          }
          
          .label-value {
            font-size: 16px;
            font-weight: 600;
            color: #1890ff;
          }
        }
      }
    }
    
    .weight-warning {
      margin-top: 16px;
    }
    
    .content-with-summary {
      display: flex;
      gap: 24px;
      align-items: flex-start;
      align-items: center;
    }
    
    .score-summary-vertical,
    .score-summary-horizontal {
      min-width: 200px;
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 32px;
      padding: 16px;
      
      .summary-text {
        font-size: 16px;
        color: #666;
        line-height: 22px;
        text-align: center;
      }
      
      .summary-note {
        font-size: 14px;
        color: #666666;
        text-align: center;
      }
    }
    
    .dimension-groups {
      flex: 1;
      display: flex;
      flex-direction: row;
      gap: 50px;
    }
    
    .dimension-group {
      // border: 1px solid #e8e8e8;
      // border-radius: 8px;
      padding: 0 26px;
      // background: #fafafa;
      min-width: 300px;
      flex-shrink: 0;
      
      .group-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-bottom: 12px;
        border-bottom: 1px solid #e8e8e8;
        
        .group-title {
          font-size: 16px;
          color: #666;
        }
        
        .group-max {
          font-size: 13px;
          font-weight: 500;
          color: #1890ff;
        }
      }
      
      .group-items-vertical {
        // background: rgb(201, 121, 121);
        display: flex;
        gap: 24px;
        justify-content: flex-start;
        flex-wrap: nowrap;
        overflow-x: auto;
      }
    }
    
    .dimension-item-vertical {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 16px;
      // background: white;
      border-radius: 6px;
      min-width: 80px;
      flex-shrink: 0;
      
      .item-label {
        font-size: 14px;
        color: #666;
        text-align: center;
      }
      
      .item-value {
        font-size: 14px;
        color: #666;
        text-align: center;
      }
    }
  }

  .formula-code {
    padding: 2px 8px;
    background: #f5f5f5;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    color: #d4380d;
  }
}

:deep(.ant-slider) {
  .ant-slider-rail {
    height: 4px;
    background-color: #f0f0f0;
  }

  .ant-slider-track {
    height: 4px;
    background: linear-gradient(90deg, #d6e4ff 0%, #86bff5 100%);
  }

  &.ant-slider-disabled {
    .ant-slider-rail {
      height: 4px !important;
      background-color: #f0f0f0 !important;
    }

    .ant-slider-track {
      height: 4px !important;
      background: linear-gradient(90deg, #d6e4ff 0%, #86bff5 100%) !important;
    }
  }

  // 竖向滑块的渐变方向从下到上
  &.ant-slider-vertical {
    .ant-slider-rail {
      width: 6px !important;
      height: 100% !important;
      background-color: #f0f0f0 !important;
    }

    .ant-slider-track {
      width: 6px !important;
      background: linear-gradient(0deg, #d6e4ff 0%, #86bff5 100%) !important;
    }

    &.ant-slider-disabled {
      .ant-slider-rail {
        width: 6px !important;
        height: 100% !important;
        background-color: #f0f0f0 !important;
      }

      .ant-slider-track {
        width: 6px !important;
        background: linear-gradient(0deg, #d6e4ff 0%, #86bff5 100%) !important;
      }
    }
  }


}

:deep(.ant-progress) {
  .ant-progress-text {
    font-weight: 600;
    color: #666;
  }
}
</style>
