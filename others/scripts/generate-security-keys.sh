#!/bin/bash
# 生成安全密钥脚本

set -e

echo "🔐 生成安全密钥..."

# 生成JWT密钥
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')
ENCRYPTION_KEY=$(openssl rand -hex 32 | tr -d '\n')

# 输出到临时文件
cat > /tmp/security-keys.env << EOF
# 🔒 安全密钥配置（请妥善保管）
# 生成时间: $(date '+%Y-%m-%d %H:%M:%S')

# JWT配置 - 请将以下配置更新到 .env.production
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET

# 加密密钥
ENCRYPTION_KEY=$ENCRYPTION_KEY

# Redis密码（建议更新）
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d '\n')

# API密钥（用于服务间调用）
API_KEYS=$(openssl rand -hex 16),$(openssl rand -hex 16),$(openssl rand -hex 16)

EOF

echo "✅ 安全密钥已生成，保存在: /tmp/security-keys.env"
echo ""
echo "⚠️  请将密钥更新到以下文件："
echo "   1. backend/.env.production"
echo "   2. 服务器上的 .env 文件"
echo ""
echo "📋 生成的密钥："
cat /tmp/security-keys.env
echo ""
echo "🗑️  使用完成后请删除临时文件: rm /tmp/security-keys.env"
