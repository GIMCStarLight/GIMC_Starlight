<template>
  <div class="quick-filters-optimized">
    <!-- 第0行:基础信息 -->
    <div class="filter-row basic-info-row">
      <span class="filter-label">基础筛选</span>
      <div class="filter-content basic-info-grid">
        <div class="basic-item">
          <el-input 
            v-model="basicInfo.keyword" 
            placeholder="搜索昵称或ID" 
            clearable 
            size="default"
            @input="handleBasicInfoChange"
          >
            <template #prefix><Icon icon="lucide:search" /></template>
          </el-input>
        </div>
        <div class="basic-item">
          <el-radio-group v-model="basicInfo.gender" size="default" @change="handleBasicInfoChange">
            <el-radio-button :value="undefined">不限性别</el-radio-button>
            <el-radio-button value="M">男</el-radio-button>
            <el-radio-button value="F">女</el-radio-button>
          </el-radio-group>
        </div>
        <div class="basic-item">
          <el-input 
            v-model="basicInfo.province" 
            placeholder="省份(如: 北京)" 
            clearable 
            size="default"
            @input="handleBasicInfoChange"
          >
            <template #prefix><Icon icon="lucide:map-pin" /></template>
          </el-input>
        </div>
        <div class="basic-item">
          <el-input 
            v-model="basicInfo.city" 
            placeholder="城市(如: 北京市)" 
            clearable 
            size="default"
            @input="handleBasicInfoChange"
          >
            <template #prefix><Icon icon="lucide:map" /></template>
          </el-input>
        </div>
      </div>
    </div>

    <!-- 第1行:业务场景 -->
    <div class="filter-row">
      <span class="filter-label">合作诉求</span>
      <div class="filter-buttons">
        <el-button
          v-for="item in cooperationTypes"
          :key="item.value"
          :type="selectedCooperation === item.value ? 'primary' : ''"
          size="default"
          @click="handleCooperationChange(item.value)"
        >
          {{ item.label }}
        </el-button>
      </div>
    </div>

    <!-- 第2行:内容定位 -->
    <div class="filter-row">
      <span class="filter-label">内容定位</span>
      <div class="filter-content">
        <!-- 一级标签快捷按钮（支持下拉二级标签）-->
        <div class="hot-tags">
          <el-button
            :type="selectedTags.length === 0 ? 'primary' : ''"
            size="default"
            @click="clearTags"
          >
            不限
          </el-button>
          
          <!-- 一级标签（仅显示一级标签，二级标签下拉功能已隐藏）-->
          <template v-for="category in (showAllTags ? contentTagsHierarchy : contentTagsHierarchy.slice(0, 8))" :key="category.code">
            <!-- 有二级标签：显示下拉菜单 - 已注释隐藏 -->
            <!-- <el-dropdown 
              v-if="category.children && category.children.length > 0"
              trigger="click"
              @command="(subcategory) => handleSubcategorySelect(category.code, subcategory)"
            >
              <el-button
                :type="isTagSelected(category.code) ? 'primary' : ''"
                size="default"
              >
                {{ category.category }}
                <span class="tag-count">({{ getCategoryCount(category.code) }})</span>
                <Icon icon="lucide:chevron-down" class="ml-1" />
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item 
                    :command="null"
                    :class="{ 'is-active': isOnlyCategorySelected(category.code) }"
                  >
                    <el-checkbox 
                      :model-value="isOnlyCategorySelected(category.code)"
                      @change="toggleCategoryOnly(category.code)"
                    >
                      全选
                    </el-checkbox>
                  </el-dropdown-item>
                  <el-dropdown-item 
                    v-for="child in category.children" 
                    :key="child.code"
                    :command="child.code"
                    :class="{ 'is-active': isSubcategorySelected(category.code, child.code) }"
                  >
                    <el-checkbox 
                      :model-value="isSubcategorySelected(category.code, child.code)"
                    >
                      {{ child.name }}
                    </el-checkbox>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            -->
            
            <!-- 无二级标签：直接点击 -->
            <el-button
              :type="isTagSelected(category.code) ? 'primary' : ''"
              size="default"
              @click="toggleCategoryOnly(category.code)"
            >
              {{ category.category }}
              <span class="tag-count">({{ getCategoryCount(category.code) }})</span>
            </el-button>
          </template>
          
          <!-- 更多/收起按钮 -->
          <el-button 
            v-if="contentTagsHierarchy.length > 8"
            size="default"
            @click="showAllTags = !showAllTags"
          >
            {{ showAllTags ? '收起' : '更多' }}
            <Icon :icon="showAllTags ? 'lucide:chevron-up' : 'lucide:chevron-down'" class="ml-1" />
          </el-button>
        </div>
        
        <!-- 已选标签 -->
        <div v-if="selectedTags.length > 0" class="selected-tags">
          <el-tag
            v-for="tag in selectedTags"
            :key="tag"
            closable
            type="primary"
            @close="removeTag(tag)"
          >
            {{ getTagDisplayName(tag) }}
          </el-tag>
        </div>
      </div>
    </div>

    <!-- 第3行:达人属性(仅保留特殊认证) -->
    <div class="filter-row">
      <span class="filter-label">达人认证</span>
      <div class="filter-buttons">
        <el-button
          :type="influencerAttrs.certType === undefined ? 'primary' : ''"
          size="default"
          @click="influencerAttrs.certType = undefined; handleAttrChange()"
        >
          不限
        </el-button>
        <el-button
          :type="influencerAttrs.certType === 'shenguangxingmei' ? 'primary' : ''"
          size="default"
          @click="influencerAttrs.certType = 'shenguangxingmei'; handleAttrChange()"
        >
          省广星媒
        </el-button>
        <el-button
          :type="influencerAttrs.certType === 'xingliandaren' ? 'primary' : ''"
          size="default"
          @click="influencerAttrs.certType = 'xingliandaren'; handleAttrChange()"
        >
          星链达人
        </el-button>
        <el-button
          :type="influencerAttrs.certType === 'excellentAuthor' ? 'primary' : ''"
          size="default"
          @click="influencerAttrs.certType = 'excellentAuthor'; handleAttrChange()"
        >
          优质达人
        </el-button>
        <el-button
          :type="influencerAttrs.certType === 'risingStart' ? 'primary' : ''"
          size="default"
          @click="influencerAttrs.certType = 'risingStart'; handleAttrChange()"
        >
          新星达人
        </el-button>
        <el-button
          :type="influencerAttrs.certType === 'highPotential' ? 'primary' : ''"
          size="default"
          @click="influencerAttrs.certType = 'highPotential'; handleAttrChange()"
        >
          高潜达人
        </el-button>
        <el-button
          :type="influencerAttrs.certType === 'blackHorse' ? 'primary' : ''"
          size="default"
          @click="influencerAttrs.certType = 'blackHorse'; handleAttrChange()"
        >
          黑马达人
        </el-button>
      </div>
    </div>

    <!-- 第6行:智能场景 -->
    <div class="filter-row">
      <span class="filter-label">场景推荐</span>
      <div class="filter-buttons">
        <el-button
          v-for="scenario in scenarios"
          :key="scenario.key"
          :type="selectedScenario === scenario.key ? 'primary' : ''"
          size="default"
          @click="applyScenario(scenario)"
        >
          <Icon :icon="scenario.icon" />
          {{ scenario.label }}
        </el-button>
      </div>
    </div>

    <!-- 第7行:核心指标 -->
    <div class="filter-row">
      <span class="filter-label">核心指标</span>
      <div class="filter-content advanced-grid">
        <div class="advanced-item">
          <span class="advanced-label">粉丝规模</span>
          <DiscreteRangePicker
            v-model="followerRange"
            :options="FOLLOWER_OPTIONS"
            @update:model-value="handleAdvancedChange"
          />
        </div>
        <div class="advanced-item">
          <span class="advanced-label">报价区间</span>
          <DiscreteRangePicker
            v-model="priceRange"
            :options="PRICE_OPTIONS"
            @update:model-value="handleAdvancedChange"
          />
        </div>
        <div class="advanced-item">
          <span class="advanced-label">30日GMV</span>
          <DiscreteRangePicker
            v-model="gmvRange"
            :options="GMV_OPTIONS"
            @update:model-value="handleAdvancedChange"
          />
        </div>
        <div class="advanced-item">
          <span class="advanced-label">预期播放量</span>
          <DiscreteRangePicker
            v-model="expectedPlayRange"
            :options="EXPECTED_PLAY_OPTIONS"
            @update:model-value="handleAdvancedChange"
          />
        </div>
        <div class="advanced-item">
          <span class="advanced-label">预期CPM</span>
          <DiscreteRangePicker
            v-model="expectedCpmRange"
            :options="EXPECTED_CPM_OPTIONS"
            @update:model-value="handleAdvancedChange"
          />
        </div>
        <div class="advanced-item">
          <span class="advanced-label">预期CPE</span>
          <DiscreteRangePicker
            v-model="expectedCpeRange"
            :options="EXPECTED_CPE_OPTIONS"
            @update:model-value="handleAdvancedChange"
          />
        </div>
        <div class="advanced-item">
          <span class="advanced-label">爆文率</span>
          <DiscreteRangePicker
            v-model="burstRateRange"
            :options="BURST_RATE_OPTIONS"
            @update:model-value="handleAdvancedChange"
          />
        </div>
      </div>
    </div>

    <!-- 第8行:内容质量指标 -->
    <div class="filter-row">
      <span class="filter-label">内容质量</span>
      <div class="filter-content advanced-grid">
        <div class="advanced-item">
          <span class="advanced-label">互动率</span>
          <DiscreteRangePicker
            v-model="interactRateRange"
            :options="INTERACT_RATE_OPTIONS"
            @update:model-value="handleAdvancedChange"
          />
        </div>
        <div class="advanced-item">
          <span class="advanced-label">完播率</span>
          <DiscreteRangePicker
            v-model="playOverRateRange"
            :options="PLAY_OVER_RATE_OPTIONS"
            @update:model-value="handleAdvancedChange"
          />
        </div>
        <div class="advanced-item">
          <span class="advanced-label">30日增长</span>
          <DiscreteRangePicker
            v-model="growthRateRange"
            :options="GROWTH_RATE_OPTIONS"
            @update:model-value="handleAdvancedChange"
          />
        </div>
      </div>
    </div>

    <!-- 第9行:营销指数 -->
    <div class="filter-row">
      <span class="filter-label">营销指数</span>
      <div class="filter-content advanced-grid">
        <div class="advanced-item">
          <span class="advanced-label">最低转化</span>
          <PickerInput
            v-model="advancedFilters.minConvertIndex"
            :options="MARKETING_INDEX_OPTIONS"
            placeholder="≥ 不限"
            @update:model-value="handleAdvancedChange"
          />
        </div>
        <div class="advanced-item">
          <span class="advanced-label">最低种草</span>
          <PickerInput
            v-model="advancedFilters.minShoppingIndex"
            :options="MARKETING_INDEX_OPTIONS"
            placeholder="≥ 不限"
            @update:model-value="handleAdvancedChange"
          />
        </div>
        <div class="advanced-item">
          <span class="advanced-label">最低传播</span>
          <PickerInput
            v-model="advancedFilters.minSpreadIndex"
            :options="MARKETING_INDEX_OPTIONS"
            placeholder="≥ 不限"
            @update:model-value="handleAdvancedChange"
          />
        </div>
      </div>
    </div>

    <!-- 筛选状态总览 -->
    <div v-if="hasActiveFilters" class="filter-summary">
      <div class="summary-content">
        <span class="summary-label">当前筛选:</span>
        <el-tag
          v-for="filter in activeFilterTags"
          :key="filter.key"
          closable
          type="info"
          @close="removeFilter(filter.key)"
        >
          {{ filter.label }}
        </el-tag>
        <el-button link type="primary" size="small" @click="clearAllFilters">
          清空全部
        </el-button>
      </div>
      <div class="summary-stats">
        <span class="stats-text">
          预计 <strong class="stats-number">{{ estimatedCount }}</strong> 位达人
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { IconifyIcon as Icon } from '@vben/icons'
import { getPopularTags, type QuickFilterParams, type AdvancedFilterParams } from '#/api/influencer-filter'
import { useDebounceFn } from '@vueuse/core'
import DiscreteRangePicker from '../DiscreteRangePicker.vue'
import PickerInput from '../PickerInput.vue'
import { 
  FOLLOWER_OPTIONS, 
  PRICE_OPTIONS, 
  INTERACT_RATE_OPTIONS,
  PLAY_OVER_RATE_OPTIONS,
  GROWTH_RATE_OPTIONS,
  GMV_OPTIONS,
  MARKETING_INDEX_OPTIONS,
  EXPECTED_PLAY_OPTIONS,
  EXPECTED_CPM_OPTIONS,
  EXPECTED_CPE_OPTIONS,
  BURST_RATE_OPTIONS
} from '../../constants/filter-options'

// ========== 数据定义 ==========

const cooperationTypes = [
  { label: '全部', value: '' },
  { label: '短视频推广', value: 'short_video' },
  { label: '直播合作', value: 'live' },
  { label: '电商带货', value: 'ecommerce' },
  { label: '品牌曝光', value: 'brand' },
  { label: '内容定制', value: 'content' }
]

const selectedCooperation = ref('')
const selectedTags = ref<string[]>([])
const hotTags = ref<{ tag: string; count: number }[]>([])
const showAllTags = ref(false)  // 控制是否显示所有标签

// 内容标签层级结构（基于设计方案的30个一级标签）
const contentTagsHierarchy = ref([
  {
    category: '美妆',
    code: 'beauty',
    icon: '',
    children: [
      { name: '美妆教程', code: 'makeup_tutorial' },
      { name: '妆容展示', code: 'makeup_show' },
      { name: '护肤保养', code: 'skincare' },
      { name: '美妆测评种草', code: 'makeup_review' },
    ]
  },
  {
    category: '时尚',
    code: 'fashion',
    icon: '',
    children: [
      { name: '穿搭', code: 'outfit' },
      { name: '街拍', code: 'street_snap' },
      { name: '造型', code: 'styling' },
      { name: '时尚媒体', code: 'fashion_media' },
    ]
  },
  {
    category: '萌宠',
    code: 'pet',
    icon: '',
    children: [
      { name: '日常宠物', code: 'daily_pet' },
      { name: '特别宠物', code: 'special_pet' },
      { name: '宠物周边', code: 'pet_peripheral' },
    ]
  },
  {
    category: '测评',
    code: 'review',
    icon: '',
    children: [
      { name: '美妆', code: 'beauty_review' },
      { name: '3C数码', code: 'digital_review' },
      { name: '汽车', code: 'auto_review' },
      { name: '美食', code: 'food_review' },
      { name: '母婴', code: 'baby_review' },
      { name: '综合', code: 'general_review' },
      { name: '酒店', code: 'hotel_review' },
    ]
  },
  {
    category: '游戏',
    code: 'game',
    icon: '',
    children: [
      { name: '剧情', code: 'game_story' },
      { name: '解说', code: 'game_commentary' },
      { name: '资讯', code: 'game_news' },
      { name: '录屏', code: 'game_screen' },
      { name: '集锦', code: 'game_highlight' },
    ]
  },
  {
    category: '二次元',
    code: 'anime',
    icon: '',
    children: [
      { name: '真人', code: 'anime_real' },
      { name: '动画漫画', code: 'animation' },
      { name: '配音声优', code: 'voice_actor' },
      { name: '宅物手办', code: 'anime_goods' },
    ]
  },
  {
    category: '旅行',
    code: 'travel',
    icon: '',
    children: [
      { name: '记录', code: 'travel_record' },
      { name: '攻略', code: 'travel_guide' },
      { name: '推荐', code: 'travel_recommend' },
      { name: '户外生活', code: 'outdoor_life' },
    ]
  },
  {
    category: '汽车',
    code: 'auto',
    icon: '',
    children: [
      { name: '测评', code: 'auto_review' },
      { name: '知识', code: 'auto_knowledge' },
      { name: '周边', code: 'auto_peripheral' },
    ]
  },
  {
    category: '生活',
    code: 'lifestyle',
    icon: '',
    children: [
      { name: '记录', code: 'life_record' },
      { name: '小窍门', code: 'life_tips' },
      { name: '好物推荐', code: 'good_stuff' },
      { name: '健康养生', code: 'health' },
      { name: '婚恋', code: 'marriage' },
    ]
  },
  {
    category: '音乐',
    code: 'music',
    icon: '',
    children: [
      { name: '演唱', code: 'singing' },
      { name: '演奏', code: 'playing' },
      { name: '教学', code: 'music_teaching' },
      { name: '剪辑', code: 'music_editing' },
    ]
  },
  {
    category: '舞蹈',
    code: 'dance',
    icon: '',
    children: [
      { name: '舞蹈表演', code: 'dance_performance' },
      { name: '舞蹈教学', code: 'dance_teaching' },
    ]
  },
  {
    category: '美食',
    code: 'food',
    icon: '',
    children: [
      { name: '教程', code: 'food_tutorial' },
      { name: '探店', code: 'food_explore' },
      { name: '测评', code: 'food_review' },
      { name: '乡村野食', code: 'rural_food' },
      { name: '酒类', code: 'wine' },
    ]
  },
  {
    category: '母婴亲子',
    code: 'mother_baby',
    icon: '',
    children: [
      { name: '育儿科普', code: 'parenting_knowledge' },
      { name: '萌娃日常', code: 'baby_daily' },
      { name: '亲子互动', code: 'parent_child' },
      { name: '测评种草', code: 'baby_review' },
    ]
  },
  {
    category: '运动健身',
    code: 'sports',
    icon: '',
    children: [
      { name: '健身', code: 'fitness' },
      { name: '极限运动', code: 'extreme_sports' },
      { name: '体育资讯', code: 'sports_news' },
      { name: '冰雪', code: 'ice_snow' },
      { name: '垂钓', code: 'fishing' },
      { name: '格斗', code: 'fighting' },
      { name: '球类', code: 'ball_sports' },
      { name: '综合体育', code: 'general_sports' },
    ]
  },
  {
    category: '科技数码',
    code: 'tech',
    icon: '',
    children: [
      { name: '3C数码', code: 'digital_3c' },
      { name: '家居电器', code: 'home_appliance' },
      { name: '科技', code: 'technology' },
    ]
  },
  {
    category: '教育培训',
    code: 'education',
    icon: '',
    children: [
      { name: '考学培训', code: 'exam_training' },
      { name: '语言教学', code: 'language_teaching' },
      { name: '个人管理', code: 'personal_management' },
      { name: '职业教育', code: 'vocational_education' },
    ]
  },
  {
    category: '颜值达人',
    code: 'appearance',
    icon: '',
    children: [
      { name: '美女', code: 'beauty_girl' },
      { name: '帅哥', code: 'handsome_boy' },
    ]
  },
  {
    category: '生活家居',
    code: 'home',
    icon: '',
    children: [
      { name: '硬装', code: 'hard_decoration' },
      { name: '软装', code: 'soft_decoration' },
      { name: '生活技巧', code: 'life_skills' },
      { name: '家居氛围', code: 'home_atmosphere' },
    ]
  },
  {
    category: '才艺技能',
    code: 'talent',
    icon: '',
    children: [
      { name: '创意才能', code: 'creative_talent' },
      { name: '手工', code: 'handcraft' },
      { name: '摄影', code: 'photography' },
      { name: '绘画', code: 'painting' },
    ]
  },
  {
    category: '影视娱乐',
    code: 'entertainment',
    icon: '',
    children: [
      { name: '影视解说', code: 'movie_commentary' },
      { name: '混剪', code: 'video_editing' },
      { name: '明星资讯', code: 'celebrity_news' },
      { name: '综艺', code: 'variety_show' },
    ]
  },
  {
    category: '艺术文化',
    code: 'culture',
    icon: '',
    children: [
      { name: '传统文化', code: 'traditional_culture' },
      { name: '人文科普', code: 'humanities' },
      { name: '自然科学', code: 'natural_science' },
    ]
  },
  {
    category: '财经投资',
    code: 'finance',
    icon: '',
    children: [
      { name: '传统金融', code: 'traditional_finance' },
      { name: '互联网金融', code: 'internet_finance' },
      { name: '财经知识', code: 'finance_knowledge' },
    ]
  },
  {
    category: '三农',
    code: 'agriculture',
    icon: '',
    children: [
      { name: '农业', code: 'farming' },
      { name: '农村', code: 'rural' },
      { name: '农民', code: 'farmer' },
    ]
  },
  {
    category: '剧情搞笑',
    code: 'comedy',
    icon: '',
    children: [
      { name: '剧情', code: 'story' },
      { name: '搞笑', code: 'funny' },
    ]
  },
  {
    category: '情感',
    code: 'emotion',
    icon: '',
    children: [
      { name: '情感故事', code: 'emotion_story' },
      { name: '情感咨询', code: 'emotion_consulting' },
    ]
  },
  {
    category: '园艺',
    code: 'gardening',
    icon: '',
    children: [
      { name: '花卉', code: 'flowers' },
      { name: '绿植', code: 'plants' },
    ]
  },
  {
    category: '房产',
    code: 'real_estate',
    icon: '',
    children: [
      { name: '知识', code: 'property_knowledge' },
      { name: '投资', code: 'property_investment' },
      { name: '楼盘评测', code: 'property_review' },
      { name: '楼市资讯', code: 'property_news' },
      { name: '租房', code: 'rental' },
    ]
  },
  {
    category: '随拍',
    code: 'random_shoot',
    icon: '',
    children: [
      { name: '日常随拍', code: 'daily_shoot' },
    ]
  },
  {
    category: '媒体号',
    code: 'media',
    icon: '',
    children: [
      { name: '新闻媒体', code: 'news_media' },
      { name: '自媒体', code: 'self_media' },
    ]
  },
])

const filters = ref<QuickFilterParams>({})

// 基础信息筛选
const basicInfo = ref<{
  keyword: string
  gender: 'M' | 'F' | 'U' | undefined
  province: string
  city: string
}>({
  keyword: '',
  gender: undefined,
  province: '',
  city: ''
})

// 达人属性筛选(仅保留特殊认证)
const influencerAttrs = ref<{
  certType?: 'shenguangxingmei' | 'xingliandaren' | 'excellentAuthor' | 'blackHorse' | 'risingStart' | 'highPotential'
}>({
  certType: undefined
})

// 智能场景
const selectedScenario = ref('')
const scenarios = [
  { 
    key: 'ecommerce', 
    label: '电商带货推荐', 
    icon: 'lucide:shopping-bag', 
    filters: { 
      minFollowers: 100000, 
      maxFollowers: 1000000, 
      ecommerceEnabled: true,
      ecomCapabilityTier: 'high' as const
    }
  },
  { 
    key: 'brand', 
    label: '品牌曝光优选', 
    icon: 'lucide:megaphone', 
    filters: { 
      minFollowers: 500000, 
      minInteractRate: 0.10 
    }
  },
  { 
    key: 'value', 
    label: '性价比达人', 
    icon: 'lucide:trending-up', 
    filters: { 
      minFollowers: 50000, 
      maxFollowers: 500000, 
      maxPrice20_60: 5000, 
      minInteractRate: 0.12 
    }
  },
  { 
    key: 'rising', 
    label: '新星榜单', 
    icon: 'lucide:rocket', 
    filters: { 
      minFollowers: 10000, 
      maxFollowers: 100000, 
      minGrowthRate30d: 0.3 
    }
  }
]

// 高级筛选
const advancedFilters = ref<AdvancedFilterParams>({
  minFollowers: undefined, 
  maxFollowers: undefined, 
  minGrowthRate30d: undefined, 
  maxGrowthRate30d: undefined,
  minInteractRate: undefined, 
  maxInteractRate: undefined, 
  minPlayOverRate: undefined, 
  maxPlayOverRate: undefined,
  minVvMedian: undefined, 
  maxVvMedian: undefined,
  minGmv30d: undefined, 
  maxGmv30d: undefined, 
  minConvertIndex: undefined, 
  minShoppingIndex: undefined,
  minSpreadIndex: undefined, 
  minCpmEfficiency: undefined, 
  maxCpmEfficiency: undefined, 
  minPrice20_60: undefined,
  maxPrice20_60: undefined,
  minExpectedPlayNum: undefined,
  maxExpectedPlayNum: undefined,
  minExpectedCpm: undefined,
  maxExpectedCpm: undefined,
  minExpectedCpe: undefined,
  maxExpectedCpe: undefined,
  minBurstRate: undefined,
  maxBurstRate: undefined
})

// 高级筛选范围计算属性
const followerRange = computed({
  get: (): [number | undefined, number | undefined] => [advancedFilters.value.minFollowers, advancedFilters.value.maxFollowers],
  set: (value: [number | undefined, number | undefined]) => {
    advancedFilters.value.minFollowers = value[0]
    advancedFilters.value.maxFollowers = value[1]
  }
})

const priceRange = computed({
  get: (): [number | undefined, number | undefined] => [advancedFilters.value.minPrice20_60, advancedFilters.value.maxPrice20_60],
  set: (value: [number | undefined, number | undefined]) => {
    advancedFilters.value.minPrice20_60 = value[0]
    advancedFilters.value.maxPrice20_60 = value[1]
  }
})

const interactRateRange = computed({
  get: (): [number | undefined, number | undefined] => [advancedFilters.value.minInteractRate, advancedFilters.value.maxInteractRate],
  set: (value: [number | undefined, number | undefined]) => {
    advancedFilters.value.minInteractRate = value[0]
    advancedFilters.value.maxInteractRate = value[1]
  }
})

const playOverRateRange = computed({
  get: (): [number | undefined, number | undefined] => [advancedFilters.value.minPlayOverRate, advancedFilters.value.maxPlayOverRate],
  set: (value: [number | undefined, number | undefined]) => {
    advancedFilters.value.minPlayOverRate = value[0]
    advancedFilters.value.maxPlayOverRate = value[1]
  }
})

const growthRateRange = computed({
  get: (): [number | undefined, number | undefined] => [advancedFilters.value.minGrowthRate30d, advancedFilters.value.maxGrowthRate30d],
  set: (value: [number | undefined, number | undefined]) => {
    advancedFilters.value.minGrowthRate30d = value[0]
    advancedFilters.value.maxGrowthRate30d = value[1]
  }
})

const gmvRange = computed({
  get: (): [number | undefined, number | undefined] => [advancedFilters.value.minGmv30d, advancedFilters.value.maxGmv30d],
  set: (value: [number | undefined, number | undefined]) => {
    advancedFilters.value.minGmv30d = value[0]
    advancedFilters.value.maxGmv30d = value[1]
  }
})

const expectedPlayRange = computed({
  get: (): [number | undefined, number | undefined] => [advancedFilters.value.minExpectedPlayNum, advancedFilters.value.maxExpectedPlayNum],
  set: (value: [number | undefined, number | undefined]) => {
    advancedFilters.value.minExpectedPlayNum = value[0]
    advancedFilters.value.maxExpectedPlayNum = value[1]
  }
})

const expectedCpmRange = computed({
  get: (): [number | undefined, number | undefined] => [advancedFilters.value.minExpectedCpm, advancedFilters.value.maxExpectedCpm],
  set: (value: [number | undefined, number | undefined]) => {
    advancedFilters.value.minExpectedCpm = value[0]
    advancedFilters.value.maxExpectedCpm = value[1]
  }
})

const expectedCpeRange = computed({
  get: (): [number | undefined, number | undefined] => [advancedFilters.value.minExpectedCpe, advancedFilters.value.maxExpectedCpe],
  set: (value: [number | undefined, number | undefined]) => {
    advancedFilters.value.minExpectedCpe = value[0]
    advancedFilters.value.maxExpectedCpe = value[1]
  }
})

const burstRateRange = computed({
  get: (): [number | undefined, number | undefined] => [advancedFilters.value.minBurstRate, advancedFilters.value.maxBurstRate],
  set: (value: [number | undefined, number | undefined]) => {
    advancedFilters.value.minBurstRate = value[0]
    advancedFilters.value.maxBurstRate = value[1]
  }
})

const estimatedCount = ref(0)

// ========== Emits ==========

const emit = defineEmits<{
  filterChange: [filters: QuickFilterParams]
  estimatedCountChange: [count: number]
}>()

// ========== 计算属性 ==========

const hasActiveFilters = computed(() => {
  return selectedCooperation.value !== '' ||
    selectedTags.value.length > 0 ||
    basicInfo.value.keyword !== '' ||
    basicInfo.value.gender !== undefined ||
    basicInfo.value.province !== '' ||
    basicInfo.value.city !== '' ||
    influencerAttrs.value.certType !== undefined ||
    Object.values(advancedFilters.value).some(v => v !== undefined && v !== null)
})

const activeFilterTags = computed(() => {
  const tags: { key: string; label: string }[] = []
  
  if (basicInfo.value.keyword) {
    tags.push({ key: 'keyword', label: `关键词: ${basicInfo.value.keyword}` })
  }
  
  if (basicInfo.value.gender) {
    const genderLabel = basicInfo.value.gender === 'M' ? '男' : basicInfo.value.gender === 'F' ? '女' : '未知'
    tags.push({ key: 'gender', label: `性别: ${genderLabel}` })
  }
  
  if (basicInfo.value.province) {
    tags.push({ key: 'province', label: `省份: ${basicInfo.value.province}` })
  }
  
  if (basicInfo.value.city) {
    tags.push({ key: 'city', label: `城市: ${basicInfo.value.city}` })
  }
  
  if (selectedCooperation.value) {
    const type = cooperationTypes.find(t => t.value === selectedCooperation.value)
    tags.push({ key: 'cooperation', label: `合作: ${type?.label}` })
  }
  
  if (selectedTags.value.length > 0) {
    tags.push({ key: 'tags', label: `标签: ${selectedTags.value.join(', ')}` })
  }
  
  const certLabels = { 
    shenguangxingmei: '省广星媒',
    xingliandaren: '星链达人',
    excellentAuthor: '优质达人', 
    risingStart: '新星达人', 
    highPotential: '高潜达人', 
    blackHorse: '黑马达人' 
  }
  if (influencerAttrs.value.certType) {
    tags.push({ key: 'certType', label: `认证: ${certLabels[influencerAttrs.value.certType]}` })
  }
  
  return tags
})

// ========== 方法 ==========

const formatCount = (count: number) => {
  if (count >= 10000) return `${(count / 10000).toFixed(1)}万`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`
  return count.toString()
}

const handleCooperationChange = (value: string) => {
  selectedCooperation.value = value
  emitFilterChange()
}

const toggleTag = (tag: string) => {
  const index = selectedTags.value.indexOf(tag)
  if (index > -1) {
    selectedTags.value.splice(index, 1)
  } else {
    if (selectedTags.value.length < 5) {
      selectedTags.value.push(tag)
    }
  }
  emitFilterChange()
}

// 判断一级分类是否被选中（包括自身或任意二级标签）
const isTagSelected = (categoryCode: string) => {
  return selectedTags.value.some(tag => tag.startsWith(categoryCode))
}

// 判断是否只选中了一级分类（没有选二级）
const isOnlyCategorySelected = (categoryCode: string) => {
  return selectedTags.value.includes(categoryCode)
}

// 判断二级标签是否被选中
const isSubcategorySelected = (categoryCode: string, subcategoryCode: string) => {
  const fullCode = `${categoryCode}.${subcategoryCode}`
  return selectedTags.value.includes(fullCode)
}

// 切换一级分类选中状态（不选二级）
const toggleCategoryOnly = (categoryCode: string) => {
  // 移除所有该分类的标签（包括一级和二级）
  selectedTags.value = selectedTags.value.filter(tag => !tag.startsWith(categoryCode))
  
  // 如果之前没选中，则添加一级标签
  if (!isTagSelected(categoryCode)) {
    if (selectedTags.value.length < 5) {
      selectedTags.value.push(categoryCode)
    }
  }
  
  emitFilterChange()
}

// 选择二级标签 - 已注释隐藏
// const handleSubcategorySelect = (categoryCode: string, subcategoryCode: string | null) => {
//   if (subcategoryCode === null) {
//     // 点击了"全选"，切换一级分类
//     toggleCategoryOnly(categoryCode)
//     return
//   }
//   
//   const fullCode = `${categoryCode}.${subcategoryCode}`
//   const index = selectedTags.value.indexOf(fullCode)
//   
//   // 先移除一级标签（如果存在）
//   const categoryIndex = selectedTags.value.indexOf(categoryCode)
//   if (categoryIndex > -1) {
//     selectedTags.value.splice(categoryIndex, 1)
//   }
//   
//   // 切换二级标签
//   if (index > -1) {
//     selectedTags.value.splice(index, 1)
//   } else {
//     if (selectedTags.value.length < 5) {
//       selectedTags.value.push(fullCode)
//     }
//   }
//   
//   emitFilterChange()
// }

// 获取分类统计数量（从hotTags中查找）
const getCategoryCount = (categoryCode: string) => {
  const category = contentTagsHierarchy.value.find(c => c.code === categoryCode)
  if (!category) return 0
  
  // 查找该分类在hotTags中的数量
  const hotTag = hotTags.value.find(t => t.tag === category.category)
  return hotTag ? hotTag.count : 0
}

// 获取标签的中文显示名称
const getTagDisplayName = (tag: string): string => {
  // 一级标签
  const category = contentTagsHierarchy.value.find(c => c.code === tag)
  if (category) {
    return `${category.category}`
  }
  
  // 二级标签 - 已注释隐藏
  // if (tag.includes('.')) {
  //   const [categoryCode, subcategoryCode] = tag.split('.')
  //   const parentCategory = contentTagsHierarchy.value.find(c => c.code === categoryCode)
  //   if (parentCategory && parentCategory.children) {
  //     const subcategory = parentCategory.children.find(s => s.code === subcategoryCode)
  //     if (subcategory) {
  //       return `${parentCategory.category} > ${subcategory.name}`
  //     }
  //   }
  // }
  
  return tag
}

const removeTag = (tag: string) => {
  const index = selectedTags.value.indexOf(tag)
  if (index > -1) {
    selectedTags.value.splice(index, 1)
    emitFilterChange()
  }
}

const clearTags = () => {
  selectedTags.value = []
  emitFilterChange()
}

const handleTagChange = () => {
  emitFilterChange()
}

const handleFilterChange = () => {
  emitFilterChange()
}

const removeFilter = (key: string) => {
  switch (key) {
    case 'keyword':
      basicInfo.value.keyword = ''
      break
    case 'gender':
      basicInfo.value.gender = undefined
      break
    case 'province':
      basicInfo.value.province = ''
      break
    case 'city':
      basicInfo.value.city = ''
      break
    case 'cooperation':
      selectedCooperation.value = ''
      break
    case 'tags':
      selectedTags.value = []
      break
    case 'certType':
      influencerAttrs.value.certType = undefined
      break
  }
  emitFilterChange()
}

const clearAllFilters = () => {
  basicInfo.value = {
    keyword: '',
    gender: undefined,
    province: '',
    city: ''
  }
  selectedCooperation.value = ''
  selectedTags.value = []
  filters.value = {}
  influencerAttrs.value = {
    certType: undefined
  }
  resetAdvancedFilters()
  emitFilterChange()
}

const handleBasicInfoChange = () => {
  emitFilterChange()
}

const handleAttrChange = () => {
  emitFilterChange()
}

// 智能场景应用
const applyScenario = (scenario: typeof scenarios[0]) => {
  if (selectedScenario.value === scenario.key) {
    // 再次点击同一场景，清空
    selectedScenario.value = ''
    resetAdvancedFilters()
    return
  }
  selectedScenario.value = scenario.key
  // 应用场景筛选
Object.assign(advancedFilters.value, scenario.filters)
  emitFilterChange()
}

// 高级筛选变化
const handleAdvancedChange = () => {
  emitFilterChange()
}

// 重置高级筛选
const resetAdvancedFilters = () => {
  advancedFilters.value = {
    minFollowers: undefined, 
    maxFollowers: undefined, 
    minGrowthRate30d: undefined, 
    maxGrowthRate30d: undefined,
    minInteractRate: undefined, 
    maxInteractRate: undefined, 
    minPlayOverRate: undefined, 
    maxPlayOverRate: undefined,
    minVvMedian: undefined, 
    maxVvMedian: undefined,
    minGmv30d: undefined, 
    maxGmv30d: undefined, 
    minConvertIndex: undefined, 
    minShoppingIndex: undefined,
    minSpreadIndex: undefined, 
    minCpmEfficiency: undefined, 
    maxCpmEfficiency: undefined, 
    minPrice20_60: undefined,
    maxPrice20_60: undefined,
    minExpectedPlayNum: undefined,
    maxExpectedPlayNum: undefined,
    minExpectedCpm: undefined,
    maxExpectedCpm: undefined,
    minExpectedCpe: undefined,
    maxExpectedCpe: undefined,
    minBurstRate: undefined,
    maxBurstRate: undefined
  }
}

const emitFilterChange = useDebounceFn(() => {
  // 将前端选中的标签转换为中文标签名（与数据库一致）
  const chineseTagNames = selectedTags.value.map(tag => {
    // 处理一级标签
    const category = contentTagsHierarchy.value.find(c => c.code === tag)
    if (category) {
      return category.category  // 返回中文名："美妆"
    }
    
    // 处理二级标签 - 已注释隐藏，数据库中不存在二级标签数据
    // if (tag.includes('.')) {
    //   const [categoryCode, subcategoryCode] = tag.split('.')
    //   const parentCategory = contentTagsHierarchy.value.find(c => c.code === categoryCode)
    //   if (parentCategory && parentCategory.children) {
    //     const subcategory = parentCategory.children.find(s => s.code === subcategoryCode)
    //     if (subcategory) {
    //       return subcategory.name  // 返回二级标签中文名："护肤保养"
    //     }
    //   }
    // }
    
    return tag  // fallback
  })
  
  // 处理特殊认证和机构筛选
  const certMapping: any = {}
  if (influencerAttrs.value.certType) {
    // 如果是机构筛选,映射到orgName参数
    if (influencerAttrs.value.certType === 'shenguangxingmei') {
      certMapping.orgName = '省广星媒'
    } else if (influencerAttrs.value.certType === 'xingliandaren') {
      certMapping.orgName = '星链达人'
    } else {
      // 其他认证类型保持原有逻辑
      certMapping[influencerAttrs.value.certType] = true
    }
  }
  
  // 构建筛选参数 - 只传递有值的字段
  const params: any = {
    ...filters.value,
    // 基础信息 - gender需要传递undefined以清除筛选
    ...(basicInfo.value.keyword ? { keyword: basicInfo.value.keyword } : {}),
    // gender: 总是传递（包括undefined），这样能清除之前的筛选
    ...(basicInfo.value.gender !== undefined ? { gender: basicInfo.value.gender as 'M' | 'F' | 'U' } : { gender: undefined }),
    ...(basicInfo.value.province ? { province: basicInfo.value.province } : {}),
    ...(basicInfo.value.city ? { city: basicInfo.value.city } : {}),
    // 标签
    primaryTags: chineseTagNames.length > 0 ? chineseTagNames : undefined,
    // 达人属性 - 仅保留特殊认证
    ...certMapping,
    // 高级筛选参数
    ...Object.entries(advancedFilters.value).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        acc[key] = value
      }
      return acc
    }, {} as any)
  }
  
  emit('filterChange', params)
}, 300)

// 加载热门标签
const loadHotTags = async () => {
  try {
    const tags = await getPopularTags(30)
    hotTags.value = tags
  } catch (error) {
    console.error('加载热门标签失败:', error)
  }
}

// ========== 生命周期 ==========

onMounted(() => {
  loadHotTags()
})

// 监听预估数量变化
watch(() => estimatedCount.value, (newVal) => {
  emit('estimatedCountChange', newVal)
})
</script>

<style scoped lang="scss">
.quick-filters-optimized {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
}

.filter-row {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;  // 统一间距为16px
  
  &:last-child {
    margin-bottom: 0;
  }
  
  &.basic-info-row {
    padding-bottom: 16px;
    margin-bottom: 16px;  // 保持一致
    border-bottom: 2px solid #e5e7eb;
  }
}

.filter-label {
  min-width: 90px;
  font-weight: 500;
  color: #303133;
  line-height: 32px;
  margin-right: 16px;
}

.filter-buttons {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-content {
  flex: 1;
  
  &.dual-dimension {
    display: grid;
    grid-template-columns: 0.5fr 1fr;
    gap: 8px 24px;
    align-items: flex-start;
  }
  
  &.basic-info-grid {
    display: grid;
    grid-template-columns: 2fr 1.5fr 1.5fr 1.5fr;
    gap: 12px;
    align-items: center;
  }
  
  &.attribute-grid {
    display: grid;
    grid-template-columns: 0.5fr 1fr;
    gap: 8px 24px;
    align-items: flex-start;
  }
}

.dimension-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.dimension-label {
  min-width: 80px;
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
}

.attribute-item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.attribute-label {
  min-width: 80px;
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
}

.info-icon {
  font-size: 14px;
  color: #909399;
  cursor: help;
  
  &.trend-icon {
    color: #67c23a;
  }
}

.hot-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.tag-count {
  font-size: 12px;
  color: #909399;
  margin-left: 4px;
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.all-tags-panel {
  max-height: 400px;
  overflow-y: auto;
}

.tag-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.basic-item {
  :deep(.el-input__wrapper) {
    transition: all 0.3s;
    
    &:hover {
      box-shadow: 0 0 0 1px #409eff inset;
    }
  }
  
  :deep(.el-radio-group) {
    display: flex;
    width: 100%;
  }
}

.filter-summary {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-content {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.summary-label {
  font-size: 13px;
  color: #606266;
}

.summary-stats {
  white-space: nowrap;
}

.stats-text {
  font-size: 14px;
  color: #606266;
}

.stats-number {
  font-size: 18px;
  color: #409eff;
  font-weight: 600;
  margin: 0 4px;
}

/* 二级标签下拉菜单样式 */
.el-dropdown-menu__item {
  &.is-active {
    background-color: #ecf5ff;
    color: #409eff;
  }
}

/* Checkbox 在下拉菜单中的样式 */
:deep(.el-dropdown-menu__item) {
  .el-checkbox {
    width: 100%;
    
    .el-checkbox__label {
      width: 100%;
    }
  }
}

/* 高级筛选网格布局 */
.advanced-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px 24px;  // 增加竖直间距到16px，水平间距保持24px
  max-width: 1300px;
  
  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.advanced-item {
  display: flex;
  align-items: center;  // 改为水平布局
  gap: 12px;  // 增加间距
  min-width: 0;  // 正字暗示元素能偏缩
}

.advanced-label {
  font-size: 13px;  // 稍微增大字号
  color: #374151;  // 加深颜色，提高可读性
  font-weight: 500;
  white-space: nowrap;
  min-width: 70px;  // 确保标签宽度一致
}
</style>
