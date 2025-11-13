import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';
import { Expose } from 'class-transformer';

/**
 * 分配用户角色DTO
 */
export class AssignUserRolesDto {
  @ApiProperty({
    description: '角色ID列表',
    example: ['1', '2'],
    type: [String],
  })
  @IsArray({ message: '角色ID必须是数组' })
  @IsString({ each: true, message: '每个角色ID必须是字符串' })
  @Expose()
  roleIds: string[];
}
