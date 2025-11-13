-- =============================================
-- 阶段2: 营销层+电商层表结构创建脚本
-- 包含3个表：authors_marketing_indices, authors_content_tags, authors_ecommerce
-- 创建时间: 2025-01-04
-- =============================================

-- ============================================
-- 5. authors_marketing_indices - 营销指数表
-- ============================================
CREATE TABLE IF NOT EXISTS authors_marketing_indices (
    author_id TEXT PRIMARY KEY REFERENCES authors_core(author_id) ON DELETE CASCADE,
    
    -- 核心链接指数
    link_convert_index DOUBLE PRECISION,
    link_shopping_index DOUBLE PRECISION,
    link_spread_index DOUBLE PRECISION,
    link_star_index DOUBLE PRECISION,
    star_index DOUBLE PRECISION,
    
    -- 行业细分指数（JSONB存储）
    link_convert_index_by_industry JSONB,
    link_spread_index_by_industry JSONB,
    link_star_index_by_industry JSONB,
    link_recommend_index_by_industry JSONB,
    search_after_view_index_by_industry JSONB,
    link_user_type_by_industry JSONB,
    
    -- 行业计数指标（JSONB）
    link_i_cnt_by_industry JSONB,
    link_k_cnt_by_industry JSONB,
    link_l_cnt_by_industry JSONB,
    link_link_cnt_by_industry JSONB,
    link_n_cnt_by_industry JSONB,
    
    -- 综合营销能力评分（计算字段）
    marketing_power_score DOUBLE PRECISION GENERATED ALWAYS AS (
        COALESCE(link_convert_index, 0) * 0.3 +
        COALESCE(link_shopping_index, 0) * 0.25 +
        COALESCE(link_spread_index, 0) * 0.25 +
        COALESCE(star_index, 0) * 0.2
    ) STORED,
    
    marketing_tier TEXT GENERATED ALWAYS AS (
        CASE 
            WHEN (COALESCE(link_convert_index, 0) * 0.3 + COALESCE(link_shopping_index, 0) * 0.25 + 
                  COALESCE(link_spread_index, 0) * 0.25 + COALESCE(star_index, 0) * 0.2) > 0.8 THEN 'top'
            WHEN (COALESCE(link_convert_index, 0) * 0.3 + COALESCE(link_shopping_index, 0) * 0.25 + 
                  COALESCE(link_spread_index, 0) * 0.25 + COALESCE(star_index, 0) * 0.2) > 0.6 THEN 'high'
            WHEN (COALESCE(link_convert_index, 0) * 0.3 + COALESCE(link_shopping_index, 0) * 0.25 + 
                  COALESCE(link_spread_index, 0) * 0.25 + COALESCE(star_index, 0) * 0.2) > 0.4 THEN 'medium'
            ELSE 'low'
        END
    ) STORED,
    
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_marketing_convert_index ON authors_marketing_indices(link_convert_index DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_marketing_shopping_index ON authors_marketing_indices(link_shopping_index DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_marketing_spread_index ON authors_marketing_indices(link_spread_index DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_marketing_star_index ON authors_marketing_indices(star_index DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_marketing_power_score ON authors_marketing_indices(marketing_power_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_marketing_tier ON authors_marketing_indices(marketing_tier);

-- 行业指数JSONB索引
CREATE INDEX IF NOT EXISTS idx_marketing_convert_by_industry ON authors_marketing_indices USING gin(link_convert_index_by_industry);
CREATE INDEX IF NOT EXISTS idx_marketing_spread_by_industry ON authors_marketing_indices USING gin(link_spread_index_by_industry);
CREATE INDEX IF NOT EXISTS idx_marketing_recommend_by_industry ON authors_marketing_indices USING gin(link_recommend_index_by_industry);

-- 表注释
COMMENT ON TABLE authors_marketing_indices IS '营销指数表-转化/购物/传播能力';
COMMENT ON COLUMN authors_marketing_indices.marketing_power_score IS '综合营销能力评分(0-1)';
COMMENT ON COLUMN authors_marketing_indices.marketing_tier IS '营销等级：top/high/medium/low';
COMMENT ON COLUMN authors_marketing_indices.link_convert_index_by_industry IS '各行业转化指数JSONB';

-- ============================================
-- 6. authors_content_tags - 内容标签与主题表
-- ============================================
CREATE TABLE IF NOT EXISTS authors_content_tags (
    author_id TEXT PRIMARY KEY REFERENCES authors_core(author_id) ON DELETE CASCADE,
    
    -- 标签关系（JSONB）
    tags_relation JSONB,
    
    -- 180天内容主题标签（JSONB数组）
    content_theme_labels_180d JSONB,
    
    -- 词关联指数（JSONB）
    author_thin_mid_word_association_index JSONB,
    
    -- 提取的主要标签（用于快速查询）
    primary_tags TEXT[] GENERATED ALWAYS AS (
        CASE 
            WHEN jsonb_typeof(tags_relation) = 'object' 
            THEN ARRAY(SELECT jsonb_object_keys(tags_relation))
            ELSE ARRAY[]::TEXT[]
        END
    ) STORED,
    
    primary_themes TEXT[] GENERATED ALWAYS AS (
        CASE 
            WHEN jsonb_typeof(content_theme_labels_180d) = 'array'
            THEN ARRAY(SELECT jsonb_array_elements_text(content_theme_labels_180d) LIMIT 5)
            ELSE ARRAY[]::TEXT[]
        END
    ) STORED,
    
    tag_count INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN jsonb_typeof(tags_relation) = 'object' 
            THEN (SELECT COUNT(*) FROM jsonb_object_keys(tags_relation))
            ELSE 0
        END
    ) STORED,
    
    updated_at TIMESTAMP DEFAULT NOW()
);

-- JSONB GIN索引（支持标签查询）
CREATE INDEX IF NOT EXISTS idx_content_tags_relation ON authors_content_tags USING gin(tags_relation);
CREATE INDEX IF NOT EXISTS idx_content_theme_labels ON authors_content_tags USING gin(content_theme_labels_180d);
CREATE INDEX IF NOT EXISTS idx_content_word_association ON authors_content_tags USING gin(author_thin_mid_word_association_index);

-- 数组索引（支持标签数组查询）
CREATE INDEX IF NOT EXISTS idx_content_primary_tags ON authors_content_tags USING gin(primary_tags);
CREATE INDEX IF NOT EXISTS idx_content_primary_themes ON authors_content_tags USING gin(primary_themes);
CREATE INDEX IF NOT EXISTS idx_content_tag_count ON authors_content_tags(tag_count);

-- 表注释
COMMENT ON TABLE authors_content_tags IS '内容标签与主题表-支持30个一级标签100+二级标签';
COMMENT ON COLUMN authors_content_tags.primary_tags IS '主要标签数组（从tags_relation提取）';
COMMENT ON COLUMN authors_content_tags.primary_themes IS '主要主题数组（从content_theme_labels_180d提取前5个）';
COMMENT ON COLUMN authors_content_tags.tag_count IS '标签总数';

-- ============================================
-- 7. authors_ecommerce - 电商数据表
-- ============================================
CREATE TABLE IF NOT EXISTS authors_ecommerce (
    author_id TEXT PRIMARY KEY REFERENCES authors_core(author_id) ON DELETE CASCADE,
    
    -- 电商基础
    e_commerce_enable BOOLEAN DEFAULT FALSE,
    author_ecom_level TEXT,
    
    -- 30天电商数据
    star_ecom_video_num_30d BIGINT,
    ecom_video_product_num_30d BIGINT,
    star_ecom_video_product_num_30d BIGINT,
    
    -- GMV与客单价（JSONB区间）
    ecom_gmv_30d_range JSONB,
    ecom_avg_order_value_30d_range JSONB,
    ecom_gpm_30d_range JSONB,
    ecom_gpm_30days_range JSONB,
    
    -- 电商评分与观看
    ecom_score DOUBLE PRECISION,
    ecom_watch_pv_30d BIGINT,
    
    -- CTR与点击数据（JSONB区间）
    ecom_video_ctr_30d_range JSONB,
    ecom_video_mid_click_pv_30d_range JSONB,
    
    -- 销售额区间
    avg_sale_amount_range JSONB,
    star_ecom_main_price_30days JSONB,
    
    -- 电商能力评级（计算字段）
    ecom_capability_tier TEXT GENERATED ALWAYS AS (
        CASE 
            WHEN NOT COALESCE(e_commerce_enable, FALSE) THEN 'disabled'
            WHEN author_ecom_level = 'L5' OR author_ecom_level = 'L4' THEN 'top'
            WHEN author_ecom_level = 'L3' THEN 'high'
            WHEN author_ecom_level = 'L2' THEN 'medium'
            WHEN author_ecom_level = 'L1' THEN 'low'
            ELSE 'unknown'
        END
    ) STORED,
    
    is_ecom_active BOOLEAN GENERATED ALWAYS AS (
        e_commerce_enable = TRUE AND star_ecom_video_num_30d > 0
    ) STORED,
    
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_ecom_enable ON authors_ecommerce(e_commerce_enable) WHERE e_commerce_enable = TRUE;
CREATE INDEX IF NOT EXISTS idx_ecom_level ON authors_ecommerce(author_ecom_level) WHERE author_ecom_level IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ecom_video_num ON authors_ecommerce(star_ecom_video_num_30d DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_ecom_score ON authors_ecommerce(ecom_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_ecom_capability_tier ON authors_ecommerce(ecom_capability_tier);
CREATE INDEX IF NOT EXISTS idx_ecom_is_active ON authors_ecommerce(is_ecom_active) WHERE is_ecom_active = TRUE;

-- JSONB索引
CREATE INDEX IF NOT EXISTS idx_ecom_gmv_range ON authors_ecommerce USING gin(ecom_gmv_30d_range);
CREATE INDEX IF NOT EXISTS idx_ecom_gpm_range ON authors_ecommerce USING gin(ecom_gpm_30d_range);
CREATE INDEX IF NOT EXISTS idx_ecom_ctr_range ON authors_ecommerce USING gin(ecom_video_ctr_30d_range);

-- 表注释
COMMENT ON TABLE authors_ecommerce IS '电商数据表-GMV/带货能力/电商等级';
COMMENT ON COLUMN authors_ecommerce.ecom_capability_tier IS '电商能力等级：top/high/medium/low/disabled/unknown';
COMMENT ON COLUMN authors_ecommerce.is_ecom_active IS '是否活跃电商达人（开通且有视频）';

-- ============================================
-- 完成提示
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ 营销层+电商层表结构创建完成！';
    RAISE NOTICE '已创建3个表：';
    RAISE NOTICE '  5. authors_marketing_indices - 营销指数（含行业细分）';
    RAISE NOTICE '  6. authors_content_tags - 内容标签与主题';
    RAISE NOTICE '  7. authors_ecommerce - 电商数据';
    RAISE NOTICE '已创建20+个索引（含GIN索引）';
    RAISE NOTICE '新功能：行业指数查询、标签匹配、电商能力评级';
END $$;
