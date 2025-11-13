"""
强类型配置模型定义

本模块定义了项目中使用的所有配置模型，提供类型安全和验证功能。
配置加载顺序：环境变量 > JSON覆盖文件 > 默认值
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

try:
    from pydantic import BaseModel, Field, validator
    from pydantic_settings import BaseSettings, SettingsConfigDict
    PYDANTIC_V2 = True
except ImportError:
    try:
        from pydantic import BaseModel, BaseSettings, Field, validator
        PYDANTIC_V2 = False
    except ImportError:
        # 如果没有pydantic，使用dataclass作为fallback
        BaseModel = object
        BaseSettings = object
        Field = lambda default=None, **kwargs: default
        PYDANTIC_V2 = False


@dataclass
class DatabaseConfig:
    """数据库配置"""
    host: str = "localhost"
    port: int = 5432
    user: str = "postgres"
    password: str = ""
    database: str = "task_control"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "host": self.host,
            "port": self.port,
            "user": self.user,
            "password": self.password,
            "database": self.database,
        }


@dataclass
class RateLimitConfig:
    """限速配置"""
    domain_qps: int = 2
    qps_window_ms: int = 1000
    concurrency: int = 3
    time_window: str = "1s"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "domain_qps": self.domain_qps,
            "qps_window_ms": self.qps_window_ms,
            "concurrency": self.concurrency,
            "time_window": self.time_window,
        }


@dataclass
class StabilityConfig:
    """稳定性配置"""
    cooldown_429_403_ms: int = 2000
    max_failure_rate: float = 0.3
    stop_when_empty_n: int = 5
    max_consecutive_401: int = 3
    pause_on_401_ms: int = 60000
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "cooldown_429_403_ms": self.cooldown_429_403_ms,
            "max_failure_rate": self.max_failure_rate,
            "stop_when_empty_n": self.stop_when_empty_n,
            "max_consecutive_401": self.max_consecutive_401,
            "pause_on_401_ms": self.pause_on_401_ms,
        }


@dataclass
class CrawlerConfig:
    """爬虫运行时配置"""
    cookies_file: str = "config/cookies.txt"
    star_id: str = ""
    output_dir: str = "results"
    video_type: str = "video"
    min_price: int = 0
    search_type: int = 2
    sort_field: str = "fans_count"
    sort_type: int = 1
    province_id: Optional[int] = None
    city_id: Optional[int] = None
    province_name: Optional[str] = None
    city_name: Optional[str] = None
    extra_filters: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "cookies_file": self.cookies_file,
            "star_id": self.star_id,
            "output_dir": self.output_dir,
            "video_type": self.video_type,
            "min_price": self.min_price,
            "search_type": self.search_type,
            "sort_field": self.sort_field,
            "sort_type": self.sort_type,
            "province_id": self.province_id,
            "city_id": self.city_id,
            "province_name": self.province_name,
            "city_name": self.city_name,
            "extra_filters": self.extra_filters,
        }


@dataclass
class TaskConfig:
    """任务配置"""
    save_pg: bool = False
    pg_config: str = "config/postgres.json"
    metrics_port: Optional[int] = None
    auto_pages: bool = False
    auto_pages_upper_bound: int = 100
    resume: bool = False
    skip_existing: bool = True
    rerun_failed: bool = False
    jobs_plan_out: str = "reports/jobs_plan.json"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "save_pg": self.save_pg,
            "pg_config": self.pg_config,
            "metrics_port": self.metrics_port,
            "auto_pages": self.auto_pages,
            "auto_pages_upper_bound": self.auto_pages_upper_bound,
            "resume": self.resume,
            "skip_existing": self.skip_existing,
            "rerun_failed": self.rerun_failed,
            "jobs_plan_out": self.jobs_plan_out,
        }


@dataclass
class AppConfig:
    """应用主配置，包含所有子配置"""
    database: DatabaseConfig = field(default_factory=DatabaseConfig)
    rate_limit: RateLimitConfig = field(default_factory=RateLimitConfig)
    stability: StabilityConfig = field(default_factory=StabilityConfig)
    crawler: CrawlerConfig = field(default_factory=CrawlerConfig)
    task: TaskConfig = field(default_factory=TaskConfig)
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "database": self.database.to_dict(),
            "rate_limit": self.rate_limit.to_dict(),
            "stability": self.stability.to_dict(),
            "crawler": self.crawler.to_dict(),
            "task": self.task.to_dict(),
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> AppConfig:
        """从字典创建配置对象"""
        return cls(
            database=DatabaseConfig(**data.get("database", {})),
            rate_limit=RateLimitConfig(**data.get("rate_limit", {})),
            stability=StabilityConfig(**data.get("stability", {})),
            crawler=CrawlerConfig(**data.get("crawler", {})),
            task=TaskConfig(**data.get("task", {})),
        )


# Pydantic版本的配置模型（如果可用）
if PYDANTIC_V2 and BaseSettings != object:
    class PydanticAppConfig(BaseSettings):
        """基于Pydantic的应用配置（推荐）"""
        
        # Database
        pg_host: str = "localhost"
        pg_port: int = 5432
        pg_user: str = "postgres"
        pg_password: str = ""
        pg_db: str = "task_control"
        
        # Rate Limit
        domain_qps: int = 2
        qps_window_ms: int = 1000
        concurrency: int = 3
        time_window: str = "1s"
        
        # Stability
        cooldown_429_403_ms: int = 2000
        max_failure_rate: float = 0.3
        stop_when_empty_n: int = 5
        max_consecutive_401: int = 3
        pause_on_401_ms: int = 60000
        
        # Crawler
        cookies_file: str = "config/cookies.txt"
        star_id: str = ""
        output_dir: str = "results"
        video_type: str = "video"
        min_price: int = 0
        search_type: int = 2
        sort_field: str = "fans_count"
        sort_type: int = 1
        province_id: Optional[int] = None
        city_id: Optional[int] = None
        province_name: Optional[str] = None
        city_name: Optional[str] = None
        extra_filters: Union[str, List[str], None] = None
        
        # Task
        save_pg: bool = False
        pg_config: str = "config/postgres.json"
        metrics_port: Optional[int] = None
        auto_pages: bool = False
        auto_pages_upper_bound: int = 100
        resume: bool = False
        skip_existing: bool = True
        rerun_failed: bool = False
        jobs_plan_out: str = "reports/jobs_plan.json"
        
        model_config = SettingsConfigDict(
            env_prefix="TASK_CONTROL_",
            case_sensitive=False,
            extra="ignore",
        )
        
        def to_app_config(self) -> AppConfig:
            """转换为AppConfig对象"""
            extra_filters = []
            if self.extra_filters:
                if isinstance(self.extra_filters, list):
                    extra_filters = [s for s in self.extra_filters if s.strip()]
                else:
                    extra_filters = [s.strip() for s in str(self.extra_filters).split(",") if s.strip()]
            
            return AppConfig(
                database=DatabaseConfig(
                    host=self.pg_host,
                    port=self.pg_port,
                    user=self.pg_user,
                    password=self.pg_password,
                    database=self.pg_db,
                ),
                rate_limit=RateLimitConfig(
                    domain_qps=self.domain_qps,
                    qps_window_ms=self.qps_window_ms,
                    concurrency=self.concurrency,
                    time_window=self.time_window,
                ),
                stability=StabilityConfig(
                    cooldown_429_403_ms=self.cooldown_429_403_ms,
                    max_failure_rate=self.max_failure_rate,
                    stop_when_empty_n=self.stop_when_empty_n,
                    max_consecutive_401=self.max_consecutive_401,
                    pause_on_401_ms=self.pause_on_401_ms,
                ),
                crawler=CrawlerConfig(
                    cookies_file=self.cookies_file,
                    star_id=self.star_id,
                    output_dir=self.output_dir,
                    video_type=self.video_type,
                    min_price=self.min_price,
                    search_type=self.search_type,
                    sort_field=self.sort_field,
                    sort_type=self.sort_type,
                    province_id=self.province_id,
                    city_id=self.city_id,
                    province_name=self.province_name,
                    city_name=self.city_name,
                    extra_filters=extra_filters,
                ),
                task=TaskConfig(
                    save_pg=self.save_pg,
                    pg_config=self.pg_config,
                    metrics_port=self.metrics_port,
                    auto_pages=self.auto_pages,
                    auto_pages_upper_bound=self.auto_pages_upper_bound,
                    resume=self.resume,
                    skip_existing=self.skip_existing,
                    rerun_failed=self.rerun_failed,
                    jobs_plan_out=self.jobs_plan_out,
                ),
            )

else:
    # 如果没有Pydantic v2，使用None作为占位符
    PydanticAppConfig = None


def load_json_config(file_path: Union[str, Path]) -> Dict[str, Any]:
    """加载JSON配置文件"""
    path = Path(file_path)
    if not path.exists():
        return {}
    
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f"Warning: Failed to load config file {path}: {e}")
        return {}


def merge_configs(base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
    """递归合并配置字典"""
    result = base.copy()
    
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = merge_configs(result[key], value)
        else:
            result[key] = value
    
    return result