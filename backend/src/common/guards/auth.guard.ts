import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { ResponseUtil } from '../utils/response.util';
import { BusinessErrorType } from '../dto/response.dto';

/**
 * JWT载荷接口
 */
export interface JwtPayload {
  /** 用户ID */
  sub: string;
  /** 用户名 */
  username: string;
  /** 邮箱 */
  email?: string;
  /** 角色列表 */
  roles: string[];
  /** 权限列表 */
  permissions: string[];
  /** 令牌类型 */
  type: 'access' | 'refresh';
  /** 签发时间 */
  iat: number;
  /** 过期时间 */
  exp: number;
  /** 会话ID */
  sessionId?: string;
  /** 设备信息 */
  deviceId?: string;
}

/**
 * 扩展的Request接口
 */
export interface AuthenticatedRequest extends Request {
  user: JwtPayload;
  traceId: string;
}

/**
 * JWT认证守卫
 * 验证JWT令牌并提取用户信息
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);

    // 如果是公开接口，跳过认证
    if (isPublic) {
      return true;
    }

    try {
      const token = this.extractTokenFromHeader(request);
      if (!token) {
        throw new UnauthorizedException(
          ResponseUtil.error(
            '身份验证失败',
            401,
            BusinessErrorType.UNAUTHORIZED,
            { reason: 'missing_token' },
          ),
        );
      }

      const payload = await this.validateToken(token);
      if (!payload) {
        throw new UnauthorizedException(
          ResponseUtil.error(
            'API密钥验证失败',
            401,
            BusinessErrorType.UNAUTHORIZED,
            { reason: 'invalid_token' },
          ),
        );
      }

      // 检查令牌类型
      if (payload.type !== 'access') {
        throw new UnauthorizedException(
          ResponseUtil.error(
            '身份验证失败',
            401,
            BusinessErrorType.UNAUTHORIZED,
            {
              reason: 'wrong_token_type',
              expected: 'access',
              actual: payload.type,
            },
          ),
        );
      }

      // 将用户信息附加到请求对象
      request.user = payload;

      this.logger.debug(`用户认证成功: ${payload.username} (${payload.sub})`, {
        traceId: request.traceId,
      });

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.warn(`认证失败: ${error.message}`, {
        traceId: request.traceId,
        error: error.stack,
      });

      throw new UnauthorizedException(
        ResponseUtil.error(
          '认证失败',
          401,
          BusinessErrorType.UNAUTHORIZED,
          process.env.NODE_ENV !== 'production' ? error.message : undefined,
        ),
      );
    }
  }

  /**
   * 从请求头中提取令牌
   */
  private extractTokenFromHeader(request: Request): string | undefined {
    const authorization = request.headers.authorization;
    if (!authorization) {
      return undefined;
    }

    const [type, token] = authorization.split(' ');
    return type === 'Bearer' ? token : undefined;
  }

  /**
   * 验证令牌
   */
  private async validateToken(token: string): Promise<JwtPayload | null> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: process.env.JWT_SECRET,
      });

      // 检查令牌是否过期
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        this.logger.warn('令牌已过期', { exp: payload.exp, now });
        return null;
      }

      return payload;
    } catch (error) {
      this.logger.warn(`令牌验证失败: ${error.message}`);
      return null;
    }
  }
}

/**
 * 角色守卫
 * 检查用户是否具有所需角色
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException(
        ResponseUtil.error('用户未认证', 401, BusinessErrorType.UNAUTHORIZED),
      );
    }

    const hasRole = requiredRoles.some((role) => user.roles?.includes(role));
    if (!hasRole) {
      this.logger.warn(
        `用户 ${user.username} 缺少所需角色: ${requiredRoles.join(', ')}`,
        { traceId: request.traceId, userRoles: user.roles, requiredRoles },
      );

      throw new ForbiddenException(
        ResponseUtil.error('权限不足', 403, BusinessErrorType.FORBIDDEN, {
          reason: 'insufficient_role',
          required: requiredRoles,
          current: user.roles,
        }),
      );
    }

    this.logger.debug(
      `角色验证通过: ${user.username} 具有角色 ${user.roles.join(', ')}`,
      { traceId: request.traceId },
    );

    return true;
  }
}

/**
 * 权限守卫
 * 检查用户是否具有所需权限
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      'permissions',
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException(
        ResponseUtil.error('用户未认证', 401, BusinessErrorType.UNAUTHORIZED),
      );
    }

    const hasPermission = requiredPermissions.every((permission) =>
      user.permissions?.includes(permission),
    );

    if (!hasPermission) {
      this.logger.warn(
        `用户 ${user.username} 缺少所需权限: ${requiredPermissions.join(', ')}`,
        {
          traceId: request.traceId,
          userPermissions: user.permissions,
          requiredPermissions,
        },
      );

      throw new ForbiddenException(
        ResponseUtil.error('权限不足', 403, BusinessErrorType.FORBIDDEN, {
          reason: 'insufficient_permission',
          required: requiredPermissions,
          current: user.permissions,
        }),
      );
    }

    this.logger.debug(
      `权限验证通过: ${user.username} 具有权限 ${user.permissions.join(', ')}`,
      { traceId: request.traceId },
    );

    return true;
  }
}

/**
 * 资源所有者守卫
 * 检查用户是否是资源的所有者
 */
@Injectable()
export class ResourceOwnerGuard implements CanActivate {
  private readonly logger = new Logger(ResourceOwnerGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException(
        ResponseUtil.error('用户未认证', 401, BusinessErrorType.UNAUTHORIZED),
      );
    }

    // 获取资源ID字段名（默认为'id'）
    const resourceIdField =
      this.reflector.get<string>('resourceIdField', context.getHandler()) ||
      'id';
    const resourceId = request.params[resourceIdField];

    if (!resourceId) {
      this.logger.warn(`无法获取资源ID，字段名: ${resourceIdField}`, {
        traceId: request.traceId,
        params: request.params,
      });
      return false;
    }

    // 检查是否是管理员（管理员可以访问所有资源）
    if (user.roles?.includes('admin') || user.roles?.includes('super_admin')) {
      this.logger.debug(`管理员用户 ${user.username} 访问资源 ${resourceId}`, {
        traceId: request.traceId,
      });
      return true;
    }

    // 检查是否是资源所有者
    if (user.sub === resourceId) {
      this.logger.debug(`用户 ${user.username} 访问自己的资源 ${resourceId}`, {
        traceId: request.traceId,
      });
      return true;
    }

    this.logger.warn(
      `用户 ${user.username} 尝试访问不属于自己的资源 ${resourceId}`,
      { traceId: request.traceId, userId: user.sub, resourceId },
    );

    throw new ForbiddenException(
      ResponseUtil.error('无权访问该资源', 403, BusinessErrorType.FORBIDDEN, {
        reason: 'not_resource_owner',
        userId: user.sub,
        resourceId,
      }),
    );
  }
}

/**
 * API密钥守卫
 * 验证API密钥
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name);
  private readonly validApiKeys = new Set(
    [
      process.env.API_KEY,
      process.env.INTERNAL_API_KEY,
      process.env.WEBHOOK_API_KEY,
    ].filter(Boolean),
  );

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException(
        ResponseUtil.error('缺少API密钥', 401, BusinessErrorType.UNAUTHORIZED, {
          reason: 'missing_api_key',
        }),
      );
    }

    if (!this.validApiKeys.has(apiKey)) {
      this.logger.warn(`无效的API密钥: ${apiKey.substring(0, 8)}...`, {
        traceId: (request as any).traceId,
      });

      throw new UnauthorizedException(
        ResponseUtil.error(
          '无效的API密钥',
          401,
          BusinessErrorType.UNAUTHORIZED,
          { reason: 'invalid_api_key' },
        ),
      );
    }

    this.logger.debug(`API密钥验证通过: ${apiKey.substring(0, 8)}...`, {
      traceId: (request as any).traceId,
    });

    return true;
  }

  /**
   * 提取API密钥
   */
  private extractApiKey(request: Request): string | undefined {
    // 从请求头中获取
    const headerKey = request.headers['x-api-key'] as string;
    if (headerKey) {
      return headerKey;
    }

    // 从查询参数中获取
    const queryKey = request.query.api_key as string;
    if (queryKey) {
      return queryKey;
    }

    // 从Authorization头中获取（格式：ApiKey <key>）
    const authorization = request.headers.authorization;
    if (authorization) {
      const [type, key] = authorization.split(' ');
      if (type === 'ApiKey') {
        return key;
      }
    }

    return undefined;
  }
}
