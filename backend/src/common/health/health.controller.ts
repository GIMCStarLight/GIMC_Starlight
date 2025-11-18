import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('系统管理')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: '系统基础健康检查',
    description: '返回系统基础状态和运行时间',
  })
  @ApiResponse({
    status: 200,
    description: '系统基础状态',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        uptime: { type: 'number', example: 12345, description: '运行时间(毫秒)' },
        environment: { type: 'string', example: 'production', description: '运行环境' },
      },
    },
  })
  async check() {
    return this.healthService.check();
  }

  @Get('all')
  @ApiOperation({
    summary: '综合健康检查',
    description: '检查所有子系统健康状态，包括数据库和Redis，返回聚合结果',
  })
  @ApiResponse({
    status: 200,
    description: '综合健康检查结果',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['ok', 'degraded', 'error'],
          description: '整体健康状态',
        },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        uptime: { type: 'number', example: 12345 },
        environment: { type: 'string', example: 'production' },
        checks: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              description: '数据库检查结果',
            },
            redis: {
              type: 'object',
              description: 'Redis检查结果',
            },
          },
        },
        errors: {
          type: 'array',
          items: { type: 'string' },
          description: '错误信息列表',
        },
      },
    },
  })
  async healthCheck() {
    return this.healthService.healthCheck();
  }

  @Get('database')
  @ApiOperation({
    summary: '数据库健康检查',
    description: '检查所有数据库连接状态：MySQL、PostgreSQL、Crawler数据库',
  })
  @ApiResponse({
    status: 200,
    description: '数据库连接状态',
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['ok', 'degraded'],
          description: '数据库整体状态',
        },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        responseTime: { type: 'number', example: 50, description: '检查总耗时(毫秒)' },
        databases: {
          type: 'object',
          properties: {
            mysql: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'connected' },
                responseTime: { type: 'number', example: 15 },
                pool: {
                  type: 'object',
                  properties: {
                    size: { type: 'number', example: 50 },
                    used: { type: 'number', example: 5 },
                    available: { type: 'number', example: 45 },
                  },
                },
              },
            },
            postgres: { type: 'object', description: 'PostgreSQL状态' },
            crawler: { type: 'object', description: 'Crawler数据库状态' },
          },
        },
        errors: {
          type: 'array',
          items: { type: 'string' },
          description: '错误信息列表',
        },
      },
    },
  })
  async databaseCheck() {
    return this.healthService.databaseCheck();
  }

  @Get('redis')
  @ApiOperation({
    summary: 'Redis健康检查',
    description: '检查Redis缓存服务连接状态和性能指标',
  })
  @ApiResponse({
    status: 200,
    description: 'Redis连接状态和指标',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ok', 'error'] },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        responseTime: { type: 'number', example: 5, description: '响应时间(毫秒)' },
        redis: { type: 'string', example: 'connected' },
        ping: { type: 'string', example: 'PONG' },
        metrics: {
          type: 'object',
          properties: {
            usedMemory: { type: 'string', example: '2.5M', description: '已使用内存' },
            dbSize: { type: 'number', example: 1234, description: '数据库键数量' },
          },
        },
        error: { type: 'string', description: '错误信息(如果有)' },
      },
    },
  })
  async redisCheck() {
    return this.healthService.redisCheck();
  }
}
