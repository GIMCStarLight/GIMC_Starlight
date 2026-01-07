-- =====================================================
-- 字段级权限控制 - 回滚脚本
-- 说明: 删除所有字段级权限记录，恢复到迁移前状态
-- =====================================================

-- 开始事务
BEGIN;

-- 1. 删除达人广场字段权限
DELETE FROM permissions WHERE code IN (
  'influencer:field:basic',
  'influencer:field:follower',
  'influencer:field:interaction',
  'influencer:field:price',
  'influencer:field:contact',
  'influencer:field:ecommerce',
  'influencer:field:marketing',
  'influencer:field:star_video',
  'influencer:field:prospective',
  'influencer:field:tags'
);

-- 2. 删除省广达人库字段权限
DELETE FROM permissions WHERE code IN (
  'kol:field:basic',
  'kol:field:price',
  'kol:field:rebate',
  'kol:field:contact',
  'kol:field:cooperation',
  'kol:field:match'
);

-- 3. 删除角色与字段权限的关联（如果有）
DELETE FROM role_permissions 
WHERE permission_id IN (
  SELECT id FROM permissions 
  WHERE code LIKE 'influencer:field:%' OR code LIKE 'kol:field:%'
);

-- 4. 验证删除结果
SELECT COUNT(*) as remaining_field_permissions
FROM permissions 
WHERE code LIKE '%:field:%';

-- 提交事务
COMMIT;

-- 输出回滚成功信息
SELECT '字段级权限回滚成功' as message;
