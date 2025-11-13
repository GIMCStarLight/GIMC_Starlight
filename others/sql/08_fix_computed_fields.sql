-- ============================================
-- 修复计算字段逻辑
-- 目标：优化growth_level和quality_tier的计算，使筛选更有效
-- ============================================

-- 1. 修复authors_fans_metrics表的增长率计算
-- 问题：fans_increment_rate_30d字段为NULL，导致growth_level全是'stagnant'
-- 解决：添加计算列，基于fans_increment_30d和follower计算增长率

-- 删除旧的计算字段
ALTER TABLE authors_fans_metrics 
DROP COLUMN IF EXISTS fans_increment_rate_30d CASCADE;

ALTER TABLE authors_fans_metrics 
DROP COLUMN IF EXISTS is_rising_star CASCADE;

ALTER TABLE authors_fans_metrics 
DROP COLUMN IF EXISTS growth_level CASCADE;

-- 重新创建fans_increment_rate_30d为计算字段
ALTER TABLE authors_fans_metrics
ADD COLUMN fans_increment_rate_30d DOUBLE PRECISION GENERATED ALWAYS AS (
    CASE 
        WHEN follower > 0 AND fans_increment_30d IS NOT NULL 
        THEN fans_increment_30d::DOUBLE PRECISION / follower
        ELSE NULL
    END
) STORED;

-- 重新创建is_rising_star（新星达人：增长率>5%且粉丝1万-100万）
-- 降低阈值从10%到5%，使更多达人符合条件
ALTER TABLE authors_fans_metrics
ADD COLUMN is_rising_star BOOLEAN GENERATED ALWAYS AS (
    CASE 
        WHEN follower > 0 AND fans_increment_30d IS NOT NULL 
        THEN (fans_increment_30d::DOUBLE PRECISION / follower) > 0.05 
             AND follower BETWEEN 10000 AND 1000000
        ELSE FALSE
    END
) STORED;

-- 重新创建growth_level（优化阈值使分布更均匀）
ALTER TABLE authors_fans_metrics
ADD COLUMN growth_level TEXT GENERATED ALWAYS AS (
    CASE 
        WHEN follower > 0 AND fans_increment_30d IS NOT NULL THEN
            CASE 
                WHEN (fans_increment_30d::DOUBLE PRECISION / follower) >= 0.3 THEN 'explosive'   -- >=30% 爆发式增长
                WHEN (fans_increment_30d::DOUBLE PRECISION / follower) >= 0.1 THEN 'high'        -- 10-30% 高速增长
                WHEN (fans_increment_30d::DOUBLE PRECISION / follower) >= 0.03 THEN 'medium'     -- 3-10% 中速增长
                WHEN (fans_increment_30d::DOUBLE PRECISION / follower) > 0 THEN 'low'            -- 0-3% 低速增长
                ELSE 'stagnant'  -- <=0 停滞/下降
            END
        ELSE 'stagnant'
    END
) STORED;

-- 2. 优化authors_engagement_metrics表的质量评分
-- 问题：burst_text_rate缺失导致quality_tier评分偏低
-- 解决：调整公式权重，不依赖缺失字段

-- 删除旧的计算字段
ALTER TABLE authors_engagement_metrics 
DROP COLUMN IF EXISTS engagement_score CASCADE;

ALTER TABLE authors_engagement_metrics 
DROP COLUMN IF EXISTS quality_tier CASCADE;

-- 重新创建engagement_score（不依赖burst_text_rate）
ALTER TABLE authors_engagement_metrics
ADD COLUMN engagement_score DOUBLE PRECISION GENERATED ALWAYS AS (
    CASE 
        WHEN interact_rate_30d IS NOT NULL OR play_over_rate_30d IS NOT NULL THEN
            COALESCE(interact_rate_30d, 0) * 0.6 +
            COALESCE(play_over_rate_30d, 0) * 0.4
        ELSE NULL
    END
) STORED;

-- 重新创建quality_tier（优化阈值）
ALTER TABLE authors_engagement_metrics
ADD COLUMN quality_tier TEXT GENERATED ALWAYS AS (
    CASE 
        WHEN interact_rate_30d IS NOT NULL OR play_over_rate_30d IS NOT NULL THEN
            CASE 
                WHEN (COALESCE(interact_rate_30d, 0) * 0.6 + COALESCE(play_over_rate_30d, 0) * 0.4) >= 0.08 THEN 'premium'  -- >=8% 优质
                WHEN (COALESCE(interact_rate_30d, 0) * 0.6 + COALESCE(play_over_rate_30d, 0) * 0.4) >= 0.05 THEN 'high'     -- 5-8% 高质
                WHEN (COALESCE(interact_rate_30d, 0) * 0.6 + COALESCE(play_over_rate_30d, 0) * 0.4) >= 0.02 THEN 'medium'   -- 2-5% 中质
                ELSE 'low'  -- <2% 低质
            END
        ELSE 'low'
    END
) STORED;

-- 3. 重新创建视图和物化视图

-- 重新创建v_authors_combined视图
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
    
    -- 计算字段(快速筛选用)
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
    p.price_20_60,
    p.price_1_20,
    p.price_60,
    p.expected_play_num,
    p.assign_cpm_suggest_price,
    p.promotion_prospective_20_60_cpm,
    p.sn_prospective_20_60_cpe,
    
    -- 电商数据
    ec.e_commerce_enable,
    ec.author_ecom_level,
    ec.star_ecom_video_num_30d,
    ec.gmv_30d,
    ec.ecom_capability_tier,
    ec.is_ecom_active,
    
    -- 营销指数
    m.link_convert_index,
    m.link_shopping_index,
    m.link_spread_index,
    m.star_index,
    m.marketing_power_score,
    m.marketing_tier,
    
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

-- 重新创建物化视图
CREATE MATERIALIZED VIEW mv_authors_combined AS
SELECT * FROM v_authors_combined;

-- 重新创建物化视图索引
CREATE UNIQUE INDEX idx_mv_combined_author_id ON mv_authors_combined(author_id);
CREATE INDEX idx_mv_combined_quality ON mv_authors_combined(quality_tier) WHERE quality_tier IS NOT NULL;
CREATE INDEX idx_mv_combined_growth ON mv_authors_combined(growth_level) WHERE growth_level IS NOT NULL;
CREATE INDEX idx_mv_combined_price ON mv_authors_combined(price_tier) WHERE price_tier IS NOT NULL;
CREATE INDEX idx_mv_combined_follower ON mv_authors_combined(follower DESC NULLS LAST);
CREATE INDEX idx_mv_combined_tags_gin ON mv_authors_combined USING gin(primary_tags);
CREATE INDEX idx_mv_combined_ecom ON mv_authors_combined(e_commerce_enable) WHERE e_commerce_enable = TRUE;
CREATE INDEX idx_mv_combined_excellent ON mv_authors_combined(star_excellent_author) WHERE star_excellent_author = TRUE;
CREATE INDEX idx_mv_combined_rising ON mv_authors_combined(is_rising_star) WHERE is_rising_star = TRUE;

-- 4. 验证修复结果
DO $$
DECLARE
    v_growth_dist TEXT;
    v_quality_dist TEXT;
    v_rising_count INTEGER;
BEGIN
    -- 检查增长等级分布
    RAISE NOTICE '=== 增长等级分布 ===';
    FOR v_growth_dist IN 
        SELECT growth_level || ': ' || COUNT(*) 
        FROM mv_authors_combined 
        WHERE growth_level IS NOT NULL 
        GROUP BY growth_level 
        ORDER BY COUNT(*) DESC
    LOOP
        RAISE NOTICE '%', v_growth_dist;
    END LOOP;
    
    -- 检查质量等级分布
    RAISE NOTICE '';
    RAISE NOTICE '=== 质量等级分布 ===';
    FOR v_quality_dist IN 
        SELECT quality_tier || ': ' || COUNT(*) 
        FROM mv_authors_combined 
        WHERE quality_tier IS NOT NULL 
        GROUP BY quality_tier 
        ORDER BY COUNT(*) DESC
    LOOP
        RAISE NOTICE '%', v_quality_dist;
    END LOOP;
    
    -- 检查新星达人数量
    SELECT COUNT(*) INTO v_rising_count 
    FROM mv_authors_combined 
    WHERE is_rising_star = TRUE;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== 新星达人数量 ===';
    RAISE NOTICE '新星达人: %', v_rising_count;
    
    -- 检查特殊认证数量
    RAISE NOTICE '';
    RAISE NOTICE '=== 特殊认证数量 ===';
    RAISE NOTICE '优质达人: %', (SELECT COUNT(*) FROM mv_authors_combined WHERE star_excellent_author = TRUE);
    RAISE NOTICE '黑马达人: %', (SELECT COUNT(*) FROM mv_authors_combined WHERE is_black_horse_author = TRUE);
    RAISE NOTICE '高潜达人: %', (SELECT COUNT(*) FROM mv_authors_combined WHERE star_qianchuan_high_potential = TRUE);
END $$;

-- 5. 添加注释
COMMENT ON COLUMN authors_fans_metrics.fans_increment_rate_30d IS '30天粉丝增长率（计算字段：fans_increment_30d/follower）';
COMMENT ON COLUMN authors_fans_metrics.is_rising_star IS '新星达人标识（增长率>5%且粉丝1万-100万）';
COMMENT ON COLUMN authors_fans_metrics.growth_level IS '增长等级：explosive(>=30%)/high(10-30%)/medium(3-10%)/low(0-3%)/stagnant(<=0)';
COMMENT ON COLUMN authors_engagement_metrics.engagement_score IS '综合互动评分（互动率60%+完播率40%）';
COMMENT ON COLUMN authors_engagement_metrics.quality_tier IS '内容质量等级：premium(>=8%)/high(5-8%)/medium(2-5%)/low(<2%)';

-- 刷新完成
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ 计算字段修复完成！';
END $$;
