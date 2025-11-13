# -*- coding: utf-8 -*-
"""
动态路径解析器
提供项目路径的智能检测和管理，不依赖特定文件夹名称
"""

import os
import sys
from pathlib import Path
from typing import Optional, List


class ProjectPathResolver:
    """项目路径解析器"""
    
    # 用于识别项目根目录的标记文件/文件夹
    PROJECT_MARKERS = [
        'pyproject.toml',
        'setup.py',
        'requirements.txt',
        'config',
        'entrypoints',
        'services',
        'tools',
        'usecases',
        '.git'
    ]
    
    def __init__(self, start_path: Optional[Path] = None):
        """
        初始化路径解析器
        
        Args:
            start_path: 开始搜索的路径，默认为当前文件所在目录
        """
        if start_path is None:
            start_path = Path(__file__).resolve().parent
        
        self.project_root = self._find_project_root(start_path)
        self._setup_python_path()
    
    def _find_project_root(self, start_path: Path) -> Path:
        """
        从给定路径向上搜索项目根目录
        
        Args:
            start_path: 开始搜索的路径
            
        Returns:
            项目根目录路径
        """
        current = start_path
        
        # 向上搜索，直到找到项目标记或到达根目录
        while current != current.parent:
            # 检查是否包含足够的项目标记
            markers_found = []
            for marker in self.PROJECT_MARKERS:
                marker_path = current / marker
                if marker_path.exists():
                    markers_found.append(marker)
            
            # 如果找到3个或以上标记，认为是项目根目录
            if len(markers_found) >= 3:
                return current
            
            current = current.parent
        
        # 如果没找到，返回开始路径的父目录
        return start_path.parent if start_path.is_file() else start_path
    
    def _setup_python_path(self):
        """设置Python路径，确保模块可以被正确导入"""
        # 将项目根目录添加到Python路径
        project_root_str = str(self.project_root)
        if project_root_str not in sys.path:
            sys.path.insert(0, project_root_str)
        
        # 将项目根目录的父目录也添加到路径中，以支持绝对导入
        parent_dir = str(self.project_root.parent)
        if parent_dir not in sys.path:
            sys.path.insert(0, parent_dir)
    
    @property
    def config_dir(self) -> Path:
        """配置目录路径"""
        return self.project_root / 'config'
    
    @property
    def results_dir(self) -> Path:
        """结果目录路径"""
        return self.project_root / 'results'
    
    @property
    def reports_dir(self) -> Path:
        """报告目录路径"""
        return self.project_root / 'reports'
    
    def ensure_directories(self):
        """确保必要的目录存在"""
        for directory in [self.config_dir, self.results_dir, self.reports_dir]:
            directory.mkdir(parents=True, exist_ok=True)
    
    def resolve_config_file(self, filename: str) -> Path:
        """
        解析配置文件路径
        
        Args:
            filename: 配置文件名
            
        Returns:
            配置文件的完整路径
        """
        return self.config_dir / filename
    
    def get_relative_path(self, path: Path) -> str:
        """
        获取相对于项目根目录的相对路径
        
        Args:
            path: 要转换的路径
            
        Returns:
            相对路径字符串
        """
        try:
            return str(path.relative_to(self.project_root))
        except ValueError:
            return str(path)


# 全局路径解析器实例
_global_resolver: Optional[ProjectPathResolver] = None

def get_path_resolver() -> ProjectPathResolver:
    """获取全局路径解析器实例"""
    global _global_resolver
    if _global_resolver is None:
        _global_resolver = ProjectPathResolver()
    return _global_resolver

def setup_project_paths(start_path: Optional[Path] = None) -> ProjectPathResolver:
    """
    设置项目路径并返回解析器实例
    
    Args:
        start_path: 开始搜索的路径
        
    Returns:
        路径解析器实例
    """
    global _global_resolver
    _global_resolver = ProjectPathResolver(start_path)
    _global_resolver.ensure_directories()
    return _global_resolver

def get_project_name() -> str:
    """获取项目名称（基于项目根目录名称）"""
    resolver = get_path_resolver()
    return resolver.project_root.name


if __name__ == "__main__":
    # 测试路径解析器
    resolver = setup_project_paths()
    
    print(f"项目根目录: {resolver.project_root}")
    print(f"配置目录: {resolver.config_dir}")
    print(f"结果目录: {resolver.results_dir}")
    print(f"报告目录: {resolver.reports_dir}")
    print(f"cookies.txt: {resolver.resolve_config_file('cookies.txt')}")
    print(f"postgres.json: {resolver.resolve_config_file('postgres.json')}")
    print(f"项目名称: {get_project_name()}")