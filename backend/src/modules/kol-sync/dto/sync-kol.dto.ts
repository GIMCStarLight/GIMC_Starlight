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
