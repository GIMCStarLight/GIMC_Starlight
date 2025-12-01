-- ==========================================
-- 省广星媒独家签约达人信息表
-- 设计原则：符合数据库三大范式
-- 创建时间：2025-01-01
-- ==========================================

CREATE TABLE signed_influencer_info (
    -- ==========================================
    -- 主键与基础标识
    -- ==========================================
    id BIGSERIAL PRIMARY KEY COMMENT '主键ID',
    influencer_serial_number INTEGER NOT NULL UNIQUE COMMENT '达人序号',
    account_id VARCHAR(50) NOT NULL UNIQUE COMMENT '账号ID（如sphTheZgNtmSL7O）',
    
    -- ==========================================
    -- 达人基本信息
    -- ==========================================
    nickname VARCHAR(100) NOT NULL COMMENT '昵称',
    influencer_overview VARCHAR(200) COMMENT '达人概况（如：头部重点达人、影响力重点达人等）',
    affiliated_organization VARCHAR(100) DEFAULT '省广星媒' COMMENT '现挂靠机构',
    influencer_category VARCHAR(100) COMMENT '达人类型（如：剧情搞笑、车垂车评、科技数码等）',
    total_fans DECIMAL(10,2) COMMENT '主平台粉丝量（万）',
    
    -- ==========================================
    -- 签约信息
    -- ==========================================
    contract_status VARCHAR(100) COMMENT '签约进度状态（如：已签约、合同流程中、邮件已确认待合同签署等）',
    contract_period VARCHAR(100) COMMENT '合同期限（如：2025/8/15至2025/1/31）',
    contract_start_date DATE COMMENT '合同开始日期',
    contract_end_date DATE COMMENT '合同结束日期',
    contract_rebate_rate DECIMAL(5,2) COMMENT '签约返点比例(%)',
    
    -- ==========================================
    -- 多平台账号信息（JSON格式存储）
    -- ==========================================
    platform_accounts TEXT COMMENT '多平台账号详情(JSON数组，包含平台名称、粉丝量、报价、合作政策等)',
    /*
    JSON格式示例:
    [
        {
            "platform": "抖音",
            "account_name": "伊博",
            "fans": 1067.4,
            "fans_unit": "万",
            "price_60s_plus": 150000,
            "cooperation_policy": 40
        },
        {
            "platform": "微信视频号",
            "account_name": "黑人伊博",
            "fans": 16,
            "fans_unit": "万",
            "price_60s_plus": 120000,
            "cooperation_policy": 50
        }
    ]
    */
    
    -- ==========================================
    -- 平台分发信息
    -- ==========================================
    all_platforms TEXT COMMENT '全网平台列表（逗号分隔，如：抖音、快手、小红书、b站）',
    platform_count INTEGER COMMENT '平台数量',
    has_douyin BOOLEAN DEFAULT FALSE COMMENT '是否有抖音',
    has_kuaishou BOOLEAN DEFAULT FALSE COMMENT '是否有快手',
    has_xiaohongshu BOOLEAN DEFAULT FALSE COMMENT '是否有小红书',
    has_bilibili BOOLEAN DEFAULT FALSE COMMENT '是否有B站',
    has_video_account BOOLEAN DEFAULT FALSE COMMENT '是否有视频号',
    
    -- ==========================================
    -- 业务统计字段（冗余字段用于快速检索）
    -- ==========================================
    max_platform_fans DECIMAL(10,2) COMMENT '最高平台粉丝量（万）',
    max_platform_name VARCHAR(50) COMMENT '最高粉丝量平台名称',
    min_cooperation_policy DECIMAL(5,2) COMMENT '最低合作政策返点(%)',
    max_cooperation_policy DECIMAL(5,2) COMMENT '最高合作政策返点(%)',
    
    -- ==========================================
    -- 备注信息
    -- ==========================================
    influencer_status_notes TEXT COMMENT '达人近况登记（原始文本）',
    remarks TEXT COMMENT '其他备注',
    
    -- ==========================================
    -- 系统字段
    -- ==========================================
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    is_deleted BOOLEAN DEFAULT FALSE COMMENT '是否删除（软删除标记）',
    
    -- ==========================================
    -- 索引
    -- ==========================================
    INDEX idx_nickname (nickname),
    INDEX idx_account_id (account_id),
    INDEX idx_influencer_category (influencer_category),
    INDEX idx_contract_status (contract_status),
    INDEX idx_contract_rebate_rate (contract_rebate_rate DESC),
    INDEX idx_total_fans (total_fans DESC),
    INDEX idx_max_platform_fans (max_platform_fans DESC),
    INDEX idx_contract_dates (contract_start_date, contract_end_date),
    INDEX idx_affiliated_organization (affiliated_organization)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='省广星媒独家签约达人信息表';

-- ==========================================
-- 示例数据插入
-- ==========================================
INSERT INTO signed_influencer_info (
    influencer_serial_number,
    account_id,
    nickname,
    influencer_overview,
    affiliated_organization,
    influencer_category,
    total_fans,
    contract_status,
    contract_period,
    contract_start_date,
    contract_end_date,
    contract_rebate_rate,
    platform_accounts,
    all_platforms,
    platform_count,
    has_douyin,
    has_kuaishou,
    has_xiaohongshu,
    has_bilibili,
    max_platform_fans,
    max_platform_name,
    min_cooperation_policy,
    max_cooperation_policy,
    influencer_status_notes
) VALUES (
    1,
    'sphTheZgNtmSL7O',
    '伊博',
    '头部重点达人',
    '省广星媒',
    '剧情搞笑',
    16,
    '已签约',
    '2025/8/15至2025/1/31',
    '2025-08-15',
    '2025-01-31',
    50,
    '[{"platform":"抖音","account_name":"伊博","fans":1067.4,"fans_unit":"万","price_60s_plus":150000,"cooperation_policy":40},{"platform":"微信视频号","account_name":"黑人伊博","fans":16,"fans_unit":"万","price_60s_plus":120000,"cooperation_policy":50}]',
    '抖音、快手、小红书、b站',
    4,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    1067.4,
    '抖音',
    40,
    50,
    '抖音：伊博1067.4w粉 60s+价格150000（40%合作政策）\n微信视频号：黑人伊博16w粉 60s+价格120000（50%合作政策）'
);

-- ==========================================
-- 设计说明
-- ==========================================
/*
1. 第一范式（1NF）：
   - 所有字段都是原子性的，不可再分
   - 每个字段只包含单一值
   - 多平台账号信息使用JSON格式存储，但在业务层面是原子性的

2. 第二范式（2NF）：
   - 表中有明确的主键（id）
   - 所有非主键字段完全依赖于主键
   - 没有部分依赖的情况

3. 第三范式（3NF）：
   - 消除了传递依赖
   - 冗余字段（max_platform_fans、min_cooperation_policy等）是为了性能优化，
     但这些字段可以通过解析platform_accounts JSON得出
   - 平台标记字段（has_douyin等）可以从all_platforms解析得出

4. JSON字段设计：
   - platform_accounts: 存储多平台详细信息（粉丝量、报价、合作政策等）
   - 避免了创建关联表的复杂性
   - 保持了数据的完整性和可扩展性

5. 冗余字段说明：
   - max_platform_fans、max_platform_name: 快速查询粉丝量最高的平台
   - min/max_cooperation_policy: 快速筛选合作政策范围
   - platform_count: 快速统计平台数量
   - has_xxx平台标记: 快速筛选特定平台的达人

6. 索引设计：
   - 针对常用查询字段建立索引
   - 支持按达人类型、合作政策、粉丝量等维度快速检索
*/
