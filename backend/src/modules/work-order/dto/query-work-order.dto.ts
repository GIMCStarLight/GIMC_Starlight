import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsDateString,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  WorkOrderType,
  WorkOrderPriority,
  WorkOrderStatus,
} from '../../../database/entities/work-order.entity';

/**
 * 查询工单DTO
 */
export class QueryWorkOrderDto {
  @ApiPropertyOptional({ description: '关键词搜索（标题、描述）' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '事务类型', enum: WorkOrderType })
  @IsOptional()
  @IsEnum(WorkOrderType)
  type?: WorkOrderType;

  @ApiPropertyOptional({ description: '工单状态', enum: WorkOrderStatus })
  @IsOptional()
  @IsEnum(WorkOrderStatus)
  status?: WorkOrderStatus;

  @ApiPropertyOptional({ description: '优先级', enum: WorkOrderPriority })
  @IsOptional()
  @IsEnum(WorkOrderPriority)
  priority?: WorkOrderPriority;

  @ApiPropertyOptional({ description: '创建人ID' })
  @IsOptional()
  @IsString()
  createdBy?: string;

  @ApiPropertyOptional({ description: '处理人ID' })
  @IsOptional()
  @IsString()
  assignedTo?: string;

  @ApiPropertyOptional({ description: '涉及的功能模块ID列表', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modules?: string[];

  @ApiPropertyOptional({ description: '创建开始时间' })
  @IsOptional()
  @IsDateString()
  createdAtStart?: string;

  @ApiPropertyOptional({ description: '创建结束时间' })
  @IsOptional()
  @IsDateString()
  createdAtEnd?: string;

  @ApiPropertyOptional({ description: '页码', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', minimum: 1, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: '排序字段',
    default: 'created_at',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'created_at';

  @ApiPropertyOptional({
    description: '排序方式（ASC/DESC）',
    default: 'DESC',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
