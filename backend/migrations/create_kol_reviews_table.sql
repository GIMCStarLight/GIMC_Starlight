-- 创建 kol_reviews 表
-- 该表用于存储KOL达人的评价信息
-- 与 backend/src/database/entities/kol-reviews.entity.ts 定义匹配

-- 删除旧表（如果存在）
DROP TABLE IF EXISTS kol_reviews CASCADE;

-- 创建新表
CREATE TABLE kol_reviews (
    author_id TEXT NOT NULL,
    reviewer VARCHAR(100) NOT NULL,
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (author_id, reviewer)
);

-- 创建索引
CREATE INDEX idx_kol_reviews_author_created ON kol_reviews(author_id, created_at);
CREATE INDEX idx_kol_reviews_reviewer ON kol_reviews(reviewer);
CREATE INDEX idx_kol_reviews_score ON kol_reviews(score);
CREATE INDEX idx_kol_reviews_created_at ON kol_reviews(created_at);

-- 添加注释
COMMENT ON TABLE kol_reviews IS 'KOL达人评价表';
COMMENT ON COLUMN kol_reviews.author_id IS '达人ID（抖音author_id）';
COMMENT ON COLUMN kol_reviews.reviewer IS '评价人';
COMMENT ON COLUMN kol_reviews.score IS '评分（1-5分）';
COMMENT ON COLUMN kol_reviews.content IS '评价内容';
COMMENT ON COLUMN kol_reviews.created_at IS '创建时间';
COMMENT ON COLUMN kol_reviews.updated_at IS '更新时间';

-- 创建更新时间自动触发器
CREATE OR REPLACE FUNCTION update_kol_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_kol_reviews_updated_at
    BEFORE UPDATE ON kol_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_kol_reviews_updated_at();

-- 完成提示
SELECT 'kol_reviews 表创建成功！' as message;
