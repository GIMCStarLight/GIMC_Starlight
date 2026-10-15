SET search_path = public;

ALTER TABLE authors_core ADD COLUMN IF NOT EXISTS unique_id TEXT;
ALTER TABLE authors_core ADD COLUMN IF NOT EXISTS sec_uid TEXT;
ALTER TABLE authors_core ADD COLUMN IF NOT EXISTS short_id TEXT;
ALTER TABLE authors_core ADD COLUMN IF NOT EXISTS has_phone BOOLEAN DEFAULT FALSE;
ALTER TABLE authors_core ADD COLUMN IF NOT EXISTS mcn_name TEXT;
ALTER TABLE authors_core ADD COLUMN IF NOT EXISTS self_intro TEXT;
ALTER TABLE authors_core ADD COLUMN IF NOT EXISTS platform INTEGER[];
ALTER TABLE authors_core ADD COLUMN IF NOT EXISTS platform_channel INTEGER[];

CREATE OR REPLACE VIEW v_authors_core AS
SELECT
  c.author_id, c.star_id, c.nick_name, c.avatar_uri, c.gender, c.city,
  c.province, c.author_type, c.author_status, c.grade, c.follower,
  c.updated_at,
  f.fans_increment_15d AS fans_increment_within_15d,
  f.fans_increment_30d AS fans_increment_within_30d,
  f.fans_increment_rate_15d AS fans_increment_rate_within_15d,
  e.interact_rate_30d AS interact_rate_within_30d,
  e.play_over_rate_30d AS play_over_rate_within_30d,
  e.vv_median_30d,
  e.sn_interact_rate_30d AS sn_interact_rate_within_30d,
  e.sn_play_over_rate_30d AS sn_play_over_rate_within_30d,
  p.price_1_20, p.price_20_60, p.price_60, p.assign_cpm_suggest_price,
  p.promotion_prospective_vv, p.promotion_prospective_20_60_cpm,
  p.promotion_prospective_60_cpm,
  m.link_convert_index, m.link_shopping_index, m.link_spread_index,
  m.link_star_index,
  ec.e_commerce_enable, ec.author_ecom_level, ec.ecom_gmv_30d_range,
  ec.ecom_avg_order_value_30d_range, ec.ecom_gpm_30d_range,
  ec.star_ecom_video_num_30d,
  c.star_excellent_author, c.is_black_horse_author, c.is_cocreate_author,
  c.is_cpm_project_author, c.is_short_drama,
  c.is_ad_star_cur_high_quality_author, c.star_qianchuan_high_potential,
  e.avg_search_after_view_rate_30d, e.burst_text_rate,
  NULL::text AS primary_industry,
  COALESCE(to_jsonb(t.primary_tags[1:3]), '[]'::jsonb) AS content_tags_top3,
  COALESCE(p.assign_task_price_list, p.enroll_task_price_list) AS unified_task_price_list,
  '{}'::jsonb AS extra
FROM authors_core c
LEFT JOIN authors_fans_metrics f USING (author_id)
LEFT JOIN authors_engagement_metrics e USING (author_id)
LEFT JOIN authors_pricing p USING (author_id)
LEFT JOIN authors_marketing_indices m USING (author_id)
LEFT JOIN authors_ecommerce ec USING (author_id)
LEFT JOIN authors_content_tags t USING (author_id);

CREATE TABLE IF NOT EXISTS kol_list (
  id BIGSERIAL PRIMARY KEY,
  platform VARCHAR(30) NOT NULL,
  account_name VARCHAR(100) NOT NULL,
  account_id VARCHAR(80) NOT NULL,
  home_link VARCHAR(500) NOT NULL,
  followers_w DECIMAL(8,2) NOT NULL DEFAULT 0,
  org_name VARCHAR(100),
  category VARCHAR(30),
  star_quote_21_60s INTEGER,
  star_quote_60s_plus INTEGER,
  is_exclusive SMALLINT DEFAULT 0,
  rebate_policy TEXT,
  rebate_range VARCHAR(50),
  policy_level VARCHAR(10),
  rebate_period VARCHAR(30),
  pay_period VARCHAR(30),
  remark VARCHAR(500),
  cooperation_intro TEXT,
  all_platforms JSON,
  contact_info JSON,
  cooperation_degree VARCHAR(20) DEFAULT 'medium',
  source VARCHAR(20) DEFAULT 'manual',
  resource_attribute VARCHAR(20) DEFAULT 'other',
  annual_contract_org VARCHAR(100),
  matched_author_id VARCHAR(64),
  match_confidence DECIMAL(4,3),
  match_status VARCHAR(20) DEFAULT 'unmatched',
  matched_snapshot JSON,
  matched_at TIMESTAMP,
  created_by BIGINT,
  updated_by BIGINT,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(platform, account_id)
);

ALTER TABLE kol_list ADD COLUMN IF NOT EXISTS platform_extra JSON;
