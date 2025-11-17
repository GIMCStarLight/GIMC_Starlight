import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Param,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { InfluencerV3Service } from '../services/influencer-v3.service';
import { InfluencerV3QueryDto } from '../dto/influencer-v3-query.dto';
import {
  InfluencerV3ListResponseDto,
  InfluencerV3DetailResponseDto,
  InfluencerV3StatsResponseDto,
} from '../dto/influencer-v3-response.dto';

@ApiTags('达人广场')
@Controller('influencer-authors')
export class InfluencerV3Controller {
  private readonly logger = new Logger(InfluencerV3Controller.name);

  constructor(private readonly influencerV3Service: InfluencerV3Service) {}

  @Get('list')
  @ApiOperation({
    summary: '获取达人列表（V3）',
    description: '基于15表结构和30+标签体系的达人列表查询',
  })
  @ApiResponse({
    status: 200,
    description: '成功获取达人列表',
    type: InfluencerV3ListResponseDto,
  })
  @ApiQuery({ name: 'page', required: false, description: '页码，默认为1' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量，默认为20' })
  @ApiQuery({ name: 'sortBy', required: false, description: '排序字段' })
  @ApiQuery({ name: 'tier', required: false, description: '达人等级：mega/macro/micro/nano' })
  @ApiQuery({ name: 'specialTag', required: false, description: '特殊标签：excellent/black_horse/high_potential' })
  @ApiQuery({ name: 'ecommerce', required: false, description: '电商能力：enabled/with_videos' })
  @ApiQuery({ name: 'province', required: false, description: '省份筛选' })
  @ApiQuery({ name: 'contentTags', required: false, description: '内容标签（逗号分隔）' })
  @ApiQuery({ name: 'followerMin', required: false, description: '最小粉丝数' })
  @ApiQuery({ name: 'followerMax', required: false, description: '最大粉丝数' })
  @ApiQuery({ name: 'interactRateMin', required: false, description: '最小互动率' })
  @ApiQuery({ name: 'interactRateMax', required: false, description: '最大互动率' })
  @ApiQuery({ name: 'starIndexMin', required: false, description: '最小星图指数' })
  @ApiQuery({ name: 'starIndexMax', required: false, description: '最大星图指数' })
  @ApiQuery({ name: 'gender', required: false, description: '性别：1-男 2-女' })
  @ApiQuery({ name: 'authorType', required: false, description: '达人类型：1-个人 3-机构' })
  @ApiQuery({ name: 'matchedOnly', required: false, description: '仅展示已匹配私域达人', type: Boolean })
  async getInfluencerList(
    @Query() query: InfluencerV3QueryDto,
  ): Promise<InfluencerV3ListResponseDto> {
    try {
      this.logger.log('获取达人列表V3请求', { query });
      const result = await this.influencerV3Service.getInfluencerList(query);
      this.logger.log('达人列表V3获取成功', {
        total: result.total,
        page: result.page,
      });
      return result;
    } catch (error) {
      this.logger.error('获取达人列表V3失败', error);
      throw new HttpException(
        error.message || '获取达人列表失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('stats')
  @ApiOperation({
    summary: '获取达人统计信息（V3）',
    description: '获取总数、优质达人、黑马达人、电商达人等统计数据',
  })
  @ApiResponse({
    status: 200,
    description: '成功获取统计信息',
    type: InfluencerV3StatsResponseDto,
  })
  async getInfluencerStatistics(): Promise<InfluencerV3StatsResponseDto> {
    try {
      this.logger.log('获取达人统计信息V3请求');
      const result = await this.influencerV3Service.getInfluencerStatistics();
      this.logger.log('达人统计信息V3获取成功');
      return result;
    } catch (error) {
      this.logger.error('获取达人统计信息V3失败', error);
      throw new HttpException(
        error.message || '获取统计信息失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('detail/:authorId')
  @ApiOperation({
    summary: '获取达人详情（V3）',
    description: '根据作者ID获取达人完整详细信息（基于15表结构）',
  })
  @ApiResponse({
    status: 200,
    description: '成功获取达人详情',
    type: InfluencerV3DetailResponseDto,
  })
  @ApiParam({
    name: 'authorId',
    description: '作者ID',
    example: 'MS4wLjABAAAA...',
  })
  async getInfluencerDetail(
    @Param('authorId') authorId: string,
  ): Promise<InfluencerV3DetailResponseDto> {
    try {
      this.logger.log('获取达人详情V3请求', { authorId });
      const result = await this.influencerV3Service.getInfluencerDetail(authorId);
      this.logger.log('达人详情V3获取成功', { authorId });
      return result;
    } catch (error) {
      this.logger.error('获取达人详情V3失败', { authorId, error });
      throw new HttpException(
        error.message || '获取达人详情失败',
        error.status || HttpStatus.NOT_FOUND,
      );
    }
  }

  @Post('batch-export')
  @ApiOperation({
    summary: '批量获取达人完整数据（用于导出）',
    description: '根据author_id列表批量获取达人的所有字段数据',
  })
  @ApiResponse({
    status: 200,
    description: '成功获取达人数据',
  })
  async batchExportInfluencers(
    @Body() body: { authorIds: string[] },
  ): Promise<any> {
    try {
      this.logger.log('批量导出达人数据请求', { count: body.authorIds?.length });
      const result = await this.influencerV3Service.batchGetInfluencers(body.authorIds);
      this.logger.log('批量导出达人数据成功', { count: result.length });
      // 直接返回数组，让响应拦截器自动包装
      return result;
    } catch (error) {
      this.logger.error('批量导出达人数据失败', error);
      throw new HttpException(
        error.message || '批量获取达人数据失败',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
