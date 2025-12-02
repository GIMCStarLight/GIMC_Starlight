#!/bin/bash
# 快速Cookie管理脚本

echo "===================================================================="
 echo "  智能Cookie管理工具 - 巨量引擎/星图平台"
echo "===================================================================="
echo ""

# 检查Playwright是否已安装
if ! python -c "import playwright" 2>/dev/null; then
    echo "❌ 未检测到 Playwright，正在安装..."
    echo ""
    pip install -r requirements_cookie_fetcher.txt
    playwright install chromium
    echo ""
fi

# 检查是否有命令行参数
if [ "$1" = "--check" ]; then
    # 检测Cookie有效性
    python tools/auto_cookie_fetcher.py --check
elif [ "$1" = "--auto-refresh" ] && [ -n "$2" ] && [ -n "$3" ]; then
    # 自动刷新模式
    python tools/auto_cookie_fetcher.py --auto-refresh --username "$2" --password "$3"
else
    # 默认：交互模式
    python tools/auto_cookie_fetcher.py --interactive
fi

echo ""
echo "提示:"
echo "  检测Cookie有效性: ./get_cookies.sh --check"
echo "  自动刷新Cookie: ./get_cookies.sh --auto-refresh <用户名> <密码>"
echo "  查看更多选项: python tools/auto_cookie_fetcher.py --help"
