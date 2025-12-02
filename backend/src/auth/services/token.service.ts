import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { TimeUtil } from '../../common/utils/time.util';

/**
 * JWT令牌服务
 * 负责令牌的生成、解析和过期时间计算
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 生成访问令牌和刷新令牌
   */
  generateTokenPair(payload: {
    userId: string;
    username: string;
    email?: string;
    roles: string[];
    permissions: string[];
  }): {
    accessToken: string;
    refreshToken: string;
    jti: string;
    refreshJti: string;
    expiresIn: number;
    refreshExpiresIn: number;
  } {
    const jti = randomUUID();
    const refreshJti = randomUUID();

    const accessPayload = {
      ...payload,
      jti,
      type: 'access',
    };

    const refreshPayload = {
      userId: payload.userId,
      username: payload.username,
      jti: refreshJti,
      type: 'refresh',
    };

    const jwtExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '4h');
    const jwtRefreshExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );

    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: jwtExpiresIn,
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: jwtRefreshExpiresIn,
    });

    return {
      accessToken,
      refreshToken,
      jti,
      refreshJti,
      expiresIn: TimeUtil.parseTimeToSeconds(jwtExpiresIn),
      refreshExpiresIn: TimeUtil.parseTimeToSeconds(jwtRefreshExpiresIn),
    };
  }

  /**
   * 解析JWT令牌
   */
  decodeToken(token: string): any {
    try {
      return this.jwtService.decode(token);
    } catch (error) {
      this.logger.warn(`JWT解析失败: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * 验证JWT令牌
   */
  async verifyToken(token: string): Promise<any> {
    try {
      return await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch (error) {
      this.logger.warn(`JWT验证失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 检查令牌类型
   */
  validateTokenType(
    payload: any,
    expectedType: 'access' | 'refresh',
  ): boolean {
    return payload && payload.type === expectedType;
  }
}
