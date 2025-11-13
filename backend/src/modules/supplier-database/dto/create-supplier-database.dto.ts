import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  Length,
  IsNumber,
  IsBoolean,
  IsDateString,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateSupplierDatabaseDto {
  // 基本信息
  @ApiProperty({ description: '供应商全称', maxLength: 255 })
  @IsString()
  @Length(1, 255)
  supplier_full_name: string;

  @ApiPropertyOptional({ description: '机构名', maxLength: 255 })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  agency_name?: string;

  @ApiPropertyOptional({ description: '供应商性质', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  supplier_type?: string;

  @ApiPropertyOptional({ description: '供应商简称', maxLength: 255 })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  supplier_short_name?: string;

  @ApiPropertyOptional({ description: '供应商英文名', maxLength: 255 })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  supplier_english_name?: string;

  @ApiPropertyOptional({ description: '供应商官网', maxLength: 255 })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  supplier_website?: string;

  @ApiPropertyOptional({ description: '供应商简介' })
  @IsOptional()
  @IsString()
  supplier_description?: string;

  // 政策与财务
  @ApiPropertyOptional({ description: '当前政策梯度', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  current_policy_gradient?: string;

  @ApiPropertyOptional({ description: '税率(%)', minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Transform(({ value }) => (value ? parseFloat(value) : undefined))
  tax_rate_percent?: number;

  @ApiPropertyOptional({ description: '账期', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  payment_term?: string;

  @ApiPropertyOptional({ description: '结算方式', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  settlement_method?: string;

  @ApiPropertyOptional({ description: '开票主体', maxLength: 255 })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  billing_entity?: string;

  @ApiPropertyOptional({ description: '收款主体', maxLength: 255 })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  collection_entity?: string;

  // 年度政策
  @ApiPropertyOptional({ description: '2024政策梯度', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  policy_2024_gradient?: string;

  @ApiPropertyOptional({ description: '2024合作模式' })
  @IsOptional()
  @IsString()
  cooperation_mode_2024?: string;

  @ApiPropertyOptional({ description: '2024备注' })
  @IsOptional()
  @IsString()
  notes_2024?: string;

  @ApiPropertyOptional({ description: '2025政策梯度', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  policy_2025_gradient?: string;

  @ApiPropertyOptional({ description: '2025合作模式' })
  @IsOptional()
  @IsString()
  cooperation_mode_2025?: string;

  @ApiPropertyOptional({ description: '2025备注' })
  @IsOptional()
  @IsString()
  notes_2025?: string;

  // 联系人信息
  @ApiPropertyOptional({ description: '一级对接人', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  primary_contact_name?: string;

  @ApiPropertyOptional({ description: '联系方式', maxLength: 255 })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  primary_contact_phone_wechat?: string;

  @ApiPropertyOptional({ description: '二级对接人', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  secondary_contact_name?: string;

  @ApiPropertyOptional({ description: '二级联系方式', maxLength: 255 })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  secondary_contact_phone_wechat?: string;

  @ApiPropertyOptional({ description: '三级对接人', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  tertiary_contact_name?: string;

  @ApiPropertyOptional({ description: '三级联系方式', maxLength: 255 })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  tertiary_contact_phone_wechat?: string;

  // 合同信息
  @ApiPropertyOptional({ description: '跟进人', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  contract_follow_up_person?: string;

  @ApiPropertyOptional({ description: '合同状态', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  contract_status?: string;

  @ApiPropertyOptional({ description: '合同开始日期' })
  @IsOptional()
  @IsDateString()
  contract_start_date?: string;

  @ApiPropertyOptional({ description: '合同结束日期' })
  @IsOptional()
  @IsDateString()
  contract_end_date?: string;

  @ApiPropertyOptional({ description: '合同备注' })
  @IsOptional()
  @IsString()
  contract_notes?: string;

  // 资源信息
  @ApiPropertyOptional({ description: '资源类型', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  resource_type?: string;

  @ApiPropertyOptional({ description: '主要平台', maxLength: 255 })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  main_platform?: string;

  @ApiPropertyOptional({ description: '是否代下单' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true' || value === '1' || value === '是';
    }
    return Boolean(value);
  })
  is_proxy_order?: boolean;

  @ApiPropertyOptional({ description: '资源备注' })
  @IsOptional()
  @IsString()
  resource_notes?: string;

  // 创建人信息
  @ApiPropertyOptional({ description: '创建人', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  created_by?: string;
}
