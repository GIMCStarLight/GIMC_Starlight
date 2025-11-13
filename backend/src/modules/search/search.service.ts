import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { AuthorCoreView } from '../../database/entities/author-core-view.entity';
import { DATABASE_CONNECTIONS } from '../../config/database.config';
// 移除 CrawlTask 相关引用

export interface SearchResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SearchOptions {
  keyword?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  filters?: Record<string, any>;
}

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(AuthorCoreView, DATABASE_CONNECTIONS.CRAWLER)
    private readonly authorCoreRepo: Repository<AuthorCoreView>,
  ) {}

  /**
   * 搜索达人
   */
  async searchInfluencers(
    options: SearchOptions,
  ): Promise<SearchResult<AuthorCoreView>> {
    const {
      keyword = '',
      page = 1,
      limit = 20,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      filters = {},
    } = options;

    const queryBuilder = this.authorCoreRepo
      .createQueryBuilder('influencer')
      .select([
        'influencer.author_id',
        'influencer.nick_name',
        'influencer.avatar_uri',
        'influencer.author_type',
        'influencer.gender',
        'influencer.city',
        'influencer.follower',
        // 'influencer.interact_rate_within_30d', // AuthorCoreView中没有此字段
        // 'influencer.star_index', // AuthorCoreView中没有此字段
        'influencer.grade',
        "'douyin' AS main_platform", // 固定值，兼容旧字段
        'influencer.created_at',
        'influencer.updated_at',
      ]);

    // 关键词搜索
    if (keyword) {
      queryBuilder.andWhere('influencer.nick_name ILIKE :keyword', {
        keyword: `%${keyword}%`,
      });
    }

    // 应用过滤器
    this.applyInfluencerFilters(queryBuilder, filters);

    // 排序
    if (
      sortBy &&
      [
        'created_at',
        'updated_at',
        'follower',
        // 'interact_rate_within_30d', // AuthorCoreView中没有此字段
        // 'star_index', // AuthorCoreView中没有此字段
      ].includes(sortBy)
    ) {
      if (sortBy === 'follower') {
        queryBuilder.orderBy('CAST(influencer.follower AS BIGINT)', sortOrder);
        // } else if (sortBy === 'interact_rate_within_30d') {
        //   queryBuilder.orderBy(
        //     'CAST(influencer.interact_rate_within_30d AS DECIMAL)',
        //     sortOrder,
        //   );
        // } else if (sortBy === 'star_index') {
        //   queryBuilder.orderBy(
        //     'CAST(influencer.star_index AS DECIMAL)',
        //     sortOrder,
        //   );
      } else {
        queryBuilder.orderBy(`influencer.${sortBy}`, sortOrder);
      }
    } else {
      queryBuilder.orderBy('influencer.created_at', 'DESC');
    }

    // 分页
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // 已移除：搜索爬取任务功能

  /**
   * 获取搜索建议
   */
  async getSearchSuggestions(keyword: string): Promise<string[]> {
    if (!keyword || keyword.length < 2) {
      return [];
    }

    const results = await this.authorCoreRepo
      .createQueryBuilder('influencer')
      .select(['influencer.nick_name', 'influencer.author_id'])
      .where('influencer.nick_name ILIKE :keyword', {
        keyword: `%${keyword}%`,
      })
      .limit(10)
      .getMany();

    return results
      .map((item) => item.nick_name || item.author_id)
      .filter(Boolean);
  }

  /**
   * 应用达人过滤器
   */
  private applyInfluencerFilters(
    queryBuilder: SelectQueryBuilder<AuthorCoreView>,
    filters: Record<string, any>,
  ) {
    // 平台过滤（AuthorCoreView 暂无 platform 字段，跳过）
    // if (filters.platform) {
    //   queryBuilder.andWhere('influencer.main_platform = :platform', {
    //     platform: filters.platform,
    //   });
    // }

    // 性别过滤
    if (filters.gender) {
      queryBuilder.andWhere('influencer.gender = :gender', {
        gender: filters.gender,
      });
    }

    // 城市过滤
    if (filters.city) {
      queryBuilder.andWhere('influencer.city = :city', { city: filters.city });
    }

    // 粉丝数范围
    if (filters.followerCountMin !== undefined) {
      queryBuilder.andWhere(
        'CAST(influencer.follower AS BIGINT) >= :followerCountMin',
        {
          followerCountMin: parseInt(filters.followerCountMin.toString()),
        },
      );
    }
    if (filters.followerCountMax !== undefined) {
      queryBuilder.andWhere(
        'CAST(influencer.follower AS BIGINT) <= :followerCountMax',
        {
          followerCountMax: parseInt(filters.followerCountMax.toString()),
        },
      );
    }

    // 互动率范围
    if (filters.engagementRateMin !== undefined) {
      queryBuilder.andWhere(
        'CAST(influencer.interact_rate_within_30d AS DECIMAL) >= :engagementRateMin',
        {
          engagementRateMin: parseFloat(filters.engagementRateMin.toString()),
        },
      );
    }
    if (filters.engagementRateMax !== undefined) {
      queryBuilder.andWhere(
        'CAST(influencer.interact_rate_within_30d AS DECIMAL) <= :engagementRateMax',
        {
          engagementRateMax: parseFloat(filters.engagementRateMax.toString()),
        },
      );
    }

    // 星图指数范围
    if (filters.xingtuIndexMin !== undefined) {
      queryBuilder.andWhere(
        'CAST(influencer.star_index AS DECIMAL) >= :xingtuIndexMin',
        {
          xingtuIndexMin: parseFloat(filters.xingtuIndexMin.toString()),
        },
      );
    }
    if (filters.xingtuIndexMax !== undefined) {
      queryBuilder.andWhere(
        'CAST(influencer.star_index AS DECIMAL) <= :xingtuIndexMax',
        {
          xingtuIndexMax: parseFloat(filters.xingtuIndexMax.toString()),
        },
      );
    }

    // 特殊标识过滤（AuthorCoreView 暂无这些字段，跳过）
    // if (filters.isQuality !== undefined) {
    //   queryBuilder.andWhere('influencer.is_excellent_author = :isQuality', {
    //     isQuality: filters.isQuality,
    //   });
    // }
    // if (filters.isDarkHorse !== undefined) {
    //   queryBuilder.andWhere('influencer.is_black_horse_author = :isDarkHorse', {
    //     isDarkHorse: filters.isDarkHorse,
    //   });
    // }
    // if (filters.isCoCreation !== undefined) {
    //   queryBuilder.andWhere('influencer.is_cocreate_author = :isCoCreation', {
    //     isCoCreation: filters.isCoCreation,
    //   });
    // }

    // 时间范围过滤
    if (filters.createdAtStart) {
      queryBuilder.andWhere('influencer.created_at >= :createdAtStart', {
        createdAtStart: filters.createdAtStart,
      });
    }
    if (filters.createdAtEnd) {
      queryBuilder.andWhere('influencer.created_at <= :createdAtEnd', {
        createdAtEnd: filters.createdAtEnd,
      });
    }
  }

  // 已移除：爬取任务过滤器
}
