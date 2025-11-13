import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateSupplierDatabaseDto } from './create-supplier-database.dto';

export class BatchCreateSupplierDatabaseDto {
  @ApiProperty({
    description: '供应商数据数组',
    type: [CreateSupplierDatabaseDto],
    minItems: 1,
    maxItems: 100,
  })
  @IsArray()
  @ArrayMinSize(1, { message: '至少需要提供一个供应商数据' })
  @ArrayMaxSize(100, { message: '单次最多只能创建100个供应商' })
  @ValidateNested({ each: true })
  @Type(() => CreateSupplierDatabaseDto)
  suppliers: CreateSupplierDatabaseDto[];
}
