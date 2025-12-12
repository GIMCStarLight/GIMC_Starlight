#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
批量达人详情采集与入库

支持从数据库读取author_id列表，批量采集详情并更新数据库

使用示例:
    # 采集所有未完善的达人（无self_intro字段）
    python entrypoints/batch_fetch_author_details.py --mode missing
    
    # 采集指定粉丝范围
    python entrypoints/batch_fetch_author_details.py --mode range --min-follower 100000 --max-follower 1000000
    
    # 从文件读取ID列表
    python entrypoints/batch_fetch_author_details.py --mode file --id-file author_ids.txt
    
    # 指定批次大小和并发数
    python entrypoints/batch_fetch_author_details.py --mode missing --batch-size 100 --workers 3
"""

import argparse
import sys
import time
from pathlib import Path
from typing import List, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed

PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from adapters.xingtu import AuthorInfoClient
from services.author_detail_saver import AuthorDetailSaver
import psycopg2


class BatchFetchOrchestrator:
    """批量采集任务编排器"""
    
    def __init__(self, db_config: dict, cookie_file: str, star_id: str, qps: int = 5):
        self.db_config = db_config
        self.cookie_file = cookie_file
        self.star_id = star_id
        self.qps = qps
        
        # 数据库连接
        self.db_saver = AuthorDetailSaver(db_config)
        
    def get_missing_author_ids(self, limit: int = None) -> List[str]:
        """获取缺少详情字段的author_id列表"""
        conn = psycopg2.connect(**self.db_config)
        cur = conn.cursor()
        
        sql = """
            SELECT author_id, follower 
            FROM authors_core 
            WHERE self_intro IS NULL 
                AND follower > 10000
            ORDER BY follower DESC
        """
        if limit:
            sql += f" LIMIT {limit}"
        
        cur.execute(sql)
        author_ids = [row[0] for row in cur.fetchall()]
        
        cur.close()
        conn.close()
        
        return author_ids
    
    def get_author_ids_by_follower_range(self, min_follower: int, max_follower: int, limit: int = None) -> List[str]:
        """按粉丝范围获取author_id"""
        conn = psycopg2.connect(**self.db_config)
        cur = conn.cursor()
        
        sql = """
            SELECT author_id, follower 
            FROM authors_core 
            WHERE follower >= %s AND follower <= %s
                AND self_intro IS NULL
            ORDER BY follower DESC
        """
        if limit:
            sql += f" LIMIT {limit}"
        
        cur.execute(sql, (min_follower, max_follower))
        author_ids = [row[0] for row in cur.fetchall()]
        
        cur.close()
        conn.close()
        
        return author_ids
    
    def fetch_batch(self, author_ids: List[str], batch_num: int, total_batches: int) -> Tuple[int, int]:
        """采集一批达人
        
        Returns:
            (成功数, 失败数)
        """
        client = AuthorInfoClient(
            star_id=self.star_id,
            cookie_file=self.cookie_file,
            qps=self.qps
        )
        
        success = 0
        failed = 0
        
        print(f"\n[批次 {batch_num}/{total_batches}] 开始采集 {len(author_ids)} 个达人")
        
        for i, author_id in enumerate(author_ids, 1):
            try:
                # 获取数据
                info = client.get_complete_info(author_id)
                essential = client.extract_essential_fields(info)
                
                # 保存到数据库
                if self.db_saver.save_author_detail(essential):
                    success += 1
                    print(f"  [{i}/{len(author_ids)}] {essential['nick_name']} - 成功")
                else:
                    failed += 1
                    print(f"  [{i}/{len(author_ids)}] {author_id} - 入库失败")
                
            except Exception as e:
                failed += 1
                print(f"  [{i}/{len(author_ids)}] {author_id} - 采集失败: {e}")
        
        client.close()
        return success, failed
    
    def run(self, author_ids: List[str], batch_size: int = 50, workers: int = 1) -> dict:
        """执行批量采集任务
        
        Args:
            author_ids: 达人ID列表
            batch_size: 每批数量
            workers: 并发工作线程数
        
        Returns:
            统计结果字典
        """
        if not author_ids:
            print("没有需要采集的达人")
            return {"total": 0, "success": 0, "failed": 0}
        
        print(f"总计待采集: {len(author_ids)} 个达人")
        print(f"批次配置: 每批{batch_size}个, {workers}个并发")
        
        # 分批
        batches = []
        for i in range(0, len(author_ids), batch_size):
            batches.append(author_ids[i:i + batch_size])
        
        total_success = 0
        total_failed = 0
        total_batches = len(batches)
        
        # 单线程模式
        if workers == 1:
            for idx, batch in enumerate(batches, 1):
                success, failed = self.fetch_batch(batch, idx, total_batches)
                total_success += success
                total_failed += failed
                
                # 批次间延迟
                if idx < total_batches:
                    time.sleep(2)
        
        # 多线程模式
        else:
            with ThreadPoolExecutor(max_workers=workers) as executor:
                futures = {}
                for idx, batch in enumerate(batches, 1):
                    future = executor.submit(self.fetch_batch, batch, idx, total_batches)
                    futures[future] = idx
                
                for future in as_completed(futures):
                    batch_idx = futures[future]
                    try:
                        success, failed = future.result()
                        total_success += success
                        total_failed += failed
                    except Exception as e:
                        print(f"[批次 {batch_idx}] 执行失败: {e}")
                        total_failed += len(batches[batch_idx - 1])
        
        return {
            "total": len(author_ids),
            "success": total_success,
            "failed": total_failed
        }


def main():
    parser = argparse.ArgumentParser(description="批量达人详情采集工具")
    
    # 采集模式
    parser.add_argument(
        "--mode",
        choices=["missing", "range", "file", "all"],
        default="missing",
        help="采集模式: missing(缺失字段), range(粉丝范围), file(文件), all(全部)"
    )
    
    # 粉丝范围模式参数
    parser.add_argument("--min-follower", type=int, help="最小粉丝数")
    parser.add_argument("--max-follower", type=int, help="最大粉丝数")
    
    # 文件模式参数
    parser.add_argument("--id-file", help="author_id列表文件")
    
    # 批量控制
    parser.add_argument("--batch-size", type=int, default=50, help="每批数量")
    parser.add_argument("--workers", type=int, default=1, help="并发线程数")
    parser.add_argument("--limit", type=int, help="限制采集数量")
    
    # 爬虫配置
    parser.add_argument("--cookie-file", default="config/cookies.txt", help="Cookie文件")
    parser.add_argument("--star-id", default="1843934177451019", help="星图账号ID")
    parser.add_argument("--qps", type=int, default=5, help="每秒请求数")
    
    # 数据库配置
    parser.add_argument("--db-host", default="192.168.102.168", help="数据库主机")
    parser.add_argument("--db-port", type=int, default=5432, help="数据库端口")
    
    args = parser.parse_args()
    
    # 数据库配置
    db_config = {
        'host': args.db_host,
        'port': args.db_port,
        'database': 'crawler_db_v2',
        'user': 'postgres',
        'password': 'postgres'
    }
    
    # Cookie文件路径
    cookie_file = str(PROJECT_ROOT / args.cookie_file)
    
    # 初始化编排器
    orchestrator = BatchFetchOrchestrator(
        db_config=db_config,
        cookie_file=cookie_file,
        star_id=args.star_id,
        qps=args.qps
    )
    
    # 获取待采集ID列表
    author_ids = []
    
    if args.mode == "missing":
        print("[模式] 采集缺失详情字段的达人")
        author_ids = orchestrator.get_missing_author_ids(args.limit)
        
    elif args.mode == "range":
        if not args.min_follower or not args.max_follower:
            print("错误: range模式需要指定 --min-follower 和 --max-follower")
            sys.exit(1)
        print(f"[模式] 采集粉丝范围 {args.min_follower:,} - {args.max_follower:,}")
        author_ids = orchestrator.get_author_ids_by_follower_range(
            args.min_follower, args.max_follower, args.limit
        )
        
    elif args.mode == "file":
        if not args.id_file:
            print("错误: file模式需要指定 --id-file")
            sys.exit(1)
        print(f"[模式] 从文件读取: {args.id_file}")
        with open(args.id_file, 'r') as f:
            author_ids = [line.strip() for line in f if line.strip()]
        if args.limit:
            author_ids = author_ids[:args.limit]
    
    elif args.mode == "all":
        print("[模式] 采集所有达人（谨慎使用）")
        author_ids = orchestrator.get_missing_author_ids(args.limit)
    
    # 执行采集
    start_time = time.time()
    result = orchestrator.run(author_ids, args.batch_size, args.workers)
    elapsed = time.time() - start_time
    
    # 输出统计
    print("\n" + "="*50)
    print("采集完成统计")
    print("="*50)
    print(f"总计: {result['total']} 个达人")
    print(f"成功: {result['success']} 个")
    print(f"失败: {result['failed']} 个")
    print(f"成功率: {result['success']/result['total']*100:.1f}%" if result['total'] > 0 else "N/A")
    print(f"耗时: {elapsed:.1f} 秒")
    print(f"平均速度: {result['total']/elapsed:.1f} 个/秒" if elapsed > 0 else "N/A")
    print("="*50)
    
    orchestrator.db_saver.close()


if __name__ == "__main__":
    main()
