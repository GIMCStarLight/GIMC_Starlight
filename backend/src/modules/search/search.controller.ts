import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/auth.guard';
import { SearchService, SearchOptions } from './search.service';
import type { Request } from 'express';

@ApiTags('搜索')
@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('influencers')
  @ApiOperation({ summary: '搜索达人' })
  @ApiResponse({
    status: 200,
    description: '搜索成功',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { type: 'object' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  @ApiQuery({ name: 'keyword', required: false, description: '搜索关键词' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: '页码',
    type: Number,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '每页数量',
    type: Number,
  })
  @ApiQuery({ name: 'sortBy', required: false, description: '排序字段' })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: '排序方向',
    enum: ['ASC', 'DESC'],
  })
  @ApiQuery({ name: 'platform', required: false, description: '平台过滤' })
  @ApiQuery({ name: 'gender', required: false, description: '性别过滤' })
  @ApiQuery({ name: 'city', required: false, description: '城市过滤' })
  @ApiQuery({
    name: 'followerCountMin',
    required: false,
    description: '最小粉丝数',
    type: Number,
  })
  @ApiQuery({
    name: 'followerCountMax',
    required: false,
    description: '最大粉丝数',
    type: Number,
  })
  @ApiQuery({
    name: 'engagementRateMin',
    required: false,
    description: '最小互动率',
    type: Number,
  })
  @ApiQuery({
    name: 'engagementRateMax',
    required: false,
    description: '最大互动率',
    type: Number,
  })
  async searchInfluencers(@Query() query: any, @Req() req: Request) {
    try {
      // 记录请求信息用于调试
      console.log(
        `Request method: ${req.method}, body: ${JSON.stringify(req.body)}, query: ${JSON.stringify(req.query)}`,
      );

      // 处理URL编码的请求体数据（用于测试脚本兼容性）
      let bodyParams = {};

      // 对于GET请求，curl的-d参数数据可能在req.body中（取决于中间件配置）
      if (req.body) {
        if (typeof req.body === 'string') {
          try {
            // 解析URL编码的数据
            const urlParams = new URLSearchParams(req.body);
            for (const [key, value] of urlParams) {
              (bodyParams as any)[key] = value;
            }
            console.log(`Parsed body params: ${JSON.stringify(bodyParams)}`);
          } catch (error) {
            console.warn('Failed to parse URL-encoded body:', error);
          }
        } else if (typeof req.body === 'object') {
          bodyParams = req.body;
          console.log(`Object body params: ${JSON.stringify(bodyParams)}`);
        }
      }

      // 合并查询参数和请求体参数，优先使用查询参数
      const mergedParams = { ...bodyParams, ...query };
      console.log(`Merged params: ${JSON.stringify(mergedParams)}`);

      const options: SearchOptions = {
        keyword: mergedParams.keyword,
        page: parseInt(mergedParams.page) || 1,
        limit: parseInt(mergedParams.limit) || 10,
        sortBy: mergedParams.sortBy,
        sortOrder: mergedParams.sortOrder as 'ASC' | 'DESC',
        filters: {
          platforms: mergedParams.platform
            ? [mergedParams.platform]
            : undefined,
          gender: mergedParams.gender,
          city: mergedParams.city,
          followerCountRange: {
            min: mergedParams.followerCountMin
              ? parseInt(mergedParams.followerCountMin)
              : undefined,
            max: mergedParams.followerCountMax
              ? parseInt(mergedParams.followerCountMax)
              : undefined,
          },
          engagementRateRange: {
            min: mergedParams.engagementRateMin
              ? parseFloat(mergedParams.engagementRateMin)
              : undefined,
            max: mergedParams.engagementRateMax
              ? parseFloat(mergedParams.engagementRateMax)
              : undefined,
          },
        },
      };

      console.log(`Final options for service: ${JSON.stringify(options)}`);
      return await this.searchService.searchInfluencers(options);
    } catch (error) {
      throw new HttpException(
        `搜索失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('influencers')
  @ApiOperation({ summary: '搜索达人（POST）' })
  @ApiResponse({
    status: 200,
    description: '搜索成功',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { type: 'object' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        keyword: { type: 'string', description: '搜索关键词' },
        platform: { type: 'string', description: '平台' },
        page: { type: 'number', description: '页码' },
        limit: { type: 'number', description: '每页数量' },
        sortBy: { type: 'string', description: '排序字段' },
        sortOrder: {
          type: 'string',
          enum: ['ASC', 'DESC'],
          description: '排序方向',
        },
        gender: { type: 'string', description: '性别过滤' },
        city: { type: 'string', description: '城市过滤' },
        followerCountMin: { type: 'number', description: '最小粉丝数' },
        followerCountMax: { type: 'number', description: '最大粉丝数' },
        engagementRateMin: { type: 'number', description: '最小互动率' },
        engagementRateMax: { type: 'number', description: '最大互动率' },
      },
    },
  })
  async searchInfluencersPost(@Body() searchData: any) {
    try {
      const options: SearchOptions = {
        keyword: searchData.keyword,
        page: parseInt(searchData.page) || 1,
        limit: parseInt(searchData.limit) || 10,
        sortBy: searchData.sortBy,
        sortOrder: searchData.sortOrder as 'ASC' | 'DESC',
        filters: {
          platforms: searchData.platform ? [searchData.platform] : undefined,
          gender: searchData.gender,
          city: searchData.city,
          followerCountRange: {
            min: searchData.followerCountMin
              ? parseInt(searchData.followerCountMin)
              : undefined,
            max: searchData.followerCountMax
              ? parseInt(searchData.followerCountMax)
              : undefined,
          },
          engagementRateRange: {
            min: searchData.engagementRateMin
              ? parseFloat(searchData.engagementRateMin)
              : undefined,
            max: searchData.engagementRateMax
              ? parseFloat(searchData.engagementRateMax)
              : undefined,
          },
        },
      };

      return await this.searchService.searchInfluencers(options);
    } catch (error) {
      throw new HttpException(
        `搜索失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('suggestions')
  @ApiOperation({ summary: '获取搜索建议' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      type: 'array',
      items: { type: 'string' },
    },
  })
  @ApiQuery({ name: 'keyword', required: true, description: '搜索关键词' })
  async getSearchSuggestions(@Query('keyword') keyword: string) {
    try {
      if (!keyword || keyword.length < 2) {
        return [];
      }

      return await this.searchService.getSearchSuggestions(keyword);
    } catch (error) {
      throw new HttpException(
        `获取搜索建议失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
