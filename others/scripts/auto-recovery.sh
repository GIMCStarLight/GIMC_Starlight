#!/bin/bash
# 自动故障恢复脚本

set -e

LOG_FILE="/var/log/auto-recovery.log"
MAX_RETRIES=3
RETRY_DELAY=5

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 检查服务健康状态
check_service_health() {
    local service_name=$1
    local port=$2
    local endpoint=${3:-/health}
    
    if curl -f -s --max-time 10 "http://localhost:$port$endpoint" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# 重启PM2服务
restart_pm2_service() {
    local service_name=$1
    log "🔄 Restarting PM2 service: $service_name"
    
    pm2 restart "$service_name" --update-env
    sleep 5
    
    # 验证重启是否成功
    if pm2 list | grep -q "$service_name.*online"; then
        log "✅ $service_name restarted successfully"
        return 0
    else
        log "❌ $service_name restart failed"
        return 1
    fi
}

# 清理内存缓存
clear_cache() {
    log "🧹 Clearing cache..."
    
    # 清理Redis缓存（保留重要数据）
    redis-cli FLUSHDB || log "⚠️  Redis flush failed"
    
    # 清理Node.js缓存
    pm2 flush || log "⚠️  PM2 flush failed"
    
    log "✅ Cache cleared"
}

# 检查并修复数据库连接
check_database() {
    log "🔍 Checking database connections..."
    
    # 检查MySQL
    if ! mysql -h localhost -u root -p"$MYSQL_PASSWORD" -e "SELECT 1" > /dev/null 2>&1; then
        log "⚠️  MySQL connection failed, attempting to restart..."
        systemctl restart mysql || service mysql restart
        sleep 3
    fi
    
    # 检查Redis
    if ! redis-cli PING > /dev/null 2>&1; then
        log "⚠️  Redis connection failed, attempting to restart..."
        systemctl restart redis || service redis restart
        sleep 3
    fi
    
    log "✅ Database connections OK"
}

# 自动恢复主流程
auto_recover() {
    local service=$1
    local port=$2
    local retry_count=0
    
    log "🚨 Auto-recovery triggered for $service (port: $port)"
    
    while [ $retry_count -lt $MAX_RETRIES ]; do
        retry_count=$((retry_count + 1))
        log "Attempt $retry_count/$MAX_RETRIES..."
        
        # 1. 检查数据库连接
        check_database
        
        # 2. 清理缓存
        clear_cache
        
        # 3. 重启服务
        if restart_pm2_service "$service"; then
            sleep 5
            
            # 4. 验证服务健康
            if check_service_health "$service" "$port"; then
                log "✅ Auto-recovery successful for $service"
                
                # 发送成功通知
                send_notification "✅ $service recovered successfully" "success"
                return 0
            fi
        fi
        
        log "⚠️  Recovery attempt $retry_count failed, retrying in ${RETRY_DELAY}s..."
        sleep $RETRY_DELAY
    done
    
    log "❌ Auto-recovery failed after $MAX_RETRIES attempts"
    
    # 发送失败告警
    send_notification "🚨 $service auto-recovery FAILED after $MAX_RETRIES attempts" "critical"
    
    return 1
}

# 发送通知
send_notification() {
    local message=$1
    local level=${2:-warning}
    
    if [ -n "$ALERT_WEBHOOK_URL" ]; then
        curl -X POST "$ALERT_WEBHOOK_URL" \
            -H 'Content-Type: application/json' \
            -d "{
                \"msgtype\": \"text\",
                \"text\": {
                    \"content\": \"【Auto Recovery】$message\n时间: $(date '+%Y-%m-%d %H:%M:%S')\"
                }
            }" 2>/dev/null || true
    fi
}

# 监控模式
monitor_mode() {
    log "🔍 Starting auto-recovery monitor..."
    
    while true; do
        # 检查后端服务
        if ! check_service_health "crawler-backend" 9000 "/api/v1"; then
            log "⚠️  Backend service unhealthy"
            auto_recover "crawler-backend" 9000
        fi
        
        # 检查Python API
        if ! check_service_health "crawler-api" 8000 "/api/health"; then
            log "⚠️  Python API unhealthy"
            auto_recover "crawler-api" 8000
        fi
        
        # 每30秒检查一次
        sleep 30
    done
}

# 主函数
main() {
    local mode=${1:-check}
    
    case $mode in
        "monitor")
            monitor_mode
            ;;
        "recover")
            auto_recover "${2:-crawler-backend}" "${3:-9000}"
            ;;
        "check")
            if check_service_health "${2:-crawler-backend}" "${3:-9000}"; then
                echo "✅ Service is healthy"
                exit 0
            else
                echo "❌ Service is unhealthy"
                exit 1
            fi
            ;;
        *)
            echo "Auto Recovery Script"
            echo ""
            echo "Usage: $0 <mode> [options]"
            echo ""
            echo "Modes:"
            echo "  monitor                      - Start continuous monitoring"
            echo "  recover <service> <port>     - Recover specific service"
            echo "  check <service> <port>       - Check service health"
            ;;
    esac
}

main "$@"
