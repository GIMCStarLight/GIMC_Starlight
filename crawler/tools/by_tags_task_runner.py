"""
按标签抓取任务运行器

将原本在 main 函数中的任务编排逻辑抽取到独立模块，
实现职责分离：CLI 解析 vs 任务执行。
"""

import json
import os
import sys
import time
from typing import Optional, List, Dict, Any

try:
    from tools.by_tags_orchestrator import orchestrate_labels_run
except Exception:
    try:
        from tools.by_tags_orchestrator import orchestrate_labels_run
    except Exception:
        orchestrate_labels_run = None

try:
    from services.data_saver import DataSaver
except Exception:
    try:
        from services.data_saver import DataSaver
    except Exception:
        DataSaver = None

try:
    from services.db_v2 import DatabaseServiceV2 as PgSaver
except Exception:
    try:
        from services.db import PgSaver
    except Exception:
        PgSaver = None

# 导入必要的辅助函数
try:
    from fetch_author_square_by_tags import (
        select_tags, build_base_payload, add_tag_filter, 
        add_follower_filter, add_region_filter, add_extra_filters,
        deep_merge, execute_fetch_pages, fetch_pages,
        add_combined_second_filter, _sleep_until_window, _is_in_window
    )
except Exception:
    try:
        from fetch_author_square_by_tags import (
            select_tags, build_base_payload, add_tag_filter, 
            add_follower_filter, add_region_filter, add_extra_filters,
            deep_merge, execute_fetch_pages, fetch_pages,
            add_combined_second_filter, _sleep_until_window, _is_in_window
        )
    except Exception:
        # 如果导入失败，设置为 None，运行时会报错
        select_tags = build_base_payload = add_tag_filter = None
        add_follower_filter = add_region_filter = add_extra_filters = None
        deep_merge = execute_fetch_pages = fetch_pages = None
        add_combined_second_filter = _sleep_until_window = _is_in_window = None

# 时间窗口辅助函数（如果导入失败则本地实现）
def _is_in_window_local(win):
    """检查当前时间是否在指定窗口内"""
    if not win:
        return True
    import time
    lt = time.localtime()
    cur = lt.tm_hour * 60 + lt.tm_min
    s, e = win
    if s <= e:
        return s <= cur < e
    # 跨日窗口，例如 22:00-02:00
    return cur >= s or cur < e

def _sleep_until_window_local(win):
    """等待直到进入时间窗口"""
    if not win:
        return
    import time
    while not (_is_in_window(win) if _is_in_window else _is_in_window_local(win)):
        time.sleep(30)


class ByTagsTaskRunner:
    """按标签抓取的任务运行器
    
    负责根据配置执行不同模式的抓取任务：
    - 合并二级标签模式
    - 全部一级标签模式  
    - 选择指定标签模式
    """
    
    def __init__(self, config: Dict[str, Any]):
        """初始化任务运行器
        
        Args:
            config: 包含所有配置参数的字典
        """
        self.config = config
        self.pg_saver = None
        self.data_saver = None
        
    def setup_persistence(self):
        """设置持久化组件（PG 和 DataSaver）"""
        # 自动入库：优先使用显式 --save-pg，其次检测配置文件存在
        save_pg_flag = self.config.get('save_pg', False) or os.path.exists(self.config.get('pg_config', ''))
        
        if save_pg_flag:
            if PgSaver is None:
                print("[error] 未找到 PgSaver 模块，请检查 pg_store.py")
                sys.exit(3)
            try:
                self.pg_saver = PgSaver(config_path=self.config.get('pg_config'))
                self.pg_saver.connect()
                self.pg_saver.ensure_schema()
                if not self.config.get('save_pg', False):
                    print("[info] 检测到 PostgreSQL 配置文件，已自动启用入库")
                else:
                    print("[info] PostgreSQL 连接成功，表结构已就绪")
            except Exception as e:
                print(f"[error] PostgreSQL 连接/建表失败: {e}")
                sys.exit(3)

        # 统一持久化器：用于保存页面/报表与（可选）PG入库
        if DataSaver is not None:
            try:
                self.data_saver = DataSaver(
                    output_dir=self.config.get('output_dir'),
                    report_dir=self.config.get('reports_dir'),
                    pg_saver=self.pg_saver,
                )
                print("[info] DataSaver 初始化成功")
            except Exception as e:
                print(f"[warn] DataSaver 初始化失败: {e}")
                self.data_saver = None

    def run_combine_second_mode(self, all_tags: List[Dict], headers: Dict, 
                               scene_overrides: Dict, limiter, policy, 
                               save_response_fn, write_summary_report_fn, 
                               write_failed_pages_report_fn, 
                               _time_window_parsed, _adaptive_after_run):
        """运行合并二级标签模式"""
        from fetch_author_square_by_tags import (
            select_tags, build_base_payload, add_tag_filter, 
            add_follower_filter, add_region_filter, add_extra_filters,
            deep_merge, execute_fetch_pages
        )
        
        first_filter = self.config.get('first_label')
        second_filter = self.config.get('second_label')
        province_id_resolved = self.config.get('province_id_resolved')
        city_id_resolved = self.config.get('city_id_resolved')
        
        selected = select_tags(
            all_tags, 
            first_label_filter=first_filter, 
            second_label_filter=second_filter, 
            max_count=self.config.get('max_tags', 1)
        )
        
        print(f"[info] 合并二级标签模式，选中标签数量：{len(selected)}")
        
        # 按一级标签分组
        first_groups = {}
        for sel in selected:
            first_label = sel["first_label"]
            if first_label not in first_groups:
                first_groups[first_label] = []
            first_groups[first_label].append(sel)

        for first_label, group in first_groups.items():
            second_ids = [sel["second_id"] for sel in group if sel["second_id"]]
            second_labels = [sel["second_label"] for sel in group if sel["second_label"]]
            
            print(f"[info] 处理一级标签：{first_label}，合并二级标签：{second_labels}")
            
            payload = build_base_payload(
                page=self.config.get('page', 1),
                limit=self.config.get('limit', 20),
                min_price=self.config.get('min_price', 0),
                video_type_rel_id=self.config.get('video_type', '2'),
                add_price_filter=self.config.get('use_price_filter', True),
                scene_overrides=scene_overrides,
                search_type=self.config.get('search_type'),
                sort_field=self.config.get('sort_field'),
                sort_type=self.config.get('sort_type'),
            )
            
            # 添加合并的二级标签过滤
            from fetch_author_square_by_tags import add_combined_second_filter
            add_combined_second_filter(payload, second_ids)
            add_follower_filter(payload, ge=self.config.get('follower_ge'), lt=self.config.get('follower_lt'))
            add_region_filter(payload, province_id=province_id_resolved, city_id=city_id_resolved)
            add_extra_filters(payload, self.config.get('extra_filter', []))
            
            # 覆盖 payload
            if self.config.get('payload_override') and os.path.exists(self.config.get('payload_override')):
                try:
                    with open(self.config.get('payload_override'), "r", encoding="utf-8") as f:
                        override_obj = json.load(f)
                    deep_merge(payload, override_obj)
                except Exception as e:
                    print(f"[warn] 载入 payload-override 失败: {e}")
            
            if self.config.get('dry_run', False):
                print(f"[dry-run] {first_label} / 合并二级")
                print("[dry-run] headers=", json.dumps(headers, ensure_ascii=False))
                print("[dry-run] payload=", json.dumps(payload, ensure_ascii=False))
                time.sleep(self.config.get('sleep_ms', 500) / 1000.0)
                continue
            
            # 执行抓取
            summary = orchestrate_labels_run(
                fetch_fn=execute_fetch_pages,
                headers=headers,
                payload=payload,
                args=self.config,
                first_label=first_label,
                second_label_for_save="_combined_",
                second_ids=second_ids,
                limiter=limiter,
                pg_saver=self.pg_saver,
                data_saver=self.data_saver,
                only_pages=self.config.get('only_pages'),
                logger=None,
                time_window_win=_time_window_parsed,
                policy=policy,
                save_page_fn=save_response_fn,
                write_summary_report_fn=write_summary_report_fn,
                write_failed_pages_report_fn=write_failed_pages_report_fn,
            )
            _adaptive_after_run(summary)

    def run_all_first_mode(self, all_tags: List[Dict], headers: Dict, 
                          scene_overrides: Dict, limiter, policy,
                          save_response_fn, write_summary_report_fn,
                          write_failed_pages_report_fn,
                          _time_window_parsed, _adaptive_after_run):
        """运行全部一级标签模式"""
        from fetch_author_square_by_tags import (
            build_base_payload, add_tag_filter, add_follower_filter, 
            add_region_filter, add_extra_filters, deep_merge, fetch_pages
        )
        
        province_id_resolved = self.config.get('province_id_resolved')
        city_id_resolved = self.config.get('city_id_resolved')
        
        print(f"[info] 全部一级标签模式，共 {len(all_tags)} 个一级标签")
        
        for idx, entry in enumerate(all_tags, start=1):
            first = entry.get("first") or {}
            first_label = first.get("label")
            first_id = first.get("id")
            if not first_id:
                continue
                
            payload = build_base_payload(
                page=self.config.get('page', 1),
                limit=self.config.get('limit', 20),
                min_price=self.config.get('min_price', 0),
                video_type_rel_id=self.config.get('video_type', '2'),
                add_price_filter=self.config.get('use_price_filter', True),
                scene_overrides=scene_overrides,
                search_type=self.config.get('search_type'),
                sort_field=self.config.get('sort_field'),
                sort_type=self.config.get('sort_type'),
            )
            
            add_tag_filter(payload, first_id=first_id, second_id=None)
            add_follower_filter(payload, ge=self.config.get('follower_ge'), lt=self.config.get('follower_lt'))
            add_region_filter(payload, province_id=province_id_resolved, city_id=city_id_resolved)
            add_extra_filters(payload, self.config.get('extra_filter', []))
            
            # 覆盖 payload
            if self.config.get('payload_override') and os.path.exists(self.config.get('payload_override')):
                try:
                    with open(self.config.get('payload_override'), "r", encoding="utf-8") as f:
                        override_obj = json.load(f)
                    deep_merge(payload, override_obj)
                except Exception as e:
                    print(f"[warn] 载入 payload-override 失败: {e}")
            
            if self.config.get('dry_run', False):
                print(f"[dry-run] ({idx}/{len(all_tags)}) first={first_label}")
                print("[dry-run] headers=", json.dumps(headers, ensure_ascii=False))
                print("[dry-run] payload=", json.dumps(payload, ensure_ascii=False))
                time.sleep(self.config.get('sleep_ms', 500) / 1000.0)
                continue
            
            # 时间窗 gating：在执行前等待进入窗口
            sleep_fn = _sleep_until_window if _sleep_until_window else _sleep_until_window_local
            sleep_fn(_time_window_parsed)
            
            summary = fetch_pages(
                headers=headers,
                base_payload=payload,
                start_page=self.config.get('start_page_computed', 1),
                max_pages=self.config.get('max_pages', 500),
                output_dir=self.config.get('output_dir'),
                first_label=first_label,
                second_label_for_save="_first_only_",
                second_ids=[],
                video_type=self.config.get('video_type', '2'),
                limit=self.config.get('limit', 20),
                min_price=self.config.get('min_price', 0),
                stop_when_empty=self.config.get('stop_when_empty', False),
                sleep_ms=self.config.get('sleep_ms', 500),
                retry_max=self.config.get('retry_max', 3),
                retry_backoff_ms=self.config.get('retry_backoff_ms', 1000),
                pg_saver=self.pg_saver,
                data_saver=self.data_saver,
                auto_pages=self.config.get('auto_pages', False),
                auto_pages_upper_bound=self.config.get('auto_pages_upper_bound'),
                skip_existing=self.config.get('skip_existing', False),
                limiter=limiter,
                cooldown_on_429_403_ms=self.config.get('cooldown_429_403_ms'),
                max_failure_rate=self.config.get('max_failure_rate'),
                stop_when_empty_n=self.config.get('stop_when_empty_n'),
                max_consecutive_401=self.config.get('max_consecutive_401'),
                pause_on_401_ms=self.config.get('pause_on_401_ms'),
                use_fetcher_engine=True,
                logger=None,
                save_page_fn=save_response_fn,
                write_summary_report_fn=write_summary_report_fn,
                write_failed_pages_report_fn=write_failed_pages_report_fn,
            )
            _adaptive_after_run(summary)

    def run_selected_tags_mode(self, all_tags: List[Dict], headers: Dict,
                              scene_overrides: Dict, limiter, policy,
                              save_response_fn, write_summary_report_fn,
                              write_failed_pages_report_fn,
                              _time_window_parsed, _adaptive_after_run):
        """运行选择指定标签模式"""
        from fetch_author_square_by_tags import (
            select_tags, build_base_payload, add_tag_filter,
            add_follower_filter, add_region_filter, add_extra_filters,
            deep_merge, execute_fetch_pages
        )
        
        first_filter = self.config.get('first_label')
        second_filter = self.config.get('second_label')
        province_id_resolved = self.config.get('province_id_resolved')
        city_id_resolved = self.config.get('city_id_resolved')
        
        selected = select_tags(
            all_tags, 
            first_label_filter=first_filter, 
            second_label_filter=second_filter, 
            max_count=self.config.get('max_tags', 1)
        )
        
        print(f"[info] 选中标签数量：{len(selected)}")
        for sel in selected:
            print(
                f" - {sel['first_label']} / {sel['second_label'] or '(一级标签)'} -> ids: first={sel['first_id']}, second={sel['second_id']}"
            )
        
        for idx, sel in enumerate(selected, start=1):
            payload = build_base_payload(
                page=self.config.get('page', 1),
                limit=self.config.get('limit', 20),
                min_price=self.config.get('min_price', 0),
                video_type_rel_id=self.config.get('video_type', '2'),
                add_price_filter=self.config.get('use_price_filter', True),
                scene_overrides=scene_overrides,
                search_type=self.config.get('search_type'),
                sort_field=self.config.get('sort_field'),
                sort_type=self.config.get('sort_type'),
            )
            
            add_tag_filter(payload, first_id=sel["first_id"], second_id=sel["second_id"])
            add_follower_filter(payload, ge=self.config.get('follower_ge'), lt=self.config.get('follower_lt'))
            add_region_filter(payload, province_id=province_id_resolved, city_id=city_id_resolved)
            add_extra_filters(payload, self.config.get('extra_filter', []))
            
            if self.config.get('payload_override') and os.path.exists(self.config.get('payload_override')):
                try:
                    with open(self.config.get('payload_override'), "r", encoding="utf-8") as f:
                        override_obj = json.load(f)
                    deep_merge(payload, override_obj)
                except Exception as e:
                    print(f"[warn] 载入 payload-override 失败: {e}")
            
            if self.config.get('dry_run', False):
                print(f"[dry-run] ({idx}/{len(selected)}) {sel['first_label']} / {sel['second_label'] or '(一级)'}")
                print("[dry-run] headers=", json.dumps(headers, ensure_ascii=False))
                print("[dry-run] payload=", json.dumps(payload, ensure_ascii=False))
                time.sleep(self.config.get('sleep_ms', 500) / 1000.0)
            else:
                # 统一分页执行
                summary = orchestrate_labels_run(
                    fetch_fn=execute_fetch_pages,
                    headers=headers,
                    payload=payload,
                    args=self.config,
                    first_label=sel["first_label"],
                    second_label_for_save=sel["second_label"] or "_first_only_",
                    second_ids=[sel["second_id"]] if sel["second_id"] else [],
                    limiter=limiter,
                    pg_saver=self.pg_saver,
                    data_saver=self.data_saver,
                    logger=None,
                    time_window_win=_time_window_parsed,
                    policy=policy,
                    save_page_fn=save_response_fn,
                    write_summary_report_fn=write_summary_report_fn,
                    write_failed_pages_report_fn=write_failed_pages_report_fn,
                )

    def run(self, all_tags: List[Dict], headers: Dict, scene_overrides: Dict,
            limiter, policy, save_response_fn, write_summary_report_fn,
            write_failed_pages_report_fn, _time_window_parsed, _adaptive_after_run):
        """运行任务
        
        根据配置选择不同的运行模式
        """
        self.setup_persistence()
        
        try:
            if self.config.get('combine_second', False):
                self.run_combine_second_mode(
                    all_tags, headers, scene_overrides, limiter, policy,
                    save_response_fn, write_summary_report_fn, write_failed_pages_report_fn,
                    _time_window_parsed, _adaptive_after_run
                )
            elif self.config.get('all_first', False):
                self.run_all_first_mode(
                    all_tags, headers, scene_overrides, limiter, policy,
                    save_response_fn, write_summary_report_fn, write_failed_pages_report_fn,
                    _time_window_parsed, _adaptive_after_run
                )
            else:
                self.run_selected_tags_mode(
                    all_tags, headers, scene_overrides, limiter, policy,
                    save_response_fn, write_summary_report_fn, write_failed_pages_report_fn,
                    _time_window_parsed, _adaptive_after_run
                )
        finally:
            if self.pg_saver:
                self.pg_saver.close()