-- Interview-demo support data for supplier management and KOL reviews.
-- Idempotent: safe to run more than once.

BEGIN;

CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    supplier_full_name VARCHAR(255) NOT NULL,
    agency_name VARCHAR(255),
    supplier_type VARCHAR(100),
    supplier_short_name VARCHAR(255),
    supplier_english_name VARCHAR(255),
    supplier_website VARCHAR(255),
    supplier_description TEXT,
    current_policy_gradient VARCHAR(100),
    tax_rate_percent NUMERIC(5,2),
    payment_term VARCHAR(100),
    settlement_method VARCHAR(100),
    billing_entity VARCHAR(255),
    collection_entity VARCHAR(255),
    policy_2024_gradient VARCHAR(100),
    cooperation_mode_2024 TEXT,
    notes_2024 TEXT,
    policy_2025_gradient VARCHAR(100),
    cooperation_mode_2025 TEXT,
    notes_2025 TEXT,
    primary_contact_name VARCHAR(100),
    primary_contact_phone_wechat VARCHAR(255),
    secondary_contact_name VARCHAR(100),
    secondary_contact_phone_wechat VARCHAR(255),
    tertiary_contact_name VARCHAR(100),
    tertiary_contact_phone_wechat VARCHAR(255),
    contract_follow_up_person VARCHAR(100),
    contract_status VARCHAR(100),
    contract_start_date DATE,
    contract_end_date DATE,
    contract_notes TEXT,
    resource_type VARCHAR(100),
    main_platform VARCHAR(255),
    is_proxy_order BOOLEAN NOT NULL DEFAULT FALSE,
    resource_notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    updated_by VARCHAR(100)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_suppliers_demo_name
    ON suppliers (supplier_full_name);
CREATE INDEX IF NOT EXISTS idx_suppliers_agency_name
    ON suppliers (agency_name);

INSERT INTO suppliers (
    supplier_full_name, agency_name, supplier_type, supplier_short_name,
    supplier_english_name, supplier_website, supplier_description,
    current_policy_gradient, tax_rate_percent, payment_term,
    settlement_method, billing_entity, collection_entity,
    policy_2024_gradient, cooperation_mode_2024, notes_2024,
    policy_2025_gradient, cooperation_mode_2025, notes_2025,
    primary_contact_name, primary_contact_phone_wechat,
    secondary_contact_name, secondary_contact_phone_wechat,
    contract_follow_up_person, contract_status,
    contract_start_date, contract_end_date, contract_notes,
    resource_type, main_platform, is_proxy_order, resource_notes,
    created_at, updated_at, created_by, updated_by
)
SELECT
    format('星芒演示供应商%03s号', n),
    format('%s传媒机构', (ARRAY['广州','深圳','上海','北京','杭州','成都','武汉','厦门'])[((n - 1) % 8) + 1]),
    (ARRAY['集采','独代','独代+集采','直媒'])[((n - 1) % 4) + 1],
    format('星芒%03s', n),
    format('Starlight Media %03s', n),
    format('https://demo-supplier-%s.example.com', n),
    '提供达人签约、内容商业化与投放执行服务，用于面试演示。',
    (ARRAY['A级 30%','B级 25%','C级 20%'])[((n - 1) % 3) + 1],
    ((ARRAY[3.00, 6.00, 9.00])::NUMERIC[])[((n - 1) % 3) + 1],
    (ARRAY['月结30天','月结60天','季度结算'])[((n - 1) % 3) + 1],
    (ARRAY['对公转账','平台结算','框架协议结算'])[((n - 1) % 3) + 1],
    format('星芒演示供应商%03s号', n),
    format('星芒演示供应商%03s号', n),
    (ARRAY['A级','B级','C级'])[((n - 1) % 3) + 1],
    '年度框架合作', '历史政策已归档',
    (ARRAY['A级','B级','C级'])[((n - 1) % 3) + 1],
    '年度框架+项目制合作', '演示数据，合同履约正常',
    (ARRAY['陈晴','李倩','王宇','周婷','林峰'])[((n - 1) % 5) + 1],
    format('1380000%04s / wx_demo_%03s', n, n),
    (ARRAY['刘芳','张超','黄琳','赵晶'])[((n - 1) % 4) + 1],
    format('1390000%04s', n),
    (ARRAY['SIRI','viya','鑫豪','鑫豪/玉莹'])[((n - 1) % 4) + 1],
    (ARRAY['履约中','待续约','已签约'])[((n - 1) % 3) + 1],
    DATE '2026-01-01' + ((n - 1) % 90),
    DATE '2027-01-01' + ((n - 1) % 90),
    '合同台账完整，账期与返点条款已确认。',
    (ARRAY['综合MCN','垂类达人','直播电商','短视频内容'])[((n - 1) % 4) + 1],
    (ARRAY['抖音','小红书','快手','B站','抖音/小红书'])[((n - 1) % 5) + 1],
    n % 3 <> 0,
    '核心资源可用，排期与报价需以项目确认为准。',
    CURRENT_TIMESTAMP - make_interval(days => 100 - n),
    CURRENT_TIMESTAMP - make_interval(days => (100 - n) / 2),
    '演示数据初始化', '演示数据初始化'
FROM generate_series(1, 100) AS series(n)
ON CONFLICT (supplier_full_name) DO NOTHING;

CREATE TABLE IF NOT EXISTS kol_reviews (
    id BIGSERIAL PRIMARY KEY,
    author_id TEXT NOT NULL,
    reviewer VARCHAR(100) NOT NULL,
    reviewer_id BIGINT,
    score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
    content TEXT NOT NULL,
    review_type VARCHAR(50) NOT NULL DEFAULT 'internal',
    review_tags TEXT[],
    attachments JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'approved',
    auditor VARCHAR(100),
    audit_time TIMESTAMP,
    audit_comment TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMP,
    deleted_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_kol_reviews_author_created
    ON kol_reviews (author_id, created_at);
CREATE INDEX IF NOT EXISTS idx_kol_reviews_is_deleted
    ON kol_reviews (is_deleted);
CREATE UNIQUE INDEX IF NOT EXISTS idx_kol_reviews_demo_unique
    ON kol_reviews (author_id, reviewer);

WITH selected_authors AS (
    SELECT matched_author_id::TEXT AS author_id,
           row_number() OVER (ORDER BY matched_author_id) AS n
    FROM kol_list
    WHERE matched_author_id IS NOT NULL AND deleted_at IS NULL
    ORDER BY matched_author_id
    LIMIT 300
)
INSERT INTO kol_reviews (
    author_id, reviewer, reviewer_id, score, content, review_type,
    review_tags, status, auditor, audit_time, audit_comment,
    created_at, updated_at
)
SELECT
    author_id,
    (ARRAY['客户一部-陈经理','品牌事业部-李策划','媒介部-王主管','项目组-周运营','数据组-林分析'])[((n - 1) % 5) + 1],
    1,
    ((ARRAY[5,5,4,4,4,3,5,4,5,3])::INTEGER[])[((n - 1) % 10) + 1],
    (ARRAY[
      '内容质量稳定，审核与交付时效符合项目要求。',
      '配合度高，对品牌卖点的理解准确，建议持续合作。',
      '数据表现稳定，粉丝互动真实，适合日常种草投放。',
      '脚本表现力良好，可进一步优化首屏信息密度。',
      '项目沟通顺畅，档期协调及时，综合性价比较高。'
    ])[((n - 1) % 5) + 1],
    (ARRAY['internal','client','partner'])[((n - 1) % 3) + 1],
    ARRAY[(ARRAY['配合度高','内容优质','数据稳定','准时交付','性价比高'])[((n - 1) % 5) + 1]],
    CASE WHEN n % 10 = 0 THEN 'pending' ELSE 'approved' END,
    CASE WHEN n % 10 = 0 THEN NULL ELSE '演示审核员' END,
    CASE WHEN n % 10 = 0 THEN NULL ELSE CURRENT_TIMESTAMP - make_interval(days => (n % 45)::INTEGER) END,
    CASE WHEN n % 10 = 0 THEN NULL ELSE '评价内容已确认' END,
    CURRENT_TIMESTAMP - make_interval(days => (n % 120)::INTEGER, hours => (n % 24)::INTEGER),
    CURRENT_TIMESTAMP - make_interval(days => (n % 60)::INTEGER)
FROM selected_authors
ON CONFLICT (author_id, reviewer) DO NOTHING;

COMMIT;

SELECT
  (SELECT count(*) FROM suppliers) AS supplier_count,
  (SELECT count(*) FROM kol_reviews WHERE NOT is_deleted) AS review_count;
