-- 添加供应商管理字段级权限
-- 创建时间: 2025-01-07
-- 描述: 为供应商管理界面添加细粒度字段权限控制

-- 1. 基本信息字段权限（可见性较高）
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 'supplier:field:basic', '供应商基础信息', '查看供应商基本信息（全称、简称、性质等）', 'FIELD'::permission_type, 'supplier', 'field:basic', 301, 1, NOW(), NOW(),
  jsonb_build_object(
    'fields', ARRAY['supplier_full_name', 'supplierFullName', 'supplier_short_name', 'supplierShortName', 'supplier_english_name', 'supplierEnglishName', 'agency_name', 'agencyName', 'supplier_type', 'supplierType', 'supplier_website', 'supplierWebsite', 'supplier_description', 'supplierDescription'],
    'description', '供应商基础信息字段组',
    'category', 'supplier'
  )
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'supplier:field:basic');

-- 2. 财务信息字段权限（敏感）
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 'supplier:field:finance', '供应商财务信息', '查看供应商财务信息（政策梯度、税率、账期等）', 'FIELD'::permission_type, 'supplier', 'field:finance', 302, 1, NOW(), NOW(),
  jsonb_build_object(
    'fields', ARRAY['current_policy_gradient', 'currentPolicyGradient', 'tax_rate_percent', 'taxRatePercent', 'payment_term', 'paymentTerm', 'settlement_method', 'settlementMethod', 'billing_entity', 'billingEntity', 'collection_entity', 'collectionEntity'],
    'description', '供应商财务相关敏感字段',
    'category', 'supplier',
    'sensitive', true
  )
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'supplier:field:finance');

-- 3. 年度政策字段权限（敏感）
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 'supplier:field:policy', '供应商年度政策', '查看供应商年度政策信息（2024/2025年政策梯度、合作模式）', 'FIELD'::permission_type, 'supplier', 'field:policy', 303, 1, NOW(), NOW(),
  jsonb_build_object(
    'fields', ARRAY['policy_2024_gradient', 'policy2024Gradient', 'cooperation_mode_2024', 'cooperationMode2024', 'notes_2024', 'notes2024', 'policy_2025_gradient', 'policy2025Gradient', 'cooperation_mode_2025', 'cooperationMode2025', 'notes_2025', 'notes2025'],
    'description', '供应商年度政策敏感字段',
    'category', 'supplier',
    'sensitive', true
  )
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'supplier:field:policy');

-- 4. 联系人信息字段权限（敏感）
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 'supplier:field:contact', '供应商联系人信息', '查看供应商联系人信息（对接人姓名、联系方式）', 'FIELD'::permission_type, 'supplier', 'field:contact', 304, 1, NOW(), NOW(),
  jsonb_build_object(
    'fields', ARRAY['primary_contact_name', 'primaryContactName', 'primary_contact_phone_wechat', 'primaryContactPhoneWechat', 'secondary_contact_name', 'secondaryContactName', 'secondary_contact_phone_wechat', 'secondaryContactPhoneWechat', 'tertiary_contact_name', 'tertiaryContactName', 'tertiary_contact_phone_wechat', 'tertiaryContactPhoneWechat'],
    'description', '供应商联系人敏感信息',
    'category', 'supplier',
    'sensitive', true
  )
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'supplier:field:contact');

-- 5. 合同信息字段权限
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 'supplier:field:contract', '供应商合同信息', '查看供应商合同信息（跟进人、合同状态、合同日期）', 'FIELD'::permission_type, 'supplier', 'field:contract', 305, 1, NOW(), NOW(),
  jsonb_build_object(
    'fields', ARRAY['contract_follow_up_person', 'contractFollowUpPerson', 'contract_status', 'contractStatus', 'contract_start_date', 'contractStartDate', 'contract_end_date', 'contractEndDate', 'contract_notes', 'contractNotes'],
    'description', '供应商合同相关字段',
    'category', 'supplier'
  )
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'supplier:field:contract');

-- 6. 资源信息字段权限
INSERT INTO permissions (code, name, description, type, resource, action, sort, status, created_at, updated_at, frontend_meta)
SELECT 'supplier:field:resource', '供应商资源信息', '查看供应商资源信息（资源类型、平台、代下单）', 'FIELD'::permission_type, 'supplier', 'field:resource', 306, 1, NOW(), NOW(),
  jsonb_build_object(
    'fields', ARRAY['resource_type', 'resourceType', 'main_platform', 'mainPlatform', 'is_proxy_order', 'isProxyOrder', 'resource_notes', 'resourceNotes'],
    'description', '供应商资源相关字段',
    'category', 'supplier'
  )
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE code = 'supplier:field:resource');

-- 验证添加结果
SELECT code, name, type, description 
FROM permissions 
WHERE code LIKE 'supplier:field:%' 
ORDER BY code;

COMMIT;
