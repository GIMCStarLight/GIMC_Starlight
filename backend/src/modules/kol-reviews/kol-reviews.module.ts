import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KolReviews } from '../../database/entities/kol-reviews.entity';
import { AuthorCoreView } from '../../database/entities/author-core-view.entity';
import { DATABASE_CONNECTIONS } from '../../config/database.config';
import { KolReviewsService } from './kol-reviews.service';
import { KolReviewsController } from './kol-reviews.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([KolReviews], 'postgres'),
    TypeOrmModule.forFeature([AuthorCoreView], DATABASE_CONNECTIONS.CRAWLER),
  ],
  controllers: [KolReviewsController],
  providers: [KolReviewsService],
})
export class KolReviewsModule {}
