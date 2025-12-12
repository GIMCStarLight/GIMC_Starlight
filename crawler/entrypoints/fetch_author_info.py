#!/usr/bin/env python3
"""达人信息采集入口脚本

使用方式:
    # 单个达人采集
    python entrypoints/fetch_author_info.py --author-id 6629722292110753806
    
    # 批量采集（从文件读取ID）
    python entrypoints/fetch_author_info.py --id-file author_ids.txt
    
    # 指定Cookie文件
    python entrypoints/fetch_author_info.py --author-id xxx --cookie-file config/cookies.txt
"""

import argparse
import json
import sys
from pathlib import Path

# 添加项目根目录
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from adapters.xingtu.author_client import AuthorInfoClient
from services.logging_utils import get_json_logger
from services.author_detail_saver import AuthorDetailSaver


def parse_args():
    parser = argparse.ArgumentParser(description="达人信息采集工具")
    parser.add_argument(
        "--author-id",
        type=str,
        help="单个达人ID",
    )
    parser.add_argument(
        "--id-file",
        type=str,
        help="达人ID列表文件（每行一个ID）",
    )
    parser.add_argument(
        "--star-id",
        type=str,
        default="1843934177451019",
        help="星图账户ID",
    )
    parser.add_argument(
        "--cookie-file",
        type=str,
        default="config/cookies.txt",
        help="Cookie文件路径",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="results/author_info",
        help="输出目录",
    )
    parser.add_argument(
        "--qps",
        type=int,
        default=5,
        help="每秒请求数限制",
    )
    parser.add_argument(
        "--no-db",
        action="store_true",
        help="不保存到数据库，仅保存JSON文件",
    )
    parser.add_argument(
        "--db-host",
        type=str,
        default="192.168.102.168",
        help="数据库主机地址",
    )
    return parser.parse_args()


def fetch_single(client: AuthorInfoClient, author_id: str, output_dir: Path, db_saver=None) -> dict:
    """采集单个达人"""
    print(f"正在采集: {author_id}")

    try:
        # 获取完整信息
        info = client.get_complete_info(author_id)
        essential = client.extract_essential_fields(info)

        # 保存到文件
        output_file = output_dir / f"{author_id}.json"
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(essential, f, ensure_ascii=False, indent=2)
        
        # 保存到数据库
        if db_saver:
            try:
                db_saver.save_author_detail(essential)
                print(f"  -> {essential['nick_name']}, 粉丝{essential['follower']:,} [已入库]")
            except Exception as db_error:
                print(f"  -> {essential['nick_name']}, 粉丝{essential['follower']:,} [入库失败: {db_error}]")
        else:
            print(f"  -> {essential['nick_name']}, 粉丝{essential['follower']:,}")
        
        return {"status": "success", "data": essential}

    except Exception as e:
        print(f"  -> 失败: {e}")
        return {"status": "failed", "error": str(e)}


def main():
    args = parse_args()
    logger = get_json_logger("fetch_author_info")

    # 确定要采集的ID列表
    author_ids = []
    if args.author_id:
        author_ids = [args.author_id]
    elif args.id_file:
        id_file = Path(args.id_file)
        if not id_file.exists():
            print(f"错误: ID文件不存在: {id_file}")
            sys.exit(1)
        with open(id_file, "r", encoding="utf-8") as f:
            author_ids = [line.strip() for line in f if line.strip()]
    else:
        print("错误: 必须指定 --author-id 或 --id-file")
        sys.exit(1)

    print(f"待采集达人数: {len(author_ids)}")

    # 确保Cookie文件存在
    cookie_file = PROJECT_ROOT / args.cookie_file
    if not cookie_file.exists():
        print(f"错误: Cookie文件不存在: {cookie_file}")
        sys.exit(1)

    # 创建输出目录
    output_dir = PROJECT_ROOT / args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    # 初始化客户端
    client = AuthorInfoClient(
        star_id=args.star_id,
        cookie_file=str(cookie_file),
        qps=args.qps,
    )
    
    # 初始化数据库保存器（如果需要）
    db_saver = None
    if not args.no_db:
        try:
            db_config = {
                'host': args.db_host,
                'port': 5432,
                'database': 'crawler_db_v2',
                'user': 'postgres',
                'password': 'postgres'
            }
            db_saver = AuthorDetailSaver(db_config)
            print(f"[数据库] 已连接 {args.db_host}:5432/crawler_db_v2")
        except Exception as e:
            print(f"[警告] 数据库连接失败: {e}，仅保存JSON文件")
            db_saver = None

    # 采集
    results = {"success": [], "failed": []}
    for author_id in author_ids:
        result = fetch_single(client, author_id, output_dir, db_saver)
        if result["status"] == "success":
            results["success"].append(author_id)
        else:
            results["failed"].append({"id": author_id, "error": result["error"]})

    # 汇总
    print(f"\n采集完成: 成功{len(results['success'])}, 失败{len(results['failed'])}")
    print(f"结果保存在: {output_dir}")

    # 保存汇总报告
    summary_file = output_dir / "_summary.json"
    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    client.close()
    if db_saver:
        db_saver.close()
        print("[数据库] 连接已关闭")


if __name__ == "__main__":
    main()
