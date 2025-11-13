#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
智能调度控制脚本（长任务专用）

目标：
- 枚举所有一级/二级标签与粉丝区间，生成任务计划并逐一执行；
- 在长时间运行中实现“智能暂停”（从几分钟到十几分钟到几十分钟到一两个小时）；
- 根据失败率/空页/作者产出等指标动态调整暂停等级；
- 断点续跑（跨进程重启后继续当前任务），写入状态文件与计划文件；
- 直接复用 `task_control/fetch_author_square_by_tags.py` 的分页抓取与错误处理能力。

使用示例：

python3 task_control/tools/smart_crawl_controller.py \
  --mode second_split \
  --auto-pages --auto-pages-upper-bound 100 \
  --resume --skip-existing \
  --cookies-file task_control/config/cookies.txt \
  --save-pg \
  --failure-rate-threshold 0.35 \
  --cooldown-429-403-ms 2000 \
  --work-cycle-mins 50 --fixed-pause-mins 10 \
  --pause-levels "3,12,30,60,120" \
  --jobs-plan-out task_control/reports/smart_jobs_plan.json \
  --state-file task_control/reports/smart_state.json

"""

import argparse
import json
import math
import os
import sys
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional

# 保证可作为独立脚本运行：将项目根目录加入 sys.path
_THIS_FILE = Path(__file__).resolve()
_PROJECT_ROOT = _THIS_FILE.parents[1]  # task_control目录
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))


# 复用现有抓取脚本能力
import fetch_author_square_by_tags as by_tags
try:
    from services.db_v2 import DatabaseServiceV2 as PgSaver
except ImportError:
    from services.db import PgSaver  # 可选入库
from services.rate_limiter import TimeWindowQPSLimiter
from services.adaptive_qps import AdaptiveQpsPolicy, AdaptiveQpsConfig

# 优先使用服务层实现
try:
    from services.adaptive_qps import (
        AdaptiveQpsPolicy as ServiceAdaptiveQpsPolicy,
        AdaptiveQpsConfig as ServiceAdaptiveQpsConfig,
        create_adaptive_qps_policy as service_create_adaptive_qps_policy,
        create_qps_config as service_create_qps_config
    )
    service_adaptive_qps_available = True
except ImportError:
    service_adaptive_qps_available = False
from tools.author_fetcher import AuthorFetcher
from services.data_saver import DataSaver

TASK_DIR = str(Path(__file__).resolve().parents[1])
CONFIG_DIR = os.path.join(TASK_DIR, "config")
RESULTS_DIR = os.path.join(TASK_DIR, "results")
REPORTS_DIR = os.path.join(TASK_DIR, "reports")


@dataclass
class Job:
    first_label: str
    first_id: Optional[int]
    second_label: Optional[str]
    second_id: Optional[int]
    follower_ge: Optional[int]
    follower_lt: Optional[int]


@dataclass
class JobResult:
    job_index: int
    pages_done: int
    authors_total: int
    failed_pages: int
    report_path: Optional[str]
    failed_report_path: Optional[str]
    started_at: str
    finished_at: str


@dataclass
class SmartState:
    current_index: int = 0
    pause_level: int = 0
    total_jobs: int = 0
    last_pause_at: Optional[str] = None
    jobs_history: List[Dict[str, Any]] = None


def _load_json(path: str) -> Any:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return None


def _save_json(path: str, obj: Any):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def load_follower_ranges(path: str) -> List[Dict[str, Optional[int]]]:
    arr = _load_json(path) or []
    ranges = []
    for item in arr:
        try:
            ranges.append(
                {
                    "ge": int(item.get("ge")) if item.get("ge") is not None else None,
                    "lt": int(item.get("lt")) if item.get("lt") is not None else None,
                }
            )
        except Exception:
            continue
    return ranges


def apply_mode_generate_jobs(
    all_tags: List[Dict[str, Any]],
    mode: str,
    follower_ranges: List[Dict[str, Optional[int]]],
    max_first: Optional[int] = None,
) -> List[Job]:
    jobs: List[Job] = []
    first_count = 0
    for entry in all_tags:
        first = entry.get("first") or {}
        first_label = first.get("label")
        first_id = first.get("id")
        second_list = entry.get("second") or []
        if max_first is not None and first_count >= int(max_first):
            break
        first_count += 1

        if mode == "all_first":
            # 仅按一级过滤（不区分二级），仍然遍历粉丝区间
            for fr in follower_ranges or [{}]:
                jobs.append(
                    Job(
                        first_label=first_label,
                        first_id=first_id,
                        second_label=None,
                        second_id=None,
                        follower_ge=fr.get("ge"),
                        follower_lt=fr.get("lt"),
                    )
                )
            continue

        if mode == "combine_second":
            # 合并模式：将一级下所有二级作为一个任务（仍逐粉丝区间）
            # 注意：具体 second_ids 在构建 payload 阶段处理
            for fr in follower_ranges or [{}]:
                jobs.append(
                    Job(
                        first_label=first_label,
                        first_id=first_id,
                        second_label="__COMBINED__",
                        second_id=None,
                        follower_ge=fr.get("ge"),
                        follower_lt=fr.get("lt"),
                    )
                )
            continue

        # 默认 second_split：每个二级标签单独任务，逐粉丝区间
        if second_list:
            for s in second_list:
                for fr in follower_ranges or [{}]:
                    jobs.append(
                        Job(
                            first_label=first_label,
                            first_id=first_id,
                            second_label=s.get("label"),
                            second_id=s.get("id"),
                            follower_ge=fr.get("ge"),
                            follower_lt=fr.get("lt"),
                        )
                    )
        else:
            for fr in follower_ranges or [{}]:
                jobs.append(
                    Job(
                        first_label=first_label,
                        first_id=first_id,
                        second_label=None,
                        second_id=None,
                        follower_ge=fr.get("ge"),
                        follower_lt=fr.get("lt"),
                    )
                )
    return jobs


class SmartPause:
    """暂停控制器：依据任务结果动态调整暂停等级并执行暂停。"""

    def __init__(
        self,
        pause_levels_minutes: List[int],
        fixed_pause_minutes: int,
        work_cycle_minutes: int,
        failure_rate_threshold: float,
        empty_job_escalate_n: int,
        success_deescalate_n: int,
        state_file: str,
    ):
        self.pause_levels_sec = [max(0, int(m)) * 60 for m in pause_levels_minutes]
        self.fixed_pause_sec = max(0, int(fixed_pause_minutes)) * 60
        self.work_cycle_sec = max(1, int(work_cycle_minutes)) * 60
        self.failure_rate_threshold = float(failure_rate_threshold)
        self.empty_job_escalate_n = int(empty_job_escalate_n)
        self.success_deescalate_n = int(success_deescalate_n)
        self.state_file = state_file
        self.state: SmartState = SmartState(
            current_index=0, pause_level=0, total_jobs=0, last_pause_at=None, jobs_history=[]
        )
        # 加载历史状态（若存在）
        st = _load_json(self.state_file)
        if isinstance(st, dict):
            try:
                self.state.current_index = int(st.get("current_index", 0))
                self.state.pause_level = int(st.get("pause_level", 0))
                self.state.total_jobs = int(st.get("total_jobs", 0))
                self.state.last_pause_at = st.get("last_pause_at")
                self.state.jobs_history = st.get("jobs_history") or []
            except Exception:
                pass

        self._cycle_start_ts = time.time()
        self._recent_successes = 0
        self._recent_empty_jobs = 0

    def _persist(self):
        payload = asdict(self.state)
        _save_json(self.state_file, payload)

    def record_job_result(self, jr: JobResult):
        # 记录到历史，用于后续趋势判断
        self.state.jobs_history.append(
            {
                "job_index": int(jr.job_index),
                "pages_done": int(jr.pages_done),
                "authors_total": int(jr.authors_total),
                "failed_pages": int(jr.failed_pages),
                "started_at": jr.started_at,
                "finished_at": jr.finished_at,
            }
        )
        # 成功/空产出统计
        if jr.pages_done > 0 and (jr.failed_pages / float(jr.pages_done)) < max(0.0, self.failure_rate_threshold):
            self._recent_successes += 1
            self._recent_empty_jobs = 0
        if jr.authors_total == 0:
            self._recent_empty_jobs += 1
            self._recent_successes = 0
        # 立即持久化
        self._persist()

    def maybe_pause_after_job(self, jr: JobResult):
        # 根据失败率/空页决定是否升级暂停等级
        escalate = False
        deescalate = False
        failure_rate = (jr.failed_pages / float(jr.pages_done)) if jr.pages_done > 0 else 1.0

        if jr.authors_total == 0 and self._recent_empty_jobs >= self.empty_job_escalate_n:
            escalate = True
        elif failure_rate >= self.failure_rate_threshold:
            escalate = True
        elif self._recent_successes >= self.success_deescalate_n and self.state.pause_level > 0:
            deescalate = True

        # 工作周期控制：到达周期时至少进行固定暂停
        now_ts = time.time()
        need_cycle_pause = (now_ts - self._cycle_start_ts) >= self.work_cycle_sec

        if escalate:
            self.state.pause_level = min(self.state.pause_level + 1, max(0, len(self.pause_levels_sec) - 1))
            self._recent_successes = 0
            self._recent_empty_jobs = 0
        elif deescalate:
            self.state.pause_level = max(0, self.state.pause_level - 1)
            self._recent_successes = 0
            self._recent_empty_jobs = 0

        pause_sec = 0
        # 先应用固定暂停（周期触发）
        if need_cycle_pause and self.fixed_pause_sec > 0:
            pause_sec += self.fixed_pause_sec
            self._cycle_start_ts = time.time()  # 重置周期

        # 再叠加等级暂停
        if self.state.pause_level >= 0 and self.state.pause_level < len(self.pause_levels_sec):
            pause_sec += self.pause_levels_sec[self.state.pause_level]

        # 执行暂停
        if pause_sec > 0:
            self.state.last_pause_at = datetime.now().isoformat()
            self._persist()
            print(
                f"[smart-pause] level={self.state.pause_level}，暂停 {pause_sec/60:.1f} 分钟（failure_rate={failure_rate:.2f}, empty_jobs={self._recent_empty_jobs}, successes={self._recent_successes}）"
            )
            time.sleep(pause_sec)


def _parse_end_by(end_by: str) -> float | None:
    s = (end_by or "").strip()
    if not s:
        return None
    try:
        parts = s.split(":")
        hh = int(parts[0])
        mm = int(parts[1]) if len(parts) > 1 else 0
    except Exception:
        return None
    now = datetime.now()
    target_today = now.replace(hour=hh, minute=mm, second=0, microsecond=0)
    if now >= target_today:
        # 明天的该时间
        target = target_today + timedelta(days=1)
    else:
        target = target_today
    return target.timestamp()


def build_payload_for_job(
    job: Job,
    args: argparse.Namespace,
    scene_overrides: Dict[str, Any],
) -> Dict[str, Any]:
    payload = by_tags.build_base_payload(
        page=args.page,
        limit=args.limit,
        min_price=args.min_price,
        video_type_rel_id=args.video_type,
        add_price_filter=args.use_price_filter,
        scene_overrides=scene_overrides,
        search_type=args.search_type,
        sort_field=args.sort_field,
        sort_type=args.sort_type,
    )
    # 标签过滤：合并或单个二级/仅一级
    if args.mode == "combine_second":
        # 在构造阶段查找该一级的全部二级 ID 列表
        all_tags = by_tags.load_content_tags(args.tags_file)
        entry = next((e for e in all_tags if (e.get("first") or {}).get("label") == job.first_label), None)
        second_ids = [s.get("id") for s in (entry.get("second") or []) if s.get("id")] if entry else []
        if second_ids:
            by_tags.add_combined_second_filter(payload, second_ids)
        else:
            by_tags.add_tag_filter(payload, first_id=job.first_id, second_id=None)
    else:
        by_tags.add_tag_filter(payload, first_id=job.first_id, second_id=job.second_id)

    # 粉丝区间
    by_tags.add_follower_filter(payload, ge=job.follower_ge, lt=job.follower_lt)

    # 地域过滤（可选）
    province_id_resolved = args.province_id
    city_id_resolved = args.city_id
    # 支持中文名映射
    if province_id_resolved is None and args.province_name:
        rc = by_tags.load_region_codes(args.region_codes_file) if os.path.exists(args.region_codes_file) else None
        if rc and rc.get("name_to_code"):
            province_id_resolved = rc["name_to_code"].get(args.province_name)
    if city_id_resolved is None and args.city_name:
        rc = by_tags.load_region_codes(args.region_codes_file) if os.path.exists(args.region_codes_file) else None
        cc = by_tags.load_city_codes(args.city_codes_file) if os.path.exists(args.city_codes_file) else None
        city_id_resolved = by_tags.resolve_city_id(
            args.city_name,
            province_name=args.province_name,
            province_id=province_id_resolved,
            region_codes=rc,
            city_codes=cc,
        )
    by_tags.add_region_filter(payload, province_id=province_id_resolved, city_id=city_id_resolved)

    # 额外过滤
    by_tags.add_extra_filters(payload, extras=args.extra_filter or [])

    # 覆盖 payload（若提供）
    if args.payload_override and os.path.exists(args.payload_override):
        try:
            override = _load_json(args.payload_override)
            if override:
                payload = by_tags.deep_merge(payload, override)
        except Exception as e:
            print(f"[warn] 读取 payload_override 失败: {e}")
    return payload


def generate_jobs_plan(tags_file: str, follower_ranges_file: str, mode: str, max_first: Optional[int]) -> List[Job]:
    all_tags = by_tags.load_content_tags(tags_file)
    follower_ranges = load_follower_ranges(follower_ranges_file)
    jobs = apply_mode_generate_jobs(all_tags, mode=mode, follower_ranges=follower_ranges, max_first=max_first)
    return jobs


def run_jobs_plan(jobs: List[Job], args: argparse.Namespace, pause_ctrl: SmartPause):
    cookie = by_tags.read_cookie_file(args.cookies_file)
    headers = by_tags.build_headers(
        cookie=cookie, star_id=args.star_id, user_agent=by_tags.DEFAULT_USER_AGENT, referer=by_tags.DEFAULT_REFERER
    )

    pg_saver = None
    # 默认入库PG，除非用户显式关闭（--no-pg）。若配置文件缺失则跳过。
    if (not getattr(args, "no_pg", False)) and (args.save_pg or os.path.exists(args.pg_config)):
        try:
            pg_saver = PgSaver(config_path=args.pg_config)
            pg_saver.connect()
            pg_saver.ensure_schema()
            print("[info] PostgreSQL 已就绪")
        except Exception as e:
            print(f"[error] PostgreSQL 初始化失败: {e}")
            sys.exit(3)
    else:
        if getattr(args, "no_pg", False):
            print("[info] 已禁用 PostgreSQL 入库 (--no-pg)")
        elif not os.path.exists(args.pg_config):
            print(f"[info] 找不到PG配置，入库跳过: {args.pg_config}")

    # scene/search/sort 覆盖
    scene_overrides = {
        "platform_source": args.platform_source,
        "search_scene": args.search_scene,
        "display_scene": args.display_scene,
        "marketing_target": args.marketing_target,
        "task_category": args.task_category,
        "first_industry_id": args.first_industry_id,
        "task_status": args.task_status,
    }

    # 状态初始化
    pause_ctrl.state.total_jobs = len(jobs)
    pause_ctrl._persist()

    # 计算退出截止时间（最长运行或到点退出，取更早者）
    deadline_ts = None
    if args.max_runtime_mins:
        try:
            deadline_ts = time.time() + int(args.max_runtime_mins) * 60
        except Exception:
            pass
    if args.end_by:
        t = _parse_end_by(args.end_by)
        if t is not None:
            deadline_ts = t if deadline_ts is None else min(deadline_ts, t)

    # 按索引续跑
    start_idx = max(0, int(pause_ctrl.state.current_index))
    total = len(jobs)
    print(f"[plan] 即将执行 {total} 个任务（从索引 {start_idx} 开始）")

    # 域级QPS与自适应策略（可选）
    current_qps: Optional[float] = None
    policy: Optional[AdaptiveQpsPolicy] = None
    try:
        if getattr(args, "domain_qps", None) is not None and int(args.domain_qps) > 0:
            current_qps = float(int(args.domain_qps))
            
            # 使用服务层实现或回退到原始实现
            if service_adaptive_qps_available:
                cfg = service_create_qps_config(
                    min_qps=max(1, int(getattr(args, "adaptive_qps_min", int(current_qps)) or int(current_qps))),
                    max_qps=max(1, int(getattr(args, "adaptive_qps_max", int(current_qps)) or int(current_qps))),
                    step=max(1, int(getattr(args, "adaptive_qps_step", 1) or 1)),
                    backoff_base=float(getattr(args, "adaptive_backoff_base", 0.7) or 0.7),
                    backoff_max_power=max(1, int(getattr(args, "adaptive_backoff_max_power", 3) or 3)),
                    success_needed=max(1, int(getattr(args, "adaptive_success_needed", 3) or 3)),
                    upgrade_cooldown_sec=max(0, int(getattr(args, "adaptive_upgrade_cooldown_sec", 300) or 300)),
                    failure_rate_threshold=float(getattr(args, "max_failure_rate", 0.2) or 0.2),
                )
                policy = service_create_adaptive_qps_policy(current_qps=current_qps, config=cfg)
            else:
                cfg = AdaptiveQpsConfig(
                    min_qps=max(1, int(getattr(args, "adaptive_qps_min", int(current_qps)) or int(current_qps))),
                    max_qps=max(1, int(getattr(args, "adaptive_qps_max", int(current_qps)) or int(current_qps))),
                    step=max(1, int(getattr(args, "adaptive_qps_step", 1) or 1)),
                    backoff_base=float(getattr(args, "adaptive_backoff_base", 0.7) or 0.7),
                    backoff_max_power=max(1, int(getattr(args, "adaptive_backoff_max_power", 3) or 3)),
                    success_needed=max(1, int(getattr(args, "adaptive_success_needed", 3) or 3)),
                    upgrade_cooldown_sec=max(0, int(getattr(args, "adaptive_upgrade_cooldown_sec", 300) or 300)),
                    failure_rate_threshold=float(getattr(args, "max_failure_rate", 0.2) or 0.2),
                )
                policy = AdaptiveQpsPolicy(current_qps=current_qps, config=cfg)
            print(f"[limiter] 初始域级QPS={int(current_qps)} / window={int(getattr(args, 'qps_window_ms', 1000))}ms")
    except Exception:
        current_qps = None
        policy = None

    # 初始化数据持久化器（文件/PG）
    data_saver = DataSaver(output_dir=args.output_dir, report_dir=REPORTS_DIR, pg_saver=pg_saver)

    # 依次执行任务
    for idx in range(start_idx, total):
        # 达到退出时间：优雅停止（不启动新任务）
        if deadline_ts is not None and time.time() >= deadline_ts:
            print("[deadline] 已到退出时间，优雅停止。state 保存于:", pause_ctrl.state_file)
            break
        job = jobs[idx]
        pause_ctrl.state.current_index = idx
        pause_ctrl._persist()

        print(
            f"[job] ({idx+1}/{total}) {job.first_label} / {job.second_label or '_first_only_'} ，follower=[{job.follower_ge},{job.follower_lt}] limit={args.limit} video_type={args.video_type}"
        )
        if args.dry_run:
            # 干跑：仅展示构造的 payload，不发请求
            payload = build_payload_for_job(job, args, scene_overrides)
            print("[dry-run] headers=", json.dumps(headers, ensure_ascii=False))
            print("[dry-run] payload=", json.dumps(payload, ensure_ascii=False))
            time.sleep(args.sleep_ms / 1000.0)
            # 干跑也进行周期暂停模拟
            jr = JobResult(
                job_index=idx,
                pages_done=0,
                authors_total=0,
                failed_pages=0,
                report_path=None,
                failed_report_path=None,
                started_at=datetime.now().isoformat(),
                finished_at=datetime.now().isoformat(),
            )
            pause_ctrl.record_job_result(jr)
            pause_ctrl.maybe_pause_after_job(jr)
            continue

        # 构造 payload
        payload = build_payload_for_job(job, args, scene_overrides)

        # 计算续跑页
        second_label_dir = job.second_label or "_first_only_"
        start_page = (
            (by_tags.get_last_success_page(args.output_dir, job.first_label, second_label_dir) or 0) + 1
            if args.resume
            else args.page
        )

        # 分页抓取（启用智能页数与错误处理参数）
        # 构建 limiter 与有效 sleep_ms
        limiter = None
        effective_sleep_ms = args.sleep_ms
        try:
            if current_qps is not None:
                qps_int = max(1, int(current_qps))
                limiter = TimeWindowQPSLimiter(qps=qps_int, window_ms=int(getattr(args, "qps_window_ms", 1000)))
                # 动态 sleep：保证单位时间的节奏稳定
                floor_ms = int(getattr(args, "sleep_ms_floor", 0) or 0)
                effective_sleep_ms = max(floor_ms, int(math.ceil(1000.0 / qps_int)))
        except Exception:
            limiter = None
            effective_sleep_ms = args.sleep_ms

        started_at = datetime.now()
        res = AuthorFetcher().run(
            headers=headers,
            base_payload=payload,
            start_page=start_page,
            max_pages=args.max_pages,
            output_dir=args.output_dir,
            first_label=job.first_label,
            second_label_for_save=(
                second_label_dir if args.mode != "combine_second" else (job.second_label or "合并二级")
            ),
            second_ids=[job.second_id] if job.second_id else [],
            video_type=args.video_type,
            limit=args.limit,
            min_price=args.min_price,
            stop_when_empty=args.stop_when_empty,
            sleep_ms=effective_sleep_ms,
            retry_max=args.retry_max,
            retry_backoff_ms=args.retry_backoff_ms,
            pg_saver=pg_saver,
            data_saver=data_saver,
            auto_pages=args.auto_pages,
            auto_pages_upper_bound=args.auto_pages_upper_bound,
            skip_existing=args.skip_existing,
            limiter=limiter,
            cooldown_on_429_403_ms=args.cooldown_429_403_ms,
            max_failure_rate=args.max_failure_rate,
            stop_when_empty_n=args.stop_when_empty_n,
            max_consecutive_401=args.max_consecutive_401,
            pause_on_401_ms=args.pause_on_401_ms,
            logger=None,
            use_internal_engine=getattr(args, "use_author_fetcher_engine", False),
        )
        finished_at = datetime.now()

        jr = JobResult(
            job_index=idx,
            pages_done=int(res.get("pages_done", 0)),
            authors_total=int(res.get("authors_total", 0)),
            failed_pages=int(res.get("failed_pages", 0)),
            report_path=res.get("report_path"),
            failed_report_path=res.get("failed_report_path"),
            started_at=started_at.isoformat(),
            finished_at=finished_at.isoformat(),
        )
        # 写入 Job 运行记录（JSONL）
        try:
            os.makedirs(REPORTS_DIR, exist_ok=True)
            line = json.dumps(asdict(jr), ensure_ascii=False)
            with open(os.path.join(REPORTS_DIR, "smart_jobs_runs.jsonl"), "a", encoding="utf-8") as f:
                f.write(line + "\n")
        except Exception:
            pass

        # 记录与智能暂停
        pause_ctrl.record_job_result(jr)
        pause_ctrl.maybe_pause_after_job(jr)

        # 自适应QPS：使用策略类进行调整
        try:
            if bool(getattr(args, "adaptive_qps", False)) and current_qps is not None and policy is not None:
                pages_done = max(1, int(res.get("pages_done", 0) or 0))
                failed_pages = int(res.get("failed_pages", 0) or 0)
                authors_total = int(res.get("authors_total", 0) or 0)
                current_qps = policy.adjust(pages_done=pages_done, failed_pages=failed_pages, authors_total=authors_total)
        except Exception as e:
            print(f"[adaptive-qps-warn] 自适应QPS调整失败：{e}")

    if pg_saver:
        try:
            pg_saver.close()
        except Exception:
            pass


def main():
    parser = argparse.ArgumentParser(description="智能调度控制脚本：全量标签/粉丝范围 + 智能暂停")
    # 基础抓取配置
    parser.add_argument("--cookies-file", default=os.path.join(CONFIG_DIR, "cookies.txt"))
    parser.add_argument("--tags-file", default=os.path.join(CONFIG_DIR, "content_tag_v2.json"))
    parser.add_argument("--follower-ranges-file", default=os.path.join(CONFIG_DIR, "follower_ranges.json"))
    parser.add_argument("--star-id", default="1843934177451019")
    parser.add_argument("--output-dir", default=os.path.join(RESULTS_DIR, "author_square_by_tag"))
    parser.add_argument("--page", type=int, default=1)
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--min-price", type=int, default=0)
    parser.add_argument("--video-type", type=str, default="2")
    parser.add_argument("--use-price-filter", action="store_true")
    parser.set_defaults(use_price_filter=True)
    parser.add_argument(
        "--sort-field", type=str, default="score", choices=["score", "follower", "vv_median_30d", "star_index"]
    )
    parser.add_argument("--sort-type", type=int, default=2)
    parser.add_argument("--search-type", type=int, default=2)

    # 模式：二级合并/二级拆分/仅一级
    parser.add_argument(
        "--mode", type=str, default="second_split", choices=["second_split", "combine_second", "all_first"]
    )
    parser.add_argument("--max-first", type=int, help="最多处理的一级标签数量（可选，用于验证）")

    # 粉丝/地域过滤
    parser.add_argument("--province-id", type=int)
    parser.add_argument("--city-id", type=int)
    parser.add_argument("--province-name", type=str)
    parser.add_argument("--city-name", type=str)
    parser.add_argument("--region-codes-file", default=os.path.join(CONFIG_DIR, "region_codes.json"))
    parser.add_argument("--city-codes-file", default=os.path.join(CONFIG_DIR, "city_codes.json"))
    parser.add_argument("--extra-filter", action="append")

    # 分页与稳定性
    parser.add_argument("--max-pages", type=int, default=500)
    parser.add_argument("--sleep-ms", type=int, default=500)
    parser.add_argument("--sleep-ms-floor", type=int, default=250, help="动态sleep的地板值（与QPS联动），默认250ms")
    parser.add_argument("--retry-max", type=int, default=3)
    parser.add_argument("--retry-backoff-ms", type=int, default=1000)
    parser.add_argument("--stop-when-empty", action="store_true")
    parser.add_argument("--auto-pages", action="store_true")
    parser.add_argument("--auto-pages-upper-bound", type=int)
    parser.add_argument("--skip-existing", action="store_true")
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--cooldown-429-403-ms", type=int, default=2000)
    parser.add_argument("--max-failure-rate", type=float, help="达到该失败率提前停止当前任务")
    parser.add_argument("--stop-when-empty-n", type=int, help="连续空页 N 次停止")
    parser.add_argument("--max-consecutive-401", type=int, default=3)
    parser.add_argument("--pause-on-401-ms", type=int, default=10 * 60 * 1000)
    # 可选：启用 AuthorFetcher 内部执行引擎（默认关闭，保持兼容）
    parser.add_argument(
        "--use-author-fetcher-engine",
        action="store_true",
        help="启用 AuthorFetcher 的内部执行引擎以验证迁移（默认关闭）",
    )

    # 域级QPS与自适应（可选）
    parser.add_argument("--domain-qps", type=int, help="域级QPS（>0 启用限速器）")
    parser.add_argument("--qps-window-ms", type=int, default=1000, help="QPS时间窗毫秒")
    parser.add_argument("--adaptive-qps", action="store_true", help="根据失败率/产出自适应调整QPS")
    parser.add_argument("--adaptive-qps-min", type=int, default=1, help="自适应QPS最小值")
    parser.add_argument("--adaptive-qps-max", type=int, default=2, help="自适应QPS最大值")
    parser.add_argument("--adaptive-qps-step", type=int, default=1, help="自适应QPS步长（整数）")
    parser.add_argument("--adaptive-success-needed", type=int, default=3, help="连续成功任务数达到后允许升级QPS")
    parser.add_argument(
        "--adaptive-upgrade-cooldown-sec", type=int, default=300, help="每次升级之间的最短冷却秒数，防止过快增速"
    )
    parser.add_argument(
        "--adaptive-backoff-base", type=float, default=0.7, help="失败降级时的指数退避基数（0.4~0.9，越小降级越快）"
    )
    parser.add_argument(
        "--adaptive-backoff-max-power", type=int, default=3, help="指数退避的最大幂指数，限制单次降级幅度"
    )

    # 到点退出 / 最长运行
    parser.add_argument("--max-runtime-mins", type=int, help="最长运行分钟数，达到后自动退出")
    parser.add_argument("--end-by", type=str, help="到点退出的本地时间，格式 HH:MM，例如 08:00")

    # 运行-暂停策略
    parser.add_argument("--work-cycle-mins", type=int, default=50, help="每个工作周期长度（分钟）")
    parser.add_argument("--fixed-pause-mins", type=int, default=10, help="每个周期结束后的固定暂停（分钟）")
    parser.add_argument("--pause-levels", type=str, default="3,12,30,60,120", help="分级暂停分钟数，逗号分隔，从低到高")
    parser.add_argument("--failure-rate-threshold", type=float, default=0.35)
    parser.add_argument("--empty-job-escalate-n", type=int, default=2, help="连续空产出任务数达到该阈值则升级暂停")
    parser.add_argument("--success-deescalate-n", type=int, default=3, help="连续成功任务数达到该阈值则降级暂停")

    # 入库与文件
    parser.add_argument("--save-pg", action="store_true")
    parser.add_argument("--no-pg", action="store_true", help="禁用PostgreSQL入库（默认开启）")
    parser.add_argument("--pg-config", default=os.path.join(CONFIG_DIR, "postgres.json"))
    parser.add_argument("--payload-override")
    parser.add_argument("--jobs-plan-out", default=os.path.join(REPORTS_DIR, "smart_jobs_plan.json"))
    parser.add_argument("--state-file", default=os.path.join(REPORTS_DIR, "smart_state.json"))

    # 干跑/仅生成计划
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--generate-only", action="store_true")

    # scene 覆盖
    parser.add_argument("--platform-source", type=int, default=1)
    parser.add_argument("--search-scene", type=int, default=1)
    parser.add_argument("--display-scene", type=int, default=1)
    parser.add_argument("--marketing-target", type=int, default=1)
    parser.add_argument("--task-category", type=int, default=1)
    parser.add_argument("--first-industry-id", type=int, default=0)
    parser.add_argument("--task-status", type=int, default=3)

    args = parser.parse_args()

    # 生成任务计划
    jobs = generate_jobs_plan(args.tags_file, args.follower_ranges_file, args.mode, args.max_first)
    _save_json(args.jobs_plan_out, [asdict(j) for j in jobs])
    print(f"[plan] 任务计划生成：{len(jobs)} 项 -> {args.jobs_plan_out}")
    if args.generate_only:
        print("[exit] --generate-only 已完成计划生成，不执行")
        sys.exit(0)

    # 智能暂停控制器
    try:
        pause_levels = [int(x.strip()) for x in (args.pause_levels or "").split(",") if x.strip()]
    except Exception:
        pause_levels = [3, 12, 30, 60, 120]
    pause_ctrl = SmartPause(
        pause_levels_minutes=pause_levels,
        fixed_pause_minutes=args.fixed_pause_mins,
        work_cycle_minutes=args.work_cycle_mins,
        failure_rate_threshold=args.failure_rate_threshold,
        empty_job_escalate_n=args.empty_job_escalate_n,
        success_deescalate_n=args.success_deescalate_n,
        state_file=args.state_file,
    )

    # 执行任务计划
    run_jobs_plan(jobs, args, pause_ctrl)


if __name__ == "__main__":
    main()
