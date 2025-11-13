import os
from pathlib import Path
from typing import Dict, Any, Optional

# Centralized typed settings (legacy)
try:
    from .settings import Settings  # type: ignore
except Exception:
    Settings = None  # type: ignore

# New configuration system
try:
    from .loader import get_config_loader, load_config, PydanticAppConfig
    _NEW_CONFIG_AVAILABLE = True
except Exception:
    _NEW_CONFIG_AVAILABLE = False


def _try_load_dotenv():
    """Attempt to load environment variables from .env files.

    Priority:
    1) task_control/config/.env
    2) project root .env
    3) default dotenv search path
    """
    try:
        from dotenv import load_dotenv  # type: ignore
    except Exception:
        return None

    here = Path(__file__).resolve().parent
    env1 = here / ".env"
    if env1.exists():
        load_dotenv(env1)
        return str(env1)

    # project root: two levels up from config.py
    root_env = here.parent.parent / ".env"
    if root_env.exists():
        load_dotenv(root_env)
        return str(root_env)

    # fallback to default locations
    load_dotenv()
    return None


def load_env():
    """Load environment variables, returning the loaded path or None."""
    try:
        return _try_load_dotenv()
    except Exception:
        return None


# Module-level singleton for Settings (legacy)
_SETTINGS_CACHE = None

# New configuration cache
_NEW_CONFIG_CACHE = None


def get_new_config(json_override_file: Optional[str] = None) -> Optional[PydanticAppConfig]:
    """Get configuration using the new configuration system."""
    global _NEW_CONFIG_CACHE
    if not _NEW_CONFIG_AVAILABLE:
        return None
    
    # For now, we don't cache when using JSON overrides to ensure fresh data
    if json_override_file or _NEW_CONFIG_CACHE is None:
        try:
            _NEW_CONFIG_CACHE = load_config(json_override_file, use_pydantic=True)
        except Exception:
            return None
    
    return _NEW_CONFIG_CACHE


def get_settings():
    """Return a cached Settings instance. Ensures .env is loaded first."""
    global _SETTINGS_CACHE
    if _SETTINGS_CACHE is not None:
        return _SETTINGS_CACHE
    # Best-effort: load .env files first
    try:
        load_env()
    except Exception:
        pass
    try:
        if Settings is not None:
            _SETTINGS_CACHE = Settings()
            return _SETTINGS_CACHE
    except Exception:
        # fall back to env-only behavior if instantiation fails
        pass
    # If Settings could not be constructed, degrade gracefully by exposing None
    _SETTINGS_CACHE = None
    return _SETTINGS_CACHE


def getint(name: str, default: int | None = None) -> int | None:
    try:
        v = os.getenv(name)
        if v is None or v == "":
            return default
        # allow floats in env but cast down to int
        return int(float(v))
    except Exception:
        return default


def getfloat(name: str, default: float | None = None) -> float | None:
    try:
        v = os.getenv(name)
        if v is None or v == "":
            return default
        return float(v)
    except Exception:
        return default


def getbool(name: str, default: bool | None = None) -> bool | None:
    try:
        v = os.getenv(name)
        if v is None or str(v).strip() == "":
            return default
        s = str(v).strip().lower()
        if s in ("1", "true", "yes", "on", "y", "t"):
            return True
        if s in ("0", "false", "no", "off", "n", "f"):
            return False
        return bool(int(float(v)))
    except Exception:
        return default


def getlist(name: str) -> list[str] | None:
    v = os.getenv(name)
    if v is None or str(v).strip() == "":
        return None
    try:
        return [s.strip() for s in str(v).split(",") if s.strip()]
    except Exception:
        return None


def get_config(json_override_file: Optional[str] = None) -> dict:
    """Return unified configuration dict with enhanced loading priority.
    
    Loading order: Environment Variables > JSON Override > Default Values
    
    Args:
        json_override_file: Optional JSON file to override default values
        
    Returns:
        Configuration dictionary
    """
    # Try new configuration system first
    new_config = get_new_config(json_override_file)
    if new_config is not None:
        try:
            return {
                "postgres": new_config.database.model_dump(),
                "rate_limit": new_config.rate_limit.model_dump(),
                "stability": new_config.stability.model_dump(),
                "runtime": {
                    **new_config.crawler.model_dump(),
                    **new_config.task.model_dump(),
                },
            }
        except Exception:
            # Fall through to legacy system
            pass
    
    # Legacy configuration system
    st = get_settings()
    if st is not None:
        try:
            return {
                "postgres": st.postgres_dict(),
                "rate_limit": st.rate_limit_dict(),
                "stability": st.stability_dict(),
                "runtime": st.runtime_dict(),
            }
        except Exception:
            # fall through to legacy env readers
            pass
    # Legacy env-based composition
    return {
        "postgres": {
            "host": os.getenv("PG_HOST"),
            "port": getint("PG_PORT"),
            "user": os.getenv("PG_USER"),
            "password": os.getenv("PG_PASSWORD"),
            "database": os.getenv("PG_DB"),
        },
        "rate_limit": {
            "domain_qps": getint("DOMAIN_QPS"),
            "qps_window_ms": getint("QPS_WINDOW_MS", 1000),
            "concurrency": getint("CONCURRENCY"),
            "time_window": os.getenv("TIME_WINDOW"),
        },
        "stability": {
            "cooldown_429_403_ms": getint("COOLDOWN_429_403_MS", 2000),
            "max_failure_rate": getfloat("MAX_FAILURE_RATE"),
            "stop_when_empty_n": getint("STOP_WHEN_EMPTY_N"),
            "max_consecutive_401": getint("MAX_CONSECUTIVE_401", 3),
            "pause_on_401_ms": getint("PAUSE_ON_401_MS", 60000),
        },
        "runtime": {
            "cookies_file": os.getenv("COOKIES_FILE"),
            "star_id": os.getenv("STAR_ID"),
            "output_dir": os.getenv("OUTPUT_DIR"),
            "video_type": os.getenv("VIDEO_TYPE"),
            "min_price": getint("MIN_PRICE", 0),
            "search_type": getint("SEARCH_TYPE", 2),
            "sort_field": os.getenv("SORT_FIELD"),
            "sort_type": getint("SORT_TYPE"),
            "province_id": getint("PROVINCE_ID"),
            "city_id": getint("CITY_ID"),
            "province_name": os.getenv("PROVINCE_NAME"),
            "city_name": os.getenv("CITY_NAME"),
            "extra_filters": getlist("EXTRA_FILTERS"),
            "save_pg": getbool("SAVE_PG"),
            "pg_config": os.getenv("PG_CONFIG"),
            "metrics_port": getint("METRICS_PORT"),
            "auto_pages": getbool("AUTO_PAGES"),
            "auto_pages_upper_bound": getint("AUTO_PAGES_UPPER_BOUND"),
            "resume": getbool("RESUME"),
            "skip_existing": getbool("SKIP_EXISTING"),
            "rerun_failed": getbool("RERUN_FAILED"),
            "jobs_plan_out": os.getenv("JOBS_PLAN_OUT"),
        },
    }


def apply_argparse_defaults(parser, json_override_file: Optional[str] = None) -> dict:
    """Apply defaults to argparse parser from unified configuration.

    Args:
        parser: argparse parser instance
        json_override_file: Optional JSON file to override default values

    Returns a dict of values applied as defaults.
    """
    cfg = get_config(json_override_file)
    st = cfg.get("stability", {})
    rl = cfg.get("rate_limit", {})
    rt = cfg.get("runtime", {})

    defaults: dict = {}
    if rl.get("domain_qps") is not None:
        defaults["domain_qps"] = rl["domain_qps"]
    if rl.get("qps_window_ms") is not None:
        defaults["qps_window_ms"] = rl["qps_window_ms"]
    if rl.get("concurrency") is not None:
        defaults["concurrency"] = rl["concurrency"]
    if rl.get("time_window"):
        defaults["time_window"] = rl["time_window"]

    if st.get("cooldown_429_403_ms") is not None:
        defaults["cooldown_429_403_ms"] = st["cooldown_429_403_ms"]
    if st.get("max_failure_rate") is not None:
        defaults["max_failure_rate"] = st["max_failure_rate"]
    if st.get("stop_when_empty_n") is not None:
        defaults["stop_when_empty_n"] = st["stop_when_empty_n"]
    if st.get("max_consecutive_401") is not None:
        defaults["max_consecutive_401"] = st["max_consecutive_401"]
    if st.get("pause_on_401_ms") is not None:
        defaults["pause_on_401_ms"] = st["pause_on_401_ms"]

    # runtime related CLI defaults
    if rt.get("cookies_file"):
        defaults["cookies_file"] = rt["cookies_file"]
    if rt.get("star_id"):
        defaults["star_id"] = rt["star_id"]
    if rt.get("output_dir"):
        defaults["output_dir"] = rt["output_dir"]
    if rt.get("video_type"):
        defaults["video_type"] = rt["video_type"]
    if rt.get("min_price") is not None:
        defaults["min_price"] = rt["min_price"]
    if rt.get("search_type") is not None:
        defaults["search_type"] = rt["search_type"]
    if rt.get("sort_field"):
        defaults["sort_field"] = rt["sort_field"]
    if rt.get("sort_type") is not None:
        defaults["sort_type"] = rt["sort_type"]
    if rt.get("province_id") is not None:
        defaults["province_id"] = rt["province_id"]
    if rt.get("city_id") is not None:
        defaults["city_id"] = rt["city_id"]
    if rt.get("province_name"):
        defaults["province_name"] = rt["province_name"]
    if rt.get("city_name"):
        defaults["city_name"] = rt["city_name"]
    if rt.get("extra_filters"):
        defaults["extra_filter"] = rt["extra_filters"]
    if rt.get("save_pg") is not None:
        defaults["save_pg"] = rt["save_pg"]
    if rt.get("pg_config"):
        defaults["pg_config"] = rt["pg_config"]
    if rt.get("metrics_port") is not None:
        defaults["metrics_port"] = rt["metrics_port"]
    if rt.get("auto_pages") is not None:
        defaults["auto_pages"] = rt["auto_pages"]
    if rt.get("auto_pages_upper_bound") is not None:
        defaults["auto_pages_upper_bound"] = rt["auto_pages_upper_bound"]
    if rt.get("resume") is not None:
        defaults["resume"] = rt["resume"]
    if rt.get("skip_existing") is not None:
        defaults["skip_existing"] = rt["skip_existing"]
    if rt.get("rerun_failed") is not None:
        defaults["rerun_failed"] = rt["rerun_failed"]
    if rt.get("jobs_plan_out"):
        defaults["jobs_plan_out"] = rt["jobs_plan_out"]

    if defaults:
        try:
            parser.set_defaults(**defaults)
        except Exception:
            # best-effort
            pass
    return defaults
