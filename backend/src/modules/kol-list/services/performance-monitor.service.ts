import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  KolList,
  MatchStatus,
} from '../../../database/entities/kol-list.entity';
import {
  KolPrivateMatches,
  ReviewStatus,
} from '../../../database/entities/kol-private-matches.entity';
import { KolMatchLogs } from '../../../database/entities/kol-match-logs.entity';
import { IsNull } from 'typeorm';

export interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: Date;
  details?: Record<string, unknown>;
}

export interface SlowQueryAlert {
  query: string;
  duration: number;
  timestamp: Date;
  threshold: number;
}

export interface SystemStats {
  totalKols: number;
  matchedKols: number;
  pendingMatches: number;
  averageMatchTime: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

@Injectable()
export class PerformanceMonitorService {
  private readonly logger = new Logger(PerformanceMonitorService.name);
  private readonly performanceMetrics: PerformanceMetrics[] = [];
  private readonly slowQueries: SlowQueryAlert[] = [];
  private readonly SLOW_QUERY_THRESHOLD = 1000; // 1秒
  private readonly MAX_METRICS_HISTORY = 1000;

  constructor(
    @InjectRepository(KolList, 'postgres')
    private readonly kolListRepository: Repository<KolList>,
    @InjectRepository(KolPrivateMatches, 'postgres')
    private readonly kolPrivateMatchesRepository: Repository<KolPrivateMatches>,
    @InjectRepository(KolMatchLogs, 'postgres')
    private readonly kolMatchLogsRepository: Repository<KolMatchLogs>,
  ) {}

  /**
   * 记录性能指标
   */
  recordMetric(
    operation: string,
    duration: number,
    details?: Record<string, unknown>,
  ): void {
    const metric: PerformanceMetrics = {
      operation,
      duration,
      timestamp: new Date(),
      details,
    };

    this.performanceMetrics.push(metric);

    // 检查是否为慢查询
    if (duration > this.SLOW_QUERY_THRESHOLD) {
      this.recordSlowQuery(operation, duration);
    }

    // 保持历史记录在合理范围内
    if (this.performanceMetrics.length > this.MAX_METRICS_HISTORY) {
      this.performanceMetrics.shift();
    }

    // 记录警告日志
    if (duration > this.SLOW_QUERY_THRESHOLD) {
      this.logger.warn(
        `慢操作检测: ${operation} 耗时 ${duration}ms`,
        JSON.stringify(details),
      );
    }
  }

  /**
   * 监控查询性能
   */
  async monitorQuery<T>(
    operation: string,
    queryFn: () => Promise<T>,
    details?: Record<string, unknown>,
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await queryFn();
      const duration = Date.now() - startTime;
      this.recordMetric(operation, duration, details);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordMetric(`${operation}_ERROR`, duration, {
        ...details,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 获取系统统计信息
   */
  async getSystemStats(): Promise<SystemStats> {
    const stats = await Promise.all([
      this.monitorQuery('count_total_kols', () =>
        this.kolListRepository.count({
          where: { deleted_at: IsNull() },
        }),
      ),
      this.monitorQuery('count_matched_kols', () =>
        this.kolListRepository.count({
          where: {
            deleted_at: IsNull(),
            match_status: MatchStatus.MATCHED,
          },
        }),
      ),
      this.monitorQuery('count_pending_matches', () =>
        this.kolPrivateMatchesRepository.count({
          where: {
            review_status: ReviewStatus.PENDING,
          },
        }),
      ),
    ]);

    const [totalKols, matchedKols, pendingMatches] = stats;

    // 计算平均匹配时间
    const averageMatchTime = await this.calculateAverageMatchTime();

    // 评估系统健康状态
    const systemHealth = this.evaluateSystemHealth();

    return {
      totalKols,
      matchedKols,
      pendingMatches,
      averageMatchTime,
      systemHealth,
    };
  }

  /**
   * 计算平均匹配时间
   */
  private async calculateAverageMatchTime(): Promise<number> {
    try {
      const result: { avg_time?: string } | undefined =
        await this.kolMatchLogsRepository
          .createQueryBuilder('log')
          .select(
            'AVG(EXTRACT(EPOCH FROM (log.created_at - lag(log.created_at) OVER (PARTITION BY log.private_kol_id ORDER BY log.created_at))))',
            'avg_time',
          )
          .where('log.deleted_at IS NULL')
          .getRawOne();

      return result?.avg_time ? parseFloat(result.avg_time) : 0;
    } catch (error) {
      this.logger.error('计算平均匹配时间失败', error);
      return 0;
    }
  }

  /**
   * 记录慢查询
   */
  private recordSlowQuery(query: string, duration: number): void {
    const alert: SlowQueryAlert = {
      query,
      duration,
      timestamp: new Date(),
      threshold: this.SLOW_QUERY_THRESHOLD,
    };

    this.slowQueries.push(alert);

    // 保持慢查询记录在合理范围内
    if (this.slowQueries.length > 100) {
      this.slowQueries.shift();
    }
  }

  /**
   * 获取性能指标
   */
  getPerformanceMetrics(limit = 100): PerformanceMetrics[] {
    return this.performanceMetrics
      .slice(-limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * 获取慢查询记录
   */
  getSlowQueries(limit = 50): SlowQueryAlert[] {
    return this.slowQueries
      .slice(-limit)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * 获取操作统计
   */
  getOperationStats(): Record<string, { count: number; avgDuration: number }> {
    const stats: Record<string, { durations: number[]; count: number }> = {};

    this.performanceMetrics.forEach((metric) => {
      if (!stats[metric.operation]) {
        stats[metric.operation] = { durations: [], count: 0 };
      }
      stats[metric.operation].durations.push(metric.duration);
      stats[metric.operation].count++;
    });

    const result: Record<string, { count: number; avgDuration: number }> = {};
    Object.entries(stats).forEach(([operation, data]) => {
      result[operation] = {
        count: data.count,
        avgDuration:
          data.durations.reduce((a, b) => a + b, 0) / data.durations.length,
      };
    });

    return result;
  }

  /**
   * 清理旧的性能数据
   */
  cleanupOldMetrics(maxAge = 24 * 60 * 60 * 1000): void {
    const cutoffTime = new Date(Date.now() - maxAge);

    const validMetrics = this.performanceMetrics.filter(
      (metric) => metric.timestamp > cutoffTime,
    );
    const validSlowQueries = this.slowQueries.filter(
      (query) => query.timestamp > cutoffTime,
    );

    this.performanceMetrics.length = 0;
    this.performanceMetrics.push(...validMetrics);

    this.slowQueries.length = 0;
    this.slowQueries.push(...validSlowQueries);

    this.logger.log(
      `性能数据清理完成，保留 ${validMetrics.length} 条指标，${validSlowQueries.length} 条慢查询记录`,
    );
  }

  /**
   * 健康检查
   */
  async checkHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    details: Record<string, unknown>;
  }> {
    await Promise.resolve(); // 避免 async 警告

    const recentMetrics = this.performanceMetrics.filter(
      (m) => m.timestamp > new Date(Date.now() - 5 * 60 * 1000),
    );

    const recentSlowQueries = this.slowQueries.filter(
      (q) => q.timestamp > new Date(Date.now() - 5 * 60 * 1000),
    );

    const avgResponseTime =
      recentMetrics.length > 0
        ? recentMetrics.reduce((sum, m) => sum + m.duration, 0) /
          recentMetrics.length
        : 0;

    const slowQueryRate =
      recentMetrics.length > 0
        ? (recentSlowQueries.length / recentMetrics.length) * 100
        : 0;

    const errorMetrics = recentMetrics.filter((m) =>
      m.operation.includes('ERROR'),
    );
    const errorRate =
      recentMetrics.length > 0
        ? (errorMetrics.length / recentMetrics.length) * 100
        : 0;

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (avgResponseTime > 2000 || slowQueryRate > 20 || errorRate > 10) {
      status = 'critical';
    } else if (avgResponseTime > 1000 || slowQueryRate > 10 || errorRate > 5) {
      status = 'warning';
    }

    return {
      status,
      details: {
        avgResponseTime,
        slowQueryRate,
        errorRate,
        recentMetricsCount: recentMetrics.length,
        recentSlowQueriesCount: recentSlowQueries.length,
      },
    };
  }

  /**
   * 评估系统健康状态
   */
  private evaluateSystemHealth(): 'healthy' | 'warning' | 'critical' {
    const recentMetrics = this.performanceMetrics.filter(
      (m) => m.timestamp > new Date(Date.now() - 10 * 60 * 1000),
    );

    if (recentMetrics.length === 0) return 'healthy';

    const avgDuration =
      recentMetrics.reduce((sum, m) => sum + m.duration, 0) /
      recentMetrics.length;
    const slowQueryCount = recentMetrics.filter(
      (m) => m.duration > this.SLOW_QUERY_THRESHOLD,
    ).length;
    const slowQueryRate = (slowQueryCount / recentMetrics.length) * 100;

    if (avgDuration > 2000 || slowQueryRate > 20) {
      return 'critical';
    } else if (avgDuration > 1000 || slowQueryRate > 10) {
      return 'warning';
    }

    return 'healthy';
  }
}
