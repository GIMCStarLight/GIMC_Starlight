-- 升级 kol_reviews 表结构
-- 添加ID、审核状态、软删除等功能

-- 1. 备份现有数据
CREATE TABLE kol_reviews_backup AS SELECT * FROM kol_reviews;

-- 2. 删除旧表
DROP TABLE IF EXISTS kol_reviews CASCADE;

-- 3. 创建新表结构
CREATE TABLE kol_reviews (
    id BIGSERIAL PRIMARY KEY,
    author_id TEXT NOT NULL,
    reviewer VARCHAR(100) NOT NULL,
    reviewer_id BIGINT,  -- 评价人用户ID（预留）
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
    content TEXT NOT NULL,
    
    -- 扩展字段
    review_type VARCHAR(50) DEFAULT 'internal',  -- 评价类型: internal/client/partner
    review_tags TEXT[],  -- 评价标签数组
    attachments JSONB,  -- 附件信息（预留）
    
    -- 审核相关
    status VARCHAR(20) DEFAULT 'approved',  -- pending/approved/rejected
    auditor VARCHAR(100),  -- 审核人
    audit_time TIMESTAMP,  -- 审核时间
    audit_comment TEXT,  -- 审核意见
    
    -- 软删除
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(100),
    
    -- 时间戳
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. 从备份恢复数据
INSERT INTO kol_reviews (author_id, reviewer, score, content, created_at, updated_at)
SELECT author_id, reviewer, score, content, created_at, updated_at
FROM kol_reviews_backup;

-- 5. 创建索引
CREATE INDEX idx_kol_reviews_author ON kol_reviews(author_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_kol_reviews_reviewer ON kol_reviews(reviewer) WHERE is_deleted = FALSE;
CREATE INDEX idx_kol_reviews_status ON kol_reviews(status) WHERE is_deleted = FALSE;
CREATE INDEX idx_kol_reviews_score ON kol_reviews(score) WHERE is_deleted = FALSE;
CREATE INDEX idx_kol_reviews_type ON kol_reviews(review_type) WHERE is_deleted = FALSE;
CREATE INDEX idx_kol_reviews_created ON kol_reviews(created_at DESC);
CREATE INDEX idx_kol_reviews_is_deleted ON kol_reviews(is_deleted);

-- 6. 唯一约束（同一评价人对同一达人只能有一个未删除的评价）
CREATE UNIQUE INDEX unique_active_review ON kol_reviews(author_id, reviewer) 
WHERE is_deleted = FALSE;

-- 7. 添加注释
COMMENT ON TABLE kol_reviews IS 'KOL达人评价表（升级版）';
COMMENT ON COLUMN kol_reviews.id IS '评价ID（主键）';
COMMENT ON COLUMN kol_reviews.author_id IS '达人ID（抖音author_id）';
COMMENT ON COLUMN kol_reviews.reviewer IS '评价人';
COMMENT ON COLUMN kol_reviews.score IS '评分（1-5分）';
COMMENT ON COLUMN kol_reviews.content IS '评价内容';
COMMENT ON COLUMN kol_reviews.review_type IS '评价类型';
COMMENT ON COLUMN kol_reviews.status IS '审核状态';
COMMENT ON COLUMN kol_reviews.is_deleted IS '是否已删除';

-- 8. 更新时间触发器
CREATE OR REPLACE FUNCTION update_kol_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_kol_reviews_updated_at ON kol_reviews;
CREATE TRIGGER trigger_update_kol_reviews_updated_at
    BEFORE UPDATE ON kol_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_kol_reviews_updated_at();

-- 9. 清理备份表（可选，建议保留一段时间）
-- DROP TABLE kol_reviews_backup;

-- 完成提示
SELECT 'kol_reviews 表升级成功！' as message;
SELECT COUNT(*) as migrated_records FROM kol_reviews WHERE is_deleted = FALSE;
