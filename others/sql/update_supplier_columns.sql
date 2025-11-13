-- 修改供应商表字段长度限制
-- 将政策相关的VARCHAR字段改为TEXT类型以支持更长的内容

-- 修改当前政策梯度字段
ALTER TABLE suppliers ALTER COLUMN current_policy_gradient TYPE TEXT;

-- 修改2024政策梯度字段
ALTER TABLE suppliers ALTER COLUMN policy_2024_gradient TYPE TEXT;

-- 修改2025政策梯度字段
ALTER TABLE suppliers ALTER COLUMN policy_2025_gradient TYPE TEXT;

-- 同时修改其他可能超长的字段
ALTER TABLE suppliers ALTER COLUMN resource_attribute TYPE TEXT;
ALTER TABLE suppliers ALTER COLUMN proxy_order_fee TYPE TEXT;

-- 修改联系人职位字段（可能会有较长的职位名称）
ALTER TABLE suppliers ALTER COLUMN primary_contact_title TYPE VARCHAR(255);
ALTER TABLE suppliers ALTER COLUMN secondary_contact_title TYPE VARCHAR(255);
