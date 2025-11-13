/**
 * 拦截器配置文件
 * 统一管理API拦截器的配置选项
 */

/**
 * 响应拦截器配置
 */
export interface ResponseInterceptorConfig {
  /** 是否启用响应拦截器 */
  enabled: boolean;
  /** 是否记录响应日志 */
  enableLogging: boolean;
  /** 是否生成traceId */
  enableTraceId: boolean;
  /** 慢请求阈值（毫秒） */
  slowRequestThreshold: number;
  /** 是否在响应头中包含traceId */
  includeTraceIdInHeader: boolean;
  /** 是否在响应中包含执行时间 */
  includeExecutionTime: boolean;
}

/**
 * 异常过滤器配置
 */
export interface ExceptionFilterConfig {
  /** 是否启用异常过滤器 */
  enabled: boolean;
  /** 是否记录异常日志 */
  enableLogging: boolean;
  /** 是否在生产环境中隐藏敏感信息 */
  hideSensitiveInfo: boolean;
  /** 是否包含堆栈跟踪 */
  includeStackTrace: boolean;
  /** 自定义错误消息映射 */
  customErrorMessages: Record<string, string>;
}

/**
 * 请求日志中间件配置
 */
export interface RequestLoggerConfig {
  /** 是否启用请求日志 */
  enabled: boolean;
  /** 是否记录请求体 */
  logRequestBody: boolean;
  /** 是否记录响应体 */
  logResponseBody: boolean;
  /** 是否记录请求头 */
  logRequestHeaders: boolean;
  /** 是否记录响应头 */
  logResponseHeaders: boolean;
  /** 需要过滤的敏感字段 */
  sensitiveFields: string[];
  /** 最大请求体大小（字节） */
  maxBodySize: number;
  /** 慢请求阈值（毫秒） */
  slowRequestThreshold: number;
}

/**
 * 限流中间件配置
 */
export interface RateLimitConfig {
  /** 是否启用限流 */
  enabled: boolean;
  /** 默认限流配置 */
  default: {
    /** 时间窗口（秒） */
    windowMs: number;
    /** 最大请求数 */
    max: number;
    /** 是否跳过成功请求 */
    skipSuccessfulRequests: boolean;
    /** 是否跳过失败请求 */
    skipFailedRequests: boolean;
  };
  /** 预定义限流配置 */
  presets: Record<
    string,
    {
      windowMs: number;
      max: number;
      skipSuccessfulRequests?: boolean;
      skipFailedRequests?: boolean;
    }
  >;
}

/**
 * 安全中间件配置
 */
export interface SecurityConfig {
  /** 是否启用安全中间件 */
  enabled: boolean;
  /** CORS配置 */
  cors: {
    enabled: boolean;
    origin: string | string[] | boolean;
    methods: string[];
    allowedHeaders: string[];
    credentials: boolean;
    maxAge: number;
  };
  /** Helmet配置 */
  helmet: {
    enabled: boolean;
    contentSecurityPolicy: boolean;
    crossOriginEmbedderPolicy: boolean;
    crossOriginOpenerPolicy: boolean;
    crossOriginResourcePolicy: boolean;
    dnsPrefetchControl: boolean;
    frameguard: boolean;
    hidePoweredBy: boolean;
    hsts: boolean;
    ieNoOpen: boolean;
    noSniff: boolean;
    originAgentCluster: boolean;
    permittedCrossDomainPolicies: boolean;
    referrerPolicy: boolean;
    xssFilter: boolean;
  };
  /** 压缩配置 */
  compression: {
    enabled: boolean;
    level: number;
    threshold: number;
  };
  /** 请求体大小限制 */
  bodyLimit: {
    json: string;
    urlencoded: string;
    raw: string;
    text: string;
  };
}

/**
 * 验证管道配置
 */
export interface ValidationConfig {
  /** 是否启用验证管道 */
  enabled: boolean;
  /** 是否自动转换类型 */
  transform: boolean;
  /** 是否启用隐式转换 */
  enableImplicitConversion: boolean;
  /** 是否跳过缺失属性 */
  skipMissingProperties: boolean;
  /** 是否跳过null值 */
  skipNullProperties: boolean;
  /** 是否跳过undefined值 */
  skipUndefinedProperties: boolean;
  /** 是否禁止未知属性 */
  forbidUnknownValues: boolean;
  /** 是否去除未知属性 */
  whitelist: boolean;
  /** 是否在发现未知属性时抛出错误 */
  forbidNonWhitelisted: boolean;
  /** 验证组 */
  groups: string[];
  /** 是否总是验证 */
  always: boolean;
  /** 是否启用详细错误 */
  dismissDefaultMessages: boolean;
  /** 验证错误消息语言 */
  validationError: {
    target: boolean;
    property: boolean;
    value: boolean;
    constraints: boolean;
  };
}

/**
 * 拦截器总配置
 */
export interface InterceptorConfig {
  /** 响应拦截器配置 */
  response: ResponseInterceptorConfig;
  /** 异常过滤器配置 */
  exception: ExceptionFilterConfig;
  /** 请求日志配置 */
  requestLogger: RequestLoggerConfig;
  /** 限流配置 */
  rateLimit: RateLimitConfig;
  /** 安全配置 */
  security: SecurityConfig;
  /** 验证配置 */
  validation: ValidationConfig;
}

/**
 * 默认拦截器配置
 */
export const defaultInterceptorConfig: InterceptorConfig = {
  response: {
    enabled: true,
    enableLogging: true,
    enableTraceId: true,
    slowRequestThreshold: 1000,
    includeTraceIdInHeader: true,
    includeExecutionTime: true,
  },
  exception: {
    enabled: true,
    enableLogging: true,
    hideSensitiveInfo: process.env.NODE_ENV === 'production',
    includeStackTrace: process.env.NODE_ENV !== 'production',
    customErrorMessages: {
      VALIDATION_ERROR: '请求参数验证失败',
      UNAUTHORIZED: '未授权访问',
      FORBIDDEN: '禁止访问',
      NOT_FOUND: '资源不存在',
      CONFLICT: '资源冲突',
      RATE_LIMIT_EXCEEDED: '请求频率超限',
      INTERNAL_SERVER_ERROR: '服务器内部错误',
    },
  },
  requestLogger: {
    enabled: true,
    logRequestBody: true,
    logResponseBody: false,
    logRequestHeaders: false,
    logResponseHeaders: false,
    sensitiveFields: [
      'password',
      'token',
      'authorization',
      'cookie',
      'x-api-key',
      'secret',
      'key',
      'auth',
      'credential',
    ],
    maxBodySize: 10 * 1024, // 10KB
    slowRequestThreshold: 1000,
  },
  rateLimit: {
    enabled: true,
    default: {
      windowMs: 15 * 60 * 1000, // 15分钟
      max: 100, // 最多100个请求
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    },
    presets: {
      STRICT: {
        windowMs: 15 * 60 * 1000, // 15分钟
        max: 50, // 最多50个请求
      },
      LOGIN: {
        windowMs: 15 * 60 * 1000, // 15分钟
        max: 5, // 最多5次登录尝试
      },
      SMS: {
        windowMs: 60 * 1000, // 1分钟
        max: 1, // 最多1条短信
      },
      EMAIL: {
        windowMs: 60 * 1000, // 1分钟
        max: 3, // 最多3封邮件
      },
      UPLOAD: {
        windowMs: 60 * 1000, // 1分钟
        max: 10, // 最多10次上传
      },
      API: {
        windowMs: 60 * 1000, // 1分钟
        max: 1000, // 最多1000个API请求
      },
    },
  },
  security: {
    enabled: true,
    cors: {
      enabled: true,
      origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-API-Key',
        'X-Trace-Id',
      ],
      credentials: true,
      maxAge: 86400, // 24小时
    },
    helmet: {
      enabled: true,
      contentSecurityPolicy: false, // 在开发环境中可能需要禁用
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: false,
      dnsPrefetchControl: true,
      frameguard: true,
      hidePoweredBy: true,
      hsts: process.env.NODE_ENV === 'production',
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
      referrerPolicy: true,
      xssFilter: true,
    },
    compression: {
      enabled: true,
      level: 6,
      threshold: 1024, // 1KB
    },
    bodyLimit: {
      json: '10mb',
      urlencoded: '10mb',
      raw: '10mb',
      text: '10mb',
    },
  },
  validation: {
    enabled: true,
    transform: true,
    enableImplicitConversion: true,
    skipMissingProperties: false,
    skipNullProperties: false,
    skipUndefinedProperties: false,
    forbidUnknownValues: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    groups: [],
    always: false,
    dismissDefaultMessages: false,
    validationError: {
      target: false,
      property: true,
      value: false,
      constraints: true,
    },
  },
};

/**
 * 获取拦截器配置
 */
export function getInterceptorConfig(): InterceptorConfig {
  // 可以从环境变量或配置文件中读取配置
  // 这里使用默认配置，实际项目中可以根据需要进行扩展
  return {
    ...defaultInterceptorConfig,
    // 可以根据环境变量覆盖配置
    response: {
      ...defaultInterceptorConfig.response,
      enabled: process.env.RESPONSE_INTERCEPTOR_ENABLED !== 'false',
      enableLogging: process.env.RESPONSE_LOGGING_ENABLED !== 'false',
      slowRequestThreshold: parseInt(
        process.env.SLOW_REQUEST_THRESHOLD || '1000',
      ),
    },
    exception: {
      ...defaultInterceptorConfig.exception,
      enabled: process.env.EXCEPTION_FILTER_ENABLED !== 'false',
      enableLogging: process.env.EXCEPTION_LOGGING_ENABLED !== 'false',
    },
    requestLogger: {
      ...defaultInterceptorConfig.requestLogger,
      enabled: process.env.REQUEST_LOGGER_ENABLED !== 'false',
      logRequestBody: process.env.LOG_REQUEST_BODY !== 'false',
      logResponseBody: process.env.LOG_RESPONSE_BODY === 'true',
    },
    rateLimit: {
      ...defaultInterceptorConfig.rateLimit,
      enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    },
    security: {
      ...defaultInterceptorConfig.security,
      enabled: process.env.SECURITY_MIDDLEWARE_ENABLED !== 'false',
    },
    validation: {
      ...defaultInterceptorConfig.validation,
      enabled: process.env.VALIDATION_PIPE_ENABLED !== 'false',
    },
  };
}

/**
 * 环境变量配置映射
 */
export const ENV_CONFIG_MAP = {
  // 响应拦截器
  RESPONSE_INTERCEPTOR_ENABLED: 'response.enabled',
  RESPONSE_LOGGING_ENABLED: 'response.enableLogging',
  SLOW_REQUEST_THRESHOLD: 'response.slowRequestThreshold',

  // 异常过滤器
  EXCEPTION_FILTER_ENABLED: 'exception.enabled',
  EXCEPTION_LOGGING_ENABLED: 'exception.enableLogging',

  // 请求日志
  REQUEST_LOGGER_ENABLED: 'requestLogger.enabled',
  LOG_REQUEST_BODY: 'requestLogger.logRequestBody',
  LOG_RESPONSE_BODY: 'requestLogger.logResponseBody',

  // 限流
  RATE_LIMIT_ENABLED: 'rateLimit.enabled',

  // 安全
  SECURITY_MIDDLEWARE_ENABLED: 'security.enabled',
  CORS_ORIGIN: 'security.cors.origin',

  // 验证
  VALIDATION_PIPE_ENABLED: 'validation.enabled',
} as const;
