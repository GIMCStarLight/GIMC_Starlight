import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { JwtService } from '@nestjs/jwt';
import { REDIS_KEYS } from '../../config/redis.config';

/**
 * JWT黑名单服务
 * 负责管理已撤销的JWT令牌
 */
@Injectable()
export class JwtBlacklistService {
  private readonly logger = new Logger(JwtBlacklistService.name);

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * 获取黑名单Redis键
   */
  private getBlacklistKey(jti: string): string {
    return `${REDIS_KEYS.JWT_BLACKLIST}${jti}`;
  }

  /**
   * 将JWT令牌添加到黑名单
   * @param token JWT令牌
   * @param reason 撤销原因
   */
  async addToBlacklist(
    token: string,
    reason: string = 'logout',
  ): Promise<void> {
    try {
      // 解析JWT获取载荷
      const payload = this.jwtService.decode(token);

      if (!payload || !payload.jti) {
        this.logger.warn('无效的JWT令牌，无法添加到黑名单');
        return;
      }

      const { jti, exp } = payload;
      const blacklistKey = this.getBlacklistKey(jti);

      // 计算令牌剩余有效时间
      const now = Math.floor(Date.now() / 1000);
      const ttl = exp - now;

      if (ttl <= 0) {
        this.logger.log(`JWT令牌已过期，无需添加到黑名单: ${jti}`);
        return;
      }

      // 存储到Redis，设置过期时间为令牌的剩余有效时间
      const blacklistData = {
        jti,
        reason,
        revokedAt: Date.now(),
        expiresAt: exp * 1000,
      };

      await this.redis.setex(blacklistKey, ttl, JSON.stringify(blacklistData));

      this.logger.log(`JWT令牌已添加到黑名单: ${jti}, 原因: ${reason}`);
    } catch (error) {
      this.logger.error(`添加JWT到黑名单失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 检查JWT令牌是否在黑名单中
   * @param token JWT令牌
   * @returns 是否在黑名单中
   */
  async isBlacklisted(token: string): Promise<boolean> {
    try {
      // 解析JWT获取jti
      const payload = this.jwtService.decode(token);

      if (!payload || !payload.jti) {
        return false;
      }

      const blacklistKey = this.getBlacklistKey(payload.jti);
      const exists = await this.redis.exists(blacklistKey);

      return exists === 1;
    } catch (error) {
      this.logger.error(`检查JWT黑名单状态失败: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * 通过jti检查是否在黑名单中
   * @param jti JWT ID
   * @returns 是否在黑名单中
   */
  async isJtiBlacklisted(jti: string): Promise<boolean> {
    try {
      const blacklistKey = this.getBlacklistKey(jti);
      const exists = await this.redis.exists(blacklistKey);

      return exists === 1;
    } catch (error) {
      this.logger.error(`检查JTI黑名单状态失败: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * 获取黑名单信息
   * @param jti JWT ID
   * @returns 黑名单信息
   */
  async getBlacklistInfo(jti: string): Promise<{
    jti: string;
    reason: string;
    revokedAt: number;
    expiresAt: number;
  } | null> {
    try {
      const blacklistKey = this.getBlacklistKey(jti);
      const data = await this.redis.get(blacklistKey);

      if (!data) {
        return null;
      }

      return JSON.parse(data);
    } catch (error) {
      this.logger.error(`获取黑名单信息失败: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * 从黑名单中移除JWT（通常不需要，因为会自动过期）
   * @param jti JWT ID
   */
  async removeFromBlacklist(jti: string): Promise<void> {
    try {
      const blacklistKey = this.getBlacklistKey(jti);
      await this.redis.del(blacklistKey);

      this.logger.log(`JWT已从黑名单中移除: ${jti}`);
    } catch (error) {
      this.logger.error(`从黑名单移除JWT失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 批量添加JWT到黑名单（用于用户强制登出所有设备）
   * @param tokens JWT令牌数组
   * @param reason 撤销原因
   */
  async batchAddToBlacklist(
    tokens: string[],
    reason: string = 'force_logout',
  ): Promise<void> {
    try {
      const promises = tokens.map((token) =>
        this.addToBlacklist(token, reason),
      );

      await Promise.all(promises);

      this.logger.log(`批量添加 ${tokens.length} 个JWT到黑名单`);
    } catch (error) {
      this.logger.error(
        `批量添加JWT到黑名单失败: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * 清理过期的黑名单条目（Redis会自动处理，这里主要用于统计）
   */
  async cleanupExpiredEntries(): Promise<number> {
    try {
      const pattern = `${REDIS_KEYS.JWT_BLACKLIST}*`;
      const keys = await this.redis.keys(pattern);

      let cleanedCount = 0;
      const now = Date.now();

      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const blacklistInfo = JSON.parse(data);
          if (blacklistInfo.expiresAt < now) {
            await this.redis.del(key);
            cleanedCount++;
          }
        }
      }

      if (cleanedCount > 0) {
        this.logger.log(`清理了 ${cleanedCount} 个过期的黑名单条目`);
      }

      return cleanedCount;
    } catch (error) {
      this.logger.error(
        `清理过期黑名单条目失败: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  /**
   * 获取黑名单统计信息
   */
  async getBlacklistStats(): Promise<{
    totalEntries: number;
    entriesByReason: Record<string, number>;
  }> {
    try {
      const pattern = `${REDIS_KEYS.JWT_BLACKLIST}*`;
      const keys = await this.redis.keys(pattern);

      const entriesByReason: Record<string, number> = {};

      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          const blacklistInfo = JSON.parse(data);
          const reason = blacklistInfo.reason || 'unknown';
          entriesByReason[reason] = (entriesByReason[reason] || 0) + 1;
        }
      }

      return {
        totalEntries: keys.length,
        entriesByReason,
      };
    } catch (error) {
      this.logger.error(`获取黑名单统计失败: ${error.message}`, error.stack);
      return {
        totalEntries: 0,
        entriesByReason: {},
      };
    }
  }

  /**
   * 验证并检查JWT令牌
   * @param token JWT令牌
   * @returns 验证结果
   */
  async validateToken(token: string): Promise<{
    valid: boolean;
    payload?: any;
    reason?: string;
  }> {
    try {
      // 检查token格式
      if (!token || typeof token !== 'string') {
        this.logger.warn('JWT令牌格式无效: token为空或非字符串');
        return {
          valid: false,
          reason: '令牌格式无效',
        };
      }

      // 检查JWT基本格式（应该有3个部分，用.分隔）
      const parts = token.split('.');
      if (parts.length !== 3) {
        this.logger.warn(
          `JWT令牌格式无效: 期望3个部分，实际${parts.length}个部分`,
        );
        return {
          valid: false,
          reason: '令牌格式无效',
        };
      }

      // 首先验证JWT格式和签名
      const payload = this.jwtService.verify(token);

      // 检查payload基本字段
      if (!payload || !payload.jti || !payload.userId) {
        this.logger.warn('JWT载荷无效: 缺少必要字段');
        return {
          valid: false,
          reason: '令牌载荷无效',
        };
      }

      // 检查是否在黑名单中
      const isBlacklisted = await this.isBlacklisted(token);

      if (isBlacklisted) {
        const blacklistInfo = await this.getBlacklistInfo(payload.jti);
        this.logger.warn(
          `JWT令牌已被撤销: jti=${payload.jti}, reason=${blacklistInfo?.reason}`,
        );
        return {
          valid: false,
          reason: `令牌已被撤销: ${blacklistInfo?.reason || 'unknown'}`,
        };
      }

      return {
        valid: true,
        payload,
      };
    } catch (error) {
      // 记录详细的错误信息
      this.logger.error(`JWT令牌验证失败: ${error.message}`, {
        error: error.message,
        stack: error.stack,
        tokenLength: token?.length || 0,
        tokenPrefix: token?.substring(0, 20) || 'N/A',
      });

      // 根据错误类型返回更具体的错误信息
      let reason = '令牌验证失败';
      if (error.name === 'JsonWebTokenError') {
        reason = '令牌格式或签名无效';
      } else if (error.name === 'TokenExpiredError') {
        reason = '令牌已过期';
      } else if (error.name === 'NotBeforeError') {
        reason = '令牌尚未生效';
      }

      return {
        valid: false,
        reason: `${reason}: ${error.message}`,
      };
    }
  }
}
