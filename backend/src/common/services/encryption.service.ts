import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * 数据加密服务
 * 用于敏感信息的加密存储
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;
  private readonly saltLength = 16;
  private readonly ivLength = 16;
  private readonly tagLength = 16;

  constructor(private configService: ConfigService) {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');
    if (!encryptionKey || encryptionKey.length !== 64) {
      throw new Error('ENCRYPTION_KEY must be a 64-character hex string');
    }
    this.key = Buffer.from(encryptionKey, 'hex');
  }

  /**
   * 加密数据
   * @param plaintext 明文
   * @returns 加密后的Base64字符串
   */
  encrypt(plaintext: string): string {
    try {
      // 生成随机IV
      const iv = crypto.randomBytes(this.ivLength);

      // 创建加密器
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

      // 加密数据
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // 获取认证标签
      const tag = cipher.getAuthTag();

      // 组合: IV + Tag + 密文
      const result = Buffer.concat([iv, tag, Buffer.from(encrypted, 'hex')]);

      return result.toString('base64');
    } catch (error) {
      this.logger.error(`Encryption failed: ${error.message}`, error.stack);
      throw new Error('Data encryption failed');
    }
  }

  /**
   * 解密数据
   * @param ciphertext 密文Base64字符串
   * @returns 解密后的明文
   */
  decrypt(ciphertext: string): string {
    try {
      // 解析Base64
      const buffer = Buffer.from(ciphertext, 'base64');

      // 提取IV、Tag和密文
      const iv = buffer.subarray(0, this.ivLength);
      const tag = buffer.subarray(
        this.ivLength,
        this.ivLength + this.tagLength,
      );
      const encrypted = buffer.subarray(this.ivLength + this.tagLength);

      // 创建解密器
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(tag);

      // 解密数据
      let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error(`Decryption failed: ${error.message}`, error.stack);
      throw new Error('Data decryption failed');
    }
  }

  /**
   * 哈希密码（单向加密）
   * @param password 明文密码
   * @param salt 盐值（可选）
   * @returns { hash: string, salt: string }
   */
  hashPassword(
    password: string,
    salt?: string,
  ): { hash: string; salt: string } {
    try {
      // 如果没有提供盐值，生成随机盐值
      const saltBuffer = salt
        ? Buffer.from(salt, 'hex')
        : crypto.randomBytes(this.saltLength);

      // 使用PBKDF2进行密码哈希
      const hash = crypto.pbkdf2Sync(
        password,
        saltBuffer,
        100000, // 迭代次数
        64, // 密钥长度
        'sha512',
      );

      return {
        hash: hash.toString('hex'),
        salt: saltBuffer.toString('hex'),
      };
    } catch (error) {
      this.logger.error(
        `Password hashing failed: ${error.message}`,
        error.stack,
      );
      throw new Error('Password hashing failed');
    }
  }

  /**
   * 验证密码
   * @param password 明文密码
   * @param hash 存储的哈希值
   * @param salt 盐值
   * @returns 是否匹配
   */
  verifyPassword(password: string, hash: string, salt: string): boolean {
    try {
      const { hash: newHash } = this.hashPassword(password, salt);
      return crypto.timingSafeEqual(
        Buffer.from(hash, 'hex'),
        Buffer.from(newHash, 'hex'),
      );
    } catch (error) {
      this.logger.error(`Password verification failed: ${error.message}`);
      return false;
    }
  }

  /**
   * 生成随机Token
   * @param length 长度（字节）
   * @returns Base64 Token
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('base64url');
  }

  /**
   * 加密敏感对象字段
   * @param obj 对象
   * @param fields 需要加密的字段名数组
   * @returns 加密后的对象
   */
  encryptFields<T extends Record<string, any>>(obj: T, fields: (keyof T)[]): T {
    const result = { ...obj };
    for (const field of fields) {
      if (result[field] && typeof result[field] === 'string') {
        result[field] = this.encrypt(result[field] as string) as T[keyof T];
      }
    }
    return result;
  }

  /**
   * 解密敏感对象字段
   * @param obj 对象
   * @param fields 需要解密的字段名数组
   * @returns 解密后的对象
   */
  decryptFields<T extends Record<string, any>>(obj: T, fields: (keyof T)[]): T {
    const result = { ...obj };
    for (const field of fields) {
      if (result[field] && typeof result[field] === 'string') {
        try {
          result[field] = this.decrypt(result[field] as string) as T[keyof T];
        } catch (error) {
          this.logger.warn(`Failed to decrypt field ${String(field)}`);
        }
      }
    }
    return result;
  }

  /**
   * 数据脱敏
   * @param data 敏感数据
   * @param type 数据类型
   * @returns 脱敏后的数据
   */
  maskSensitiveData(
    data: string,
    type: 'phone' | 'email' | 'idcard' | 'bankcard',
  ): string {
    if (!data) return '';

    switch (type) {
      case 'phone':
        // 手机号: 138****1234
        return data.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
      case 'email':
        // 邮箱: u***@example.com
        const [username, domain] = data.split('@');
        return `${username[0]}***@${domain}`;
      case 'idcard':
        // 身份证: 110***********1234
        return data.replace(/(\d{3})\d{11}(\d{4})/, '$1***********$2');
      case 'bankcard':
        // 银行卡: **** **** **** 1234
        return data.replace(/\d(?=\d{4})/g, '*');
      default:
        return data;
    }
  }
}
