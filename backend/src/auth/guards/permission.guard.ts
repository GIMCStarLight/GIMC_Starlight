import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
export { PermissionsGuard as PermissionGuard } from '../../common/guards/auth.guard';

// 注意：PermissionGuard 现为别名导出，行为与 common 中的 PermissionsGuard 保持一致

/**
 * 任意权限守卫
 * 用户只需拥有任意一个权限即可通过
 */
@Injectable()
export class AnyPermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 获取路由上的权限要求
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      'anyPermissions',
      [context.getHandler(), context.getClass()],
    );

    // 如果没有权限要求，直接通过
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // 获取用户信息（使用泛型避免 any）
    type ReqUser = { userId?: string; permissions?: string[] };
    type Req = { user?: ReqUser };
    const request = context.switchToHttp().getRequest<Req>();
    const user = request.user;

    if (!user || !user.userId) {
      throw new ForbiddenException('用户未认证');
    }

    // 直接从JWT中获取用户权限，避免数据库查询
    const userPermissions: string[] = Array.isArray(user.permissions)
      ? user.permissions
      : [];
    const hasPermission = requiredPermissions.some((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException('权限不足');
    }

    return true;
  }
}
