/**
 * 内容标签层级数据
 * 23个内容标签分类
 */

export interface ContentTag {
  name: string
  code: string
}

export interface ContentCategory {
  category: string
  code: string
  children: ContentTag[]
}

export const contentTagsHierarchy: ContentCategory[] = [
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
