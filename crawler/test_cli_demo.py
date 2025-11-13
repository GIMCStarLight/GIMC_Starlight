#!/usr/bin/env python3
"""
CLI功能演示脚本
测试所有子命令的基本功能
"""

import subprocess
import sys
import os

def run_command(cmd, description):
    """运行命令并显示结果"""
    print(f"\n{'='*60}")
    print(f"🧪 测试: {description}")
    print(f"📝 命令: {cmd}")
    print(f"{'='*60}")
    
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=30)
        
        if result.stdout:
            print("✅ 输出:")
            print(result.stdout)
        
        if result.stderr:
            print("⚠️  错误:")
            print(result.stderr)
            
        print(f"🔢 退出码: {result.returncode}")
        
        return result.returncode == 0
        
    except subprocess.TimeoutExpired:
        print("⏰ 命令超时")
        return False
    except Exception as e:
        print(f"❌ 执行失败: {e}")
        return False

def main():
    """主测试函数"""
    print("🚀 CLI功能演示开始")
    
    # 切换到正确的目录
    os.chdir("/Users/samuel/Desktop/爬虫方案/爬虫工程化开发/task_control")
    
    tests = [
        ("python -m entrypoints.cli --help", "主命令帮助"),
        ("python -m entrypoints.cli schedule --help", "schedule子命令帮助"),
        ("python -m entrypoints.cli smart --help", "smart子命令帮助"),
        ("python -m entrypoints.cli cleanup --help", "cleanup子命令帮助"),
        ("python -m entrypoints.cli validate --help", "validate子命令帮助"),
        ("python -m entrypoints.cli schedule --mode second_split --limit 1 --max-pages 1 --verbose", "schedule功能测试"),
    ]
    
    success_count = 0
    total_count = len(tests)
    
    for cmd, desc in tests:
        if run_command(cmd, desc):
            success_count += 1
    
    print(f"\n{'='*60}")
    print(f"📊 测试总结")
    print(f"{'='*60}")
    print(f"✅ 成功: {success_count}/{total_count}")
    print(f"❌ 失败: {total_count - success_count}/{total_count}")
    print(f"📈 成功率: {success_count/total_count*100:.1f}%")
    
    if success_count == total_count:
        print("🎉 所有测试通过！CLI入口功能正常")
    else:
        print("⚠️  部分测试失败，需要进一步检查")

if __name__ == "__main__":
    main()
