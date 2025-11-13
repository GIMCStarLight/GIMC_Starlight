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
import { PermissionsGuard } from '../common/guards/auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { BaseQueryDto, IdParamDto, BatchIdsDto } from '../common/dto/base.dto';
import { RolesService } from './roles.service';
import type { CreateRoleDto, UpdateRoleDto } from './roles.service';
import { UserRoleDto } from './dto/user-role.dto';
import { ResponseUtil } from '../common/utils/response.util';

/**
 * 角色信息DTO
 */
export class RoleDto {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: number;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

// DTO定义已移至 roles.service.ts

/**
 * 角色管理控制器
 * 提供角色的增删改查和用户角色关联功能
 */
@ApiTags('角色管理')
@Controller('roles')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /**
   * 获取角色树形列表（用于树形表格）
   */
  @Get('tree-list')
  @Permissions('role:view')
  @ApiOperation({
    summary: '获取角色树形列表',
    description: '获取适合树形表格使用的角色树形结构，支持搜索和过滤',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: '搜索关键词',
    example: '管理员',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: '角色状态',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: '成功获取角色树形列表',
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
              name: { type: 'string', example: '系统管理员' },
              code: { type: 'string', example: 'admin' },
              description: {
                type: 'string',
                example: '系统管理员角色，拥有所有权限',
              },
              status: { type: 'number', example: 1 },
              pid: { type: 'string', example: null },
              isSystem: { type: 'boolean', example: true },
              userCount: { type: 'number', example: 5 },
              permissionCount: { type: 'number', example: 20 },
              createdAt: {
                type: 'string',
                example: '2024-01-01T00:00:00.000Z',
              },
              updatedAt: {
                type: 'string',
                example: '2024-01-01T00:00:00.000Z',
              },
              children: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'string',
                      example: '123e4567-e89b-12d3-a456-426614174001',
                    },
                    name: { type: 'string', example: '部门经理' },
                    code: { type: 'string', example: 'manager' },
                    description: { type: 'string', example: '部门经理角色' },
                    status: { type: 'number', example: 1 },
                    pid: {
                      type: 'string',
                      example: '123e4567-e89b-12d3-a456-426614174000',
                    },
                    isSystem: { type: 'boolean', example: false },
                    userCount: { type: 'number', example: 3 },
                    permissionCount: { type: 'number', example: 10 },
                    createdAt: {
                      type: 'string',
                      example: '2024-01-01T00:00:00.000Z',
                    },
                    updatedAt: {
                      type: 'string',
                      example: '2024-01-01T00:00:00.000Z',
                    },
                    children: { type: 'array', items: { type: 'object' } },
                  },
                },
              },
            },
          },
        },
        total: { type: 'number', example: 10 },
        traceId: { type: 'string', example: 'trace-123456' },
        timestamp: { type: 'number', example: 1640995200000 },
      },
    },
  })
  @ApiResponse({ status: 401, description: '未授权访问' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getRoleTreeList(@Query() query: BaseQueryDto) {
    const result = await this.rolesService.getRoleTreeList(query);
    return ResponseUtil.success(result);
  }

  /**
   * 获取角色列表
   */
  @Get()
  @Permissions('role:view')
  @ApiOperation({
    summary: '获取角色列表',
    description: '分页获取系统中的角色列表，支持搜索和状态过滤',
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
    example: '管理员',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: '角色状态',
    example: '1',
  })
  @ApiResponse({
    status: 200,
    description: '成功获取角色列表',
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
              name: { type: 'string', example: '系统管理员' },
              code: { type: 'string', example: 'admin' },
              description: {
                type: 'string',
                example: '系统管理员角色，拥有所有权限',
              },
              status: { type: 'number', example: 1 },
              isSystem: { type: 'boolean', example: true },
              userCount: { type: 'number', example: 5 },
              permissionCount: { type: 'number', example: 20 },
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
            total: { type: 'number', example: 5 },
            totalPages: { type: 'number', example: 1 },
            hasNext: { type: 'boolean', example: false },
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
  async findAll(@Query() query: BaseQueryDto) {
    const result = await this.rolesService.findAll(query);
    return ResponseUtil.paginated(
      result.data,
      result.pagination.total,
      result.pagination.page,
      result.pagination.pageSize,
      '获取角色列表成功',
    );
  }

  /**
   * 获取角色详情
   */
  @Get(':id')
  @Permissions('role:view')
  @ApiOperation({
    summary: '获取角色详情',
    description: '根据角色ID获取角色的详细信息，包括权限列表',
  })
  @ApiParam({
    name: 'id',
    description: '角色ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: '成功获取角色详情',
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
            name: { type: 'string', example: '系统管理员' },
            code: { type: 'string', example: 'admin' },
            description: {
              type: 'string',
              example: '系统管理员角色，拥有所有权限',
            },
            status: { type: 'number', example: 1 },
            isSystem: { type: 'boolean', example: true },
            permissions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    example: '123e4567-e89b-12d3-a456-426614174000',
                  },
                  name: { type: 'string', example: '用户查看' },
                  code: { type: 'string', example: 'user:view' },
                  module: { type: 'string', example: 'user' },
                  action: { type: 'string', example: 'read' },
                },
              },
            },
            userCount: { type: 'number', example: 2 },
            permissionCount: { type: 'number', example: 20 },
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
  @ApiResponse({ status: 404, description: '角色不存在' })
  async findOne(@Param() params: IdParamDto) {
    const role = await this.rolesService.findOne(params.id);
    return ResponseUtil.success(role, '获取角色详情成功');
  }

  /**
   * 创建角色
   */
  @Post()
  @Permissions('role:create')
  @ApiOperation({
    summary: '创建角色',
    description: '创建新的系统角色，需要指定角色名称和代码',
  })
  @ApiResponse({
    status: 201,
    description: '角色创建成功',
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
            name: { type: 'string', example: '部门经理' },
            code: { type: 'string', example: 'manager' },
            description: {
              type: 'string',
              example: '部门经理角色，管理本部门用户',
            },
            status: { type: 'number', example: 1 },
            isSystem: { type: 'boolean', example: false },
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
  @ApiResponse({ status: 409, description: '角色代码已存在' })
  async create(@Body() createRoleDto: CreateRoleDto) {
    const role = await this.rolesService.create(createRoleDto);
    return ResponseUtil.success(role, '创建角色成功', 201);
  }

  /**
   * 更新角色信息
   */
  @Put(':id')
  @Permissions('role:update')
  @ApiOperation({
    summary: '更新角色信息',
    description: '更新指定角色的基本信息，系统角色不允许修改代码',
  })
  @ApiParam({
    name: 'id',
    description: '角色ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: '角色信息更新成功',
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
            name: { type: 'string', example: '部门经理' },
            code: { type: 'string', example: 'manager' },
            description: {
              type: 'string',
              example: '部门经理角色，管理本部门用户',
            },
            status: { type: 'number', example: 1 },
            isSystem: { type: 'boolean', example: false },
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
  @ApiResponse({ status: 404, description: '角色不存在' })
  @ApiResponse({ status: 409, description: '系统角色不允许修改' })
  async update(
    @Param() params: IdParamDto,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    const role = await this.rolesService.update(params.id, updateRoleDto);
    return ResponseUtil.success(role, '更新角色成功');
  }

  /**
   * 删除角色
   */
  @Delete(':id')
  @Permissions('role:delete')
  @ApiOperation({
    summary: '删除角色',
    description: '删除指定的角色，系统角色和已分配给用户的角色不允许删除',
  })
  @ApiParam({
    name: 'id',
    description: '角色ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: '角色删除成功',
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
  @ApiResponse({ status: 404, description: '角色不存在' })
  @ApiResponse({
    status: 409,
    description: '系统角色不允许删除或角色正在使用中',
  })
  async remove(@Param() params: IdParamDto) {
    await this.rolesService.remove(params.id);
    return ResponseUtil.success(null, '删除角色成功');
  }

  /**
   * 为用户分配角色
   */
  @Post('assign-to-user')
  @Permissions('user:manage')
  @ApiOperation({
    summary: '为用户分配角色',
    description: '为指定用户分配一组角色，会覆盖该用户原有的角色配置',
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
  @ApiResponse({ status: 404, description: '用户或角色不存在' })
  async assignToUser(@Body() userRoleDto: UserRoleDto) {
    const result = await this.rolesService.assignUserRoles(userRoleDto);
    return ResponseUtil.success(result, '角色分配成功');
  }

  /**
   * 获取用户的角色列表
   */
  @Get('user/:userId')
  @Permissions('user:view')
  @ApiOperation({
    summary: '获取用户的角色列表',
    description: '获取指定用户拥有的所有角色信息',
  })
  @ApiParam({
    name: 'userId',
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
  async getUserRoles(@Param('userId') userId: string) {
    const userRoles = await this.rolesService.getUserRoles(userId);
    return ResponseUtil.success(userRoles, '获取用户角色成功');
  }

  /**
   * 获取角色的用户列表
   */
  @Get(':id/users')
  @Permissions('role:view')
  @ApiOperation({
    summary: '获取角色的用户列表',
    description: '获取拥有指定角色的所有用户信息',
  })
  @ApiParam({
    name: 'id',
    description: '角色ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '每页数量',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: '成功获取角色用户列表',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: '操作成功' },
        data: {
          type: 'object',
          properties: {
            roleId: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            roleName: { type: 'string', example: '系统管理员' },
            users: {
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
                  assignedAt: {
                    type: 'string',
                    example: '2024-01-01T00:00:00.000Z',
                  },
                },
              },
            },
            userCount: { type: 'number', example: 2 },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number', example: 1 },
            pageSize: { type: 'number', example: 10 },
            total: { type: 'number', example: 2 },
            totalPages: { type: 'number', example: 1 },
            hasNext: { type: 'boolean', example: false },
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
  @ApiResponse({ status: 404, description: '角色不存在' })
  async getRoleUsers(
    @Param() params: IdParamDto,
    @Query() query: BaseQueryDto,
  ) {
    const result = await this.rolesService.getRoleUsers(params.id, query);
    return ResponseUtil.paginated(
      result.users,
      result.pagination.total,
      result.pagination.page,
      result.pagination.pageSize,
      '获取角色用户列表成功',
    );
  }

  /**
   * 为角色分配权限
   */
  @Post(':id/permissions')
  @Permissions('role:manage')
  @ApiOperation({
    summary: '为角色分配权限',
    description: '为指定角色分配一组权限，会覆盖该角色原有的权限配置',
  })
  @ApiParam({
    name: 'id',
    description: '角色ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: '权限分配成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: '权限分配成功' },
        data: {
          type: 'object',
          properties: {
            roleId: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            assignedPermissions: { type: 'number', example: 5 },
            totalPermissions: { type: 'number', example: 5 },
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
  @ApiResponse({ status: 404, description: '角色或权限不存在' })
  async assignRolePermissions(
    @Param() params: IdParamDto,
    @Body() body: { permissionIds: string[] },
  ) {
    const result = await this.rolesService.assignRolePermissions(
      params.id,
      body.permissionIds,
    );
    return ResponseUtil.success(result, '权限分配成功');
  }

  /**
   * 获取角色权限列表
   */
  @Get(':id/permissions')
  @Permissions('role:view')
  @ApiOperation({
    summary: '获取角色权限列表',
    description: '获取指定角色当前拥有的所有权限',
  })
  @ApiParam({
    name: 'id',
    description: '角色ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: '获取成功' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '1' },
              name: { type: 'string', example: '查看用户' },
              code: { type: 'string', example: 'user:view' },
              type: { type: 'string', example: 'API' },
              description: { type: 'string', example: '查看用户列表和详情' },
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
  @ApiResponse({ status: 404, description: '角色不存在' })
  async getRolePermissions(@Param() params: IdParamDto) {
    const permissions = await this.rolesService.getRolePermissions(params.id);
    return ResponseUtil.success(permissions, '获取成功');
  }

  /**
   * 获取角色可分配的权限
   */
  @Get(':id/assignable-permissions')
  @Permissions('role:view')
  @ApiOperation({
    summary: '获取角色可分配的权限',
    description: '获取指定角色可分配的权限（子角色只能分配父角色已有的权限）',
  })
  @ApiParam({
    name: 'id',
    description: '角色ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 200 },
        message: { type: 'string', example: '获取成功' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '1' },
              name: { type: 'string', example: '查看用户' },
              code: { type: 'string', example: 'user:view' },
              type: { type: 'string', example: 'API' },
              description: { type: 'string', example: '查看用户列表和详情' },
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
  @ApiResponse({ status: 404, description: '角色不存在' })
  async getRoleAssignablePermissions(@Param() params: IdParamDto) {
    const permissions = await this.rolesService.getRoleAssignablePermissions(
      params.id,
    );
    return ResponseUtil.success(permissions, '获取成功');
  }
}
