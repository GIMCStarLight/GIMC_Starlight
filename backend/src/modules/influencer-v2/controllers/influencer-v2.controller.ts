import {
  Controller,
  Get,
  Query,
  Param,
  Post,
  Body,
  UseGuards,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/auth.guard';
import { InfluencerV2Service } from '../services/influencer-v2.service';
import { InfluencerQueryDto } from '../dto/influencer-query.dto';
import {
  InfluencerListResponseDto,
  InfluencerDetailResponseDto,
} from '../dto/influencer-response.dto';

@ApiTags('影响者管理 V2')
@Controller('v2/influencers')
// @UseGuards(JwtAuthGuard)
// @ApiBearerAuth()
export class InfluencerV2Controller {
  private readonly logger = new Logger(InfluencerV2Controller.name);

  constructor(private readonly influencerService: InfluencerV2Service) {}

  @Get()
  @ApiOperation({
    summary: '获取影响者列表',
    description: '根据条件筛选和分页获取影响者列表',
  })
  @ApiResponse({
    status: 200,
    description: '成功获取影响者列表',
    type: InfluencerListResponseDto,
  })
  @ApiQuery({ name: 'page', required: false, description: '页码，默认为1' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '每页数量，默认为20',
  })
  @ApiQuery({ name: 'platform', required: false, description: '平台筛选' })
  @ApiQuery({ name: 'category', required: false, description: '分类筛选' })
  @ApiQuery({
    name: 'minFollowers',
    required: false,
    description: '最小粉丝数',
  })
  @ApiQuery({
    name: 'maxFollowers',
    required: false,
    description: '最大粉丝数',
  })
  @ApiQuery({
    name: 'minEngagementRate',
    required: false,
    description: '最小互动率',
  })
  @ApiQuery({
    name: 'maxEngagementRate',
    required: false,
    description: '最大互动率',
  })
  @ApiQuery({ name: 'verified', required: false, description: '是否认证' })
  @ApiQuery({ name: 'location', required: false, description: '地区筛选' })
  @ApiQuery({ name: 'tags', required: false, description: '标签筛选' })
  @ApiQuery({ name: 'keyword', required: false, description: '关键词搜索' })
  @ApiQuery({ name: 'sortBy', required: false, description: '排序字段' })
  @ApiQuery({ name: 'sortOrder', required: false, description: '排序方向' })
  async getInfluencerList(
    @Query() query: InfluencerQueryDto,
  ): Promise<InfluencerListResponseDto> {
    try {
      this.logger.log('获取影响者列表请求', { query });
      const result = await this.influencerService.getInfluencerList(query);
      this.logger.log('影响者列表获取成功', {
        total: result.pagination.total,
        page: result.pagination.page,
      });
      return result;
    } catch (error) {
      this.logger.error('获取影响者列表失败', error);
      throw error;
    }
  }

  @Get('stats')
  @ApiOperation({
    summary: '获取影响者统计信息',
    description: '获取影响者的性别、类型、等级等统计数据',
  })
  @ApiResponse({
    status: 200,
    description: '成功获取统计信息',
  })
  async getInfluencerStatistics(): Promise<any> {
    try {
      this.logger.log('获取影响者统计信息请求');
      const result = await this.influencerService.getInfluencerStatistics();
      this.logger.log('影响者统计信息获取成功');
      return result;
    } catch (error) {
      this.logger.error('获取影响者统计信息失败', error);
      throw error;
    }
  }

  @Get(':authorId')
  @ApiOperation({
    summary: '获取影响者详情',
    description: '根据作者ID获取影响者详细信息',
  })
  @ApiResponse({
    status: 200,
    description: '成功获取影响者详情',
    type: InfluencerDetailResponseDto,
  })
  @ApiParam({
    name: 'authorId',
    description: '作者ID',
    example: 'dy_123456789',
  })
  async getInfluencerDetail(
    @Param('authorId') authorId: string,
  ): Promise<InfluencerDetailResponseDto> {
    try {
      this.logger.log('获取影响者详情请求', { authorId });
      const result = await this.influencerService.getInfluencerDetail(authorId);
      this.logger.log('影响者详情获取成功', { authorId });
      return result;
    } catch (error) {
      this.logger.error('获取影响者详情失败', { authorId, error });
      throw error;
    }
  }

  @Get(':authorId/full-data')
  @ApiOperation({
    summary: '获取达人完整原始数据',
    description: '获取包含123个字段的完整原始数据',
  })
  @ApiResponse({
    status: 200,
    description: '成功获取完整数据',
  })
  @ApiParam({
    name: 'authorId',
    description: '作者ID',
  })
  async getInfluencerFullData(
    @Param('authorId') authorId: string,
  ): Promise<{ data: Record<string, any> }> {
    try {
      this.logger.log('获取达人完整数据请求', { authorId });
      const result = await this.influencerService.getInfluencerFullData(authorId);
      this.logger.log('达人完整数据获取成功', { authorId });
      return result;
    } catch (error) {
      this.logger.error('获取达人完整数据失败', { authorId, error });
      throw error;
    }
  }
}
