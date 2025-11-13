#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import argparse
import copy
import hashlib
import json
import math
import os
import random
import re
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Callable

import requests

try:
    from services.logging_utils import get_json_logger, log_event
except Exception:
    get_json_logger = None
    log_event = None
try:
    from services.metrics import observe_latency_ms, record_request
except Exception:
    record_request = None
    observe_latency_ms = None

# 可选：使用内部引擎的单次请求控制
try:
    from tools.author_fetcher import AuthorFetcher
except Exception:
    AuthorFetcher = None
try:
    from tools.author_square_crawler import AuthorSquareCrawler
except Exception:
    AuthorSquareCrawler = None

# 优先使用服务层重试处理器
try:
    from services.retry_handler_compat import (
        RetryHandler as ServiceRetryHandler,
        RetryConfig as ServiceRetryConfig,
        create_retry_handler as service_create_retry_handler,
        create_retry_config as service_create_retry_config
    )
    service_retry_handler_available = True
except ImportError:
    service_retry_handler_available = False
# 优先使用服务层限速器
try:
    from services.rate_limiter import (
        TimeWindowQPSLimiter as ServiceTimeWindowQPSLimiter,
    )
    service_rate_limiter_available = True
except ImportError:
    ServiceTimeWindowQPSLimiter = None
    service_rate_limiter_available = False

# 优先使用服务层任务编排器
try:
    from services.task_orchestrator import (
        orchestrate_labels_run as service_orchestrate_labels_run,
        create_qps_limiter as service_create_qps_limiter,
    )
    service_task_orchestrator_available = True
except ImportError:
    service_task_orchestrator_available = False

try:
    # 支持两种导入路径，提升脚本运行的兼容性
    from tools.by_tags_orchestrator import orchestrate_labels_run
except Exception:
    try:
        from tools.by_tags_orchestrator import orchestrate_labels_run
    except Exception:
        orchestrate_labels_run = None

# 可选：统一持久化器 DataSaver（文件/报表与 PG 入库的桥接）
try:
    from services.data_saver import DataSaver
except Exception:
    DataSaver = None

# 可选：HTTP 客户端服务（统一 POST JSON 行为）
try:
    from services.http_client import post_json as http_post_json
except Exception:
    http_post_json = None

# 可选：配置加载服务（统一配置文件处理）
try:
    from services.config_loader import (
        load_region_codes as service_load_region_codes,
        load_city_codes as service_load_city_codes,
        read_cookie_file as service_read_cookie_file,
        load_content_tags as service_load_content_tags,
    )
except Exception:
    service_load_region_codes = None
    service_load_city_codes = None
    service_read_cookie_file = None
    service_load_content_tags = None

API_URL = "https://agent.oceanengine.com/star/mirror/gw/api/gsearch/search_for_author_square"
DEFAULT_REFERER = "https://agent.oceanengine.com/admin/star-agent/vue2/market"
DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/140.0.0.0 Safari/537.36"
)
TASK_CONTROL_DIR = str(Path(__file__).resolve().parent)
CONFIG_DIR = os.path.join(TASK_CONTROL_DIR, "config")
RESULTS_DIR = os.path.join(TASK_CONTROL_DIR, "results")
# 报表输出目录
REPORTS_DIR = os.path.join(TASK_CONTROL_DIR, "reports")
# 新增：region codes 默认路径与加载
REGION_CODES_DEFAULT_PATH = os.path.join(CONFIG_DIR, "region_codes.json")

# 城市码：从配置文件加载（GB/T 2260）
CITY_CODES_DEFAULT_PATH = os.path.join(CONFIG_DIR, "city_codes.json")


def load_city_codes(path: str):
    # 优先使用服务层实现
    if service_load_city_codes:
        return service_load_city_codes(path)
    
    # 回退到原始实现
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return None
    province_to_city_code = {}
    # 支持两种结构：dict-of-dicts 或 provinces/cities 列表
    if isinstance(data, dict) and "provinces" in data:
        for p in data.get("provinces") or []:
            pname = p.get("name")
            cities = p.get("cities") or []
            if pname:
                province_to_city_code[pname] = {}
                for c in cities:
                    cname = c.get("name")
                    code = c.get("code")
                    if cname and code is not None:
                        try:
                            province_to_city_code[pname][str(cname)] = int(str(code))
                        except Exception:
                            continue
    elif isinstance(data, dict):
        # 假设已是 {省: {市: code}} 形式
        for pname, cmap in data.items():
            if isinstance(cmap, dict):
                province_to_city_code[pname] = {}
                for cname, code in cmap.items():
                    try:
                        province_to_city_code[pname][str(cname)] = int(str(code))
                    except Exception:
                        continue
    return {"province_to_city_code": province_to_city_code, "raw": data}


def resolve_city_id(
    city_name: str,
    province_name: str | None = None,
    province_id: int | None = None,
    region_codes: dict | None = None,
    city_codes: dict | None = None,
) -> int | None:
    city_name = (city_name or "").strip()
    if not city_name:
        return None
    p_name = (province_name or "").strip() if province_name else None
    if not p_name and province_id and region_codes and region_codes.get("raw"):
        try:
            for p in region_codes["raw"].get("provinces") or []:
                code = p.get("code")
                name = p.get("name")
                if code is not None and int(str(code)) == int(province_id):
                    p_name = name
                    break
        except Exception:
            pass
    # 显式省份优先
    if p_name and city_codes and city_codes.get("province_to_city_code"):
        return (city_codes["province_to_city_code"].get(p_name) or {}).get(city_name)
    # 回退：在所有省份中查找唯一匹配的城市名
    found = []
    if city_codes and city_codes.get("province_to_city_code"):
        for pn, cmap in city_codes["province_to_city_code"].items():
            if city_name in cmap:
                found.append(cmap[city_name])
    if len(found) == 1:
        return found[0]
    return None


def load_region_codes(path: str):
    # 优先使用服务层实现
    if service_load_region_codes:
        return service_load_region_codes(path)
    
    # 回退到原始实现
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return None
    provinces = data.get("provinces") or []
    name_to_code = {}
    for p in provinces:
        name = p.get("name")
        code = p.get("code")
        if name and code is not None:
            try:
                name_to_code[str(name)] = int(str(code))
            except Exception:
                continue
    return {"name_to_code": name_to_code, "raw": data}


def read_cookie_file(path: str) -> str:
    # 优先使用服务层实现
    if service_read_cookie_file:
        return service_read_cookie_file(path)
    
    # 回退到原始实现
    with open(path, "r", encoding="utf-8") as f:
        return f.read().strip()


def load_content_tags(path: str):
    # 优先使用服务层实现
    if service_load_content_tags:
        return service_load_content_tags(path)
    
    # 回退到原始实现
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    # Expect structure: {"content_tag_v2": [ {"first": {...}, "second": [...] }, ... ]}
    return data.get("content_tag_v2", [])


def sanitize_label(label: str) -> str:
    # Safe for filesystem paths
    s = re.sub(r"\s+", "_", label)
    s = s.replace("/", "-")
    s = re.sub(r"[^\w\-]+", "", s)
    return s


# 新增：通用深合并（字典递归，列表整体替换）
def deep_merge(dst: dict, src: dict) -> dict:
    """深合并两个字典：
    - 当 dst[k] 与 src[k] 都是 dict 时递归合并；
    - 其他情况直接覆盖 dst[k] = src[k]；
    - 列表等非 dict 类型整体覆盖。
    """
    for k, v in (src or {}).items():
        if isinstance(v, dict) and isinstance(dst.get(k), dict):
            deep_merge(dst[k], v)
        else:
            dst[k] = v
    return dst


def build_headers(cookie: str, star_id: str, user_agent: str, referer: str):
    return {
        "Cookie": cookie,
        "User-Agent": user_agent,
        "Referer": referer,
        "Content-Type": "application/json",
        # 启用压缩与连接复用
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        # Critical headers observed in HAR for authenticated author square
        "x-tt-possess-star-id": str(star_id),
        "x-login-source": "1",
        "x-tt-possess-scene": "2",
        "agw-js-conv": "str",
        # sec-ch hints from HAR
        "sec-ch-ua-platform": '"macOS"',
        "sec-ch-ua": '"Not=A?Brand";v="24", "Chromium";v="140"',
        "sec-ch-ua-mobile": "?0",
        # Common accept
        "Accept": "application/json, text/plain, */*",
    }


# 扩展：支持 scene/search/sort 覆盖
def build_base_payload(
    page: int,
    limit: int,
    min_price: int,
    video_type_rel_id: str = "2",
    add_price_filter: bool = True,
    scene_overrides: dict | None = None,
    search_type: int | None = None,
    sort_field: str | None = None,
    sort_type: int | None = None,
):
    payload = {
        "scene_param": {
            "platform_source": 1,
            "search_scene": 1,
            "display_scene": 1,
            "marketing_target": 1,
            "task_category": 1,
            # Keep 0 to avoid over-constraining; tag filters will drive selection
            "first_industry_id": 0,
            "task_status": 3,
        },
        "search_param": {"seach_type": 2},
        "sort_param": {"sort_type": 2, "sort_field": {"field_name": "score"}},
        "page_param": {"page": page, "limit": limit},
        "attribute_filter": [],
    }
    # 覆盖默认 scene_param
    if scene_overrides:
        for k, v in scene_overrides.items():
            if v is not None:
                payload["scene_param"][k] = v
    # 覆盖 search_type
    if search_type is not None:
        payload["search_param"]["seach_type"] = int(search_type)
    # 覆盖 sort
    if sort_field:
        payload["sort_param"]["sort_field"]["field_name"] = str(sort_field)
    if sort_type is not None:
        payload["sort_param"]["sort_type"] = int(sort_type)
    # 默认启用报价过滤，复刻页面行为
    if add_price_filter:
        payload["attribute_filter"].append(
            {
                "field": {"field_name": "price_by_video_type__ge", "rel_id": str(video_type_rel_id)},
                "field_value": str(min_price),
            }
        )
    return payload


def add_tag_filter(payload: dict, first_id: int = None, second_id: int | None = None):
    # Observed filters:
    # - top-level: field_name "tag", field_value like "[25]"
    # - second-level: field_name "tag_level_two", field_value like "[49,52,53]"
    if second_id is not None:
        payload["attribute_filter"].append({"field": {"field_name": "tag_level_two"}, "field_value": f"[{second_id}]"})
    elif first_id is not None:
        payload["attribute_filter"].append({"field": {"field_name": "tag"}, "field_value": f"[{first_id}]"})


# 新增：合并二级标签为一次请求
def add_combined_second_filter(payload: dict, second_ids: list[int]):
    # field_value 需为字符串形式的数组，如 "[49,52,53,54,423]"
    arr = ",".join(str(x) for x in second_ids)
    payload["attribute_filter"].append({"field": {"field_name": "tag_level_two"}, "field_value": f"[{arr}]"})


# 新增：粉丝&地域过滤
def add_follower_filter(payload: dict, ge: int | None = None, lt: int | None = None):
    if ge is not None:
        payload["attribute_filter"].append({"field": {"field_name": "follower_range__ge"}, "field_value": str(ge)})
    if lt is not None:
        payload["attribute_filter"].append({"field": {"field_name": "follower_range__lt"}, "field_value": str(lt)})


def add_region_filter(payload: dict, province_id: int | None = None, city_id: int | None = None):
    if province_id is not None:
        payload["attribute_filter"].append({"field": {"field_name": "province_id"}, "field_value": str(province_id)})
    if city_id is not None:
        payload["attribute_filter"].append({"field": {"field_name": "city_id"}, "field_value": str(city_id)})


# 新增：通用 attribute_filter 注入（支持 JSON 或 key=value 列表）
def parse_extra_filter(s: str) -> dict | None:
    s = (s or "").strip()
    if not s:
        return None
    if s.startswith("{"):
        try:
            obj = json.loads(s)
            # 兼容两种形态：完整 item 或简写 {field_name, field_value, rel_id?}
            if "field" in obj and "field_value" in obj:
                return obj
            field_name = obj.get("field_name")
            field_value = obj.get("field_value")
            if not field_name or field_value is None:
                return None
            item = {"field": {"field_name": str(field_name)}, "field_value": str(field_value)}
            if obj.get("rel_id") is not None:
                item["field"]["rel_id"] = str(obj.get("rel_id"))
            return item
        except Exception:
            return None
    # key=value 列表，逗号分隔
    kv = {}
    for part in s.split(","):
        if "=" in part:
            k, v = part.split("=", 1)
            kv[k.strip()] = v.strip()
    field_name = kv.get("field_name")
    field_value = kv.get("field_value")
    if not field_name or field_value is None:
        return None
    item = {"field": {"field_name": str(field_name)}, "field_value": str(field_value)}
    if kv.get("rel_id") is not None:
        item["field"]["rel_id"] = str(kv.get("rel_id"))
    return item


def add_extra_filters(payload: dict, extras: list[str]):
    for s in extras or []:
        item = parse_extra_filter(s)
        if item is not None:
            payload["attribute_filter"].append(item)


def request_once(headers: dict, payload: dict, timeout: int = 20, session: requests.Session | None = None):
    # 优先委派到 services.http_client；失败时退回本地实现
    if http_post_json is not None:
        return http_post_json(
            API_URL,
            headers=headers,
            payload=payload,
            timeout=timeout,
            session=session,
        )
    # fallback
    if session is not None:
        resp = session.post(API_URL, headers=headers, json=payload, timeout=timeout)
    else:
        resp = requests.post(API_URL, headers=headers, json=payload, timeout=timeout)
    status = resp.status_code
    agw_login = resp.headers.get("x-tt-agw-login")
    try:
        data = resp.json()
    except Exception:
        data = {"raw": resp.text}
    return status, agw_login, data


def compute_payload_hash(payload: dict) -> str:
    try:
        canonical = json.dumps(payload or {}, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    except Exception:
        canonical = str(payload)
    h = hashlib.sha1()
    h.update(canonical.encode("utf-8"))
    return h.hexdigest()


def save_response(
    base_dir: str, first_label: str, second_label: str, page: int, data: dict, request_payload: dict | None = None
):
    dt = datetime.now().strftime("%Y%m%d_%H%M%S")
    first_dir = os.path.join(base_dir, sanitize_label(first_label) if first_label else "_no_first_")
    second_dir = os.path.join(first_dir, sanitize_label(second_label) if second_label else "_first_only_")
    os.makedirs(second_dir, exist_ok=True)
    fname = os.path.join(second_dir, f"author_square_page_{page}_{dt}.json")
    to_write = copy.deepcopy(data or {})
    try:
        if request_payload is not None:
            to_write["request_payload_hash"] = compute_payload_hash(request_payload)
    except Exception:
        pass
    with open(fname, "w", encoding="utf-8") as f:
        json.dump(to_write, f, ensure_ascii=False, indent=2)
    return fname


def write_summary_report(
    first_label: str, second_label: str, start_page: int, pages_done: int, authors_total: int, failed_pages: int
) -> str:
    os.makedirs(REPORTS_DIR, exist_ok=True)
    dt = datetime.now().strftime("%Y%m%d_%H%M%S")
    fname = os.path.join(
        REPORTS_DIR,
        f"summary_{sanitize_label(first_label)}_{sanitize_label(second_label) if second_label else '_first_only_'}_{dt}.json",
    )
    data = {
        "first_label": first_label,
        "second_label": second_label,
        "start_page": int(start_page),
        "pages_done": int(pages_done),
        "authors_total": int(authors_total),
        "failed_pages": int(failed_pages),
        "finished_at": datetime.now().isoformat(),
    }
    with open(fname, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return fname


# 文件判断/续跑/失败报表辅助
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


def get_last_success_page(base_dir: str, first_label: str, second_label: str) -> int | None:
    target_dir = _page_dir(base_dir, first_label, second_label)
    if not os.path.exists(target_dir):
        return None
    last = None
    try:
        for f in os.listdir(target_dir):
            m = re.match(r"^author_square_page_([0-9]+)_", f)
            if not m:
                continue
            p = int(m.group(1))
            if page_has_success_file(base_dir, first_label, second_label, p):
                if last is None or p > last:
                    last = p
    except Exception:
        pass
    return last


def compute_start_page_for(args, first_label: str, second_label_for_save: str) -> int:
    """计算起始页：若启用恢复则取最后成功页+1，否则使用传入的默认页。

    统一 main 中的重复逻辑，避免分支间实现偏差。
    """
    try:
        if getattr(args, "resume", False):
            last = get_last_success_page(args.output_dir, first_label, second_label_for_save) or 0
            return int(last) + 1
        return int(getattr(args, "page", 1))
    except Exception:
        return int(getattr(args, "page", 1))


def build_limiter(args):
    """构建时间窗 QPS 限速器，带工具模块回退实现。

    规则：当设置了 `--domain-qps` 或启用 `--adaptive-qps` 时初始化限速器；否则返回 None。
    """
    # 优先使用服务层限速器
    if service_rate_limiter_available and (getattr(args, "domain_qps", None) or getattr(args, "adaptive_qps", False)):
        init_qps = int(args.domain_qps or args.adaptive_min_qps or 1)
        limiter = ServiceTimeWindowQPSLimiter(qps=init_qps, window_ms=int(args.qps_window_ms))
        print(f"[limiter] 使用服务层QPS限速器，初始化QPS={init_qps}/window={args.qps_window_ms}ms")
        return limiter
    
    # 次选：使用服务层任务编排器的限速器
    if service_task_orchestrator_available and (getattr(args, "domain_qps", None) or getattr(args, "adaptive_qps", False)):
        init_qps = int(args.domain_qps or args.adaptive_min_qps or 1)
        limiter = service_create_qps_limiter(qps=init_qps, window_ms=int(args.qps_window_ms))
        print(f"[limiter] 使用任务编排器QPS限速器，初始化QPS={init_qps}/window={args.qps_window_ms}ms")
        return limiter
    
    # 回退到原始实现
    TimeWindowQPSLimiter_cls = None
    try:
        from services.rate_limiter import TimeWindowQPSLimiter as _TWQL
        TimeWindowQPSLimiter_cls = _TWQL
    except Exception:
        try:
            from tools.task_scheduler import TimeWindowQPSLimiter as _TWQL
            TimeWindowQPSLimiter_cls = _TWQL
        except Exception:
            TimeWindowQPSLimiter_cls = None
    if TimeWindowQPSLimiter_cls is None and (getattr(args, "domain_qps", None) or getattr(args, "adaptive_qps", False)):
        class TimeWindowQPSLimiter:
            def __init__(self, qps: int, window_ms: int = 1000):
                self.qps = max(1, int(qps))
                self.window_ms = max(1, int(window_ms))
                import threading
                from collections import deque
                self._lock = threading.Lock()
                self._times = deque()

            def acquire(self):
                import time
                while True:
                    now = int(time.time() * 1000)
                    with self._lock:
                        cutoff = now - self.window_ms
                        while self._times and self._times[0] < cutoff:
                            self._times.popleft()
                        if len(self._times) < self.qps:
                            self._times.append(now)
                            return
                        wait_ms = self._times[0] + self.window_ms - now
                    if wait_ms > 0:
                        time.sleep(wait_ms / 1000.0)
                    else:
                        time.sleep(0.001)
        TimeWindowQPSLimiter_cls = TimeWindowQPSLimiter
    limiter = None
    if (getattr(args, "domain_qps", None) and int(args.domain_qps) > 0) or getattr(args, "adaptive_qps", False):
        init_qps = int(args.domain_qps or args.adaptive_min_qps or 1)
        limiter = TimeWindowQPSLimiter_cls(qps=init_qps, window_ms=int(args.qps_window_ms))
        print(f"[limiter] 初始化QPS={init_qps}/window={args.qps_window_ms}ms")
    return limiter


def execute_fetch_pages(
    *,
    headers: dict,
    payload: dict,
    args,
    first_label: str,
    second_label_for_save: str,
    second_ids: list[int] | None,
    limiter,
    pg_saver,
    data_saver,
    only_pages: list[int] | None = None,
    logger: object | None = None,
    save_page_fn: Callable | None = None,
    write_summary_report_fn: Callable | None = None,
    write_failed_pages_report_fn: Callable | None = None,
):
    """统一封装 fetch_pages 调用，减少 main 分支重复。

    自动使用 compute_start_page_for 计算起始页，并统一传递公共参数。
    """
    return fetch_pages(
        headers=headers,
        base_payload=payload,
        start_page=compute_start_page_for(args, first_label, second_label_for_save),
        max_pages=args.max_pages,
        output_dir=args.output_dir,
        first_label=first_label,
        second_label_for_save=second_label_for_save,
        second_ids=second_ids,
        video_type=args.video_type,
        limit=args.limit,
        min_price=args.min_price,
        stop_when_empty=args.stop_when_empty,
        sleep_ms=args.sleep_ms,
        retry_max=args.retry_max,
        retry_backoff_ms=args.retry_backoff_ms,
        pg_saver=pg_saver,
        data_saver=data_saver,
        auto_pages=args.auto_pages,
        auto_pages_upper_bound=args.auto_pages_upper_bound,
        skip_existing=args.skip_existing,
        only_pages=only_pages,
        limiter=limiter,
        cooldown_on_429_403_ms=args.cooldown_429_403_ms,
        max_failure_rate=args.max_failure_rate,
        stop_when_empty_n=args.stop_when_empty_n,
        max_consecutive_401=args.max_consecutive_401,
        pause_on_401_ms=args.pause_on_401_ms,
        use_fetcher_engine=True,
        logger=logger,
        save_page_fn=save_page_fn,
        write_summary_report_fn=write_summary_report_fn,
        write_failed_pages_report_fn=write_failed_pages_report_fn,
    )


def build_adaptive_policy(args, limiter):
    """
    当 `--adaptive-qps` 未启用或策略不可用时返回 None。
    """
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
    
    try:
        from services.adaptive_qps import AdaptiveQpsPolicy, AdaptiveQpsConfig
    except Exception:
        AdaptiveQpsPolicy = None
        AdaptiveQpsConfig = None
    if not getattr(args, "adaptive_qps", False) or (AdaptiveQpsPolicy is None and not service_adaptive_qps_available):
        return None
    
    # 使用服务层实现或回退到原始实现
    if service_adaptive_qps_available:
        cfg = service_create_qps_config(
            min_qps=int(getattr(args, "adaptive_min_qps", 1) or 1),
            max_qps=int(getattr(args, "adaptive_max_qps", max(1, int(getattr(args, "adaptive_min_qps", 1) or 1))) or 1),
            step=int(getattr(args, "adaptive_step", 1) or 1),
            backoff_base=float(getattr(args, "adaptive_backoff_base", 0.7) or 0.7),
            backoff_max_power=int(getattr(args, "adaptive_backoff_max_power", 3) or 3),
            success_needed=int(getattr(args, "adaptive_success_needed", 3) or 3),
            upgrade_cooldown_sec=int(getattr(args, "adaptive_upgrade_cooldown_sec", 300) or 300),
            failure_rate_threshold=float(getattr(args, "adaptive_failure_rate_threshold", 0.2) or 0.2),
        )
        current_qps = int((limiter.qps if limiter is not None else cfg.min_qps))
        policy = service_create_adaptive_qps_policy(current_qps=current_qps, config=cfg)
    else:
        cfg = AdaptiveQpsConfig(
            min_qps=int(getattr(args, "adaptive_min_qps", 1) or 1),
            max_qps=int(getattr(args, "adaptive_max_qps", max(1, int(getattr(args, "adaptive_min_qps", 1) or 1))) or 1),
            step=int(getattr(args, "adaptive_step", 1) or 1),
            backoff_base=float(getattr(args, "adaptive_backoff_base", 0.7) or 0.7),
            backoff_max_power=int(getattr(args, "adaptive_backoff_max_power", 3) or 3),
            success_needed=int(getattr(args, "adaptive_success_needed", 3) or 3),
            upgrade_cooldown_sec=int(getattr(args, "adaptive_upgrade_cooldown_sec", 300) or 300),
            failure_rate_threshold=float(getattr(args, "adaptive_failure_rate_threshold", 0.2) or 0.2),
        )
        current_qps = int((limiter.qps if limiter is not None else cfg.min_qps))
        policy = AdaptiveQpsPolicy(current_qps=current_qps, config=cfg)
    print(
        f"[adaptive-qps] 已启用：初始QPS={current_qps}, 范围=[{cfg.min_qps},{cfg.max_qps}], step={cfg.step}, cooldown={cfg.upgrade_cooldown_sec}s"
    )
    return policy




def write_failed_pages_report(first_label: str, second_label: str, failed_details: list[dict]) -> str:
    os.makedirs(REPORTS_DIR, exist_ok=True)
    dt = datetime.now().strftime("%Y%m%d_%H%M%S")
    fname = os.path.join(
        REPORTS_DIR,
        f"failed_pages_{sanitize_label(first_label)}_{sanitize_label(second_label) if second_label else '_first_only_'}_{dt}.json",
    )
    payload = {
        "first_label": first_label,
        "second_label": second_label,
        "failed_pages": failed_details,
        "saved_at": datetime.now().isoformat(),
    }
    try:
        with open(fname, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        print(f"[failed-report] 写入: {fname} (count={len(failed_details)})")
    except Exception as e:
        print(f"[failed-report-warn] 写入失败页报表失败: {e}")
    return fname


# 统一分页抓取函数：发起请求 → 保存文件 → 入库 PG → 读取 pagination/authors 决定继续与终止
def fetch_pages(
    headers: dict,
    base_payload: dict,
    start_page: int,
    max_pages: int,
    *,
    output_dir: str,
    first_label: str,
    second_label_for_save: str,
    second_ids: list[int] | None,
    video_type: str,
    limit: int,
    min_price: int,
    stop_when_empty: bool,
    sleep_ms: int,
    retry_max: int,
    retry_backoff_ms: int,
    pg_saver,
    data_saver: object | None = None,
    auto_pages: bool = False,
    auto_pages_upper_bound: int | None = None,
    skip_existing: bool = False,
    only_pages: list[int] | None = None,
    limiter: object | None = None,
    cooldown_on_429_403_ms: int | None = None,
    max_failure_rate: float | None = None,
    stop_when_empty_n: int | None = None,
    max_consecutive_401: int | None = None,
    pause_on_401_ms: int | None = None,
    use_fetcher_controls: bool = False,
    use_fetcher_engine: bool = False,
    logger: object | None = None,
    save_page_fn: Callable | None = None,
    write_summary_report_fn: Callable | None = None,
    write_failed_pages_report_fn: Callable | None = None,
):
    # 可选：委托到 AuthorFetcher 内部引擎（职责拆分），保持返回结构一致
    try:
        if use_fetcher_engine and AuthorFetcher is not None:
            fetcher = AuthorFetcher()
            return fetcher.run(
                headers=headers,
                base_payload=base_payload,
                start_page=start_page,
                max_pages=max_pages,
                output_dir=output_dir,
                first_label=first_label,
                second_label_for_save=second_label_for_save,
                second_ids=second_ids,
                video_type=video_type,
                limit=limit,
                min_price=min_price,
                stop_when_empty=stop_when_empty,
                sleep_ms=sleep_ms,
                retry_max=retry_max,
                retry_backoff_ms=retry_backoff_ms,
                pg_saver=pg_saver,
                data_saver=data_saver,
                auto_pages=auto_pages,
                auto_pages_upper_bound=auto_pages_upper_bound,
                skip_existing=skip_existing,
                only_pages=only_pages,
                limiter=limiter,
                cooldown_on_429_403_ms=cooldown_on_429_403_ms,
                max_failure_rate=max_failure_rate,
                stop_when_empty_n=stop_when_empty_n,
                max_consecutive_401=max_consecutive_401,
                pause_on_401_ms=pause_on_401_ms,
                logger=logger,
                use_internal_engine=True,
                save_page_fn=save_page_fn,
                write_summary_report_fn=write_summary_report_fn,
                write_failed_pages_report_fn=write_failed_pages_report_fn,
            )
    except Exception:
        # 回退到原有实现
        pass
    # 连接复用：单次抓取任务范围内共享一个 HTTP Session
    session = requests.Session()
    # 以防遗漏，确保压缩头常驻（即使调用方已传入）
    try:
        if "Accept-Encoding" not in headers:
            headers["Accept-Encoding"] = "gzip, deflate, br"
        if "Connection" not in headers:
            headers["Connection"] = "keep-alive"
    except Exception:
        pass

    # 透传常用头到 Session（每次请求仍传 headers，确保一致性）
    try:
        session.headers.update(
            {
                "Accept-Encoding": headers.get("Accept-Encoding", "gzip, deflate, br"),
                "Connection": headers.get("Connection", "keep-alive"),
            }
        )
    except Exception:
        pass

    logger = logger or (get_json_logger("fetch_author_square") if get_json_logger else None)
    consecutive_401 = 0

    # 构造爬虫实例（封装单页请求/重试控制）；优先使用服务层重试处理器
    crawler = None
    retry_handler = None
    
    # 优先尝试使用服务层重试处理器
    if service_retry_handler_available:
        try:
            retry_config = service_create_retry_config(
                max_retries=int(retry_max),
                backoff_base_ms=int(retry_backoff_ms),
                cooldown_429_403_ms=int(cooldown_on_429_403_ms) if cooldown_on_429_403_ms is not None else None,
                max_consecutive_401=int(max_consecutive_401) if max_consecutive_401 is not None else None,
                pause_on_401_ms=int(pause_on_401_ms) if pause_on_401_ms is not None else None,
            )
            retry_handler = service_create_retry_handler(
                config=retry_config,
                limiter=limiter,
                use_fetcher_controls=bool(use_fetcher_controls),
                logger=logger,
                record_request=record_request,
                observe_latency_ms=observe_latency_ms,
                request_fn=lambda h, p: request_once(headers=h, payload=p, session=session),
            )
        except Exception as e:
            if logger:
                logger.warning(f"服务层重试处理器创建失败，回退到原始实现: {e}")
    
    # 回退到原始 AuthorSquareCrawler 实现
    if retry_handler is None:
        try:
            if AuthorSquareCrawler is not None:
                crawler = AuthorSquareCrawler(
                    limiter=limiter,
                    retry_max=int(retry_max),
                    retry_backoff_ms=int(retry_backoff_ms),
                    cooldown_on_429_403_ms=int(cooldown_on_429_403_ms) if cooldown_on_429_403_ms is not None else None,
                    max_consecutive_401=int(max_consecutive_401) if max_consecutive_401 is not None else None,
                    pause_on_401_ms=int(pause_on_401_ms) if pause_on_401_ms is not None else None,
                    use_fetcher_controls=bool(use_fetcher_controls),
                    logger=logger,
                    record_request=record_request,
                    observe_latency_ms=observe_latency_ms,
                    request_fn=lambda h, p: request_once(headers=h, payload=p, session=session),
                )
        except Exception:
            crawler = None

    def _process_one_page(page: int):
        nonlocal pages_done, authors_total, failed_pages
        # 深拷贝 payload，设置页码
        payload = copy.deepcopy(base_payload)
        try:
            payload["page_param"]["page"] = page
        except Exception:
            payload.setdefault("page_param", {})["page"] = page

        # 请求与重试（处理 429/5xx）：优先使用服务层重试处理器，否则委托给 AuthorSquareCrawler，最后保留原逻辑
        status, agw_login, data = None, None, None
        
        # 优先使用服务层重试处理器
        if retry_handler is not None:
            status, agw_login, data = retry_handler.run_page(
                page=page,
                headers=headers,
                payload=payload,
                log_event=log_event,
            )
        elif crawler is not None:
            status, agw_login, data = crawler.run_page(
                page=page,
                headers=headers,
                payload=payload,
                log_event=log_event,
            )
        else:
            # 兼容路径：保留原本的两种实现
            attempt = 0
            if use_fetcher_controls:
                try:
                    if limiter is not None and hasattr(limiter, "acquire"):
                        limiter.acquire()
                except Exception:
                    pass
                t0 = time.time()
                try:
                    if AuthorFetcher is not None:
                        fetcher = AuthorFetcher()
                        status, agw_login, data = fetcher._request_once_with_controls(
                            headers=headers,
                            payload=payload,
                            retry_max=int(retry_max),
                            retry_backoff_ms=int(retry_backoff_ms),
                            cooldown_on_429_403_ms=int(cooldown_on_429_403_ms) if cooldown_on_429_403_ms is not None else None,
                            max_consecutive_401=int(max_consecutive_401) if max_consecutive_401 is not None else None,
                            pause_on_401_ms=int(pause_on_401_ms) if pause_on_401_ms is not None else None,
                            logger=logger,
                        )
                    else:
                        status, agw_login, data = request_once(headers=headers, payload=payload, session=session)
                except Exception:
                    status, agw_login, data = request_once(headers=headers, payload=payload, session=session)
                try:
                    if record_request:
                        record_request(status)
                    if observe_latency_ms:
                        observe_latency_ms((time.time() - t0) * 1000.0)
                except Exception:
                    pass
            else:
                while True:
                    try:
                        if limiter is not None and hasattr(limiter, "acquire"):
                            limiter.acquire()
                    except Exception:
                        pass
                    t0 = time.time()
                    status, agw_login, data = request_once(headers=headers, payload=payload, session=session)
                    try:
                        if record_request:
                            record_request(status)
                        if observe_latency_ms:
                            observe_latency_ms((time.time() - t0) * 1000.0)
                    except Exception:
                        pass
                    if status == 200:
                        break
                    if status in (401, 429, 403) or (status is not None and status >= 500):
                        if status == 401:
                            consecutive_401 += 1
                            try:
                                if logger and log_event:
                                    log_event(
                                        logger,
                                        "warn",
                                        "401_detected",
                                        page=int(page),
                                        attempt=int(attempt + 1),
                                        consecutive_401=int(consecutive_401),
                                        x_tt_agw_login=str(agw_login) if agw_login is not None else None,
                                    )
                            except Exception:
                                pass
                        if max_consecutive_401 and pause_on_401_ms and int(consecutive_401) >= int(max_consecutive_401):
                            try:
                                pause_sec = int(pause_on_401_ms) / 1000.0
                                print(
                                    f"[pause-401] page={page} 连续401达到阈值 {max_consecutive_401}，暂停 {pause_sec:.2f}s"
                                )
                                if logger and log_event:
                                    try:
                                        log_event(
                                            logger,
                                            "warn",
                                            "401_pause",
                                            page=int(page),
                                            pause_ms=int(pause_on_401_ms),
                                            threshold=int(max_consecutive_401),
                                        )
                                    except Exception:
                                        pass
                                time.sleep(pause_sec)
                            except Exception:
                                pass
                            finally:
                                consecutive_401 = 0
                        if attempt >= int(retry_max):
                            print(f"[warn] page={page} status={status}，已达最大重试次数 {retry_max}，跳过该页")
                            break
                        backoff = int(retry_backoff_ms) * (2**attempt)
                        jitter = int(backoff * 0.2 * random.random())
                        sleep_sec = (backoff + jitter) / 1000.0
                        print(f"[retry] page={page} status={status}，退避 {sleep_sec:.2f}s 后重试 (attempt={attempt+1})")
                        try:
                            if logger and log_event:
                                log_event(
                                    logger,
                                    "info",
                                    "retry_backoff",
                                    page=int(page),
                                    status=int(status) if status is not None else None,
                                    attempt=int(attempt + 1),
                                    sleep_ms=int(backoff + jitter),
                                )
                        except Exception:
                            pass
                        time.sleep(sleep_sec)
                        try:
                            if status in (429, 403) and cooldown_on_429_403_ms and int(cooldown_on_429_403_ms) > 0:
                                cool_sec = int(cooldown_on_429_403_ms) / 1000.0
                                print(f"[cooldown] page={page} status={status}，额外冷却 {cool_sec:.2f}s")
                                try:
                                    if logger and log_event:
                                        log_event(
                                            logger,
                                            "info",
                                            "cooldown",
                                            page=int(page),
                                            status=int(status),
                                            cooldown_ms=int(cooldown_on_429_403_ms),
                                        )
                                except Exception:
                                    pass
                                time.sleep(cool_sec)
                        except Exception:
                            pass
                        attempt += 1
                        continue
                    print(f"[warn] 非预期状态码，page={page} status={status}，停止该页")
                    try:
                        if logger and log_event:
                            log_event(
                                logger,
                                "warn",
                                "stop_unexpected_status",
                                page=int(page),
                                status=int(status) if status is not None else None,
                            )
                    except Exception:
                        pass
                    break
        # 保存文件（优先使用 DataSaver；回退到注入的 save_page_fn；不再在此处直接写文件）
        if data_saver:
            try:
                fname = data_saver.save_page(
                    first_label=first_label,
                    second_label=second_label_for_save,
                    page=page,
                    data=data or {},
                    request_payload=payload,
                )
            except Exception:
                fname = None
        elif save_page_fn:
            try:
                fname = save_page_fn(
                    output_dir, first_label, second_label_for_save, page, data or {}, request_payload=payload
                )
            except Exception:
                fname = None
        else:
            fname = None
        authors = (data or {}).get("authors", []) or []
        authors_count = len(authors)
        print(f"[page] page={page} status={status}, x-tt-agw-login={agw_login}, authors={authors_count}, saved={fname}")
        try:
            if logger and log_event:
                log_event(
                    logger,
                    "info",
                    "page_result",
                    page=int(page),
                    status=int(status) if status is not None else None,
                    x_tt_agw_login=str(agw_login) if agw_login is not None else None,
                    authors=int(authors_count),
                    saved=str(fname),
                )
        except Exception:
            pass

        # 入库 PG（仅成功且有作者时，优先使用 DataSaver）
        if status == 200 and authors_count > 0:
            if data_saver:
                try:
                    run_id = data_saver.save_run_and_authors(
                        first_label=first_label,
                        second_label=second_label_for_save,
                        second_ids=second_ids or [],
                        video_type=video_type,
                        page=page,
                        limit=limit,
                        min_price=min_price,
                        x_tt_agw_login=str(agw_login) if agw_login is not None else None,
                        request_payload=payload,
                        response=data or {},
                    )
                    if run_id is not None:
                        print(f"[pg] saved run_id={run_id}, authors={authors_count}")
                except Exception as e:
                    print(f"[pg-error] 保存到 PostgreSQL 失败: {e}")
            elif pg_saver:
                try:
                    run_id = pg_saver.save_run_and_authors(
                        first_label=first_label,
                        second_label=second_label_for_save,
                        second_ids=second_ids or [],
                        video_type=video_type,
                        page=page,
                        limit=limit,
                        min_price=min_price,
                        x_tt_agw_login=str(agw_login) if agw_login is not None else None,
                        request_payload=payload,
                        response=data or {},
                    )
                    print(f"[pg] saved run_id={run_id}, authors={authors_count}")
                except Exception as e:
                    print(f"[pg-error] 保存到 PostgreSQL 失败: {e}")
        else:
            if data_saver or pg_saver:
                print(f"[pg-skip] 未保存：status={status}, authors={authors_count}")

        # 累加统计
        if status == 200:
            authors_total += authors_count
        else:
            failed_pages += 1
        pages_done += 1
        # 记录失败详情
        try:
            if status != 200:
                failed_details.append(
                    {
                        "page": int(page),
                        "status": int(status) if status is not None else None,
                        "authors": int(authors_count),
                        "saved": fname,
                    }
                )
        except Exception:
            pass

        return status, authors_count, data

    page = int(start_page)
    pages_done = 0
    authors_total = 0
    failed_pages = 0
    failed_details: list[dict] = []
    started_at = datetime.now()
    empty_consecutive_count = 0

    # 仅跑指定失败页（重跑模式）
    if only_pages and len(only_pages) > 0:
        unique_pages = sorted({int(p) for p in only_pages if p is not None})
        print(f"[rerun-failed] 本次仅重跑失败页: {unique_pages}")
        for p in unique_pages:
            if skip_existing and page_has_success_file(output_dir, first_label, second_label_for_save, p):
                print(f"[skip-existing] 已存在成功文件：page={p} -> 跳过")
                continue
            _status, authors_count, _data = _process_one_page(p)
            # 失败重跑模式不考虑 has_more/auto-pages，按名单完成
            # 限速：固定休眠 + 抖动
            jitter_ms = int(sleep_ms * 0.3 * random.random())
            time.sleep((int(sleep_ms) + jitter_ms) / 1000.0)
        # 总结输出（优先 DataSaver；回退使用注入的回调；不再本地写文件）
        report_path = (
            data_saver.write_summary_report(
                first_label, second_label_for_save, start_page, pages_done, authors_total, failed_pages
            )
            if data_saver
            else (write_summary_report_fn(first_label, second_label_for_save, start_page, pages_done, authors_total, failed_pages)
                  if write_summary_report_fn else None)
        )
        failed_report_path = (
            data_saver.write_failed_pages_report(first_label, second_label_for_save, failed_details)
            if (data_saver and failed_details)
            else (write_failed_pages_report_fn(first_label, second_label_for_save, failed_details)
                  if (write_failed_pages_report_fn and failed_details) else None)
        )
        # 汇总入库
        try:
            if data_saver:
                summary_id = data_saver.save_summary(
                    first_label=first_label,
                    second_label=second_label_for_save,
                    second_ids=second_ids or [],
                    video_type=video_type,
                    start_page=start_page,
                    pages_done=pages_done,
                    authors_total=authors_total,
                    failed_pages=failed_pages,
                    report_path=report_path,
                    started_at=started_at,
                    finished_at=datetime.now(),
                )
                if summary_id is not None:
                    print(
                        f"[summary] saved summary_id={summary_id}, pages_done={pages_done}, authors_total={authors_total}, failed_pages={failed_pages}"
                    )
            elif pg_saver:
                summary_id = pg_saver.save_summary(
                    first_label=first_label,
                    second_label=second_label_for_save,
                    second_ids=second_ids or [],
                    video_type=video_type,
                    start_page=start_page,
                    pages_done=pages_done,
                    authors_total=authors_total,
                    failed_pages=failed_pages,
                    report_path=report_path,
                    started_at=started_at,
                    finished_at=datetime.now(),
                )
                print(
                    f"[summary] saved summary_id={summary_id}, pages_done={pages_done}, authors_total={authors_total}, failed_pages={failed_pages}"
                )
        except Exception as e:
            print(f"[summary-pg-error] 汇总入库失败: {e}")
        return {
            "start_page": start_page,
            "pages_done": pages_done,
            "authors_total": authors_total,
            "failed_pages": failed_pages,
            "report_path": report_path,
            "failed_report_path": failed_report_path,
        }

    # 正常顺序分页模式
    while pages_done < int(max_pages):
        # 跳过已存在成功页（不计入 pages_done）
        if skip_existing and page_has_success_file(output_dir, first_label, second_label_for_save, page):
            print(f"[skip-existing] 已存在成功文件：page={page} -> 跳过")
            page += 1
            continue
        # 实际请求当前页并处理返回
        status, authors_count, data = _process_one_page(page)
        # 智能页数：在首个成功页后依据 total_count/limit 计算并覆盖 max_pages
        if auto_pages and pages_done == 1 and status == 200:
            try:
                pagination_obj = (data or {}).get("pagination", {}) or {}
                limit_from_resp = int(pagination_obj.get("limit", 0) or 0) or int(limit)
                total_count = int(pagination_obj.get("total_count", 0) or 0)
                if limit_from_resp > 0 and total_count > 0:
                    calc_pages = math.ceil(total_count / limit_from_resp)
                    target_pages = max(1, int(calc_pages))
                    if auto_pages_upper_bound is not None:
                        target_pages = min(target_pages, int(auto_pages_upper_bound))
                        cap_str = str(auto_pages_upper_bound)
                    else:
                        target_pages = min(target_pages, int(max_pages))
                        cap_str = str(max_pages)
                    old_max = int(max_pages)
                    max_pages = int(target_pages)
                    print(
                        f"[auto-pages] total_count={total_count}, limit={limit_from_resp} => pages={calc_pages}，应用上限 {cap_str}，最终 max_pages={max_pages}（原 {old_max}）"
                    )
                else:
                    print(
                        f"[auto-pages] 无法计算：total_count={total_count}, limit={limit_from_resp}，维持 max_pages={max_pages}"
                    )
            except Exception as e:
                print(f"[auto-pages] 计算失败：{e}，维持 max_pages={max_pages}")

        # 终止条件判断
        pagination = (data or {}).get("pagination", {}) or {}
        has_more = bool(pagination.get("has_more", False))
        # 连续空页统计
        if authors_count == 0:
            empty_consecutive_count += 1
        else:
            empty_consecutive_count = 0
        # 可选：遇到空作者页提前停止
        if stop_when_empty and authors_count == 0:
            print(f"[stop] page={page} 作者数为 0，已开启 --stop-when-empty，提前停止")
            break
        # 可选：失败率阈值
        try:
            if max_failure_rate is not None and pages_done > 0:
                rate = failed_pages / float(pages_done)
                if rate >= float(max_failure_rate):
                    print(f"[stop] 全局失败率 {rate:.2f} >= 阈值 {max_failure_rate}，提前停止")
                    break
        except Exception:
            pass
        # 可选：连续空页 N 次停止
        try:
            if stop_when_empty_n and int(stop_when_empty_n) > 0 and empty_consecutive_count >= int(stop_when_empty_n):
                print(f"[stop] 连续空页 {empty_consecutive_count} 次，达到阈值 {stop_when_empty_n}，提前停止")
                break
        except Exception:
            pass
        if not has_more:
            print(f"[stop] page={page} has_more=False，结束该标签分页")
            break

        # 限速：固定休眠 + 抖动
        jitter_ms = int(sleep_ms * 0.3 * random.random())
        time.sleep((int(sleep_ms) + jitter_ms) / 1000.0)

        # 下一页
        page += 1
    finished_at = datetime.now()
    # 写入汇总报表与 PG 汇总（优先 DataSaver；回退调用回调；不再本地写文件）
    report_path = (
        data_saver.write_summary_report(
            first_label, second_label_for_save, start_page, pages_done, authors_total, failed_pages
        )
        if data_saver
        else (write_summary_report_fn(first_label, second_label_for_save, start_page, pages_done, authors_total, failed_pages)
              if write_summary_report_fn else None)
    )
    failed_report_path = (
        data_saver.write_failed_pages_report(first_label, second_label_for_save, failed_details)
        if (data_saver and failed_details)
        else (write_failed_pages_report_fn(first_label, second_label_for_save, failed_details)
              if (write_failed_pages_report_fn and failed_details) else None)
    )
    try:
        if data_saver:
            summary_id = data_saver.save_summary(
                first_label=first_label,
                second_label=second_label_for_save,
                second_ids=second_ids or [],
                video_type=video_type,
                start_page=start_page,
                pages_done=pages_done,
                authors_total=authors_total,
                failed_pages=failed_pages,
                report_path=report_path,
                started_at=started_at,
                finished_at=finished_at,
            )
            if summary_id is not None:
                print(
                    f"[summary] saved summary_id={summary_id}, pages_done={pages_done}, authors_total={authors_total}, failed_pages={failed_pages}"
                )
        elif pg_saver:
            summary_id = pg_saver.save_summary(
                first_label=first_label,
                second_label=second_label_for_save,
                second_ids=second_ids or [],
                video_type=video_type,
                start_page=start_page,
                pages_done=pages_done,
                authors_total=authors_total,
                failed_pages=failed_pages,
                report_path=report_path,
                started_at=started_at,
                finished_at=finished_at,
            )
            print(
                f"[summary] saved summary_id={summary_id}, pages_done={pages_done}, authors_total={authors_total}, failed_pages={failed_pages}"
            )
    except Exception as e:
        print(f"[summary-pg-error] 汇总入库失败: {e}")
    return {
        "start_page": start_page,
        "pages_done": pages_done,
        "authors_total": authors_total,
        "failed_pages": failed_pages,
        "report_path": report_path,
        "failed_report_path": failed_report_path,
    }


def select_tags(all_tags, first_label_filter=None, second_label_filter=None, max_count=None):
    selected = []
    for entry in all_tags:
        first = entry.get("first") or {}
        second_list = entry.get("second") or []
        first_label = first.get("label")
        first_id = first.get("id")
        if first_label_filter and first_label not in first_label_filter:
            continue
        if second_list:
            for s in second_list:
                second_label = s.get("label")
                second_id = s.get("id")
                if second_label_filter and second_label not in second_label_filter:
                    continue
                selected.append(
                    {
                        "first_label": first_label,
                        "first_id": first_id,
                        "second_label": second_label,
                        "second_id": second_id,
                    }
                )
        else:
            # Only include top-level when not explicitly filtering by a specific second-level label
            if second_label_filter is None:
                selected.append(
                    {
                        "first_label": first_label,
                        "first_id": first_id,
                        "second_label": None,
                        "second_id": None,
                    }
                )
    if max_count is not None:
        selected = selected[:max_count]
    return selected


# 新增：PG 存储支持（优先使用 db_v2）
try:
    from services.db_v2 import DatabaseServiceV2 as PgSaver
except Exception:
    try:
        from services.db import PgSaver
    except Exception:
        PgSaver = None


def main():
    # 优先使用服务层配置解析器
    service_config_parser_available = False
    try:
        from services.config_parser import ConfigParser as ServiceConfigParser, parse_config as service_parse_config
        service_config_parser_available = True
    except ImportError:
        pass

    # 回退到工具层配置解析器
    if not service_config_parser_available:
        try:
            from services.config_parser import parse_config
        except ImportError:
            print("[error] 无法导入 config_parser，请检查 tools/config_parser.py 或 services/config_parser.py")
            sys.exit(1)

    # 使用配置解析器
    if service_config_parser_available:
        config = service_parse_config()
    else:
        config = parse_config()
    
    # 使用 MainTaskScheduler 执行任务
    try:
        from tools.main_task_scheduler import MainTaskScheduler
    except ImportError:
        print("[error] 无法导入 MainTaskScheduler，请检查 tools/main_task_scheduler.py")
        sys.exit(1)
    
    scheduler = MainTaskScheduler()
    scheduler.run(config)


if __name__ == "__main__":
    main()
