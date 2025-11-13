import { ApiPropertyOptional } from '@nestjs/swagger';
import { MatchStatus } from '../../../database/entities/kol-list.entity';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsInt,
  Min,
  Max,
  Length,
  IsArray,
  IsEnum,
  IsBoolean,
} from 'class-validator';

export class QueryKolListDto {
  @ApiPropertyOptional({ description: '页码', minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页数量',
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: '账号平台筛选', maxLength: 30 })
  @IsOptional()
  @IsString()
  @Length(1, 30)
  platform?: string;

  @ApiPropertyOptional({ description: '账号名称搜索', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  account_name?: string;

  @ApiPropertyOptional({ description: '账号ID搜索', maxLength: 80 })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  account_id?: string;

  @ApiPropertyOptional({ description: '所属机构名筛选', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  org_name?: string;

  @ApiPropertyOptional({ description: '账号类型筛选', maxLength: 30 })
  @IsOptional()
  @IsString()
  @Length(1, 30)
  category?: string;

  @ApiPropertyOptional({ description: '最小粉丝量（万）', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  min_followers_w?: number;

  @ApiPropertyOptional({ description: '最大粉丝量（万）', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  max_followers_w?: number;

  @ApiPropertyOptional({
    description: '是否独家筛选 1独家 0非独家',
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  is_exclusive?: number;

  @ApiPropertyOptional({
    description: '返点政策筛选 0无 1有',
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1)
  rebate_policy?: number;

  @ApiPropertyOptional({ description: '政策等级筛选', maxLength: 10 })
  @IsOptional()
  @IsString()
  @Length(1, 10)
  policy_level?: string;

  @ApiPropertyOptional({ description: '匹配的公海作者ID', maxLength: 80 })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  matched_author_id?: string;

  @ApiPropertyOptional({ description: '匹配的公海作者ID列表', isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  matched_author_ids?: string[];

  @ApiPropertyOptional({ description: '匹配状态', enum: MatchStatus })
  @IsOptional()
  @IsEnum(MatchStatus)
  match_status?: MatchStatus;

  @ApiPropertyOptional({ description: '仅展示已匹配达人', default: false })
  @IsOptional()
  @IsBoolean()
  matched_only?: boolean;

  @ApiPropertyOptional({
    description: '排序字段',
    enum: ['id', 'followers_w', 'created_at', 'updated_at'],
    default: 'id',
  })
  @IsOptional()
  @IsString()
  sort_by?: string = 'id';

  @ApiPropertyOptional({
    description: '排序方向',
    enum: ['ASC', 'DESC'],
    default: 'DESC',
  })
  @IsOptional()
  @IsString()
  sort_order?: 'ASC' | 'DESC' = 'DESC';
}
