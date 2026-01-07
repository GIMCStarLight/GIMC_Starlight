-- =====================================================
-- 添加缺失的日志管理权限
-- 执行时间: 2026-01-06
-- 说明: 代码中使用了log:read, log:export, log:delete权限但数据库中缺失
-- =====================================================

-- 1. 添加日志查看权限
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at)
SELECT 
  'log:read',
  '日志查看',
  '查看系统操作日志、登录日志等各类日志记录',
  'MENU'::permission_type,
  'log',
  'read',
  1,
  1,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'log:read');

-- 2. 添加日志导出权限
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at)
SELECT 
  'log:export',
  '日志导出',
  '导出系统日志记录为Excel或CSV文件',
  'BUTTON'::permission_type,
  'log',
  'export',
  2,
  1,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'log:export');

-- 3. 添加日志删除权限
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at)
SELECT 
  'log:delete',
  '日志删除',
  '删除或清理过期的系统日志记录',
  'BUTTON'::permission_type,
  'log',
  'delete',
  3,
  1,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'log:delete');

-- 4. 为日志权限配置前端元数据
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/system/logs',
  'componentPath', 'src/views/system/logs/index.vue',
  'pageLocation', '系统管理 > 日志管理 > 日志列表',
  'businessModule', '日志管理'
)
WHERE code = 'log:read' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/system/logs',
  'componentPath', 'src/views/system/logs/index.vue',
  'elementLocator', '#export-log-btn',
  'pageLocation', '系统管理 > 日志管理 > 导出按钮',
  'businessModule', '日志管理'
)
WHERE code = 'log:export' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/system/logs',
  'componentPath', 'src/views/system/logs/index.vue',
  'elementLocator', '#delete-log-btn',
  'pageLocation', '系统管理 > 日志管理 > 删除按钮',
  'businessModule', '日志管理'
)
WHERE code = 'log:delete' AND frontend_meta IS NULL;

-- 验证添加结果
SELECT code, name, description, type, status 
FROM permissions 
WHERE code LIKE 'log:%' 
ORDER BY sort;
