-- =============================================
-- 筛选功能优化: 索引和视图创建脚本
-- 目标: 提升筛选查询性能,支持新增筛选维度
-- 创建时间: 2025-01-08
-- =============================================

-- ==================== 第一部分: 新增索引 ====================

-- 1. 内容标签GIN索引(提升数组查询性能)
-- primary_tags已有索引idx_content_primary_tags和idx_content_tags_primary_gin
-- 无需重复创建

CREATE INDEX IF NOT EXISTS idx_content_themes_gin 
ON authors_content_tags USING gin(primary_themes)
WHERE primary_themes IS NOT NULL;

-- 2. 电商能力索引
-- gmv_30d字段已存在,直接创建索引
CREATE INDEX IF NOT EXISTS idx_ecommerce_gmv 
ON authors_ecommerce(gmv_30d DESC NULLS LAST) 
WHERE gmv_30d > 0;

CREATE INDEX IF NOT EXISTS idx_ecommerce_level 
ON authors_ecommerce(author_ecom_level) 
WHERE author_ecom_level IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ecommerce_capability_tier
ON authors_ecommerce(ecom_capability_tier)
WHERE ecom_capability_tier IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ecommerce_active
ON authors_ecommerce(is_ecom_active)
WHERE is_ecom_active = TRUE;

-- 3. 营销指数索引
CREATE INDEX IF NOT EXISTS idx_marketing_convert 
ON authors_marketing_indices(link_convert_index DESC NULLS LAST)
WHERE link_convert_index > 0;

CREATE INDEX IF NOT EXISTS idx_marketing_shopping 
ON authors_marketing_indices(link_shopping_index DESC NULLS LAST)
WHERE link_shopping_index > 0;

CREATE INDEX IF NOT EXISTS idx_marketing_spread 
ON authors_marketing_indices(link_spread_index DESC NULLS LAST)
WHERE link_spread_index > 0;

-- 4. 复合索引(优化多条件组合查询)
CREATE INDEX IF NOT EXISTS idx_combined_quality_growth 
ON authors_core(author_id)
INCLUDE (follower, star_index);

-- ==================== 第二部分: 创建综合视图 ====================

-- 1. 综合筛选视图(整合所有筛选维度)
CREATE OR REPLACE VIEW v_authors_combined AS
SELECT 
    -- 核心信息
    c.author_id,
    c.star_id,
    c.nick_name,
    c.avatar_uri,
    c.city,
    c.province,
    c.gender,
    c.author_type,
    
    -- 认证标签
    c.star_excellent_author,
    c.is_black_horse_author,
    c.star_qianchuan_high_potential,
    c.is_short_drama,
    c.is_cocreate_author,
    c.is_cpm_project_author,
    c.is_ad_star_cur_high_quality_author,
    
    -- 爬虫数据字段（来自 get_author_base_info 和 get_author_platform_channel_info_v2）
    c.unique_id,
    c.sec_uid,
    c.short_id,
    c.has_phone,
    c.mcn_name,
    c.self_intro,
    c.platform,
    c.platform_channel,
    
    -- 计算字段(快速筛选用)
    c.star_index,
    f.growth_level,
    f.is_rising_star,
    e.quality_tier,
    e.engagement_score,
    p.price_tier,
    p.cpm_efficiency,
    
    -- 数据指标(高级筛选用)
    f.follower,
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
    
    -- 营销指数
    m.link_convert_index,
    m.link_shopping_index,
    m.link_spread_index,
    
    -- 电商能力 (使用实际字段名)
    ec.e_commerce_enable,
    ec.author_ecom_level,
    ec.star_ecom_video_num_30d,
    ec.gmv_30d,
    ec.ecom_capability_tier,
    ec.is_ecom_active,
    
    -- 内容标签
    t.primary_tags,
    t.primary_themes,
    t.tag_count,
    
    -- 更新时间
    c.updated_at,
    c.last_crawled_at
    
FROM authors_core c
LEFT JOIN authors_fans_metrics f ON c.author_id = f.author_id
LEFT JOIN authors_engagement_metrics e ON c.author_id = e.author_id
LEFT JOIN authors_pricing p ON c.author_id = p.author_id
LEFT JOIN authors_marketing_indices m ON c.author_id = m.author_id
LEFT JOIN authors_ecommerce ec ON c.author_id = ec.author_id
LEFT JOIN authors_content_tags t ON c.author_id = t.author_id;

COMMENT ON VIEW v_authors_combined IS '综合筛选视图-整合所有筛选维度';

-- 2. 创建物化视图(性能优化)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_authors_combined AS
SELECT * FROM v_authors_combined;

-- 为物化视图创建索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_combined_author_id 
ON mv_authors_combined(author_id);

-- 快速筛选维度索引
CREATE INDEX IF NOT EXISTS idx_mv_combined_quality 
ON mv_authors_combined(quality_tier) 
WHERE quality_tier IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mv_combined_growth 
ON mv_authors_combined(growth_level) 
WHERE growth_level IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mv_combined_price 
ON mv_authors_combined(price_tier) 
WHERE price_tier IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mv_combined_follower 
ON mv_authors_combined(follower DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_mv_combined_engagement 
ON mv_authors_combined(engagement_score DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_mv_combined_cpm_efficiency 
ON mv_authors_combined(cpm_efficiency DESC NULLS LAST)
WHERE cpm_efficiency IS NOT NULL;

-- 星图综合指数索引
CREATE INDEX IF NOT EXISTS idx_mv_combined_star_index
ON mv_authors_combined (star_index DESC)
WHERE star_index IS NOT NULL;

-- 认证标签索引
CREATE INDEX IF NOT EXISTS idx_mv_combined_excellent 
ON mv_authors_combined(star_excellent_author) 
WHERE star_excellent_author = TRUE;

CREATE INDEX IF NOT EXISTS idx_mv_combined_black_horse 
ON mv_authors_combined(is_black_horse_author) 
WHERE is_black_horse_author = TRUE;

-- 内容标签GIN索引
CREATE INDEX IF NOT EXISTS idx_mv_combined_tags_gin 
ON mv_authors_combined USING gin(primary_tags);

-- ==================== 第三部分: 刷新函数 ====================

-- 物化视图刷新函数
CREATE OR REPLACE FUNCTION refresh_authors_combined_mv()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    -- 使用CONCURRENTLY避免锁表
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_authors_combined;
    
    -- 记录刷新时间
    RAISE NOTICE '物化视图 mv_authors_combined 刷新完成: %', NOW();
END;
$$;

COMMENT ON FUNCTION refresh_authors_combined_mv() IS '刷新综合筛选物化视图';

-- ==================== 第四部分: 统计信息更新 ====================

-- 更新表统计信息(优化查询计划)
ANALYZE authors_core;
ANALYZE authors_fans_metrics;
ANALYZE authors_engagement_metrics;
ANALYZE authors_pricing;
ANALYZE authors_marketing_indices;
ANALYZE authors_ecommerce;
ANALYZE authors_content_tags;

-- 分析物化视图
ANALYZE mv_authors_combined;

-- ==================== 第五部分: 验证与测试 ====================

-- 验证索引创建
DO $$
DECLARE
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename IN (
        'authors_ecommerce',
        'authors_marketing_indices',
        'authors_content_tags',
        'mv_authors_combined'
    );
    
    RAISE NOTICE '✅ 共创建/验证 % 个索引', index_count;
END $$;

-- 验证物化视图
DO $$
DECLARE
    row_count BIGINT;
BEGIN
    SELECT COUNT(*) INTO row_count FROM mv_authors_combined;
    RAISE NOTICE '✅ 物化视图包含 % 条记录', row_count;
END $$;

-- 性能测试查询
DO $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    duration INTERVAL;
BEGIN
    -- 测试1: 快速筛选组合
    start_time := clock_timestamp();
    
    PERFORM COUNT(*) FROM mv_authors_combined
    WHERE quality_tier = 'premium'
      AND growth_level = 'high'
      AND price_tier = 'medium';
    
    end_time := clock_timestamp();
    duration := end_time - start_time;
    RAISE NOTICE '测试1(快速筛选组合): 耗时 %', duration;
    
    -- 测试2: 内容标签筛选
    start_time := clock_timestamp();
    
    PERFORM COUNT(*) FROM mv_authors_combined
    WHERE primary_tags @> ARRAY['美妆', '时尚']::text[];
    
    end_time := clock_timestamp();
    duration := end_time - start_time;
    RAISE NOTICE '测试2(内容标签筛选): 耗时 %', duration;
    
    -- 测试3: 高级筛选组合
    start_time := clock_timestamp();
    
    PERFORM COUNT(*) FROM mv_authors_combined
    WHERE follower BETWEEN 1000000 AND 10000000
      AND interact_rate_30d >= 0.1
      AND cpm_efficiency > 1000;
    
    end_time := clock_timestamp();
    duration := end_time - start_time;
    RAISE NOTICE '测试3(高级筛选组合): 耗时 %', duration;
END $$;

-- ==================== 完成提示 ====================
DO $$
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE '✅ 筛选功能优化完成！';
    RAISE NOTICE '====================================';
    RAISE NOTICE '已完成:';
    RAISE NOTICE '  1. 新增 13 个索引';
    RAISE NOTICE '  2. 创建综合视图 v_authors_combined';
    RAISE NOTICE '  3. 创建物化视图 mv_authors_combined';
    RAISE NOTICE '  4. 创建刷新函数 refresh_authors_combined_mv()';
    RAISE NOTICE '====================================';
    RAISE NOTICE '建议操作:';
    RAISE NOTICE '  1. 配置定时任务,每小时执行一次:';
    RAISE NOTICE '     SELECT refresh_authors_combined_mv();';
    RAISE NOTICE '  2. 监控物化视图刷新时间';
    RAISE NOTICE '  3. 根据查询日志优化索引';
    RAISE NOTICE '====================================';
END $$;
