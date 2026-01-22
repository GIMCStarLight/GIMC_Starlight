import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import {
  Permission,
  PermissionType,
  Role,
  RolePermission,
  UserRole,
} from '../database/entities';
import { JwtBlacklistService } from '../auth/services/jwt-blacklist.service';
import { SessionService } from '../auth/services/session.service';
import { BaseQueryDto } from '../common/dto/base.dto';

/**
 * 权限DTO接口
 */
export interface CreatePermissionDto {
  name: string;
  code: string;
  description?: string;
  type: PermissionType;
  parentId?: string;
  resource?: string;
  action?: string;
  sort?: number;
}

export interface UpdatePermissionDto {
  name?: string;
  code?: string;
  description?: string;
  type?: PermissionType;
  parentId?: string;
  resource?: string;
  action?: string;
  sort?: number;
  status?: number;
}

export interface RolePermissionDto {
  roleId: string;
  permissionIds: string[];
}

/**
 * 权限管理服务
 * 提供权限的增删改查和角色权限关联功能
 */
@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission, 'postgres')
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(Role, 'postgres')
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(RolePermission, 'postgres')
    private readonly rolePermissionRepository: Repository<RolePermission>,
    @InjectRepository(UserRole, 'postgres')
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly jwtBlacklistService: JwtBlacklistService,
    private readonly sessionService: SessionService,
  ) {}

  /**
   * 获取权限列表
   */
  async findAll(query: BaseQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      sort = 'sort',
      order = 'asc',
    } = query;
    const module = (query as any).module;
    const action = (query as any).action;
    const skip = (page - 1) * limit;

    const queryBuilder =
      this.permissionRepository.createQueryBuilder('permission');

    // 搜索条件
    if (search) {
      queryBuilder.andWhere(
        '(permission.name LIKE :search OR permission.code LIKE :search OR permission.description LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (module) {
      queryBuilder.andWhere('permission.code LIKE :module', {
        module: `${module}:%`,
      });
    }

    if (action) {
      queryBuilder.andWhere('permission.code LIKE :action', {
        action: `%:${action}`,
      });
    }

    // 分页
    queryBuilder.skip(skip).take(limit);

    // 排序
    const sortField = `permission.${sort}`;
    const sortDirection = order === 'asc' ? 'ASC' : 'DESC';
    queryBuilder.orderBy(sortField, sortDirection);

    const [permissions, total] = await queryBuilder.getManyAndCount();

    return {
      data: permissions.map((permission) => ({
        id: permission.id,
        name: permission.name,
        code: permission.code,
        description: permission.description,
        type: permission.type,
        parentId: permission.parentId,
        resource: permission.resource || permission.code.split(':')[0] || '',
        action: permission.action || permission.code.split(':')[1] || '',
        sort: permission.sort,
        status: permission.status || 1,
        createdAt: permission.createdAt,
        updatedAt: permission.updatedAt,
      })),
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
   * 获取权限详情
   */
  async findOne(id: string) {
    const permission = await this.permissionRepository.findOne({
      where: { id },
      relations: ['rolePermissions', 'rolePermissions.role'],
    });

    if (!permission) {
      throw new NotFoundException('权限不存在');
    }

    return {
      id: permission.id,
      name: permission.name,
      code: permission.code,
      description: permission.description,
      type: permission.type,
      parentId: permission.parentId,
      resource: permission.resource || permission.code.split(':')[0] || '',
      action: permission.action || permission.code.split(':')[1] || '',
      sort: permission.sort || 0,
      status: permission.status || 1,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
    };
  }

  /**
   * 创建权限
   */
  async create(createPermissionDto: CreatePermissionDto) {
    // 检查权限代码是否已存在
    const existingPermission = await this.permissionRepository.findOne({
      where: { code: createPermissionDto.code },
    });

    if (existingPermission) {
      throw new ConflictException('权限代码已存在');
    }

    // 处理 parentId
    const createData = { ...createPermissionDto };
    if (createData.parentId === '' || createData.parentId === '0') {
      createData.parentId = undefined;
    }

    // 自动生成权限代码：resource:action
    if (createData.resource && createData.action) {
      createData.code = `${createData.resource}:${createData.action}`;
    }

    const permission = this.permissionRepository.create(createData);
    const savedPermission = await this.permissionRepository.save(permission);

    // 如果是子权限，自动分配给拥有父权限的所有角色
    if (savedPermission.parentId) {
      await this.autoAssignToParentRoles(
        savedPermission.id,
        savedPermission.parentId,
      );
    }

    return {
      id: savedPermission.id,
      name: savedPermission.name,
      code: savedPermission.code,
      description: savedPermission.description,
      type: savedPermission.type,
      parentId: savedPermission.parentId,
      resource:
        savedPermission.resource || savedPermission.code.split(':')[0] || '',
      action:
        savedPermission.action || savedPermission.code.split(':')[1] || '',
      sort: savedPermission.sort,
      status: savedPermission.status || 1,
      createdAt: savedPermission.createdAt,
    };
  }

  /**
   * 更新权限信息
   */
  async update(id: string, updatePermissionDto: UpdatePermissionDto) {
    const permission = await this.permissionRepository.findOne({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException('权限不存在');
    }

    // 更新权限信息，特别处理 parentId
    const updateData = { ...updatePermissionDto };
    if (updateData.parentId === '' || updateData.parentId === '0') {
      updateData.parentId = undefined;
    }

    // 自动生成权限代码：resource:action
    if (updateData.resource && updateData.action) {
      updateData.code = `${updateData.resource}:${updateData.action}`;
    }

    // 如果更新了权限代码，检查唯一性
    if (updateData.code && updateData.code !== permission.code) {
      const existingPermission = await this.permissionRepository.findOne({
        where: { code: updateData.code },
      });

      if (existingPermission && existingPermission.id !== id) {
        throw new ConflictException('权限代码已存在');
      }
    }

    Object.assign(permission, updateData);
    const updatedPermission = await this.permissionRepository.save(permission);

    return {
      id: updatedPermission.id,
      name: updatedPermission.name,
      code: updatedPermission.code,
      description: updatedPermission.description,
      type: updatedPermission.type,
      parentId: updatedPermission.parentId,
      resource:
        updatedPermission.resource ||
        updatedPermission.code.split(':')[0] ||
        '',
      action:
        updatedPermission.action || updatedPermission.code.split(':')[1] || '',
      sort: updatedPermission.sort,
      status: updatedPermission.status || 1,
      updatedAt: updatedPermission.updatedAt,
    };
  }

  /**
   * 删除权限
   */
  async remove(id: string) {
    const permission = await this.permissionRepository.findOne({
      where: { id },
      relations: ['rolePermissions'],
    });

    if (!permission) {
      throw new NotFoundException('权限不存在');
    }

    // 检查是否有角色正在使用此权限
    if (permission.rolePermissions && permission.rolePermissions.length > 0) {
      throw new BadRequestException('权限正在使用中，无法删除');
    }

    await this.permissionRepository.remove(permission);
  }

  /**
   * 获取权限树结构
   */
  async getPermissionTree() {
    const permissions = await this.permissionRepository.find({
      order: { sort: 'ASC', createdAt: 'ASC' },
    });

    // 按模块分组权限
    const moduleMap = new Map<string, any>();

    permissions.forEach((permission) => {
      const resource =
        permission.resource || permission.code.split(':')[0] || 'system';
      const moduleName = this.getModuleDisplayName(resource);

      if (!moduleMap.has(resource)) {
        moduleMap.set(resource, {
          module: resource,
          moduleName: moduleName,
          permissions: [],
        });
      }

      const permissionNode = {
        id: permission.id,
        name: permission.name,
        code: permission.code,
        type: permission.type,
        resource: permission.resource || permission.code.split(':')[0] || '',
        action: permission.action || permission.code.split(':')[1] || '',
        description: permission.description,
        parentId: permission.parentId,
        sort: permission.sort,
        status: permission.status || 1,
        children: [],
      };

      moduleMap.get(resource).permissions.push(permissionNode);
    });

    // 对每个模块的权限按sort排序
    moduleMap.forEach((module) => {
      module.permissions.sort(
        (a: any, b: any) => (a.sort || 0) - (b.sort || 0),
      );
    });

    return Array.from(moduleMap.values());
  }

  /**
   * 获取权限树结构（用于选择器）
   */
  async getPermissionTreeForSelect() {
    const permissions = await this.permissionRepository.find({
      order: { sort: 'ASC', createdAt: 'ASC' },
    });

    // 创建权限映射
    const permissionMap = new Map<string, any>();
    const rootPermissions: any[] = [];

    // 先创建所有权限节点
    permissions.forEach((permission) => {
      const permissionNode = {
        id: permission.id,
        name: permission.name,
        code: permission.code,
        type: permission.type,
        resource: permission.resource || permission.code.split(':')[0] || '',
        action: permission.action || permission.code.split(':')[1] || '',
        description: permission.description,
        parentId: permission.parentId,
        sort: permission.sort,
        status: permission.status || 1,
        frontendMeta: permission.frontendMeta,
        children: [],
      };

      permissionMap.set(permission.id, permissionNode);
    });

    // 构建树形结构
    permissions.forEach((permission) => {
      const permissionNode = permissionMap.get(permission.id);

      if (permission.parentId && permissionMap.has(permission.parentId)) {
        // 有父权限，添加到父权限的children中
        const parentNode = permissionMap.get(permission.parentId);
        parentNode.children.push(permissionNode);
      } else {
        // 没有父权限，是根权限
        rootPermissions.push(permissionNode);
      }
    });

    // 递归排序
    const sortChildren = (nodes: any[]) => {
      nodes.sort((a, b) => (a.sort || 0) - (b.sort || 0));
      nodes.forEach((node) => {
        if (node.children && node.children.length > 0) {
          sortChildren(node.children);
        }
      });
    };

    sortChildren(rootPermissions);

    return rootPermissions;
  }

  /**
   * 获取权限树形列表（用于树形表格）
   */
  async getPermissionTreeList(query: BaseQueryDto) {
    const { search, type, status } = query;

    const queryBuilder =
      this.permissionRepository.createQueryBuilder('permission');

    // 搜索条件
    if (search) {
      queryBuilder.andWhere(
        '(permission.name LIKE :search OR permission.code LIKE :search OR permission.description LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // 验证并应用type筛选条件
    if (
      type &&
      Object.values(PermissionType).includes(type as PermissionType)
    ) {
      queryBuilder.andWhere('permission.type = :type', { type });
    }

    if (status !== undefined) {
      queryBuilder.andWhere('permission.status = :status', { status });
    }

    // 排序
    queryBuilder
      .orderBy('permission.sort', 'ASC')
      .addOrderBy('permission.createdAt', 'ASC');

    const permissions = await queryBuilder.getMany();

    // 构建树形结构
    const permissionMap = new Map<string, any>();
    const rootPermissions: any[] = [];

    // 先创建所有权限节点
    permissions.forEach((permission) => {
      const permissionNode = {
        id: permission.id,
        name: permission.name,
        code: permission.code,
        type: permission.type,
        resource: permission.resource || permission.code.split(':')[0] || '',
        action: permission.action || permission.code.split(':')[1] || '',
        description: permission.description,
        parentId: permission.parentId,
        sort: permission.sort || 0,
        status: permission.status || 1,
        createdAt: permission.createdAt,
        updatedAt: permission.updatedAt,
        frontendMeta: permission.frontendMeta,
        children: [],
      };

      permissionMap.set(permission.id, permissionNode);
    });

    // 构建树形结构
    permissions.forEach((permission) => {
      const permissionNode = permissionMap.get(permission.id);

      if (permission.parentId && permissionMap.has(permission.parentId)) {
        // 有父权限，添加到父权限的children中
        const parentNode = permissionMap.get(permission.parentId);
        parentNode.children.push(permissionNode);
      } else {
        // 没有父权限，是根权限
        rootPermissions.push(permissionNode);
      }
    });

    // 递归排序
    const sortChildren = (nodes: any[]) => {
      nodes.sort((a, b) => (a.sort || 0) - (b.sort || 0));
      nodes.forEach((node) => {
        if (node.children && node.children.length > 0) {
          sortChildren(node.children);
        }
      });
    };

    sortChildren(rootPermissions);

    return {
      data: rootPermissions,
      total: permissions.length,
    };
  }

  /**
   * 获取模块显示名称
   */
  private getModuleDisplayName(module: string): string {
    const moduleNames: Record<string, string> = {
      admin: '系统管理',
      system: '系统管理',
      user: '用户管理',
      role: '角色管理',
      permission: '权限管理',
      project: '项目管理',
      media: '媒介管理',
      data: '数据管理',
      report: '报表管理',
      audit: '审计管理',
    };

    return moduleNames[module] || module;
  }

  /**
   * 为角色分配权限
   */
  async assignToRole(rolePermissionDto: RolePermissionDto) {
    const { roleId, permissionIds } = rolePermissionDto;

    // 检查角色是否存在
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException('角色不存在');
    }

    // 检查权限是否都存在
    const permissions =
      await this.permissionRepository.findByIds(permissionIds);
    if (permissions.length !== permissionIds.length) {
      throw new BadRequestException('部分权限不存在');
    }

    // 删除角色现有的权限关联
    await this.rolePermissionRepository.delete({ roleId });

    // 创建新的权限关联
    const rolePermissions = permissionIds.map((permissionId) =>
      this.rolePermissionRepository.create({ roleId, permissionId }),
    );

    await this.rolePermissionRepository.save(rolePermissions);

    // 将拥有此角色的所有用户的JWT加入黑名单
    await this.invalidateUserTokensByRole(roleId, '权限更新');

    return {
      roleId,
      assignedPermissions: permissionIds.length,
      totalPermissions: permissionIds.length,
    };
  }

  /**
   * 获取角色的权限列表
   */
  async getRolePermissions(roleId: string) {
    const role = await this.roleRepository.findOne({
      where: { id: roleId },
      relations: ['rolePermissions', 'rolePermissions.permission'],
    });

    if (!role) {
      throw new NotFoundException('角色不存在');
    }

    const permissions =
      role.rolePermissions?.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        code: rp.permission.code,
        module: rp.permission.code.split(':')[0] || '',
        action: rp.permission.code.split(':')[1] || '',
      })) || [];

    return {
      roleId: role.id,
      roleName: role.name,
      permissions,
      permissionCount: permissions.length,
    };
  }

  /**
   * 自动将子权限分配给拥有父权限的所有角色
   */
  private async autoAssignToParentRoles(
    childPermissionId: string,
    parentPermissionId: string,
  ) {
    // 查找拥有父权限的所有角色
    const parentRolePermissions = await this.rolePermissionRepository.find({
      where: { permissionId: parentPermissionId },
      relations: ['role'],
    });

    // 为每个拥有父权限的角色分配子权限
    const childRolePermissions = parentRolePermissions.map((rp) =>
      this.rolePermissionRepository.create({
        roleId: rp.roleId,
        permissionId: childPermissionId,
      }),
    );

    if (childRolePermissions.length > 0) {
      await this.rolePermissionRepository.save(childRolePermissions);
      // 权限自动分配完成
    }
  }

  /**
   * 将拥有指定角色的所有用户的JWT加入黑名单
   */
  private async invalidateUserTokensByRole(
    roleId: string,
    reason: string = '权限更新',
  ): Promise<void> {
    try {
      // 获取拥有此角色的所有用户
      const userRoles = await this.userRoleRepository.find({
        where: { roleId },
        select: ['userId'],
      });

      const userIds = [...new Set(userRoles.map((ur) => ur.userId))];

      // 为每个用户获取活跃会话并将JWT加入黑名单
      for (const userId of userIds) {
        const activeSessions =
          await this.sessionService.getUserSessions(userId);

        for (const session of activeSessions) {
          // 从会话的accessToken中提取jti，或直接使用sessionId作为jti
          const sessionId = session.accessToken
            ? JSON.parse(
                Buffer.from(
                  session.accessToken.split('.')[1],
                  'base64',
                ).toString(),
              ).jti
            : `session_${userId}_${session.loginTime}`;

          // 将JWT加入黑名单
          await this.jwtBlacklistService.addToBlacklist(sessionId, reason);
          // 删除会话
          await this.sessionService.deleteSession(sessionId);
        }
      }

      // 用户JWT已加入黑名单
    } catch (error) {
      // JWT黑名单操作失败
    }
  }

  /**
   * 获取模块名称
   */
  private getModuleName(module: string): string {
    const moduleNames: Record<string, string> = {
      user: '用户管理',
      role: '角色管理',
      permission: '权限管理',
      admin: '系统管理',
      system: '系统配置',
      data: '数据管理',
      project: '项目管理',
      media: '媒介管理',
    };
    return moduleNames[module] || module;
  }
}
