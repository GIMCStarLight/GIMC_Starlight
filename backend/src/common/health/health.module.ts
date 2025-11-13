import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

/**
 * 健康检查模块
 * 提供系统健康状态检查功能
 */
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([]), // 如果需要特定实体，在这里添加
    RedisModule,
  ],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
