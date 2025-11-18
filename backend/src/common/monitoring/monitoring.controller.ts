import { Controller, Get, Delete, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { PermissionGuard } from '../../auth/guards/permission.guard';
import { PerformanceMetricsService } from './performance-metrics.service';
import { ResponseUtil } from '../utils/response.util';

/**
 * 性能监控控制器
 * 提供性能指标查询和管理接口
 */
@ApiTags('系统监控')
@Controller('api/monitoring')
@UseGuards(AuthGuard('jwt'), PermissionGuard)
@ApiBearerAuth('JWT-auth')
export class MonitoringController {
  constructor(
    private readonly performanceMetricsService: PerformanceMetricsService,
  ) {}

  /**
   * 获取API性能统计
   */
  @Get('api-stats')
  @Permissions('admin:access')
  @ApiOperation({ summary: '获取API性能统计' })
  async getApiStats(
    @Query('endpoint') endpoint?: string,
    @Query('method') method?: string,
  ) {
    const stats = await this.performanceMetricsService.getApiStats(
      endpoint,
      method,
    );
    return ResponseUtil.success(stats, '获取成功');
  }

  /**
   * 获取缓存命中率统计
   */
  @Get('cache-stats')
  @Permissions('admin:access')
  @ApiOperation({ summary: '获取缓存命中率统计' })
  async getCacheStats() {
    const stats = await this.performanceMetricsService.getCacheStats();
    return ResponseUtil.success(stats, '获取成功');
  }

  /**
   * 获取数据库查询性能统计
   */
  @Get('database-stats')
  @Permissions('admin:access')
  @ApiOperation({ summary: '获取数据库查询性能统计' })
  async getDatabaseStats() {
    const stats = await this.performanceMetricsService.getDatabaseStats();
    return ResponseUtil.success(stats, '获取成功');
  }

  /**
   * 获取性能监控仪表板数据
   */
  @Get('dashboard')
  @Permissions('admin:access')
  @ApiOperation({ summary: '获取性能监控仪表板数据' })
  async getDashboard() {
    const [apiStats, cacheStats, databaseStats] = await Promise.all([
      this.performanceMetricsService.getApiStats(),
      this.performanceMetricsService.getCacheStats(),
      this.performanceMetricsService.getDatabaseStats(),
    ]);

    // 计算Top 10 最慢的API
    const slowestApis = apiStats
      .sort((a: any, b: any) => b.avgResponseTime - a.avgResponseTime)
      .slice(0, 10);

    // 计算Top 10 访问量最大的API
    const mostCalledApis = apiStats
      .sort((a: any, b: any) => b.total - a.total)
      .slice(0, 10);

    return ResponseUtil.success(
      {
        apiStats: {
          total: apiStats.length,
          slowest: slowestApis,
          mostCalled: mostCalledApis,
        },
        cacheStats,
        databaseStats: {
          total: databaseStats.length,
          slowest: databaseStats.slice(0, 10),
        },
        summary: {
          totalApiCalls: apiStats.reduce((sum: number, stat: any) => sum + stat.total, 0),
          avgResponseTime:
            apiStats.length > 0
              ? apiStats.reduce(
                  (sum: number, stat: any) => sum + stat.avgResponseTime,
                  0,
                ) / apiStats.length
              : 0,
          cacheHitRate: cacheStats.hitRate,
          totalDbQueries: databaseStats.reduce(
            (sum: number, stat: any) => sum + stat.count,
            0,
          ),
        },
      },
      '获取成功',
    );
  }

  /**
   * 清除性能指标数据
   */
  @Delete('metrics')
  @Permissions('admin:access')
  @ApiOperation({ summary: '清除性能指标数据' })
  async clearMetrics() {
    await this.performanceMetricsService.clearMetrics();
    return ResponseUtil.success(null, '清除成功');
  }
}
