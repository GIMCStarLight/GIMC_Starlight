from typing import Optional, List, Tuple


def _is_in_window(win: Optional[Tuple[int, int]]) -> bool:
    if not win:
        return True
    import time

    lt = time.localtime()
    cur = lt.tm_hour * 60 + lt.tm_min
    s, e = win
    if s <= e:
        return s <= cur < e
    return cur >= s or cur < e


def _sleep_until_window(win: Optional[Tuple[int, int]]) -> None:
    if not win:
        return
    import time

    while not _is_in_window(win):
        time.sleep(10)
        if _is_in_window(win):
            break


def apply_adaptive_after_run(policy, limiter, summary: dict):
    """在一次分页结束后应用自适应QPS调整。"""
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
    """统一编排一次标签抓取：时间窗 gating + 执行 + 自适应调整。"""
    # gating 到时间窗
    try:
        if time_window_win:
            _sleep_until_window(time_window_win)
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
    apply_adaptive_after_run(policy, limiter, summary)
    return summary