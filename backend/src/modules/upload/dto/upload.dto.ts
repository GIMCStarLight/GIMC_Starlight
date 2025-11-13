import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsEnum, IsString } from 'class-validator';

export enum DataType {
  PRIVATE = 'private',
  PUBLIC = 'public',
}

export class ValidateDataDto {
  @ApiProperty({ description: '文件ID' })
  @IsString()
  fileId: string;

  @ApiProperty({
    description: '数据类型',
    enum: DataType,
    default: DataType.PRIVATE,
  })
  @IsEnum(DataType)
  @IsOptional()
  type?: DataType = DataType.PRIVATE;
}

export class ImportDataDto {
  @ApiProperty({ description: '文件ID' })
  @IsString()
  fileId: string;

  @ApiProperty({
    description: '数据类型',
    enum: DataType,
    default: DataType.PRIVATE,
  })
  @IsEnum(DataType)
  @IsOptional()
  type?: DataType = DataType.PRIVATE;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  data: any;
}

export interface ValidationResult {
  valid: boolean;
  validCount: number;
  errorCount: number;
  warningCount: number;
  errors: ValidationError[];
  warnings: ValidationError[];
  preview: any[];
  isSampled?: boolean; // 是否使用了采样验证
  totalRows?: number; // 总行数
  validatedRows?: number; // 实际验证的行数
}

export interface ImportResult {
  isSuccess: boolean;
  message: string;
  total: number;
  successCount: number;
  failedCount: number;
  duration: number;
  failedRecords?: any[];
}

export interface ParseResult {
  fileId: string;
  rowCount: number;
  preview: any[];
  data: any[];
}
