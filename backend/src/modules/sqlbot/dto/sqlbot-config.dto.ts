import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateSqlbotConfigDto {
  @ApiProperty({
    description: 'SQLBot域名',
    example: 'https://sqlbot.example.com',
  })
  @IsString()
  @IsNotEmpty()
  domain: string;

  @ApiProperty({ description: '基础应用助手ID', example: 'base-assistant-123' })
  @IsString()
  @IsNotEmpty()
  baseAssistantId: string;

  @ApiPropertyOptional({
    description: '高级应用助手ID',
    example: 'advanced-assistant-123',
  })
  @IsString()
  @IsOptional()
  advancedAssistantId?: string;

  @ApiPropertyOptional({
    description: '嵌入式应用ID',
    example: 'embedded-app-123',
  })
  @IsString()
  @IsOptional()
  embeddedAppId?: string;

  @ApiPropertyOptional({
    description: '嵌入式应用密钥',
    example: 'secret-key-123',
  })
  @IsString()
  @IsOptional()
  embeddedAppSecret?: string;

  @ApiPropertyOptional({ description: '是否启用AES加密', default: false })
  @IsBoolean()
  @IsOptional()
  aesEnable?: boolean;

  @ApiPropertyOptional({ description: 'AES加密密钥', example: 'aes-key-123' })
  @IsString()
  @IsOptional()
  aesKey?: string;

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

export class UpdateSqlbotConfigDto {
  @ApiPropertyOptional({
    description: 'SQLBot域名',
    example: 'https://sqlbot.example.com',
  })
  @IsString()
  @IsOptional()
  domain?: string;

  @ApiPropertyOptional({
    description: '基础应用助手ID',
    example: 'base-assistant-123',
  })
  @IsString()
  @IsOptional()
  baseAssistantId?: string;

  @ApiPropertyOptional({
    description: '高级应用助手ID',
    example: 'advanced-assistant-123',
  })
  @IsString()
  @IsOptional()
  advancedAssistantId?: string;

  @ApiPropertyOptional({
    description: '嵌入式应用ID',
    example: 'embedded-app-123',
  })
  @IsString()
  @IsOptional()
  embeddedAppId?: string;

  @ApiPropertyOptional({
    description: '嵌入式应用密钥',
    example: 'secret-key-123',
  })
  @IsString()
  @IsOptional()
  embeddedAppSecret?: string;

  @ApiPropertyOptional({ description: '是否启用AES加密', default: false })
  @IsBoolean()
  @IsOptional()
  aesEnable?: boolean;

  @ApiPropertyOptional({ description: 'AES加密密钥', example: 'aes-key-123' })
  @IsString()
  @IsOptional()
  aesKey?: string;

  @ApiPropertyOptional({ description: '是否启用', default: true })
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

export class SqlbotConfigResponseDto {
  @ApiProperty({ description: '配置ID' })
  id: string;

  @ApiProperty({ description: 'SQLBot域名' })
  domain: string;

  @ApiProperty({ description: '基础应用助手ID' })
  baseAssistantId: string;

  @ApiPropertyOptional({ description: '高级应用助手ID' })
  advancedAssistantId?: string;

  @ApiPropertyOptional({ description: '嵌入式应用ID' })
  embeddedAppId?: string;

  @ApiPropertyOptional({ description: '嵌入式应用密钥' })
  embeddedAppSecret?: string;

  @ApiProperty({ description: '是否启用AES加密' })
  aesEnable: boolean;

  @ApiPropertyOptional({ description: 'AES加密密钥' })
  aesKey?: string;

  @ApiProperty({ description: '是否启用' })
  enabled: boolean;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}
