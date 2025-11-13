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
  HttpException,
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
import { PermissionsService } from './permissions.service';
import type {
  CreatePermissionDto,
  UpdatePermissionDto,
  RolePermissionDto,
} from './permissions.service';
import { ResponseUtil } from '../common/utils/response.util';
import { AuthService } from '../auth/services/auth.service';

// DTO定义已移至 permissions.service.ts
// CreatePermissionDto, UpdatePermissionDto, RolePermissionDto 等接口在服务层定义

/**
 * 权限管理控制器
 * 提供权限的增删改查和角色权限关联功能
 */
@ApiTags('权限管理')
@Controller('permissions')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@ApiBearerAuth('JWT-auth')
export class PermissionsController {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly authService: AuthService,
  ) {}
  /**
   * 获取权限列表
   */
  @Get()
  @Permissions('permission:view')
  @ApiOperation({
    summary: '获取权限列表',
    description: '分页获取系统中的权限列表，支持按模块、动作等条件过滤',
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
    example: '用户管理',
  })
  @ApiQuery({
    name: 'module',
    required: false,
    description: '模块名称',
    example: 'user',
  })
  @ApiQuery({
    name: 'action',
    required: false,
    description: '操作类型',
    example: 'read',
  })
  @ApiResponse({
    status: 200,
    description: '成功获取权限列表',
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
              name: { type: 'string', example: '用户查看' },
              code: { type: 'string', example: 'user:view' },
              description: { type: 'string', example: '查看用户信息的权限' },
              module: { type: 'string', example: 'user' },
              action: { type: 'string', example: 'read' },
              resource: { type: 'string', example: 'user' },
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
            total: { type: 'number', example: 50 },
            totalPages: { type: 'number', example: 5 },
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
  async findAll(@Query() query: BaseQueryDto) {
    const result = await this.permissionsService.findAll(query);
    return ResponseUtil.paginated(
      result.data,
      query.page || 1,
      query.limit || 10,
      result.pagination.total,
    );
  }

  /**
   * 获取权限树结构
   */
  @Get('tree')
  @Permissions('permission:view')
  @ApiOperation({
    summary: '获取权限树结构',
    description: '获取按模块分组的权限树形结构，便于权限管理界面展示',
  })
  @ApiResponse({
    status: 200,
    description: '成功获取权限树结构',
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
              module: { type: 'string', example: 'user' },
              moduleName: { type: 'string', example: '用户管理' },
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
                    action: { type: 'string', example: 'read' },
                    status: { type: 'number', example: 1 },
                  },
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
  @ApiResponse({ status: 401, description: '未授权访问' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getPermissionTree() {
    const result = await this.permissionsService.getPermissionTree();
    return ResponseUtil.success(result);
  }

  /**
   * 获取权限树结构（用于选择器）
   */
  @Get('tree-select')
  @Permissions('permission:view')
  @ApiOperation({
    summary: '获取权限树结构（选择器）',
    description: '获取适合树形选择器使用的权限树结构，支持父子级关系',
  })
  @ApiResponse({
    status: 200,
    description: '成功获取权限树结构',
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
              name: { type: 'string', example: '用户管理' },
              code: { type: 'string', example: 'user:manage' },
              type: { type: 'string', example: 'MENU' },
              children: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'string',
                      example: '123e4567-e89b-12d3-a456-426614174001',
                    },
                    name: { type: 'string', example: '用户查看' },
                    code: { type: 'string', example: 'user:view' },
                    type: { type: 'string', example: 'API' },
                  },
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
  @ApiResponse({ status: 401, description: '未授权访问' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getPermissionTreeForSelect() {
    const result = await this.permissionsService.getPermissionTreeForSelect();
    return ResponseUtil.success(result);
  }

  /**
   * 获取权限树形列表（用于树形表格）
   */
  @Get('tree-list')
  @Permissions('permission:view')
  @ApiOperation({
    summary: '获取权限树形列表',
    description: '获取适合树形表格使用的权限树形结构，支持搜索和过滤',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: '搜索关键词',
    example: '用户管理',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: '权限类型',
    example: 'MENU',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: '状态',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: '成功获取权限树形列表',
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
              name: { type: 'string', example: '用户管理' },
              code: { type: 'string', example: 'user:manage' },
              type: { type: 'string', example: 'MENU' },
              resource: { type: 'string', example: 'user' },
              action: { type: 'string', example: 'manage' },
              description: { type: 'string', example: '用户管理模块权限' },
              parentId: { type: 'string', example: null },
              sort: { type: 'number', example: 0 },
              status: { type: 'number', example: 1 },
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
                    name: { type: 'string', example: '用户查看' },
                    code: { type: 'string', example: 'user:view' },
                    type: { type: 'string', example: 'API' },
                    resource: { type: 'string', example: 'user' },
                    action: { type: 'string', example: 'view' },
                    description: { type: 'string', example: '查看用户信息' },
                    parentId: {
                      type: 'string',
                      example: '123e4567-e89b-12d3-a456-426614174000',
                    },
                    sort: { type: 'number', example: 1 },
                    status: { type: 'number', example: 1 },
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
        total: { type: 'number', example: 25 },
        traceId: { type: 'string', example: 'trace-123456' },
        timestamp: { type: 'number', example: 1640995200000 },
      },
    },
  })
  @ApiResponse({ status: 401, description: '未授权访问' })
  @ApiResponse({ status: 403, description: '权限不足' })
  async getPermissionTreeList(@Query() query: BaseQueryDto) {
    const result = await this.permissionsService.getPermissionTreeList(query);
    return ResponseUtil.success(result);
  }

  /**
   * 获取权限详情
   */
  @Get(':id')
  @Permissions('permission:view')
  @ApiOperation({
    summary: '获取权限详情',
    description: '根据权限ID获取权限的详细信息',
  })
  @ApiParam({
    name: 'id',
    description: '权限ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: '成功获取权限详情',
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
            name: { type: 'string', example: '用户查看' },
            code: { type: 'string', example: 'user:view' },
            description: { type: 'string', example: '查看用户信息的权限' },
            module: { type: 'string', example: 'user' },
            action: { type: 'string', example: 'read' },
            resource: { type: 'string', example: 'user' },
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
  @ApiResponse({ status: 404, description: '权限不存在' })
  async findOne(@Param() params: IdParamDto) {
    const result = await this.permissionsService.findOne(params.id);
    return ResponseUtil.success(result);
  }

  /**
   * 创建权限
   */
  @Post()
  @Permissions('permission:create')
  @ApiOperation({
    summary: '创建权限',
    description: '创建新的系统权限，需要指定权限代码、名称和所属模块',
  })
  @ApiResponse({
    status: 201,
    description: '权限创建成功',
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
            name: { type: 'string', example: '用户查看' },
            code: { type: 'string', example: 'user:view' },
            description: { type: 'string', example: '查看用户信息的权限' },
            module: { type: 'string', example: 'user' },
            action: { type: 'string', example: 'read' },
            resource: { type: 'string', example: 'user' },
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
  @ApiResponse({ status: 409, description: '权限代码已存在' })
  async create(@Body() createPermissionDto: CreatePermissionDto) {
    const result = await this.permissionsService.create(createPermissionDto);
    return ResponseUtil.success(result, '创建成功', 201);
  }

  /**
   * 更新权限信息
   */
  @Put(':id')
  @Permissions('permission:update')
  @ApiOperation({
    summary: '更新权限信息',
    description: '更新指定权限的基本信息，不包括权限代码',
  })
  @ApiParam({
    name: 'id',
    description: '权限ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: '权限信息更新成功',
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
            name: { type: 'string', example: '用户查看' },
            code: { type: 'string', example: 'user:view' },
            description: { type: 'string', example: '查看用户信息的权限' },
            module: { type: 'string', example: 'user' },
            action: { type: 'string', example: 'read' },
            resource: { type: 'string', example: 'user' },
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
  @ApiResponse({ status: 404, description: '权限不存在' })
  async update(
    @Param() params: IdParamDto,
    @Body() updatePermissionDto: UpdatePermissionDto,
  ) {
    const result = await this.permissionsService.update(
      params.id,
      updatePermissionDto,
    );
    return ResponseUtil.success(result, '更新成功');
  }

  /**
   * 删除权限
   */
  @Delete(':id')
  @Permissions('permission:delete')
  @ApiOperation({
    summary: '删除权限',
    description: '删除指定的权限，注意：删除权限会影响相关角色的权限配置',
  })
  @ApiParam({
    name: 'id',
    description: '权限ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: '权限删除成功',
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
  @ApiResponse({ status: 404, description: '权限不存在' })
  @ApiResponse({ status: 409, description: '权限正在使用中，无法删除' })
  async remove(@Param() params: IdParamDto) {
    await this.permissionsService.remove(params.id);
    return ResponseUtil.success(null, '删除成功');
  }

  /**
   * 为角色分配权限
   */
  @Post('assign-to-role')
  @Permissions('role:manage')
  @ApiOperation({
    summary: '为角色分配权限',
    description:
      '为指定角色分配一组权限，会覆盖该角色原有的权限配置，并强制相关用户重新登录',
  })
  @ApiResponse({
    status: 460,
    description: '权限分配成功，需要重新登录',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'number', example: 460 },
        message: {
          type: 'string',
          example: '权限已更新，请重新登录以获取最新权限',
        },
        data: {
          type: 'object',
          properties: {
            roleId: {
              type: 'string',
              example: '123e4567-e89b-12d3-a456-426614174000',
            },
            assignedPermissions: { type: 'number', example: 5 },
            totalPermissions: { type: 'number', example: 5 },
            affectedUsers: { type: 'number', example: 3 },
            loggedOutSessions: { type: 'number', example: 5 },
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
  async assignToRole(@Body() rolePermissionDto: RolePermissionDto) {
    // 分配权限
    const result =
      await this.permissionsService.assignToRole(rolePermissionDto);

    // 强制拥有该角色的用户重新登录
    const logoutResult = await this.authService.forceLogoutByRoles([
      rolePermissionDto.roleId,
    ]);

    // 使用HttpException返回460状态码，触发前端自动登出
    const response = ResponseUtil.success(
      {
        ...result,
        affectedUsers: logoutResult.affectedUsers,
        affectedSessions: logoutResult.affectedSessions,
      },
      '权限已更新，请重新登录以获取最新权限',
      460,
    );

    throw new HttpException(response, 460);
  }

  /**
   * 获取角色的权限列表
   */
  @Get('role/:roleId')
  @Permissions('role:view')
  @ApiOperation({
    summary: '获取角色的权限列表',
    description: '获取指定角色拥有的所有权限信息',
  })
  @ApiParam({
    name: 'roleId',
    description: '角色ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: '成功获取角色权限列表',
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
            roleName: { type: 'string', example: '管理员' },
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
            permissionCount: { type: 'number', example: 12 },
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
  async getRolePermissions(@Param('roleId') roleId: string) {
    const result = await this.permissionsService.getRolePermissions(roleId);
    return ResponseUtil.success(result);
  }
}
