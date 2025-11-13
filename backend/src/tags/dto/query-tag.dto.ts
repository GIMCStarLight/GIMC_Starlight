import {
  IsOptional,
  IsString,
  IsInt,
  IsBoolean,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../common/dto/base.dto';

/**
 * 查询标签DTO
 */
export class QueryTagDto extends PaginationDto {
  @ApiPropertyOptional({ description: '标签名称（模糊搜索）', example: '美食' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: '所属平台',
    example: '星图',
    enum: ['星图', '花火', '蒲公英'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['星图', '花火', '蒲公英'], {
    message: '平台必须是星图、花火或蒲公英之一',
  })
  platform?: string;

  @ApiPropertyOptional({ description: '父级标签ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '父级标签ID必须是整数' })
  @Min(1, { message: '父级标签ID必须大于0' })
  parentId?: number;

  @ApiPropertyOptional({ description: '层级深度', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: '层级深度必须是整数' })
  @Min(1, { message: '层级深度必须大于0' })
  level?: number;

  @ApiPropertyOptional({ description: '是否启用', example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: '是否启用必须是布尔值' })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: '排序字段',
    example: 'sort',
    enum: ['id', 'name', 'sort', 'createdAt', 'updatedAt'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['id', 'name', 'sort', 'createdAt', 'updatedAt'], {
    message: '排序字段必须是id、name、sort、createdAt或updatedAt之一',
  })
  sortBy?: string = 'sort';

  @ApiPropertyOptional({
    description: '排序方向',
    example: 'ASC',
    enum: ['ASC', 'DESC'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['ASC', 'DESC'], { message: '排序方向必须是ASC或DESC' })
  sortOrder?: 'ASC' | 'DESC' = 'ASC';

  @ApiPropertyOptional({
    description: '是否包含子标签',
    example: false,
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: '是否包含子标签必须是布尔值' })
  includeChildren?: boolean = false;

  @ApiPropertyOptional({
    description: '是否只获取根节点',
    example: false,
    default: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: '是否只获取根节点必须是布尔值' })
  rootOnly?: boolean = false;
}
