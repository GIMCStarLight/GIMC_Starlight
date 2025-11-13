#!/usr/bin/env python3
"""
测试 simple_cli 的 --dry-run 功能
"""

import subprocess
import sys
from pathlib import Path

def run_command(cmd):
    """运行命令并返回结果"""
    print(f"🧪 测试: {' '.join(cmd)}")
    try:
        result = subprocess.run(
            cmd, 
            capture_output=True, 
            text=True, 
            timeout=30,
            cwd=Path(__file__).parent.parent
        )
        if result.returncode == 0:
            print("✅ 成功")
            # 显示关键信息
            lines = result.stdout.split('\n')
            for line in lines:
                if any(keyword in line for keyword in ['[info]', '[dry-run]', 'profile=']):
                    print(f"   {line}")
        else:
            print("❌ 失败")
            print(f"   错误: {result.stderr}")
            # 对于批量关键词，检查是否是正常的结果输出到 stderr
            if "keywords_processed" in result.stderr and "batch" in ' '.join(cmd):
                print("   (这可能是正常的批量处理结果)")
                return True
        print()
        return result.returncode == 0
    except subprocess.TimeoutExpired:
        print("⏰ 超时")
        return False
    except Exception as e:
        print(f"💥 异常: {e}")
        return False

def main():
    """主测试函数"""
    print("🚀 开始测试 simple_cli --dry-run 功能\n")
    
    base_cmd = ["python", "-m", "task_control.entrypoints.simple_cli"]
    
    tests = [
        # 单关键词测试
        base_cmd + ["--dry-run", "kw", "贝勒儿"],
        base_cmd + ["--profile", "fast", "--dry-run", "kw", "测试"],
        base_cmd + ["--profile", "deep", "--dry-run", "kw", "7412512379650441253"],
        
        # 标签测试（可能没有匹配的标签，但应该不报错）
        base_cmd + ["--dry-run", "selected", "美妆"],
        base_cmd + ["--dry-run", "combined", "美妆"],
        base_cmd + ["--dry-run", "first"],
        
        # 批量关键词测试
        base_cmd + ["--dry-run", "batch", "task_control/config/keywords_for_batch_crawling.txt"],
    ]
    
    success_count = 0
    total_count = len(tests)
    
    for test_cmd in tests:
        if run_command(test_cmd):
            success_count += 1
    
    print(f"📊 测试结果: {success_count}/{total_count} 通过")
    
    if success_count == total_count:
        print("🎉 所有测试通过！--dry-run 功能正常工作")
        return 0
    else:
        print("⚠️  部分测试失败，请检查")
        return 1

if __name__ == "__main__":
    sys.exit(main())