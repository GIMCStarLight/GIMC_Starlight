import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SqlbotService } from './sqlbot.service';
import {
  CreateSqlbotConfigDto,
  UpdateSqlbotConfigDto,
  SqlbotConfigResponseDto,
} from './dto/sqlbot-config.dto';
import { JwtAuthGuard, RolesGuard } from '../../common/guards/auth.guard';
import { Roles } from '../../common/decorators/auth.decorator';
import { ApiEndpoint } from '../../common/decorators/api.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { PermissionGuard } from '../../auth/guards/permission.guard';

@ApiTags('SQLBot管理')
@Controller('sqlbot')
@ApiBearerAuth('JWT-auth')
export class SqlbotController {
  constructor(private readonly sqlbotService: SqlbotService) {}

  @Post('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'SUPER_ADMIN')
  @ApiEndpoint({
    summary: '创建SQLBot配置',
    description: '创建新的SQLBot嵌入配置',
    successType: SqlbotConfigResponseDto,
  })
  async createConfig(
    @Body() createDto: CreateSqlbotConfigDto,
  ): Promise<SqlbotConfigResponseDto> {
    return this.sqlbotService.createConfig(createDto);
  }

  @Get('config')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('sqlbot:config:view')
  @ApiEndpoint({
    summary: '获取SQLBot配置',
    description: '获取当前启用的SQLBot配置',
    successType: SqlbotConfigResponseDto,
  })
  async getConfig(): Promise<SqlbotConfigResponseDto | null> {
    return this.sqlbotService.getConfig();
  }

  @Put('config/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'SUPER_ADMIN')
  @ApiEndpoint({
    summary: '更新SQLBot配置',
    description: '更新指定的SQLBot配置',
    successType: SqlbotConfigResponseDto,
  })
  async updateConfig(
    @Param('id') id: string,
    @Body() updateDto: UpdateSqlbotConfigDto,
  ): Promise<SqlbotConfigResponseDto> {
    return this.sqlbotService.updateConfig(id, updateDto);
  }

  @Delete('config/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'SUPER_ADMIN')
  @ApiEndpoint({
    summary: '删除SQLBot配置',
    description: '删除指定的SQLBot配置',
  })
  async deleteConfig(@Param('id') id: string): Promise<void> {
    return this.sqlbotService.deleteConfig(id);
  }

  @Get('datasource')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'SUPER_ADMIN')
  @ApiOperation({
    summary: '获取数据源信息',
    description: '为SQLBot高级应用提供数据源信息',
  })
  @ApiResponse({
    status: 200,
    description: '数据源信息获取成功',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        code: { type: 'number', example: 0 },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', example: 'gimcstar-influencer-db' },
              type: { type: 'string', example: 'pg' },
              host: { type: 'string', example: 'localhost' },
              port: { type: 'number', example: 5432 },
              dataBase: { type: 'string', example: 'gimcstar' },
              user: { type: 'string', example: 'postgres' },
              password: { type: 'string', example: 'encrypted_password' },
              schema: { type: 'string', example: 'public' },
              comment: {
                type: 'string',
                example: 'GIMCStarLightSystem达人数据库',
              },
              tables: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', example: 'influencer_current' },
                    comment: { type: 'string', example: '当前达人数据表' },
                    fields: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string', example: 'id' },
                          type: { type: 'string', example: 'uuid' },
                          comment: { type: 'string', example: '主键ID' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  getDatasources(): any {
    const datasources = this.sqlbotService.getDatasources();
    return {
      success: true,
      code: 0,
      data: datasources,
    };
  }

  @Get('token')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @Permissions('sqlbot:token:generate')
  @ApiOperation({
    summary: '获取SQLBot嵌入Token',
    description: '根据已启用的SQLBot配置生成JWT，用于页面嵌入认证',
  })
  async getEmbeddedToken(
    @Query('account') account?: string,
  ): Promise<{ token: string; appId: string; expiresIn: number }> {
    return this.sqlbotService.generateEmbeddedToken(account || 'admin');
  }
}
