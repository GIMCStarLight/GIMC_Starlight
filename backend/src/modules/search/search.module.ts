import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { AuthorCoreView } from '../../database/entities/author-core-view.entity';
import { DATABASE_CONNECTIONS } from '../../config/database.config';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuthorCoreView], DATABASE_CONNECTIONS.CRAWLER),
    AuthModule,
  ],
  controllers: [SearchController],
  providers: [SearchService],
  exports: [SearchService],
})
export class SearchModule {}
