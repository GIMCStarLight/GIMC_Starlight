"""配置解析服务

负责解析命令行参数并构建配置字典，
将 CLI 解析逻辑从 main 函数中分离。
"""

import argparse
import os
from pathlib import Path
from typing import Dict, Any, Optional, List

# 使用动态路径解析器
from .path_resolver import get_path_resolver

# 获取目录路径
path_resolver = get_path_resolver()
PROJECT_ROOT = str(path_resolver.project_root)
CONFIG_DIR = str(path_resolver.config_dir)
RESULTS_DIR = str(path_resolver.results_dir)
REPORTS_DIR = str(path_resolver.reports_dir)
REGION_CODES_DEFAULT_PATH = str(path_resolver.resolve_config_file("region_codes.json"))
CITY_CODES_DEFAULT_PATH = str(path_resolver.resolve_config_file("city_codes.json"))

# 保持向后兼容
TASK_CONTROL_DIR = PROJECT_ROOT


class ConfigParser:
    """配置解析器类，提供命令行参数解析和配置管理功能"""
    
    def __init__(self):
        self.parser = self._create_argument_parser()
    
    def _create_argument_parser(self) -> argparse.ArgumentParser:
        """创建命令行参数解析器"""
        parser = argparse.ArgumentParser(description="按 content_tag_v2.json 标签抓取作者广场")
        
        # 基础配置
        parser.add_argument("--cookies-file", default=os.path.join(CONFIG_DIR, "cookies.txt"))
        parser.add_argument("--tags-file", default=os.path.join(CONFIG_DIR, "content_tag_v2.json"))
        parser.add_argument("--star-id", default="1843934177451019")
        parser.add_argument("--page", type=int, default=1)
        parser.add_argument("--limit", type=int, default=20)
        parser.add_argument("--min-price", type=int, default=0)
        parser.add_argument(
            "--video-type", type=str, default="2", help="price_by_video_type 的 rel_id，例 1/2/71/90/91/150"
        )
        parser.add_argument("--output-dir", default=os.path.join(RESULTS_DIR, "author_square_by_tag"))
        
        # 地域配置
        parser.add_argument(
            "--region-codes-file", default=REGION_CODES_DEFAULT_PATH, help="region_codes.json 路径，用于省份名映射"
        )
        parser.add_argument(
            "--city-codes-file", default=CITY_CODES_DEFAULT_PATH, help="city_codes.json 路径，用于城市名映射"
        )
        parser.add_argument("--province-name", type=str, help="中文省份名映射为 province_id（如 浙江省）")
        parser.add_argument("--city-name", type=str, help="中文城市名映射为 city_id（如 杭州市）")
        parser.add_argument("--province-id", type=int)
        parser.add_argument("--city-id", type=int)
        
        # 抓取控制
        parser.add_argument("--sleep-ms", type=int, default=500)
        parser.add_argument("--max-pages", type=int, default=500, help="每标签最多抓取的页数上限")
        parser.add_argument("--stop-when-empty", action="store_true", help="遇到空作者页提前停止分页")
        parser.add_argument("--retry-max", type=int, default=3, help="429/5xx 最大重试次数")
        parser.add_argument("--retry-backoff-ms", type=int, default=1000, help="指数退避的基准毫秒数")
        
        # 标签过滤
        parser.add_argument("--first-label", help="只抓取指定一级类目标签（中文）")
        parser.add_argument("--second-label", help="只抓取指定二级类目标签（中文）")
        parser.add_argument("--combine-second", action="store_true", help="将一级下的所有二级合并为一次请求")
        parser.add_argument("--all-first", action="store_true", help="遍历所有一级标签，每个一级标签仅按一级过滤发起一次请求")
        parser.add_argument("--max-tags", type=int, default=1, help="最多处理的标签数量（默认仅验证 1 个）")
        parser.add_argument("--first-id", type=int)
        parser.add_argument("--second-id", type=int)
        
        # 价格过滤
        parser.add_argument(
            "--use-price-filter", action="store_true", help="启用基于视频类型的最低报价过滤(默认关闭，仅标签筛选)"
        )
        parser.set_defaults(use_price_filter=True)
        
        # 场景覆盖
        parser.add_argument("--platform-source", type=int, default=1)
        parser.add_argument("--search-scene", type=int, default=1)
        parser.add_argument("--display-scene", type=int, default=1)
        parser.add_argument("--marketing-target", type=int, default=1)
        parser.add_argument("--task-category", type=int, default=1)
        parser.add_argument("--first-industry-id", type=int, default=0)
        parser.add_argument("--task-status", type=int, default=3)
        parser.add_argument("--search-type", type=int, default=2)
        parser.add_argument(
            "--sort-field", type=str, default="score", choices=["score", "follower", "vv_median_30d", "star_index"]
        )
        parser.add_argument("--sort-type", type=int, default=2)
        
        # 通用过滤
        parser.add_argument("--follower-ge", type=int)
        parser.add_argument("--follower-lt", type=int)
        parser.add_argument(
            "--extra-filter",
            action="append",
            help="自定义 attribute_filter 项，格式 'field_name=...,field_value=...,rel_id=...' 或 JSON 字符串",
        )
        
        # 关键词搜索
        parser.add_argument("--keyword", type=str, help="搜索关键字（星图ID/抖音号/昵称）")
        parser.add_argument("--search-star-id", type=str, help="通过星图ID搜索，如 6892711528848424973")
        parser.add_argument("--search-handle", type=str, help="通过抖音号搜索，如 QiKeXingXing1234")
        parser.add_argument("--search-nickname", type=str, help="通过昵称搜索，如 七颗猩猩")
        
        # 批量关键词
        parser.add_argument("--keyword-file", type=str, help="文件路径：按行读取关键字，忽略空行与以#起始的注释")
        parser.add_argument("--max-keywords", type=int, help="最多处理的关键字数量上限")
        parser.add_argument("--dedup-keywords", action="store_true", help="对关键字进行去重（保持首次出现的顺序）")
        parser.add_argument("--sleep-between-keywords-ms", type=int, default=800, help="两次关键字抓取之间的停顿毫秒数")
        
        # 智能页数
        parser.add_argument(
            "--auto-pages", action="store_true", help="根据首次响应的 total_count/limit 自动计算并覆盖 max_pages"
        )
        parser.add_argument(
            "--auto-pages-upper-bound", type=int, help="智能页数的上限（可选，默认不限制；若未设置则受 --max-pages 约束）"
        )
        
        # 续跑控制
        parser.add_argument("--resume", action="store_true", help="续跑：自动从最后成功页+1开始")
        parser.add_argument("--skip-existing", action="store_true", help="跳过已存在成功文件的页（不计入 pages_done）")
        parser.add_argument("--rerun-failed", type=str, help="从失败页报表 JSON 重跑指定页（路径或文件名）")
        
        # QPS 控制
        parser.add_argument("--domain-qps", type=int, help="域级QPS限速（每秒最大请求数）")
        parser.add_argument("--qps-window-ms", type=int, default=1000, help="QPS统计窗口毫秒数（默认1000）")
        parser.add_argument("--adaptive-qps", action="store_true", help="启用自适应QPS，根据失败率/成功连续调整")
        parser.add_argument("--adaptive-min-qps", type=int, default=1)
        parser.add_argument("--adaptive-max-qps", type=int, default=2)
        parser.add_argument("--adaptive-step", type=int, default=1)
        parser.add_argument("--adaptive-failure-rate-threshold", type=float, default=0.2)
        parser.add_argument("--adaptive-upgrade-cooldown-sec", type=int, default=300)
        parser.add_argument("--adaptive-success-needed", type=int, default=3)
        parser.add_argument("--adaptive-backoff-base", type=float, default=0.7)
        parser.add_argument("--adaptive-backoff-max-power", type=int, default=3)
        
        # 稳定性控制
        parser.add_argument("--time-window", type=str, help="执行时间窗，如 '02:00-06:00'")
        parser.add_argument("--cooldown-429-403-ms", type=int, default=2000, help="遇 429/403 增加冷却毫秒数")
        parser.add_argument("--max-failure-rate", type=float, help="失败率阈值，超过则停止任务")
        parser.add_argument("--stop-when-empty-n", type=int, help="连续空页 N 次停止任务")
        parser.add_argument("--max-consecutive-401", type=int, default=3, help="连续401阈值，达到后触发暂停")
        parser.add_argument("--pause-on-401-ms", type=int, default=60000, help="达到401阈值后暂停毫秒数")
        
        # 其他选项
        parser.add_argument("--payload-override", help="JSON 文件路径，用于覆盖/合并 payload 任意字段")
        parser.add_argument("--dry-run", action="store_true")
        
        # PostgreSQL
        parser.add_argument("--save-pg", action="store_true", help="将结果保存到 PostgreSQL")
        parser.add_argument(
            "--pg-config", default=os.path.join(TASK_CONTROL_DIR, "config", "postgres.json"), help="PostgreSQL 配置文件路径"
        )
        
        return parser
    
    def parse_config(self, args: Optional[List[str]] = None) -> Dict[str, Any]:
        """解析命令行参数并返回配置字典
        
        Args:
            args: 命令行参数列表，如果为 None 则从 sys.argv 解析
            
        Returns:
            配置字典
        """
        if args is None:
            parsed_args = self.parser.parse_args()
        else:
            parsed_args = self.parser.parse_args(args)
        
        # 将 args 转换为字典，便于传递
        config = vars(parsed_args)
        
        # 添加一些计算字段
        config['reports_dir'] = REPORTS_DIR
        config['task_control_dir'] = TASK_CONTROL_DIR
        config['config_dir'] = CONFIG_DIR
        config['results_dir'] = RESULTS_DIR
        
        return config
    
    def get_default_config(self) -> Dict[str, Any]:
        """获取默认配置"""
        return self.parse_config([])


# 向后兼容的函数接口
def create_argument_parser() -> argparse.ArgumentParser:
    """创建命令行参数解析器（向后兼容）"""
    parser_instance = ConfigParser()
    return parser_instance.parser


def parse_config(args: Optional[List[str]] = None) -> Dict[str, Any]:
    """解析命令行参数并返回配置字典（向后兼容）"""
    parser_instance = ConfigParser()
    return parser_instance.parse_config(args)