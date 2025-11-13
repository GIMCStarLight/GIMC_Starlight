import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Expose } from 'class-transformer';

/**
 * 创建用户DTO
 */
export class CreateUserDto {
  @ApiProperty({
    description: '手机号',
    example: '13800138000',
  })
  @IsString({ message: '手机号必须是字符串' })
  @IsNotEmpty({ message: '手机号不能为空' })
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  @Expose()
  phone: string;

  @ApiProperty({
    description: '用户姓名',
    example: '张三',
  })
  @IsString({ message: '姓名必须是字符串' })
  @IsNotEmpty({ message: '姓名不能为空' })
  @MaxLength(50, { message: '姓名长度不能超过50个字符' })
  @Expose()
  name: string;

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
    description: '密码',
    example: 'password123',
  })
  @IsString({ message: '密码必须是字符串' })
  @IsNotEmpty({ message: '密码不能为空' })
  @MinLength(6, { message: '密码长度不能少于6位' })
  @MaxLength(20, { message: '密码长度不能超过20位' })
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/, {
    message: '密码必须包含字母和数字',
  })
  @Expose()
  password: string;
}
