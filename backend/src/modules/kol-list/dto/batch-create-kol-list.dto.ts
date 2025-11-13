import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateKolListDto } from './create-kol-list.dto';

export class BatchCreateKolListDto {
  @ApiProperty({
    description: 'KOL数据数组',
    type: [CreateKolListDto],
    minItems: 1,
    maxItems: 100,
  })
  @IsArray()
  @ArrayMinSize(1, { message: '至少需要提供一个KOL数据' })
  @ArrayMaxSize(100, { message: '单次最多只能创建100个KOL' })
  @ValidateNested({ each: true })
  @Type(() => CreateKolListDto)
  kols: CreateKolListDto[];
}
