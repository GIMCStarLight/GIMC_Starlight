# Cookie自动化管理模块

## 📖 模块概述

这是一个专为**巨量引擎/星图平台**设计的智能Cookie自动化管理工具，支持多账号管理、自动登录、Cookie刷新、代理IP轮换等功能。主要解决爬虫开发中频繁需要手动登录获取Cookie的痛点。

### 核心功能

1. **自动登录获取Cookie** - 模拟真人操作自动完成登录流程
2. **多账号池管理** - 管理多个账号，支持轮换使用
3. **Cookie有效性检测** - 自动检测Cookie是否过期
4. **代理IP支持** - 支持快代理、豌豆HTTP等代理服务商
5. **反指纹检测** - 注入指纹脚本，降低被检测为机器人的风险
6. **加密存储** - Cookie数据加密保存，提升安全性

---

## 🏗️ 模块架构

```
tools/
├── auto_cookie_fetcher.py          # 主程序：登录自动化、Cookie管理
└── account_manager/                # 账号池和代理管理模块
    ├── __init__.py                 # 模块导出
    ├── cookie_account_pool.py      # 账号池管理
    ├── cookie_proxy_provider.py    # 代理IP管理
    └── config/                     # 配置和数据目录
        ├── account_pool.json       # 账号池配置
        ├── proxy_config.json       # 代理配置
        └── accounts/               # 各账号的Cookie存储
            ├── account_1/
            │   ├── cookies.json    # Cookie数据
            │   ├── storage_state.json
            │   └── browser_profile/
            ├── account_2/
            └── account_3/
```

---

## 🚀 快速开始

### 1. 环境要求

```bash
# Python 3.8+
pip install playwright cryptography httpx pydantic filelock

# 安装浏览器驱动
playwright install chromium
```

### 2. 基础使用

#### 场景1：单账号模式（最简单）

```bash
# 交互式登录（手动在浏览器中操作）
python auto_cookie_fetcher.py --interactive

# 半自动登录（自动填写账号密码，遇验证码需手动处理）
python auto_cookie_fetcher.py -u your_username -p your_password

# 检查Cookie是否有效
python auto_cookie_fetcher.py --check
```

#### 场景2：多账号管理

```bash
# 1. 添加账号（保存账号配置）
python auto_cookie_fetcher.py --add-account account_1 \
    --account-name "主账号" \
    -u username -p password

# 2. 刷新账号Cookie（执行登录）
python auto_cookie_fetcher.py --refresh-account account_1

# 3. 查看所有账号
python auto_cookie_fetcher.py --list-accounts

# 4. 检查所有账号Cookie有效性
python auto_cookie_fetcher.py --check-all

# 5. 批量刷新所有账号
python auto_cookie_fetcher.py --refresh-all

# 6. 获取一个可用账号
python auto_cookie_fetcher.py --get-available --strategy least_used
```

---

## 💡 核心概念

### 1. 账号池（Account Pool）

账号池用于管理多个登录账号，每个账号包含：

- **账号ID** - 唯一标识符
- **账号名称** - 便于识别的备注名
- **登录凭证** - 用户名/密码（加密存储）
- **Cookie数据** - 登录后的Cookie
- **状态信息** - active/expired/error/locked
- **使用统计** - 使用次数、最后使用时间、过期时间

**数据结构示例：**

```json
{
  "account_id": "account_1",
  "account_name": "主账号",
  "username": "user@example.com",
  "password": "加密后的密码",
  "status": "active",
  "cookie_count": 15,
  "use_count": 42,
  "expires_at": "2025-11-26T16:00:00",
  "created_at": "2025-11-19T10:00:00"
}
```

### 2. 账号轮换策略

支持4种轮换策略，自动选择最优账号：

| 策略 | 说明 | 适用场景 |
|------|------|----------|
| `sequential` | 按顺序轮流使用 | 平均分配流量 |
| `random` | 随机选择 | 模拟真实用户 |
| `least_used` | 优先使用最少的 | 均衡账号使用 |
| `longest_valid` | 优先用有效期最长的 | 减少刷新频率 |

**使用示例：**

```bash
python auto_cookie_fetcher.py --get-available --strategy least_used
```

### 3. 工作流程

```
┌─────────────────┐
│  添加账号配置    │  python auto_cookie_fetcher.py --add-account account_1 -u user -p pass
└────────┬────────┘
         ▼
┌─────────────────┐
│  刷新Cookie     │  python auto_cookie_fetcher.py --refresh-account account_1
│  (执行登录)     │  ├─ 打开浏览器
└────────┬────────┘  ├─ 自动填写账号密码
         │           ├─ 等待登录成功
         │           └─ 保存Cookie/storage_state
         ▼
┌─────────────────┐
│ Cookie已保存    │  存储位置：account_manager/config/accounts/account_1/
│                 │  ├─ cookies.json
│                 │  ├─ storage_state.json
└────────┬────────┘  └─ cookie_meta.json
         ▼
┌─────────────────┐
│  使用Cookie     │  在爬虫中加载Cookie访问目标网站
└─────────────────┘
```

---

## 📚 详细功能说明

### 1. 添加账号

**命令：**
```bash
python auto_cookie_fetcher.py --add-account <账号ID> \
    --account-name "账号备注" \
    -u <用户名> \
    -p <密码>
```

**说明：**
- 只保存账号配置，**不会立即登录**
- 用户名和密码会**加密存储**在 `account_pool.json` 中
- 如果不提供 `-u -p`，后续刷新时需要手动登录

**示例：**
```bash
python auto_cookie_fetcher.py --add-account account_1 \
    --account-name "主账号" \
    -u wanzhea@example.com \
    -p 'MyPassword123!'
```

> 💡 **提示**：密码中包含特殊字符时用单引号包裹

### 2. 刷新Cookie

**命令：**
```bash
# 使用保存的账号密码自动登录
python auto_cookie_fetcher.py --refresh-account account_1

# 临时使用其他账号密码
python auto_cookie_fetcher.py --refresh-account account_1 -u user2 -p pass2
```

**登录过程：**
1. 打开Chromium浏览器（非无头模式，可见窗口）
2. 访问登录页面
3. 自动填写账号密码
4. 等待登录成功（如遇验证码需手动处理）
5. 保存Cookie和完整登录状态

**密码来源优先级：**
1. 命令行参数 `-u -p`（最高）
2. 配置文件中保存的账号密码
3. 交互模式手动登录（最低）

### 3. 查看账号列表

**命令：**
```bash
python auto_cookie_fetcher.py --list-accounts
```

**输出示例：**
```
========== 账号列表 (总计3个) ==========
✅ account_1 - 主账号
   状态: active | Cookie数: 15 | 使用次数: 42
   过期时间: 2025-11-26T16:00:00 | 代理: 无

❌ account_2 - 备用账号
   状态: expired | Cookie数: 12 | 使用次数: 18
   过期时间: 2025-11-19T10:00:00 | 代理: 无

统计: 可用1个 / 总计3个
```

### 4. 检查Cookie有效性

**单个账号：**
```bash
python auto_cookie_fetcher.py --check
```

**所有账号：**
```bash
python auto_cookie_fetcher.py --check-all
```

**检测原理：**
1. 使用保存的Cookie访问目标页面
2. 检查是否被重定向到登录页
3. 检查页面中是否存在用户信息元素
4. 检查认证Cookie数量

### 5. 批量刷新

**命令：**
```bash
python auto_cookie_fetcher.py --refresh-all
```

**说明：**
- 自动遍历所有账号
- 跳过未配置密码的账号
- 使用保存的账号密码自动登录
- 输出刷新成功/失败统计

### 6. 获取可用账号

**命令：**
```bash
python auto_cookie_fetcher.py --get-available --strategy least_used
```

**输出：**
```
选中账号: account_1 (主账号)
Cookie路径: /path/to/account_1/cookies.json
Storage State: /path/to/account_1/storage_state.json
```

**在爬虫中使用：**
```python
import json

# 加载Cookie
with open('/path/to/account_1/cookies.json', 'r') as f:
    cookie_data = json.load(f)
    cookies = cookie_data['cookies']

# 使用requests
import requests
session = requests.Session()
for cookie in cookies:
    session.cookies.set(cookie['name'], cookie['value'], domain=cookie['domain'])

# 使用playwright
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser = p.chromium.launch()
    context = browser.new_context(storage_state='/path/to/account_1/storage_state.json')
    page = context.new_page()
    page.goto('https://target-website.com')
```

---

## 🔐 安全特性

### 1. 密码加密

使用 **XOR + Base64** 对密码进行加密存储：

```python
# 存储在 account_pool.json 中
{
  "username": "user@example.com",
  "password": "NwocHxkENRZFUVs="  # 加密后的密码
}
```

> ⚠️ **注意**：这是简单混淆，不是安全加密。建议配置文件权限设置为 `600`

### 2. Cookie加密

使用 `cryptography.fernet` 加密Cookie数据：

```bash
# 保存时自动加密
storage_state.json      # 明文（方便调试）
storage_state.enc       # 加密版本
.cookie_key             # 加密密钥（权限600）
```

### 3. 反指纹检测

注入JavaScript脚本，修改浏览器指纹：

- **navigator.webdriver** - 隐藏自动化特征
- **Canvas指纹** - 添加基于seed的可复现噪声
- **WebGL指纹** - 固定vendor/renderer信息
- **硬件信息** - 随机化但保持一致的硬件参数
- **WebRTC** - 防止IP泄露

---

## 🌐 代理支持

### 1. 初始化代理配置

```bash
python auto_cookie_fetcher.py --init-proxy-config
```

生成 `proxy_config.json` 模板：

```json
{
  "enable_proxy": true,
  "provider": "kuaidaili",
  "kuaidaili": {
    "api_url": "https://dps.kdlapi.com/api/getdps",
    "secret_id": "your_secret_id",
    "signature": "your_signature"
  },
  "custom": {
    "proxies": [
      "http://proxy1.com:8080",
      "http://user:pass@proxy2.com:8080"
    ]
  }
}
```

### 2. 使用代理刷新账号

```bash
python auto_cookie_fetcher.py --refresh-account account_1 --enable-proxy
```

### 3. 支持的代理提供商

| 提供商 | 配置字段 | 说明 |
|--------|----------|------|
| 快代理 | `kuaidaili` | 需要API密钥 |
| 豌豆HTTP | `wandouhttp` | 需要API密钥 |
| 自定义 | `custom.proxies` | 代理URL列表 |

---

## 📂 文件结构说明

```
account_manager/config/
├── account_pool.json           # 账号池配置（核心）
│   └── 保存所有账号的配置和凭证
│
├── proxy_config.json           # 代理配置
│   └── 代理服务商API密钥和配置
│
├── accounts/                   # 账号数据目录
│   ├── account_1/
│   │   ├── cookies.json        # Cookie列表（JSON格式）
│   │   ├── cookies.txt         # Cookie字符串（请求头格式）
│   │   ├── storage_state.json  # 完整登录状态（包含localStorage）
│   │   ├── storage_state.enc   # 加密的登录状态
│   │   ├── cookie_meta.json    # Cookie元数据（过期时间等）
│   │   ├── .cookie_key         # 加密密钥
│   │   └── browser_profile/    # 浏览器Profile（保持指纹一致性）
│   ├── account_2/
│   └── account_3/
│
├── browser_profile/            # 单账号模式的浏览器Profile
├── cookies.json                # 单账号模式的Cookie
└── storage_state.json          # 单账号模式的登录状态
```

**关键文件说明：**

| 文件 | 用途 | 何时使用 |
|------|------|----------|
| `cookies.json` | Cookie列表 | 用requests等库发送请求 |
| `storage_state.json` | 完整登录状态 | 用playwright加载完整会话 |
| `cookie_meta.json` | 元数据 | 检查过期时间 |
| `browser_profile/` | 浏览器Profile | 保持指纹一致性，避免重复登录 |

---

## 🛠️ 高级用法

### 1. 自定义登录URL

修改 `auto_cookie_fetcher.py` 中的常量：

```python
LOGIN_URL = "https://your-login-page.com/login"
TARGET_URL = "https://your-target-page.com/dashboard"
```

### 2. 调整登录等待时间

```python
# 普通登录等待300秒
wait_time = 300

# 遇到验证码等待600秒
wait_time = 600 if has_critical_security else 300
```

### 3. 在Python中使用账号池

```python
from account_manager import AccountPool, RotationStrategy

# 初始化账号池
pool = AccountPool(
    pool_config_path="account_manager/config/account_pool.json",
    accounts_dir="account_manager/config/accounts"
)

# 获取可用账号
account = pool.select_account(strategy=RotationStrategy.LEAST_USED)

if account:
    print(f"选中账号: {account.account_id}")
    
    # 加载Cookie
    cookie_path = f"account_manager/config/accounts/{account.account_id}/cookies.json"
    
    # 更新使用统计
    account.update_last_used()
    pool.update_account(account)
```

### 4. 监控账号健康

```python
# 检查所有账号
stats = pool.get_statistics()
print(f"可用账号: {stats['available_accounts']}/{stats['total_accounts']}")

# 获取即将过期的账号
accounts = pool.list_accounts(show_all=True)
for acc in accounts:
    if acc['status'] == 'active':
        print(f"{acc['account_id']}: 过期时间 {acc['expires_at']}")
```

---

## 🔧 故障排查

### 问题1：登录超时

**现象：** `登录等待超时 (300 秒)`

**解决方案：**
1. 检查网络连接
2. 确认登录URL是否正确
3. 手动检查是否有复杂验证码
4. 增加等待时间（修改代码中的 `max_wait` 参数）

### 问题2：Cookie失效

**现象：** `被重定向到登录页，Cookie 无效`

**解决方案：**
```bash
# 重新刷新Cookie
python auto_cookie_fetcher.py --refresh-account account_1
```

### 问题3：密码包含特殊字符

**现象：** Shell提示 `dquote>`

**解决方案：**
```bash
# 使用单引号包裹密码
python auto_cookie_fetcher.py --add-account account_1 -p 'Password123!'
```

### 问题4：账号被锁定

**现象：** 账号状态变为 `locked` 或 `frozen`

**解决方案：**
1. 检查是否频繁登录触发风控
2. 使用代理IP分散请求
3. 增加账号数量，降低单账号使用频率

---

## 📊 使用建议

### 1. 账号管理策略

- **3-5个账号** - 小型项目
- **10-20个账号** - 中型项目
- **50+账号** - 大型项目

### 2. Cookie刷新频率

```bash
# 定时任务（crontab）
# 每天凌晨2点检查并刷新过期Cookie
0 2 * * * cd /path/to/crawler && python auto_cookie_fetcher.py --check-all && python auto_cookie_fetcher.py --refresh-all
```

### 3. 代理使用建议

- **低频爬虫** - 不需要代理
- **中频爬虫** - 使用账号轮换
- **高频爬虫** - 账号+代理双重轮换

---

## ⚠️ 注意事项

1. **遵守目标网站服务条款** - 合理使用，避免过度请求
2. **保护账号安全** - 配置文件权限设为 `600`
3. **验证码处理** - 遇到验证码需手动处理
4. **浏览器资源** - 刷新时会打开浏览器窗口，确保有图形界面
5. **并发控制** - 使用 `filelock` 防止多进程同时使用同一账号

---

## 📝 开发者信息

**适用场景：** 需要频繁登录获取Cookie的爬虫项目

**技术栈：**
- `playwright` - 浏览器自动化
- `pydantic` - 数据验证
- `cryptography` - 加密存储
- `httpx` - 代理HTTP请求
- `filelock` - 并发控制

**版本历史：**
- v1.0 - 基础Cookie获取功能
- v2.0 - 多账号池支持
- v3.0 - 代理IP支持、反指纹增强

---

## 🤝 贡献

欢迎提交Issue和Pull Request！

**改进方向：**
- [ ] 支持更多平台（抖音、快手等）
- [ ] Web管理界面
- [ ] 自动验证码识别
- [ ] Docker容器化部署
- [ ] 更多代理服务商支持
