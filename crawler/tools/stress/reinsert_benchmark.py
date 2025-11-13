import os
import sys
import time
import json
import argparse
import subprocess

try:
    import psutil
except Exception:
    psutil = None

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))


def run_once(mode: str, days: int, batch_size: int, limit_authors: int | None,
             write_mode: str, db_days: int | None,
             pg_timeout_ms: int | None, sleep_ms: int | None,
             retry_max: int, retry_backoff_ms: int) -> dict:
    """运行一次 reinsert_missing_authors.py，并采样 CPU/内存。"""
    cmd = [
        sys.executable,
        os.path.join(ROOT_DIR, 'tools', 'reinsert_missing_authors.py'),
        '--days', str(days),
        '--batch-size', str(batch_size),
        '--write-mode', write_mode,
        '--retry-max', str(retry_max),
        '--retry-backoff-ms', str(retry_backoff_ms),
    ]
    if db_days is not None:
        cmd += ['--db-days', str(int(db_days))]
    if limit_authors is not None:
        cmd += ['--limit-authors', str(int(limit_authors))]
    if pg_timeout_ms is not None:
        cmd += ['--pg-timeout-ms', str(int(pg_timeout_ms))]
    if sleep_ms is not None:
        cmd += ['--sleep-ms', str(int(sleep_ms))]
    if mode == 'dry':
        cmd += ['--dry-run']

    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    cpu_samples = []
    mem_samples = []
    started = time.time()
    try:
        if psutil:
            proc = psutil.Process(p.pid)
            while True:
                if p.poll() is not None:
                    break
                with proc.oneshot():
                    cpu = proc.cpu_percent(interval=0.2)
                    mem = (proc.memory_info().rss or 0) / (1024*1024)
                cpu_samples.append(cpu)
                mem_samples.append(mem)
        out, err = p.communicate()
    finally:
        finished = time.time()

    summary = None
    try:
        # 末尾 JSON 汇总
        lines = out.splitlines()
        for i in range(len(lines)-1, -1, -1):
            try:
                summary = json.loads(lines[i])
                if isinstance(summary, dict) and summary.get('status') == 'ok':
                    summary = summary.get('summary')
                break
            except Exception:
                continue
    except Exception:
        summary = None

    return {
        'returncode': p.returncode,
        'duration_sec': round(finished - started, 2),
        'cpu_avg': round(sum(cpu_samples) / max(1, len(cpu_samples)), 2) if cpu_samples else None,
        'cpu_peak': round(max(cpu_samples), 2) if cpu_samples else None,
        'rss_avg_mb': round(sum(mem_samples) / max(1, len(mem_samples)), 2) if mem_samples else None,
        'rss_peak_mb': round(max(mem_samples), 2) if mem_samples else None,
        'summary': summary,
        'stderr_tail': '\n'.join(err.splitlines()[-10:]) if err else None,
    }


def main():
    parser = argparse.ArgumentParser(description='reinsert_missing_authors 压测基准')
    parser.add_argument('--mode', type=str, choices=['dry', 'write'], default='dry', help='dry 仅统计；write 执行写入')
    parser.add_argument('--days', type=int, default=1)
    parser.add_argument('--db-days', type=int, default=None)
    parser.add_argument('--batch-size', type=int, default=300)
    parser.add_argument('--limit-authors', type=int, default=3000)
    parser.add_argument('--write-mode', type=str, choices=['default', 'bulk_core_raw'], default='bulk_core_raw')
    parser.add_argument('--pg-timeout-ms', type=int, default=60000)
    parser.add_argument('--sleep-ms', type=int, default=300)
    parser.add_argument('--retry-max', type=int, default=2)
    parser.add_argument('--retry-backoff-ms', type=int, default=800)
    parser.add_argument('--runs', type=int, default=1)

    args = parser.parse_args()

    results = []
    for _ in range(int(args.runs)):
        r = run_once(
            mode=args.mode,
            days=args.days,
            batch_size=args.batch_size,
            limit_authors=args.limit_authors,
            write_mode=args.write_mode,
            db_days=args.db_days,
            pg_timeout_ms=args.pg_timeout_ms,
            sleep_ms=args.sleep_ms,
            retry_max=args.retry_max,
            retry_backoff_ms=args.retry_backoff_ms,
        )
        results.append(r)

    print(json.dumps({
        'status': 'ok',
        'mode': args.mode,
        'write_mode': args.write_mode,
        'runs': int(args.runs),
        'results': results,
    }, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()