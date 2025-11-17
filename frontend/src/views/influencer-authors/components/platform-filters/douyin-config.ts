/**
 * 抖音平台筛选配置数据
 * 提取自 DouyinQuickFilter.vue，减少主组件代码行数
 */

export interface ContentTagChild {
  name: string
  code: string
}

export interface ContentTagCategory {
  category: string
  code: string
  icon: string
  children: ContentTagChild[]
}

/**
 * 抖音内容标签层级结构（26个一级分类）
 */
export const DOUYIN_CONTENT_TAGS: ContentTagCategory[] = [
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
]

/**
 * 合作类型选项
 */
export const COOPERATION_TYPES = [
  { label: '全部', value: '' },
  { label: '短视频推广', value: 'short_video' },
  { label: '直播合作', value: 'live' },
  { label: '电商带货', value: 'ecommerce' },
  { label: '品牌曝光', value: 'brand' },
  { label: '内容定制', value: 'content' }
]

/**
 * 智能场景选项
 */
export const SCENARIO_OPTIONS = [
  {
    key: '',
    label: '全部场景',
    description: '不限制场景',
    icon: 'lucide:layers',
    filters: {}
  },
  {
    key: 'new_product_launch',
    label: '新品上市',
    description: '适合新品推广的达人',
    icon: 'lucide:sparkles',
    filters: {
      minFollowers: 100000,
      minInteractRate: 0.03,
      minExpectedCpm: 50
    }
  },
  {
    key: 'brand_exposure',
    label: '品牌曝光',
    description: '高粉丝量，适合品牌曝光',
    icon: 'lucide:megaphone',
    filters: {
      minFollowers: 500000,
      minExpectedPlayNum: 100000
    }
  },
  {
    key: 'ecommerce',
    label: '电商带货',
    description: '带货能力强的达人',
    icon: 'lucide:shopping-bag',
    filters: {
      minGmv30d: 100000,
      minShoppingIndex: 600
    }
  },
  {
    key: 'content_marketing',
    label: '内容营销',
    description: '内容质量高，互动率好',
    icon: 'lucide:trending-up',
    filters: {
      minInteractRate: 0.05,
      minPlayOverRate: 0.3,
      minSpreadIndex: 600
    }
  },
  {
    key: 'rising_star',
    label: '潜力新星',
    description: '成长快速的新星达人',
    icon: 'lucide:rocket',
    filters: {
      minFollowers: 10000,
      maxFollowers: 500000,
      minGrowthRate30d: 0.1,
      minBurstRate: 0.2
    }
  }
]

/**
 * 认证类型标签映射
 */
export const CERT_TYPE_LABELS: Record<string, string> = {
  shenguangxingmei: '省广星媒',
  xingliandaren: '星链计划',
  excellentAuthor: '优质达人',
  risingStart: '新星达人',
  highPotential: '高潜达人',
  blackHorse: '黑马达人'
}
