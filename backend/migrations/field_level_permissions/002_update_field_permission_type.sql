-- =====================================================
-- 字段级权限类型更新脚本
-- 执行时间: 2026-01-06
-- 说明: 将字段级权限的类型从 API 改为 FIELD
-- =====================================================

-- 开始事务
BEGIN;

-- ===== 1. 添加 FIELD 枚举值到 permission_type =====
-- PostgreSQL 添加枚举值
DO $$ 
BEGIN
    -- 检查 FIELD 值是否已存在
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'FIELD' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'permission_type')
    ) THEN
        ALTER TYPE permission_type ADD VALUE 'FIELD';
    END IF;
END $$;

-- 提交枚举更改（需要在单独的事务中）
COMMIT;

-- 开始新事务更新数据
BEGIN;

-- ===== 2. 更新达人广场字段权限类型 =====
UPDATE permissions 
SET type = 'FIELD'::permission_type
WHERE code LIKE 'influencer:field:%';

-- ===== 3. 更新省广达人库字段权限类型 =====
UPDATE permissions 
SET type = 'FIELD'::permission_type
WHERE code LIKE 'kol:field:%';

-- ===== 4. 验证结果 =====
SELECT code, name, type, 
       frontend_meta->>'pageLocation' as page_location
FROM permissions 
WHERE type = 'FIELD'
ORDER BY code;

-- 提交事务
COMMIT;
