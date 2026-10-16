SET search_path = public;

INSERT INTO authors_core (
  author_id, star_id, core_user_id, nick_name, avatar_uri, gender, city,
  province, author_type, author_status, grade, follower, star_index,
  star_excellent_author, is_black_horse_author, is_cocreate_author,
  is_cpm_project_author, is_short_drama,
  is_ad_star_cur_high_quality_author, star_qianchuan_high_potential,
  created_at, updated_at, last_crawled_at
)
SELECT DISTINCT ON (source_author_id)
  source_author_id, source_author_id, core_user_id, nick_name, avatar_uri,
  gender::smallint, city, province, author_type::smallint,
  author_status::smallint, grade::smallint, COALESCE(follower, 0), star_index,
  COALESCE(star_excellent_author, false),
  COALESCE(is_black_horse_author, false), COALESCE(is_cocreate_author, false),
  COALESCE(is_cpm_project_author, false), COALESCE(is_short_drama, false),
  COALESCE(is_ad_star_cur_high_quality_author, false),
  COALESCE(star_qianchuan_high_potential, false),
  COALESCE(source_created_at, now()), now(), COALESCE(source_created_at, now())
FROM authors_raw_archive_parsed
WHERE source_author_id IS NOT NULL AND nick_name IS NOT NULL
ORDER BY source_author_id, source_created_at DESC NULLS LAST
ON CONFLICT (author_id) DO NOTHING;

INSERT INTO authors_fans_metrics (
  author_id, follower, fans_increment_15d, fans_increment_30d,
  fans_increment_rate_15d, fans_increment_rate_30d
)
SELECT DISTINCT ON (source_author_id)
  source_author_id, COALESCE(follower, 0), fans_increment_within_15d,
  fans_increment_within_30d, fans_increment_rate_within_15d, NULL
FROM authors_raw_archive_parsed WHERE source_author_id IN (SELECT author_id FROM authors_core)
ORDER BY source_author_id, source_created_at DESC NULLS LAST
ON CONFLICT (author_id) DO NOTHING;

INSERT INTO authors_engagement_metrics (
  author_id, interact_rate_30d, play_over_rate_30d, vv_median_30d,
  interaction_median_30d, sn_interact_rate_30d, sn_play_over_rate_30d,
  avg_search_after_view_rate_30d, burst_text_rate
)
SELECT DISTINCT ON (source_author_id)
  source_author_id, interact_rate_within_30d, play_over_rate_within_30d,
  vv_median_30d, interaction_median_30d, sn_interact_rate_within_30d,
  sn_play_over_rate_within_30d, avg_search_after_view_rate_30d, burst_text_rate
FROM authors_raw_archive_parsed WHERE source_author_id IN (SELECT author_id FROM authors_core)
ORDER BY source_author_id, source_created_at DESC NULLS LAST
ON CONFLICT (author_id) DO NOTHING;

INSERT INTO authors_pricing (
  author_id, price_1_20, price_20_60, price_60, assign_cpm_suggest_price,
  expected_play_num, expected_natural_play_num, promotion_prospective_vv,
  promotion_prospective_1_20_cpm, promotion_prospective_20_60_cpm,
  promotion_prospective_60_cpm, sn_prospective_1_20_cpe,
  sn_prospective_1_20_cpm, sn_prospective_20_60_cpe,
  sn_prospective_20_60_cpm, sn_prospective_60_cpe, sn_prospective_60_cpm,
  pic_expected_play_num, pic_expected_cpm, expected_cpa3_level,
  assign_task_price_list, enroll_task_price_list
)
SELECT DISTINCT ON (source_author_id)
  source_author_id, price_1_20, price_20_60, price_60,
  assign_cpm_suggest_price, COALESCE(expected_play_num, sn_expected_play_num),
  expected_natural_play_num, promotion_prospective_vv,
  COALESCE(promotion_prospective_1_20_cpm, prospective_1_20_cpm),
  COALESCE(promotion_prospective_20_60_cpm, prospective_20_60_cpm),
  COALESCE(promotion_prospective_60_cpm, prospective_60_cpm),
  sn_prospective_1_20_cpe, sn_prospective_1_20_cpm,
  sn_prospective_20_60_cpe, sn_prospective_20_60_cpm,
  sn_prospective_60_cpe, sn_prospective_60_cpm,
  pic_expected_play_num, pic_expected_cpm, expected_cpa3_level,
  assign_task_price_list, enroll_task_price_list
FROM authors_raw_archive_parsed WHERE source_author_id IN (SELECT author_id FROM authors_core)
ORDER BY source_author_id, source_created_at DESC NULLS LAST
ON CONFLICT (author_id) DO NOTHING;

INSERT INTO authors_marketing_indices (
  author_id, link_convert_index, link_shopping_index, link_spread_index,
  link_star_index, star_index, link_convert_index_by_industry,
  link_spread_index_by_industry, link_star_index_by_industry,
  link_recommend_index_by_industry, search_after_view_index_by_industry,
  link_user_type_by_industry, link_i_cnt_by_industry, link_k_cnt_by_industry,
  link_l_cnt_by_industry, link_link_cnt_by_industry, link_n_cnt_by_industry
)
SELECT DISTINCT ON (source_author_id)
  source_author_id, link_convert_index, link_shopping_index,
  link_spread_index, link_star_index, star_index,
  link_convert_index_by_industry, link_spread_index_by_industry,
  link_star_index_by_industry, link_recommend_index_by_industry,
  search_after_view_index_by_industry, link_user_type_by_industry,
  link_i_cnt_by_industry, link_k_cnt_by_industry, link_l_cnt_by_industry,
  link_link_cnt_by_industry, link_n_cnt_by_industry
FROM authors_raw_archive_parsed WHERE source_author_id IN (SELECT author_id FROM authors_core)
ORDER BY source_author_id, source_created_at DESC NULLS LAST
ON CONFLICT (author_id) DO NOTHING;

INSERT INTO authors_content_tags (
  author_id, tags_relation, content_theme_labels_180d,
  author_thin_mid_word_association_index
)
SELECT DISTINCT ON (source_author_id)
  source_author_id, tags_relation, content_theme_labels_180d,
  author_thin_mid_word_association_index
FROM authors_raw_archive_parsed WHERE source_author_id IN (SELECT author_id FROM authors_core)
ORDER BY source_author_id, source_created_at DESC NULLS LAST
ON CONFLICT (author_id) DO NOTHING;

INSERT INTO authors_ecommerce (
  author_id, e_commerce_enable, author_ecom_level, star_ecom_video_num_30d,
  ecom_video_product_num_30d, star_ecom_video_product_num_30d,
  ecom_gmv_30d_range, ecom_avg_order_value_30d_range, ecom_gpm_30d_range,
  ecom_gpm_30days_range, ecom_score, ecom_watch_pv_30d,
  ecom_video_ctr_30d_range, ecom_video_mid_click_pv_30d_range,
  avg_sale_amount_range, star_ecom_main_price_30days
)
SELECT DISTINCT ON (source_author_id)
  source_author_id, COALESCE(e_commerce_enable, false), author_ecom_level,
  star_ecom_video_num_30d, ecom_video_product_num_30d,
  star_ecom_video_product_num_30d, ecom_gmv_30d_range,
  ecom_avg_order_value_30d_range, ecom_gpm_30d_range,
  ecom_gpm_30days_range, ecom_score, ecom_watch_pv_30d,
  ecom_video_ctr_30d_range, ecom_video_mid_click_pv_30d_range,
  avg_sale_amount_range, star_ecom_main_price_30days
FROM authors_raw_archive_parsed WHERE source_author_id IN (SELECT author_id FROM authors_core)
ORDER BY source_author_id, source_created_at DESC NULLS LAST
ON CONFLICT (author_id) DO NOTHING;

ANALYZE;
