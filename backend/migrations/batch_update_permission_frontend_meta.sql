-- 批量更新权限前端元数据
-- 基于实际前端页面结构为权限配置前端映射信息

-- ===== 角色管理模块 =====
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/system/role',
  'componentPath', 'src/views/system/role/index.vue',
  'pageLocation', '系统管理 > 角色管理 > 角色列表',
  'businessModule', '角色管理'
)
WHERE code = 'role:view' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/system/role',
  'componentPath', 'src/views/system/role/index.vue',
  'elementLocator', '#create-role-btn',
  'pageLocation', '系统管理 > 角色管理 > 顶部操作栏 > 新建角色按钮',
  'businessModule', '角色管理'
)
WHERE code = 'role:create' AND frontend_meta IS NULL;

-- ===== 权限管理模块 =====
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/system/permission',
  'componentPath', 'src/views/system/permission/index.vue',
  'pageLocation', '系统管理 > 权限管理 > 权限列表',
  'businessModule', '权限管理'
)
WHERE code = 'permission:view' AND frontend_meta IS NULL;

-- ===== 财务管理模块 =====
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/financial-management',
  'componentPath', 'src/views/financial-management/index.vue',
  'pageLocation', '财务管理 > 返点政策管理',
  'businessModule', '财务管理'
)
WHERE code = 'finance:access' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/financial-management',
  'componentPath', 'src/views/financial-management/index.vue',
  'pageLocation', '财务管理 > 返点政策管理 > 政策列表',
  'businessModule', '财务管理'
)
WHERE code = 'finance:rebate:view' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/rebate-flow',
  'componentPath', 'src/views/rebate-flow/index.vue',
  'pageLocation', '财务管理 > 返点流水',
  'businessModule', '财务管理'
)
WHERE code = 'finance:rebate:flow:view' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/rebate-flow',
  'componentPath', 'src/views/rebate-flow/index.vue',
  'elementLocator', '#export-flow-btn',
  'pageLocation', '财务管理 > 返点流水 > 顶部操作栏 > 导出按钮',
  'businessModule', '财务管理'
)
WHERE code = 'finance:rebate:flow:export' AND frontend_meta IS NULL;

-- ===== 供应商管理模块 =====
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/supplier-management',
  'componentPath', 'src/views/supplier-management/index.vue',
  'pageLocation', '供应商管理 > 供应商列表',
  'businessModule', '供应商管理'
)
WHERE code = 'supplier:view' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/supplier-management',
  'componentPath', 'src/views/supplier-management/index.vue',
  'elementLocator', '#create-supplier-btn',
  'pageLocation', '供应商管理 > 顶部操作栏 > 新建供应商按钮',
  'businessModule', '供应商管理'
)
WHERE code = 'supplier:create' AND frontend_meta IS NULL;

-- ===== AI助手模块 =====
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/ai-assistant',
  'componentPath', 'src/views/ai-assistant/index.vue',
  'pageLocation', 'AI助手 > AI对话界面',
  'businessModule', 'AI助手'
)
WHERE code = 'ai:assistant:view' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/ai-assistant',
  'componentPath', 'src/views/ai-assistant/index.vue',
  'elementLocator', '#chat-input',
  'pageLocation', 'AI助手 > AI对话 > 输入框',
  'businessModule', 'AI助手'
)
WHERE code = 'ai:assistant:chat' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/ai-number-selection',
  'componentPath', 'src/views/ai-number-selection/index.vue',
  'pageLocation', 'AI助手 > AI选号',
  'businessModule', 'AI助手'
)
WHERE code = 'ai:number:selection:view' AND frontend_meta IS NULL;

-- ===== 达人管理模块 =====
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/influencer-management',
  'componentPath', 'src/views/influencer-management/index.vue',
  'pageLocation', '达人管理 > 达人列表',
  'businessModule', '达人管理'
)
WHERE code = 'influencer:view' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/influencer-management',
  'componentPath', 'src/views/influencer-management/index.vue',
  'elementLocator', '#create-influencer-btn',
  'pageLocation', '达人管理 > 顶部操作栏 > 新建达人按钮',
  'businessModule', '达人管理'
)
WHERE code = 'influencer:create' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/influencer-management',
  'componentPath', 'src/views/influencer-management/index.vue',
  'elementLocator', '#export-influencer-btn',
  'pageLocation', '达人管理 > 顶部操作栏 > 导出按钮',
  'businessModule', '达人管理'
)
WHERE code = 'influencer:export' AND frontend_meta IS NULL;

-- ===== KOL额外权限 =====
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/kol',
  'componentPath', 'src/views/kol/index.vue',
  'elementLocator', '#create-kol-btn',
  'pageLocation', 'KOL数据管理 > 顶部操作栏 > 新建KOL按钮',
  'businessModule', 'KOL数据管理'
)
WHERE code = 'kol:create' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/kol',
  'componentPath', 'src/views/kol/index.vue',
  'elementLocator', '.edit-kol-btn',
  'pageLocation', 'KOL数据管理 > KOL列表 > 操作列 > 编辑按钮',
  'businessModule', 'KOL数据管理'
)
WHERE code = 'kol:update' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/kol',
  'componentPath', 'src/views/kol/index.vue',
  'elementLocator', '.delete-kol-btn',
  'pageLocation', 'KOL数据管理 > KOL列表 > 操作列 > 删除按钮',
  'businessModule', 'KOL数据管理'
)
WHERE code = 'kol:delete' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/kol-evaluation',
  'componentPath', 'src/views/kol-evaluation/index.vue',
  'pageLocation', 'KOL数据管理 > KOL评估',
  'businessModule', 'KOL数据管理'
)
WHERE code = 'kol:review:view' AND frontend_meta IS NULL;

-- ===== 工单管理模块 =====
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/work-order',
  'componentPath', 'src/views/work-order/index.vue',
  'pageLocation', '工单管理 > 工单列表',
  'businessModule', '工单管理'
)
WHERE code = 'work-order:view' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/work-order',
  'componentPath', 'src/views/work-order/index.vue',
  'elementLocator', '#create-work-order-btn',
  'pageLocation', '工单管理 > 顶部操作栏 > 创建工单按钮',
  'businessModule', '工单管理'
)
WHERE code = 'work-order:create' AND frontend_meta IS NULL;

-- ===== 标签管理模块 =====
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/tag-management',
  'componentPath', 'src/views/tag-management/index.vue',
  'pageLocation', '标签管理 > 标签列表',
  'businessModule', '标签管理'
)
WHERE code = 'tag:view' AND frontend_meta IS NULL;

-- ===== 数据导出权限 =====
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'pageLocation', '全局 > 数据导出功能',
  'businessModule', '数据管理'
)
WHERE code = 'data:export' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'pageLocation', '全局 > 敏感数据导出功能',
  'businessModule', '数据管理'
)
WHERE code = 'data:export_sensitive' AND frontend_meta IS NULL;

-- 查询更新结果统计
SELECT 
  CASE 
    WHEN frontend_meta IS NOT NULL THEN '已配置'
    ELSE '未配置'
  END as 配置状态,
  COUNT(*) as 数量
FROM permissions 
WHERE status = 1
GROUP BY (frontend_meta IS NOT NULL)
ORDER BY 配置状态;

-- 展示已配置元数据的权限示例
SELECT 
  code as 权限代码,
  name as 权限名称,
  frontend_meta->>'businessModule' as 业务模块,
  frontend_meta->>'pageLocation' as 页面位置
FROM permissions 
WHERE frontend_meta IS NOT NULL 
  AND status = 1
ORDER BY frontend_meta->>'businessModule', code
LIMIT 20;
