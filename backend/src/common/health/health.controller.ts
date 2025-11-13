import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('系统管理')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: '系统健康检查',
    description: '检查系统整体健康状态，包括数据库和Redis连接',
  })
  @ApiResponse({
    status: 200,
    description: '健康检查结果',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        uptime: { type: 'number', example: 12345 },
        database: { type: 'string', example: 'connected' },
        redis: { type: 'string', example: 'connected' },
      },
    },
  })
  async check() {
    return this.healthService.check();
  }

  @Get('database')
  @ApiOperation({
    summary: '数据库健康检查',
    description: '检查MySQL和PostgreSQL数据库连接状态',
  })
  @ApiResponse({
    status: 200,
    description: '数据库连接状态',
    schema: {
      type: 'object',
      properties: {
        mysql: { type: 'string', example: 'connected' },
        postgres: { type: 'string', example: 'connected' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
      },
    },
  })
  async databaseCheck() {
    return this.healthService.databaseCheck();
  }

  @Get('redis')
  @ApiOperation({
    summary: 'Redis健康检查',
    description: '检查Redis缓存服务连接状态',
  })
  @ApiResponse({
    status: 200,
    description: 'Redis连接状态',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'connected' },
        ping: { type: 'string', example: 'PONG' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
      },
    },
  })
  async redisCheck() {
    return this.healthService.redisCheck();
  }
}
