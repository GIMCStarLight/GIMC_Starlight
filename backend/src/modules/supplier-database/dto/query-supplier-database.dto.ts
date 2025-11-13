import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsInt,
  IsEnum,
  IsDateString,
  Min,
  Max,
  Length,
} from 'class-validator';

export class QuerySupplierDatabaseDto {
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

  @ApiPropertyOptional({ description: '通用搜索（供应商名称、机构名）', maxLength: 255 })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  search?: string;

  @ApiPropertyOptional({ description: '供应商全称搜索', maxLength: 255 })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  supplier_full_name?: string;

  @ApiPropertyOptional({ description: 'MCN机构名搜索', maxLength: 255 })
  @IsOptional()
  @IsString()
  @Length(1, 255)
  mcn_name?: string;

  @ApiPropertyOptional({
    description: '供应商性质筛选',
    enum: ['集采', '独代', '独代+集采'],
  })
  @IsOptional()
  @IsEnum(['集采', '独代', '独代+集采'])
  supplier_type?: string;

  @ApiPropertyOptional({ description: '资源类型搜索（模糊匹配）', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  resource_type?: string;

  @ApiPropertyOptional({ description: '合同状态搜索（模糊匹配）', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  contract_status?: string;

  @ApiPropertyOptional({ description: '当前政策梯度筛选', maxLength: 50 })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  current_policy_gradient?: string;

  @ApiPropertyOptional({ description: '最小24年全年累量金额', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  min_total_amount_24?: number;

  @ApiPropertyOptional({ description: '最大24年全年累量金额', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  max_total_amount_24?: number;

  @ApiPropertyOptional({ description: '最小25年全年累量金额', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  min_total_amount_25?: number;

  @ApiPropertyOptional({ description: '最大25年全年累量金额', minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  max_total_amount_25?: number;

  @ApiPropertyOptional({ description: '是否代下单筛选', type: 'boolean' })
  @IsOptional()
  is_proxy_order?: boolean;

  @ApiPropertyOptional({ description: '一级对接人姓名搜索', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  primary_contact_name?: string;

  @ApiPropertyOptional({ description: '年框合同跟进人搜索', maxLength: 100 })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  contract_follow_up_person?: string;

  @ApiPropertyOptional({ description: '合同开始时间（起）', format: 'date' })
  @IsOptional()
  @IsDateString()
  contract_start_from?: string;

  @ApiPropertyOptional({ description: '合同开始时间（止）', format: 'date' })
  @IsOptional()
  @IsDateString()
  contract_start_to?: string;

  @ApiPropertyOptional({ description: '合同结束时间（起）', format: 'date' })
  @IsOptional()
  @IsDateString()
  contract_end_from?: string;

  @ApiPropertyOptional({ description: '合同结束时间（止）', format: 'date' })
  @IsOptional()
  @IsDateString()
  contract_end_to?: string;

  @ApiPropertyOptional({ description: '可合作抖音平台筛选', type: 'boolean' })
  @IsOptional()
  can_cooperate_douyin?: boolean;

  @ApiPropertyOptional({ description: '可合作小红书平台筛选', type: 'boolean' })
  @IsOptional()
  can_cooperate_xiaohongshu?: boolean;

  @ApiPropertyOptional({
    description: '可合作微信公众号平台筛选',
    type: 'boolean',
  })
  @IsOptional()
  can_cooperate_wechat_mp?: boolean;

  @ApiPropertyOptional({
    description: '可合作微信视频号平台筛选',
    type: 'boolean',
  })
  @IsOptional()
  can_cooperate_wechat_video?: boolean;

  @ApiPropertyOptional({ description: '可合作微博平台筛选', type: 'boolean' })
  @IsOptional()
  can_cooperate_weibo?: boolean;

  @ApiPropertyOptional({ description: '可合作B站平台筛选', type: 'boolean' })
  @IsOptional()
  can_cooperate_bilibili?: boolean;

  @ApiPropertyOptional({ description: '可合作知乎平台筛选', type: 'boolean' })
  @IsOptional()
  can_cooperate_zhihu?: boolean;

  @ApiPropertyOptional({ description: '可合作快手平台筛选', type: 'boolean' })
  @IsOptional()
  can_cooperate_kuaishou?: boolean;

  @ApiPropertyOptional({ description: '可合作懂车帝平台筛选', type: 'boolean' })
  @IsOptional()
  can_cooperate_dongchedi?: boolean;

  @ApiPropertyOptional({
    description: '排序字段',
    enum: [
      'id',
      'supplier_full_name',
      'total_amount_24',
      'total_amount_25',
      'contract_start',
      'contract_end',
      'created_at',
      'updated_at',
    ],
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
