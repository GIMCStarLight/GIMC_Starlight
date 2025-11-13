#!/bin/bash

# 省广星芒系统部署脚本
# 使用方法: ./deploy.sh [环境] [操作]
# 环境: dev, staging, production
# 操作: build, deploy, restart, logs, stop

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置
PROJECT_NAME="gimcstar-light-system"
DOCKER_COMPOSE_FILE="docker-compose.yml"
BACKUP_DIR="./backups"

# 函数定义
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 Docker 和 Docker Compose
check_dependencies() {
    log_info "检查依赖..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装或不在 PATH 中"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose 未安装或不在 PATH 中"
        exit 1
    fi
    
    log_success "依赖检查通过"
}

# 创建备份
create_backup() {
    log_info "创建数据备份..."
    
    mkdir -p $BACKUP_DIR
    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    
    # 备份 MySQL
    if docker ps | grep -q "gimcstar-mysql"; then
        docker exec gimcstar-mysql mysqldump -u gimcstar -pgimcstar123 gimcstar > "$BACKUP_DIR/mysql_backup_$TIMESTAMP.sql"
        log_success "MySQL 备份完成: $BACKUP_DIR/mysql_backup_$TIMESTAMP.sql"
    fi
    
    # 备份 PostgreSQL
    if docker ps | grep -q "gimcstar-postgres"; then
        docker exec gimcstar-postgres pg_dump -U postgres gimcstar > "$BACKUP_DIR/postgres_backup_$TIMESTAMP.sql"
        log_success "PostgreSQL 备份完成: $BACKUP_DIR/postgres_backup_$TIMESTAMP.sql"
    fi
}

# 构建镜像
build_image() {
    log_info "构建 Docker 镜像..."
    docker-compose -f $DOCKER_COMPOSE_FILE build --no-cache
    log_success "镜像构建完成"
}

# 部署服务
deploy_services() {
    log_info "部署服务..."
    
    # 创建备份
    create_backup
    
    # 停止现有服务
    docker-compose -f $DOCKER_COMPOSE_FILE down
    
    # 启动服务
    docker-compose -f $DOCKER_COMPOSE_FILE up -d
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 30
    
    # 健康检查
    health_check
    
    log_success "部署完成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    # 检查应用健康状态
    for i in {1..10}; do
        if curl -f http://localhost:9000/health &> /dev/null; then
            log_success "应用健康检查通过"
            return 0
        fi
        log_warning "健康检查失败，重试中... ($i/10)"
        sleep 10
    done
    
    log_error "健康检查失败"
    return 1
}

# 重启服务
restart_services() {
    log_info "重启服务..."
    docker-compose -f $DOCKER_COMPOSE_FILE restart
    health_check
    log_success "服务重启完成"
}

# 查看日志
show_logs() {
    log_info "显示服务日志..."
    docker-compose -f $DOCKER_COMPOSE_FILE logs -f --tail=100
}

# 停止服务
stop_services() {
    log_info "停止服务..."
    docker-compose -f $DOCKER_COMPOSE_FILE down
    log_success "服务已停止"
}

# 清理资源
cleanup() {
    log_info "清理未使用的 Docker 资源..."
    docker system prune -f
    docker volume prune -f
    log_success "清理完成"
}

# 显示帮助信息
show_help() {
    echo "省广星芒系统部署脚本"
    echo ""
    echo "使用方法:"
    echo "  $0 [操作]"
    echo ""
    echo "操作:"
    echo "  build     - 构建 Docker 镜像"
    echo "  deploy    - 完整部署 (包含备份、构建、启动)"
    echo "  restart   - 重启服务"
    echo "  logs      - 查看服务日志"
    echo "  stop      - 停止服务"
    echo "  health    - 健康检查"
    echo "  backup    - 创建数据备份"
    echo "  cleanup   - 清理 Docker 资源"
    echo "  help      - 显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 deploy   # 完整部署"
    echo "  $0 logs     # 查看日志"
    echo "  $0 restart  # 重启服务"
}

# 主逻辑
main() {
    local action=${1:-help}
    
    case $action in
        build)
            check_dependencies
            build_image
            ;;
        deploy)
            check_dependencies
            build_image
            deploy_services
            ;;
        restart)
            check_dependencies
            restart_services
            ;;
        logs)
            show_logs
            ;;
        stop)
            check_dependencies
            stop_services
            ;;
        health)
            health_check
            ;;
        backup)
            create_backup
            ;;
        cleanup)
            cleanup
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "未知操作: $action"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"