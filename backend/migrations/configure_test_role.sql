-- 配置「测试权限角色」权限
-- 特征：只读权限、可导出、不可写入/修改、不能查看敏感字段

-- 1. 创建或查找测试权限角色
INSERT INTO roles (name, code, description, status, sort, created_at, updated_at)
VALUES ('测试权限角色', 'test_readonly_role', '只有读取和导出权限的测试角色，无写入修改权限，不可查看敏感字段', 1, 100, NOW(), NOW())
ON CONFLICT (code) DO UPDATE SET 
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 获取角色ID（假设为新创建或已存在的角色）
DO $$
DECLARE
  v_role_id BIGINT;
  v_permission_id BIGINT;
BEGIN
  -- 获取测试权限角色ID
  SELECT id INTO v_role_id FROM roles WHERE code = 'test_readonly_role';
  
  -- 清空该角色的现有权限
  DELETE FROM role_permissions WHERE role_id = v_role_id;
  
  -- 分配所有只读类权限（排除写入/修改权限）
  -- 菜单权限 - 分配所有菜单权限，确保可以访问页面
  INSERT INTO role_permissions (role_id, permission_id, created_at)
  SELECT v_role_id, id, NOW()
  FROM permissions
  WHERE status = 1 
    AND type = 'MENU';
  
  -- API权限 - 只包含查询和导出
  INSERT INTO role_permissions (role_id, permission_id, created_at)
  SELECT v_role_id, id, NOW()
  FROM permissions
  WHERE status = 1 
    AND type = 'API'
    AND (
      code LIKE '%:read' 
      OR code LIKE '%:list' 
      OR code LIKE '%:query'
      OR code LIKE '%:search'
      OR code LIKE '%:export'
      OR code LIKE '%:detail'
      OR code LIKE '%:view'
      OR code LIKE '%:get'
      OR code IN ('influencer:sync', 'influencer:match') -- 允许同步和匹配操作
    )
    AND code NOT LIKE '%:create%'
    AND code NOT LIKE '%:update%'
    AND code NOT LIKE '%:delete%'
    AND code NOT LIKE '%:write%'
    AND code NOT LIKE '%:modify%'
    AND code NOT LIKE '%:edit%'
    AND code NOT LIKE '%:save%';
  
  -- 按钮权限 - 只包含查询和导出按钮
  INSERT INTO role_permissions (role_id, permission_id, created_at)
  SELECT v_role_id, id, NOW()
  FROM permissions
  WHERE status = 1 
    AND type = 'BUTTON'
    AND (
      code LIKE '%:read' 
      OR code LIKE '%:query'
      OR code LIKE '%:export'
      OR code LIKE '%:view'
      OR code LIKE '%:search'
    )
    AND code NOT LIKE '%:create%'
    AND code NOT LIKE '%:update%'
    AND code NOT LIKE '%:delete%'
    AND code NOT LIKE '%:add%'
    AND code NOT LIKE '%:edit%'
    AND code NOT LIKE '%:save%';
  
  -- 字段权限 - 排除敏感字段
  INSERT INTO role_permissions (role_id, permission_id, created_at)
  SELECT v_role_id, id, NOW()
  FROM permissions
  WHERE status = 1 
    AND type = 'FIELD'
    AND code NOT IN (
      'kol:field:org_name',           -- 机构名称
      'kol:field:is_exclusive',       -- 独家资源
      'kol:field:rebate_range',       -- 返点区间
      'kol:field:rebate_period',      -- 返点账期
      'kol:field:annual_contract_org',-- 年框机构
      'kol:field:rebate',             -- 返点政策
      'kol:field:contact'             -- 联系方式
    );
  
  -- 输出配置结果
  RAISE NOTICE '测试权限角色配置完成！';
  RAISE NOTICE '角色ID: %', v_role_id;
  RAISE NOTICE '已分配权限数量: %', (SELECT COUNT(*) FROM role_permissions WHERE role_id = v_role_id);
  
END $$;

-- 验证配置结果
SELECT 
  r.name AS "角色名称",
  r.code AS "角色代码",
  COUNT(rp.permission_id) AS "权限数量"
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id
WHERE r.code = 'test_readonly_role'
GROUP BY r.id, r.name, r.code;

-- 查看分配的权限明细（按类型分组）
SELECT 
  p.type AS "权限类型",
  COUNT(*) AS "数量",
  STRING_AGG(p.name, ', ') AS "权限列表"
FROM role_permissions rp
JOIN permissions p ON rp.permission_id = p.id
JOIN roles r ON rp.role_id = r.id
WHERE r.code = 'test_readonly_role'
GROUP BY p.type
ORDER BY p.type;

-- 验证被排除的敏感字段
SELECT 
  '被排除的敏感字段' AS "说明",
  code AS "权限代码",
  name AS "权限名称"
FROM permissions
WHERE type = 'FIELD'
  AND code IN (
    'kol:field:org_name',
    'kol:field:is_exclusive',
    'kol:field:rebate_range',
    'kol:field:rebate_period',
    'kol:field:annual_contract_org',
    'kol:field:rebate',
    'kol:field:contact'
  )
ORDER BY code;

COMMIT;
