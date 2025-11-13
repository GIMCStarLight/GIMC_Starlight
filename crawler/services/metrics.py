from __future__ import annotations

_PROM_READY = False
_start_http_server = None
_Counter = None
_Histogram = None

try:
    from prometheus_client import Counter, Histogram, start_http_server

    _PROM_READY = True
    _start_http_server = start_http_server
    _Counter = Counter
    _Histogram = Histogram
except Exception:
    _PROM_READY = False


REQUEST_TOTAL = None
ERRORS_TOTAL = None
LATENCY_SEC = None


def init_metrics_server(port: int) -> bool:
    """启动指标HTTP服务；若未安装prometheus_client则安全跳过。"""
    global REQUEST_TOTAL, ERRORS_TOTAL, LATENCY_SEC
    if not _PROM_READY:
        return False
    try:
        if REQUEST_TOTAL is None:
            REQUEST_TOTAL = _Counter("request_total", "Total HTTP requests", ["status"])  # status as string
        if ERRORS_TOTAL is None:
            ERRORS_TOTAL = _Counter("errors_total", "Total error responses", ["code"])  # code as string
        if LATENCY_SEC is None:
            LATENCY_SEC = _Histogram("http_request_latency_seconds", "HTTP request latency in seconds")
        _start_http_server(int(port))
        return True
    except Exception:
        return False


def record_request(status: int):
    if REQUEST_TOTAL is None:
        return
    try:
        REQUEST_TOTAL.labels(status=str(int(status) if status is not None else "none")).inc()
        if status is not None and int(status) >= 400:
            ERRORS_TOTAL.labels(code=str(int(status))).inc()
    except Exception:
        pass


def observe_latency_ms(ms: int | float):
    if LATENCY_SEC is None:
        return
    try:
        LATENCY_SEC.observe(float(ms) / 1000.0)
    except Exception:
        pass