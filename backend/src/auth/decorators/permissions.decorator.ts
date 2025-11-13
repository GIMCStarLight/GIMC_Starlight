import { SetMetadata } from '@nestjs/common';
export { Permissions, Public } from '../../common/decorators/auth.decorator';

/**
 * 任意权限装饰器
 * 用于标记路由需要的权限（用户只需拥有任意一个权限）
 * @param permissions 权限代码数组
 */
export const AnyPermissions = (...permissions: string[]) =>
  SetMetadata('anyPermissions', permissions);
