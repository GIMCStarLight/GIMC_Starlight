#!/usr/bin/env python3
"""
作品投放数据采集模块验证脚本

功能：
- 验证模块完整功能
- 测试数据采集和存储
- 生成验证报告
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.item_delivery_db_service import ItemDeliveryDBService
from adapters.xingtu import ItemDataClient
from services.item_account_config import get_item_star_id_by_account, get_item_cookie_file_path
from services.config_loader import read_cookie_file


def validate_db_connection():
    """验证数据库连接"""
    print("🔍 验证数据库连接...")
    try:
        with ItemDeliveryDBService() as db:
            cur = db.conn.cursor()
            cur.execute("SELECT version();")
            version = cur.fetchone()[0]
            print(f"✅ 数据库连接成功: {version.split(',')[0]}")
            cur.close()
            return True
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        return False


def validate_account_config():
    """验证账号配置"""
    print("\n🔍 验证账号配置...")
    try:
        star_id = get_item_star_id_by_account("item_account_1")
        if star_id:
            print(f"✅ 账号配置验证成功: star_id={star_id}")
            return True
        else:
            print("❌ 账号配置验证失败: 未找到star_id")
            return False
    except Exception as e:
        print(f"❌ 账号配置验证失败: {e}")
        return False


def validate_cookie_file():
    """验证Cookie文件"""
    print("\n🔍 验证Cookie文件...")
    try:
        cookie_file_path = get_item_cookie_file_path("item_account_1")
        if cookie_file_path and os.path.exists(cookie_file_path):
            cookie = read_cookie_file(cookie_file_path)
            if cookie and len(cookie) > 50:  # 简单验证Cookie长度
                print(f"✅ Cookie文件验证成功: 长度={len(cookie)}")
                return True
            else:
                print("❌ Cookie内容验证失败")
                return False
        else:
            print("❌ Cookie文件路径验证失败")
            return False
    except Exception as e:
        print(f"❌ Cookie文件验证失败: {e}")
        return False


def validate_client_initialization():
    """验证客户端初始化"""
    print("\n🔍 验证客户端初始化...")
    try:
        star_id = get_item_star_id_by_account("item_account_1")
        cookie_file_path = get_item_cookie_file_path("item_account_1")
        if star_id and cookie_file_path:
            cookie = read_cookie_file(cookie_file_path)
            client = ItemDataClient(star_id=star_id, cookie=cookie, qps=0.1)  # 低QPS用于测试
            print("✅ 客户端初始化成功")
            client.close()
            return True
        else:
            print("❌ 客户端初始化失败: 缺少必要配置")
            return False
    except Exception as e:
        print(f"❌ 客户端初始化失败: {e}")
        return False


def validate_data_collection():
    """验证数据采集功能"""
    print("\n🔍 验证数据采集功能...")
    try:
        star_id = get_item_star_id_by_account("item_account_1")
        cookie_file_path = get_item_cookie_file_path("item_account_1")
        if star_id and cookie_file_path:
            cookie = read_cookie_file(cookie_file_path)
            client = ItemDataClient(star_id=star_id, cookie=cookie, qps=0.1)
            
            # 测试采集一个已知作品（使用之前测试成功的ID）
            test_item_id = "7584864709501832494"
            data = client.get_item_trend_stat(item_id=test_item_id)
            
            if data and 'code' in data and data['code'] == 0:
                print(f"✅ 数据采集成功: item_id={test_item_id}, code={data['code']}")
                
                # 验证数据结构
                extracted = client.extract_essential_fields(data)
                if 'base_stats' in extracted and 'realtime_stats' in extracted:
                    print("✅ 数据结构验证成功")
                    print(f"   - 播放量: {extracted['realtime_stats']['play_count']}")
                    print(f"   - 点赞数: {extracted['realtime_stats']['like_count']}")
                    print(f"   - 评论数: {extracted['realtime_stats']['comment_count']}")
                    client.close()
                    return True
                else:
                    print("❌ 数据结构验证失败")
                    client.close()
                    return False
            else:
                print(f"❌ 数据采集失败: code={data.get('code') if data else 'None'}")
                client.close()
                return False
        else:
            print("❌ 数据采集验证失败: 缺少必要配置")
            return False
    except Exception as e:
        print(f"❌ 数据采集验证失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def validate_database_storage():
    """验证数据库存储功能"""
    print("\n🔍 验证数据库存储功能...")
    try:
        with ItemDeliveryDBService() as db:
            # 创建测试运行
            run_id = db.create_run(
                account_id="validation_test",
                star_id="validation_star_id",
                run_name="验证测试",
                traffic_type=1,
                user_role=1,
                qps=0.1
            )
            
            # 模拟数据
            raw_response = {
                "code": 0,
                "msg": "success",
                "data": {
                    "base_stats": {"play_count": 100, "cpm": 10.0, "cpe": 1.0, "five_sec_rate": 0.5},
                    "realtime_stats": {"play_count": 100, "finish_count": 80, "like_count": 10, "comment_count": 5, "share_count": 2}
                }
            }
            
            parsed_data = {
                "base_stats": {"play_count": 100, "cpm": 10.0, "cpe": 1.0, "five_sec_rate": 0.5},
                "realtime_stats": {"play_count": 100, "finish_count": 80, "like_count": 10, "comment_count": 5, "share_count": 2},
                "trend_data": [],
                "crawled_at": int(datetime.now().timestamp())
            }
            
            # 保存数据
            success, error = db.save_item_data(
                run_id=run_id,
                item_id="validation_item_123",
                raw_response=raw_response,
                parsed_data=parsed_data,
                api_code=0,
                api_msg="success"
            )
            
            if success:
                print("✅ 数据库存储验证成功")
                
                # 更新运行状态
                db.update_run_status(
                    run_id=run_id,
                    status="completed",
                    total_items=1,
                    success_count=1,
                    failed_count=0,
                    finish=True
                )
                
                # 验证数据
                summary = db.get_item_latest_data("validation_item_123")
                if summary:
                    print(f"   - 最新播放量: {summary['latest_play_count']}")
                    print(f"   - 最新点赞数: {summary['latest_like_count']}")
                
                return True
            else:
                print(f"❌ 数据库存储验证失败: {error}")
                return False
    except Exception as e:
        print(f"❌ 数据库存储验证失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """主验证函数"""
    print("🚀 作品投放数据采集模块完整验证")
    print("=" * 60)
    
    print(f"📅 验证时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 执行各项验证
    checks = [
        ("数据库连接", validate_db_connection),
        ("账号配置", validate_account_config),
        ("Cookie文件", validate_cookie_file),
        ("客户端初始化", validate_client_initialization),
        ("数据采集功能", validate_data_collection),
        ("数据库存储", validate_database_storage),
    ]
    
    results = {}
    for name, func in checks:
        results[name] = func()
    
    # 生成验证报告
    print("\n" + "=" * 60)
    print("📋 验证报告")
    print("=" * 60)
    
    all_passed = True
    for name, result in results.items():
        status = "✅ 通过" if result else "❌ 失败"
        print(f"{name:15}: {status}")
        if not result:
            all_passed = False
    
    print("\n" + "=" * 60)
    if all_passed:
        print("🎉 所有验证通过！作品投放数据采集模块功能完整")
        print("\n✨ 模块特性:")
        print("   • 完整的API数据采集能力")
        print("   • 独立的账号管理系统")
        print("   • PostgreSQL数据库持久化")
        print("   • 实时数据处理和存储")
        print("   • 完整的数据追踪机制")
        print("   • 高效的查询和分析支持")
    else:
        print("❌ 部分验证失败，请检查相关组件")
    
    print("=" * 60)
    return all_passed


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)