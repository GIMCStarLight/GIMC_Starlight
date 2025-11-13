#!/bin/bash

# 爬虫工程化开发项目自动化部署更新脚本
# 使用方法: ./deploy-update.sh [frontend|backend|task_control|all]

set -e

# 配置变量
SERVER_IP="192.168.102.168"
SSH_KEY="/Users/samuel/Desktop/爬虫方案/爬虫工程化开发/192.168.102 (5).168_id_ed25519"  # SSH密钥路径
SERVER_PATH="/www/wwwroot/gimcstar_proudction_env/gimcstar"  # 服务器部署路径
LOCAL_PATH="/Users/samuel/Desktop/爬虫方案/爬虫工程化开发"
BACKUP_DIR="/www/backup"  # 备份目录

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# 检查SSH连接
check_connection() {
    log_info "检查服务器连接..."
    if ssh -i "$SSH_KEY" -o ConnectTimeout=10 root@$SERVER_IP "echo 'Connection OK'" > /dev/null 2>&1; then
        log_info "服务器连接正常"
    else
        log_error "无法连接到服务器"
        exit 1
    fi
}

# 创建备份
create_backup() {
    log_info "创建备份..."
    local backup_name="backup-$(date +%Y%m%d-%H%M%S)"
    
    ssh -i "$SSH_KEY" root@$SERVER_IP << EOF
        # 创建备份目录
        mkdir -p $BACKUP_DIR/$backup_name
        
        # 备份代码
        cp -r $SERVER_PATH/backend $BACKUP_DIR/$backup_name/ 2>/dev/null || true
        cp -r $SERVER_PATH/task_control $BACKUP_DIR/$backup_name/ 2>/dev/null || true
        
        # 备份PM2配置
        pm2 save --force
        cp ~/.pm2/dump.pm2 $BACKUP_DIR/$backup_name/ 2>/dev/null || true
        
        # 记录备份信息
        echo "$backup_name" > $BACKUP_DIR/latest_backup
        echo "Backup created at: \$(date)" > $BACKUP_DIR/$backup_name/backup_info.txt
        echo "Git commit: \$(cd $SERVER_PATH/backend && git rev-parse HEAD 2>/dev/null || echo 'N/A')" >> $BACKUP_DIR/$backup_name/backup_info.txt
        
        echo "$backup_name"
EOF
}

# 回滚部署
rollback_deployment() {
    log_warn "执行回滚..."
    
    local backup_name=$(ssh -i "$SSH_KEY" root@$SERVER_IP "cat $BACKUP_DIR/latest_backup 2>/dev/null || echo ''")
    
    if [ -z "$backup_name" ]; then
        log_error "未找到备份，无法回滚"
        return 1
    fi
    
    log_info "使用备份: $backup_name"
    
    ssh -i "$SSH_KEY" root@$SERVER_IP << EOF
        # 停止服务
        pm2 stop all
        
        # 恢复代码
        if [ -d "$BACKUP_DIR/$backup_name/backend" ]; then
            rm -rf $SERVER_PATH/backend
            cp -r $BACKUP_DIR/$backup_name/backend $SERVER_PATH/
            echo "✅ Backend代码已恢复"
        fi
        
        if [ -d "$BACKUP_DIR/$backup_name/task_control" ]; then
            rm -rf $SERVER_PATH/task_control
            cp -r $BACKUP_DIR/$backup_name/task_control $SERVER_PATH/
            echo "✅ Task control代码已恢复"
        fi
        
        # 恢复PM2配置
        if [ -f "$BACKUP_DIR/$backup_name/dump.pm2" ]; then
            cp $BACKUP_DIR/$backup_name/dump.pm2 ~/.pm2/
            pm2 resurrect
            echo "✅ PM2配置已恢复"
        else
            pm2 start all
        fi
        
        sleep 3
        pm2 status
EOF
    
    log_info "回滚完成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    local failed=0
    
    # 检查后端API（尝试多个端点）
    if ssh -i "$SSH_KEY" root@$SERVER_IP "curl -s --max-time 10 http://localhost:9000/api/v1/health > /dev/null || curl -s --max-time 10 http://localhost:9000/api/health > /dev/null || pm2 describe crawler-backend | grep -q 'online'"; then
        log_info "✅ 后端服务运行正常"
    else
        log_error "后端API健康检查失败"
        ((failed++))
    fi
    
    # 检查Python API
    if ! ssh -i "$SSH_KEY" root@$SERVER_IP "curl -f -s --max-time 10 http://localhost:8009/api/health > /dev/null"; then
        log_error "Python API健康检查失败"
        ((failed++))
    fi
    
    if [ $failed -gt 0 ]; then
        log_error "健康检查失败 ($failed 个错误)"
        return 1
    fi
    
    log_info "✅ 健康检查通过"
    return 0
}

# 更新前端
update_frontend() {
    log_info "开始更新前端..."
    
    # 本地构建前端
    log_info "本地构建前端..."
    cd "$LOCAL_PATH/frontend"
    
    # 先构建核心包
    log_info "构建核心包..."
    pnpm -r --filter "@vben-core/*" run build || log_warn "部分核心包构建失败，继续..."
    
    # 构建主应用
    pnpm install
    pnpm run build || {
        log_warn "前端构建失败，跳过前端部署"
        return 1
    }
    
    # 同步构建结果到服务器
    log_info "同步前端文件到服务器..."
    rsync -avz --delete \
        -e "ssh -i '$SSH_KEY'" \
        "$LOCAL_PATH/frontend/dist/" \
        "root@$SERVER_IP:$SERVER_PATH/frontend/dist/"
    
    log_info "前端更新完成"
}

# 更新后端
update_backend() {
    log_info "开始更新后端..."
    
    # 同步后端代码（排除 node_modules 和日志）
    log_info "同步后端代码到服务器..."
    rsync -avz --delete \
        --exclude 'node_modules' \
        --exclude 'dist' \
        --exclude 'logs' \
        --exclude '.env' \
        -e "ssh -i '$SSH_KEY'" \
        "$LOCAL_PATH/backend/" \
        "root@$SERVER_IP:$SERVER_PATH/backend/"
    
    # 同步生产环境配置
    log_info "同步生产环境配置..."
    rsync -avz \
        -e "ssh -i '$SSH_KEY'" \
        "$LOCAL_PATH/backend/.env.production" \
        "root@$SERVER_IP:$SERVER_PATH/backend/.env"
    
    # 在服务器上重新安装依赖和重启服务
    log_info "在服务器上更新后端依赖和重启服务..."
    ssh -i "$SSH_KEY" root@$SERVER_IP << 'EOF'
        cd /www/wwwroot/gimcstar_proudction_env/gimcstar/backend
        
        # 创建日志目录
        mkdir -p /www/wwwroot/gimcstar_proudction_env/gimcstar/logs
        
        # 安装依赖
        pnpm install --prod=false
        
        # 构建项目
        pnpm run build
        
        # 停止现有PM2服务
        pm2 stop crawler-backend || true
        pm2 delete crawler-backend || true
        
        # 使用PM2启动服务
        pm2 start dist/src/main.js --name crawler-backend \
            --env production \
            --max-memory-restart 500M \
            --error /www/wwwroot/gimcstar_proudction_env/gimcstar/logs/backend-error.log \
            --output /www/wwwroot/gimcstar_proudction_env/gimcstar/logs/backend-out.log
        
        # 保存PM2配置
        pm2 save
        
        # 设置PM2开机自启
        pm2 startup || true
        
        # 等待服务启动
        sleep 5
        
        # 检查服务状态
        if curl -s http://localhost:9000/api/v1 > /dev/null; then
            echo "后端服务启动成功"
            pm2 status
        else
            echo "后端服务启动失败"
            pm2 logs crawler-backend --lines 20
            exit 1
        fi
EOF
    
    log_info "后端更新完成"
}

# 更新Python任务控制系统
update_task_control() {
    log_info "开始更新Python任务控制系统..."
    
    # 同步Python代码（排除虚拟环境和缓存）
    log_info "同步task_control代码到服务器..."
    rsync -avz --delete \
        --exclude '__pycache__' \
        --exclude '*.pyc' \
        --exclude '.pytest_cache' \
        --exclude 'venv' \
        --exclude '.env' \
        --exclude 'output' \
        --exclude 'reports' \
        -e "ssh -i '$SSH_KEY'" \
        "$LOCAL_PATH/task_control/" \
        "root@$SERVER_IP:$SERVER_PATH/task_control/"
    
    # 在服务器上更新Python依赖
    log_info "在服务器上更新Python依赖..."
    ssh -i "$SSH_KEY" root@$SERVER_IP << 'EOF'
        cd /www/wwwroot/gimcstar_proudction_env/gimcstar/task_control
        
        # 创建虚拟环境（如果不存在）
        if [ ! -d "venv" ]; then
            python3 -m venv venv
        fi
        
        # 激活虚拟环境并安装依赖
        source venv/bin/activate
        pip install --upgrade pip
        pip install -r requirements_api.txt || true
        
        # 安装额外依赖
        pip install requests psycopg2-binary python-dotenv || true
        
        # 停止现有服务
        pm2 stop crawler-api || true
        pm2 delete crawler-api || true
        
        # 启动RESTful API服务（清理旧端口）
        lsof -ti:8009 | xargs kill -9 2>/dev/null || true
        
        pm2 start entrypoints/restful_api_server.py --name crawler-api \
            --interpreter venv/bin/python \
            --max-memory-restart 1G \
            --error /www/wwwroot/gimcstar_proudction_env/gimcstar/logs/python-api-error.log \
            --output /www/wwwroot/gimcstar_proudction_env/gimcstar/logs/python-api-out.log \
            -- --host 0.0.0.0 --port 8009
        
        # 保存PM2配置
        pm2 save
        
        # 等待服务启动
        sleep 3
        
        # 检查服务状态
        if curl -s http://localhost:8009/api/health > /dev/null; then
            echo "Python API服务启动成功"
        else
            echo "Python API服务启动可能失败，请检查日志"
            pm2 logs crawler-api --lines 10
        fi
EOF
    
    log_info "Python任务控制系统更新完成"
}

# 配置Nginx反向代理
configure_nginx() {
    log_info "开始配置Nginx反向代理..."
    
    # 同步Nginx配置文件
    log_info "同步Nginx配置文件到服务器..."
    rsync -avz \
        -e "ssh -i '$SSH_KEY'" \
        "$LOCAL_PATH/nginx-production.conf" \
        "root@$SERVER_IP:/tmp/crawler-nginx.conf"
    
    # 在服务器上安装和配置Nginx
    ssh -i "$SSH_KEY" root@$SERVER_IP << 'EOF'
        # 安装Nginx（如果未安装）
        if ! command -v nginx &> /dev/null; then
            echo "安装Nginx..."
            apt-get update && apt-get install -y nginx || yum install -y nginx
        fi
        
        # 备份现有配置
        if [ -f /etc/nginx/nginx.conf ]; then
            cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup.$(date +%Y%m%d-%H%M%S)
        fi
        
        # 复制新配置
        cp /tmp/crawler-nginx.conf /etc/nginx/nginx.conf
        
        # 测试Nginx配置
        if nginx -t; then
            echo "Nginx配置测试通过"
            # 重启Nginx
            systemctl restart nginx || service nginx restart
            systemctl enable nginx || chkconfig nginx on
            echo "Nginx已重启并设置为开机自启"
        else
            echo "Nginx配置测试失败，恢复备份"
            if [ -f /etc/nginx/nginx.conf.backup.* ]; then
                cp $(ls -t /etc/nginx/nginx.conf.backup.* | head -1) /etc/nginx/nginx.conf
            fi
            exit 1
        fi
EOF
    
    log_info "Nginx配置完成"
}

# 验证部署
verify_deployment() {
    log_info "验证部署结果..."
    
    # 检查前端（支持HTTP和HTTPS）
    if curl -s -I "http://$SERVER_IP" | grep -q "200\|301\|302"; then
        log_info "✅ 前端HTTP访问正常"
    elif curl -s -I "https://$SERVER_IP" | grep -q "200\|301\|302"; then
        log_info "✅ 前端HTTPS访问正常"
    else
        log_warn "❌ 前端访问异常"
    fi
    
    # 检查后端API
    if curl -s "http://$SERVER_IP:9000/api/v1" > /dev/null 2>&1; then
        log_info "✅ 后端API访问正常"
    else
        log_warn "❌ 后端API访问异常"
    fi
    
    # 检查Python API
    if curl -s "http://$SERVER_IP:8009/api/health" > /dev/null 2>&1; then
        log_info "✅ Python API访问正常"
    else
        log_warn "❌ Python API访问异常"
    fi
    
    log_info "部署验证完成"
    log_info "前端访问地址: http://$SERVER_IP"
    log_info "后端API地址: http://$SERVER_IP:9000/api/v1"
    log_info "Python API地址: http://$SERVER_IP:8009/api/v1"
    log_info "Python API文档: http://$SERVER_IP:8009/docs"
    log_warn "注意: 为了安全性和完整功能，建议配置HTTPS访问和Nginx反向代理"
}

# 主函数
main() {
    local action=${1:-all}
    
    log_info "开始部署更新: $action"
    
    check_connection
    
    # 创建备份
    local backup_name=$(create_backup)
    log_info "备份已创建: $backup_name"
    
    case $action in
        "frontend")
            update_frontend || {
                log_error "前端更新失败"
                rollback_deployment
                exit 1
            }
            ;;
        "backend")
            update_backend || {
                log_error "后端更新失败"
                rollback_deployment
                exit 1
            }
            health_check || {
                log_error "健康检查失败，执行回滚"
                rollback_deployment
                exit 1
            }
            ;;
        "task_control"|"python")
            update_task_control || {
                log_error "Python任务系统更新失败"
                rollback_deployment
                exit 1
            }
            health_check || {
                log_error "健康检查失败，执行回滚"
                rollback_deployment
                exit 1
            }
            ;;
        "nginx")
            configure_nginx
            ;;
        "rollback")
            rollback_deployment
            exit 0
            ;;
        "all")
            update_backend || {
                log_error "后端更新失败"
                rollback_deployment
                exit 1
            }
            
            update_task_control || {
                log_error "Python任务系统更新失败"
                rollback_deployment
                exit 1
            }
            
            configure_nginx
            
            # 更新前端（构建并同步 dist）
            update_frontend || {
                log_error "前端更新失败"
                rollback_deployment
                exit 1
            }

            # 执行健康检查
            if ! health_check; then
                log_error "健康检查失败，执行回滚"
                rollback_deployment
                exit 1
            fi
            ;;
        *)
            log_error "无效的参数: $action"
            echo "使用方法: $0 [frontend|backend|task_control|nginx|rollback|all]"
            echo "  frontend      - 仅更新前端"
            echo "  backend       - 仅更新后端"
            echo "  task_control  - 仅更新Python任务控制系统"
            echo "  nginx         - 仅配置Nginx反向代理"
            echo "  rollback      - 回滚到最近的备份"
            echo "  all           - 更新所有组件（默认）"
            exit 1
            ;;
    esac
    
    verify_deployment
    log_info "🎉 部署更新完成!"
}

# 执行主函数
main "$@"