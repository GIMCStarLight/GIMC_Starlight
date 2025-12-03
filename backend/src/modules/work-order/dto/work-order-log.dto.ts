import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { WorkOrderLogAction } from '../../../database/entities/work-order-log.entity';

/**
 * 创建工单日志DTO
 */
export class CreateWorkOrderLogDto {
  @ApiProperty({ description: '工单ID' })
  @IsString()
  @IsNotEmpty()
  workOrderId: string;

  @ApiProperty({ description: '操作类型', enum: WorkOrderLogAction })
  @IsEnum(WorkOrderLogAction)
  action: WorkOrderLogAction;

  @ApiPropertyOptional({ description: '操作说明/备注' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: '额外数据' })
  @IsOptional()
  metadata?: Record<string, any>;
}
