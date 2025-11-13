-- =============================================
-- 阶段1: 核心层表结构创建脚本
-- 包含4个核心表：authors_core, authors_fans_metrics, 
--               authors_engagement_metrics, authors_pricing
-- 创建时间: 2025-01-04
-- =============================================

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- 用于模糊搜索

-- ============================================
-- 1. authors_core - 作者核心信息表
-- ============================================
CREATE TABLE IF NOT EXISTS authors_core (
    author_id TEXT PRIMARY KEY,
    star_id TEXT UNIQUE NOT NULL,
    core_user_id BIGINT,
    
    -- 基础信息
    nick_name TEXT NOT NULL,
    avatar_uri TEXT,
    gender SMALLINT,
    city TEXT,
    province TEXT,
    author_type SMALLINT,
    author_status SMALLINT,
    grade SMALLINT,
    
    -- 核心指标（用于列表展示和排序）
    follower BIGINT DEFAULT 0,
    star_index DOUBLE PRECISION,
    
    -- 认证标签（高频筛选）
    star_excellent_author BOOLEAN DEFAULT FALSE,
    is_black_horse_author BOOLEAN DEFAULT FALSE,
    is_cocreate_author BOOLEAN DEFAULT FALSE,
    is_cpm_project_author BOOLEAN DEFAULT FALSE,
    is_short_drama BOOLEAN DEFAULT FALSE,
    is_ad_star_cur_high_quality_author BOOLEAN DEFAULT FALSE,
    star_qianchuan_high_potential BOOLEAN DEFAULT FALSE,
    
    -- 元数据
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_crawled_at TIMESTAMP,
    
    -- 约束
    CONSTRAINT chk_follower_positive CHECK (follower >= 0),
    CONSTRAINT chk_star_index_range CHECK (star_index IS NULL OR (star_index >= 0 AND star_index <= 1))
);

-- 核心索引
CREATE INDEX IF NOT EXISTS idx_authors_core_city ON authors_core(city) WHERE city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_authors_core_province ON authors_core(province) WHERE province IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_authors_core_follower ON authors_core(follower DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_authors_core_star_index ON authors_core(star_index DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_authors_core_author_type ON authors_core(author_type);
CREATE INDEX IF NOT EXISTS idx_authors_core_updated_at ON authors_core(updated_at DESC);

-- 复合索引（常见查询组合）
CREATE INDEX IF NOT EXISTS idx_authors_core_city_follower ON authors_core(city, follower DESC) 
    WHERE city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_authors_core_province_type ON authors_core(province, author_type) 
    WHERE province IS NOT NULL;

-- 全文搜索索引
CREATE INDEX IF NOT EXISTS idx_authors_core_nick_name_gin ON authors_core 
    USING gin(nick_name gin_trgm_ops);

-- 认证标签索引
CREATE INDEX IF NOT EXISTS idx_authors_core_excellent ON authors_core(star_excellent_author) 
    WHERE star_excellent_author = TRUE;
CREATE INDEX IF NOT EXISTS idx_authors_core_black_horse ON authors_core(is_black_horse_author) 
    WHERE is_black_horse_author = TRUE;

-- 表注释
COMMENT ON TABLE authors_core IS '作者核心信息表-高频访问字段';
COMMENT ON COLUMN authors_core.author_id IS '作者唯一标识';
COMMENT ON COLUMN authors_core.star_id IS '星图ID';
COMMENT ON COLUMN authors_core.follower IS '粉丝总数';
COMMENT ON COLUMN authors_core.star_index IS '星图指数(0-1)';
COMMENT ON COLUMN authors_core.last_crawled_at IS '最后爬取时间';

-- ============================================
-- 2. authors_fans_metrics - 粉丝增长指标表
-- ============================================
CREATE TABLE IF NOT EXISTS authors_fans_metrics (
    author_id TEXT PRIMARY KEY REFERENCES authors_core(author_id) ON DELETE CASCADE,
    
    -- 粉丝基础数据
    follower BIGINT NOT NULL DEFAULT 0,
    
    -- 短期增长（15天）
    fans_increment_15d BIGINT,
    fans_increment_rate_15d DOUBLE PRECISION,
    
    -- 中期增长（30天）
    fans_increment_30d BIGINT,
    fans_increment_rate_30d DOUBLE PRECISION,
    
    -- 计算字段（用于快速筛选）
    is_rising_star BOOLEAN GENERATED ALWAYS AS (
        fans_increment_rate_30d > 0.1 AND follower BETWEEN 10000 AND 1000000
    ) STORED,
    
    growth_level TEXT GENERATED ALWAYS AS (
        CASE 
            WHEN fans_increment_rate_30d > 0.5 THEN 'explosive'
            WHEN fans_increment_rate_30d > 0.2 THEN 'high'
            WHEN fans_increment_rate_30d > 0.05 THEN 'medium'
            WHEN fans_increment_rate_30d > 0 THEN 'low'
            ELSE 'stagnant'
        END
    ) STORED,
    
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_fans_metrics_follower ON authors_fans_metrics(follower DESC);
CREATE INDEX IF NOT EXISTS idx_fans_metrics_increment_30d ON authors_fans_metrics(fans_increment_30d DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_fans_metrics_rate_30d ON authors_fans_metrics(fans_increment_rate_30d DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_fans_metrics_rising_star ON authors_fans_metrics(is_rising_star) WHERE is_rising_star = TRUE;
CREATE INDEX IF NOT EXISTS idx_fans_metrics_growth_level ON authors_fans_metrics(growth_level);

-- 表注释
COMMENT ON TABLE authors_fans_metrics IS '粉丝增长指标表';
COMMENT ON COLUMN authors_fans_metrics.is_rising_star IS '新星达人标识（增长率>10%且粉丝1万-100万）';
COMMENT ON COLUMN authors_fans_metrics.growth_level IS '增长等级：explosive/high/medium/low/stagnant';

-- ============================================
-- 3. authors_engagement_metrics - 互动与播放指标表
-- ============================================
CREATE TABLE IF NOT EXISTS authors_engagement_metrics (
    author_id TEXT PRIMARY KEY REFERENCES authors_core(author_id) ON DELETE CASCADE,
    
    -- 30天互动数据
    interact_rate_30d DOUBLE PRECISION,
    play_over_rate_30d DOUBLE PRECISION,
    vv_median_30d DOUBLE PRECISION,
    interaction_median_30d BIGINT,
    
    -- 短视频专项指标
    sn_interact_rate_30d DOUBLE PRECISION,
    sn_play_over_rate_30d DOUBLE PRECISION,
    
    -- 搜索相关
    avg_search_after_view_rate_30d DOUBLE PRECISION,
    
    -- 内容质量指标
    burst_text_rate DOUBLE PRECISION,
    
    -- 综合评分（计算字段）
    engagement_score DOUBLE PRECISION GENERATED ALWAYS AS (
        COALESCE(interact_rate_30d, 0) * 0.4 +
        COALESCE(play_over_rate_30d, 0) * 0.3 +
        COALESCE(burst_text_rate, 0) * 0.3
    ) STORED,
    
    quality_tier TEXT GENERATED ALWAYS AS (
        CASE 
            WHEN (COALESCE(interact_rate_30d, 0) * 0.4 + COALESCE(play_over_rate_30d, 0) * 0.3 + COALESCE(burst_text_rate, 0) * 0.3) > 0.15 THEN 'premium'
            WHEN (COALESCE(interact_rate_30d, 0) * 0.4 + COALESCE(play_over_rate_30d, 0) * 0.3 + COALESCE(burst_text_rate, 0) * 0.3) > 0.10 THEN 'high'
            WHEN (COALESCE(interact_rate_30d, 0) * 0.4 + COALESCE(play_over_rate_30d, 0) * 0.3 + COALESCE(burst_text_rate, 0) * 0.3) > 0.05 THEN 'medium'
            ELSE 'low'
        END
    ) STORED,
    
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_engagement_interact_rate ON authors_engagement_metrics(interact_rate_30d DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_engagement_play_over_rate ON authors_engagement_metrics(play_over_rate_30d DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_engagement_vv_median ON authors_engagement_metrics(vv_median_30d DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_engagement_score ON authors_engagement_metrics(engagement_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_engagement_quality_tier ON authors_engagement_metrics(quality_tier);

-- 表注释
COMMENT ON TABLE authors_engagement_metrics IS '互动与播放指标表';
COMMENT ON COLUMN authors_engagement_metrics.engagement_score IS '综合互动评分(0-1)';
COMMENT ON COLUMN authors_engagement_metrics.quality_tier IS '内容质量等级：premium/high/medium/low';

-- ============================================
-- 4. authors_pricing - 价格与报价表
-- ============================================
CREATE TABLE IF NOT EXISTS authors_pricing (
    author_id TEXT PRIMARY KEY REFERENCES authors_core(author_id) ON DELETE CASCADE,
    
    -- 基础报价（视频时长）
    price_1_20 BIGINT,
    price_20_60 BIGINT,
    price_60 BIGINT,
    
    -- CPM建议价格
    assign_cpm_suggest_price DOUBLE PRECISION,
    
    -- 预期播放数据
    expected_play_num BIGINT,
    expected_natural_play_num BIGINT,
    
    -- 推广预期数据
    promotion_prospective_vv BIGINT,
    promotion_prospective_1_20_cpm DOUBLE PRECISION,
    promotion_prospective_20_60_cpm DOUBLE PRECISION,
    promotion_prospective_60_cpm DOUBLE PRECISION,
    
    -- 短视频预期CPM/CPE
    sn_prospective_1_20_cpe DOUBLE PRECISION,
    sn_prospective_1_20_cpm DOUBLE PRECISION,
    sn_prospective_20_60_cpe DOUBLE PRECISION,
    sn_prospective_20_60_cpm DOUBLE PRECISION,
    sn_prospective_60_cpe DOUBLE PRECISION,
    sn_prospective_60_cpm DOUBLE PRECISION,
    
    -- 图片预期数据
    pic_expected_play_num BIGINT,
    pic_expected_cpm DOUBLE PRECISION,
    
    -- CPA预期
    expected_cpa3_level INTEGER,
    
    -- 任务价格列表（JSONB）
    assign_task_price_list JSONB,
    enroll_task_price_list JSONB,
    
    -- 性价比计算（计算字段）
    cpm_efficiency DOUBLE PRECISION GENERATED ALWAYS AS (
        CASE 
            WHEN assign_cpm_suggest_price > 0 AND expected_play_num > 0 
            THEN expected_play_num::DOUBLE PRECISION / assign_cpm_suggest_price
            ELSE NULL
        END
    ) STORED,
    
    price_tier TEXT GENERATED ALWAYS AS (
        CASE 
            WHEN price_20_60 >= 50000 THEN 'premium'
            WHEN price_20_60 >= 20000 THEN 'high'
            WHEN price_20_60 >= 5000 THEN 'medium'
            WHEN price_20_60 > 0 THEN 'low'
            ELSE 'unknown'
        END
    ) STORED,
    
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_pricing_price_1_20 ON authors_pricing(price_1_20) WHERE price_1_20 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pricing_price_20_60 ON authors_pricing(price_20_60) WHERE price_20_60 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pricing_price_60 ON authors_pricing(price_60) WHERE price_60 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pricing_cpm_suggest ON authors_pricing(assign_cpm_suggest_price) WHERE assign_cpm_suggest_price IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pricing_expected_play ON authors_pricing(expected_play_num DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_pricing_cpm_efficiency ON authors_pricing(cpm_efficiency DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_pricing_price_tier ON authors_pricing(price_tier);

-- JSONB索引
CREATE INDEX IF NOT EXISTS idx_pricing_assign_task_price ON authors_pricing USING gin(assign_task_price_list);
CREATE INDEX IF NOT EXISTS idx_pricing_enroll_task_price ON authors_pricing USING gin(enroll_task_price_list);

-- 表注释
COMMENT ON TABLE authors_pricing IS '价格与报价表';
COMMENT ON COLUMN authors_pricing.cpm_efficiency IS 'CPM性价比=预期播放量/CPM价格';
COMMENT ON COLUMN authors_pricing.price_tier IS '价格等级：premium/high/medium/low/unknown';

-- ============================================
-- 创建视图：轻量级核心视图（用于列表查询）
-- ============================================
CREATE OR REPLACE VIEW v_authors_core_lite AS
SELECT 
    c.author_id,
    c.star_id,
    c.nick_name,
    c.avatar_uri,
    c.city,
    c.province,
    c.author_type,
    c.follower,
    c.star_index,
    c.star_excellent_author,
    c.is_black_horse_author,
    f.fans_increment_30d,
    f.growth_level,
    e.interact_rate_30d,
    e.engagement_score,
    e.quality_tier,
    p.price_20_60,
    p.price_tier,
    c.updated_at
FROM authors_core c
LEFT JOIN authors_fans_metrics f ON c.author_id = f.author_id
LEFT JOIN authors_engagement_metrics e ON c.author_id = e.author_id
LEFT JOIN authors_pricing p ON c.author_id = p.author_id;

COMMENT ON VIEW v_authors_core_lite IS '轻量级核心视图-用于列表查询';

-- ============================================
-- 完成提示
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ 核心层表结构创建完成！';
    RAISE NOTICE '已创建4个表：';
    RAISE NOTICE '  1. authors_core - 作者核心信息';
    RAISE NOTICE '  2. authors_fans_metrics - 粉丝增长指标';
    RAISE NOTICE '  3. authors_engagement_metrics - 互动播放指标';
    RAISE NOTICE '  4. authors_pricing - 价格报价';
    RAISE NOTICE '已创建1个视图：v_authors_core_lite';
    RAISE NOTICE '已创建30+个索引用于性能优化';
END $$;
