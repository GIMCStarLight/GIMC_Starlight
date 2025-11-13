from __future__ import annotations

import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
TASK_CONTROL_DIR = Path(__file__).resolve().parent.parent
if str(TASK_CONTROL_DIR) not in sys.path:
    sys.path.insert(0, str(TASK_CONTROL_DIR))

from typing import Any, Dict, List, Optional
from dataclasses import dataclass

# 导入 tools.task_scheduler 模块的功能
try:
    from tools.task_scheduler import load_follower_ranges, apply_mode_presets
except ImportError:
    # 如果直接导入失败，尝试从 task_control 包导入
    try:
        from tools.task_scheduler import load_follower_ranges, apply_mode_presets
    except ImportError:
        load_follower_ranges = None
        apply_mode_presets = None

# 导入 fetch_author_square_by_tags 模块的功能
try:
    from fetch_author_square_by_tags import load_content_tags
except ImportError:
    # 如果直接导入失败，尝试从 task_control 包导入
    try:
        from fetch_author_square_by_tags import load_content_tags
    except ImportError:
        load_content_tags = None


@dataclass
class Job:
    """任务实体"""
    first_label: str
    first_id: str
    second_label: str = ""
    second_id: str = ""
    mode: Optional[str] = None
    follower_ge: Optional[int] = None
    follower_lt: Optional[int] = None
    limit: Optional[int] = None
    max_pages: Optional[int] = None
    sleep_ms: Optional[int] = None
    retry_max: Optional[int] = None
    retry_backoff_ms: Optional[int] = None
    sort_field: Optional[str] = None
    sort_type: Optional[int] = None
    follower_min: Optional[int] = None
    follower_max: Optional[int] = None


@dataclass
class Plan:
    """计划实体"""
    jobs: List[Job]
    metadata: Dict[str, Any]


class PlanService:
    def generate_jobs_plan(
        self,
        all_tags: list[dict],
        follower_ranges: list[dict],
        *,
        mode: str,
        max_first: int | None,
        limit: int,
        max_pages: int,
        sleep_ms: int,
        retry_max: int,
        retry_backoff_ms: int,
        sort_field: str,
        sort_type: int,
    ) -> dict:
        jobs: list[Job] = []
        first_count = 0
        for entry in all_tags:
            first = entry.get("first") or {}
            first_label = first.get("label")
            first_id = first.get("id")
            if not first_label or not first_id:
                continue
            first_count += 1
            if max_first is not None and first_count > max_first:
                break

            second_list = entry.get("second") or []
            has_second = len(second_list) > 0
            second_ids = [s.get("id") for s in second_list if s.get("id")]

            for fr in follower_ranges:
                base_job = Job(
                    first_label=first_label,
                    first_id=first_id,
                    mode=mode,
                    follower_ge=fr.get("ge"),
                    follower_lt=fr.get("lt"),
                    limit=limit,
                    max_pages=max_pages,
                    sleep_ms=sleep_ms,
                    retry_max=retry_max,
                    retry_backoff_ms=retry_backoff_ms,
                    sort_field=sort_field,
                    sort_type=sort_type,
                )
                if mode in ("combine_second", "popularity_first", "daily_increment"):
                    if has_second:
                        base_job.second_ids = second_ids
                        base_job.second_label = "合并二级"
                    else:
                        base_job.second_ids = []
                        base_job.second_label = "_first_only_"
                    jobs.append(base_job)
                elif mode == "second_split":
                    if has_second:
                        for s in second_list:
                            # 创建新的Job对象，避免参数重复
                            sj = Job(
                                first_label=base_job.first_label,
                                first_id=base_job.first_id,
                                second_id=s.get("id"),
                                second_label=s.get("label"),
                                mode=base_job.mode,
                                follower_ge=base_job.follower_ge,
                                follower_lt=base_job.follower_lt,
                                limit=base_job.limit,
                                max_pages=base_job.max_pages,
                                sleep_ms=base_job.sleep_ms,
                                retry_max=base_job.retry_max,
                                retry_backoff_ms=base_job.retry_backoff_ms,
                                sort_field=base_job.sort_field,
                                sort_type=base_job.sort_type,
                            )
                            jobs.append(sj)
                    else:
                        base_job.second_id = None
                        base_job.second_label = None
                        jobs.append(base_job)

        # 直接返回字典，不创建 Plan 对象
        # 将 Job 对象转换为字典格式，以便外部访问
        jobs_dict = []
        for job in jobs:
            job_dict = {
                "first_label": job.first_label,
                "first_id": job.first_id,
                "second_label": job.second_label,
                "second_id": job.second_id,
                "mode": job.mode,
                "follower_ge": job.follower_ge,
                "follower_lt": job.follower_lt,
                "limit": job.limit,
                "max_pages": job.max_pages,
                "sleep_ms": job.sleep_ms,
                "retry_max": job.retry_max,
                "retry_backoff_ms": job.retry_backoff_ms,
                "sort_field": job.sort_field,
                "sort_type": job.sort_type,
                "follower_min": job.follower_min,
                "follower_max": job.follower_max,
            }
            jobs_dict.append(job_dict)
        
        return {"jobs": jobs_dict, "metadata": {"mode": mode, "total_jobs": len(jobs_dict)}}


def create_plan_service() -> PlanService:
    """创建计划服务的工厂函数"""
    return PlanService()