import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsUrl,
  MaxLength,
  IsArray,
} from 'class-validator';
import { Expose } from 'class-transformer';

/**
 * 更新用户信息DTO
 */
export class UpdateUserDto {
  @ApiProperty({
    description: '用户姓名',
    example: '张三',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '姓名必须是字符串' })
  @MaxLength(50, { message: '姓名长度不能超过50个字符' })
  @Expose()
  name?: string;

  @ApiProperty({
    description: '邮箱地址',
    example: 'zhangsan@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  @MaxLength(100, { message: '邮箱长度不能超过100个字符' })
  @Expose()
  email?: string;

  @ApiProperty({
    description: '部门',
    example: '技术部',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '部门必须是字符串' })
  @MaxLength(100, { message: '部门名称长度不能超过100个字符' })
  @Expose()
  department?: string;

  @ApiProperty({
    description: '职位',
    example: '高级工程师',
    required: false,
  })
  @IsOptional()
  @IsString({ message: '职位必须是字符串' })
  @MaxLength(100, { message: '职位名称长度不能超过100个字符' })
  @Expose()
  position?: string;

  @ApiProperty({
    description: '头像URL',
    example: 'https://example.com/avatar.jpg',
    required: false,
  })
  @IsOptional()
  @IsUrl({}, { message: '头像URL格式不正确' })
  @MaxLength(500, { message: 'URL长度不能超过500个字符' })
  @Expose()
  avatarUrl?: string;

  @ApiProperty({
    description: '角色ID列表',
    example: ['1', '2'],
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray({ message: '角色ID必须是数组' })
  @IsString({ each: true, message: '每个角色ID必须是字符串' })
  @Expose()
  roleIds?: string[];
}
