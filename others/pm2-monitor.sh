#!/bin/bash

# PM2监控和管理脚本
# 使用方法: ./pm2-monitor.sh [status|logs|restart|stop|start]

set -e

# 配置变量
SERVER_IP="192.168.102.168"
SSH_KEY="/Users/samuel/Desktop/系统开发/others/192.168.102 (8).168_id_ed25519"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 查看服务状态
check_status() {
    log_info "查询服务状态..."
    ssh -i "$SSH_KEY" root@$SERVER_IP << 'EOF'
        echo "╔═══════════════════════════════════════════╗"
        echo "║        🚀 服务器运行状态监控          ║"
        echo "╚═══════════════════════════════════════════╝"
        echo ""
        echo "【PM2服务状态】"
        pm2 status
        echo ""
        echo "【系统资源使用】"
        pm2 monit --no-color | head -20
        echo ""
        echo "【Nginx状态】"
        systemctl status nginx --no-pager -l | head -5
        echo ""
        echo "【服务端口监听】"
        netstat -tlnp | grep -E ':(80|9000|8000)' || echo "未找到监听端口"
        echo ""
        echo "【磁盘使用】"
        df -h /www/wwwroot/gimcstar_proudction_env/gimcstar
        echo ""
        echo "【最近错误日志】"
        echo "=== 后端错误 ==="
        tail -5 /www/wwwroot/gimcstar_proudction_env/gimcstar/logs/backend-error.log 2>/dev/null || echo "无错误日志"
        echo ""
        echo "=== Python API错误 ==="
        tail -5 /www/wwwroot/gimcstar_proudction_env/gimcstar/logs/python-api-error.log 2>/dev/null || echo "无错误日志"
EOF
}

# 查看日志
view_logs() {
    local service=${1:-all}
    log_info "查看日志: $service"
    
    case $service in
        "backend")
            ssh -i "$SSH_KEY" root@$SERVER_IP "pm2 logs crawler-backend --lines 100"
            ;;
        "python"|"api")
            ssh -i "$SSH_KEY" root@$SERVER_IP "pm2 logs crawler-api --lines 100"
            ;;
        "all")
            ssh -i "$SSH_KEY" root@$SERVER_IP "pm2 logs --lines 50"
            ;;
        *)
            log_error "未知的服务: $service"
            echo "可用服务: backend, python, all"
            exit 1
            ;;
    esac
}

# 重启服务
restart_service() {
    local service=${1:-all}
    log_info "重启服务: $service"
    
    ssh -i "$SSH_KEY" root@$SERVER_IP << EOF
        case "$service" in
            "backend")
                pm2 restart crawler-backend
                echo "后端服务已重启"
                ;;
            "python"|"api")
                pm2 restart crawler-api
                echo "Python API服务已重启"
                ;;
            "nginx")
                systemctl restart nginx
                echo "Nginx已重启"
                ;;
            "all")
                pm2 restart all
                systemctl restart nginx
                echo "所有服务已重启"
                ;;
            *)
                echo "未知的服务: $service"
                echo "可用服务: backend, python, nginx, all"
                exit 1
                ;;
        esac
        
        sleep 3
        pm2 status
EOF
}

# 停止服务
stop_service() {
    local service=${1:-all}
    log_warn "停止服务: $service"
    
    ssh -i "$SSH_KEY" root@$SERVER_IP << EOF
        case "$service" in
            "backend")
                pm2 stop crawler-backend
                ;;
            "python"|"api")
                pm2 stop crawler-api
                ;;
            "all")
                pm2 stop all
                ;;
            *)
                echo "未知的服务: $service"
                exit 1
                ;;
        esac
        
        pm2 status
EOF
}

# 启动服务
start_service() {
    local service=${1:-all}
    log_info "启动服务: $service"
    
    ssh -i "$SSH_KEY" root@$SERVER_IP << EOF
        case "$service" in
            "backend")
                pm2 start crawler-backend
                ;;
            "python"|"api")
                pm2 start crawler-api
                ;;
            "all")
                pm2 start all
                ;;
            *)
                echo "未知的服务: $service"
                exit 1
                ;;
        esac
        
        sleep 2
        pm2 status
EOF
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    ssh -i "$SSH_KEY" root@$SERVER_IP << 'EOF'
        echo "【后端API健康检查】"
        curl -s http://localhost:9000/api/v1 | python3 -m json.tool 2>/dev/null || echo "❌ 后端API异常"
        echo ""
        
        echo "【Python API健康检查】"
        curl -s http://localhost:8009/api/health | python3 -m json.tool 2>/dev/null || echo "❌ Python API异常"
        echo ""
        
        echo "【Nginx健康检查】"
        curl -I -s http://localhost | head -5 || echo "❌ Nginx异常"
EOF
}

# 主函数
main() {
    local action=${1:-status}
    local service=${2:-all}
    
    case $action in
        "status"|"st")
            check_status
            ;;
        "logs"|"log")
            view_logs "$service"
            ;;
        "restart"|"rs")
            restart_service "$service"
            ;;
        "stop")
            stop_service "$service"
            ;;
        "start")
            start_service "$service"
            ;;
        "health"|"hc")
            health_check
            ;;
        "help"|"-h"|"--help")
            echo "PM2监控和管理脚本"
            echo ""
            echo "使用方法: $0 [action] [service]"
            echo ""
            echo "可用操作:"
            echo "  status, st     - 查看服务状态（默认）"
            echo "  logs, log      - 查看日志"
            echo "  restart, rs    - 重启服务"
            echo "  stop           - 停止服务"
            echo "  start          - 启动服务"
            echo "  health, hc     - 健康检查"
            echo ""
            echo "可用服务:"
            echo "  backend        - 后端NestJS服务"
            echo "  python, api    - Python API服务"
            echo "  nginx          - Nginx服务（仅restart）"
            echo "  all            - 所有服务（默认）"
            echo ""
            echo "示例:"
            echo "  $0 status               # 查看所有服务状态"
            echo "  $0 logs backend         # 查看后端日志"
            echo "  $0 restart python       # 重启Python API"
            echo "  $0 health               # 执行健康检查"
            ;;
        *)
            log_error "未知操作: $action"
            echo "使用 '$0 help' 查看帮助"
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
