import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class KolSyncItemDto {
  @ApiProperty({ description: 'KOL ID', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  kol_id: number;

  @ApiProperty({ description: '抖音账号ID', example: 'douyin_id_123' })
  @IsString()
  @IsNotEmpty()
  account_id: string;
}

export class SingleSyncKolDto extends KolSyncItemDto {}

export class BatchSyncKolDto {
  @ApiProperty({
    description: 'KOL同步对象列表',
    type: [KolSyncItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KolSyncItemDto)
  kols: KolSyncItemDto[];
}

// 同步批量请求体，兼容两种输入：kols 或 kolIds
export class BatchSyncRequestDto {
  @ApiProperty({
    description: 'KOL同步对象列表（可选）',
    type: [KolSyncItemDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KolSyncItemDto)
  kols?: KolSyncItemDto[];

  @ApiProperty({
    description: 'KOL ID 列表（可选）',
    type: [Number],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsNumber({}, { each: true })
  kolIds?: number[];
}

export class SyncStatsDto {
  @ApiProperty({ description: 'KOL总数', example: 1000 })
  total: number;

  @ApiProperty({ description: '未匹配数量', example: 450 })
  unmatched: number;

  @ApiProperty({ description: '待同步数量', example: 100 })
  pending: number;

  @ApiProperty({ description: '已匹配数量', example: 400 })
  matched: number;

  @ApiProperty({ description: '同步失败数量', example: 50 })
  rejected: number;

  @ApiProperty({ description: '匹配率（百分比）', example: 40.0, required: false })
  matchRate?: number;

  @ApiProperty({ description: '同步成功率（百分比）', example: 80.0, required: false })
  syncSuccessRate?: number;
}
