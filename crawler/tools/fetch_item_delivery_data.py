#!/usr/bin/env python3
"""
作品投放数据采集工具

功能:
  - 单个/批量采集作品投放数据
  - 支持自定义流量类型和用户角色
  - 输出JSON格式结果

用法:
  # 单个作品
  python tools/fetch_item_delivery_data.py --item-id 7584864709501832494

  # 批量采集
  python tools/fetch_item_delivery_data.py --item-ids 7584864709501832494,7584864709501832495

  # 从文件读取
  python tools/fetch_item_delivery_data.py --item-ids-file item_ids.txt

  # 自定义参数
  python tools/fetch_item_delivery_data.py \\
    --item-id 7584864709501832494 \\
    --traffic-type 1 \\
    --user-role 1 \\
    --output results.json

  # 指定账号
  python tools/fetch_item_delivery_data.py \\
    --item-id 7584864709501832494 \\
    --account account1 \\
    --qps 0.5

依赖:
  - 账号配置: tools/account_manager/config/accounts/{account}/cookies.txt
  - star_id配置: tools/account_manager/config/account_pool.json
"""

import argparse
import json
import sys
import time
from pathlib import Path
from typing import List

# 添加项目根目录
sys.path.insert(0, str(Path(__file__).parent.parent))

from adapters.xingtu import ItemDataClient
from services.account_config import get_star_id_by_account
from services.item_account_config import (
    get_item_star_id_by_account,
    get_item_cookie_file_path,
    get_available_item_account,
)
from services.config_loader import read_cookie_file
from services.logging_utils import get_json_logger, log_event
from services.item_delivery_db_service import ItemDeliveryDBService


def load_item_ids_from_file(file_path: str) -> List[str]:
    """从文件加载作品ID列表

    Args:
        file_path: 文件路径，每行一个作品ID

    Returns:
        作品ID列表
    """
    with open(file_path, "r", encoding="utf-8") as f:
        return [line.strip() for line in f if line.strip()]


def main():
    parser = argparse.ArgumentParser(
        description="作品投放数据采集工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )

    # 作品ID输入
    input_group = parser.add_mutually_exclusive_group(required=True)
    input_group.add_argument(
        "--item-id",
        type=str,
        help="单个作品ID",
    )
    input_group.add_argument(
        "--item-ids",
        type=str,
        help="多个作品ID（逗号分隔）",
    )
    input_group.add_argument(
        "--item-ids-file",
        type=str,
        help="作品ID文件路径（每行一个）",
    )

    # 采集参数
    parser.add_argument(
        "--traffic-type",
        type=int,
        default=1,
        choices=[1, 2, 3],
        help="流量类型: 1=全部, 2=自然, 3=付费 (默认: 1)",
    )
    parser.add_argument(
        "--user-role",
        type=int,
        default=1,
        choices=[1, 2],
        help="用户角色: 1=广告主, 2=达人 (默认: 1)",
    )
    parser.add_argument(
        "--sign",
        type=str,
        help="自定义签名（从浏览器复制）",
    )

    # 账号配置
    parser.add_argument(
        "--account",
        type=str,
        default="item_account_1",
        help="账号名称 (默认: item_account_1，作品数据专用账号)",
    )
    parser.add_argument(
        "--use-author-account",
        action="store_true",
        help="使用达人采集账号池（account1/2/3）而非作品数据专用账号",
    )
    parser.add_argument(
        "--star-id",
        type=str,
        help="星图账户ID（不指定则从account_pool.json读取）",
    )
    parser.add_argument(
        "--cookie",
        type=str,
        help="Cookie字符串（不指定则从cookies.txt读取）",
    )

    # 速率控制
    parser.add_argument(
        "--qps",
        type=float,
        default=0.5,
        help="每秒请求数限制（默认: 0.5，推荐0.3-1.0）",
    )

    # 输出配置
    parser.add_argument(
        "--output",
        type=str,
        help="输出文件路径（JSON格式，不指定则打印到控制台）",
    )
    parser.add_argument(
        "--pretty",
        action="store_true",
        help="美化JSON输出",
    )

    # 数据库配置
    parser.add_argument(
        "--save-db",
        action="store_true",
        help="保存数据到PostgreSQL数据库",
    )
    parser.add_argument(
        "--run-name",
        type=str,
        help="运行名称（保存到数据库时使用）",
    )
    parser.add_argument(
        "--no-raw-archive",
        action="store_true",
        help="不保存原始API响应（仅保存解析后数据）",
    )

    args = parser.parse_args()

    # 初始化日志
    logger = get_json_logger("item_delivery_tool")
    log_event(logger, "info", "作品投放数据采集工具启动")

    # 解析作品ID列表
    if args.item_id:
        item_ids = [args.item_id]
    elif args.item_ids:
        item_ids = [id.strip() for id in args.item_ids.split(",")]
    else:
        item_ids = load_item_ids_from_file(args.item_ids_file)

    log_event(logger, "info", f"待采集作品数量: {len(item_ids)}")

    # 加载账号配置
    if args.star_id and args.cookie:
        # 直接使用指定的star_id和cookie
        star_id = args.star_id
        cookie = args.cookie
        log_event(logger, "info", f"使用自定义配置: star_id={star_id}")
    elif args.use_author_account:
        # 使用达人采集账号池
        log_event(logger, "info", f"使用达人采集账号池: {args.account}")
        star_id = get_star_id_by_account(args.account)
        if not star_id:
            log_event(logger, "error", f"达人采集账号 {args.account} 未配置star_id")
            sys.exit(1)

        cookie_file = (
            Path(__file__).parent
            / "account_manager"
            / "config"
            / "accounts"
            / args.account
            / "cookies.txt"
        )
        cookie = read_cookie_file(str(cookie_file))
    else:
        # 使用作品数据专用账号池（默认）
        log_event(logger, "info", f"使用作品数据专用账号: {args.account}")

        if args.star_id:
            star_id = args.star_id
        else:
            star_id = get_item_star_id_by_account(args.account)
            if not star_id:
                log_event(
                    logger,
                    "error",
                    f"作品数据账号 {args.account} 未配置star_id\n"
                    f"请检查: tools/account_manager/config/item_delivery_account_pool.json",
                )
                sys.exit(1)

        if args.cookie:
            cookie = args.cookie
        else:
            cookie_file_path = get_item_cookie_file_path(args.account)
            if not cookie_file_path:
                log_event(
                    logger,
                    "error",
                    f"作品数据账号 {args.account} Cookie文件路径未配置",
                )
                sys.exit(1)
            cookie = read_cookie_file(cookie_file_path)

    log_event(logger, "info", f"使用账号: {args.account}, star_id: {star_id}")
    log_event(logger, "info", f"QPS设置: {args.qps}")
    log_event(logger, "info", f"保存到数据库: {args.save_db}")

    # 初始化客户端
    try:
        client = ItemDataClient(
            star_id=star_id,
            cookie=cookie,
            qps=args.qps,
        )
    except Exception as e:
        log_event(logger, "error", f"客户端初始化失败: {e}")
        sys.exit(1)

    # 初始化数据库服务（如果需要）
    db_service = None
    run_id = None
    if args.save_db:
        try:
            db_service = ItemDeliveryDBService()
            run_id = db_service.create_run(
                account_id=args.account,
                star_id=star_id,
                run_name=args.run_name,
                traffic_type=args.traffic_type,
                user_role=args.user_role,
                qps=args.qps,
            )
            log_event(logger, "info", f"数据库运行ID: {run_id}")
        except Exception as e:
            log_event(logger, "error", f"数据库初始化失败: {e}")
            sys.exit(1)

    # 采集数据
    results = []
    success_count = 0
    failed_count = 0

    for idx, item_id in enumerate(item_ids, 1):
        log_event(
            logger,
            "info",
            f"采集进度: {idx}/{len(item_ids)}, item_id={item_id}",
        )

        try:
            data = client.get_item_trend_stat(
                item_id=item_id,
                traffic_type=args.traffic_type,
                user_role=args.user_role,
                sign=args.sign,
            )

            # 提取核心字段
            extracted = client.extract_essential_fields(data)

            results.append(
                {
                    "item_id": item_id,
                    "status": "success",
                    "data": extracted,
                }
            )

            log_event(
                logger,
                "info",
                f"采集成功: item_id={item_id}, "
                f"play_count={extracted['realtime_stats']['play_count']}",
            )

            # 保存到数据库
            if db_service and run_id:
                try:
                    db_success, db_error = db_service.save_item_data(
                        run_id=run_id,
                        item_id=item_id,
                        raw_response=data if not args.no_raw_archive else {},
                        parsed_data=extracted,
                        traffic_type=args.traffic_type,
                        user_role=args.user_role,
                        api_status=200,
                        api_code=data.get("code", 0),
                        api_msg=data.get("msg"),
                        commit=True,
                    )
                    if db_success:
                        log_event(logger, "info", f"数据库保存成功: item_id={item_id}")
                    else:
                        log_event(logger, "warning", f"数据库保存失败: {db_error}")
                except Exception as db_e:
                    log_event(logger, "warning", f"数据库保存异常: {db_e}")

            success_count += 1

        except Exception as e:
            import traceback
            traceback.print_exc()  # 打印完整堆栈
            log_event(logger, "error", f"采集失败: item_id={item_id}, error={e}")
            results.append(
                {
                    "item_id": item_id,
                    "status": "failed",
                    "error": str(e),
                }
            )
            failed_count += 1

    # 输出结果
    output_data = {
        "summary": {
            "total": len(item_ids),
            "success": sum(1 for r in results if r["status"] == "success"),
            "failed": sum(1 for r in results if r["status"] == "failed"),
        },
        "results": results,
    }

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            if args.pretty:
                json.dump(output_data, f, ensure_ascii=False, indent=2)
            else:
                json.dump(output_data, f, ensure_ascii=False)
        log_event(logger, "info", f"结果已保存到: {args.output}")
    else:
        if args.pretty:
            print(json.dumps(output_data, ensure_ascii=False, indent=2))
        else:
            print(json.dumps(output_data, ensure_ascii=False))

    # 统计信息
    log_event(
        logger,
        "info",
        f"采集完成: 总数={output_data['summary']['total']}, "
        f"成功={output_data['summary']['success']}, "
        f"失败={output_data['summary']['failed']}",
    )

    # 更新数据库运行状态
    if db_service and run_id:
        try:
            final_status = "completed" if failed_count == 0 else (
                "partial" if success_count > 0 else "failed"
            )
            db_service.update_run_status(
                run_id=run_id,
                status=final_status,
                total_items=len(item_ids),
                success_count=success_count,
                failed_count=failed_count,
                finish=True,
            )
            db_service.conn.commit()
            log_event(logger, "info", f"运行状态已更新: {final_status}")

            # 打印数据库统计
            stats = db_service.get_run_statistics(run_id)
            if stats:
                log_event(logger, "info", f"数据库统计: 实际保存={stats.get('actual_saved_count', 0)}")

        except Exception as e:
            log_event(logger, "warning", f"更新运行状态失败: {e}")
        finally:
            db_service.close()

    client.close()


if __name__ == "__main__":
    main()
