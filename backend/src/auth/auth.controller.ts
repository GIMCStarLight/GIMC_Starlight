import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  UseGuards,
  Request,
  Response,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type { Response as ExpressResponse } from 'express';
import type { AuthenticatedRequest } from './types/request.types';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './services/auth.service';
import { LoginDto, RegisterDto, LoginResponseDto } from './dto/login.dto';
import { Public } from './decorators/permissions.decorator';
import { Permissions } from './decorators/permissions.decorator';
import { PermissionGuard } from './guards/permission.guard';
import { ResponseUtil } from '../common/utils/response.util';
import {
  RateLimit,
  RateLimitTier,
} from '../common/decorators/rate-limit.decorator';

/**
 * 认证控制器
 * 处理用户认证相关的HTTP请求
 */
@ApiTags('认证管理')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 用户登录
   */
  @Public()
  @RateLimit(RateLimitTier.STRICT) // 严格限流：5次/分钟
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '用户登录',
    description: '使用手机号和密码进行用户身份验证，成功后返回JWT访问令牌',
  })
  @ApiResponse({
    status: 200,
    description: '登录成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: '登录成功' },
        data: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            tokenType: { type: 'string', example: 'Bearer' },
            expiresIn: { type: 'number', example: 3600 },
            user: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  example: '123e4567-e89b-12d3-a456-426614174000',
                },
                phone: { type: 'string', example: '13800138000' },
                name: { type: 'string', example: '张三' },
                email: { type: 'string', example: 'zhangsan@example.com' },
                department: { type: 'string', example: '技术部' },
                position: { type: 'string', example: '高级工程师' },
                avatarUrl: {
                  type: 'string',
                  example: 'https://example.com/avatar.jpg',
                },
                status: { type: 'number', example: 1 },
                roles: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['user'],
                },
                permissions: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['user:view'],
                },
              },
            },
          },
        },
        traceId: { type: 'string', example: 'trace-123456' },
        timestamp: { type: 'number', example: 1640995200000 },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '请求参数错误',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 400 },
        message: { type: 'string', example: '手机号格式不正确' },
        data: { type: 'null' },
        traceId: { type: 'string', example: 'trace-123456' },
        timestamp: { type: 'number', example: 1640995200000 },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '认证失败',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 401 },
        message: { type: 'string', example: '手机号或密码错误' },
        data: { type: 'null' },
        traceId: { type: 'string', example: 'trace-123456' },
        timestamp: { type: 'number', example: 1640995200000 },
      },
    },
  })
  async login(
    @Body() loginDto: LoginDto,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const result = await this.authService.login(loginDto);

    // 设置HttpOnly Cookie存储Refresh Token
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // 生产环境使用HTTPS
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
      path: '/',
    });

    return ResponseUtil.success(result, '登录成功');
  }

  /**
   * 用户注册
   */
  @Public()
  @RateLimit(RateLimitTier.STRICT) // 严格限流：5次/分钟
  @Post('register')
  @ApiOperation({
    summary: '用户注册',
    description:
      '新用户注册，需要提供手机号、密码等基本信息，注册成功后自动登录返回JWT令牌',
  })
  @ApiResponse({
    status: 201,
    description: '注册成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 201 },
        message: { type: 'string', example: '注册成功' },
        data: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            tokenType: { type: 'string', example: 'Bearer' },
            expiresIn: { type: 'number', example: 3600 },
            user: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  example: '123e4567-e89b-12d3-a456-426614174000',
                },
                phone: { type: 'string', example: '13800138000' },
                name: { type: 'string', example: '张三' },
                email: { type: 'string', example: null },
                department: { type: 'string', example: null },
                position: { type: 'string', example: null },
                avatarUrl: { type: 'string', example: null },
                status: { type: 'number', example: 1 },
                roles: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['user'],
                },
                permissions: {
                  type: 'array',
                  items: { type: 'string' },
                  example: ['user:view'],
                },
              },
            },
          },
        },
        traceId: { type: 'string', example: 'trace-123456' },
        timestamp: { type: 'number', example: 1640995200000 },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: '请求参数错误',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 400 },
        message: { type: 'string', example: '密码必须包含字母和数字' },
        data: { type: 'null' },
        traceId: { type: 'string', example: 'trace-123456' },
        timestamp: { type: 'number', example: 1640995200000 },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: '手机号已存在',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 409 },
        message: { type: 'string', example: '该手机号已被注册' },
        data: { type: 'null' },
        traceId: { type: 'string', example: 'trace-123456' },
        timestamp: { type: 'number', example: 1640995200000 },
      },
    },
  })
  async register(
    @Body() registerDto: RegisterDto,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const result = await this.authService.register(registerDto);

    // 设置HttpOnly Cookie存储Refresh Token
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // 生产环境使用HTTPS
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
      path: '/',
    });

    return ResponseUtil.success(result, '注册成功');
  }

  /**
   * 刷新访问令牌
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '刷新访问令牌',
    description:
      '使用刷新令牌获取新的访问令牌，刷新令牌可以从Cookie或请求体中获取',
  })
  @ApiResponse({
    status: 200,
    description: '刷新成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: '刷新成功' },
        data: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
            tokenType: { type: 'string', example: 'Bearer' },
            expiresIn: { type: 'number', example: 900 },
          },
        },
        traceId: { type: 'string', example: 'trace-123456' },
        timestamp: { type: 'number', example: 1640995200000 },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '刷新令牌无效或已过期',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 401 },
        message: { type: 'string', example: '刷新令牌无效或已过期' },
        data: { type: 'null' },
        traceId: { type: 'string', example: 'trace-123456' },
        timestamp: { type: 'number', example: 1640995200000 },
      },
    },
  })
  async refresh(
    @Request() req: AuthenticatedRequest,
    @Response({ passthrough: true }) res: ExpressResponse,
    @Body() body?: { refreshToken?: string },
  ) {
    // 优先从Cookie中获取refreshToken，其次从请求体中获取
    const refreshToken = req.cookies?.refreshToken || body?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('缺少刷新令牌');
    }

    const result = await this.authService.refreshToken(refreshToken);

    // 设置新的HttpOnly Cookie存储新的Refresh Token
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // 生产环境使用HTTPS
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
      path: '/',
    });

    return ResponseUtil.success(
      {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        tokenType: 'Bearer',
        expiresIn: result.expiresIn,
      },
      '刷新成功',
    );
  }

  /**
   * 获取当前用户信息
   */
  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取当前用户信息',
    description: '获取当前登录用户的详细信息，包括个人资料、角色和权限',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: '操作成功' },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            phone: { type: 'string', example: '13800138000' },
            name: { type: 'string', example: '张三' },
            email: { type: 'string', example: 'zhangsan@example.com' },
            department: { type: 'string', example: '技术部' },
            position: { type: 'string', example: '高级工程师' },
            avatarUrl: {
              type: 'string',
              example: 'https://example.com/avatar.jpg',
            },
            status: { type: 'number', example: 1 },
            roles: {
              type: 'array',
              items: { type: 'string' },
              example: ['user', 'admin'],
            },
            permissions: {
              type: 'array',
              items: { type: 'string' },
              example: ['user:view', 'user:create', 'admin:access'],
            },
            createdAt: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
            updatedAt: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
            lastLoginAt: {
              type: 'string',
              example: '2024-01-01T12:00:00.000Z',
            },
          },
        },
        traceId: { type: 'string', example: 'trace-123456' },
        timestamp: { type: 'number', example: 1640995200000 },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: '未认证',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 401 },
        message: { type: 'string', example: 'JWT令牌无效或已过期' },
        data: { type: 'null' },
        traceId: { type: 'string', example: 'trace-123456' },
        timestamp: { type: 'number', example: 1640995200000 },
      },
    },
  })
  async getProfile(@Request() req: AuthenticatedRequest) {
    // 从数据库获取用户基本信息和资料
    const userInfo = await this.authService.validateUser(req.user.userId);

    // 组合JWT中的权限信息和数据库中的用户信息
    const profileData = {
      id: userInfo?.id || req.user.userId,
      phone: userInfo?.phone || req.user.phone,
      name: userInfo?.profile?.nickname || userInfo?.profile?.realName || req.user.name,
      email: userInfo?.profile?.email,
      department: undefined,
      position: undefined,
      avatarUrl: userInfo?.profile?.avatar,
      status: userInfo?.status,
      roles: req.user.roles, // 使用JWT中的角色信息
      permissions: req.user.permissions, // 使用JWT中的权限信息
      createdAt: userInfo?.createdAt,
      updatedAt: userInfo?.updatedAt,
      lastLoginAt: userInfo?.lastLoginAt,
    };

    return ResponseUtil.success(profileData, '获取成功');
  }

  /**
   * 修改密码
   */
  @Patch('password')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '修改密码' })
  @ApiResponse({ status: 200, description: '修改成功' })
  @ApiResponse({ status: 401, description: '认证失败' })
  async changePassword(
    @Request() req: AuthenticatedRequest,
    @Body() body: { oldPassword: string; newPassword: string },
  ) {
    await this.authService.changePassword(
      req.user.userId,
      body.oldPassword,
      body.newPassword,
    );
    return { message: '密码修改成功' };
  }

  /**
   * 退出登录：将JWT加入黑名单并清除Cookie
   */
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '用户退出登录',
    description: '将JWT令牌加入黑名单，清除Refresh Token Cookie并使登录态失效',
  })
  @ApiResponse({ status: 200, description: '退出登录成功' })
  async logout(@Request() req: AuthenticatedRequest, @Response({ passthrough: true }) res: ExpressResponse) {
    // 获取访问令牌
    const token = req.headers.authorization?.replace('Bearer ', '');

    // 获取刷新令牌
    const refreshToken = req.cookies?.refreshToken;

    // 调用登出服务，将令牌加入黑名单
    if (token || refreshToken) {
      await this.authService.logout(token, refreshToken);
    }

    // 清除refreshToken Cookie
    res.clearCookie('refreshToken', { path: '/' });

    return { code: 200, message: '退出登录成功', data: null };
  }

  /**
   * 更新用户资料
   */
  @Patch('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新用户资料' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body()
    updateData: {
      name?: string;
      email?: string;
      department?: string;
      position?: string;
      avatarUrl?: string;
    },
  ) {
    await this.authService.updateProfile(req.user.userId, updateData);
    return { message: '资料更新成功' };
  }

  /**
   * 管理员：更新用户状态
   */
  @Patch('users/:userId/status')
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @Permissions('user:manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新用户状态（管理员）' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async updateUserStatus(
    @Request() req: AuthenticatedRequest,
    @Body() body: { userId: string; status: number },
  ) {
    await this.authService.updateUserStatus(body.userId, body.status);
    return { message: '用户状态更新成功' };
  }

  /**
   * 测试权限接口
   */
  @Get('test/admin')
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @Permissions('admin:access')
  @ApiBearerAuth()
  @ApiOperation({ summary: '测试管理员权限' })
  async testAdminPermission() {
    return { message: '您拥有管理员权限' };
  }

  /**
   * 测试用户管理权限
   */
  @Get('test/user-manage')
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @Permissions('user:create', 'user:update', 'user:delete')
  @ApiBearerAuth()
  @ApiOperation({ summary: '测试用户管理权限' })
  async testUserManagePermission() {
    return { message: '您拥有用户管理权限' };
  }

  /**
   * 获取当前用户权限码列表
   */
  @Get('codes')
  @UseGuards(AuthGuard('jwt'))
  @RateLimit(RateLimitTier.RELAXED) // 宽松限流：100次/分钟
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '获取当前用户权限码' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 401, description: '未认证' })
  async getAccessCodes(@Request() req: AuthenticatedRequest) {
    const userId = req.user.userId;
    const permissions = await this.authService.getUserPermissions(userId);
    return ResponseUtil.success(permissions, '操作成功');
  }

  /**
   * 清除所有用户权限缓存
   */
  @Post('clear-permission-cache')
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @Permissions('admin:access')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '清除所有用户权限缓存' })
  @ApiResponse({ status: 200, description: '清除成功' })
  @ApiResponse({ status: 401, description: '未认证' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async clearPermissionCache() {
    await this.authService.clearAllUserPermissionCache();
    return ResponseUtil.success(null, '权限缓存清除成功');
  }

  /**
   * 强制指定角色的所有用户重新登录
   */
  @Post('force-logout-by-role')
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @Permissions('admin:access')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '强制指定角色的所有用户重新登录' })
  @ApiResponse({ status: 200, description: '强制登出成功' })
  @ApiResponse({ status: 401, description: '未认证' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async forceLogoutByRole(@Body() body: { roles: string[]; reason?: string }) {
    const { roles, reason = '权限更新，需要重新登录' } = body;
    const result = await this.authService.forceLogoutByRoles(roles, reason);
    return {
      code: 200,
      message: `成功强制 ${result.affectedUsers} 个用户重新登录`,
      data: result,
    };
  }

  /**
   * 强制所有用户重新登录
   */
  @Post('force-logout-all')
  @UseGuards(AuthGuard('jwt'), PermissionGuard)
  @Permissions('admin:access')
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '强制所有用户重新登录' })
  @ApiResponse({ status: 200, description: '强制登出成功' })
  @ApiResponse({ status: 401, description: '未认证' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async forceLogoutAll(@Body() body: { reason?: string }) {
    const { reason = '系统维护，需要重新登录' } = body;
    const result = await this.authService.forceLogoutAll(reason);
    return {
      code: 200,
      message: `成功强制 ${result.affectedUsers} 个用户重新登录`,
      data: result,
    };
  }
}
