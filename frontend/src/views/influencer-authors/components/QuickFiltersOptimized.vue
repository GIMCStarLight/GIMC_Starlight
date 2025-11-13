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

    <!-- 第3行:数据表现 -->
    <div class="filter-row">
      <span class="filter-label">数据表现</span>
      <div class="filter-content dual-dimension">
        <!-- 内容质量 -->
        <div class="dimension-group">
          <span class="dimension-label">内容质量:</span>
          <el-radio-group
            v-model="filters.qualityTier"
            @change="handleFilterChange"
          >
            <el-radio-button :value="undefined">不限</el-radio-button>
            <el-radio-button value="premium">优质</el-radio-button>
            <el-radio-button value="high">良好</el-radio-button>
            <el-radio-button value="medium">一般</el-radio-button>
            <el-radio-button value="low">基础</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 粉丝增势 -->
        <div class="dimension-group">
          <span class="dimension-label">粉丝增势:</span>
          <el-radio-group
            v-model="filters.growthLevel"
            @change="handleFilterChange"
          >
            <el-radio-button :value="undefined">不限</el-radio-button>
            <el-radio-button value="explosive">爆发(≥30%)</el-radio-button>
            <el-radio-button value="high">高速(10-30%)</el-radio-button>
            <el-radio-button value="medium">稳定(3-10%)</el-radio-button>
            <el-radio-button value="low">缓慢(0-3%)</el-radio-button>
          </el-radio-group>
        </div>
      </div>
    </div>

    <!-- 第4行:预算规模 -->
    <div class="filter-row">
      <span class="filter-label">预算规模</span>
      <div class="filter-content dual-dimension">
        <!-- 价格档位 -->
        <div class="dimension-group">
          <span class="dimension-label">价格档位:</span>
          <el-radio-group
            v-model="filters.priceTier"
            @change="handleFilterChange"
          >
            <el-radio-button :value="undefined">不限</el-radio-button>
            <el-radio-button value="low">1-5千</el-radio-button>
            <el-radio-button value="medium">5千-2万</el-radio-button>
            <el-radio-button value="high">2-5万</el-radio-button>
            <el-radio-button value="premium">5万+</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 达人规模 -->
        <div class="dimension-group">
          <span class="dimension-label">达人规模:</span>
          <el-radio-group
            v-model="filters.influencerTier"
            @change="handleFilterChange"
          >
            <el-radio-button :value="undefined">不限</el-radio-button>
            <el-radio-button value="nano">新星(1万以下)</el-radio-button>
            <el-radio-button value="micro">腰部(1-10万)</el-radio-button>
            <el-radio-button value="mid">中部(10-100万)</el-radio-button>
            <el-radio-button value="macro">头部(100-1000万)</el-radio-button>
            <el-radio-button value="mega">顶流(1000万+)</el-radio-button>
          </el-radio-group>
        </div>
      </div>
    </div>

    <!-- 第5行:达人属性 -->
    <div class="filter-row">
      <span class="filter-label">达人属性</span>
      <div class="filter-content attribute-grid">
        <!-- 电商状态 -->
        <div class="attribute-item">
          <span class="attribute-label">电商状态:</span>
          <el-radio-group v-model="influencerAttrs.ecommerceEnabled" size="default" @change="handleAttrChange">
            <el-radio-button :value="undefined">不限</el-radio-button>
            <el-radio-button :value="true">已开通</el-radio-button>
            <el-radio-button :value="false">未开通</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 电商等级 -->
        <div class="attribute-item">
          <span class="attribute-label">电商等级:</span>
          <el-radio-group v-model="influencerAttrs.ecomCapabilityTier" size="default" @change="handleAttrChange">
            <el-radio-button :value="undefined">不限</el-radio-button>
            <el-radio-button value="top">顶级</el-radio-button>
            <el-radio-button value="high">高级</el-radio-button>
            <el-radio-button value="medium">中级</el-radio-button>
            <el-radio-button value="low">初级</el-radio-button>
          </el-radio-group>
        </div>

        <!-- 特殊认证 -->
        <div class="attribute-item">
          <span class="attribute-label">特殊认证:</span>
          <el-radio-group v-model="influencerAttrs.certType" size="default" @change="handleAttrChange">
            <el-radio-button :value="undefined">不限</el-radio-button>
            <el-radio-button value="excellentAuthor">优质</el-radio-button>
            <el-radio-button value="risingStart">新星</el-radio-button>
            <el-radio-button value="highPotential">高潜</el-radio-button>
            <el-radio-button value="blackHorse">黑马</el-radio-button>
          </el-radio-group>
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
import { getPopularTags, type QuickFilterParams } from '../../../api/influencer-filter'
import { useDebounceFn } from '@vueuse/core'

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

const filters = ref<QuickFilterParams>({
  qualityTier: undefined,
  growthLevel: undefined,
  priceTier: undefined,
  influencerTier: undefined
})

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

// 达人属性筛选
const influencerAttrs = ref<{
  ecommerceEnabled?: boolean
  ecomCapabilityTier?: 'top' | 'high' | 'medium' | 'low'
  certType?: 'excellentAuthor' | 'blackHorse' | 'risingStart' | 'highPotential'
}>({
  ecommerceEnabled: undefined,
  ecomCapabilityTier: undefined,
  certType: undefined
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
    filters.value.qualityTier !== undefined ||
    filters.value.growthLevel !== undefined ||
    filters.value.priceTier !== undefined ||
    filters.value.influencerTier !== undefined ||
    basicInfo.value.keyword !== '' ||
    basicInfo.value.gender !== undefined ||
    basicInfo.value.province !== '' ||
    basicInfo.value.city !== '' ||
    influencerAttrs.value.ecommerceEnabled !== undefined ||
    influencerAttrs.value.ecomCapabilityTier !== undefined ||
    influencerAttrs.value.certType !== undefined
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
  
  const qualityLabels = { premium: '优质', high: '良好', medium: '一般', low: '基础' }
  if (filters.value.qualityTier) {
    tags.push({ key: 'quality', label: `质量: ${qualityLabels[filters.value.qualityTier]}` })
  }
  
  const growthLabels = { 
    explosive: '爆发(≥30%)', 
    high: '高速(10-30%)', 
    medium: '稳定(3-10%)', 
    low: '缓慢(0-3%)' 
  }
  if (filters.value.growthLevel) {
    tags.push({ key: 'growth', label: `增长: ${growthLabels[filters.value.growthLevel]}` })
  }
  
  const priceLabels = { 
    low: '1-5千', 
    medium: '5千-2万', 
    high: '2-5万', 
    premium: '5万+' 
  }
  if (filters.value.priceTier) {
    tags.push({ key: 'price', label: `价格: ${priceLabels[filters.value.priceTier]}` })
  }
  
  const tierLabels = { nano: '新星', micro: '腰部', mid: '中部', macro: '头部', mega: '顶流' }
  if (filters.value.influencerTier) {
    tags.push({ key: 'tier', label: `规模: ${tierLabels[filters.value.influencerTier]}` })
  }
  
  // 达人属性标签
  if (influencerAttrs.value.ecommerceEnabled !== undefined) {
    tags.push({ key: 'ecommerceEnabled', label: `电商状态: ${influencerAttrs.value.ecommerceEnabled ? '已开通' : '未开通'}` })
  }
  
  const ecomTierLabels = { top: '顶级', high: '高级', medium: '中级', low: '初级' }
  if (influencerAttrs.value.ecomCapabilityTier) {
    tags.push({ key: 'ecomCapabilityTier', label: `电商等级: ${ecomTierLabels[influencerAttrs.value.ecomCapabilityTier]}` })
  }
  
  const certLabels = { 
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
    case 'quality':
      filters.value.qualityTier = undefined
      break
    case 'growth':
      filters.value.growthLevel = undefined
      break
    case 'price':
      filters.value.priceTier = undefined
      break
    case 'tier':
      filters.value.influencerTier = undefined
      break
    case 'ecommerceEnabled':
      influencerAttrs.value.ecommerceEnabled = undefined
      break
    case 'ecomCapabilityTier':
      influencerAttrs.value.ecomCapabilityTier = undefined
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
  filters.value = {
    qualityTier: undefined,
    growthLevel: undefined,
    priceTier: undefined,
    influencerTier: undefined
  }
  influencerAttrs.value = {
    ecommerceEnabled: undefined,
    ecomCapabilityTier: undefined,
    certType: undefined
  }
  emitFilterChange()
}

const handleBasicInfoChange = () => {
  emitFilterChange()
}

const handleAttrChange = () => {
  emitFilterChange()
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
  
  // 处理特殊认证
  const certMapping: any = {}
  if (influencerAttrs.value.certType) {
    certMapping[influencerAttrs.value.certType] = true
  }
  
  // 构建筛选参数 - 只传递有值的字段
  const params: QuickFilterParams = {
    ...filters.value,
    // 基础信息 - gender需要传递undefined以清除筛选
    ...(basicInfo.value.keyword ? { keyword: basicInfo.value.keyword } : {}),
    // gender: 总是传递（包括undefined），这样能清除之前的筛选
    ...(basicInfo.value.gender !== undefined ? { gender: basicInfo.value.gender as 'M' | 'F' | 'U' } : { gender: undefined }),
    ...(basicInfo.value.province ? { province: basicInfo.value.province } : {}),
    ...(basicInfo.value.city ? { city: basicInfo.value.city } : {}),
    // 标签
    primaryTags: chineseTagNames.length > 0 ? chineseTagNames : undefined,
    // 达人属性 - 只传递非undefined的值
    ...(influencerAttrs.value.ecommerceEnabled !== undefined ? { ecommerceEnabled: influencerAttrs.value.ecommerceEnabled } : {}),
    ...(influencerAttrs.value.ecomCapabilityTier ? { ecomCapabilityTier: influencerAttrs.value.ecomCapabilityTier } : {}),
    ...certMapping
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
  margin-bottom: 12px;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  &.basic-info-row {
    padding-bottom: 16px;
    margin-bottom: 20px;
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
</style>
