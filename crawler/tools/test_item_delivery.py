#!/usr/bin/env python3
"""
作品投放数据采集模块测试脚本

测试功能:
  1. 单个作品数据采集
  2. 批量作品数据采集
  3. 数据结构验证
  4. 错误处理测试
"""

import sys
from pathlib import Path

# 添加项目根目录
sys.path.insert(0, str(Path(__file__).parent.parent))

from adapters.xingtu import ItemDataClient
from services.item_account_config import (
    get_item_star_id_by_account,
    get_item_cookie_file_path,
)


def test_single_item():
    """测试单个作品采集"""
    print("=" * 60)
    print("测试1: 单个作品数据采集")
    print("=" * 60)

    # 使用作品数据专用账号
    account_id = "item_account_1"
    star_id = get_item_star_id_by_account(account_id)
    if not star_id:
        print(f"✗ 作品数据账号 {account_id} 未配置star_id")
        print("请检查: tools/account_manager/config/item_delivery_account_pool.json")
        return

    cookie_file = get_item_cookie_file_path(account_id)
    if not cookie_file:
        print(f"✗ 作品数据账号 {account_id} Cookie文件未配置")
        return

    # 初始化客户端
    client = ItemDataClient(
        star_id=star_id,
        cookie_file=cookie_file,
        qps=0.5,
    )

    # 测试作品ID（需要替换为真实ID）
    test_item_id = "7584864709501832494"

    try:
        print(f"\n采集作品: {test_item_id}")

        # 获取完整数据
        full_data = client.get_item_trend_stat(
            item_id=test_item_id,
            traffic_type=1,
            user_role=1,
        )

        print("✓ 采集成功")
        print(f"原始响应键: {list(full_data.keys())}")

        # 提取核心字段
        extracted = client.extract_essential_fields(full_data)

        print("\n核心数据:")
        print(f"  基础统计: {extracted['base_stats']}")
        print(f"  实时统计: {extracted['realtime_stats']}")
        print(f"  趋势数据点数: {len(extracted['trend_data'])}")

    except Exception as e:
        print(f"✗ 采集失败: {e}")

    finally:
        client.close()


def test_batch_items():
    """测试批量作品采集"""
    print("\n" + "=" * 60)
    print("测试2: 批量作品数据采集")
    print("=" * 60)

    # 使用作品数据专用账号
    account_id = "item_account_1"
    star_id = get_item_star_id_by_account(account_id)
    if not star_id:
        print(f"✗ 作品数据账号 {account_id} 未配置star_id")
        return

    cookie_file = get_item_cookie_file_path(account_id)
    if not cookie_file:
        print(f"✗ 作品数据账号 {account_id} Cookie文件未配置")
        return

    # 初始化客户端
    client = ItemDataClient(
        star_id=star_id,
        cookie_file=cookie_file,
        qps=0.3,  # 批量采集使用较低QPS
    )

    # 测试作品ID列表（需要替换为真实ID）
    test_item_ids = [
        "7584864709501832494",
        "7584864709501832495",
        "7584864709501832496",
    ]

    try:
        print(f"\n批量采集 {len(test_item_ids)} 个作品")

        results = client.get_batch_item_stats(
            item_ids=test_item_ids,
            traffic_type=1,
            user_role=1,
        )

        # 统计结果
        success_count = sum(1 for r in results if r["status"] == "success")
        failed_count = sum(1 for r in results if r["status"] == "failed")

        print(f"\n采集完成:")
        print(f"  成功: {success_count}/{len(test_item_ids)}")
        print(f"  失败: {failed_count}/{len(test_item_ids)}")

        # 显示每个结果
        for result in results:
            item_id = result["item_id"]
            status = result["status"]

            if status == "success":
                data = result["data"]
                play_count = data["realtime_stats"]["play_count"]
                print(f"  ✓ {item_id}: 播放量={play_count}")
            else:
                error = result["error"]
                print(f"  ✗ {item_id}: {error}")

    except Exception as e:
        print(f"✗ 批量采集失败: {e}")

    finally:
        client.close()


def test_summary_method():
    """测试摘要方法"""
    print("\n" + "=" * 60)
    print("测试3: 作品摘要数据获取")
    print("=" * 60)

    # 使用作品数据专用账号
    account_id = "item_account_1"
    star_id = get_item_star_id_by_account(account_id)
    if not star_id:
        print(f"✗ 作品数据账号 {account_id} 未配置star_id")
        return

    cookie_file = get_item_cookie_file_path(account_id)
    if not cookie_file:
        print(f"✗ 作品数据账号 {account_id} Cookie文件未配置")
        return

    # 初始化客户端
    client = ItemDataClient(
        star_id=star_id,
        cookie_file=cookie_file,
        qps=0.5,
    )

    test_item_id = "7584864709501832494"

    try:
        print(f"\n获取作品摘要: {test_item_id}")

        summary = client.get_item_stats_summary(item_id=test_item_id)

        print("✓ 摘要获取成功")
        print(f"\n作品核心指标:")
        print(f"  播放量: {summary['play_count']:,}")
        print(f"  完播量: {summary['finish_count']:,}")
        print(f"  完播率: {summary['finish_rate']:.2%}")
        print(f"  点赞量: {summary['like_count']:,}")
        print(f"  点赞率: {summary['like_rate']:.2%}")
        print(f"  评论量: {summary['comment_count']:,}")
        print(f"  转发量: {summary['share_count']:,}")

    except Exception as e:
        print(f"✗ 摘要获取失败: {e}")

    finally:
        client.close()


def test_error_handling():
    """测试错误处理"""
    print("\n" + "=" * 60)
    print("测试4: 错误处理")
    print("=" * 60)

    # 使用作品数据专用账号
    account_id = "item_account_1"
    star_id = get_item_star_id_by_account(account_id)
    if not star_id:
        print(f"✗ 作品数据账号 {account_id} 未配置star_id")
        return

    cookie_file = get_item_cookie_file_path(account_id)
    if not cookie_file:
        print(f"✗ 作品数据账号 {account_id} Cookie文件未配置")
        return

    # 初始化客户端
    client = ItemDataClient(
        star_id=star_id,
        cookie_file=cookie_file,
        qps=0.5,
    )

    # 测试无效作品ID
    invalid_item_id = "0000000000000000000"

    try:
        print(f"\n尝试采集无效作品ID: {invalid_item_id}")

        data = client.get_item_trend_stat(item_id=invalid_item_id)

        print("✗ 应该抛出异常但未抛出")

    except Exception as e:
        print(f"✓ 正确捕获异常: {type(e).__name__}: {e}")

    finally:
        client.close()


def main():
    """运行所有测试"""
    print("\n" + "=" * 60)
    print("作品投放数据采集模块测试")
    print("=" * 60)

    try:
        # 测试1: 单个作品
        test_single_item()

        # 测试2: 批量作品
        test_batch_items()

        # 测试3: 摘要方法
        test_summary_method()

        # 测试4: 错误处理
        test_error_handling()

        print("\n" + "=" * 60)
        print("所有测试完成")
        print("=" * 60)

    except KeyboardInterrupt:
        print("\n\n测试被用户中断")
    except Exception as e:
        print(f"\n\n测试失败: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    main()
