#!/bin/bash
# 监控脚本安装工具

set -e

SERVER_IP="192.168.102.168"
SSH_KEY="/Users/samuel/Desktop/爬虫方案/爬虫工程化开发/192.168.102 (2).168_id_ed25519"
LOCAL_PATH="/Users/samuel/Desktop/爬虫方案/爬虫工程化开发"

echo "📦 安装健康监控系统..."

# 上传脚本
scp -i "$SSH_KEY" "$LOCAL_PATH/scripts/health-monitor.sh" root@$SERVER_IP:/usr/local/bin/

# 安装并配置
ssh -i "$SSH_KEY" root@$SERVER_IP << 'EOF'
    # 设置执行权限
    chmod +x /usr/local/bin/health-monitor.sh
    
    # 创建日志目录
    mkdir -p /var/log
    touch /var/log/health-monitor.log
    
    # 安装jq（用于解析JSON）
    if ! command -v jq &> /dev/null; then
        echo "安装jq..."
        yum install -y jq || apt-get install -y jq
    fi
    
    # 配置crontab（每5分钟执行一次）
    (crontab -l 2>/dev/null | grep -v health-monitor.sh; echo "*/5 * * * * /usr/local/bin/health-monitor.sh") | crontab -
    
    echo "✅ 监控系统安装完成"
    echo ""
    echo "📋 配置信息："
    echo "  - 脚本路径: /usr/local/bin/health-monitor.sh"
    echo "  - 日志路径: /var/log/health-monitor.log"
    echo "  - 执行频率: 每5分钟"
    echo ""
    echo "💡 手动执行: /usr/local/bin/health-monitor.sh"
    echo "💡 查看日志: tail -f /var/log/health-monitor.log"
    echo ""
    echo "🔔 配置告警webhook（可选）："
    echo "  export ALERT_WEBHOOK_URL='你的webhook地址'"
    echo "  将此行添加到 /etc/profile 或 ~/.bashrc"
EOF

echo ""
echo "✅ 监控系统部署完成！"
echo "现在执行一次测试..."
echo ""

ssh -i "$SSH_KEY" root@$SERVER_IP "/usr/local/bin/health-monitor.sh"
