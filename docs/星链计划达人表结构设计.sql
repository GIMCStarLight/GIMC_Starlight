-- ==========================================
-- 星链计划达人信息表设计
-- 符合数据库三大范式的单表结构
-- ==========================================

-- 第一范式(1NF): 确保每列都是不可分割的原子值
-- 第二范式(2NF): 消除部分函数依赖,所有非主属性完全依赖于主键
-- 第三范式(3NF): 消除传递函数依赖,非主属性不依赖于其他非主属性

CREATE TABLE kol_influencer_info (
    -- ==========================================
    -- 主键和基础标识
    -- ==========================================
    id BIGSERIAL PRIMARY KEY COMMENT '自增主键',
    kol_serial_number INTEGER NOT NULL COMMENT '达人序号',
    
    -- ==========================================
    -- 达人基础信息
    -- ==========================================
    nickname VARCHAR(100) NOT NULL COMMENT '达人昵称',
    profile_url TEXT COMMENT '达人主页链接',
    star_platform_url TEXT COMMENT '星图/花火/蒲公英主页链接',
    
    -- ==========================================
    -- 平台和分类信息
    -- ==========================================
    primary_platform VARCHAR(50) NOT NULL COMMENT '主发平台(如:抖音、B站、小红书)',
    account_category VARCHAR(100) COMMENT '账号类型/内容分类(如:汽车、剧情搞笑、美食)',
    fans_count DECIMAL(10,2) COMMENT '主发平台粉丝量(单位:万)',
    
    -- ==========================================
    -- 报价信息(单位:元)
    -- ==========================================
    price_1_20s INTEGER COMMENT '1-20秒视频预估报价',
    price_21_60s INTEGER COMMENT '21-60秒视频预估报价',
    price_60s_plus INTEGER COMMENT '60秒以上视频预估报价',
    
    -- ==========================================
    -- 政策信息（JSON格式存储梯度信息）
    -- ==========================================
    policy_tiers TEXT COMMENT '政策梯度信息(JSON数组，包含订单量区间、返点、CPM、CPE、保证播放量等)',
    policy_tiers_summary VARCHAR(500) COMMENT '政策梯度摘要(用于快速检索,如:30%-35%梯度返点)',
    has_guaranteed_metrics BOOLEAN DEFAULT FALSE COMMENT '是否有保量保KPI',
    min_rebate_rate DECIMAL(5,2) COMMENT '最低返点比例(%)',
    max_rebate_rate DECIMAL(5,2) COMMENT '最高返点比例(%)',
    policy_remarks TEXT COMMENT '政策备注说明',
    current_order_count INTEGER DEFAULT 0 COMMENT '当前累计合作订单数',
    
    -- ==========================================
    -- 合作信息
    -- ==========================================
    collaboration_description TEXT COMMENT '合作简介/说明',
    supported_platforms TEXT COMMENT '全网支持平台列表(JSON格式存储,如:["抖音","快手","小红书"])',
    
    -- ==========================================
    -- 业务数据
    -- ==========================================
    orders_second_half_year INTEGER DEFAULT 0 COMMENT '下半年接单次数',
    

    
    -- ==========================================
    -- 达人简介和特征
    -- ==========================================
    kol_introduction TEXT COMMENT '达人简介(个人背景、专业领域、风格特点)',
    achievement_highlights TEXT COMMENT '成就亮点(粉丝数、播放量、获赞数等关键数据)',
    ranking_info VARCHAR(500) COMMENT '榜单排名信息(如:头部必选榜·月榜·汽车·TOP3)',
    
    -- ==========================================
    -- 合作相关信息
    -- ==========================================
    collaboration_platforms TEXT COMMENT '可合作平台列表(JSON数组)',
    distribution_platforms TEXT COMMENT '免费分发平台列表(JSON数组)',
    distribution_rules TEXT COMMENT '分发规则说明',
    special_benefits TEXT COMMENT '特殊权益(如:免费授权、赠送平台、额外服务等)',
    
    -- ==========================================
    -- 品牌合作信息
    -- ==========================================
    past_cooperation_brands TEXT COMMENT '历史合作品牌列表(JSON数组)',
    cooperation_industries VARCHAR(500) COMMENT '合作行业类目(如:汽车、美妆、快消、3C等)',
    
    -- ==========================================
    -- 资质和认证
    -- ==========================================
    certifications TEXT COMMENT '专业认证和资质(JSON数组,如:讲师认证、官方推荐官)',
    awards_honors TEXT COMMENT '获奖荣誉(JSON数组)',
    
    -- ==========================================
    -- 内容特色
    -- ==========================================
    content_style VARCHAR(500) COMMENT '内容风格描述',
    target_audience VARCHAR(200) COMMENT '目标受众群体',
    content_advantages TEXT COMMENT '内容优势和特点',
    
    -- ==========================================
    -- 关联账号
    -- ==========================================
    related_accounts TEXT COMMENT '关联账号信息(JSON数组,如:小号、家庭成员账号)',
    account_matrix VARCHAR(200) COMMENT '账号矩阵说明',
    
    -- ==========================================
    -- 数据状态和时间戳
    -- ==========================================
    data_status SMALLINT DEFAULT 1 COMMENT '数据状态(1:有效,0:无效,-1:删除)',
    data_source VARCHAR(50) DEFAULT '星链计划' COMMENT '数据来源',
    import_date DATE COMMENT '数据导入日期',
    
    -- ==========================================
    -- 审计字段
    -- ==========================================
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    created_by VARCHAR(50) COMMENT '创建人',
    updated_by VARCHAR(50) COMMENT '更新人',
    
    -- ==========================================
    -- 备注
    -- ==========================================
    remark TEXT COMMENT '备注信息',
    
    -- ==========================================
    -- 索引设计
    -- ==========================================
    INDEX idx_nickname (nickname),
    INDEX idx_primary_platform (primary_platform),
    INDEX idx_account_category (account_category),
    INDEX idx_fans_count (fans_count DESC),
    INDEX idx_current_order_count (current_order_count),
    INDEX idx_min_rebate_rate (min_rebate_rate DESC),
    INDEX idx_max_rebate_rate (max_rebate_rate DESC),
    INDEX idx_data_status (data_status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='星链计划KOL达人信息表';


-- ==========================================
-- 字段说明文档
-- ==========================================

/*
表设计原则:
1. 第一范式(1NF): 
   - 所有字段均为原子值
   - 多值属性(如平台列表)使用TEXT格式存储JSON数据,便于查询和扩展
   - 政策梯度信息使用TEXT+JSON数组存储,每个梯度为一个独立对象
   
2. 第二范式(2NF):
   - 主键为id(自增),所有字段完全依赖于主键
   - 没有部分函数依赖
   
3. 第三范式(3NF):
   - 消除了传递依赖
   - 返点比例、CPM、CPE、保证播放量等不再直接存储为独立字段
   - 这些指标通过policy_tiers字段与订单量建立关系
   - current_order_count记录当前订单数,通过查询policy_tiers动态获取对应政策

JSON字段性能优化说明:
1. 使用TEXT类型而非JSON类型:
   - TEXT类型兼容性更好,支持所有MySQL版本
   - 可以存储JSON格式数据,但不强制验证
   - 对于不需要频繁查询JSON内部字段的场景,性能更优

2. 增加冗余字段优化检索:
   - policy_tiers_summary: 用于快速文本搜索
   - min_rebate_rate/max_rebate_rate: 用于范围查询和排序
   - has_guaranteed_metrics: 用于布尔筛选
   - 这些冗余字段可以避免对JSON的全表扫描,显著提升查询性能

3. 查询策略:
   - 常规查询使用冗余字段(如min_rebate_rate)
   - 详细信息解析时才解析JSON字段
   - 建议为常用查询字段建立索引

政策梯度JSON结构示例:
[
    {
        "order_range": "1-3",      // 订单范围描述
        "order_min": 1,             // 最小订单数
        "order_max": 3,             // 最大订单数
        "rebate_rate": 30.00,       // 返点比例(%)
        "cpm": 100,                 // CPM要求
        "cpe": 5,                   // CPE要求
        "guaranteed_playback": null // 保证播放量
    },
    {
        "order_range": "3-8",
        "order_min": 3,
        "order_max": 8,
        "rebate_rate": 33.00,
        "cpm": 100,
        "cpe": 5,
        "guaranteed_playback": 5000000
    },
    {
        "order_range": "8+",
        "order_min": 8,
        "order_max": null,          // null表示无上限
        "rebate_rate": 35.00,
        "cpm": 100,
        "cpe": 5,
        "guaranteed_playback": 8000000
    }
]

合作简介字段设计说明:
基于CSV数据分析,将原有的"合作简介/说明"拆分为以下细化字段:

1. kol_introduction: 达人基础信息
   - 个人背景、职业经历
   - 专业领域和擅长方向
   - 个人特色和风格

2. achievement_highlights: 成就数据
   - 全网粉丝数、获赞数
   - 播放量、月链接用户数
   - 特别成就(如:单条视频破亿)

3. ranking_info: 榜单排名
   - 星图榜单排名
   - 平台官方榜单
   - 行业榜单位置

4. collaboration_platforms: 可合作平台
   - JSON数组格式: ["抖音","快手","小红书"]

5. distribution_platforms: 免费分发平台
   - JSON数组格式: ["视频号","微博"]

6. distribution_rules: 分发规则
   - 不同平台的分发限制
   - 例:"合作抖音可分发除快手外所有平台"

7. special_benefits: 特殊权益
   - 免费授权时长
   - 赠送平台/服务
   - 额外福利(如:直播1小时)

8. past_cooperation_brands: 历史合作品牌
   - JSON数组: ["华为","小米","雅诗兰黛"]

9. cooperation_industries: 合作行业
   - 适合的行业类目列表

10. certifications: 专业认证
    - 官方认证、职业资格
    - 例:"BMW认证高级驾驶及产品培训师"

11. content_style: 内容风格
    - 视频风格特点
    - 例:"一人分饰多角、搞笑剧情"

12. related_accounts: 关联账号
    - 家庭成员账号
    - 小号/矩阵账号

数据类型选择:
- VARCHAR: 用于短文本(如昵称、平台名称)
- TEXT: 用于长文本和JSON数据(如简介、列表)
- DECIMAL: 用于精确数值(如粉丝量、返点比例)
- INTEGER: 用于整数(如报价、订单数)
- BOOLEAN: 用于布尔值(如是否保量)

业务规则:
1. nickname + primary_platform 组合应具有业务唯一性
2. 报价信息可能为空(部分平台不适用某些时长)
3. policy_tiers中的订单区间不应重叠
4. current_order_count记录累计合作订单数,用于匹配政策梯度
5. 通过查询policy_tiers动态获取当前订单数对应的返点、CPM、CPE等指标
6. supported_platforms 使用TEXT+JSON格式存储,示例: ["抖音","快手","小红书"]
7. 所有JSON数组字段均使用TEXT类型,便于扩展和兼容

索引策略:
1. 主键索引: id
2. 业务查询索引: nickname, primary_platform, account_category
3. 排序索引: fans_count(粉丝量降序)
4. 政策相关索引: min_rebate_rate, max_rebate_rate(返点比例范围查询)
5. 订单数索引: current_order_count(用于政策匹配查询)
6. 状态索引: data_status
7. 时间索引: created_at
*/


-- ==========================================
-- 示例数据插入
-- ==========================================

INSERT INTO kol_influencer_info (
    kol_serial_number,
    nickname,
    profile_url,
    star_platform_url,
    primary_platform,
    account_category,
    fans_count,
    price_1_20s,
    price_21_60s,
    price_60s_plus,
    policy_tiers,
    policy_tiers_summary,
    has_guaranteed_metrics,
    min_rebate_rate,
    max_rebate_rate,
    policy_remarks,
    current_order_count,
    kol_introduction,
    achievement_highlights,
    ranking_info,
    collaboration_platforms,
    distribution_platforms,
    distribution_rules,
    past_cooperation_brands,
    cooperation_industries,
    supported_platforms,
    orders_second_half_year,
    data_source,
    import_date
) VALUES (
    1,
    '虎哥说车',
    'https://www.douyin.com/user/MS4wLjABAAAAnzRLpvV9w2jXzWhHSsG5D4SoqfYazU1-fvgm4joaHXQ',
    'https://www.xingtu.cn/ad/creator/author-homepage/douyin-video/6674590795636408324',
    '抖音',
    '汽车',
    2823.3,
    240000,
    600000,
    600000,
    '[
        {
            "order_range": "1-3",
            "order_min": 1,
            "order_max": 3,
            "rebate_rate": 30.00,
            "cpm": 100,
            "cpe": 5,
            "guaranteed_playback": null
        },
        {
            "order_range": "3-8",
            "order_min": 3,
            "order_max": 8,
            "rebate_rate": 33.00,
            "cpm": 100,
            "cpe": 5,
            "guaranteed_playback": null
        },
        {
            "order_range": "8+",
            "order_min": 8,
            "order_max": null,
            "rebate_rate": 35.00,
            "cpm": 100,
            "cpe": 5,
            "guaranteed_playback": null
        }
    ]',
    '30%-35%梯度返点 CPM100 CPE5',
    TRUE,
    30.00,
    35.00,
    '合作抖音：可分发除快手外所有新媒体短视频平台；合作快手：可分发除抖音外所有新媒体短视频平台',
    1,
    '虎哥曾从事汿车主持17年，专业度非常高的说车人',
    '全网粉丝超2000w+，全平台作品累计超过40亿次播放量',
    '稳居抖音、快手的头部说车人位置',
    '["抖音","快手","小红书","视频号","懂车帝"]',
    '["小红书","视频号","今日头条","西瓜视频"]',
    '合作抖音：可分发除快手外所有平台；合作快手：可分发除抖音外所有平台',
    '[]',
    '汽车',
    '["抖音","快手","小红书","视频号","懂车帝"]',
    1,
    '星链计划',
    '2024-12-01'
);


-- ==========================================
-- 常用查询示例
-- ==========================================

-- 1. 查询粉丝量最高的前10位达人
SELECT nickname, primary_platform, fans_count, price_60s_plus, min_rebate_rate, max_rebate_rate
FROM kol_influencer_info
WHERE data_status = 1
ORDER BY fans_count DESC
LIMIT 10;

-- 2. 查询汽车类目的达人,按报价排序
SELECT nickname, account_category, fans_count, price_60s_plus, max_rebate_rate
FROM kol_influencer_info
WHERE account_category LIKE '%汽车%' AND data_status = 1
ORDER BY price_60s_plus DESC;

-- 3. 查询支持特定平台的达人(使用TEXT字段的模糊匹配)
SELECT nickname, primary_platform, supported_platforms
FROM kol_influencer_info
WHERE supported_platforms LIKE '%"小红书"%' AND data_status = 1;

-- 4. 统计各平台的达人数量
SELECT primary_platform, COUNT(*) as kol_count, AVG(fans_count) as avg_fans
FROM kol_influencer_info
WHERE data_status = 1
GROUP BY primary_platform
ORDER BY kol_count DESC;

-- 5. 查询返点比例在某个范围内的达人(使用冗余字段优化性能)
SELECT nickname, primary_platform, min_rebate_rate, max_rebate_rate, policy_tiers_summary
FROM kol_influencer_info
WHERE max_rebate_rate >= 35 
  AND data_status = 1
ORDER BY max_rebate_rate DESC
LIMIT 20;

-- 6. 查询有保量KPI的达人
SELECT nickname, primary_platform, fans_count, has_guaranteed_metrics, policy_remarks
FROM kol_influencer_info
WHERE has_guaranteed_metrics = TRUE AND data_status = 1;

-- 7. 更新达人的订单数
UPDATE kol_influencer_info 
SET current_order_count = current_order_count + 1,
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1;


-- ==========================================
-- 数据迁移建议
-- ==========================================

/*
从CSV导入数据时的处理建议:

1. 多值字段处理:
   - "全网平台"字段: 使用程序将"抖音、快手、小红书"转换为 ["抖音","快手","小红书"]
   
2. 政策梯度字段处理:
   - 解析"政策"字段中的订单量区间、返点比例、CPM、CPE等信息
   - 构建JSON数组,每个梯度为一个对象
   - 示例:
     输入: "1-3条：30% （CPM100 CPE5）; 3-8条：33% （CPM100 CPE5）"
     输出: [
         {"order_range":"1-3","order_min":1,"order_max":3,"rebate_rate":30,"cpm":100,"cpe":5},
         {"order_range":"3-8","order_min":3,"order_max":8,"rebate_rate":33,"cpm":100,"cpe":5}
     ]
   
3. 数值清洗:
   - 粉丝量: 已经是万为单位,直接导入
   - 报价: 去除千分位逗号,如"240,000"转为240000
   - 百分比: 去除%符号,如"30%"转为30.00

4. 文本清洗:
   - 去除换行符和箭头符号
   - 统一空格和标点符号
   
5. 空值处理:
   - 空字符串转为NULL
   - 数值型字段空值保持NULL

6. 扩展字段提取:
   - 从"合作简介"中提取tags标签
   - 从"合作简介"中提取cooperation_brands品牌列表
   
7. 订单数初始化:
   - current_order_count根据"当前政策梯度"和"下半年接单次数"推算
   - 或默认设置为0
*/
