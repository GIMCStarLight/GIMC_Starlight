import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
// import * as helmet from 'helmet';
// import * as compression from 'compression';

/**
 * 安全中间件配置接口
 */
export interface SecurityConfig {
  /** 是否启用CORS */
  cors?: {
    enabled: boolean;
    origin?: string | string[] | boolean;
    credentials?: boolean;
    methods?: string[];
    allowedHeaders?: string[];
    exposedHeaders?: string[];
    maxAge?: number;
  };
  /** 是否启用Helmet安全头 */
  helmet?: {
    enabled: boolean;
    contentSecurityPolicy?: boolean;
    crossOriginEmbedderPolicy?: boolean;
    crossOriginOpenerPolicy?: boolean;
    crossOriginResourcePolicy?: boolean;
    dnsPrefetchControl?: boolean;
    frameguard?: boolean;
    hidePoweredBy?: boolean;
    hsts?: boolean;
    ieNoOpen?: boolean;
    noSniff?: boolean;
    originAgentCluster?: boolean;
    permittedCrossDomainPolicies?: boolean;
    referrerPolicy?: boolean;
    xssFilter?: boolean;
  };
  /** 是否启用压缩 */
  compression?: {
    enabled: boolean;
    level?: number;
    threshold?: number;
  };
  /** 请求体大小限制 */
  bodyLimit?: {
    json?: string;
    urlencoded?: string;
    raw?: string;
    text?: string;
  };
  /** 信任代理设置 */
  trustProxy?: boolean | string | number;
}

/**
 * 安全中间件
 * 提供CORS、安全头、压缩等安全功能
 */
@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly defaultConfig: SecurityConfig = {
    cors: {
      enabled: true,
      origin:
        process.env.NODE_ENV === 'production'
          ? process.env.ALLOWED_ORIGINS?.split(',') || false
          : true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-Trace-Id',
        'X-Request-Id',
        'X-Client-Version',
      ],
      exposedHeaders: [
        'X-Trace-Id',
        'X-Response-Time',
        'X-RateLimit-Limit',
        'X-RateLimit-Remaining',
        'X-RateLimit-Reset',
      ],
      maxAge: 86400, // 24小时
    },
    helmet: {
      enabled: true,
      contentSecurityPolicy: process.env.NODE_ENV === 'production',
      crossOriginEmbedderPolicy: false, // 避免影响第三方资源
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: false,
      dnsPrefetchControl: true,
      frameguard: false,
      hidePoweredBy: true,
      hsts: process.env.NODE_ENV === 'production',
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
      referrerPolicy: false,
      xssFilter: true,
    },
    compression: {
      enabled: true,
      level: 6, // 压缩级别 1-9
      threshold: 1024, // 1KB以上才压缩
    },
    bodyLimit: {
      json: '10mb',
      urlencoded: '10mb',
      raw: '10mb',
      text: '10mb',
    },
    trustProxy: process.env.NODE_ENV === 'production',
  };

  constructor() {
    // 使用默认配置
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 设置信任代理
      if (this.defaultConfig.trustProxy !== undefined) {
        req.app.set('trust proxy', this.defaultConfig.trustProxy);
      }

      // 应用安全中间件
      this.applySecurity(req, res, next);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 应用安全中间件
   */
  private applySecurity(req: Request, res: Response, next: NextFunction): void {
    let middlewareChain = Promise.resolve();

    // 应用Helmet安全头
    if (this.defaultConfig.helmet?.enabled) {
      middlewareChain = middlewareChain.then(() => this.applyHelmet(req, res));
    }

    // 应用CORS
    if (this.defaultConfig.cors?.enabled) {
      middlewareChain = middlewareChain.then(() => this.applyCors(req, res));
    }

    // 应用压缩
    if (this.defaultConfig.compression?.enabled) {
      middlewareChain = middlewareChain.then(() =>
        this.applyCompression(req, res),
      );
    }

    // 应用自定义安全头
    middlewareChain = middlewareChain.then(() =>
      this.applyCustomHeaders(req, res),
    );

    middlewareChain.then(() => next()).catch(next);
  }

  /**
   * 应用Helmet安全头
   */
  private async applyHelmet(req: Request, res: Response): Promise<void> {
    // 临时禁用 helmet，需要安装相应依赖
    // return new Promise((resolve, reject) => {
    //   const helmetMiddleware = helmet(this.config.helmet as any);
    //   helmetMiddleware(req, res, (err) => {
    //     if (err) reject(err);
    //     else resolve();
    //   });
    // });

    // 手动设置基本安全头
    const helmetConfig = this.defaultConfig.helmet!;

    if (helmetConfig.hidePoweredBy) {
      res.removeHeader('X-Powered-By');
    }

    if (helmetConfig.noSniff) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    if (helmetConfig.frameguard) {
      res.setHeader('X-Frame-Options', 'DENY');
    }

    if (helmetConfig.xssFilter) {
      res.setHeader('X-XSS-Protection', '1; mode=block');
    }

    if (helmetConfig.hsts && process.env.NODE_ENV === 'production') {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      );
    }

    return Promise.resolve();
  }

  /**
   * 应用CORS
   */
  private async applyCors(req: Request, res: Response): Promise<void> {
    const corsConfig = this.defaultConfig.cors!;

    // 处理预检请求
    if (req.method === 'OPTIONS') {
      this.handlePreflightRequest(req, res, corsConfig);
      return;
    }

    // 设置CORS头
    this.setCorsHeaders(req, res, corsConfig);
  }

  /**
   * 处理预检请求
   */
  private handlePreflightRequest(
    req: Request,
    res: Response,
    corsConfig: NonNullable<SecurityConfig['cors']>,
  ): void {
    const origin = req.headers.origin;
    const requestMethod = req.headers['access-control-request-method'];
    const requestHeaders = req.headers['access-control-request-headers'];

    // 检查Origin
    if (this.isOriginAllowed(origin, corsConfig.origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }

    // 设置允许的方法
    if (
      corsConfig.methods &&
      corsConfig.methods.includes(requestMethod as string)
    ) {
      res.setHeader(
        'Access-Control-Allow-Methods',
        corsConfig.methods.join(', '),
      );
    }

    // 设置允许的头
    if (corsConfig.allowedHeaders) {
      res.setHeader(
        'Access-Control-Allow-Headers',
        corsConfig.allowedHeaders.join(', '),
      );
    }

    // 设置凭据
    if (corsConfig.credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    // 设置缓存时间
    if (corsConfig.maxAge) {
      res.setHeader('Access-Control-Max-Age', corsConfig.maxAge.toString());
    }

    res.status(204).end();
  }

  /**
   * 设置CORS头
   */
  private setCorsHeaders(
    req: Request,
    res: Response,
    corsConfig: NonNullable<SecurityConfig['cors']>,
  ): void {
    const origin = req.headers.origin;

    // 设置Origin
    if (this.isOriginAllowed(origin, corsConfig.origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }

    // 设置暴露的头
    if (corsConfig.exposedHeaders) {
      res.setHeader(
        'Access-Control-Expose-Headers',
        corsConfig.exposedHeaders.join(', '),
      );
    }

    // 设置凭据
    if (corsConfig.credentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  }

  /**
   * 检查Origin是否被允许
   */
  private isOriginAllowed(
    origin: string | undefined,
    allowedOrigin: string | string[] | boolean | undefined,
  ): boolean {
    if (allowedOrigin === true) return true;
    if (allowedOrigin === false) return false;
    if (!origin) return false;

    if (typeof allowedOrigin === 'string') {
      return origin === allowedOrigin;
    }

    if (Array.isArray(allowedOrigin)) {
      return allowedOrigin.includes(origin);
    }

    return false;
  }

  /**
   * 应用压缩
   */
  private async applyCompression(req: Request, res: Response): Promise<void> {
    // 临时禁用 compression，需要安装相应依赖
    // return new Promise((resolve, reject) => {
    //   const compressionMiddleware = compression({
    //     level: this.config.compression!.level,
    //     threshold: this.config.compression!.threshold,
    //     filter: (req, res) => {
    //       // 不压缩已经压缩的内容
    //       if (req.headers['x-no-compression']) {
    //         return false;
    //       }
    //       // 使用默认过滤器
    //       return compression.filter(req, res);
    //     },
    //   });
    //
    //   compressionMiddleware(req, res, (err) => {
    //     if (err) reject(err);
    //     else resolve();
    //   });
    // });

    // 设置压缩相关头部（如果需要的话）
    if (!req.headers['x-no-compression']) {
      res.setHeader('Vary', 'Accept-Encoding');
    }

    return Promise.resolve();
  }

  /**
   * 应用自定义安全头
   */
  private applyCustomHeaders(req: Request, res: Response): void {
    // 设置服务器信息
    res.setHeader('X-Powered-By', 'GIMCStarLight System');

    // 设置API版本
    res.setHeader('X-API-Version', process.env.API_VERSION || '1.0.0');

    // 设置响应时间
    res.setHeader('X-Response-Time', Date.now().toString());

    // 设置内容类型选项
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // 设置下载选项（IE）
    res.setHeader('X-Download-Options', 'noopen');

    // 设置XSS保护
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // 设置Referrer策略
    res.setHeader('Referrer-Policy', 'same-origin');

    // 设置权限策略
    res.setHeader(
      'Permissions-Policy',
      ['camera=()', 'microphone=()', 'geolocation=()', 'payment=()'].join(', '),
    );
  }
}

/**
 * 创建安全中间件工厂函数
 */
export function createSecurityMiddleware(config?: SecurityConfig) {
  return new SecurityMiddleware().use.bind(new SecurityMiddleware());
}
