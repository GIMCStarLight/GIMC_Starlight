import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuthorFilterService } from './author-filter.service';

/**
 * 物化视图定时刷新服务
 * 每小时自动刷新 mv_authors_combined 物化视图
 */
@Injectable()
export class MaterializedViewRefreshService {
  private readonly logger = new Logger(MaterializedViewRefreshService.name);

  constructor(private readonly filterService: AuthorFilterService) {}

  /**
   * 每小时刷新物化视图
   * Cron表达式: 0 * * * * (每小时的第0分钟执行)
   */
  @Cron(CronExpression.EVERY_HOUR, {
    name: 'refresh-materialized-view',
    timeZone: 'Asia/Shanghai',
  })
  async handleMaterializedViewRefresh() {
    const startTime = Date.now();
    this.logger.log('🔄 开始定时刷新物化视图 mv_authors_combined');

    try {
      await this.filterService.refreshMaterializedView();
      
      const duration = Date.now() - startTime;
      this.logger.log(`✅ 物化视图刷新成功，耗时: ${duration}ms`);
    } catch (error) {
      this.logger.error(
        `❌ 物化视图刷新失败: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * 手动触发刷新（可选）
   */
  async triggerRefresh(): Promise<void> {
    this.logger.log('🔧 手动触发物化视图刷新');
    await this.handleMaterializedViewRefresh();
  }
}
