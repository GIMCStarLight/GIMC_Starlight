# 批量KOL数据同步模块使用指南

## 功能概述

批量KOL数据同步模块解决了从PostgreSQL数据库(`kol_list`表)批量读取大量抖音达人数据并调用REST API进行爬取的需求。

### 核心特性

- ✅ **突破批量限制**: 支持处理成千上万条记录，不受前端20条限制
- ✅ **任务分片**: 自动分批处理，每批100-500条可配置
- ✅ **并发控制**: 支持1-20并发请求，避免API过载
- ✅ **进度跟踪**: 实时监控处理进度和成功率
- ✅ **断点续传**: 支持从指定偏移量恢复中断的任务
- ✅ **错误处理**: 详细记录失败原因，支持失败重试
- ✅ **代理集成**: 完全兼容现有代理、账号管理和限速机制
- ✅ **REST API**: 提供完整的HTTP接口，易于集成

---

## 快速开始

### 方式1: 使用交互式脚本（推荐）

```bash
cd /Users/samuel/Desktop/系统开发/crawler
python scripts/batch_sync_demo.py
```

按提示选择：
1. 同步抖音KOL (前500条)
2. 同步所有平台KOL (前1000条)  
3. 自定义参数

### 方式2: 使用命令行工具

```bash
# 同步抖音平台未匹配的前1000条记录
python -m src.services.sync.batch_kol_sync \
    --platform 抖音 \
    --match-status unmatched \
    --max-records 1000 \
    --batch-size 100 \
    --concurrent 5

# 启用代理同步所有平台
python -m src.services.sync.batch_kol_sync \
    --max-records 5000 \
    --batch-size 200 \
    --concurrent 10 \
    --enable-proxy \
    --proxy-provider kuaidaili

# 断点续传（从第500条开始）
python -m src.services.sync.batch_kol_sync \
    --platform 抖音 \
    --resume-from 500 \
    --max-records 1000
```

### 方式3: 使用REST API

```bash
# 1. 确保API服务运行
cd /Users/samuel/Desktop/系统开发/crawler/entrypoints
python restful_api_server.py

# 2. 创建批量同步任务
curl -X POST http://127.0.0.1:8009/api/v1/batch-sync \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "抖音",
    "match_status": "unmatched",
    "max_records": 1000,
    "batch_size": 100,
    "concurrent_requests": 5,
    "enable_proxy": false
  }'

# 3. 查询任务状态
curl http://127.0.0.1:8009/api/v1/batch-sync/{sync_task_id}

# 4. 列出所有任务
curl http://127.0.0.1:8009/api/v1/batch-sync
```

---

## API接口文档

### 1. 创建批量同步任务

**请求**:
```http
POST /api/v1/batch-sync
Content-Type: application/json

{
  "platform": "抖音",                  // 可选，平台筛选
  "match_status": "unmatched",         // 匹配状态: unmatched/pending/matched
  "max_records": 1000,                 // 可选，最大处理记录数
  "batch_size": 100,                   // 每批大小 (1-500)
  "concurrent_requests": 5,            // 并发数 (1-20)
  "resume_from_offset": 0,             // 断点续传偏移量
  "enable_proxy": false,               // 是否启用代理
  "proxy_provider": "kuaidaili"        // 代理提供商
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "sync_task_id": "sync_a1b2c3d4e5f6",
    "status": "queued",
    "message": "批量同步任务已创建"
  },
  "message": "批量同步任务创建成功",
  "timestamp": "2025-12-05T07:00:00Z"
}
```

### 2. 查询任务状态

**请求**:
```http
GET /api/v1/batch-sync/{sync_task_id}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "sync_task_id": "sync_a1b2c3d4e5f6",
    "status": "running",              // queued/running/completed/failed
    "created_at": "2025-12-05T07:00:00Z",
    "started_at": "2025-12-05T07:00:01Z",
    "batches_completed": 3,
    "total_success": 287,
    "total_failed": 13,
    "request": {
      "platform": "抖音",
      "max_records": 1000
    }
  }
}
```

### 3. 列出所有任务

**请求**:
```http
GET /api/v1/batch-sync
```

**响应**:
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "sync_task_id": "sync_xxx",
        "status": "completed",
        "batches_completed": 5,
        "total_success": 487,
        "total_failed": 13
      }
    ],
    "total": 1
  }
}
```

---

## Python代码示例

### 基础用法

```python
from src.services.sync.batch_kol_sync import BatchKolSyncService

# 数据库配置
db_config = {
    'host': '192.168.102.168',
    'port': 5432,
    'database': 'crawler_db_v2',
    'user': 'postgres',
    'password': 'postgres'
}

# 创建同步服务
sync_service = BatchKolSyncService(
    db_config=db_config,
    api_base_url='http://127.0.0.1:8009/api/v1',
    batch_size=100,
    concurrent_requests=5,
    enable_proxy=False
)

# 执行同步
batches = sync_service.sync_all(
    platform='抖音',
    match_status='unmatched',
    max_records=1000
)

# 查看结果
for batch in batches:
    print(f"批次: {batch.batch_id}")
    print(f"  成功: {batch.success_count}")
    print(f"  失败: {batch.failed_count}")
```

### 高级用法：断点续传

```python
# 从进度文件恢复
import json

try:
    with open('sync_progress.json', 'r') as f:
        progress = json.load(f)
    
    resume_offset = progress['last_offset']
    print(f"从偏移量 {resume_offset} 恢复任务")
    
except FileNotFoundError:
    resume_offset = 0

# 继续执行
batches = sync_service.sync_all(
    platform='抖音',
    max_records=5000,
    resume_from_offset=resume_offset
)
```

---

## 参数说明

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `platform` | str | None | 平台筛选（抖音/小红书/B站/微博/快手），None表示全部 |
| `match_status` | str | unmatched | 匹配状态过滤 |
| `max_records` | int | None | 最大处理记录数，None表示全部 |
| `batch_size` | int | 100 | 每批处理大小（1-500） |
| `concurrent_requests` | int | 5 | 并发请求数（1-20） |
| `resume_from_offset` | int | 0 | 断点续传起始偏移量 |
| `enable_proxy` | bool | False | 是否启用代理 |
| `proxy_provider` | str | kuaidaili | 代理提供商 |

---

## 性能优化建议

### 1. 批次大小选择

| 场景 | 推荐batch_size | 说明 |
|------|----------------|------|
| 测试环境 | 20-50 | 快速验证 |
| 生产小批量 | 50-100 | 平衡性能和稳定性 |
| 生产大批量 | 100-200 | 最大化吞吐量 |
| 代理模式 | 50-100 | 避免代理过载 |

### 2. 并发数选择

| 场景 | 推荐concurrent | 说明 |
|------|----------------|------|
| 无代理 | 3-5 | 避免触发限流 |
| 启用代理 | 5-10 | 代理可分散请求 |
| 高配置服务器 | 10-15 | 充分利用资源 |

### 3. 代理使用建议

```bash
# 小批量任务（<500条）- 不用代理
python -m src.services.sync.batch_kol_sync \
    --max-records 500 \
    --concurrent 3

# 大批量任务（>1000条）- 启用代理
python -m src.services.sync.batch_kol_sync \
    --max-records 5000 \
    --concurrent 8 \
    --enable-proxy
```

---

## 故障排查

### 问题1: 数据库连接失败

**错误**: `✗ 数据库连接失败: could not connect to server`

**解决**:
```bash
# 检查数据库配置
psql -h 192.168.102.168 -U postgres -d crawler_db_v2

# 确认配置正确
export POSTGRES_HOST=192.168.102.168
export POSTGRES_PORT=5432
export POSTGRES_DATABASE=crawler_db_v2
export POSTGRES_USER=postgres
export POSTGRES_PASSWORD=postgres
```

### 问题2: API请求失败

**错误**: `✗ 提交失败: Connection refused`

**解决**:
```bash
# 确保REST API服务运行
cd /Users/samuel/Desktop/系统开发/crawler/entrypoints
python restful_api_server.py

# 检查服务状态
curl http://127.0.0.1:8009/api/health
```

### 问题3: 代理不生效

**错误**: 启用代理但未使用

**解决**:
```bash
# 检查代理配置
cat config/proxy/proxy_config_scrape.json

# 通过环境变量强制启用
CRAWLER_PROXY_ENABLED=true python -m src.services.sync.batch_kol_sync
```

---

## 监控和日志

### 日志文件

```bash
# 查看实时日志
tail -f sync_progress.json

# 查看API日志
tail -f crawler/logs/api.log
```

### 进度文件格式

```json
{
  "last_offset": 500,
  "processed_total": 500,
  "batches_completed": 5,
  "timestamp": "2025-12-05T07:10:00"
}
```

---

## 与现有系统集成

### 1. 完全兼容现有架构

```
┌─────────────────────────────────────────────────┐
│          BatchKolSyncService（新增）             │
│  - 从PostgreSQL kol_list读取                    │
│  - 调用REST API提交任务                         │
│  - 支持任务分片和进度跟踪                        │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│          REST API Server（已有）                │
│  - 接收爬取任务请求                             │
│  - 任务队列管理                                 │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│      MainTaskScheduler（已有）                  │
│  - SessionManager（多账号）                     │
│  - ScrapeProxyPool（代理池）                    │
│  - TimeWindowQPSLimiter（限速）                 │
└─────────────────────────────────────────────────┘
```

### 2. 数据流向

```
PostgreSQL kol_list
    ↓
BatchKolSyncService (分批读取)
    ↓
REST API /crawl-jobs (每批提交)
    ↓
MainTaskScheduler (执行爬取)
    ↓
PostgreSQL influencer_authors (保存结果)
```

---

## 最佳实践

1. **测试先行**: 先用小批量（50条）测试
2. **监控进度**: 使用交互式脚本实时查看进度
3. **分批执行**: 大批量任务分多个时段执行
4. **错误重试**: 失败记录单独收集后重试
5. **代理轮换**: 大批量任务启用代理避免封禁

---

## 技术支持

如有问题，请查看：
- 详细日志: `sync_progress.json`
- API文档: http://127.0.0.1:8009/api/docs
- 测试脚本: `scripts/batch_sync_demo.py`
