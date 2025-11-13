import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * 请求日志中间件
 * 记录所有API请求的详细信息
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggerMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    const startTime = Date.now();

    // 生成或获取追踪ID
    const traceId =
      (req.headers['x-trace-id'] as string) ||
      (req.headers['x-request-id'] as string) ||
      randomUUID();

    // 将追踪ID添加到请求对象
    (req as any).traceId = traceId;
    (req as any).startTime = startTime;

    // 设置响应头
    res.setHeader('X-Trace-Id', traceId);

    // 记录请求开始日志
    this.logRequest(req, traceId);

    // 监听响应结束事件
    res.on('finish', () => {
      this.logResponse(req, res, startTime, traceId);
    });

    // 监听响应关闭事件（客户端断开连接）
    res.on('close', () => {
      if (!res.headersSent) {
        this.logResponse(req, res, startTime, traceId, true);
      }
    });

    next();
  }

  /**
   * 记录请求日志
   */
  private logRequest(req: Request, traceId: string): void {
    const { method, url, ip, headers } = req;
    const userAgent = headers['user-agent'] || '';
    const contentType = headers['content-type'] || '';
    const contentLength = headers['content-length'] || '0';

    // 获取真实IP
    const realIp = this.getRealIp(req);

    const logData = {
      traceId,
      method,
      url,
      ip: realIp,
      userAgent: userAgent.substring(0, 200), // 限制长度
      contentType,
      contentLength,
      query: req.query,
      params: req.params,
      body: this.sanitizeRequestBody(req.body),
      timestamp: new Date().toISOString(),
      type: 'REQUEST_START',
    };

    this.logger.log(`📥 ${method} ${url}`, logData);
  }

  /**
   * 记录响应日志
   */
  private logResponse(
    req: Request,
    res: Response,
    startTime: number,
    traceId: string,
    isClientDisconnect = false,
  ): void {
    const endTime = Date.now();
    const duration = endTime - startTime;
    const { method, url } = req;
    const { statusCode } = res;

    const logData = {
      traceId,
      method,
      url,
      statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length') || '0',
      timestamp: new Date().toISOString(),
      type: isClientDisconnect ? 'CLIENT_DISCONNECT' : 'REQUEST_END',
    };

    // 根据状态码和响应时间决定日志级别
    const emoji = this.getStatusEmoji(statusCode, duration, isClientDisconnect);
    const message = `${emoji} ${method} ${url} - ${statusCode} (${duration}ms)`;

    if (isClientDisconnect) {
      this.logger.warn(message, logData);
    } else if (statusCode >= 500) {
      this.logger.error(message, logData);
    } else if (statusCode >= 400) {
      this.logger.warn(message, logData);
    } else if (duration > 2000) {
      // 响应时间超过2秒
      this.logger.warn(message, { ...logData, slowResponse: true });
    } else {
      this.logger.log(message, logData);
    }
  }

  /**
   * 获取真实IP地址
   */
  private getRealIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      (req.headers['x-client-ip'] as string) ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown'
    );
  }

  /**
   * 清理请求体中的敏感信息
   */
  private sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = [
      'password',
      'token',
      'authorization',
      'secret',
      'key',
      'credential',
      'captcha',
      'code', // 验证码
    ];

    const sanitized = Array.isArray(body) ? [...body] : { ...body };

    const sanitizeObject = (obj: any): any => {
      if (!obj || typeof obj !== 'object') {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map((item) => sanitizeObject(item));
      }

      const result = { ...obj };
      Object.keys(result).forEach((key) => {
        const lowerKey = key.toLowerCase();
        if (sensitiveFields.some((field) => lowerKey.includes(field))) {
          result[key] = '***';
        } else if (typeof result[key] === 'object') {
          result[key] = sanitizeObject(result[key]);
        }
      });

      return result;
    };

    return sanitizeObject(sanitized);
  }

  /**
   * 根据状态码和响应时间获取表情符号
   */
  private getStatusEmoji(
    statusCode: number,
    duration: number,
    isClientDisconnect: boolean,
  ): string {
    if (isClientDisconnect) {
      return '🔌'; // 客户端断开
    }

    if (statusCode >= 500) {
      return '💥'; // 服务器错误
    }

    if (statusCode >= 400) {
      return '⚠️'; // 客户端错误
    }

    if (duration > 2000) {
      return '🐌'; // 响应缓慢
    }

    if (duration < 100) {
      return '⚡'; // 响应很快
    }

    return '📤'; // 正常响应
  }
}
