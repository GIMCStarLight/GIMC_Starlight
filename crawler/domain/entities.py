from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


@dataclass
class FollowerRange:
    ge: int | None = None
    lt: int | None = None


@dataclass
class Job:
    first_label: str
    first_id: Any
    mode: str
    follower_ge: int | None
    follower_lt: int | None
    limit: int
    max_pages: int
    sleep_ms: int
    retry_max: int
    retry_backoff_ms: int
    sort_field: str
    sort_type: int
    # optional second-level fields
    second_ids: list[Any] | None = None
    second_id: Any | None = None
    second_label: str | None = None

    def to_dict(self) -> dict:
        d = {
            "first_label": self.first_label,
            "first_id": self.first_id,
            "mode": self.mode,
            "follower_ge": self.follower_ge,
            "follower_lt": self.follower_lt,
            "limit": self.limit,
            "max_pages": self.max_pages,
            "sleep_ms": self.sleep_ms,
            "retry_max": self.retry_max,
            "retry_backoff_ms": self.retry_backoff_ms,
            "sort_field": self.sort_field,
            "sort_type": self.sort_type,
        }
        if self.second_ids is not None:
            d["second_ids"] = self.second_ids
        if self.second_id is not None:
            d["second_id"] = self.second_id
        if self.second_label is not None:
            d["second_label"] = self.second_label
        return d


@dataclass
class Plan:
    mode: str
    jobs: list[Job] = field(default_factory=list)
    generated_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def to_dict(self) -> dict:
        return {
            "generated_at": self.generated_at,
            "mode": self.mode,
            "jobs": [j.to_dict() for j in self.jobs],
        }