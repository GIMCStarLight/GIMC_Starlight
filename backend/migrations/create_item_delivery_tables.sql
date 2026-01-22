-- =============================================
-- 作品投放数据采集模块数据库表结构
-- 用途: 存储星图作品投放数据（原始+解析）
-- 创建时间: 2025-12-26
-- =============================================

-- 1. 作品投放采集运行记录表
CREATE TABLE IF NOT EXISTS item_delivery_runs (
    id BIGSERIAL PRIMARY KEY,
    run_name TEXT,                          -- 运行名称（可选）
    account_id TEXT NOT NULL,               -- 使用的账号ID
    star_id TEXT NOT NULL,                  -- 星图账号ID
    traffic_type INTEGER DEFAULT 1,         -- 流量类型: 1=全部, 2=自然, 3=付费
    user_role INTEGER DEFAULT 1,            -- 用户角色: 1=广告主, 2=达人
    qps DOUBLE PRECISION DEFAULT 0.5,       -- 采集QPS
    status TEXT DEFAULT 'running',          -- 状态: running, completed, failed, partial
    total_items INTEGER DEFAULT 0,          -- 总作品数
    success_count INTEGER DEFAULT 0,        -- 成功数
    failed_count INTEGER DEFAULT 0,         -- 失败数
    error_message TEXT,                     -- 错误信息
    started_at TIMESTAMP DEFAULT NOW(),     -- 开始时间
    finished_at TIMESTAMP,                  -- 结束时间
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE item_delivery_runs IS '作品投放数据采集运行记录';
COMMENT ON COLUMN item_delivery_runs.account_id IS '作品数据专用账号ID（如item_account_1）';
COMMENT ON COLUMN item_delivery_runs.star_id IS '星图账户ID';
COMMENT ON COLUMN item_delivery_runs.traffic_type IS '流量类型: 1=全部, 2=自然, 3=付费';
COMMENT ON COLUMN item_delivery_runs.user_role IS '用户角色: 1=广告主, 2=达人';

-- 2. 作品投放核心数据表（解析后的结构化数据）
CREATE TABLE IF NOT EXISTS item_delivery_data (
    id BIGSERIAL PRIMARY KEY,
    run_id BIGINT REFERENCES item_delivery_runs(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,                  -- 作品ID
    
    -- 基础统计数据
    play_count BIGINT DEFAULT 0,            -- 播放量
    cpm DOUBLE PRECISION DEFAULT 0,         -- 千次曝光成本
    cpe DOUBLE PRECISION DEFAULT 0,         -- 单次互动成本
    five_sec_rate DOUBLE PRECISION DEFAULT 0, -- 5秒播放率
    
    -- 实时统计数据
    finish_count BIGINT DEFAULT 0,          -- 完播次数
    finish_rate DOUBLE PRECISION DEFAULT 0, -- 完播率
    like_count BIGINT DEFAULT 0,            -- 点赞数
    like_rate DOUBLE PRECISION DEFAULT 0,   -- 点赞率
    comment_count BIGINT DEFAULT 0,         -- 评论数
    comment_rate DOUBLE PRECISION DEFAULT 0, -- 评论率
    share_count BIGINT DEFAULT 0,           -- 分享数
    share_rate DOUBLE PRECISION DEFAULT 0,  -- 分享率
    
    -- 采集元数据
    traffic_type INTEGER DEFAULT 1,         -- 流量类型
    user_role INTEGER DEFAULT 1,            -- 用户角色
    crawled_at TIMESTAMP DEFAULT NOW(),     -- 采集时间
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(run_id, item_id)                 -- 同一run中item_id唯一
);

COMMENT ON TABLE item_delivery_data IS '作品投放数据（结构化）';
COMMENT ON COLUMN item_delivery_data.item_id IS '作品ID（抖音视频ID）';
COMMENT ON COLUMN item_delivery_data.play_count IS '播放量（基础+实时取最大值）';
COMMENT ON COLUMN item_delivery_data.cpm IS '千次曝光成本';
COMMENT ON COLUMN item_delivery_data.cpe IS '单次互动成本';

-- 3. 作品投放趋势数据表（分时数据）
CREATE TABLE IF NOT EXISTS item_delivery_trends (
    id BIGSERIAL PRIMARY KEY,
    run_id BIGINT REFERENCES item_delivery_runs(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,                  -- 作品ID
    trend_data JSONB,                       -- 趋势数据数组（分时数据）
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(run_id, item_id)
);

COMMENT ON TABLE item_delivery_trends IS '作品投放趋势数据（分时统计）';
COMMENT ON COLUMN item_delivery_trends.trend_data IS '趋势数据JSON数组';

-- 4. 作品投放原始数据归档表
CREATE TABLE IF NOT EXISTS item_delivery_raw_archive (
    id BIGSERIAL PRIMARY KEY,
    run_id BIGINT REFERENCES item_delivery_runs(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL,                  -- 作品ID
    raw_response JSONB NOT NULL,            -- 完整API响应
    api_status INTEGER,                     -- API HTTP状态码
    api_code INTEGER,                       -- API业务代码
    api_msg TEXT,                           -- API消息
    crawled_at TIMESTAMP DEFAULT NOW(),     -- 采集时间
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(run_id, item_id, crawled_at)     -- 同一run+item+时间唯一（支持重复采集）
);

COMMENT ON TABLE item_delivery_raw_archive IS '作品投放原始数据归档';
COMMENT ON COLUMN item_delivery_raw_archive.raw_response IS '完整的API响应JSON';
COMMENT ON COLUMN item_delivery_raw_archive.api_code IS 'API返回的业务代码（0表示成功）';

-- 5. 作品维度汇总表（最新数据）
CREATE TABLE IF NOT EXISTS item_delivery_summary (
    item_id TEXT PRIMARY KEY,               -- 作品ID
    
    -- 最新统计数据（从最近一次成功采集）
    latest_play_count BIGINT DEFAULT 0,
    latest_finish_count BIGINT DEFAULT 0,
    latest_finish_rate DOUBLE PRECISION DEFAULT 0,
    latest_like_count BIGINT DEFAULT 0,
    latest_comment_count BIGINT DEFAULT 0,
    latest_share_count BIGINT DEFAULT 0,
    latest_cpm DOUBLE PRECISION DEFAULT 0,
    latest_cpe DOUBLE PRECISION DEFAULT 0,
    
    -- 历史统计
    first_seen_at TIMESTAMP,                -- 首次采集时间
    last_seen_at TIMESTAMP,                 -- 最后采集时间
    last_seen_run_id BIGINT,                -- 最后一次run_id
    total_crawl_count INTEGER DEFAULT 0,    -- 总采集次数
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE item_delivery_summary IS '作品维度汇总表（最新快照）';
COMMENT ON COLUMN item_delivery_summary.latest_play_count IS '最新播放量';
COMMENT ON COLUMN item_delivery_summary.total_crawl_count IS '该作品被采集的总次数';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_item_delivery_runs_account_id ON item_delivery_runs(account_id);
CREATE INDEX IF NOT EXISTS idx_item_delivery_runs_status ON item_delivery_runs(status);
CREATE INDEX IF NOT EXISTS idx_item_delivery_runs_started_at ON item_delivery_runs(started_at);

CREATE INDEX IF NOT EXISTS idx_item_delivery_data_item_id ON item_delivery_data(item_id);
CREATE INDEX IF NOT EXISTS idx_item_delivery_data_run_id ON item_delivery_data(run_id);
CREATE INDEX IF NOT EXISTS idx_item_delivery_data_crawled_at ON item_delivery_data(crawled_at);

CREATE INDEX IF NOT EXISTS idx_item_delivery_trends_item_id ON item_delivery_trends(item_id);
CREATE INDEX IF NOT EXISTS idx_item_delivery_trends_run_id ON item_delivery_trends(run_id);

CREATE INDEX IF NOT EXISTS idx_item_delivery_raw_archive_item_id ON item_delivery_raw_archive(item_id);
CREATE INDEX IF NOT EXISTS idx_item_delivery_raw_archive_run_id ON item_delivery_raw_archive(run_id);
CREATE INDEX IF NOT EXISTS idx_item_delivery_raw_archive_crawled_at ON item_delivery_raw_archive(crawled_at);

CREATE INDEX IF NOT EXISTS idx_item_delivery_summary_last_seen_at ON item_delivery_summary(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_item_delivery_summary_latest_play_count ON item_delivery_summary(latest_play_count);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_item_delivery_runs_updated_at
    BEFORE UPDATE ON item_delivery_runs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_item_delivery_data_updated_at
    BEFORE UPDATE ON item_delivery_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_item_delivery_summary_updated_at
    BEFORE UPDATE ON item_delivery_summary
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
