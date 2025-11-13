#!/bin/bash
# 多环境配置管理脚本

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_DIR="$PROJECT_ROOT/backend/envs"

# 颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 创建环境配置目录结构
init_env_structure() {
    log_info "初始化环境配置目录..."
    
    mkdir -p "$ENV_DIR"/{development,staging,production,testing}
    
    # 创建环境配置模板
    for env in development staging production testing; do
        if [ ! -f "$ENV_DIR/$env/.env" ]; then
            cat > "$ENV_DIR/$env/.env" << EOF
# ${env^^} Environment Configuration
# Generated at: $(date)

# Application
NODE_ENV=$env
PORT=\${PORT:-9000}
API_PREFIX=api/v1

# JWT
JWT_SECRET=\${JWT_SECRET}
JWT_REFRESH_SECRET=\${JWT_REFRESH_SECRET}
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Database
MYSQL_HOST=\${MYSQL_HOST}
MYSQL_PORT=3306
MYSQL_USERNAME=\${MYSQL_USERNAME}
MYSQL_PASSWORD=\${MYSQL_PASSWORD}
MYSQL_DATABASE=\${MYSQL_DATABASE}
MYSQL_SYNCHRONIZE=false
MYSQL_LOGGING=false

# Database Replication (Optional)
MYSQL_ENABLE_REPLICATION=false
MYSQL_SLAVE_HOST=\${MYSQL_SLAVE_HOST}
MYSQL_SLAVE_PORT=3306
MYSQL_SLAVE_USERNAME=\${MYSQL_SLAVE_USERNAME}
MYSQL_SLAVE_PASSWORD=\${MYSQL_SLAVE_PASSWORD}

# Redis
REDIS_HOST=\${REDIS_HOST}
REDIS_PORT=6379
REDIS_PASSWORD=\${REDIS_PASSWORD}
REDIS_DB=1

# Monitoring
ENABLE_METRICS=true
ENABLE_HEALTH_CHECK=true

# Feature Flags
ENABLE_API_DOCS=$([ "$env" = "production" ] && echo "false" || echo "true")
ENABLE_DEBUG=$([ "$env" = "production" ] && echo "false" || echo "true")
EOF
            log_info "Created $env environment template"
        fi
    done
}

# 切换环境
switch_env() {
    local target_env=$1
    
    if [ -z "$target_env" ]; then
        log_error "Environment name is required"
        echo "Available environments: development, staging, production, testing"
        exit 1
    fi
    
    if [ ! -d "$ENV_DIR/$target_env" ]; then
        log_error "Environment '$target_env' does not exist"
        exit 1
    fi
    
    log_info "Switching to $target_env environment..."
    
    # 备份当前配置
    if [ -f "$PROJECT_ROOT/backend/.env" ]; then
        cp "$PROJECT_ROOT/backend/.env" "$PROJECT_ROOT/backend/.env.backup.$(date +%Y%m%d%H%M%S)"
    fi
    
    # 复制环境配置
    cp "$ENV_DIR/$target_env/.env" "$PROJECT_ROOT/backend/.env"
    
    log_info "✅ Switched to $target_env environment"
    log_warn "Please verify the configuration in backend/.env"
}

# 验证环境配置
validate_env() {
    local env_name=$1
    local env_file="$ENV_DIR/$env_name/.env"
    
    if [ ! -f "$env_file" ]; then
        log_error "Environment file not found: $env_file"
        exit 1
    fi
    
    log_info "Validating $env_name environment..."
    
    # 必需的环境变量
    required_vars=(
        "JWT_SECRET"
        "JWT_REFRESH_SECRET"
        "MYSQL_HOST"
        "MYSQL_USERNAME"
        "MYSQL_PASSWORD"
        "REDIS_HOST"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" "$env_file" || grep -q "^${var}=\${" "$env_file"; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        log_error "Missing required variables in $env_name:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        exit 1
    fi
    
    log_info "✅ $env_name environment is valid"
}

# 加密敏感配置
encrypt_secrets() {
    local env_name=$1
    local env_file="$ENV_DIR/$env_name/.env"
    
    if [ ! -f "$env_file" ]; then
        log_error "Environment file not found: $env_file"
        exit 1
    fi
    
    log_info "Encrypting secrets for $env_name..."
    
    # 使用openssl加密
    openssl enc -aes-256-cbc -salt -pbkdf2 \
        -in "$env_file" \
        -out "$env_file.encrypted" \
        -k "${ENCRYPTION_PASSWORD:-default-password}"
    
    log_info "✅ Secrets encrypted: $env_file.encrypted"
    log_warn "Store ENCRYPTION_PASSWORD securely!"
}

# 解密敏感配置
decrypt_secrets() {
    local env_name=$1
    local encrypted_file="$ENV_DIR/$env_name/.env.encrypted"
    
    if [ ! -f "$encrypted_file" ]; then
        log_error "Encrypted file not found: $encrypted_file"
        exit 1
    fi
    
    log_info "Decrypting secrets for $env_name..."
    
    openssl enc -aes-256-cbc -d -pbkdf2 \
        -in "$encrypted_file" \
        -out "$ENV_DIR/$env_name/.env" \
        -k "${ENCRYPTION_PASSWORD:-default-password}"
    
    log_info "✅ Secrets decrypted"
}

# 比较环境配置差异
diff_envs() {
    local env1=$1
    local env2=$2
    
    if [ -z "$env1" ] || [ -z "$env2" ]; then
        log_error "Two environment names are required"
        exit 1
    fi
    
    log_info "Comparing $env1 vs $env2..."
    
    diff -u "$ENV_DIR/$env1/.env" "$ENV_DIR/$env2/.env" || true
}

# 主函数
main() {
    local command=${1:-help}
    
    case $command in
        "init")
            init_env_structure
            ;;
        "switch")
            switch_env "$2"
            ;;
        "validate")
            validate_env "${2:-development}"
            ;;
        "encrypt")
            encrypt_secrets "${2:-production}"
            ;;
        "decrypt")
            decrypt_secrets "${2:-production}"
            ;;
        "diff")
            diff_envs "$2" "$3"
            ;;
        "help"|*)
            echo "Multi-Environment Configuration Manager"
            echo ""
            echo "Usage: $0 <command> [options]"
            echo ""
            echo "Commands:"
            echo "  init                    - Initialize environment directory structure"
            echo "  switch <env>            - Switch to specified environment"
            echo "  validate <env>          - Validate environment configuration"
            echo "  encrypt <env>           - Encrypt environment secrets"
            echo "  decrypt <env>           - Decrypt environment secrets"
            echo "  diff <env1> <env2>      - Compare two environments"
            echo "  help                    - Show this help message"
            echo ""
            echo "Environments: development, staging, production, testing"
            ;;
    esac
}

main "$@"
