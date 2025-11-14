import {
  Controller,
  Get,
  Query,
  Body,
  HttpStatus,
  HttpCode,
  ParseIntPipe,
  DefaultValuePipe,
  Post,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { ApiStandardErrors } from '../../../common/decorators/api.decorator';
import { AuthorFilterService } from '../services/author-filter.service';
import {
  AuthorFilterQueryDto,
  QuickFilterDto,
} from '../dto/advanced-filter.dto';

/**
 * 筛选功能API控制器
 * 基于物化视图 mv_authors_combined
 * 路由: /api/influencers/v3/filter (全局前缀api已在main.ts配置)
 */
@ApiTags('达人筛选')
@Controller('influencers/v3/filter')
export class InfluencerFilterController {
  constructor(private readonly filterService: AuthorFilterService) {}

  /**
   * 高级筛选查询
   * POST /api/influencers/v3/filter/advanced
   * 使用物化视图 + Redis缓存
   */
  @Post('advanced')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '高级筛选查询',
    description: '基于物化视图的达人高级筛选，支持多维度组合筛选条件和Redis缓存加速',
  })
  @ApiBody({
    type: AuthorFilterQueryDto,
    description: '高级筛选条件',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '筛选成功，返回达人列表和统计信息',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          description: '达人列表',
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 20 },
            total: { type: 'number', example: 100 },
            totalPages: { type: 'number', example: 5 },
          },
        },
        performance: {
          type: 'object',
          properties: {
            queryTime: { type: 'number', example: 45, description: '查询耗时(ms)' },
            cacheHit: { type: 'boolean', example: false },
          },
        },
      },
    },
  })
  @ApiStandardErrors()
  async advancedFilter(@Body() filters: AuthorFilterQueryDto) {
    return this.filterService.advancedFilter(filters);
  }

  /**
   * 快速筛选查询
   * GET /api/influencers/v3/filter/quick
   */
  @Get('quick')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '快速筛选查询',
    description: '基于URL参数的快速筛选，适合简单条件查询',
  })
  @ApiQuery({
    name: 'tier',
    required: false,
    description: '达人等级：mega/macro/micro/nano',
    example: 'macro',
  })
  @ApiQuery({
    name: 'platform',
    required: false,
    description: '平台筛选：douyin/kuaishou等',
    example: 'douyin',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: '页码，默认1',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '每页数量，默认20',
    example: 20,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '快速筛选成功',
  })
  @ApiStandardErrors()
  async quickFilter(@Query() filters: QuickFilterDto) {
    return this.filterService.quickFilter(filters);
  }

  /**
   * 获取筛选统计
   * GET /api/influencers/v3/filter/stats
   */
  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '获取筛选统计',
    description: '根据筛选条件获取统计数据（不返回列表，仅统计）',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '统计成功',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number', example: 1000, description: '符合条件的总数' },
        tierDistribution: {
          type: 'object',
          description: '等级分布',
          example: { mega: 10, macro: 100, micro: 500, nano: 390 },
        },
        platformDistribution: {
          type: 'object',
          description: '平台分布',
          example: { douyin: 800, kuaishou: 200 },
        },
      },
    },
  })
  @ApiStandardErrors()
  async getFilterStatistics(
    @Query() filters: Omit<AuthorFilterQueryDto, 'page' | 'limit'>,
  ) {
    return this.filterService.getFilterStatistics(filters);
  }

  /**
   * 获取热门标签
   * GET /api/influencers/v3/filter/popular-tags
   */
  @Get('popular-tags')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '获取热门标签',
    description: '返回使用频率最高的内容标签列表，用于筛选条件推荐',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: '返回数量，默认20',
    example: 20,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '查询成功',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          tag: { type: 'string', example: '美食' },
          count: { type: 'number', example: 500 },
          percentage: { type: 'number', example: 15.5 },
        },
      },
    },
  })
  @ApiStandardErrors()
  async getPopularTags(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.filterService.getPopularTags(limit);
  }

  /**
   * 刷新物化视图 (内部使用)
   * POST /api/influencers/v3/filter/refresh-view
   */
  @Post('refresh-view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '刷新物化视图',
    description: '手动触发物化视图刷新（内部维护接口，谨慎使用）',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '刷新成功',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: '物化视图刷新成功' },
      },
    },
  })
  @ApiStandardErrors()
  async refreshMaterializedView() {
    await this.filterService.refreshMaterializedView();
    return { message: '物化视图刷新成功' };
  }
}
