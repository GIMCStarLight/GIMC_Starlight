import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindManyOptions, In } from 'typeorm';
import { UserAuth } from '../database/entities/user-auth.entity';
import { UserProfile } from '../database/entities/user-profile.entity';
import { UserRole } from '../database/entities/user-role.entity';
import { Role } from '../database/entities/role.entity';
import { BaseQueryDto } from '../common/dto/base.dto';
import {
  CreateUserDto,
  UpdateUserDto,
  UserQueryDto,
  AssignUserRolesDto,
  ResetPasswordDto,
} from './dto';
import { CacheService } from '../common/services/cache.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserAuth, 'postgres')
    private readonly userAuthRepository: Repository<UserAuth>,
    @InjectRepository(UserProfile, 'postgres')
    private readonly userProfileRepository: Repository<UserProfile>,
    @InjectRepository(UserRole, 'postgres')
    private readonly userRoleRepository: Repository<UserRole>,
    @InjectRepository(Role, 'postgres')
    private readonly roleRepository: Repository<Role>,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 获取用户列表
   */
  async findAll(query: UserQueryDto) {
    const { page = 1, limit = 10, search, status, department, roleId } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.userAuthRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.profile', 'profile')
      .leftJoinAndSelect('user.userRoles', 'userRole')
      .leftJoinAndSelect('userRole.role', 'role')
      .select([
        'user.id',
        'user.phone',
        'user.status',
        'user.createdAt',
        'user.updatedAt',
        'profile.nickname',
        'profile.realName',
        'profile.email',
        'profile.avatar',
        'userRole.id',
        'role.id',
        'role.name',
        'role.code',
      ]);

    // 搜索条件
    if (search) {
      queryBuilder.andWhere(
        '(profile.nickname LIKE :search OR profile.realName LIKE :search OR user.phone LIKE :search OR profile.email LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // 状态筛选
    if (status !== undefined) {
      queryBuilder.andWhere('user.status = :status', { status });
    }

    // 部门筛选 - PostgreSQL表中没有department字段，删除此功能
    // if (department) {
    //   queryBuilder.andWhere('profile.department = :department', { department });
    // }

    // 角色筛选
    if (roleId) {
      queryBuilder.andWhere('role.id = :roleId', { roleId });
    }

    // 分页和排序
    queryBuilder.orderBy('user.createdAt', 'DESC').skip(skip).take(limit);

    const [users, total] = await queryBuilder.getManyAndCount();

    const data = users.map((user) => ({
      id: user.id,
      phone: user.phone,
      name: user.profile?.nickname || user.profile?.realName || '',
      email: user.profile?.email || '',
      department: '', // PostgreSQL表中没有此字段
      position: '', // PostgreSQL表中没有此字段
      avatarUrl: user.profile?.avatar || '',
      status: user.status,
      roles:
        user.userRoles?.map((userRole) => ({
          id: userRole.role?.id,
          name: userRole.role?.name,
          code: userRole.role?.code,
        })) || [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    return {
      data,
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
   * 根据ID获取用户详情
   */
  async findOne(id: string) {
    // 尝试从缓存获取用户档案
    const cachedUser = await this.cacheService.getUserProfile(id);
    if (cachedUser) {
      return cachedUser;
    }

    const user = await this.userAuthRepository.findOne({
      where: { id },
      relations: [
        'profile',
        'userRoles',
        'userRoles.role',
        'userRoles.role.permissions',
      ],
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const userProfile = {
      id: user.id,
      phone: user.phone,
      name: user.profile?.nickname || user.profile?.realName || '',
      email: user.profile?.email || '',
      department: '', // PostgreSQL表中没有此字段
      position: '', // PostgreSQL表中没有此字段
      avatarUrl: user.profile?.avatar || '',
      status: user.status,
      roles:
        user.userRoles?.map((userRole) => ({
          id: userRole.role?.id,
          name: userRole.role?.name,
          code: userRole.role?.code,
          permissions:
            userRole.role?.rolePermissions?.map((rolePermission) => ({
              id: rolePermission.permission?.id,
              name: rolePermission.permission?.name,
              code: rolePermission.permission?.code,
              resource: rolePermission.permission?.resource,
              action: rolePermission.permission?.action,
            })) || [],
        })) || [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // 缓存用户档案
    await this.cacheService.setUserProfile(id, userProfile);

    return userProfile;
  }

  /**
   * 创建用户
   */
  async create(createUserDto: CreateUserDto) {
    const { phone, name, email, department, position, password } =
      createUserDto;

    // 检查手机号是否已存在
    const existingUser = await this.userAuthRepository.findOne({
      where: { phone },
    });
    if (existingUser) {
      throw new ConflictException('手机号已存在');
    }

    // 加密密码
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 创建用户认证记录
    const userAuth = this.userAuthRepository.create({
      phone,
      passwordHash,
      status: 1,
    });

    const savedUser = await this.userAuthRepository.save(userAuth);

    // 创建用户资料记录
    const userProfile = this.userProfileRepository.create({
      userId: savedUser.id,
      nickname: name, // 使用nickname字段
      email,
    });

    await this.userProfileRepository.save(userProfile);

    return {
      id: savedUser.id,
      phone: savedUser.phone,
      name,
      email,
      department,
      position,
      status: savedUser.status,
      createdAt: savedUser.createdAt,
    };
  }

  /**
   * 更新用户信息
   */
  async update(id: string, updateUserDto: UpdateUserDto) {
    // 更新用户数据

    const user = await this.userAuthRepository.findOne({
      where: { id },
      relations: ['profile'],
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 提取roleIds，避免传递给用户资料更新
    const { roleIds, ...userUpdateData } = updateUserDto;

    // 更新用户资料
    if (user.profile) {
      await this.userProfileRepository.update(
        { userId: id },
        {
          nickname: userUpdateData.name, // name映射到nickname
          email: userUpdateData.email,
        },
      );
    } else {
      // 如果用户资料不存在，创建新的
      const userProfile = this.userProfileRepository.create({
        userId: id,
        nickname: userUpdateData.name || '',
        email: userUpdateData.email,
      });
      await this.userProfileRepository.save(userProfile);
    }

    // 如果提供了角色ID数组（包括空数组），更新用户角色
    if (roleIds !== undefined) {
      // 分配用户角色
      await this.assignUserRoles(id, { roleIds });
    } else {
      // 跳过角色分配
    }

    // 清除用户缓存
    await this.cacheService.clearUserProfile(id);
    await this.cacheService.clearUserPermissions(id);

    // 重新获取更新后的用户信息（包括角色）
    const updatedUser = await this.userAuthRepository.findOne({
      where: { id },
      relations: ['profile'],
    });

    if (!updatedUser) {
      throw new NotFoundException('用户不存在');
    }

    // 获取用户角色
    const userRoles = await this.userRoleRepository.find({
      where: { userId: id },
      relations: ['role'],
    });

    const roles = userRoles.map((ur) => ({
      id: ur.role.id,
      name: ur.role.name,
      code: ur.role.code,
      description: ur.role.description,
    }));

    return {
      id: updatedUser.id,
      phone: updatedUser.phone,
      name: updatedUser.profile?.nickname || updatedUser.profile?.realName || '',
      email: updatedUser.profile?.email || '',
      department: '', // PostgreSQL表中没有此字段
      position: '', // PostgreSQL表中没有此字段
      avatarUrl: updatedUser.profile?.avatar || '',
      status: updatedUser.status,
      roles,
      updatedAt: updatedUser.updatedAt,
    };
  }

  /**
   * 删除用户（软删除）
   */
  async remove(id: string) {
    const user = await this.userAuthRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 软删除：将状态设置为0
    await this.userAuthRepository.update(id, { status: 0 });

    // 清除用户相关缓存
    await this.cacheService.clearUserProfile(id);
    await this.cacheService.clearUserPermissions(id);

    return { message: '删除成功' };
  }

  /**
   * 批量删除用户
   */
  async batchRemove(ids: string[]) {
    const users = await this.userAuthRepository.findByIds(ids);
    const existingIds = users.map((user) => user.id);
    const failedIds = ids.filter((id) => !existingIds.includes(id));

    // 批量软删除
    if (existingIds.length > 0) {
      await this.userAuthRepository.update(existingIds, { status: 0 });
    }

    // 批量清除用户缓存
    for (const id of existingIds) {
      await this.cacheService.clearUserProfile(id);
      await this.cacheService.clearUserPermissions(id);
    }

    return {
      deletedCount: existingIds.length,
      failedIds,
    };
  }

  /**
   * 重置用户密码
   */
  async resetPassword(id: string, resetPasswordDto: ResetPasswordDto) {
    const user = await this.userAuthRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 使用提供的新密码
    const { newPassword } = resetPasswordDto;
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // 更新密码
    await this.userAuthRepository.update(id, { passwordHash });

    return {
      message: '密码重置成功',
      needChangePassword: false,
    };
  }

  /**
   * 分配用户角色
   */
  async assignUserRoles(
    userId: string,
    assignUserRolesDto: AssignUserRolesDto,
  ) {
    const { roleIds } = assignUserRolesDto;

    // 开始分配用户角色

    // 如果roleIds未定义，直接返回
    if (!roleIds) {
      // 角色ID列表未定义，跳过分配
      return {
        userId,
        assignedRoles: 0,
        totalRoles: 0,
      };
    }

    // 检查用户是否存在
    const user = await this.userAuthRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 使用事务确保操作的原子性
    const result = await this.userRoleRepository.manager.transaction(
      async (manager) => {
        // 删除用户现有的角色关联
        // 删除现有角色关联
        const deleteResult = await manager.delete(UserRole, { userId: userId });
        // 删除操作完成

        // 如果roleIds为空数组，只删除现有关联，不创建新关联
        if (roleIds.length === 0) {
          // 角色ID列表为空，只删除现有关联
          return {
            userId,
            assignedRoles: 0,
            totalRoles: 0,
          };
        }

        // 检查角色是否都存在
        const roles = await manager.findBy(Role, {
          id: In(roleIds.map((id) => String(id))),
        });

        // 验证角色数量

        if (roles.length !== roleIds.length) {
          const foundRoleIds = roles.map((r) => r.id);
          const missingRoleIds = roleIds.filter(
            (id) => !foundRoleIds.includes(id),
          );
          // 存在缺失的角色ID
          throw new BadRequestException(
            `部分角色不存在: ${missingRoleIds.join(', ')}`,
          );
        }

        // 创建新的角色关联
        const userRoles = roleIds.map((roleId) => {
          // 创建角色关联
          const userRole = new UserRole();
          userRole.userId = String(userId); // 确保是字符串类型
          userRole.roleId = String(roleId); // 确保是字符串类型
          return userRole;
        });

        let savedUserRoles;
        try {
          savedUserRoles = await manager.save(UserRole, userRoles);
          // 角色关联保存成功
        } catch (error) {
          // 保存角色关联失败
          throw new BadRequestException(`角色分配失败: ${error.message}`);
        }

        return {
          userId,
          assignedRoles: savedUserRoles.length,
          totalRoles: roleIds.length,
        };
      },
    );

    // 清除用户相关缓存
    await this.cacheService.clearUserProfile(userId);
    await this.cacheService.clearUserPermissions(userId);

    return result;
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
}
