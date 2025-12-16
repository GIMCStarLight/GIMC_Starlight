#!/bin/bash
# 数据采集进度监控脚本

while true; do
    clear
    echo "========================================"
    echo "  达人详情数据采集进度监控"
    echo "========================================"
    echo "更新时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    
    # 检查进程状态
    if ps aux | grep -q "[b]atch_fetch_author_details.py"; then
        echo "进程状态: 运行中 ✓"
        PID=$(ps aux | grep "[b]atch_fetch_author_details.py" | awk '{print $2}')
        echo "进程PID: $PID"
    else
        echo "进程状态: 已停止 ✗"
    fi
    echo ""
    
    # 查询数据库进度
    echo "数据库进度:"
    PGPASSWORD=postgres psql -h 192.168.102.168 -U postgres -d crawler_db_v2 << EOF
SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN self_intro IS NOT NULL THEN 1 END) as completed,
    COUNT(CASE WHEN self_intro IS NULL THEN 1 END) as remaining,
    ROUND(COUNT(CASE WHEN self_intro IS NOT NULL THEN 1 END) * 100.0 / COUNT(*), 2) as progress_pct
FROM authors_core 
WHERE follower > 10000;
EOF
    
    echo ""
    echo "目标: 10,000条"
    echo "----------------------------------------"
    echo "按 Ctrl+C 退出监控"
    echo "========================================"
    
    # 每60秒更新一次
    sleep 60
done
