-- 为权限表添加前端映射元数据字段
-- 该字段存储前端路由、组件路径、UI元素定位等信息，解决权限管理认知不一致问题

-- 添加 frontend_meta 字段 (使用 JSONB 类型)
ALTER TABLE permissions 
ADD COLUMN IF NOT EXISTS frontend_meta JSONB;

-- 添加注释
COMMENT ON COLUMN permissions.frontend_meta IS '前端映射元数据: {routePath, componentPath, elementLocator, pageLocation, businessModule}';

-- 创建索引以优化 JSONB 查询性能
CREATE INDEX IF NOT EXISTS idx_permissions_frontend_meta 
ON permissions USING GIN (frontend_meta);

-- 示例数据更新 (可选)
-- 更新已有权限的前端元数据
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/system/user',
  'componentPath', 'src/views/system/user/index.vue',
  'pageLocation', '系统管理 > 用户管理 > 用户列表',
  'businessModule', '用户管理'
)
WHERE code = 'user:view';

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/system/user',
  'componentPath', 'src/views/system/user/index.vue',
  'elementLocator', '#create-user-btn',
  'pageLocation', '系统管理 > 用户管理 > 顶部操作栏 > 新建用户按钮',
  'businessModule', '用户管理'
)
WHERE code = 'user:create';

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/kol',
  'componentPath', 'src/views/kol/index.vue',
  'elementLocator', '#export-btn',
  'pageLocation', 'KOL数据管理 > 顶部操作栏 > 导出按钮',
  'businessModule', 'KOL数据管理'
)
WHERE code = 'kol:export';

-- 查询验证
SELECT id, name, code, type, frontend_meta 
FROM permissions 
WHERE frontend_meta IS NOT NULL
LIMIT 10;
