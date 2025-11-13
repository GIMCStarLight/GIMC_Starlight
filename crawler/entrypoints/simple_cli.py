#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
简单命令入口（Simple CLI）

目标：
- 将复杂 CLI 收敛为少量子命令，降低记忆成本；
- 自动填充常用默认值，避免漏参报错；
- 自动检测并启用 PostgreSQL（若配置存在），并给出清晰提示；
- 提供 profile 预设，一键选择“速度/稳定/深度”。

子命令：
- kw <keyword>            单关键词搜索（自动识别 search_type）
- batch <file>            批量关键词（自动识别 search_type）
- selected <一级> [二级]   选定标签
- combined <一级>         合并某一级下所有二级
- first                   遍历全部一级

用法示例（在 task_control 目录下执行）：
  python -m task_control.entrypoints.simple_cli kw 贝勒儿
  python -m task_control.entrypoints.simple_cli batch config/keywords_for_batch_crawling.txt
  python -m task_control.entrypoints.simple_cli selected 美妆 护肤
  python -m task_control.entrypoints.simple_cli combined 美妆
  python -m task_control.entrypoints.simple_cli first
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

# 动态路径检测和设置
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

# 使用动态路径解析器
from services.path_resolver import setup_project_paths
path_resolver = setup_project_paths()

# 使用动态检测的路径
PROJECT_ROOT = path_resolver.project_root
CONFIG_DIR = str(path_resolver.config_dir)
RESULTS_DIR = str(path_resolver.results_dir)
REPORTS_DIR = str(path_resolver.reports_dir)


def _auto_search_type(keyword: str) -> int:
    """自动识别搜索类型：1=星图ID(纯数字), 3=抖音号(ASCII/含TG前缀), 2=昵称(其他)。"""
    kw = (keyword or "").strip()
    if kw.isdigit():
        return 1
    if kw.startswith("TG") or all((ord(c) < 128) and (c.isalnum() or c in {"_", "-", "."}) for c in kw):
        return 3
    return 2


def _preflight_check(cookies_file: str) -> None:
    if not cookies_file or not os.path.exists(cookies_file):
        print(f"[error] 找不到 cookies 文件: {cookies_file}")
        print("        请在 task_control/config/cookies.txt 填入 cookie，或使用 --cookies-file 指定路径")
        sys.exit(2)


def _resolve_pg(args_namespace) -> tuple[bool, str | None]:
    """根据 --no-pg/--save-pg/--pg-config 自动决定是否入库。"""
    no_pg = getattr(args_namespace, "no_pg", False)
    explicit_save_pg = getattr(args_namespace, "save_pg", False)
    pg_config = getattr(args_namespace, "pg_config", None)

    if no_pg:
        print("[info] 已禁用 PostgreSQL 入库 (--no-pg)")
        return False, pg_config
    if pg_config and os.path.exists(pg_config):
        print(f"[info] 检测到 PG 配置文件，已启用入库: {pg_config}")
        return True, pg_config
    if explicit_save_pg:
        print(f"[warn] 传入了 --save-pg 但未找到 PG 配置: {pg_config or '(未提供路径)'}，将继续尝试，若连接失败会退出")
        return True, pg_config
    print(f"[info] 未启用 PG 入库（如需入库，请准备 {CONFIG_DIR}/postgres.json 或传 --save-pg --pg-config）")
    return False, pg_config


def _profile_defaults(name: str) -> dict:
    """返回 profile 预设。可按需扩展。

    关键项：
    - 速率与稳定：sleep_ms, retry_max, retry_backoff_ms, cooldown_429_403_ms
    - 限速：domain_qps, qps_window_ms
    - 终止条件：stop_when_empty, stop_when_empty_n, max_failure_rate
    - 分页：auto_pages, auto_pages_upper_bound, max_pages
    - 特殊错误：max_consecutive_401, pause_on_401_ms
    """
    name = (name or "balance").lower()
    if name == "fast":
        return {
            "sleep_ms": 600,
            "retry_max": 2,
            "retry_backoff_ms": 800,
            "cooldown_429_403_ms": 2000,
            "domain_qps": 1,
            "qps_window_ms": 1000,
            "stop_when_empty": True,
            "stop_when_empty_n": 1,
            "max_failure_rate": 0.7,
            "auto_pages": False,
            "auto_pages_upper_bound": None,
            "max_pages": 3,
            "limit": 20,
            "min_price": 0,
            "max_consecutive_401": 2,
            "pause_on_401_ms": 3000,
            "skip_existing": True,
        }
    if name == "deep":
        return {
            "sleep_ms": 1000,
            "retry_max": 4,
            "retry_backoff_ms": 1200,
            "cooldown_429_403_ms": 5000,
            "domain_qps": 1,
            "qps_window_ms": 1000,
            "stop_when_empty": False,
            "stop_when_empty_n": 5,
            "max_failure_rate": 0.5,
            "auto_pages": True,
            "auto_pages_upper_bound": 80,
            "max_pages": 30,
            "limit": 50,
            "min_price": 0,
            "max_consecutive_401": 5,
            "pause_on_401_ms": 6000,
            "skip_existing": True,
        }
    # 默认：balance
    return {
        "sleep_ms": 800,
        "retry_max": 3,
        "retry_backoff_ms": 1000,
        "cooldown_429_403_ms": 3000,
        "domain_qps": 2,
        "qps_window_ms": 1000,
        "stop_when_empty": False,
        "stop_when_empty_n": 3,
        "max_failure_rate": 0.6,
        "auto_pages": True,
        "auto_pages_upper_bound": 40,
        "max_pages": 10,
        "limit": 30,
        "min_price": 0,
        "max_consecutive_401": 3,
        "pause_on_401_ms": 4000,
        "skip_existing": True,
    }


def _run_scheduler(config: dict):
    from tools.main_task_scheduler import MainTaskScheduler
    sch = MainTaskScheduler()
    return sch.run(config)


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Simple CLI - 简化命令入口")
    p.add_argument("--cookies-file", default=os.path.join(CONFIG_DIR, "cookies.txt"))
    p.add_argument("--save-pg", action="store_true", help="强制启用 PG 入库（通常无需显式，检测到配置文件即启用）")
    p.add_argument("--pg-config", default=os.path.join(CONFIG_DIR, "postgres.json"))
    p.add_argument("--no-pg", action="store_true", help="禁用 PG 入库")
    p.add_argument("--dry-run", action="store_true", help="仅打印 headers/payload，不发起网络请求")
    p.add_argument(
        "--profile",
        choices=["fast", "balance", "deep"],
        default="balance",
        help="抓取预设：fast(快) / balance(均衡) / deep(深度)",
    )
    p.add_argument("--video-type", default="2", help="视频类型ID，默认为2")

    sub = p.add_subparsers(dest="cmd", required=True)

    # 单关键词
    sp_kw = sub.add_parser("kw", help="单关键词搜索（自动识别 search_type）")
    sp_kw.add_argument("keyword", help="关键词：星图ID/抖音号/昵称")
    sp_kw.add_argument("--search-type", type=int, choices=[1, 2, 3], help="覆盖自动识别：1星图ID 2昵称 3抖音号")
    sp_kw.add_argument("--limit", type=int, default=None)
    sp_kw.add_argument("--max-pages", type=int, default=None)

    # 批量关键词
    sp_batch = sub.add_parser("batch", help="批量关键词（自动识别 search_type）")
    sp_batch.add_argument("keyword_file", help="关键词文件，每行一个；忽略空行和#注释")
    sp_batch.add_argument("--max-keywords", type=int)
    sp_batch.add_argument("--dedup", action="store_true", help="去重关键字（保持顺序）")
    sp_batch.add_argument("--sleep-ms", type=int, default=800)
    sp_batch.add_argument("--limit", type=int, default=None)
    sp_batch.add_argument("--max-pages", type=int, default=None)

    # 选定标签
    sp_sel = sub.add_parser("selected", help="选定标签：<一级> [二级]")
    sp_sel.add_argument("first_label", help="一级标签中文名")
    sp_sel.add_argument("second_label", nargs="?", help="二级标签中文名，可省略")
    sp_sel.add_argument("--tags-file", default=os.path.join(CONFIG_DIR, "content_tag_v2.json"))
    sp_sel.add_argument("--limit", type=int, default=None)
    sp_sel.add_argument("--max-pages", type=int, default=None)

    # 合并二级
    sp_comb = sub.add_parser("combined", help="将某一级下所有二级合并为一次请求")
    sp_comb.add_argument("first_label", help="一级标签中文名")
    sp_comb.add_argument("--tags-file", default=os.path.join(CONFIG_DIR, "content_tag_v2.json"))
    sp_comb.add_argument("--limit", type=int, default=None)
    sp_comb.add_argument("--max-pages", type=int, default=None)

    # 全部一级
    sp_first = sub.add_parser("first", help="遍历全部一级标签")
    sp_first.add_argument("--tags-file", default=os.path.join(CONFIG_DIR, "content_tag_v2.json"))
    sp_first.add_argument("--limit", type=int, default=None)
    sp_first.add_argument("--max-pages", type=int, default=None)

    return p


def main(argv: list[str] | None = None):
    parser = build_parser()
    args = parser.parse_args(argv)

    # 预检 cookies
    _preflight_check(args.cookies_file)

    # 决定 PG 策略
    save_pg, pg_config = _resolve_pg(args)

    # 基础配置（可被 profile 与子命令覆盖）
    base_cfg = {
        "cookies_file": args.cookies_file,
        "save_pg": save_pg,
        "pg_config": pg_config,
        "output_dir": RESULTS_DIR,
        "report_dir": REPORTS_DIR,
        "dry_run": getattr(args, "dry_run", False),
        "video_type": getattr(args, "video_type", "2"),
    }

    # 应用 profile 预设
    prof = _profile_defaults(args.profile)
    # 合并顺序：先 profile，再 base_cfg（不包含 limit/max_pages），最后仅在显式提供时覆盖
    cfg_common = {**prof, **base_cfg}

    def _apply_common_overrides(cfg_in: dict, limit: int | None, max_pages: int | None) -> dict:
        cfg = dict(cfg_in)
        # 仅当用户显式提供时才覆盖 profile 值
        if limit is not None:
            cfg["limit"] = int(limit)
        if max_pages is not None:
            cfg["max_pages"] = int(max_pages)
        return cfg

    if args.cmd == "kw":
        kw = args.keyword.strip()
        st = args.search_type if args.search_type is not None else _auto_search_type(kw)
        print(f"[info] 关键词: {kw}  -> search_type={st} / profile={args.profile}")
        cfg = _apply_common_overrides(cfg_common, getattr(args, "limit", None), getattr(args, "max_pages", None))
        cfg.update({
            "keyword": kw,
            "search_type": st,
        })
        return _run_scheduler(cfg)

    if args.cmd == "batch":
        kf = args.keyword_file
        if not os.path.exists(kf):
            print(f"[error] 找不到关键词文件: {kf}")
            sys.exit(2)
        print(f"[info] 批量关键词: {kf} / profile={args.profile}")
        cfg = _apply_common_overrides(cfg_common, getattr(args, "limit", None), getattr(args, "max_pages", None))
        cfg.update({
            "keyword_file": kf,
            "max_keywords": getattr(args, "max_keywords", None),
            "dedup_keywords": getattr(args, "dedup", False),
            "sleep_between_keywords_ms": getattr(args, "sleep_ms", 800),
        })
        return _run_scheduler(cfg)

    if args.cmd == "selected":
        print(f"[info] 选定标签: {args.first_label} / {args.second_label or '(一级)'} / profile={args.profile}")
        cfg = _apply_common_overrides(cfg_common, getattr(args, "limit", None), getattr(args, "max_pages", None))
        cfg.update({
            "tags_file": args.tags_file,
            "first_label": args.first_label,
            "second_label": args.second_label,
            "max_tags": 1,
        })
        return _run_scheduler(cfg)

    if args.cmd == "combined":
        print(f"[info] 合并二级: {args.first_label} / profile={args.profile}")
        cfg = _apply_common_overrides(cfg_common, getattr(args, "limit", None), getattr(args, "max_pages", None))
        cfg.update({
            "tags_file": args.tags_file,
            "first_label": args.first_label,
            "combine_second": True,
        })
        return _run_scheduler(cfg)

    if args.cmd == "first":
        print(f"[info] 遍历全部一级 / profile={args.profile}")
        cfg = _apply_common_overrides(cfg_common, getattr(args, "limit", None), getattr(args, "max_pages", None))
        cfg.update({
            "tags_file": args.tags_file,
            "all_first": True,
        })
        return _run_scheduler(cfg)

    parser.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())