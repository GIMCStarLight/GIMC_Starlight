-- =====================================================
-- 批量更新最后29个权限的前端映射元数据
-- 执行时间: 2026-01-06
-- 说明: 补充剩余未配置权限的前端页面位置等元数据信息
-- =====================================================

-- 1. 系统配置 (system:config)
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/system/config',
  'componentPath', 'src/views/system/config/index.vue',
  'pageLocation', '系统管理 > 系统配置',
  'businessModule', '系统管理'
)
WHERE code = 'system:config' AND frontend_meta IS NULL;

-- 2. 项目管理相关 (project:manage, project:view)
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/project',
  'componentPath', 'src/views/project/index.vue',
  'pageLocation', '项目管理 > 主菜单',
  'businessModule', '项目管理'
)
WHERE code = 'project:manage' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/project',
  'componentPath', 'src/views/project/index.vue',
  'pageLocation', '项目管理 > 项目列表',
  'businessModule', '项目管理'
)
WHERE code = 'project:view' AND frontend_meta IS NULL;

-- 3. 角色管理相关 (role:manage, role:update, role:delete)
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/system/role',
  'componentPath', 'src/views/system/role/index.vue',
  'pageLocation', '系统管理 > 角色管理 > 主菜单',
  'businessModule', '角色管理'
)
WHERE code = 'role:manage' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/system/role',
  'componentPath', 'src/views/system/role/index.vue',
  'elementLocator', '.role-update-btn',
  'pageLocation', '系统管理 > 角色管理 > 编辑角色按钮',
  'businessModule', '角色管理'
)
WHERE code = 'role:update' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/system/role',
  'componentPath', 'src/views/system/role/index.vue',
  'elementLocator', '.role-delete-btn',
  'pageLocation', '系统管理 > 角色管理 > 删除角色按钮',
  'businessModule', '角色管理'
)
WHERE code = 'role:delete' AND frontend_meta IS NULL;

-- 4. 用户管理相关 (user:update, user:delete)
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/system/user',
  'componentPath', 'src/views/system/user/index.vue',
  'elementLocator', '.user-update-btn',
  'pageLocation', '系统管理 > 用户管理 > 编辑用户按钮',
  'businessModule', '用户管理'
)
WHERE code = 'user:update' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/system/user',
  'componentPath', 'src/views/system/user/index.vue',
  'elementLocator', '.user-delete-btn',
  'pageLocation', '系统管理 > 用户管理 > 删除用户按钮',
  'businessModule', '用户管理'
)
WHERE code = 'user:delete' AND frontend_meta IS NULL;

-- 5. 标签管理相关 (tag:manage, tag:create, tag:update, tag:delete)
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/tag',
  'componentPath', 'src/views/tag/index.vue',
  'pageLocation', '标签管理 > 主菜单',
  'businessModule', '标签管理'
)
WHERE code = 'tag:manage' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/tag',
  'componentPath', 'src/views/tag/index.vue',
  'elementLocator', '#create-tag-btn',
  'pageLocation', '标签管理 > 创建标签按钮',
  'businessModule', '标签管理'
)
WHERE code = 'tag:create' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/tag',
  'componentPath', 'src/views/tag/index.vue',
  'elementLocator', '.tag-update-btn',
  'pageLocation', '标签管理 > 编辑标签按钮',
  'businessModule', '标签管理'
)
WHERE code = 'tag:update' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/tag',
  'componentPath', 'src/views/tag/index.vue',
  'elementLocator', '.tag-delete-btn',
  'pageLocation', '标签管理 > 删除标签按钮',
  'businessModule', '标签管理'
)
WHERE code = 'tag:delete' AND frontend_meta IS NULL;

-- 6. 供应商管理相关 (supplier:update, supplier:delete, supplier:batch:create, supplier:batch:delete, supplier:template:download)
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/supplier',
  'componentPath', 'src/views/supplier/index.vue',
  'elementLocator', '.supplier-update-btn',
  'pageLocation', '供应商管理 > 编辑供应商按钮',
  'businessModule', '供应商管理'
)
WHERE code = 'supplier:update' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/supplier',
  'componentPath', 'src/views/supplier/index.vue',
  'elementLocator', '.supplier-delete-btn',
  'pageLocation', '供应商管理 > 删除供应商按钮',
  'businessModule', '供应商管理'
)
WHERE code = 'supplier:delete' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/supplier',
  'componentPath', 'src/views/supplier/index.vue',
  'elementLocator', '#batch-create-supplier-btn',
  'pageLocation', '供应商管理 > 批量创建供应商按钮',
  'businessModule', '供应商管理'
)
WHERE code = 'supplier:batch:create' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/supplier',
  'componentPath', 'src/views/supplier/index.vue',
  'elementLocator', '#batch-delete-supplier-btn',
  'pageLocation', '供应商管理 > 批量删除供应商按钮',
  'businessModule', '供应商管理'
)
WHERE code = 'supplier:batch:delete' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/supplier',
  'componentPath', 'src/views/supplier/index.vue',
  'elementLocator', '#download-template-btn',
  'pageLocation', '供应商管理 > 下载导入模板按钮',
  'businessModule', '供应商管理'
)
WHERE code = 'supplier:template:download' AND frontend_meta IS NULL;

-- 7. 数据上传导入相关 (upload:excel, upload:validate, upload:import)
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/upload',
  'componentPath', 'src/views/upload/index.vue',
  'elementLocator', '#upload-excel-btn',
  'pageLocation', '数据导入 > Excel上传按钮',
  'businessModule', '数据导入'
)
WHERE code = 'upload:excel' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/upload',
  'componentPath', 'src/views/upload/index.vue',
  'elementLocator', '#validate-data-btn',
  'pageLocation', '数据导入 > 数据验证按钮',
  'businessModule', '数据导入'
)
WHERE code = 'upload:validate' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/upload',
  'componentPath', 'src/views/upload/index.vue',
  'elementLocator', '#import-data-btn',
  'pageLocation', '数据导入 > 导入数据按钮',
  'businessModule', '数据导入'
)
WHERE code = 'upload:import' AND frontend_meta IS NULL;

-- 8. 资源管理相关 (resource:access, resource:influencer:view)
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/resource',
  'componentPath', 'src/views/resource/index.vue',
  'pageLocation', '资源管理 > 主菜单',
  'businessModule', '资源管理'
)
WHERE code = 'resource:access' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/resource/influencer',
  'componentPath', 'src/views/resource/influencer/index.vue',
  'pageLocation', '资源管理 > 达人资源 > 达人列表',
  'businessModule', '资源达人管理'
)
WHERE code = 'resource:influencer:view' AND frontend_meta IS NULL;

-- 9. 来源账号查看 (source:account:view)
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/source/account',
  'componentPath', 'src/views/source/account/index.vue',
  'pageLocation', '来源管理 > 账号管理 > 账号列表',
  'businessModule', '来源账号管理'
)
WHERE code = 'source:account:view' AND frontend_meta IS NULL;

-- 10. SQL机器人配置查看 (sqlbot:config:view)
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/sqlbot',
  'componentPath', 'src/views/sqlbot/config.vue',
  'pageLocation', 'SQL机器人 > 配置管理 > 配置列表',
  'businessModule', 'SQL机器人'
)
WHERE code = 'sqlbot:config:view' AND frontend_meta IS NULL;

-- 11. 工单管理相关 (work-order:access, work-order:update, work-order:delete, work-order:assign, work-order:update-status)
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/work-order',
  'componentPath', 'src/views/work-order/index.vue',
  'pageLocation', '工单管理 > 主菜单',
  'businessModule', '工单管理'
)
WHERE code = 'work-order:access' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/work-order',
  'componentPath', 'src/views/work-order/index.vue',
  'elementLocator', '.work-order-update-btn',
  'pageLocation', '工单管理 > 编辑工单按钮',
  'businessModule', '工单管理'
)
WHERE code = 'work-order:update' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/work-order',
  'componentPath', 'src/views/work-order/index.vue',
  'elementLocator', '.work-order-delete-btn',
  'pageLocation', '工单管理 > 删除工单按钮',
  'businessModule', '工单管理'
)
WHERE code = 'work-order:delete' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/work-order',
  'componentPath', 'src/views/work-order/index.vue',
  'elementLocator', '#assign-work-order-btn',
  'pageLocation', '工单管理 > 分配工单按钮',
  'businessModule', '工单管理'
)
WHERE code = 'work-order:assign' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/work-order',
  'componentPath', 'src/views/work-order/index.vue',
  'elementLocator', '.update-status-btn',
  'pageLocation', '工单管理 > 更新状态按钮',
  'businessModule', '工单管理'
)
WHERE code = 'work-order:update-status' AND frontend_meta IS NULL;

-- 查询最终更新结果统计
SELECT 
  CASE 
    WHEN frontend_meta IS NOT NULL THEN '已配置'
    ELSE '未配置'
  END as 配置状态,
  COUNT(*) as 数量
FROM permissions 
WHERE status = 1
GROUP BY (frontend_meta IS NOT NULL)
ORDER BY 配置状态 DESC;

-- 显示已配置的权限总数
SELECT 
  COUNT(*) as 已配置权限总数
FROM permissions 
WHERE status = 1 AND frontend_meta IS NOT NULL;

-- 显示所有业务模块的权限配置统计
SELECT 
  frontend_meta->>'businessModule' as 业务模块,
  COUNT(*) as 权限数量
FROM permissions 
WHERE status = 1 AND frontend_meta IS NOT NULL
GROUP BY frontend_meta->>'businessModule'
ORDER BY 权限数量 DESC;
