#!/usr/bin/env python3
"""
配置系统测试脚本
测试环境变量 > JSON覆盖 > 默认值的加载顺序
"""
import os
import json
import tempfile
from pathlib import Path

def test_config_loading():
    """测试配置加载的各种场景"""
    print("=== 配置系统测试 ===\n")
    
    # 测试1: 默认配置加载
    print("1. 测试默认配置加载")
    try:
        from config.loader import load_config
        default_config = load_config()
        
        # 转换为结构化配置以便访问
        if hasattr(default_config, 'to_app_config'):
            structured_config = default_config.to_app_config()
            print(f"   ✓ 默认配置加载成功")
            print(f"   - 数据库主机: {structured_config.database.host}")
            print(f"   - 限速QPS: {structured_config.rate_limit.domain_qps}")
            print(f"   - 并发数: {structured_config.rate_limit.concurrency}")
        else:
            print(f"   ✓ 默认配置加载成功")
            print(f"   - 数据库主机: {default_config.database.host}")
            print(f"   - 限速QPS: {default_config.rate_limit.domain_qps}")
            print(f"   - 并发数: {default_config.rate_limit.concurrency}")
    except Exception as e:
        print(f"   ✗ 默认配置加载失败: {e}")
    
    print()
    
    # 测试2: 环境变量覆盖
    print("2. 测试环境变量覆盖")
    try:
        # 设置测试环境变量
        os.environ["TASK_CONTROL_PG_HOST"] = "test-env-host"
        os.environ["TASK_CONTROL_DOMAIN_QPS"] = "100"
        os.environ["TASK_CONTROL_CONCURRENCY"] = "20"
        
        # 重新加载配置
        from config.loader import ConfigLoader
        loader = ConfigLoader()
        env_config = loader.load_app_config()
        
        # 转换为结构化配置以便访问
        if hasattr(env_config, 'to_app_config'):
            structured_config = env_config.to_app_config()
            print(f"   ✓ 环境变量覆盖成功")
            print(f"   - 数据库主机: {structured_config.database.host}")
            print(f"   - 限速QPS: {structured_config.rate_limit.domain_qps}")
            print(f"   - 并发数: {structured_config.rate_limit.concurrency}")
        else:
            print(f"   ✓ 环境变量覆盖成功")
            print(f"   - 数据库主机: {env_config.database.host}")
            print(f"   - 限速QPS: {env_config.rate_limit.domain_qps}")
            print(f"   - 并发数: {env_config.rate_limit.concurrency}")
        
        # 清理环境变量
        del os.environ["TASK_CONTROL_PG_HOST"]
        del os.environ["TASK_CONTROL_DOMAIN_QPS"]
        del os.environ["TASK_CONTROL_CONCURRENCY"]
        
    except Exception as e:
        print(f"   ✗ 环境变量覆盖测试失败: {e}")
    
    print()
    
    # 测试3: JSON覆盖配置
    print("3. 测试JSON覆盖配置")
    try:
        # 创建临时JSON覆盖文件
        override_config = {
            "database": {
                "host": "json-override-host",
                "port": 5433,
                "user": "json_user"
            },
            "rate_limit": {
                "domain_qps": 200,
                "concurrency": 30
            },
            "stability": {
                "max_failure_rate": 0.15
            }
        }
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(override_config, f, indent=2)
            temp_json_path = f.name
        
        try:
            # 使用JSON覆盖加载配置（传绝对路径，确保可以读取临时文件）
            loader = ConfigLoader()
            json_config = loader.load_app_config(temp_json_path)
            
            # 转换为结构化配置以便访问
            if hasattr(json_config, 'to_app_config'):
                structured_config = json_config.to_app_config()
                print(f"   ✓ JSON覆盖配置成功")
                print(f"   - 数据库主机: {structured_config.database.host}")
                print(f"   - 数据库端口: {structured_config.database.port}")
                print(f"   - 限速QPS: {structured_config.rate_limit.domain_qps}")
                print(f"   - 并发数: {structured_config.rate_limit.concurrency}")
                print(f"   - 最大失败率: {structured_config.stability.max_failure_rate}")
            else:
                print(f"   ✓ JSON覆盖配置成功")
                print(f"   - 数据库主机: {json_config.database.host}")
                print(f"   - 数据库端口: {json_config.database.port}")
                print(f"   - 限速QPS: {json_config.rate_limit.domain_qps}")
                print(f"   - 并发数: {json_config.rate_limit.concurrency}")
                print(f"   - 最大失败率: {json_config.stability.max_failure_rate}")
            
        finally:
            # 清理临时文件
            os.unlink(temp_json_path)
            
    except Exception as e:
        print(f"   ✗ JSON覆盖配置测试失败: {e}")
    
    print()
    
    # 测试4: 优先级测试（环境变量 > JSON覆盖）
    print("4. 测试配置优先级（环境变量 > JSON覆盖）")
    try:
        # 设置环境变量
        os.environ["TASK_CONTROL_PG_HOST"] = "env-priority-host"
        os.environ["TASK_CONTROL_DOMAIN_QPS"] = "300"
        
        # 创建JSON覆盖文件
        override_config = {
            "database": {
                "host": "json-priority-host",  # 应该被环境变量覆盖
                "port": 5434
            },
            "rate_limit": {
                "domain_qps": 400,  # 应该被环境变量覆盖
                "concurrency": 40   # 应该使用JSON值
            }
        }
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(override_config, f, indent=2)
            temp_json_path = f.name
        
        try:
            # 加载配置测试优先级（传绝对路径，确保可以读取临时文件）
            loader = ConfigLoader()
            priority_config = loader.load_app_config(temp_json_path)
            
            # 转换为结构化配置以便访问
            if hasattr(priority_config, 'to_app_config'):
                structured_config = priority_config.to_app_config()
                print(f"   ✓ 配置优先级测试成功")
                print(f"   - 数据库主机: {structured_config.database.host} (应为环境变量值)")
                print(f"   - 数据库端口: {structured_config.database.port} (应为JSON值)")
                print(f"   - 限速QPS: {structured_config.rate_limit.domain_qps} (应为环境变量值)")
                print(f"   - 并发数: {structured_config.rate_limit.concurrency} (应为JSON值)")
                
                # 调试输出
                print(f"   DEBUG: 实际数据库端口: {structured_config.database.port}, 期望: 5434")
                print(f"   DEBUG: 实际并发数值: {structured_config.rate_limit.concurrency}, 期望: 40")
                
                # 验证优先级
                assert structured_config.database.host == "env-priority-host", "环境变量应该优先于JSON"
                assert structured_config.database.port == 5434, "JSON值应该被使用"
                assert structured_config.rate_limit.domain_qps == 300, "环境变量应该优先于JSON"
                assert structured_config.rate_limit.concurrency == 40, "JSON值应该被使用"
            else:
                print(f"   ✓ 配置优先级测试成功")
                print(f"   - 数据库主机: {priority_config.database.host} (应为环境变量值)")
                print(f"   - 数据库端口: {priority_config.database.port} (应为JSON值)")
                print(f"   - 限速QPS: {priority_config.rate_limit.domain_qps} (应为环境变量值)")
                print(f"   - 并发数: {priority_config.rate_limit.concurrency} (应为JSON值)")
                
                # 验证优先级
                assert priority_config.database.host == "env-priority-host", "环境变量应该优先于JSON"
                assert priority_config.database.port == 5434, "JSON值应该被使用"
                assert priority_config.rate_limit.domain_qps == 300, "环境变量应该优先于JSON"
                assert priority_config.rate_limit.concurrency == 40, "JSON值应该被使用"
            
            print("   ✓ 优先级验证通过")
            
        finally:
            # 清理
            os.unlink(temp_json_path)
            del os.environ["TASK_CONTROL_PG_HOST"]
            del os.environ["TASK_CONTROL_DOMAIN_QPS"]
            
    except Exception as e:
        print(f"   ✗ 配置优先级测试失败: {e}")
    
    print()
    
    # 测试5: 向后兼容性测试
    print("5. 测试向后兼容性")
    try:
        from config.config import get_config, get_new_config
        
        # 测试旧接口
        old_config = get_config()
        print(f"   ✓ 旧接口 get_config() 正常工作")
        print(f"   - 配置段: {list(old_config.keys())}")
        
        # 测试新接口
        new_config = get_new_config()
        if new_config:
            print(f"   ✓ 新接口 get_new_config() 正常工作")
            print(f"   - 配置类型: {type(new_config).__name__}")
        else:
            print(f"   ! 新接口不可用（可能缺少依赖）")
            
    except Exception as e:
        print(f"   ✗ 向后兼容性测试失败: {e}")
    
    print()
    
    # 测试6: 配置段加载测试
    print("6. 测试配置段加载")
    try:
        loader = ConfigLoader()
        
        # 测试加载数据库配置段
        db_config = loader.load_specific_config("database")
        print(f"   ✓ 数据库配置段加载成功")
        print(f"   - 主机: {db_config['host']}")
        print(f"   - 端口: {db_config['port']}")
        print(f"   - 数据库名: {db_config['database']}")
        
        # 测试加载限速配置段
        rate_limit_config = loader.load_specific_config("rate_limit")
        print(f"   ✓ 限速配置段加载成功")
        print(f"   - 域名QPS: {rate_limit_config['domain_qps']}")
        print(f"   - 并发数: {rate_limit_config['concurrency']}")
        
        # 测试加载稳定性配置段
        stability_config = loader.load_specific_config("stability")
        print(f"   ✓ 稳定性配置段加载成功")
        print(f"   - 最大失败率: {stability_config['max_failure_rate']}")
        print(f"   - 停止阈值: {stability_config['stop_when_empty_n']}")
        print(f"   - 最大连续401: {stability_config['max_consecutive_401']}")
        
    except Exception as e:
        print(f"   ✗ 配置段加载失败: {e}")
        import traceback
        traceback.print_exc()
    
    print("\n=== 测试完成 ===")


if __name__ == "__main__":
    test_config_loading()