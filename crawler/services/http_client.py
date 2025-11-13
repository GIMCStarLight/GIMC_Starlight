import json
from typing import Tuple, Optional

import requests


def create_session() -> requests.Session:
    return requests.Session()


def post_json(
    url: str,
    *,
    headers: dict,
    payload: dict,
    timeout: int = 20,
    session: Optional[requests.Session] = None,
) -> Tuple[int, Optional[str], dict]:
    """POST JSON 并返回 (status, x-tt-agw-login, data)。

    - 自动解析 JSON；失败时返回 {"raw": text}
    - 支持可选的 `requests.Session` 以复用连接
    """
    if session is not None:
        resp = session.post(url, headers=headers, json=payload, timeout=timeout)
    else:
        resp = requests.post(url, headers=headers, json=payload, timeout=timeout)
    status = resp.status_code
    agw_login = resp.headers.get("x-tt-agw-login")
    try:
        data = resp.json()
    except Exception:
        data = {"raw": resp.text}
    return status, agw_login, data