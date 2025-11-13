<template>
  <div class="quick-filters">
    <!-- 第一行:合作诉求 -->
    <div class="filter-row">
      <span class="filter-label">合作诉求</span>
      <div class="filter-buttons">
        <el-button 
          :type="selectedCooperation === '' ? 'primary' : ''"
          size="default"
          @click="handleCooperationChange('')"
        >
          不限
        </el-button>
        <el-button 
          :type="selectedCooperation === 'short_video' ? 'primary' : ''"
          size="default"
          @click="handleCooperationChange('short_video')"
        >
          短视频达人
        </el-button>
        <el-button 
          :type="selectedCooperation === 'ecommerce' ? 'primary' : ''"
          size="default"
          @click="handleCooperationChange('ecommerce')"
        >
          电商带货
        </el-button>
        <el-button 
          :type="selectedCooperation === 'brand' ? 'primary' : ''"
          size="default"
          @click="handleCooperationChange('brand')"
        >
          品牌曝光
        </el-button>
        <el-button 
          :type="selectedCooperation === 'content' ? 'primary' : ''"
          size="default"
          @click="handleCooperationChange('content')"
        >
          内容定制
        </el-button>
      </div>
    </div>

    <!-- 第二行:适配行业(内容标签) -->
    <div class="filter-row">
      <span class="filter-label">适配行业</span>
      <div class="filter-buttons">
        <el-button 
          :type="selectedContentTags.length === 0 ? 'primary' : ''"
          size="default"
          @click="clearContentTags"
        >
          不限
        </el-button>
        
        <!-- 第一层分类按钮 -->
        <el-dropdown 
          v-for="category in contentTagsHierarchy.slice(0, 15)"
          :key="category.code"
          trigger="click"
          @command="handleCategorySelect"
        >
          <el-button 
            size="default"
            :type="isCategorySelected(category) ? 'primary' : ''"
          >
            {{ category.category }}
            <Icon icon="lucide:chevron-down" style="margin-left: 4px" />
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item 
                v-for="tag in category.children"
                :key="tag.code"
                :command="{ category: category.code, tag: tag.name }"
              >
                <el-checkbox 
                  :model-value="selectedContentTags.includes(tag.name)"
                  @click.stop
                >
                  {{ tag.name }}
                </el-checkbox>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        
        <!-- 更多分类 -->
        <el-button 
          size="default"
          @click="showMoreCategories = !showMoreCategories"
        >
          更多
          <Icon :icon="showMoreCategories ? 'lucide:chevron-up' : 'lucide:chevron-down'" style="margin-left: 4px" />
        </el-button>
      </div>
      
      <!-- 更多分类展开内容 -->
      <el-collapse-transition>
        <div v-show="showMoreCategories" class="more-categories">
          <div class="more-categories-grid">
            <el-dropdown 
              v-for="category in contentTagsHierarchy.slice(15)"
              :key="category.code"
              trigger="click"
              @command="handleCategorySelect"
            >
              <el-button 
                size="default"
                :type="isCategorySelected(category) ? 'primary' : ''"
              >
                {{ category.category }}
                <Icon icon="lucide:chevron-down" style="margin-left: 4px" />
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item 
                    v-for="tag in category.children"
                    :key="tag.code"
                    :command="{ category: category.code, tag: tag.name }"
                  >
                    <el-checkbox 
                      :model-value="selectedContentTags.includes(tag.name)"
                      @click.stop
                    >
                      {{ tag.name }}
                    </el-checkbox>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </el-collapse-transition>
      
      <div class="filter-buttons">
        
        <!-- 已选标签显示 -->
        <div v-if="selectedContentTags.length > 0" class="selected-tags">
          <el-tag
            v-for="tag in selectedContentTags"
            :key="tag"
            closable
            @close="removeContentTag(tag)"
            style="margin-right: 8px"
          >
            {{ tag }}
          </el-tag>
        </div>
      </div>
    </div>

    <!-- 第三行:达人类型 -->
    <div class="filter-row">
      <span class="filter-label">达人类型</span>
      <div class="filter-buttons">
        <el-button 
          :type="selectedTier === '' ? 'primary' : ''"
          size="default"
          @click="handleTierChange('')"
        >
          不限
        </el-button>
        <el-button 
          :type="selectedTier === 'mega' ? 'primary' : ''"
          size="default"
          @click="handleTierChange('mega')"
        >
          顶流(100万+)
        </el-button>
        <el-button 
          :type="selectedTier === 'macro' ? 'primary' : ''"
          size="default"
          @click="handleTierChange('macro')"
        >
          头部(10-100万)
        </el-button>
        <el-button 
          :type="selectedTier === 'micro' ? 'primary' : ''"
          size="default"
          @click="handleTierChange('micro')"
        >
          腰部(1-10万)
        </el-button>
        <el-button 
          :type="selectedTier === 'nano' ? 'primary' : ''"
          size="default"
          @click="handleTierChange('nano')"
        >
          新星(1万以下)
        </el-button>
      </div>
    </div>

    <!-- 第四行:匹配度 -->
    <div class="filter-row">
      <span class="filter-label">匹配度</span>
      <div class="filter-buttons">
        <!-- 达人认证 -->
        <el-dropdown trigger="click">
          <el-button 
            size="default"
            :type="selectedCertifications.length > 0 ? 'primary' : ''"
          >
            达人认证
            <Icon icon="lucide:chevron-down" style="margin-left: 4px" />
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click.stop>
                <el-checkbox 
                  v-model="selectedCertifications"
                  value="excellent"
                  @change="handleCertificationChange"
                >
                  优质作者
                </el-checkbox>
              </el-dropdown-item>
              <el-dropdown-item @click.stop>
                <el-checkbox 
                  v-model="selectedCertifications"
                  value="black_horse"
                  @change="handleCertificationChange"
                >
                  黑马作者
                </el-checkbox>
              </el-dropdown-item>
              <el-dropdown-item @click.stop>
                <el-checkbox 
                  v-model="selectedCertifications"
                  value="high_potential"
                  @change="handleCertificationChange"
                >
                  高潜达人
                </el-checkbox>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        
        <!-- 内容类型 -->
        <el-dropdown trigger="click">
          <el-button 
            size="default"
            :type="selectedContentTypes.length > 0 ? 'primary' : ''"
          >
            内容类型
            <Icon icon="lucide:chevron-down" style="margin-left: 4px" />
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click.stop>
                <el-checkbox 
                  v-model="selectedContentTypes"
                  value="short_drama"
                  @change="handleContentTypeChange"
                >
                  短剧达人
                </el-checkbox>
              </el-dropdown-item>
              <el-dropdown-item @click.stop>
                <el-checkbox 
                  v-model="selectedContentTypes"
                  value="cocreate"
                  @change="handleContentTypeChange"
                >
                  共创达人
                </el-checkbox>
              </el-dropdown-item>
              <el-dropdown-item @click.stop>
                <el-checkbox 
                  v-model="selectedContentTypes"
                  value="cpm_project"
                  @change="handleContentTypeChange"
                >
                  CPM项目
                </el-checkbox>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        
        <!-- 性别 -->
        <el-dropdown trigger="click">
          <el-button 
            size="default"
            :type="selectedGender !== undefined ? 'primary' : ''"
          >
            {{ getGenderLabel() }}
            <Icon icon="lucide:chevron-down" style="margin-left: 4px" />
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="handleGenderChange(undefined)">不限</el-dropdown-item>
              <el-dropdown-item @click="handleGenderChange(1)">男性达人</el-dropdown-item>
              <el-dropdown-item @click="handleGenderChange(2)">女性达人</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        
        <!-- 电商能力 -->
        <el-dropdown trigger="click">
          <el-button 
            size="default"
            :type="selectedEcommerce !== '' ? 'primary' : ''"
          >
            {{ getEcommerceLabel() }}
            <Icon icon="lucide:chevron-down" style="margin-left: 4px" />
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="handleEcommerceChange('')">不限</el-dropdown-item>
              <el-dropdown-item @click="handleEcommerceChange('enabled')">已开通</el-dropdown-item>
              <el-dropdown-item @click="handleEcommerceChange('with_videos')">有带货视频</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        
        <!-- 价格区间 -->
        <el-dropdown trigger="click">
          <el-button 
            size="default"
            :type="selectedPriceRange !== '' ? 'primary' : ''"
          >
            {{ getPriceRangeLabel() }}
            <Icon icon="lucide:chevron-down" style="margin-left: 4px" />
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="handlePriceRangeChange('')">不限</el-dropdown-item>
              <el-dropdown-item @click="handlePriceRangeChange('0-5000')">5千以下</el-dropdown-item>
              <el-dropdown-item @click="handlePriceRangeChange('5000-10000')">5千-1万</el-dropdown-item>
              <el-dropdown-item @click="handlePriceRangeChange('10000-30000')">1-3万</el-dropdown-item>
              <el-dropdown-item @click="handlePriceRangeChange('30000-100000')">3-10万</el-dropdown-item>
              <el-dropdown-item @click="handlePriceRangeChange('100000-1000000')">10万+</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        
        <!-- 所在地域 -->
        <el-dropdown trigger="click">
          <el-button 
            size="default"
            :type="selectedProvince !== '' ? 'primary' : ''"
          >
            {{ getProvinceLabel() }}
            <Icon icon="lucide:chevron-down" style="margin-left: 4px" />
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="handleProvinceChange('')">不限</el-dropdown-item>
              <el-dropdown-item @click="handleProvinceChange('广东省')">广东</el-dropdown-item>
              <el-dropdown-item @click="handleProvinceChange('浙江省')">浙江</el-dropdown-item>
              <el-dropdown-item @click="handleProvinceChange('北京市')">北京</el-dropdown-item>
              <el-dropdown-item @click="handleProvinceChange('上海市')">上海</el-dropdown-item>
              <el-dropdown-item @click="handleProvinceChange('江苏省')">江苏</el-dropdown-item>
              <el-dropdown-item @click="handleProvinceChange('四川省')">四川</el-dropdown-item>
              <el-dropdown-item @click="handleProvinceChange('山东省')">山东</el-dropdown-item>
              <el-dropdown-item @click="handleProvinceChange('湖南省')">湖南</el-dropdown-item>
              <el-dropdown-item @click="handleProvinceChange('河南省')">河南</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
    
    <!-- 筛选统计 -->
    <div class="filter-summary" v-if="activeFilterCount > 0">
      <span>已选择 {{ activeFilterCount }} 个筛选条件</span>
      <el-button link type="primary" @click="clearAllFilters">清空所有筛选</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { IconifyIcon as Icon } from '@vben/icons'
import { useInfluencerSquareStore } from '#/store/influencer-square'

const store = useInfluencerSquareStore()

// 状态
const selectedCooperation = ref('')
const selectedContentTags = ref<string[]>([])
const selectedTier = ref('')
const selectedCertifications = ref<string[]>([])
const selectedContentTypes = ref<string[]>([])
const selectedGender = ref<number | undefined>(undefined)
const selectedEcommerce = ref('')
const selectedPriceRange = ref('')
const selectedProvince = ref('')
const showMoreCategories = ref(false)

// 23个内容标签分类(移除emoji)
const contentTagsHierarchy = [
  {
    category: '美妆',
    code: 'beauty',
    children: [
      { name: '美妆教程', code: 'makeup_tutorial' },
      { name: '妆容展示', code: 'makeup_show' },
      { name: '护肤保养', code: 'skincare' },
    ]
  },
  {
    category: '时尚',
    code: 'fashion',
    children: [
      { name: '穿搭', code: 'outfit' },
      { name: '街拍', code: 'street_snap' },
      { name: '造型', code: 'styling' },
    ]
  },
  {
    category: '萌宠',
    code: 'pet',
    children: [
      { name: '日常宠物', code: 'daily_pet' },
      { name: '特别宠物', code: 'special_pet' },
    ]
  },
  {
    category: '测评',
    code: 'review',
    children: [
      { name: '美妆', code: 'beauty_review' },
      { name: '3C数码', code: 'digital_review' },
      { name: '汽车', code: 'auto_review' },
      { name: '美食', code: 'food_review' },
    ]
  },
  {
    category: '游戏',
    code: 'game',
    children: [
      { name: '剧情', code: 'game_story' },
      { name: '解说', code: 'game_commentary' },
      { name: '资讯', code: 'game_news' },
    ]
  },
  {
    category: '二次元',
    code: 'anime',
    children: [
      { name: '真人', code: 'anime_real' },
      { name: '动画漫画', code: 'animation' },
      { name: '配音声优', code: 'voice_actor' },
    ]
  },
  {
    category: '旅行',
    code: 'travel',
    children: [
      { name: '记录', code: 'travel_record' },
      { name: '攻略', code: 'travel_guide' },
      { name: '推荐', code: 'travel_recommend' },
    ]
  },
  {
    category: '汽车',
    code: 'auto',
    children: [
      { name: '测评', code: 'auto_review' },
      { name: '知识', code: 'auto_knowledge' },
    ]
  },
  {
    category: '生活',
    code: 'lifestyle',
    children: [
      { name: '记录', code: 'life_record' },
      { name: '小窍门', code: 'life_tips' },
      { name: '好物推荐', code: 'good_stuff' },
    ]
  },
  {
    category: '音乐',
    code: 'music',
    children: [
      { name: '演唱', code: 'singing' },
      { name: '演奏', code: 'playing' },
    ]
  },
  {
    category: '舞蹈',
    code: 'dance',
    children: [
      { name: '舞蹈表演', code: 'dance_performance' },
      { name: '舞蹈教学', code: 'dance_teaching' },
    ]
  },
  {
    category: '美食',
    code: 'food',
    children: [
      { name: '教程', code: 'food_tutorial' },
      { name: '探店', code: 'food_explore' },
      { name: '测评', code: 'food_review' },
    ]
  },
  {
    category: '母婴亲子',
    code: 'mother_baby',
    children: [
      { name: '育儿科普', code: 'parenting_knowledge' },
      { name: '萌娃日常', code: 'baby_daily' },
      { name: '测评种草', code: 'baby_review' },
    ]
  },
  {
    category: '运动健身',
    code: 'sports',
    children: [
      { name: '健身', code: 'fitness' },
      { name: '体育资讯', code: 'sports_news' },
      { name: '球类', code: 'ball_sports' },
    ]
  },
  {
    category: '科技数码',
    code: 'tech',
    children: [
      { name: '3C数码', code: 'digital_3c' },
      { name: '家居电器', code: 'home_appliance' },
    ]
  },
  {
    category: '教育培训',
    code: 'education',
    children: [
      { name: '考学培训', code: 'exam_training' },
      { name: '语言教学', code: 'language_teaching' },
    ]
  },
  {
    category: '生活家居',
    code: 'home',
    children: [
      { name: '硬装', code: 'hard_decoration' },
      { name: '软装', code: 'soft_decoration' },
    ]
  },
  {
    category: '才艺技能',
    code: 'talent',
    children: [
      { name: '创意才能', code: 'creative_talent' },
      { name: '手工', code: 'handcraft' },
      { name: '摄影', code: 'photography' },
    ]
  },
  {
    category: '影视娱乐',
    code: 'entertainment',
    children: [
      { name: '影视解说', code: 'movie_commentary' },
      { name: '明星资讯', code: 'celebrity_news' },
    ]
  },
  {
    category: '艺术文化',
    code: 'culture',
    children: [
      { name: '传统文化', code: 'traditional_culture' },
      { name: '人文科普', code: 'humanities' },
    ]
  },
  {
    category: '财经投资',
    code: 'finance',
    children: [
      { name: '传统金融', code: 'traditional_finance' },
      { name: '互联网金融', code: 'internet_finance' },
    ]
  },
  {
    category: '三农',
    code: 'agriculture',
    children: [
      { name: '农业', code: 'farming' },
      { name: '农村', code: 'rural' },
    ]
  },
  {
    category: '剧情搞笑',
    code: 'comedy',
    children: [
      { name: '剧情', code: 'story' },
      { name: '搞笑', code: 'funny' },
    ]
  },
]

// 计算活跃筛选数量
const activeFilterCount = computed(() => {
  let count = 0
  if (selectedCooperation.value) count++
  if (selectedContentTags.value.length > 0) count++
  if (selectedTier.value) count++
  if (selectedCertifications.value.length > 0) count += selectedCertifications.value.length
  if (selectedContentTypes.value.length > 0) count += selectedContentTypes.value.length
  if (selectedGender.value !== undefined) count++
  if (selectedEcommerce.value) count++
  if (selectedPriceRange.value) count++
  if (selectedProvince.value) count++
  return count
})

// 辅助方法
const isCategorySelected = (category: any) => {
  return category.children.some((tag: any) => selectedContentTags.value.includes(tag.name))
}

const getGenderLabel = () => {
  if (selectedGender.value === 1) return '男性达人'
  if (selectedGender.value === 2) return '女性达人'
  return '性别'
}

const getEcommerceLabel = () => {
  if (selectedEcommerce.value === 'enabled') return '电商:已开通'
  if (selectedEcommerce.value === 'with_videos') return '电商:有视频'
  return '电商能力'
}

const getPriceRangeLabel = () => {
  const labels: Record<string, string> = {
    '0-5000': '5千以下',
    '5000-10000': '5千-1万',
    '10000-30000': '1-3万',
    '30000-100000': '3-10万',
    '100000-1000000': '10万+',
  }
  return labels[selectedPriceRange.value] || '价格区间'
}

const getProvinceLabel = () => {
  const labels: Record<string, string> = {
    '广东省': '广东',
    '浙江省': '浙江',
    '北京市': '北京',
    '上海市': '上海',
    '江苏省': '江苏',
    '四川省': '四川',
    '山东省': '山东',
    '湖南省': '湖南',
    '河南省': '河南',
  }
  return labels[selectedProvince.value] || '所在地域'
}

// 事件处理
const handleCooperationChange = (value: string) => {
  selectedCooperation.value = value
  if (value === 'ecommerce') {
    store.setFilter('ecommerce', 'with_videos')
  } else if (value === 'brand') {
    store.setFilter('specialTag', 'excellent')
  } else {
    store.setFilter('ecommerce', '')
    store.setFilter('specialTag', '')
  }
  store.loadInfluencers()
}

const handleCategorySelect = (command: { category: string; tag: string }) => {
  const index = selectedContentTags.value.indexOf(command.tag)
  if (index > -1) {
    selectedContentTags.value.splice(index, 1)
  } else {
    if (selectedContentTags.value.length < 5) {
      selectedContentTags.value.push(command.tag)
    }
  }
  store.setFilter('contentTags', selectedContentTags.value)
  store.loadInfluencers()
}

const removeContentTag = (tag: string) => {
  const index = selectedContentTags.value.indexOf(tag)
  if (index > -1) {
    selectedContentTags.value.splice(index, 1)
  }
  store.setFilter('contentTags', selectedContentTags.value)
  store.loadInfluencers()
}

const clearContentTags = () => {
  selectedContentTags.value = []
  store.setFilter('contentTags', [])
  store.loadInfluencers()
}

const handleTierChange = (value: string) => {
  selectedTier.value = value
  store.setFilter('tier', value)
  store.loadInfluencers()
}

const handleCertificationChange = () => {
  store.setFilter('star_excellent_author', selectedCertifications.value.includes('excellent'))
  store.setFilter('is_black_horse_author', selectedCertifications.value.includes('black_horse'))
  store.setFilter('star_qianchuan_high_potential', selectedCertifications.value.includes('high_potential'))
  store.loadInfluencers()
}

const handleContentTypeChange = () => {
  store.setFilter('is_short_drama', selectedContentTypes.value.includes('short_drama'))
  store.setFilter('is_cocreate_author', selectedContentTypes.value.includes('cocreate'))
  store.setFilter('is_cpm_project_author', selectedContentTypes.value.includes('cpm_project'))
  store.loadInfluencers()
}

const handleGenderChange = (value: number | undefined) => {
  selectedGender.value = value
  store.setFilter('gender', value)
  store.loadInfluencers()
}

const handleEcommerceChange = (value: string) => {
  selectedEcommerce.value = value
  store.setFilter('ecommerce', value)
  store.loadInfluencers()
}

const handlePriceRangeChange = (value: string) => {
  selectedPriceRange.value = value
  if (value) {
    const [min, max] = value.split('-').map(Number)
    store.setFilter('priceMin', min)
    store.setFilter('priceMax', max)
  } else {
    store.setFilter('priceMin', undefined)
    store.setFilter('priceMax', undefined)
  }
  store.loadInfluencers()
}

const handleProvinceChange = (value: string) => {
  selectedProvince.value = value
  store.setFilter('province', value)
  store.loadInfluencers()
}

const clearAllFilters = () => {
  selectedCooperation.value = ''
  selectedContentTags.value = []
  selectedTier.value = ''
  selectedCertifications.value = []
  selectedContentTypes.value = []
  selectedGender.value = undefined
  selectedEcommerce.value = ''
  selectedPriceRange.value = ''
  selectedProvince.value = ''
  
  store.resetFilters()
  store.loadInfluencers()
}
</script>

<style scoped lang="scss">
.quick-filters {
  margin-bottom: 20px;
  padding: 20px 24px;
  background: var(--el-bg-color);
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);

  .filter-row {
    display: flex;
    align-items: flex-start;
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);

    &:last-of-type {
      margin-bottom: 0;
      padding-bottom: 0;
      border-bottom: none;
    }

    .filter-label {
      min-width: 80px;
      font-size: 14px;
      font-weight: 500;
      color: var(--el-text-color-regular);
      margin-right: 16px;
      padding-top: 6px;
      flex-shrink: 0;
    }
    
    .filter-buttons {
      flex: 1;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      
      .selected-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 8px;
      }
    }
  }
  
  .filter-summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 16px;
    padding: 12px 16px;
    background: var(--el-fill-color-light);
    border-radius: 6px;
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }
  
  .more-categories {
    margin-top: 12px;
    
    .more-categories-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  }
  
  :deep(.el-dropdown) {
    .el-button {
      padding: 8px 12px;
    }
  }
  
  :deep(.el-dropdown-menu) {
    .el-dropdown-menu__item {
      padding: 8px 16px;
      
      .el-checkbox {
        width: 100%;
      }
    }
    
    .category-group {
      .category-title {
        font-weight: 600;
        color: var(--el-text-color-primary);
        padding: 4px 0 8px;
        border-bottom: 1px solid var(--el-border-color-lighter);
        margin-bottom: 8px;
      }
      
      .tag-item {
        padding: 4px 0;
        cursor: pointer;
        
        &:hover {
          background: var(--el-fill-color-light);
        }
      }
    }
  }
}
</style>
