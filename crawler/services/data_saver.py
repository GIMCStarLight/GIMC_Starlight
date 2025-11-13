import copy
import hashlib
import json
import os
from datetime import datetime
from typing import Optional


def _sanitize_label(label: str) -> str:
    try:
        s = str(label or "").strip()
        s = s.replace("/", "_")
        s = s.replace(" ", "_")
        return s
    except Exception:
        return str(label) if label is not None else ""


def _compute_payload_hash(payload: dict) -> str:
    try:
        canonical = json.dumps(payload or {}, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    except Exception:
        canonical = str(payload)
    h = hashlib.sha1()
    h.update(canonical.encode("utf-8"))
    return h.hexdigest()


class DataSaver:
    """Handles persistence concerns: saving files and writing to PostgreSQL via PgSaver.

    Designed to decouple IO from crawling logic.
    """

    def __init__(self, output_dir: str, report_dir: str, pg_saver: Optional[object] = None, logger: Optional[object] = None):
        self.output_dir = output_dir
        self.report_dir = report_dir
        self.pg_saver = pg_saver
        self.logger = logger

    # File persistence
    def save_page(self, first_label: str, second_label: str, page: int, data: dict, request_payload: Optional[dict] = None) -> str:
        dt = datetime.now().strftime("%Y%m%d_%H%M%S")
        first_dir = os.path.join(self.output_dir, _sanitize_label(first_label) if first_label else "_no_first_")
        second_dir = os.path.join(first_dir, _sanitize_label(second_label) if second_label else "_first_only_")
        os.makedirs(second_dir, exist_ok=True)
        fname = os.path.join(second_dir, f"author_square_page_{int(page)}_{dt}.json")
        to_write = copy.deepcopy(data or {})
        try:
            if request_payload is not None:
                to_write["request_payload_hash"] = _compute_payload_hash(request_payload)
        except Exception:
            pass
        with open(fname, "w", encoding="utf-8") as f:
            json.dump(to_write, f, ensure_ascii=False, indent=2)
        return fname

    def write_summary_report(self, first_label: str, second_label: str, start_page: int, pages_done: int, authors_total: int, failed_pages: int) -> str:
        os.makedirs(self.report_dir, exist_ok=True)
        dt = datetime.now().strftime("%Y%m%d_%H%M%S")
        fname = os.path.join(
            self.report_dir,
            f"summary_{_sanitize_label(first_label)}_{_sanitize_label(second_label) if second_label else '_first_only_'}_{dt}.json",
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

    def write_failed_pages_report(self, first_label: str, second_label: str, failed_details: list[dict]) -> str:
        os.makedirs(self.report_dir, exist_ok=True)
        dt = datetime.now().strftime("%Y%m%d_%H%M%S")
        fname = os.path.join(
            self.report_dir,
            f"failed_pages_{_sanitize_label(first_label)}_{_sanitize_label(second_label) if second_label else '_first_only_'}_{dt}.json",
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

    # PostgreSQL persistence via PgSaver or DatabaseServiceV2
    def save_run_and_authors(
        self,
        *,
        first_label: str,
        second_label: str,
        second_ids: list[int] | None,
        video_type: str,
        page: int,
        limit: int,
        min_price: int,
        x_tt_agw_login: str | None,
        request_payload: dict,
        response: dict,
    ) -> Optional[int]:
        if not self.pg_saver:
            return None
        
        # 检查是否使用新的 db_v2
        if hasattr(self.pg_saver, 'save_run_and_authors_v2'):
            try:
                run_id, success, failed = self.pg_saver.save_run_and_authors_v2(
                    first_label=first_label,
                    second_label=second_label,
                    second_ids=second_ids or [],
                    video_type=video_type,
                    page=page,
                    limit=limit,
                    min_price=min_price,
                    x_tt_agw_login=x_tt_agw_login,
                    request_payload=request_payload,
                    response=response,
                )
                if self.logger:
                    self.logger.info(f"[db_v2] 保存成功: run_id={run_id}, 成功={success}, 失败={failed}")
                else:
                    print(f"[db_v2] 保存成功: run_id={run_id}, 成功={success}, 失败={failed}")
                return run_id
            except Exception as e:
                if self.logger:
                    self.logger.error(f"[db_v2] 保存失败: {e}")
                else:
                    print(f"[db_v2-error] 保存失败: {e}")
                import traceback
                traceback.print_exc()
                return None
        
        # 回退到旧的 db.py
        return self.pg_saver.save_run_and_authors(
            first_label=first_label,
            second_label=second_label,
            second_ids=second_ids or [],
            video_type=video_type,
            page=page,
            limit=limit,
            min_price=min_price,
            x_tt_agw_login=x_tt_agw_login,
            request_payload=request_payload,
            response=response,
        )

    def save_summary(
        self,
        *,
        first_label: str,
        second_label: str,
        second_ids: list[int] | None,
        video_type: str,
        start_page: int,
        pages_done: int,
        authors_total: int,
        failed_pages: int,
        report_path: str,
        started_at,
        finished_at,
    ) -> Optional[int]:
        if not self.pg_saver:
            return None
        return self.pg_saver.save_summary(
            first_label=first_label,
            second_label=second_label,
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