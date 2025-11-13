import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from '../common/guards/auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { MenuService } from './menu.service';
import { ResponseUtil } from '../common/utils/response.util';

@ApiTags('菜单管理')
@Controller('menu')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
@ApiBearerAuth()
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  /**
   * 获取所有菜单
   */
  @Get('all')
  @Permissions('menu:read')
  @ApiOperation({
    summary: '获取所有菜单',
    description: '获取用户可访问的所有菜单列表，用于构建导航菜单',
  })
  @ApiResponse({
    status: 200,
    description: '成功获取菜单列表',
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
              id: { type: 'string', example: '1' },
              name: { type: 'string', example: '系统管理' },
              path: { type: 'string', example: '/system' },
              component: { type: 'string', example: 'Layout' },
              icon: { type: 'string', example: 'system' },
              sort: { type: 'number', example: 1 },
              parentId: { type: 'string', example: null },
              children: {
                type: 'array',
                items: { $ref: '#/components/schemas/MenuItem' },
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
  async getAllMenus() {
    const result = await this.menuService.getAllMenus();
    return ResponseUtil.success(result, '获取菜单列表成功');
  }
}
