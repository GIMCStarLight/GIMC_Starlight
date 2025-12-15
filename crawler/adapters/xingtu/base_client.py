"""巨量星图API基础客户端"""

import sys
import time
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import requests

# 添加项目根目录
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from services.config_loader import read_cookie_file
from services.http_client import create_session
from services.logging_utils import get_json_logger, log_event
from services.rate_limiter import TimeWindowQPSLimiter


class XingtuBaseClient:
    """星图API基础客户端

    封装通用请求逻辑：
    - Cookie认证
    - 请求头构建
    - 重试机制
    - 速率限制
    """

    BASE_URL = "https://agent.oceanengine.com"
    DEFAULT_TIMEOUT = 20

    def __init__(
        self,
        star_id: str,
        cookie: str = None,
        cookie_file: str = None,
        qps: int = 5,
        retry_max: int = 3,
        retry_backoff_ms: int = 1000,
        user_agent: str = None,
    ):
        """初始化客户端

        Args:
            star_id: 星图账户ID
            cookie: Cookie字符串（优先使用）
            cookie_file: Cookie文件路径
            qps: 每秒请求数限制
            retry_max: 最大重试次数
            retry_backoff_ms: 重试退避时间(ms)
            user_agent: 自定义UA
        """
        self.star_id = star_id
        self.retry_max = retry_max
        self.retry_backoff_ms = retry_backoff_ms
        self.logger = get_json_logger("xingtu_client")

        # 加载Cookie
        if cookie:
            self.cookie = cookie
        elif cookie_file:
            self.cookie = read_cookie_file(cookie_file)
        else:
            raise ValueError("必须提供 cookie 或 cookie_file")

        # 初始化Session
        self.session = create_session()

        # 默认UA
        self.user_agent = user_agent or (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/140.0.0.0 Safari/537.36"
        )

        # 初始化限流器
        self.limiter = TimeWindowQPSLimiter(qps=qps, window_ms=1000)

    def _build_headers(self, referer: str = None) -> Dict[str, str]:
        """构建请求头"""
        return {
            "Cookie": self.cookie,
            "User-Agent": self.user_agent,
            "Referer": referer or f"{self.BASE_URL}/admin/star-agent/vue2/market",
            "Accept": "application/json, text/plain, */*",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            # 星图特有头
            "x-tt-possess-star-id": str(self.star_id),
            "x-login-source": "1",
            "x-tt-possess-scene": "2",
            "agw-js-conv": "str",
            # Chromium安全头
            "sec-ch-ua-platform": '"macOS"',
            "sec-ch-ua": '"Not=A?Brand";v="24", "Chromium";v="140"',
            "sec-ch-ua-mobile": "?0",
        }

    def _request_get(
        self,
        endpoint: str,
        params: Dict[str, Any] = None,
        referer: str = None,
    ) -> Tuple[int, Optional[str], Dict[str, Any]]:
        """执行GET请求（带重试）

        Args:
            endpoint: API端点（如 /get_author_base_info）
            params: 查询参数
            referer: 自定义Referer

        Returns:
            (status_code, x_tt_agw_login, response_data)
        """
        url = f"{self.BASE_URL}{endpoint}"
        headers = self._build_headers(referer)

        last_error = None
        for attempt in range(self.retry_max):
            try:
                # 限流
                self.limiter.acquire()

                # 发起请求
                resp = self.session.get(
                    url,
                    headers=headers,
                    params=params,
                    timeout=self.DEFAULT_TIMEOUT,
                )

                status = resp.status_code
                agw_login = resp.headers.get("x-tt-agw-login")

                try:
                    data = resp.json()
                except Exception:
                    data = {"raw": resp.text}

                # 成功或业务错误直接返回
                if status == 200:
                    return status, agw_login, data

                # 429/403 触发冷却
                if status in (429, 403):
                    log_event(
                        self.logger,
                        "warning",
                        f"触发限流 status={status}, 冷却3秒",
                    )
                    time.sleep(3)
                    continue

                # 其他错误
                log_event(
                    self.logger,
                    "warning",
                    f"请求失败 status={status}, attempt={attempt+1}",
                )

            except requests.exceptions.Timeout as e:
                last_error = e
                log_event(self.logger, "warning", f"请求超时, attempt={attempt+1}")
            except requests.exceptions.RequestException as e:
                last_error = e
                log_event(self.logger, "error", f"请求异常: {e}")

            # 退避重试
            if attempt < self.retry_max - 1:
                backoff = self.retry_backoff_ms * (2**attempt) / 1000
                time.sleep(backoff)

        # 全部重试失败
        raise Exception(f"请求失败，已重试{self.retry_max}次: {last_error}")

    def check_response(self, response: Dict[str, Any]) -> bool:
        """检查响应是否成功"""
        base_resp = response.get("base_resp", {})
        status_code = base_resp.get("status_code")
        return status_code == 0

    def close(self):
        """关闭Session"""
        if self.session:
            self.session.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
        return False
