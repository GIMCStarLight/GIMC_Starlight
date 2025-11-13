import os
import sys
import json
import time
from datetime import datetime, timedelta

# 将项目根目录加入 sys.path，确保可导入 services 包
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from services.db_v2 import DatabaseServiceV2


def collect_file_author_ids(root_dir: str, days: int = 2):
    cutoff_ts = time.time() - days * 24 * 3600
    author_ids = set()
    files_scanned = 0
    files_error = 0
    authors_missing_id = 0

    target_root = os.path.join(root_dir, "results", "author_square_by_tag")
    for dirpath, dirnames, filenames in os.walk(target_root):
        for fn in filenames:
            if not fn.endswith(".json"):
                continue
            fp = os.path.join(dirpath, fn)
            try:
                st = os.stat(fp)
                if st.st_mtime < cutoff_ts:
                    continue
            except Exception:
                pass

            files_scanned += 1
            try:
                with open(fp, "r", encoding="utf-8") as f:
                    data = json.load(f)
                authors = data.get("authors", []) or []
                for a in authors:
                    attr = a.get("attribute_datas", {}) or {}
                    aid = attr.get("id") or a.get("star_id")
                    if not aid:
                        authors_missing_id += 1
                        continue
                    author_ids.add(str(aid))
            except Exception:
                files_error += 1

    return {
        "file_author_ids": author_ids,
        "files_scanned": files_scanned,
        "files_error": files_error,
        "authors_missing_id": authors_missing_id,
    }


def collect_db_author_ids(days: int = 2):
    with DatabaseServiceV2() as db:
        cur = db.conn.cursor()
        cur.execute(
            """
            SELECT author_id
            FROM authors_core
            WHERE last_crawled_at >= NOW() - INTERVAL %s
            """,
            (f"{int(days)} days",),
        )
        rows = cur.fetchall()
        cur.close()
        return {str(r[0]) for r in rows}


def main():
    root_dir = ROOT_DIR
    files_info = collect_file_author_ids(root_dir, days=2)
    db_ids = collect_db_author_ids(days=2)

    file_ids = files_info["file_author_ids"]
    missing_in_db = sorted(list(file_ids - db_ids))
    extra_in_db = sorted(list(db_ids - file_ids))

    result = {
        "files_scanned": files_info["files_scanned"],
        "files_error": files_info["files_error"],
        "authors_missing_id_in_files": files_info["authors_missing_id"],
        "file_unique_authors": len(file_ids),
        "db_recent_authors": len(db_ids),
        "missing_in_db_count": len(missing_in_db),
        "missing_in_db_sample": missing_in_db[:50],
        "extra_in_db_count": len(extra_in_db),
        "extra_in_db_sample": extra_in_db[:50],
    }

    # 同时写入报告文件，便于后续分析与追踪
    try:
        reports_dir = os.path.join(ROOT_DIR, "reports")
        os.makedirs(reports_dir, exist_ok=True)
        out_path = os.path.join(reports_dir, "audit_pg_vs_files.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(json.dumps({
            "status": "ok",
            "saved": out_path,
            "summary": {
                "files_scanned": result["files_scanned"],
                "file_unique_authors": result["file_unique_authors"],
                "db_recent_authors": result["db_recent_authors"],
                "missing_in_db_count": result["missing_in_db_count"],
                "extra_in_db_count": result["extra_in_db_count"],
            }
        }, ensure_ascii=False, indent=2))
    except Exception:
        # 回退为标准输出
        print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()