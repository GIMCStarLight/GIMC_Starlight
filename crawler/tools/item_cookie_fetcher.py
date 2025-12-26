#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
作品投放数据采集模块 - Cookie自动获取工具

功能特性:
- 针对星图作品投放数据登录页面 (https://sso.oceanengine.com/xingtu/login?role=1)
- 支持邮箱登录自动填写
- 自动输入账号、密码
- 自动勾选服务协议
- 支持多账号管理（item_account_1/2/...）
- 反指纹检测
- 人类行为模拟
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
from pathlib import Path

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

# --- Logging setup ---
LOG_FORMAT = "%(asctime)s %(levelname)s %(name)s %(message)s"
logging.basicConfig(level=logging.INFO, format=LOG_FORMAT)
logger = logging.getLogger("item_cookie_fetcher")

# --- 添加项目路径 ---
sys.path.insert(0, str(Path(__file__).parent.parent))

# --- 星图作品投放登录页面 ---
LOGIN_URL = "https://sso.oceanengine.com/xingtu/login?role=1"
TARGET_URL = "https://www.xingtu.cn/ad/creator/item-delivery-data"

# --- 配置目录和路径 ---
COOKIE_CONFIG_DIR = os.path.join(os.path.dirname(__file__), "account_manager", "config")
ACCOUNTS_DIR = f"{COOKIE_CONFIG_DIR}/accounts"
ITEM_ACCOUNT_POOL_CONFIG = f"{COOKIE_CONFIG_DIR}/item_delivery_account_pool.json"

# --- 人类行为模拟参数 ---
HUMAN_TYPING_DELAY = (80, 200)
HUMAN_CLICK_DELAY = (150, 500)
HUMAN_SCROLL_DELAY = (500, 1500)
PAGE_READ_TIME = (2000, 5000)


# --- Utilities ---
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
        scroll_times = rnd.randint(1, 2)
        for _ in range(scroll_times):
            scroll_to = rnd.randint(0, max(0, page_height - viewport_height))
            page.evaluate(f"window.scrollTo({{top: {scroll_to}, behavior: 'smooth'}})")
            time.sleep(human_delay(*HUMAN_SCROLL_DELAY, rnd=rnd))
        logger.debug("随机滚动完成")
    except Exception as e:
        logger.debug("random_scroll failed: %s", e)


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
            logger.info("保存调试文件: %s, %s", png_path, html_path)
            return png_path, html_path
        except Exception as e:
            logger.warning("save_debug failed: %s", e)
            return None, None
    return None, None


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
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
]
VIEWPORTS = [(1366, 768), (1440, 900), (1536, 864), (1920, 1080)]


def pick_profile_params(seed: int) -> Dict[str, Any]:
    rnd = random.Random(seed)
    ua = rnd.choice(USER_AGENTS)
    w, h = rnd.choice(VIEWPORTS)
    platform = "MacIntel" if "Macintosh" in ua else "Win32"
    return {
        "user_agent": ua,
        "viewport": {"width": w, "height": h},
        "device_scale_factor": 1,
        "hardware_concurrency": 8,
        "platform": platform,
        "locale": "zh-CN",
        "timezone_id": "Asia/Shanghai",
    }


# --- Main class ---
class ItemCookieFetcher:
    """星图作品投放数据采集专用Cookie获取器"""

    def __init__(self, headless: bool = True, timeout: int = 30000, 
                 account_id: Optional[str] = None):
        self.headless = headless
        self.timeout = timeout
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None
        self.account_id = account_id or "item_account_1"
        
        # 账号目录
        account_dir = os.path.join(ACCOUNTS_DIR, self.account_id)
        os.makedirs(account_dir, exist_ok=True)
        
        # Cookie文件路径
        self.cookie_txt_path = os.path.join(account_dir, "cookies.txt")
        self.cookie_json_path = os.path.join(account_dir, "cookies.json")
        self.storage_state_path = os.path.join(account_dir, "storage_state.json")
        self.encrypted_state_path = os.path.join(account_dir, "storage_state.enc")
        self.encryption_key_path = os.path.join(account_dir, ".cookie_key")
        self.cookie_meta_path = os.path.join(account_dir, "cookie_meta.json")
        self.user_data_dir = os.path.join(account_dir, "browser_profile")
        
        self.profile_seed = self._ensure_profile_seed()

    def _ensure_profile_seed(self) -> int:
        """生成/读取 profile seed"""
        os.makedirs(self.user_data_dir, exist_ok=True)
        seed_file = os.path.join(self.user_data_dir, ".profile_seed")
        try:
            if os.path.exists(seed_file):
                with open(seed_file, "r", encoding="utf-8") as f:
                    s = f.read().strip()
                    if s:
                        return int(s)
            s = str(secrets.randbelow(2**31))
            with open(seed_file, "w", encoding="utf-8") as f:
                f.write(s)
            os.chmod(seed_file, 0o600)
            return int(s)
        except Exception:
            return secrets.randbelow(2**31)

    def _human_type(self, page: Page, text: str, seed: Optional[int] = None):
        """模拟人类打字"""
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
                    pass
            time.sleep(delay / 1000.0)

    def wait_for_login_success(self, page: Page, max_wait: int = 300) -> bool:
        """等待登录成功"""
        logger.info("等待登录完成 (最多 %s 秒)...", max_wait)
        start = time.time()
        
        while time.time() - start < max_wait:
            try:
                current_url = page.url
                elapsed = int(time.time() - start)
                
                if elapsed % 10 == 0 and elapsed > 0:
                    remaining = max_wait - elapsed
                    logger.info("等待中: 已等待 %s 秒, 剩余 %s 秒", elapsed, remaining)
                
                # 检查URL是否跳转到星图平台
                if "xingtu.cn" in current_url and "login" not in current_url.lower():
                    logger.info("检测到登录成功 (URL 跳转): %s", current_url)
                    return True
                
                # 检查Cookie
                try:
                    cookies = page.context.cookies()
                    auth_cookies = [
                        c for c in cookies
                        if any(k in c["name"].lower() for k in ["session", "token", "auth", "passport"])
                    ]
                    if len(auth_cookies) >= 2:
                        logger.info("检测到认证 Cookie (%d 个)，可能已登录", len(auth_cookies))
                        return True
                except Exception:
                    pass
                
            except Exception as e:
                logger.warning("等待登录过程中发生异常: %s", e)
            
            time.sleep(1.0)
        
        logger.error("登录等待超时 (%s 秒)", max_wait)
        return False

    def save_storage_state(self, storage_state: Dict, encrypt: bool = True) -> bool:
        """保存storage_state"""
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
        """保存Cookie元数据"""
        try:
            current_time = time.time()
            expires_timestamps = [
                cookie["expires"]
                for cookie in cookies
                if cookie.get("expires") and cookie["expires"] > current_time
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
                "account_id": self.account_id,
            }
            with open(self.cookie_meta_path, "w", encoding="utf-8") as f:
                json.dump(metadata, f, ensure_ascii=False, indent=2)
            logger.info("Cookie 元数据已保存, 预计有效至: %s", expires_at.isoformat())
        except Exception as e:
            logger.warning("save_cookie_metadata failed: %s", e)

    def save_cookies(self, cookies: List[Dict]) -> bool:
        """保存Cookie到文本和JSON文件"""
        if not cookies:
            logger.error("无 Cookie 可保存")
            return False
        try:
            # 保存JSON格式
            with open(self.cookie_json_path, "w", encoding="utf-8") as f:
                json.dump(
                    {
                        "cookies": cookies,
                        "timestamp": datetime.now().isoformat(),
                        "url": TARGET_URL,
                        "account_id": self.account_id
                    },
                    f, ensure_ascii=False, indent=2
                )
            logger.info("Cookie JSON 保存: %s", self.cookie_json_path)

            # 保存文本格式
            cookie_str_parts = []
            for cookie in cookies:
                name = cookie.get("name", "")
                value = cookie.get("value", "")
                if name and value:
                    cookie_str_parts.append(f"{name}={value}")
            cookie_str = "; ".join(cookie_str_parts)
            
            with open(self.cookie_txt_path, "w", encoding="utf-8") as f:
                f.write(cookie_str)
            logger.info("Cookie 文本保存: %s", self.cookie_txt_path)
            return True
        except Exception as e:
            logger.exception("save_cookies failed: %s", e)
            return False

    def auto_login(self, username: str, password: str) -> bool:
        """
        自动登录星图作品投放数据页面
        
        Args:
            username: 邮箱账号
            password: 密码
        
        Returns:
            是否登录成功
        """
        logger.info("开始自动登录 (账号: %s, headless=%s)", self.account_id, self.headless)
        
        with sync_playwright() as p:
            seed = self.profile_seed
            profile_params = pick_profile_params(seed)
            
            try:
                # 启动浏览器
                logger.info("使用持久化浏览器配置: %s", self.user_data_dir)
                # Linux服务器无头模式额外参数
                launch_args = [
                    "--disable-dev-shm-usage",
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-gpu",
                ]
                context = p.chromium.launch_persistent_context(
                    self.user_data_dir,
                    headless=self.headless,
                    slow_mo=random.randint(50, 150),
                    args=launch_args,
                    viewport=profile_params["viewport"],
                    user_agent=profile_params["user_agent"],
                    locale=profile_params["locale"],
                    timezone_id=profile_params["timezone_id"],
                    permissions=["geolocation"],
                    java_script_enabled=True,
                    has_touch=False,
                    is_mobile=False,
                    device_scale_factor=profile_params["device_scale_factor"],
                    color_scheme="light",
                )
                
                self.page = context.pages[0] if context.pages else context.new_page()
                
                # 注入反指纹脚本
                init_script = self._get_anti_fingerprint_script(seed)
                try:
                    self.page.add_init_script(init_script)
                except Exception as e:
                    logger.warning("注入 init_script 失败: %s", e)
                
                # 打开登录页
                logger.info("打开登录页: %s", LOGIN_URL)
                self.page.goto(LOGIN_URL, timeout=self.timeout, wait_until="domcontentloaded")
                
                try:
                    self.page.wait_for_load_state("networkidle", timeout=15000)
                except PlaywrightTimeout:
                    logger.debug("networkidle timeout, proceeding...")
                
                time.sleep(human_delay(2000, 3000))
                
                # 切换到邮箱登录
                if not self._switch_to_email_login():
                    logger.error("无法切换到邮箱登录")
                    save_debug(self.page, "switch_email_failed")
                    return False
                
                # 填写登录表单
                if not self._fill_login_form(username, password):
                    logger.error("填写登录表单失败")
                    save_debug(self.page, "fill_form_failed")
                    return False
                
                # 等待登录成功
                wait_time = 300
                logger.info("等待登录完成（最多 %d 秒）...", wait_time)
                ok = self.wait_for_login_success(self.page, max_wait=wait_time)
                
                if not ok:
                    logger.error("登录未成功或超时")
                    save_debug(self.page, "login_timeout")
                    return False
                
                # 导航到目标页面确保session完整
                try:
                    logger.info("导航到目标页面: %s", TARGET_URL)
                    # 使用一个通用的作品ID
                    test_url = f"{TARGET_URL}/7584864709501832494"
                    self.page.goto(test_url, timeout=self.timeout, wait_until="domcontentloaded")
                    time.sleep(3)
                except Exception as e:
                    logger.warning("导航目标页失败: %s", e)
                
                # 强制等待确保cookie完全设置
                time.sleep(2)
                
                # 获取最新cookies
                final_cookies = context.cookies()
                logger.info("准备保存 storage_state，当前 cookie 数: %d", len(final_cookies))
                
                # 保存storage_state
                storage_state = context.storage_state()
                storage_state["cookies"] = final_cookies
                
                if not self.save_storage_state(storage_state, encrypt=True):
                    logger.error("保存 storage_state 失败")
                    return False
                
                # 保存cookies
                self.save_cookies(final_cookies)
                
                logger.info("自动登录成功并已保存 cookie/state")
                return True
                
            except PlaywrightError as e:
                logger.exception("Playwright error: %s", e)
                save_debug(self.page, "playwright_error")
                return False
            except Exception as e:
                logger.exception("Unexpected error: %s", e)
                save_debug(self.page, "unexpected_error")
                return False
            finally:
                try:
                    context.close()
                except Exception as e:
                    logger.debug("关闭浏览器失败: %s", e)

    def _switch_to_email_login(self) -> bool:
        """切换到邮箱登录模式"""
        page = self.page
        try:
            # 查找"邮箱登录"标签
            email_login_selectors = [
                "text=邮箱登录",
                "text=邮箱",
                "[class*='tab']:has-text('邮箱')",
                "div:has-text('邮箱登录')",
            ]
            
            for selector in email_login_selectors:
                try:
                    element = page.locator(selector).first
                    if element.count() > 0 and element.is_visible():
                        logger.info("找到邮箱登录入口，点击切换")
                        time.sleep(human_delay(500, 1000))
                        element.click()
                        time.sleep(human_delay(1000, 2000))
                        logger.info("已切换到邮箱登录")
                        return True
                except Exception:
                    continue
            
            # 如果没找到切换按钮，检查是否已经在邮箱登录页面
            email_input_selectors = [
                "input[type='email']",
                "input[placeholder*='邮箱']",
                "input[name*='email']",
            ]
            
            for selector in email_input_selectors:
                try:
                    if page.locator(selector).count() > 0:
                        logger.info("检测到邮箱输入框，已经在邮箱登录页面")
                        return True
                except Exception:
                    continue
            
            logger.warning("未找到邮箱登录入口")
            return False
            
        except Exception as e:
            logger.exception("切换邮箱登录失败: %s", e)
            return False

    def _fill_login_form(self, username: str, password: str) -> bool:
        """填写登录表单"""
        page = self.page
        rnd = random.Random(self.profile_seed)
        
        try:
            # 1. 查找并填写邮箱
            email_selectors = [
                "input[type='email']",
                "input[placeholder*='邮箱']",
                "input[name*='email']",
                "input[type='text']",
            ]
            
            email_filled = False
            for selector in email_selectors:
                try:
                    page.wait_for_selector(selector, timeout=5000)
                    element = page.locator(selector).first
                    if element.count() > 0 and element.is_visible():
                        logger.info("找到邮箱输入框: %s", selector)
                        time.sleep(human_delay(*HUMAN_CLICK_DELAY, rnd=rnd))
                        element.click()
                        time.sleep(human_delay(200, 400, rnd=rnd))
                        try:
                            element.fill("")
                        except Exception:
                            pass
                        self._human_type(page, username, seed=self.profile_seed)
                        logger.info("邮箱已填写")
                        email_filled = True
                        break
                except Exception:
                    continue
            
            if not email_filled:
                logger.error("未找到邮箱输入框")
                return False
            
            time.sleep(human_delay(500, 1000, rnd=rnd))
            
            # 2. 查找并填写密码
            password_selectors = [
                "input[type='password']",
                "input[placeholder*='密码']",
                "input[name*='password']",
            ]
            
            password_filled = False
            for selector in password_selectors:
                try:
                    page.wait_for_selector(selector, timeout=5000)
                    element = page.locator(selector).first
                    if element.count() > 0 and element.is_visible():
                        logger.info("找到密码输入框: %s", selector)
                        time.sleep(human_delay(*HUMAN_CLICK_DELAY, rnd=rnd))
                        element.click()
                        time.sleep(human_delay(200, 400, rnd=rnd))
                        try:
                            element.fill("")
                        except Exception:
                            pass
                        self._human_type(page, password, seed=self.profile_seed)
                        logger.info("密码已填写")
                        password_filled = True
                        break
                except Exception:
                    continue
            
            if not password_filled:
                logger.error("未找到密码输入框")
                return False
            
            time.sleep(human_delay(500, 1000, rnd=rnd))
            
            # 3. 勾选服务协议（关键步骤：必须在点击登录前完成）
            logger.info("开始查找服务协议复选框...")
            agreement_selectors = [
                # 根据实际HTML结构，精确定位复选框
                ".account-center-agreement-check",  # 最精确的选择器
                "div.account-center-agreement-check",
                "[class*='agreement-check']",
                # 通过父容器定位
                ".account-center-input-agreement",
                "[class*='input-agreement']",
                # 通过文本内容定位整个协议区域
                "text='我已阅读并同意'",
                "span:has-text('我已阅读并同意')",
                # 通过checkbox容器
                ".check-box-container",
                "[class*='check-box']",
            ]
            
            agreement_checked = False
            for selector in agreement_selectors:
                try:
                    logger.debug("尝试选择器: %s", selector)
                    element = page.locator(selector).first
                    if element.count() > 0:
                        logger.info("找到协议元素: %s", selector)
                        
                        # 检查是否已经勾选（通过样式判断）
                        try:
                            # 获取元素的背景色来判断是否已勾选
                            # 未勾选: background-color: rgb(255, 255, 255)
                            # 已勾选: 会有不同的背景色
                            bg_color = element.evaluate("el => window.getComputedStyle(el).backgroundColor")
                            logger.debug("复选框背景色: %s", bg_color)
                            
                            # 如果背景色不是白色，可能已勾选
                            if bg_color and bg_color != "rgb(255, 255, 255)" and bg_color != "rgba(255, 255, 255, 0)":
                                logger.info("服务协议可能已经勾选（背景色: %s）", bg_color)
                                agreement_checked = True
                                break
                        except Exception as e:
                            logger.debug("检查勾选状态失败: %s", e)
                        
                        # 滚动到可见区域
                        try:
                            element.scroll_into_view_if_needed()
                            time.sleep(human_delay(300, 500, rnd=rnd))
                        except Exception:
                            pass
                        
                        # 点击勾选
                        try:
                            logger.info("点击勾选服务协议元素")
                            # 使用force: True强制点击，即使元素被遮挡
                            element.click(force=True)
                            time.sleep(human_delay(500, 1000, rnd=rnd))
                            
                            # 验证是否勾选成功（再次检查背景色）
                            try:
                                bg_color_after = element.evaluate("el => window.getComputedStyle(el).backgroundColor")
                                logger.info("点击后背景色: %s", bg_color_after)
                                
                                if bg_color_after and bg_color_after != "rgb(255, 255, 255)":
                                    logger.info("✓ 服务协议勾选成功（背景色已改变）")
                                    agreement_checked = True
                                    break
                                else:
                                    logger.warning("背景色未改变，可能未勾选成功")
                            except Exception as e:
                                logger.debug("验证勾选状态失败: %s", e)
                            
                            # 即使验证失败，也认为操作完成
                            logger.info("已执行协议勾选操作")
                            agreement_checked = True
                            break
                            
                        except Exception as e:
                            logger.warning("直接点击失败: %s，尝试其他方式", e)
                            # 尝试通过JavaScript点击
                            try:
                                logger.info("尝试通过JavaScript点击")
                                element.evaluate("el => el.click()")
                                time.sleep(human_delay(500, 1000, rnd=rnd))
                                logger.info("JavaScript点击完成")
                                agreement_checked = True
                                break
                            except Exception as e2:
                                logger.debug("JavaScript点击也失败: %s", e2)
                                continue
                                
                except Exception as e:
                    logger.debug("选择器 %s 失败: %s", selector, e)
                    continue
            
            if not agreement_checked:
                logger.warning("未能自动勾选服务协议，可能需要手动处理")
                # 不返回False，继续尝试登录（有些情况下协议已默认勾选）
            else:
                logger.info("服务协议处理完成")
            
            time.sleep(human_delay(500, 1000, rnd=rnd))
            
            # 4. 点击登录按钮
            login_button_selectors = [
                "button:has-text('登录')",
                "button[type='submit']",
                "[class*='login-btn']",
                "[class*='submit-btn']",
            ]
            
            clicked = False
            for selector in login_button_selectors:
                try:
                    button = page.locator(selector).first
                    if button.count() > 0 and button.is_visible():
                        try:
                            button.scroll_into_view_if_needed()
                            time.sleep(human_delay(500, 1000, rnd=rnd))
                        except Exception:
                            pass
                        try:
                            button.hover()
                            time.sleep(human_delay(200, 400, rnd=rnd))
                        except Exception:
                            pass
                        button.click()
                        logger.info("点击登录按钮: %s", selector)
                        clicked = True
                        time.sleep(human_delay(2000, 3000, rnd=rnd))
                        break
                except Exception:
                    continue
            
            if not clicked:
                try:
                    page.keyboard.press("Enter")
                    logger.info("按下回车提交表单")
                except Exception:
                    logger.warning("回车提交失败")
            
            return True
            
        except Exception as e:
            logger.exception("_fill_login_form error: %s", e)
            save_debug(page, "fill_login_form_error")
            return False

    def _get_anti_fingerprint_script(self, seed: int) -> str:
        """生成反指纹脚本"""
        return f"""
(function() {{
  try {{
    const PROFILE_SEED = {seed};
    
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
    
    console.log('[反指纹] 反指纹脚本已注入 (seed=' + PROFILE_SEED + ')');
  }} catch (err) {{
    console.log('[反指纹] 注入脚本异常', err);
  }}
}})();
"""


# --- CLI & main ---
def main():
    parser = argparse.ArgumentParser(
        description="星图作品投放数据采集 - Cookie自动获取工具",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例用法：
  # 为指定账号获取Cookie
  python item_cookie_fetcher.py --account item_account_1 --username your@email.com --password yourpass
  
  # 列出所有作品数据账号
  python item_cookie_fetcher.py --list-accounts
  
  # 刷新指定账号的Cookie
  python item_cookie_fetcher.py --refresh-account item_account_1 --username your@email.com --password yourpass
        """
    )
    
    parser.add_argument("--account", type=str, default="item_account_1", help="账号ID")
    parser.add_argument("--username", "-u", type=str, required=True, help="登录邮箱")
    parser.add_argument("--password", "-p", type=str, required=True, help="登录密码")
    parser.add_argument("--headless", action="store_true", default=True, help="无头模式（默认开启，适合Linux服务器）")
    parser.add_argument("--timeout", type=int, default=30000, help="页面加载超时时间（毫秒）")
    
    # 多账号管理
    parser.add_argument("--list-accounts", action="store_true", help="列出所有作品数据账号")
    parser.add_argument("--refresh-account", type=str, help="刷新指定账号的Cookie")
    
    args = parser.parse_args()
    
    if not PLAYWRIGHT_AVAILABLE:
        logger.error("Playwright not available")
        return 1
    
    # 列出账号
    if args.list_accounts:
        try:
            # 导入账号配置服务
            sys.path.insert(0, str(Path(__file__).parent.parent))
            from services.item_account_config import list_all_item_accounts
            
            accounts = list_all_item_accounts()
            if not accounts:
                logger.info("作品数据账号池为空")
                return 0
            
            logger.info(f"\n========== 作品数据账号列表 (总计{len(accounts)}个) ==========")
            for acc in accounts:
                status_icon = "✅" if acc["status"] == "active" else "❌"
                logger.info(f"{status_icon} {acc['account_id']} - {acc.get('account_name', 'N/A')}")
                logger.info(f"   状态: {acc['status']} | star_id: {acc.get('star_id', 'N/A')}")
                logger.info(f"   Cookie文件: {acc.get('cookie_file', 'N/A')}")
                logger.info("")
            return 0
        except Exception as e:
            logger.error(f"列出账号失败: {e}")
            return 1
    
    # 刷新账号
    if args.refresh_account:
        account_id = args.refresh_account
    else:
        account_id = args.account
    
    # 创建fetcher并登录
    fetcher = ItemCookieFetcher(
        headless=args.headless,
        timeout=args.timeout,
        account_id=account_id
    )
    
    logger.info(f"\n========== 开始获取Cookie: {account_id} ==========")
    success = fetcher.auto_login(args.username, args.password)
    
    if success:
        logger.info(f"\n✅ Cookie 获取成功")
        logger.info(f"账号ID: {account_id}")
        logger.info(f"Cookie文本: {fetcher.cookie_txt_path}")
        logger.info(f"Cookie JSON: {fetcher.cookie_json_path}")
        logger.info(f"Storage State: {fetcher.storage_state_path}")
        if CRYPTO_AVAILABLE:
            logger.info(f"加密文件: {fetcher.encrypted_state_path}")
        logger.info(f"元数据: {fetcher.cookie_meta_path}")
        
        # 更新账号池配置
        try:
            sys.path.insert(0, str(Path(__file__).parent.parent))
            from services.item_account_config import load_item_account_pool
            
            config = load_item_account_pool()
            for account in config.get("accounts", []):
                if account.get("account_id") == account_id:
                    account["status"] = "active"
                    account["last_used_at"] = datetime.now().isoformat()
                    
                    # 读取并更新cookie元数据
                    try:
                        with open(fetcher.cookie_meta_path, "r", encoding="utf-8") as f:
                            meta = json.load(f)
                        account["expires_at"] = meta.get("expires_at")
                        account["cookie_count"] = meta.get("cookie_count", 0)
                    except Exception:
                        pass
                    break
            
            # 保存更新后的配置
            config["updated_at"] = datetime.now().isoformat()
            config_path = os.path.join(COOKIE_CONFIG_DIR, "item_delivery_account_pool.json")
            with open(config_path, "w", encoding="utf-8") as f:
                json.dump(config, f, ensure_ascii=False, indent=2)
            
            logger.info(f"\n✅ 账号池配置已更新")
        except Exception as e:
            logger.warning(f"更新账号池配置失败: {e}")
        
        return 0
    else:
        logger.error(f"\n❌ Cookie 获取失败（详见日志）")
        return 1


if __name__ == "__main__":
    sys.exit(main())
