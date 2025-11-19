#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Account Manager - 多账号和代理管理模块
"""

from .cookie_account_pool import (
    AccountPool,
    AccountModel,
    AccountStatus,
    RotationStrategy,
    AccountCookieManager
)

from .cookie_proxy_provider import (
    ProxyConfig,
    ProxyIpPool,
    IpInfoModel,
    ProviderNameEnum,
    ProxyProvider,
    KuaiDaiLiProxy,
    WanDouHttpProxy,
    CustomProxy,
    DEFAULT_PROXY_CONFIG
)

__all__ = [
    # Account Pool
    'AccountPool',
    'AccountModel',
    'AccountStatus',
    'RotationStrategy',
    'AccountCookieManager',
    
    # Proxy Provider
    'ProxyConfig',
    'ProxyIpPool',
    'IpInfoModel',
    'ProviderNameEnum',
    'ProxyProvider',
    'KuaiDaiLiProxy',
    'WanDouHttpProxy',
    'CustomProxy',
    'DEFAULT_PROXY_CONFIG',
]
