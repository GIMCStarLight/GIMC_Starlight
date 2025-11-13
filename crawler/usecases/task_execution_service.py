"""
任务执行用例服务
负责任务计划的生成和执行逻辑
"""
from __future__ import annotations

import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
TASK_CONTROL_DIR = Path(__file__).resolve().parent.parent
if str(TASK_CONTROL_DIR) not in sys.path:
    sys.path.insert(0, str(TASK_CONTROL_DIR))

import json
import math
import os
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional

from services.adaptive_qps import AdaptiveQpsPolicy, create_adaptive_qps_policy, create_qps_config
try:
    from services.db_v2 import DatabaseServiceV2 as PgSaver
except ImportError:
    from services.db import PgSaver
from services.rate_limiter import TimeWindowQPSLimiter, calculate_dynamic_sleep_ms, create_qps_limiter

from usecases.plan_service import Job

# 导入 fetch_author_square_by_tags 模块的功能
try:
    from fetch_author_square_by_tags import (
        build_headers, read_cookie_file, fetch_pages, DEFAULT_USER_AGENT, DEFAULT_REFERER
    )
except ImportError:
    # 如果直接导入失败，尝试从 task_control 包导入
    try:
        from fetch_author_square_by_tags import (
            build_headers, read_cookie_file, fetch_pages, DEFAULT_USER_AGENT, DEFAULT_REFERER
        )
    except ImportError:
        build_headers = None
        read_cookie_file = None
        fetch_pages = None
        DEFAULT_USER_AGENT = "Mozilla/5.0 (compatible; TaskControl/1.0)"
        DEFAULT_REFERER = "https://agent.oceanengine.com"


@dataclass
class JobResult:
    """任务执行结果"""
    job_index: int
    pages_done: int
    authors_total: int
    failed_pages: int
    report_path: Optional[str]
    failed_report_path: Optional[str]
    started_at: str
    finished_at: str


@dataclass
class TaskExecutionConfig:
    """任务执行配置"""
    # 基础配置
    output_dir: str
    cookie_file: str
    star_id: str
    video_type: str
    min_price: int
    search_type: int
    sort_field: str
    sort_type: int
    
    # 分页与稳定性
    limit: int
    max_pages: int
    sleep_ms: int
    retry_max: int
    retry_backoff_ms: int
    
    # 地域过滤
    province_id: Optional[int] = None
    city_id: Optional[int] = None
    extra_filters: Optional[List[str]] = None
    
    # 控制选项
    auto_pages: bool = False
    auto_pages_upper_bound: Optional[int] = None
    resume: bool = False
    skip_existing: bool = False
    dry_run: bool = False
    
    # QPS 控制
    domain_qps: Optional[int] = None
    qps_window_ms: int = 1000
    sleep_ms_floor: int = 250
    
    # 自适应 QPS
    adaptive_qps: bool = False
    adaptive_qps_min: int = 1
    adaptive_qps_max: int = 2
    adaptive_qps_step: int = 1
    adaptive_success_needed: int = 3
    adaptive_upgrade_cooldown_sec: int = 300
    adaptive_backoff_base: float = 0.7
    adaptive_backoff_max_power: int = 3
    
    # 错误处理
    cooldown_429_403_ms: int = 2000
    max_failure_rate: Optional[float] = None
    stop_when_empty_n: Optional[int] = None
    max_consecutive_401: int = 3
    pause_on_401_ms: int = 600000  # 10分钟
    
    # 数据保存
    save_pg: bool = False
    pg_config: str = ""


class TaskExecutionService:
    """任务执行服务"""
    
    def __init__(self, config: TaskExecutionConfig):
        self.config = config
        self._current_qps: Optional[float] = None
        self._adaptive_policy: Optional[AdaptiveQpsPolicy] = None
        self._qps_limiter: Optional[TimeWindowQPSLimiter] = None
        
    def initialize_qps_control(self) -> None:
        """初始化 QPS 控制"""
        if self.config.domain_qps is None or self.config.domain_qps <= 0:
            return
            
        self._current_qps = float(self.config.domain_qps)
        self._qps_limiter = create_qps_limiter(
            qps=self.config.domain_qps,
            window_ms=self.config.qps_window_ms
        )
        
        if self.config.adaptive_qps:
            qps_config = create_qps_config(
                min_qps=max(1, self.config.adaptive_qps_min),
                max_qps=max(1, self.config.adaptive_qps_max),
                step=max(1, self.config.adaptive_qps_step),
                backoff_base=self.config.adaptive_backoff_base,
                backoff_max_power=max(1, self.config.adaptive_backoff_max_power),
                success_needed=max(1, self.config.adaptive_success_needed),
                upgrade_cooldown_sec=max(0, self.config.adaptive_upgrade_cooldown_sec),
                failure_rate_threshold=self.config.max_failure_rate or 0.2,
            )
            self._adaptive_policy = create_adaptive_qps_policy(
                current_qps=self._current_qps,
                config=qps_config
            )
            
        print(f"[limiter] 初始域级QPS={int(self._current_qps)} / window={self.config.qps_window_ms}ms")
    
    def get_effective_sleep_ms(self) -> int:
        """获取有效的 sleep 时间"""
        if self._current_qps is None:
            return self.config.sleep_ms
            
        return calculate_dynamic_sleep_ms(
            qps=int(self._current_qps),
            floor_ms=self.config.sleep_ms_floor
        )
    
    def adjust_adaptive_qps(self, pages_done: int, failed_pages: int, authors_total: int) -> None:
        """调整自适应 QPS"""
        if not self.config.adaptive_qps or self._adaptive_policy is None:
            return
            
        try:
            new_qps = self._adaptive_policy.adjust(
                pages_done=max(1, pages_done),
                failed_pages=failed_pages,
                authors_total=authors_total
            )
            
            if new_qps != self._current_qps:
                self._current_qps = new_qps
                # 更新限速器
                if self._qps_limiter is not None:
                    self._qps_limiter = create_qps_limiter(
                        qps=int(new_qps),
                        window_ms=self.config.qps_window_ms
                    )
                print(f"[adaptive-qps] 调整QPS: {new_qps}")
                
        except Exception as e:
            print(f"[adaptive-qps-warn] 自适应QPS调整失败：{e}")
    
    def acquire_qps_permit(self) -> None:
        """获取 QPS 许可"""
        if self._qps_limiter is not None:
            self._qps_limiter.acquire()
    
    def execute_job(self, job: Job, job_index: int, total_jobs: int) -> JobResult:
        """执行单个任务
        
        Args:
            job: 要执行的任务
            job_index: 任务索引
            total_jobs: 总任务数
            
        Returns:
            JobResult: 任务执行结果
        """
        print(f"[job] ({job_index+1}/{total_jobs}) {job.first_label} / {job.second_label or '_first_only_'}")
        
        started_at = datetime.now()
        
        if self.config.dry_run:
            # 干跑模式：仅模拟执行
            time.sleep(self.config.sleep_ms / 1000.0)
            return JobResult(
                job_index=job_index,
                pages_done=0,
                authors_total=0,
                failed_pages=0,
                report_path=None,
                failed_report_path=None,
                started_at=started_at.isoformat(),
                finished_at=datetime.now().isoformat(),
            )
        
        # 实际执行任务的逻辑将在这里实现
        # 目前返回模拟结果
        pages_done = 5  # 模拟值
        authors_total = 50  # 模拟值
        failed_pages = 0  # 模拟值
        
        # 调整自适应 QPS
        self.adjust_adaptive_qps(pages_done, failed_pages, authors_total)
        
        finished_at = datetime.now()
        
        return JobResult(
            job_index=job_index,
            pages_done=pages_done,
            authors_total=authors_total,
            failed_pages=failed_pages,
            report_path=f"report_{job_index}.json",
            failed_report_path=None,
            started_at=started_at.isoformat(),
            finished_at=finished_at.isoformat(),
        )
    
    def execute_jobs_plan(self, plan: Dict[str, Any]) -> List[JobResult]:
        """执行任务计划
        
        Args:
            plan: 任务计划字典
            
        Returns:
            List[JobResult]: 所有任务的执行结果
        """
        from dataclasses import fields
        job_field_names = {f.name for f in fields(Job)}
        jobs = [
            Job(**{k: v for k, v in (job_data or {}).items() if k in job_field_names})
            for job_data in plan.get("jobs", [])
        ]
        total_jobs = len(jobs)
        
        if total_jobs == 0:
            print("[plan] 没有任务需要执行")
            return []
        
        # 初始化 QPS 控制
        self.initialize_qps_control()
        
        print(f"[plan] 即将执行 {total_jobs} 个任务")
        
        results = []
        for idx, job in enumerate(jobs):
            # 获取 QPS 许可
            self.acquire_qps_permit()
            
            # 执行任务
            result = self.execute_job(job, idx, total_jobs)
            results.append(result)
            
            # 任务间休眠
            effective_sleep_ms = self.get_effective_sleep_ms()
            if effective_sleep_ms > 0:
                time.sleep(effective_sleep_ms / 1000.0)
        
        return results


def create_task_execution_service(config: TaskExecutionConfig) -> TaskExecutionService:
    """创建任务执行服务的工厂函数"""
    return TaskExecutionService(config)