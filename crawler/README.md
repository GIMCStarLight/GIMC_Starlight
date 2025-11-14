# 爬虫工程化开发 - Task Control

一个专业的爬虫任务控制系统，专门用于巨量方舟（OceanEngine）作者广场数据的智能化采集与管理。

## 🚀 项目概述

本项目是一个高度工程化的爬虫系统，采用模块化架构设计，提供了完整的数据采集、存储、监控和任务调度功能。系统支持智能暂停、断点续传、失败重试等高级特性，确保长时间稳定运行。

### 核心特性

- 🎯 **智能任务调度**: 支持多种调度模式，自动生成任务计划
- 📋 **多模式标签爬取**:
  - `all_first`: 爬取全部一级标签（不区分二级标签）
  - `second_split`: 二级标签分割模式（每个二级标签单独任务，推荐）
  - `combine_second`: 一二级合并模式（将一级标签下所有二级标签合并为一个任务）
- 🔄 **断点续传**: 支持任务中断后的断点续传功能
- 📊 **实时监控**: 内置指标收集和日志记录系统
- 🛡️ **稳定性保障**: 智能重试、限速控制、错误处理
- 🗄️ **数据持久化**: 支持文件存储和 PostgreSQL 数据库
- 🎛️ **灵活配置**: 支持环境变量、配置文件等多种配置方式

## 📁 项目结构

```
task_control/
├── config/                 # 配置文件目录
│   ├── .env.example        # 环境变量配置示例
│   ├── config.py           # 配置管理模块
│   ├── settings.py         # Pydantic设置模型
│   ├── loader.py           # 配置加载器
│   ├── content_tag_v2.json # 内容标签配置
│   ├── region_codes.json   # 地区代码配置
│   └── follower_ranges.json # 粉丝区间配置
├── services/               # 核心服务模块
│   ├── http_client.py      # HTTP客户端服务
│   ├── rate_limiter.py     # 限速器服务
│   ├── retry_handler.py    # 重试处理服务
│   ├── data_saver.py       # 数据保存服务
│   ├── task_orchestrator.py # 任务编排服务
│   ├── adaptive_qps.py     # 自适应QPS控制
│   ├── logging_utils.py    # 日志工具
│   └── metrics.py          # 指标收集
├── tools/                  # 工具脚本
│   ├── smart_crawl_controller.py # 智能爬取控制器
│   ├── task_scheduler.py   # 任务调度器
│   ├── author_fetcher.py   # 作者数据获取器
│   └── by_tags_orchestrator.py # 标签任务编排器
├── entrypoints/            # 入口点
│   └── cli.py             # 统一命令行接口
├── usecases/              # 用例层
│   ├── plan_service.py    # 计划服务
│   └── task_execution_service.py # 任务执行服务
├── domain/                # 领域模型
│   └── entities.py        # 实体定义
├── tests/                 # 测试文件
├── logs/                  # 日志文件
├── reports/               # 报告文件
└── results/               # 结果文件
```

## 🛠️ 安装与配置

### 环境要求

- Python 3.11+
- PostgreSQL (可选，用于数据持久化)
- 依赖包：requests, pydantic, python-dotenv 等

### 安装步骤

1. **克隆项目**

   ```bash
   git clone <repository-url>
   cd 爬虫工程化开发/task_control
   ```

2. **安装依赖**

   ```bash
   pip install -r requirements.txt
   # 或使用 poetry
   poetry install
   ```

3. **配置环境**

   ```bash
   # 复制配置文件模板
   cp config/.env.example config/.env

   # 编辑配置文件
   vim config/.env
   ```

### 配置说明

#### 环境变量配置 (.env)

```bash
# PostgreSQL 数据库配置
PG_HOST=127.0.0.1
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=postgres
PG_DB=author_square

# 限速配置
DOMAIN_QPS=2                # 每秒请求数
QPS_WINDOW_MS=1000         # QPS时间窗口
CONCURRENCY=2              # 并发任务数

# 稳定性配置
COOLDOWN_429_403_MS=2000   # 429/403错误冷却时间
MAX_FAILURE_RATE=0.6       # 最大失败率阈值
STOP_WHEN_EMPTY_N=3        # 连续空页停止阈值

# 运行参数
COOKIES_FILE=config/cookies.txt  # Cookie文件路径
STAR_ID=1843934177451019        # 星图ID
OUTPUT_DIR=results              # 输出目录
```

#### Cookie 配置

在 `config/cookies.txt` 中配置巨量方舟的登录 Cookie：

```
sessionid=your_session_id; csrftoken=your_csrf_token; ...
```

## 🎮 使用指南

### 简化命令（推荐）

不想记一大堆参数？请优先使用“简单入口”：

```bash
python -m entrypoints.simple_cli --help

# 单关键词（自动识别 search_type：星图ID/抖音号/昵称）
python -m entrypoints.simple_cli kw 贝勒儿

# 批量关键词
python -m entrypoints.simple_cli batch task_control/config/keywords_for_batch_crawling.txt

# 选定标签（<一级> [二级]）
python -m entrypoints.simple_cli selected 美妆 护肤

# 合并某一级全部二级
python -m entrypoints.simple_cli combined 美妆

# 全部一级
python -m entrypoints.simple_cli first
```

- `--profile {fast,balance,deep}` 一键切换“速度/均衡/深度”抓取预设（默认 `balance`）。
- 如存在 `task_control/config/postgres.json` 将自动启用 PostgreSQL 入库；可用 `--no-pg` 禁用。
- `--dry-run` 可用于安全自检：仅打印解析后的配置，不发送网络请求。
- 分页优先级（仅 simple_cli）：未显式传入 `--limit`/`--max-pages` 时，采用所选 Profile 的预设值；一旦显式传入，则覆盖 Profile 值。
- 更完整示例参见 `docs/QUICK_COMMANDS.md`。

#### 两套 CLI 的定位与对照

- 日常用法 → 用本节的 `entrypoints.simple_cli`（少参数，内置预设）；
- 高级管控 → 用下节的 `entrypoints.cli`（全量参数：并发、智能暂停、计划文件等）。

常见对照：

- 关键词搜索：`simple_cli kw xxx` ≈ `cli smart --mode second_split --auto-pages` 且附带筛选；
- 批量关键词：`simple_cli batch file` ≈ 循环调用 `cli schedule/smart`；
- 选定标签：`simple_cli selected 一/二级` ≈ `cli schedule --mode second_split` 指定标签过滤；
- 合并二级：`simple_cli combined 一级` ≈ `cli schedule --mode combined`；
- 全部一级：`simple_cli first` ≈ `cli schedule --mode first_only`。

### 命令行接口

项目提供了统一的 CLI 接口，支持多种操作模式：

```bash
# 查看所有可用命令
python -m entrypoints.cli --help

# 查看特定命令的帮助
python -m entrypoints.cli schedule --help
python -m entrypoints.cli smart --help
python -m entrypoints.cli cleanup --help
python -m entrypoints.cli validate --help
```

#### 1. 任务调度模式 (`schedule`)

基于标签和粉丝范围生成任务计划并执行：

```bash
# 基础任务调度 - 二级标签分割模式（推荐）
python -m entrypoints.cli schedule --mode second_split --limit 10 --max-pages 5

# 全部一级标签爬取模式
python -m entrypoints.cli schedule --mode first_only --limit 10 --max-pages 5

# 一二级标签合并模式
python -m entrypoints.cli schedule --mode combined --limit 10 --max-pages 5

# 带数据库存储的调度
python -m entrypoints.cli schedule --mode second_split --save-pg --pg-config config/postgres.json

# 完整参数示例
python -m entrypoints.cli schedule \
  --mode second_split \
  --limit 20 --max-pages 10 \
  --sleep-ms 1500 \
  --output-dir results \
  --cookie-file cookies.txt \
  --save-pg --pg-config config/postgres.json \
  --resume --skip-existing \
  --concurrency 2 --qps 3
```

#### 2. 智能爬取模式 (`smart`)

长时间运行的智能调度，支持动态暂停和断点续跑：

```bash
# 智能爬取控制（推荐）- 二级标签分割模式
python -m entrypoints.cli smart --mode second_split --auto-pages --resume

# 智能爬取 - 全部一级标签模式
python -m entrypoints.cli smart --mode first_only --auto-pages --resume

# 智能爬取 - 一二级合并模式
python -m entrypoints.cli smart --mode combined --auto-pages --resume

# 带智能暂停的长时间运行
python -m entrypoints.cli smart \
  --mode second_split \
  --auto-pages --auto-pages-upper-bound 100 \
  --resume --skip-existing \
  --work-cycle-mins 50 --fixed-pause-mins 10 \
  --pause-levels "3,12,30,60,120" \
  --failure-rate-threshold 0.35

# 完整智能控制参数示例
python -m entrypoints.cli smart \
  --mode second_split \
  --auto-pages --auto-pages-upper-bound 200 \
  --work-cycle-mins 45 --fixed-pause-mins 15 \
  --pause-levels "5,15,30,60,120,240" \
  --failure-rate-threshold 0.3 \
  --cookies-file config/cookies.txt \
  --jobs-plan-out reports/my_jobs_plan.json \
  --state-file reports/my_state.json \
  --resume --skip-existing --save-pg
```

#### 3. 数据库管理

##### 数据库清理 (`cleanup`)

清理 PostgreSQL 数据库中的测试数据：

```bash
# 预览将要删除的数据（不实际执行）
python -m entrypoints.cli cleanup --pg-config config/postgres.json --dry-run

# 确认执行清理操作
python -m entrypoints.cli cleanup --pg-config config/postgres.json --confirm

# 详细输出模式
python -m entrypoints.cli cleanup --verbose --pg-config config/postgres.json --confirm
```

##### 数据验证 (`validate`)

验证 PostgreSQL 数据库中的事务完整性：

```bash
# 验证数据完整性
python -m entrypoints.cli validate --pg-config config/postgres.json

# 自动修复发现的问题
python -m entrypoints.cli validate --pg-config config/postgres.json --fix

# 详细输出模式
python -m entrypoints.cli validate --verbose --pg-config config/postgres.json --fix
```

#### 4. 独立工具脚本

除了统一 CLI 接口，还可以直接运行独立的工具脚本：

```bash
# 任务调度器
python tools/task_scheduler.py

# 智能爬取控制器
python tools/smart_crawl_controller.py

# 数据库清理工具
python tools/cleanup_pg_testdata.py

# 数据验证工具
python tools/validate_pg_transactions.py

# 区域代码提取工具
python tools/extract_region_codes.py
```

### 参数说明

#### 通用参数

- `--verbose, -v`: 启用详细输出
- `--config-dir`: 配置文件目录（默认: config）
- `--mode`: 运行模式
  - `first_only`: 爬取全部一级标签（不区分二级标签，适用于快速获取所有一级分类数据）
  - `second_split`: 二级标签分割模式（每个二级标签单独任务，推荐，数据精确度高）
  - `combined`: 一二级合并模式（将一级标签下所有二级标签合并为一个任务，适用于综合分析）

#### 任务调度参数 (`schedule`)

- `--limit`: 每页限制数量（默认: 10）
- `--max-pages`: 最大页数（默认: 5）
- `--sleep-ms`: 请求间隔毫秒数（默认: 1000）
- `--output-dir`: 输出目录（默认: results）
- `--cookie-file`: Cookie 文件路径（默认: cookies.txt）
- `--save-pg`: 保存到 PostgreSQL 数据库
- `--pg-config`: PostgreSQL 配置文件（默认: config/postgres.json）
- `--resume`: 断点续传
- `--skip-existing`: 跳过已存在的文件
- `--concurrency`: 并发数（默认: 1）
- `--qps`: QPS 限制（默认: 2）

#### 智能控制参数 (`smart`)

- `--auto-pages`: 启用自动分页
- `--auto-pages-upper-bound`: 自动分页上限（默认: 100）
- `--work-cycle-mins`: 工作周期分钟数（默认: 50）
- `--fixed-pause-mins`: 固定暂停分钟数（默认: 10）
- `--pause-levels`: 暂停等级分钟数，逗号分隔（默认: 3,12,30,60,120）
- `--failure-rate-threshold`: 失败率阈值（默认: 0.35）
- `--cookies-file`: Cookie 文件路径（默认: config/cookies.txt）
- `--jobs-plan-out`: 任务计划输出文件（默认: reports/smart_jobs_plan.json）
- `--state-file`: 状态文件路径（默认: reports/smart_state.json）
- `--resume`: 断点续传
- `--skip-existing`: 跳过已存在的文件
- `--save-pg`: 保存到 PostgreSQL 数据库

#### 数据库管理参数

##### 清理参数 (`cleanup`)

- `--pg-config`: PostgreSQL 配置文件（默认: config/postgres.json）
- `--dry-run`: 仅显示将要删除的数据，不实际执行
- `--confirm`: 确认执行清理操作

##### 验证参数 (`validate`)

- `--pg-config`: PostgreSQL 配置文件（默认: config/postgres.json）
- `--fix`: 自动修复发现的问题

## 🏗️ 架构设计

### 分层架构

```
┌─────────────────────────────────────┐
│           Entrypoints               │  # CLI接口层
├─────────────────────────────────────┤
│            Use Cases                │  # 用例层
├─────────────────────────────────────┤
│            Services                 │  # 服务层
├─────────────────────────────────────┤
│            Domain                   │  # 领域层
└─────────────────────────────────────┘
```

### 核心服务模块

#### HTTP 客户端服务 (`services/http_client.py`)

- 提供统一的 HTTP 请求接口
- 支持会话复用和超时控制
- 自动处理 JSON 响应解析

#### 限速器服务 (`services/rate_limiter.py`)

- 时间窗口 QPS 限制
- 线程安全的请求控制
- 支持动态调整限速参数

#### 重试处理服务 (`services/retry_handler.py`)

- 指数退避重试策略
- 可配置的重试条件
- 详细的重试日志记录

#### 数据保存服务 (`services/data_saver.py`)

- 文件系统存储
- PostgreSQL 数据库存储
- 数据去重和完整性检查

#### 任务编排服务 (`services/task_orchestrator.py`)

- 任务生成和调度
- 并发控制和资源管理
- 任务状态跟踪

### 标签爬取模式实现

#### 模式设计原理

系统支持三种标签爬取模式，每种模式针对不同的数据采集需求：

1. **all_first 模式**:

   - 实现原理：仅使用一级标签 ID 进行过滤，忽略二级标签分类
   - 适用场景：快速获取某个一级分类下的全部作者数据
   - 技术实现：`add_tag_filter(payload, first_id=job.first_id, second_id=None)`

2. **second_split 模式**（推荐）:

   - 实现原理：为每个二级标签创建独立的爬取任务
   - 适用场景：精确的标签分类数据采集，便于后续分析
   - 技术实现：遍历所有二级标签，每个标签生成独立的 Job 对象

3. **combine_second 模式**:
   - 实现原理：将一级标签下的所有二级标签 ID 合并为数组进行单次请求
   - 适用场景：需要综合分析一级分类下所有子分类的场景
   - 技术实现：`add_combined_second_filter(payload, second_ids)`

#### 任务生成策略

```python
def apply_mode_generate_jobs(all_tags, mode, follower_ranges):
    if mode == "all_first":
        # 仅按一级过滤，不区分二级
    elif mode == "combine_second":
        # 合并模式：将一级下所有二级作为一个任务
    else:  # second_split
        # 默认：每个二级标签单独任务
```

### 智能控制特性

#### 自适应暂停策略

系统根据以下指标动态调整暂停时间：

- 失败率统计
- 空页面检测
- HTTP 错误频率
- 作者产出质量

#### 断点续传机制

- 任务状态持久化
- 进度文件自动保存
- 跨进程状态恢复

## 📊 监控与日志

### 日志系统

项目使用结构化日志记录，支持多种日志级别：

```python
# 日志配置示例
from services.logging_utils import get_json_logger

logger = get_json_logger("task_control")
logger.info("任务开始", extra={"task_id": "123", "mode": "second_split"})
```

### 指标收集

内置指标收集系统，记录关键性能指标：

- 请求延迟统计
- 成功/失败率
- 数据产出量
- 系统资源使用

### 报告生成

系统自动生成详细的执行报告：

```json
{
  "task_summary": {
    "total_pages": 150,
    "successful_pages": 145,
    "failed_pages": 5,
    "total_authors": 2890,
    "execution_time": "02:35:42"
  },
  "performance_metrics": {
    "avg_response_time": 1250,
    "success_rate": 0.967,
    "qps_actual": 1.8
  }
}
```

## 🔧 开发指南

### 代码规范

项目使用以下代码规范工具：

- **Black**: 代码格式化
- **Ruff**: 代码检查和导入排序
- **pytest**: 单元测试

```bash
# 代码格式化
black task_control/

# 代码检查
ruff check task_control/

# 运行测试
pytest tests/
```

### 添加新功能

1. **创建服务模块**

   ```python
   # services/new_service.py
   class NewService:
       def __init__(self, config):
           self.config = config

       def process(self, data):
           # 实现业务逻辑
           pass
   ```

2. **添加配置支持**

   ```python
   # config/settings.py
   class Settings(BaseSettings):
       new_service_enabled: bool = False
       new_service_param: str = "default"
   ```

3. **集成到 CLI**
   ```python
   # entrypoints/cli.py
   def add_new_command(subparsers):
       parser = subparsers.add_parser('new', help='新功能')
       # 添加参数定义
   ```

### 测试策略

```python
# tests/test_new_service.py
import pytest
from services.new_service import NewService

def test_new_service_basic():
    service = NewService(config={})
    result = service.process("test_data")
    assert result is not None

@pytest.mark.integration
def test_new_service_integration():
    # 集成测试
    pass
```

## 🚨 故障排除

### 常见问题

#### 1. Cookie 失效

**症状**: 返回 401 错误或登录页面
**解决**: 更新 `config/cookies.txt` 中的 Cookie 信息

#### 2. 数据库连接失败

**症状**: PostgreSQL 连接错误
**解决**: 检查数据库配置和网络连接

```bash
# 测试数据库连接
python -c "
from config.config import load_config
config = load_config()
print('数据库配置:', config.pg_host, config.pg_port)
"
```

#### 3. 限速过于严格

**症状**: 请求速度过慢
**解决**: 调整 QPS 配置

```bash
# 临时调整QPS
export DOMAIN_QPS=5
python -m entrypoints.cli smart --mode second_split
```

#### 4. 内存使用过高

**症状**: 系统内存不足
**解决**:

- 减少并发数 (`CONCURRENCY`)
- 启用分批处理
- 增加暂停间隔

### 日志分析

```bash
# 查看错误日志
grep "ERROR" logs/task_scheduler.log

# 分析失败率
grep "failure_rate" logs/task_scheduler.log | tail -10

# 监控QPS
grep "qps_actual" logs/task_scheduler.log
```

## 📈 性能优化

### 配置优化建议

1. **合理设置 QPS**: 根据目标网站承受能力调整
2. **优化并发数**: 平衡速度和稳定性
3. **调整暂停策略**: 根据业务需求设置暂停等级
4. **启用数据库索引**: 提高查询性能

### 系统资源监控

```bash
# 监控系统资源
htop
iostat -x 1
netstat -i
```
## CLI 对齐与模式兼容说明

为统一 `plan_service` 与智能控制器（smart controller）的模式参数，CLI 进行了以下对齐与兼容处理：

- schedule 子命令的 `--mode` 可选：`second_split`, `combine_second`, `popularity_first`, `daily_increment`
- smart 子命令的 `--mode` 可选：`second_split`, `combine_second`, `all_first`
- 兼容别名（向后兼容）：
  - `combined` 等价于 `combine_second`
  - `first_only` 在 smart 中等价于 `all_first`，在 schedule 中映射为 `combine_second`

此外，smart 子命令新增直通参数：

- `--generate-only`：仅生成任务计划并退出（便于快速校验计划生成，不实际发起抓取）

说明：上述变更不影响 `simple_cli`，其保持原有行为与参数集。
