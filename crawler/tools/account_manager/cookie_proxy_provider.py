#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Cookie Fetcher 代理管理模块
参考 MediaCrawler 项目的代理实现，为 auto_cookie_fetcher 提供代理支持
"""

import json
import os
import random
import logging
from abc import ABC, abstractmethod
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False
    print("[警告] 未安装 httpx，代理功能将不可用")
    print("       安装命令: pip install httpx")

logger = logging.getLogger("cookie_proxy_provider")


# ==================== 数据模型 ====================

class ProviderNameEnum(Enum):
    """代理提供商枚举"""
    KUAI_DAILI = "kuaidaili"
    WANDOU_HTTP = "wandouhttp"
    CUSTOM = "custom"


class IpInfoModel(BaseModel):
    """统一的IP代理信息模型"""
    ip: str = Field(..., description="代理IP地址")
    port: int = Field(..., description="代理端口")
    user: str = Field(default="", description="代理认证用户名")
    password: str = Field(default="", description="代理认证密码")
    protocol: str = Field(default="http", description="代理协议 http/https/socks5")
    expired_time_ts: Optional[int] = Field(default=None, description="过期时间戳")

    def to_playwright_proxy(self) -> Dict[str, str]:
        """转换为 Playwright 代理格式"""
        if self.user and self.password:
            server = f"{self.protocol}://{self.user}:{self.password}@{self.ip}:{self.port}"
        else:
            server = f"{self.protocol}://{self.ip}:{self.port}"
        
        return {"server": server}

    def to_url(self) -> str:
        """转换为代理URL"""
        if self.user and self.password:
            return f"{self.protocol}://{self.user}:{self.password}@{self.ip}:{self.port}"
        else:
            return f"{self.protocol}://{self.ip}:{self.port}"


# ==================== 代理提供者基类 ====================

class ProxyProvider(ABC):
    """代理提供者抽象基类"""
    
    @abstractmethod
    async def get_proxy(self, num: int = 1) -> List[IpInfoModel]:
        """
        获取指定数量的代理IP
        
        Args:
            num: 需要获取的代理数量
            
        Returns:
            代理IP列表
        """
        raise NotImplementedError


# ==================== 快代理实现 ====================

class KuaiDaiLiProxy(ProxyProvider):
    """快代理HTTP实现"""
    
    def __init__(self, secret_id: str, signature: str, user_name: str, password: str):
        """
        初始化快代理
        
        Args:
            secret_id: 快代理 Secret ID
            signature: 快代理签名
            user_name: 快代理用户名
            password: 快代理密码
        """
        self.secret_id = secret_id
        self.signature = signature
        self.user_name = user_name
        self.password = password
        self.api_base = "https://dps.kdlapi.com"
        
    async def get_proxy(self, num: int = 1) -> List[IpInfoModel]:
        """获取快代理IP"""
        if not HTTPX_AVAILABLE:
            raise Exception("httpx 未安装，无法使用代理功能")
        
        uri = "/api/getdps/"
        params = {
            "secret_id": self.secret_id,
            "signature": self.signature,
            "num": num,
            "pt": 1,  # 协议类型：1-HTTP
            "format": "json",
            "sep": 1,
        }
        
        ip_infos: List[IpInfoModel] = []
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(self.api_base + uri, params=params, timeout=10.0)
                
                if response.status_code != 200:
                    logger.error(f"快代理API返回错误状态码: {response.status_code}")
                    raise Exception(f"快代理API请求失败: {response.status_code}")
                
                data = response.json()
                
                if data.get("code") != 0:
                    logger.error(f"快代理API返回错误: {data.get('msg')}")
                    raise Exception(f"快代理API错误: {data.get('msg')}")
                
                proxy_list = data.get("data", {}).get("proxy_list", [])
                
                for proxy_str in proxy_list:
                    # 解析格式: "ip:port"
                    parts = proxy_str.split(":")
                    if len(parts) >= 2:
                        ip_info = IpInfoModel(
                            ip=parts[0],
                            port=int(parts[1]),
                            user=self.user_name,
                            password=self.password,
                            protocol="http"
                        )
                        ip_infos.append(ip_info)
                
                logger.info(f"成功从快代理获取 {len(ip_infos)} 个代理IP")
                return ip_infos
                
        except Exception as e:
            logger.exception(f"获取快代理IP失败: {e}")
            raise


# ==================== 豌豆HTTP实现 ====================

class WanDouHttpProxy(ProxyProvider):
    """豌豆HTTP代理实现"""
    
    def __init__(self, api_key: str, user_name: str = "", password: str = ""):
        """
        初始化豌豆HTTP
        
        Args:
            api_key: 豌豆HTTP API Key
            user_name: 用户名（如果需要）
            password: 密码（如果需要）
        """
        self.api_key = api_key
        self.user_name = user_name
        self.password = password
        self.api_base = "http://api.wandouip.com"
        
    async def get_proxy(self, num: int = 1) -> List[IpInfoModel]:
        """获取豌豆HTTP代理"""
        if not HTTPX_AVAILABLE:
            raise Exception("httpx 未安装，无法使用代理功能")
        
        uri = "/api/ip"
        params = {
            "app_key": self.api_key,
            "pack": num,
            "format": "json",
        }
        
        ip_infos: List[IpInfoModel] = []
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(self.api_base + uri, params=params, timeout=10.0)
                
                if response.status_code != 200:
                    logger.error(f"豌豆HTTP API返回错误状态码: {response.status_code}")
                    raise Exception(f"豌豆HTTP API请求失败: {response.status_code}")
                
                data = response.json()
                
                if data.get("code") != 0:
                    logger.error(f"豌豆HTTP API返回错误: {data.get('msg')}")
                    raise Exception(f"豌豆HTTP API错误: {data.get('msg')}")
                
                proxy_list = data.get("data", [])
                
                for proxy_item in proxy_list:
                    ip_info = IpInfoModel(
                        ip=proxy_item.get("ip"),
                        port=int(proxy_item.get("port")),
                        user=self.user_name,
                        password=self.password,
                        protocol="http"
                    )
                    ip_infos.append(ip_info)
                
                logger.info(f"成功从豌豆HTTP获取 {len(ip_infos)} 个代理IP")
                return ip_infos
                
        except Exception as e:
            logger.exception(f"获取豌豆HTTP代理失败: {e}")
            raise


# ==================== 自定义代理实现 ====================

class CustomProxy(ProxyProvider):
    """自定义代理列表"""
    
    def __init__(self, proxy_list: List[Dict[str, Any]]):
        """
        初始化自定义代理
        
        Args:
            proxy_list: 代理列表，格式: [{"ip": "x.x.x.x", "port": 8080, "user": "", "password": ""}]
        """
        self.proxies = [IpInfoModel(**proxy) for proxy in proxy_list]
        
    async def get_proxy(self, num: int = 1) -> List[IpInfoModel]:
        """从自定义列表中随机获取代理"""
        if not self.proxies:
            raise Exception("自定义代理列表为空")
        
        # 随机选择（可重复）
        selected = random.choices(self.proxies, k=min(num, len(self.proxies)))
        logger.info(f"从自定义代理列表中获取 {len(selected)} 个代理")
        return selected


# ==================== 代理池管理 ====================

class ProxyIpPool:
    """代理IP池管理器"""
    
    def __init__(self, ip_provider: ProxyProvider, pool_size: int = 5, enable_validate: bool = False):
        """
        初始化代理池
        
        Args:
            ip_provider: 代理提供者
            pool_size: 代理池大小
            enable_validate: 是否验证代理有效性
        """
        self.ip_provider = ip_provider
        self.pool_size = pool_size
        self.enable_validate = enable_validate
        self.proxy_list: List[IpInfoModel] = []
        self.valid_url = "https://echo.apifox.cn/"
        
    async def load_proxies(self) -> None:
        """加载代理到池中"""
        logger.info(f"正在加载 {self.pool_size} 个代理IP到代理池...")
        self.proxy_list = await self.ip_provider.get_proxy(self.pool_size)
        logger.info(f"代理池加载完成，当前有 {len(self.proxy_list)} 个代理")
        
    async def _is_valid_proxy(self, proxy: IpInfoModel) -> bool:
        """验证代理是否有效"""
        if not HTTPX_AVAILABLE:
            logger.warning("httpx 未安装，跳过代理验证")
            return True
        
        try:
            logger.debug(f"验证代理: {proxy.ip}:{proxy.port}")
            async with httpx.AsyncClient(proxy=proxy.to_url(), timeout=5.0) as client:
                response = await client.get(self.valid_url)
                return response.status_code == 200
        except Exception as e:
            logger.debug(f"代理验证失败 {proxy.ip}:{proxy.port}: {e}")
            return False
    
    async def get_proxy(self) -> IpInfoModel:
        """从代理池中获取一个可用代理"""
        # 如果池为空，先加载
        if not self.proxy_list:
            await self.load_proxies()
        
        # 随机选择一个代理
        proxy = random.choice(self.proxy_list)
        
        # 如果启用验证
        if self.enable_validate:
            # 尝试最多3次
            for _ in range(3):
                if await self._is_valid_proxy(proxy):
                    return proxy
                else:
                    # 移除失效代理
                    self.proxy_list.remove(proxy)
                    # 如果池空了，重新加载
                    if not self.proxy_list:
                        await self.load_proxies()
                    proxy = random.choice(self.proxy_list)
            
            raise Exception("未能获取有效代理")
        
        return proxy
    
    async def refresh_pool(self) -> None:
        """刷新代理池"""
        logger.info("刷新代理池...")
        self.proxy_list = []
        await self.load_proxies()


# ==================== 代理配置管理 ====================

class ProxyConfig:
    """代理配置管理器"""
    
    @staticmethod
    def load_from_file(config_path: str) -> Dict[str, Any]:
        """从文件加载代理配置"""
        if not os.path.exists(config_path):
            logger.warning(f"代理配置文件不存在: {config_path}")
            return {}
        
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                config = json.load(f)
            logger.info(f"成功加载代理配置: {config_path}")
            return config
        except Exception as e:
            logger.error(f"加载代理配置失败: {e}")
            return {}
    
    @staticmethod
    def save_to_file(config: Dict[str, Any], config_path: str) -> bool:
        """保存代理配置到文件"""
        try:
            os.makedirs(os.path.dirname(config_path), exist_ok=True)
            with open(config_path, "w", encoding="utf-8") as f:
                json.dump(config, f, ensure_ascii=False, indent=2)
            logger.info(f"代理配置已保存: {config_path}")
            return True
        except Exception as e:
            logger.error(f"保存代理配置失败: {e}")
            return False
    
    @staticmethod
    async def create_proxy_provider(config: Dict[str, Any]) -> Optional[ProxyProvider]:
        """根据配置创建代理提供者"""
        if not config.get("enable_proxy", False):
            logger.info("代理功能未启用")
            return None
        
        provider_name = config.get("proxy_provider", "kuaidaili")
        
        if provider_name == ProviderNameEnum.KUAI_DAILI.value:
            kdl_config = config.get("kuaidaili", {})
            return KuaiDaiLiProxy(
                secret_id=kdl_config.get("secret_id", ""),
                signature=kdl_config.get("signature", ""),
                user_name=kdl_config.get("user_name", ""),
                password=kdl_config.get("password", "")
            )
        
        elif provider_name == ProviderNameEnum.WANDOU_HTTP.value:
            wd_config = config.get("wandouhttp", {})
            return WanDouHttpProxy(
                api_key=wd_config.get("api_key", ""),
                user_name=wd_config.get("user_name", ""),
                password=wd_config.get("password", "")
            )
        
        elif provider_name == ProviderNameEnum.CUSTOM.value:
            custom_config = config.get("custom_proxies", [])
            return CustomProxy(proxy_list=custom_config)
        
        else:
            logger.error(f"未知的代理提供商: {provider_name}")
            return None
    
    @staticmethod
    async def create_proxy_pool(config: Dict[str, Any]) -> Optional[ProxyIpPool]:
        """根据配置创建代理池"""
        provider = await ProxyConfig.create_proxy_provider(config)
        if not provider:
            return None
        
        pool = ProxyIpPool(
            ip_provider=provider,
            pool_size=config.get("proxy_pool_count", 5),
            enable_validate=config.get("enable_validate_ip", False)
        )
        
        await pool.load_proxies()
        return pool


# ==================== 默认配置模板 ====================

DEFAULT_PROXY_CONFIG = {
    "enable_proxy": False,
    "proxy_provider": "kuaidaili",
    "proxy_pool_count": 5,
    "enable_validate_ip": False,
    "kuaidaili": {
        "secret_id": "your_secret_id",
        "signature": "your_signature",
        "user_name": "your_username",
        "password": "your_password"
    },
    "wandouhttp": {
        "api_key": "your_api_key",
        "user_name": "",
        "password": ""
    },
    "custom_proxies": [
        {
            "ip": "127.0.0.1",
            "port": 7890,
            "user": "",
            "password": "",
            "protocol": "http"
        }
    ]
}


if __name__ == "__main__":
    # 测试代码
    import asyncio
    
    async def test_custom_proxy():
        """测试自定义代理"""
        custom_proxies = [
            {"ip": "127.0.0.1", "port": 7890, "user": "", "password": ""}
        ]
        provider = CustomProxy(custom_proxies)
        proxies = await provider.get_proxy(1)
        print(f"获取到代理: {proxies[0].to_url()}")
    
    asyncio.run(test_custom_proxy())
