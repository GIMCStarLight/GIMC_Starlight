import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsString,
  IsArray,
  IsOptional,
  IsNotEmpty,
  MaxLength,
  IsDateString,
  ValidateNested,
  IsNumber,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  WorkOrderType,
  WorkOrderPriority,
} from '../../../database/entities/work-order.entity';

/**
 * 附件DTO
 */
class AttachmentDto {
  @ApiProperty({ description: '文件名' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '文件URL' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiProperty({ description: '文件大小（字节）' })
  @IsNumber()
  @Min(0)
  size: number;

  @ApiProperty({ description: '文件类型' })
  @IsString()
  @IsNotEmpty()
  type: string;
}

/**
 * 创建工单DTO
 */
export class CreateWorkOrderDto {
  @ApiProperty({
    description: '工单标题',
    maxLength: 100,
    example: '需要新增用户导出功能',
  })
  @IsString()
  @IsNotEmpty({ message: '工单标题不能为空' })
  @MaxLength(100, { message: '工单标题不能超过100个字符' })
  title: string;

  @ApiProperty({
    description: '事务类型',
    enum: WorkOrderType,
    example: WorkOrderType.NEW_FEATURE,
  })
  @IsEnum(WorkOrderType, { message: '事务类型无效' })
  @IsNotEmpty({ message: '事务类型不能为空' })
  type: WorkOrderType;

  @ApiPropertyOptional({
    description: '优先级',
    enum: WorkOrderPriority,
    default: WorkOrderPriority.MEDIUM,
    example: WorkOrderPriority.HIGH,
  })
  @IsOptional()
  @IsEnum(WorkOrderPriority, { message: '优先级无效' })
  priority?: WorkOrderPriority;

  @ApiProperty({
    description: '需求描述',
    example: '需要在用户管理页面增加批量导出功能，支持导出Excel格式',
  })
  @IsString()
  @IsNotEmpty({ message: '需求描述不能为空' })
  description: string;

  @ApiPropertyOptional({
    description: '涉及的功能模块ID列表',
    type: [String],
    example: ['9-1', '9-2'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  modules?: string[];

  @ApiPropertyOptional({
    description: '附件列表',
    type: [AttachmentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @ApiPropertyOptional({
    description: '期望完成时间',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  expectedCompletionAt?: string;

  @ApiPropertyOptional({
    description: '指定处理人ID',
  })
  @IsOptional()
  @IsString()
  assignedTo?: string;
}
