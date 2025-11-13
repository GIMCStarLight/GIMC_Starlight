import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Type, Expose } from 'class-transformer';
import { BaseQueryDto } from '../../common/dto/base.dto';

/**
 * 用户查询DTO
 */
export class UserQueryDto extends BaseQueryDto {
  @ApiProperty({
    description: '部门筛选',
    example: '技术部',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '部门必须是字符串' })
  @Expose()
  department?: string;

  @ApiProperty({
    description: '角色ID筛选',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '角色ID必须是字符串' })
  @Expose()
  roleId?: string;
}
