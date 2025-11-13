CREATE TABLE suppliers (
    id SERIAL PRIMARY KEY,
    
    -- 基础信息
    agency_logo_url TEXT,                      -- 机构logo
    supplier_full_name VARCHAR(255) NOT NULL, -- 供应商全称
    agency_name VARCHAR(255),                  -- 机构名
    supplier_type VARCHAR(50),                 -- 供应商性质（直媒/集采/独代）
    supplier_description TEXT,                 -- 供应商简介

    -- 政策与财务
    current_policy_gradient TEXT,              -- 当前政策梯度
    invoice_content TEXT,                      -- 供应商开票内容
    invoice_info TEXT,                         -- 供应商开票信息 (也可考虑 JSONB)
    tax_rate_percent DECIMAL(5, 2),            -- 税率(%)
    rebate TEXT,                               -- 返点
    payment_term VARCHAR(100),                 -- 账期
    payment_due_date_desc VARCHAR(100),        -- 支付账期
    is_proxy_order BOOLEAN,                    -- 是否代下单
    proxy_order_fee TEXT,                      -- 代下单服务费

    -- 24年政策与合作
    policy_2024_signed TEXT,                   -- 24年政策 - 签约政策
    policy_2024_current TEXT,                  -- 24年政策 - 当前政策
    coop_2024_annual_amount DECIMAL(18, 2),    -- 24年合作情况 - 全年累量金额
    coop_2024_contract_amount DECIMAL(18, 2),  -- 24年合作情况 - 合同期内累量金额

    -- 25年政策与合作
    policy_2025_signed TEXT,                   -- 25年政策 - 签约政策
    policy_2025_current TEXT,                  -- 25年政策 - 当前政策
    coop_2025_annual_amount DECIMAL(18, 2),    -- 25年合作情况 - 全年累量金额
    coop_2025_contract_amount DECIMAL(18, 2),  -- 25年合作情况 - 合同期内累量金额
    pre_contract_amount DECIMAL(18, 2),        -- 签框前累量金额

    -- 联系人信息
    primary_contact_name VARCHAR(100),         -- 一级对接人 - 姓名
    primary_contact_title VARCHAR(100),        -- 一级对接人 - 职称
    primary_contact_email VARCHAR(255),        -- 一级对接人 - 邮箱
    primary_contact_phone_wechat VARCHAR(100), -- 一级对接人 - 微信号/电话号码
    secondary_contact_name VARCHAR(100),       -- 二级对接人 - 姓名
    secondary_contact_title VARCHAR(100),      -- 二级对接人 - 职称
    secondary_contact_phone_wechat VARCHAR(100),-- 二级对接人 - 微信号/电话号码

    -- 合同信息
    contract_start_date DATE,                  -- 年框合同信息 - 开始
    contract_end_date DATE,                    -- 年框合同信息 - 结束
    contract_expiry_date DATE,                 -- 年框合同信息 - 到期时间
    contract_comm_progress TEXT,               -- 年框合同信息 - 沟通进度
    contract_comm_notes TEXT,                  -- 年框合同信息 - 沟通备注
    contract_comm_time TIMESTAMP,              -- 年框合同信息 - 沟通时间
    contract_follow_up_person VARCHAR(100),    -- 年框合同信息 - 跟进人
    -- contract_signed_copy_url 字段已删除

    -- 资源与平台
    resource_type VARCHAR(100),                -- 资源类型
    resource_attribute VARCHAR(100),           -- 资源属性
    cooperative_platforms TEXT[],              -- 可合作平台 (整合后的字段)

    -- 审计字段
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建一个触发器，在更新时自动修改 updated_at 时间戳
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON suppliers
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();