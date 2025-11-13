import json
import logging
import os
from datetime import datetime, timezone


def _ensure_dir(path: str):
    try:
        os.makedirs(path, exist_ok=True)
    except Exception:
        pass


class JsonLineFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        base = {
            "ts": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        extra_fields = getattr(record, "extra_fields", None)
        if isinstance(extra_fields, dict):
            try:
                base.update({k: _safe_value(v) for k, v in extra_fields.items()})
            except Exception:
                pass
        try:
            return json.dumps(base, ensure_ascii=False)
        except Exception:
            # 回退为原始字符串
            return f"{record.asctime if hasattr(record, 'asctime') else ''} {record.levelname} {record.name} {record.getMessage()}"


def _safe_value(v):
    try:
        json.dumps(v, ensure_ascii=False)
        return v
    except Exception:
        return str(v)


def get_json_logger(name: str, log_dir: str = None) -> logging.Logger:
    """返回按 JSON 行输出的 logger；同时写入文件与控制台。"""
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger
    logger.setLevel(logging.INFO)
    fmt = JsonLineFormatter()

    # 控制台
    sh = logging.StreamHandler()
    sh.setLevel(logging.INFO)
    sh.setFormatter(fmt)
    logger.addHandler(sh)

    # 文件
    if log_dir is None:
        log_dir = os.path.join(os.path.dirname(__file__), "logs")
    _ensure_dir(log_dir)
    try:
        fh = logging.FileHandler(os.path.join(log_dir, f"{name}.log"), encoding="utf-8")
        fh.setLevel(logging.INFO)
        fh.setFormatter(fmt)
        logger.addHandler(fh)
    except Exception:
        pass
    return logger


def log_event(logger: logging.Logger, level: str, event: str, **fields):
    payload = {"event": event}
    payload.update(fields or {})
    extra = {"extra_fields": payload}
    level = (level or "info").lower()
    if level == "debug":
        logger.debug(event, extra=extra)
    elif level == "warning":
        logger.warning(event, extra=extra)
    elif level == "error":
        logger.error(event, extra=extra)
    else:
        logger.info(event, extra=extra)