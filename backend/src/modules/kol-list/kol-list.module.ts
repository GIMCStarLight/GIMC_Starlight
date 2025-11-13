import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KolListService } from './kol-list.service';
import { KolListController } from './kol-list.controller';
import { KolMatchController } from './controllers/kol-match.controller';
import { KolMatchService } from './services/kol-match.service';
import { PerformanceMonitorService } from './services/performance-monitor.service';
import { KolList } from '../../database/entities/kol-list.entity';
import { KolPrivateMatches } from '../../database/entities/kol-private-matches.entity';
import { KolMatchLogs } from '../../database/entities/kol-match-logs.entity';
import { KolSyncModule } from '../kol-sync/kol-sync.module';

@Module({
  imports: [
    TypeOrmModule.forFeature(
      [KolList, KolPrivateMatches, KolMatchLogs],
      'postgres',
    ),
    forwardRef(() => KolSyncModule),
  ],
  controllers: [KolListController, KolMatchController],
  providers: [KolListService, KolMatchService, PerformanceMonitorService],
  exports: [KolListService, KolMatchService, PerformanceMonitorService],
})
export class KolListModule {}
