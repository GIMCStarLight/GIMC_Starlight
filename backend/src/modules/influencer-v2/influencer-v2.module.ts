import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InfluencerV2Service } from './services/influencer-v2.service';
import { InfluencerV3Service } from './services/influencer-v3.service';
import { AuthorService } from './services/author.service';
import { AuthorFilterService } from './services/author-filter.service';
import { FilterQueryBuilder } from './services/filter-query.builder';
import { MaterializedViewRefreshService } from './services/materialized-view-refresh.service';
import { InfluencerV2Controller } from './controllers/influencer-v2.controller';
import { InfluencerV3Controller } from './controllers/influencer-v3.controller';
import { InfluencerFilterController } from './controllers/author.controller';
import { AuthModule } from '../../auth/auth.module';
import { AuthorCoreView } from '../../database/entities/author-core-view.entity';
import { AuthorRawArchive } from '../../database/entities/author-raw-archive.entity';
import { KolList } from '../../database/entities/kol-list.entity';
import { TestController } from './test-controller';
import { DATABASE_CONNECTIONS } from '../../config/database.config';
import {
  AuthorCore,
  AuthorFansMetrics,
  AuthorEngagementMetrics,
  AuthorPricing,
  AuthorMarketingIndices,
  AuthorContentTags,
  AuthorEcommerce,
  MvAuthorsCombined,
} from './entities';

@Module({
  imports: [
    AuthModule,
    // postgres 数据库连接的实体（包含 kol_list）
    TypeOrmModule.forFeature([KolList], DATABASE_CONNECTIONS.POSTGRES),
    // crawler 数据库连接的实体
    TypeOrmModule.forFeature([AuthorCoreView, AuthorRawArchive], DATABASE_CONNECTIONS.CRAWLER),
    TypeOrmModule.forFeature(
      [
        AuthorCore,
        AuthorFansMetrics,
        AuthorEngagementMetrics,
        AuthorPricing,
        AuthorMarketingIndices,
        AuthorContentTags,
        AuthorEcommerce,
        MvAuthorsCombined,
      ],
      DATABASE_CONNECTIONS.CRAWLER,
    ),
  ],
  controllers: [InfluencerV2Controller, InfluencerV3Controller, InfluencerFilterController, TestController],
  providers: [
    InfluencerV2Service,
    InfluencerV3Service,
    AuthorService,
    AuthorFilterService,
    FilterQueryBuilder,
    MaterializedViewRefreshService,
  ],
  exports: [InfluencerV2Service, InfluencerV3Service, AuthorService, AuthorFilterService],
})
export class InfluencerV2Module {}
