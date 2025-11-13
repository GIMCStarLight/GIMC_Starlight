import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { KolSyncController } from './kol-sync.controller';
import { KolSyncService } from './kol-sync.service';
import { KolAutoSyncHook } from './kol-auto-sync.hook';
import { KolList } from '../../database/entities/kol-list.entity';
import { AuthorCoreView } from '../../database/entities/author-core-view.entity';

@Module({
  imports: [
    ConfigModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        baseURL:
          config.get<string>('CRAWLER_API_BASE_URL') ||
          'http://localhost:8009/api/v1',
        timeout: config.get<number>('CRAWLER_API_TIMEOUT_MS') ?? 300000, // 5分钟
      }),
    }),
    TypeOrmModule.forFeature([KolList], 'postgres'),
    TypeOrmModule.forFeature([AuthorCoreView], 'crawler'),
  ],
  controllers: [KolSyncController],
  providers: [KolSyncService, KolAutoSyncHook],
  exports: [KolSyncService, KolAutoSyncHook],
})
export class KolSyncModule {}
