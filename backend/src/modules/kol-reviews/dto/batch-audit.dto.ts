import { IsArray, IsEnum, IsString, IsOptional, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class BatchAuditDto {
  @ApiProperty({ description: '评价ID列表', type: [Number] })
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  ids: number[];

  @ApiProperty({ description: '审核状态', enum: ['approved', 'rejected'] })
  @IsEnum(['approved', 'rejected'])
  status: 'approved' | 'rejected';

  @ApiProperty({ description: '审核人' })
  @IsString()
  auditor: string;

  @ApiProperty({ description: '审核意见', required: false })
  @IsOptional()
  @IsString()
  comment?: string;
}

export class BatchDeleteDto {
  @ApiProperty({ description: '评价ID列表', type: [Number] })
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  ids: number[];

  @ApiProperty({ description: '删除人', required: false })
  @IsOptional()
  @IsString()
  deletedBy?: string;
}
