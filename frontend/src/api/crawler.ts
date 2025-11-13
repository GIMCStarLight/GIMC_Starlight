/**
 * 爬虫任务API接口
 * 用于调用Python爬虫服务的RESTful API
 */

// 兼容类型环境的环境变量读取，避免直接引用 import.meta.env 导致类型诊断
const ENV: Record<string, any> =
  (typeof import.meta !== "undefined" && (import.meta as any)?.env) || {};
const IS_PROD: boolean = !!ENV.PROD;

// 爬虫服务基础URL（需要配置到环境变量中），生产默认走同源代理路径并指向 v1
// dev 环境通过 vite 代理已将 /crawler-api 重写到 target 的 /api/v1
// 这里默认使用 /crawler-api/api/v1，若需要可通过 VITE_CRAWLER_API_BASE_URL 覆盖
const CRAWLER_API_BASE_URL = (
  ENV.VITE_CRAWLER_API_BASE_URL || "/crawler-api/api/v1"
).replace(/\/$/, "");

// 可选：为线上环境注入 X-SQLBOT-TOKEN，以通过服务器侧的额外鉴权
import { sqlbotApi } from "./sqlbot";
import { useAccessStore } from "@vben/stores";

let _sqlbotToken: string | null = null;
let _sqlbotAppId: string | null = null;
let _sqlbotTokenExpiresAt = 0;

async function ensureSqlbotToken(): Promise<string | null> {
  // 不再仅限生产环境：在任何环境均尝试确保获取到 SQLBot Token，避免因环境判断导致未注入
  const now = Date.now();
  if (_sqlbotToken && now < _sqlbotTokenExpiresAt - 30_000) {
    return _sqlbotToken;
  }
  try {
    const resp = await sqlbotApi.getToken({ account: "admin" });
    _sqlbotToken = resp.token;
    _sqlbotAppId = resp.appId;
    // 后端返回的 expiresIn 单位秒，换算为毫秒
    _sqlbotTokenExpiresAt = now + (resp.expiresIn || 600) * 1000;
    console.debug("[CrawlerAPI] SQLBot token acquired", {
      appId: _sqlbotAppId,
      expiresAt: new Date(_sqlbotTokenExpiresAt).toISOString(),
    });
    return _sqlbotToken;
  } catch (e) {
    console.warn("获取SQLBot Token失败，尝试兜底方式:", e);
    try {
      const res = await fetch("/api/sqlbot/token?account=admin");
      if (!res.ok) throw new Error(`fallback http ${res.status}`);
      const data = await res.json();
      const payload = (data && (data.data || data)) || {};
      _sqlbotToken = payload.token;
      _sqlbotAppId = payload.appId;
      _sqlbotTokenExpiresAt =
        now + (payload.expiresIn ? payload.expiresIn * 1000 : 600_000);
      console.debug("[CrawlerAPI] SQLBot token acquired via fallback", {
        appId: _sqlbotAppId,
        expiresAt: new Date(_sqlbotTokenExpiresAt).toISOString(),
      });
      if (_sqlbotToken) return _sqlbotToken;
    } catch (ee) {
      console.warn("兜底获取SQLBot Token仍失败，暂不注入令牌:", ee);
    }
    return null;
  }
}

function getSqlbotAuthHeader(): string | null {
  if (_sqlbotToken && _sqlbotAppId) {
    // SQLBot容器的TokenMiddleware支持“Embedded <jwt>”方案，无需容器SECRET签名
    return `Embedded ${_sqlbotToken}`;
  }
  return null;
}

function getAuthorizationHeader(): string | null {
  try {
    const accessStore = useAccessStore();
    const token = accessStore?.accessToken;
    return token ? `Bearer ${token}` : null;
  } catch (e) {
    // 在非组件上下文或初始化阶段，useAccessStore可能不可用
    return null;
  }
}

/**
 * 任务类型
 */
export type CrawlTaskType =
  | "single_star_id"
  | "single_handle"
  | "batch_star_ids"
  | "batch_handles";

/**
 * 任务状态
 */
export type CrawlJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * 创建爬虫任务请求参数
 */
export interface CreateCrawlJobRequest {
  task_type: CrawlTaskType;
  target: {
    star_id?: string;
    handle?: string;
    star_ids?: string[];
    handles?: string[];
    dedup?: boolean;
  };
  options?: {
    cookies_file?: string;
    star_id_header?: string | number;
    output_dir?: string;
    report_dir?: string;
    page?: number;
    limit?: number;
    min_price?: number;
    video_type?: string | number;
    domain_qps?: number;
    qps_window_ms?: number;
    retry_max?: number;
    retry_backoff_ms?: number;
    sleep_ms?: number;
    sleep_between_keywords_ms?: number;
    save_pg?: boolean;
    pg_config?: string;
    payload_override?: string;
    dry_run?: boolean;
  };
}

/**
 * 爬虫任务响应
 */
export interface CrawlJobResponse {
  success: boolean;
  data: {
    job_id: string;
    status: CrawlJobStatus;
    task_type: CrawlTaskType;
    created_at: string;
    estimated_duration?: string;
  };
  message: string;
  timestamp: string;
}

/**
 * 任务详情响应
 */
export interface CrawlJobDetailResponse {
  success: boolean;
  data: {
    job_id: string;
    status: CrawlJobStatus;
    task_type: CrawlTaskType;
    progress: {
      current: number;
      total: number;
      percentage: number;
      current_keyword?: string;
    };
    stats: {
      total_authors_found: number;
      successful_requests: number;
      failed_requests: number;
    };
    created_at: string;
    started_at?: string;
    completed_at?: string;
    estimated_completion?: string;
    error_message?: string;
  };
  message: string;
  timestamp: string;
}

/**
 * 任务结果响应
 */
export interface CrawlJobResultResponse {
  success: boolean;
  data: {
    results: any[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
    summary: {
      first_label: string;
      second_label: string;
      start_page: number;
      pages_done: number;
      authors_total: number;
      failed_pages: number;
      finished_at: string;
    };
  };
  message: string;
  timestamp: string;
}

/**
 * 创建爬虫任务
 */
export async function createCrawlJob(
  params: CreateCrawlJobRequest
): Promise<CrawlJobResponse> {
  const token = await ensureSqlbotToken();
  const authHeader = getSqlbotAuthHeader();
  const bearer = getAuthorizationHeader();
  console.debug("[CrawlerAPI] createCrawlJob headers", {
    assistantToken: authHeader,
    tokenHeader: authHeader ? "[X-SQLBOT-TOKEN]" : null,
    authorization: bearer ? "[Bearer]" : null,
  });
  const response = await fetch(`${CRAWLER_API_BASE_URL}/crawl-jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // 使用容器支持的助手令牌头与Embedded方案
      // 兼容两种服务端头部命名：ASSISTANT 与 TOKEN
      ...(authHeader ? { "X-SQLBOT-ASSISTANT-TOKEN": authHeader } : {}),
      ...(authHeader ? { "X-SQLBOT-TOKEN": authHeader } : {}),
      // 兼容可能的网关校验：同时附加 APPID
      ...(_sqlbotAppId ? { "X-SQLBOT-APPID": _sqlbotAppId } : {}),
      ...(bearer ? { Authorization: bearer } : {}),
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Network error" }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * 获取任务状态
 */
export async function getCrawlJobStatus(
  jobId: string
): Promise<CrawlJobDetailResponse> {
  const token = await ensureSqlbotToken();
  const authHeader = getSqlbotAuthHeader();
  const bearer = getAuthorizationHeader();
  console.debug("[CrawlerAPI] getCrawlJobStatus headers", {
    assistantToken: authHeader,
    tokenHeader: authHeader ? "[X-SQLBOT-TOKEN]" : null,
    authorization: bearer ? "[Bearer]" : null,
  });
  const response = await fetch(
    `${CRAWLER_API_BASE_URL}/crawl-jobs/${jobId}/status`,
    {
      headers: {
        ...(authHeader ? { "X-SQLBOT-ASSISTANT-TOKEN": authHeader } : {}),
        ...(authHeader ? { "X-SQLBOT-TOKEN": authHeader } : {}),
        ...(_sqlbotAppId ? { "X-SQLBOT-APPID": _sqlbotAppId } : {}),
        ...(bearer ? { Authorization: bearer } : {}),
      },
    }
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Network error" }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * 获取任务详情
 */
export async function getCrawlJobDetail(
  jobId: string
): Promise<CrawlJobDetailResponse> {
  const token = await ensureSqlbotToken();
  const authHeader = getSqlbotAuthHeader();
  const bearer = getAuthorizationHeader();
  console.debug("[CrawlerAPI] getCrawlJobDetail headers", {
    assistantToken: authHeader,
    tokenHeader: authHeader ? "[X-SQLBOT-TOKEN]" : null,
    authorization: bearer ? "[Bearer]" : null,
  });
  const response = await fetch(`${CRAWLER_API_BASE_URL}/crawl-jobs/${jobId}`, {
    headers: {
      ...(authHeader ? { "X-SQLBOT-ASSISTANT-TOKEN": authHeader } : {}),
      ...(authHeader ? { "X-SQLBOT-TOKEN": authHeader } : {}),
      ...(_sqlbotAppId ? { "X-SQLBOT-APPID": _sqlbotAppId } : {}),
      ...(bearer ? { Authorization: bearer } : {}),
    },
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Network error" }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * 获取任务结果
 */
export async function getCrawlJobResults(
  jobId: string,
  page: number = 1,
  limit: number = 50
): Promise<CrawlJobResultResponse> {
  const token = await ensureSqlbotToken();
  const authHeader = getSqlbotAuthHeader();
  const bearer = getAuthorizationHeader();
  console.debug("[CrawlerAPI] getCrawlJobResults headers", {
    assistantToken: authHeader,
    tokenHeader: authHeader ? "[X-SQLBOT-TOKEN]" : null,
    authorization: bearer ? "[Bearer]" : null,
  });
  const response = await fetch(
    `${CRAWLER_API_BASE_URL}/crawl-jobs/${jobId}/results?page=${page}&limit=${limit}`,
    {
      headers: {
        ...(authHeader ? { "X-SQLBOT-ASSISTANT-TOKEN": authHeader } : {}),
        ...(authHeader ? { "X-SQLBOT-TOKEN": authHeader } : {}),
        ...(_sqlbotAppId ? { "X-SQLBOT-APPID": _sqlbotAppId } : {}),
        ...(bearer ? { Authorization: bearer } : {}),
      },
    }
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Network error" }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * 轮询任务状态直到完成或失败
 */
export async function pollCrawlJobStatus(
  jobId: string,
  onProgress?: (
    status: CrawlJobStatus,
    detail: CrawlJobDetailResponse["data"]
  ) => void,
  intervalMs: number = 2000,
  maxAttempts: number = 150 // 默认最多轮询5分钟
): Promise<CrawlJobDetailResponse["data"]> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    const response = await getCrawlJobDetail(jobId);
    const { status } = response.data;

    // 调用进度回调
    if (onProgress) {
      onProgress(status, response.data);
    }

    // 任务已完成或失败
    if (
      status === "completed" ||
      status === "failed" ||
      status === "cancelled"
    ) {
      return response.data;
    }

    // 等待一段时间后再次查询
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    attempts++;
  }

  throw new Error("轮询超时：任务执行时间过长");
}
