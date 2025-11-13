import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AuthService } from '../auth/services/auth.service';
import { UsersService } from './users.service';
import {
  CreateUserDto,
  UpdateUserDto,
  UserQueryDto,
  AssignUserRolesDto,
  ResetPasswordDto,
} from './dto';
import { BaseQueryDto, IdParamDto, BatchIdsDto } from '../common/dto/base.dto';
import { ResponseUtil } from '../common/utils/response.util';

// DTO定义已移至 users.service.ts
// CreateUserDto, UpdateUserDto 等接口在服务层定义

/**
 * 用户管理控制器
 * 提供用户的增删改查功能
 */
@ApiTags('用户管理')
@Controller('users')
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}
  /**
   * 获取用户列表
   */
  @Get()
  @Permissions('user:view')
  @ApiOperation({
    summary: '获取用户列表',
    description: '分页获取系统中的用户列表，支持搜索、排序和过滤功能',
  })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '每页数量',
    example: 10,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: '搜索关键词',
    example: '张三',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: '用户状态',
    example: '1',
  })
  @ApiQuery({
    name: 'department',
    required: false,
    description: '部门',
    example: '技术部',
  })
  @ApiResponse({
    status: 200,
    description: '成功获取用户列表',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: '操作成功' },
        data: {
          type: 'array',
          items: {
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
              status: { type: 'number', example: 1 },
              createdAt: {
                type: 'string',
                example: '2024-01-01T00:00:00.000Z',
              },
              updatedAt: {
                type: 'string',
                example: '2024-01-01T00:00:00.000Z',
              },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number', example: 1 },
            pageSize: { type: 'number', example: 10 },
            total: { type: 'number', example: 100 },
            totalPages: { type: 'number', example: 10 },
            hasNext: { type: 'boolean', example: true },
            hasPrev: { type: 'boolean', example: false },
          },
        },
        traceId: { type: 'string', example: 'trace-123456' },
        timestamp: { type: 'number', example: 1640995200000 },
      },
    },
  })
  @ApiResponse({ status: 401, description: '未授权访问' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async findAll(@Query() query: UserQueryDto) {
    const result = await this.usersService.findAll(query);
    return ResponseUtil.paginated(
      result.data,
      result.pagination.total,
      result.pagination.page,
      result.pagination.pageSize,
      '操作成功',
    );
  }

  /**
   * 获取用户详情
   */
  @Get(':id')
  @Permissions('user:view')
  @ApiOperation({
    summary: '获取用户详情',
    description: '根据用户ID获取用户的详细信息',
  })
  @ApiParam({
    name: 'id',
    description: '用户ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: '成功获取用户详情',
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
            createdAt: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
            updatedAt: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
          },
        },
        traceId: { type: 'string', example: 'trace-123456' },
        timestamp: { type: 'number', example: 1640995200000 },
      },
    },
  })
  @ApiResponse({ status: 401, description: '未授权访问' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async findOne(@Param() params: IdParamDto) {
    const result = await this.usersService.findOne(params.id);
    return ResponseUtil.success(result);
  }

  /**
   * 创建用户
   */
  @Post()
  @Permissions('user:create')
  @ApiOperation({
    summary: '创建用户',
    description: '创建新的系统用户，需要提供基本信息和初始密码',
  })
  @ApiResponse({
    status: 201,
    description: '用户创建成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 201 },
        message: { type: 'string', example: '创建成功' },
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
            status: { type: 'number', example: 1 },
            createdAt: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
          },
        },
        traceId: { type: 'string', example: 'trace-123456' },
        timestamp: { type: 'number', example: 1640995200000 },
      },
    },
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权访问' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 409, description: '手机号已存在' })
  async create(@Body() createUserDto: CreateUserDto) {
    const result = await this.usersService.create(createUserDto);
    return ResponseUtil.success(result, '创建成功', 201);
  }

  /**
   * 更新用户信息
   */
  @Put(':id')
  @Permissions('user:update')
  @ApiOperation({
    summary: '更新用户信息',
    description: '更新指定用户的基本信息，不包括密码和手机号',
  })
  @ApiParam({
    name: 'id',
    description: '用户ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: '用户信息更新成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: '更新成功' },
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
            updatedAt: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
          },
        },
        traceId: { type: 'string', example: 'trace-123456' },
        timestamp: { type: 'number', example: 1640995200000 },
      },
    },
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权访问' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    // 手动验证ID格式
    if (!id || !/^\d+$/.test(id)) {
      throw new BadRequestException('ID必须是有效的数字格式');
    }
    const result = await this.usersService.update(id, updateUserDto);
    return ResponseUtil.success(result, '更新成功');
  }

  /**
   * 删除用户
   */
  @Delete(':id')
  @Permissions('user:delete')
  @ApiOperation({
    summary: '删除用户',
    description: '软删除指定的用户，用户数据不会被物理删除',
  })
  @ApiParam({
    name: 'id',
    description: '用户ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: '用户删除成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: '删除成功' },
        data: { type: 'null' },
        traceId: { type: 'string', example: 'trace-123456' },
        timestamp: { type: 'number', example: 1640995200000 },
      },
    },
  })
  @ApiResponse({ status: 401, description: '未授权访问' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async remove(@Param() params: IdParamDto) {
    await this.usersService.remove(params.id);
    return ResponseUtil.success(null, '删除成功');
  }

  /**
   * 批量删除用户
   */
  @Delete()
  @Permissions('user:delete')
  @ApiOperation({
    summary: '批量删除用户',
    description: '批量软删除多个用户，用户数据不会被物理删除',
  })
  @ApiResponse({
    status: 200,
    description: '批量删除成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: '批量删除成功' },
        data: {
          type: 'object',
          properties: {
            deletedCount: { type: 'number', example: 3 },
            failedIds: {
              type: 'array',
              items: { type: 'string' },
              example: [],
            },
          },
        },
        traceId: { type: 'string', example: 'trace-123456' },
        timestamp: { type: 'number', example: 1640995200000 },
      },
    },
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权访问' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async batchRemove(@Body() batchIdsDto: BatchIdsDto) {
    const result = await this.usersService.batchRemove(batchIdsDto.ids);
    return ResponseUtil.success(result, '批量删除成功');
  }

  /**
   * 重置用户密码
   */
  @Post(':id/reset-password')
  @Permissions('user:manage')
  @ApiOperation({
    summary: '重置用户密码',
    description: '管理员重置指定用户的密码为指定的新密码',
  })
  @ApiParam({
    name: 'id',
    description: '用户ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: '密码重置成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: '密码重置成功' },
        data: {
          type: 'object',
          properties: {
            message: { type: 'string', example: '密码重置成功' },
            needChangePassword: { type: 'boolean', example: false },
          },
        },
        traceId: { type: 'string', example: 'trace-123456' },
        timestamp: { type: 'number', example: 1640995200000 },
      },
    },
  })
  @ApiResponse({ status: 401, description: '未授权访问' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async resetPassword(
    @Param() params: IdParamDto,
    @Body() resetPasswordDto: ResetPasswordDto,
  ) {
    const result = await this.usersService.resetPassword(
      params.id,
      resetPasswordDto,
    );
    return ResponseUtil.success(result, '密码重置成功');
  }

  /**
   * 分配用户角色
   */
  @Post(':id/roles')
  @Permissions('user:manage')
  @ApiOperation({
    summary: '分配用户角色',
    description: '为指定用户分配一组角色，会覆盖该用户原有的角色配置',
  })
  @ApiParam({
    name: 'id',
    description: '用户ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: '角色分配成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: '角色分配成功' },
        data: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            assignedRoles: { type: 'number', example: 2 },
            totalRoles: { type: 'number', example: 2 },
          },
        },
        traceId: { type: 'string', example: 'trace-123456' },
        timestamp: { type: 'number', example: 1640995200000 },
      },
    },
  })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 401, description: '未授权访问' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async assignUserRoles(
    @Param() params: IdParamDto,
    @Body() assignUserRolesDto: AssignUserRolesDto,
  ) {
    const result = await this.usersService.assignUserRoles(
      params.id,
      assignUserRolesDto,
    );
    return ResponseUtil.success(result, '角色分配成功');
  }

  /**
   * 获取用户的角色列表
   */
  @Get(':id/roles')
  @Permissions('user:view')
  @ApiOperation({
    summary: '获取用户的角色列表',
    description: '获取指定用户拥有的所有角色信息',
  })
  @ApiParam({
    name: 'id',
    description: '用户ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: '成功获取用户角色列表',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: '操作成功' },
        data: {
          type: 'object',
          properties: {
            userId: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            userName: { type: 'string', example: '张三' },
            roles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    example: '123e4567-e89b-12d3-a456-426614174000',
                  },
                  name: { type: 'string', example: '系统管理员' },
                  code: { type: 'string', example: 'admin' },
                  description: { type: 'string', example: '系统管理员角色' },
                  isSystem: { type: 'boolean', example: true },
                },
              },
            },
            roleCount: { type: 'number', example: 2 },
          },
        },
        traceId: { type: 'string', example: 'trace-123456' },
        timestamp: { type: 'number', example: 1640995200000 },
      },
    },
  })
  @ApiResponse({ status: 401, description: '未授权访问' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async getUserRoles(@Param() params: IdParamDto) {
    const userRoles = await this.usersService.getUserRoles(params.id);
    return ResponseUtil.success(userRoles, '获取用户角色成功');
  }
}
