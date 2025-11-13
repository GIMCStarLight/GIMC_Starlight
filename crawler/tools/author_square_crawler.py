import time
import random
from typing import Callable, Tuple, Optional

try:
    from .author_fetcher import AuthorFetcher  # relative import within package
except Exception:
    AuthorFetcher = None


class AuthorSquareCrawler:
    """
    Encapsulates single-page request and retry/backoff/cooldown logic for Author Square.

    This class keeps state like consecutive_401 across pages and can optionally
    delegate request control to AuthorFetcher when use_fetcher_controls is True.
    """

    def __init__(
        self,
        *,
        limiter: object | None,
        retry_max: int,
        retry_backoff_ms: int,
        cooldown_on_429_403_ms: Optional[int],
        max_consecutive_401: Optional[int],
        pause_on_401_ms: Optional[int],
        use_fetcher_controls: bool,
        logger: object | None,
        record_request: Optional[Callable[[int | None], None]] = None,
        observe_latency_ms: Optional[Callable[[float], None]] = None,
        request_fn: Optional[Callable[[dict, dict], Tuple[int | None, str | None, dict | None]]] = None,
    ):
        self.limiter = limiter
        self.retry_max = int(retry_max)
        self.retry_backoff_ms = int(retry_backoff_ms)
        self.cooldown_on_429_403_ms = int(cooldown_on_429_403_ms) if cooldown_on_429_403_ms is not None else None
        self.max_consecutive_401 = int(max_consecutive_401) if max_consecutive_401 is not None else None
        self.pause_on_401_ms = int(pause_on_401_ms) if pause_on_401_ms is not None else None
        self.use_fetcher_controls = bool(use_fetcher_controls)
        self.logger = logger
        self.record_request = record_request
        self.observe_latency_ms = observe_latency_ms
        self.request_fn = request_fn
        self.consecutive_401 = 0

    def run_page(
        self,
        *,
        page: int,
        headers: dict,
        payload: dict,
        log_event: Optional[Callable[..., None]] = None,
    ) -> Tuple[int | None, str | None, dict | None]:
        """Execute request for one page, with retries/backoff and optional cooldown.

        Returns a tuple: (status, x_tt_agw_login, data)
        """
        status: int | None = None
        agw_login: str | None = None
        data: dict | None = None

        # If unified controls are enabled, delegate fully to AuthorFetcher once
        if self.use_fetcher_controls and AuthorFetcher is not None:
            try:
                # domain-level limiter
                try:
                    if self.limiter is not None and hasattr(self.limiter, "acquire"):
                        self.limiter.acquire()
                except Exception:
                    pass
                t0 = time.time()
                fetcher = AuthorFetcher()
                status, agw_login, data = fetcher._request_once_with_controls(
                    headers=headers,
                    payload=payload,
                    retry_max=self.retry_max,
                    retry_backoff_ms=self.retry_backoff_ms,
                    cooldown_on_429_403_ms=self.cooldown_on_429_403_ms,
                    max_consecutive_401=self.max_consecutive_401,
                    pause_on_401_ms=self.pause_on_401_ms,
                    logger=self.logger,
                )
                try:
                    if self.record_request:
                        self.record_request(status)
                    if self.observe_latency_ms:
                        self.observe_latency_ms((time.time() - t0) * 1000.0)
                except Exception:
                    pass
                return status, agw_login, data
            except Exception:
                # fallback to local request function once
                pass

        # local retry loop using provided request_fn
        attempt = 0
        while True:
            # domain-level limiter
            try:
                if self.limiter is not None and hasattr(self.limiter, "acquire"):
                    self.limiter.acquire()
            except Exception:
                pass
            t0 = time.time()
            if self.request_fn is None:
                raise RuntimeError("request_fn is required when not using AuthorFetcher controls")
            status, agw_login, data = self.request_fn(headers, payload)
            # metrics
            try:
                if self.record_request:
                    self.record_request(status)
                if self.observe_latency_ms:
                    self.observe_latency_ms((time.time() - t0) * 1000.0)
            except Exception:
                pass

            if status == 200:
                break

            # backoff on rate limit/server errors
            if status in (401, 429, 403) or (status is not None and status >= 500):
                # 401 threshold pause strategy
                if status == 401:
                    self.consecutive_401 += 1
                    try:
                        if self.logger and log_event:
                            log_event(
                                self.logger,
                                "warn",
                                "401_detected",
                                page=int(page),
                                attempt=int(attempt + 1),
                                consecutive_401=int(self.consecutive_401),
                                x_tt_agw_login=str(agw_login) if agw_login is not None else None,
                            )
                    except Exception:
                        pass
                    if (
                        self.max_consecutive_401
                        and self.pause_on_401_ms
                        and int(self.consecutive_401) >= int(self.max_consecutive_401)
                    ):
                        try:
                            pause_sec = int(self.pause_on_401_ms) / 1000.0
                            print(
                                f"[pause-401] page={page} 连续401达到阈值 {self.max_consecutive_401}，暂停 {pause_sec:.2f}s"
                            )
                            if self.logger and log_event:
                                try:
                                    log_event(
                                        self.logger,
                                        "warn",
                                        "401_pause",
                                        page=int(page),
                                        pause_ms=int(self.pause_on_401_ms),
                                        threshold=int(self.max_consecutive_401),
                                    )
                                except Exception:
                                    pass
                            time.sleep(pause_sec)
                        except Exception:
                            pass
                        finally:
                            self.consecutive_401 = 0

                if attempt >= int(self.retry_max):
                    print(f"[warn] page={page} status={status}，已达最大重试次数 {self.retry_max}，跳过该页")
                    break

                backoff = int(self.retry_backoff_ms) * (2**attempt)
                jitter = int(backoff * 0.2 * random.random())
                sleep_sec = (backoff + jitter) / 1000.0
                print(f"[retry] page={page} status={status}，退避 {sleep_sec:.2f}s 后重试 (attempt={attempt+1})")
                try:
                    if self.logger and log_event:
                        log_event(
                            self.logger,
                            "info",
                            "retry_backoff",
                            page=int(page),
                            status=int(status) if status is not None else None,
                            attempt=int(attempt + 1),
                            sleep_ms=int(backoff + jitter),
                        )
                except Exception:
                    pass
                time.sleep(sleep_sec)
                try:
                    if status in (429, 403) and self.cooldown_on_429_403_ms and int(self.cooldown_on_429_403_ms) > 0:
                        cool_sec = int(self.cooldown_on_429_403_ms) / 1000.0
                        print(f"[cooldown] page={page} status={status}，额外冷却 {cool_sec:.2f}s")
                        try:
                            if self.logger and log_event:
                                log_event(
                                    self.logger,
                                    "info",
                                    "cooldown",
                                    page=int(page),
                                    status=int(status),
                                    cooldown_ms=int(self.cooldown_on_429_403_ms),
                                )
                        except Exception:
                            pass
                        time.sleep(cool_sec)
                except Exception:
                    pass
                attempt += 1
                continue

            # unexpected status: stop processing this page
            print(f"[warn] 非预期状态码，page={page} status={status}，停止该页")
            try:
                if self.logger and log_event:
                    log_event(
                        self.logger,
                        "warn",
                        "stop_unexpected_status",
                        page=int(page),
                        status=int(status) if status is not None else None,
                    )
            except Exception:
                pass
            break

        return status, agw_login, data