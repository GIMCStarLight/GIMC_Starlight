import json
import os
from datetime import datetime

try:
    from services.db_v2 import DatabaseServiceV2 as PgSaver
except ImportError:
    from services.db import PgSaver


def _table_count(conn, table: str) -> int:
    cur = conn.cursor()
    try:
        cur.execute(f"SELECT COUNT(*) FROM {table}")
        return int(cur.fetchone()[0])
    finally:
        cur.close()


def main():
    pg = PgSaver()
    pg.connect()
    pg.ensure_schema()

    # 记录初始计数
    runs_before = _table_count(pg.conn, "author_square_runs")
    summaries_before = _table_count(pg.conn, "author_square_summaries")

    # 1) 验证 save_summary 的回滚路径：传入不可序列化的 second_ids
    ok_summary_rollback = False
    try:
        pg.save_summary(
            first_label="验证",
            second_label="事务",
            second_ids={1, 2},  # set 无法 JSON 序列化，应触发异常
            video_type="2",
            start_page=1,
            pages_done=0,
            authors_total=0,
            failed_pages=0,
            report_path=None,
            started_at=datetime.now(),
            finished_at=datetime.now(),
        )
        # 未抛异常则失败
        ok_summary_rollback = False
    except Exception:
        summaries_after = _table_count(pg.conn, "author_square_summaries")
        ok_summary_rollback = summaries_before == summaries_after

    # 2) 验证 save_run_and_authors 的正常提交路径
    ok_run_commit = False
    response_valid = {"authors": [{"attribute_datas": {"id": "a1"}}]}
    _ = pg.save_run_and_authors(
        first_label="验证",
        second_label="正常",
        second_ids=[1, 2],
        video_type="2",
        page=1,
        limit=20,
        min_price=0,
        x_tt_agw_login=None,
        request_payload={"page_param": {"page": 1}},
        response=response_valid,
    )
    runs_mid = _table_count(pg.conn, "author_square_runs")
    ok_run_commit = runs_mid == runs_before + 1

    # 3) 验证 save_run_and_authors 的回滚路径：在 jsonb 字段中注入不可序列化类型
    ok_run_rollback = False
    try:
        bad_attr = {"id": "a2", "tags_relation": {("x", "y")}}  # set 触发 JSON 适配失败
        response_bad = {"authors": [{"attribute_datas": bad_attr}]}
        _ = pg.save_run_and_authors(
            first_label="验证",
            second_label="异常",
            second_ids=[3],
            video_type="2",
            page=2,
            limit=20,
            min_price=0,
            x_tt_agw_login=None,
            request_payload={"page_param": {"page": 2}},
            response=response_bad,
        )
        ok_run_rollback = False
    except Exception:
        runs_after = _table_count(pg.conn, "author_square_runs")
        ok_run_rollback = runs_after == runs_mid

    print(
        json.dumps(
            {
                "summary_rollback": ok_summary_rollback,
                "run_commit": ok_run_commit,
                "run_rollback": ok_run_rollback,
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()