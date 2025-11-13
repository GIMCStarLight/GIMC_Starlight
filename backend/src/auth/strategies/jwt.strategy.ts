import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth.service';

/**
 * JWT认证策略
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        ExtractJwt.fromUrlQueryParameter('token'),
        (request) => {
          let token = null;
          if (request && request.cookies) {
            token = request.cookies['jwt'];
            // JWT令牌提取
          }
          return token;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'your-secret-key'),
    });
  }

  /**
   * 验证JWT载荷
   * @param payload JWT载荷
   * @returns 用户信息
   */
  async validate(payload: any) {
    const { userId, type } = payload;

    // 确保只接受access类型的token
    if (type !== 'access') {
      throw new UnauthorizedException('无效的令牌类型');
    }

    // 检查必要的payload字段
    if (!userId) {
      throw new UnauthorizedException('JWT载荷缺少用户ID');
    }

    // 直接返回JWT中的用户信息，完全避免数据库查询
    return {
      userId: payload.userId,
      username: payload.username,
      email: payload.email,
      phone: payload.phone,
      name: payload.name,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
      jti: payload.jti,
      sessionId: payload.jti,
    };
  }
}
