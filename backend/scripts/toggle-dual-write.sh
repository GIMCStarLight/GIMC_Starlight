#!/bin/bash
# 双写模式切换脚本
# 使用方法: ./toggle-dual-write.sh [on|off|status]

ENV_FILE=".env"

function check_env_file() {
    if [ ! -f "$ENV_FILE" ]; then
        echo "错误: 找不到 .env 文件"
        exit 1
    fi
}

function enable_dual_write() {
    echo "正在启用双写模式..."
    
    # 更新 ENABLE_DUAL_WRITE
    if grep -q "^ENABLE_DUAL_WRITE=" "$ENV_FILE"; then
        sed -i '' 's/^ENABLE_DUAL_WRITE=.*/ENABLE_DUAL_WRITE=true/' "$ENV_FILE"
    else
        echo "ENABLE_DUAL_WRITE=true" >> "$ENV_FILE"
    fi
    
    # 确保读取源是MySQL
    if grep -q "^READ_DATA_SOURCE=" "$ENV_FILE"; then
        sed -i '' 's/^READ_DATA_SOURCE=.*/READ_DATA_SOURCE=mysql/' "$ENV_FILE"
    else
        echo "READ_DATA_SOURCE=mysql" >> "$ENV_FILE"
    fi
    
    echo "✅ 双写模式已启用"
    echo "   - 写入: MySQL + PostgreSQL"
    echo "   - 读取: MySQL"
    echo ""
    echo "⚠️  请重启服务以生效: pm2 restart crawler-backend"
}

function disable_dual_write() {
    echo "正在禁用双写模式..."
    
    if grep -q "^ENABLE_DUAL_WRITE=" "$ENV_FILE"; then
        sed -i '' 's/^ENABLE_DUAL_WRITE=.*/ENABLE_DUAL_WRITE=false/' "$ENV_FILE"
    else
        echo "ENABLE_DUAL_WRITE=false" >> "$ENV_FILE"
    fi
    
    echo "✅ 双写模式已禁用"
    echo "   - 写入: MySQL"
    echo "   - 读取: MySQL"
    echo ""
    echo "⚠️  请重启服务以生效: pm2 restart crawler-backend"
}

function show_status() {
    echo "当前双写配置状态:"
    echo "─────────────────────────────────"
    
    if grep -q "^ENABLE_DUAL_WRITE=true" "$ENV_FILE"; then
        echo "双写模式: ✅ 已启用"
    elif grep -q "^ENABLE_DUAL_WRITE=false" "$ENV_FILE"; then
        echo "双写模式: ❌ 已禁用"
    else
        echo "双写模式: ⚠️  未配置"
    fi
    
    if grep -q "^READ_DATA_SOURCE=" "$ENV_FILE"; then
        READ_SOURCE=$(grep "^READ_DATA_SOURCE=" "$ENV_FILE" | cut -d'=' -f2)
        echo "读取数据源: $READ_SOURCE"
    else
        echo "读取数据源: ⚠️  未配置（默认: mysql）"
    fi
    
    echo "─────────────────────────────────"
}

# 主逻辑
check_env_file

case "${1:-status}" in
    on|enable)
        enable_dual_write
        ;;
    off|disable)
        disable_dual_write
        ;;
    status)
        show_status
        ;;
    *)
        echo "使用方法: $0 [on|off|status]"
        echo ""
        echo "命令:"
        echo "  on      - 启用双写模式"
        echo "  off     - 禁用双写模式"
        echo "  status  - 查看当前状态（默认）"
        exit 1
        ;;
esac
