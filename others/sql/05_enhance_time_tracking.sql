-- =============================================
-- 增强时间追踪和历史版本管理
-- 解决作者数据随时间更新的问题
-- 创建时间: 2025-01-04
-- =============================================

-- ============================================
-- 1. 为 authors_raw_archive 添加分区（按月）
-- ============================================

-- 先删除现有表
DROP TABLE IF EXISTS authors_raw_archive CASCADE;

-- 创建分区表
CREATE TABLE authors_raw_archive (
    id BIGSERIAL,
    author_id TEXT NOT NULL,
    run_id BIGINT,
    raw_attribute_datas JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(run_id, author_id, created_at)
) PARTITION BY RANGE (created_at);

-- 创建当前月份分区
CREATE TABLE authors_raw_archive_2025_01 PARTITION OF authors_raw_archive
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE authors_raw_archive_2025_02 PARTITION OF authors_raw_archive
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE TABLE authors_raw_archive_2025_03 PARTITION OF authors_raw_archive
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

-- 索引
CREATE INDEX idx_raw_archive_author_id ON authors_raw_archive(author_id);
CREATE INDEX idx_raw_archive_created_at ON authors_raw_archive(created_at DESC);
CREATE INDEX idx_raw_archive_raw_data ON authors_raw_archive USING gin(raw_attribute_datas);

COMMENT ON TABLE authors_raw_archive IS '原始数据归档表-按月分区，保留所有历史版本';

-- ============================================
-- 2. 创建数据快照表（用于趋势分析）
-- ============================================

CREATE TABLE IF NOT EXISTS authors_snapshots (
    id BIGSERIAL PRIMARY KEY,
    author_id TEXT NOT NULL,
    snapshot_date DATE NOT NULL,
    
    -- 快照数据（核心指标）
    follower BIGINT,
    fans_increment_30d BIGINT,
    interact_rate_30d DOUBLE PRECISION,
    star_index DOUBLE PRECISION,
    price_20_60 BIGINT,
    ecom_score DOUBLE PRECISION,
    
    -- 计算的增长率
    follower_growth_rate DOUBLE PRECISION,
    price_change_rate DOUBLE PRECISION,
    
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(author_id, snapshot_date)
);

-- 索引
CREATE INDEX idx_snapshots_author_id ON authors_snapshots(author_id);
CREATE INDEX idx_snapshots_date ON authors_snapshots(snapshot_date DESC);
CREATE INDEX idx_snapshots_follower ON authors_snapshots(follower DESC);

COMMENT ON TABLE authors_snapshots IS '作者数据快照表-每日/每周快照用于趋势分析';

-- ============================================
-- 3. 创建触发器：自动记录变更历史
-- ============================================

-- 触发器函数：记录 authors_core 的变更
CREATE OR REPLACE FUNCTION log_authors_core_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        -- 只记录实际发生变化的字段
        IF (OLD.follower IS DISTINCT FROM NEW.follower OR
            OLD.star_index IS DISTINCT FROM NEW.star_index OR
            OLD.nick_name IS DISTINCT FROM NEW.nick_name OR
            OLD.city IS DISTINCT FROM NEW.city) THEN
            
            INSERT INTO authors_change_history (
                author_id,
                table_name,
                changed_fields,
                old_values,
                new_values,
                changed_at
            ) VALUES (
                NEW.author_id,
                'authors_core',
                jsonb_build_object(
                    'follower', CASE WHEN OLD.follower IS DISTINCT FROM NEW.follower THEN true ELSE NULL END,
                    'star_index', CASE WHEN OLD.star_index IS DISTINCT FROM NEW.star_index THEN true ELSE NULL END,
                    'nick_name', CASE WHEN OLD.nick_name IS DISTINCT FROM NEW.nick_name THEN true ELSE NULL END,
                    'city', CASE WHEN OLD.city IS DISTINCT FROM NEW.city THEN true ELSE NULL END
                ),
                jsonb_build_object(
                    'follower', OLD.follower,
                    'star_index', OLD.star_index,
                    'nick_name', OLD.nick_name,
                    'city', OLD.city
                ),
                jsonb_build_object(
                    'follower', NEW.follower,
                    'star_index', NEW.star_index,
                    'nick_name', NEW.nick_name,
                    'city', NEW.city
                ),
                NOW()
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trg_authors_core_changes ON authors_core;
CREATE TRIGGER trg_authors_core_changes
    AFTER UPDATE ON authors_core
    FOR EACH ROW
    EXECUTE FUNCTION log_authors_core_changes();

COMMENT ON FUNCTION log_authors_core_changes IS '自动记录authors_core表的变更到审计表';

-- ============================================
-- 4. 创建函数：生成每日快照
-- ============================================

CREATE OR REPLACE FUNCTION create_daily_snapshot()
RETURNS void AS $$
BEGIN
    INSERT INTO authors_snapshots (
        author_id,
        snapshot_date,
        follower,
        fans_increment_30d,
        interact_rate_30d,
        star_index,
        price_20_60,
        ecom_score,
        follower_growth_rate,
        price_change_rate
    )
    SELECT 
        c.author_id,
        CURRENT_DATE,
        c.follower,
        f.fans_increment_30d,
        e.interact_rate_30d,
        c.star_index,
        p.price_20_60,
        ec.ecom_score,
        -- 计算增长率（与上一次快照对比）
        CASE 
            WHEN prev.follower > 0 
            THEN (c.follower - prev.follower)::DOUBLE PRECISION / prev.follower
            ELSE NULL
        END as follower_growth_rate,
        CASE 
            WHEN prev.price_20_60 > 0 
            THEN (p.price_20_60 - prev.price_20_60)::DOUBLE PRECISION / prev.price_20_60
            ELSE NULL
        END as price_change_rate
    FROM authors_core c
    LEFT JOIN authors_fans_metrics f ON c.author_id = f.author_id
    LEFT JOIN authors_engagement_metrics e ON c.author_id = e.author_id
    LEFT JOIN authors_pricing p ON c.author_id = p.author_id
    LEFT JOIN authors_ecommerce ec ON c.author_id = ec.author_id
    LEFT JOIN LATERAL (
        SELECT follower, price_20_60
        FROM authors_snapshots
        WHERE author_id = c.author_id
        ORDER BY snapshot_date DESC
        LIMIT 1
    ) prev ON true
    WHERE c.updated_at >= CURRENT_DATE - INTERVAL '1 day'
    ON CONFLICT (author_id, snapshot_date) DO UPDATE SET
        follower = EXCLUDED.follower,
        fans_increment_30d = EXCLUDED.fans_increment_30d,
        interact_rate_30d = EXCLUDED.interact_rate_30d,
        star_index = EXCLUDED.star_index,
        price_20_60 = EXCLUDED.price_20_60,
        ecom_score = EXCLUDED.ecom_score,
        follower_growth_rate = EXCLUDED.follower_growth_rate,
        price_change_rate = EXCLUDED.price_change_rate;
    
    RAISE NOTICE '✅ 每日快照创建完成，日期: %', CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_daily_snapshot IS '生成每日数据快照用于趋势分析';

-- ============================================
-- 5. 创建视图：查看作者历史趋势
-- ============================================

CREATE OR REPLACE VIEW v_author_trends AS
SELECT 
    author_id,
    snapshot_date,
    follower,
    fans_increment_30d,
    interact_rate_30d,
    star_index,
    price_20_60,
    follower_growth_rate,
    price_change_rate,
    -- 计算7天移动平均
    AVG(follower) OVER (
        PARTITION BY author_id 
        ORDER BY snapshot_date 
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) as follower_7d_avg,
    -- 计算30天移动平均
    AVG(follower) OVER (
        PARTITION BY author_id 
        ORDER BY snapshot_date 
        ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
    ) as follower_30d_avg
FROM authors_snapshots
ORDER BY author_id, snapshot_date DESC;

COMMENT ON VIEW v_author_trends IS '作者历史趋势视图-包含移动平均';

-- ============================================
-- 6. 创建函数：查询作者历史版本
-- ============================================

CREATE OR REPLACE FUNCTION get_author_history(
    p_author_id TEXT,
    p_start_date TIMESTAMP DEFAULT NOW() - INTERVAL '30 days',
    p_end_date TIMESTAMP DEFAULT NOW()
)
RETURNS TABLE (
    version_date TIMESTAMP,
    follower BIGINT,
    star_index DOUBLE PRECISION,
    price_20_60 BIGINT,
    data_source TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        created_at as version_date,
        (raw_attribute_datas->>'follower')::BIGINT as follower,
        (raw_attribute_datas->>'star_index')::DOUBLE PRECISION as star_index,
        (raw_attribute_datas->>'price_20_60')::BIGINT as price_20_60,
        'archive' as data_source
    FROM authors_raw_archive
    WHERE author_id = p_author_id
      AND created_at BETWEEN p_start_date AND p_end_date
    ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_author_history IS '查询作者的历史版本数据';

-- ============================================
-- 7. 创建索引：优化时间范围查询
-- ============================================

-- 为所有表的 updated_at 创建 BRIN 索引（适合时间序列）
CREATE INDEX IF NOT EXISTS idx_authors_core_updated_at_brin 
    ON authors_core USING brin(updated_at);

CREATE INDEX IF NOT EXISTS idx_fans_metrics_updated_at_brin 
    ON authors_fans_metrics USING brin(updated_at);

CREATE INDEX IF NOT EXISTS idx_engagement_updated_at_brin 
    ON authors_engagement_metrics USING brin(updated_at);

-- ============================================
-- 8. 创建物化视图：最近更新的作者
-- ============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_recently_updated_authors AS
SELECT 
    c.author_id,
    c.nick_name,
    c.follower,
    c.updated_at,
    c.last_crawled_at,
    -- 计算更新频率
    EXTRACT(EPOCH FROM (NOW() - c.updated_at))/3600 as hours_since_update,
    -- 判断是否需要更新
    CASE 
        WHEN c.updated_at < NOW() - INTERVAL '7 days' THEN 'urgent'
        WHEN c.updated_at < NOW() - INTERVAL '3 days' THEN 'high'
        WHEN c.updated_at < NOW() - INTERVAL '1 day' THEN 'medium'
        ELSE 'low'
    END as update_priority
FROM authors_core c
WHERE c.updated_at >= NOW() - INTERVAL '30 days'
ORDER BY c.updated_at DESC;

CREATE INDEX idx_mv_recently_updated_priority 
    ON mv_recently_updated_authors(update_priority);

COMMENT ON MATERIALIZED VIEW mv_recently_updated_authors IS '最近更新的作者-用于调度爬虫更新';

-- ============================================
-- 完成提示
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ 时间追踪和历史版本管理增强完成！';
    RAISE NOTICE '';
    RAISE NOTICE '新增功能：';
    RAISE NOTICE '  1. ✅ 原始数据按月分区（支持历史查询）';
    RAISE NOTICE '  2. ✅ 每日快照表（趋势分析）';
    RAISE NOTICE '  3. ✅ 自动变更审计（触发器）';
    RAISE NOTICE '  4. ✅ 历史趋势视图（移动平均）';
    RAISE NOTICE '  5. ✅ 历史版本查询函数';
    RAISE NOTICE '  6. ✅ 更新优先级管理';
    RAISE NOTICE '';
    RAISE NOTICE '使用示例：';
    RAISE NOTICE '  -- 生成每日快照';
    RAISE NOTICE '  SELECT create_daily_snapshot();';
    RAISE NOTICE '';
    RAISE NOTICE '  -- 查询作者历史';
    RAISE NOTICE '  SELECT * FROM get_author_history(''author_123'');';
    RAISE NOTICE '';
    RAISE NOTICE '  -- 查看趋势';
    RAISE NOTICE '  SELECT * FROM v_author_trends WHERE author_id = ''author_123'';';
END $$;
