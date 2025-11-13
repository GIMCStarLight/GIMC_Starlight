import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  Min,
  Max,
  Length,
  IsUrl,
} from 'class-validator';

export class CreateKolListDto {
  @ApiProperty({ description: '账号平台，如抖音/小红书/B站', maxLength: 30 })
  @IsString()
  @Length(1, 30)
  platform: string;

  @ApiProperty({ description: '账号名称', maxLength: 100 })
  @IsString()
  @Length(1, 100)
  account_name: string;

  @ApiProperty({ description: '账号ID（各平台唯一标识）', maxLength: 80 })
  @IsString()
  @Length(1, 80)
  account_id: string;

  @ApiProperty({ description: '主页链接', maxLength: 500 })
  @IsString()
  @IsUrl()
  @Length(1, 500)
  home_link: string;

  @ApiProperty({ description: '粉丝量（万）', minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  followers_w: number;

  @ApiPropertyOptional({ description: '所属机构名', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  org_name?: string;

  @ApiPropertyOptional({
    description: '账号类型，如美妆/母婴/汽车等',
    maxLength: 30,
  })
  @IsOptional()
  @IsString()
  @Length(1, 30)
  category?: string;

  @ApiPropertyOptional({ description: '星图报价21-60s（人民币）', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  star_quote_21_60s?: number;

  @ApiPropertyOptional({ description: '星图报价60s+（人民币）', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  star_quote_60s_plus?: number;

  @ApiPropertyOptional({
    description: '达人属性 1独家 0非独家',
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  is_exclusive?: number;

  @ApiPropertyOptional({
    description: '返点政策描述，如“0-50w: 25%，50-200w: 28%”',
  })
  @IsOptional()
  @IsString()
  rebate_policy?: string;

  @ApiPropertyOptional({ description: '返点区间，如10%-15%', maxLength: 50 })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  rebate_range?: string;

  @ApiPropertyOptional({ description: '政策等级 A/B/C', maxLength: 10 })
  @IsOptional()
  @IsString()
  @Length(1, 10)
  policy_level?: string;

  @ApiPropertyOptional({
    description: '返点账期，如月结/季度结',
    maxLength: 30,
  })
  @IsOptional()
  @IsString()
  @Length(1, 30)
  rebate_period?: string;

  @ApiPropertyOptional({ description: '支付账期，如T+1/T+7', maxLength: 30 })
  @IsOptional()
  @IsString()
  @Length(1, 30)
  pay_period?: string;

  @ApiPropertyOptional({ description: '备注', maxLength: 500 })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  remark?: string;
}
