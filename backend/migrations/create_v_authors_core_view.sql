-- 创建 v_authors_core 视图
-- 基于新的分层表结构 authors_core

CREATE OR REPLACE VIEW v_authors_core AS
SELECT 
    author_id::TEXT as author_id,
    star_id::TEXT as star_id,
    nick_name,
    avatar_uri,
    gender,
    city,
    province,
    CASE 
        WHEN follower >= 10000000 THEN 'mega'
        WHEN follower >= 1000000 THEN 'macro'
        WHEN follower >= 100000 THEN 'micro'
        ELSE 'nano'
    END as author_type,
    CASE 
        WHEN author_status = 1 THEN 'active'
        WHEN author_status = 2 THEN 'inactive'
        ELSE 'unknown'
    END as author_status,
    CASE 
        WHEN grade = 1 THEN 'A'
        WHEN grade = 2 THEN 'B'
        WHEN grade = 3 THEN 'C'
        ELSE 'D'
    END as grade,
    COALESCE(follower, 0) as follower,
    updated_at,
    0 as fans_increment_within_15d,
    0 as fans_increment_within_30d,
    0.0 as fans_increment_rate_within_15d,
    0.0 as interact_rate_within_30d,
    0.0 as play_over_rate_within_30d,
    0 as vv_median_30d,
    0.0 as sn_interact_rate_within_30d,
    0.0 as sn_play_over_rate_within_30d,
    0.0 as price_1_20,
    0.0 as price_20_60,
    0.0 as price_60,
    0.0 as assign_cpm_suggest_price,
    0 as promotion_prospective_vv,
    0.0 as promotion_prospective_20_60_cpm,
    0.0 as promotion_prospective_60_cpm,
    0.0 as link_convert_index,
    0.0 as link_shopping_index,
    0.0 as link_spread_index,
    0.0 as link_star_index,
    false as e_commerce_enable,
    '' as author_ecom_level,
    NULL as ecom_gmv_30d_range,
    NULL as ecom_avg_order_value_30d_range,
    NULL as ecom_gpm_30d_range,
    0 as star_ecom_video_num_30d,
    false as star_excellent_author,
    false as is_black_horse_author,
    false as is_cocreate_author,
    false as is_cpm_project_author,
    false as is_short_drama,
    false as is_ad_star_cur_high_quality_author,
    false as star_qianchuan_high_potential,
    0.0 as avg_search_after_view_rate_30d,
    0.0 as burst_text_rate,
    '' as primary_industry,
    '[]'::JSON as content_tags_top3,
    '{}'::JSON as unified_task_price_list,
    '{}'::JSON as extra
FROM authors_core;

COMMENT ON VIEW v_authors_core IS '作者核心视图 - backend查询使用（基于分层表结构）';

-- 完成提示
SELECT 'v_authors_core 视图创建成功！' as message;
