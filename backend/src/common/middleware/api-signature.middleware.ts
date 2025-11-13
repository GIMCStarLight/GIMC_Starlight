import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * API签名验证中间件
 * 用于服务间调用的签名验证
 */
@Injectable()
export class ApiSignatureMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ApiSignatureMiddleware.name);
  private readonly apiKeys: Set<string>;
  private readonly signatureTimeout = 300000; // 5分钟

  constructor(private configService: ConfigService) {
    const keys = this.configService.get<string>('API_KEYS', '');
    this.apiKeys = new Set(keys.split(',').filter((k) => k.length > 0));
  }

  use(req: Request, res: Response, next: NextFunction): void {
    // 跳过公开接口
    if (this.isPublicRoute(req.path)) {
      return next();
    }

    try {
      const apiKey = req.headers['x-api-key'] as string;
      const timestamp = req.headers['x-timestamp'] as string;
      const signature = req.headers['x-signature'] as string;

      // 验证必需的头部
      if (!apiKey || !timestamp || !signature) {
        throw new UnauthorizedException('Missing signature headers');
      }

      // 验证API Key
      if (!this.apiKeys.has(apiKey)) {
        throw new UnauthorizedException('Invalid API key');
      }

      // 验证时间戳（防重放攻击）
      const requestTime = parseInt(timestamp, 10);
      const currentTime = Date.now();
      if (Math.abs(currentTime - requestTime) > this.signatureTimeout) {
        throw new UnauthorizedException('Request expired');
      }

      // 验证签名
      const valid = this.verifySignature(req, apiKey, timestamp, signature);
      if (!valid) {
        throw new UnauthorizedException('Invalid signature');
      }

      next();
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Signature verification failed: ${error.message}`);
      throw new UnauthorizedException('Signature verification failed');
    }
  }

  private verifySignature(
    req: Request,
    apiKey: string,
    timestamp: string,
    receivedSignature: string,
  ): boolean {
    // 构建签名字符串
    const method = req.method;
    const path = req.path;
    const body = req.body ? JSON.stringify(req.body) : '';
    const query = req.query ? JSON.stringify(req.query) : '';

    const signString = `${method}${path}${timestamp}${apiKey}${query}${body}`;

    // 计算HMAC-SHA256签名
    const expectedSignature = crypto
      .createHmac('sha256', apiKey)
      .update(signString)
      .digest('hex');

    // 时间安全比较
    return crypto.timingSafeEqual(
      Buffer.from(receivedSignature),
      Buffer.from(expectedSignature),
    );
  }

  private isPublicRoute(path: string): boolean {
    const publicRoutes = [
      '/health',
      '/api/v1/auth/login',
      '/api/v1/auth/register',
      '/docs',
    ];

    return publicRoutes.some((route) => path.startsWith(route));
  }
}

/**
 * 生成API签名的辅助函数（客户端使用）
 */
export function generateApiSignature(
  method: string,
  path: string,
  apiKey: string,
  timestamp: string,
  query?: Record<string, any>,
  body?: Record<string, any>,
): string {
  const queryStr = query ? JSON.stringify(query) : '';
  const bodyStr = body ? JSON.stringify(body) : '';
  const signString = `${method}${path}${timestamp}${apiKey}${queryStr}${bodyStr}`;

  return crypto.createHmac('sha256', apiKey).update(signString).digest('hex');
}
