import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { UserAuth, UserProfile } from '../../database/entities';
import { LoginDto, RegisterDto, LoginResponseDto } from '../dto/login.dto';
import { PermissionService } from './permission.service';
import {
  VerificationService,
  VerificationCodeType,
} from './verification.service';
import { SessionService } from './session.service';
import { JwtBlacklistService } from './jwt-blacklist.service';

/**
 * 认证服务
 * 负责用户认证、注册和JWT令牌管理
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserAuth, 'mysql')
    private readonly userAuthRepository: Repository<UserAuth>,
    @InjectRepository(UserProfile, 'mysql')
    private readonly userProfileRepository: Repository<UserProfile>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly permissionService: PermissionService,
    private readonly verificationService: VerificationService,
    private readonly sessionService: SessionService,
    private readonly jwtBlacklistService: JwtBlacklistService,
  ) {}

  /**
   * 用户登录
   * @param loginDto 登录信息
   * @returns 登录响应
   */
  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const { phone, password } = loginDto;

    // 查找用户
    const user = await this.userAuthRepository.findOne({
      where: { phone },
      relations: ['profile'],
    });

    if (!user) {
      throw new UnauthorizedException('手机号或密码错误');
    }

    // 检查用户状态
    if (user.status !== 1) {
      throw new UnauthorizedException('账户已被禁用');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('手机号或密码错误');
    }

    // 更新最后登录时间
    await this.userAuthRepository.update(user.id, {
      lastLoginAt: new Date(),
    });

    // 获取用户角色和权限
    const userRoles = await this.permissionService.getUserRoles(user.id);
    const userPermissions = await this.permissionService.getUserPermissions(
      user.id,
    );

    // 生成JWT令牌
    const jti = randomUUID();
    const refreshJti = randomUUID();

    const payload = {
      userId: user.id,
      username: user.phone,
      email: user.profile?.email,
      roles: userRoles.map((role) => role.code),
      permissions: userPermissions,
      jti,
      type: 'access',
    };

    const refreshPayload = {
      userId: user.id,
      username: user.phone,
      jti: refreshJti,
      type: 'refresh',
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '4h'),
    });
    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    // 创建用户会话
    await this.sessionService.createSession(jti, {
      userId: user.id,
      username: user.profile?.name || '',
      phone: user.phone,
      email: user.profile?.email || '',
      roles: userRoles.map((role) => role.code),
      permissions: userPermissions,
      loginTime: Date.now(),
      lastActiveTime: Date.now(),
      ip: '0.0.0.0', // 可以从请求获取
      userAgent: 'Unknown', // 可以从请求头获取
    });

    // 计算过期时间（秒）
    const jwtExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '4h');
    const refreshExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );

    // 将时间字符串转换为秒数
    const parseTimeToSeconds = (timeStr: string): number => {
      const match = timeStr.match(/^(\d+)([smhd])$/);
      if (!match) return 14400; // 默认4小时

      const [, num, unit] = match;
      const value = parseInt(num);

      switch (unit) {
        case 's':
          return value;
        case 'm':
          return value * 60;
        case 'h':
          return value * 3600;
        case 'd':
          return value * 86400;
        default:
          return 14400;
      }
    };

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: parseTimeToSeconds(jwtExpiresIn),
      refreshExpiresIn: parseTimeToSeconds(refreshExpiresIn),
      user: {
        id: user.id,
        phone: user.phone,
        name: user.profile?.name || '',
        email: user.profile?.email || undefined,
        department: user.profile?.department || undefined,
        position: user.profile?.position || undefined,
        avatarUrl: user.profile?.avatarUrl || undefined,
        status: user.status,
        roles: userRoles.map((role) => role.code),
        permissions: userPermissions,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString(),
      },
    };
  }

  /**
   * 用户注册
   * @param registerDto 注册信息
   * @returns 注册响应
   */
  async register(registerDto: RegisterDto): Promise<LoginResponseDto> {
    const { phone, password, confirmPassword, name } = registerDto;

    // 验证密码确认
    if (password !== confirmPassword) {
      throw new BadRequestException('密码和确认密码不一致');
    }

    // 检查手机号是否已存在
    const existingUser = await this.userAuthRepository.findOne({
      where: { phone },
    });

    if (existingUser) {
      throw new ConflictException('手机号已被注册');
    }

    // 加密密码
    const saltRounds = 12;
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
      name: name || '',
    });

    await this.userProfileRepository.save(userProfile);

    // 获取用户角色和权限（新用户默认角色）
    const userRoles = await this.permissionService.getUserRoles(savedUser.id);
    const userPermissions = await this.permissionService.getUserPermissions(
      savedUser.id,
    );

    // 生成JWT令牌
    const jti = randomUUID();
    const refreshJti = randomUUID();

    const payload = {
      userId: savedUser.id,
      username: savedUser.phone,
      email: undefined,
      roles: userRoles.map((role) => role.code),
      permissions: userPermissions,
      jti,
      type: 'access',
    };

    const refreshPayload = {
      userId: savedUser.id,
      username: savedUser.phone,
      jti: refreshJti,
      type: 'refresh',
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '4h'),
    });
    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    // 创建用户会话
    await this.sessionService.createSession(jti, {
      userId: savedUser.id,
      username: savedUser.phone,
      phone: savedUser.phone,
      email: undefined,
      roles: userRoles.map((role) => role.code),
      permissions: userPermissions,
      loginTime: Date.now(),
      lastActiveTime: Date.now(),
      ip: '0.0.0.0',
      userAgent: 'Unknown',
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 900, // 15分钟
      refreshExpiresIn: 604800, // 7天
      user: {
        id: savedUser.id,
        phone: savedUser.phone,
        name: name || '',
        email: undefined,
        department: undefined,
        position: undefined,
        avatarUrl: undefined,
        status: savedUser.status,
        roles: userRoles,
        permissions: userPermissions,
        createdAt: savedUser.createdAt.toISOString(),
        updatedAt: savedUser.updatedAt.toISOString(),
        lastLoginAt: undefined,
      },
    };
  }

  /**
   * 刷新访问令牌
   * @param refreshToken 刷新令牌
   * @returns 新的访问令牌和刷新令牌
   */
  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    refreshExpiresIn: number;
  }> {
    try {
      // 验证刷新令牌并检查黑名单
      const validationResult =
        await this.jwtBlacklistService.validateToken(refreshToken);

      if (!validationResult.valid) {
        throw new UnauthorizedException(validationResult.reason);
      }

      const payload = validationResult.payload;

      // 检查令牌类型
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('无效的刷新令牌');
      }

      // 验证用户是否存在且有效
      const user = await this.validateUser(payload.userId);
      if (!user) {
        throw new UnauthorizedException('用户不存在或已被禁用');
      }

      // 获取用户角色和权限
      const userRoles = await this.permissionService.getUserRoles(user.id);
      const userPermissions = await this.permissionService.getUserPermissions(
        user.id,
      );

      // 将旧的刷新令牌加入黑名单
      await this.jwtBlacklistService.addToBlacklist(
        refreshToken,
        'token_refresh',
      );

      // 生成新的访问令牌和刷新令牌
      const newJti = randomUUID();
      const newRefreshJti = randomUUID();

      const newPayload = {
        userId: user.id,
        username: user.phone,
        email: payload.email,
        roles: userRoles,
        permissions: userPermissions,
        jti: newJti,
        type: 'access',
      };

      const newRefreshPayload = {
        userId: user.id,
        username: user.phone,
        jti: newRefreshJti,
        type: 'refresh',
      };

      const newAccessToken = this.jwtService.sign(newPayload, {
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '4h'),
      });
      const newRefreshToken = this.jwtService.sign(newRefreshPayload, {
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRES_IN',
          '7d',
        ),
      });

      // 更新会话活动时间
      await this.sessionService.updateSessionActivity(payload.jti);

      // 计算过期时间（秒）
      const jwtExpiresIn = this.configService.get<string>(
        'JWT_EXPIRES_IN',
        '4h',
      );
      const refreshExpiresIn = this.configService.get<string>(
        'JWT_REFRESH_EXPIRES_IN',
        '7d',
      );

      // 将时间字符串转换为秒数
      const parseTimeToSeconds = (timeStr: string): number => {
        const match = timeStr.match(/^(\d+)([smhd])$/);
        if (!match) return 14400; // 默认4小时

        const [, num, unit] = match;
        const value = parseInt(num);

        switch (unit) {
          case 's':
            return value;
          case 'm':
            return value * 60;
          case 'h':
            return value * 3600;
          case 'd':
            return value * 86400;
          default:
            return 14400;
        }
      };

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: parseTimeToSeconds(jwtExpiresIn),
        refreshExpiresIn: parseTimeToSeconds(refreshExpiresIn),
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('刷新令牌失败');
    }
  }

  /**
   * 用户登出
   * @param accessToken 访问令牌
   * @param refreshToken 刷新令牌（可选）
   */
  async logout(accessToken?: string, refreshToken?: string): Promise<void> {
    try {
      // 将访问令牌加入黑名单
      if (accessToken) {
        await this.jwtBlacklistService.addToBlacklist(accessToken, 'logout');
      }

      // 如果提供了刷新令牌，也加入黑名单
      if (refreshToken) {
        await this.jwtBlacklistService.addToBlacklist(refreshToken, 'logout');
      }

      // 解析令牌获取用户信息（优先使用accessToken，其次使用refreshToken）
      let payload: any = null;
      if (accessToken) {
        payload = this.jwtService.decode(accessToken);
      } else if (refreshToken) {
        payload = this.jwtService.decode(refreshToken);
      }

      if (payload && payload.userId && payload.jti) {
        // 删除用户会话
        await this.sessionService.deleteSession(payload.jti);
      }
    } catch (error) {
      // 登出操作即使失败也不应该抛出异常
      // 登出操作失败
    }
  }

  /**
   * 强制登出用户所有设备
   * @param userId 用户ID
   */
  async forceLogoutAllDevices(userId: string): Promise<void> {
    try {
      // 获取用户所有活跃会话
      const sessions = await this.sessionService.getUserSessions(userId);

      // 将所有会话对应的令牌加入黑名单
      const tokens: string[] = [];
      for (const session of sessions) {
        // 这里需要根据实际情况获取令牌，可能需要额外的存储
        // 暂时通过会话ID来处理
      }

      // 删除所有用户会话
      await this.sessionService.deleteUserSessions(userId);

      // 权限更新通过JWT黑名单机制处理
    } catch (error) {
      // 强制登出所有设备失败
      throw error;
    }
  }

  /**
   * 发送验证码
   * @param phone 手机号
   * @param type 验证码类型
   */
  async sendVerificationCode(
    phone: string,
    type: 'login' | 'register' | 'reset_password' = 'login',
  ): Promise<void> {
    // 检查手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      throw new BadRequestException('手机号格式不正确');
    }

    // 如果是注册验证码，检查手机号是否已存在
    if (type === 'register') {
      const existingUser = await this.userAuthRepository.findOne({
        where: { phone },
      });

      if (existingUser) {
        throw new ConflictException('手机号已被注册');
      }
    }

    // 如果是登录或重置密码验证码，检查用户是否存在
    if (type === 'login' || type === 'reset_password') {
      const user = await this.userAuthRepository.findOne({
        where: { phone },
      });

      if (!user) {
        throw new BadRequestException('用户不存在');
      }
    }

    // 生成并发送验证码
    await this.verificationService.sendVerificationCode(
      phone,
      type as VerificationCodeType,
    );
  }

  /**
   * 验证验证码
   * @param phone 手机号
   * @param code 验证码
   * @param type 验证码类型
   */
  async verifyCode(
    phone: string,
    code: string,
    type: 'login' | 'register' | 'reset_password' = 'login',
  ): Promise<boolean> {
    const result = await this.verificationService.verifyCode(
      phone,
      code,
      type as VerificationCodeType,
    );
    return result.valid;
  }

  /**
   * 通过验证码登录
   * @param phone 手机号
   * @param code 验证码
   */
  async loginWithCode(phone: string, code: string): Promise<LoginResponseDto> {
    // 验证验证码
    const isValid = await this.verifyCode(phone, code, 'login');
    if (!isValid) {
      throw new UnauthorizedException('验证码错误或已过期');
    }

    // 查找用户
    const user = await this.userAuthRepository.findOne({
      where: { phone },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    if (user.status !== 1) {
      throw new UnauthorizedException('用户账号已被禁用');
    }

    // 清除验证码
    await this.verificationService.clearVerificationCode(
      phone,
      VerificationCodeType.LOGIN,
    );

    // 获取用户资料
    const profile = await this.userProfileRepository.findOne({
      where: { userId: user.id },
    });

    // 获取用户角色和权限
    const userRoles = await this.permissionService.getUserRoles(user.id);
    const userPermissions = await this.permissionService.getUserPermissions(
      user.id,
    );

    // 生成JWT令牌
    const jti = randomUUID();
    const refreshJti = randomUUID();

    const payload = {
      userId: user.id,
      username: user.phone,
      email: profile?.email,
      roles: userRoles,
      permissions: userPermissions,
      jti,
      type: 'access',
    };

    const refreshPayload = {
      userId: user.id,
      username: user.phone,
      jti: refreshJti,
      type: 'refresh',
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: '7d',
    });

    // 创建用户会话
    await this.sessionService.createSession(jti, {
      userId: user.id,
      username: user.profile?.name || '',
      phone: user.phone,
      email: user.profile?.email || '',
      roles: userRoles.map((role) => role.code),
      permissions: userPermissions,
      loginTime: Date.now(),
      lastActiveTime: Date.now(),
      ip: '0.0.0.0',
      userAgent: 'Unknown',
    });

    // 更新最后登录时间
    user.lastLoginAt = new Date();
    await this.userAuthRepository.save(user);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 900,
      refreshExpiresIn: 604800,
      user: {
        id: user.id,
        phone: user.phone,
        name: profile?.name || '',
        email: profile?.email,
        department: profile?.department,
        position: profile?.position,
        avatarUrl: profile?.avatarUrl,
        status: user.status,
        roles: userRoles,
        permissions: userPermissions,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString(),
      },
    };
  }

  /**
   * 验证用户（用于JWT策略）
   * @param userId 用户ID
   * @returns 用户信息
   */
  async validateUser(userId: string): Promise<UserAuth | null> {
    const user = await this.userAuthRepository.findOne({
      where: { id: userId, status: 1 },
      relations: ['profile'],
    });

    return user;
  }

  /**
   * 获取用户详细信息
   * @param userId 用户ID
   * @returns 用户详细信息
   */
  async getUserProfile(userId: string) {
    const user = await this.userAuthRepository.findOne({
      where: { id: userId },
      relations: ['profile', 'userRoles', 'userRoles.role'],
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    // 获取用户权限
    const permissions = await this.permissionService.getUserPermissions(userId);

    return {
      id: user.id,
      phone: user.phone,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      profile: user.profile,
      roles: user.userRoles.map((ur) => ({
        id: ur.role.id,
        name: ur.role.name,
        code: ur.role.code,
        description: ur.role.description,
      })),
      permissions: permissions,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * 修改密码
   * @param userId 用户ID
   * @param oldPassword 旧密码
   * @param newPassword 新密码
   */
  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.userAuthRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    // 验证旧密码
    const isOldPasswordValid = await bcrypt.compare(
      oldPassword,
      user.passwordHash,
    );
    if (!isOldPasswordValid) {
      throw new UnauthorizedException('旧密码错误');
    }

    // 加密新密码
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // 更新密码
    await this.userAuthRepository.update(userId, {
      passwordHash: newPasswordHash,
    });

    // 权限更新通过JWT黑名单机制处理
  }

  /**
   * 更新用户资料
   * @param userId 用户ID
   * @param updateData 更新数据
   */
  async updateProfile(
    userId: string,
    updateData: Partial<UserProfile>,
  ): Promise<void> {
    await this.userProfileRepository.update({ userId }, updateData);
  }

  /**
   * 禁用/启用用户
   * @param userId 用户ID
   * @param status 状态（0-禁用，1-启用）
   */
  async updateUserStatus(userId: string, status: number): Promise<void> {
    await this.userAuthRepository.update(userId, { status });

    // 如果禁用用户，权限更新通过JWT黑名单机制处理
    if (status === 0) {
      // 权限更新通过JWT黑名单机制处理
    }
  }

  /**
   * 获取用户权限码列表
   * @param userId 用户ID
   * @returns 权限码数组
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    return await this.permissionService.getUserPermissions(userId);
  }

  /**
   * 清除所有用户权限缓存
   * 用于角色权限更新后强制刷新所有用户权限
   */
  async clearAllUserPermissionCache(): Promise<void> {
    // 权限更新通过JWT黑名单机制处理
  }

  /**
   * 强制指定角色的所有用户重新登录
   * @param roles 角色数组
   * @param reason 强制登出原因
   * @returns 影响的用户数量
   */
  async forceLogoutByRoles(
    roles: string[],
    reason: string = '权限更新',
  ): Promise<{
    affectedUsers: number;
    affectedSessions: number;
  }> {
    try {
      // 1. 获取拥有指定角色的所有用户
      const usersWithRoles = await this.userAuthRepository
        .createQueryBuilder('user')
        .leftJoin('user_role', 'ur', 'ur.userId = user.id')
        .leftJoin('role', 'r', 'r.id = ur.roleId')
        .where('r.name IN (:...roles)', { roles })
        .andWhere('user.status = :status', { status: 1 })
        .select(['user.id'])
        .getMany();

      if (usersWithRoles.length === 0) {
        return { affectedUsers: 0, affectedSessions: 0 };
      }

      const userIds = usersWithRoles.map((user) => user.id);

      // 2. 获取这些用户的所有活跃会话
      const activeSessions =
        await this.sessionService.getActiveSessionsByUserIds(userIds);

      // 3. 将所有相关的JWT令牌加入黑名单
      const tokens: string[] = [];
      for (const session of activeSessions) {
        if (session.accessToken) {
          tokens.push(session.accessToken);
        }
        if (session.refreshToken) {
          tokens.push(session.refreshToken);
        }
      }

      if (tokens.length > 0) {
        await this.jwtBlacklistService.batchAddToBlacklist(tokens, reason);
      }

      // 4. 删除所有相关会话
      let affectedSessions = 0;
      for (const userId of userIds) {
        const deletedCount =
          await this.sessionService.deleteAllUserSessions(userId);
        affectedSessions += deletedCount;
      }

      // 5. 权限更新通过JWT黑名单机制处理
      for (const userId of userIds) {
        // 权限更新通过JWT黑名单机制处理
      }

      return {
        affectedUsers: userIds.length,
        affectedSessions,
      };
    } catch (error) {
      // 强制角色用户登出失败
      throw error;
    }
  }

  /**
   * 强制所有用户重新登录
   * @param reason 强制登出原因
   * @returns 影响的用户数量
   */
  async forceLogoutAll(reason: string = '系统维护'): Promise<{
    affectedUsers: number;
    affectedSessions: number;
  }> {
    try {
      // 1. 获取所有活跃用户
      const activeUsers = await this.userAuthRepository.find({
        where: { status: 1 },
        select: ['id'],
      });

      if (activeUsers.length === 0) {
        return { affectedUsers: 0, affectedSessions: 0 };
      }

      const userIds = activeUsers.map((user) => user.id);

      // 2. 获取所有活跃会话
      const activeSessions = await this.sessionService.getAllActiveSessions();

      // 3. 将所有JWT令牌加入黑名单
      const tokens: string[] = [];
      for (const session of activeSessions) {
        if (session.accessToken) {
          tokens.push(session.accessToken);
        }
        if (session.refreshToken) {
          tokens.push(session.refreshToken);
        }
      }

      if (tokens.length > 0) {
        await this.jwtBlacklistService.batchAddToBlacklist(tokens, reason);
      }

      // 4. 删除所有会话
      const affectedSessions = await this.sessionService.deleteAllSessions();

      // 5. 权限更新通过JWT黑名单机制处理

      return {
        affectedUsers: userIds.length,
        affectedSessions,
      };
    } catch (error) {
      // 强制所有用户登出失败
      throw error;
    }
  }
}
