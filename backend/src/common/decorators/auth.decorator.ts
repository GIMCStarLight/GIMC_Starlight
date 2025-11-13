import { SetMetadata, applyDecorators, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import {
  JwtAuthGuard,
  RolesGuard,
  PermissionsGuard,
  ResourceOwnerGuard,
  ApiKeyGuard,
} from '../guards/auth.guard';
import { ResponseStatus, BusinessErrorType } from '../dto/response.dto';

/**
 * 公开接口装饰器
 * 标记接口为公开访问，跳过JWT认证
 */
export const Public = () => SetMetadata('isPublic', true);

/**
 * 角色装饰器
 * 指定访问接口所需的角色
 */
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);

/**
 * 权限装饰器
 * 指定访问接口所需的权限
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata('permissions', permissions);

/**
 * 资源所有者装饰器
 * 指定资源ID字段名，用于检查用户是否是资源所有者
 */
export const ResourceOwner = (resourceIdField: string = 'id') =>
  SetMetadata('resourceIdField', resourceIdField);

/**
 * JWT认证装饰器
 * 应用JWT认证守卫和相关的Swagger文档
 */
export function Auth() {
  return applyDecorators(
    UseGuards(JwtAuthGuard),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({
      description: '未授权访问',
      schema: {
        type: 'object',
        properties: {
          code: { type: 'number', example: ResponseStatus.ERROR },
          message: { type: 'string', example: '未授权访问' },
          error: {
            type: 'object',
            properties: {
              type: { type: 'string', example: BusinessErrorType.UNAUTHORIZED },
              details: { type: 'object', nullable: true },
            },
          },
          traceId: { type: 'string', example: 'trace-123456' },
          timestamp: { type: 'number', example: Date.now() },
        },
      },
    }),
  );
}

/**
 * 角色认证装饰器
 * 应用JWT认证和角色检查守卫
 */
export function AuthRoles(...roles: string[]) {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(...roles),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({
      description: '未授权访问',
      schema: {
        type: 'object',
        properties: {
          code: { type: 'number', example: ResponseStatus.ERROR },
          message: { type: 'string', example: '未授权访问' },
          error: {
            type: 'object',
            properties: {
              type: { type: 'string', example: BusinessErrorType.UNAUTHORIZED },
              details: { type: 'object', nullable: true },
            },
          },
          traceId: { type: 'string', example: 'trace-123456' },
          timestamp: { type: 'number', example: Date.now() },
        },
      },
    }),
    ApiForbiddenResponse({
      description: '权限不足',
      schema: {
        type: 'object',
        properties: {
          code: { type: 'number', example: ResponseStatus.ERROR },
          message: { type: 'string', example: '权限不足' },
          error: {
            type: 'object',
            properties: {
              type: { type: 'string', example: BusinessErrorType.FORBIDDEN },
              details: {
                type: 'object',
                properties: {
                  reason: { type: 'string', example: 'insufficient_role' },
                  required: {
                    type: 'array',
                    items: { type: 'string' },
                    example: roles,
                  },
                  current: {
                    type: 'array',
                    items: { type: 'string' },
                    example: [],
                  },
                },
              },
            },
          },
          traceId: { type: 'string', example: 'trace-123456' },
          timestamp: { type: 'number', example: Date.now() },
        },
      },
    }),
  );
}

/**
 * 权限认证装饰器
 * 应用JWT认证和权限检查守卫
 */
export function AuthPermissions(...permissions: string[]) {
  return applyDecorators(
    UseGuards(JwtAuthGuard, PermissionsGuard),
    Permissions(...permissions),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({
      description: '未授权访问',
      schema: {
        type: 'object',
        properties: {
          code: { type: 'number', example: ResponseStatus.ERROR },
          message: { type: 'string', example: '未授权访问' },
          error: {
            type: 'object',
            properties: {
              type: { type: 'string', example: BusinessErrorType.UNAUTHORIZED },
              details: { type: 'object', nullable: true },
            },
          },
          traceId: { type: 'string', example: 'trace-123456' },
          timestamp: { type: 'number', example: Date.now() },
        },
      },
    }),
    ApiForbiddenResponse({
      description: '权限不足',
      schema: {
        type: 'object',
        properties: {
          code: { type: 'number', example: ResponseStatus.ERROR },
          message: { type: 'string', example: '权限不足' },
          error: {
            type: 'object',
            properties: {
              type: { type: 'string', example: BusinessErrorType.FORBIDDEN },
              details: {
                type: 'object',
                properties: {
                  reason: {
                    type: 'string',
                    example: 'insufficient_permission',
                  },
                  required: {
                    type: 'array',
                    items: { type: 'string' },
                    example: permissions,
                  },
                  current: {
                    type: 'array',
                    items: { type: 'string' },
                    example: [],
                  },
                },
              },
            },
          },
          traceId: { type: 'string', example: 'trace-123456' },
          timestamp: { type: 'number', example: Date.now() },
        },
      },
    }),
  );
}

/**
 * 资源所有者认证装饰器
 * 应用JWT认证和资源所有者检查守卫
 */
export function AuthResourceOwner(resourceIdField: string = 'id') {
  return applyDecorators(
    UseGuards(JwtAuthGuard, ResourceOwnerGuard),
    ResourceOwner(resourceIdField),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({
      description: '未授权访问',
      schema: {
        type: 'object',
        properties: {
          code: { type: 'number', example: ResponseStatus.ERROR },
          message: { type: 'string', example: '未授权访问' },
          error: {
            type: 'object',
            properties: {
              type: { type: 'string', example: BusinessErrorType.UNAUTHORIZED },
              details: { type: 'object', nullable: true },
            },
          },
          traceId: { type: 'string', example: 'trace-123456' },
          timestamp: { type: 'number', example: Date.now() },
        },
      },
    }),
    ApiForbiddenResponse({
      description: '无权访问该资源',
      schema: {
        type: 'object',
        properties: {
          code: { type: 'number', example: ResponseStatus.ERROR },
          message: { type: 'string', example: '无权访问该资源' },
          error: {
            type: 'object',
            properties: {
              type: { type: 'string', example: BusinessErrorType.FORBIDDEN },
              details: {
                type: 'object',
                properties: {
                  reason: { type: 'string', example: 'not_resource_owner' },
                  userId: { type: 'string', example: 'user-123' },
                  resourceId: { type: 'string', example: 'resource-456' },
                },
              },
            },
          },
          traceId: { type: 'string', example: 'trace-123456' },
          timestamp: { type: 'number', example: Date.now() },
        },
      },
    }),
  );
}

/**
 * API密钥认证装饰器
 * 应用API密钥认证守卫
 */
export function AuthApiKey() {
  return applyDecorators(
    UseGuards(ApiKeyGuard),
    ApiUnauthorizedResponse({
      description: 'API密钥认证失败',
      schema: {
        type: 'object',
        properties: {
          code: { type: 'number', example: ResponseStatus.ERROR },
          message: { type: 'string', example: '无效的API密钥' },
          error: {
            type: 'object',
            properties: {
              type: { type: 'string', example: BusinessErrorType.UNAUTHORIZED },
              details: {
                type: 'object',
                properties: {
                  reason: { type: 'string', example: 'invalid_api_key' },
                },
              },
            },
          },
          traceId: { type: 'string', example: 'trace-123456' },
          timestamp: { type: 'number', example: Date.now() },
        },
      },
    }),
  );
}

/**
 * 管理员认证装饰器
 * 要求用户具有管理员角色
 */
export function AuthAdmin() {
  return AuthRoles('admin', 'super_admin');
}

/**
 * 超级管理员认证装饰器
 * 要求用户具有超级管理员角色
 */
export function AuthSuperAdmin() {
  return AuthRoles('super_admin');
}

/**
 * 用户认证装饰器
 * 要求用户具有普通用户角色或更高权限
 */
export function AuthUser() {
  return AuthRoles('user', 'admin', 'super_admin');
}

/**
 * 组合认证装饰器
 * 同时应用多种认证方式
 */
export function AuthCombined(options: {
  roles?: string[];
  permissions?: string[];
  resourceOwner?: boolean;
  resourceIdField?: string;
}) {
  const guards: any[] = [JwtAuthGuard];
  const decorators = [ApiBearerAuth()];

  if (options.roles && options.roles.length > 0) {
    guards.push(RolesGuard);
    decorators.push(Roles(...options.roles));
  }

  if (options.permissions && options.permissions.length > 0) {
    guards.push(PermissionsGuard);
    decorators.push(Permissions(...options.permissions));
  }

  if (options.resourceOwner) {
    guards.push(ResourceOwnerGuard);
    decorators.push(ResourceOwner(options.resourceIdField));
  }

  decorators.unshift(UseGuards(...guards));

  // 添加通用错误响应
  decorators.push(
    ApiUnauthorizedResponse({
      description: '未授权访问',
      schema: {
        type: 'object',
        properties: {
          code: { type: 'number', example: ResponseStatus.ERROR },
          message: { type: 'string', example: '未授权访问' },
          error: {
            type: 'object',
            properties: {
              type: { type: 'string', example: BusinessErrorType.UNAUTHORIZED },
              details: { type: 'object', nullable: true },
            },
          },
          traceId: { type: 'string', example: 'trace-123456' },
          timestamp: { type: 'number', example: Date.now() },
        },
      },
    }),
  );

  if (options.roles || options.permissions || options.resourceOwner) {
    decorators.push(
      ApiForbiddenResponse({
        description: '权限不足',
        schema: {
          type: 'object',
          properties: {
            code: { type: 'number', example: ResponseStatus.ERROR },
            message: { type: 'string', example: '权限不足' },
            error: {
              type: 'object',
              properties: {
                type: { type: 'string', example: BusinessErrorType.FORBIDDEN },
                details: { type: 'object', nullable: true },
              },
            },
            traceId: { type: 'string', example: 'trace-123456' },
            timestamp: { type: 'number', example: Date.now() },
          },
        },
      }),
    );
  }

  return applyDecorators(...decorators);
}

/**
 * 预定义的认证装饰器
 */
export const AuthDecorators = {
  /** 公开接口 */
  Public,
  /** 基础认证 */
  Auth,
  /** 用户认证 */
  User: AuthUser,
  /** 管理员认证 */
  Admin: AuthAdmin,
  /** 超级管理员认证 */
  SuperAdmin: AuthSuperAdmin,
  /** API密钥认证 */
  ApiKey: AuthApiKey,
  /** 资源所有者认证 */
  ResourceOwner: AuthResourceOwner,
  /** 组合认证 */
  Combined: AuthCombined,
};
