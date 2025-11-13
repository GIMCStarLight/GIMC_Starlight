import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { KolList } from '../../database/entities/kol-list.entity';
import { ImportHistory } from '../../database/entities/import-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([KolList, ImportHistory], 'postgres'),
    MulterModule.register({
      dest: './uploads',
    }),
  ],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
