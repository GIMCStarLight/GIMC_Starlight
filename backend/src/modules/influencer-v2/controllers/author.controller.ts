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
  async advancedFilter(@Body() filters: AuthorFilterQueryDto) {
    return this.filterService.advancedFilter(filters);
  }

  /**
   * 快速筛选查询
   * GET /api/influencers/v3/filter/quick
   */
  @Get('quick')
  @HttpCode(HttpStatus.OK)
  async quickFilter(@Query() filters: QuickFilterDto) {
    return this.filterService.quickFilter(filters);
  }

  /**
   * 获取筛选统计
   * GET /api/influencers/v3/filter/stats
   */
  @Get('stats')
  @HttpCode(HttpStatus.OK)
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
  async refreshMaterializedView() {
    await this.filterService.refreshMaterializedView();
    return { message: '物化视图刷新成功' };
  }
}
