import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SqlbotController } from './sqlbot.controller';
import { SqlbotService } from './sqlbot.service';
import { SqlbotConfig } from './entities/sqlbot-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SqlbotConfig], 'postgres')],
  controllers: [SqlbotController],
  providers: [SqlbotService],
  exports: [SqlbotService],
})
export class SqlbotModule {}
