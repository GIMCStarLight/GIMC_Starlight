import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { AuthorCoreView } from '../entities/author-core.view';
import { AuthorFansMetrics } from '../entities/author-fans-metrics.entity';
import { KolList, MatchStatus } from '../../../database/entities/kol-list.entity';
import { InfluencerQueryDto } from '../dto/influencer-query.dto';
import {
  ExtraDataDto,
  InfluencerBasicDto,
  InfluencerDetailDto,
  InfluencerListResponseDto,
  InfluencerDetailResponseDto,
  PaginationDto,
  TaskPriceDto,
} from '../dto/influencer-response.dto';

@Injectable()
export class InfluencerV2Service {
  private readonly logger = new Logger(InfluencerV2Service.name);

  constructor(
    @InjectRepository(AuthorCoreView, 'crawler')
    private readonly authorCoreRepository: Repository<AuthorCoreView>,
    @InjectRepository(AuthorFansMetrics, 'crawler')
    private readonly authorFansMetricsRepository: Repository<AuthorFansMetrics>,
    @InjectRepository(KolList, 'postgres')
    private readonly kolListRepo: Repository<KolList>,
  ) {}

  async getInfluencerList(
    query: InfluencerQueryDto,
  ): Promise<InfluencerListResponseDto> {
    try {
      const queryBuilder = this.createBaseQueryBuilder();

      // 应用过滤条件
      this.applyFilters(queryBuilder, query);

      // 应用排序
      this.applySorting(queryBuilder, query);

      // 计算总数
      const total = await queryBuilder.getCount();

      // 应用分页
      const offset = (query.page - 1) * query.limit;
      queryBuilder.skip(offset).take(query.limit);

      // 执行查询
      const results = await queryBuilder.getMany();

      // 转换为DTO
      const data = results.map((item) => this.mapToBasicDto(item));

      // 构建分页信息
      const pagination: PaginationDto = {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      };

      return {
        data,
        pagination,
      };
    } catch (error) {
      this.logger.error('获取影响者列表失败', error);
      throw error;
    }
  }

  async getInfluencerDetail(
    authorId: string,
  ): Promise<InfluencerDetailResponseDto> {
    try {
      const result = await this.authorCoreRepository.findOne({
        where: { author_id: authorId },
      });

      if (!result) {
        throw new Error('影响者不存在');
      }

      const data = this.mapToDetailDto(result);

      return {
        data,
      };
    } catch (error) {
      this.logger.error('获取影响者详情失败', error);
      throw error;
    }
  }

  /**
   * 获取达人完整原始数据（123个字段）
   * @param authorId 达人ID
   */
  async getInfluencerFullData(authorId: string): Promise<{
    data: Record<string, any>;
  }> {
    try {
      // 查询公海原始数据
      const result = await this.authorCoreRepository.query(
        'SELECT raw_attribute_datas FROM authors_raw_archive WHERE author_id = $1 ORDER BY created_at DESC LIMIT 1',
        [authorId]
      );

      if (!result || result.length === 0) {
        throw new Error('达人原始数据不存在');
      }

      const publicData = result[0].raw_attribute_datas || {};

      // 查询粉丝增长指标数据（获取30天增长率）
      const fansMetrics = await this.authorFansMetricsRepository.findOne({
        where: { author_id: authorId }
      });

      // 查询私域数据（如果已匹配）
      const kolRecord = await this.kolListRepo.findOne({
        where: {
          matched_author_id: authorId,
          match_status: MatchStatus.MATCHED,
          platform: '抖音',
        },
      });

      // 构建基础数据
      const baseData = {
        ...publicData,
        // 添加30天增长率数据（如果存在）
        fans_increment_rate_within_30d: String(fansMetrics?.fans_increment_rate_30d || 0),
        fans_increment_within_30d: String(fansMetrics?.fans_increment_30d || 0),
      };

      // 合并私域字段
      if (kolRecord) {
        return {
          data: {
            ...baseData,
            // 私域标识
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
          },
        };
      }

      return {
        data: {
          ...baseData,
          is_matched: false,
        },
      };
    } catch (error) {
      this.logger.error('获取达人完整数据失败', error);
      throw error;
    }
  }

  async getInfluencerStatistics(): Promise<{
    genderStats: { gender: string; count: number }[];
    authorTypeStats: { type: string; count: number }[];
    tierStats: { tier: string; count: number }[];
    totalCount: number;
  }> {
    try {
      // 获取性别统计
      type GenderRow = { gender: string | null; count: string };
      const genderStats = await this.authorCoreRepository
        .createQueryBuilder('author')
        .select('author.gender', 'gender')
        .addSelect('COUNT(*)', 'count')
        .groupBy('author.gender')
        .getRawMany<GenderRow>();

      // 获取作者类型统计
      type AuthorTypeRow = { type: string | null; count: string };
      const authorTypeStats = await this.authorCoreRepository
        .createQueryBuilder('author')
        .select('author.author_type', 'type')
        .addSelect('COUNT(*)', 'count')
        .groupBy('author.author_type')
        .getRawMany<AuthorTypeRow>();

      // 获取影响力等级统计
      type TierRow = { tier: string; count: string };
      const tierStats = await this.authorCoreRepository
        .createQueryBuilder('author')
        .select(
          `CASE 
            WHEN author.follower >= 10000000 THEN 'mega'
            WHEN author.follower >= 1000000 THEN 'macro'
            WHEN author.follower >= 100000 THEN 'micro'
            ELSE 'nano'
          END`,
          'tier',
        )
        .addSelect('COUNT(*)', 'count')
        .groupBy(
          `CASE 
            WHEN author.follower >= 10000000 THEN 'mega'
            WHEN author.follower >= 1000000 THEN 'macro'
            WHEN author.follower >= 100000 THEN 'micro'
            ELSE 'nano'
          END`,
        )
        .getRawMany<TierRow>();

      // 获取总数
      const totalCount = await this.authorCoreRepository.count();

      return {
        genderStats: genderStats.map((item) => ({
          gender: item.gender ?? '未知',
          count: Number(item.count),
        })),
        authorTypeStats: authorTypeStats.map((item) => ({
          type: item.type ?? '未知',
          count: Number(item.count),
        })),
        tierStats: tierStats.map((item) => ({
          tier: item.tier,
          count: Number(item.count),
        })),
        totalCount,
      };
    } catch (error) {
      this.logger.error('获取影响者统计失败', error);
      throw error;
    }
  }

  private createBaseQueryBuilder(): SelectQueryBuilder<AuthorCoreView> {
    return this.authorCoreRepository.createQueryBuilder('author');
  }

  private applyFilters(
    queryBuilder: SelectQueryBuilder<AuthorCoreView>,
    query: InfluencerQueryDto,
  ): void {
    // 关键词：对昵称或星图ID模糊查询
    if (query.keyword) {
      queryBuilder.andWhere(
        '(author.nick_name ILIKE :kw OR author.star_id ILIKE :kw)',
        { kw: `%${query.keyword}%` },
      );
    }

    // 性别筛选
    if (query.gender !== undefined) {
      queryBuilder.andWhere('author.gender = :gender', {
        gender: query.gender,
      });
    }

    // 达人类型筛选
    if (query.authorType !== undefined) {
      queryBuilder.andWhere('author.author_type = :authorType', {
        authorType: query.authorType,
      });
    }

    // 城市筛选
    if (query.city) {
      queryBuilder.andWhere('author.city ILIKE :city', {
        city: `%${query.city}%`,
      });
    }

    // 省份筛选
    if (query.province) {
      queryBuilder.andWhere('author.province ILIKE :province', {
        province: `%${query.province}%`,
      });
    }

    // 标签筛选
    if (query.tagIds) {
      const tagIdArray = query.tagIds
        .split(',')
        .map((id) => parseInt(id.trim(), 10))
        .filter((id) => !isNaN(id));
      if (tagIdArray.length > 0) {
        // 使用tags_relation字段进行标签筛选
        // tags_relation字段存储的是JSON格式的标签关系数据
        const tagConditions = tagIdArray
          .map((_, index) => `author.tags_relation::text LIKE :tagId${index}`)
          .join(' OR ');

        if (tagConditions) {
          queryBuilder.andWhere(
            `(${tagConditions})`,
            tagIdArray.reduce(
              (params, tagId, index) => {
                params[`tagId${index}`] = `%"${tagId}"%`;
                return params;
              },
              {} as Record<string, string>,
            ),
          );
        }
      }
    }

    // 粉丝区间
    if (query.minFollowers !== undefined) {
      queryBuilder.andWhere('author.follower >= :minFollowers', {
        minFollowers: query.minFollowers,
      });
    }

    if (query.maxFollowers !== undefined) {
      queryBuilder.andWhere('author.follower <= :maxFollowers', {
        maxFollowers: query.maxFollowers,
      });
    }

    // 互动率（映射为近30天互动率）
    if (query.minEngagementRate !== undefined) {
      queryBuilder.andWhere(
        'author.interact_rate_within_30d >= :minEngagementRate',
        { minEngagementRate: query.minEngagementRate },
      );
    }
    if (query.maxEngagementRate !== undefined) {
      queryBuilder.andWhere(
        'author.interact_rate_within_30d <= :maxEngagementRate',
        { maxEngagementRate: query.maxEngagementRate },
      );
    }
  }

  private applySorting(
    queryBuilder: SelectQueryBuilder<AuthorCoreView>,
    query: InfluencerQueryDto,
  ): void {
    const { sortBy = 'follower', sortOrder = 'DESC' } = query;

    // 兼容映射：将旧字段名映射到视图列
    const sortFieldMap: Record<string, string> = {
      follower_count: 'follower',
      engagement_rate: 'interact_rate_within_30d',
      created_at: 'updated_at',
      updated_at: 'updated_at',
      follower: 'follower',
      nick_name: 'nick_name',
      interact_rate_within_30d: 'interact_rate_within_30d',
      vv_median_30d: 'vv_median_30d',
      promotion_prospective_vv: 'promotion_prospective_vv',
      star_index: 'link_star_index',
      price_1_20: 'price_1_20',
    };

    const mapped = sortFieldMap[sortBy] ?? 'follower';
    queryBuilder.orderBy(`author.${mapped}`, sortOrder);
  }

  /**
   * 将可能为字符串(bigint)或数值的字段安全地转换为number。
   * 对于null/undefined或NaN的情况，回退为0以满足DTO的number类型要求。
   */
  private toNumber(val: unknown): number {
    if (val === null || val === undefined) return 0;
    const n = Number(val);
    return Number.isNaN(n) ? 0 : n;
  }

  private mapToBasicDto(author: AuthorCoreView): InfluencerBasicDto {
    const dto: InfluencerBasicDto = {
      authorId: author.author_id,
      starId: author.star_id,
      nickName: author.nick_name,
      avatarUri: author.avatar_uri,
      follower: this.toNumber(author.follower),
      authorType: String(author.author_type || 'individual'),
      gender: String(author.gender || 0),
      city: author.city || '',
      province: author.province || '',
      starIndex: this.toNumber(author.link_star_index),
      price_1_20: this.toNumber(author.price_1_20),
      price_20_60: this.toNumber(author.price_20_60),
      price_60: this.toNumber(author.price_60),
      vv_median_30d: this.toNumber(author.vv_median_30d),
      interact_rate_within_30d: this.toNumber(author.interact_rate_within_30d),
      star_video_cnt_90d: 0,
      eCommerceEnable: Boolean(author.e_commerce_enable),
      isExcellentAuthor: Boolean(author.star_excellent_author),
      isBlackHorseAuthor: Boolean(author.is_black_horse_author),
      isCocreateAuthor: Boolean(author.is_cocreate_author),
      isShortDrama: Boolean(author.is_short_drama),
      createdAt: author.updated_at,
      influencerTier: author.influencer_tier,
      location: author.location,
      updatedAt: author.updated_at,
    };
    return dto;
  }

  private mapToDetailDto(author: AuthorCoreView): InfluencerDetailDto {
    const dto: InfluencerDetailDto = {
      ...this.mapToBasicDto(author),
      price1To20: this.toNumber(author.price_1_20),
      price20To60: this.toNumber(author.price_20_60),
      price60Plus: this.toNumber(author.price_60),
      unifiedTaskPriceList: author.unified_task_price_list as
        | TaskPriceDto[]
        | null,
      extra: author.extra as ExtraDataDto | null,
    };
    return dto;
  }
}
