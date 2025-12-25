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
import logging
from datetime import datetime
from pathlib import Path
from typing import List, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed

PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from adapters.xingtu import AuthorInfoClient
from services.author_detail_saver import AuthorDetailSaver
from services.rate_limiter import TimeWindowQPSLimiter
from services.adaptive_qps import AdaptiveQpsPolicy, AdaptiveQpsConfig
from services.account_config import get_star_id_from_cookie_path
import psycopg2


def setup_logger(log_dir: str = "logs", log_level: int = logging.INFO) -> logging.Logger:
    """设置详细的日志系统
    
    Args:
        log_dir: 日志目录
        log_level: 日志级别
    
    Returns:
        配置好的logger对象
    """
    # 创建日志目录
    log_path = Path(log_dir)
    log_path.mkdir(exist_ok=True)
    
    # 创建logger
    logger = logging.getLogger('batch_fetch_author')
    logger.setLevel(log_level)
    
    # 清除已有的handler
    logger.handlers.clear()
    
    # 日志文件名（按日期和时间）
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    # 1. 详细日志文件（所有级别）
    detail_file = log_path / f"detail_{timestamp}.log"
    detail_handler = logging.FileHandler(detail_file, encoding='utf-8')
    detail_handler.setLevel(logging.DEBUG)
    detail_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    detail_handler.setFormatter(detail_formatter)
    logger.addHandler(detail_handler)
    
    # 2. 错误日志文件（ERROR级别）
    error_file = log_path / f"error_{timestamp}.log"
    error_handler = logging.FileHandler(error_file, encoding='utf-8')
    error_handler.setLevel(logging.ERROR)
    error_formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s\n'
        'File: %(pathname)s:%(lineno)d\n'
        'Function: %(funcName)s\n'
        '---',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    error_handler.setFormatter(error_formatter)
    logger.addHandler(error_handler)
    
    # 3. 统计日志文件（INFO级别，简化格式）
    stats_file = log_path / f"stats_{timestamp}.log"
    stats_handler = logging.FileHandler(stats_file, encoding='utf-8')
    stats_handler.setLevel(logging.INFO)
    stats_handler.addFilter(lambda record: 'STATS' in record.getMessage())
    stats_formatter = logging.Formatter('%(asctime)s - %(message)s', datefmt='%Y-%m-%d %H:%M:%S')
    stats_handler.setFormatter(stats_formatter)
    logger.addHandler(stats_handler)
    
    # 4. 控制台输出（INFO级别）
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s', datefmt='%H:%M:%S')
    console_handler.setFormatter(console_formatter)
    logger.addHandler(console_handler)
    
    logger.info(f"日志系统初始化完成")
    logger.info(f"详细日志: {detail_file}")
    logger.info(f"错误日志: {error_file}")
    logger.info(f"统计日志: {stats_file}")
    logger.info("="*60)
    
    return logger


class BatchFetchOrchestrator:
    """批量采集任务编排器"""
    
    def __init__(self, db_config: dict, cookie_file: str, star_id: str, qps: float = 2, 
                 enable_adaptive: bool = True, logger: logging.Logger = None):
        self.db_config = db_config
        self.cookie_file = cookie_file
        self.star_id = star_id
        self.qps = qps
        self.enable_adaptive = enable_adaptive
        self.logger = logger or logging.getLogger(__name__)
        
        # 数据库连接
        self.db_saver = AuthorDetailSaver(db_config)
        
        # 初始化自适应QPS策略
        if enable_adaptive:
            qps_config = AdaptiveQpsConfig(
                min_qps=0.1,  # 支持最小0.1 QPS（每10秒1个请求）
                max_qps=qps,
                step=0.5,  # 每次调整0.5
                backoff_base=0.6,  # 失败时降到60%
                success_needed=5,   # 连续5次成功才升级
                upgrade_cooldown_sec=300  # 5分钟冷却
            )
            self.adaptive_policy = AdaptiveQpsPolicy(qps, qps_config)
        else:
            self.adaptive_policy = None
        
        # 反爬统计
        self.stats = {
            'total_requests': 0,
            'failed_requests': 0,
            'code_31157_count': 0,  # 频控
            'code_10255_count': 0,  # 权限
            'consecutive_401': 0,
            'last_429_403_time': 0,
            'start_time': time.time()
        }
        
        self.logger.info("BatchFetchOrchestrator 初始化完成")
        self.logger.debug(f"配置: QPS={qps}, 自适应QPS={enable_adaptive}, Cookie文件={cookie_file}")
        
    def get_missing_author_ids(self, limit: int = None) -> List[str]:
        """获取缺少详情字段的author_id列表"""
        self.logger.info("开始查询待采集达人列表...")
        try:
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
            
            self.logger.debug(f"执行SQL: {sql}")
            cur.execute(sql)
            author_ids = [row[0] for row in cur.fetchall()]
            
            cur.close()
            conn.close()
            
            self.logger.info(f"查询完成，找到 {len(author_ids)} 个待采集达人")
            return author_ids
        except Exception as e:
            self.logger.error(f"查询待采集达人列表失败: {e}", exc_info=True)
            raise
    
    def get_author_ids_by_follower_range(self, min_follower: int, max_follower: int, limit: int = None) -> List[str]:
        """按粉丝范围获取author_id"""
        self.logger.info(f"查询粉丝范围 {min_follower:,} - {max_follower:,} 的达人...")
        try:
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
            
            self.logger.debug(f"执行SQL: {sql} with params ({min_follower}, {max_follower})")
            cur.execute(sql, (min_follower, max_follower))
            author_ids = [row[0] for row in cur.fetchall()]
            
            cur.close()
            conn.close()
            
            self.logger.info(f"查询完成，找到 {len(author_ids)} 个达人")
            return author_ids
        except Exception as e:
            self.logger.error(f"查询粉丝范围达人失败: {e}", exc_info=True)
            raise
    
    def fetch_batch(self, author_ids: List[str], batch_num: int, total_batches: int) -> Tuple[int, int]:
        """采集一批达人（带反爬机制）
        
        Returns:
            (成功数, 失败数)
        """
        batch_start_time = time.time()
        self.logger.info(f"="*60)
        self.logger.info(f"开始批次 {batch_num}/{total_batches}，共 {len(author_ids)} 个达人")
        
        # 动态QPS
        current_qps = self.qps
        if self.adaptive_policy:
            current_qps = max(0.1, self.adaptive_policy.current_qps)  # 允许降低到0.1 QPS
        
        self.logger.info(f"当前QPS: {current_qps}")
        
        client = AuthorInfoClient(
            star_id=self.star_id,
            cookie_file=self.cookie_file,
            qps=current_qps
        )
        
        success = 0
        failed = 0
        batch_stats = {'failed': 0, 'total': len(author_ids)}
        
        print(f"\n[批次 {batch_num}/{total_batches}] 开始采集 {len(author_ids)} 个达人 (QPS={current_qps})")
        
        for i, author_id in enumerate(author_ids, 1):
            self.stats['total_requests'] += 1
            item_start_time = time.time()
            
            self.logger.debug(f"[批次{batch_num}] [{i}/{len(author_ids)}] 开始采集 author_id={author_id}")
            
            try:
                # 检查429/403冷却
                self._check_cooldown()
                
                # 检查连续401暂停
                if self.stats['consecutive_401'] >= 3:
                    msg = f"连续{self.stats['consecutive_401']}次401错误，暂停30秒..."
                    print(f"  [警告] {msg}")
                    self.logger.warning(msg)
                    time.sleep(30)
                    self.stats['consecutive_401'] = 0
                
                # 获取数据
                info = client.get_complete_info(author_id)
                essential = client.extract_essential_fields(info)
                
                # 重置401计数
                self.stats['consecutive_401'] = 0
                
                # 保存到数据库
                if self.db_saver.save_author_detail(essential):
                    success += 1
                    elapsed = time.time() - item_start_time
                    msg = f"[{i}/{len(author_ids)}] {essential['nick_name']} - 成功 (耗时: {elapsed:.2f}s)"
                    print(f"  {msg}")
                    self.logger.info(msg)
                    self.logger.debug(f"author_id={author_id}, follower={essential.get('follower', 'N/A')}")
                else:
                    failed += 1
                    msg = f"[{i}/{len(author_ids)}] {author_id} - 入库失败"
                    print(f"  {msg}")
                    self.logger.error(msg)
                
            except Exception as e:
                failed += 1
                batch_stats['failed'] += 1
                self.stats['failed_requests'] += 1
                elapsed = time.time() - item_start_time
                
                error_msg = str(e)
                
                # 识别错误类型
                if '31157' in error_msg:
                    self.stats['code_31157_count'] += 1
                    msg = f"[{i}/{len(author_ids)}] {author_id} - 频控ban (31157)"
                    print(f"  {msg}")
                    self.logger.error(msg)
                    self.logger.error(f"详细错误: {error_msg}")
                    print("  [严重] 账号被频控，停止采集！")
                    self.logger.critical("账号被频控，停止采集！")
                    break
                elif '10255' in error_msg:
                    self.stats['code_10255_count'] += 1
                    msg = f"[{i}/{len(author_ids)}] {author_id} - 权限不足 (10255)"
                    print(f"  {msg}")
                    self.logger.error(msg)
                elif '401' in error_msg:
                    self.stats['consecutive_401'] += 1
                    msg = f"[{i}/{len(author_ids)}] {author_id} - 未授权 (401) [连续{self.stats['consecutive_401']}次]"
                    print(f"  {msg}")
                    self.logger.warning(msg)
                elif '429' in error_msg or '403' in error_msg:
                    self.stats['last_429_403_time'] = time.time()
                    msg = f"[{i}/{len(author_ids)}] {author_id} - 触发限流 (429/403)，冷却60秒..."
                    print(f"  {msg}")
                    self.logger.warning(msg)
                    time.sleep(60)
                else:
                    msg = f"[{i}/{len(author_ids)}] {author_id} - 采集失败: {e}"
                    print(f"  {msg}")
                    self.logger.error(msg, exc_info=True)
        
        # 自适应QPS调整
        if self.adaptive_policy:
            new_qps = self.adaptive_policy.adjust(
                pages_done=batch_stats['total'],
                failed_pages=batch_stats['failed'],
                authors_total=success
            )
            if new_qps != current_qps:
                msg = f"QPS调整: {current_qps} -> {new_qps}"
                print(f"  [自适应] {msg}")
                self.logger.info(f"[自适应QPS] {msg}")
        
        batch_elapsed = time.time() - batch_start_time
        self.logger.info(f"批次 {batch_num} 完成: 成功={success}, 失败={failed}, 耗时={batch_elapsed:.2f}s")
        self.logger.info(f"STATS - 批次{batch_num}: success={success}, failed={failed}, qps={current_qps}, time={batch_elapsed:.2f}s")
        
        client.close()
        return success, failed
    
    def _check_cooldown(self):
        """检查429/403冷却时间"""
        if self.stats['last_429_403_time'] > 0:
            elapsed = time.time() - self.stats['last_429_403_time']
            if elapsed < 60:  # 60秒冷却
                wait = 60 - elapsed
                msg = f"等待 {wait:.1f}秒..."
                print(f"  [冷却] {msg}")
                self.logger.info(f"[冷却] {msg}")
                time.sleep(wait)
                self.stats['last_429_403_time'] = 0
    
    def run(self, author_ids: List[str], batch_size: int = 50, workers: int = 1) -> dict:
        """执行批量采集任务
            
        Args:
            author_ids: 达人 ID列表
            batch_size: 每批数量
            workers: 并发工作线程数
            
        Returns:
            统计结果字典
        """
        if not author_ids:
            msg = "没有需要采集的达人"
            print(msg)
            self.logger.warning(msg)
            return {"total": 0, "success": 0, "failed": 0}
            
        self.logger.info("="*60)
        self.logger.info("开始执行批量采集任务")
        self.logger.info(f"总计待采集: {len(author_ids)} 个达人")
        self.logger.info(f"批次配置: 每批{batch_size}个, {workers}个并发")
        self.logger.info("="*60)
            
        print(f"总计待采集: {len(author_ids)} 个达人")
        print(f"批次配置: 每批{batch_size}个, {workers}个并发")
            
        # 分批
        batches = []
        for i in range(0, len(author_ids), batch_size):
            batches.append(author_ids[i:i + batch_size])
            
        self.logger.info(f"分批完成: 共 {len(batches)} 个批次")
            
        total_success = 0
        total_failed = 0
        total_batches = len(batches)
            
        # 单线程模式
        if workers == 1:
            self.logger.info("使用单线程模式")
            for idx, batch in enumerate(batches, 1):
                success, failed = self.fetch_batch(batch, idx, total_batches)
                total_success += success
                total_failed += failed
                    
                # 批次间延迟
                if idx < total_batches:
                    self.logger.debug("批次间延迟 2秒")
                    time.sleep(2)
            
        # 多线程模式
        else:
            self.logger.info(f"使用多线程模式: {workers} 个工作线程")
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
                        msg = f"批次 {batch_idx} 执行失败: {e}"
                        print(f"[{msg}]")
                        self.logger.error(msg, exc_info=True)
                        total_failed += len(batches[batch_idx - 1])
            
        result = {
            "total": len(author_ids),
            "success": total_success,
            "failed": total_failed
        }
            
        # 记录最终统计
        total_elapsed = time.time() - self.stats['start_time']
        self.logger.info("="*60)
        self.logger.info("采集任务完成")
        self.logger.info(f"STATS - 最终统计: total={result['total']}, success={result['success']}, failed={result['failed']}, elapsed={total_elapsed:.2f}s")
        self.logger.info(f"总请求次数: {self.stats['total_requests']}")
        self.logger.info(f"失败请求次数: {self.stats['failed_requests']}")
        self.logger.info(f"频控错误(31157): {self.stats['code_31157_count']}")
        self.logger.info(f"权限错误(10255): {self.stats['code_10255_count']}")
        self.logger.info("="*60)
            
        return result


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
    
    # 采集配置
    parser.add_argument("--cookie-file", default="config/cookies.txt", help="Cookie文件")
    parser.add_argument("--star-id", default="", help="星图账号ID（如未指定，将根据cookie文件路径自动获取）")
    parser.add_argument("--qps", type=float, default=2, help="每秒请求数（支持小数，如0.5表示每2秒1个请求，默认2，避免频控）")
    parser.add_argument("--enable-adaptive", action="store_true", default=True, help="启用自适应QPS")
    parser.add_argument("--no-adaptive", dest="enable_adaptive", action="store_false", help="禁用自适应QPS")
    
    # 数据库配置
    parser.add_argument("--db-host", default="192.168.102.168", help="数据库主机")
    parser.add_argument("--db-port", type=int, default=5432, help="数据库端口")
    
    # 日志配置
    parser.add_argument("--log-dir", default="logs", help="日志目录")
    parser.add_argument("--log-level", default="INFO", 
                        choices=["DEBUG", "INFO", "WARNING", "ERROR"],
                        help="日志级别")
    
    args = parser.parse_args()
    
    # 设置日志系统
    log_level = getattr(logging, args.log_level)
    logger = setup_logger(args.log_dir, log_level)
    
    logger.info("="*60)
    logger.info("批量达人详情采集程序启动")
    logger.info(f"启动时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info("="*60)
    
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
    
    # 自动从配置中获取star_id（如果未指定）
    star_id = args.star_id
    if not star_id or star_id == "1843934177451019":  # 默认值
        detected_star_id = get_star_id_from_cookie_path(args.cookie_file)
        if detected_star_id:
            star_id = detected_star_id
            logger.info(f"从配置中自动获取star_id: {star_id}")
        else:
            logger.warning(f"未能从配置中获取star_id，使用默认值: {star_id}")
    else:
        logger.info(f"使用指定的star_id: {star_id}")
    
    # 初始化编排器
    logger.info("初始化批量采集编排器...")
    orchestrator = BatchFetchOrchestrator(
        db_config=db_config,
        cookie_file=cookie_file,
        star_id=star_id,
        qps=args.qps,
        enable_adaptive=args.enable_adaptive,
        logger=logger
    )
    
    logger.info(f"配置: QPS={args.qps}, 自适应={'开启' if args.enable_adaptive else '关闭'}, star_id={star_id}")
    print(f"[配置] QPS={args.qps}, 自适应={'开启' if args.enable_adaptive else '关闭'}, star_id={star_id}")
    
    # 获取待采集ID列表
    author_ids = []
    
    if args.mode == "missing":
        logger.info("[模式] 采集缺失详情字段的达人")
        print("[模式] 采集缺失详情字段的达人")
        author_ids = orchestrator.get_missing_author_ids(args.limit)
        
    elif args.mode == "range":
        if not args.min_follower or not args.max_follower:
            error_msg = "range模式需要指定 --min-follower 和 --max-follower"
            logger.error(error_msg)
            print(f"错误: {error_msg}")
            sys.exit(1)
        logger.info(f"[模式] 采集粉丝范围 {args.min_follower:,} - {args.max_follower:,}")
        print(f"[模式] 采集粉丝范围 {args.min_follower:,} - {args.max_follower:,}")
        author_ids = orchestrator.get_author_ids_by_follower_range(
            args.min_follower, args.max_follower, args.limit
        )
        
    elif args.mode == "file":
        if not args.id_file:
            error_msg = "file模式需要指定 --id-file"
            logger.error(error_msg)
            print(f"错误: {error_msg}")
            sys.exit(1)
        logger.info(f"[模式] 从文件读取: {args.id_file}")
        print(f"[模式] 从文件读取: {args.id_file}")
        with open(args.id_file, 'r') as f:
            author_ids = [line.strip() for line in f if line.strip()]
        if args.limit:
            author_ids = author_ids[:args.limit]
        logger.info(f"从文件读取到 {len(author_ids)} 个ID")
    
    elif args.mode == "all":
        logger.warning("[模式] 采集所有达人（谨慎使用）")
        print("[模式] 采集所有达人（谨慎使用）")
        author_ids = orchestrator.get_missing_author_ids(args.limit)
    
    # 执行采集
    logger.info("开始执行采集任务...")
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
    
    logger.info("\n" + "="*60)
    logger.info("程序执行完毕")
    logger.info(f"结束时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    logger.info(f"总耗时: {elapsed:.1f}秒")
    logger.info("="*60 + "\n")
    
    orchestrator.db_saver.close()
    logger.info("数据库连接已关闭")


if __name__ == "__main__":
    main()
