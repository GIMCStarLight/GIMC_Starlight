#!/usr/bin/env python3
"""
RESTful API Server for Author Square Crawler
符合 RESTful 规范的爬虫任务管理 API 服务
"""

import os
import glob
import sys
import uuid
import json
import tempfile
import threading
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any, Union
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query, Path as PathParam
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
import uvicorn

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

try:
    from tools.main_task_scheduler import MainTaskScheduler, Args
except ImportError:
    from task_control.tools.main_task_scheduler import MainTaskScheduler, Args


# 统一默认 UA/Referer 与 CLI 行为一致，避免 headers 差异
try:
    from fetch_author_square_by_tags import (
        DEFAULT_REFERER as SCRIPT_DEFAULT_REFERER,
        DEFAULT_USER_AGENT as SCRIPT_DEFAULT_USER_AGENT,
    )
except Exception:
    SCRIPT_DEFAULT_REFERER = "https://agent.oceanengine.com/admin/star-agent/vue2/market"
    SCRIPT_DEFAULT_USER_AGENT = (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/140.0.0.0 Safari/537.36"
    )


# ==================== Pydantic Models ====================

class TaskTarget(BaseModel):
    """任务目标配置"""
    # 单关键词
    star_id: Optional[str] = None
    handle: Optional[str] = None
    
    # 批量关键词
    star_ids: Optional[List[str]] = None
    handles: Optional[List[str]] = None
    dedup: bool = True
    
    @validator('star_id')
    def validate_star_id(cls, v):
        if v is not None and not v.isdigit():
            raise ValueError('star_id 必须为纯数字')
        return v
    
    @validator('star_ids')
    def validate_star_ids(cls, v):
        if v is not None:
            if len(v) == 0 or len(v) > 20:
                raise ValueError('star_ids 长度必须在 1-20 之间')
            for star_id in v:
                if not str(star_id).isdigit():
                    raise ValueError('star_ids 中所有项必须为纯数字')
        return v
    
    @validator('handles')
    def validate_handles(cls, v):
        if v is not None:
            if len(v) == 0 or len(v) > 20:
                raise ValueError('handles 长度必须在 1-20 之间')
            for handle in v:
                if not handle.replace('_', '').replace('-', '').replace('.', '').isalnum():
                    if not (handle.startswith('TG') and handle[2:].replace('_', '').replace('-', '').replace('.', '').isalnum()):
                        raise ValueError(f'handles 中的 {handle} 格式不正确')
        return v


class TaskOptions(BaseModel):
    """任务选项配置"""
    cookies_file: str = "cookies.txt"
    star_id_header: Union[str, int] = 1843934177451019
    output_dir: str = "task_control/results"
    report_dir: str = "task_control/reports"
    
    # 分页与过滤
    page: Optional[int] = None
    limit: Optional[int] = None
    min_price: Optional[float] = None
    video_type: Optional[Union[str, int]] = None
    
    # 稳定性与限速
    domain_qps: int = 1
    qps_window_ms: int = 1000
    retry_max: int = 3
    retry_backoff_ms: int = 5000
    sleep_ms: int = 500
    sleep_between_keywords_ms: int = 1000
    
    # 入库
    save_pg: bool = False
    pg_config: Optional[str] = None
    
    # 其他
    payload_override: Optional[str] = None
    dry_run: bool = False


class CreateCrawlJobRequest(BaseModel):
    """创建爬虫任务请求"""
    task_type: str = Field(..., pattern="^(single_star_id|single_handle|batch_star_ids|batch_handles)$")
    target: TaskTarget
    options: TaskOptions = TaskOptions()
    
    @validator('target')
    def validate_target_matches_task_type(cls, v, values):
        task_type = values.get('task_type')
        if task_type == 'single_star_id' and not v.star_id:
            raise ValueError('single_star_id 任务类型需要提供 star_id')
        elif task_type == 'single_handle' and not v.handle:
            raise ValueError('single_handle 任务类型需要提供 handle')
        elif task_type == 'batch_star_ids' and not v.star_ids:
            raise ValueError('batch_star_ids 任务类型需要提供 star_ids')
        elif task_type == 'batch_handles' and not v.handles:
            raise ValueError('batch_handles 任务类型需要提供 handles')
        return v


class ApiResponse(BaseModel):
    """统一 API 响应格式"""
    success: bool
    data: Optional[Any] = None
    message: str = ""
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ApiError(BaseModel):
    """API 错误响应"""
    success: bool = False
    error: Dict[str, Any]
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class JobProgress(BaseModel):
    """任务进度"""
    current: int = 0
    total: int = 0
    percentage: float = 0.0
    current_keyword: Optional[str] = None


class JobStats(BaseModel):
    """任务统计"""
    total_authors_found: int = 0
    successful_requests: int = 0
    failed_requests: int = 0


class CrawlJob(BaseModel):
    """爬虫任务信息"""
    job_id: str
    status: str  # queued, running, completed, failed, cancelled
    task_type: str
    progress: JobProgress = JobProgress()
    stats: JobStats = JobStats()
    created_at: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    estimated_completion: Optional[str] = None
    error_message: Optional[str] = None


# ==================== Global State ====================

# 任务注册表
jobs_registry: Dict[str, Dict[str, Any]] = {}
jobs_lock = threading.Lock()

# 线程池执行器（单线程，避免资源竞争）
executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="crawler-worker")

# FastAPI 应用
app = FastAPI(
    title="Author Square Crawler API",
    description="符合 RESTful 规范的星图作者广场爬虫 API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应限制具体域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== Helpers for Results ====================

def find_latest_summary_path(report_dir: str, second_label: str) -> Optional[str]:
    """在报告目录中查找匹配 second_label 的最新 summary 文件"""
    try:
        pattern = os.path.join(report_dir, f"summary_*_{second_label}_*.json")
        candidates = glob.glob(pattern)
        if not candidates:
            # 兜底：查找所有 summary 并用文件名包含 second_label 过滤
            all_summaries = glob.glob(os.path.join(report_dir, "summary_*.json"))
            candidates = [p for p in all_summaries if second_label in os.path.basename(p)]
        if not candidates:
            return None
        candidates.sort(key=lambda p: os.path.getmtime(p), reverse=True)
        return candidates[0]
    except Exception:
        return None


def read_json_file(path: str) -> Optional[dict]:
    try:
        with open(path, "r", encoding="utf-8") as f:
            import json as _json
            return _json.load(f)
    except Exception:
        return None

# ==================== Helper Functions ====================

def resolve_cookies_path(cookies_file: str) -> str | None:
    cf = Path(cookies_file)
    candidates = [
        cf,
        (project_root / cf),
        (Path.cwd() / cf),
        (project_root / 'cookies.txt'),
        (project_root / 'config' / 'cookies.txt'),
    ]
    for c in candidates:
        try:
            if c.exists():
                return str(c)
        except Exception:
            pass
    return None

def create_job_id() -> str:
    """生成任务 ID"""
    return str(uuid.uuid4())


def get_current_timestamp() -> str:
    """获取当前时间戳"""
    return datetime.now(timezone.utc).isoformat()


def create_temp_keyword_file(keywords: List[str]) -> str:
    """创建临时关键词文件"""
    temp_file = tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt')
    for keyword in keywords:
        temp_file.write(f"{keyword}\n")
    temp_file.close()
    return temp_file.name


def build_scheduler_config(request: CreateCrawlJobRequest, temp_files: List[str] = None) -> dict:
    """构建调度器配置"""
    config = {}
    
    # 基础配置
    # 统一将路径规范为绝对路径，避免 CWD 差异导致读写错位
    def _abs(p: str) -> str:
        try:
            pp = Path(p)
            return str(pp if pp.is_absolute() else (project_root / pp))
        except Exception:
            return str(project_root / str(p))

    # cookies 路径解析（若失败则使用原值，存在性由上层校验）
    resolved_cookie = resolve_cookies_path(request.options.cookies_file)
    config['cookies_file'] = resolved_cookie or request.options.cookies_file
    config['star_id'] = str(request.options.star_id_header)
    config['output_dir'] = _abs(request.options.output_dir)
    config['report_dir'] = _abs(request.options.report_dir)
    # 与 CLI 保持一致的 UA 与 Referer
    config['user_agent'] = SCRIPT_DEFAULT_USER_AGENT
    config['referer'] = SCRIPT_DEFAULT_REFERER
    
    # 默认参数
    config['max_pages'] = 30
    config['limit'] = request.options.limit if request.options.limit else 20
    config['auto_pages'] = True
    config['sort_field'] = 'score'
    config['sort_type'] = 2  # 整数，不是字符串
    config['video_type'] = str(request.options.video_type) if request.options.video_type else '2'
    config['min_price'] = request.options.min_price if request.options.min_price is not None else 0
    config['search_type'] = 1  # 默认搜索类型
    
    # 稳定性控制默认参数
    config['stop_when_empty'] = False
    config['stop_when_empty_n'] = None
    config['max_failure_rate'] = None
    config['max_consecutive_401'] = 3
    config['pause_on_401_ms'] = 60000
    config['cooldown_429_403_ms'] = 2000
    
    # 其他必需参数
    config['platform_source'] = 1
    config['search_scene'] = 1
    config['display_scene'] = 1
    config['marketing_target'] = 1
    config['task_category'] = 1
    config['first_industry_id'] = 0
    config['task_status'] = 3
    config['use_price_filter'] = True
    config['combine_second'] = False
    config['all_first'] = False
    config['max_tags'] = 1
    config['dedup_keywords'] = False
    config['max_keywords'] = 20
    config['auto_pages_upper_bound'] = None
    config['resume'] = False
    config['skip_existing'] = False
    config['rerun_failed'] = None
    config['time_window'] = None
    config['concurrency'] = 1
    config['adaptive_qps'] = False
    
    # 分页与过滤（使用用户提供的值）
    if request.options.page:
        config['page'] = request.options.page
    else:
        config['page'] = 1
    
    # 稳定性与限速
    config['domain_qps'] = request.options.domain_qps
    config['qps_window_ms'] = request.options.qps_window_ms
    config['retry_max'] = request.options.retry_max
    config['retry_backoff_ms'] = request.options.retry_backoff_ms
    config['sleep_ms'] = request.options.sleep_ms
    config['sleep_between_keywords_ms'] = request.options.sleep_between_keywords_ms
    
    # 入库 - 自动检测PostgreSQL配置
    pg_config_path = request.options.pg_config or os.path.join(project_root, "config", "postgres.json")
    auto_enable_pg = os.path.exists(pg_config_path)
    
    config['save_pg'] = request.options.save_pg or auto_enable_pg
    config['pg_config'] = pg_config_path
    
    if auto_enable_pg and not request.options.save_pg:
        print(f"[info] 检测到PostgreSQL配置文件，已自动启用数据库存储: {pg_config_path}")
    
    # 其他
    if request.options.payload_override:
        config['payload_override'] = request.options.payload_override
    config['dry_run'] = request.options.dry_run
    
    # 根据任务类型设置特定参数
    if request.task_type == 'single_star_id':
        config['search_star_id'] = request.target.star_id
        config['search_type'] = 1  # 星图ID搜索类型
        print(f"[info] 单星图ID搜索模式: {request.target.star_id}")
    elif request.task_type == 'single_handle':
        config['search_handle'] = request.target.handle
        config['search_type'] = 3  # 抖音号搜索类型（ASCII/TG前缀识别为账号）
        print(f"[info] 单抖音号搜索模式: {request.target.handle}")
    elif request.task_type == 'batch_star_ids':
        keywords = request.target.star_ids
        if request.target.dedup:
            keywords = list(dict.fromkeys(keywords))  # 去重保持顺序
        temp_file = create_temp_keyword_file(keywords)
        temp_files.append(temp_file)
        config['keyword_file'] = temp_file
        config['dedup_keywords'] = request.target.dedup
        config['max_keywords'] = len(keywords)
        # 批量星图ID搜索需显式指定搜索类型为星图ID
        config['search_type'] = 1
        print(f"[info] 批量星图ID搜索模式: {len(keywords)} 个关键词")
    elif request.task_type == 'batch_handles':
        keywords = request.target.handles
        if request.target.dedup:
            keywords = list(dict.fromkeys(keywords))  # 去重保持顺序
        temp_file = create_temp_keyword_file(keywords)
        temp_files.append(temp_file)
        config['keyword_file'] = temp_file
        config['dedup_keywords'] = request.target.dedup
        config['max_keywords'] = len(keywords)
        # 批量抖音号搜索需显式指定搜索类型为抖音号
        config['search_type'] = 3
        print(f"[info] 批量抖音号搜索模式: {len(keywords)} 个关键词")
    
    return config


def execute_crawl_task(job_id: str, config: Args, temp_files: List[str]):
    """执行爬虫任务"""
    try:
        # 更新任务状态为运行中
        with jobs_lock:
            if job_id in jobs_registry:
                jobs_registry[job_id]['status'] = 'running'
                jobs_registry[job_id]['started_at'] = get_current_timestamp()
        
        # 执行任务
        scheduler = MainTaskScheduler()
        result = scheduler.run(config)
        
        # 从 scheduler.run() 返回值直接获取统计信息
        # 批量关键词模式返回 {"keywords_processed": ..., "pages_total": ..., "authors_total": ...}
        if result and isinstance(result, dict):
            authors_count = result.get('authors_total', 0)
            if authors_count > 0:
                with jobs_lock:
                    if job_id in jobs_registry:
                        jobs_registry[job_id].setdefault('stats', {})
                        jobs_registry[job_id]['stats']['total_authors_found'] = int(authors_count)
        
        # 尝试从 summary 报告更新统计（作为备用）
        try:
            cfg = config if isinstance(config, dict) else {}
            report_dir = cfg.get('report_dir') or os.path.join(project_root, "reports")
            second_label = str(
                cfg.get('search_star_id')
                or cfg.get('search_handle')
                or cfg.get('search_nickname')
                or cfg.get('keyword')
                or ""
            )
            summary_path = None
            summary = None
            if second_label:
                summary_path = find_latest_summary_path(report_dir, second_label)
                if summary_path and os.path.exists(summary_path):
                    summary = read_json_file(summary_path)
            # 更新到任务注册表
            if summary:
                with jobs_lock:
                    if job_id in jobs_registry:
                        jobs_registry[job_id].setdefault('stats', {})
                        jobs_registry[job_id]['stats']['total_authors_found'] = int(summary.get('authors_total', 0) or 0)
                        jobs_registry[job_id]['result_summary_path'] = summary_path
                        jobs_registry[job_id]['result_summary'] = summary
        except Exception:
            # 安静失败，不影响主流程
            pass
        
        # 任务完成
        with jobs_lock:
            if job_id in jobs_registry:
                jobs_registry[job_id]['status'] = 'completed'
                jobs_registry[job_id]['completed_at'] = get_current_timestamp()
                jobs_registry[job_id]['progress']['percentage'] = 100.0
    
    except Exception as e:
        # 任务失败
        with jobs_lock:
            if job_id in jobs_registry:
                jobs_registry[job_id]['status'] = 'failed'
                jobs_registry[job_id]['completed_at'] = get_current_timestamp()
                jobs_registry[job_id]['error_message'] = str(e)
    
    finally:
        # 清理临时文件
        for temp_file in temp_files:
            try:
                os.unlink(temp_file)
            except:
                pass


# ==================== API Endpoints ====================

@app.post("/api/v1/crawl-jobs", response_model=ApiResponse, status_code=201)
async def create_crawl_job(request: CreateCrawlJobRequest):
    """创建爬虫任务"""
    
    # 验证 cookies 文件存在
    cookies_resolved = resolve_cookies_path(request.options.cookies_file)
    if not cookies_resolved or not os.path.exists(cookies_resolved):
        raise HTTPException(
            status_code=422,
            detail={
                "success": False,
                "error": {
                    "code": "COOKIES_FILE_NOT_FOUND",
                    "message": f"Cookies 文件不存在: {request.options.cookies_file}",
                    "details": {"field": "cookies_file"}
                }
            }
        )
    # 用解析后的绝对路径回填，以确保后续读写一致
    request.options.cookies_file = cookies_resolved
    # 同步规范 output_dir/report_dir 为绝对路径，避免 CWD 影响
    try:
        def _abs(p: str) -> str:
            pp = Path(p)
            return str(pp if pp.is_absolute() else (project_root / pp))
        request.options.output_dir = _abs(request.options.output_dir)
        request.options.report_dir = _abs(request.options.report_dir)
    except Exception:
        pass
    
    # 创建任务
    job_id = create_job_id()
    temp_files = []
    
    try:
        # 构建调度器配置
        config = build_scheduler_config(request, temp_files)
        
        # 注册任务
        with jobs_lock:
            jobs_registry[job_id] = {
                'job_id': job_id,
                'status': 'queued',
                'task_type': request.task_type,
                'config': config,
                'temp_files': temp_files,
                'progress': {'current': 0, 'total': 1, 'percentage': 0.0, 'current_keyword': None},
                'stats': {'total_authors_found': 0, 'successful_requests': 0, 'failed_requests': 0},
                'created_at': get_current_timestamp(),
                'started_at': None,
                'completed_at': None,
                'estimated_completion': None,
                'error_message': None
            }
        
        # 提交任务到线程池
        executor.submit(execute_crawl_task, job_id, config, temp_files)
        
        return ApiResponse(
            success=True,
            data={
                "job_id": job_id,
                "status": "queued",
                "task_type": request.task_type,
                "created_at": get_current_timestamp(),
                "estimated_duration": "2-5分钟" if request.task_type.startswith('single_') else "5-15分钟"
            },
            message="任务已创建并加入队列"
        )
    
    except Exception as e:
        # 清理临时文件
        for temp_file in temp_files:
            try:
                os.unlink(temp_file)
            except:
                pass
        
        raise HTTPException(
            status_code=500,
            detail={
                "success": False,
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": f"创建任务失败: {str(e)}",
                    "details": {}
                }
            }
        )


@app.get("/api/v1/crawl-jobs", response_model=ApiResponse)
async def list_crawl_jobs(
    status: Optional[str] = Query(None, pattern="^(queued|running|completed|failed|cancelled)$"),
    task_type: Optional[str] = Query(None, pattern="^(single_star_id|single_handle|batch_star_ids|batch_handles)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort: str = Query("-created_at", pattern="^-?(created_at|started_at|completed_at)$")
):
    """获取任务列表"""
    
    with jobs_lock:
        jobs = list(jobs_registry.values())
    
    # 过滤
    if status:
        jobs = [job for job in jobs if job['status'] == status]
    if task_type:
        jobs = [job for job in jobs if job['task_type'] == task_type]
    
    # 排序
    reverse = sort.startswith('-')
    sort_field = sort.lstrip('-')
    jobs.sort(key=lambda x: x.get(sort_field, ''), reverse=reverse)
    
    # 分页
    total = len(jobs)
    start = (page - 1) * limit
    end = start + limit
    jobs_page = jobs[start:end]
    
    # 构建响应数据
    jobs_data = []
    for job in jobs_page:
        job_data = CrawlJob(
            job_id=job['job_id'],
            status=job['status'],
            task_type=job['task_type'],
            progress=JobProgress(**job['progress']),
            stats=JobStats(**job['stats']),
            created_at=job['created_at'],
            started_at=job.get('started_at'),
            completed_at=job.get('completed_at'),
            estimated_completion=job.get('estimated_completion'),
            error_message=job.get('error_message')
        )
        jobs_data.append(job_data.dict())
    
    return ApiResponse(
        success=True,
        data={
            "jobs": jobs_data,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        },
        message=f"获取到 {len(jobs_data)} 个任务"
    )


@app.get("/api/v1/crawl-jobs/{job_id}", response_model=ApiResponse)
async def get_crawl_job(job_id: str = PathParam(..., pattern="^[0-9a-f-]{36}$")):
    """获取任务详情"""
    
    with jobs_lock:
        if job_id not in jobs_registry:
            raise HTTPException(
                status_code=404,
                detail={
                    "success": False,
                    "error": {
                        "code": "JOB_NOT_FOUND",
                        "message": f"任务不存在: {job_id}",
                        "details": {"job_id": job_id}
                    }
                }
            )
        
        job = jobs_registry[job_id]
    
    job_data = CrawlJob(
        job_id=job['job_id'],
        status=job['status'],
        task_type=job['task_type'],
        progress=JobProgress(**job['progress']),
        stats=JobStats(**job['stats']),
        created_at=job['created_at'],
        started_at=job.get('started_at'),
        completed_at=job.get('completed_at'),
        estimated_completion=job.get('estimated_completion'),
        error_message=job.get('error_message')
    )
    
    return ApiResponse(
        success=True,
        data=job_data.dict(),
        message="获取任务详情成功"
    )


@app.delete("/api/v1/crawl-jobs/{job_id}", status_code=204)
async def delete_crawl_job(job_id: str = PathParam(..., pattern="^[0-9a-f-]{36}$")):
    """取消/删除任务"""
    
    with jobs_lock:
        if job_id not in jobs_registry:
            raise HTTPException(
                status_code=404,
                detail={
                    "success": False,
                    "error": {
                        "code": "JOB_NOT_FOUND",
                        "message": f"任务不存在: {job_id}",
                        "details": {"job_id": job_id}
                    }
                }
            )
        
        job = jobs_registry[job_id]
        
        # 如果任务正在运行，标记为取消（实际取消需要更复杂的实现）
        if job['status'] in ['queued', 'running']:
            job['status'] = 'cancelled'
            job['completed_at'] = get_current_timestamp()
        
        # 删除任务记录
        del jobs_registry[job_id]


@app.get("/api/v1/crawl-jobs/{job_id}/status", response_model=ApiResponse)
async def get_crawl_job_status(job_id: str = PathParam(..., pattern="^[0-9a-f-]{36}$")):
    """获取任务状态（轻量级）"""
    
    with jobs_lock:
        if job_id not in jobs_registry:
            raise HTTPException(
                status_code=404,
                detail={
                    "success": False,
                    "error": {
                        "code": "JOB_NOT_FOUND",
                        "message": f"任务不存在: {job_id}",
                        "details": {"job_id": job_id}
                    }
                }
            )
        
        job = jobs_registry[job_id]
    
    return ApiResponse(
        success=True,
        data={
            "job_id": job_id,
            "status": job['status'],
            "progress": job['progress']
        },
        message="获取任务状态成功"
    )


@app.get("/api/v1/crawl-jobs/{job_id}/results", response_model=ApiResponse)
async def get_crawl_job_results(
    job_id: str = PathParam(..., pattern="^[0-9a-f-]{36}$"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    format: str = Query("json", pattern="^(json|csv)$")
):
    """获取任务结果"""
    
    with jobs_lock:
        if job_id not in jobs_registry:
            raise HTTPException(
                status_code=404,
                detail={
                    "success": False,
                    "error": {
                        "code": "JOB_NOT_FOUND",
                        "message": f"任务不存在: {job_id}",
                        "details": {"job_id": job_id}
                    }
                }
            )
        
        job = jobs_registry[job_id]
    
    # 尝试读取 summary 作为结果统计来源
    summary = None
    try:
        summary_path = job.get('result_summary_path')
        if summary_path and os.path.exists(summary_path):
            summary = read_json_file(summary_path)
        if not summary:
            cfg = job.get('config', {}) or {}
            report_dir = cfg.get('report_dir') or os.path.join(project_root, "reports")
            second_label = str(
                cfg.get('search_star_id')
                or cfg.get('search_handle')
                or cfg.get('search_nickname')
                or cfg.get('keyword')
                or ""
            )
            if second_label:
                sp = find_latest_summary_path(report_dir, second_label)
                if sp and os.path.exists(sp):
                    summary = read_json_file(sp)
                    with jobs_lock:
                        jobs_registry[job_id]['result_summary_path'] = sp
                        jobs_registry[job_id]['result_summary'] = summary or {}
    except Exception:
        summary = None

    total_authors = int(summary.get('authors_total', 0) or 0) if isinstance(summary, dict) else 0
    pages = (total_authors + limit - 1) // limit if total_authors > 0 else 0

    # 当前版本返回空的明细列表，但带上 summary 和正确统计
    return ApiResponse(
        success=True,
        data={
            "results": [],
            "pagination": {"page": page, "limit": limit, "total": total_authors, "pages": pages},
            "summary": summary or {}
        },
        message="获取任务结果成功"
    )


# ==================== Health Check ====================

@app.get("/api/health")
async def health_check():
    """健康检查"""
    return {"status": "healthy", "timestamp": get_current_timestamp()}

@app.get("/api/v1/health")
async def health_check_v1():
    """健康检查 (v1 路径)"""
    return {"status": "healthy", "timestamp": get_current_timestamp()}


# ==================== Main ====================

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Author Square Crawler RESTful API Server")
    parser.add_argument("--host", default="127.0.0.1", help="Host to bind (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8009, help="Port to bind (default: 8009)")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload for development")
    parser.add_argument("--workers", type=int, default=1, help="Number of worker processes")
    
    args = parser.parse_args()
    
    uvicorn.run(
        "restful_api_server:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        workers=args.workers
    )