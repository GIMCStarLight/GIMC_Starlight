-- 在 crawler_db_v2 中创建 kol_list 表
-- 基于 TypeORM 实体定义创建

CREATE TABLE IF NOT EXISTS kol_list (
    id BIGSERIAL PRIMARY KEY,
    platform VARCHAR(30) NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    account_id VARCHAR(80) NOT NULL,
    home_link VARCHAR(500) NOT NULL,
    followers_w NUMERIC(8, 2),
    org_name VARCHAR(100),
    category VARCHAR(30),
    star_quote_21_60s INT,
    star_quote_60s_plus INT,
    is_exclusive SMALLINT DEFAULT 0,
    rebate_policy TEXT,
    rebate_range VARCHAR(50),
    policy_level VARCHAR(10),
    rebate_period VARCHAR(30),
    pay_period VARCHAR(30),
    remark VARCHAR(500),
    cooperation_intro TEXT,
    all_platforms JSONB,
    contact_info JSONB,
    cooperation_degree VARCHAR(20) DEFAULT 'medium',
    source VARCHAR(20) DEFAULT 'manual',
    resource_attribute VARCHAR(20) DEFAULT 'other',
    annual_contract_org VARCHAR(100),
    matched_author_id VARCHAR(64),
    match_confidence NUMERIC(4, 3),
    match_status VARCHAR(20) DEFAULT 'unmatched',
    matched_snapshot JSONB,
    matched_at TIMESTAMP,
    created_by BIGINT,
    updated_by BIGINT,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(platform, account_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_kol_list_platform_account_id ON kol_list(platform, account_id);
CREATE INDEX IF NOT EXISTS idx_kol_list_followers_w ON kol_list(followers_w);
CREATE INDEX IF NOT EXISTS idx_kol_list_category ON kol_list(category);
CREATE INDEX IF NOT EXISTS idx_kol_list_org_name ON kol_list(org_name);
CREATE INDEX IF NOT EXISTS idx_kol_list_is_exclusive ON kol_list(is_exclusive);
CREATE INDEX IF NOT EXISTS idx_kol_list_resource_attribute ON kol_list(resource_attribute);
CREATE INDEX IF NOT EXISTS idx_kol_list_cooperation_degree ON kol_list(cooperation_degree);
CREATE INDEX IF NOT EXISTS idx_kol_list_matched_author_id ON kol_list(matched_author_id);
CREATE INDEX IF NOT EXISTS idx_kol_list_match_status ON kol_list(match_status);
CREATE INDEX IF NOT EXISTS idx_kol_list_platform_account_name ON kol_list(platform, account_name);
CREATE INDEX IF NOT EXISTS idx_kol_list_deleted_at ON kol_list(deleted_at);
CREATE INDEX IF NOT EXISTS idx_kol_list_platform_match_status_deleted ON kol_list(platform, match_status, deleted_at);

-- 迁移数据从 crawler_db.kol_list 到 crawler_db_v2.kol_list
INSERT INTO kol_list (
    id,
    platform,
    account_name,
    account_id,
    home_link,
    followers_w,
    org_name,
    category,
    star_quote_21_60s,
    star_quote_60s_plus,
    is_exclusive,
    rebate_policy,
    rebate_range,
    policy_level,
    rebate_period,
    pay_period,
    remark,
    cooperation_intro,
    all_platforms,
    contact_info,
    cooperation_degree,
    source,
    resource_attribute,
    annual_contract_org,
    matched_author_id,
    match_confidence,
    match_status,
    matched_snapshot,
    matched_at,
    created_by,
    updated_by,
    deleted_at,
    created_at,
    updated_at
)
SELECT
    id,
    platform,
    account_name,
    account_id,
    home_link,
    followers_w,
    org_name,
    category,
    star_quote_21_60s,
    star_quote_60s_plus,
    is_exclusive,
    rebate_policy,
    rebate_range,
    policy_level,
    rebate_period,
    pay_period,
    remark,
    cooperation_intro,
    all_platforms,
    contact_info,
    cooperation_degree,
    source,
    resource_attribute,
    annual_contract_org,
    matched_author_id,
    match_confidence,
    match_status,
    matched_snapshot,
    matched_at,
    created_by,
    updated_by,
    deleted_at,
    created_at,
    updated_at
FROM dblink(
    'host=192.168.102.168 port=5432 user=postgres password=postgres dbname=crawler_db',
    'SELECT id, platform, account_name, account_id, home_link, followers_w, org_name, category,
            star_quote_21_60s, star_quote_60s_plus, is_exclusive, rebate_policy, rebate_range,
            policy_level, rebate_period, pay_period, remark, cooperation_intro, all_platforms,
            contact_info, cooperation_degree, source, resource_attribute, annual_contract_org,
            matched_author_id, match_confidence, match_status, matched_snapshot, matched_at,
            created_by, updated_by, deleted_at, created_at, updated_at FROM kol_list'
) AS t(
    id BIGINT,
    platform VARCHAR(30),
    account_name VARCHAR(100),
    account_id VARCHAR(80),
    home_link VARCHAR(500),
    followers_w NUMERIC(8, 2),
    org_name VARCHAR(100),
    category VARCHAR(30),
    star_quote_21_60s INT,
    star_quote_60s_plus INT,
    is_exclusive SMALLINT,
    rebate_policy TEXT,
    rebate_range VARCHAR(50),
    policy_level VARCHAR(10),
    rebate_period VARCHAR(30),
    pay_period VARCHAR(30),
    remark VARCHAR(500),
    cooperation_intro TEXT,
    all_platforms JSONB,
    contact_info JSONB,
    cooperation_degree VARCHAR(20),
    source VARCHAR(20),
    resource_attribute VARCHAR(20),
    annual_contract_org VARCHAR(100),
    matched_author_id VARCHAR(64),
    match_confidence NUMERIC(4, 3),
    match_status VARCHAR(20),
    matched_snapshot JSONB,
    matched_at TIMESTAMP,
    created_by BIGINT,
    updated_by BIGINT,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
) ON CONFLICT (platform, account_id) DO NOTHING;

-- 显示迁移结果
SELECT COUNT(*) as total_records FROM kol_list;
