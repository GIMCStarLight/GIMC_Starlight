-- 修改 rebate_policy 字段类型从 smallint 改为 text
-- 目的：支持存储完整的返点政策描述，而不仅仅是 0/1

-- 1. 修改字段类型
ALTER TABLE kol_list 
ALTER COLUMN rebate_policy TYPE text USING rebate_policy::text;

-- 2. 移除默认值约束（因为 text 类型不需要默认值 0）
ALTER TABLE kol_list 
ALTER COLUMN rebate_policy DROP DEFAULT;

-- 3. 允许 NULL 值
ALTER TABLE kol_list 
ALTER COLUMN rebate_policy DROP NOT NULL;

-- 4. 更新注释
COMMENT ON COLUMN kol_list.rebate_policy IS '返点政策描述，如"0-50w: 25%，50-200w: 28%"';

-- 验证修改
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'kol_list' AND column_name = 'rebate_policy';
