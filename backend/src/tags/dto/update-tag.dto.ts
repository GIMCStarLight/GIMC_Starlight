import {
  IsString,
  IsOptional,
  IsInt,
  IsBoolean,
  IsIn,
  Min,
  Max,
  Length,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Expose } from 'class-transformer';

/**
 * 更新标签DTO
 * 明确定义所有可选字段，确保Transform装饰器正确应用
 */
export class UpdateTagDto {
  @ApiPropertyOptional({ description: '标签名称', example: '美食' })
  @IsOptional()
  @IsString({ message: 'name必须是字符串' })
  @Length(1, 100, { message: '标签名称长度必须在1-100个字符之间' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Expose()
  name?: string;

  @ApiPropertyOptional({ description: '标签代码', example: 'food' })
  @IsOptional()
  @IsString({ message: 'code必须是字符串' })
  @Length(1, 50, { message: '标签代码长度必须在1-50个字符之间' })
  @Transform(({ value }) =>
    value ? (typeof value === 'string' ? value.trim() : value) : value,
  )
  @Expose()
  code?: string;

  @ApiPropertyOptional({ description: '标签描述', example: '美食相关内容标签' })
  @IsOptional()
  @IsString({ message: 'description必须是字符串' })
  @Transform(({ value }) =>
    value ? (typeof value === 'string' ? value.trim() : value) : value,
  )
  @Expose()
  description?: string;

  @ApiPropertyOptional({
    description: '所属平台',
    example: '星图',
    enum: ['星图', '花火', '蒲公英'],
  })
  @IsOptional()
  @IsString({ message: 'platform必须是字符串' })
  @IsIn(['星图', '花火', '蒲公英'], { message: 'platform必须是指定值之一' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @Expose()
  platform?: string;

  @ApiPropertyOptional({ description: '父级标签ID', example: 1 })
  @IsOptional()
  @IsInt({ message: '父级标签ID必须是整数' })
  @Min(1, { message: '父级标签ID必须大于0' })
  @Transform(({ value }) => (value ? parseInt(value, 10) : value))
  @Expose()
  parentId?: number | null;

  @ApiPropertyOptional({ description: '排序权重', example: 0 })
  @IsOptional()
  @IsInt({ message: '排序权重必须是整数' })
  @Transform(({ value }) =>
    value !== undefined && value !== null ? parseInt(value, 10) : value,
  )
  @Expose()
  sort?: number;

  @ApiPropertyOptional({
    description: '是否启用',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: '是否启用必须是布尔值' })
  @Transform(({ value }) => {
    console.log(
      'UpdateTagDto Transform isActive - 输入值:',
      value,
      '类型:',
      typeof value,
    );
    if (value === undefined || value === null) {
      return undefined;
    }
    if (value === 'true' || value === true) {
      return true;
    }
    if (value === 'false' || value === false) {
      return false;
    }
    if (value === '1') {
      return true;
    }
    if (value === '0') {
      return false;
    }
    return value;
  })
  @Expose()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: '扩展属性',
    example: { color: '#ff0000', icon: 'food-icon' },
  })
  @IsOptional()
  @Expose()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: '标签层级', example: 1 })
  @IsOptional()
  @IsInt({ message: '标签层级必须是整数' })
  @Min(1, { message: '标签层级必须大于0' })
  @Max(10, { message: '标签层级不能超过10级' })
  @Transform(({ value }) =>
    value !== undefined && value !== null ? parseInt(value, 10) : value,
  )
  @Expose()
  level?: number;
}
