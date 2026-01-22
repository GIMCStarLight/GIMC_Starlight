#!/bin/bash
# 三账号并行采集脚本 - 使用模3分组避免冲突

TIMESTAMP=$(date '+%Y%m%d_%H%M%S')

echo "=== 启动三账号并行采集任务 ==="
echo "时间: $(date)"
echo ""

# 创建三个临时ID列表文件，将待采集ID按模3分组
echo "正在生成分组ID列表..."
python3 << 'PYTHON'
import psycopg2

conn = psycopg2.connect(
    host='192.168.102.168',
    port=5432,
    database='crawler_db_v2',
    user='postgres',
    password='postgres'
)
cur = conn.cursor()

# 查询缺失详情的达人ID，按粉丝数降序
cur.execute("""
    SELECT author_id 
    FROM authors_core 
    WHERE nick_name IS NULL 
       OR follower IS NULL 
       OR province IS NULL
    ORDER BY COALESCE(follower, 0) DESC
    LIMIT 900
""")

ids = [str(row[0]) for row in cur.fetchall()]

# 按模3分组
group1 = [id for i, id in enumerate(ids) if i % 3 == 0]
group2 = [id for i, id in enumerate(ids) if i % 3 == 1]
group3 = [id for i, id in enumerate(ids) if i % 3 == 2]

# 保存到文件
with open('/tmp/crawler_ids_account1.txt', 'w') as f:
    f.write('\n'.join(group1))
with open('/tmp/crawler_ids_account2.txt', 'w') as f:
    f.write('\n'.join(group2))
with open('/tmp/crawler_ids_account3.txt', 'w') as f:
    f.write('\n'.join(group3))

print(f"账号1: {len(group1)} 个达人")
print(f"账号2: {len(group2)} 个达人")
print(f"账号3: {len(group3)} 个达人")

cur.close()
conn.close()
PYTHON

# 账号1
echo ""
echo "启动账号1 (第1组)..."
nohup python entrypoints/batch_fetch_author_details.py \
  --mode file \
  --id-file /tmp/crawler_ids_account1.txt \
  --batch-size 30 \
  --qps 0.5 \
  --enable-adaptive \
  --cookie-file tools/account_manager/config/accounts/account_1/cookies.txt \
  --log-dir logs \
  --log-level INFO \
  > crawler_account1_${TIMESTAMP}.log 2>&1 &
PID1=$!
echo "✅ 账号1进程: $PID1"
sleep 2

# 账号2
echo "启动账号2 (第2组)..."
nohup python entrypoints/batch_fetch_author_details.py \
  --mode file \
  --id-file /tmp/crawler_ids_account2.txt \
  --batch-size 30 \
  --qps 0.5 \
  --enable-adaptive \
  --cookie-file tools/account_manager/config/accounts/account_2/cookies.txt \
  --log-dir logs \
  --log-level INFO \
  > crawler_account2_${TIMESTAMP}.log 2>&1 &
PID2=$!
echo "✅ 账号2进程: $PID2"
sleep 2

# 账号3
echo "启动账号3 (第3组)..."
nohup python entrypoints/batch_fetch_author_details.py \
  --mode file \
  --id-file /tmp/crawler_ids_account3.txt \
  --batch-size 30 \
  --qps 0.5 \
  --enable-adaptive \
  --cookie-file tools/account_manager/config/accounts/account_3/cookies.txt \
  --log-dir logs \
  --log-level INFO \
  > crawler_account3_${TIMESTAMP}.log 2>&1 &
PID3=$!
echo "✅ 账号3进程: $PID3"

echo ""
echo "=== 所有任务已启动 ==="
echo "账号1 PID: $PID1 (日志: crawler_account1_${TIMESTAMP}.log)"
echo "账号2 PID: $PID2 (日志: crawler_account2_${TIMESTAMP}.log)"
echo "账号3 PID: $PID3 (日志: crawler_account3_${TIMESTAMP}.log)"
echo ""
echo "监控命令:"
echo "  ps aux | grep batch_fetch_author_details"
echo "  tail -f crawler_account1_${TIMESTAMP}.log"
echo "  tail -f crawler_account2_${TIMESTAMP}.log"
echo "  tail -f crawler_account3_${TIMESTAMP}.log"

