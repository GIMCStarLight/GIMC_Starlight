"""
兼容层：为重试服务提供参数别名兼容与 run_page 封装

此模块在不修改核心实现（services.retry_handler）的前提下，
提供以下兼容：
- create_retry_config 支持旧参数命名（max_retries、backoff_base_ms、cooldown_429_403_ms）
- create_retry_handler 支持传入 config 与 request_fn，并返回包含 run_page 的包装器
"""

from typing import Callable, Optional, Tuple

from .retry_handler import (
    RetryHandler as BaseRetryHandler,
    RetryConfig as BaseRetryConfig,
)


class RetryHandlerCompat:
    """包装器：为 BaseRetryHandler 提供 run_page 接口"""

    def __init__(
        self,
        handler: BaseRetryHandler,
        request_fn: Callable[[dict, dict], Tuple[int | None, str | None, dict | None]],
    ) -> None:
        self._handler = handler
        self.request_fn = request_fn

        # 透传常用属性，便于上层访问
        self.config = handler.config
        self.limiter = handler.limiter
        self.logger = handler.logger
        self.record_request = handler.record_request
        self.observe_latency_ms = handler.observe_latency_ms

    def run_page(
        self,
        page: int,
        headers: dict,
        payload: dict,
        log_event: Optional[Callable[..., None]] = None,
    ) -> Tuple[int | None, str | None, dict | None]:
        return self._handler.execute_with_retry(
            self.request_fn,
            headers,
            payload,
            page=page,
            log_event=log_event,
        )


def create_retry_config(
    retry_max: int = 3,
    retry_backoff_ms: int = 1000,
    cooldown_on_429_403_ms: Optional[int] = None,
    max_consecutive_401: Optional[int] = None,
    pause_on_401_ms: Optional[int] = None,
    jitter_ratio: float = 0.2,
    **kwargs,
) -> BaseRetryConfig:
    """创建重试配置，兼容旧参数命名"""

    # 兼容别名
    max_retries = kwargs.get("max_retries")
    backoff_base_ms = kwargs.get("backoff_base_ms")
    cooldown_429_403_ms_alias = kwargs.get("cooldown_429_403_ms")

    try:
        if max_retries is not None:
            retry_max = int(max_retries)
    except Exception:
        pass
    try:
        if backoff_base_ms is not None:
            retry_backoff_ms = int(backoff_base_ms)
    except Exception:
        pass
    try:
        if cooldown_429_403_ms_alias is not None:
            cooldown_on_429_403_ms = int(cooldown_429_403_ms_alias)
    except Exception:
        pass

    return BaseRetryConfig(
        retry_max=retry_max,
        retry_backoff_ms=retry_backoff_ms,
        cooldown_on_429_403_ms=cooldown_on_429_403_ms,
        max_consecutive_401=max_consecutive_401,
        pause_on_401_ms=pause_on_401_ms,
        jitter_ratio=jitter_ratio,
    )


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
    # 兼容：支持显式传入配置与绑定请求函数
    config: Optional[BaseRetryConfig] = None,
    request_fn: Optional[Callable[[dict, dict], Tuple[int | None, str | None, dict | None]]] = None,
    # 兼容：接受但不使用的参数，避免调用处报错
    use_fetcher_controls: Optional[bool] = None,
    **kwargs,
) -> BaseRetryHandler | RetryHandlerCompat:
    """创建重试处理器，兼容旧参数命名与封装 run_page"""

    if config is None:
        config = create_retry_config(
            retry_max=retry_max,
            retry_backoff_ms=retry_backoff_ms,
            cooldown_on_429_403_ms=cooldown_on_429_403_ms,
            max_consecutive_401=max_consecutive_401,
            pause_on_401_ms=pause_on_401_ms,
            jitter_ratio=jitter_ratio,
            **kwargs,
        )

    handler = BaseRetryHandler(
        config=config,
        limiter=limiter,
        logger=logger,
        record_request=record_request,
        observe_latency_ms=observe_latency_ms,
    )

    if request_fn is not None:
        return RetryHandlerCompat(handler=handler, request_fn=request_fn)
    return handler


# 便于调用方继续按原类名引用
RetryHandler = BaseRetryHandler
RetryConfig = BaseRetryConfig