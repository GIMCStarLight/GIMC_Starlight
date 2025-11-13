#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""AuthorFetcher

提供对作者广场分页抓取的类封装，使任务逻辑与持久化/策略层解耦。

当前实现作为薄封装，内部委托现有的函数 `fetch_author_square_by_tags.fetch_pages`
以保持完全的 API 与行为兼容。后续可逐步将分页/重试/错误处理迁移到本类中。
"""

from __future__ import annotations

from typing import Optional, List, Tuple, Callable
import time
import random

try:
    # 复用现有模块中的实现与常量
    import fetch_author_square_by_tags as by_tags
except Exception:
    # 兼容直接从 task_control/tools 下运行
    import sys
    from pathlib import Path

    HERE = Path(__file__).resolve().parent
    PARENT = HERE.parent
    if str(PARENT) not in sys.path:
        sys.path.insert(0, str(PARENT))
    import fetch_author_square_by_tags as by_tags  # type: ignore


class AuthorFetcher:
    """封装作者广场的分页抓取过程。

    设计目标：
    - 将抓取任务的控制流抽象为类，便于后续扩展（如中途暂停/恢复、状态注入等）；
    - 与持久化层（DataSaver）与策略层（AdaptiveQpsPolicy）解耦；
    - 目前作为薄包装，直接调用既有函数，确保无缝兼容。
    """

    def run(
        self,
        *,
        headers: dict,
        base_payload: dict,
        start_page: int,
        max_pages: int,
        output_dir: str,
        first_label: str,
        second_label_for_save: str,
        second_ids: Optional[List[int]],
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
        only_pages: Optional[List[int]] = None,
        limiter: object | None = None,
        cooldown_on_429_403_ms: int | None = None,
        max_failure_rate: float | None = None,
        stop_when_empty_n: int | None = None,
        max_consecutive_401: int | None = None,
        pause_on_401_ms: int | None = None,
        logger: object | None = None,
        use_internal_engine: bool = False,
        save_page_fn: Callable | None = None,
        write_summary_report_fn: Callable | None = None,
        write_failed_pages_report_fn: Callable | None = None,
    ) -> dict:
        """执行分页抓取并返回汇总结果。

        参数与返回值完全对齐 `by_tags.fetch_pages`，以保证兼容性。
        """
        # 可选：内部执行引擎（预备迁移，不影响现有行为；默认关闭）
        if use_internal_engine:
            return self._run_internal(
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
                save_page_fn=save_page_fn,
                write_summary_report_fn=write_summary_report_fn,
                write_failed_pages_report_fn=write_failed_pages_report_fn,
            )

        return by_tags.fetch_pages(
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
            save_page_fn=save_page_fn,
            write_summary_report_fn=write_summary_report_fn,
            write_failed_pages_report_fn=write_failed_pages_report_fn,
        )

    def _request_once_with_controls(
        self,
        headers: dict,
        payload: dict,
        *,
        retry_max: int,
        retry_backoff_ms: int,
        cooldown_on_429_403_ms: int | None,
        max_consecutive_401: int | None,
        pause_on_401_ms: int | None,
        logger: object | None = None,
    ) -> Tuple[int, Optional[str], dict | None]:
        """请求一次，带重试/冷却/暂停控制（薄封装）。

        仅用于内部引擎；默认不改变 by_tags.fetch_pages 的行为。
        """
        consecutive_401 = 0
        attempts = 0
        last_err = None
        while True:
            attempts += 1
            status, err, data = by_tags.request_once(headers=headers, payload=payload, timeout=20, session=None)
            last_err = err
            # 429/403：冷却后重试
            if status in (429, 403):
                if logger:
                    try:
                        logger.warning(f"429/403，冷却 {cooldown_on_429_403_ms}ms 后重试")
                    except Exception:
                        pass
                if cooldown_on_429_403_ms and cooldown_on_429_403_ms > 0:
                    time.sleep(cooldown_on_429_403_ms / 1000.0)
                # 不计入重试次数（或计入，视策略，这里计入）
                if attempts <= max(0, int(retry_max)):
                    backoff = (retry_backoff_ms or 0) * max(0, attempts - 1)
                    if backoff > 0:
                        time.sleep(backoff / 1000.0)
                    continue
                return status, err, data
            # 401：可选暂停并统计连续次数
            if status == 401:
                consecutive_401 += 1
                if pause_on_401_ms and pause_on_401_ms > 0:
                    time.sleep(pause_on_401_ms / 1000.0)
                if max_consecutive_401 and consecutive_401 >= max_consecutive_401:
                    return status, err, data
                # 允许重试
                if attempts <= max(0, int(retry_max)):
                    backoff = (retry_backoff_ms or 0) * max(0, attempts - 1)
                    if backoff > 0:
                        time.sleep(backoff / 1000.0)
                    continue
                return status, err, data
            # 5xx：指数退避重试
            if status >= 500 and attempts <= max(0, int(retry_max)):
                backoff = (retry_backoff_ms or 0) * max(1, attempts)
                if backoff > 0:
                    time.sleep(backoff / 1000.0)
                continue
            # 其他：返回
            return status, err, data

    def _run_internal(
        self,
        *,
        headers: dict,
        base_payload: dict,
        start_page: int,
        max_pages: int,
        output_dir: str,
        first_label: str,
        second_label_for_save: str,
        second_ids: Optional[List[int]],
        video_type: str,
        limit: int,
        min_price: int,
        stop_when_empty: bool,
        sleep_ms: int,
        retry_max: int,
        retry_backoff_ms: int,
        pg_saver,
        data_saver: object | None,
        auto_pages: bool,
        auto_pages_upper_bound: int | None,
        skip_existing: bool,
        only_pages: Optional[List[int]],
        limiter: object | None,
        cooldown_on_429_403_ms: int | None,
        max_failure_rate: float | None,
        stop_when_empty_n: int | None,
        max_consecutive_401: int | None,
        pause_on_401_ms: int | None,
        logger: object | None,
        save_page_fn: Callable | None = None,
        write_summary_report_fn: Callable | None = None,
        write_failed_pages_report_fn: Callable | None = None,
    ) -> dict:
        """内部执行引擎：最小可用实现，保持返回结构一致。

        说明：该路径仅用于后续迁移验证；默认不启用。
        功能覆盖：顺序分页、空页提前停止（或 N 次）、失败率阈值基础检查、可选 DataSaver/PG 保存。
        """
        pages_done = 0
        authors_total = 0
        failed_pages = 0
        failed_details: List[dict] = []
        started_at = time.time()

        def _sleep(ms: int):
            if ms and ms > 0:
                time.sleep(ms / 1000.0)

        # 分支1：仅重跑指定页
        if only_pages and len(only_pages) > 0:
            unique_pages = sorted({int(p) for p in only_pages if p is not None})
            failed_details: List[dict] = []
            consecutive_empty = 0
            for page in unique_pages:
                # 跳过已存在成功文件（不计入 pages_done）
                try:
                    if skip_existing and by_tags.page_has_success_file(output_dir, first_label, second_label_for_save, int(page)):
                        if logger:
                            try:
                                logger.info(f"[skip-existing] 已存在成功文件：page={page} -> 跳过")
                            except Exception:
                                pass
                        # 固定休眠 + 抖动
                        jitter_ms = int(sleep_ms * 0.3 * random.random())
                        time.sleep((int(sleep_ms) + jitter_ms) / 1000.0)
                        continue
                except Exception:
                    pass

                # limiter 控制
                try:
                    if limiter and hasattr(limiter, "acquire"):
                        limiter.acquire()
                except Exception:
                    pass
                # 固定休眠
                if sleep_ms and sleep_ms > 0:
                    time.sleep(sleep_ms / 1000.0)

                # 构造 payload
                payload = dict(base_payload or {})
                page_param = dict(payload.get("page_param", {}))
                page_param["page"] = int(page)
                page_param["limit"] = int(limit)
                payload["page_param"] = page_param

                status, err, data = self._request_once_with_controls(
                    headers=headers,
                    payload=payload,
                    retry_max=retry_max,
                    retry_backoff_ms=retry_backoff_ms,
                    cooldown_on_429_403_ms=cooldown_on_429_403_ms,
                    max_consecutive_401=max_consecutive_401,
                    pause_on_401_ms=pause_on_401_ms,
                    logger=logger,
                )

                if status == 200 and isinstance(data, dict):
                    authors_count = int(len(data.get("authors", []) or []))
                    authors_total += authors_count
                    pages_done += 1
                    # 连续空页统计
                    if authors_count == 0:
                        consecutive_empty += 1
                    else:
                        consecutive_empty = 0

                    # 保存数据
                    try:
                        if data_saver:
                            _ = data_saver.save_page(
                                first_label=first_label,
                                second_label=second_label_for_save,
                                page=int(page),
                                data=data,
                                request_payload=payload,
                            )
                        elif save_page_fn:
                            _ = save_page_fn(
                                output_dir, first_label, second_label_for_save, int(page), data, request_payload=payload
                            )
                    except Exception:
                        pass

                    # 可选 PG 入库（与 DataSaver 路径一致，异常忽略）
                    try:
                        if data_saver:
                            x_tt_agw_login = None
                            try:
                                x_tt_agw_login = headers.get("X-Tt-Agw-Login")
                            except Exception:
                                x_tt_agw_login = None
                            data_saver.save_run_and_authors(
                                first_label=first_label,
                                second_label=second_label_for_save,
                                second_ids=second_ids or [],
                                video_type=video_type,
                                page=int(page),
                                limit=int(limit),
                                min_price=int(min_price),
                                x_tt_agw_login=x_tt_agw_login,
                                request_payload=payload,
                                response=data,
                            )
                    except Exception:
                        pass
                else:
                    failed_pages += 1
                    failed_details.append({"page": int(page), "status": int(status), "error": err or ""})

                # 失败重跑模式不考虑 has_more/auto-pages，按名单完成；每页后抖动休眠
                jitter_ms = int(sleep_ms * 0.3 * random.random())
                time.sleep((int(sleep_ms) + jitter_ms) / 1000.0)

            # 报表与入库
            report_path = None
            failed_report_path = None
            try:
                if data_saver:
                    report_path = data_saver.write_summary_report(
                        first_label=first_label,
                        second_label=second_label_for_save,
                        start_page=int(start_page),
                        pages_done=int(pages_done),
                        authors_total=int(authors_total),
                        failed_pages=int(failed_pages),
                    )
                elif write_summary_report_fn:
                    report_path = write_summary_report_fn(
                        first_label, second_label_for_save, int(start_page), int(pages_done), int(authors_total), int(failed_pages)
                    )
            except Exception:
                report_path = None
            try:
                if failed_pages > 0:
                    if data_saver:
                        failed_report_path = data_saver.write_failed_pages_report(
                            first_label=first_label,
                            second_label=second_label_for_save,
                            failed_details=failed_details,
                        )
                    elif write_failed_pages_report_fn:
                        failed_report_path = write_failed_pages_report_fn(
                            first_label, second_label_for_save, failed_details
                        )
            except Exception:
                failed_report_path = None

            finished_at = time.time()
            # 汇总入库
            try:
                if data_saver and (report_path or "" != ""):
                    data_saver.save_summary(
                        first_label=first_label,
                        second_label=second_label_for_save,
                        second_ids=second_ids or [],
                        video_type=video_type,
                        start_page=int(start_page),
                        pages_done=int(pages_done),
                        authors_total=int(authors_total),
                        failed_pages=int(failed_pages),
                        report_path=report_path or "",
                        started_at=time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(started_at)),
                        finished_at=time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(finished_at)),
                    )
                elif pg_saver:
                    pg_saver.save_summary(
                        first_label=first_label,
                        second_label=second_label_for_save,
                        second_ids=second_ids or [],
                        video_type=video_type,
                        start_page=int(start_page),
                        pages_done=int(pages_done),
                        authors_total=int(authors_total),
                        failed_pages=int(failed_pages),
                        report_path=report_path or "",
                        started_at=time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(started_at)),
                        finished_at=time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(finished_at)),
                    )
            except Exception:
                pass

            return {
                "start_page": int(start_page),
                "pages_done": int(pages_done),
                "authors_total": int(authors_total),
                "failed_pages": int(failed_pages),
                "report_path": report_path,
                "failed_report_path": failed_report_path,
            }

        # 分支2：正常顺序分页模式
        consecutive_empty = 0
        page = int(start_page)
        failed_details: List[dict] = []
        # 顺序分页，最多跑到 max_pages（auto_pages 可能覆盖）
        while pages_done < int(max_pages):
            # limiter 控制
            try:
                if limiter:
                    limiter.acquire()
            except Exception:
                pass
            # 跳过已存在成功页（不计入 pages_done）
            try:
                if skip_existing and by_tags.page_has_success_file(output_dir, first_label, second_label_for_save, int(page)):
                    if logger:
                        try:
                            logger.info(f"[skip-existing] 已存在成功文件：page={page} -> 跳过")
                        except Exception:
                            pass
                    page += 1
                    continue
            except Exception:
                pass

            _sleep(sleep_ms)

            # 构造 payload（薄封装）
            payload = dict(base_payload or {})
            page_param = dict(payload.get("page_param", {}))
            page_param["page"] = int(page)
            page_param["limit"] = int(limit)
            payload["page_param"] = page_param

            status, err, data = self._request_once_with_controls(
                headers=headers,
                payload=payload,
                retry_max=retry_max,
                retry_backoff_ms=retry_backoff_ms,
                cooldown_on_429_403_ms=cooldown_on_429_403_ms,
                max_consecutive_401=max_consecutive_401,
                pause_on_401_ms=pause_on_401_ms,
                logger=logger,
            )

            if status == 200 and isinstance(data, dict):
                authors_count = int(len(data.get("authors", []) or []))
                authors_total += authors_count
                pages_done += 1
                # 空页控制
                if authors_count == 0:
                    consecutive_empty += 1
                    if stop_when_empty or (stop_when_empty_n and consecutive_empty >= stop_when_empty_n):
                        break
                else:
                    consecutive_empty = 0

                # 智能页数：在首个成功页后依据 total_count/limit 计算并覆盖 max_pages
                if auto_pages and pages_done == 1:
                    try:
                        pagination_obj = (data or {}).get("pagination", {}) or {}
                        limit_from_resp = int(pagination_obj.get("limit", 0) or 0) or int(limit)
                        total_count = int(pagination_obj.get("total_count", 0) or 0)
                        if limit_from_resp > 0 and total_count > 0:
                            calc_pages = (total_count + limit_from_resp - 1) // limit_from_resp
                            target_pages = max(1, int(calc_pages))
                            if auto_pages_upper_bound is not None:
                                target_pages = min(target_pages, int(auto_pages_upper_bound))
                            else:
                                target_pages = min(target_pages, int(max_pages))
                            max_pages = int(target_pages)
                            if logger:
                                try:
                                    logger.info(
                                        f"[auto-pages] total_count={total_count}, limit={limit_from_resp} => pages={calc_pages}，最终 max_pages={max_pages}"
                                    )
                                except Exception:
                                    pass
                    except Exception:
                        pass

                # 保存数据（优先 DataSaver，回退到注入的回调；不直接本地写文件）
                fp = None
                try:
                    if data_saver:
                        fp = data_saver.save_page(
                            first_label=first_label,
                            second_label=second_label_for_save,
                            page=int(page),
                            data=data,
                            request_payload=payload,
                        )
                    elif save_page_fn:
                        fp = save_page_fn(
                            output_dir, first_label, second_label_for_save, int(page), data, request_payload=payload
                        )
                except Exception as e:
                    # 文件保存失败不影响统计
                    if logger:
                        try:
                            logger.warning(f"保存文件失败: {e}")
                        except Exception:
                            pass

                # 可选 PG 入库
                try:
                    if data_saver:
                        x_tt_agw_login = None
                        try:
                            x_tt_agw_login = headers.get("X-Tt-Agw-Login")
                        except Exception:
                            x_tt_agw_login = None
                        data_saver.save_run_and_authors(
                            first_label=first_label,
                            second_label=second_label_for_save,
                            second_ids=second_ids or [],
                            video_type=video_type,
                            page=int(page),
                            limit=int(limit),
                            min_price=int(min_price),
                            x_tt_agw_login=x_tt_agw_login,
                            request_payload=payload,
                            response=data,
                        )
                except Exception:
                    pass

            else:
                failed_pages += 1
                failed_details.append({"page": int(page), "status": int(status), "error": err or ""})
                # 失败率提前停止
                if max_failure_rate:
                    processed = max(1, pages_done + failed_pages)
                    rate = failed_pages / float(processed)
                    if rate >= max_failure_rate:
                        break

            # 终止条件判断：has_more
            try:
                pagination = (data or {}).get("pagination", {}) if isinstance(data, dict) else {}
                has_more = bool(pagination.get("has_more", False))
                if not has_more:
                    break
            except Exception:
                pass

            # 限速：固定休眠 + 抖动
            jitter_ms = int(sleep_ms * 0.3 * random.random())
            time.sleep((int(sleep_ms) + jitter_ms) / 1000.0)

            # 下一页
            page += 1

        # 汇总与失败报表（优先 DataSaver，回退到注入回调；不直接写文件）
        report_path = None
        failed_report_path = None
        try:
            if data_saver:
                report_path = data_saver.write_summary_report(
                    first_label=first_label,
                    second_label=second_label_for_save,
                    start_page=int(start_page),
                    pages_done=int(pages_done),
                    authors_total=int(authors_total),
                    failed_pages=int(failed_pages),
                )
            elif write_summary_report_fn:
                report_path = write_summary_report_fn(
                    first_label, second_label_for_save, int(start_page), int(pages_done), int(authors_total), int(failed_pages)
                )
        except Exception:
            report_path = None
        try:
            if failed_details:
                if data_saver:
                    failed_report_path = data_saver.write_failed_pages_report(
                        first_label=first_label,
                        second_label=second_label_for_save,
                        failed_details=failed_details,
                    )
                elif write_failed_pages_report_fn:
                    failed_report_path = write_failed_pages_report_fn(
                        first_label, second_label_for_save, failed_details
                    )
        except Exception:
            failed_report_path = None

        finished_at = time.time()
        # 可选 PG：写入汇总
        try:
            if data_saver and (report_path or "" != ""):
                data_saver.save_summary(
                    first_label=first_label,
                    second_label=second_label_for_save,
                    second_ids=second_ids or [],
                    video_type=video_type,
                    start_page=int(start_page),
                    pages_done=int(pages_done),
                    authors_total=int(authors_total),
                    failed_pages=int(failed_pages),
                    report_path=report_path or "",
                    started_at=time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(started_at)),
                    finished_at=time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(finished_at)),
                )
            elif pg_saver:
                pg_saver.save_summary(
                    first_label=first_label,
                    second_label=second_label_for_save,
                    second_ids=second_ids or [],
                    video_type=video_type,
                    start_page=int(start_page),
                    pages_done=int(pages_done),
                    authors_total=int(authors_total),
                    failed_pages=int(failed_pages),
                    report_path=report_path or "",
                    started_at=time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(started_at)),
                    finished_at=time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(finished_at)),
                )
        except Exception:
            pass

        return {
            "start_page": int(start_page),
            "pages_done": int(pages_done),
            "authors_total": int(authors_total),
            "failed_pages": int(failed_pages),
            "report_path": report_path,
            "failed_report_path": failed_report_path,
        }