SET search_path = public;

-- The demo restore intentionally contains only a subset of the production
-- database. These runtime objects are nevertheless required by the API.

-- Extract the first-level business tags from the restored, occasionally
-- double-encoded JSON payload so that the popular-tags endpoint has data.
UPDATE authors_content_tags
SET primary_tags = COALESCE(
  (
    SELECT array_agg(tag ORDER BY tag)
    FROM jsonb_object_keys(
      CASE jsonb_typeof(tags_relation)
        WHEN 'object' THEN tags_relation
        WHEN 'string' THEN (tags_relation #>> '{}')::jsonb
        ELSE '{}'::jsonb
      END
    ) AS tag
  ),
  ARRAY[]::text[]
)
WHERE tags_relation IS NOT NULL
  AND cardinality(primary_tags) = 0;

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_authors_combined AS
SELECT
  c.author_id,
  c.star_id,
  c.nick_name,
  c.avatar_uri,
  c.city,
  c.province,
  c.gender,
  c.author_type,
  COALESCE(c.star_excellent_author, false) AS star_excellent_author,
  COALESCE(c.is_black_horse_author, false) AS is_black_horse_author,
  COALESCE(c.star_qianchuan_high_potential, false) AS star_qianchuan_high_potential,
  COALESCE(c.is_short_drama, false) AS is_short_drama,
  COALESCE(c.is_cocreate_author, false) AS is_cocreate_author,
  COALESCE(c.is_cpm_project_author, false) AS is_cpm_project_author,
  COALESCE(c.is_ad_star_cur_high_quality_author, false) AS is_ad_star_cur_high_quality_author,
  NULL::text AS unique_id,
  NULL::text AS sec_uid,
  NULL::text AS short_id,
  NULL::boolean AS has_phone,
  NULL::text AS mcn_name,
  NULL::text AS self_intro,
  NULL::integer[] AS platform,
  NULL::integer[] AS platform_channel,
  c.star_index,
  f.growth_level,
  f.is_rising_star,
  e.quality_tier,
  e.engagement_score,
  p.price_tier,
  p.cpm_efficiency,
  COALESCE(f.follower, c.follower, 0) AS follower,
  f.fans_increment_30d,
  f.fans_increment_rate_30d,
  f.fans_increment_15d,
  f.fans_increment_rate_15d,
  e.interact_rate_30d,
  e.play_over_rate_30d,
  e.vv_median_30d,
  e.interaction_median_30d,
  e.sn_interact_rate_30d,
  e.sn_play_over_rate_30d,
  p.price_1_20,
  p.price_20_60,
  p.price_60,
  p.expected_play_num,
  p.assign_cpm_suggest_price,
  p.promotion_prospective_20_60_cpm,
  p.sn_prospective_20_60_cpe,
  m.link_convert_index,
  m.link_shopping_index,
  m.link_spread_index,
  COALESCE(ec.e_commerce_enable, false) AS e_commerce_enable,
  ec.author_ecom_level,
  ec.star_ecom_video_num_30d,
  NULL::bigint AS gmv_30d,
  ec.ecom_capability_tier,
  COALESCE(ec.is_ecom_active, false) AS is_ecom_active,
  COALESCE(t.primary_tags, ARRAY[]::text[]) AS primary_tags,
  COALESCE(t.primary_themes, ARRAY[]::text[]) AS primary_themes,
  COALESCE(t.tag_count, cardinality(t.primary_tags), 0) AS tag_count,
  c.updated_at,
  c.last_crawled_at
FROM authors_core c
LEFT JOIN authors_fans_metrics f ON f.author_id = c.author_id
LEFT JOIN authors_engagement_metrics e ON e.author_id = c.author_id
LEFT JOIN authors_pricing p ON p.author_id = c.author_id
LEFT JOIN authors_marketing_indices m ON m.author_id = c.author_id
LEFT JOIN authors_ecommerce ec ON ec.author_id = c.author_id
LEFT JOIN authors_content_tags t ON t.author_id = c.author_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_combined_author_id
  ON mv_authors_combined(author_id);
CREATE INDEX IF NOT EXISTS idx_mv_combined_follower
  ON mv_authors_combined(follower DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_mv_combined_star_index
  ON mv_authors_combined(star_index DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_mv_combined_quality
  ON mv_authors_combined(quality_tier) WHERE quality_tier IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mv_combined_growth
  ON mv_authors_combined(growth_level) WHERE growth_level IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mv_combined_price
  ON mv_authors_combined(price_tier) WHERE price_tier IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mv_combined_tags_gin
  ON mv_authors_combined USING gin(primary_tags);

CREATE OR REPLACE FUNCTION refresh_authors_combined_mv()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_authors_combined;
END;
$$;

-- SQLBot is optional in this interview environment. An empty configuration
-- table makes GET /api/sqlbot/config return null instead of HTTP 500.
CREATE TABLE IF NOT EXISTS sqlbot_configs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  domain varchar(255) NOT NULL,
  "baseAssistantId" varchar(100) NOT NULL,
  "advancedAssistantId" varchar(100),
  "embeddedAppId" varchar(100),
  "embeddedAppSecret" varchar(255),
  "aesEnable" boolean NOT NULL DEFAULT false,
  "aesKey" varchar(64),
  enabled boolean NOT NULL DEFAULT true,
  "createdAt" timestamp without time zone NOT NULL DEFAULT now(),
  "updatedAt" timestamp without time zone NOT NULL DEFAULT now()
);

ANALYZE mv_authors_combined;
