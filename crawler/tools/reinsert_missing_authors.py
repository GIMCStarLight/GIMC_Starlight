import os
import sys
import json
import time
import argparse
from datetime import datetime

try:
    import psutil
except Exception:
    psutil = None

# 确保可导入 services 包
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from services.db_v2 import DatabaseServiceV2
from psycopg2.pool import SimpleConnectionPool


def _is_recent_file(path: str, days: int | None) -> bool:
    if days is None:
        return True
    try:
        cutoff_ts = time.time() - days * 24 * 3600
        st = os.stat(path)
        return st.st_mtime >= cutoff_ts
    except Exception:
        return True


def _extract_authors(data: dict) -> list[dict]:
    """尽量健壮地从页面 JSON 中提取 authors 列表。"""
    # 1) 直接顶层
    authors = data.get("authors")
    if isinstance(authors, list) and authors:
        return authors

    # 2) 常见嵌套
    for key in ("data", "result"):
        nested = data.get(key)
        if isinstance(nested, dict):
            authors = nested.get("authors")
            if isinstance(authors, list) and authors:
                return authors

    # 3) 扫描所有值寻找形如 [ { attribute_datas: {...} }, ... ] 的列表
    def _find_list_with_attr(obj):
        if isinstance(obj, list):
            if obj and isinstance(obj[0], dict) and ("attribute_datas" in obj[0] or "star_id" in obj[0]):
                return obj
            for it in obj:
                res = _find_list_with_attr(it)
                if isinstance(res, list) and res:
                    return res
        elif isinstance(obj, dict):
            for v in obj.values():
                res = _find_list_with_attr(v)
                if isinstance(res, list) and res:
                    return res
        return None

    res = _find_list_with_attr(data)
    return res or []


def collect_file_authors(root_dir: str, days: int | None, sources: list[str] | None = None) -> dict[str, dict]:
    """扫描 results 下的页面文件，汇总 author_id -> attribute_datas。

    sources: 传入 results 下的子目录名列表，例如 ["author_square_by_tag", "关键词搜索"]
             若为 None，则默认扫描上述两个目录。
    """
    results_root = os.path.join(root_dir, "results")
    if sources is None:
        source_dirs = [
            os.path.join(results_root, "author_square_by_tag"),
            os.path.join(results_root, "关键词搜索"),
        ]
    else:
        source_dirs = [os.path.join(results_root, s) for s in sources]

    authors_map: dict[str, dict] = {}
    files_scanned = 0
    files_error = 0
    authors_missing_id = 0

    for src in source_dirs:
        if not os.path.isdir(src):
            continue
        for dirpath, dirnames, filenames in os.walk(src):
            for fn in filenames:
                if not fn.endswith(".json"):
                    continue
                fp = os.path.join(dirpath, fn)
                if not _is_recent_file(fp, days):
                    continue
                files_scanned += 1
                try:
                    with open(fp, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    authors = _extract_authors(data)
                    for a in authors:
                        attr = a.get("attribute_datas") or {}
                        # 兜底：如果 attribute_datas 没有 id，则尝试从上层字段取
                        aid = (attr.get("id")
                               or a.get("author_id")
                               or a.get("star_id")
                               or attr.get("author_id"))
                        if not aid:
                            authors_missing_id += 1
                            continue
                        aid = str(aid)
                        # 保证 attr 至少包含 id
                        if "id" not in attr:
                            attr["id"] = aid
                        authors_map[aid] = attr
                except Exception:
                    files_error += 1

    return {
        "authors_map": authors_map,
        "files_scanned": files_scanned,
        "files_error": files_error,
        "authors_missing_id": authors_missing_id,
    }


def fetch_existing_ids(conn, ids: list[str], db_days: int | None = None) -> set[str]:
    """分批查询 authors_core 已存在的 author_id。

    db_days: 若提供，则仅查询最近 N 天（根据 last_crawled_at）存在的作者。
    """
    existing: set[str] = set()
    cur = conn.cursor()
    try:
        batch = 1000
        for i in range(0, len(ids), batch):
            chunk = ids[i:i + batch]
            placeholders = ",".join(["%s"] * len(chunk))
            if db_days is None:
                cur.execute(
                    f"SELECT author_id FROM authors_core WHERE author_id IN ({placeholders})",
                    chunk,
                )
            else:
                cur.execute(
                    f"SELECT author_id FROM authors_core WHERE last_crawled_at >= NOW() - INTERVAL %s AND author_id IN ({placeholders})",
                    tuple([f"{int(db_days)} days"] + chunk),
                )
            for row in cur.fetchall():
                existing.add(str(row[0]))
        return existing
    finally:
        cur.close()


def reinsert_missing(
    authors_map: dict[str, dict],
    days: int | None,
    batch_size: int = 200,
    limit_authors: int | None = None,
    pg_timeout_ms: int | None = None,
    sleep_ms: int | None = None,
    progress_every: int = 1,
    sources: list[str] | None = None,
    db_days: int | None = None,
    write_mode: str = "default",
    retry_max: int = 2,
    retry_backoff_ms: int = 800,
    cpu_threshold: float | None = None,
    mem_threshold_mb: int | None = None,
    db_pool: SimpleConnectionPool | None = None,
):
    """将缺失作者补入库，并打印进度，支持限量与超时设置。"""
    # 借用连接（可选连接池）
    borrowed_conn = None
    db = None
    try:
        if db_pool:
            borrowed_conn = db_pool.getconn()
            db = DatabaseServiceV2(existing_conn=borrowed_conn)
        else:
            db = DatabaseServiceV2()
        all_ids = list(authors_map.keys())
        existing = fetch_existing_ids(db.conn, all_ids, db_days=db_days)
        missing_ids = [aid for aid in all_ids if aid not in existing]
        total_missing = len(missing_ids)

        if limit_authors is not None:
            missing_ids = missing_ids[:max(0, limit_authors)]

        # 设置语句超时，避免单条语句长时间阻塞
        if pg_timeout_ms and pg_timeout_ms > 0:
            cur = db.conn.cursor()
            try:
                cur.execute(f"SET statement_timeout = {int(pg_timeout_ms)}")
            finally:
                cur.close()

        # 创建一次性 run 记录，归档原始数据
        run_id = db.create_run(
            first_label="补入库",
            second_label="reinsert",
            second_ids=[],
            video_type=None,
            page=None,
            limit=None,
            min_price=None,
            x_tt_agw_login=None,
            request_payload={
                "source": "reinsert_missing_authors",
                "scanned_files": len(all_ids),
                "days_filter": days,
                "created_at": datetime.now().isoformat(),
            },
        )

        print(json.dumps({
            "phase": "start",
            "found_in_files": len(all_ids),
            "exist_in_db": len(existing),
            "missing_in_db": total_missing,
            "planned_to_insert": len(missing_ids),
            "batch_size": batch_size,
            "pg_timeout_ms": pg_timeout_ms,
            "sources": sources or ["author_square_by_tag", "关键词搜索"],
            "db_days": db_days,
            "write_mode": write_mode,
            "retry_max": retry_max,
            "retry_backoff_ms": retry_backoff_ms,
        }, ensure_ascii=False), flush=True)

        success = 0
        failed = 0
        inserted_ids: list[str] = []
        failed_detail: list[dict] = []

        total_batches = (len(missing_ids) + batch_size - 1) // batch_size
        t0 = time.time()
        for batch_index, i in enumerate(range(0, len(missing_ids), batch_size), start=1):
            chunk_ids = missing_ids[i:i + batch_size]
            authors_chunk = [{"attribute_datas": authors_map[aid]} for aid in chunk_ids]

            if progress_every > 0 and (batch_index == 1 or batch_index % progress_every == 0):
                perf = {}
                if psutil:
                    p = psutil.Process(os.getpid())
                    with p.oneshot():
                        perf = {
                            "cpu_percent": p.cpu_percent(interval=None),
                            "rss_mb": round((p.memory_info().rss or 0) / (1024*1024), 2),
                        }
                print(json.dumps({
                    "phase": "batch_start",
                    "batch_index": batch_index,
                    "total_batches": total_batches,
                    "chunk_size": len(chunk_ids),
                    "success_so_far": success,
                    "failed_so_far": failed,
                    "perf": perf,
                }, ensure_ascii=False), flush=True)

            # 批量写入 + 指数退避重试
            s = 0
            f = 0
            last_err: str | None = None
            for attempt in range(1, max(1, int(retry_max)) + 2):
                try:
                    if write_mode == "bulk_core_raw":
                        # 先批量 upsert 核心与归档，再跳过重复写入的部分
                        db.bulk_upsert_authors_core_from_authors(authors_chunk, page_size=max(100, batch_size))
                        db.bulk_insert_raw_archive_from_authors(run_id, authors_chunk, page_size=max(100, batch_size))
                        s_part, f_part = db.save_authors_batch(
                            run_id=run_id,
                            authors=authors_chunk,
                            commit=True,
                            skip_core=True,
                            skip_raw_archive=True,
                        )
                    else:
                        s_part, f_part = db.save_authors_batch(run_id=run_id, authors=authors_chunk, commit=True)
                    s += s_part
                    f += f_part
                    inserted_ids.extend(chunk_ids[:s_part])
                    last_err = None
                    break
                except Exception as e:
                    last_err = str(e)
                    # 超阈值报警（仅日志）
                    if psutil and (cpu_threshold or mem_threshold_mb):
                        p = psutil.Process(os.getpid())
                        with p.oneshot():
                            cpu_p = p.cpu_percent(interval=None)
                            rss_mb = (p.memory_info().rss or 0) / (1024*1024)
                        alerts = {}
                        if cpu_threshold and cpu_p >= float(cpu_threshold):
                            alerts["cpu_percent"] = round(cpu_p, 1)
                        if mem_threshold_mb and rss_mb >= float(mem_threshold_mb):
                            alerts["rss_mb"] = round(rss_mb, 2)
                        if alerts:
                            print(json.dumps({
                                "phase": "perf_alert",
                                "batch_index": batch_index,
                                "alerts": alerts,
                                "error": last_err,
                            }, ensure_ascii=False), flush=True)
                    # 重试或退避后降级为逐条
                    if attempt <= int(retry_max):
                        backoff = (retry_backoff_ms or 0) * max(1, attempt)
                        if backoff > 0:
                            time.sleep(backoff / 1000.0)
                        continue
                    # 降级逐条
                    for aid in chunk_ids:
                        try:
                            if write_mode == "bulk_core_raw":
                                one = [{"attribute_datas": authors_map[aid]}]
                                db.bulk_upsert_authors_core_from_authors(one, page_size=1)
                                db.bulk_insert_raw_archive_from_authors(run_id, one, page_size=1)
                                s1, f1 = db.save_authors_batch(
                                    run_id=run_id, authors=one, commit=True, skip_core=True, skip_raw_archive=True
                                )
                            else:
                                s1, f1 = db.save_authors_batch(
                                    run_id=run_id, authors=[{"attribute_datas": authors_map[aid]}], commit=True
                                )
                            s += s1
                            f += f1
                            if s1 == 1:
                                inserted_ids.append(aid)
                            else:
                                failed_detail.append({"author_id": aid, "error": "unknown"})
                        except Exception as ee:
                            f += 1
                            failed_detail.append({"author_id": aid, "error": str(ee)})
                    break

            if progress_every > 0 and (batch_index % progress_every == 0 or batch_index == total_batches):
                elapsed = time.time() - t0
                avg_per_batch = elapsed / max(1, batch_index)
                eta = avg_per_batch * max(0, total_batches - batch_index)
                perf = {}
                if psutil:
                    p = psutil.Process(os.getpid())
                    with p.oneshot():
                        perf = {
                            "cpu_percent": p.cpu_percent(interval=None),
                            "rss_mb": round((p.memory_info().rss or 0) / (1024*1024), 2),
                        }
                print(json.dumps({
                    "phase": "batch_done",
                    "batch_index": batch_index,
                    "total_batches": total_batches,
                    "batch_success": s,
                    "batch_failed": f,
                    "success_total": success + s,
                    "failed_total": failed + f,
                    "elapsed_sec": round(elapsed, 2),
                    "eta_sec": round(eta, 2),
                    "perf": perf,
                }, ensure_ascii=False), flush=True)

            success += s
            failed += f

            if sleep_ms and sleep_ms > 0:
                time.sleep(sleep_ms / 1000.0)

        return {
            "run_id": run_id,
            "found_in_files": len(all_ids),
            "exist_in_db": len(existing),
            "missing_in_db": total_missing,
            "insert_success": success,
            "insert_failed": failed,
            "inserted_ids_sample": inserted_ids[:100],
            "failed_detail_sample": failed_detail[:50],
        }
    finally:
        # 归还连接到池
        if db:
            db.close()
        if borrowed_conn and db_pool:
            try:
                db_pool.putconn(borrowed_conn)
            except Exception:
                pass


def main():
    parser = argparse.ArgumentParser(description="查找本地文件中但不在数据库中的达人，并补入库")
    parser.add_argument("--days", type=int, default=None, help="仅处理最近 N 天内的文件，默认处理全部")
    parser.add_argument("--dry-run", action="store_true", help="仅统计不入库")
    parser.add_argument("--batch-size", type=int, default=200, help="批量入库每批作者数量，默认200")
    parser.add_argument("--limit-authors", type=int, default=None, help="最多处理的缺失作者数量上限")
    parser.add_argument("--pg-timeout-ms", type=int, default=None, help="为每条SQL设置语句超时，毫秒")
    parser.add_argument("--sleep-ms", type=int, default=None, help="每批次后休眠毫秒，用于给数据库降压")
    parser.add_argument("--progress-every", type=int, default=5, help="每隔多少批次打印一次进度，默认5")
    parser.add_argument("--sources", type=str, default="author_square_by_tag,关键词搜索", help="逗号分隔的扫描子目录名（位于results下）")
    parser.add_argument("--db-days", type=int, default=None, help="数据库存在性比较仅考虑最近 N 天（last_crawled_at）")
    parser.add_argument("--write-mode", type=str, choices=["default", "bulk_core_raw"], default="default", help="写入策略：default 或批量优化（核心+归档批量）")
    parser.add_argument("--retry-max", type=int, default=2, help="批量失败最大重试次数（指数退避）")
    parser.add_argument("--retry-backoff-ms", type=int, default=800, help="重试退避基础毫秒")
    parser.add_argument("--cpu-threshold", type=float, default=None, help="CPU占用百分比阈值，超过则打印告警")
    parser.add_argument("--mem-threshold-mb", type=int, default=None, help="RSS内存MB阈值，超过则打印告警")
    parser.add_argument("--conn-timeout-sec", type=int, default=10, help="数据库连接超时（秒）")
    parser.add_argument("--pool-size", type=int, default=1, help="连接池大小（用于并发/连接管理），默认1")
    args = parser.parse_args()

    sources = [s.strip() for s in args.sources.split(",") if s.strip()]
    files_info = collect_file_authors(ROOT_DIR, days=args.days, sources=sources)
    authors_map = files_info["authors_map"]

    summary = {
        "files_scanned": files_info["files_scanned"],
        "files_error": files_info["files_error"],
        "authors_missing_id_in_files": files_info["authors_missing_id"],
        "file_unique_authors": len(authors_map),
    }

    result = None
    if args.dry_run and authors_map:
        # 仅统计缺失数量，不执行入库
        from services.db_v2 import DatabaseServiceV2 as _DB
        with _DB() as db:
            all_ids = list(authors_map.keys())
            existing = fetch_existing_ids(db.conn, all_ids, db_days=args.db_days)
            missing_ids = [aid for aid in all_ids if aid not in existing]
            summary.update({
                "db_exist": len(existing),
                "missing_in_db": len(missing_ids),
                "planned_to_insert": 0,
                "sources": sources,
                "db_days": args.db_days,
            })
    elif not args.dry_run and authors_map:
        # 构建连接池（用于连接管理与可选并发），保持最小化以避免放大压力
        db_cfg = {
            'host': os.getenv('POSTGRES_HOST', '192.168.102.168'),
            'port': int(os.getenv('POSTGRES_PORT', 5432)),
            'user': os.getenv('POSTGRES_USERNAME', 'postgres'),
            'password': os.getenv('POSTGRES_PASSWORD', 'postgres'),
            'database': os.getenv('POSTGRES_DATABASE', 'crawler_db_v2'),
            'connect_timeout': int(args.conn_timeout_sec or 10),
        }
        pool = None
        try:
            pool = SimpleConnectionPool(1, max(1, int(args.pool_size)), **db_cfg)
        except Exception:
            pool = None

        result = reinsert_missing(
            authors_map,
            days=args.days,
            batch_size=args.batch_size,
            limit_authors=args.limit_authors,
            pg_timeout_ms=args.pg_timeout_ms,
            sleep_ms=args.sleep_ms,
            progress_every=args.progress_every,
            sources=sources,
            db_days=args.db_days,
            write_mode=args.write_mode,
            retry_max=args.retry_max,
            retry_backoff_ms=args.retry_backoff_ms,
            cpu_threshold=args.cpu_threshold,
            mem_threshold_mb=args.mem_threshold_mb,
            db_pool=pool,
        )
        if pool:
            try:
                pool.closeall()
            except Exception:
                pass
        summary.update(result)

    # 输出与保存报告
    reports_dir = os.path.join(ROOT_DIR, "reports")
    os.makedirs(reports_dir, exist_ok=True)
    dt = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_path = os.path.join(reports_dir, f"reinsert_missing_authors_{dt}.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(json.dumps({"status": "ok", "saved": out_path, "summary": summary}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()