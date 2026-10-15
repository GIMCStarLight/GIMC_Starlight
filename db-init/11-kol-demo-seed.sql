SET search_path = public;

-- Interview demo data for the two tabs under /kolList/legacy.
-- The public influencer fields come from the restored data set. Business-only
-- fields are deliberately labelled as demo data and contain no real contacts.
WITH selected AS (
  SELECT
    mv.*,
    row_number() OVER (
      ORDER BY
        (
          (mv.star_index IS NOT NULL)::int
          + (mv.interact_rate_30d IS NOT NULL)::int
          + (mv.vv_median_30d IS NOT NULL)::int
          + (mv.price_20_60 IS NOT NULL)::int
          + (cardinality(mv.primary_tags) > 0)::int
        ) DESC,
        mv.follower DESC NULLS LAST,
        mv.author_id
    ) AS demo_rank
  FROM mv_authors_combined mv
  WHERE mv.author_id IS NOT NULL
    AND mv.nick_name IS NOT NULL
  LIMIT 1000
), demo AS (
  SELECT
    selected.*,
    CASE demo_rank % 8
      WHEN 0 THEN '星链计划'
      WHEN 1 THEN '省广星媒'
      WHEN 2 THEN '华南内容合作组（演示）'
      WHEN 3 THEN '品牌增长中心（演示）'
      WHEN 4 THEN '短视频营销联盟（演示）'
      WHEN 5 THEN '电商内容事业部（演示）'
      WHEN 6 THEN '区域达人合作组（演示）'
      ELSE '独立达人资源（演示）'
    END AS demo_org,
    CASE demo_rank % 3
      WHEN 0 THEN 'A'
      WHEN 1 THEN 'B'
      ELSE 'C'
    END AS demo_policy_level
  FROM selected
)
INSERT INTO kol_list (
  platform,
  account_name,
  account_id,
  home_link,
  followers_w,
  org_name,
  category,
  star_quote_21_60s,
  star_quote_60s_plus,
  is_exclusive,
  rebate_policy,
  rebate_range,
  policy_level,
  rebate_period,
  pay_period,
  remark,
  platform_extra,
  cooperation_intro,
  all_platforms,
  contact_info,
  cooperation_degree,
  source,
  resource_attribute,
  annual_contract_org,
  matched_author_id,
  match_confidence,
  match_status,
  matched_snapshot,
  matched_at,
  created_by,
  updated_by,
  created_at,
  updated_at
)
SELECT
  '抖音',
  demo.nick_name,
  demo.author_id,
  'https://www.douyin.com/user/' || demo.author_id,
  LEAST(999999.99, round(COALESCE(demo.follower, 0)::numeric / 10000, 2)),
  demo.demo_org,
  left(COALESCE(demo.primary_tags[1], '综合内容'), 30),
  demo.price_20_60,
  demo.price_60,
  CASE WHEN demo.demo_rank % 5 = 0 THEN 1 ELSE 0 END,
  CASE demo.demo_policy_level
    WHEN 'A' THEN '面试演示政策：季度合作返点 15%-18%'
    WHEN 'B' THEN '面试演示政策：季度合作返点 10%-15%'
    ELSE '面试演示政策：单项目返点 5%-10%'
  END,
  CASE demo.demo_policy_level
    WHEN 'A' THEN '15%-18%'
    WHEN 'B' THEN '10%-15%'
    ELSE '5%-10%'
  END,
  demo.demo_policy_level,
  CASE WHEN demo.demo_rank % 2 = 0 THEN '月结' ELSE '季度结' END,
  CASE demo.demo_rank % 3 WHEN 0 THEN 'T+7' WHEN 1 THEN 'T+15' ELSE 'T+30' END,
  '面试展示种子数据；达人公开指标来自已迁移数据，商务信息为演示值。',
  json_build_object('demo', true, 'seed_rank', demo.demo_rank),
  '适用于面试环境的合作能力展示，非真实商务合作记录。',
  json_build_array(json_build_object('platform', '抖音', 'account_id', demo.author_id)),
  json_build_object('type', 'demo', 'value', '演示环境不展示真实联系方式'),
  CASE demo.demo_rank % 3 WHEN 0 THEN 'high' WHEN 1 THEN 'medium' ELSE 'low' END,
  'import',
  CASE
    WHEN demo.demo_rank % 5 = 0 THEN 'exclusive'
    WHEN demo.demo_rank % 2 = 0 THEN 'sgxm'
    ELSE 'other'
  END,
  CASE WHEN demo.demo_org IN ('星链计划', '省广星媒') THEN demo.demo_org ELSE NULL END,
  demo.author_id,
  1.000,
  'matched',
  json_build_object(
    'author_id', demo.author_id,
    'star_id', demo.star_id,
    'nick_name', demo.nick_name,
    'avatar_uri', demo.avatar_uri,
    'province', demo.province,
    'city', demo.city,
    'follower', demo.follower,
    'star_index', demo.star_index,
    'primary_tags', demo.primary_tags
  ),
  now(),
  1,
  1,
  now() - ((demo.demo_rank % 30)::text || ' days')::interval,
  now()
FROM demo
ON CONFLICT (platform, account_id) DO NOTHING;

ANALYZE kol_list;
