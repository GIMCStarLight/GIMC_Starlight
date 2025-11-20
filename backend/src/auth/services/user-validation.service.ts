import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserAuth } from '../../database/entities';

/**
 * 用户验证服务
 * 负责用户验证、密码验证等基础验证逻辑
 */
@Injectable()
export class UserValidationService {
  private readonly logger = new Logger(UserValidationService.name);

  constructor(
    @InjectRepository(UserAuth, 'postgres')
    private readonly userAuthRepository: Repository<UserAuth>,
  ) {}

  /**
   * 验证用户是否存在且状态正常
   */
  async validateUserExists(userId: string): Promise<UserAuth> {
    const user = await this.userAuthRepository.findOne({
      where: { id: userId, status: 1 },
      relations: ['profile'],
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在或已被禁用');
    }

    return user;
  }

  /**
   * 通过手机号查找用户
   */
  async findUserByPhone(phone: string): Promise<UserAuth | null> {
    return await this.userAuthRepository.findOne({
      where: { phone },
      relations: ['profile'],
    });
  }

  /**
   * 验证用户登录凭证
   */
  async validateUserCredentials(
    phone: string,
    password: string,
  ): Promise<UserAuth> {
    const user = await this.findUserByPhone(phone);

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

    return user;
  }

  /**
   * 验证手机号格式
   */
  validatePhoneFormat(phone: string): void {
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      throw new BadRequestException('手机号格式不正确');
    }
  }

  /**
   * 检查手机号是否已注册
   */
  async checkPhoneExists(phone: string): Promise<boolean> {
    const user = await this.userAuthRepository.findOne({
      where: { phone },
    });
    return !!user;
  }

  /**
   * 验证手机号未被注册
   */
  async ensurePhoneNotExists(phone: string): Promise<void> {
    const exists = await this.checkPhoneExists(phone);
    if (exists) {
      throw new ConflictException('手机号已被注册');
    }
  }

  /**
   * 验证手机号已注册
   */
  async ensurePhoneExists(phone: string): Promise<void> {
    const exists = await this.checkPhoneExists(phone);
    if (!exists) {
      throw new BadRequestException('用户不存在');
    }
  }

  /**
   * 验证密码匹配
   */
  async validatePassword(
    userId: string,
    password: string,
  ): Promise<boolean> {
    const user = await this.userAuthRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    return await bcrypt.compare(password, user.passwordHash);
  }

  /**
   * 更新用户最后登录时间
   */
  async updateLastLoginTime(userId: string): Promise<void> {
    await this.userAuthRepository.update(userId, {
      lastLoginAt: new Date(),
    });
  }
}
