import json
try:
    from services.db_v2 import DatabaseServiceV2 as PgSaver
except ImportError:
    from services.db import PgSaver


def main():
    pg = PgSaver()
    pg.connect()
    pg.ensure_schema()

    cur = None
    result = {
        "deleted_authors": 0,
        "deleted_runs": 0,
        "deleted_summaries": 0,
        "deleted_dimensions": 0,
    }

    try:
        cur = pg.conn.cursor()

        # 删除依赖 author_square_runs(first_label='验证') 的作者明细
        cur.execute(
            """
            DELETE FROM author_square_authors
            WHERE run_id IN (
                SELECT id FROM author_square_runs WHERE first_label = %s
            )
            """,
            ("验证",),
        )
        result["deleted_authors"] = cur.rowcount or 0

        # 删除维度表中测试脚本插入的记录（author_id='a1'）
        cur.execute(
            """
            DELETE FROM author_dimension WHERE author_id = %s
            """,
            ("a1",),
        )
        result["deleted_dimensions"] = cur.rowcount or 0

        # 删除汇总（若存在测试数据）
        cur.execute(
            """
            DELETE FROM author_square_summaries WHERE first_label = %s
            """,
            ("验证",),
        )
        result["deleted_summaries"] = cur.rowcount or 0

        # 最后删除运行记录
        cur.execute(
            """
            DELETE FROM author_square_runs WHERE first_label = %s
            """,
            ("验证",),
        )
        result["deleted_runs"] = cur.rowcount or 0

        pg.conn.commit()
    except Exception:
        try:
            pg.conn.rollback()
        except Exception:
            pass
        raise
    finally:
        try:
            if cur:
                cur.close()
        except Exception:
            pass
        pg.close()

    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()