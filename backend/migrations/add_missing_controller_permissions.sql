-- =====================================================
-- 添加缺失的控制器权限
-- 执行时间: 2026-01-06
-- 说明: 为缺少权限控制的控制器端点添加权限记录
-- =====================================================

-- ===== 1. KOL评价管理权限 =====
-- kol:review:view 已存在，这里添加缺失的
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 'kol:review:delete', 'KOL评价删除', '删除KOL评价记录', 'BUTTON'::permission_type, 'kol', 'review:delete', 1, 1, NOW(), NOW(),
  jsonb_build_object('routePath', '/kol/review', 'componentPath', 'src/views/kol/review/index.vue', 'elementLocator', '.review-delete-btn', 'pageLocation', 'KOL数据管理 > KOL评审 > 删除按钮', 'businessModule', 'KOL评审管理')
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'kol:review:delete');

INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 'kol:review:batch:audit', 'KOL评价批量审核', '批量审核KOL评价', 'BUTTON'::permission_type, 'kol', 'review:batch:audit', 2, 1, NOW(), NOW(),
  jsonb_build_object('routePath', '/kol/review', 'componentPath', 'src/views/kol/review/index.vue', 'elementLocator', '#batch-audit-btn', 'pageLocation', 'KOL数据管理 > KOL评审 > 批量审核', 'businessModule', 'KOL评审管理')
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'kol:review:batch:audit');

INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 'kol:review:batch:delete', 'KOL评价批量删除', '批量删除KOL评价', 'BUTTON'::permission_type, 'kol', 'review:batch:delete', 3, 1, NOW(), NOW(),
  jsonb_build_object('routePath', '/kol/review', 'componentPath', 'src/views/kol/review/index.vue', 'elementLocator', '#batch-delete-btn', 'pageLocation', 'KOL数据管理 > KOL评审 > 批量删除', 'businessModule', 'KOL评审管理')
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'kol:review:batch:delete');

-- ===== 2. KOL同步管理权限 =====
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 'kol:sync:retry', 'KOL同步重试', '重试失败的KOL数据同步', 'BUTTON'::permission_type, 'kol', 'sync:retry', 1, 1, NOW(), NOW(),
  jsonb_build_object('routePath', '/kol/sync', 'componentPath', 'src/views/kol/sync/index.vue', 'elementLocator', '.retry-sync-btn', 'pageLocation', 'KOL数据管理 > KOL同步 > 重试按钮', 'businessModule', 'KOL同步管理')
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'kol:sync:retry');

INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 'kol:sync:batch', 'KOL批量同步', '批量同步KOL数据', 'BUTTON'::permission_type, 'kol', 'sync:batch', 2, 1, NOW(), NOW(),
  jsonb_build_object('routePath', '/kol/sync', 'componentPath', 'src/views/kol/sync/index.vue', 'elementLocator', '#batch-sync-btn', 'pageLocation', 'KOL数据管理 > KOL同步 > 批量同步', 'businessModule', 'KOL同步管理')
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'kol:sync:batch');

-- ===== 3. 达人管理权限(星链/星媒) =====
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 'influencer:starlink:view', '查看星链达人', '查看星链计划达人列表和详情', 'MENU'::permission_type, 'influencer', 'starlink:view', 1, 1, NOW(), NOW(),
  jsonb_build_object('routePath', '/starlink-influencers', 'componentPath', 'src/views/influencer-management/starlink/index.vue', 'pageLocation', '达人管理 > 星链达人 > 列表', 'businessModule', '达人管理')
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'influencer:starlink:view');

INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 'influencer:starlink:update', '更新星链达人', '更新星链计划达人信息', 'BUTTON'::permission_type, 'influencer', 'starlink:update', 2, 1, NOW(), NOW(),
  jsonb_build_object('routePath', '/starlink-influencers', 'componentPath', 'src/views/influencer-management/starlink/index.vue', 'elementLocator', '.edit-btn', 'pageLocation', '达人管理 > 星链达人 > 编辑', 'businessModule', '达人管理')
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'influencer:starlink:update');

INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 'influencer:starlink:delete', '删除星链达人', '删除星链计划达人', 'BUTTON'::permission_type, 'influencer', 'starlink:delete', 3, 1, NOW(), NOW(),
  jsonb_build_object('routePath', '/starlink-influencers', 'componentPath', 'src/views/influencer-management/starlink/index.vue', 'elementLocator', '.delete-btn', 'pageLocation', '达人管理 > 星链达人 > 删除', 'businessModule', '达人管理')
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'influencer:starlink:delete');

INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 'influencer:starmedia:view', '查看星媒达人', '查看省广星媒独家签约达人列表和详情', 'MENU'::permission_type, 'influencer', 'starmedia:view', 4, 1, NOW(), NOW(),
  jsonb_build_object('routePath', '/starmedia-influencers', 'componentPath', 'src/views/influencer-management/starmedia/index.vue', 'pageLocation', '达人管理 > 星媒达人 > 列表', 'businessModule', '达人管理')
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'influencer:starmedia:view');

INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 'influencer:starmedia:update', '更新星媒达人', '更新省广星媒独家签约达人信息', 'BUTTON'::permission_type, 'influencer', 'starmedia:update', 5, 1, NOW(), NOW(),
  jsonb_build_object('routePath', '/starmedia-influencers', 'componentPath', 'src/views/influencer-management/starmedia/index.vue', 'elementLocator', '.edit-btn', 'pageLocation', '达人管理 > 星媒达人 > 编辑', 'businessModule', '达人管理')
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'influencer:starmedia:update');

INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 'influencer:starmedia:delete', '删除星媒达人', '删除省广星媒独家签约达人', 'BUTTON'::permission_type, 'influencer', 'starmedia:delete', 6, 1, NOW(), NOW(),
  jsonb_build_object('routePath', '/starmedia-influencers', 'componentPath', 'src/views/influencer-management/starmedia/index.vue', 'elementLocator', '.delete-btn', 'pageLocation', '达人管理 > 星媒达人 > 删除', 'businessModule', '达人管理')
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'influencer:starmedia:delete');

-- ===== 4. 搜索功能权限 =====
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 'search:influencer', '搜索达人', '搜索达人信息', 'API'::permission_type, 'search', 'influencer', 1, 1, NOW(), NOW(),
  jsonb_build_object('routePath', '/search', 'componentPath', 'src/views/search/index.vue', 'pageLocation', '搜索功能 > 达人搜索', 'businessModule', '搜索管理')
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'search:influencer');

INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 'search:reindex', '重建搜索索引', '重新构建搜索索引', 'BUTTON'::permission_type, 'search', 'reindex', 2, 1, NOW(), NOW(),
  jsonb_build_object('routePath', '/search', 'componentPath', 'src/views/search/index.vue', 'elementLocator', '#reindex-btn', 'pageLocation', '搜索功能 > 重建索引', 'businessModule', '搜索管理')
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'search:reindex');

INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 'search:cache:clear', '清除搜索缓存', '清除搜索相关缓存', 'BUTTON'::permission_type, 'search', 'cache:clear', 3, 1, NOW(), NOW(),
  jsonb_build_object('routePath', '/search', 'componentPath', 'src/views/search/index.vue', 'elementLocator', '#clear-cache-btn', 'pageLocation', '搜索功能 > 清除缓存', 'businessModule', '搜索管理')
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'search:cache:clear');

-- ===== 5. SQLBot扩展权限 =====
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 'sqlbot:config:create', 'SQLBot配置创建', '创建SQLBot配置', 'BUTTON'::permission_type, 'sqlbot', 'config:create', 1, 1, NOW(), NOW(),
  jsonb_build_object('routePath', '/sqlbot', 'componentPath', 'src/views/sqlbot/config.vue', 'elementLocator', '#create-config-btn', 'pageLocation', 'SQL机器人 > 配置管理 > 创建配置', 'businessModule', 'SQL机器人')
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'sqlbot:config:create');

INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 'sqlbot:config:update', 'SQLBot配置更新', '更新SQLBot配置', 'BUTTON'::permission_type, 'sqlbot', 'config:update', 2, 1, NOW(), NOW(),
  jsonb_build_object('routePath', '/sqlbot', 'componentPath', 'src/views/sqlbot/config.vue', 'elementLocator', '.edit-config-btn', 'pageLocation', 'SQL机器人 > 配置管理 > 编辑配置', 'businessModule', 'SQL机器人')
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'sqlbot:config:update');

INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 'sqlbot:config:delete', 'SQLBot配置删除', '删除SQLBot配置', 'BUTTON'::permission_type, 'sqlbot', 'config:delete', 3, 1, NOW(), NOW(),
  jsonb_build_object('routePath', '/sqlbot', 'componentPath', 'src/views/sqlbot/config.vue', 'elementLocator', '.delete-config-btn', 'pageLocation', 'SQL机器人 > 配置管理 > 删除配置', 'businessModule', 'SQL机器人')
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'sqlbot:config:delete');

INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 'sqlbot:datasource:view', 'SQLBot数据源查看', '查看SQLBot数据源信息', 'BUTTON'::permission_type, 'sqlbot', 'datasource:view', 4, 1, NOW(), NOW(),
  jsonb_build_object('routePath', '/sqlbot', 'componentPath', 'src/views/sqlbot/index.vue', 'pageLocation', 'SQL机器人 > 数据源查看', 'businessModule', 'SQL机器人')
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'sqlbot:datasource:view');

-- ===== 6. 来源账户权限 =====
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 'source:account:view', '来源账户查看', '查看来源账户映射信息', 'MENU'::permission_type, 'source', 'account:view', 1, 1, NOW(), NOW(),
  jsonb_build_object('routePath', '/source-account', 'pageLocation', '系统管理 > 来源账户', 'businessModule', '系统管理')
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'source:account:view');

INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 'source:account:create', '来源账户创建', '创建来源账户映射', 'BUTTON'::permission_type, 'source', 'account:create', 2, 1, NOW(), NOW(),
  jsonb_build_object('routePath', '/source-account', 'elementLocator', '#create-mapping-btn', 'pageLocation', '系统管理 > 来源账户 > 创建', 'businessModule', '系统管理')
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'source:account:create');

-- 验证添加结果
SELECT code, name, type, status FROM permissions 
WHERE code IN (
  'kol:review:delete', 'kol:review:batch:audit', 'kol:review:batch:delete',
  'kol:sync:retry', 'kol:sync:batch',
  'influencer:starlink:view', 'influencer:starlink:update', 'influencer:starlink:delete',
  'influencer:starmedia:view', 'influencer:starmedia:update', 'influencer:starmedia:delete',
  'search:influencer', 'search:reindex', 'search:cache:clear',
  'sqlbot:config:create', 'sqlbot:config:update', 'sqlbot:config:delete', 'sqlbot:datasource:view',
  'source:account:view', 'source:account:create'
)
ORDER BY code;

-- 统计新增数量
SELECT COUNT(*) as total_permissions FROM permissions;
