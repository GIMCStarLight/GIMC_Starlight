#!/bin/bash
# 健康监控和告警脚本
# 使用方法: ./health-monitor.sh
# 建议通过crontab定时执行: */5 * * * * /path/to/health-monitor.sh

set -e

# 配置
LOG_FILE="/var/log/health-monitor.log"
ALERT_WEBHOOK="${ALERT_WEBHOOK_URL:-}"  # 钉钉/企微/Slack webhook
DISK_THRESHOLD=80
MEMORY_THRESHOLD=90
CPU_THRESHOLD=85

# 颜色
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 发送告警
send_alert() {
    local title=$1
    local message=$2
    local level=${3:-warning}
    
    log "[$level] $title: $message"
    
    # 如果配置了webhook，发送告警
    if [ -n "$ALERT_WEBHOOK" ]; then
        curl -X POST "$ALERT_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{
                \"msgtype\": \"text\",
                \"text\": {
                    \"content\": \"【$level】$title\n$message\n时间: $(date '+%Y-%m-%d %H:%M:%S')\"
                }
            }" 2>/dev/null || true
    fi
}

# 检查服务状态
check_service() {
    local service_name=$1
    local port=$2
    local endpoint=${3:-/health}
    
    if curl -f -s --max-time 5 "http://localhost:$port$endpoint" > /dev/null 2>&1; then
        log "✅ $service_name (端口:$port) 运行正常"
        return 0
    else
        send_alert "服务异常" "$service_name (端口:$port) 无法访问" "critical"
        return 1
    fi
}

# 检查磁盘空间
check_disk() {
    local usage=$(df -h /www | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [ "$usage" -gt "$DISK_THRESHOLD" ]; then
        send_alert "磁盘空间告警" "磁盘使用率: ${usage}% (阈值: ${DISK_THRESHOLD}%)" "warning"
        
        # 清理建议
        log "💡 清理建议："
        log "  - 检查日志文件: du -sh /www/wwwroot/gimcstar_proudction_env/gimcstar/logs/*"
        log "  - 清理旧日志: find /www/wwwroot/gimcstar_proudction_env/gimcstar/logs -name '*.log.*' -mtime +7 -delete"
        return 1
    else
        log "✅ 磁盘空间正常: ${usage}%"
        return 0
    fi
}

# 检查内存
check_memory() {
    local usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    
    if [ "$usage" -gt "$MEMORY_THRESHOLD" ]; then
        send_alert "内存告警" "内存使用率: ${usage}% (阈值: ${MEMORY_THRESHOLD}%)" "warning"
        
        # 显示内存占用前5的进程
        log "💡 内存占用前5的进程："
        ps aux --sort=-%mem | head -6 | tee -a "$LOG_FILE"
        return 1
    else
        log "✅ 内存正常: ${usage}%"
        return 0
    fi
}

# 检查CPU
check_cpu() {
    local usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
    local usage_int=$(printf "%.0f" "$usage")
    
    if [ "$usage_int" -gt "$CPU_THRESHOLD" ]; then
        send_alert "CPU告警" "CPU使用率: ${usage}% (阈值: ${CPU_THRESHOLD}%)" "warning"
        
        # 显示CPU占用前5的进程
        log "💡 CPU占用前5的进程："
        ps aux --sort=-%cpu | head -6 | tee -a "$LOG_FILE"
        return 1
    else
        log "✅ CPU正常: ${usage}%"
        return 0
    fi
}

# 检查PM2服务
check_pm2() {
    if ! command -v pm2 &> /dev/null; then
        send_alert "PM2未安装" "系统中未找到PM2" "critical"
        return 1
    fi
    
    # 检查是否有stopped的服务
    local stopped=$(pm2 jlist 2>/dev/null | jq -r '.[] | select(.pm2_env.status != "online") | .name' 2>/dev/null)
    
    if [ -n "$stopped" ]; then
        send_alert "PM2服务异常" "以下服务已停止:\n$stopped" "critical"
        
        # 尝试重启
        log "🔄 尝试重启停止的服务..."
        pm2 restart all
        return 1
    else
        log "✅ PM2所有服务运行正常"
        return 0
    fi
}

# 检查Nginx
check_nginx() {
    if systemctl is-active --quiet nginx 2>/dev/null || service nginx status &>/dev/null; then
        log "✅ Nginx运行正常"
        return 0
    else
        send_alert "Nginx异常" "Nginx服务未运行" "critical"
        
        # 尝试启动
        log "🔄 尝试启动Nginx..."
        systemctl start nginx 2>/dev/null || service nginx start 2>/dev/null
        return 1
    fi
}

# 检查日志错误
check_logs() {
    local error_count=$(grep -i "error\|exception\|fatal" /www/wwwroot/gimcstar_proudction_env/gimcstar/logs/*.log 2>/dev/null | tail -100 | wc -l)
    
    if [ "$error_count" -gt 50 ]; then
        send_alert "日志异常" "最近100行日志中发现${error_count}个错误" "warning"
        
        log "💡 最近错误日志示例："
        grep -i "error\|exception\|fatal" /www/wwwroot/gimcstar_proudction_env/gimcstar/logs/*.log 2>/dev/null | tail -5 | tee -a "$LOG_FILE"
        return 1
    else
        log "✅ 日志正常 (错误数: $error_count)"
        return 0
    fi
}

# 主检查流程
main() {
    log "========================================"
    log "🔍 开始健康检查"
    log "========================================"
    
    local failed=0
    
    # 检查系统资源
    check_disk || ((failed++))
    check_memory || ((failed++))
    check_cpu || ((failed++))
    
    # 检查服务
    check_nginx || ((failed++))
    check_pm2 || ((failed++))
    check_service "Backend API" 9000 "/api/v1" || ((failed++))
    check_service "Python API" 8000 "/api/health" || ((failed++))
    
    # 检查日志
    check_logs || ((failed++))
    
    log "========================================"
    if [ $failed -eq 0 ]; then
        log "✅ 所有检查通过"
    else
        log "⚠️  发现 $failed 个问题"
        send_alert "健康检查完成" "发现 $failed 个问题，请查看日志" "warning"
    fi
    log "========================================"
}

# 执行主函数
main
