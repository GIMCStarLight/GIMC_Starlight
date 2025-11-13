-- =============================================
-- 阶段3: 作品层+垂直领域层表结构创建脚本
-- 包含5个表：authors_star_videos_90d, authors_recent_works,
--           authors_game_data, authors_content_vertical, authors_tool_vertical
-- 创建时间: 2025-01-04
-- =============================================

-- ============================================
-- 8. authors_star_videos_90d - 星图视频数据表（90天）
-- ============================================
CREATE TABLE IF NOT EXISTS authors_star_videos_90d (
    author_id TEXT PRIMARY KEY REFERENCES authors_core(author_id) ON DELETE CASCADE,
    
    -- 90天星图视频统计
    star_video_cnt_90d BIGINT,
    star_video_interact_rate_90d DOUBLE PRECISION,
    star_video_finish_vv_rate_90d DOUBLE PRECISION,
    star_video_median_vv_90d BIGINT,
    star_video_install_ge_1_cnt_90d BIGINT,
    
    -- 30天星图作品数
    star_item_count_within_30d BIGINT,
    
    -- 组件数据
    star_component_link_click_cnt_90d BIGINT,
    star_component_install_finish_cnt_90d BIGINT,
    star_component_download_ctr_90d DOUBLE PRECISION,
    star_component_install_cpa_90d DOUBLE PRECISION,
    star_component_install_pvr_90d DOUBLE PRECISION,
    
    -- 视频活跃度（计算字段）
    video_activity_score DOUBLE PRECISION GENERATED ALWAYS AS (
        CASE 
            WHEN star_video_cnt_90d > 0 
            THEN (COALESCE(star_video_interact_rate_90d, 0) * 0.5 + COALESCE(star_video_finish_vv_rate_90d, 0) * 0.5)
            ELSE 0
        END
    ) STORED,
    
    is_active_creator BOOLEAN GENERATED ALWAYS AS (
        star_video_cnt_90d >= 3
    ) STORED,
    
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_star_videos_cnt ON authors_star_videos_90d(star_video_cnt_90d DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_star_videos_interact_rate ON authors_star_videos_90d(star_video_interact_rate_90d DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_star_videos_median_vv ON authors_star_videos_90d(star_video_median_vv_90d DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_star_videos_activity_score ON authors_star_videos_90d(video_activity_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_star_videos_is_active ON authors_star_videos_90d(is_active_creator) WHERE is_active_creator = TRUE;

COMMENT ON TABLE authors_star_videos_90d IS '星图视频数据表-90天作品统计';
COMMENT ON COLUMN authors_star_videos_90d.video_activity_score IS '视频活跃度评分(0-1)';
COMMENT ON COLUMN authors_star_videos_90d.is_active_creator IS '是否活跃创作者（90天>=3个视频）';

-- ============================================
-- 9. authors_recent_works - 最近作品表
-- ============================================
CREATE TABLE IF NOT EXISTS authors_recent_works (
    author_id TEXT PRIMARY KEY REFERENCES authors_core(author_id) ON DELETE CASCADE,
    
    -- 最近10个作品（JSONB数组）
    last_10_items JSONB,
    
    -- 作品统计（应用层填充）
    recent_works_count INTEGER DEFAULT 0,
    
    -- 最高播放量作品
    max_vv_in_recent BIGINT,
    
    -- 平均互动数据
    avg_like_cnt_recent BIGINT,
    avg_share_cnt_recent BIGINT,
    avg_comment_cnt_recent BIGINT,
    
    -- 高质量作品数量
    high_quality_item_count INTEGER DEFAULT 0,
    
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_recent_works_last_10 ON authors_recent_works USING gin(last_10_items);
CREATE INDEX IF NOT EXISTS idx_recent_works_count ON authors_recent_works(recent_works_count);
CREATE INDEX IF NOT EXISTS idx_recent_works_max_vv ON authors_recent_works(max_vv_in_recent DESC NULLS LAST);

COMMENT ON TABLE authors_recent_works IS '最近作品表-最近10个作品详情';

-- ============================================
-- 10. authors_game_data - 游戏达人数据表
-- ============================================
CREATE TABLE IF NOT EXISTS authors_game_data (
    author_id TEXT PRIMARY KEY REFERENCES authors_core(author_id) ON DELETE CASCADE,
    
    -- 游戏类型
    game_type TEXT,
    
    -- 90天游戏作品数据
    game_item_count_90d BIGINT,
    
    -- 组件点击数据（JSONB区间）
    median_game_item_component_click_range JSONB,
    median_game_item_component_click_90_days BIGINT,
    
    -- CPC数据（JSONB区间）
    median_game_item_cpc_range JSONB,
    median_game_item_cpc_90_days_range JSONB,
    
    -- CTR数据
    median_game_item_ctr_90_days DOUBLE PRECISION,
    
    -- 游戏达人活跃度（计算字段）
    is_game_creator BOOLEAN GENERATED ALWAYS AS (
        game_item_count_90d > 0
    ) STORED,
    
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_game_type ON authors_game_data(game_type) WHERE game_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_game_item_count ON authors_game_data(game_item_count_90d DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_game_is_creator ON authors_game_data(is_game_creator) WHERE is_game_creator = TRUE;
CREATE INDEX IF NOT EXISTS idx_game_component_click ON authors_game_data USING gin(median_game_item_component_click_range);
CREATE INDEX IF NOT EXISTS idx_game_cpc_range ON authors_game_data USING gin(median_game_item_cpc_range);

COMMENT ON TABLE authors_game_data IS '游戏达人数据表-游戏垂直领域';
COMMENT ON COLUMN authors_game_data.is_game_creator IS '是否游戏创作者（有游戏作品）';

-- ============================================
-- 11. authors_content_vertical - 内容垂直领域数据表
-- ============================================
CREATE TABLE IF NOT EXISTS authors_content_vertical (
    author_id TEXT PRIMARY KEY REFERENCES authors_core(author_id) ON DELETE CASCADE,
    
    -- 90天内容作品数据
    content_item_count_90d BIGINT,
    
    -- 组件点击（JSONB区间）
    median_content_item_component_click_range JSONB,
    
    -- CPC数据（JSONB区间）
    median_content_item_cpc_range JSONB,
    
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_content_item_count ON authors_content_vertical(content_item_count_90d DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_content_component_click ON authors_content_vertical USING gin(median_content_item_component_click_range);
CREATE INDEX IF NOT EXISTS idx_content_cpc_range ON authors_content_vertical USING gin(median_content_item_cpc_range);

COMMENT ON TABLE authors_content_vertical IS '内容垂直领域数据表';

-- ============================================
-- 12. authors_tool_vertical - 工具垂直领域数据表
-- ============================================
CREATE TABLE IF NOT EXISTS authors_tool_vertical (
    author_id TEXT PRIMARY KEY REFERENCES authors_core(author_id) ON DELETE CASCADE,
    
    -- 90天工具作品数据
    tool_item_count_90d BIGINT,
    
    -- 组件点击（JSONB区间）
    median_tool_item_component_click_range JSONB,
    
    -- CPC数据（JSONB区间）
    median_tool_item_cpc_range JSONB,
    
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_tool_item_count ON authors_tool_vertical(tool_item_count_90d DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_tool_component_click ON authors_tool_vertical USING gin(median_tool_item_component_click_range);
CREATE INDEX IF NOT EXISTS idx_tool_cpc_range ON authors_tool_vertical USING gin(median_tool_item_cpc_range);

COMMENT ON TABLE authors_tool_vertical IS '工具垂直领域数据表';

-- ============================================
-- 完成提示
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ 作品层+垂直领域层表结构创建完成！';
    RAISE NOTICE '已创建5个表：';
    RAISE NOTICE '  8. authors_star_videos_90d - 星图视频数据（90天）';
    RAISE NOTICE '  9. authors_recent_works - 最近作品';
    RAISE NOTICE '  10. authors_game_data - 游戏达人数据';
    RAISE NOTICE '  11. authors_content_vertical - 内容垂直领域';
    RAISE NOTICE '  12. authors_tool_vertical - 工具垂直领域';
    RAISE NOTICE '已创建15+个索引';
    RAISE NOTICE '新功能：活跃创作者识别、垂直领域分析';
END $$;
