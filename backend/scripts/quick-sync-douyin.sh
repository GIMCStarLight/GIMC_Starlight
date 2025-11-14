#!/bin/bash

# 抖音达人批量同步快速启动脚本
# 使用方法: chmod +x scripts/quick-sync-douyin.sh && ./scripts/quick-sync-douyin.sh

echo "========================================="
echo "🚀 抖音达人批量同步工具"
echo "========================================="
echo ""

# 进入backend目录
cd "$(dirname "$0")/.." || exit

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未找到Node.js，请先安装Node.js"
    exit 1
fi

echo "✅ Node.js版本: $(node -v)"
echo ""

# 显示菜单
echo "请选择操作："
echo "1. 🔍 检查环境（推荐首次使用）"
echo "2. 👀 查看待同步达人（不执行同步）"
echo "3. 🚀 同步所有抖音达人"
echo "4. 🎯 仅同步待同步状态（pending）的达人"
echo "5. 🔄 重试失败的同步"
echo "6. 🧪 测试同步（仅同步10个）"
echo "0. 退出"
echo ""

read -p "请输入选项 [0-6]: " choice

case $choice in
    1)
        echo ""
        echo "🔍 正在检查环境..."
        node scripts/check-sync-environment.js
        ;;
    2)
        echo ""
        echo "👀 正在查询待同步达人..."
        node scripts/sync-douyin-kols-simple.js --dry-run
        ;;
    3)
        echo ""
        read -p "⚠️  即将同步所有抖音达人，确认继续？[y/N]: " confirm
        if [[ $confirm == [yY] ]]; then
            echo ""
            echo "🚀 开始同步..."
            node scripts/sync-douyin-kols-simple.js
        else
            echo "已取消"
        fi
        ;;
    4)
        echo ""
        echo "🎯 同步待同步状态的达人..."
        node scripts/sync-douyin-kols-simple.js --status=pending
        ;;
    5)
        echo ""
        echo "🔄 重试失败的同步..."
        node scripts/sync-douyin-kols-simple.js --status=rejected
        ;;
    6)
        echo ""
        echo "🧪 测试同步前10个达人..."
        node scripts/sync-douyin-kols-simple.js --limit=10 --batch-size=5
        ;;
    0)
        echo "👋 再见！"
        exit 0
        ;;
    *)
        echo "❌ 无效选项"
        exit 1
        ;;
esac

echo ""
echo "========================================="
echo "✅ 操作完成"
echo "========================================="
