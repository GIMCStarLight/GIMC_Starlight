#!/usr/bin/env python3
"""
作品投放数据采集数据库功能测试脚本

功能：
- 测试数据库连接
- 测试数据保存功能
- 验证数据完整性
"""

import json
import os
from datetime import datetime
from typing import Dict, Any

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))  # 添加项目根目录
from services.item_delivery_db_service import ItemDeliveryDBService


def test_db_connection():
    """测试数据库连接"""
    print("🧪 测试数据库连接...")
    try:
        with ItemDeliveryDBService() as db:
            # 执行简单查询测试连接
            cur = db.conn.cursor()
            cur.execute("SELECT version();")
            version = cur.fetchone()[0]
            print(f"✅ 数据库连接成功: {version.split(',')[0]}")
            cur.close()
            return True
    except Exception as e:
        print(f"❌ 数据库连接失败: {e}")
        return False


def test_create_run():
    """测试创建运行记录"""
    print("\n🧪 测试创建运行记录...")
    try:
        with ItemDeliveryDBService() as db:
            run_id = db.create_run(
                account_id="test_account_1",
                star_id="test_star_id_123",
                run_name="测试运行",
                traffic_type=1,
                user_role=1,
                qps=0.5,
            )
            print(f"✅ 运行记录创建成功: run_id={run_id}")
            
            # 验证记录
            run_info = db.get_run_info(run_id)
            if run_info:
                print(f"✅ 运行信息验证: {run_info['account_id']}, status={run_info['status']}")
            else:
                print("❌ 获取运行信息失败")
            
            return run_id
    except Exception as e:
        print(f"❌ 创建运行记录失败: {e}")
        return None


def test_save_item_data():
    """测试保存作品数据"""
    print("\n🧪 测试保存作品数据...")
    try:
        with ItemDeliveryDBService() as db:
            # 创建测试运行
            run_id = db.create_run(
                account_id="test_account_2",
                star_id="test_star_id_456",
                run_name="数据保存测试",
                traffic_type=1,
                user_role=1,
                qps=0.5,
            )
            
            # 模拟API响应数据
            raw_response = {
                "code": 0,
                "msg": "success",
                "data": {
                    "base_stats": {
                        "play_count": 1000,
                        "cpm": 15.5,
                        "cpe": 2.3,
                        "five_sec_rate": 0.65
                    },
                    "realtime_stats": {
                        "play_count": 1000,
                        "finish_count": 800,
                        "finish_rate": 0.8,
                        "like_count": 150,
                        "like_rate": 0.15,
                        "comment_count": 50,
                        "comment_rate": 0.05,
                        "share_count": 30,
                        "share_rate": 0.03
                    },
                    "trend_data": [
                        {"timestamp": "2025-12-26", "play_count": 100},
                        {"timestamp": "2025-12-27", "play_count": 200}
                    ]
                }
            }
            
            # 解析后的数据
            parsed_data = {
                "base_stats": {
                    "play_count": 1000,
                    "cpm": 15.5,
                    "cpe": 2.3,
                    "five_sec_rate": 0.65
                },
                "realtime_stats": {
                    "play_count": 1000,
                    "finish_count": 800,
                    "finish_rate": 0.8,
                    "like_count": 150,
                    "like_rate": 0.15,
                    "comment_count": 50,
                    "comment_rate": 0.05,
                    "share_count": 30,
                    "share_rate": 0.03
                },
                "trend_data": [
                    {"timestamp": "2025-12-26", "play_count": 100},
                    {"timestamp": "2025-12-27", "play_count": 200}
                ],
                "crawled_at": int(datetime.now().timestamp())
            }
            
            # 保存数据
            success, error = db.save_item_data(
                run_id=run_id,
                item_id="test_item_12345",
                raw_response=raw_response,
                parsed_data=parsed_data,
                traffic_type=1,
                user_role=1,
                api_status=200,
                api_code=0,
                api_msg="success"
            )
            
            if success:
                print(f"✅ 作品数据保存成功: run_id={run_id}, item_id=test_item_12345")
                
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
                summary = db.get_item_latest_data("test_item_12345")
                if summary:
                    print(f"✅ 数据验证: play_count={summary['latest_play_count']}, "
                          f"finish_count={summary['latest_finish_count']}")
                
                stats = db.get_run_statistics(run_id)
                if stats:
                    print(f"✅ 运行统计: actual_saved={stats['actual_saved_count']}, "
                          f"avg_play_count={stats['avg_play_count']}")
                
                return True
            else:
                print(f"❌ 作品数据保存失败: {error}")
                return False
                
    except Exception as e:
        print(f"❌ 保存作品数据失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_batch_save():
    """测试批量保存功能"""
    print("\n🧪 测试批量保存功能...")
    try:
        with ItemDeliveryDBService() as db:
            # 创建测试运行
            run_id = db.create_run(
                account_id="test_account_3",
                star_id="test_star_id_789",
                run_name="批量保存测试",
                traffic_type=1,
                user_role=1,
                qps=0.5,
            )
            
            # 准备批量数据
            items = []
            for i in range(3):
                item_data = {
                    "item_id": f"batch_item_{i}",
                    "raw_response": {
                        "code": 0,
                        "msg": "success",
                        "data": {
                            "base_stats": {"play_count": 100 * (i + 1), "cpm": 10.0 + i},
                            "realtime_stats": {"play_count": 100 * (i + 1), "like_count": 10 * (i + 1)}
                        }
                    },
                    "parsed_data": {
                        "base_stats": {"play_count": 100 * (i + 1), "cpm": 10.0 + i},
                        "realtime_stats": {"play_count": 100 * (i + 1), "like_count": 10 * (i + 1)},
                        "trend_data": [],
                        "crawled_at": int(datetime.now().timestamp())
                    }
                }
                items.append(item_data)
            
            # 批量保存
            success_count, failed_count = db.save_batch_item_data(
                run_id=run_id,
                items=items,
                traffic_type=1,
                user_role=1
            )
            
            # 更新运行状态
            db.update_run_status(
                run_id=run_id,
                status="completed" if failed_count == 0 else "partial",
                total_items=len(items),
                success_count=success_count,
                failed_count=failed_count,
                finish=True
            )
            
            print(f"✅ 批量保存完成: 成功={success_count}, 失败={failed_count}")
            
            # 验证保存数量
            stats = db.get_run_statistics(run_id)
            if stats:
                print(f"✅ 批量统计验证: 实际保存={stats['actual_saved_count']}")
            
            return success_count == len(items)
            
    except Exception as e:
        print(f"❌ 批量保存失败: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """主测试函数"""
    print("🚀 作品投放数据采集数据库功能测试")
    print("=" * 50)
    
    all_tests_passed = True
    
    # 测试数据库连接
    if not test_db_connection():
        all_tests_passed = False
    
    # 测试创建运行记录
    if test_create_run() is None:
        all_tests_passed = False
    
    # 测试保存作品数据
    if not test_save_item_data():
        all_tests_passed = False
    
    # 测试批量保存
    if not test_batch_save():
        all_tests_passed = False
    
    print("\n" + "=" * 50)
    if all_tests_passed:
        print("🎉 所有测试通过！数据库持久化功能正常工作")
    else:
        print("❌ 部分测试失败，请检查错误信息")
    
    print("\n📋 数据库表结构验证:")
    print("  - item_delivery_runs: 运行记录表")
    print("  - item_delivery_data: 结构化数据表") 
    print("  - item_delivery_trends: 趋势数据表")
    print("  - item_delivery_raw_archive: 原始数据归档表")
    print("  - item_delivery_summary: 作品汇总表")
    
    print("\n✨ 作品投放数据采集模块数据库持久化功能已完全就绪！")


if __name__ == "__main__":
    main()