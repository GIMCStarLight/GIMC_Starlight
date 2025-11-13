"""
任务调度与编排服务

提供任务调度、时间窗控制、QPS限速、自适应策略应用等功能的统一服务层。
"""

import time
from typing import Optional, List, Tuple, Dict, Any, Callable
from collections import deque
import threading
import re
import os
import json
import glob


class TimeWindowQPSLimiter:
    """域级QPS限速器（窗口内最多N次）：线程安全"""
    
    def __init__(self, qps: int, window_ms: int = 1000):
        self.qps = max(1, int(qps))
        self.window_ms = max(1, int(window_ms))
        self._lock = threading.Lock()
        self._times = deque()

    def acquire(self):
        """获取请求许可，如果超过QPS限制则阻塞等待"""
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


class TimeWindowManager:
    """时间窗管理器"""
    
    @staticmethod
    def parse_time_window(s: str) -> Optional[Tuple[int, int]]:
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

    @staticmethod
    def is_in_window(win: Optional[Tuple[int, int]]) -> bool:
        """检查当前时间是否在指定时间窗内"""
        if not win:
            return True
        
        lt = time.localtime()
        cur = lt.tm_hour * 60 + lt.tm_min
        s, e = win
        if s <= e:
            return s <= cur < e
        # 跨日：例如 22:00-02:00
        return cur >= s or cur < e

    @staticmethod
    def sleep_until_window(win: Optional[Tuple[int, int]]) -> None:
        """等待直到进入指定时间窗"""
        if not win:
            return
        
        while not TimeWindowManager.is_in_window(win):
            time.sleep(30)  # 30s 检查一次


class TaskOrchestrator:
    """任务编排器"""
    
    @staticmethod
    def apply_adaptive_after_run(policy, limiter, summary: dict):
        """在一次分页结束后应用自适应QPS调整"""
        if not (policy and limiter):
            return
        try:
            next_qps = policy.adjust(
                pages_done=int(summary.get("pages_done", 0) or 0),
                failed_pages=int(summary.get("failed_pages", 0) or 0),
                authors_total=int(summary.get("authors_total", 0) or 0),
            )
            limiter.qps = max(1, int(next_qps))
            print(f"[adaptive-qps] 根据本次结果调整QPS至 {limiter.qps}")
        except Exception as e:
            print(f"[adaptive-qps-warn] 调整失败: {e}")

    @staticmethod
    def orchestrate_labels_run(
        *,
        fetch_fn: Callable,
        headers: dict,
        payload: dict,
        args,
        first_label: str,
        second_label_for_save: str,
        second_ids: Optional[List[int]],
        limiter,
        pg_saver,
        data_saver,
        only_pages: Optional[List[int]] = None,
        logger: Optional[object] = None,
        time_window_win: Optional[Tuple[int, int]] = None,
        policy: Optional[object] = None,
        save_page_fn: Optional[Callable] = None,
        write_summary_report_fn: Optional[Callable] = None,
        write_failed_pages_report_fn: Optional[Callable] = None,
    ) -> dict:
        """统一编排一次标签抓取：时间窗 gating + 执行 + 自适应调整"""
        # gating 到时间窗
        try:
            if time_window_win:
                TimeWindowManager.sleep_until_window(time_window_win)
        except Exception:
            pass
        
        # 执行分页抓取
        summary = fetch_fn(
            headers=headers,
            payload=payload,
            args=args,
            first_label=first_label,
            second_label_for_save=second_label_for_save,
            second_ids=second_ids,
            limiter=limiter,
            pg_saver=pg_saver,
            data_saver=data_saver,
            only_pages=only_pages,
            logger=logger,
            save_page_fn=save_page_fn,
            write_summary_report_fn=write_summary_report_fn,
            write_failed_pages_report_fn=write_failed_pages_report_fn,
        )
        
        # 应用自适应策略
        TaskOrchestrator.apply_adaptive_after_run(policy, limiter, summary)
        return summary


class FailedPagesLoader:
    """失败页面加载器"""
    
    @staticmethod
    def load_failed_pages(first_label: str, second_label: str, reports_dir: str) -> List[int]:
        """加载指定标签的失败页面列表"""
        try:
            from fetch_author_square_by_tags import sanitize_label
            
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


class PageStatusChecker:
    """页面状态检查器"""
    
    @staticmethod
    def _page_dir(base_dir: str, first_label: str, second_label: str) -> str:
        """获取页面存储目录"""
        try:
            from fetch_author_square_by_tags import sanitize_label
            d1 = sanitize_label(first_label) if first_label else "_no_first_"
            d2 = sanitize_label(second_label) if second_label else "_first_only_"
            return os.path.join(base_dir, d1, d2)
        except Exception:
            return os.path.join(base_dir, first_label or "_no_first_", second_label or "_first_only_")

    @staticmethod
    def page_has_success_file(base_dir: str, first_label: str, second_label: str, page: int) -> bool:
        """检查指定页面是否已有成功文件"""
        target_dir = PageStatusChecker._page_dir(base_dir, first_label, second_label)
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

    @staticmethod
    def get_last_success_page(base_dir: str, first_label: str, second_label: str) -> Optional[int]:
        """获取最后一个成功页面的页码"""
        target_dir = PageStatusChecker._page_dir(base_dir, first_label, second_label)
        if not os.path.exists(target_dir):
            return None
        last = None
        try:
            for f in os.listdir(target_dir):
                m = re.match(r"^author_square_page_(\d+)_", f)
                if not m:
                    continue
                p = int(m.group(1))
                if PageStatusChecker.page_has_success_file(base_dir, first_label, second_label, p):
                    if last is None or p > last:
                        last = p
        except Exception:
            pass
        return last


# 便捷函数
def create_qps_limiter(qps: int, window_ms: int = 1000) -> TimeWindowQPSLimiter:
    """创建QPS限速器"""
    return TimeWindowQPSLimiter(qps=qps, window_ms=window_ms)


def create_time_window_manager() -> TimeWindowManager:
    """创建时间窗管理器"""
    return TimeWindowManager()


def create_task_orchestrator() -> TaskOrchestrator:
    """创建任务编排器"""
    return TaskOrchestrator()


def create_failed_pages_loader() -> FailedPagesLoader:
    """创建失败页面加载器"""
    return FailedPagesLoader()


def create_page_status_checker() -> PageStatusChecker:
    """创建页面状态检查器"""
    return PageStatusChecker()


# 兼容性函数，保持与原始 by_tags_orchestrator 的接口一致
def _is_in_window(win: Optional[Tuple[int, int]]) -> bool:
    """兼容性函数：检查当前时间是否在指定时间窗内"""
    return TimeWindowManager.is_in_window(win)


def _sleep_until_window(win: Optional[Tuple[int, int]]) -> None:
    """兼容性函数：等待直到进入指定时间窗"""
    TimeWindowManager.sleep_until_window(win)


def apply_adaptive_after_run(policy, limiter, summary: dict):
    """兼容性函数：在一次分页结束后应用自适应QPS调整"""
    TaskOrchestrator.apply_adaptive_after_run(policy, limiter, summary)


def orchestrate_labels_run(
    *,
    fetch_fn,
    headers: dict,
    payload: dict,
    args,
    first_label: str,
    second_label_for_save: str,
    second_ids: Optional[List[int]],
    limiter,
    pg_saver,
    data_saver,
    only_pages: Optional[List[int]] = None,
    logger: object | None = None,
    time_window_win: Optional[Tuple[int, int]] = None,
    policy: object | None = None,
    save_page_fn=None,
    write_summary_report_fn=None,
    write_failed_pages_report_fn=None,
):
    """兼容性函数：统一编排一次标签抓取"""
    return TaskOrchestrator.orchestrate_labels_run(
        fetch_fn=fetch_fn,
        headers=headers,
        payload=payload,
        args=args,
        first_label=first_label,
        second_label_for_save=second_label_for_save,
        second_ids=second_ids,
        limiter=limiter,
        pg_saver=pg_saver,
        data_saver=data_saver,
        only_pages=only_pages,
        logger=logger,
        time_window_win=time_window_win,
        policy=policy,
        save_page_fn=save_page_fn,
        write_summary_report_fn=write_summary_report_fn,
        write_failed_pages_report_fn=write_failed_pages_report_fn,
    )