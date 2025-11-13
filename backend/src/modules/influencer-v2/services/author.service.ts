import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AuthorCore,
  AuthorFansMetrics,
  AuthorEngagementMetrics,
  AuthorPricing,
  AuthorMarketingIndices,
  AuthorContentTags,
  AuthorEcommerce,
} from '../entities';
import { DATABASE_CONNECTIONS } from '../../../config/database.config';

/**
 * 作者服务 - 使用新的15表结构
 */
@Injectable()
export class AuthorService {
  private readonly logger = new Logger(AuthorService.name);

  constructor(
    @InjectRepository(AuthorCore, DATABASE_CONNECTIONS.CRAWLER)
    private readonly authorCoreRepo: Repository<AuthorCore>,
    
    @InjectRepository(AuthorFansMetrics, DATABASE_CONNECTIONS.CRAWLER)
    private readonly fansMetricsRepo: Repository<AuthorFansMetrics>,
    
    @InjectRepository(AuthorEngagementMetrics, DATABASE_CONNECTIONS.CRAWLER)
    private readonly engagementMetricsRepo: Repository<AuthorEngagementMetrics>,
    
    @InjectRepository(AuthorPricing, DATABASE_CONNECTIONS.CRAWLER)
    private readonly pricingRepo: Repository<AuthorPricing>,
    
    @InjectRepository(AuthorMarketingIndices, DATABASE_CONNECTIONS.CRAWLER)
    private readonly marketingIndicesRepo: Repository<AuthorMarketingIndices>,
    
    @InjectRepository(AuthorContentTags, DATABASE_CONNECTIONS.CRAWLER)
    private readonly contentTagsRepo: Repository<AuthorContentTags>,
    
    @InjectRepository(AuthorEcommerce, DATABASE_CONNECTIONS.CRAWLER)
    private readonly ecommerceRepo: Repository<AuthorEcommerce>,
  ) {}

  /**
   * 获取作者列表
   */
  async findAll(params: {
    page?: number;
    limit?: number;
    keyword?: string;
    minFollowers?: number;
    maxFollowers?: number;
    tags?: string[];
    province?: string;
    city?: string;
  }) {
    const {
      page = 1,
      limit = 20,
      keyword,
      minFollowers,
      maxFollowers,
      tags,
      province,
      city,
    } = params;

    const queryBuilder = this.authorCoreRepo
      .createQueryBuilder('core')
      .leftJoinAndSelect('core.fans_metrics', 'fans')
      .leftJoinAndSelect('core.engagement_metrics', 'engagement')
      .leftJoinAndSelect('core.pricing', 'pricing');

    // 关键词搜索
    if (keyword) {
      queryBuilder.andWhere(
        '(core.nick_name ILIKE :keyword OR core.author_id = :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    // 粉丝数筛选
    if (minFollowers !== undefined) {
      queryBuilder.andWhere('core.follower >= :minFollowers', { minFollowers });
    }
    if (maxFollowers !== undefined) {
      queryBuilder.andWhere('core.follower <= :maxFollowers', { maxFollowers });
    }

    // 地域筛选
    if (province) {
      queryBuilder.andWhere('core.province = :province', { province });
    }
    if (city) {
      queryBuilder.andWhere('core.city = :city', { city });
    }

    // 标签筛选（需要join content_tags表）
    if (tags && tags.length > 0) {
      queryBuilder
        .innerJoin('authors_content_tags', 'tags', 'tags.author_id = core.author_id')
        .andWhere('tags.primary_tags && :tags', { tags });
    }

    // 排序
    queryBuilder.orderBy('core.follower', 'DESC');

    // 分页
    const total = await queryBuilder.getCount();
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const data = await queryBuilder.getMany();

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 获取作者详情（包含所有关联数据）
   */
  async findOne(authorId: string) {
    const author = await this.authorCoreRepo.findOne({
      where: { author_id: authorId },
      relations: ['fans_metrics', 'engagement_metrics', 'pricing'],
    });

    if (!author) {
      throw new NotFoundException(`作者 ${authorId} 不存在`);
    }

    // 获取营销指数
    const marketingIndices = await this.marketingIndicesRepo.findOne({
      where: { author_id: authorId },
    });

    // 获取标签
    const contentTags = await this.contentTagsRepo.findOne({
      where: { author_id: authorId },
    });

    // 获取电商数据
    const ecommerce = await this.ecommerceRepo.findOne({
      where: { author_id: authorId },
    });

    return {
      ...author,
      marketing_indices: marketingIndices,
      content_tags: contentTags,
      ecommerce,
    };
  }

  /**
   * 按标签查询作者
   */
  async findByTags(tags: string[], page = 1, limit = 20) {
    const queryBuilder = this.contentTagsRepo
      .createQueryBuilder('tags')
      .innerJoinAndSelect('authors_core', 'core', 'core.author_id = tags.author_id')
      .where('tags.primary_tags && :tags', { tags });

    const total = await queryBuilder.getCount();
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const results = await queryBuilder.getRawMany();

    return {
      data: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 获取活跃创作者
   */
  async findActiveCreators(page = 1, limit = 20) {
    const queryBuilder = this.authorCoreRepo
      .createQueryBuilder('core')
      .innerJoin('authors_star_videos_90d', 'videos', 'videos.author_id = core.author_id')
      .where('videos.is_active_creator = true')
      .orderBy('core.follower', 'DESC');

    const total = await queryBuilder.getCount();
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const data = await queryBuilder.getMany();

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 获取新星达人
   */
  async findRisingStars(page = 1, limit = 20) {
    const queryBuilder = this.authorCoreRepo
      .createQueryBuilder('core')
      .innerJoin('authors_fans_metrics', 'fans', 'fans.author_id = core.author_id')
      .where('fans.is_rising_star = true')
      .orderBy('fans.fans_increment_rate_30d', 'DESC');

    const total = await queryBuilder.getCount();
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const data = await queryBuilder.getMany();

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 按价格区间查询
   */
  async findByPriceRange(
    minPrice: number,
    maxPrice: number,
    page = 1,
    limit = 20,
  ) {
    const queryBuilder = this.authorCoreRepo
      .createQueryBuilder('core')
      .innerJoin('authors_pricing', 'pricing', 'pricing.author_id = core.author_id')
      .where('pricing.price_20_60 BETWEEN :minPrice AND :maxPrice', {
        minPrice,
        maxPrice,
      })
      .orderBy('pricing.price_20_60', 'ASC');

    const total = await queryBuilder.getCount();
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const data = await queryBuilder.getMany();

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 获取统计数据
   */
  async getStatistics() {
    // 总数统计
    const totalCount = await this.authorCoreRepo.count();

    // 粉丝数分布
    const followerDistribution = await this.authorCoreRepo
      .createQueryBuilder('core')
      .select(
        `CASE 
          WHEN core.follower >= 10000000 THEN '1000万+'
          WHEN core.follower >= 1000000 THEN '100万-1000万'
          WHEN core.follower >= 100000 THEN '10万-100万'
          WHEN core.follower >= 10000 THEN '1万-10万'
          ELSE '1万以下'
        END`,
        'range',
      )
      .addSelect('COUNT(*)', 'count')
      .groupBy('range')
      .getRawMany();

    // 增长等级分布
    const growthLevelDistribution = await this.fansMetricsRepo
      .createQueryBuilder('fans')
      .select('fans.growth_level', 'level')
      .addSelect('COUNT(*)', 'count')
      .where('fans.growth_level IS NOT NULL')
      .groupBy('fans.growth_level')
      .getRawMany();

    // 价格等级分布
    const priceTierDistribution = await this.pricingRepo
      .createQueryBuilder('pricing')
      .select('pricing.price_tier', 'tier')
      .addSelect('COUNT(*)', 'count')
      .where('pricing.price_tier IS NOT NULL')
      .groupBy('pricing.price_tier')
      .getRawMany();

    // 营销等级分布
    const marketingTierDistribution = await this.marketingIndicesRepo
      .createQueryBuilder('marketing')
      .select('marketing.marketing_tier', 'tier')
      .addSelect('COUNT(*)', 'count')
      .where('marketing.marketing_tier IS NOT NULL')
      .groupBy('marketing.marketing_tier')
      .getRawMany();

    // 电商开通率
    const ecommerceStats = await this.ecommerceRepo
      .createQueryBuilder('ecommerce')
      .select('ecommerce.e_commerce_enable', 'enabled')
      .addSelect('COUNT(*)', 'count')
      .groupBy('ecommerce.e_commerce_enable')
      .getRawMany();

    return {
      totalCount,
      followerDistribution,
      growthLevelDistribution,
      priceTierDistribution,
      marketingTierDistribution,
      ecommerceStats,
    };
  }
}
