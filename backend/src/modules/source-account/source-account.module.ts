import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SourceAccount } from '../../database/entities/source-account.entity';
import { SourceAccountService } from './source-account.service';
import { SourceAccountController } from './source-account.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SourceAccount], 'postgres')],
  controllers: [SourceAccountController],
  providers: [SourceAccountService],
  exports: [SourceAccountService],
})
export class SourceAccountModule {}
