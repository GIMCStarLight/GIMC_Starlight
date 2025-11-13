import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupplierDatabaseService } from './supplier-database.service';
import { SupplierDatabaseController } from './supplier-database.controller';
import { SupplierDatabase } from '../../database/entities/supplier-database.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SupplierDatabase], 'postgres')],
  controllers: [SupplierDatabaseController],
  providers: [SupplierDatabaseService],
  exports: [SupplierDatabaseService],
})
export class SupplierDatabaseModule {}
