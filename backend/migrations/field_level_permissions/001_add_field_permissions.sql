-- =====================================================
-- 字段级权限控制 - 数据库迁移脚本
-- 执行时间: 2026-01-06
-- 说明: 为「达人广场」和「省广达人库」添加字段级权限
-- =====================================================

-- 开始事务
BEGIN;

-- ===== 1. 达人广场 (influencer) 字段权限 =====

-- 1.1 基础信息字段权限（昵称、头像、性别、省份等）
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 
  'influencer:field:basic',
  '达人基础信息',
  '查看达人昵称、头像、性别、省份、城市、类型等基础信息',
  'API'::permission_type,
  'influencer',
  'field:basic',
  100,
  1,
  NOW(),
  NOW(),
  jsonb_build_object(
    'fields', ARRAY['nick_name', 'avatar_uri', 'gender', 'province', 'city', 'author_type', 'account_status', 'author_level'],
    'description', '达人基础资料字段',
    'pageLocation', '达人广场 > 列表/详情 > 基础信息',
    'businessModule', '达人管理'
  )
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'influencer:field:basic');

-- 1.2 粉丝数据字段权限
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 
  'influencer:field:follower',
  '达人粉丝数据',
  '查看粉丝数、粉丝增长率、粉丝增量等数据',
  'API'::permission_type,
  'influencer',
  'field:follower',
  101,
  1,
  NOW(),
  NOW(),
  jsonb_build_object(
    'fields', ARRAY['follower', 'fans_increment_within_15d', 'fans_increment_within_30d', 'fans_increment_rate_within_15d'],
    'description', '粉丝相关数据字段',
    'pageLocation', '达人广场 > 列表/详情 > 粉丝数据',
    'businessModule', '达人管理'
  )
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'influencer:field:follower');

-- 1.3 互动指标字段权限
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 
  'influencer:field:interaction',
  '达人互动指标',
  '查看互动率、完播率、播放量中位数等互动数据',
  'API'::permission_type,
  'influencer',
  'field:interaction',
  102,
  1,
  NOW(),
  NOW(),
  jsonb_build_object(
    'fields', ARRAY['interact_rate_within_30d', 'interaction_median_30d', 'play_over_rate_within_30d', 'vv_median_30d'],
    'description', '互动表现数据字段',
    'pageLocation', '达人广场 > 列表/详情 > 互动指标',
    'businessModule', '达人管理'
  )
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'influencer:field:interaction');

-- 1.4 价格信息字段权限（敏感数据）
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 
  'influencer:field:price',
  '达人报价信息',
  '查看达人1-20s、20-60s、60s+报价及任务价格列表',
  'API'::permission_type,
  'influencer',
  'field:price',
  103,
  1,
  NOW(),
  NOW(),
  jsonb_build_object(
    'fields', ARRAY['price_1_20', 'price_20_60', 'price_60', 'assign_task_price_list'],
    'description', '报价相关敏感数据字段',
    'pageLocation', '达人广场 > 列表/详情 > 价格信息',
    'businessModule', '达人管理',
    'sensitive', true
  )
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'influencer:field:price');

-- 1.5 联系方式字段权限（敏感数据）
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 
  'influencer:field:contact',
  '达人联系方式',
  '查看达人是否有电话、MCN机构、自我介绍等联系信息',
  'API'::permission_type,
  'influencer',
  'field:contact',
  104,
  1,
  NOW(),
  NOW(),
  jsonb_build_object(
    'fields', ARRAY['has_phone', 'mcn_name', 'self_intro', 'unique_id', 'sec_uid', 'short_id'],
    'description', '联系方式敏感数据字段',
    'pageLocation', '达人广场 > 列表/详情 > 联系方式',
    'businessModule', '达人管理',
    'sensitive', true
  )
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'influencer:field:contact');

-- 1.6 电商数据字段权限
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 
  'influencer:field:ecommerce',
  '达人电商数据',
  '查看电商能力、GMV、电商等级等电商相关数据',
  'API'::permission_type,
  'influencer',
  'field:ecommerce',
  105,
  1,
  NOW(),
  NOW(),
  jsonb_build_object(
    'fields', ARRAY['e_commerce_enable', 'author_ecom_level', 'ecom_gmv_30d_range', 'ecom_avg_order_value_30d_range', 'ecom_gpm_30d_range', 'ecom_video_product_num_30d', 'star_ecom_video_num_30d'],
    'description', '电商能力数据字段',
    'pageLocation', '达人广场 > 列表/详情 > 电商数据',
    'businessModule', '达人管理'
  )
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'influencer:field:ecommerce');

-- 1.7 营销指数字段权限
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 
  'influencer:field:marketing',
  '达人营销指数',
  '查看星图指数、转化指数、种草指数、传播指数等营销数据',
  'API'::permission_type,
  'influencer',
  'field:marketing',
  106,
  1,
  NOW(),
  NOW(),
  jsonb_build_object(
    'fields', ARRAY['star_index', 'link_convert_index', 'link_shopping_index', 'link_spread_index', 'link_star_index', 'link_recommend_index_by_industry', 'expected_play_num'],
    'description', '营销指数数据字段',
    'pageLocation', '达人广场 > 列表/详情 > 营销指数',
    'businessModule', '达人管理'
  )
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'influencer:field:marketing');

-- 1.8 星图视频数据字段权限
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 
  'influencer:field:star_video',
  '达人星图视频数据',
  '查看90日星图视频数、互动率、完播率等星图视频表现数据',
  'API'::permission_type,
  'influencer',
  'field:star_video',
  107,
  1,
  NOW(),
  NOW(),
  jsonb_build_object(
    'fields', ARRAY['star_item_count_within_30d', 'star_video_cnt_90d', 'star_video_interact_rate_90d', 'star_video_finish_vv_rate_90d', 'star_video_median_vv_90d'],
    'description', '星图视频表现数据字段',
    'pageLocation', '达人广场 > 列表/详情 > 星图视频',
    'businessModule', '达人管理'
  )
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'influencer:field:star_video');

-- 1.9 CPM/CPE预估字段权限
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 
  'influencer:field:prospective',
  '达人效果预估',
  '查看CPM、CPE预估数据及预期播放量',
  'API'::permission_type,
  'influencer',
  'field:prospective',
  108,
  1,
  NOW(),
  NOW(),
  jsonb_build_object(
    'fields', ARRAY['prospective_1_20_cpm', 'prospective_20_60_cpm', 'prospective_60_cpm', 'promotion_prospective_1_20_cpm', 'promotion_prospective_20_60_cpm', 'promotion_prospective_60_cpm', 'promotion_prospective_vv', 'expected_natural_play_num'],
    'description', '效果预估数据字段',
    'pageLocation', '达人广场 > 列表/详情 > 效果预估',
    'businessModule', '达人管理'
  )
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'influencer:field:prospective');

-- 1.10 内容标签字段权限
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 
  'influencer:field:tags',
  '达人内容标签',
  '查看达人内容主题标签、关联标签等分类信息',
  'API'::permission_type,
  'influencer',
  'field:tags',
  109,
  1,
  NOW(),
  NOW(),
  jsonb_build_object(
    'fields', ARRAY['content_theme_labels_180d', 'tags_relation', 'primary_tags', 'secondary_tags'],
    'description', '内容标签分类字段',
    'pageLocation', '达人广场 > 列表/详情 > 内容标签',
    'businessModule', '达人管理'
  )
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'influencer:field:tags');


-- ===== 2. 省广达人库 (kol) 字段权限 =====

-- 2.1 基础信息字段权限
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 
  'kol:field:basic',
  'KOL基础信息',
  '查看KOL平台、账号名称、账号ID、主页链接、粉丝数、机构、类型等基础信息',
  'API'::permission_type,
  'kol',
  'field:basic',
  200,
  1,
  NOW(),
  NOW(),
  jsonb_build_object(
    'fields', ARRAY['platform', 'account_name', 'account_id', 'home_link', 'followers_w', 'org_name', 'category'],
    'description', 'KOL基础资料字段',
    'pageLocation', '省广达人库 > 列表/详情 > 基础信息',
    'businessModule', 'KOL管理'
  )
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'kol:field:basic');

-- 2.2 报价信息字段权限（敏感数据）
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 
  'kol:field:price',
  'KOL报价信息',
  '查看KOL的21-60s报价、60s+报价等价格信息',
  'API'::permission_type,
  'kol',
  'field:price',
  201,
  1,
  NOW(),
  NOW(),
  jsonb_build_object(
    'fields', ARRAY['star_quote_21_60s', 'star_quote_60s_plus'],
    'description', 'KOL报价敏感数据字段',
    'pageLocation', '省广达人库 > 列表/详情 > 报价信息',
    'businessModule', 'KOL管理',
    'sensitive', true
  )
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'kol:field:price');

-- 2.3 返点政策字段权限（敏感数据）
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 
  'kol:field:rebate',
  'KOL返点政策',
  '查看KOL的返点政策、返点区间、政策等级、返点账期等信息',
  'API'::permission_type,
  'kol',
  'field:rebate',
  202,
  1,
  NOW(),
  NOW(),
  jsonb_build_object(
    'fields', ARRAY['rebate_policy', 'rebate_range', 'policy_level', 'rebate_period', 'pay_period'],
    'description', 'KOL返点政策敏感数据字段',
    'pageLocation', '省广达人库 > 列表/详情 > 返点政策',
    'businessModule', 'KOL管理',
    'sensitive', true
  )
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'kol:field:rebate');

-- 2.4 联系方式字段权限（敏感数据）
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 
  'kol:field:contact',
  'KOL联系方式',
  '查看KOL的联系信息（电话、微信等）',
  'API'::permission_type,
  'kol',
  'field:contact',
  203,
  1,
  NOW(),
  NOW(),
  jsonb_build_object(
    'fields', ARRAY['contact_info'],
    'description', 'KOL联系方式敏感数据字段',
    'pageLocation', '省广达人库 > 列表/详情 > 联系方式',
    'businessModule', 'KOL管理',
    'sensitive', true
  )
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'kol:field:contact');

-- 2.5 合作信息字段权限
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 
  'kol:field:cooperation',
  'KOL合作信息',
  '查看KOL的独家属性、配合度、资源属性、年框机构、合作简介等信息',
  'API'::permission_type,
  'kol',
  'field:cooperation',
  204,
  1,
  NOW(),
  NOW(),
  jsonb_build_object(
    'fields', ARRAY['is_exclusive', 'cooperation_degree', 'resource_attribute', 'annual_contract_org', 'cooperation_intro', 'remark'],
    'description', 'KOL合作相关字段',
    'pageLocation', '省广达人库 > 列表/详情 > 合作信息',
    'businessModule', 'KOL管理'
  )
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'kol:field:cooperation');

-- 2.6 匹配信息字段权限
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 
  'kol:field:match',
  'KOL匹配信息',
  '查看KOL与公海达人的匹配状态、匹配置信度、匹配快照等信息',
  'API'::permission_type,
  'kol',
  'field:match',
  205,
  1,
  NOW(),
  NOW(),
  jsonb_build_object(
    'fields', ARRAY['matched_author_id', 'match_confidence', 'match_status', 'matched_snapshot', 'matched_at'],
    'description', 'KOL匹配状态字段',
    'pageLocation', '省广达人库 > 列表/详情 > 匹配信息',
    'businessModule', 'KOL管理'
  )
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'kol:field:match');


-- ===== 3. 验证结果 =====
SELECT code, name, type, frontend_meta->>'fields' as fields
FROM permissions 
WHERE code LIKE 'influencer:field:%' OR code LIKE 'kol:field:%'
ORDER BY code;

-- 提交事务
COMMIT;
