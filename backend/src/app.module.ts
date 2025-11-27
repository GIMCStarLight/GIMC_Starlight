import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, InjectDataSource } from '@nestjs/typeorm';
import { RedisModule } from '@nestjs-modules/ioredis';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { WinstonModule } from 'nest-winston';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { JwtModule } from '@nestjs/jwt';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';

// 配置文件
import { getAppConfig } from './config/app.config';
import {
  getPostgreSQLConfig,
  getCrawlerDBConfig,
} from './config/database.config';
import { getLoggerConfig } from './config/logger.config';
import { getRedisConfig } from './config/redis.config';

// 公共模块
import { CommonModule } from './common/common.module';
import { MonitoringModule } from './common/monitoring/monitoring.module';

// 原有控制器和服务
import { AppController } from './app.controller';
import { AppService } from './app.service';

// 用户管理
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PermissionsModule } from './permissions/permissions.module';
import { RolesModule } from './roles/roles.module';
import { MenuModule } from './menu/menu.module';
import { SearchModule } from './modules/search/search.module';
import { TagsModule } from './tags/tags.module';

import { SourceAccountModule } from './modules/source-account/source-account.module';
import { SqlbotModule } from './modules/sqlbot/sqlbot.module';
import { KolListModule } from './modules/kol-list/kol-list.module';
import { KolSyncModule } from './modules/kol-sync/kol-sync.module'; // 新增：KOL同步模块
import { KolReviewsModule } from './modules/kol-reviews/kol-reviews.module';
import { SupplierDatabaseModule } from './modules/supplier-database/supplier-database.module';
import { InfluencerV2Module } from './modules/influencer-v2/influencer-v2.module';
import { UploadModule } from './modules/upload/upload.module';
import { WorkOrderModule } from './modules/work-order/work-order.module';

/**
 * 主应用模块
 * 整合所有配置和功能模块
 */
@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      load: [getAppConfig],
      envFilePath: ['.env'],
    }),

    // 定时任务模块
    ScheduleModule.forRoot(),

    // 日志模块
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        getLoggerConfig(configService),
    }),

    // PostgreSQL数据库连接（主数据库）
    TypeOrmModule.forRootAsync({
      name: 'postgres',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...getPostgreSQLConfig(configService),
        synchronize: false, // 禁用自动同步以避免重复索引问题
      }),
    }),

    // 爬虫数据库连接（第二数据源）
    TypeOrmModule.forRootAsync({
      name: 'crawler',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...getCrawlerDBConfig(configService),
      }),
    }),

    // Redis配置
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        options: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD') || undefined,
          db: configService.get('REDIS_DB', 0),
        },
      }),
    }),

    // Cache模块配置
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        getRedisConfig(configService),
    }),

    // JWT 配置
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || (() => {
        // 生产环境必须配置JWT_SECRET
        if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
          throw new Error('生产环境必须配置 JWT_SECRET 环境变量');
        }
        // 开发环境使用默认值
        console.warn('⚠️  使用默认JWT密钥，仅适用于开发环境');
        return 'your-secret-key';
      })(),
      signOptions: {
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
        issuer: process.env.JWT_ISSUER || 'gimcstar-light-system',
        audience: process.env.JWT_AUDIENCE || 'gimcstar-users',
      },
    }),

    // 公共模块
    CommonModule,
    MonitoringModule,

    // 功能模块
    AuthModule,

    // 业务模块
    UsersModule,
    PermissionsModule,
    RolesModule,
    MenuModule,
    SearchModule,
    TagsModule,
    SourceAccountModule,
    SqlbotModule,
    KolListModule,
    KolSyncModule, // 新增：KOL同步模块
    KolReviewsModule,
    SupplierDatabaseModule,
    InfluencerV2Module,
    UploadModule,
    WorkOrderModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
    @InjectDataSource('postgres')
    private readonly postgresDataSource: DataSource,
    @InjectDataSource('crawler') private readonly crawlerDataSource: DataSource,
  ) {}

  async onModuleInit() {
    this.logger.log('🚀 应用模块初始化完成');

    // 检查PostgreSQL连接状态
    try {
      if (this.postgresDataSource.isInitialized) {
        await this.postgresDataSource.query('SELECT 1');
        this.logger.log('✅ PostgreSQL数据库连接成功');
      } else {
        this.logger.warn('⚠️ PostgreSQL数据库未初始化');
      }
    } catch (error) {
      this.logger.error(
        '❌ PostgreSQL数据库连接失败',
        (error as Error).message,
      );
    }

    // 检查Crawler数据库连接状态
    try {
      if (this.crawlerDataSource.isInitialized) {
        await this.crawlerDataSource.query('SELECT 1');
        this.logger.log('✅ Crawler数据库连接成功');
      } else {
        this.logger.warn('⚠️ Crawler数据库未初始化');
      }
    } catch (error) {
      this.logger.error('❌ Crawler数据库连接失败', (error as Error).message);
    }

    // 检查Redis连接状态
    try {
      await this.redis.ping();
      this.logger.log('✅ Redis连接成功');
    } catch (error) {
      this.logger.error('❌ Redis连接失败', (error as Error).message);
    }

    // 显示配置信息
    const port = this.configService.get<number>('PORT', 9000);
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    this.logger.log(`🌍 运行环境: ${nodeEnv}`);
    this.logger.log(`🔧 配置模块已加载`);
    this.logger.log(`📝 日志模块已加载`);
    this.logger.log(`🏥 健康检查模块已加载`);
    this.logger.log(`🎯 应用启动完成，监听端口: ${port}`);
  }
}
