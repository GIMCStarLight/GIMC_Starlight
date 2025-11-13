import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

/**
 * 登录请求DTO
 */
export class LoginDto {
  @ApiProperty({
    description: '手机号',
    example: '13800138000',
  })
  @Expose()
  @IsString()
  @IsNotEmpty({ message: '手机号不能为空' })
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string;

  @ApiProperty({
    description: '密码',
    example: 'password123',
  })
  @Expose()
  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  @Length(6, 20, { message: '密码长度必须在6-20位之间' })
  password: string;
}

/**
 * 注册请求DTO
 */
export class RegisterDto {
  @ApiProperty({
    description: '手机号',
    example: '13800138000',
  })
  @Expose()
  @IsString()
  @IsNotEmpty({ message: '手机号不能为空' })
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string;

  @ApiProperty({
    description: '密码',
    example: 'password123',
  })
  @Expose()
  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  @Length(6, 20, { message: '密码长度必须在6-20位之间' })
  @Matches(/^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/, {
    message: '密码必须包含字母和数字',
  })
  password: string;

  @ApiProperty({
    description: '确认密码',
    example: 'password123',
  })
  @IsString()
  @IsNotEmpty({ message: '确认密码不能为空' })
  @Expose()
  confirmPassword: string;

  @ApiProperty({
    description: '用户姓名',
    example: '张三',
    required: false,
  })
  @IsString()
  @Expose()
  name?: string;
}

/**
 * 登录响应DTO
 */
export class LoginResponseDto {
  @ApiProperty({ description: 'JWT访问令牌' })
  accessToken: string;

  @ApiProperty({ description: '刷新令牌' })
  refreshToken: string;

  @ApiProperty({ description: '令牌类型', example: 'Bearer' })
  tokenType: string;

  @ApiProperty({ description: 'Access Token过期时间（秒）', example: 900 })
  expiresIn: number;

  @ApiProperty({ description: 'Refresh Token过期时间（秒）', example: 604800 })
  refreshExpiresIn: number;

  @ApiProperty({ description: '用户信息' })
  user: {
    id: string;
    phone: string;
    name: string;
    email?: string;
    department?: string;
    position?: string;
    avatarUrl?: string;
    status: number;
    roles: any[];
    permissions: string[];
    createdAt: string;
    updatedAt: string;
    lastLoginAt?: string;
  };
}
