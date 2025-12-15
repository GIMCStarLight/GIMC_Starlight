-- 添加爬虫数据字段到 authors_core 表
-- 来自 get_author_base_info 和 get_author_platform_channel_info_v2 接口

-- 添加 unique_id 字段（抖音号）
ALTER TABLE authors_core 
ADD COLUMN IF NOT EXISTS unique_id TEXT;

-- 添加 sec_uid 字段（安全ID）
ALTER TABLE authors_core 
ADD COLUMN IF NOT EXISTS sec_uid TEXT;

-- 添加 short_id 字段（抖音短ID）
ALTER TABLE authors_core 
ADD COLUMN IF NOT EXISTS short_id TEXT;

-- 添加 has_phone 字段（是否有手机号）
ALTER TABLE authors_core 
ADD COLUMN IF NOT EXISTS has_phone BOOLEAN DEFAULT FALSE;

-- 添加 mcn_name 字段（MCN机构名称）
ALTER TABLE authors_core 
ADD COLUMN IF NOT EXISTS mcn_name TEXT;

-- 添加 self_intro 字段（自我介绍）
ALTER TABLE authors_core 
ADD COLUMN IF NOT EXISTS self_intro TEXT;

-- 添加 platform 字段（支持平台数组）
ALTER TABLE authors_core 
ADD COLUMN IF NOT EXISTS platform INTEGER[];

-- 添加 platform_channel 字段（支持渠道数组）
ALTER TABLE authors_core 
ADD COLUMN IF NOT EXISTS platform_channel INTEGER[];

-- 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_authors_core_mcn_name ON authors_core(mcn_name);
CREATE INDEX IF NOT EXISTS idx_authors_core_unique_id ON authors_core(unique_id);
CREATE INDEX IF NOT EXISTS idx_authors_core_has_phone ON authors_core(has_phone);

-- 添加注释
COMMENT ON COLUMN authors_core.unique_id IS '抖音号（unique_id）';
COMMENT ON COLUMN authors_core.sec_uid IS '安全ID（sec_uid）';
COMMENT ON COLUMN authors_core.short_id IS '抖音短ID（short_id）';
COMMENT ON COLUMN authors_core.has_phone IS '是否有手机号';
COMMENT ON COLUMN authors_core.mcn_name IS 'MCN机构名称';
COMMENT ON COLUMN authors_core.self_intro IS '自我介绍（来自 get_author_platform_channel_info_v2）';
COMMENT ON COLUMN authors_core.platform IS '支持平台数组（1-抖音 2-快手 3-视频号 4-小红书 5-微博 6-B站）';
COMMENT ON COLUMN authors_core.platform_channel IS '支持渠道数组（1-通用 2-小店随心推 3-千川 10-巨量引擎 21-星图）';
