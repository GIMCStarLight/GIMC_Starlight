import os
from pathlib import Path

try:
    # Pydantic v2 style
    from pydantic_settings import BaseSettings, SettingsConfigDict  # type: ignore
    from pydantic import BaseModel

    class Settings(BaseSettings):
        # PostgreSQL
        pg_host: str | None = None
        pg_port: int | None = None
        pg_user: str | None = None
        pg_password: str | None = None
        pg_db: str | None = None

        # Rate limit
        domain_qps: int | None = None
        qps_window_ms: int = 1000
        concurrency: int | None = None
        time_window: str | None = None

        # Stability
        cooldown_429_403_ms: int = 2000
        max_failure_rate: float | None = None
        stop_when_empty_n: int | None = None
        max_consecutive_401: int = 3
        pause_on_401_ms: int = 60000

        # Runtime
        cookies_file: str | None = None
        star_id: str | None = None
        output_dir: str | None = None
        video_type: str | None = None
        min_price: int = 0
        search_type: int = 2
        sort_field: str | None = None
        sort_type: int | None = None
        province_id: int | None = None
        city_id: int | None = None
        province_name: str | None = None
        city_name: str | None = None
        extra_filters: str | list[str] | None = None
        save_pg: bool | None = None
        pg_config: str | None = None
        metrics_port: int | None = None
        auto_pages: bool | None = None
        auto_pages_upper_bound: int | None = None
        resume: bool | None = None
        skip_existing: bool | None = None
        rerun_failed: bool | None = None
        jobs_plan_out: str | None = None

        model_config = SettingsConfigDict(
            env_prefix="",
            case_sensitive=False,
            extra="ignore",
        )

        # Helpers for consumers needing nested dicts
        def postgres_dict(self) -> dict:
            return {
                "host": self.pg_host,
                "port": self.pg_port,
                "user": self.pg_user,
                "password": self.pg_password,
                "database": self.pg_db,
            }

        def rate_limit_dict(self) -> dict:
            return {
                "domain_qps": self.domain_qps,
                "qps_window_ms": self.qps_window_ms,
                "concurrency": self.concurrency,
                "time_window": self.time_window,
            }

        def stability_dict(self) -> dict:
            return {
                "cooldown_429_403_ms": self.cooldown_429_403_ms,
                "max_failure_rate": self.max_failure_rate,
                "stop_when_empty_n": self.stop_when_empty_n,
                "max_consecutive_401": self.max_consecutive_401,
                "pause_on_401_ms": self.pause_on_401_ms,
            }

        def extra_filters_parsed(self) -> list[str] | None:
            v = self.extra_filters
            if v is None:
                return None
            if isinstance(v, list):
                return [s for s in v if isinstance(s, str) and s.strip()]
            s = str(v).strip()
            if not s:
                return None
            return [x.strip() for x in s.split(",") if x.strip()]

        def runtime_dict(self) -> dict:
            return {
                "cookies_file": self.cookies_file,
                "star_id": self.star_id,
                "output_dir": self.output_dir,
                "video_type": self.video_type,
                "min_price": self.min_price,
                "search_type": self.search_type,
                "sort_field": self.sort_field,
                "sort_type": self.sort_type,
                "province_id": self.province_id,
                "city_id": self.city_id,
                "province_name": self.province_name,
                "city_name": self.city_name,
                "extra_filters": self.extra_filters_parsed(),
                "save_pg": self.save_pg,
                "pg_config": self.pg_config,
                "metrics_port": self.metrics_port,
                "auto_pages": self.auto_pages,
                "auto_pages_upper_bound": self.auto_pages_upper_bound,
                "resume": self.resume,
                "skip_existing": self.skip_existing,
                "rerun_failed": self.rerun_failed,
                "jobs_plan_out": self.jobs_plan_out,
            }

except Exception:
    try:
        # Pydantic v1 style
        from pydantic import BaseSettings  # type: ignore

        class Settings(BaseSettings):
            class Config:
                env_prefix = ""
                case_sensitive = False
                extra = "ignore"

            # PostgreSQL
            pg_host: str | None = None
            pg_port: int | None = None
            pg_user: str | None = None
            pg_password: str | None = None
            pg_db: str | None = None

            # Rate limit
            domain_qps: int | None = None
            qps_window_ms: int = 1000
            concurrency: int | None = None
            time_window: str | None = None

            # Stability
            cooldown_429_403_ms: int = 2000
            max_failure_rate: float | None = None
            stop_when_empty_n: int | None = None
            max_consecutive_401: int = 3
            pause_on_401_ms: int = 60000

            # Runtime
            cookies_file: str | None = None
            star_id: str | None = None
            output_dir: str | None = None
            video_type: str | None = None
            min_price: int = 0
            search_type: int = 2
            sort_field: str | None = None
            sort_type: int | None = None
            province_id: int | None = None
            city_id: int | None = None
            province_name: str | None = None
            city_name: str | None = None
            extra_filters: str | list[str] | None = None
            save_pg: bool | None = None
            pg_config: str | None = None
            metrics_port: int | None = None
            auto_pages: bool | None = None
            auto_pages_upper_bound: int | None = None
            resume: bool | None = None
            skip_existing: bool | None = None
            rerun_failed: bool | None = None
            jobs_plan_out: str | None = None

            def postgres_dict(self) -> dict:
                return {
                    "host": self.pg_host,
                    "port": self.pg_port,
                    "user": self.pg_user,
                    "password": self.pg_password,
                    "database": self.pg_db,
                }

            def rate_limit_dict(self) -> dict:
                return {
                    "domain_qps": self.domain_qps,
                    "qps_window_ms": self.qps_window_ms,
                    "concurrency": self.concurrency,
                    "time_window": self.time_window,
                }

            def stability_dict(self) -> dict:
                return {
                    "cooldown_429_403_ms": self.cooldown_429_403_ms,
                    "max_failure_rate": self.max_failure_rate,
                    "stop_when_empty_n": self.stop_when_empty_n,
                    "max_consecutive_401": self.max_consecutive_401,
                    "pause_on_401_ms": self.pause_on_401_ms,
                }

            def extra_filters_parsed(self) -> list[str] | None:
                v = self.extra_filters
                if v is None:
                    return None
                if isinstance(v, list):
                    return [s for s in v if isinstance(s, str) and s.strip()]
                s = str(v).strip()
                if not s:
                    return None
                return [x.strip() for x in s.split(",") if x.strip()]

            def runtime_dict(self) -> dict:
                return {
                    "cookies_file": self.cookies_file,
                    "star_id": self.star_id,
                    "output_dir": self.output_dir,
                    "video_type": self.video_type,
                    "min_price": self.min_price,
                    "search_type": self.search_type,
                    "sort_field": self.sort_field,
                    "sort_type": self.sort_type,
                    "province_id": self.province_id,
                    "city_id": self.city_id,
                    "province_name": self.province_name,
                    "city_name": self.city_name,
                    "extra_filters": self.extra_filters_parsed(),
                    "save_pg": self.save_pg,
                    "pg_config": self.pg_config,
                    "metrics_port": self.metrics_port,
                    "auto_pages": self.auto_pages,
                    "auto_pages_upper_bound": self.auto_pages_upper_bound,
                    "resume": self.resume,
                    "skip_existing": self.skip_existing,
                    "rerun_failed": self.rerun_failed,
                    "jobs_plan_out": self.jobs_plan_out,
                }

    except Exception:
        # Fallback: no pydantic installed, provide a minimal Settings reading from env
        def _getint(name: str, default: int | None = None) -> int | None:
            try:
                v = os.getenv(name)
                if v is None or v == "":
                    return default
                return int(float(v))
            except Exception:
                return default

        def _getfloat(name: str, default: float | None = None) -> float | None:
            try:
                v = os.getenv(name)
                if v is None or v == "":
                    return default
                return float(v)
            except Exception:
                return default

        def _getbool(name: str, default: bool | None = None) -> bool | None:
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

        def _getlist(name: str) -> list[str] | None:
            v = os.getenv(name)
            if v is None or str(v).strip() == "":
                return None
            try:
                return [s.strip() for s in str(v).split(",") if s.strip()]
            except Exception:
                return None

        class Settings:
            # Populate from env with typed conversions
            def postgres_dict(self) -> dict:
                return {
                    "host": os.getenv("PG_HOST"),
                    "port": _getint("PG_PORT"),
                    "user": os.getenv("PG_USER"),
                    "password": os.getenv("PG_PASSWORD"),
                    "database": os.getenv("PG_DB"),
                }

            def rate_limit_dict(self) -> dict:
                return {
                    "domain_qps": _getint("DOMAIN_QPS"),
                    "qps_window_ms": _getint("QPS_WINDOW_MS", 1000),
                    "concurrency": _getint("CONCURRENCY"),
                    "time_window": os.getenv("TIME_WINDOW"),
                }

            def stability_dict(self) -> dict:
                return {
                    "cooldown_429_403_ms": _getint("COOLDOWN_429_403_MS", 2000),
                    "max_failure_rate": _getfloat("MAX_FAILURE_RATE"),
                    "stop_when_empty_n": _getint("STOP_WHEN_EMPTY_N"),
                    "max_consecutive_401": _getint("MAX_CONSECUTIVE_401", 3),
                    "pause_on_401_ms": _getint("PAUSE_ON_401_MS", 60000),
                }

            def runtime_dict(self) -> dict:
                return {
                    "cookies_file": os.getenv("COOKIES_FILE"),
                    "star_id": os.getenv("STAR_ID"),
                    "output_dir": os.getenv("OUTPUT_DIR"),
                    "video_type": os.getenv("VIDEO_TYPE"),
                    "min_price": _getint("MIN_PRICE", 0),
                    "search_type": _getint("SEARCH_TYPE", 2),
                    "sort_field": os.getenv("SORT_FIELD"),
                    "sort_type": _getint("SORT_TYPE"),
                    "province_id": _getint("PROVINCE_ID"),
                    "city_id": _getint("CITY_ID"),
                    "province_name": os.getenv("PROVINCE_NAME"),
                    "city_name": os.getenv("CITY_NAME"),
                    "extra_filters": _getlist("EXTRA_FILTERS"),
                    "save_pg": _getbool("SAVE_PG"),
                    "pg_config": os.getenv("PG_CONFIG"),
                    "metrics_port": _getint("METRICS_PORT"),
                    "auto_pages": _getbool("AUTO_PAGES"),
                    "auto_pages_upper_bound": _getint("AUTO_PAGES_UPPER_BOUND"),
                    "resume": _getbool("RESUME"),
                    "skip_existing": _getbool("SKIP_EXISTING"),
                    "rerun_failed": _getbool("RERUN_FAILED"),
                    "jobs_plan_out": os.getenv("JOBS_PLAN_OUT"),
                }