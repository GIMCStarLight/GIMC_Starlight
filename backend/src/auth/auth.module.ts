import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';

// 实体
import {
  UserAuth,
  UserProfile,
  Role,
  Permission,
  UserRole,
  RolePermission,
} from '../database/entities';

// 服务
import { AuthService } from './services/auth.service';
import { PermissionService } from './services/permission.service';
import { VerificationService } from './services/verification.service';
import { SessionService } from './services/session.service';
import { JwtBlacklistService } from './services/jwt-blacklist.service';

// 控制器
import { AuthController } from './auth.controller';

// 策略
import { JwtStrategy } from './strategies/jwt.strategy';

// 守卫
import { PermissionGuard, AnyPermissionGuard } from './guards/permission.guard';

@Module({
  imports: [
    // Redis模块
    RedisModule,

    // TypeORM实体注册
    TypeOrmModule.forFeature(
      [UserAuth, UserProfile, Role, Permission, UserRole, RolePermission],
      'mysql',
    ),

    // Passport模块
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JWT模块
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'your-secret-key'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1h'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PermissionService,
    VerificationService,
    SessionService,
    JwtBlacklistService,
    JwtStrategy,
    PermissionGuard,
    AnyPermissionGuard,
  ],
  exports: [
    AuthService,
    PermissionService,
    VerificationService,
    SessionService,
    JwtBlacklistService,
    PermissionGuard,
    AnyPermissionGuard,
  ],
})
export class AuthModule {}
