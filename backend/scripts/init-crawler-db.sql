-- =============================================
-- PostgreSQL 数据库初始化脚本
-- 数据库: crawler_db
-- 用途: 支持backend和task_control两个系统
-- =============================================

-- ============================================
-- 1. 创建 task_control 相关表
-- ============================================

-- 1.1 作者广场运行记录表
CREATE TABLE IF NOT EXISTS author_square_runs (
    id BIGSERIAL PRIMARY KEY,
    first_label TEXT,
    second_label TEXT,
    second_ids JSONB,
    video_type TEXT,
    page INTEGER,
    "limit" INTEGER,
    min_price BIGINT,
    x_tt_agw_login TEXT,
    request_payload JSONB,
    request_payload_hash TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE author_square_runs IS '作者广场爬取运行记录';
COMMENT ON COLUMN author_square_runs.first_label IS '一级标签';
COMMENT ON COLUMN author_square_runs.second_label IS '二级标签';
COMMENT ON COLUMN author_square_runs.request_payload_hash IS '请求payload的SHA256哈希值';

-- 1.2 作者广场作者记录表
CREATE TABLE IF NOT EXISTS author_square_authors (
    id BIGSERIAL PRIMARY KEY,
    run_id BIGINT REFERENCES author_square_runs(id) ON DELETE CASCADE,
    author_id TEXT,
    star_id TEXT,
    core_user_id BIGINT,
    raw_attribute_datas JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(run_id, author_id)
);

COMMENT ON TABLE author_square_authors IS '作者广场爬取的作者数据';
COMMENT ON COLUMN author_square_authors.run_id IS '关联的运行ID';
COMMENT ON COLUMN author_square_authors.raw_attribute_datas IS '原始属性数据';

-- 1.3 作者维度表
CREATE TABLE IF NOT EXISTS author_dimension (
    author_id TEXT PRIMARY KEY,
    star_id TEXT,
    core_user_id BIGINT,
    last_seen_run_id BIGINT,
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE author_dimension IS '作者维度数据';
COMMENT ON COLUMN author_dimension.last_seen_run_id IS '最后一次见到的运行ID';

-- 1.4 作者广场汇总表
CREATE TABLE IF NOT EXISTS author_square_summaries (
    id BIGSERIAL PRIMARY KEY,
    first_label TEXT,
    second_label TEXT,
    second_ids JSONB,
    video_type TEXT,
    start_page INTEGER,
    pages_done INTEGER,
    authors_total INTEGER,
    failed_pages INTEGER,
    report_path TEXT,
    started_at TIMESTAMP,
    finished_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE author_square_summaries IS '作者广场爬取汇总';

-- ============================================
-- 2. 创建 backend KOL 相关表
-- ============================================

-- KOL列表表
CREATE TABLE IF NOT EXISTS kol_list (
    id BIGSERIAL PRIMARY KEY,
    platform VARCHAR(30) NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    account_id VARCHAR(80) NOT NULL,
    home_link VARCHAR(500) NOT NULL,
    followers_w DECIMAL(8,2) NOT NULL,
    org_name VARCHAR(100),
    category VARCHAR(30),
    star_quote_21_60s INTEGER,
    star_quote_60s_plus INTEGER,
    is_exclusive SMALLINT DEFAULT 0,
    rebate_policy SMALLINT DEFAULT 0,
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_kol_platform_account ON kol_list(platform, account_id);
CREATE INDEX IF NOT EXISTS idx_kol_followers ON kol_list(followers_w);
CREATE INDEX IF NOT EXISTS idx_kol_category ON kol_list(category);
CREATE INDEX IF NOT EXISTS idx_kol_org_name ON kol_list(org_name);
CREATE INDEX IF NOT EXISTS idx_kol_exclusive ON kol_list(is_exclusive);
CREATE INDEX IF NOT EXISTS idx_kol_resource_attr ON kol_list(resource_attribute);
CREATE INDEX IF NOT EXISTS idx_kol_cooperation ON kol_list(cooperation_degree);
CREATE INDEX IF NOT EXISTS idx_kol_matched_author ON kol_list(matched_author_id);
CREATE INDEX IF NOT EXISTS idx_kol_match_status ON kol_list(match_status);
CREATE INDEX IF NOT EXISTS idx_kol_platform_name ON kol_list(platform, account_name);
CREATE INDEX IF NOT EXISTS idx_kol_deleted_at ON kol_list(deleted_at);
CREATE INDEX IF NOT EXISTS idx_kol_platform_match_deleted ON kol_list(platform, match_status, deleted_at);

-- KOL私有匹配表
CREATE TABLE IF NOT EXISTS kol_private_matches (
    id BIGSERIAL PRIMARY KEY,
    kol_id BIGINT NOT NULL,
    author_id VARCHAR(64) NOT NULL,
    match_type VARCHAR(20) NOT NULL,
    confidence_score DECIMAL(4,3),
    match_fields JSON,
    status VARCHAR(20) DEFAULT 'pending',
    verified_by BIGINT,
    verified_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_private_match_kol ON kol_private_matches(kol_id);
CREATE INDEX IF NOT EXISTS idx_private_match_author ON kol_private_matches(author_id);
CREATE INDEX IF NOT EXISTS idx_private_match_status ON kol_private_matches(status);

-- KOL匹配日志表
CREATE TABLE IF NOT EXISTS kol_match_logs (
    id BIGSERIAL PRIMARY KEY,
    kol_id BIGINT NOT NULL,
    action VARCHAR(50) NOT NULL,
    details JSON,
    operator_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_match_log_kol ON kol_match_logs(kol_id);
CREATE INDEX IF NOT EXISTS idx_match_log_created ON kol_match_logs(created_at);

-- KOL评价表
CREATE TABLE IF NOT EXISTS kol_reviews (
    id BIGSERIAL PRIMARY KEY,
    kol_id BIGINT NOT NULL,
    rating INTEGER,
    comment TEXT,
    reviewer_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_review_kol ON kol_reviews(kol_id);

-- 来源账号表
CREATE TABLE IF NOT EXISTS source_account (
    id BIGSERIAL PRIMARY KEY,
    platform VARCHAR(50) NOT NULL,
    account_name VARCHAR(100),
    account_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 供应商数据库表
CREATE TABLE IF NOT EXISTS supplier_database (
    id BIGSERIAL PRIMARY KEY,
    supplier_name VARCHAR(200) NOT NULL,
    contact_info JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SQLBot配置表
CREATE TABLE IF NOT EXISTS sqlbot_config (
    id BIGSERIAL PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. 创建视图 v_authors_core
-- ============================================

CREATE OR REPLACE VIEW v_authors_core AS
SELECT 
    author_id,
    CAST(star_id AS VARCHAR) as star_id,
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
    follower,
    updated_at,
    COALESCE(fans_increment_within_15d, 0) as fans_increment_within_15d,
    COALESCE(fans_increment_within_30d, 0) as fans_increment_within_30d,
    COALESCE(fans_increment_rate_within_15d, 0) as fans_increment_rate_within_15d,
    COALESCE(interact_rate_within_30d, 0) as interact_rate_within_30d,
    COALESCE(play_over_rate_within_30d, 0) as play_over_rate_within_30d,
    COALESCE(vv_median_30d, 0) as vv_median_30d,
    COALESCE(sn_interact_rate_within_30d, 0) as sn_interact_rate_within_30d,
    COALESCE(sn_play_over_rate_within_30d, 0) as sn_play_over_rate_within_30d,
    COALESCE(price_1_20, 0) as price_1_20,
    COALESCE(price_20_60, 0) as price_20_60,
    COALESCE(price_60, 0) as price_60,
    COALESCE(assign_cpm_suggest_price, 0) as assign_cpm_suggest_price,
    COALESCE(promotion_prospective_vv, 0) as promotion_prospective_vv,
    COALESCE(promotion_prospective_20_60_cpm, 0) as promotion_prospective_20_60_cpm,
    COALESCE(promotion_prospective_60_cpm, 0) as promotion_prospective_60_cpm,
    COALESCE(link_convert_index, 0) as link_convert_index,
    COALESCE(link_shopping_index, 0) as link_shopping_index,
    COALESCE(link_spread_index, 0) as link_spread_index,
    COALESCE(link_star_index, 0) as link_star_index,
    COALESCE(CASE WHEN e_commerce_enable::boolean THEN true ELSE false END, false) as e_commerce_enable,
    COALESCE(author_ecom_level, '') as author_ecom_level,
    ecom_gmv_30d_range,
    ecom_avg_order_value_30d_range,
    ecom_gpm_30d_range,
    COALESCE(star_ecom_video_num_30d, 0) as star_ecom_video_num_30d,
    COALESCE(CASE WHEN star_excellent_author::boolean THEN true ELSE false END, false) as star_excellent_author,
    COALESCE(CASE WHEN is_black_horse_author::boolean THEN true ELSE false END, false) as is_black_horse_author,
    COALESCE(CASE WHEN is_cocreate_author::boolean THEN true ELSE false END, false) as is_cocreate_author,
    COALESCE(CASE WHEN is_cpm_project_author::boolean THEN true ELSE false END, false) as is_cpm_project_author,
    COALESCE(CASE WHEN is_short_drama::boolean THEN true ELSE false END, false) as is_short_drama,
    false as is_ad_star_cur_high_quality_author,
    false as star_qianchuan_high_potential,
    COALESCE(avg_search_after_view_rate_30d, 0) as avg_search_after_view_rate_30d,
    COALESCE(burst_text_rate, 0) as burst_text_rate,
    '' as primary_industry,
    CAST('[]' AS JSON) as content_tags_top3,
    CAST('{}' AS JSON) as unified_task_price_list,
    CAST('{}' AS JSON) as extra
FROM author_dimension;

-- ============================================
-- 3. 创建物化视图（用于性能优化）
-- ============================================

-- 创建高性能物化视图
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_authors_core_materialized AS
SELECT * FROM v_authors_core;

-- 创建物化视图索引
CREATE INDEX IF NOT EXISTS idx_mv_authors_author_id ON mv_authors_core_materialized(author_id);
CREATE INDEX IF NOT EXISTS idx_mv_authors_follower ON mv_authors_core_materialized(follower);
CREATE INDEX IF NOT EXISTS idx_mv_authors_type ON mv_authors_core_materialized(author_type);
CREATE INDEX IF NOT EXISTS idx_mv_authors_city ON mv_authors_core_materialized(city);
CREATE INDEX IF NOT EXISTS idx_mv_authors_province ON mv_authors_core_materialized(province);

-- ============================================
-- 4. 创建刷新物化视图的函数
-- ============================================

CREATE OR REPLACE FUNCTION refresh_authors_core_mv()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_authors_core_materialized;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. 添加注释
-- ============================================

COMMENT ON VIEW v_authors_core IS '作者核心视图 - 从 author_dimension 表实时查询';
COMMENT ON MATERIALIZED VIEW mv_authors_core_materialized IS '作者核心物化视图 - 缓存数据，需定期刷新';
COMMENT ON FUNCTION refresh_authors_core_mv() IS '刷新作者核心物化视图的函数';

-- ============================================
-- 完成初始化
-- ============================================

SELECT 'PostgreSQL数据库初始化完成！' as message;
