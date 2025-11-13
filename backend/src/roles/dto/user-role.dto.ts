import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsNotEmpty, ArrayNotEmpty } from 'class-validator';
import { Expose } from 'class-transformer';

/**
 * 用户角色分配DTO
 */
export class UserRoleDto {
  @ApiProperty({
    description: '用户ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString({ message: '用户ID必须是字符串' })
  @IsNotEmpty({ message: '用户ID不能为空' })
  @Expose()
  userId: string;

  @ApiProperty({
    description: '角色ID列表',
    example: [
      '123e4567-e89b-12d3-a456-426614174000',
      '456e7890-e89b-12d3-a456-426614174001',
    ],
    type: [String],
  })
  @IsArray({ message: 'roleIds必须是数组' })
  @ArrayNotEmpty({ message: '角色ID数组不能为空' })
  @IsString({ each: true, message: 'roleIds必须是字符串' })
  @IsNotEmpty({ each: true, message: 'roleIds不能为空' })
  @Expose()
  roleIds: string[];
}
