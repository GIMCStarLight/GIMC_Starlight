import argparse
import json
import os
import random
import re
import sys
import time
from collections import deque
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path

# 保证可从 tools/ 导入上级目录的脚本模块
HERE = Path(__file__).resolve().parent
TASK_CONTROL_DIR = HERE.parent
if str(TASK_CONTROL_DIR) not in sys.path:
    sys.path.insert(0, str(TASK_CONTROL_DIR))

from fetch_author_square_by_tags import (
    CITY_CODES_DEFAULT_PATH,
    CONFIG_DIR,
    DEFAULT_REFERER,
    DEFAULT_USER_AGENT,
    REGION_CODES_DEFAULT_PATH,
    REPORTS_DIR,
    RESULTS_DIR,
    PgSaver,
    add_combined_second_filter,
    add_extra_filters,
    add_follower_filter,
    add_region_filter,
    add_tag_filter,
    build_base_payload,
    build_headers,
    fetch_pages,
    load_city_codes,
    load_content_tags,
    load_region_codes,
    read_cookie_file,
    resolve_city_id,
    sanitize_label,
)

# 统一配置：.env 加载与 argparse 默认值注入
try:
    from config.config import apply_argparse_defaults, load_env
except Exception:
    load_env = lambda: None
    apply_argparse_defaults = lambda parser: {}

# 结构化日志与指标（可选）
try:
    from services.logging_utils import get_json_logger, log_event
except Exception:
    get_json_logger = None
    log_event = None
try:
    from services.metrics import init_metrics_server
except Exception:
    init_metrics_server = None

# DataSaver（可选）：统一保存报表与PG写入
try:
    from services.data_saver import DataSaver
except Exception:
    DataSaver = None


# 域级QPS限速器（窗口内最多N次）：线程安全
# TimeWindowQPSLimiter 已迁移到 services.rate_limiter
# 保持向后兼容的导入
try:
    from services.rate_limiter import TimeWindowQPSLimiter
except ImportError:
    # 回退到本地实现（临时兼容）
    class TimeWindowQPSLimiter:
        def __init__(self, qps: int, window_ms: int = 1000):
            self.qps = max(1, int(qps))
            self.window_ms = max(1, int(window_ms))
            self._lock = __import__("threading").Lock()
            self._times = deque()

        def acquire(self):
            import time
            # 使用循环避免递归导致的栈溢出
            while True:
                now = int(time.time() * 1000)
                with self._lock:
                    # 清理窗口外的时间戳
                    cutoff = now - self.window_ms
                    while self._times and self._times[0] < cutoff:
                        self._times.popleft()
                    if len(self._times) < self.qps:
                        self._times.append(now)
                        return
                    # 需要等待到最早时间戳移出窗口
                    wait_ms = self._times[0] + self.window_ms - now
                if wait_ms > 0:
                    time.sleep(wait_ms / 1000.0)
                else:
                    # 极端情况下（四舍五入为0ms），让出CPU避免忙循环
                    time.sleep(0.001)


def _parse_time_window(s: str):
    """解析 "HH:MM-HH:MM" -> (start_minutes, end_minutes)。支持跨日窗口。"""
    try:
        m = re.match(r"^(\d{2}):(\d{2})-(\d{2}):(\d{2})$", s.strip())
        if not m:
            return None
        sh, sm, eh, em = map(int, m.groups())
        start = sh * 60 + sm
        end = eh * 60 + em
        return (start, end)
    except Exception:
        return None


def _is_in_window(win):
    if not win:
        return True
    import time

    lt = time.localtime()
    cur = lt.tm_hour * 60 + lt.tm_min
    s, e = win
    if s <= e:
        return s <= cur < e
    # 跨日：例如 22:00-02:00
    return cur >= s or cur < e


def _sleep_until_window(win):
    if not win:
        return
    import time

    while not _is_in_window(win):
        time.sleep(30)  # 30s 检查一次


def _load_failed_pages(first_label: str, second_label: str, reports_dir: str):
    try:
        import glob

        fpat = os.path.join(
            reports_dir,
            f"failed_pages_{sanitize_label(first_label)}_{sanitize_label(second_label) if second_label else '_first_only_'}_*.json",
        )
        files = sorted(glob.glob(fpat), key=lambda fp: os.path.getmtime(fp), reverse=True)
        if not files:
            return []
        fp = files[0]
        with open(fp, "r", encoding="utf-8") as f:
            obj = json.load(f)
        pages = [int(d.get("page")) for d in (obj.get("failed_pages") or []) if d.get("page") is not None]
        return sorted(set(pages))
    except Exception:
        return []


# 辅助：判断某页是否已有成功文件与获取最后成功页
def _page_dir(base_dir: str, first_label: str, second_label: str) -> str:
    d1 = sanitize_label(first_label) if first_label else "_no_first_"
    d2 = sanitize_label(second_label) if second_label else "_first_only_"
    return os.path.join(base_dir, d1, d2)


def page_has_success_file(base_dir: str, first_label: str, second_label: str, page: int) -> bool:
    target_dir = _page_dir(base_dir, first_label, second_label)
    if not os.path.exists(target_dir):
        return False
    prefix = f"author_square_page_{int(page)}_"
    try:
        for f in os.listdir(target_dir):
            if f.startswith(prefix) and f.endswith(".json"):
                fp = os.path.join(target_dir, f)
                try:
                    with open(fp, "r", encoding="utf-8") as fh:
                        obj = json.load(fh)
                    if (obj or {}).get("status_code") == 0:
                        return True
                    authors = (obj or {}).get("authors", []) or []
                    if len(authors) > 0:
                        return True
                except Exception:
                    continue
    except Exception:
        return False
    return False


def get_last_success_page(base_dir: str, first_label: str, second_label: str):
    target_dir = _page_dir(base_dir, first_label, second_label)
    if not os.path.exists(target_dir):
        return None
    last = None
    try:
        for f in os.listdir(target_dir):
            m = re.match(r"^author_square_page_(\d+)_", f)
            if not m:
                continue
            p = int(m.group(1))
            if page_has_success_file(base_dir, first_label, second_label, p):
                if last is None or p > last:
                    last = p
    except Exception:
        pass
    return last


def load_follower_ranges(path: str) -> list[dict]:
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        ranges = []
        for r in data:
            ge = r.get("ge")
            lt = r.get("lt")
            ranges.append({"ge": ge, "lt": lt})
        return ranges
    except Exception:
        return []


def apply_mode_presets(args: argparse.Namespace) -> dict:
    """
    根据模式为未显式覆盖的参数应用推荐预设。
    仅当参数仍等于解析器默认值时才应用预设，避免覆盖用户显式传入。
    返回字典：limit、max_pages、sleep_ms、retry_max、retry_backoff_ms、sort_field、sort_type。
    """
    # 解析器默认值（需与 ArgumentParser 保持同步）
    DEFAULTS = {
        "limit": 20,
        "max_pages": 30,
        "sleep_ms": 500,
        "retry_max": 3,
        "retry_backoff_ms": 1000,
        "sort_field": "score",
        "sort_type": 2,
    }

    # 从当前 args 获取值
    params = {
        "limit": args.limit,
        "max_pages": args.max_pages,
        "sleep_ms": args.sleep_ms,
        "retry_max": args.retry_max,
        "retry_backoff_ms": args.retry_backoff_ms,
        "sort_field": args.sort_field,
        "sort_type": args.sort_type,
    }

    mode = args.mode
    # combine_second：沿用默认推荐，无需变更
    if mode == "second_split":
        # 深挖模式推荐更大页数
        if params["max_pages"] == DEFAULTS["max_pages"]:
            params["max_pages"] = 50
    elif mode == "daily_increment":
        # 日更模式建议小页数
        if params["max_pages"] == DEFAULTS["max_pages"] or params["max_pages"] > 5:
            params["max_pages"] = 5
    elif mode == "popularity_first":
        # 热度优先：排序按粉丝数降序
        if params["sort_field"] == DEFAULTS["sort_field"]:
            params["sort_field"] = "follower"
        if params["sort_type"] == DEFAULTS["sort_type"]:
            params["sort_type"] = 2

    return params


def generate_jobs_plan(
    all_tags: list,
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
    """生成任务计划 - 委托给 usecases.plan_service"""
    try:
        from usecases.plan_service import PlanService
        plan_service = PlanService()
        return plan_service.generate_jobs_plan(
            all_tags=all_tags,
            follower_ranges=follower_ranges,
            mode=mode,
            max_first=max_first,
            limit=limit,
            max_pages=max_pages,
            sleep_ms=sleep_ms,
            retry_max=retry_max,
            retry_backoff_ms=retry_backoff_ms,
            sort_field=sort_field,
            sort_type=sort_type,
        )
    except ImportError:
        # 回退到原始实现
        return _generate_jobs_plan_legacy(
            all_tags, follower_ranges,
            mode=mode, max_first=max_first, limit=limit,
            max_pages=max_pages, sleep_ms=sleep_ms,
            retry_max=retry_max, retry_backoff_ms=retry_backoff_ms,
            sort_field=sort_field, sort_type=sort_type
        )


def _generate_jobs_plan_legacy(
    all_tags: list,
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
    # 原始实现作为回退
    jobs = []
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
            job = {
                "first_label": first_label,
                "first_id": first_id,
                "mode": mode,
                "follower_ge": fr.get("ge"),
                "follower_lt": fr.get("lt"),
                "limit": limit,
                "max_pages": max_pages,
                "sleep_ms": sleep_ms,
                "retry_max": retry_max,
                "retry_backoff_ms": retry_backoff_ms,
                "sort_field": sort_field,
                "sort_type": sort_type,
            }
            if mode in ("combine_second", "popularity_first", "daily_increment"):
                if has_second:
                    job["second_ids"] = second_ids
                    job["second_label"] = "合并二级"
                else:
                    job["second_ids"] = []
                    job["second_label"] = "_first_only_"
                jobs.append(job)
            elif mode == "second_split":
                if has_second:
                    for s in second_list:
                        sj = job.copy()
                        sj["second_id"] = s.get("id")
                        sj["second_label"] = s.get("label")
                        jobs.append(sj)
                else:
                    job["second_id"] = None
                    job["second_label"] = None
                    jobs.append(job)

    return {
        "generated_at": datetime.now().isoformat(),
        "mode": mode,
        "jobs": jobs,
    }


def run_jobs_plan(
    plan: dict,
    *,
    cookie_file: str,
    star_id: str,
    output_dir: str,
    video_type: str,
    min_price: int,
    search_type: int,
    sort_field: str,
    sort_type: int,
    province_id: int | None,
    city_id: int | None,
    extra_filters: list[str] | None,
    save_pg: bool,
    pg_config: str,
    auto_pages: bool = False,
    auto_pages_upper_bound: int | None = None,
    resume: bool = False,
    skip_existing: bool = False,
    concurrency: int = 1,
    domain_qps: int | None = None,
    qps_window_ms: int = 1000,
    time_window: str | None = None,
    rerun_failed: bool = False,
    cooldown_429_403_ms: int | None = None,
    max_failure_rate: float | None = None,
    stop_when_empty_n: int | None = None,
    max_consecutive_401: int | None = None,
    pause_on_401_ms: int | None = None,
):
    """执行任务计划，优先使用 usecases 层的任务执行服务"""
    try:
        from usecases.task_execution_service import (
            create_task_execution_service,
            TaskExecutionConfig,
        )

        # 从计划中获取分页与稳定性默认参数（若存在）
        jobs = plan.get("jobs", []) or []
        first_job = jobs[0] if jobs else {}
        limit = int(first_job.get("limit") or 10)
        max_pages_val = int(first_job.get("max_pages") or 1)
        sleep_ms_val = int(first_job.get("sleep_ms") or 500)
        retry_max_val = int(first_job.get("retry_max") or 3)
        retry_backoff_ms_val = int(first_job.get("retry_backoff_ms") or 1000)

        # 构造任务执行配置
        config = TaskExecutionConfig(
            output_dir=output_dir,
            cookie_file=cookie_file,
            star_id=star_id,
            video_type=video_type,
            min_price=min_price,
            search_type=search_type,
            sort_field=sort_field,
            sort_type=sort_type,
            limit=limit,
            max_pages=max_pages_val,
            sleep_ms=sleep_ms_val,
            retry_max=retry_max_val,
            retry_backoff_ms=retry_backoff_ms_val,
            province_id=province_id,
            city_id=city_id,
            extra_filters=extra_filters,
            auto_pages=auto_pages,
            auto_pages_upper_bound=auto_pages_upper_bound,
            resume=resume,
            skip_existing=skip_existing,
            dry_run=False,
            domain_qps=domain_qps,
            qps_window_ms=qps_window_ms,
            sleep_ms_floor=250,
            adaptive_qps=False,
            cooldown_429_403_ms=int(cooldown_429_403_ms) if cooldown_429_403_ms is not None else 2000,
            max_failure_rate=max_failure_rate,
            stop_when_empty_n=stop_when_empty_n,
            max_consecutive_401=int(max_consecutive_401) if max_consecutive_401 is not None else 3,
            pause_on_401_ms=int(pause_on_401_ms) if pause_on_401_ms is not None else 600000,
            save_pg=save_pg,
            pg_config=pg_config,
        )

        # 使用 usecases 层的任务执行服务
        service = create_task_execution_service(config)
        return service.execute_jobs_plan(plan)
    except ImportError:
        # 回退到本地实现
        return _run_jobs_plan_legacy(
            plan=plan,
            cookie_file=cookie_file,
            star_id=star_id,
            output_dir=output_dir,
            video_type=video_type,
            min_price=min_price,
            search_type=search_type,
            sort_field=sort_field,
            sort_type=sort_type,
            province_id=province_id,
            city_id=city_id,
            extra_filters=extra_filters,
            save_pg=save_pg,
            pg_config=pg_config,
            auto_pages=auto_pages,
            auto_pages_upper_bound=auto_pages_upper_bound,
            resume=resume,
            skip_existing=skip_existing,
            concurrency=concurrency,
            domain_qps=domain_qps,
            qps_window_ms=qps_window_ms,
            time_window=time_window,
            rerun_failed=rerun_failed,
            cooldown_429_403_ms=cooldown_429_403_ms,
            max_failure_rate=max_failure_rate,
            stop_when_empty_n=stop_when_empty_n,
            max_consecutive_401=max_consecutive_401,
            pause_on_401_ms=pause_on_401_ms,
        )


def _run_jobs_plan_legacy(
    plan: dict,
    *,
    cookie_file: str,
    star_id: str,
    output_dir: str,
    video_type: str,
    min_price: int,
    search_type: int,
    sort_field: str,
    sort_type: int,
    province_id: int | None,
    city_id: int | None,
    extra_filters: list[str] | None,
    save_pg: bool,
    pg_config: str,
    auto_pages: bool = False,
    auto_pages_upper_bound: int | None = None,
    resume: bool = False,
    skip_existing: bool = False,
    concurrency: int = 1,
    domain_qps: int | None = None,
    qps_window_ms: int = 1000,
    time_window: str | None = None,
    rerun_failed: bool = False,
    cooldown_429_403_ms: int | None = None,
    max_failure_rate: float | None = None,
    stop_when_empty_n: int | None = None,
    max_consecutive_401: int | None = None,
    pause_on_401_ms: int | None = None,
):
    cookie = read_cookie_file(cookie_file)
    headers = build_headers(cookie=cookie, star_id=star_id, user_agent=DEFAULT_USER_AGENT, referer=DEFAULT_REFERER)

    limiter = None
    if domain_qps and int(domain_qps) > 0:
        limiter = TimeWindowQPSLimiter(qps=int(domain_qps), window_ms=int(qps_window_ms))
        print(f"[limiter] 域级QPS={domain_qps}/window={qps_window_ms}ms")

    # PG 连接策略：并发>1 时每任务独立连接；单线程复用一连接
    shared_pg = None
    if concurrency <= 1 and (save_pg or os.path.exists(pg_config)):
        if PgSaver is None:
            print("[error] 未找到 PgSaver 模块，请检查 pg_store.py")
            sys.exit(3)
        try:
            shared_pg = PgSaver(config_path=pg_config)
            shared_pg.connect()
            shared_pg.ensure_schema()
            print("[info] PostgreSQL 连接成功，表结构已就绪")
        except Exception as e:
            print(f"[error] PostgreSQL 连接/建表失败: {e}")
            sys.exit(3)

    jobs = plan.get("jobs") or []
    total = len(jobs)
    print(f"[scheduler] 将执行 {total} 个任务（mode={plan.get('mode')}） 并发={concurrency}")
    logger = get_json_logger("task_scheduler") if get_json_logger else None

    win = _parse_time_window(time_window) if time_window else None

    def run_one(job):
        # 时间窗口控制（每个任务开跑前确认）
        _sleep_until_window(win)
        # 构造基础 payload
        payload = build_base_payload(
            page=1,
            limit=int(job.get("limit", 20)),
            min_price=int(min_price),
            video_type_rel_id=video_type,
            add_price_filter=True,
            scene_overrides={
                "platform_source": 1,
                "search_scene": 1,
                "display_scene": 1,
                "marketing_target": 1,
                "task_category": 1,
                "first_industry_id": 0,
                "task_status": 3,
            },
            search_type=search_type,
            sort_field=job.get("sort_field", sort_field),
            sort_type=int(job.get("sort_type", sort_type)),
        )

        # 标签过滤
        second_ids = job.get("second_ids")
        second_id = job.get("second_id")
        if second_ids is not None:
            if len(second_ids) > 0:
                add_combined_second_filter(payload, second_ids)
                second_label_for_save = "合并二级"
            else:
                add_tag_filter(payload, first_id=job.get("first_id"), second_id=None)
                second_label_for_save = "_first_only_"
        else:
            add_tag_filter(payload, first_id=job.get("first_id"), second_id=second_id)
            second_label_for_save = job.get("second_label") or "_first_only_"

        # 粉丝过滤
        add_follower_filter(payload, ge=job.get("follower_ge"), lt=job.get("follower_lt"))
        # 地域过滤
        add_region_filter(payload, province_id=province_id, city_id=city_id)
        # 额外过滤
        add_extra_filters(payload, extras=extra_filters or [])

        # 续跑
        start_page_eff = 1
        if resume:
            try:
                last_p = get_last_success_page(output_dir, job.get("first_label"), second_label_for_save)
                if last_p is not None:
                    start_page_eff = int(last_p) + 1
                    print(
                        f"[resume] {job.get('first_label')} / {second_label_for_save} 续跑，从 page={start_page_eff} 开始（last_success={last_p}）"
                    )
            except Exception as e:
                print(f"[resume-warn] 计算续跑起始页失败: {e}")

        # 失败页重跑：读取最近报表
        only_pages = None
        if rerun_failed:
            try:
                only_pages = _load_failed_pages(job.get("first_label"), second_label_for_save, REPORTS_DIR)
                if only_pages:
                    print(f"[rerun-failed] 发现最近失败页报表：{only_pages}")
            except Exception as e:
                print(f"[rerun-failed-warn] 读取失败页报表异常: {e}")

        # PG 连接（并发场景下每任务独立）
        local_pg = shared_pg
        if concurrency > 1 and (save_pg or os.path.exists(pg_config)):
            try:
                local_pg = PgSaver(config_path=pg_config)
                local_pg.connect()
            except Exception as e:
                print(f"[pg-warn] 建立任务内 PG 连接失败：{e}")
                local_pg = None

        # DataSaver 初始化（每任务一个，绑定本任务 PG 连接）
        data_saver_obj = None
        if DataSaver is not None:
            try:
                data_saver_obj = DataSaver(
                    output_dir=output_dir,
                    report_dir=REPORTS_DIR,
                    pg_saver=local_pg,
                )
            except Exception as _e:
                print(f"[warn] DataSaver 初始化失败: {_e}")
                data_saver_obj = None

        # 执行
        try:
            summary = fetch_pages(
                headers=headers,
                base_payload=payload,
                start_page=start_page_eff,
                max_pages=int(job.get("max_pages", 30)),
                output_dir=output_dir,
                first_label=job.get("first_label"),
                second_label_for_save=second_label_for_save,
                second_ids=second_ids if second_ids is not None else ([second_id] if second_id else []),
                video_type=video_type,
                limit=int(job.get("limit", 20)),
                min_price=int(min_price),
                stop_when_empty=True,
                sleep_ms=int(job.get("sleep_ms", 500)),
                retry_max=int(job.get("retry_max", 3)),
                retry_backoff_ms=int(job.get("retry_backoff_ms", 1000)),
                auto_pages=auto_pages,
                auto_pages_upper_bound=auto_pages_upper_bound,
                pg_saver=local_pg,
                skip_existing=skip_existing,
                only_pages=only_pages,
                limiter=limiter,
                cooldown_on_429_403_ms=cooldown_429_403_ms,
                max_failure_rate=max_failure_rate,
                stop_when_empty_n=stop_when_empty_n,
                max_consecutive_401=max_consecutive_401,
                pause_on_401_ms=pause_on_401_ms,
                data_saver=data_saver_obj,
            )
            if logger and log_event:
                try:
                    log_event(
                        logger,
                        "info",
                        "job_summary",
                        first_label=job.get("first_label"),
                        second_label=second_label_for_save,
                        pages_done=int(summary.get("pages_done", 0)),
                        failed_pages=int(summary.get("failed_pages", 0)),
                    )
                except Exception:
                    pass
        except Exception as e:
            print(f"[job-error] 运行失败: {e}")
            return {"error": str(e), "job": job}
        finally:
            if concurrency > 1 and local_pg:
                try:
                    local_pg.close()
                except Exception:
                    pass

        # 任务间节流（固定休眠 + 抖动）
        base_ms = int(job.get("sleep_ms", 500))
        jitter_ms = int(base_ms * 0.3 * random.random())
        time.sleep((base_ms + jitter_ms) / 1000.0)
        return summary

    results = []
    if concurrency <= 1:
        for idx, job in enumerate(jobs, start=1):
            print(
                f"[job] ({idx}/{total}) first='{job.get('first_label')}', second='{job.get('second_label')}', fr=[{job.get('follower_ge')},{job.get('follower_lt')}] max_pages={job.get('max_pages')}"
            )
            results.append(run_one(job))
    else:
        with ThreadPoolExecutor(max_workers=int(concurrency)) as ex:
            futs = []
            for idx, job in enumerate(jobs, start=1):
                print(
                    f"[job-submit] ({idx}/{total}) first='{job.get('first_label')}', second='{job.get('second_label')}', fr=[{job.get('follower_ge')},{job.get('follower_lt')}] max_pages={job.get('max_pages')}"
                )
                futs.append(ex.submit(run_one, job))
            for fut in as_completed(futs):
                try:
                    results.append(fut.result())
                except Exception as e:
                    print(f"[job-error] 并发任务异常: {e}")
                    results.append({"error": str(e)})

    # 失败任务汇总
    failed_jobs = []
    for job, res in zip(jobs, results):
        if isinstance(res, dict) and res.get("error"):
            failed_jobs.append(job)
        elif isinstance(res, dict) and int(res.get("failed_pages", 0)) > 0:
            failed_jobs.append(job)

    if failed_jobs:
        failed_path = os.path.join(REPORTS_DIR, "failed_jobs.json")
        try:
            with open(failed_path, "w", encoding="utf-8") as f:
                json.dump(
                    {"failed_jobs": failed_jobs, "saved_at": datetime.now().isoformat()},
                    f,
                    ensure_ascii=False,
                    indent=2,
                )
            print(f"[scheduler] 失败任务已写入: {failed_path} (count={len(failed_jobs)})")
        except Exception as e:
            print(f"[warn] 写入失败任务文件失败: {e}")

    if shared_pg:
        shared_pg.close()

    # 统一作业运行摘要：写入 reports/smart_jobs_runs.jsonl
    try:
        smart_runs_path = os.path.join(REPORTS_DIR, "smart_jobs_runs.jsonl")
        with open(smart_runs_path, "a", encoding="utf-8") as f:
            for job, summary in zip(jobs, results):
                out = {
                    "job": job,
                    "summary": summary,
                    "saved_at": datetime.now().isoformat(timespec="seconds"),
                }
                f.write(json.dumps(out, ensure_ascii=False) + "\n")
        print(f"[scheduler] 运行摘要追加: {smart_runs_path}")
    except Exception as e:
        print(f"[warn] 写入 smart_jobs_runs.jsonl 失败: {e}")
    return results


def main():
    parser = argparse.ArgumentParser(description="任务矩阵生成与调度执行")
    parser.add_argument(
        "--mode",
        choices=["combine_second", "second_split", "daily_increment", "popularity_first"],
        default="combine_second",
    )
    parser.add_argument("--tags-file", default=os.path.join(CONFIG_DIR, "content_tag_v2.json"))
    parser.add_argument("--follower-ranges-file", default=os.path.join(CONFIG_DIR, "follower_ranges.json"))
    parser.add_argument("--max-first", type=int, help="最多处理的一级标签数量")
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--max-pages", type=int, default=30)
    parser.add_argument("--sleep-ms", type=int, default=500)
    parser.add_argument("--retry-max", type=int, default=3)
    parser.add_argument("--retry-backoff-ms", type=int, default=1000)
    parser.add_argument("--sort-field", type=str, default="score")
    parser.add_argument("--sort-type", type=int, default=2)
    # 智能页数：根据首次响应 pagination.total_count/limit 自动计算并覆盖 max_pages
    parser.add_argument("--auto-pages", action="store_true", help="根据首次响应 total_count/limit 自动计算抓取页数")
    parser.add_argument("--auto-pages-upper-bound", type=int, help="智能页数上限（可选；未设置则受 --max-pages 约束）")
    parser.add_argument("--resume", action="store_true", help="续跑：从最后成功页+1开始")
    parser.add_argument("--skip-existing", action="store_true", help="跳过已存在成功文件的页")
    parser.add_argument("--generate-only", action="store_true", help="仅生成计划，不执行")
    parser.add_argument("--jobs-plan-out", help="指定计划输出路径，默认 'reports/jobs_plan.json'")
    # 运行相关
    parser.add_argument("--cookies-file", default=os.path.join(CONFIG_DIR, "cookies.txt"))
    parser.add_argument("--star-id", default="1843934177451019")
    parser.add_argument("--output-dir", default=os.path.join(RESULTS_DIR, "author_square_by_tag"))
    parser.add_argument("--video-type", type=str, default="2")
    parser.add_argument("--min-price", type=int, default=0)
    parser.add_argument("--search-type", type=int, default=2)
    parser.add_argument("--province-id", type=int)
    parser.add_argument("--city-id", type=int)
    parser.add_argument("--province-name", type=str)
    parser.add_argument("--city-name", type=str)
    parser.add_argument("--extra-filter", action="append")
    parser.add_argument("--save-pg", action="store_true")
    parser.add_argument("--pg-config", default=os.path.join(TASK_CONTROL_DIR, "config", "postgres.json"))
    # 并发与限速/稳定性参数
    parser.add_argument("--concurrency", type=int, default=1, help="并发任务数")
    parser.add_argument("--domain-qps", type=int, help="域级 QPS 限制（每秒请求数）")
    parser.add_argument("--qps-window-ms", type=int, default=1000, help="QPS 时间窗口毫秒")
    parser.add_argument("--time-window", type=str, help="执行时间窗，例如 '02:00-06:00'")
    parser.add_argument("--rerun-failed", action="store_true", help="按报表重跑失败页（标签模式）")
    parser.add_argument("--cooldown-429-403-ms", type=int, default=2000, help="遇 429/403 增加冷却毫秒")
    parser.add_argument("--max-failure-rate", type=float, help="失败率阈值，超过则停止任务")
    parser.add_argument("--stop-when-empty-n", type=int, help="连续空页 N 次停止任务")
    parser.add_argument("--metrics-port", type=int, help="Prometheus 指标HTTP端口")
    parser.add_argument("--max-consecutive-401", type=int, default=3, help="连续401阈值，达到后触发暂停")
    parser.add_argument("--pause-on-401-ms", type=int, default=60000, help="达到401阈值后暂停毫秒数")
    # 加载 .env 并将环境变量映射为 argparse 默认值
    try:
        loaded_env_path = load_env()
    except Exception:
        loaded_env_path = None
    try:
        _defaults_applied = apply_argparse_defaults(parser)
    except Exception:
        _defaults_applied = {}

    args = parser.parse_args()

    # 标签与粉丝区间
    tags_path = args.tags_file
    if not os.path.exists(tags_path):
        alt = os.path.join(TASK_CONTROL_DIR, "content_tag_v2.json")
        if os.path.exists(alt):
            tags_path = alt
    all_tags = load_content_tags(tags_path) if os.path.exists(tags_path) else []
    follower_ranges = load_follower_ranges(args.follower_ranges_file)
    if not all_tags or not follower_ranges:
        print("[error] 标签或粉丝区间为空，请检查配置文件")
        sys.exit(2)

    # 应用模式预设（仅覆盖默认值）
    preset = apply_mode_presets(args)

    # 热度优先：按粉丝下限倒序排序区间，使高段优先
    if args.mode == "popularity_first":
        try:
            follower_ranges = sorted(
                follower_ranges,
                key=lambda r: (r.get("ge") or 0),
                reverse=True,
            )
        except Exception:
            pass

    plan = generate_jobs_plan(
        all_tags=all_tags,
        follower_ranges=follower_ranges,
        mode=args.mode,
        max_first=args.max_first,
        limit=preset["limit"],
        max_pages=preset["max_pages"],
        sleep_ms=preset["sleep_ms"],
        retry_max=preset["retry_max"],
        retry_backoff_ms=preset["retry_backoff_ms"],
        sort_field=preset["sort_field"],
        sort_type=preset["sort_type"],
    )
    # 写入计划
    try:
        if args.jobs_plan_out:
            plan_path = args.jobs_plan_out
        else:
            plan_path = os.path.join(REPORTS_DIR, "jobs_plan.json")

        os.makedirs(os.path.dirname(plan_path), exist_ok=True)
        with open(plan_path, "w", encoding="utf-8") as f:
            json.dump(plan, f, ensure_ascii=False, indent=2)
        print(f"[plan] 已生成: {plan_path}，jobs={len(plan.get('jobs', []))}")
    except Exception as e:
        print(f"[error] 写入计划失败: {e}")
        sys.exit(2)

    if args.generate_only:
        print("[plan] generate-only=TRUE，跳过执行")
        sys.exit(0)

    # 指标HTTP服务（可选）：在执行前启动
    try:
        if init_metrics_server and getattr(args, "metrics_port", None):
            ok = init_metrics_server(int(args.metrics_port))
            print(f"[metrics] start_http_server port={args.metrics_port} ok={ok}")
    except Exception as e:
        print(f"[metrics-warn] 指标服务启动失败: {e}")

    # 解析省市名映射（可选）
    province_id = args.province_id
    city_id = args.city_id
    if (args.province_name or args.city_name) and (province_id is None or city_id is None):
        rc = load_region_codes(REGION_CODES_DEFAULT_PATH) if os.path.exists(REGION_CODES_DEFAULT_PATH) else None
        cc = load_city_codes(CITY_CODES_DEFAULT_PATH) if os.path.exists(CITY_CODES_DEFAULT_PATH) else None
        if province_id is None and args.province_name:
            if rc and rc.get("name_to_code"):
                province_id = rc["name_to_code"].get(args.province_name)
        if city_id is None and args.city_name:
            city_id = resolve_city_id(
                args.city_name,
                province_name=args.province_name,
                province_id=province_id,
                region_codes=rc,
                city_codes=cc,
            )

    run_jobs_plan(
        plan,
        cookie_file=args.cookies_file,
        star_id=args.star_id,
        output_dir=args.output_dir,
        video_type=args.video_type,
        min_price=args.min_price,
        search_type=args.search_type,
        sort_field=args.sort_field,
        sort_type=args.sort_type,
        province_id=province_id,
        city_id=city_id,
        extra_filters=args.extra_filter,
        save_pg=args.save_pg,
        pg_config=args.pg_config,
        auto_pages=args.auto_pages,
        auto_pages_upper_bound=args.auto_pages_upper_bound,
        resume=args.resume,
        skip_existing=args.skip_existing,
        concurrency=args.concurrency,
        domain_qps=args.domain_qps,
        qps_window_ms=args.qps_window_ms,
        time_window=args.time_window,
        rerun_failed=args.rerun_failed,
        cooldown_429_403_ms=args.cooldown_429_403_ms,
        max_failure_rate=args.max_failure_rate,
        stop_when_empty_n=args.stop_when_empty_n,
        max_consecutive_401=args.max_consecutive_401,
        pause_on_401_ms=args.pause_on_401_ms,
    )


if __name__ == "__main__":
    main()
