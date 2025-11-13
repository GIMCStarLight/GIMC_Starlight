import { SetMetadata } from '@nestjs/common';
import { Permissions } from '../../auth/decorators/permissions.decorator';

/**
 * 资源操作类型
 */
export enum ResourceAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage',
  EXPORT = 'export',
  IMPORT = 'import',
}

/**
 * 资源级别权限装饰器
 * 自动生成 resource:action 格式的权限码
 *
 * @param resource 资源名称 (例如: 'user', 'role', 'permission')
 * @param action 操作类型
 *
 * @example
 * @ResourcePermission('user', ResourceAction.READ)
 * findAll() {}
 *
 * @ResourcePermission('user', ResourceAction.CREATE)
 * create() {}
 */
export const ResourcePermission = (
  resource: string,
  action: ResourceAction | string,
) => {
  const permission = `${resource}:${action}`;
  return Permissions(permission);
};

/**
 * 多资源权限装饰器
 * 支持同时检查多个资源的权限
 *
 * @param permissions 权限列表 [[resource, action], ...]
 *
 * @example
 * @MultiResourcePermission([
 *   ['user', ResourceAction.READ],
 *   ['role', ResourceAction.READ]
 * ])
 * getUserWithRoles() {}
 */
export const MultiResourcePermission = (
  permissions: Array<[string, ResourceAction | string]>,
) => {
  const permissionCodes = permissions.map(
    ([resource, action]) => `${resource}:${action}`,
  );
  return Permissions(...permissionCodes);
};

/**
 * 条件权限装饰器
 * 根据条件动态应用权限
 *
 * @param condition 条件函数
 * @param resource 资源名称
 * @param action 操作类型
 */
export const ConditionalPermission = (
  condition: () => boolean,
  resource: string,
  action: ResourceAction | string,
) => {
  if (condition()) {
    return ResourcePermission(resource, action);
  }
  // 如果条件不满足，返回空装饰器
  return () => {};
};

/**
 * 资源所有者权限装饰器
 * 检查用户是否是资源的所有者
 *
 * @param resource 资源名称
 */
export const RESOURCE_OWNER_KEY = 'resource_owner';
export const ResourceOwner = (resource: string) =>
  SetMetadata(RESOURCE_OWNER_KEY, resource);

/**
 * 权限描述装饰器
 * 为权限添加描述信息，便于生成权限文档
 */
export const PERMISSION_DESCRIPTION_KEY = 'permission_description';
export const PermissionDescription = (description: string) =>
  SetMetadata(PERMISSION_DESCRIPTION_KEY, description);

/**
 * 常用资源权限快捷装饰器
 */
export class ResourcePermissions {
  // 用户相关
  static UserRead = () => ResourcePermission('user', ResourceAction.READ);
  static UserCreate = () => ResourcePermission('user', ResourceAction.CREATE);
  static UserUpdate = () => ResourcePermission('user', ResourceAction.UPDATE);
  static UserDelete = () => ResourcePermission('user', ResourceAction.DELETE);
  static UserManage = () => ResourcePermission('user', ResourceAction.MANAGE);

  // 角色相关
  static RoleRead = () => ResourcePermission('role', ResourceAction.READ);
  static RoleCreate = () => ResourcePermission('role', ResourceAction.CREATE);
  static RoleUpdate = () => ResourcePermission('role', ResourceAction.UPDATE);
  static RoleDelete = () => ResourcePermission('role', ResourceAction.DELETE);
  static RoleManage = () => ResourcePermission('role', ResourceAction.MANAGE);

  // 权限相关
  static PermissionRead = () =>
    ResourcePermission('permission', ResourceAction.READ);
  static PermissionCreate = () =>
    ResourcePermission('permission', ResourceAction.CREATE);
  static PermissionUpdate = () =>
    ResourcePermission('permission', ResourceAction.UPDATE);
  static PermissionDelete = () =>
    ResourcePermission('permission', ResourceAction.DELETE);
  static PermissionManage = () =>
    ResourcePermission('permission', ResourceAction.MANAGE);

  // KOL相关
  static KolRead = () => ResourcePermission('kol', ResourceAction.READ);
  static KolCreate = () => ResourcePermission('kol', ResourceAction.CREATE);
  static KolUpdate = () => ResourcePermission('kol', ResourceAction.UPDATE);
  static KolDelete = () => ResourcePermission('kol', ResourceAction.DELETE);
  static KolManage = () => ResourcePermission('kol', ResourceAction.MANAGE);
  static KolExport = () => ResourcePermission('kol', ResourceAction.EXPORT);
  static KolImport = () => ResourcePermission('kol', ResourceAction.IMPORT);

  // 供应商相关
  static SupplierRead = () =>
    ResourcePermission('supplier', ResourceAction.READ);
  static SupplierCreate = () =>
    ResourcePermission('supplier', ResourceAction.CREATE);
  static SupplierUpdate = () =>
    ResourcePermission('supplier', ResourceAction.UPDATE);
  static SupplierDelete = () =>
    ResourcePermission('supplier', ResourceAction.DELETE);
  static SupplierManage = () =>
    ResourcePermission('supplier', ResourceAction.MANAGE);

  // 系统管理
  static SystemManage = () =>
    ResourcePermission('system', ResourceAction.MANAGE);
  static LogRead = () => ResourcePermission('log', ResourceAction.READ);
  static ConfigManage = () =>
    ResourcePermission('config', ResourceAction.MANAGE);
}
