-- 创建爬虫运行记录表
-- 用于记录每次爬取任务的元信息

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
    status TEXT DEFAULT 'running',  -- running, completed, failed, partial
    total_authors INTEGER,
    success_count INTEGER,
    failed_count INTEGER,
    error_message TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_author_square_runs_created_at ON author_square_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_author_square_runs_first_label ON author_square_runs(first_label);
CREATE INDEX IF NOT EXISTS idx_author_square_runs_status ON author_square_runs(status);
CREATE INDEX IF NOT EXISTS idx_author_square_runs_payload_hash ON author_square_runs(request_payload_hash);

-- 添加注释
COMMENT ON TABLE author_square_runs IS '爬虫运行记录表 - 记录每次爬取任务的元信息';
COMMENT ON COLUMN author_square_runs.id IS '运行ID（主键）';
COMMENT ON COLUMN author_square_runs.first_label IS '一级标签';
COMMENT ON COLUMN author_square_runs.second_label IS '二级标签';
COMMENT ON COLUMN author_square_runs.second_ids IS '二级标签ID列表';
COMMENT ON COLUMN author_square_runs.video_type IS '视频类型';
COMMENT ON COLUMN author_square_runs.page IS '页码';
COMMENT ON COLUMN author_square_runs."limit" IS '每页数量';
COMMENT ON COLUMN author_square_runs.min_price IS '最低价格';
COMMENT ON COLUMN author_square_runs.x_tt_agw_login IS '登录token';
COMMENT ON COLUMN author_square_runs.request_payload IS '请求payload';
COMMENT ON COLUMN author_square_runs.request_payload_hash IS 'payload哈希值';
COMMENT ON COLUMN author_square_runs.status IS '任务状态: running, completed, failed, partial';
COMMENT ON COLUMN author_square_runs.total_authors IS '总作者数';
COMMENT ON COLUMN author_square_runs.success_count IS '成功保存数';
COMMENT ON COLUMN author_square_runs.failed_count IS '失败数';
COMMENT ON COLUMN author_square_runs.error_message IS '错误信息';
COMMENT ON COLUMN author_square_runs.created_at IS '创建时间';
COMMENT ON COLUMN author_square_runs.updated_at IS '更新时间';
