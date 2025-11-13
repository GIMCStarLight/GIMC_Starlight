"""
统一配置加载器
实现加载顺序：环境变量 > JSON覆盖 > 默认值
"""
import os
import json
from pathlib import Path
from typing import Dict, Any, Optional, Union
from dataclasses import asdict

from .models import AppConfig, PydanticAppConfig


class ConfigLoader:
    """统一配置加载器，支持多种配置源的优先级加载"""
    
    def __init__(self, config_dir: Optional[Path] = None):
        """
        初始化配置加载器
        
        Args:
            config_dir: 配置文件目录，默认为当前文件所在目录
        """
        if config_dir is None:
            config_dir = Path(__file__).parent
        self.config_dir = Path(config_dir)
        self._load_env_files()
    
    def _load_env_files(self) -> None:
        """加载环境变量文件"""
        try:
            from dotenv import load_dotenv
        except ImportError:
            return
        
        # 优先级：config/.env > 项目根目录/.env > 默认搜索路径
        env_files = [
            self.config_dir / ".env",
            self.config_dir.parent / ".env",
        ]
        
        for env_file in env_files:
            if env_file.exists():
                load_dotenv(env_file)
                break
        else:
            # 如果没有找到特定的.env文件，使用默认搜索
            load_dotenv()
    
    def load_json_override(self, filename: str) -> Dict[str, Any]:
        """
        加载JSON覆盖配置
        
        Args:
            filename: JSON文件名
            
        Returns:
            配置字典，如果文件不存在则返回空字典
        """
        # 如果filename是绝对路径，直接使用
        if Path(filename).is_absolute():
            json_path = Path(filename)
        else:
            json_path = self.config_dir / filename
            
        if not json_path.exists():
            return {}
        
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError) as e:
            print(f"Warning: Failed to load JSON override from {json_path}: {e}")
            return {}
    
    def merge_configs(self, base_config: Dict[str, Any], override_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        深度合并配置字典
        
        Args:
            base_config: 基础配置
            override_config: 覆盖配置
            
        Returns:
            合并后的配置
        """
        result = base_config.copy()
        
        for key, value in override_config.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                # 递归合并嵌套字典
                result[key] = self.merge_configs(result[key], value)
            else:
                # 直接覆盖
                result[key] = value
        
        return result
    
    def load_app_config(self, 
                       json_override_file: Optional[str] = None,
                       use_pydantic: bool = True) -> Union[AppConfig, PydanticAppConfig]:
        """
        加载应用配置，按优先级：环境变量 > JSON覆盖 > 默认值
        
        Args:
            json_override_file: JSON覆盖文件名，如果为None则不加载JSON覆盖
            use_pydantic: 是否使用Pydantic版本的配置模型
            
        Returns:
            配置对象
        """
        if use_pydantic:
            if json_override_file:
                # 加载JSON覆盖
                json_override = self.load_json_override(json_override_file)
                if json_override:
                    # 先创建一个没有环境变量的基础配置
                    base_config_dict = {}
                    for field_name, field_info in PydanticAppConfig.model_fields.items():
                        base_config_dict[field_name] = field_info.default
                    
                    # 将嵌套的JSON配置扁平化到PydanticAppConfig的字段
                    flattened_override = {}
                    if 'database' in json_override:
                        db_config = json_override['database']
                        if 'host' in db_config:
                            flattened_override['pg_host'] = db_config['host']
                        if 'port' in db_config:
                            flattened_override['pg_port'] = db_config['port']
                        if 'user' in db_config:
                            flattened_override['pg_user'] = db_config['user']
                        if 'password' in db_config:
                            flattened_override['pg_password'] = db_config['password']
                        if 'database' in db_config:
                            flattened_override['pg_db'] = db_config['database']
                    
                    if 'rate_limit' in json_override:
                        rate_config = json_override['rate_limit']
                        if 'domain_qps' in rate_config:
                            flattened_override['domain_qps'] = rate_config['domain_qps']
                        if 'concurrency' in rate_config:
                            flattened_override['concurrency'] = rate_config['concurrency']
                        if 'qps_window_ms' in rate_config:
                            flattened_override['qps_window_ms'] = rate_config['qps_window_ms']
                        if 'time_window' in rate_config:
                            flattened_override['time_window'] = rate_config['time_window']
                    
                    if 'stability' in json_override:
                        stability_config = json_override['stability']
                        for key in ['cooldown_429_403_ms', 'max_failure_rate', 'stop_when_empty_n', 
                                   'max_consecutive_401', 'pause_on_401_ms']:
                            if key in stability_config:
                                flattened_override[key] = stability_config[key]
                    
                    # 合并扁平化的JSON覆盖
                    merged_dict = self.merge_configs(base_config_dict, flattened_override)
                    
                    # 手动应用环境变量，确保环境变量优先级最高
                    env_prefix = "TASK_CONTROL_"
                    for field_name in PydanticAppConfig.model_fields.keys():
                        env_key = f"{env_prefix}{field_name.upper()}"
                        if env_key in os.environ:
                            env_value = os.environ[env_key]
                            # 根据字段类型转换环境变量值
                            field_type = PydanticAppConfig.model_fields[field_name].annotation
                            if field_type == int:
                                merged_dict[field_name] = int(env_value)
                            elif field_type == float:
                                merged_dict[field_name] = float(env_value)
                            elif field_type == bool:
                                merged_dict[field_name] = env_value.lower() in ('true', '1', 'yes', 'on')
                            else:
                                merged_dict[field_name] = env_value
                    
                    # 创建配置对象，但不让Pydantic自动加载环境变量
                    return PydanticAppConfig.model_validate(merged_dict)
            
            # 没有JSON覆盖时，使用标准的Pydantic环境变量加载
            return PydanticAppConfig()
        else:
            # 使用dataclass版本
            base_config = AppConfig()
            
            if json_override_file:
                # 加载JSON覆盖
                json_override = self.load_json_override(json_override_file)
                if json_override:
                    # 将配置转为字典，合并后重新创建
                    current_dict = asdict(base_config)
                    merged_dict = self.merge_configs(current_dict, json_override)
                    
                    # 从合并的字典创建新配置对象
                    base_config = AppConfig.from_dict(merged_dict)
            
            return base_config
    
    def load_specific_config(self, 
                           config_section: str,
                           json_override_file: Optional[str] = None) -> Dict[str, Any]:
        """
        加载特定配置段
        
        Args:
            config_section: 配置段名称 ('database', 'rate_limit', 'stability', 'crawler', 'task')
            json_override_file: JSON覆盖文件名
            
        Returns:
            配置字典
        """
        app_config = self.load_app_config(json_override_file, use_pydantic=True)
        
        if hasattr(app_config, 'to_app_config'):
            # PydanticAppConfig，需要转换为AppConfig
            structured_config = app_config.to_app_config()
            section_map = {
                'database': structured_config.database,
                'rate_limit': structured_config.rate_limit,
                'stability': structured_config.stability,
                'crawler': structured_config.crawler,
                'task': structured_config.task,
            }
        else:
            # 已经是AppConfig
            section_map = {
                'database': app_config.database,
                'rate_limit': app_config.rate_limit,
                'stability': app_config.stability,
                'crawler': app_config.crawler,
                'task': app_config.task,
            }
        
        if config_section not in section_map:
            raise ValueError(f"Unknown config section: {config_section}")
        
        section_config = section_map[config_section]
        
        # 如果是Pydantic模型，转为字典
        if hasattr(section_config, 'model_dump'):
            return section_config.model_dump()
        elif hasattr(section_config, 'to_dict'):
            return section_config.to_dict()
        elif hasattr(section_config, '__dict__'):
            return asdict(section_config)
        else:
            return section_config


# 全局配置加载器实例
_global_loader: Optional[ConfigLoader] = None


def get_config_loader() -> ConfigLoader:
    """获取全局配置加载器实例"""
    global _global_loader
    if _global_loader is None:
        _global_loader = ConfigLoader()
    return _global_loader


def load_config(json_override_file: Optional[str] = None,
               use_pydantic: bool = True) -> Union[AppConfig, PydanticAppConfig]:
    """
    便捷函数：加载应用配置
    
    Args:
        json_override_file: JSON覆盖文件名
        use_pydantic: 是否使用Pydantic版本
        
    Returns:
        配置对象
    """
    loader = get_config_loader()
    return loader.load_app_config(json_override_file, use_pydantic)


def load_section_config(config_section: str,
                       json_override_file: Optional[str] = None) -> Dict[str, Any]:
    """
    便捷函数：加载特定配置段
    
    Args:
        config_section: 配置段名称
        json_override_file: JSON覆盖文件名
        
    Returns:
        配置字典
    """
    loader = get_config_loader()
    return loader.load_specific_config(config_section, json_override_file)


# 向后兼容的配置获取函数
def get_postgres_config(json_override_file: Optional[str] = None) -> Dict[str, Any]:
    """获取PostgreSQL配置"""
    return load_section_config('database', json_override_file)


def get_rate_limit_config(json_override_file: Optional[str] = None) -> Dict[str, Any]:
    """获取限速配置"""
    return load_section_config('rate_limit', json_override_file)


def get_stability_config(json_override_file: Optional[str] = None) -> Dict[str, Any]:
    """获取稳定性配置"""
    return load_section_config('stability', json_override_file)


def get_crawler_config(json_override_file: Optional[str] = None) -> Dict[str, Any]:
    """获取爬虫配置"""
    return load_section_config('crawler', json_override_file)


def get_task_config(json_override_file: Optional[str] = None) -> Dict[str, Any]:
    """获取任务配置"""
    return load_section_config('task', json_override_file)