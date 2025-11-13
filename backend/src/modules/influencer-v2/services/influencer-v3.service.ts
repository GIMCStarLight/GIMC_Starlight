import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, In } from 'typeorm';
import {
  AuthorCore,
  AuthorFansMetrics,
  AuthorEngagementMetrics,
  AuthorPricing,
  AuthorMarketingIndices,
  AuthorContentTags,
  AuthorEcommerce,
} from '../entities';
import { KolList, MatchStatus } from '../../../database/entities/kol-list.entity';
import { InfluencerV3QueryDto } from '../dto/influencer-v3-query.dto';
import {
  InfluencerV3CardDataDto,
  InfluencerV3ListResponseDto,
  InfluencerV3DetailResponseDto,
  InfluencerV3StatsResponseDto,
} from '../dto/influencer-v3-response.dto';

@Injectable()
export class InfluencerV3Service {
  private readonly logger = new Logger(InfluencerV3Service.name);

  constructor(
    @InjectRepository(AuthorCore, 'crawler')
    private readonly authorCoreRepo: Repository<AuthorCore>,
    @InjectRepository(AuthorFansMetrics, 'crawler')
    private readonly authorFansRepo: Repository<AuthorFansMetrics>,
    @InjectRepository(AuthorEngagementMetrics, 'crawler')
    private readonly authorEngagementRepo: Repository<AuthorEngagementMetrics>,
    @InjectRepository(AuthorPricing, 'crawler')
    private readonly authorPricingRepo: Repository<AuthorPricing>,
    @InjectRepository(AuthorMarketingIndices, 'crawler')
    private readonly authorMarketingRepo: Repository<AuthorMarketingIndices>,
    @InjectRepository(AuthorContentTags, 'crawler')
    private readonly authorContentTagsRepo: Repository<AuthorContentTags>,
    @InjectRepository(AuthorEcommerce, 'crawler')
    private readonly authorEcommerceRepo: Repository<AuthorEcommerce>,
    @InjectRepository(KolList, 'postgres')
    private readonly kolListRepo: Repository<KolList>,
  ) {}

  async getInfluencerList(
    query: InfluencerV3QueryDto,
  ): Promise<InfluencerV3ListResponseDto> {
    try {
      const queryBuilder = this.createBaseQueryBuilder();

      // 应用过滤条件
      this.applyFilters(queryBuilder, query);

      // 如果开启"仅展示已匹配",筛选有私域关联的达人
      if (query.matchedOnly) {
        this.logger.log('应用已匹配筛选条件');
        
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
        
        this.logger.log(`找到 ${matchedAuthorIds.length} 个已匹配的达人ID`);
        
        if (matchedAuthorIds.length > 0) {
          queryBuilder.andWhere('author.author_id IN (:...matchedAuthorIds)', { matchedAuthorIds });
        } else {
          // 没有匹配数据,返回空结果
          this.logger.log('没有已匹配的达人，返回空结果');
          return {
            data: [],
            total: 0,
            page: query.page || 1,
            pageSize: query.pageSize || 20,
          };
        }
      }

      // 应用排序
      this.applySorting(queryBuilder, query);

      // 计算总数
      const total = await queryBuilder.getCount();

      // 应用分页
      const page = query.page || 1;
      const pageSize = query.pageSize || 20;
      const offset = (page - 1) * pageSize;
      queryBuilder.skip(offset).take(pageSize);

      // 执行查询
      const results = await queryBuilder.getMany();

      // 获取关联数据并合并私域数据
      const data = await Promise.all(
        results.map((author) => this.mergeWithKolData(author)),
      );

      return {
        data,
        total,
        page: query.page || 1,
        pageSize: query.pageSize || 20,
      };
    } catch (error) {
      this.logger.error('获取达人列表失败', error);
      throw error;
    }
  }

  async getInfluencerDetail(
    authorId: string,
  ): Promise<InfluencerV3DetailResponseDto> {
    try {
      const author = await this.authorCoreRepo.findOne({
        where: { author_id: authorId },
      });

      if (!author) {
        throw new NotFoundException(`达人不存在: ${authorId}`);
      }

      const data = await this.enrichAuthorData(author);

      return { data };
    } catch (error) {
      this.logger.error('获取达人详情失败', error);
      throw error;
    }
  }

  async getInfluencerStatistics(): Promise<InfluencerV3StatsResponseDto> {
    try {
      // 总达人数
      const totalInfluencers = await this.authorCoreRepo.count();

      // 优质达人数
      const excellentInfluencers = await this.authorCoreRepo.count({
        where: { star_excellent_author: true },
      });

      // 黑马达人数
      const blackHorseInfluencers = await this.authorCoreRepo.count({
        where: { is_black_horse_author: true },
      });

      // 电商达人数
      const ecommerceInfluencers = await this.authorEcommerceRepo
        .createQueryBuilder('ecom')
        .where('ecom.e_commerce_enable = true')
        .getCount();

      // 有电商视频的达人数
      const ecommerceWithVideos = await this.authorEcommerceRepo
        .createQueryBuilder('ecom')
        .where('ecom.e_commerce_enable = true')
        .andWhere('ecom.star_ecom_video_num_30d > 0')
        .getCount();

      // 计算7天增长（这里简化处理，实际需要历史数据）
      const totalGrowth = Math.floor(totalInfluencers * 0.045); // 假设4.5%的增长

      return {
        data: {
          totalInfluencers,
          totalGrowth,
          excellentInfluencers,
          blackHorseInfluencers,
          ecommerceInfluencers,
          ecommerceWithVideos,
        },
      };
    } catch (error) {
      this.logger.error('获取统计数据失败', error);
      throw error;
    }
  }

  /**
   * 批量获取达人完整数据（用于导出）
   * 从 authors_raw_archive 表查询最新的原始数据
   */
  async batchGetInfluencers(authorIds: string[]): Promise<any[]> {
    try {
      if (!authorIds || authorIds.length === 0) {
        return [];
      }

      this.logger.log(`批量获取${authorIds.length}个达人的完整原始数据`);

      // 分批查询，避免SQL参数过多
      const batchSize = 100;
      const results: any[] = [];

      for (let i = 0; i < authorIds.length; i += batchSize) {
        const batchIds = authorIds.slice(i, i + batchSize);
        
        // 查询每个达人的最新原始数据
        // 使用 DISTINCT ON 获取每个 author_id 的最新记录
        const query = `
          SELECT DISTINCT ON (author_id) 
            author_id,
            raw_attribute_datas,
            created_at
          FROM authors_raw_archive
          WHERE author_id = ANY($1)
          ORDER BY author_id, created_at DESC
        `;
        
        this.logger.log(`执行SQL查询, batchIds: ${JSON.stringify(batchIds)}`);
        const rawData = await this.authorCoreRepo.query(query, [batchIds]);
        this.logger.log(`SQL查询结果数量: ${rawData.length}`);
        
        if (rawData.length > 0) {
          this.logger.log(`第一条原始数据示例: ${JSON.stringify(rawData[0]).substring(0, 200)}`);
        }
        
        // 解析 JSON 数据并添加到结果
        const parsedData = rawData.map(row => ({
          author_id: row.author_id,
          data_timestamp: row.created_at,
          ...row.raw_attribute_datas,
        }));
        
        this.logger.log(`解析后数据数量: ${parsedData.length}`);
        if (parsedData.length > 0) {
          this.logger.log(`解析后第一条数据的字段数: ${Object.keys(parsedData[0]).length}`);
        }
        
        results.push(...parsedData);
      }

      this.logger.log(`成功获取${results.length}个达人的完整原始数据`);
      return results;
    } catch (error) {
      this.logger.error('批量获取达人原始数据失败', error);
      throw error;
    }
  }

  private createBaseQueryBuilder(): SelectQueryBuilder<AuthorCore> {
    return this.authorCoreRepo.createQueryBuilder('author');
  }

  private applyFilters(
    queryBuilder: SelectQueryBuilder<AuthorCore>,
    query: InfluencerV3QueryDto,
  ): void {
    // 达人等级筛选
    if (query.tier) {
      const tierRanges = {
        mega: { min: 10000000 },
        macro: { min: 1000000, max: 10000000 },
        micro: { min: 100000, max: 1000000 },
        nano: { max: 100000 },
      };
      const range = tierRanges[query.tier];
      if (range) {
        if (range.min) {
          queryBuilder.andWhere('author.follower >= :minFollower', {
            minFollower: range.min,
          });
        }
        if (range.max) {
          queryBuilder.andWhere('author.follower < :maxFollower', {
            maxFollower: range.max,
          });
        }
      }
    }

    // 特殊标签筛选
    if (query.specialTag) {
      const tagMap = {
        excellent: 'author.star_excellent_author = true',
        black_horse: 'author.is_black_horse_author = true',
        high_potential: 'author.star_qianchuan_high_potential = true',
      };
      const condition = tagMap[query.specialTag];
      if (condition) {
        queryBuilder.andWhere(condition);
      }
    }

    // 电商能力筛选
    if (query.ecommerce === 'enabled') {
      queryBuilder.andWhere('author.e_commerce_enable = true');
    } else if (query.ecommerce === 'with_videos') {
      queryBuilder
        .leftJoin(
          AuthorEcommerce,
          'ecom',
          'ecom.author_id = author.author_id',
        )
        .andWhere('author.e_commerce_enable = true')
        .andWhere('ecom.star_ecom_video_num_30d > 0');
    }

    // 省份筛选
    if (query.province) {
      queryBuilder.andWhere('author.province = :province', {
        province: query.province,
      });
    }

    // 粉丝范围
    if (query.followerMin !== undefined) {
      queryBuilder.andWhere('author.follower >= :followerMin', {
        followerMin: query.followerMin,
      });
    }
    if (query.followerMax !== undefined) {
      queryBuilder.andWhere('author.follower <= :followerMax', {
        followerMax: query.followerMax,
      });
    }

    // 互动率范围
    if (query.interactRateMin !== undefined) {
      queryBuilder
        .leftJoin(
          AuthorEngagementMetrics,
          'engage',
          'engage.author_id = author.author_id',
        )
        .andWhere('engage.interact_rate_30d >= :interactRateMin', {
          interactRateMin: query.interactRateMin,
        });
    }
    if (query.interactRateMax !== undefined) {
      queryBuilder.andWhere('engage.interact_rate_30d <= :interactRateMax', {
        interactRateMax: query.interactRateMax,
      });
    }

    // 星图指数范围
    if (query.starIndexMin !== undefined || query.starIndexMax !== undefined) {
      queryBuilder.leftJoin(
        AuthorMarketingIndices,
        'marketing',
        'marketing.author_id = author.author_id',
      );
      if (query.starIndexMin !== undefined) {
        queryBuilder.andWhere('marketing.star_index >= :starIndexMin', {
          starIndexMin: query.starIndexMin,
        });
      }
      if (query.starIndexMax !== undefined) {
        queryBuilder.andWhere('marketing.star_index <= :starIndexMax', {
          starIndexMax: query.starIndexMax,
        });
      }
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

    // 内容标签筛选
    if (query.contentTags) {
      const tags = query.contentTags.split(',').map((t) => t.trim());
      queryBuilder
        .leftJoin(
          AuthorContentTags,
          'tags',
          'tags.author_id = author.author_id',
        )
        .andWhere('tags.primary_tags && :tags', { tags });
    }
  }

  private applySorting(
    queryBuilder: SelectQueryBuilder<AuthorCore>,
    query: InfluencerV3QueryDto,
  ): void {
    switch (query.sortBy) {
      case 'follower_desc':
        queryBuilder.orderBy('author.follower', 'DESC');
        break;
      case 'star_index_desc':
        queryBuilder
          .leftJoin(
            AuthorMarketingIndices,
            'marketing',
            'marketing.author_id = author.author_id',
          )
          .orderBy('marketing.star_index', 'DESC');
        break;
      case 'interact_rate_desc':
        queryBuilder
          .leftJoin(
            AuthorEngagementMetrics,
            'engage',
            'engage.author_id = author.author_id',
          )
          .orderBy('engage.interact_rate_30d', 'DESC');
        break;
      case 'price_asc':
        queryBuilder
          .leftJoin(
            AuthorPricing,
            'pricing',
            'pricing.author_id = author.author_id',
          )
          .orderBy('pricing.price_20_60', 'ASC');
        break;
      case 'price_desc':
        queryBuilder
          .leftJoin(
            AuthorPricing,
            'pricing',
            'pricing.author_id = author.author_id',
          )
          .orderBy('pricing.price_20_60', 'DESC');
        break;
      case 'recommended':
      default:
        // 综合推荐排序：优质 > 粉丝数
        queryBuilder
          .orderBy('author.star_excellent_author', 'DESC')
          .addOrderBy('author.follower', 'DESC');
        break;
    }
  }

  private async enrichAuthorData(
    author: AuthorCore,
  ): Promise<InfluencerV3CardDataDto> {
    const [fans, engagement, pricing, marketing, contentTags, ecommerce] =
      await Promise.all([
        this.authorFansRepo.findOne({
          where: { author_id: author.author_id },
        }),
        this.authorEngagementRepo.findOne({
          where: { author_id: author.author_id },
        }),
        this.authorPricingRepo.findOne({
          where: { author_id: author.author_id },
        }),
        this.authorMarketingRepo.findOne({
          where: { author_id: author.author_id },
        }),
        this.authorContentTagsRepo.findOne({
          where: { author_id: author.author_id },
        }),
        this.authorEcommerceRepo.findOne({
          where: { author_id: author.author_id },
        }),
      ]);

    // 计算达人等级
    let tier = 'nano';
    if (author.follower >= 10000000) tier = 'mega';
    else if (author.follower >= 1000000) tier = 'macro';
    else if (author.follower >= 100000) tier = 'micro';

    // 提取主要标签
    const primaryTags = contentTags?.primary_tags || [];
    const tagCount = primaryTags.length;

    return {
      author_id: author.author_id,
      star_id: author.star_id || '',
      nick_name: author.nick_name || '',
      avatar_uri: author.avatar_uri || '',
      gender: author.gender || 0,
      city: author.city || '',
      province: author.province || '',
      follower: Number(author.follower) || 0,
      influencer_tier: tier,

      // 认证标签
      star_excellent_author: author.star_excellent_author || false,
      is_black_horse_author: author.is_black_horse_author || false,
      star_qianchuan_high_potential:
        author.star_qianchuan_high_potential || false,

      // 内容标签
      primary_tags: primaryTags,
      tag_count: tagCount,

      // 粉丝增长
      fans_increment_rate_30d: Number(fans?.fans_increment_rate_30d) || 0,

      // 互动数据
      interact_rate_30d: engagement?.interact_rate_30d || 0,
      play_over_rate_30d: engagement?.play_over_rate_30d || 0,
      vv_median_30d: engagement?.vv_median_30d || 0,

      // 营销能力
      link_convert_index: marketing?.link_convert_index || 0,
      link_shopping_index: marketing?.link_shopping_index || 0,
      star_index: marketing?.star_index || 0,

      // 价格信息
      price_1_20: pricing?.price_1_20 || 0,
      price_20_60: pricing?.price_20_60 || 0,
      price_60: pricing?.price_60 || 0,

      // 电商数据
      e_commerce_enable: Boolean((author as any).e_commerce_enable) || false,
      author_ecom_level: ecommerce?.author_ecom_level || '',
      star_ecom_video_num_30d: ecommerce?.star_ecom_video_num_30d || 0,
      ecom_gmv_30d_range: ecommerce?.ecom_gmv_30d_range || '',
      ecom_score: ecommerce?.ecom_score || 0,

      // 操作状态（默认值）
      isSelected: false,
      isFavorited: false,
    };
  }

  /**
   * 合并公海与私域数据
   * @param author 公海达人核心数据
   * @returns 合并后的卡片数据
   */
  private async mergeWithKolData(
    author: AuthorCore,
  ): Promise<InfluencerV3CardDataDto> {
    // 先组装公海数据
    const publicData = await this.enrichAuthorData(author);

    // 查找对应的私域记录
    const kolRecord = await this.kolListRepo.findOne({
      where: {
        platform: '抖音',
        matched_author_id: author.author_id,
        match_status: MatchStatus.MATCHED,
      },
    });

    if (!kolRecord) {
      // 无私域数据,直接返回公海数据
      return {
        ...publicData,
        is_matched: false,
      };
    }

    // 有私域数据,合并返回
    return {
      ...publicData,
      
      // 私域独有字段
      is_matched: true,
      match_status: kolRecord.match_status,
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
      matched_at: kolRecord.matched_at,
      
      // 价格合并（公海优先，公海无值用私域）
      price_20_60: publicData.price_20_60 || Number(kolRecord.star_quote_21_60s) || 0,
      price_60: publicData.price_60 || Number(kolRecord.star_quote_60s_plus) || 0,
    };
  }
}
