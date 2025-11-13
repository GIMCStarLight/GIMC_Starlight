import { Injectable, Logger } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';
import { CacheService } from '../common/services/cache.service';

import {
  SearchInfluencerDto,
  SearchResultDto,
  SortField,
  SortOrder,
  Platform,
} from './dto/search.dto';
import { createHash } from 'crypto';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly indexName = 'influencers';

  constructor(
    private readonly elasticsearchService: ElasticsearchService,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * 搜索达人
   */
  async searchInfluencers(
    searchDto: SearchInfluencerDto,
  ): Promise<SearchResultDto> {
    const startTime = Date.now();
    const fromCache = false;

    try {
      // 生成缓存键
      const cacheKey = this.generateSearchCacheKey(searchDto);

      // 检查缓存
      if (searchDto.useCache) {
        const cachedResult =
          await this.cacheService.getSearchResults<SearchResultDto>(cacheKey);
        if (cachedResult) {
          this.logger.debug(`搜索结果来自缓存: ${cacheKey}`);
          return {
            ...cachedResult,
            fromCache: true,
            took: Date.now() - startTime,
          };
        }
      }

      // 尝试使用Elasticsearch搜索
      try {
        // 构建ES查询
        const query = this.buildElasticsearchQuery(searchDto);

        // 执行搜索
        const response = await this.elasticsearchService.search({
          index: this.indexName,
          body: query,
        });

        // 处理搜索结果
        const result = this.processSearchResponse(
          response,
          searchDto,
          startTime,
          fromCache,
        );

        // 缓存结果
        if (searchDto.useCache && result.items.length > 0) {
          await this.cacheService.setSearchResults(cacheKey, result);
          this.logger.debug(`搜索结果已缓存: ${cacheKey}`);
        }

        // 记录搜索关键词
        if (searchDto.query) {
          await this.recordSearchKeyword(searchDto.query);
        }

        return result;
      } catch (esError) {
        this.logger.warn(
          'Elasticsearch搜索失败，使用数据库fallback',
          esError.message,
        );

        // 使用数据库fallback
        return await this.searchInfluencersFromDatabase(searchDto, startTime);
      }
    } catch (error) {
      this.logger.error('搜索达人失败', error.stack);
      throw new Error('搜索服务暂时不可用');
    }
  }

  /**
   * 数据库fallback搜索（已废弃）
   */
  private async searchInfluencersFromDatabase(
    searchDto: SearchInfluencerDto,
    startTime: number,
  ): Promise<SearchResultDto> {
    this.logger.warn('数据库fallback搜索已废弃，请使用Elasticsearch');
    throw new Error('数据库fallback搜索已废弃');
  }

  /**
   * 映射排序字段
   */
  private mapSortField(sortBy?: SortField): string {
    switch (sortBy) {
      case SortField.FOLLOWERS:
        return 'follower';
      case SortField.CREATED_AT:
        return 'created_at';
      default:
        return 'created_at';
    }
  }

  /**
   * 构建Elasticsearch查询
   */
  private buildElasticsearchQuery(searchDto: SearchInfluencerDto) {
    const { page = 1, size = 20 } = searchDto;
    const from = (page - 1) * size;

    const query: any = {
      size,
      from,
      query: {
        bool: {
          must: [],
          filter: [],
        },
      },
      sort: this.buildSortClause(searchDto),
      aggs: this.buildAggregations(),
    };

    // 关键词搜索
    if (searchDto.query) {
      query.query.bool.must.push({
        multi_match: {
          query: searchDto.query,
          fields: [
            'nickname^3',
            'description^2',
            'tags^2',
            'category',
            'region',
          ],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      });
    } else {
      query.query.bool.must.push({ match_all: {} });
    }

    // 平台筛选
    if (searchDto.platforms?.length) {
      query.query.bool.filter.push({
        terms: { platform: searchDto.platforms },
      });
    }

    // 标签筛选
    if (searchDto.tags?.length) {
      query.query.bool.filter.push({
        terms: { 'tags.keyword': searchDto.tags },
      });
    }

    // 粉丝数范围
    if (
      searchDto.minFollowers !== undefined ||
      searchDto.maxFollowers !== undefined
    ) {
      const range: any = {};
      if (searchDto.minFollowers !== undefined) {
        range.gte = searchDto.minFollowers;
      }
      if (searchDto.maxFollowers !== undefined) {
        range.lte = searchDto.maxFollowers;
      }
      query.query.bool.filter.push({
        range: { followers_count: range },
      });
    }

    // 互动率范围
    if (
      searchDto.minEngagementRate !== undefined ||
      searchDto.maxEngagementRate !== undefined
    ) {
      const range: any = {};
      if (searchDto.minEngagementRate !== undefined) {
        range.gte = searchDto.minEngagementRate / 100;
      }
      if (searchDto.maxEngagementRate !== undefined) {
        range.lte = searchDto.maxEngagementRate / 100;
      }
      query.query.bool.filter.push({
        range: { engagement_rate: range },
      });
    }

    // 地区筛选
    if (searchDto.regions?.length) {
      query.query.bool.filter.push({
        terms: { 'region.keyword': searchDto.regions },
      });
    }

    // 性别筛选
    if (searchDto.gender) {
      query.query.bool.filter.push({
        term: { 'gender.keyword': searchDto.gender },
      });
    }

    // 年龄范围
    if (searchDto.minAge !== undefined || searchDto.maxAge !== undefined) {
      const range: any = {};
      if (searchDto.minAge !== undefined) {
        range.gte = searchDto.minAge;
      }
      if (searchDto.maxAge !== undefined) {
        range.lte = searchDto.maxAge;
      }
      query.query.bool.filter.push({
        range: { age: range },
      });
    }

    // 认证状态
    if (searchDto.isVerified !== undefined) {
      query.query.bool.filter.push({
        term: { is_verified: searchDto.isVerified },
      });
    }

    return query;
  }

  /**
   * 构建排序子句
   */
  private buildSortClause(searchDto: SearchInfluencerDto) {
    const { sortBy = SortField.RELEVANCE, sortOrder = SortOrder.DESC } =
      searchDto;

    if (sortBy === SortField.RELEVANCE) {
      return [{ _score: { order: sortOrder } }];
    }

    const sortField = {
      [SortField.FOLLOWERS]: 'followers_count',
      [SortField.ENGAGEMENT_RATE]: 'engagement_rate',
      [SortField.CREATED_AT]: 'created_at',
      [SortField.UPDATED_AT]: 'updated_at',
    }[sortBy];

    return [
      { [sortField]: { order: sortOrder } },
      { _score: { order: 'desc' } }, // 二级排序
    ];
  }

  /**
   * 构建聚合查询
   */
  private buildAggregations() {
    return {
      platforms: {
        terms: { field: 'platform', size: 10 },
      },
      regions: {
        terms: { field: 'region.keyword', size: 20 },
      },
      tags: {
        terms: { field: 'tags.keyword', size: 50 },
      },
      followers_range: {
        range: {
          field: 'followers_count',
          ranges: [
            { key: '0-1万', from: 0, to: 10000 },
            { key: '1万-10万', from: 10000, to: 100000 },
            { key: '10万-100万', from: 100000, to: 1000000 },
            { key: '100万+', from: 1000000 },
          ],
        },
      },
      engagement_rate_range: {
        range: {
          field: 'engagement_rate',
          ranges: [
            { key: '0-1%', from: 0, to: 0.01 },
            { key: '1%-3%', from: 0.01, to: 0.03 },
            { key: '3%-5%', from: 0.03, to: 0.05 },
            { key: '5%+', from: 0.05 },
          ],
        },
      },
    };
  }

  /**
   * 处理搜索响应
   */
  private processSearchResponse(
    response: any,
    searchDto: SearchInfluencerDto,
    startTime: number,
    fromCache: boolean,
  ): SearchResultDto {
    const { page = 1, size = 20 } = searchDto;
    const total = response.body.hits.total.value;
    const totalPages = Math.ceil(total / size);

    return {
      items: response.body.hits.hits.map((hit: any) => ({
        id: hit._id,
        score: hit._score,
        ...hit._source,
      })),
      total,
      page,
      size,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      took: Date.now() - startTime,
      fromCache,
      aggregations: response.body.aggregations,
    };
  }

  /**
   * 获取搜索建议
   */
  async getSearchSuggestions(
    query: string,
    size: number = 10,
  ): Promise<string[]> {
    try {
      const cacheKey = `suggestions:${query}`;

      // 检查缓存
      const cached = await this.cacheService.get<string[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const response = await this.elasticsearchService.search({
        index: this.indexName,
        size: 0,
        suggest: {
          nickname_suggest: {
            prefix: query,
            completion: {
              field: 'nickname_suggest',
              size,
            },
          },
          tag_suggest: {
            prefix: query,
            completion: {
              field: 'tag_suggest',
              size,
            },
          },
        },
      });

      const suggestions = new Set<string>();

      // 处理昵称建议
      if (response.suggest?.nickname_suggest?.[0]?.options) {
        const nicknameOptions = Array.isArray(
          response.suggest.nickname_suggest[0].options,
        )
          ? response.suggest.nickname_suggest[0].options
          : [response.suggest.nickname_suggest[0].options];
        nicknameOptions.forEach((option: any) => {
          suggestions.add(option.text);
        });
      }

      // 处理标签建议
      if (response.suggest?.tag_suggest?.[0]?.options) {
        const tagOptions = Array.isArray(
          response.suggest.tag_suggest[0].options,
        )
          ? response.suggest.tag_suggest[0].options
          : [response.suggest.tag_suggest[0].options];
        tagOptions.forEach((option: any) => {
          suggestions.add(option.text);
        });
      }

      const result = Array.from(suggestions).slice(0, size);

      // 缓存建议结果
      await this.cacheService.set(cacheKey, result, { ttl: 3600 }); // 1小时缓存

      return result;
    } catch (error) {
      this.logger.error('获取搜索建议失败', error.stack);
      return [];
    }
  }

  /**
   * 重建搜索索引
   */
  async reindexInfluencers(): Promise<void> {
    try {
      this.logger.log('开始重建搜索索引');

      // 清除所有搜索缓存
      await this.cacheService.clearSearchResults();

      // 这里应该从数据库重新索引所有达人数据
      // 具体实现需要根据实际的数据模型来完成

      this.logger.log('搜索索引重建完成');
    } catch (error) {
      this.logger.error('重建搜索索引失败', error.stack);
      throw new Error('重建索引失败');
    }
  }

  /**
   * 获取热门搜索关键词
   */
  async getHotKeywords(
    limit: number = 10,
  ): Promise<Array<{ keyword: string; count: number }>> {
    try {
      const cacheKey = 'hot_keywords';

      // 检查缓存
      const cached =
        await this.cacheService.get<Array<{ keyword: string; count: number }>>(
          cacheKey,
        );
      if (cached) {
        return cached;
      }

      // 从Redis获取搜索关键词统计
      const keywords = await this.cacheService.zrevrange(
        'search_keywords',
        0,
        limit - 1,
        true,
      );

      const result: Array<{ keyword: string; count: number }> = [];
      for (let i = 0; i < keywords.length; i += 2) {
        result.push({
          keyword: keywords[i],
          count: parseInt(keywords[i + 1]),
        });
      }

      // 缓存热门关键词
      await this.cacheService.set(cacheKey, result, { ttl: 1800 }); // 30分钟缓存

      return result;
    } catch (error) {
      this.logger.error('获取热门关键词失败', error.stack);
      return [];
    }
  }

  /**
   * 清除搜索缓存
   */
  async clearSearchCache(query?: string): Promise<void> {
    try {
      await this.cacheService.clearSearchResults(query);

      if (!query) {
        // 清除所有相关缓存
        await this.cacheService.del('hot_keywords');
        await this.cacheService.delByPattern('suggestions:*');
      }

      this.logger.log(`搜索缓存已清除${query ? `: ${query}` : ''}`);
    } catch (error) {
      this.logger.error('清除搜索缓存失败', error.stack);
      throw new Error('清除缓存失败');
    }
  }

  /**
   * 生成搜索缓存键
   */
  private generateSearchCacheKey(searchDto: SearchInfluencerDto): string {
    const keyData = {
      query: searchDto.query || '',
      platforms: searchDto.platforms?.sort() || [],
      tags: searchDto.tags?.sort() || [],
      minFollowers: searchDto.minFollowers,
      maxFollowers: searchDto.maxFollowers,
      minEngagementRate: searchDto.minEngagementRate,
      maxEngagementRate: searchDto.maxEngagementRate,
      regions: searchDto.regions?.sort() || [],
      gender: searchDto.gender,
      minAge: searchDto.minAge,
      maxAge: searchDto.maxAge,
      isVerified: searchDto.isVerified,
      sortBy: searchDto.sortBy,
      sortOrder: searchDto.sortOrder,
      page: searchDto.page,
      size: searchDto.size,
    };

    const keyString = JSON.stringify(keyData);
    return createHash('md5').update(keyString).digest('hex');
  }

  /**
   * 记录搜索关键词
   */
  private async recordSearchKeyword(keyword: string): Promise<void> {
    try {
      // 使用Redis有序集合记录搜索关键词频次
      await this.cacheService.zincrby(
        'search_keywords',
        1,
        keyword.toLowerCase(),
      );

      // 保持热门关键词数量在合理范围内
      const count = await this.cacheService.zcard('search_keywords');
      if (count > 1000) {
        // 移除最不热门的关键词
        await this.cacheService.zremrangebyrank(
          'search_keywords',
          0,
          count - 1000,
        );
      }
    } catch (error) {
      this.logger.error('记录搜索关键词失败', error.stack);
    }
  }
}
