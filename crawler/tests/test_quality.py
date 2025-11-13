import json
import os
import time
from pathlib import Path


def test_timewindow_qps_limiter_basic():
    from services.rate_limiter import TimeWindowQPSLimiter

    limiter = TimeWindowQPSLimiter(qps=2, window_ms=200)
    t0 = time.time()
    for _ in range(4):
        limiter.acquire()
    elapsed = time.time() - t0
    # 第3次调用应等待约一个窗口，留出一定误差
    assert elapsed >= 0.18


def test_load_failed_pages(tmp_path: Path):
    from fetch_author_square_by_tags import sanitize_label
    from tools.task_scheduler import _load_failed_pages

    reports_dir = tmp_path
    first = "生活"
    second = "好物推荐"
    s1 = sanitize_label(first)
    s2 = sanitize_label(second)

    # 较早的文件（不应被选用）
    fp_old = reports_dir / f"failed_pages_{s1}_{s2}_20240101_000000.json"
    with open(fp_old, "w", encoding="utf-8") as f:
        json.dump({"failed_pages": [{"page": 1}, {"page": 2}]}, f, ensure_ascii=False)
    os.utime(fp_old, (time.time() - 1000, time.time() - 1000))

    # 最新文件（应被选用）
    fp_new = reports_dir / f"failed_pages_{s1}_{s2}_20240202_000000.json"
    with open(fp_new, "w", encoding="utf-8") as f:
        json.dump({"failed_pages": [{"page": 2}, {"page": 3}, {"page": 3}]}, f, ensure_ascii=False)

    pages = _load_failed_pages(first, second, str(reports_dir))
    assert pages == [2, 3]


def test_fetch_pages_stop_when_empty(tmp_path: Path):
    import task_control.fetch_author_square_by_tags as mod
    from fetch_author_square_by_tags import fetch_pages

    # stub: 模拟请求按页返回作者数与分页
    def stub_request_once(headers: dict, payload: dict, timeout: int = 20, session=None):
        page = payload.get("page_param", {}).get("page", 1)
        if page == 1:
            data = {"authors": [], "pagination": {"has_more": True, "limit": 20, "total_count": 40}}
        else:
            data = {
                "authors": [{"id": i} for i in range(5)],
                "pagination": {"has_more": True, "limit": 20, "total_count": 40},
            }
        return 200, None, data

    # stub: 保存响应到临时目录
    def stub_save_response(
        base_dir: str, first_label: str, second_label: str, page: int, data: dict, request_payload: dict | None = None
    ):
        out_dir = Path(base_dir) / mod.sanitize_label(first_label) / mod.sanitize_label(second_label)
        out_dir.mkdir(parents=True, exist_ok=True)
        fp = out_dir / f"author_square_page_{page}_stub.json"
        with open(fp, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)
        return str(fp)

    # monkeypatch
    old_request_once = mod.request_once
    old_save_response = mod.save_response
    try:
        mod.request_once = stub_request_once
        mod.save_response = stub_save_response

        headers = {"Cookie": "stub"}
        payload = {"page_param": {"page": 1}}
        ret = fetch_pages(
            headers=headers,
            base_payload=payload,
            start_page=1,
            max_pages=10,
            output_dir=str(tmp_path),
            first_label="生活",
            second_label_for_save="好物推荐",
            second_ids=None,
            video_type="2",
            limit=20,
            min_price=0,
            stop_when_empty=True,
            sleep_ms=10,
            retry_max=0,
            retry_backoff_ms=1,
            pg_saver=None,
            auto_pages=False,
            auto_pages_upper_bound=None,
            skip_existing=False,
            only_pages=None,
            limiter=None,
            cooldown_on_429_403_ms=None,
            max_failure_rate=None,
            stop_when_empty_n=None,
            max_consecutive_401=None,
            pause_on_401_ms=None,
            logger=None,
        )
        assert ret["pages_done"] == 1
        assert ret["authors_total"] == 0
        assert ret["failed_pages"] == 0
    finally:
        mod.request_once = old_request_once
        mod.save_response = old_save_response


def test_fetch_pages_max_failure_rate(tmp_path: Path):
    import task_control.fetch_author_square_by_tags as mod
    from fetch_author_square_by_tags import fetch_pages

    # 返回 500，无重试
    def stub_request_once(headers: dict, payload: dict, timeout: int = 20, session=None):
        data = {"authors": [], "pagination": {"has_more": True, "limit": 20, "total_count": 40}}
        return 500, None, data

    def stub_save_response(
        base_dir: str, first_label: str, second_label: str, page: int, data: dict, request_payload: dict | None = None
    ):
        out_dir = Path(base_dir) / mod.sanitize_label(first_label) / mod.sanitize_label(second_label)
        out_dir.mkdir(parents=True, exist_ok=True)
        fp = out_dir / f"author_square_page_{page}_stub.json"
        with open(fp, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)
        return str(fp)

    old_request_once = mod.request_once
    old_save_response = mod.save_response
    try:
        mod.request_once = stub_request_once
        mod.save_response = stub_save_response
        headers = {"Cookie": "stub"}
        payload = {"page_param": {"page": 1}}
        ret = fetch_pages(
            headers=headers,
            base_payload=payload,
            start_page=1,
            max_pages=10,
            output_dir=str(tmp_path),
            first_label="生活",
            second_label_for_save="好物推荐",
            second_ids=None,
            video_type="2",
            limit=20,
            min_price=0,
            stop_when_empty=False,
            sleep_ms=10,
            retry_max=0,
            retry_backoff_ms=1,
            pg_saver=None,
            auto_pages=False,
            auto_pages_upper_bound=None,
            skip_existing=False,
            only_pages=None,
            limiter=None,
            cooldown_on_429_403_ms=None,
            max_failure_rate=0.5,
            stop_when_empty_n=None,
            max_consecutive_401=None,
            pause_on_401_ms=None,
            logger=None,
        )
        assert ret["pages_done"] == 1
        assert ret["failed_pages"] == 1
    finally:
        mod.request_once = old_request_once
        mod.save_response = old_save_response
