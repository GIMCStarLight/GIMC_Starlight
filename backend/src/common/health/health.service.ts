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

  async check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
    };
  }

  async databaseCheck() {
    const checks = await Promise.allSettled([
      this.mysqlDataSource.query('SELECT 1').then(() => ({ name: 'mysql', status: 'connected' })),
      this.postgresDataSource.query('SELECT 1').then(() => ({ name: 'postgres', status: 'connected' })),
      this.crawlerDataSource.query('SELECT 1').then(() => ({ name: 'crawler', status: 'connected' })),
    ]);

    const databases: Record<string, string> = {};
    const errors: string[] = [];

    checks.forEach((result, index) => {
      const dbNames = ['mysql', 'postgres', 'crawler'];
      const dbName = dbNames[index];

      if (result.status === 'fulfilled') {
        databases[dbName] = result.value.status;
      } else {
        databases[dbName] = 'disconnected';
        errors.push(`${dbName}: ${result.reason?.message || 'Unknown error'}`);
      }
    });

    const allConnected = checks.every((c) => c.status === 'fulfilled');

    if (!allConnected) {
      this.logger.error('数据库连接检查失败', errors);
    }

    return {
      status: allConnected ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      databases,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async redisCheck() {
    try {
      await this.redis.ping();

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        redis: 'connected',
      };
    } catch (error) {
      this.logger.error('Redis连接检查失败', error);
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }
}
