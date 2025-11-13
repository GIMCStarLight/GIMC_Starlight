import {
  Controller,
  Get,
  Query,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { SearchInfluencerDto, SearchSuggestionDto } from './dto/search.dto';
import { ApiResponseDto } from '../common/dto/response.dto';

@ApiTags('搜索')
@Controller('search')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('influencers')
  @ApiOperation({ summary: '搜索达人' })
  @ApiResponse({
    status: 200,
    description: '搜索成功',
    type: ApiResponseDto,
  })
  async searchInfluencers(@Query() searchDto: SearchInfluencerDto) {
    const result = await this.searchService.searchInfluencers(searchDto);
    return {
      code: 200,
      message: '搜索成功',
      data: result,
    };
  }

  @Get('suggestions')
  @ApiOperation({ summary: '获取搜索建议' })
  @ApiResponse({
    status: 200,
    description: '获取建议成功',
    type: ApiResponseDto,
  })
  async getSearchSuggestions(@Query() suggestionDto: SearchSuggestionDto) {
    const suggestions = await this.searchService.getSearchSuggestions(
      suggestionDto.query,
    );
    return {
      code: 200,
      message: '获取建议成功',
      data: suggestions,
    };
  }

  @Post('reindex')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '重建搜索索引' })
  @ApiResponse({
    status: 200,
    description: '重建索引成功',
    type: ApiResponseDto,
  })
  async reindexInfluencers() {
    await this.searchService.reindexInfluencers();
    return {
      code: 200,
      message: '重建索引成功',
      data: null,
    };
  }

  @Get('hot-keywords')
  @ApiOperation({ summary: '获取热门搜索关键词' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: ApiResponseDto,
  })
  async getHotKeywords() {
    const keywords = await this.searchService.getHotKeywords();
    return {
      code: 200,
      message: '获取成功',
      data: keywords,
    };
  }

  @Post('clear-cache')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '清除搜索缓存' })
  @ApiResponse({
    status: 200,
    description: '清除缓存成功',
    type: ApiResponseDto,
  })
  async clearSearchCache(@Body('query') query?: string) {
    await this.searchService.clearSearchCache(query);
    return {
      code: 200,
      message: '清除缓存成功',
      data: null,
    };
  }
}
