-- =============================================
-- PostgreSQL 数据库完整初始化脚本
-- 数据库: crawler_db
-- 用途: 支持backend和task_control两个系统
-- 创建时间: 2025-11-03
-- =============================================

-- ============================================
-- 第一部分: task_control 爬虫系统表
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

-- 1.2 作者广场作者记录表（主表，包含动态字段）
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
COMMENT ON COLUMN author_square_authors.raw_attribute_datas IS '原始属性数据JSON';

-- 1.3 作者维度表（主表，包含动态字段）
CREATE TABLE IF NOT EXISTS author_dimension (
    author_id TEXT PRIMARY KEY,
    star_id TEXT,
    core_user_id BIGINT,
    last_seen_run_id BIGINT,
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE author_dimension IS '作者维度数据汇总表';
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

COMMENT ON TABLE author_square_summaries IS '作者广场爬取汇总统计';

-- 为author_square_authors和author_dimension表添加动态字段
-- 基础字段
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS nick_name TEXT;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS avatar_uri TEXT;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS gender INTEGER;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS province TEXT;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS author_type INTEGER;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS author_status INTEGER;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS grade INTEGER;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS follower BIGINT;

-- 粉丝增长相关
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS fans_increment_within_15d BIGINT;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS fans_increment_within_30d BIGINT;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS fans_increment_rate_within_15d DOUBLE PRECISION;

-- 互动率相关
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS interact_rate_within_30d DOUBLE PRECISION;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS play_over_rate_within_30d DOUBLE PRECISION;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS vv_median_30d DOUBLE PRECISION;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS sn_interact_rate_within_30d DOUBLE PRECISION;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS sn_play_over_rate_within_30d DOUBLE PRECISION;

-- 价格相关
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS price_1_20 BIGINT;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS price_20_60 BIGINT;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS price_60 BIGINT;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS assign_cpm_suggest_price DOUBLE PRECISION;

-- 预期数据
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS expected_play_num BIGINT;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS expected_natural_play_num BIGINT;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS promotion_prospective_vv BIGINT;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS promotion_prospective_1_20_cpm DOUBLE PRECISION;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS promotion_prospective_20_60_cpm DOUBLE PRECISION;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS promotion_prospective_60_cpm DOUBLE PRECISION;

-- 链接指数
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS link_convert_index DOUBLE PRECISION;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS link_shopping_index DOUBLE PRECISION;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS link_spread_index DOUBLE PRECISION;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS link_star_index DOUBLE PRECISION;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS star_index DOUBLE PRECISION;

-- 电商相关
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS e_commerce_enable BOOLEAN;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS author_ecom_level TEXT;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS star_ecom_video_num_30d BIGINT;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS ecom_gmv_30d_range JSONB;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS ecom_avg_order_value_30d_range JSONB;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS ecom_gpm_30d_range JSONB;

-- 标签
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS star_excellent_author BOOLEAN;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS is_black_horse_author BOOLEAN;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS is_cocreate_author BOOLEAN;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS is_cpm_project_author BOOLEAN;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS is_short_drama BOOLEAN;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS is_ad_star_cur_high_quality_author BOOLEAN;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS star_qianchuan_high_potential BOOLEAN;

-- 其他指标
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS avg_search_after_view_rate_30d DOUBLE PRECISION;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS burst_text_rate DOUBLE PRECISION;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS star_video_cnt_90d BIGINT;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS star_video_interact_rate_90d DOUBLE PRECISION;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS star_video_finish_vv_rate_90d DOUBLE PRECISION;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS star_video_median_vv_90d BIGINT;

-- JSON字段
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS tags_relation JSONB;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS content_theme_labels_180d JSONB;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS last_10_items JSONB;
ALTER TABLE author_square_authors ADD COLUMN IF NOT EXISTS assign_task_price_list JSONB;

-- 为author_dimension表添加相同的动态字段
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS nick_name TEXT;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS avatar_uri TEXT;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS gender INTEGER;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS province TEXT;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS author_type INTEGER;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS author_status INTEGER;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS grade INTEGER;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS follower BIGINT;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS fans_increment_within_15d BIGINT;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS fans_increment_within_30d BIGINT;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS fans_increment_rate_within_15d DOUBLE PRECISION;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS interact_rate_within_30d DOUBLE PRECISION;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS play_over_rate_within_30d DOUBLE PRECISION;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS vv_median_30d DOUBLE PRECISION;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS sn_interact_rate_within_30d DOUBLE PRECISION;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS sn_play_over_rate_within_30d DOUBLE PRECISION;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS price_1_20 BIGINT;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS price_20_60 BIGINT;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS price_60 BIGINT;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS assign_cpm_suggest_price DOUBLE PRECISION;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS expected_play_num BIGINT;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS expected_natural_play_num BIGINT;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS promotion_prospective_vv BIGINT;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS promotion_prospective_1_20_cpm DOUBLE PRECISION;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS promotion_prospective_20_60_cpm DOUBLE PRECISION;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS promotion_prospective_60_cpm DOUBLE PRECISION;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS link_convert_index DOUBLE PRECISION;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS link_shopping_index DOUBLE PRECISION;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS link_spread_index DOUBLE PRECISION;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS link_star_index DOUBLE PRECISION;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS star_index DOUBLE PRECISION;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS e_commerce_enable BOOLEAN;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS author_ecom_level TEXT;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS star_ecom_video_num_30d BIGINT;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS ecom_gmv_30d_range JSONB;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS ecom_avg_order_value_30d_range JSONB;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS ecom_gpm_30d_range JSONB;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS star_excellent_author BOOLEAN;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS is_black_horse_author BOOLEAN;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS is_cocreate_author BOOLEAN;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS is_cpm_project_author BOOLEAN;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS is_short_drama BOOLEAN;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS is_ad_star_cur_high_quality_author BOOLEAN;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS star_qianchuan_high_potential BOOLEAN;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS avg_search_after_view_rate_30d DOUBLE PRECISION;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS burst_text_rate DOUBLE PRECISION;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS star_video_cnt_90d BIGINT;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS star_video_interact_rate_90d DOUBLE PRECISION;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS star_video_finish_vv_rate_90d DOUBLE PRECISION;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS star_video_median_vv_90d BIGINT;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS tags_relation JSONB;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS content_theme_labels_180d JSONB;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS last_10_items JSONB;
ALTER TABLE author_dimension ADD COLUMN IF NOT EXISTS assign_task_price_list JSONB;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_author_square_authors_run_id ON author_square_authors(run_id);
CREATE INDEX IF NOT EXISTS idx_author_square_authors_author_id ON author_square_authors(author_id);
CREATE INDEX IF NOT EXISTS idx_author_square_authors_star_id ON author_square_authors(star_id);
CREATE INDEX IF NOT EXISTS idx_author_dimension_star_id ON author_dimension(star_id);
CREATE INDEX IF NOT EXISTS idx_author_dimension_author_type ON author_dimension(author_type);
CREATE INDEX IF NOT EXISTS idx_author_dimension_follower ON author_dimension(follower);

-- ============================================
-- 第二部分: backend KOL管理系统表
-- ============================================

-- 2.1 KOL列表表
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE kol_list IS 'KOL列表管理表';
COMMENT ON COLUMN kol_list.platform IS '平台: 抖音/小红书/B站等';
COMMENT ON COLUMN kol_list.account_id IS '账号ID（平台唯一标识）';
COMMENT ON COLUMN kol_list.rebate_policy IS '返点政策描述，如"0-50w: 25%，50-200w: 28%"';
COMMENT ON COLUMN kol_list.match_status IS '匹配状态: unmatched/pending/matched/rejected';
COMMENT ON COLUMN kol_list.matched_snapshot IS '公海数据快照JSON';

-- 创建唯一索引和普通索引
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

-- 2.2 KOL私有匹配表
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

COMMENT ON TABLE kol_private_matches IS 'KOL与公海达人的私有匹配记录';
COMMENT ON COLUMN kol_private_matches.match_type IS '匹配类型: auto/manual';
COMMENT ON COLUMN kol_private_matches.status IS '状态: pending/confirmed/rejected';

CREATE INDEX IF NOT EXISTS idx_private_match_kol ON kol_private_matches(kol_id);
CREATE INDEX IF NOT EXISTS idx_private_match_author ON kol_private_matches(author_id);
CREATE INDEX IF NOT EXISTS idx_private_match_status ON kol_private_matches(status);

-- 2.3 KOL匹配日志表
CREATE TABLE IF NOT EXISTS kol_match_logs (
    id BIGSERIAL PRIMARY KEY,
    kol_id BIGINT NOT NULL,
    action VARCHAR(50) NOT NULL,
    details JSON,
    operator_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE kol_match_logs IS 'KOL匹配操作日志';

CREATE INDEX IF NOT EXISTS idx_match_log_kol ON kol_match_logs(kol_id);
CREATE INDEX IF NOT EXISTS idx_match_log_created ON kol_match_logs(created_at);

-- 2.4 KOL评价表
CREATE TABLE IF NOT EXISTS kol_reviews (
    id BIGSERIAL PRIMARY KEY,
    kol_id BIGINT NOT NULL,
    rating INTEGER,
    comment TEXT,
    reviewer_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE kol_reviews IS 'KOL评价表';

CREATE INDEX IF NOT EXISTS idx_review_kol ON kol_reviews(kol_id);

-- 2.5 来源账号表
CREATE TABLE IF NOT EXISTS source_account (
    id BIGSERIAL PRIMARY KEY,
    platform VARCHAR(50) NOT NULL,
    account_name VARCHAR(100),
    account_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE source_account IS '数据来源账号管理';

-- 2.6 供应商数据库表
CREATE TABLE IF NOT EXISTS supplier_database (
    id BIGSERIAL PRIMARY KEY,
    supplier_name VARCHAR(200) NOT NULL,
    contact_info JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE supplier_database IS '供应商信息管理';

-- 2.7 SQLBot配置表
CREATE TABLE IF NOT EXISTS sqlbot_config (
    id BIGSERIAL PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE sqlbot_config IS 'SQLBot功能配置';

-- ============================================
-- 第三部分: 共享数据表 - influencer_authors
-- ============================================

-- 3.1 网红作者基础数据表（两个系统共用）
CREATE TABLE IF NOT EXISTS influencer_authors (
    star_id BIGINT PRIMARY KEY,
    nick_name VARCHAR(500) NOT NULL,
    core_user_id VARCHAR(200),
    avatar_uri TEXT,
    gender SMALLINT,
    city VARCHAR(200),
    province VARCHAR(200),
    author_type SMALLINT,
    account_status SMALLINT,
    author_level SMALLINT DEFAULT 0,
    follower BIGINT DEFAULT 0,
    fans_increment_within_15d BIGINT DEFAULT 0,
    fans_increment_within_30d BIGINT DEFAULT 0,
    fans_increment_rate_within_15d NUMERIC(20,10) DEFAULT 0,
    interact_rate_within_30d NUMERIC(20,10) DEFAULT 0,
    interaction_median_30d BIGINT DEFAULT 0,
    play_over_rate_within_30d NUMERIC(20,10) DEFAULT 0,
    vv_median_30d BIGINT DEFAULT 0,
    star_item_count_within_30d BIGINT DEFAULT 0,
    star_video_cnt_90d BIGINT DEFAULT 0,
    star_video_interact_rate_90d NUMERIC(20,10) DEFAULT 0,
    star_video_finish_vv_rate_90d NUMERIC(20,10) DEFAULT 0,
    star_video_median_vv_90d BIGINT DEFAULT 0,
    content_theme_labels_180d TEXT,
    tags_relation TEXT,
    price_1_20 NUMERIC(20,4) DEFAULT 0,
    price_20_60 NUMERIC(20,4) DEFAULT 0,
    price_60 NUMERIC(20,4) DEFAULT 0,
    assign_task_price_list VARCHAR(1000),
    expected_play_num BIGINT DEFAULT 0,
    expected_natural_play_num BIGINT DEFAULT 0,
    star_index NUMERIC(20,10) DEFAULT 0,
    prospective_1_20_cpm NUMERIC(20,6) DEFAULT 0,
    prospective_20_60_cpm NUMERIC(20,6) DEFAULT 0,
    prospective_60_cpm NUMERIC(20,6) DEFAULT 0,
    promotion_prospective_1_20_cpm NUMERIC(20,6) DEFAULT 0,
    promotion_prospective_20_60_cpm NUMERIC(20,6) DEFAULT 0,
    promotion_prospective_60_cpm NUMERIC(20,6) DEFAULT 0,
    promotion_prospective_vv BIGINT DEFAULT 0,
    e_commerce_enable SMALLINT DEFAULT 0,
    author_ecom_level VARCHAR(50),
    ecom_gmv_30d_range VARCHAR(200),
    ecom_avg_order_value_30d_range VARCHAR(200),
    ecom_gpm_30d_range VARCHAR(200),
    ecom_video_product_num_30d BIGINT DEFAULT 0,
    star_ecom_video_num_30d BIGINT DEFAULT 0,
    link_convert_index NUMERIC(20,6) DEFAULT 0,
    link_convert_index_by_industry NUMERIC(20,6) DEFAULT 0,
    link_shopping_index NUMERIC(20,6) DEFAULT 0,
    link_spread_index NUMERIC(20,6) DEFAULT 0,
    link_spread_index_by_industry NUMERIC(20,6) DEFAULT 0,
    link_star_index NUMERIC(20,6) DEFAULT 0,
    link_star_index_by_industry NUMERIC(20,6) DEFAULT 0,
    link_recommend_index_by_industry NUMERIC(20,6) DEFAULT 0,
    search_after_view_index_by_industry NUMERIC(20,6) DEFAULT 0,
    is_excellenct_author SMALLINT DEFAULT 0,
    star_excellent_author SMALLINT DEFAULT 0,
    author_avatar_frame_icon VARCHAR(100),
    is_black_horse_author SMALLINT DEFAULT 0,
    is_cocreate_author SMALLINT DEFAULT 0,
    is_cpm_project_author SMALLINT DEFAULT 0,
    is_short_drama SMALLINT DEFAULT 0,
    star_whispers_author SMALLINT DEFAULT 0,
    local_lower_threshold_author SMALLINT DEFAULT 0,
    burst_text_rate NUMERIC(20,10) DEFAULT 0,
    brand_boost_vv BIGINT DEFAULT 0,
    video_brand_boost SMALLINT DEFAULT 0,
    video_brand_boost_vv BIGINT DEFAULT 0,
    expected_cpa3_level SMALLINT DEFAULT 0,
    game_type VARCHAR(500),
    star_component_install_finish_cnt_90d BIGINT DEFAULT 0,
    star_component_link_click_cnt_90d BIGINT DEFAULT 0,
    star_video_install_ge_1_cnt_90d BIGINT DEFAULT 0,
    last_10_items TEXT,
    items TEXT,
    task_infos TEXT,
    crawled_at DATE NOT NULL,
    page_num BIGINT DEFAULT 0,
    source_url VARCHAR(2000),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE influencer_authors IS '网红作者基础数据表（backend和task_control共用）';
COMMENT ON COLUMN influencer_authors.star_id IS '星图ID（主键）';
COMMENT ON COLUMN influencer_authors.crawled_at IS '数据爬取时间';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_influencer_nick_name ON influencer_authors(nick_name);
CREATE INDEX IF NOT EXISTS idx_influencer_follower ON influencer_authors(follower);
CREATE INDEX IF NOT EXISTS idx_influencer_author_type ON influencer_authors(author_type);
CREATE INDEX IF NOT EXISTS idx_influencer_location ON influencer_authors(city, province);
CREATE INDEX IF NOT EXISTS idx_influencer_crawled_at ON influencer_authors(crawled_at);
CREATE INDEX IF NOT EXISTS idx_influencer_star_index ON influencer_authors(star_index);

-- ============================================
-- 第四部分: 视图定义
-- ============================================

-- 4.1 创建作者核心视图（用于backend查询）
CREATE OR REPLACE VIEW v_authors_core AS
SELECT 
    CAST(star_id AS VARCHAR) as author_id,
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
        WHEN account_status = 1 THEN 'active'
        WHEN account_status = 2 THEN 'inactive'
        ELSE 'unknown'
    END as author_status,
    CASE 
        WHEN author_level = 1 THEN 'A'
        WHEN author_level = 2 THEN 'B'
        WHEN author_level = 3 THEN 'C'
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
    COALESCE(star_video_interact_rate_90d, 0) as sn_interact_rate_within_30d,
    COALESCE(star_video_finish_vv_rate_90d, 0) as sn_play_over_rate_within_30d,
    COALESCE(price_1_20, 0) as price_1_20,
    COALESCE(price_20_60, 0) as price_20_60,
    COALESCE(price_60, 0) as price_60,
    0 as assign_cpm_suggest_price,
    COALESCE(promotion_prospective_vv, 0) as promotion_prospective_vv,
    COALESCE(promotion_prospective_20_60_cpm, 0) as promotion_prospective_20_60_cpm,
    COALESCE(promotion_prospective_60_cpm, 0) as promotion_prospective_60_cpm,
    COALESCE(link_convert_index, 0) as link_convert_index,
    COALESCE(link_shopping_index, 0) as link_shopping_index,
    COALESCE(link_spread_index, 0) as link_spread_index,
    COALESCE(link_star_index, 0) as link_star_index,
    COALESCE(CASE WHEN e_commerce_enable = 1 THEN true ELSE false END, false) as e_commerce_enable,
    COALESCE(author_ecom_level, '') as author_ecom_level,
    ecom_gmv_30d_range,
    ecom_avg_order_value_30d_range,
    ecom_gpm_30d_range,
    COALESCE(star_ecom_video_num_30d, 0) as star_ecom_video_num_30d,
    COALESCE(CASE WHEN star_excellent_author = 1 THEN true ELSE false END, false) as star_excellent_author,
    COALESCE(CASE WHEN is_black_horse_author = 1 THEN true ELSE false END, false) as is_black_horse_author,
    COALESCE(CASE WHEN is_cocreate_author = 1 THEN true ELSE false END, false) as is_cocreate_author,
    COALESCE(CASE WHEN is_cpm_project_author = 1 THEN true ELSE false END, false) as is_cpm_project_author,
    COALESCE(CASE WHEN is_short_drama = 1 THEN true ELSE false END, false) as is_short_drama,
    false as is_ad_star_cur_high_quality_author,
    false as star_qianchuan_high_potential,
    0 as avg_search_after_view_rate_30d,
    COALESCE(burst_text_rate, 0) as burst_text_rate,
    '' as primary_industry,
    CAST('[]' AS JSON) as content_tags_top3,
    CAST('{}' AS JSON) as unified_task_price_list,
    CAST('{}' AS JSON) as extra
FROM influencer_authors;

COMMENT ON VIEW v_authors_core IS '作者核心视图 - backend查询使用';

-- 4.2 创建物化视图（用于性能优化）
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_authors_core_materialized AS
SELECT * FROM v_authors_core;

COMMENT ON MATERIALIZED VIEW mv_authors_core_materialized IS '作者核心物化视图 - 缓存数据';

-- 创建物化视图索引
CREATE INDEX IF NOT EXISTS idx_mv_authors_author_id ON mv_authors_core_materialized(author_id);
CREATE INDEX IF NOT EXISTS idx_mv_authors_follower ON mv_authors_core_materialized(follower);
CREATE INDEX IF NOT EXISTS idx_mv_authors_type ON mv_authors_core_materialized(author_type);
CREATE INDEX IF NOT EXISTS idx_mv_authors_city ON mv_authors_core_materialized(city);
CREATE INDEX IF NOT EXISTS idx_mv_authors_province ON mv_authors_core_materialized(province);

-- ============================================
-- 第五部分: 函数定义
-- ============================================

-- 5.1 刷新物化视图的函数
CREATE OR REPLACE FUNCTION refresh_authors_core_mv()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_authors_core_materialized;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_authors_core_mv() IS '刷新作者核心物化视图';

-- ============================================
-- 第六部分: 权限配置
-- ============================================

-- 为postgres用户授予所有表的权限
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- ============================================
-- 完成
-- ============================================

SELECT '✅ PostgreSQL数据库初始化完成！' as message;
SELECT 
    COUNT(*) FILTER (WHERE table_type = 'BASE TABLE') as tables_count,
    COUNT(*) FILTER (WHERE table_type = 'VIEW') as views_count
FROM information_schema.tables 
WHERE table_schema = 'public';
