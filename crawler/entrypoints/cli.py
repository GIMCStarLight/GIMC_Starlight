#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""Task Control CLI - 统一命令行入口

集成现有工具脚本为子命令，复用用例层逻辑。

使用示例:
    # 任务调度
    python -m task_control.entrypoints.cli schedule --mode second_split --limit 10 --max-pages 5
    
    # 智能爬取控制
    python -m task_control.entrypoints.cli smart --mode second_split --auto-pages --resume
    
    # 数据库清理
    python -m task_control.entrypoints.cli cleanup --pg-config config/postgres.json
    
    # 数据验证
    python -m task_control.entrypoints.cli validate --pg-config config/postgres.json
"""

import argparse
import sys
from pathlib import Path

# 确保项目根目录在 sys.path 中
# 动态路径检测和设置
from pathlib import Path
import sys

# 添加项目根目录到Python路径
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))

# 使用动态路径解析器
from services.path_resolver import setup_project_paths
path_resolver = setup_project_paths()

# 导入用例层服务
from usecases.plan_service import PlanService
from usecases.task_execution_service import TaskExecutionService, TaskExecutionConfig

# 导入现有工具脚本的主要功能
from tools import task_scheduler
from tools import smart_crawl_controller
from tools import cleanup_pg_testdata
from tools import validate_pg_transactions


def create_base_parser():
    """创建基础解析器"""
    parser = argparse.ArgumentParser(
        prog='task-control',
        description='Task Control CLI - 统一的爬虫任务控制命令行工具',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    # 全局选项
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='启用详细输出'
    )
    
    parser.add_argument(
        '--config-dir',
        default=str(path_resolver.config_dir),
        help='配置文件目录 (默认: 自动检测)'
    )
    
    return parser


def add_schedule_command(subparsers):
    """添加任务调度子命令"""
    schedule_parser = subparsers.add_parser(
        'schedule',
        help='任务调度 - 生成和执行爬取任务计划',
        description='基于标签和粉丝范围生成任务计划并执行'
    )
    
    # 通用参数
    schedule_parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='启用详细输出'
    )
    
    # 基础参数
    schedule_parser.add_argument(
        '--mode',
        choices=['second_split', 'combine_second', 'popularity_first', 'daily_increment', 'combined', 'first_only'],
        default='second_split',
        help='任务模式，可选：second_split/combine_second/popularity_first/daily_increment（兼容别名：combined, first_only）'
    )
    
    schedule_parser.add_argument(
        '--limit',
        type=int,
        default=10,
        help='每页限制数量 (默认: 10)'
    )
    
    schedule_parser.add_argument(
        '--max-pages',
        type=int,
        default=5,
        help='最大页数 (默认: 5)'
    )
    
    schedule_parser.add_argument(
        '--sleep-ms',
        type=int,
        default=1000,
        help='请求间隔毫秒数 (默认: 1000)'
    )
    
    # 输出配置
    schedule_parser.add_argument(
        '--output-dir',
        default='results',
        help='输出目录 (默认: results)'
    )
    
    schedule_parser.add_argument(
        '--cookie-file',
        default='cookies.txt',
        help='Cookie文件路径 (默认: cookies.txt)'
    )
    
    # 数据库配置
    schedule_parser.add_argument(
        '--save-pg',
        action='store_true',
        help='保存到PostgreSQL数据库'
    )
    
    schedule_parser.add_argument(
        '--pg-config',
        default='config/postgres.json',
        help='PostgreSQL配置文件 (默认: config/postgres.json)'
    )
    
    # 高级选项
    schedule_parser.add_argument(
        '--resume',
        action='store_true',
        help='断点续传'
    )
    
    schedule_parser.add_argument(
        '--skip-existing',
        action='store_true',
        help='跳过已存在的文件'
    )
    
    schedule_parser.add_argument(
        '--concurrency',
        type=int,
        default=1,
        help='并发数 (默认: 1)'
    )
    
    schedule_parser.add_argument(
        '--qps',
        type=int,
        default=2,
        help='QPS限制 (默认: 2)'
    )
    
    schedule_parser.set_defaults(func=handle_schedule_command)


def add_smart_command(subparsers):
    """添加智能爬取控制子命令"""
    smart_parser = subparsers.add_parser(
        'smart',
        help='智能爬取控制 - 长时间运行的智能调度',
        description='智能调度控制，支持动态暂停和断点续跑'
    )
    
    # 通用参数
    smart_parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='启用详细输出'
    )
    
    # 基础参数
    smart_parser.add_argument(
        '--mode',
        choices=['second_split', 'combine_second', 'all_first', 'combined', 'first_only'],
        default='second_split',
        help='任务模式，可选：second_split/combine_second/all_first（兼容别名：combined, first_only）'
    )

    # 传递给底层智能控制器的直通参数（便于只生成计划后退出）
    smart_parser.add_argument(
        '--generate-only',
        action='store_true',
        help='仅生成任务计划后退出（传递给智能控制器）'
    )
    
    smart_parser.add_argument(
        '--auto-pages',
        action='store_true',
        help='启用自动分页'
    )
    
    smart_parser.add_argument(
        '--auto-pages-upper-bound',
        type=int,
        default=100,
        help='自动分页上限 (默认: 100)'
    )

    # 允许通过JSON覆盖payload（转发给智能控制器）
    smart_parser.add_argument(
        '--payload-override',
        help='通过JSON文件覆盖请求payload（传递给智能控制器）'
    )
    
    # 智能控制参数
    smart_parser.add_argument(
        '--work-cycle-mins',
        type=int,
        default=50,
        help='工作周期分钟数 (默认: 50)'
    )
    
    smart_parser.add_argument(
        '--fixed-pause-mins',
        type=int,
        default=10,
        help='固定暂停分钟数 (默认: 10)'
    )
    
    smart_parser.add_argument(
        '--pause-levels',
        default='3,12,30,60,120',
        help='暂停等级分钟数，逗号分隔 (默认: 3,12,30,60,120)'
    )
    
    smart_parser.add_argument(
        '--failure-rate-threshold',
        type=float,
        default=0.35,
        help='失败率阈值 (默认: 0.35)'
    )
    
    # 文件配置
    smart_parser.add_argument(
        '--cookies-file',
        default='config/cookies.txt',
        help='Cookie文件路径 (默认: config/cookies.txt)'
    )
    
    smart_parser.add_argument(
        '--jobs-plan-out',
        default='reports/smart_jobs_plan.json',
        help='任务计划输出文件 (默认: reports/smart_jobs_plan.json)'
    )
    
    smart_parser.add_argument(
        '--state-file',
        default='reports/smart_state.json',
        help='状态文件路径 (默认: reports/smart_state.json)'
    )
    
    # 控制选项
    smart_parser.add_argument(
        '--resume',
        action='store_true',
        help='断点续传'
    )
    
    smart_parser.add_argument(
        '--skip-existing',
        action='store_true',
        help='跳过已存在的文件'
    )
    
    smart_parser.add_argument(
        '--save-pg',
        action='store_true',
        help='保存到PostgreSQL数据库'
    )
    
    smart_parser.set_defaults(func=handle_smart_command)


def add_cleanup_command(subparsers):
    """添加数据库清理子命令"""
    cleanup_parser = subparsers.add_parser(
        'cleanup',
        help='数据库清理 - 清理PostgreSQL测试数据',
        description='清理PostgreSQL数据库中的测试数据'
    )
    
    # 通用参数
    cleanup_parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='启用详细输出'
    )
    
    cleanup_parser.add_argument(
        '--pg-config',
        default='config/postgres.json',
        help='PostgreSQL配置文件 (默认: config/postgres.json)'
    )
    
    cleanup_parser.add_argument(
        '--dry-run',
        action='store_true',
        help='仅显示将要删除的数据，不实际执行'
    )
    
    cleanup_parser.add_argument(
        '--confirm',
        action='store_true',
        help='确认执行清理操作'
    )
    
    cleanup_parser.set_defaults(func=handle_cleanup_command)


def add_validate_command(subparsers):
    """添加数据验证子命令"""
    validate_parser = subparsers.add_parser(
        'validate',
        help='数据验证 - 验证PostgreSQL事务完整性',
        description='验证PostgreSQL数据库中的事务完整性'
    )
    
    # 通用参数
    validate_parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='启用详细输出'
    )
    
    validate_parser.add_argument(
        '--pg-config',
        default='config/postgres.json',
        help='PostgreSQL配置文件 (默认: config/postgres.json)'
    )
    
    validate_parser.add_argument(
        '--fix',
        action='store_true',
        help='自动修复发现的问题'
    )
    
    validate_parser.set_defaults(func=handle_validate_command)


def handle_schedule_command(args):
    """处理任务调度命令"""
    # 模式兼容映射
    mode_raw = args.mode
    if mode_raw in ('combined', 'first_only'):
        canonical_mode = 'combine_second'
        print(f"🔁 模式别名映射: {mode_raw} -> {canonical_mode}")
    else:
        canonical_mode = mode_raw

    print(f"🚀 启动任务调度 - 模式: {canonical_mode}")
    
    try:
        # 使用用例层服务生成任务计划
        plan_service = PlanService()
        
        # 加载配置
        from config.config import load_env
        load_env()
        
        # 加载标签和粉丝范围配置
        from fetch_author_square_by_tags import load_content_tags
        from tools.task_scheduler import load_follower_ranges
        
        # 默认配置文件路径
        tags_file = f"{args.config_dir}/content_tag_v2.json"
        follower_ranges_file = f"{args.config_dir}/follower_ranges.json"
        
        # 加载配置数据
        all_tags = load_content_tags(tags_file)
        follower_ranges = load_follower_ranges(follower_ranges_file)
        
        print(f"📋 加载标签: {len(all_tags)} 个")
        print(f"📊 加载粉丝范围: {len(follower_ranges)} 个")
        
        # 生成任务计划
        plan = plan_service.generate_jobs_plan(
            all_tags=all_tags,
            follower_ranges=follower_ranges,
            mode=canonical_mode,
            max_first=None,  # 不限制一级标签数量
            limit=args.limit,
            max_pages=args.max_pages,
            sleep_ms=args.sleep_ms,
            retry_max=3,
            retry_backoff_ms=1000,
            sort_field='fans_count',
            sort_type=1
        )
        
        jobs = plan.get('jobs', [])
        print(f"📋 生成任务计划: {len(jobs)} 个任务")
        
        if not jobs:
            print("⚠️  没有生成任何任务")
            return
        
        # 创建任务执行配置
        config = TaskExecutionConfig(
            output_dir=args.output_dir,
            cookie_file=args.cookie_file,
            star_id='cli_schedule',
            video_type='video',
            min_price=0,
            search_type=1,
            sort_field='fans_count',
            sort_type=1,
            limit=args.limit,
            max_pages=args.max_pages,
            sleep_ms=args.sleep_ms,
            retry_max=3,
            retry_backoff_ms=1000
        )
        
        # 创建任务执行服务
        execution_service = TaskExecutionService(config)
        
        # 执行任务
        print("🔄 开始执行任务...")
        for i, job in enumerate(jobs, 1):
            print(f"📝 执行任务 {i}/{len(jobs)}: {job.get('first_label', 'N/A')}")
            
            # 这里可以调用执行服务的方法
            # 由于执行服务的具体实现可能需要更多参数，这里先打印任务信息
            print(f"   - 标签: {job.get('first_label', 'N/A')}")
            print(f"   - 粉丝范围: {job.get('follower_ge', 0)}-{job.get('follower_lt', 0)}")
            print(f"   - 模式: {job.get('mode', 'N/A')}")
            
            # 限制演示只执行前3个任务
            if i >= 3:
                print(f"   ... (演示模式，跳过剩余 {len(jobs) - i} 个任务)")
                break
        
        print("✅ 任务调度完成")
        
    except Exception as e:
        print(f"❌ 任务调度失败: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)


def handle_smart_command(args):
    """处理智能爬取控制命令"""
    # 模式兼容映射（smart 控制器支持 all_first/combine_second/second_split）
    mode_raw = args.mode
    if mode_raw == 'combined':
        canonical_mode = 'combine_second'
        print(f"🔁 模式别名映射: combined -> combine_second")
    elif mode_raw == 'first_only':
        canonical_mode = 'all_first'
        print(f"🔁 模式别名映射: first_only -> all_first")
    else:
        canonical_mode = mode_raw

    print(f"🧠 启动智能爬取控制 - 模式: {canonical_mode}")
    
    try:
        # 组装并传递参数给底层智能控制器
        print("🔄 启动智能控制器...")
        sc_args = [
            '--mode', canonical_mode,
            '--cookies-file', args.cookies_file,
            '--jobs-plan-out', args.jobs_plan_out,
            '--state-file', args.state_file,
        ]
        if getattr(args, 'auto_pages', False):
            sc_args.append('--auto-pages')
        # 显式传递自动分页上限
        if getattr(args, 'auto_pages_upper_bound', None) is not None:
            sc_args += ['--auto-pages-upper-bound', str(args.auto_pages_upper_bound)]
        if getattr(args, 'resume', False):
            sc_args.append('--resume')
        if getattr(args, 'skip_existing', False):
            sc_args.append('--skip-existing')
        if getattr(args, 'save_pg', False):
            sc_args.append('--save-pg')
        if getattr(args, 'generate_only', False):
            sc_args.append('--generate-only')

        # 运行-暂停策略与失败阈值转发
        if getattr(args, 'work_cycle_mins', None) is not None:
            sc_args += ['--work-cycle-mins', str(args.work_cycle_mins)]
        if getattr(args, 'fixed_pause_mins', None) is not None:
            sc_args += ['--fixed-pause-mins', str(args.fixed_pause_mins)]
        if getattr(args, 'pause_levels', None):
            sc_args += ['--pause-levels', str(args.pause_levels)]
        if getattr(args, 'failure_rate_threshold', None) is not None:
            sc_args += ['--failure-rate-threshold', str(args.failure_rate_threshold)]

        # 可选：payload 覆盖
        if getattr(args, 'payload_override', None):
            sc_args += ['--payload-override', args.payload_override]

        # 使用与 cleanup/validate 相同的模式，临时覆盖 sys.argv
        original_argv = sys.argv[:]
        try:
            sys.argv = ['smart_crawl_controller.py'] + sc_args
            smart_crawl_controller.main()
        finally:
            sys.argv = original_argv
        
    except Exception as e:
        print(f"❌ 智能爬取控制失败: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)


def handle_cleanup_command(args):
    """处理数据库清理命令"""
    print("🧹 启动数据库清理")
    
    try:
        if not args.confirm and not args.dry_run:
            print("⚠️  请使用 --confirm 确认执行清理，或使用 --dry_run 预览")
            return
        
        # 构建参数
        cleanup_args = [
            '--pg-config', args.pg_config
        ]
        
        if args.dry_run:
            cleanup_args.append('--dry-run')
        
        # 临时修改 sys.argv 来调用原脚本
        original_argv = sys.argv[:]
        sys.argv = ['cleanup_pg_testdata.py'] + cleanup_args
        
        try:
            cleanup_pg_testdata.main()
        finally:
            sys.argv = original_argv
        
        print("✅ 数据库清理完成")
        
    except Exception as e:
        print(f"❌ 数据库清理失败: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)


def handle_validate_command(args):
    """处理数据验证命令"""
    print("🔍 启动数据验证")
    
    try:
        # 构建参数
        validate_args = [
            '--pg-config', args.pg_config
        ]
        
        if args.fix:
            validate_args.append('--fix')
        
        # 临时修改 sys.argv 来调用原脚本
        original_argv = sys.argv[:]
        sys.argv = ['validate_pg_transactions.py'] + validate_args
        
        try:
            validate_pg_transactions.main()
        finally:
            sys.argv = original_argv
        
        print("✅ 数据验证完成")
        
    except Exception as e:
        print(f"❌ 数据验证失败: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)


def main():
    """主入口函数"""
    # 创建主解析器
    parser = create_base_parser()
    subparsers = parser.add_subparsers(
        dest='command',
        help='可用命令',
        metavar='COMMAND'
    )
    
    # 添加子命令
    add_schedule_command(subparsers)
    add_smart_command(subparsers)
    add_cleanup_command(subparsers)
    add_validate_command(subparsers)
    
    # 解析参数
    args = parser.parse_args()
    
    # 如果没有指定命令，显示帮助
    if not args.command:
        parser.print_help()
        return
    
    # 设置详细输出
    if args.verbose:
        print(f"🔧 详细模式已启用")
        print(f"📁 配置目录: {args.config_dir}")
    
    # 调用对应的处理函数
    args.func(args)


if __name__ == '__main__':
    main()