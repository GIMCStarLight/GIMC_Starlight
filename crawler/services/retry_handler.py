"""
重试与错误处理服务

提供统一的重试、退避、冷却和错误处理功能：
- 指数退避重试策略
- 特定状态码的冷却机制
- 连续401错误的暂停策略
- 请求限流与监控集成
"""

import time
import random
from typing import Callable, Tuple, Optional, Dict, Any


class RetryConfig:
    """重试配置"""
    
    def __init__(
        self,
        retry_max: int = 3,
        retry_backoff_ms: int = 1000,
        cooldown_on_429_403_ms: Optional[int] = None,
        max_consecutive_401: Optional[int] = None,
        pause_on_401_ms: Optional[int] = None,
        jitter_ratio: float = 0.2
    ):
        self.retry_max = int(retry_max)
        self.retry_backoff_ms = int(retry_backoff_ms)
        self.cooldown_on_429_403_ms = int(cooldown_on_429_403_ms) if cooldown_on_429_403_ms is not None else None
        self.max_consecutive_401 = int(max_consecutive_401) if max_consecutive_401 is not None else None
        self.pause_on_401_ms = int(pause_on_401_ms) if pause_on_401_ms is not None else None
        self.jitter_ratio = float(jitter_ratio)


class RetryHandler:
    """重试处理器
    
    封装单页请求的重试、退避、冷却逻辑，支持：
    - 指数退避重试
    - 429/403状态码冷却
    - 连续401错误暂停
    - 请求限流与监控
    """

    def __init__(
        self,
        config: RetryConfig,
        limiter: object = None,
        logger: object = None,
        record_request: Optional[Callable[[int | None], None]] = None,
        observe_latency_ms: Optional[Callable[[float], None]] = None,
    ):
        self.config = config
        self.limiter = limiter
        self.logger = logger
        self.record_request = record_request
        self.observe_latency_ms = observe_latency_ms
        self.consecutive_401 = 0

    def execute_with_retry(
        self,
        request_fn: Callable[[dict, dict], Tuple[int | None, str | None, dict | None]],
        headers: dict,
        payload: dict,
        page: int = None,
        log_event: Optional[Callable[..., None]] = None,
    ) -> Tuple[int | None, str | None, dict | None]:
        """执行带重试的请求
        
        Args:
            request_fn: 请求函数，返回 (status, x_tt_agw_login, data)
            headers: 请求头
            payload: 请求载荷
            page: 页码（用于日志）
            log_event: 日志事件记录函数
            
        Returns:
            (status, x_tt_agw_login, data) 元组
        """
        status: int | None = None
        agw_login: str | None = None
        data: dict | None = None
        attempt = 0

        while True:
            # 域级限流
            try:
                if self.limiter is not None and hasattr(self.limiter, "acquire"):
                    self.limiter.acquire()
            except Exception:
                pass

            # 执行请求并记录指标
            t0 = time.time()
            status, agw_login, data = request_fn(headers, payload)
            
            try:
                if self.record_request:
                    self.record_request(status)
                if self.observe_latency_ms:
                    self.observe_latency_ms((time.time() - t0) * 1000.0)
            except Exception:
                pass

            # 成功响应
            if status == 200:
                self.consecutive_401 = 0  # 重置401计数
                break

            # 处理需要重试的状态码
            if status in (401, 429, 403) or (status is not None and status >= 500):
                # 401错误特殊处理
                if status == 401:
                    self.consecutive_401 += 1
                    try:
                        if self.logger and log_event:
                            log_event(
                                self.logger,
                                "warn",
                                "401_detected",
                                page=int(page) if page is not None else None,
                                attempt=int(attempt + 1),
                                consecutive_401=int(self.consecutive_401),
                                x_tt_agw_login=str(agw_login) if agw_login is not None else None,
                            )
                    except Exception:
                        pass
                    
                    # 连续401暂停策略
                    if (
                        self.config.max_consecutive_401
                        and self.config.pause_on_401_ms
                        and int(self.consecutive_401) >= int(self.config.max_consecutive_401)
                    ):
                        try:
                            pause_sec = int(self.config.pause_on_401_ms) / 1000.0
                            print(
                                f"[pause-401] page={page} 连续401达到阈值 {self.config.max_consecutive_401}，暂停 {pause_sec:.2f}s"
                            )
                            if self.logger and log_event:
                                try:
                                    log_event(
                                        self.logger,
                                        "warn",
                                        "401_pause",
                                        page=int(page) if page is not None else None,
                                        pause_ms=int(self.config.pause_on_401_ms),
                                        threshold=int(self.config.max_consecutive_401),
                                    )
                                except Exception:
                                    pass
                            time.sleep(pause_sec)
                        except Exception:
                            pass
                        finally:
                            self.consecutive_401 = 0

                # 检查是否达到最大重试次数
                if attempt >= int(self.config.retry_max):
                    print(f"[warn] page={page} status={status}，已达最大重试次数 {self.config.retry_max}，跳过该页")
                    break

                # 指数退避
                backoff = int(self.config.retry_backoff_ms) * (2**attempt)
                jitter = int(backoff * self.config.jitter_ratio * random.random())
                sleep_sec = (backoff + jitter) / 1000.0
                print(f"[retry] page={page} status={status}，退避 {sleep_sec:.2f}s 后重试 (attempt={attempt+1})")
                
                try:
                    if self.logger and log_event:
                        log_event(
                            self.logger,
                            "info",
                            "retry_backoff",
                            page=int(page) if page is not None else None,
                            status=int(status) if status is not None else None,
                            attempt=int(attempt + 1),
                            sleep_ms=int(backoff + jitter),
                        )
                except Exception:
                    pass
                
                time.sleep(sleep_sec)

                # 429/403额外冷却
                try:
                    if status in (429, 403) and self.config.cooldown_on_429_403_ms and int(self.config.cooldown_on_429_403_ms) > 0:
                        cool_sec = int(self.config.cooldown_on_429_403_ms) / 1000.0
                        print(f"[cooldown] page={page} status={status}，额外冷却 {cool_sec:.2f}s")
                        try:
                            if self.logger and log_event:
                                log_event(
                                    self.logger,
                                    "info",
                                    "cooldown",
                                    page=int(page) if page is not None else None,
                                    status=int(status),
                                    cooldown_ms=int(self.config.cooldown_on_429_403_ms),
                                )
                        except Exception:
                            pass
                        time.sleep(cool_sec)
                except Exception:
                    pass
                
                attempt += 1
                continue

            # 非预期状态码，停止处理
            print(f"[warn] 非预期状态码，page={page} status={status}，停止该页")
            try:
                if self.logger and log_event:
                    log_event(
                        self.logger,
                        "warn",
                        "stop_unexpected_status",
                        page=int(page) if page is not None else None,
                        status=int(status) if status is not None else None,
                    )
            except Exception:
                pass
            break

        return status, agw_login, data


def create_retry_handler(
    retry_max: int = 3,
    retry_backoff_ms: int = 1000,
    cooldown_on_429_403_ms: Optional[int] = None,
    max_consecutive_401: Optional[int] = None,
    pause_on_401_ms: Optional[int] = None,
    jitter_ratio: float = 0.2,
    limiter: object = None,
    logger: object = None,
    record_request: Optional[Callable[[int | None], None]] = None,
    observe_latency_ms: Optional[Callable[[float], None]] = None,
) -> RetryHandler:
    """创建重试处理器
    
    Args:
        retry_max: 最大重试次数
        retry_backoff_ms: 基础退避时间（毫秒）
        cooldown_on_429_403_ms: 429/403状态码额外冷却时间（毫秒）
        max_consecutive_401: 连续401错误阈值
        pause_on_401_ms: 401错误暂停时间（毫秒）
        jitter_ratio: 抖动比例
        limiter: 限流器
        logger: 日志器
        record_request: 请求记录函数
        observe_latency_ms: 延迟观测函数
        
    Returns:
        RetryHandler实例
    """
    config = RetryConfig(
        retry_max=retry_max,
        retry_backoff_ms=retry_backoff_ms,
        cooldown_on_429_403_ms=cooldown_on_429_403_ms,
        max_consecutive_401=max_consecutive_401,
        pause_on_401_ms=pause_on_401_ms,
        jitter_ratio=jitter_ratio
    )
    
    return RetryHandler(
        config=config,
        limiter=limiter,
        logger=logger,
        record_request=record_request,
        observe_latency_ms=observe_latency_ms
    )


def create_retry_config(
    retry_max: int = 3,
    retry_backoff_ms: int = 1000,
    cooldown_on_429_403_ms: Optional[int] = None,
    max_consecutive_401: Optional[int] = None,
    pause_on_401_ms: Optional[int] = None,
    jitter_ratio: float = 0.2
) -> RetryConfig:
    """创建重试配置
    
    Args:
        retry_max: 最大重试次数
        retry_backoff_ms: 基础退避时间（毫秒）
        cooldown_on_429_403_ms: 429/403状态码额外冷却时间（毫秒）
        max_consecutive_401: 连续401错误阈值
        pause_on_401_ms: 401错误暂停时间（毫秒）
        jitter_ratio: 抖动比例
        
    Returns:
        RetryConfig实例
    """
    return RetryConfig(
        retry_max=retry_max,
        retry_backoff_ms=retry_backoff_ms,
        cooldown_on_429_403_ms=cooldown_on_429_403_ms,
        max_consecutive_401=max_consecutive_401,
        pause_on_401_ms=pause_on_401_ms,
        jitter_ratio=jitter_ratio
    )