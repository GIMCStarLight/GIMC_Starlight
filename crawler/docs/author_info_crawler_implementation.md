# 达人信息采集方案设计文档

## 一、方案概述

基于现有`crawler`项目架构，为`get_author_base_info`和`get_author_platform_channel_info_v2`两个API接口实现高效、可复用的采集方案。

### 1.1 接口功能定义

| 接口名称 | 功能说明 | 核心字段 |
|---------|---------|---------|
| `get_author_base_info` | 达人核心基础信息 | 昵称、粉丝数、性别、地区、标签、MCN、价格区间 |
| `get_author_platform_channel_info_v2` | 平台渠道附加信息 | 自我介绍(self_intro) |

### 1.2 设计原则

1. **最大化复用**：充分利用`services/`下的现有组件
2. **配置驱动**：通过配置文件管理Cookie、URL等
3. **分层设计**：遵循项目`adapters/`、`services/`分层
4. **异步友好**：支持批量并发采集

---

## 二、架构设计

### 2.1 目录结构

```
crawler/
├── adapters/
│   └── xingtu/                    # 新增：巨量星图适配器
│       ├── __init__.py
│       ├── base_client.py         # 基础客户端
│       ├── author_client.py       # 达人信息客户端
│       └── endpoints.py           # 端点定义
├── services/                      # 现有服务层（复用）
│   ├── http_client.py            # HTTP客户端
│   ├── config_loader.py          # 配置加载
│   ├── retry_handler.py          # 重试处理
│   └── rate_limiter.py           # 速率限制
├── config/
│   └── xingtu_config.json        # 新增：星图配置
├── entrypoints/
│   └── fetch_author_info.py      # 新增：采集入口
└── tools/
    └── batch_author_fetcher.py   # 新增：批量采集工具
```

---

## 三、核心实现

### 3.1 基础客户端 (`adapters/xingtu/base_client.py`)

```python
"""巨量星图API基础客户端"""

import json
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
import requests

from services.config_loader import read_cookie_file
from services.http_client import create_session
from services.retry_handler import RetryHandler, RetryConfig
from services.rate_limiter import TimeWindowQPSLimiter


class XingtuBaseClient:
    """星图API基础客户端
    
    封装通用请求逻辑：
    - Cookie认证
    - 请求头构建
    - 重试机制
    - 速率限制
    """
    
    BASE_URL = "https://agent.oceanengine.com"
    DEFAULT_TIMEOUT = 20
    
    def __init__(
        self,
        star_id: str,
        cookie: str = None,
        cookie_file: str = None,
        qps: int = 5,
        retry_max: int = 3,
        retry_backoff_ms: int = 1000,
        user_agent: str = None,
    ):
        """初始化客户端
        
        Args:
            star_id: 星图账户ID
            cookie: Cookie字符串（优先使用）
            cookie_file: Cookie文件路径
            qps: 每秒请求数限制
            retry_max: 最大重试次数
            retry_backoff_ms: 重试退避时间(ms)
            user_agent: 自定义UA
        """
        self.star_id = star_id
        
        # 加载Cookie
        if cookie:
            self.cookie = cookie
        elif cookie_file:
            self.cookie = read_cookie_file(cookie_file)
        else:
            raise ValueError("必须提供 cookie 或 cookie_file")
        
        # 初始化Session
        self.session = create_session()
        
        # 默认UA
        self.user_agent = user_agent or (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/140.0.0.0 Safari/537.36"
        )
        
        # 初始化限流器
        self.limiter = TimeWindowQPSLimiter(qps=qps, window_ms=1000)
        
        # 初始化重试处理器
        retry_config = RetryConfig(
            retry_max=retry_max,
            retry_backoff_ms=retry_backoff_ms,
            cooldown_on_429_403_ms=3000,  # 429/403冷却3秒
        )
        self.retry_handler = RetryHandler(
            config=retry_config,
            limiter=self.limiter,
        )
    
    def _build_headers(self, referer: str = None) -> Dict[str, str]:
        """构建请求头
        
        Args:
            referer: 自定义Referer
            
        Returns:
            请求头字典
        """
        return {
            "Cookie": self.cookie,
            "User-Agent": self.user_agent,
            "Referer": referer or f"{self.BASE_URL}/admin/star-agent/vue2/market",
            "Accept": "application/json, text/plain, */*",
            "Accept-Encoding": "gzip, deflate, br",
            "Connection": "keep-alive",
            # 星图特有头
            "x-tt-possess-star-id": str(self.star_id),
            "x-login-source": "1",
            "x-tt-possess-scene": "2",
            "agw-js-conv": "str",
            # Chromium安全头
            "sec-ch-ua-platform": '"macOS"',
            "sec-ch-ua": '"Not=A?Brand";v="24", "Chromium";v="140"',
            "sec-ch-ua-mobile": "?0",
        }
    
    def _request_get(
        self,
        endpoint: str,
        params: Dict[str, Any] = None,
        referer: str = None,
    ) -> Tuple[int, Optional[str], Dict[str, Any]]:
        """执行GET请求（带重试）
        
        Args:
            endpoint: API端点（如 /get_author_base_info）
            params: 查询参数
            referer: 自定义Referer
            
        Returns:
            (status_code, x_tt_agw_login, response_data)
        """
        url = f"{self.BASE_URL}{endpoint}"
        headers = self._build_headers(referer)
        
        def _do_request(h, p):
            """实际请求函数"""
            # 限流
            self.limiter.acquire()
            
            # 发起请求
            resp = self.session.get(
                url,
                headers=h,
                params=params,
                timeout=self.DEFAULT_TIMEOUT,
            )
            
            status = resp.status_code
            agw_login = resp.headers.get("x-tt-agw-login")
            
            try:
                data = resp.json()
            except Exception:
                data = {"raw": resp.text}
            
            return status, agw_login, data
        
        # 通过重试处理器执行
        return self.retry_handler.execute_with_retry(
            request_fn=_do_request,
            headers=headers,
            payload={},  # GET请求无payload
        )
    
    def check_response(self, response: Dict[str, Any]) -> bool:
        """检查响应是否成功
        
        Args:
            response: API响应数据
            
        Returns:
            是否成功
        """
        base_resp = response.get("base_resp", {})
        status_code = base_resp.get("status_code")
        return status_code == 0
```

---

### 3.2 达人信息客户端 (`adapters/xingtu/author_client.py`)

```python
"""达人信息采集客户端"""

from typing import Dict, Any, Optional, List
from .base_client import XingtuBaseClient


class AuthorInfoClient(XingtuBaseClient):
    """达人信息采集客户端
    
    封装达人相关API：
    - get_author_base_info
    - get_author_platform_channel_info_v2
    - 数据合并与清洗
    """
    
    def get_base_info(
        self,
        author_id: str,
        platform_source: int = 1,
        platform_channel: int = 1,
        recommend: bool = True,
        need_sec_uid: bool = True,
        need_linkage_info: bool = True,
    ) -> Dict[str, Any]:
        """获取达人基础信息
        
        Args:
            author_id: 达人ID
            platform_source: 平台来源(1=抖音,2=快手)
            platform_channel: 平台渠道(1=通用,21=星图)
            recommend: 是否返回推荐信息
            need_sec_uid: 是否返回sec_uid
            need_linkage_info: 是否返回联动信息
            
        Returns:
            达人基础信息字典
            
        示例:
            >>> client = AuthorInfoClient(star_id="xxx", cookie="...")
            >>> info = client.get_base_info("6629722292110753806")
            >>> print(info['nick_name'], info['follower'])
        """
        params = {
            "o_author_id": author_id,
            "platform_source": platform_source,
            "platform_channel": platform_channel,
            "recommend": str(recommend).lower(),
            "need_sec_uid": str(need_sec_uid).lower(),
            "need_linkage_info": str(need_linkage_info).lower(),
        }
        
        status, agw_login, data = self._request_get(
            endpoint="/get_author_base_info",
            params=params,
        )
        
        if status != 200:
            raise Exception(f"请求失败: status={status}, agw_login={agw_login}")
        
        if not self.check_response(data):
            base_resp = data.get("base_resp", {})
            raise Exception(
                f"API返回错误: code={base_resp.get('status_code')}, "
                f"msg={base_resp.get('status_message')}"
            )
        
        return data
    
    def get_platform_channel_info(
        self,
        author_id: str,
        platform_source: int = 1,
        platform_channel: int = 1,
    ) -> Dict[str, Any]:
        """获取平台渠道信息（自我介绍等）
        
        Args:
            author_id: 达人ID
            platform_source: 平台来源
            platform_channel: 平台渠道
            
        Returns:
            平台渠道信息字典
            
        示例:
            >>> info = client.get_platform_channel_info("6629722292110753806")
            >>> print(info['self_intro'])
        """
        params = {
            "o_author_id": author_id,
            "platform_source": platform_source,
            "platform_channel": platform_channel,
        }
        
        status, agw_login, data = self._request_get(
            endpoint="/get_author_platform_channel_info_v2",
            params=params,
        )
        
        if status != 200:
            raise Exception(f"请求失败: status={status}")
        
        if not self.check_response(data):
            raise Exception(f"API返回错误: {data.get('base_resp')}")
        
        return data
    
    def get_complete_info(
        self,
        author_id: str,
        platform_source: int = 1,
        platform_channel: int = 1,
    ) -> Dict[str, Any]:
        """获取达人完整信息（合并两个接口）
        
        Args:
            author_id: 达人ID
            platform_source: 平台来源
            platform_channel: 平台渠道
            
        Returns:
            合并后的完整信息字典
            
        示例:
            >>> info = client.get_complete_info("6629722292110753806")
            >>> print({
            ...     "nick_name": info['nick_name'],
            ...     "follower": info['follower'],
            ...     "self_intro": info['self_intro'],
            ... })
        """
        # 获取基础信息
        base_info = self.get_base_info(
            author_id=author_id,
            platform_source=platform_source,
            platform_channel=platform_channel,
        )
        
        # 获取平台渠道信息
        try:
            channel_info = self.get_platform_channel_info(
                author_id=author_id,
                platform_source=platform_source,
                platform_channel=platform_channel,
            )
            # 合并self_intro
            base_info['self_intro'] = channel_info.get('self_intro', '')
        except Exception as e:
            # 可选接口失败不影响主流程
            print(f"[warn] 获取平台渠道信息失败: {e}")
            base_info['self_intro'] = ''
        
        return base_info
    
    def extract_essential_fields(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """提取核心字段（数据清洗）
        
        Args:
            raw_data: 原始API响应
            
        Returns:
            清洗后的数据字典
        """
        return {
            # 基本信息
            "author_id": raw_data.get("id"),
            "nick_name": raw_data.get("nick_name"),
            "avatar_uri": raw_data.get("avatar_uri"),
            "unique_id": raw_data.get("unique_id"),
            "sec_uid": raw_data.get("sec_uid"),
            
            # 统计数据
            "follower": raw_data.get("follower"),
            "gender": raw_data.get("gender"),
            
            # 地理信息
            "province": raw_data.get("province"),
            "city": raw_data.get("city"),
            
            # 分类标签
            "category_id": raw_data.get("category_id"),
            "tags": raw_data.get("tags"),
            "tags_level_two": raw_data.get("tags_level_two"),
            "content_theme_labels": raw_data.get("content_theme_labels", []),
            
            # 商业信息
            "mcn_name": raw_data.get("mcn_name", ""),
            "lowest_price": raw_data.get("lowest_price"),
            "is_star": raw_data.get("is_star"),
            "e_commerce_enable": raw_data.get("e_commerce_enable"),
            
            # 附加信息
            "self_intro": raw_data.get("self_intro", ""),
            "platform": raw_data.get("platform", []),
            "platform_channel": raw_data.get("platform_channel", []),
        }
```

---

### 3.3 端点配置 (`adapters/xingtu/endpoints.py`)

```python
"""星图API端点定义"""

class XingtuEndpoints:
    """端点常量"""
    
    # 达人基础信息
    GET_AUTHOR_BASE_INFO = "/get_author_base_info"
    GET_AUTHOR_PLATFORM_CHANNEL_INFO_V2 = "/get_author_platform_channel_info_v2"
    GET_AUTHOR_SIDE_BASE_INFO = "/get_author_side_base_info"
    
    # 达人名片
    AUTHOR_GET_BUSINESS_CARD_INFO = "/author_get_business_card_info"
    
    # 链接指数
    GET_AUTHOR_LINK_INFO = "/get_author_link_info"
    AUTHOR_LINK_STRUCT = "/author_link_struct"
    
    # 内容数据
    GET_AUTHOR_HOMEPAGE_VIDEOS = "/get_author_homepage_videos"
    GET_AUTHOR_SHOW_ITEMS_V2 = "/get_author_show_items_v2"


class PlatformSource:
    """平台来源枚举"""
    DOUYIN = 1   # 抖音
    KUAISHOU = 2 # 快手


class PlatformChannel:
    """平台渠道枚举"""
    COMMON = 1          # 通用渠道
    SHOP_FOLLOW = 2     # 小店随心推
    QIANCHUAN = 3       # 千川
    GIANT_ENGINE = 10   # 巨量引擎
    XINGTU = 21         # 星图
```

---

## 四、使用示例

### 4.1 单个达人采集 (`entrypoints/fetch_author_info.py`)

```python
#!/usr/bin/env python3
"""达人信息采集入口脚本"""

import json
import sys
from pathlib import Path

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from adapters.xingtu.author_client import AuthorInfoClient
from services.logging_utils import get_json_logger


def main():
    """单个达人采集示例"""
    
    # 初始化日志
    logger = get_json_logger("fetch_author_info")
    
    # 配置
    STAR_ID = "1843934177451019"
    COOKIE_FILE = "config/cookies.txt"
    AUTHOR_ID = "6629722292110753806"  # 陈翔六点半
    
    try:
        # 初始化客户端
        client = AuthorInfoClient(
            star_id=STAR_ID,
            cookie_file=COOKIE_FILE,
            qps=5,
            retry_max=3,
        )
        
        print(f"正在采集达人: {AUTHOR_ID}")
        
        # 方式1: 仅获取基础信息
        base_info = client.get_base_info(AUTHOR_ID)
        print(f"✓ 基础信息: {base_info['nick_name']}, 粉丝{base_info['follower']}")
        
        # 方式2: 获取完整信息（含自我介绍）
        complete_info = client.get_complete_info(AUTHOR_ID)
        
        # 方式3: 提取核心字段
        essential = client.extract_essential_fields(complete_info)
        
        # 保存结果
        output_file = f"results/author_{AUTHOR_ID}.json"
        Path("results").mkdir(exist_ok=True)
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(essential, f, ensure_ascii=False, indent=2)
        
        print(f"✓ 结果已保存: {output_file}")
        
        # 打印关键信息
        print("\n=== 达人信息 ===")
        print(f"昵称: {essential['nick_name']}")
        print(f"粉丝数: {essential['follower']:,}")
        print(f"MCN: {essential['mcn_name'] or '无'}")
        print(f"地区: {essential['province']}-{essential['city']}")
        print(f"标签: {essential['tags']}")
        print(f"自我介绍: {essential['self_intro'][:50]}...")
        
    except Exception as e:
        logger.error(f"采集失败: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
```

**运行**:
```bash
cd /Users/samuel/Desktop/系统开发/crawler
python entrypoints/fetch_author_info.py
```

---

### 4.2 批量采集 (`tools/batch_author_fetcher.py`)

```python
#!/usr/bin/env python3
"""批量达人信息采集工具"""

import json
import time
from pathlib import Path
from typing import List, Dict, Any
from concurrent.futures import ThreadPoolExecutor, as_completed

from adapters.xingtu.author_client import AuthorInfoClient
from services.logging_utils import get_json_logger


class BatchAuthorFetcher:
    """批量达人采集器"""
    
    def __init__(
        self,
        star_id: str,
        cookie_file: str,
        output_dir: str = "results/batch_authors",
        max_workers: int = 3,
        qps_per_worker: int = 2,
    ):
        """初始化批量采集器
        
        Args:
            star_id: 星图ID
            cookie_file: Cookie文件路径
            output_dir: 输出目录
            max_workers: 并发线程数
            qps_per_worker: 每线程QPS限制
        """
        self.star_id = star_id
        self.cookie_file = cookie_file
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.max_workers = max_workers
        self.qps_per_worker = qps_per_worker
        self.logger = get_json_logger("batch_fetcher")
    
    def _fetch_one(self, author_id: str) -> Dict[str, Any]:
        """采集单个达人"""
        client = AuthorInfoClient(
            star_id=self.star_id,
            cookie_file=self.cookie_file,
            qps=self.qps_per_worker,
        )
        
        try:
            info = client.get_complete_info(author_id)
            essential = client.extract_essential_fields(info)
            
            # 保存
            output_file = self.output_dir / f"{author_id}.json"
            with open(output_file, "w", encoding="utf-8") as f:
                json.dump(essential, f, ensure_ascii=False, indent=2)
            
            self.logger.info(f"✓ {author_id} - {essential['nick_name']}")
            return {"author_id": author_id, "status": "success", "data": essential}
            
        except Exception as e:
            self.logger.error(f"✗ {author_id} 失败: {e}")
            return {"author_id": author_id, "status": "failed", "error": str(e)}
    
    def fetch_batch(self, author_ids: List[str]) -> Dict[str, Any]:
        """批量采集
        
        Args:
            author_ids: 达人ID列表
            
        Returns:
            采集结果统计
        """
        results = {"success": [], "failed": []}
        
        print(f"开始批量采集 {len(author_ids)} 个达人...")
        print(f"并发数: {self.max_workers}, 单线程QPS: {self.qps_per_worker}")
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {
                executor.submit(self._fetch_one, aid): aid
                for aid in author_ids
            }
            
            for future in as_completed(futures):
                result = future.result()
                if result['status'] == 'success':
                    results['success'].append(result)
                else:
                    results['failed'].append(result)
        
        # 保存汇总报告
        summary_file = self.output_dir / "summary.json"
        with open(summary_file, "w", encoding="utf-8") as f:
            json.dump({
                "total": len(author_ids),
                "success_count": len(results['success']),
                "failed_count": len(results['failed']),
                "failed_ids": [r['author_id'] for r in results['failed']],
            }, f, ensure_ascii=False, indent=2)
        
        print(f"\n采集完成: 成功{len(results['success'])}, 失败{len(results['failed'])}")
        print(f"汇总报告: {summary_file}")
        
        return results


def main():
    """批量采集示例"""
    
    # 配置
    STAR_ID = "1843934177451019"
    COOKIE_FILE = "config/cookies.txt"
    
    # 达人ID列表（示例）
    author_ids = [
        "6629722292110753806",  # 陈翔六点半
        "MS4wLjABAAAAxxx",      # 其他达人
        # ... 更多ID
    ]
    
    # 初始化批量采集器
    fetcher = BatchAuthorFetcher(
        star_id=STAR_ID,
        cookie_file=COOKIE_FILE,
        max_workers=3,          # 3个并发
        qps_per_worker=2,       # 每个线程2 QPS
    )
    
    # 执行采集
    results = fetcher.fetch_batch(author_ids)
    
    # 失败重试
    if results['failed']:
        print("\n开始重试失败项...")
        retry_ids = [r['author_id'] for r in results['failed']]
        fetcher.fetch_batch(retry_ids)


if __name__ == "__main__":
    main()
```

**运行**:
```bash
python tools/batch_author_fetcher.py
```

---

## 五、配置文件

### 5.1 星图配置 (`config/xingtu_config.json`)

```json
{
  "star_id": "1843934177451019",
  "base_url": "https://agent.oceanengine.com",
  "cookie_file": "config/cookies.txt",
  "qps": 5,
  "retry_max": 3,
  "retry_backoff_ms": 1000,
  "timeout": 20,
  "platform_defaults": {
    "platform_source": 1,
    "platform_channel": 1
  },
  "batch_fetch": {
    "max_workers": 3,
    "qps_per_worker": 2,
    "output_dir": "results/batch_authors"
  }
}
```

---

## 六、数据存储建议

### 6.1 文件存储结构

```
results/
├── batch_authors/              # 批量采集结果
│   ├── 6629722292110753806.json
│   ├── 6556303280.json
│   └── summary.json
└── single/                     # 单次采集
    └── author_6629722292110753806.json
```

### 6.2 PostgreSQL存储

```sql
-- 达人基础信息表
CREATE TABLE xingtu_authors (
    id BIGSERIAL PRIMARY KEY,
    author_id VARCHAR(64) UNIQUE NOT NULL,
    nick_name VARCHAR(255),
    avatar_uri TEXT,
    unique_id VARCHAR(128),
    sec_uid VARCHAR(255),
    
    -- 统计数据
    follower BIGINT,
    gender SMALLINT,
    
    -- 地理信息
    province VARCHAR(64),
    city VARCHAR(64),
    
    -- 分类标签
    category_id VARCHAR(32),
    tags JSONB,
    tags_level_two JSONB,
    content_theme_labels JSONB,
    
    -- 商业信息
    mcn_name VARCHAR(255),
    lowest_price INTEGER,
    is_star BOOLEAN,
    e_commerce_enable BOOLEAN,
    
    -- 附加信息
    self_intro TEXT,
    platform JSONB,
    platform_channel JSONB,
    
    -- 元数据
    raw_data JSONB,
    fetched_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_author_id ON xingtu_authors(author_id);
CREATE INDEX idx_nick_name ON xingtu_authors(nick_name);
CREATE INDEX idx_follower ON xingtu_authors(follower DESC);
```

**入库示例**:
```python
import psycopg2
from psycopg2.extras import Json

def save_to_postgres(author_data: dict):
    conn = psycopg2.connect("dbname=crawler user=postgres")
    cur = conn.cursor()
    
    cur.execute("""
        INSERT INTO xingtu_authors (
            author_id, nick_name, follower, mcn_name, 
            tags, self_intro, raw_data
        ) VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (author_id) 
        DO UPDATE SET 
            follower = EXCLUDED.follower,
            updated_at = NOW()
    """, (
        author_data['author_id'],
        author_data['nick_name'],
        author_data['follower'],
        author_data['mcn_name'],
        Json(author_data['tags']),
        author_data['self_intro'],
        Json(author_data),
    ))
    
    conn.commit()
    cur.close()
    conn.close()
```

---

## 七、集成到现有工具链

### 7.1 与后端API集成

参考现有 `batch-sync-all-douyin-kols.ts`，可新增Python版本：

```python
"""同步达人信息到后端API"""

import requests
from adapters.xingtu.author_client import AuthorInfoClient


def sync_to_backend(author_data: dict):
    """同步到后端/api/v3/kol-platform-data/sync-douyin"""
    
    backend_url = "http://localhost:3001/api/v3/kol-platform-data/sync-douyin"
    
    payload = {
        "platformAuthorId": author_data['author_id'],
        "nickname": author_data['nick_name'],
        "avatar": author_data['avatar_uri'],
        "fansCount": author_data['follower'],
        "uniqueId": author_data['unique_id'],
        "tags": author_data['tags'],
        "province": author_data['province'],
        "city": author_data['city'],
        # ... 更多字段映射
    }
    
    resp = requests.post(backend_url, json=payload)
    resp.raise_for_status()
    return resp.json()
```

---

## 八、注意事项

### 8.1 反爬策略

1. **QPS控制**: 建议单账号 5 QPS以内
2. **并发限制**: 不超过3个线程
3. **Cookie轮换**: 大批量采集建议多账号轮换
4. **User-Agent**: 定期更新模拟真实浏览器

### 8.2 异常处理

```python
# 捕获常见错误
try:
    info = client.get_base_info(author_id)
except requests.exceptions.Timeout:
    # 超时重试
    pass
except requests.exceptions.HTTPError as e:
    if e.response.status_code == 401:
        # Cookie失效，需要重新登录
        pass
    elif e.response.status_code == 429:
        # 触发限流，暂停采集
        time.sleep(60)
except Exception as e:
    # 记录错误日志
    logger.error(f"未知错误: {e}", exc_info=True)
```

### 8.3 监控指标

```python
from services.metrics import record_request, observe_latency_ms

# 在retry_handler中自动记录
# - 请求成功率
# - 平均延迟
# - QPS统计
```

---

## 九、扩展性设计

### 9.1 新增接口只需3步

1. **在`endpoints.py`添加端点**
```python
GET_AUTHOR_LINK_INFO = "/get_author_link_info"
```

2. **在`AuthorInfoClient`添加方法**
```python
def get_link_info(self, author_id: str):
    return self._request_get(
        endpoint=XingtuEndpoints.GET_AUTHOR_LINK_INFO,
        params={"o_author_id": author_id}
    )
```

3. **调用**
```python
link_info = client.get_link_info("123456")
```

### 9.2 支持其他平台

```python
# 快手平台
from adapters.kuaishou.author_client import KuaishouAuthorClient

client = KuaishouAuthorClient(...)
info = client.get_base_info(author_id)
```

---

## 十、总结

### 10.1 优势

- ✅ 复用现有服务组件（`services/`）
- ✅ 清晰的分层架构（`adapters/`、`services/`）
- ✅ 配置驱动，易于维护
- ✅ 支持并发采集
- ✅ 完善的异常处理和重试机制
- ✅ 扩展性强，新增接口成本低

### 10.2 下一步

1. 实现基础客户端和达人客户端
2. 编写单元测试
3. 集成到CI/CD流程
4. 补充更多API接口
5. 优化性能（连接池、异步IO）

---

## 附录A：完整文件清单

```
crawler/
├── adapters/xingtu/
│   ├── __init__.py              # 新增 50行
│   ├── base_client.py           # 新增 150行
│   ├── author_client.py         # 新增 180行
│   └── endpoints.py             # 新增 30行
├── config/
│   └── xingtu_config.json       # 新增 20行
├── entrypoints/
│   └── fetch_author_info.py     # 新增 80行
├── tools/
│   └── batch_author_fetcher.py  # 新增 150行
└── docs/
    └── author_info_crawler_implementation.md  # 本文档
```

**总计新增代码**: ~660行  
**复用现有代码**: ~2000行（services/）
