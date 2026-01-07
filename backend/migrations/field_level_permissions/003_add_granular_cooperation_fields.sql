-- =====================================================
-- 细粒度合作信息字段权限迁移脚本
-- 功能：将 kol:field:cooperation 和 kol:field:rebate 拆分为更细的字段级权限
-- 作者：System
-- 日期：2026-01-07
-- =====================================================

BEGIN;

-- 1. 添加细粒度字段权限

-- 机构信息
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 
  'kol:field:org_name',
  'KOL机构信息',
  '查看KOL所属机构名称',
  'FIELD'::permission_type,
  'kol',
  'field:org_name',
  210,
  1,
  NOW(),
  NOW(),
  jsonb_build_object(
    'fields', ARRAY['org_name', 'orgName'],
    'description', 'KOL机构字段',
    'pageLocation', '达人广场/省广达人库 > 合作信息 > 机构',
    'businessModule', 'KOL管理',
    'sensitive', false
  )
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'kol:field:org_name');

-- 独家资源标识
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 
  'kol:field:is_exclusive',
  'KOL独家资源',
  '查看KOL是否为独家签约资源',
  'FIELD'::permission_type,
  'kol',
  'field:is_exclusive',
  211,
  1,
  NOW(),
  NOW(),
  jsonb_build_object(
    'fields', ARRAY['is_exclusive', 'isExclusive'],
    'description', 'KOL独家资源标识',
    'pageLocation', '达人广场/省广达人库 > 合作信息 > 独家资源',
    'businessModule', 'KOL管理',
    'sensitive', true
  )
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'kol:field:is_exclusive');

-- 返点区间
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 
  'kol:field:rebate_range',
  'KOL返点区间',
  '查看KOL返点百分比区间（高敏感）',
  'FIELD'::permission_type,
  'kol',
  'field:rebate_range',
  212,
  1,
  NOW(),
  NOW(),
  jsonb_build_object(
    'fields', ARRAY['rebate_range', 'rebateRange'],
    'description', 'KOL返点区间（敏感）',
    'pageLocation', '达人广场/省广达人库 > 合作信息 > 返点',
    'businessModule', 'KOL管理',
    'sensitive', true
  )
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'kol:field:rebate_range');

-- 政策等级
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 
  'kol:field:policy_level',
  'KOL政策等级',
  '查看KOL返点政策等级（S/A/B/C/D）',
  'FIELD'::permission_type,
  'kol',
  'field:policy_level',
  213,
  1,
  NOW(),
  NOW(),
  jsonb_build_object(
    'fields', ARRAY['policy_level', 'policyLevel'],
    'description', 'KOL政策等级',
    'pageLocation', '达人广场/省广达人库 > 合作信息 > 政策等级',
    'businessModule', 'KOL管理',
    'sensitive', true
  )
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'kol:field:policy_level');

-- 配合度
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 
  'kol:field:cooperation_degree',
  'KOL配合度',
  '查看KOL合作配合度评级',
  'FIELD'::permission_type,
  'kol',
  'field:cooperation_degree',
  214,
  1,
  NOW(),
  NOW(),
  jsonb_build_object(
    'fields', ARRAY['cooperation_degree', 'cooperationDegree'],
    'description', 'KOL合作配合度',
    'pageLocation', '达人广场/省广达人库 > 合作信息 > 配合度',
    'businessModule', 'KOL管理',
    'sensitive', false
  )
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'kol:field:cooperation_degree');

-- 账期
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 
  'kol:field:rebate_period',
  'KOL返点账期',
  '查看KOL返点账期信息',
  'FIELD'::permission_type,
  'kol',
  'field:rebate_period',
  215,
  1,
  NOW(),
  NOW(),
  jsonb_build_object(
    'fields', ARRAY['rebate_period', 'rebatePeriod'],
    'description', 'KOL返点账期',
    'pageLocation', '达人广场/省广达人库 > 合作信息 > 账期',
    'businessModule', 'KOL管理',
    'sensitive', true
  )
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'kol:field:rebate_period');

-- 年框机构
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 
  'kol:field:annual_contract_org',
  'KOL年框机构',
  '查看与KOL签订年框合同的机构',
  'FIELD'::permission_type,
  'kol',
  'field:annual_contract_org',
  216,
  1,
  NOW(),
  NOW(),
  jsonb_build_object(
    'fields', ARRAY['annual_contract_org', 'annualContractOrg'],
    'description', 'KOL年框机构',
    'pageLocation', '达人广场/省广达人库 > 合作信息 > 年框',
    'businessModule', 'KOL管理',
    'sensitive', true
  )
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'kol:field:annual_contract_org');

-- 合作简介
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 
  'kol:field:cooperation_intro',
  'KOL合作简介',
  '查看KOL合作简介描述',
  'FIELD'::permission_type,
  'kol',
  'field:cooperation_intro',
  217,
  1,
  NOW(),
  NOW(),
  jsonb_build_object(
    'fields', ARRAY['cooperation_intro', 'cooperationIntro'],
    'description', 'KOL合作简介',
    'pageLocation', '达人广场/省广达人库 > 合作信息 > 合作简介',
    'businessModule', 'KOL管理',
    'sensitive', false
  )
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'kol:field:cooperation_intro');

-- 备注
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 
  'kol:field:remark',
  'KOL备注信息',
  '查看KOL备注说明',
  'FIELD'::permission_type,
  'kol',
  'field:remark',
  218,
  1,
  NOW(),
  NOW(),
  jsonb_build_object(
    'fields', ARRAY['remark'],
    'description', 'KOL备注',
    'pageLocation', '达人广场/省广达人库 > 合作信息 > 备注',
    'businessModule', 'KOL管理',
    'sensitive', false
  )
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'kol:field:remark');

-- 验证新增权限
SELECT code, name, type, sort 
FROM permissions 
WHERE code LIKE 'kol:field:%' 
  AND code NOT IN ('kol:field:basic', 'kol:field:price', 'kol:field:rebate', 'kol:field:contact', 'kol:field:cooperation', 'kol:field:match')
ORDER BY sort;

COMMIT;
