#!/bin/bash
# 日志轮转安装脚本

set -e

SERVER_IP="192.168.102.168"
SSH_KEY="/Users/samuel/Desktop/爬虫方案/爬虫工程化开发/192.168.102 (2).168_id_ed25519"
LOCAL_PATH="/Users/samuel/Desktop/爬虫方案/爬虫工程化开发"

echo "📦 安装日志轮转配置..."

# 上传配置文件
scp -i "$SSH_KEY" "$LOCAL_PATH/logrotate-crawler.conf" root@$SERVER_IP:/tmp/

# 安装并测试
ssh -i "$SSH_KEY" root@$SERVER_IP << 'EOF'
    # 安装logrotate（如果未安装）
    if ! command -v logrotate &> /dev/null; then
        echo "安装logrotate..."
        yum install -y logrotate || apt-get install -y logrotate
    fi
    
    # 复制配置文件
    cp /tmp/logrotate-crawler.conf /etc/logrotate.d/crawler
    chmod 644 /etc/logrotate.d/crawler
    
    # 测试配置
    echo "测试日志轮转配置..."
    logrotate -d /etc/logrotate.d/crawler
    
    # 手动执行一次
    echo "执行日志轮转..."
    logrotate -f /etc/logrotate.d/crawler
    
    echo "✅ 日志轮转配置安装完成"
    echo "日志将每天自动轮转，保留策略："
    echo "  - Nginx日志: 14天"
    echo "  - 应用日志: 7天"
    echo "  - Backend日志: 30天"
EOF

echo "✅ 日志轮转配置已完成"
