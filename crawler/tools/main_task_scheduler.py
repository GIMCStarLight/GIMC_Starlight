"""
主任务调度器 - 负责协调各种爬取模式的执行
"""

import os
import sys
import time
from pathlib import Path

# 添加项目根目录到 Python 路径
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    from fetch_author_square_by_tags import (
        load_content_tags, read_cookie_file, build_headers, select_tags,
        build_base_payload, add_tag_filter, add_follower_filter, add_region_filter,
        add_extra_filters, deep_merge, execute_fetch_pages, fetch_pages,
        add_combined_second_filter, build_limiter, write_summary_report, 
        write_failed_pages_report, TASK_CONTROL_DIR, CONFIG_DIR, RESULTS_DIR, REPORTS_DIR
    )
except ImportError as e:
    print(f"[ERROR] 无法导入必要的函数: {e}")
    sys.exit(1)

try:
    from tools.by_tags_orchestrator import orchestrate_labels_run, _sleep_until_window, _is_in_window
except ImportError:
    try:
        from by_tags_orchestrator import orchestrate_labels_run, _sleep_until_window, _is_in_window
    except ImportError:
        orchestrate_labels_run = None
        _sleep_until_window = None
        _is_in_window = None

try:
    from tools.author_fetcher import AuthorFetcher
except ImportError:
    try:
        from author_fetcher import AuthorFetcher
    except ImportError:
        AuthorFetcher = None


class Args:
    """简单的参数容器类"""
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)


class MainTaskScheduler:
    """主任务调度器"""
    
    def __init__(self):
        pass
    
    def run(self, config: dict):
        """运行主任务调度"""
        # 创建 args 对象
        args = Args(**config)
        
        # 加载内容标签
        content_tags_path = getattr(args, 'content_tags_path', None) or getattr(args, 'tags_file', None)
        content_tags = []
        if content_tags_path and os.path.exists(content_tags_path):
            try:
                content_tags = load_content_tags(content_tags_path)
                print(f"[info] 加载了 {len(content_tags)} 个内容标签")
            except Exception as e:
                print(f"[warn] 加载内容标签失败: {e}")
        
        # 读取 cookies
        cookie_path = getattr(args, 'cookie_path', None) or getattr(args, 'cookies_file', None)
        cookie_str = ""
        if cookie_path and os.path.exists(cookie_path):
            try:
                cookie_str = read_cookie_file(cookie_path)
                print(f"[info] 加载了 cookies 文件: {cookie_path}")
            except Exception as e:
                print(f"[warn] 读取 cookies 失败: {e}")
        
        # 构建请求头
        user_agent = getattr(args, 'user_agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')
        referer = getattr(args, 'referer', 'https://compass.jinritemai.com/')
        star_id = getattr(args, 'star_id', '0')  # 默认值
        headers = build_headers(cookie_str, star_id, user_agent, referer)
        
        # 构建限速器
        limiter = build_limiter(args)
        
        # 初始化 PostgreSQL 保存器（如果需要）
        pg_saver = None
        pg_config_path = getattr(args, 'pg_config', None)
        
        # 自动入库：优先使用显式 --save-pg，其次检测配置文件存在
        save_pg_flag = getattr(args, 'save_pg', False) or (pg_config_path and os.path.exists(pg_config_path))
        
        if save_pg_flag:
            try:
                # 优先使用 db_v2
                from services.db_v2 import DatabaseServiceV2
                if pg_config_path and os.path.exists(pg_config_path):
                    import json
                    with open(pg_config_path, 'r') as f:
                        db_config = json.load(f)
                    pg_saver = DatabaseServiceV2(db_config)
                    if not getattr(args, 'save_pg', False):
                        print("[info] 检测到 PostgreSQL 配置文件，已自动启用入库 (使用 db_v2)")
                    else:
                        print(f"[info] PostgreSQL 连接成功 (使用 db_v2)")
                else:
                    # 使用默认配置
                    pg_saver = DatabaseServiceV2()
                    print("[info] 使用默认 PostgreSQL 配置 (db_v2)")
            except ImportError:
                # 回退到旧的 db.py
                try:
                    from services.db import PgSaver
                    if pg_config_path and os.path.exists(pg_config_path):
                        pg_saver = PgSaver(pg_config_path)
                        pg_saver.connect()
                        pg_saver.ensure_schema()
                        print("[warn] 使用旧版 db.py (建议升级到 db_v2)")
                    else:
                        print("[warn] PostgreSQL 配置文件不存在，跳过数据库保存")
                except Exception as e:
                    print(f"[error] PostgreSQL 连接失败: {e}")
            except Exception as e:
                print(f"[error] PostgreSQL 连接失败: {e}")
                sys.exit(3)
        
        # 根据不同模式执行任务
        # 检查是否有关键词搜索参数
        # 优先处理批量关键词模式
        keyword_file = getattr(args, 'keyword_file', None)
        if keyword_file and os.path.exists(keyword_file):
            return self._run_batch_keywords_mode(args, headers, limiter, pg_saver)

        keyword_arg = None
        for k in ['search_star_id', 'search_handle', 'search_nickname', 'keyword']:
            if hasattr(args, k) and getattr(args, k):
                keyword_arg = getattr(args, k).strip()
                break
        
        if keyword_arg:
            self._run_keyword_search_mode(args, headers, limiter, keyword_arg, pg_saver)
        elif getattr(args, 'combine_second', False):
            self._run_combine_second_mode(args, headers, content_tags, limiter, pg_saver)
        elif getattr(args, 'all_first', False):
            self._run_all_first_mode(args, headers, content_tags, limiter, pg_saver)
        else:
            self._run_selected_tags_mode(args, headers, content_tags, limiter, pg_saver)
    
    def _run_keyword_search_mode(self, args, headers, limiter, keyword_arg, pg_saver=None):
        """执行关键词搜索模式"""
        
        # 构建基础 payload
        base_payload = build_base_payload(
            page=getattr(args, 'page', 1),
            limit=getattr(args, 'limit', 20),
            min_price=getattr(args, 'min_price', None),
            video_type_rel_id=getattr(args, 'video_type', None),
            add_price_filter=True,
            scene_overrides={
                "platform_source": getattr(args, 'platform_source', None),
                "search_scene": getattr(args, 'search_scene', None),
                "display_scene": getattr(args, 'display_scene', None),
                "marketing_target": getattr(args, 'marketing_target', None),
                "task_category": getattr(args, 'task_category', None),
                "first_industry_id": getattr(args, 'first_industry_id', None),
                "task_status": getattr(args, 'task_status', None),
            },
            search_type=getattr(args, 'search_type', None),
            sort_field=getattr(args, 'sort_field', None),
            sort_type=getattr(args, 'sort_type', None),
        )
        
        # 设置搜索关键字
        try:
            base_payload.setdefault("search_param", {})["keyword"] = keyword_arg
        except Exception:
            base_payload["search_param"] = {"keyword": keyword_arg, "seach_type": getattr(args, 'search_type', 2)}

        # 添加过滤器
        add_follower_filter(base_payload, ge=getattr(args, 'follower_ge', None), lt=getattr(args, 'follower_lt', None))
        add_region_filter(base_payload, province_id=getattr(args, 'province_id', None), city_id=getattr(args, 'city_id', None))
        add_extra_filters(base_payload, extras=getattr(args, 'extra_filter', []) or [])

        # 覆盖 payload（如需）
        payload_override_path = getattr(args, 'payload_override', None)
        if payload_override_path and os.path.exists(payload_override_path):
            try:
                import json
                with open(payload_override_path, "r", encoding="utf-8") as f:
                    override = json.load(f)
                base_payload = deep_merge(base_payload, override)
            except Exception as e:
                print(f"[warn] 读取 payload_override 失败: {e}")

        print(f"[info] 关键词搜索：keyword='{keyword_arg}', video_type={getattr(args, 'video_type', None)}")
        
        if getattr(args, 'dry_run', False):
            import json
            print("[dry-run] headers=", json.dumps(headers, ensure_ascii=False))
            print("[dry-run] payload=", json.dumps(base_payload, ensure_ascii=False))
            return

        # 调用实际的执行逻辑
        from fetch_author_square_by_tags import execute_fetch_pages
        from services.data_saver import DataSaver
        
        # 创建数据保存器
        data_saver = DataSaver(
            output_dir=getattr(args, 'output_dir', './results'),
            report_dir=getattr(args, 'report_dir', './reports'),
            pg_saver=pg_saver,
            logger=None
        )
        
        # 执行分页抓取
        summary = execute_fetch_pages(
            headers=headers,
            payload=base_payload,
            args=args,
            first_label="关键词搜索",
            second_label_for_save=str(keyword_arg),
            second_ids=None,
            limiter=limiter,
            pg_saver=pg_saver,
            data_saver=data_saver,
            only_pages=None,
            logger=None
        )
        
        print(f"[info] 关键词搜索模式执行完成，抓取了 {summary.get('pages_done', 0)} 页，共 {summary.get('authors_total', 0)} 个作者")
        return summary


    def _run_batch_keywords_mode(self, args, headers, limiter, pg_saver):
        """执行批量关键词模式：从文件读取关键词，逐个执行搜索"""
        path = getattr(args, 'keyword_file', None)
        print(f"[info] 批量关键词模式：读取文件 {path}")
        try:
            with open(path, 'r', encoding='utf-8') as f:
                raw_lines = [line.strip() for line in f.readlines()]
        except Exception as e:
            print(f"[error] 无法读取关键词文件: {e}")
            return None

        keywords = [ln for ln in raw_lines if ln and not ln.startswith('#')]

        if getattr(args, 'dedup_keywords', False):
            seen = set()
            deduped = []
            for kw in keywords:
                if kw not in seen:
                    seen.add(kw)
                    deduped.append(kw)
            keywords = deduped

        max_n = getattr(args, 'max_keywords', None)
        if isinstance(max_n, int) and max_n > 0:
            keywords = keywords[:max_n]

        print(f"[info] 将处理 {len(keywords)} 个关键词")

        sleep_ms = getattr(args, 'sleep_between_keywords_ms', 800) or 800
        summaries = []
        for idx, kw in enumerate(keywords, start=1):
            print(f"[info] ({idx}/{len(keywords)}) 处理关键词：{kw}")
            orig_type = getattr(args, 'search_type', 2)
            # 自动识别搜索类型：纯数字->星图ID(1)，ASCII/包含TG前缀->抖音号(3)，其他->昵称(2)
            try:
                if kw.isdigit():
                    setattr(args, 'search_type', 1)
                    print('[info] 识别为星图ID，使用 search_type=1')
                elif kw.startswith('TG') or all((ord(c) < 128) and (c.isalnum() or c in {'_', '-', '.'}) for c in kw):
                    setattr(args, 'search_type', 3)
                    print('[info] 识别为抖音号，使用 search_type=3')
                else:
                    setattr(args, 'search_type', 2)
                    print('[info] 识别为昵称，使用 search_type=2')
                summary = self._run_keyword_search_mode(args, headers, limiter, kw, pg_saver)
            except Exception as e:
                print(f"[error] 关键词 '{kw}' 处理失败: {e}")
                summary = None
            finally:
                setattr(args, 'search_type', orig_type)
            if summary:
                summaries.append(summary)
            try:
                time.sleep(int(sleep_ms) / 1000.0)
            except Exception:
                time.sleep(0.8)

        total_pages = sum(s.get('pages_done', 0) for s in summaries if isinstance(s, dict))
        total_authors = sum(s.get('authors_total', 0) for s in summaries if isinstance(s, dict))
        agg = {"keywords_processed": len(keywords), "pages_total": total_pages, "authors_total": total_authors}
        try:
            import json
            print("[info] 批量关键词模式完成: ", json.dumps(agg, ensure_ascii=False))
        except Exception:
            print(f"[info] 批量关键词模式完成: {agg}")
        return agg
    def _run_combine_second_mode(self, args, headers, content_tags, limiter, pg_saver):
        """执行组合二级标签模式"""
        from fetch_author_square_by_tags import (
            select_tags, build_base_payload, add_combined_second_filter,
            add_follower_filter, add_region_filter, add_extra_filters,
            deep_merge, execute_fetch_pages
        )
        from services.data_saver import DataSaver
        from tools.by_tags_orchestrator import orchestrate_labels_run
        
        # 选择标签
        first_filter = getattr(args, 'first_label', None)
        second_filter = getattr(args, 'second_label', None)
        max_tags = getattr(args, 'max_tags', None)
        
        selected = select_tags(
            content_tags, 
            first_label_filter=first_filter, 
            second_label_filter=second_filter, 
            max_count=max_tags
        )
        
        print(f"[info] 合并二级标签模式，选中标签数量：{len(selected)}")
        
        # 按一级标签分组
        first_groups = {}
        for sel in selected:
            first_label = sel["first_label"]
            if first_label not in first_groups:
                first_groups[first_label] = []
            first_groups[first_label].append(sel)

        # 创建数据保存器
        data_saver = DataSaver(
            output_dir=getattr(args, 'output_dir', './results'),
            report_dir=getattr(args, 'report_dir', './reports'),
            pg_saver=pg_saver,
            logger=None
        )

        total_summaries = []
        for first_label, group in first_groups.items():
            second_ids = [sel["second_id"] for sel in group if sel["second_id"]]
            second_labels = [sel["second_label"] for sel in group if sel["second_label"]]
            
            print(f"[info] 处理一级标签：{first_label}，合并二级标签：{second_labels}")
            
            # 构建 payload
            payload = build_base_payload(
                page=getattr(args, 'page', 1),
                limit=getattr(args, 'limit', 20),
                min_price=getattr(args, 'min_price', 0),
                video_type_rel_id=getattr(args, 'video_type', '2'),
                add_price_filter=getattr(args, 'use_price_filter', True),
                scene_overrides={
                    "platform_source": getattr(args, 'platform_source', None),
                    "search_scene": getattr(args, 'search_scene', None),
                    "display_scene": getattr(args, 'display_scene', None),
                    "marketing_target": getattr(args, 'marketing_target', None),
                    "task_category": getattr(args, 'task_category', None),
                    "first_industry_id": getattr(args, 'first_industry_id', None),
                    "task_status": getattr(args, 'task_status', None),
                },
                search_type=getattr(args, 'search_type', None),
                sort_field=getattr(args, 'sort_field', None),
                sort_type=getattr(args, 'sort_type', None),
            )
            
            # 添加合并的二级标签过滤
            if second_ids:
                add_combined_second_filter(payload, second_ids)
            
            # 添加其他过滤器
            add_follower_filter(payload, ge=getattr(args, 'follower_ge', None), lt=getattr(args, 'follower_lt', None))
            add_region_filter(payload, province_id=getattr(args, 'province_id', None), city_id=getattr(args, 'city_id', None))
            add_extra_filters(payload, extras=getattr(args, 'extra_filter', []) or [])
            
            # 覆盖 payload（如需）
            payload_override_path = getattr(args, 'payload_override', None)
            if payload_override_path and os.path.exists(payload_override_path):
                try:
                    import json
                    with open(payload_override_path, "r", encoding="utf-8") as f:
                        override = json.load(f)
                    payload = deep_merge(payload, override)
                except Exception as e:
                    print(f"[warn] 读取 payload_override 失败: {e}")
            
            if getattr(args, 'dry_run', False):
                import json
                print(f"[dry-run] 一级标签: {first_label}, 二级标签: {second_labels}")
                print("[dry-run] headers=", json.dumps(headers, ensure_ascii=False))
                print("[dry-run] payload=", json.dumps(payload, ensure_ascii=False))
                continue
            
            # 执行分页抓取
            summary = orchestrate_labels_run(
                fetch_fn=execute_fetch_pages,
                headers=headers,
                payload=payload,
                args=args,
                first_label=first_label,
                second_label_for_save="combined_second",
                second_ids=second_ids,
                limiter=limiter,
                pg_saver=pg_saver,
                data_saver=data_saver,
                logger=None,
                time_window_win=None,
                policy=None
            )
            total_summaries.append(summary)
        
        # 汇总结果
        total_pages = sum(s.get('pages_done', 0) for s in total_summaries)
        total_authors = sum(s.get('authors_total', 0) for s in total_summaries)
        print(f"[info] 组合二级标签模式执行完成，共处理 {len(first_groups)} 个一级标签，抓取了 {total_pages} 页，共 {total_authors} 个作者")

    def _run_all_first_mode(self, args, headers, content_tags, limiter, pg_saver):
        """执行所有一级标签模式"""
        from fetch_author_square_by_tags import (
            build_base_payload, add_tag_filter, add_follower_filter, 
            add_region_filter, add_extra_filters, deep_merge, execute_fetch_pages
        )
        from services.data_saver import DataSaver
        from tools.by_tags_orchestrator import orchestrate_labels_run
        
        print(f"[info] 所有一级标签模式，共 {len(content_tags)} 个一级标签")
        
        # 创建数据保存器
        data_saver = DataSaver(
            output_dir=getattr(args, 'output_dir', './results'),
            report_dir=getattr(args, 'report_dir', './reports'),
            pg_saver=pg_saver,
            logger=None
        )

        total_summaries = []
        for idx, entry in enumerate(content_tags, start=1):
            first = entry.get("first") or {}
            first_label = first.get("label")
            first_id = first.get("id")
            if not first_id:
                continue
                
            print(f"[info] 处理一级标签 {idx}/{len(content_tags)}: {first_label}")
            
            # 构建 payload
            payload = build_base_payload(
                page=getattr(args, 'page', 1),
                limit=getattr(args, 'limit', 20),
                min_price=getattr(args, 'min_price', 0),
                video_type_rel_id=getattr(args, 'video_type', '2'),
                add_price_filter=getattr(args, 'use_price_filter', True),
                scene_overrides={
                    "platform_source": getattr(args, 'platform_source', None),
                    "search_scene": getattr(args, 'search_scene', None),
                    "display_scene": getattr(args, 'display_scene', None),
                    "marketing_target": getattr(args, 'marketing_target', None),
                    "task_category": getattr(args, 'task_category', None),
                    "first_industry_id": getattr(args, 'first_industry_id', None),
                    "task_status": getattr(args, 'task_status', None),
                },
                search_type=getattr(args, 'search_type', None),
                sort_field=getattr(args, 'sort_field', None),
                sort_type=getattr(args, 'sort_type', None),
            )
            
            # 添加一级标签过滤（不指定二级标签）
            add_tag_filter(payload, first_id=first_id, second_id=None)
            
            # 添加其他过滤器
            add_follower_filter(payload, ge=getattr(args, 'follower_ge', None), lt=getattr(args, 'follower_lt', None))
            add_region_filter(payload, province_id=getattr(args, 'province_id', None), city_id=getattr(args, 'city_id', None))
            add_extra_filters(payload, extras=getattr(args, 'extra_filter', []) or [])
            
            # 覆盖 payload（如需）
            payload_override_path = getattr(args, 'payload_override', None)
            if payload_override_path and os.path.exists(payload_override_path):
                try:
                    import json
                    with open(payload_override_path, "r", encoding="utf-8") as f:
                        override = json.load(f)
                    payload = deep_merge(payload, override)
                except Exception as e:
                    print(f"[warn] 读取 payload_override 失败: {e}")
            
            if getattr(args, 'dry_run', False):
                import json
                print(f"[dry-run] 一级标签: {first_label}")
                print("[dry-run] headers=", json.dumps(headers, ensure_ascii=False))
                print("[dry-run] payload=", json.dumps(payload, ensure_ascii=False))
                continue
            
            # 执行分页抓取
            summary = orchestrate_labels_run(
                fetch_fn=execute_fetch_pages,
                headers=headers,
                payload=payload,
                args=args,
                first_label=first_label,
                second_label_for_save=None,  # 一级标签模式不指定二级标签
                second_ids=None,
                limiter=limiter,
                pg_saver=pg_saver,
                data_saver=data_saver,
                logger=None,
                time_window_win=None,
                policy=None
            )
            total_summaries.append(summary)
        
        # 汇总结果
        total_pages = sum(s.get('pages_done', 0) for s in total_summaries)
        total_authors = sum(s.get('authors_total', 0) for s in total_summaries)
        print(f"[info] 所有一级标签模式执行完成，共处理 {len(content_tags)} 个一级标签，抓取了 {total_pages} 页，共 {total_authors} 个作者")

    def _run_selected_tags_mode(self, args, headers, content_tags, limiter, pg_saver):
        """执行选定标签模式"""
        from fetch_author_square_by_tags import (
            select_tags, build_base_payload, add_tag_filter,
            add_follower_filter, add_region_filter, add_extra_filters,
            deep_merge, execute_fetch_pages
        )
        from services.data_saver import DataSaver
        from tools.by_tags_orchestrator import orchestrate_labels_run
        
        # 选择标签
        first_filter = getattr(args, 'first_label', None)
        second_filter = getattr(args, 'second_label', None)
        max_tags = getattr(args, 'max_tags', None)
        
        selected = select_tags(
            content_tags, 
            first_label_filter=first_filter, 
            second_label_filter=second_filter, 
            max_count=max_tags
        )
        
        print(f"[info] 选中标签数量：{len(selected)}")
        for sel in selected:
            print(
                f" - {sel['first_label']} / {sel['second_label'] or '(一级标签)'} -> ids: first={sel['first_id']}, second={sel['second_id']}"
            )
        
        # 创建数据保存器
        data_saver = DataSaver(
            output_dir=getattr(args, 'output_dir', './results'),
            report_dir=getattr(args, 'report_dir', './reports'),
            pg_saver=pg_saver,
            logger=None
        )

        total_summaries = []
        for idx, sel in enumerate(selected, start=1):
            print(f"[info] 处理标签 {idx}/{len(selected)}: {sel['first_label']} / {sel['second_label'] or '(一级标签)'}")
            
            # 构建 payload
            payload = build_base_payload(
                page=getattr(args, 'page', 1),
                limit=getattr(args, 'limit', 20),
                min_price=getattr(args, 'min_price', 0),
                video_type_rel_id=getattr(args, 'video_type', '2'),
                add_price_filter=getattr(args, 'use_price_filter', True),
                scene_overrides={
                    "platform_source": getattr(args, 'platform_source', None),
                    "search_scene": getattr(args, 'search_scene', None),
                    "display_scene": getattr(args, 'display_scene', None),
                    "marketing_target": getattr(args, 'marketing_target', None),
                    "task_category": getattr(args, 'task_category', None),
                    "first_industry_id": getattr(args, 'first_industry_id', None),
                    "task_status": getattr(args, 'task_status', None),
                },
                search_type=getattr(args, 'search_type', None),
                sort_field=getattr(args, 'sort_field', None),
                sort_type=getattr(args, 'sort_type', None),
            )
            
            # 添加标签过滤
            add_tag_filter(payload, first_id=sel['first_id'], second_id=sel['second_id'])
            
            # 添加其他过滤器
            add_follower_filter(payload, ge=getattr(args, 'follower_ge', None), lt=getattr(args, 'follower_lt', None))
            add_region_filter(payload, province_id=getattr(args, 'province_id', None), city_id=getattr(args, 'city_id', None))
            add_extra_filters(payload, extras=getattr(args, 'extra_filter', []) or [])
            
            # 覆盖 payload（如需）
            payload_override_path = getattr(args, 'payload_override', None)
            if payload_override_path and os.path.exists(payload_override_path):
                try:
                    import json
                    with open(payload_override_path, "r", encoding="utf-8") as f:
                        override = json.load(f)
                    payload = deep_merge(payload, override)
                except Exception as e:
                    print(f"[warn] 读取 payload_override 失败: {e}")
            
            if getattr(args, 'dry_run', False):
                import json
                print(f"[dry-run] 标签: {sel['first_label']} / {sel['second_label'] or '(一级标签)'}")
                print("[dry-run] headers=", json.dumps(headers, ensure_ascii=False))
                print("[dry-run] payload=", json.dumps(payload, ensure_ascii=False))
                continue
            
            # 执行分页抓取
            summary = orchestrate_labels_run(
                fetch_fn=execute_fetch_pages,
                headers=headers,
                payload=payload,
                args=args,
                first_label=sel['first_label'],
                second_label_for_save=sel['second_label'],
                second_ids=[sel['second_id']] if sel['second_id'] else None,
                limiter=limiter,
                pg_saver=pg_saver,
                data_saver=data_saver,
                logger=None,
                time_window_win=None,
                policy=None
            )
            total_summaries.append(summary)
        
        # 汇总结果
        total_pages = sum(s.get('pages_done', 0) for s in total_summaries)
        total_authors = sum(s.get('authors_total', 0) for s in total_summaries)
        print(f"[info] 选定标签模式执行完成，共处理 {len(selected)} 个标签，抓取了 {total_pages} 页，共 {total_authors} 个作者")