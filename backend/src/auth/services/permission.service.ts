import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Role,
  Permission,
  UserRole,
  RolePermission,
} from '../../database/entities';

/**
 * 权限服务
 * 负责权限计算、继承和缓存管理
 */
@Injectable()
export class PermissionService {
  constructor(
    @InjectRepository(Role, 'postgres')
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission, 'postgres')
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(UserRole, 'postgres')
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(RolePermission, 'postgres')
    private readonly rolePermissionRepository: Repository<RolePermission>,
  ) {}

  /**
   * 获取用户的角色信息
   * @param userId 用户ID
   * @returns 角色信息数组
   */
  async getUserRoles(
    userId: string,
  ): Promise<Array<{ id: string; name: string; code: string }>> {
    const userRoles = await this.userRoleRepository.find({
      where: { userId },
      relations: ['role'],
    });

    return userRoles
      .filter((ur) => ur.role.status === 1) // 只返回启用的角色
      .map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        code: ur.role.code,
      }));
  }

  /**
   * 获取用户的完整权限集合（不包含继承，只获取角色直接拥有的权限）
   * @param userId 用户ID
   * @returns 权限代码数组
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    // 获取用户绑定的所有角色ID
    const userRoles = await this.userRoleRepository.find({
      where: { userId },
      relations: ['role'],
    });

    const allPermissions = new Set<string>();

    // 对每个角色，获取其直接拥有的权限（不继承父角色权限）
    for (const userRole of userRoles) {
      if (userRole.role.status === 1) {
        // 只处理启用的角色
        const rolePermissions = await this.getAllPermissionsForRole(
          userRole.role.id,
        );
        rolePermissions.forEach((perm) => allPermissions.add(perm));
      }
    }

    return Array.from(allPermissions);
  }

  /**
   * 获取一个角色直接拥有的权限集合（不继承父角色权限）
   * @param roleId 角色ID
   * @returns 权限代码集合
   */
  async getAllPermissionsForRole(roleId: string): Promise<Set<string>> {
    const permissions = new Set<string>();

    // 查询该角色直接拥有的权限
    const rolePermissions = await this.rolePermissionRepository
      .createQueryBuilder('rp')
      .leftJoinAndSelect('rp.permission', 'permission')
      .where('rp.roleId = :roleId', { roleId })
      .select(['rp.id', 'permission.code'])
      .getMany();

    // 获取角色直接权限
    rolePermissions.forEach((rp) => {
      permissions.add(rp.permission.code);
    });

    // 角色权限获取完成
    return permissions;
  }

  /**
   * 检查用户是否拥有指定权限
   * @param userId 用户ID
   * @param permissionCode 权限代码
   * @returns 是否拥有权限
   */
  async hasPermission(
    userId: string,
    permissionCode: string,
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return userPermissions.includes(permissionCode);
  }

  /**
   * 检查用户是否拥有任意一个权限
   * @param userId 用户ID
   * @param permissionCodes 权限代码数组
   * @returns 是否拥有任意权限
   */
  async hasAnyPermission(
    userId: string,
    permissionCodes: string[],
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return permissionCodes.some((code) => userPermissions.includes(code));
  }

  /**
   * 检查用户是否拥有所有权限
   * @param userId 用户ID
   * @param permissionCodes 权限代码数组
   * @returns 是否拥有所有权限
   */
  async hasAllPermissions(
    userId: string,
    permissionCodes: string[],
  ): Promise<boolean> {
    const userPermissions = await this.getUserPermissions(userId);
    return permissionCodes.every((code) => userPermissions.includes(code));
  }

  /**
   * 获取角色的层级路径
   * @param roleId 角色ID
   * @returns 从根到当前角色的路径
   */
  async getRoleHierarchyPath(roleId: string): Promise<Role[]> {
    const path: Role[] = [];
    let currentRoleId = roleId;

    while (currentRoleId && currentRoleId !== '0') {
      const role = await this.roleRepository.findOne({
        where: { id: currentRoleId },
      });

      if (!role) break;

      path.unshift(role); // 添加到数组开头
      currentRoleId = role.parentId;
    }

    return path;
  }

  /**
   * 获取角色的所有子角色（递归）
   * @param roleId 角色ID
   * @returns 所有子角色
   */
  async getAllChildRoles(roleId: string): Promise<Role[]> {
    const children: Role[] = [];

    const directChildren = await this.roleRepository.find({
      where: { parentId: roleId, status: 1 },
    });

    for (const child of directChildren) {
      children.push(child);
      const grandChildren = await this.getAllChildRoles(child.id);
      children.push(...grandChildren);
    }

    return children;
  }
}
