#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Cookie Fetcher 账号池管理模块
提供多账号管理、轮换、健康检查等功能
"""

import json
import os
import logging
import shutil
from datetime import datetime, timedelta
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from pathlib import Path
import filelock

logger = logging.getLogger("cookie_account_pool")

try:
    from filelock import FileLock
    FILELOCK_AVAILABLE = True
except ImportError:
    FILELOCK_AVAILABLE = False
    logger.warning("未安装 filelock，账号并发控制将不可用。安装: pip install filelock")


# ==================== 枚举类型 ====================

class AccountStatus(str, Enum):
    """账号状态"""
    ACTIVE = "active"           # 正常可用
    EXPIRED = "expired"         # Cookie已过期
    FROZEN = "frozen"           # 账号被冻结
    ERROR = "error"             # 登录/使用出错
    LOCKED = "locked"           # 正在被使用（锁定中）


class RotationStrategy(str, Enum):
    """账号轮换策略"""
    SEQUENTIAL = "sequential"       # 顺序轮换
    RANDOM = "random"              # 随机选择
    LEAST_USED = "least_used"      # 最少使用优先
    LONGEST_VALID = "longest_valid" # 有效期最长优先


# ==================== 数据模型 ====================

class AccountModel(BaseModel):
    """账号信息模型"""
    account_id: str = Field(..., description="账号唯一标识")
    account_name: str = Field(default="", description="账号名称/备注")
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat(), description="创建时间")
    last_used_at: Optional[str] = Field(default=None, description="最后使用时间")
    expires_at: Optional[str] = Field(default=None, description="Cookie过期时间")
    status: AccountStatus = Field(default=AccountStatus.ACTIVE, description="账号状态")
    cookie_count: int = Field(default=0, description="Cookie数量")
    proxy_ip: Optional[str] = Field(default=None, description="绑定的代理IP")
    error_count: int = Field(default=0, description="错误次数")
    use_count: int = Field(default=0, description="使用次数")
    
    def is_available(self) -> bool:
        """判断账号是否可用"""
        if self.status != AccountStatus.ACTIVE:
            return False
        
        if self.expires_at:
            try:
                expires = datetime.fromisoformat(self.expires_at)
                if datetime.now() >= expires:
                    return False
            except Exception:
                pass
        
        # 错误次数过多
        if self.error_count >= 5:
            return False
        
        return True
    
    def update_last_used(self):
        """更新最后使用时间"""
        self.last_used_at = datetime.now().isoformat()
        self.use_count += 1
    
    def mark_error(self):
        """标记错误"""
        self.error_count += 1
        if self.error_count >= 5:
            self.status = AccountStatus.ERROR
    
    def reset_error(self):
        """重置错误计数"""
        self.error_count = 0
        if self.status == AccountStatus.ERROR:
            self.status = AccountStatus.ACTIVE


# ==================== 账号池管理器 ====================

class AccountPool:
    """账号池管理器"""
    
    def __init__(self, pool_config_path: str, accounts_dir: str):
        """
        初始化账号池
        
        Args:
            pool_config_path: 账号池配置文件路径
            accounts_dir: 账号数据目录
        """
        self.pool_config_path = pool_config_path
        self.accounts_dir = accounts_dir
        self.accounts: List[AccountModel] = []
        self.rotation_strategy = RotationStrategy.LEAST_USED
        self.auto_refresh = False
        self.refresh_before_expire_hours = 2
        
        # 确保目录存在
        os.makedirs(self.accounts_dir, exist_ok=True)
        os.makedirs(os.path.dirname(self.pool_config_path) or ".", exist_ok=True)
        
        # 加载配置
        self.load_pool_config()
    
    def load_pool_config(self) -> bool:
        """加载账号池配置"""
        try:
            if os.path.exists(self.pool_config_path):
                with open(self.pool_config_path, "r", encoding="utf-8") as f:
                    config = json.load(f)
                
                # 加载账号列表
                self.accounts = [AccountModel(**acc) for acc in config.get("accounts", [])]
                
                # 加载配置项
                self.rotation_strategy = RotationStrategy(
                    config.get("rotation_strategy", RotationStrategy.LEAST_USED.value)
                )
                self.auto_refresh = config.get("auto_refresh", False)
                self.refresh_before_expire_hours = config.get("refresh_before_expire_hours", 2)
                
                logger.info(f"成功加载账号池配置，共 {len(self.accounts)} 个账号")
                return True
            else:
                logger.info("账号池配置文件不存在，将创建新的配置")
                self.save_pool_config()
                return True
        except Exception as e:
            logger.exception(f"加载账号池配置失败: {e}")
            return False
    
    def save_pool_config(self) -> bool:
        """保存账号池配置"""
        try:
            config = {
                "accounts": [acc.model_dump() for acc in self.accounts],
                "rotation_strategy": self.rotation_strategy.value,
                "auto_refresh": self.auto_refresh,
                "refresh_before_expire_hours": self.refresh_before_expire_hours,
                "updated_at": datetime.now().isoformat()
            }
            
            with open(self.pool_config_path, "w", encoding="utf-8") as f:
                json.dump(config, f, ensure_ascii=False, indent=2)
            
            logger.info(f"账号池配置已保存: {self.pool_config_path}")
            return True
        except Exception as e:
            logger.exception(f"保存账号池配置失败: {e}")
            return False
    
    def add_account(self, account: AccountModel) -> bool:
        """添加账号到池中"""
        # 检查账号ID是否已存在
        if any(acc.account_id == account.account_id for acc in self.accounts):
            logger.error(f"账号ID已存在: {account.account_id}")
            return False
        
        # 创建账号目录
        account_dir = self.get_account_dir(account.account_id)
        os.makedirs(account_dir, exist_ok=True)
        
        # 添加到列表
        self.accounts.append(account)
        
        # 保存配置
        self.save_pool_config()
        
        logger.info(f"成功添加账号: {account.account_id}")
        return True
    
    def remove_account(self, account_id: str, delete_data: bool = True) -> bool:
        """
        移除账号
        
        Args:
            account_id: 账号ID
            delete_data: 是否删除账号数据目录
        """
        # 查找账号
        account = self.get_account(account_id)
        if not account:
            logger.error(f"账号不存在: {account_id}")
            return False
        
        # 从列表移除
        self.accounts = [acc for acc in self.accounts if acc.account_id != account_id]
        
        # 删除账号数据
        if delete_data:
            account_dir = self.get_account_dir(account_id)
            if os.path.exists(account_dir):
                try:
                    shutil.rmtree(account_dir)
                    logger.info(f"已删除账号数据目录: {account_dir}")
                except Exception as e:
                    logger.warning(f"删除账号数据目录失败: {e}")
        
        # 保存配置
        self.save_pool_config()
        
        logger.info(f"成功移除账号: {account_id}")
        return True
    
    def get_account(self, account_id: str) -> Optional[AccountModel]:
        """根据ID获取账号"""
        for account in self.accounts:
            if account.account_id == account_id:
                return account
        return None
    
    def update_account(self, account: AccountModel) -> bool:
        """更新账号信息"""
        for i, acc in enumerate(self.accounts):
            if acc.account_id == account.account_id:
                self.accounts[i] = account
                self.save_pool_config()
                logger.debug(f"账号信息已更新: {account.account_id}")
                return True
        
        logger.error(f"账号不存在，无法更新: {account.account_id}")
        return False
    
    def get_account_dir(self, account_id: str) -> str:
        """获取账号数据目录路径"""
        return os.path.join(self.accounts_dir, account_id)
    
    def get_available_accounts(self) -> List[AccountModel]:
        """获取所有可用账号"""
        return [acc for acc in self.accounts if acc.is_available()]
    
    def select_account(self, strategy: Optional[RotationStrategy] = None) -> Optional[AccountModel]:
        """
        根据策略选择一个账号
        
        Args:
            strategy: 轮换策略，None则使用默认策略
        """
        available = self.get_available_accounts()
        if not available:
            logger.warning("没有可用账号")
            return None
        
        strategy = strategy or self.rotation_strategy
        
        if strategy == RotationStrategy.RANDOM:
            import random
            return random.choice(available)
        
        elif strategy == RotationStrategy.SEQUENTIAL:
            # 按创建时间顺序
            return sorted(available, key=lambda x: x.created_at)[0]
        
        elif strategy == RotationStrategy.LEAST_USED:
            # 使用次数最少
            return sorted(available, key=lambda x: x.use_count)[0]
        
        elif strategy == RotationStrategy.LONGEST_VALID:
            # 有效期最长
            def get_expire_time(acc: AccountModel) -> datetime:
                if acc.expires_at:
                    try:
                        return datetime.fromisoformat(acc.expires_at)
                    except Exception:
                        pass
                return datetime.now() + timedelta(days=365)
            
            return sorted(available, key=get_expire_time, reverse=True)[0]
        
        else:
            return available[0]
    
    def acquire_account(self, account_id: str) -> bool:
        """
        获取账号锁（用于并发控制）
        
        Args:
            account_id: 账号ID
        """
        if not FILELOCK_AVAILABLE:
            return True
        
        lock_file = os.path.join(self.get_account_dir(account_id), ".lock")
        try:
            lock = FileLock(lock_file, timeout=1)
            lock.acquire()
            return True
        except Exception:
            logger.debug(f"账号正在被使用: {account_id}")
            return False
    
    def release_account(self, account_id: str):
        """释放账号锁"""
        if not FILELOCK_AVAILABLE:
            return
        
        lock_file = os.path.join(self.get_account_dir(account_id), ".lock")
        try:
            if os.path.exists(lock_file):
                lock = FileLock(lock_file)
                lock.release()
        except Exception as e:
            logger.debug(f"释放账号锁失败: {e}")
    
    def check_expiring_accounts(self) -> List[AccountModel]:
        """检查即将过期的账号"""
        expiring = []
        threshold = datetime.now() + timedelta(hours=self.refresh_before_expire_hours)
        
        for account in self.accounts:
            if account.expires_at:
                try:
                    expires = datetime.fromisoformat(account.expires_at)
                    if datetime.now() < expires <= threshold:
                        expiring.append(account)
                except Exception:
                    pass
        
        return expiring
    
    def get_statistics(self) -> Dict[str, Any]:
        """获取账号池统计信息"""
        total = len(self.accounts)
        available = len(self.get_available_accounts())
        
        status_count = {}
        for status in AccountStatus:
            status_count[status.value] = len([
                acc for acc in self.accounts if acc.status == status
            ])
        
        return {
            "total_accounts": total,
            "available_accounts": available,
            "status_distribution": status_count,
            "rotation_strategy": self.rotation_strategy.value,
            "auto_refresh": self.auto_refresh
        }
    
    def list_accounts(self, show_all: bool = False) -> List[Dict[str, Any]]:
        """
        列出账号信息
        
        Args:
            show_all: 是否显示所有账号（包括不可用的）
        """
        accounts = self.accounts if show_all else self.get_available_accounts()
        
        result = []
        for acc in accounts:
            info = {
                "account_id": acc.account_id,
                "account_name": acc.account_name,
                "status": acc.status.value,
                "created_at": acc.created_at,
                "last_used_at": acc.last_used_at,
                "expires_at": acc.expires_at,
                "use_count": acc.use_count,
                "error_count": acc.error_count,
                "cookie_count": acc.cookie_count,
                "proxy_ip": acc.proxy_ip
            }
            result.append(info)
        
        return result


# ==================== 账号Cookie管理 ====================

class AccountCookieManager:
    """账号Cookie管理器"""
    
    @staticmethod
    def get_storage_state_path(account_dir: str) -> str:
        """获取storage_state文件路径"""
        return os.path.join(account_dir, "storage_state.json")
    
    @staticmethod
    def get_encrypted_state_path(account_dir: str) -> str:
        """获取加密storage_state文件路径"""
        return os.path.join(account_dir, "storage_state.enc")
    
    @staticmethod
    def get_meta_path(account_dir: str) -> str:
        """获取元数据文件路径"""
        return os.path.join(account_dir, "cookie_meta.json")
    
    @staticmethod
    def get_profile_dir(account_dir: str) -> str:
        """获取浏览器profile目录"""
        return os.path.join(account_dir, "browser_profile")
    
    @staticmethod
    def load_cookie_meta(account_dir: str) -> Optional[Dict[str, Any]]:
        """加载Cookie元数据"""
        meta_path = AccountCookieManager.get_meta_path(account_dir)
        if not os.path.exists(meta_path):
            return None
        
        try:
            with open(meta_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"加载Cookie元数据失败: {e}")
            return None
    
    @staticmethod
    def save_cookie_meta(account_dir: str, metadata: Dict[str, Any]) -> bool:
        """保存Cookie元数据"""
        meta_path = AccountCookieManager.get_meta_path(account_dir)
        try:
            os.makedirs(account_dir, exist_ok=True)
            with open(meta_path, "w", encoding="utf-8") as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            logger.error(f"保存Cookie元数据失败: {e}")
            return False


if __name__ == "__main__":
    # 测试代码
    pool = AccountPool(
        pool_config_path="config/auto_cookie_fetcher_config/account_pool.json",
        accounts_dir="config/auto_cookie_fetcher_config/accounts"
    )
    
    # 添加测试账号
    test_account = AccountModel(
        account_id="test_account_1",
        account_name="测试账号1",
        status=AccountStatus.ACTIVE
    )
    
    pool.add_account(test_account)
    
    # 查看统计
    stats = pool.get_statistics()
    print(f"账号池统计: {json.dumps(stats, ensure_ascii=False, indent=2)}")
    
    # 选择账号
    selected = pool.select_account()
    if selected:
        print(f"选中账号: {selected.account_id}")
