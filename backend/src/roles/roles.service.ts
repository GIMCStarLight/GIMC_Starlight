import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindManyOptions, In } from 'typeorm';
import { Role } from '../database/entities/role.entity';
import { UserRole } from '../database/entities/user-role.entity';
import { UserAuth } from '../database/entities/user-auth.entity';
import { UserProfile } from '../database/entities/user-profile.entity';
import { RolePermission } from '../database/entities/role-permission.entity';
import { Permission } from '../database/entities/permission.entity';
import { BaseQueryDto } from '../common/dto/base.dto';
import { PermissionService } from '../auth/services/permission.service';

export interface CreateRoleDto {
  name: string;
  code: string;
  description?: string;
  pid?: string;
  status?: number;
}

export interface UpdateRoleDto {
  name?: string;
  description?: string;
  status?: number;
}

import { UserRoleDto } from './dto/user-role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role, 'postgres')
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(UserRole, 'postgres')
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(UserAuth, 'postgres')
    private readonly userAuthRepository: Repository<UserAuth>,
    @InjectRepository(UserProfile, 'postgres')
    private readonly userProfileRepository: Repository<UserProfile>,
    @InjectRepository(RolePermission, 'postgres')
    private readonly rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(Permission, 'postgres')
    private readonly permissionRepository: Repository<Permission>,
    private readonly permissionService: PermissionService,
  ) {}

  /**
   * 获取角色列表
   */
  async findAll(query: BaseQueryDto) {
    const { page = 1, limit = 10, search, status } = query;
    const skip = (page - 1) * limit;

    const whereConditions: any = {};

    if (search) {
      whereConditions.name = Like(`%${search}%`);
    }

    if (status !== undefined) {
      whereConditions.status = status;
    }

    const findOptions: FindManyOptions<Role> = {
      where: whereConditions,
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['userRoles', 'rolePermissions'],
    };

    const [roles, total] = await this.roleRepository.findAndCount(findOptions);

    // 计算每个角色的用户数量和权限数量
    const rolesWithCounts = roles.map((role) => ({
      id: role.id,
      name: role.name,
      code: role.code,
      description: role.description,
      status: role.status,
      isSystem: ['admin', 'user'].includes(role.code), // 系统内置角色
      userCount: role.userRoles?.length || 0,
      permissionCount: role.rolePermissions?.length || 0,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    }));

    return {
      data: rolesWithCounts,
      pagination: {
        page,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * 获取角色详情
   */
  async findOne(id: string) {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: [
        'rolePermissions',
        'rolePermissions.permission',
        'parent',
        'children',
      ],
    });

    if (!role) {
      throw new NotFoundException('角色不存在');
    }

    // 获取权限列表
    const permissions =
      role.rolePermissions?.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        code: rp.permission.code,
        // module: rp.permission.module, // Permission实体中没有module属性
        type: rp.permission.type,
        description: rp.permission.description,
      })) || [];

    return {
      id: role.id,
      name: role.name,
      code: role.code,
      description: role.description,
      status: role.status,
      isSystem: ['admin', 'user'].includes(role.code),
      pid: role.parentId,
      parent: role.parent
        ? {
            id: role.parent.id,
            name: role.parent.name,
            code: role.parent.code,
          }
        : null,
      children:
        role.children?.map((child) => ({
          id: child.id,
          name: child.name,
          code: child.code,
        })) || [],
      permissions,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  /**
   * 创建角色
   */
  async create(createRoleDto: CreateRoleDto) {
    // 检查角色代码是否已存在
    const existingRole = await this.roleRepository.findOne({
      where: { code: createRoleDto.code },
    });

    if (existingRole) {
      throw new BadRequestException('角色代码已存在');
    }

    // 如果指定了父角色，检查父角色是否存在
    if (createRoleDto.pid) {
      const parentRole = await this.roleRepository.findOne({
        where: { id: createRoleDto.pid },
      });
      if (!parentRole) {
        throw new NotFoundException('父角色不存在');
      }
    }

    const role = this.roleRepository.create({
      ...createRoleDto,
      status: createRoleDto.status ?? 1,
    });

    return await this.roleRepository.save(role);
  }

  /**
   * 更新角色
   */
  async update(id: string, updateRoleDto: UpdateRoleDto) {
    const role = await this.roleRepository.findOne({ where: { id } });

    if (!role) {
      throw new NotFoundException('角色不存在');
    }

    // 系统内置角色不允许修改某些字段
    if (['admin', 'user'].includes(role.code)) {
      if (updateRoleDto.status === 0) {
        throw new BadRequestException('系统内置角色不能禁用');
      }
    }

    Object.assign(role, updateRoleDto);
    return await this.roleRepository.save(role);
  }

  /**
   * 删除角色
   */
  async remove(id: string) {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['userRoles', 'children'],
    });

    if (!role) {
      throw new NotFoundException('角色不存在');
    }

    // 系统内置角色不允许删除
    if (['admin', 'user'].includes(role.code)) {
      throw new BadRequestException('系统内置角色不能删除');
    }

    // 检查是否有用户关联
    if (role.userRoles && role.userRoles.length > 0) {
      throw new BadRequestException('该角色下还有用户，不能删除');
    }

    // 检查是否有子角色
    if (role.children && role.children.length > 0) {
      throw new BadRequestException('该角色下还有子角色，不能删除');
    }

    await this.roleRepository.remove(role);
    return { message: '删除成功' };
  }

  /**
   * 分配用户角色
   */
  async assignUserRoles(userRoleDto: UserRoleDto) {
    const { userId, roleIds } = userRoleDto;

    // 检查用户是否存在
    const user = await this.userAuthRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 检查角色是否都存在
    const roles = await this.roleRepository.findByIds(roleIds);
    if (roles.length !== roleIds.length) {
      throw new BadRequestException('部分角色不存在');
    }

    // 删除用户现有的角色关联
    await this.userRoleRepository.delete({ userId });

    // 创建新的角色关联
    const userRoles = roleIds.map((roleId) =>
      this.userRoleRepository.create({ userId, roleId }),
    );

    await this.userRoleRepository.save(userRoles);
    return { message: '角色分配成功' };
  }

  /**
   * 获取用户的角色列表
   */
  async getUserRoles(userId: string) {
    // 检查用户是否存在
    const user = await this.userAuthRepository.findOne({
      where: { id: userId },
      relations: ['profile'],
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 获取用户角色关联
    const userRoles = await this.userRoleRepository.find({
      where: { userId },
      relations: ['role'],
    });

    const roles = userRoles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
      code: ur.role.code,
      description: ur.role.description,
      isSystem: ['admin', 'user'].includes(ur.role.code),
    }));

    return {
      userId: user.id,
      userName: user.profile?.nickname || user.profile?.realName || user.phone,
      roles,
      roleCount: roles.length,
    };
  }

  /**
   * 获取角色的用户列表
   */
  async getRoleUsers(roleId: string, query: BaseQueryDto) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    // 检查角色是否存在
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('角色不存在');
    }

    // 获取角色用户关联
    const [userRoles, total] = await this.userRoleRepository.findAndCount({
      where: { roleId },
      relations: ['user', 'user.profile'],
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const users = userRoles.map((ur) => ({
      id: ur.user.id,
      phone: ur.user.phone,
      name: ur.user.profile?.nickname || ur.user.profile?.realName || '',
      email: ur.user.profile?.email || '',
      department: '', // PostgreSQL表中没有此字段
      position: '', // PostgreSQL表中没有此字段,
      status: ur.user.status,
      assignedAt: ur.createdAt,
    }));

    return {
      roleId: role.id,
      roleName: role.name,
      users,
      userCount: total,
      pagination: {
        page,
        pageSize: limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * 分配角色权限
   */
  async assignRolePermissions(roleId: string, permissionIds: string[]) {
    // 检查角色是否存在
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
      relations: ['parent'],
    });
    if (!role) {
      throw new NotFoundException('角色不存在');
    }

    // 检查权限是否都存在
    const permissions = await this.permissionRepository.findBy({
      id: In(permissionIds),
    });

    if (permissions.length !== permissionIds.length) {
      throw new BadRequestException('部分权限不存在');
    }

    // 如果角色有父角色，检查权限是否在父角色的权限范围内
    if (role.parentId && role.parentId !== '0') {
      const parentRole = await this.roleRepository.findOne({
        where: { id: role.parentId },
        relations: ['rolePermissions', 'rolePermissions.permission'],
      });

      if (parentRole) {
        const parentPermissionIds =
          parentRole.rolePermissions?.map((rp) => rp.permission.id) || [];

        // 检查子角色要分配的权限是否都在父角色的权限范围内
        const invalidPermissions = permissionIds.filter(
          (pid) => !parentPermissionIds.includes(pid),
        );
        if (invalidPermissions.length > 0) {
          const invalidPermissionNames = permissions
            .filter((p) => invalidPermissions.includes(p.id))
            .map((p) => p.name);
          throw new BadRequestException(
            `子角色只能分配父角色已有的权限，以下权限不在父角色权限范围内：${invalidPermissionNames.join(', ')}`,
          );
        }
      }
    }

    // 删除角色现有的权限关联
    await this.rolePermissionRepository.delete({ roleId });

    // 创建新的权限关联
    const rolePermissions = permissionIds.map((permissionId) =>
      this.rolePermissionRepository.create({ roleId, permissionId }),
    );

    await this.rolePermissionRepository.save(rolePermissions);

    // 权限更新通过JWT黑名单机制处理

    return {
      roleId,
      assignedPermissions: permissionIds.length,
      totalPermissions: permissionIds.length,
    };
  }

  /**
   * 获取角色权限列表
   */
  async getRolePermissions(roleId: string) {
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
      relations: ['rolePermissions', 'rolePermissions.permission'],
    });

    if (!role) {
      throw new NotFoundException('角色不存在');
    }

    return (
      role.rolePermissions?.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        code: rp.permission.code,
        type: rp.permission.type,
        description: rp.permission.description,
      })) || []
    );
  }

  /**
   * 获取角色可分配的权限（父角色已有的权限）
   */
  async getRoleAssignablePermissions(roleId: string) {
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
      relations: [
        'parent',
        'parent.rolePermissions',
        'parent.rolePermissions.permission',
      ],
    });

    if (!role) {
      throw new NotFoundException('角色不存在');
    }

    // 如果角色有父角色，返回父角色的权限
    if (role.parentId && role.parentId !== '0' && role.parent) {
      return (
        role.parent.rolePermissions?.map((rp) => ({
          id: rp.permission.id,
          name: rp.permission.name,
          code: rp.permission.code,
          type: rp.permission.type,
          description: rp.permission.description,
        })) || []
      );
    }

    // 如果没有父角色，返回所有权限
    const allPermissions = await this.permissionRepository.find({
      order: { sort: 'ASC', createdAt: 'ASC' },
    });

    return allPermissions.map((permission) => ({
      id: permission.id,
      name: permission.name,
      code: permission.code,
      type: permission.type,
      description: permission.description,
    }));
  }

  /**
   * 获取角色树形列表（用于树形表格）
   */
  async getRoleTreeList(query: BaseQueryDto) {
    const { search, status } = query;

    const queryBuilder = this.roleRepository
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.userRoles', 'userRoles')
      .leftJoinAndSelect('role.rolePermissions', 'rolePermissions');

    // 搜索条件
    if (search) {
      queryBuilder.andWhere(
        '(role.name LIKE :search OR role.code LIKE :search OR role.description LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status !== undefined) {
      queryBuilder.andWhere('role.status = :status', { status });
    }

    // 排序
    queryBuilder.orderBy('role.createdAt', 'ASC');

    const roles = await queryBuilder.getMany();

    // 构建树形结构
    const roleMap = new Map<string, any>();
    const rootRoles: any[] = [];

    // 先创建所有角色节点
    roles.forEach((role) => {
      const roleNode = {
        id: role.id,
        name: role.name,
        code: role.code,
        description: role.description,
        status: role.status,
        pid: role.parentId,
        isSystem: ['admin', 'user'].includes(role.code),
        userCount: role.userRoles?.length || 0,
        permissionCount: role.rolePermissions?.length || 0,
        createdAt: role.createdAt,
        updatedAt: role.updatedAt,
        children: [],
      };

      roleMap.set(role.id, roleNode);
    });

    // 构建树形结构
    roles.forEach((role) => {
      const roleNode = roleMap.get(role.id);

      if (
        role.parentId &&
        role.parentId !== '0' &&
        role.parentId !== '' &&
        role.parentId !== null &&
        roleMap.has(role.parentId)
      ) {
        // 有父角色，添加到父角色的children中
        const parentNode = roleMap.get(role.parentId);
        parentNode.children.push(roleNode);
      } else {
        // 没有父角色，是根角色
        rootRoles.push(roleNode);
      }
    });

    // 递归排序
    const sortChildren = (nodes: any[]) => {
      nodes.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      nodes.forEach((node) => {
        if (node.children && node.children.length > 0) {
          sortChildren(node.children);
        }
      });
    };

    sortChildren(rootRoles);

    return {
      data: rootRoles,
      total: roles.length,
    };
  }
}
