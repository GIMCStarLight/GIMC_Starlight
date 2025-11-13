#!/bin/bash
# 简化的JSON数据导入脚本
# 使用psql直接导入

PGHOST="192.168.102.168"
PGPORT="5432"
PGUSER="postgres"
PGPASSWORD="postgres"
PGDATABASE="crawler_db_v2"

HISTORY_DIR="/Users/samuel/Desktop/爬虫方案/爬虫工程化开发/历史数据"

echo "============================================================"
echo "📦 历史JSON数据导入工具（简化版）"
echo "============================================================"

# 统计
total_files=0
processed_files=0
total_authors=0

# 查找所有JSON文件
echo "📁 查找JSON文件..."
json_files=$(find "$HISTORY_DIR" -name "*.json" -type f -size +1k | grep -v "summary_" | grep -v "failed_" | grep -v "jobs_" | grep -v "smart_")

total_files=$(echo "$json_files" | wc -l | tr -d ' ')
echo "找到 $total_files 个文件"

# 处理每个文件
echo ""
echo "🚀 开始导入数据..."

for file in $json_files; do
    filename=$(basename "$file")
    
    # 每100个文件显示一次进度
    if [ $((processed_files % 100)) -eq 0 ]; then
        echo "进度: $processed_files/$total_files 文件"
    fi
    
    # 使用Python解析JSON并生成SQL
    python3 << EOF
import json
import sys

try:
    with open('$file', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    authors = data.get('authors', [])
    
    for author in authors:
        attr = author.get('attribute_datas', {})
        author_id = attr.get('id')
        
        if not author_id:
            continue
        
        # 输出SQL
        print(f"-- Author: {attr.get('nick_name', 'Unknown')}")
        
        # 基础信息
        follower = attr.get('follower', 0) or 0
        nick_name = (attr.get('nick_name') or '未知').replace("'", "''")
        city = (attr.get('city') or '').replace("'", "''")
        province = (attr.get('province') or '').replace("'", "''")
        star_index = attr.get('star_index') or 'NULL'
        
        print(f"""
INSERT INTO authors_core (author_id, star_id, nick_name, follower, city, province, star_index, last_crawled_at)
VALUES ('{author_id}', '{author.get('star_id') or author_id}', '{nick_name}', {follower}, '{city}', '{province}', {star_index}, NOW())
ON CONFLICT (author_id) DO UPDATE SET
    nick_name = EXCLUDED.nick_name,
    follower = EXCLUDED.follower,
    city = EXCLUDED.city,
    province = EXCLUDED.province,
    star_index = EXCLUDED.star_index,
    updated_at = NOW(),
    last_crawled_at = EXCLUDED.last_crawled_at;
        """)
        
        # 粉丝数据
        print(f"""
INSERT INTO authors_fans_metrics (author_id, follower)
VALUES ('{author_id}', {follower})
ON CONFLICT (author_id) DO UPDATE SET follower = EXCLUDED.follower, updated_at = NOW();
        """)

except Exception as e:
    print(f"-- Error: {e}", file=sys.stderr)
EOF

    processed_files=$((processed_files + 1))
    
    # 每500个文件休息一下
    if [ $((processed_files % 500)) -eq 0 ]; then
        sleep 1
    fi
done | PGPASSWORD=$PGPASSWORD psql -h $PGHOST -U $PGUSER -d $PGDATABASE -q

echo ""
echo "============================================================"
echo "📊 导入统计"
echo "============================================================"
echo "总文件数: $total_files"
echo "处理文件: $processed_files"

# 查询最终数据量
PGPASSWORD=$PGPASSWORD psql -h $PGHOST -U $PGUSER -d $PGDATABASE << 'SQL'
SELECT 
    '✅ 导入完成' as status,
    (SELECT COUNT(*) FROM authors_core) as "核心数据",
    (SELECT COUNT(*) FROM authors_fans_metrics) as "粉丝数据",
    (SELECT COUNT(*) FROM authors_engagement_metrics) as "互动数据";
SQL

echo ""
echo "✅ 导入完成！"
