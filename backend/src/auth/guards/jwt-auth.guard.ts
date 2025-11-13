import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { JwtBlacklistService } from '../services/jwt-blacklist.service';
import { SessionService } from '../services/session.service';

// 扩展Request接口
declare module 'express' {
  interface Request {
    refreshToken?: string;
  }
}

/**
 * JWT认证守卫
 * 负责验证JWT令牌并检查黑名单
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly jwtBlacklistService: JwtBlacklistService,
    private readonly sessionService: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      this.logger.warn('JWT认证失败: 访问令牌缺失');
      throw new UnauthorizedException('访问令牌缺失');
    }

    try {
      // 验证JWT令牌并检查黑名单
      const validationResult =
        await this.jwtBlacklistService.validateToken(token);

      if (!validationResult.valid) {
        this.logger.warn(`JWT验证失败: ${validationResult.reason}`);
        throw new UnauthorizedException(validationResult.reason);
      }

      const payload = validationResult.payload;

      // 验证会话是否仍然有效
      const sessionValid = await this.sessionService.validateSession(
        payload.jti,
      );

      if (!sessionValid) {
        this.logger.warn(
          `会话无效: userId=${payload.userId}, jti=${payload.jti}`,
        );
        throw new UnauthorizedException('会话已过期或无效');
      }

      // 更新会话活动时间
      await this.sessionService.updateSessionActivity(payload.jti);

      // 将用户信息附加到请求对象
      request.user = {
        userId: payload.userId,
        username: payload.username,
        email: payload.email,
        roles: payload.roles || [],
        permissions: payload.permissions || [],
        jti: payload.jti,
        sessionId: payload.jti,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // 记录详细的错误信息
      this.logger.error(`JWT认证异常: ${error.message}`, {
        error: error.message,
        stack: error.stack,
        url: request.url,
        method: request.method,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
      });

      throw new UnauthorizedException('令牌验证失败，请重新登录');
    }
  }

  /**
   * 从请求头中提取JWT令牌
   */
  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      return undefined;
    }

    return token;
  }
}

/**
 * 可选JWT认证守卫
 * 如果有令牌则验证，没有令牌则跳过（用于可选认证的路由）
 */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(OptionalJwtAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly jwtBlacklistService: JwtBlacklistService,
    private readonly sessionService: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    // 如果没有令牌，直接通过
    if (!token) {
      return true;
    }

    try {
      // 验证JWT令牌并检查黑名单
      const validationResult =
        await this.jwtBlacklistService.validateToken(token);

      if (validationResult.valid) {
        const payload = validationResult.payload;

        // 验证会话
        const sessionValid = await this.sessionService.validateSession(
          payload.jti,
        );

        if (sessionValid) {
          // 更新会话活动时间
          await this.sessionService.updateSessionActivity(payload.jti);

          // 将用户信息附加到请求对象
          request.user = {
            userId: payload.userId,
            username: payload.username,
            email: payload.email,
            roles: payload.roles || [],
            permissions: payload.permissions || [],
            jti: payload.jti,
            sessionId: payload.jti,
          };
        }
      }

      return true;
    } catch (error) {
      this.logger.warn(`可选JWT认证失败: ${error.message}`);
      // 对于可选认证，即使验证失败也允许通过
      return true;
    }
  }

  /**
   * 从请求头中提取JWT令牌
   */
  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      return undefined;
    }

    return token;
  }
}

/**
 * 刷新令牌守卫
 * 专门用于验证刷新令牌
 */
@Injectable()
export class RefreshTokenGuard implements CanActivate {
  private readonly logger = new Logger(RefreshTokenGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly jwtBlacklistService: JwtBlacklistService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token =
      this.extractTokenFromHeader(request) ||
      this.extractTokenFromBody(request);

    if (!token) {
      throw new UnauthorizedException('刷新令牌缺失');
    }

    try {
      // 验证刷新令牌
      const validationResult =
        await this.jwtBlacklistService.validateToken(token);

      if (!validationResult.valid) {
        this.logger.warn(`刷新令牌验证失败: ${validationResult.reason}`);
        throw new UnauthorizedException(validationResult.reason);
      }

      const payload = validationResult.payload;

      // 检查是否为刷新令牌
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('无效的刷新令牌类型');
      }

      // 将用户信息附加到请求对象
      request.user = {
        userId: payload.userId,
        username: payload.username,
        email: payload.email,
        jti: payload.jti,
      };

      // 将刷新令牌附加到请求对象
      request.refreshToken = token;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error(`刷新令牌验证失败: ${error.message}`, error.stack);
      throw new UnauthorizedException('刷新令牌验证失败');
    }
  }

  /**
   * 从请求头中提取令牌
   */
  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      return undefined;
    }

    return token;
  }

  /**
   * 从请求体中提取令牌
   */
  private extractTokenFromBody(request: Request): string | undefined {
    return request.body?.refreshToken;
  }
}
