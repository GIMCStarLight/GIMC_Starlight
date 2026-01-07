import { Controller, Get, UseGuards, Request, Logger } from '@nestjs/common';
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
  async getAllMenus(@Request() req: any) {
    // 获取用户权限码
    const userPermissions: string[] = req.user?.permissions || [];
    Logger.debug(`用户权限: ${userPermissions.join(', ')}`, 'MenuController');
    
    // 获取所有菜单
    const allMenus = await this.menuService.getAllMenus();
    
    // 根据权限过滤菜单
    const filteredMenus = this.filterMenusByPermissions(allMenus, userPermissions);
    
    return ResponseUtil.success(filteredMenus, '获取菜单列表成功');
  }
  
  /**
   * 根据用户权限过滤菜单
   */
  private filterMenusByPermissions(menus: any[], userPermissions: string[]): any[] {
    // 检查是否是超级管理员（有通配符权限）
    const isSuperAdmin = userPermissions.includes('*') || userPermissions.includes('*:*');
    
    if (isSuperAdmin) {
      Logger.debug('超级管理员，返回所有菜单', 'MenuController');
      return menus;
    }
    
    return menus.filter(menu => {
      // 检查菜单是否有权限要求
      const requiredPermissions = menu.meta?.permissions || [];
      
      // 如果没有权限要求，默认显示
      if (requiredPermissions.length === 0) {
        // 如果有子菜单，递归过滤
        if (menu.children && menu.children.length > 0) {
          menu.children = this.filterMenusByPermissions(menu.children, userPermissions);
          // 如果过滤后没有子菜单，隐藏父菜单
          return menu.children.length > 0;
        }
        return true;
      }
      
      // 检查用户是否有任一所需权限（OR逻辑）
      const hasPermission = requiredPermissions.some((perm: string) => userPermissions.includes(perm));
      
      if (hasPermission) {
        // 如果有子菜单，递归过滤
        if (menu.children && menu.children.length > 0) {
          menu.children = this.filterMenusByPermissions(menu.children, userPermissions);
          // 如果子菜单全被过滤，隐藏父菜单
          if (menu.children.length === 0) {
            return false;
          }
        }
        return true;
      }
      
      return false;
    });
  }
}
