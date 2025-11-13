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
    try {
      await this.mysqlDataSource.query('SELECT 1');
      await this.postgresDataSource.query('SELECT 1');

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        databases: {
          mysql: 'connected',
          postgres: 'connected',
        },
      };
    } catch (error) {
      this.logger.error('数据库连接检查失败', error);
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
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
