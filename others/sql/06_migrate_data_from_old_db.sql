-- =============================================
-- 数据迁移脚本：从 crawler_db 迁移到 crawler_db_v2
-- 源数据库：crawler_db (旧表结构)
-- 目标数据库：crawler_db_v2 (新15表结构)
-- 数据量：约7510条作者数据
-- 创建时间: 2025-01-04
-- =============================================

-- ============================================
-- 准备工作：创建外部数据包装器（FDW）
-- ============================================

-- 安装 postgres_fdw 扩展
CREATE EXTENSION IF NOT EXISTS postgres_fdw;

-- 创建外部服务器连接到旧数据库
CREATE SERVER IF NOT EXISTS old_crawler_db
FOREIGN DATA WRAPPER postgres_fdw
OPTIONS (
    host '192.168.102.168',
    port '5432',
    dbname 'crawler_db'
);

-- 创建用户映射
CREATE USER MAPPING IF NOT EXISTS FOR postgres
SERVER old_crawler_db
OPTIONS (
    user 'postgres',
    password 'postgres'
);

-- 导入旧表的外部表定义
IMPORT FOREIGN SCHEMA public
LIMIT TO (author_dimension, author_square_authors, author_square_runs)
FROM SERVER old_crawler_db
INTO public;

-- ============================================
-- 数据迁移函数
-- ============================================

CREATE OR REPLACE FUNCTION migrate_authors_data()
RETURNS TABLE (
    step TEXT,
    records_migrated BIGINT,
    status TEXT
) AS $$
DECLARE
    v_core_count BIGINT;
    v_fans_count BIGINT;
    v_engagement_count BIGINT;
    v_pricing_count BIGINT;
    v_marketing_count BIGINT;
    v_tags_count BIGINT;
    v_ecommerce_count BIGINT;
    v_videos_count BIGINT;
    v_works_count BIGINT;
    v_game_count BIGINT;
    v_content_count BIGINT;
    v_tool_count BIGINT;
    v_brand_count BIGINT;
    v_archive_count BIGINT;
BEGIN
    RAISE NOTICE '开始数据迁移...';
    
    -- ============================================
    -- 1. 迁移核心表 authors_core
    -- ============================================
    RAISE NOTICE '步骤1: 迁移 authors_core...';
    
    INSERT INTO authors_core (
        author_id,
        star_id,
        core_user_id,
        nick_name,
        avatar_uri,
        gender,
        city,
        province,
        author_type,
        author_status,
        grade,
        follower,
        star_index,
        star_excellent_author,
        is_black_horse_author,
        is_cocreate_author,
        is_cpm_project_author,
        is_short_drama,
        is_ad_star_cur_high_quality_author,
        star_qianchuan_high_potential,
        created_at,
        updated_at,
        last_crawled_at
    )
    SELECT DISTINCT ON (author_id)
        author_id,
        star_id,
        core_user_id,
        nick_name,
        avatar_uri,
        gender,
        city,
        province,
        author_type,
        author_status,
        grade,
        follower,
        star_index,
        COALESCE(star_excellent_author, FALSE),
        COALESCE(is_black_horse_author, FALSE),
        COALESCE(is_cocreate_author, FALSE),
        COALESCE(is_cpm_project_author, FALSE),
        COALESCE(is_short_drama, FALSE),
        COALESCE(is_ad_star_cur_high_quality_author, FALSE),
        COALESCE(star_qianchuan_high_potential, FALSE),
        created_at,
        updated_at,
        updated_at as last_crawled_at
    FROM author_dimension
    WHERE author_id IS NOT NULL
    ORDER BY author_id, updated_at DESC
    ON CONFLICT (author_id) DO UPDATE SET
        updated_at = EXCLUDED.updated_at,
        last_crawled_at = EXCLUDED.last_crawled_at;
    
    GET DIAGNOSTICS v_core_count = ROW_COUNT;
    step := '1. authors_core';
    records_migrated := v_core_count;
    status := '✅ 完成';
    RETURN NEXT;
    
    -- ============================================
    -- 2. 迁移粉丝指标表 authors_fans_metrics
    -- ============================================
    RAISE NOTICE '步骤2: 迁移 authors_fans_metrics...';
    
    INSERT INTO authors_fans_metrics (
        author_id,
        follower,
        fans_increment_15d,
        fans_increment_rate_15d,
        fans_increment_30d,
        fans_increment_rate_30d
    )
    SELECT DISTINCT ON (author_id)
        author_id,
        follower,
        fans_increment_within_15d,
        fans_increment_rate_within_15d,
        fans_increment_within_30d,
        fans_increment_rate_within_30d
    FROM author_dimension
    WHERE author_id IN (SELECT author_id FROM authors_core)
    ORDER BY author_id, updated_at DESC
    ON CONFLICT (author_id) DO UPDATE SET
        follower = EXCLUDED.follower,
        fans_increment_15d = EXCLUDED.fans_increment_15d,
        fans_increment_rate_15d = EXCLUDED.fans_increment_rate_15d,
        fans_increment_30d = EXCLUDED.fans_increment_30d,
        fans_increment_rate_30d = EXCLUDED.fans_increment_rate_30d;
    
    GET DIAGNOSTICS v_fans_count = ROW_COUNT;
    step := '2. authors_fans_metrics';
    records_migrated := v_fans_count;
    status := '✅ 完成';
    RETURN NEXT;
    
    -- ============================================
    -- 3. 迁移互动指标表 authors_engagement_metrics
    -- ============================================
    RAISE NOTICE '步骤3: 迁移 authors_engagement_metrics...';
    
    INSERT INTO authors_engagement_metrics (
        author_id,
        interact_rate_30d,
        play_over_rate_30d,
        vv_median_30d,
        interaction_median_30d,
        sn_interact_rate_30d,
        sn_play_over_rate_30d,
        avg_search_after_view_rate_30d,
        burst_text_rate
    )
    SELECT DISTINCT ON (author_id)
        author_id,
        interact_rate_within_30d,
        play_over_rate_within_30d,
        vv_median_30d,
        interaction_median_30d,
        sn_interact_rate_within_30d,
        sn_play_over_rate_within_30d,
        avg_search_after_view_rate_30d,
        burst_text_rate
    FROM author_dimension
    WHERE author_id IN (SELECT author_id FROM authors_core)
    ORDER BY author_id, updated_at DESC
    ON CONFLICT (author_id) DO UPDATE SET
        interact_rate_30d = EXCLUDED.interact_rate_30d,
        play_over_rate_30d = EXCLUDED.play_over_rate_30d,
        vv_median_30d = EXCLUDED.vv_median_30d;
    
    GET DIAGNOSTICS v_engagement_count = ROW_COUNT;
    step := '3. authors_engagement_metrics';
    records_migrated := v_engagement_count;
    status := '✅ 完成';
    RETURN NEXT;
    
    -- ============================================
    -- 4. 迁移价格表 authors_pricing
    -- ============================================
    RAISE NOTICE '步骤4: 迁移 authors_pricing...';
    
    INSERT INTO authors_pricing (
        author_id,
        price_1_20,
        price_20_60,
        price_60,
        assign_cpm_suggest_price,
        expected_play_num,
        expected_natural_play_num,
        promotion_prospective_vv,
        promotion_prospective_1_20_cpm,
        promotion_prospective_20_60_cpm,
        promotion_prospective_60_cpm,
        sn_prospective_1_20_cpe,
        sn_prospective_1_20_cpm,
        sn_prospective_20_60_cpe,
        sn_prospective_20_60_cpm,
        sn_prospective_60_cpe,
        sn_prospective_60_cpm,
        pic_expected_play_num,
        pic_expected_cpm,
        expected_cpa3_level,
        assign_task_price_list,
        enroll_task_price_list
    )
    SELECT DISTINCT ON (author_id)
        author_id,
        price_1_20,
        price_20_60,
        price_60,
        assign_cpm_suggest_price,
        expected_play_num,
        expected_natural_play_num,
        promotion_prospective_vv,
        promotion_prospective_1_20_cpm,
        promotion_prospective_20_60_cpm,
        promotion_prospective_60_cpm,
        sn_prospective_1_20_cpe,
        sn_prospective_1_20_cpm,
        sn_prospective_20_60_cpe,
        sn_prospective_20_60_cpm,
        sn_prospective_60_cpe,
        sn_prospective_60_cpm,
        pic_expected_play_num,
        pic_expected_cpm,
        expected_cpa3_level,
        assign_task_price_list,
        enroll_task_price_list
    FROM author_dimension
    WHERE author_id IN (SELECT author_id FROM authors_core)
    ORDER BY author_id, updated_at DESC
    ON CONFLICT (author_id) DO UPDATE SET
        price_20_60 = EXCLUDED.price_20_60,
        assign_cpm_suggest_price = EXCLUDED.assign_cpm_suggest_price;
    
    GET DIAGNOSTICS v_pricing_count = ROW_COUNT;
    step := '4. authors_pricing';
    records_migrated := v_pricing_count;
    status := '✅ 完成';
    RETURN NEXT;
    
    -- ============================================
    -- 5. 迁移营销指数表 authors_marketing_indices
    -- ============================================
    RAISE NOTICE '步骤5: 迁移 authors_marketing_indices...';
    
    INSERT INTO authors_marketing_indices (
        author_id,
        link_convert_index,
        link_shopping_index,
        link_spread_index,
        link_star_index,
        star_index,
        link_convert_index_by_industry,
        link_spread_index_by_industry,
        link_star_index_by_industry,
        link_recommend_index_by_industry,
        search_after_view_index_by_industry,
        link_user_type_by_industry,
        link_i_cnt_by_industry,
        link_k_cnt_by_industry,
        link_l_cnt_by_industry,
        link_link_cnt_by_industry,
        link_n_cnt_by_industry
    )
    SELECT DISTINCT ON (author_id)
        author_id,
        link_convert_index,
        link_shopping_index,
        link_spread_index,
        link_star_index,
        star_index,
        link_convert_index_by_industry,
        link_spread_index_by_industry,
        link_star_index_by_industry,
        link_recommend_index_by_industry,
        search_after_view_index_by_industry,
        link_user_type_by_industry,
        link_i_cnt_by_industry,
        link_k_cnt_by_industry,
        link_l_cnt_by_industry,
        link_link_cnt_by_industry,
        link_n_cnt_by_industry
    FROM author_dimension
    WHERE author_id IN (SELECT author_id FROM authors_core)
    ORDER BY author_id, updated_at DESC
    ON CONFLICT (author_id) DO UPDATE SET
        link_convert_index = EXCLUDED.link_convert_index,
        link_shopping_index = EXCLUDED.link_shopping_index,
        link_spread_index = EXCLUDED.link_spread_index;
    
    GET DIAGNOSTICS v_marketing_count = ROW_COUNT;
    step := '5. authors_marketing_indices';
    records_migrated := v_marketing_count;
    status := '✅ 完成';
    RETURN NEXT;
    
    -- ============================================
    -- 6. 迁移内容标签表 authors_content_tags
    -- ============================================
    RAISE NOTICE '步骤6: 迁移 authors_content_tags...';
    
    INSERT INTO authors_content_tags (
        author_id,
        tags_relation,
        content_theme_labels_180d,
        author_thin_mid_word_association_index,
        primary_tags,
        primary_themes,
        tag_count
    )
    SELECT DISTINCT ON (author_id)
        author_id,
        tags_relation,
        content_theme_labels_180d,
        author_thin_mid_word_association_index,
        -- 提取主要标签
        CASE 
            WHEN tags_relation IS NOT NULL AND jsonb_typeof(tags_relation) = 'object'
            THEN ARRAY(SELECT jsonb_object_keys(tags_relation))
            ELSE ARRAY[]::TEXT[]
        END as primary_tags,
        -- 提取主要主题
        CASE 
            WHEN content_theme_labels_180d IS NOT NULL AND jsonb_typeof(content_theme_labels_180d) = 'array'
            THEN ARRAY(SELECT jsonb_array_elements_text(content_theme_labels_180d) LIMIT 5)
            ELSE ARRAY[]::TEXT[]
        END as primary_themes,
        -- 计算标签数量
        CASE 
            WHEN tags_relation IS NOT NULL AND jsonb_typeof(tags_relation) = 'object'
            THEN (SELECT COUNT(*) FROM jsonb_object_keys(tags_relation))
            ELSE 0
        END as tag_count
    FROM author_dimension
    WHERE author_id IN (SELECT author_id FROM authors_core)
    ORDER BY author_id, updated_at DESC
    ON CONFLICT (author_id) DO UPDATE SET
        tags_relation = EXCLUDED.tags_relation,
        content_theme_labels_180d = EXCLUDED.content_theme_labels_180d,
        primary_tags = EXCLUDED.primary_tags,
        primary_themes = EXCLUDED.primary_themes,
        tag_count = EXCLUDED.tag_count;
    
    GET DIAGNOSTICS v_tags_count = ROW_COUNT;
    step := '6. authors_content_tags';
    records_migrated := v_tags_count;
    status := '✅ 完成';
    RETURN NEXT;
    
    -- ============================================
    -- 7. 迁移电商数据表 authors_ecommerce
    -- ============================================
    RAISE NOTICE '步骤7: 迁移 authors_ecommerce...';
    
    INSERT INTO authors_ecommerce (
        author_id,
        e_commerce_enable,
        author_ecom_level,
        star_ecom_video_num_30d,
        ecom_video_product_num_30d,
        star_ecom_video_product_num_30d,
        ecom_gmv_30d_range,
        ecom_avg_order_value_30d_range,
        ecom_gpm_30d_range,
        ecom_gpm_30days_range,
        ecom_score,
        ecom_watch_pv_30d,
        ecom_video_ctr_30d_range,
        ecom_video_mid_click_pv_30d_range,
        avg_sale_amount_range,
        star_ecom_main_price_30days
    )
    SELECT DISTINCT ON (author_id)
        author_id,
        COALESCE(e_commerce_enable, FALSE),
        author_ecom_level,
        star_ecom_video_num_30d,
        ecom_video_product_num_30d,
        star_ecom_video_product_num_30d,
        ecom_gmv_30d_range,
        ecom_avg_order_value_30d_range,
        ecom_gpm_30d_range,
        ecom_gpm_30days_range,
        ecom_score,
        ecom_watch_pv_30d,
        ecom_video_ctr_30d_range,
        ecom_video_mid_click_pv_30d_range,
        avg_sale_amount_range,
        star_ecom_main_price_30days
    FROM author_dimension
    WHERE author_id IN (SELECT author_id FROM authors_core)
    ORDER BY author_id, updated_at DESC
    ON CONFLICT (author_id) DO UPDATE SET
        e_commerce_enable = EXCLUDED.e_commerce_enable,
        author_ecom_level = EXCLUDED.author_ecom_level,
        ecom_score = EXCLUDED.ecom_score;
    
    GET DIAGNOSTICS v_ecommerce_count = ROW_COUNT;
    step := '7. authors_ecommerce';
    records_migrated := v_ecommerce_count;
    status := '✅ 完成';
    RETURN NEXT;
    
    -- ============================================
    -- 8-13. 迁移其他表（星图视频、作品、垂直领域、品牌）
    -- ============================================
    
    -- 8. 星图视频数据
    INSERT INTO authors_star_videos_90d (
        author_id, star_video_cnt_90d, star_video_interact_rate_90d,
        star_video_finish_vv_rate_90d, star_video_median_vv_90d,
        star_video_install_ge_1_cnt_90d, star_item_count_within_30d,
        star_component_link_click_cnt_90d, star_component_install_finish_cnt_90d,
        star_component_download_ctr_90d, star_component_install_cpa_90d,
        star_component_install_pvr_90d
    )
    SELECT DISTINCT ON (author_id)
        author_id, star_video_cnt_90d, star_video_interact_rate_90d,
        star_video_finish_vv_rate_90d, star_video_median_vv_90d,
        star_video_install_ge_1_cnt_90d, star_item_count_within_30d,
        star_component_link_click_cnt_90d, star_component_install_finish_cnt_90d,
        star_component_download_ctr_90d, star_component_install_cpa_90d,
        star_component_install_pvr_90d
    FROM author_dimension
    WHERE author_id IN (SELECT author_id FROM authors_core)
    ORDER BY author_id, updated_at DESC
    ON CONFLICT (author_id) DO NOTHING;
    
    GET DIAGNOSTICS v_videos_count = ROW_COUNT;
    step := '8. authors_star_videos_90d';
    records_migrated := v_videos_count;
    status := '✅ 完成';
    RETURN NEXT;
    
    -- 9. 最近作品
    INSERT INTO authors_recent_works (author_id, last_10_items)
    SELECT DISTINCT ON (author_id) author_id, last_10_items
    FROM author_dimension
    WHERE author_id IN (SELECT author_id FROM authors_core)
      AND last_10_items IS NOT NULL
    ORDER BY author_id, updated_at DESC
    ON CONFLICT (author_id) DO NOTHING;
    
    GET DIAGNOSTICS v_works_count = ROW_COUNT;
    step := '9. authors_recent_works';
    records_migrated := v_works_count;
    status := '✅ 完成';
    RETURN NEXT;
    
    -- 10-12. 垂直领域数据
    INSERT INTO authors_game_data (
        author_id, game_type, game_item_count_90d,
        median_game_item_component_click_range, median_game_item_component_click_90_days,
        median_game_item_cpc_range, median_game_item_cpc_90_days_range,
        median_game_item_ctr_90_days
    )
    SELECT DISTINCT ON (author_id)
        author_id, game_type, game_item_count_90d,
        median_game_item_component_click_range, median_game_item_component_click_90_days,
        median_game_item_cpc_range, median_game_item_cpc_90_days_range,
        median_game_item_ctr_90_days
    FROM author_dimension
    WHERE author_id IN (SELECT author_id FROM authors_core)
      AND game_item_count_90d > 0
    ORDER BY author_id, updated_at DESC
    ON CONFLICT (author_id) DO NOTHING;
    
    GET DIAGNOSTICS v_game_count = ROW_COUNT;
    step := '10. authors_game_data';
    records_migrated := v_game_count;
    status := '✅ 完成';
    RETURN NEXT;
    
    INSERT INTO authors_content_vertical (
        author_id, content_item_count_90d,
        median_content_item_component_click_range,
        median_content_item_cpc_range
    )
    SELECT DISTINCT ON (author_id)
        author_id, content_item_count_90d,
        median_content_item_component_click_range,
        median_content_item_cpc_range
    FROM author_dimension
    WHERE author_id IN (SELECT author_id FROM authors_core)
      AND content_item_count_90d > 0
    ORDER BY author_id, updated_at DESC
    ON CONFLICT (author_id) DO NOTHING;
    
    GET DIAGNOSTICS v_content_count = ROW_COUNT;
    step := '11. authors_content_vertical';
    records_migrated := v_content_count;
    status := '✅ 完成';
    RETURN NEXT;
    
    INSERT INTO authors_tool_vertical (
        author_id, tool_item_count_90d,
        median_tool_item_component_click_range,
        median_tool_item_cpc_range
    )
    SELECT DISTINCT ON (author_id)
        author_id, tool_item_count_90d,
        median_tool_item_component_click_range,
        median_tool_item_cpc_range
    FROM author_dimension
    WHERE author_id IN (SELECT author_id FROM authors_core)
      AND tool_item_count_90d > 0
    ORDER BY author_id, updated_at DESC
    ON CONFLICT (author_id) DO NOTHING;
    
    GET DIAGNOSTICS v_tool_count = ROW_COUNT;
    step := '12. authors_tool_vertical';
    records_migrated := v_tool_count;
    status := '✅ 完成';
    RETURN NEXT;
    
    -- 13. 品牌提升数据
    INSERT INTO authors_brand_boost (
        author_id, brand_boost_vv, video_brand_boost,
        video_brand_boost_vv, pic_brand_boost, pic_brand_boost_vv
    )
    SELECT DISTINCT ON (author_id)
        author_id, brand_boost_vv, video_brand_boost,
        video_brand_boost_vv, pic_brand_boost, pic_brand_boost_vv
    FROM author_dimension
    WHERE author_id IN (SELECT author_id FROM authors_core)
      AND (brand_boost_vv IS NOT NULL OR video_brand_boost IS NOT NULL)
    ORDER BY author_id, updated_at DESC
    ON CONFLICT (author_id) DO NOTHING;
    
    GET DIAGNOSTICS v_brand_count = ROW_COUNT;
    step := '13. authors_brand_boost';
    records_migrated := v_brand_count;
    status := '✅ 完成';
    RETURN NEXT;
    
    -- ============================================
    -- 14. 迁移原始数据归档
    -- ============================================
    RAISE NOTICE '步骤14: 迁移 authors_raw_archive...';
    
    INSERT INTO authors_raw_archive (
        author_id,
        run_id,
        raw_attribute_datas,
        created_at
    )
    SELECT 
        author_id,
        run_id,
        raw_attribute_datas,
        created_at
    FROM author_square_authors
    WHERE raw_attribute_datas IS NOT NULL
    ON CONFLICT (run_id, author_id, created_at) DO NOTHING;
    
    GET DIAGNOSTICS v_archive_count = ROW_COUNT;
    step := '14. authors_raw_archive';
    records_migrated := v_archive_count;
    status := '✅ 完成';
    RETURN NEXT;
    
    -- ============================================
    -- 完成
    -- ============================================
    RAISE NOTICE '数据迁移完成！';
    RAISE NOTICE '总计迁移: % 条作者核心数据', v_core_count;
    
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 执行迁移
-- ============================================
SELECT * FROM migrate_authors_data();

-- ============================================
-- 验证迁移结果
-- ============================================
SELECT 
    '验证结果' as check_type,
    (SELECT COUNT(*) FROM authors_core) as core_count,
    (SELECT COUNT(*) FROM authors_fans_metrics) as fans_count,
    (SELECT COUNT(*) FROM authors_engagement_metrics) as engagement_count,
    (SELECT COUNT(*) FROM authors_pricing) as pricing_count,
    (SELECT COUNT(*) FROM authors_marketing_indices) as marketing_count,
    (SELECT COUNT(*) FROM authors_content_tags) as tags_count,
    (SELECT COUNT(*) FROM authors_ecommerce) as ecommerce_count,
    (SELECT COUNT(*) FROM authors_raw_archive) as archive_count;

-- ============================================
-- 清理外部表（可选）
-- ============================================
-- DROP FOREIGN TABLE IF EXISTS author_dimension CASCADE;
-- DROP FOREIGN TABLE IF EXISTS author_square_authors CASCADE;
-- DROP FOREIGN TABLE IF EXISTS author_square_runs CASCADE;
-- DROP USER MAPPING IF EXISTS FOR postgres SERVER old_crawler_db;
-- DROP SERVER IF EXISTS old_crawler_db CASCADE;

-- ============================================
-- 刷新物化视图
-- ============================================
REFRESH MATERIALIZED VIEW mv_authors_hot;
REFRESH MATERIALIZED VIEW mv_recently_updated_authors;

SELECT '✅ 数据迁移全部完成！' as final_status;
