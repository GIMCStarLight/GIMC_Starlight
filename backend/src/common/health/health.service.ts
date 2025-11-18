import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(
    private readonly configService: ConfigService,
    @InjectDataSource('mysql') private readonly mysqlDataSource: DataSource,
    @InjectDataSource('postgres')
    private readonly postgresDataSource: DataSource,
    @InjectDataSource('crawler')
    private readonly crawlerDataSource: DataSource,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /**
   * 系统基础健康检查
   */
  async check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      environment: this.configService.get('NODE_ENV', 'development'),
    };
  }

  /**
   * 综合健康检查 - 聚合所有子系统检查结果
   */
  async healthCheck() {
    const [dbCheck, redisCheck] = await Promise.allSettled([
      this.databaseCheck(),
      this.redisCheck(),
    ]);

    const databases = dbCheck.status === 'fulfilled' ? dbCheck.value : null;
    const redis = redisCheck.status === 'fulfilled' ? redisCheck.value : null;

    // 判断整体健康状态
    let overallStatus = 'ok';
    if (dbCheck.status === 'rejected' || redisCheck.status === 'rejected') {
      overallStatus = 'error';
    } else if (
      databases?.status === 'degraded' ||
      redis?.status === 'error'
    ) {
      overallStatus = 'degraded';
    }

    const errors: string[] = [];
    if (dbCheck.status === 'rejected') {
      errors.push(`数据库检查失败: ${dbCheck.reason?.message || 'Unknown'}`);
    }
    if (redisCheck.status === 'rejected') {
      errors.push(`Redis检查失败: ${redisCheck.reason?.message || 'Unknown'}`);
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      environment: this.configService.get('NODE_ENV', 'development'),
      checks: {
        database: databases || { status: 'error', databases: {} },
        redis: redis || { status: 'error' },
      },
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * 数据库健康检查 - 检查所有数据库连接状态
   * 包含: MySQL主库、PostgreSQL、Crawler数据库
   */
  async databaseCheck() {
    const startTime = Date.now();

    const checks = await Promise.allSettled([
      this.checkDatabaseConnection('mysql', this.mysqlDataSource),
      this.checkDatabaseConnection('postgres', this.postgresDataSource),
      this.checkDatabaseConnection('crawler', this.crawlerDataSource),
    ]);

    const databases: Record<string, any> = {};
    const errors: string[] = [];

    checks.forEach((result, index) => {
      const dbNames = ['mysql', 'postgres', 'crawler'];
      const dbName = dbNames[index];

      if (result.status === 'fulfilled') {
        databases[dbName] = result.value;
      } else {
        databases[dbName] = {
          status: 'disconnected',
          error: result.reason?.message || 'Unknown error',
        };
        errors.push(`${dbName}: ${result.reason?.message || 'Unknown error'}`);
      }
    });

    const allConnected = checks.every((c) => c.status === 'fulfilled');
    const responseTime = Date.now() - startTime;

    if (!allConnected) {
      this.logger.error('数据库连接检查失败', errors);
    }

    return {
      status: allConnected ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      responseTime,
      databases,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * 单个数据库连接检查
   */
  private async checkDatabaseConnection(
    name: string,
    dataSource: DataSource,
  ): Promise<any> {
    const startTime = Date.now();

    try {
      await dataSource.query('SELECT 1');
      const responseTime = Date.now() - startTime;

      // 获取连接池信息
      const driver = dataSource.driver as any;
      const poolSize = driver.master?.pool?.size || 0;
      const poolUsed = driver.master?.pool?.used || 0;

      return {
        status: 'connected',
        responseTime,
        pool: {
          size: poolSize,
          used: poolUsed,
          available: poolSize - poolUsed,
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      throw new Error(
        `${name} connection failed (${responseTime}ms): ${error.message}`,
      );
    }
  }

  /**
   * Redis健康检查 - 检查Redis缓存服务状态
   */
  async redisCheck() {
    const startTime = Date.now();

    try {
      const pingResult = await this.redis.ping();
      const responseTime = Date.now() - startTime;

      // 获取Redis信息
      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory_human:(.*?)\r/);
      const usedMemory = memoryMatch ? memoryMatch[1] : 'N/A';

      const dbSize = await this.redis.dbsize();

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        responseTime,
        redis: 'connected',
        ping: pingResult,
        metrics: {
          usedMemory,
          dbSize,
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error('Redis连接检查失败', error);
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        responseTime,
        redis: 'disconnected',
        error: error.message,
      };
    }
  }
}
