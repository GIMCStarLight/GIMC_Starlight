import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { REDIS_KEYS, REDIS_TTL } from '../../config/redis.config';

/**
 * 用户会话信息
 */
export interface UserSession {
  userId: string;
  username: string;
  phone?: string;
  email?: string;
  roles: string[];
  permissions: string[];
  loginTime: number;
  lastActiveTime: number;
  ip: string;
  userAgent: string;
  deviceId?: string;
  accessToken?: string;
  refreshToken?: string;
}

/**
 * 会话管理服务
 * 负责用户会话的创建、存储、验证和管理
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(@InjectRedis() private readonly redis: Redis) {}

  /**
   * 获取会话Redis键
   */
  private getSessionKey(sessionId: string): string {
    return `${REDIS_KEYS.USER_SESSION}${sessionId}`;
  }

  /**
   * 获取用户会话列表键
   */
  private getUserSessionsKey(userId: string): string {
    return `${REDIS_KEYS.USER_SESSION}user:${userId}`;
  }

  /**
   * 创建用户会话
   * @param sessionId 会话ID（通常是JWT的jti）
   * @param sessionData 会话数据
   * @param ttl 过期时间（秒），默认7天
   */
  async createSession(
    sessionId: string,
    sessionData: UserSession,
    ttl: number = REDIS_TTL.SESSION,
  ): Promise<void> {
    try {
      const sessionKey = this.getSessionKey(sessionId);
      const userSessionsKey = this.getUserSessionsKey(sessionData.userId);

      // 存储会话数据
      await this.redis.setex(
        sessionKey,
        ttl,
        JSON.stringify({
          ...sessionData,
          lastActiveTime: Date.now(),
        }),
      );

      // 将会话ID添加到用户会话列表
      await this.redis.sadd(userSessionsKey, sessionId);
      await this.redis.expire(userSessionsKey, ttl);

      this.logger.log(
        `用户会话已创建: ${sessionData.userId}, 会话ID: ${sessionId}`,
      );
    } catch (error) {
      this.logger.error(`创建用户会话失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取用户会话
   * @param sessionId 会话ID
   * @returns 会话数据
   */
  async getSession(sessionId: string): Promise<UserSession | null> {
    try {
      const sessionKey = this.getSessionKey(sessionId);
      const sessionData = await this.redis.get(sessionKey);

      if (!sessionData) {
        return null;
      }

      return JSON.parse(sessionData) as UserSession;
    } catch (error) {
      this.logger.error(`获取用户会话失败: ${error.message}`, error.stack);
      return null;
    }
  }

  /**
   * 更新会话活跃时间
   * @param sessionId 会话ID
   */
  async updateSessionActivity(sessionId: string): Promise<void> {
    try {
      const sessionKey = this.getSessionKey(sessionId);
      const sessionData = await this.getSession(sessionId);

      if (sessionData) {
        sessionData.lastActiveTime = Date.now();
        const ttl = await this.redis.ttl(sessionKey);

        if (ttl > 0) {
          await this.redis.setex(sessionKey, ttl, JSON.stringify(sessionData));
        }
      }
    } catch (error) {
      this.logger.error(`更新会话活跃时间失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 验证会话是否有效
   * @param sessionId 会话ID
   * @returns 是否有效
   */
  async validateSession(sessionId: string): Promise<boolean> {
    try {
      const sessionKey = this.getSessionKey(sessionId);
      const exists = await this.redis.exists(sessionKey);
      return exists === 1;
    } catch (error) {
      this.logger.error(`验证会话失败: ${error.message}`, error.stack);
      return false;
    }
  }

  /**
   * 删除会话
   * @param sessionId 会话ID
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      const sessionData = await this.getSession(sessionId);
      const sessionKey = this.getSessionKey(sessionId);

      // 删除会话数据
      await this.redis.del(sessionKey);

      // 从用户会话列表中移除
      if (sessionData) {
        const userSessionsKey = this.getUserSessionsKey(sessionData.userId);
        await this.redis.srem(userSessionsKey, sessionId);
      }

      this.logger.log(`会话已删除: ${sessionId}`);
    } catch (error) {
      this.logger.error(`删除会话失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 获取用户的所有会话
   * @param userId 用户ID
   * @returns 会话列表
   */
  async getUserSessions(userId: string): Promise<UserSession[]> {
    try {
      const userSessionsKey = this.getUserSessionsKey(userId);
      const sessionIds = await this.redis.smembers(userSessionsKey);

      const sessions: UserSession[] = [];
      for (const sessionId of sessionIds) {
        const session = await this.getSession(sessionId);
        if (session) {
          sessions.push(session);
        } else {
          // 清理无效的会话ID
          await this.redis.srem(userSessionsKey, sessionId);
        }
      }

      return sessions;
    } catch (error) {
      this.logger.error(`获取用户会话列表失败: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * 删除用户的所有会话（用于强制登出）
   * @param userId 用户ID
   * @param excludeSessionId 排除的会话ID（当前会话）
   */
  async deleteUserSessions(
    userId: string,
    excludeSessionId?: string,
  ): Promise<void> {
    try {
      const userSessionsKey = this.getUserSessionsKey(userId);
      const sessionIds = await this.redis.smembers(userSessionsKey);

      for (const sessionId of sessionIds) {
        if (sessionId !== excludeSessionId) {
          await this.deleteSession(sessionId);
        }
      }

      // 如果排除了当前会话，更新用户会话列表
      if (excludeSessionId) {
        await this.redis.del(userSessionsKey);
        await this.redis.sadd(userSessionsKey, excludeSessionId);
        await this.redis.expire(userSessionsKey, REDIS_TTL.SESSION);
      } else {
        await this.redis.del(userSessionsKey);
      }

      this.logger.log(`用户所有会话已删除: ${userId}`);
    } catch (error) {
      this.logger.error(`删除用户会话失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 清理过期会话
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      // 这个方法可以通过定时任务调用
      // 由于Redis会自动清理过期键，这里主要是清理用户会话列表中的无效引用
      this.logger.log('开始清理过期会话...');

      // 可以通过扫描所有用户会话列表键来清理
      const pattern = `${REDIS_KEYS.USER_SESSION}user:*`;
      const keys = await this.redis.keys(pattern);

      for (const key of keys) {
        const sessionIds = await this.redis.smembers(key);
        const validSessionIds: string[] = [];

        for (const sessionId of sessionIds) {
          const isValid = await this.validateSession(sessionId);
          if (isValid) {
            validSessionIds.push(sessionId);
          }
        }

        // 更新用户会话列表，只保留有效的会话ID
        if (validSessionIds.length > 0) {
          await this.redis.del(key);
          await this.redis.sadd(key, ...validSessionIds);
          await this.redis.expire(key, REDIS_TTL.SESSION);
        } else {
          await this.redis.del(key);
        }
      }

      this.logger.log('过期会话清理完成');
    } catch (error) {
      this.logger.error(`清理过期会话失败: ${error.message}`, error.stack);
    }
  }

  /**
   * 根据角色获取用户会话
   * @param roles 角色数组
   * @returns 匹配角色的用户会话列表
   */
  async getSessionsByRoles(roles: string[]): Promise<UserSession[]> {
    try {
      const pattern = `${REDIS_KEYS.USER_SESSION}[^:]*`;
      const keys = await this.redis.keys(pattern);

      // 过滤出会话键（不包括用户会话列表键）
      const sessionKeys = keys.filter((key) => !key.includes(':user:'));

      const matchingSessions: UserSession[] = [];

      for (const key of sessionKeys) {
        const sessionData = await this.redis.get(key);
        if (sessionData) {
          const session = JSON.parse(sessionData) as UserSession;
          // 检查用户是否拥有指定角色中的任意一个
          if (session.roles.some((role) => roles.includes(role))) {
            matchingSessions.push(session);
          }
        }
      }

      return matchingSessions;
    } catch (error) {
      this.logger.error(`根据角色获取会话失败: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * 获取所有活跃会话
   * @returns 所有活跃会话列表
   */
  async getAllActiveSessions(): Promise<UserSession[]> {
    try {
      const pattern = `${REDIS_KEYS.USER_SESSION}[^:]*`;
      const keys = await this.redis.keys(pattern);

      // 过滤出会话键（不包括用户会话列表键）
      const sessionKeys = keys.filter((key) => !key.includes(':user:'));

      const activeSessions: UserSession[] = [];

      for (const key of sessionKeys) {
        const sessionData = await this.redis.get(key);
        if (sessionData) {
          const session = JSON.parse(sessionData) as UserSession;
          activeSessions.push(session);
        }
      }

      return activeSessions;
    } catch (error) {
      this.logger.error(`获取所有活跃会话失败: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * 获取会话统计信息
   */
  async getSessionStats(): Promise<{
    totalSessions: number;
    activeSessions: number;
  }> {
    try {
      const pattern = `${REDIS_KEYS.USER_SESSION}*`;
      const keys = await this.redis.keys(pattern);

      // 过滤出会话键（不包括用户会话列表键）
      const sessionKeys = keys.filter((key) => !key.includes(':user:'));

      return {
        totalSessions: sessionKeys.length,
        activeSessions: sessionKeys.length, // 在Redis中的都是活跃的
      };
    } catch (error) {
      this.logger.error(`获取会话统计失败: ${error.message}`, error.stack);
      return {
        totalSessions: 0,
        activeSessions: 0,
      };
    }
  }

  /**
   * 根据用户ID数组获取活跃会话
   * @param userIds 用户ID数组
   * @returns 匹配用户的活跃会话列表
   */
  async getActiveSessionsByUserIds(userIds: string[]): Promise<UserSession[]> {
    try {
      const activeSessions: UserSession[] = [];

      for (const userId of userIds) {
        const userSessions = await this.getUserSessions(userId);
        activeSessions.push(...userSessions);
      }

      return activeSessions;
    } catch (error) {
      this.logger.error(
        `根据用户ID获取活跃会话失败: ${error.message}`,
        error.stack,
      );
      return [];
    }
  }

  /**
   * 删除指定用户的所有会话
   * @param userId 用户ID
   * @returns 删除的会话数量
   */
  async deleteAllUserSessions(userId: string): Promise<number> {
    try {
      const userSessionsKey = this.getUserSessionsKey(userId);
      const sessionIds = await this.redis.smembers(userSessionsKey);

      let deletedCount = 0;
      for (const sessionId of sessionIds) {
        await this.deleteSession(sessionId);
        deletedCount++;
      }

      await this.redis.del(userSessionsKey);

      this.logger.log(
        `用户 ${userId} 的所有会话已删除，共删除 ${deletedCount} 个会话`,
      );
      return deletedCount;
    } catch (error) {
      this.logger.error(`删除用户所有会话失败: ${error.message}`, error.stack);
      return 0;
    }
  }

  /**
   * 删除所有会话
   * @returns 删除的会话数量
   */
  async deleteAllSessions(): Promise<number> {
    try {
      const pattern = `${REDIS_KEYS.USER_SESSION}*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
      }

      this.logger.log(`所有会话已删除，共删除 ${keys.length} 个键`);
      return keys.length;
    } catch (error) {
      this.logger.error(`删除所有会话失败: ${error.message}`, error.stack);
      return 0;
    }
  }
}
