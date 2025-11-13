import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { REDIS_KEYS, REDIS_TTL } from '../../config/redis.config';

/**
 * 验证码类型
 */
export enum VerificationCodeType {
  LOGIN = 'login',
  REGISTER = 'register',
  RESET_PASSWORD = 'reset_password',
  CHANGE_PHONE = 'change_phone',
}

/**
 * 验证码服务
 * 负责验证码的生成、存储、验证和管理
 */
@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * 生成6位数字验证码
   */
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * 获取验证码Redis键
   */
  private getCodeKey(phone: string, type: VerificationCodeType): string {
    return `${REDIS_KEYS.VERIFICATION_CODE}${type}:${phone}`;
  }

  /**
   * 获取发送频率限制Redis键
   */
  private getRateLimitKey(phone: string): string {
    return `${REDIS_KEYS.RATE_LIMIT}sms:${phone}`;
  }

  /**
   * 发送验证码
   * @param phone 手机号
   * @param type 验证码类型
   * @returns 验证码（开发环境返回，生产环境不返回）
   */
  async sendVerificationCode(
    phone: string,
    type: VerificationCodeType,
  ): Promise<{ success: boolean; code?: string; message?: string }> {
    try {
      // 检查发送频率限制
      const rateLimitKey = this.getRateLimitKey(phone);
      const lastSendTime = await this.redis.get(rateLimitKey);

      if (lastSendTime) {
        const timeDiff = Date.now() - parseInt(lastSendTime);
        if (timeDiff < 60000) {
          // 1分钟内不能重复发送
          return {
            success: false,
            message: `请等待 ${Math.ceil((60000 - timeDiff) / 1000)} 秒后再试`,
          };
        }
      }

      // 生成验证码
      const code = this.generateCode();
      const codeKey = this.getCodeKey(phone, type);

      // 存储验证码到Redis，5分钟过期
      await this.redis.setex(codeKey, REDIS_TTL.SHORT, code);

      // 设置发送频率限制，1分钟
      await this.redis.setex(rateLimitKey, 60, Date.now().toString());

      // 这里应该调用短信服务发送验证码
      // await this.smsService.sendSMS(phone, code, type);

      this.logger.log(`验证码已发送到 ${phone}，类型: ${type}`);

      // 开发环境返回验证码，生产环境不返回
      const isDev = process.env.NODE_ENV === 'development';

      return {
        success: true,
        code: isDev ? code : undefined,
        message: '验证码发送成功',
      };
    } catch (error) {
      this.logger.error(`发送验证码失败: ${error.message}`, error.stack);
      return {
        success: false,
        message: '验证码发送失败，请稍后重试',
      };
    }
  }

  /**
   * 验证验证码
   * @param phone 手机号
   * @param code 验证码
   * @param type 验证码类型
   * @returns 验证结果
   */
  async verifyCode(
    phone: string,
    code: string,
    type: VerificationCodeType,
  ): Promise<{ valid: boolean; message?: string }> {
    try {
      const codeKey = this.getCodeKey(phone, type);
      const storedCode = await this.redis.get(codeKey);

      if (!storedCode) {
        return {
          valid: false,
          message: '验证码已过期或不存在',
        };
      }

      if (storedCode !== code) {
        return {
          valid: false,
          message: '验证码错误',
        };
      }

      // 验证成功后删除验证码
      await this.redis.del(codeKey);

      this.logger.log(`验证码验证成功: ${phone}, 类型: ${type}`);

      return {
        valid: true,
        message: '验证码验证成功',
      };
    } catch (error) {
      this.logger.error(`验证码验证失败: ${error.message}`, error.stack);
      return {
        valid: false,
        message: '验证码验证失败',
      };
    }
  }

  /**
   * 清除验证码
   * @param phone 手机号
   * @param type 验证码类型
   */
  async clearVerificationCode(
    phone: string,
    type: VerificationCodeType,
  ): Promise<void> {
    try {
      const codeKey = this.getCodeKey(phone, type);
      await this.redis.del(codeKey);
      this.logger.log(`已清除验证码: ${phone}, 类型: ${type}`);
    } catch (error) {
      this.logger.error(`清除验证码失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 检查验证码是否存在
   * @param phone 手机号
   * @param type 验证码类型
   * @returns 是否存在
   */
  async hasVerificationCode(
    phone: string,
    type: VerificationCodeType,
  ): Promise<boolean> {
    try {
      const codeKey = this.getCodeKey(phone, type);
      const exists = await this.redis.exists(codeKey);
      return exists === 1;
    } catch (error) {
      this.logger.error(`检查验证码存在性失败: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * 获取验证码剩余有效时间（秒）
   * @param phone 手机号
   * @param type 验证码类型
   * @returns 剩余时间（秒），-1表示不存在
   */
  async getCodeTTL(phone: string, type: VerificationCodeType): Promise<number> {
    try {
      const codeKey = this.getCodeKey(phone, type);
      return await this.redis.ttl(codeKey);
    } catch (error) {
      this.logger.error(`获取验证码TTL失败: ${error.message}`, error.stack);
      return -1;
    }
  }
}
