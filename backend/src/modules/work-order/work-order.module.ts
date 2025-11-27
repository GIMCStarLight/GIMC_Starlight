import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkOrder } from '../../database/entities/work-order.entity';
import { WorkOrderLog } from '../../database/entities/work-order-log.entity';
import { WorkOrderController } from './work-order.controller';
import { WorkOrderService } from './work-order.service';

@Module({
  imports: [TypeOrmModule.forFeature([WorkOrder, WorkOrderLog], 'postgres')],
  controllers: [WorkOrderController],
  providers: [WorkOrderService],
  exports: [WorkOrderService],
})
export class WorkOrderModule {}
