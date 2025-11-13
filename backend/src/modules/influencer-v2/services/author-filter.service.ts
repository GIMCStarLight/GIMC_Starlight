import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { MvAuthorsCombined } from '../entities';
import { KolList, MatchStatus } from '../../../database/entities/kol-list.entity';
import { AuthorFilterQueryDto } from '../dto/advanced-filter.dto';
import { FilterQueryBuilder } from './filter-query.builder';
import { DATABASE_CONNECTIONS } from '../../../config/database.config';

/**
 * 高级筛选服务
 * 使用物化视图 mv_authors_combined 和 Redis缓存
 * 提供极致性能的筛选查询
 */
@Injectable()
export class AuthorFilterService {
  private readonly logger = new Logger(AuthorFilterService.name);

  // 缓存TTL配置
  private readonly CACHE_TTL_HOT = 300; // 热门筛选 5分钟
  private readonly CACHE_TTL_NORMAL = 60; // 普通筛选 1分钟
  private readonly CACHE_TTL_COUNT = 600; // 计数缓存 10分钟

  constructor(
    @InjectRepository(MvAuthorsCombined, DATABASE_CONNECTIONS.CRAWLER)
    private readonly mvAuthorsRepo: Repository<MvAuthorsCombined>,

    @InjectRepository(KolList, DATABASE_CONNECTIONS.POSTGRES)
    private readonly kolListRepo: Repository<KolList>,

    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,

    private readonly filterBuilder: FilterQueryBuilder,
  ) {}

  /**
   * 高级筛选查询
   * 核心方法 - 支持所有筛选维度
   */
  async advancedFilter(filters: AuthorFilterQueryDto) {
    const startTime = Date.now();
    const {
      page = 1,
      limit = 20,
      sortBy = 'follower',
      sortOrder = 'DESC',
      ...filterParams
    } = filters;

    // 生成缓存键
    const cacheKey = this.filterBuilder.generateCacheKey(filters);
    const isHot = this.filterBuilder.isHotFilter(filters);
    const cacheTTL = isHot ? this.CACHE_TTL_HOT : this.CACHE_TTL_NORMAL;

    // 尝试从缓存获取
    try {
      const cached = await this.cacheManager.get<any>(cacheKey);
      if (cached) {
        this.logger.debug(`缓存命中: ${cacheKey}`);
        return {
          ...cached,
          fromCache: true,
          queryTime: Date.now() - startTime,
        };
      }
    } catch (error) {
      this.logger.warn(`缓存读取失败: ${error.message}`);
    }

    // 构建查询 - 选择所有需要的字段
    const queryBuilder = this.mvAuthorsRepo
      .createQueryBuilder('mv')
      .select([
        // 核心信息
        'mv.author_id',
        'mv.star_id',
        'mv.nick_name',
        'mv.avatar_uri',
        'mv.city',
        'mv.province',
        'mv.gender',
        'mv.author_type',
        
        // 认证标签
        'mv.star_excellent_author',
        'mv.is_black_horse_author',
        'mv.star_qianchuan_high_potential',
        'mv.is_short_drama',
        'mv.is_rising_star',
        'mv.is_cocreate_author',
        'mv.is_cpm_project_author',
        'mv.is_ad_star_cur_high_quality_author',
        
        // 计算字段(快速筛选用)
        'mv.growth_level',
        'mv.quality_tier',
        'mv.engagement_score',
        'mv.price_tier',
        'mv.cpm_efficiency',
        
        // 粉丝指标
        'mv.follower',
        'mv.fans_increment_30d',
        'mv.fans_increment_rate_30d',
        'mv.fans_increment_15d',
        'mv.fans_increment_rate_15d',
        
        // 互动指标
        'mv.interact_rate_30d',
        'mv.play_over_rate_30d',
        'mv.vv_median_30d',
        'mv.interaction_median_30d',
        'mv.sn_interact_rate_30d',
        'mv.sn_play_over_rate_30d',
        
        // 价格指标
        'mv.price_1_20',
        'mv.price_20_60',
        'mv.price_60',
        'mv.expected_play_num',
        'mv.assign_cpm_suggest_price',
        'mv.promotion_prospective_20_60_cpm',
        'mv.sn_prospective_20_60_cpe',
        
        // 营销指数
        'mv.link_convert_index',
        'mv.link_shopping_index',
        'mv.link_spread_index',
        'mv.star_index',  // 星图指数
        
        // 电商能力
        'mv.e_commerce_enable',
        'mv.author_ecom_level',
        'mv.star_ecom_video_num_30d',
        'mv.gmv_30d',
        'mv.ecom_capability_tier',
        'mv.is_ecom_active',
        
        // 内容标签
        'mv.primary_tags',
        'mv.primary_themes',
        'mv.tag_count',
        
        // 时间戳
        'mv.updated_at',
        'mv.last_crawled_at',
      ]);

    // 处理“仅展示已匹配”筛选
    if (filters.matchedOnly) {
      this.logger.log('🔗 应用已匹配筛选条件');
      
      // 查询所有已匹配的 author_id
      const matchedRecords = await this.kolListRepo
        .createQueryBuilder('kol')
        .select('kol.matched_author_id', 'matched_author_id')
        .where('kol.match_status = :status', { status: MatchStatus.MATCHED })
        .andWhere('kol.platform = :platform', { platform: '抖音' })
        .andWhere('kol.matched_author_id IS NOT NULL')
        .andWhere("kol.matched_author_id <> ''")
        .getRawMany();
      
      const matchedAuthorIds = matchedRecords.map(r => r.matched_author_id).filter(id => id);
      
      this.logger.log(`🔗 找到 ${matchedAuthorIds.length} 个已匹配的达人ID`);
      
      if (matchedAuthorIds.length > 0) {
        queryBuilder.andWhere('mv.author_id IN (:...matchedAuthorIds)', { matchedAuthorIds });
      } else {
        // 没有匹配数据，返回空结果
        this.logger.log('🔗 没有已匹配的达人，返回空结果');
        return {
          data: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
          },
          performance: {
            countTime: 0,
            dataTime: 0,
            totalTime: Date.now() - startTime,
          },
          fromCache: false,
        };
      }
    }

    // 应用筛选条件
    this.filterBuilder.buildFilters(queryBuilder, filterParams as any);

    // 应用排序
    this.filterBuilder.buildSorting(queryBuilder, sortBy, sortOrder);

    // 执行查询 - 先获取总数
    const countStartTime = Date.now();
    const total = await queryBuilder.getCount();
    const countTime = Date.now() - countStartTime;

    // 应用分页
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // 执行查询
    const dataStartTime = Date.now();
    const data = await queryBuilder.getMany();
    const dataTime = Date.now() - dataStartTime;

    // 合并私域数据（如果有已匹配达人）
    const enrichedData = await this.enrichWithKolData(data);

    const result = {
      data: enrichedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      performance: {
        countTime,
        dataTime,
        totalTime: Date.now() - startTime,
      },
    };

    // 写入缓存
    try {
      await this.cacheManager.set(cacheKey, result, cacheTTL * 1000);
      this.logger.debug(`缓存写入: ${cacheKey}, TTL: ${cacheTTL}s`);
    } catch (error) {
      this.logger.warn(`缓存写入失败: ${error.message}`);
    }

    return {
      ...result,
      fromCache: false,
    };
  }

  /**
   * 快速筛选 - 专门优化的快捷方法
   * 只支持快速筛选维度,性能最优
   */
  async quickFilter(params: {
    qualityTier?: string;
    growthLevel?: string;
    priceTier?: string;
    influencerTier?: string;
    primaryTags?: string[];
    page?: number;
    limit?: number;
  }) {
    return this.advancedFilter(params as AuthorFilterQueryDto);
  }

  /**
   * 获取筛选结果统计
   * 返回当前筛选条件下的各维度分布
   */
  async getFilterStatistics(filters: Omit<AuthorFilterQueryDto, 'page' | 'limit'>) {
    const cacheKey = `filter_stats:${this.filterBuilder.generateCacheKey(filters as any)}`;

    // 尝试从缓存获取
    try {
      const cached = await this.cacheManager.get<any>(cacheKey);
      if (cached) {
        return { ...cached, fromCache: true };
      }
    } catch (error) {
      this.logger.warn(`统计缓存读取失败: ${error.message}`);
    }

    // 构建基础查询
    const queryBuilder = this.mvAuthorsRepo.createQueryBuilder('mv');
    this.filterBuilder.buildFilters(queryBuilder, filters as any);

    // 并发执行多个统计查询
    const [
      totalCount,
      qualityDistribution,
      growthDistribution,
      priceDistribution,
      followerDistribution,
      ecomDistribution,
    ] = await Promise.all([
      // 总数
      queryBuilder.getCount(),

      // 质量分层分布
      this.mvAuthorsRepo
        .createQueryBuilder('mv')
        .select('mv.quality_tier', 'tier')
        .addSelect('COUNT(*)', 'count')
        .where((qb) => {
          const subQuery = qb.subQuery().from(MvAuthorsCombined, 'sub');
          this.filterBuilder.buildFilters(subQuery, filters as any);
          return `mv.author_id IN ${subQuery.select('sub.author_id').getQuery()}`;
        })
        .groupBy('mv.quality_tier')
        .getRawMany(),

      // 增长分层分布
      this.mvAuthorsRepo
        .createQueryBuilder('mv')
        .select('mv.growth_level', 'level')
        .addSelect('COUNT(*)', 'count')
        .where((qb) => {
          const subQuery = qb.subQuery().from(MvAuthorsCombined, 'sub');
          this.filterBuilder.buildFilters(subQuery, filters as any);
          return `mv.author_id IN ${subQuery.select('sub.author_id').getQuery()}`;
        })
        .groupBy('mv.growth_level')
        .getRawMany(),

      // 价格分层分布
      this.mvAuthorsRepo
        .createQueryBuilder('mv')
        .select('mv.price_tier', 'tier')
        .addSelect('COUNT(*)', 'count')
        .where((qb) => {
          const subQuery = qb.subQuery().from(MvAuthorsCombined, 'sub');
          this.filterBuilder.buildFilters(subQuery, filters as any);
          return `mv.author_id IN ${subQuery.select('sub.author_id').getQuery()}`;
        })
        .groupBy('mv.price_tier')
        .getRawMany(),

      // 粉丝数分布
      this.mvAuthorsRepo
        .createQueryBuilder('mv')
        .select(
          `CASE 
            WHEN mv.follower >= 10000000 THEN 'mega'
            WHEN mv.follower >= 1000000 THEN 'macro'
            WHEN mv.follower >= 100000 THEN 'mid'
            WHEN mv.follower >= 10000 THEN 'micro'
            ELSE 'nano'
          END`,
          'tier',
        )
        .addSelect('COUNT(*)', 'count')
        .where((qb) => {
          const subQuery = qb.subQuery().from(MvAuthorsCombined, 'sub');
          this.filterBuilder.buildFilters(subQuery, filters as any);
          return `mv.author_id IN ${subQuery.select('sub.author_id').getQuery()}`;
        })
        .groupBy('tier')
        .getRawMany(),

      // 电商能力分布
      this.mvAuthorsRepo
        .createQueryBuilder('mv')
        .select('mv.ecom_capability_tier', 'tier')
        .addSelect('COUNT(*)', 'count')
        .where((qb) => {
          const subQuery = qb.subQuery().from(MvAuthorsCombined, 'sub');
          this.filterBuilder.buildFilters(subQuery, filters as any);
          return `mv.author_id IN ${subQuery.select('sub.author_id').getQuery()}`;
        })
        .groupBy('mv.ecom_capability_tier')
        .getRawMany(),
    ]);

    const stats = {
      totalCount,
      qualityDistribution,
      growthDistribution,
      priceDistribution,
      followerDistribution,
      ecomDistribution,
    };

    // 写入缓存
    try {
      await this.cacheManager.set(cacheKey, stats, this.CACHE_TTL_COUNT * 1000);
    } catch (error) {
      this.logger.warn(`统计缓存写入失败: ${error.message}`);
    }

    return { ...stats, fromCache: false };
  }

  /**
   * 刷新物化视图
   * 应该由定时任务调用
   */
  async refreshMaterializedView(): Promise<void> {
    const startTime = Date.now();
    
    try {
      await this.mvAuthorsRepo.query('SELECT refresh_authors_combined_mv()');
      
      const duration = Date.now() - startTime;
      this.logger.log(`物化视图刷新成功, 耗时: ${duration}ms`);
      
      // 清空筛选相关缓存
      try {
        // 清空所有筛选缓存（使用模式匹配）
        const cacheKeys = await this.getCacheKeysByPattern('author_filter:*');
        if (cacheKeys.length > 0) {
          await Promise.all(cacheKeys.map(key => this.cacheManager.del(key)));
          this.logger.log(`已清空 ${cacheKeys.length} 个筛选缓存`);
        }
        
        // 清空统计缓存
        const statsKeys = await this.getCacheKeysByPattern('filter_stats:*');
        if (statsKeys.length > 0) {
          await Promise.all(statsKeys.map(key => this.cacheManager.del(key)));
          this.logger.log(`已清空 ${statsKeys.length} 个统计缓存`);
        }
        
        // 清空热门标签缓存
        const tagKeys = await this.getCacheKeysByPattern('popular_tags:*');
        if (tagKeys.length > 0) {
          await Promise.all(tagKeys.map(key => this.cacheManager.del(key)));
          this.logger.log(`已清空 ${tagKeys.length} 个标签缓存`);
        }
      } catch (cacheError) {
        this.logger.warn(`清空缓存失败: ${cacheError.message}`);
      }
      
    } catch (error) {
      this.logger.error(`物化视图刷新失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 根据模式获取缓存键
   * @private
   */
  private async getCacheKeysByPattern(pattern: string): Promise<string[]> {
    try {
      // 注意：cache-manager 默认不支持模式匹配
      // 这里返回空数组，实际使用时需要直接操作 Redis
      // 或者在刷新后让缓存自然过期
      return [];
    } catch (error) {
      this.logger.warn(`获取缓存键失败: ${error.message}`);
      return [];
    }
  }

  /**
   * 获取热门标签
   * 用于标签筛选的快捷按钮
   */
  async getPopularTags(limit = 20): Promise<{ tag: string; count: number }[]> {
    const cacheKey = `popular_tags:${limit}`;

    try {
      const cached = await this.cacheManager.get<any>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch (error) {
      this.logger.warn(`热门标签缓存读取失败: ${error.message}`);
    }

    // 使用原生SQL查询
    const result = await this.mvAuthorsRepo.query(`
      SELECT 
        unnest(primary_tags) AS tag,
        COUNT(*) AS count
      FROM mv_authors_combined
      WHERE primary_tags IS NOT NULL
      GROUP BY tag
      ORDER BY count DESC
      LIMIT $1
    `, [limit]);

    try {
      await this.cacheManager.set(cacheKey, result, this.CACHE_TTL_HOT * 1000);
    } catch (error) {
      this.logger.warn(`热门标签缓存写入失败: ${error.message}`);
    }

    return result;
  }

  /**
   * 合并公海与私域数据
   * 为已匹配的达人添加 kol_list 中的私域字段
   * @private
   */
  private async enrichWithKolData(authors: MvAuthorsCombined[]): Promise<any[]> {
    if (!authors || authors.length === 0) {
      return [];
    }

    // 提取所有 author_id
    const authorIds = authors.map(a => a.author_id);

    // 批量查询已匹配的 KOL 记录
    const kolRecords = await this.kolListRepo.find({
      where: {
        matched_author_id: In(authorIds),
        match_status: MatchStatus.MATCHED,
        platform: '抖音',
      },
      select: [
        'matched_author_id',
        'org_name',
        'category',
        'is_exclusive',
        'rebate_policy',
        'rebate_range',
        'policy_level',
        'rebate_period',
        'pay_period',
        'cooperation_degree',
        'cooperation_intro',
        'contact_info',
        'remark',
        'annual_contract_org',
        'match_status',
        'matched_at',
        'star_quote_21_60s',
        'star_quote_60s_plus',
      ],
    });

    // 创建 author_id 到 kol 记录的映射
    const kolMap = new Map<string, any>();
    kolRecords.forEach(kol => {
      if (kol.matched_author_id) {
        kolMap.set(kol.matched_author_id, kol);
      }
    });

    this.logger.debug(`🔗 批量查询: ${authors.length} 个达人，找到 ${kolRecords.length} 个匹配记录`);

    // 合并数据
    return authors.map(author => {
      const kolRecord = kolMap.get(author.author_id);
      
      if (!kolRecord) {
        // 未匹配达人，只返回公海数据
        return {
          ...author,
          is_matched: false,
        };
      }

      // 已匹配达人，合并私域数据
      return {
        ...author,
        // 匹配标识
        is_matched: true,
        match_status: kolRecord.match_status,
        matched_at: kolRecord.matched_at,
        
        // 私域独有字段
        org_name: kolRecord.org_name,
        category: kolRecord.category,
        is_exclusive: kolRecord.is_exclusive,
        rebate_policy: kolRecord.rebate_policy,
        rebate_range: kolRecord.rebate_range,
        policy_level: kolRecord.policy_level,
        rebate_period: kolRecord.rebate_period,
        pay_period: kolRecord.pay_period,
        cooperation_degree: kolRecord.cooperation_degree,
        cooperation_intro: kolRecord.cooperation_intro,
        contact_info: kolRecord.contact_info,
        remark: kolRecord.remark,
        annual_contract_org: kolRecord.annual_contract_org,
        
        // 价格合并（公海优先，缺失时补充私域）
        price_20_60: author.price_20_60 || Number(kolRecord.star_quote_21_60s) || 0,
        price_60: author.price_60 || Number(kolRecord.star_quote_60s_plus) || 0,
      };
    });
  }
}
