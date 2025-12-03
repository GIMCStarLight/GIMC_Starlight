import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  IsArray,
  IsOptional,
  MaxLength,
  IsDateString,
} from 'class-validator';
import {
  WorkOrderType,
  WorkOrderPriority,
  WorkOrderStatus,
} from '../../../database/entities/work-order.entity';

/**
 * 更新工单DTO
 */
export class UpdateWorkOrderDto {
  @ApiPropertyOptional({ description: '工单标题', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({ description: '事务类型', enum: WorkOrderType })
  @IsOptional()
  @IsEnum(WorkOrderType)
  type?: WorkOrderType;

  @ApiPropertyOptional({ description: '优先级', enum: WorkOrderPriority })
  @IsOptional()
  @IsEnum(WorkOrderPriority)
  priority?: WorkOrderPriority;

  @ApiPropertyOptional({ description: '需求描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: '涉及的功能模块ID列表',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modules?: string[];

  @ApiPropertyOptional({ description: '期望完成时间' })
  @IsOptional()
  @IsDateString()
  expectedCompletionAt?: string;

  @ApiPropertyOptional({ description: '处理结果/备注' })
  @IsOptional()
  @IsString()
  result?: string;
}

/**
 * 更新工单状态DTO
 */
export class UpdateWorkOrderStatusDto {
  @ApiPropertyOptional({ description: '工单状态', enum: WorkOrderStatus })
  @IsEnum(WorkOrderStatus, { message: '工单状态无效' })
  status: WorkOrderStatus;

  @ApiPropertyOptional({ description: '备注说明' })
  @IsOptional()
  @IsString()
  comment?: string;
}

/**
 * 分配工单DTO
 */
export class AssignWorkOrderDto {
  @ApiPropertyOptional({ description: '处理人ID' })
  @IsString({ message: '处理人ID必须为字符串' })
  assignedTo: string;

  @ApiPropertyOptional({ description: '分配说明' })
  @IsOptional()
  @IsString()
  comment?: string;
}
