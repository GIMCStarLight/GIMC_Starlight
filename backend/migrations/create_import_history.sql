-- 创建导入历史表
CREATE TABLE IF NOT EXISTS import_history (
    id BIGSERIAL PRIMARY KEY,
    task_id VARCHAR(100) NOT NULL UNIQUE,
    file_name VARCHAR(500),
    data_type VARCHAR(50) DEFAULT 'private',
    total_rows INTEGER DEFAULT 0,
    processed_rows INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    duration INTEGER,
    error_message TEXT,
    failed_records JSONB,
    created_by BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE import_history IS '数据导入历史记录';
COMMENT ON COLUMN import_history.task_id IS '导入任务ID（Redis中的任务ID）';
COMMENT ON COLUMN import_history.status IS '状态: pending/processing/completed/failed';
COMMENT ON COLUMN import_history.failed_records IS '失败记录JSON';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_import_history_task_id ON import_history(task_id);
CREATE INDEX IF NOT EXISTS idx_import_history_status ON import_history(status);
CREATE INDEX IF NOT EXISTS idx_import_history_created_at ON import_history(created_at);
CREATE INDEX IF NOT EXISTS idx_import_history_created_by ON import_history(created_by);

-- 插入示例说明
SELECT '✅ 导入历史表创建完成！' as message;
