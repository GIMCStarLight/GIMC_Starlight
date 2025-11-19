#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
增强版 AutoCookieFetcher（改进的反指纹与行为模拟）

主要改动点：
- 基于 profile 的 seed 保持每个持久化 profile 的指纹扰动可复现
- 移除不安全的 Date.prototype 覆盖
- Canvas 噪声改为基于 profile seed 的小幅可复现扰动
- 更稳妥地设置 navigator.* 属性（使用 defineProperty，不删除原型）
- 随机化并保持 profile 内一致的 UA、viewport、hardwareConcurrency 等
- 更自然的鼠标轨迹与打字模拟（包含退格等随机行为）
- 对注入脚本均使用 try/catch 包装以避免抛错导致页面异常

注意：在部署前请自行测试并根据目标平台调整 UA 池、视窗、WebGL 映射等。
"""

import argparse
import json
import os
import random
import sys
import time
import functools
import logging
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any

# --- External deps ---
try:
    from playwright.sync_api import (
        sync_playwright,
        Page,
        Browser,
        TimeoutError as PlaywrightTimeout,
        Error as PlaywrightError,
    )
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    PLAYWRIGHT_AVAILABLE = False
    print("[错误] 未安装 Playwright，请运行: pip install playwright && playwright install chromium")
    sys.exit(1)

try:
    from cryptography.fernet import Fernet
    CRYPTO_AVAILABLE = True
except ImportError:
    CRYPTO_AVAILABLE = False
    print("[警告] 未安装 cryptography，Cookie将不加密保存")
    print("       安装命令: pip install cryptography")

try:
    import keyring
    KEYRING_AVAILABLE = True
except Exception:
    KEYRING_AVAILABLE = False

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False

# --- Constants & Paths ---
LOGIN_URL = "https://agent.oceanengine.com/login"
TARGET_URL = "https://agent.oceanengine.com/admin/star-agent/vue2/market"

COOKIE_CONFIG_DIR = "config/auto_cookie_fetcher_config"
COOKIE_OUTPUT_PATH = f"{COOKIE_CONFIG_DIR}/cookies.txt"
COOKIE_JSON_PATH = f"{COOKIE_CONFIG_DIR}/cookies.json"
STORAGE_STATE_PATH = f"{COOKIE_CONFIG_DIR}/storage_state.json"
ENCRYPTED_STATE_PATH = f"{COOKIE_CONFIG_DIR}/storage_state.enc"
ENCRYPTION_KEY_PATH = f"{COOKIE_CONFIG_DIR}/.cookie_key"
COOKIE_META_PATH = f"{COOKIE_CONFIG_DIR}/cookie_meta.json"
USER_DATA_DIR = f"{COOKIE_CONFIG_DIR}/browser_profile"
DEFAULT_WEBHOOK = os.environ.get("COOKIE_FETCHER_WEBHOOK", "")

# --- 人类行为模拟参数 ---
HUMAN_TYPING_DELAY = (80, 200)
HUMAN_CLICK_DELAY = (150, 500)
HUMAN_SCROLL_DELAY = (500, 1500)
PAGE_READ_TIME = (2000, 5000)
RETRY_STATUS_CODES = [429, 500, 502, 503, 504]

CRITICAL_SECURITY_KEYWORDS = [
    "滑块", "slider", "slide",
    "短信验证", "sms", "手机验证码", "动态码",
    "扫码", "qr", "二维码",
    "two-factor", "2fa", "双重验证",
    "人机验证", "人脸识别", "face",
]

NORMAL_KEYWORDS = [
    "验证码", "captcha", "verify", "安全验证",
]

# --- Logging setup ---
LOG_FORMAT = "%(asctime)s %(levelname)s %(name)s %(message)s"
logging.basicConfig(level=logging.INFO, format=LOG_FORMAT)
logger = logging.getLogger("auto_cookie_fetcher")


# --- Utilities ---
def retry(times: int = 3, initial_delay: float = 1.0, backoff: float = 2.0, jitter: float = 0.5):
    """通用重试装饰器：指数退避 + 抖动"""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            last_exc = None
            for attempt in range(1, times + 1):
                try:
                    logger.debug("Attempt %d for %s", attempt, func.__name__)
                    return func(*args, **kwargs)
                except Exception as e:
                    last_exc = e
                    if attempt == times:
                        logger.exception("Function %s failed after %d attempts", func.__name__, times)
                        raise
                    sleep_for = initial_delay * (backoff ** (attempt - 1)) + random.uniform(0, jitter)
                    logger.warning(
                        "Function %s failed on attempt %d: %s. Retrying after %.2fs",
                        func.__name__, attempt, str(e)[:150], sleep_for
                    )
                    time.sleep(sleep_for)
            raise last_exc
        return wrapper
    return decorator


def human_delay(min_ms: int, max_ms: int, rnd: Optional[random.Random] = None) -> float:
    if rnd is None:
        rnd = random
    delay_ms = rnd.randint(min_ms, max_ms)
    return delay_ms / 1000.0


def random_scroll(page: Page, rnd: Optional[random.Random] = None):
    if rnd is None:
        rnd = random
    try:
        page_height = page.evaluate("() => document.documentElement.scrollHeight")
        viewport_height = page.viewport_size["height"]
        scroll_times = rnd.randint(1, 3)
        for _ in range(scroll_times):
            scroll_to = rnd.randint(0, max(0, page_height - viewport_height))
            page.evaluate(f"window.scrollTo({{top: {scroll_to}, behavior: 'smooth'}})")
            time.sleep(human_delay(*HUMAN_SCROLL_DELAY, rnd=rnd))
        logger.debug("随机滚动完成（%d次）", scroll_times)
    except Exception as e:
        logger.debug("random_scroll failed: %s", e)


def page_reading_time(page: Page, base_time_ms: tuple = PAGE_READ_TIME):
    try:
        element_count = page.evaluate("() => document.querySelectorAll('*').length")
        base_delay = random.randint(*base_time_ms) / 1000.0
        complexity_factor = min(element_count / 1000, 2.0)
        total_delay = base_delay * (1 + complexity_factor * 0.3)
        logger.debug("页面停留时间: %.2fs (元素数: %d)", total_delay, element_count)
        return total_delay
    except Exception:
        return random.randint(*base_time_ms) / 1000.0


def save_debug(page: Optional[Page], name_prefix: str = "debug"):
    ts = datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    try:
        os.makedirs("debug", exist_ok=True)
    except Exception:
        pass
    if page:
        try:
            png_path = f"debug/{name_prefix}_{ts}.png"
            html_path = f"debug/{name_prefix}_{ts}.html"
            page.screenshot(path=png_path, full_page=True)
            with open(html_path, "w", encoding="utf-8") as f:
                f.write(page.content())
            logger.info("Saved debug artifacts: %s, %s", png_path, html_path)
            return png_path, html_path
        except Exception as e:
            logger.warning("save_debug failed: %s", e)
            return None, None
    else:
        logger.debug("No page provided for save_debug")
        return None, None


def notify_human(message: str, screenshot_path: Optional[str] = None, webhook_url: Optional[str] = None):
    webhook = webhook_url or DEFAULT_WEBHOOK
    if not webhook:
        logger.info("notify_human: no webhook configured. Message: %s", message)
        return False
    if not REQUESTS_AVAILABLE:
        logger.warning("notify_human: requests not available; cannot send webhook")
        return False
    try:
        data = {"text": message}
        files = {}
        if screenshot_path and os.path.exists(screenshot_path):
            files = {"file": open(screenshot_path, "rb")}
        resp = requests.post(webhook, data=data, files=files, timeout=10)
        logger.info("notify_human status: %s", resp.status_code)
        return resp.ok
    except Exception as e:
        logger.warning("notify_human failed: %s", e)
        return False


# --- Encryption helper ---
class CookieEncryption:
    @staticmethod
    def get_or_create_key(key_path: str) -> bytes:
        if os.path.exists(key_path):
            with open(key_path, "rb") as f:
                return f.read()
        key = Fernet.generate_key()
        os.makedirs(os.path.dirname(key_path) or ".", exist_ok=True)
        with open(key_path, "wb") as f:
            f.write(key)
        os.chmod(key_path, 0o600)
        return key

    @staticmethod
    def encrypt_data(data: str, key_path: str) -> bytes:
        if not CRYPTO_AVAILABLE:
            return data.encode("utf-8")
        key = CookieEncryption.get_or_create_key(key_path)
        f = Fernet(key)
        return f.encrypt(data.encode("utf-8"))

    @staticmethod
    def decrypt_data(encrypted_data: bytes, key_path: str) -> str:
        if not CRYPTO_AVAILABLE:
            return encrypted_data.decode("utf-8")
        key = CookieEncryption.get_or_create_key(key_path)
        f = Fernet(key)
        return f.decrypt(encrypted_data).decode("utf-8")


# --- Profile 参数池 ---
USER_AGENTS = [
    # 需要可自行扩充/更新
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
]
VIEWPORTS = [(1366, 768), (1440, 900), (1536, 864), (1920, 1080)]
DEVICE_SCALE_OPTIONS = [1, 1.25, 1.5, 2]
HARDWARE_CONCURRENCY_OPTIONS = [2, 4, 6, 8]


def pick_profile_params(seed: int) -> Dict[str, Any]:
    rnd = random.Random(seed)
    ua = rnd.choice(USER_AGENTS)
    w, h = rnd.choice(VIEWPORTS)
    device_scale = rnd.choice(DEVICE_SCALE_OPTIONS)
    hc = rnd.choice(HARDWARE_CONCURRENCY_OPTIONS)
    platform = "MacIntel" if "Macintosh" in ua else "Win32"
    return {
        "user_agent": ua,
        "viewport": {"width": w, "height": h},
        "device_scale_factor": device_scale,
        "hardware_concurrency": hc,
        "platform": platform,
        "locale": "zh-CN",
        "timezone_id": "Asia/Shanghai",
        "geolocation": {"latitude": 39.9042, "longitude": 116.4074},
    }


# --- Main class ---
class AutoCookieFetcher:
    def __init__(self, headless: bool = False, timeout: int = 30000, webhook: str = "",
                 use_persistent: bool = True, proxy: Optional[str] = None):
        self.headless = headless
        self.timeout = timeout
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self.cookie_txt_path = COOKIE_OUTPUT_PATH
        self.cookie_json_path = COOKIE_JSON_PATH
        self.storage_state_path = STORAGE_STATE_PATH
        self.encrypted_state_path = ENCRYPTED_STATE_PATH
        self.encryption_key_path = ENCRYPTION_KEY_PATH
        self.cookie_meta_path = COOKIE_META_PATH
        self.webhook = webhook or DEFAULT_WEBHOOK
        self.use_persistent = use_persistent
        self.user_data_dir = USER_DATA_DIR if use_persistent else None
        self.proxy = proxy
        self.profile_seed: Optional[int] = None

    def _ensure_profile_seed(self) -> int:
        """在 user_data_dir 下生成/读取 .profile_seed，使同一 profile 内指纹扰动可复现"""
        if not self.user_data_dir:
            return secrets.randbelow(2**31)
        os.makedirs(self.user_data_dir, exist_ok=True)
        seed_file = os.path.join(self.user_data_dir, ".profile_seed")
        try:
            if os.path.exists(seed_file):
                with open(seed_file, "r", encoding="utf-8") as f:
                    s = f.read().strip()
                    if s:
                        self.profile_seed = int(s)
                        return self.profile_seed
            s = str(secrets.randbelow(2**31))
            with open(seed_file, "w", encoding="utf-8") as f:
                f.write(s)
            os.chmod(seed_file, 0o600)
            self.profile_seed = int(s)
            return self.profile_seed
        except Exception as e:
            logger.warning("无法读取/写入 profile_seed: %s", e)
            self.profile_seed = secrets.randbelow(2**31)
            return self.profile_seed

    # --------- 风控页面检测 ---------
    def detect_security_challenge(self, page: Page) -> tuple[bool, str]:
        try:
            critical_selectors = [
                "iframe[src*='captcha']",
                "canvas[class*='captcha']",
                "div[id*='slider']",
                "div[class*='slider'][class*='captcha']",
                "div[class*='sms'][class*='verify']",
                "input[placeholder*='短信']",
                "input[placeholder*='验证码'][type='text']:visible",
            ]
            for selector in critical_selectors:
                try:
                    elements = page.locator(selector)
                    if elements.count() > 0 and elements.first.is_visible():
                        logger.warning("检测到可见的验证码元素: %s", selector)
                        return True, f"检测到验证码元素: {selector}"
                except Exception:
                    continue

            content = ""
            try:
                content = page.evaluate("() => document.body.innerText").lower()
            except Exception:
                pass

            if content:
                for keyword in CRITICAL_SECURITY_KEYWORDS:
                    if keyword.lower() in content:
                        try:
                            keyword_elements = page.locator(f"text={keyword}")
                            if keyword_elements.count() > 0 and keyword_elements.first.is_visible():
                                logger.warning("检测到需要人工干预的验证关键词（可见）: %s", keyword)
                                return True, f"检测到需要人工干预的验证: {keyword}"
                        except Exception:
                            pass

            for keyword in NORMAL_KEYWORDS:
                if keyword.lower() in content:
                    logger.debug("检测到普通验证提示（不阻止登录）: %s", keyword)
                    break

            return False, ""
        except Exception as e:
            logger.warning("detect_security_challenge exception: %s", e)
            return False, ""

    # --------- 登录成功检测 ---------
    def wait_for_login_success(self, page: Page, max_wait: int = 300) -> bool:
        logger.info("等待登录完成 (最多 %s 秒)...", max_wait)
        start = time.time()
        last_url = ""
        check_interval = 1.0
        checks = 0

        while time.time() - start < max_wait:
            try:
                current_url = page.url
                checks += 1
                if checks % 10 == 0:
                    elapsed = int(time.time() - start)
                    remaining = max_wait - elapsed
                    logger.info("等待中: 已等待 %s 秒, 剩余 %s 秒", elapsed, remaining)

                if current_url != last_url:
                    logger.debug("URL changed: %s", current_url)
                    last_url = current_url

                lower_url = current_url.lower()
                if "login" not in lower_url and "sso" not in lower_url:
                    if any(k in lower_url for k in ["star-agent", "market", "admin", "agent"]):
                        logger.info("检测到登录成功 (URL 跳转): %s", current_url)
                        return True

                user_selectors = [
                    "div[class*='user']",
                    "div[class*='avatar']",
                    "div[class*='header-user']",
                    ".account-center-header",
                    "[class*='UserInfo']",
                ]
                for sel in user_selectors:
                    try:
                        if page.locator(sel).count() > 0:
                            logger.info("检测到用户信息元素: %s", sel)
                            return True
                    except Exception:
                        continue

                try:
                    cookies = page.context.cookies()
                    auth_cookies = [
                        c for c in cookies
                        if any(k in c["name"].lower() for k in ["token", "session", "auth", "user", "passport"])
                    ]
                    logger.debug("所有 cookies: %s", [c["name"] for c in cookies])
                    logger.debug("认证 cookies: %s", [c["name"] for c in auth_cookies])
                    if len(auth_cookies) >= 2:
                        logger.info("检测到认证 Cookie (%d 个)，可能已登录", len(auth_cookies))
                        return True
                except Exception as e:
                    logger.debug("检查认证 cookie 失败: %s", e)

                try:
                    error_selectors = [
                        "div[class*='error']",
                        "div[class*='alert']",
                        "span[class*='error']",
                        ".account-center-message",
                    ]
                    for sel in error_selectors:
                        try:
                            if page.locator(sel).count() > 0:
                                txt = page.locator(sel).first.inner_text()
                                if txt:
                                    logger.warning("登录页检测到错误信息: %s", txt.strip())
                        except Exception:
                            continue
                except Exception:
                    pass
            except Exception as e:
                logger.warning("等待登录过程中发生异常: %s", e)

            time.sleep(check_interval)

        logger.error("登录等待超时 (%s 秒)", max_wait)
        return False

    # --------- Cookie / state 持久化 ---------
    def extract_cookies(self, page: Page) -> List[Dict]:
        try:
            cookies = page.context.cookies()
            logger.info("提取到 %d 个 Cookie", len(cookies))
            return cookies
        except Exception as e:
            logger.error("extract_cookies failed: %s", e)
            return []

    def save_storage_state(self, storage_state: Dict, encrypt: bool = True) -> bool:
        try:
            os.makedirs(os.path.dirname(self.storage_state_path) or ".", exist_ok=True)
            with open(self.storage_state_path, "w", encoding="utf-8") as f:
                json.dump(storage_state, f, ensure_ascii=False, indent=2)
            logger.info("保存 storage_state: %s", self.storage_state_path)

            if encrypt and CRYPTO_AVAILABLE:
                state_json = json.dumps(storage_state, ensure_ascii=False)
                encrypted_data = CookieEncryption.encrypt_data(state_json, self.encryption_key_path)
                with open(self.encrypted_state_path, "wb") as f:
                    f.write(encrypted_data)
                os.chmod(self.encrypted_state_path, 0o600)
                logger.info("保存加密 storage_state: %s", self.encrypted_state_path)

            self.save_cookie_metadata(storage_state.get("cookies", []))
            return True
        except Exception as e:
            logger.exception("save_storage_state failed: %s", e)
            return False

    def save_cookie_metadata(self, cookies: List[Dict]):
        try:
            expires_timestamps = [
                cookie["expires"]
                for cookie in cookies
                if cookie.get("expires") and cookie["expires"] > 0
            ]
            if expires_timestamps:
                min_expires = min(expires_timestamps)
                expires_at = datetime.fromtimestamp(min_expires)
            else:
                expires_at = datetime.now() + timedelta(days=7)

            metadata = {
                "created_at": datetime.now().isoformat(),
                "expires_at": expires_at.isoformat(),
                "cookie_count": len(cookies),
                "url": TARGET_URL,
                "encrypted": CRYPTO_AVAILABLE,
            }
            os.makedirs(os.path.dirname(self.cookie_meta_path) or ".", exist_ok=True)
            with open(self.cookie_meta_path, "w", encoding="utf-8") as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2)
            logger.info("Cookie 元数据已保存, 预计有效至: %s", expires_at.isoformat())
        except Exception as e:
            logger.warning("save_cookie_metadata failed: %s", e)

    def save_cookies(self, cookies: List[Dict], txt_path: str, json_path: str) -> bool:
        if not cookies:
            logger.error("无 Cookie 可保存")
            return False
        try:
            os.makedirs(os.path.dirname(txt_path) or ".", exist_ok=True)
            os.makedirs(os.path.dirname(json_path) or ".", exist_ok=True)
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(
                    {"cookies": cookies, "timestamp": datetime.now().isoformat(), "url": TARGET_URL},
                    f, ensure_ascii=False, indent=2
                )
            logger.info("Cookie JSON 保存: %s", json_path)

            cookie_str_parts = []
            for cookie in cookies:
                name = cookie.get("name", "")
                value = cookie.get("value", "")
                if name and value:
                    cookie_str_parts.append(f"{name}={value}")
            cookie_str = "; ".join(cookie_str_parts)
            with open(txt_path, "w", encoding="utf-8") as f:
                f.write(cookie_str)
            logger.info("Cookie 文本保存: %s", txt_path)
            return True
        except Exception as e:
            logger.exception("save_cookies failed: %s", e)
            return False

    def load_storage_state(self) -> Optional[Dict]:
        try:
            if os.path.exists(self.encrypted_state_path) and CRYPTO_AVAILABLE:
                with open(self.encrypted_state_path, "rb") as f:
                    enc = f.read()
                state_json = CookieEncryption.decrypt_data(enc, self.encryption_key_path)
                return json.loads(state_json)
            if os.path.exists(self.storage_state_path):
                with open(self.storage_state_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            return None
        except Exception as e:
            logger.exception("load_storage_state failed: %s", e)
            return None

    # --------- 行为模拟：鼠标/键盘 ---------
    def _human_move(self, page: Page, start: tuple, end: tuple, steps: int = 25, seed: Optional[int] = None):
        rnd = random.Random(seed) if seed is not None else random
        x0, y0 = start
        x1, y1 = end
        for i in range(1, steps + 1):
            t = i / steps
            cx = x0 + (x1 - x0) * 0.5 + rnd.uniform(-3, 3)
            cy = y0 + (y1 - y0) * 0.2 + rnd.uniform(-3, 3)
            xt = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t ** 2 * x1
            yt = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t ** 2 * y1
            try:
                page.mouse.move(xt, yt, steps=1)
            except Exception:
                try:
                    page.mouse.move(int(xt), int(yt))
                except Exception:
                    pass
            time.sleep(rnd.uniform(0.008, 0.03))

    def _human_type(self, page: Page, text: str, seed: Optional[int] = None):
        rnd = random.Random(seed) if seed is not None else random
        for ch in text:
            if rnd.random() < 0.03:
                time.sleep(rnd.uniform(0.3, 0.8))
            delay = rnd.randint(*HUMAN_TYPING_DELAY)
            try:
                page.keyboard.insert_text(ch)
            except Exception:
                try:
                    page.keyboard.type(ch, delay=delay)
                except Exception:
                    try:
                        page.keyboard.press(ch)
                    except Exception:
                        pass
            if rnd.random() < 0.01:
                time.sleep(rnd.uniform(0.05, 0.2))
                try:
                    page.keyboard.press("Backspace")
                except Exception:
                    pass
            time.sleep(delay / 1000.0)

    # --------- 登录主流程 ---------
    @retry(times=3, initial_delay=2.0, backoff=2.0, jitter=1.0)
    def semi_auto_login(self, username: Optional[str] = None, password: Optional[str] = None) -> bool:
        logger.info("半自动登录开始 (headless=%s, persistent=%s)", self.headless, self.use_persistent)
        with sync_playwright() as p:
            seed = self._ensure_profile_seed()
            profile_params = pick_profile_params(seed)

            if self.use_persistent and self.user_data_dir:
                logger.info("使用持久化浏览器配置: %s", self.user_data_dir)
                os.makedirs(self.user_data_dir, exist_ok=True)

                context_options = {
                    "viewport": profile_params["viewport"],
                    "user_agent": profile_params["user_agent"],
                    "locale": profile_params["locale"],
                    "timezone_id": profile_params["timezone_id"],
                    "permissions": ["geolocation"],
                    "geolocation": profile_params["geolocation"],
                    "java_script_enabled": True,
                    "has_touch": False,
                    "is_mobile": False,
                    "device_scale_factor": profile_params["device_scale_factor"],
                    "color_scheme": "light",
                    "extra_http_headers": {
                        "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
                    },
                }
                if self.proxy:
                    context_options["proxy"] = {"server": self.proxy}

                context = p.chromium.launch_persistent_context(
                    self.user_data_dir,
                    headless=self.headless,
                    slow_mo=random.randint(50, 150),
                    **context_options
                )
                self.browser = None
                self.page = context.pages[0] if context.pages else context.new_page()
            else:
                browser = p.chromium.launch(
                    headless=self.headless,
                    slow_mo=random.randint(50, 150),
                    args=[
                        "--disable-dev-shm-usage",
                        "--no-sandbox",
                    ],
                )
                context_options = {
                    "viewport": profile_params["viewport"],
                    "user_agent": profile_params["user_agent"],
                    "locale": profile_params["locale"],
                    "timezone_id": profile_params["timezone_id"],
                    "permissions": ["geolocation"],
                    "geolocation": profile_params["geolocation"],
                    "java_script_enabled": True,
                    "has_touch": False,
                    "is_mobile": False,
                    "device_scale_factor": profile_params["device_scale_factor"],
                    "color_scheme": "light",
                    "extra_http_headers": {
                        "Accept-Language": "zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7",
                    },
                }
                if self.proxy:
                    context_options["proxy"] = {"server": self.proxy}

                if os.path.exists(self.storage_state_path):
                    try:
                        with open(self.storage_state_path, "r", encoding="utf-8") as f:
                            storage_state = json.load(f)
                        context_options["storage_state"] = storage_state
                        logger.info("加载已保存的 storage_state")
                    except Exception as e:
                        logger.warning("加载 storage_state 失败: %s", e)

                context = browser.new_context(**context_options)
                self.browser = browser
                self.page = context.new_page()

            try:
                # ---- 注入指纹脚本 ----
                init_script = f"""
(function() {{
  try {{
    const PROFILE_SEED = {seed};
    function LCG(s) {{
      let state = s >>> 0;
      return function() {{
        state = Math.imul(1664525, state) + 1013904223 | 0;
        return ((state >>> 0) / 4294967296);
      }};
    }}
    const rnd = LCG(PROFILE_SEED);

    // 1) navigator.webdriver
    try {{
      Object.defineProperty(navigator, 'webdriver', {{ get: () => undefined, configurable: true }});
    }} catch (e) {{}}

    // 2) navigator.chrome
    try {{
      if (!window.navigator.chrome) {{
        window.navigator.chrome = {{ runtime: {{}} }};
      }}
    }} catch (e) {{}}

    // 3) languages
    try {{
      Object.defineProperty(navigator, 'languages', {{
        get: () => ['zh-CN', 'zh', 'en-US', 'en'],
        configurable: true
      }});
    }} catch (e) {{}}

    // 4) hardwareConcurrency / deviceMemory
    try {{
      const hcArr = [2,4,6,8];
      const dmArr = [4,8,16];
      const hc = hcArr[Math.floor(rnd() * hcArr.length)];
      const dm = dmArr[Math.floor(rnd() * dmArr.length)];
      Object.defineProperty(navigator, 'hardwareConcurrency', {{ get: () => hc, configurable: true }});
      Object.defineProperty(navigator, 'deviceMemory', {{ get: () => dm, configurable: true }});
    }} catch (e) {{}}

    // 5) platform
    try {{
      const platform = navigator.userAgent.includes('Macintosh') ? 'MacIntel' : 'Win32';
      Object.defineProperty(navigator, 'platform', {{ get: () => platform, configurable: true }});
    }} catch (e) {{}}

    // 6) permissions.query
    try {{
      const originalQuery = window.navigator.permissions && window.navigator.permissions.query;
      if (originalQuery) {{
        window.navigator.permissions.query = (parameters) => (
          parameters && parameters.name === 'notifications'
            ? Promise.resolve({{ state: Notification.permission }})
            : originalQuery(parameters)
        );
      }}
    }} catch (e) {{}}

    // 7) WebGL vendor/renderer
    try {{
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(param) {{
        try {{
          if (param === 37445) return 'Intel Inc.'; // UNMASKED_VENDOR_WEBGL
          if (param === 37446) return 'Intel Iris OpenGL Engine'; // UNMASKED_RENDERER_WEBGL
        }} catch (e) {{}}
        return getParameter.apply(this, arguments);
      }};
    }} catch (e) {{}}

    // 8) Canvas 噪声（基于 seed，幅度极小）
    try {{
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      let seedState = PROFILE_SEED >>> 0;
      function pseudo() {{
        seedState = Math.imul(1664525, seedState) + 1013904223 | 0;
        return ((seedState >>> 0) / 4294967296);
      }}
      HTMLCanvasElement.prototype.toDataURL = function() {{
        try {{
          const ctx = originalGetContext.call(this, '2d');
          if (!ctx) return originalToDataURL.apply(this, arguments);
          const w = Math.min(50, Math.max(1, this.width));
          const h = Math.min(50, Math.max(1, this.height));
          const imageData = ctx.getImageData(0, 0, w, h);
          const shift = (pseudo() - 0.5) * 4; // -2..+2
          for (let i = 0; i < imageData.data.length; i += 4) {{
            imageData.data[i]   = Math.max(0, Math.min(255, imageData.data[i]   + shift));
            imageData.data[i+1] = Math.max(0, Math.min(255, imageData.data[i+1] + shift));
            imageData.data[i+2] = Math.max(0, Math.min(255, imageData.data[i+2] + shift));
          }}
          ctx.putImageData(imageData, 0, 0);
        }} catch (e) {{}}
        return originalToDataURL.apply(this, arguments);
      }};
    }} catch (e) {{}}

    // 9) WebRTC IP 泄露最小化
    try {{
      if (window.RTCPeerConnection) {{
        const OriginalRTCPeerConnection = window.RTCPeerConnection;
        window.RTCPeerConnection = function(...args) {{
          try {{
            if (args[0] && args[0].iceServers) args[0].iceServers = [];
          }} catch (e) {{}}
          return new OriginalRTCPeerConnection(...args);
        }};
      }}
    }} catch (e) {{}}

    // 10) Battery API 优雅禁用
    try {{
      if (navigator.getBattery) {{
        navigator.getBattery = () => Promise.reject(new Error('Battery API disabled'));
      }}
    }} catch (e) {{}}

    console.log('[反指纹] 增强指纹脚本已注入 (seed=' + PROFILE_SEED + ')');
  }} catch (err) {{
    console.log('[反指纹] 注入脚本异常', err);
  }}
}})();
"""
                try:
                    self.page.add_init_script(init_script)
                except Exception as e:
                    logger.warning("注入 init_script 失败: %s", e)

                logger.info("打开登录页: %s", LOGIN_URL)
                self.page.goto(LOGIN_URL, timeout=self.timeout, wait_until="domcontentloaded")

                try:
                    self.page.wait_for_load_state("networkidle", timeout=15000)
                except PlaywrightTimeout:
                    logger.debug("networkidle timeout, proceeding...")

                time.sleep(human_delay(1000, 2000))
                random_scroll(self.page, rnd=random.Random(seed))

                has_critical_security, sec_type = self.detect_security_challenge(self.page)
                if has_critical_security:
                    logger.error("检测到需要人工干预的验证码: %s，脚本无法自动处理", sec_type)
                    png, _ = save_debug(self.page, "critical_security_challenge")
                    notify_human(
                        f"检测到需要人工干预的验证码: {sec_type}. 请人工完成验证.",
                        screenshot_path=png,
                        webhook_url=self.webhook,
                    )
                    logger.info("提示：请在浏览器中手动完成验证码，脚本将继续等待登录成功")
                else:
                    logger.info("未检测到需要人工干预的验证码，继续自动登录流程")

                if username and password:
                    if has_critical_security:
                        logger.info("检测到验证码，跳过自动填写，请人工在浏览器中完成登录")
                    else:
                        filled = self._fill_login_form(username, password, seed=seed)
                        if not filled:
                            logger.warning("自动填写失败，请人工在打开的浏览器中登录")
                        else:
                            logger.info("已填写账号/密码，等待登录成功（如有验证码请人工完成）")
                else:
                    logger.info("未提供账号/密码，请在浏览器中手动登录")

                wait_time = 600 if has_critical_security else 300
                logger.info("等待登录完成（最多 %d 秒）...", wait_time)
                ok = self.wait_for_login_success(self.page, max_wait=wait_time)
                if not ok:
                    logger.error("登录未成功或超时，保存调试信息")
                    png, _ = save_debug(self.page, "login_timeout")
                    notify_human(
                        "半自动登录超时或失败，请人工查看 debug artifacts",
                        screenshot_path=png,
                        webhook_url=self.webhook,
                    )
                    return False

                try:
                    logger.info("导航到目标页面以确保 session 完整: %s", TARGET_URL)
                    self.page.goto(TARGET_URL, timeout=self.timeout, wait_until="domcontentloaded")
                    try:
                        self.page.wait_for_load_state("networkidle", timeout=15000)
                    except PlaywrightTimeout:
                        logger.debug("networkidle timeout after navigating to target")
                    time.sleep(3)
                    read_time = page_reading_time(self.page)
                    logger.debug("模拟页面浏览，停留 %.2f 秒", read_time)
                    random_scroll(self.page, rnd=random.Random(seed))
                    time.sleep(read_time)
                except Exception as e:
                    logger.warning("导航目标页失败: %s", e)

                final_cookies = context.cookies()
                logger.info("准备保存 storage_state，当前 cookie 数: %d", len(final_cookies))
                logger.debug("最终 cookie 列表: %s", [c["name"] for c in final_cookies])

                session_cookies = [
                    c for c in final_cookies
                    if "session" in c["name"].lower() or "token" in c["name"].lower()
                ]
                if len(session_cookies) < 2:
                    logger.error("警告: 未检测到足够的认证 cookie，登录可能失败")
                    logger.error("实际 cookie: %s", json.dumps([c["name"] for c in final_cookies], ensure_ascii=False))
                    save_debug(self.page, "insufficient_auth_cookies")
                    return False

                storage_state = context.storage_state()
                if not self.save_storage_state(storage_state, encrypt=True):
                    logger.error("保存 storage_state 失败")
                    return False

                cookies = storage_state.get("cookies", [])
                self.save_cookies(cookies, self.cookie_txt_path, self.cookie_json_path)
                logger.info("半自动登录成功并已保存 cookie/state")
                return True

            except PlaywrightError as e:
                logger.exception("Playwright error during semi_auto_login: %s", e)
                png, _ = save_debug(self.page, "playwright_error")
                notify_human("Playwright 错误，请人工检查", screenshot_path=png, webhook_url=self.webhook)
                return False
            except Exception as e:
                logger.exception("Unexpected error in semi_auto_login: %s", e)
                png, _ = save_debug(self.page, "unexpected_error")
                notify_human("登录脚本出现异常，请人工检查", screenshot_path=png, webhook_url=self.webhook)
                return False
            finally:
                try:
                    if self.use_persistent and self.user_data_dir:
                        context.close()
                    else:
                        if self.browser:
                            self.browser.close()
                except Exception as e:
                    logger.debug("关闭浏览器失败: %s", e)

    def _fill_login_form(self, username: str, password: str, seed: Optional[int] = None) -> bool:
        page = self.page
        if not page:
            logger.error("_fill_login_form: page is None")
            return False
        rnd = random.Random(seed) if seed is not None else random
        try:
            possible_username_selectors = [
                "input[type='text']",
                "input[type='email']",
                "input[name='username']",
                "input[name='account']",
                "input[autocomplete='username']",
                "input[placeholder*='账号']",
                "input[placeholder*='邮箱']",
                "input[placeholder*='用户名']",
                "input[placeholder*='手机号']",
            ]
            username_locator = None
            for sel in possible_username_selectors:
                try:
                    page.wait_for_selector(sel, timeout=6000)
                    loc = page.locator(sel).first
                    if loc.count() > 0 and loc.is_visible():
                        username_locator = loc
                        logger.debug("找到用户名选择器: %s", sel)
                        break
                except PlaywrightTimeout:
                    continue
                except Exception:
                    continue

            if not username_locator:
                logger.warning("未找到用户名输入框")
                return False

            try:
                box = username_locator.bounding_box()
                if box:
                    start = (rnd.uniform(100, 500), rnd.uniform(100, 400))
                    end = (box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
                    self._human_move(page, start, end, steps=18, seed=seed)
            except Exception:
                pass

            time.sleep(human_delay(*HUMAN_CLICK_DELAY, rnd=rnd))
            try:
                username_locator.click()
            except Exception:
                try:
                    username_locator.focus()
                except Exception:
                    pass
            time.sleep(human_delay(200, 400, rnd=rnd))

            try:
                username_locator.fill("")
            except Exception:
                pass
            self._human_type(page, username, seed=seed)

            possible_pwd_selectors = [
                "input[type='password']",
                "input[name='password']",
                "input[autocomplete='current-password']",
                "input[placeholder*='密码']",
            ]
            password_locator = None
            for sel in possible_pwd_selectors:
                try:
                    page.wait_for_selector(sel, timeout=6000)
                    loc = page.locator(sel).first
                    if loc.count() > 0 and loc.is_visible():
                        password_locator = loc
                        logger.debug("找到密码选择器: %s", sel)
                        break
                except PlaywrightTimeout:
                    continue
                except Exception:
                    continue

            if not password_locator:
                logger.warning("未找到密码输入框")
                return False

            try:
                box = password_locator.bounding_box()
                if box:
                    start = (rnd.uniform(100, 500), rnd.uniform(100, 400))
                    end = (box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
                    self._human_move(page, start, end, steps=18, seed=seed)
            except Exception:
                pass

            time.sleep(human_delay(*HUMAN_CLICK_DELAY, rnd=rnd))
            try:
                password_locator.click()
            except Exception:
                try:
                    password_locator.focus()
                except Exception:
                    pass
            time.sleep(human_delay(200, 400, rnd=rnd))

            try:
                password_locator.fill("")
            except Exception:
                pass
            self._human_type(page, password, seed=seed)

            time.sleep(human_delay(500, 1000, rnd=rnd))

            try:
                agreement_selectors = [
                    ".account-center-agreement-check",
                    "input[type='checkbox']",
                    "[class*='agreement'][class*='check']",
                ]
                for sel in agreement_selectors:
                    try:
                        checkbox = page.locator(sel).first
                        if checkbox.count() > 0 and checkbox.is_visible():
                            try:
                                if not checkbox.is_checked():
                                    checkbox.scroll_into_view_if_needed()
                                    time.sleep(human_delay(200, 400, rnd=rnd))
                                    checkbox.click()
                                    logger.debug("已勾选用户协议")
                                    time.sleep(human_delay(300, 600, rnd=rnd))
                            except Exception:
                                try:
                                    checkbox.click()
                                except Exception:
                                    pass
                            break
                    except Exception:
                        continue
            except Exception as e:
                logger.debug("勾选协议失败（可能不需要）: %s", e)

            login_button_selectors = [
                "button[type='submit']",
                "button:has-text('登录')",
                "button:has-text('登錄')",
                "button:has-text('Login')",
                ".login-btn",
                "#login-btn",
            ]
            clicked = False
            for sel in login_button_selectors:
                try:
                    el = page.locator(sel).first
                    if el.count() > 0 and el.is_visible():
                        try:
                            box = el.bounding_box()
                            if box:
                                start = (rnd.uniform(100, 500), rnd.uniform(100, 400))
                                end = (box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
                                self._human_move(page, start, end, steps=20, seed=seed)
                        except Exception:
                            pass
                        try:
                            el.scroll_into_view_if_needed()
                            time.sleep(human_delay(500, 1000, rnd=rnd))
                        except Exception:
                            pass
                        try:
                            el.hover()
                            time.sleep(human_delay(200, 400, rnd=rnd))
                        except Exception:
                            pass
                        try:
                            el.click()
                            logger.debug("点击登录按钮: %s", sel)
                            clicked = True
                            time.sleep(human_delay(1000, 2000, rnd=rnd))
                            break
                        except Exception:
                            continue
                except Exception:
                    continue

            if not clicked:
                try:
                    page.keyboard.press("Enter")
                    logger.debug("按下回车提交表单")
                except Exception:
                    logger.debug("回车提交失败")
            return True
        except Exception as e:
            logger.exception("_fill_login_form error: %s", e)
            save_debug(page, "fill_login_form_error")
            return False

    def interactive_login(self) -> bool:
        return self.semi_auto_login(username=None, password=None)

    # --------- 检查 cookie 有效性 ---------
    def check_cookie_validity(self) -> bool:
        logger.info("开始检测 Cookie 有效性")
        if os.path.exists(self.cookie_meta_path):
            try:
                with open(self.cookie_meta_path, "r", encoding="utf-8") as f:
                    metadata = json.load(f)
                expires_at = datetime.fromisoformat(metadata.get("expires_at"))
                now = datetime.now()
                if now >= expires_at:
                    logger.info("Cookie 已过期 (expires_at=%s)", expires_at.isoformat())
                    return False
                remaining = expires_at - now
                logger.info("Cookie 剩余有效期: %s", remaining)
            except Exception as e:
                logger.warning("读取 cookie_meta 失败: %s", e)

        storage_state = self.load_storage_state()
        if not storage_state:
            logger.info("未加载到 storage_state")
            return False

        with sync_playwright() as p:
            try:
                browser = p.chromium.launch(headless=True)
                context = browser.new_context(storage_state=storage_state)
                page = context.new_page()

                logger.info("访问目标页面以验证登录: %s", TARGET_URL)
                page.goto(TARGET_URL, timeout=20000)
                try:
                    page.wait_for_load_state("networkidle", timeout=8000)
                except PlaywrightTimeout:
                    logger.debug("networkidle 超时")

                current_url = page.url.lower()
                logger.debug("验证页面 URL: %s", current_url)

                try:
                    os.makedirs("debug", exist_ok=True)
                    page.screenshot(path="debug/cookie_check.png")
                    logger.debug("已保存调试截图: debug/cookie_check.png")
                except Exception:
                    pass

                if "login" in current_url or "sso" in current_url:
                    logger.info("被重定向到登录页，Cookie 无效")
                    browser.close()
                    return False

                indicators = [
                    "div[class*='user']",
                    "div[class*='avatar']",
                    ".account-center-header",
                    "[class*='UserInfo']",
                ]
                for sel in indicators:
                    try:
                        if page.locator(sel).count() > 0:
                            logger.info("检测到用户信息元素: %s, Cookie 有效", sel)
                            browser.close()
                            return True
                    except Exception:
                        continue

                try:
                    title = page.title()
                    logger.debug("页面标题: %s", title)
                    if "登录" in title or "login" in title.lower():
                        logger.info("页面标题显示登录，Cookie 可能失效")
                        browser.close()
                        return False
                except Exception:
                    pass

                cookies = context.cookies()
                auth_cookies = [
                    c for c in cookies
                    if any(k in c["name"].lower() for k in ["token", "session", "auth", "user", "passport"])
                ]
                logger.info("认证 cookie 数量: %d/%d", len(auth_cookies), len(cookies))
                logger.debug("所有 cookie 名称: %s", [c["name"] for c in cookies])

                session_like_cookies = [
                    c for c in cookies
                    if "session" in c["name"].lower() or "token" in c["name"].lower()
                ]
                if not session_like_cookies:
                    logger.warning("警告: 未找到 session/token 类 cookie，登录可能失败")
                    logger.warning(
                        "实际保存的 cookies: %s",
                        json.dumps(
                            [{c["name"]: c["value"][:50]} for c in cookies if c["value"]],
                            ensure_ascii=False, indent=2
                        ),
                    )
                    browser.close()
                    return False

                if len(auth_cookies) >= 2:
                    logger.info("Cookie 看起来仍然有效")
                    browser.close()
                    return True

                logger.warning("无法明确判断 cookie 状态，但未发现明显有效指示，保守返回 False")
                browser.close()
                return False
            except Exception as e:
                logger.exception("check_cookie_validity error: %s", e)
                return False


# --- CLI & main ---
def main():
    parser = argparse.ArgumentParser(description="智能Cookie管理工具 - 巨量引擎/星图平台（增强版-反指纹改进）")
    parser.add_argument("--interactive", "-i", action="store_true", help="交互模式：完全手动登录")
    parser.add_argument("--username", "-u", type=str, help="登录用户名（半自动模式）")
    parser.add_argument("--password", "-p", type=str, help="登录密码（半自动模式）")
    parser.add_argument("--check", action="store_true", help="检测现有Cookie是否有效")
    parser.add_argument("--auto-refresh", action="store_true", help="自动检测并刷新失效的Cookie")
    parser.add_argument("--no-encrypt", action="store_true", help="不加密保存Cookie（不推荐）")
    parser.add_argument("--timeout", type=int, default=30000, help="页面加载超时时间（毫秒）")
    parser.add_argument("--output", type=str, default=COOKIE_OUTPUT_PATH)
    parser.add_argument("--output-json", type=str, default=COOKIE_JSON_PATH)
    parser.add_argument("--webhook", type=str, default="", help="Webhook URL（用于人工介入通知）")
    args = parser.parse_args()

    if not PLAYWRIGHT_AVAILABLE:
        logger.error("Playwright not available")
        return 1

    password = args.password
    if not password and args.username and KEYRING_AVAILABLE:
        try:
            password = keyring.get_password("auto_cookie_fetcher", args.username)
            if password:
                logger.info("从 keyring 获取到密码（隐藏）")
        except Exception as e:
            logger.warning("keyring get_password failed: %s", e)

    proxy = os.environ.get("HTTP_PROXY") or os.environ.get("HTTPS_PROXY")
    if proxy:
        logger.info("使用代理: %s", proxy)

    fetcher = AutoCookieFetcher(
        headless=False,
        timeout=args.timeout,
        webhook=args.webhook,
        use_persistent=True,
        proxy=proxy,
    )
    fetcher.cookie_txt_path = args.output
    fetcher.cookie_json_path = args.output_json

    logger.info("智能Cookie管理工具 启动")

    if args.check:
        ok = fetcher.check_cookie_validity()
        return 0 if ok else 1

    if args.auto_refresh:
        ok = fetcher.check_cookie_validity()
        if ok:
            logger.info("Cookie 有效，无需刷新")
            return 0
        logger.info("Cookie 无效，开始重新登录流程")
        if not args.username:
            logger.error("自动刷新需要提供 --username（或手动运行 --interactive）")
            return 1
        if not password:
            logger.error("自动刷新需要密码（未提供，也无法从 keyring 获取）")
            return 1
        # 继续往下走登录流程

    success = False
    if args.interactive:
        success = fetcher.interactive_login()
    elif args.username and password:
        success = fetcher.semi_auto_login(args.username, password)
    else:
        logger.error("请指定登录方式：--interactive 或 --username --password")
        return 1

    if success:
        logger.info("Cookie 获取成功")
        logger.info(
            "文本: %s, JSON: %s, storage_state: %s",
            fetcher.cookie_txt_path, fetcher.cookie_json_path, fetcher.storage_state_path,
        )
        if CRYPTO_AVAILABLE and not args.no_encrypt:
            logger.info("加密文件: %s", fetcher.encrypted_state_path)
        logger.info("元数据: %s", fetcher.cookie_meta_path)
        return 0
    else:
        logger.error("Cookie 获取失败（详见日志）")
        return 1


if __name__ == "__main__":
    sys.exit(main())
