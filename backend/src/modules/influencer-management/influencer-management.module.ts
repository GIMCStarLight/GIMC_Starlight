import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StarlinkInfluencer } from '../../database/entities/starlink-influencer.entity';
import { StarmediaInfluencer } from '../../database/entities/starmedia-influencer.entity';
import { StarlinkInfluencerController } from './controllers/starlink-influencer.controller';
import { StarmediaInfluencerController } from './controllers/starmedia-influencer.controller';
import { StarlinkInfluencerService } from './services/starlink-influencer.service';
import { StarmediaInfluencerService } from './services/starmedia-influencer.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([StarlinkInfluencer, StarmediaInfluencer]),
  ],
  controllers: [StarlinkInfluencerController, StarmediaInfluencerController],
  providers: [StarlinkInfluencerService, StarmediaInfluencerService],
  exports: [StarlinkInfluencerService, StarmediaInfluencerService],
})
export class InfluencerManagementModule {}
