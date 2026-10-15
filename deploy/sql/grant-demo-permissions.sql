SET search_path = public;

INSERT INTO permissions (code, name, type, status)
VALUES
  ('kol:view', 'KOL查看', 'API', 1),
  ('supplier:view', '供应商查看', 'API', 1),
  ('work-order:view', '工单查看', 'API', 1),
  ('influencer:starlink:view', 'Starlink查看', 'API', 1),
  ('influencer:starmedia:view', 'Starmedia查看', 'API', 1),
  ('influencer:filter:quick', '达人快速筛选', 'API', 1),
  ('influencer:filter:advanced', '达人高级筛选', 'API', 1),
  ('influencer:filter:stats', '达人筛选统计', 'API', 1)
ON CONFLICT (code) DO UPDATE SET status = 1;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'SYSTEM_ADMIN'
  AND p.code IN (
    'kol:view', 'supplier:view', 'work-order:view',
    'influencer:starlink:view', 'influencer:starmedia:view',
    'influencer:filter:quick', 'influencer:filter:advanced',
    'influencer:filter:stats'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;
