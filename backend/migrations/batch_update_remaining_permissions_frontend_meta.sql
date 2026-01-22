-- =====================================================
-- 批量更新剩余96个权限的前端映射元数据
-- 执行时间: 2026-01-06
-- 说明: 为未配置的权限补充前端页面位置等元数据信息
-- =====================================================

-- 1. 系统管理相关权限 (admin:access)
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/system',
  'componentPath', 'src/views/system/index.vue',
  'pageLocation', '系统管理 > 主菜单',
  'businessModule', '系统管理'
)
WHERE code = 'admin:access' AND frontend_meta IS NULL;

-- 2. 权限管理相关 (permission:*)
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/system/permission',
  'componentPath', 'src/views/system/permission/index.vue',
  'elementLocator', '#create-permission-btn',
  'pageLocation', '系统管理 > 权限管理 > 新建按钮',
  'businessModule', '权限管理'
)
WHERE code = 'permission:create' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/system/permission',
  'componentPath', 'src/views/system/permission/index.vue',
  'elementLocator', '.permission-edit-btn',
  'pageLocation', '系统管理 > 权限管理 > 编辑按钮',
  'businessModule', '权限管理'
)
WHERE code = 'permission:update' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/system/permission',
  'componentPath', 'src/views/system/permission/index.vue',
  'elementLocator', '.permission-delete-btn',
  'pageLocation', '系统管理 > 权限管理 > 删除按钮',
  'businessModule', '权限管理'
)
WHERE code = 'permission:delete' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/system/role',
  'componentPath', 'src/views/system/role/components/PermissionSelector.vue',
  'elementLocator', '.permission-assign-dialog',
  'pageLocation', '系统管理 > 角色管理 > 权限分配对话框',
  'businessModule', '权限管理'
)
WHERE code = 'permission:assign' AND frontend_meta IS NULL;

-- 3. 菜单管理 (menu:read)
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/system/menu',
  'componentPath', 'src/api/core/menu.ts',
  'pageLocation', '系统管理 > 菜单数据读取接口',
  'businessModule', '菜单管理'
)
WHERE code = 'menu:read' AND frontend_meta IS NULL;

-- 4. 媒介管理相关 (media:*)
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/media',
  'componentPath', 'src/views/media/index.vue',
  'pageLocation', '媒介管理 > 媒介列表',
  'businessModule', '媒介管理'
)
WHERE code = 'media:view' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/media/buy',
  'componentPath', 'src/views/media/buy.vue',
  'elementLocator', '#buy-media-btn',
  'pageLocation', '媒介管理 > 媒介购买',
  'businessModule', '媒介管理'
)
WHERE code = 'media:buy' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/media/report',
  'componentPath', 'src/views/media/report.vue',
  'pageLocation', '媒介管理 > 媒介报告',
  'businessModule', '媒介管理'
)
WHERE code = 'media:report' AND frontend_meta IS NULL;

-- 5. 项目管理相关 (project:*)
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/project',
  'componentPath', 'src/views/project/index.vue',
  'elementLocator', '#create-project-btn',
  'pageLocation', '项目管理 > 新建项目按钮',
  'businessModule', '项目管理'
)
WHERE code = 'project:create' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/project',
  'componentPath', 'src/views/project/index.vue',
  'elementLocator', '.project-update-btn',
  'pageLocation', '项目管理 > 编辑项目按钮',
  'businessModule', '项目管理'
)
WHERE code = 'project:update' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/project',
  'componentPath', 'src/views/project/index.vue',
  'elementLocator', '.project-delete-btn',
  'pageLocation', '项目管理 > 删除项目按钮',
  'businessModule', '项目管理'
)
WHERE code = 'project:delete' AND frontend_meta IS NULL;

-- 6. 达人管理菜单 (influencer:manage)
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/influencer',
  'componentPath', 'src/views/influencer/index.vue',
  'pageLocation', '达人管理 > 主菜单',
  'businessModule', '达人管理'
)
WHERE code = 'influencer:manage' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/influencer',
  'componentPath', 'src/views/influencer/index.vue',
  'elementLocator', '.influencer-update-btn',
  'pageLocation', '达人管理 > 编辑达人按钮',
  'businessModule', '达人管理'
)
WHERE code = 'influencer:update' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/influencer',
  'componentPath', 'src/views/influencer/index.vue',
  'elementLocator', '.influencer-delete-btn',
  'pageLocation', '达人管理 > 删除达人按钮',
  'businessModule', '达人管理'
)
WHERE code = 'influencer:delete' AND frontend_meta IS NULL;

-- 7. 达人筛选相关 (influencer:filter:*)
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/influencer',
  'componentPath', 'src/views/influencer/components/AdvancedFilter.vue',
  'elementLocator', '#advanced-filter-btn',
  'pageLocation', '达人管理 > 高级筛选按钮',
  'businessModule', '达人管理'
)
WHERE code = 'influencer:filter:advanced' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/influencer',
  'componentPath', 'src/views/influencer/components/QuickFilter.vue',
  'elementLocator', '.quick-filter-bar',
  'pageLocation', '达人管理 > 快速筛选栏',
  'businessModule', '达人管理'
)
WHERE code = 'influencer:filter:quick' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/influencer',
  'componentPath', 'src/views/influencer/components/FilterStats.vue',
  'pageLocation', '达人管理 > 筛选统计信息',
  'businessModule', '达人管理'
)
WHERE code = 'influencer:filter:stats' AND frontend_meta IS NULL;

-- 8. KOL基础操作 (kol:view, kol:batch:*)
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/kol',
  'componentPath', 'src/views/kol/index.vue',
  'pageLocation', 'KOL数据管理 > KOL列表',
  'businessModule', 'KOL数据管理'
)
WHERE code = 'kol:view' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/kol',
  'componentPath', 'src/views/kol/index.vue',
  'elementLocator', '#batch-create-btn',
  'pageLocation', 'KOL数据管理 > 批量创建按钮',
  'businessModule', 'KOL数据管理'
)
WHERE code = 'kol:batch:create' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/kol',
  'componentPath', 'src/views/kol/index.vue',
  'elementLocator', '#batch-delete-btn',
  'pageLocation', 'KOL数据管理 > 批量删除按钮',
  'businessModule', 'KOL数据管理'
)
WHERE code = 'kol:batch:delete' AND frontend_meta IS NULL;

-- 9. KOL匹配管理 (kol:match:*)
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/kol/match',
  'componentPath', 'src/views/kol/match/index.vue',
  'pageLocation', 'KOL数据管理 > KOL匹配列表',
  'businessModule', 'KOL匹配管理'
)
WHERE code = 'kol:match:view' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/kol/match',
  'componentPath', 'src/views/kol/match/index.vue',
  'elementLocator', '#create-match-btn',
  'pageLocation', 'KOL数据管理 > KOL匹配 > 创建按钮',
  'businessModule', 'KOL匹配管理'
)
WHERE code = 'kol:match:create' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/kol/match',
  'componentPath', 'src/views/kol/match/index.vue',
  'elementLocator', '.match-update-btn',
  'pageLocation', 'KOL数据管理 > KOL匹配 > 编辑按钮',
  'businessModule', 'KOL匹配管理'
)
WHERE code = 'kol:match:update' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/kol/match',
  'componentPath', 'src/views/kol/match/index.vue',
  'elementLocator', '.match-delete-btn',
  'pageLocation', 'KOL数据管理 > KOL匹配 > 删除按钮',
  'businessModule', 'KOL匹配管理'
)
WHERE code = 'kol:match:delete' AND frontend_meta IS NULL;

-- 10. KOL评审相关 (kol:review:*)
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/kol/review',
  'componentPath', 'src/views/kol/review/index.vue',
  'elementLocator', '#create-review-btn',
  'pageLocation', 'KOL数据管理 > KOL评审 > 创建按钮',
  'businessModule', 'KOL评审管理'
)
WHERE code = 'kol:review:create' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/kol/review',
  'componentPath', 'src/views/kol/review/index.vue',
  'elementLocator', '.review-update-btn',
  'pageLocation', 'KOL数据管理 > KOL评审 > 编辑按钮',
  'businessModule', 'KOL评审管理'
)
WHERE code = 'kol:review:update' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/kol/review',
  'componentPath', 'src/views/kol/review/index.vue',
  'elementLocator', '#approve-review-btn',
  'pageLocation', 'KOL数据管理 > KOL评审 > 审批按钮',
  'businessModule', 'KOL评审管理'
)
WHERE code = 'kol:review:approve' AND frontend_meta IS NULL;

-- 11. KOL同步管理 (kol:sync:*)
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/kol/sync',
  'componentPath', 'src/views/kol/sync/index.vue',
  'elementLocator', '#trigger-sync-btn',
  'pageLocation', 'KOL数据管理 > KOL同步 > 触发同步按钮',
  'businessModule', 'KOL同步管理'
)
WHERE code = 'kol:sync:trigger' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/kol/sync',
  'componentPath', 'src/views/kol/sync/index.vue',
  'elementLocator', '.sync-status-panel',
  'pageLocation', 'KOL数据管理 > KOL同步 > 同步状态面板',
  'businessModule', 'KOL同步管理'
)
WHERE code = 'kol:sync:status' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/kol/sync',
  'componentPath', 'src/views/kol/sync/history.vue',
  'pageLocation', 'KOL数据管理 > KOL同步 > 同步历史',
  'businessModule', 'KOL同步管理'
)
WHERE code = 'kol:sync:history' AND frontend_meta IS NULL;

-- 12. 财务返点管理 (finance:rebate:*)
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/finance/rebate',
  'componentPath', 'src/views/finance/rebate/index.vue',
  'elementLocator', '#export-rebate-btn',
  'pageLocation', '财务管理 > 返点管理 > 导出按钮',
  'businessModule', '返点管理'
)
WHERE code = 'finance:rebate:export' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/finance/rebate',
  'componentPath', 'src/views/finance/rebate/detail.vue',
  'pageLocation', '财务管理 > 返点管理 > 返点详情页',
  'businessModule', '返点管理'
)
WHERE code = 'finance:rebate:detail' AND frontend_meta IS NULL;

-- 13. 返点政策管理 (finance:rebate:policy:*)
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/finance/rebate/policy',
  'componentPath', 'src/views/finance/rebate/policy/index.vue',
  'pageLocation', '财务管理 > 返点政策 > 政策列表',
  'businessModule', '返点政策管理'
)
WHERE code = 'finance:rebate:policy:view' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/finance/rebate/policy',
  'componentPath', 'src/views/finance/rebate/policy/index.vue',
  'elementLocator', '#create-policy-btn',
  'pageLocation', '财务管理 > 返点政策 > 创建政策按钮',
  'businessModule', '返点政策管理'
)
WHERE code = 'finance:rebate:policy:create' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/finance/rebate/policy',
  'componentPath', 'src/views/finance/rebate/policy/index.vue',
  'elementLocator', '.policy-update-btn',
  'pageLocation', '财务管理 > 返点政策 > 编辑政策按钮',
  'businessModule', '返点政策管理'
)
WHERE code = 'finance:rebate:policy:update' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/finance/rebate/policy',
  'componentPath', 'src/views/finance/rebate/policy/index.vue',
  'elementLocator', '.policy-delete-btn',
  'pageLocation', '财务管理 > 返点政策 > 删除政策按钮',
  'businessModule', '返点政策管理'
)
WHERE code = 'finance:rebate:policy:delete' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/finance/rebate/policy',
  'componentPath', 'src/views/finance/rebate/policy/calculator.vue',
  'elementLocator', '#calculate-rebate-btn',
  'pageLocation', '财务管理 > 返点政策 > 计算返点按钮',
  'businessModule', '返点政策管理'
)
WHERE code = 'finance:rebate:policy:calculate' AND frontend_meta IS NULL;

-- 14. 返点流程管理 (finance:rebate:flow:*)
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/finance/rebate/flow',
  'componentPath', 'src/views/finance/rebate/flow/index.vue',
  'elementLocator', '.flow-update-btn',
  'pageLocation', '财务管理 > 返点流程 > 更新流程按钮',
  'businessModule', '返点流程管理'
)
WHERE code = 'finance:rebate:flow:update' AND frontend_meta IS NULL;

-- 15. 政策版本管理 (policy:*)
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/policy',
  'componentPath', 'src/views/policy/index.vue',
  'pageLocation', '政策管理 > 主菜单',
  'businessModule', '政策管理'
)
WHERE code = 'policy:access' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/policy/version',
  'componentPath', 'src/views/policy/version/index.vue',
  'pageLocation', '政策管理 > 版本列表',
  'businessModule', '政策版本管理'
)
WHERE code = 'policy:version:view' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/policy/version',
  'componentPath', 'src/views/policy/version/index.vue',
  'elementLocator', '#create-version-btn',
  'pageLocation', '政策管理 > 版本管理 > 创建版本按钮',
  'businessModule', '政策版本管理'
)
WHERE code = 'policy:version:create' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/policy/version',
  'componentPath', 'src/views/policy/version/index.vue',
  'elementLocator', '.version-update-btn',
  'pageLocation', '政策管理 > 版本管理 > 编辑版本按钮',
  'businessModule', '政策版本管理'
)
WHERE code = 'policy:version:update' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/policy/version',
  'componentPath', 'src/views/policy/version/index.vue',
  'elementLocator', '.version-delete-btn',
  'pageLocation', '政策管理 > 版本管理 > 删除版本按钮',
  'businessModule', '政策版本管理'
)
WHERE code = 'policy:version:delete' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/policy/version',
  'componentPath', 'src/views/policy/version/index.vue',
  'elementLocator', '#activate-version-btn',
  'pageLocation', '政策管理 > 版本管理 > 激活版本按钮',
  'businessModule', '政策版本管理'
)
WHERE code = 'policy:version:activate' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/policy/version',
  'componentPath', 'src/views/policy/version/compare.vue',
  'elementLocator', '#compare-version-btn',
  'pageLocation', '政策管理 > 版本管理 > 版本对比',
  'businessModule', '政策版本管理'
)
WHERE code = 'policy:version:compare' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/policy/version',
  'componentPath', 'src/views/policy/version/history.vue',
  'pageLocation', '政策管理 > 版本管理 > 版本历史',
  'businessModule', '政策版本管理'
)
WHERE code = 'policy:version:history' AND frontend_meta IS NULL;

-- 16. AI助手相关 (ai:assistant:*, ai:number:selection:*)
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/ai/assistant',
  'componentPath', 'src/views/ai/assistant/history.vue',
  'pageLocation', 'AI助手 > 对话历史',
  'businessModule', 'AI助手'
)
WHERE code = 'ai:assistant:history' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/ai/number-selection',
  'componentPath', 'src/views/ai/number-selection/index.vue',
  'elementLocator', '#use-ai-selection-btn',
  'pageLocation', 'AI助手 > AI选号 > 使用按钮',
  'businessModule', 'AI选号'
)
WHERE code = 'ai:number:selection:use' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/ai/number-selection',
  'componentPath', 'src/views/ai/number-selection/history.vue',
  'pageLocation', 'AI助手 > AI选号 > 选号历史',
  'businessModule', 'AI选号'
)
WHERE code = 'ai:number:selection:history' AND frontend_meta IS NULL;

-- 17. 资源达人管理 (resource:influencer:*)
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/resource/influencer',
  'componentPath', 'src/views/resource/influencer/index.vue',
  'elementLocator', '#create-influencer-btn',
  'pageLocation', '资源管理 > 达人资源 > 创建按钮',
  'businessModule', '资源达人管理'
)
WHERE code = 'resource:influencer:create' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/resource/influencer',
  'componentPath', 'src/views/resource/influencer/index.vue',
  'elementLocator', '.influencer-update-btn',
  'pageLocation', '资源管理 > 达人资源 > 编辑按钮',
  'businessModule', '资源达人管理'
)
WHERE code = 'resource:influencer:update' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/resource/influencer',
  'componentPath', 'src/views/resource/influencer/index.vue',
  'elementLocator', '.influencer-delete-btn',
  'pageLocation', '资源管理 > 达人资源 > 删除按钮',
  'businessModule', '资源达人管理'
)
WHERE code = 'resource:influencer:delete' AND frontend_meta IS NULL;

-- 18. 达人评价管理 (resource:influencer:evaluation:*)
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/resource/influencer/evaluation',
  'componentPath', 'src/views/resource/influencer/evaluation/index.vue',
  'pageLocation', '资源管理 > 达人资源 > 评价列表',
  'businessModule', '达人评价管理'
)
WHERE code = 'resource:influencer:evaluation:view' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/resource/influencer/evaluation',
  'componentPath', 'src/views/resource/influencer/evaluation/index.vue',
  'elementLocator', '#create-evaluation-btn',
  'pageLocation', '资源管理 > 达人资源 > 创建评价按钮',
  'businessModule', '达人评价管理'
)
WHERE code = 'resource:influencer:evaluation:create' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/resource/influencer/evaluation',
  'componentPath', 'src/views/resource/influencer/evaluation/index.vue',
  'elementLocator', '.evaluation-update-btn',
  'pageLocation', '资源管理 > 达人资源 > 编辑评价按钮',
  'businessModule', '达人评价管理'
)
WHERE code = 'resource:influencer:evaluation:update' AND frontend_meta IS NULL;

-- 19. SQL机器人相关 (sqlbot:*)
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/sqlbot',
  'componentPath', 'src/views/sqlbot/config.vue',
  'elementLocator', '.config-update-btn',
  'pageLocation', 'SQL机器人 > 配置管理 > 更新配置',
  'businessModule', 'SQL机器人'
)
WHERE code = 'sqlbot:config:update' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/sqlbot',
  'componentPath', 'src/views/sqlbot/datasource.vue',
  'pageLocation', 'SQL机器人 > 数据源列表',
  'businessModule', 'SQL机器人'
)
WHERE code = 'sqlbot:datasource:view' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/sqlbot',
  'componentPath', 'src/views/sqlbot/index.vue',
  'elementLocator', '#generate-token-btn',
  'pageLocation', 'SQL机器人 > 生成Token按钮',
  'businessModule', 'SQL机器人'
)
WHERE code = 'sqlbot:token:generate' AND frontend_meta IS NULL;

-- 20. 来源账号管理 (source:account:*)
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/source/account',
  'componentPath', 'src/views/source/account/index.vue',
  'elementLocator', '#create-account-btn',
  'pageLocation', '来源管理 > 账号管理 > 创建账号按钮',
  'businessModule', '来源账号管理'
)
WHERE code = 'source:account:create' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/source/account',
  'componentPath', 'src/views/source/account/index.vue',
  'elementLocator', '.account-update-btn',
  'pageLocation', '来源管理 > 账号管理 > 编辑账号按钮',
  'businessModule', '来源账号管理'
)
WHERE code = 'source:account:update' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/source/account',
  'componentPath', 'src/views/source/account/index.vue',
  'elementLocator', '.account-delete-btn',
  'pageLocation', '来源管理 > 账号管理 > 删除账号按钮',
  'businessModule', '来源账号管理'
)
WHERE code = 'source:account:delete' AND frontend_meta IS NULL;

-- 21. 导入功能相关 (upload:import:*)
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/upload',
  'componentPath', 'src/views/upload/history.vue',
  'pageLocation', '数据导入 > 导入历史',
  'businessModule', '数据导入'
)
WHERE code = 'upload:import:view' AND frontend_meta IS NULL;

UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/upload',
  'componentPath', 'src/views/upload/index.vue',
  'elementLocator', '#async-import-btn',
  'pageLocation', '数据导入 > 异步导入按钮',
  'businessModule', '数据导入'
)
WHERE code = 'upload:import:async' AND frontend_meta IS NULL;

-- 22. 角色管理相关 (role:*)
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/system/role',
  'componentPath', 'src/views/system/role/index.vue',
  'elementLocator', '.role-assign-btn',
  'pageLocation', '系统管理 > 角色管理 > 分配角色按钮',
  'businessModule', '角色管理'
)
WHERE code = 'role:assign' AND frontend_meta IS NULL;

-- 23. 用户管理相关 (user:manage)
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/system/user',
  'componentPath', 'src/views/system/user/index.vue',
  'pageLocation', '系统管理 > 用户管理 > 主菜单',
  'businessModule', '用户管理'
)
WHERE code = 'user:manage' AND frontend_meta IS NULL;

-- 24. 标签管理相关 (tag:filter:view)
UPDATE permissions 
SET frontend_meta = jsonb_build_object(
  'routePath', '/tag/filter',
  'componentPath', 'src/views/tag/filter/index.vue',
  'pageLocation', '标签管理 > 标签筛选',
  'businessModule', '标签管理'
)
WHERE code = 'tag:filter:view' AND frontend_meta IS NULL;

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
ORDER BY 配置状态 DESC;

-- 显示已配置的权限分类统计
SELECT 
  frontend_meta->>'businessModule' as 业务模块,
  COUNT(*) as 权限数量
FROM permissions 
WHERE status = 1 AND frontend_meta IS NOT NULL
GROUP BY frontend_meta->>'businessModule'
ORDER BY 权限数量 DESC;
