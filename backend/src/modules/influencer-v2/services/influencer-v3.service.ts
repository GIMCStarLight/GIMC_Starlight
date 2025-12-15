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
   * 并从 authors_core 表获取爬虫字段（mcn_name, platform, self_intro等）
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
        
        // 1. 查询每个达人的最新原始数据
        // 使用 DISTINCT ON 获取每个 author_id 的最新记录
        const rawQuery = `
          SELECT DISTINCT ON (author_id) 
            author_id,
            raw_attribute_datas,
            created_at
          FROM authors_raw_archive
          WHERE author_id = ANY($1)
          ORDER BY author_id, created_at DESC
        `;
        
        this.logger.log(`执行SQL查询, batchIds: ${JSON.stringify(batchIds)}`);
        const rawData = await this.authorCoreRepo.query(rawQuery, [batchIds]);
        this.logger.log(`SQL查询结果数量: ${rawData.length}`);
        
        if (rawData.length > 0) {
          this.logger.log(`第一条原始数据示例: ${JSON.stringify(rawData[0]).substring(0, 200)}`);
        }
        
        // 2. 查询 authors_core 表获取爬虫字段
        const coreQuery = `
          SELECT 
            author_id,
            unique_id,
            sec_uid,
            short_id,
            has_phone,
            mcn_name,
            self_intro,
            platform,
            platform_channel
          FROM authors_core
          WHERE author_id = ANY($1)
        `;
        
        const coreData = await this.authorCoreRepo.query(coreQuery, [batchIds]);
        this.logger.log(`authors_core 查询结果数量: ${coreData.length}`);
        
        // 创建 author_id -> coreData 的映射
        const coreDataMap = new Map();
        coreData.forEach((row: any) => {
          coreDataMap.set(row.author_id, row);
        });
        
        // 3. 解析 JSON 数据并合并爬虫字段
        const parsedData = rawData.map((row: any) => {
          const crawlerData = coreDataMap.get(row.author_id) || {};
          return {
            author_id: row.author_id,
            data_timestamp: row.created_at,
            ...row.raw_attribute_datas,
            // 爬虫字段（来自 authors_core）
            unique_id: crawlerData.unique_id,
            sec_uid: crawlerData.sec_uid,
            short_id: crawlerData.short_id,
            has_phone: crawlerData.has_phone,
            mcn_name: crawlerData.mcn_name,
            self_intro: crawlerData.self_intro,
            platform: crawlerData.platform,
            platform_channel: crawlerData.platform_channel,
          };
        });
        
        this.logger.log(`解析后数据数量: ${parsedData.length}`);
        if (parsedData.length > 0) {
          this.logger.log(`解析后第一条数据的字段数: ${Object.keys(parsedData[0]).length}`);
        }
        
        results.push(...parsedData);
      }

      this.logger.log(`成功获取${results.length}个达人的完整原始数据（包含爬虫字段）`);
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
      const range = tierRanges[query.tier as keyof typeof tierRanges];
      if (range) {
        if ('min' in range && range.min) {
          queryBuilder.andWhere('author.follower >= :minFollower', {
            minFollower: range.min,
          });
        }
        if ('max' in range && range.max) {
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
      const condition = tagMap[query.specialTag as keyof typeof tagMap];
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

  /**
   * 应用智能排序算法
   * 
   * 设计思路：
   * 1. 分层评分：私域价值分 + 平台质量分 + 用户偏好分
   * 2. 动态权重：根据用户选择的sortBy调整权重比例
   * 3. SQL计算：在数据库层完成评分，性能优秀
   * 
   * 评分范围：
   * - 私域价值分：0-100（机构价值40 + 政策等级30 + 独家15 + 返点10 + 年框5）
   * - 平台质量分：0-100（认证25 + 粉丝30 + 互动20 + 增长15 + 星图10）
   * - 用户偏好分：动态计算，根据sortBy而定
   */
  private applySorting(
    queryBuilder: SelectQueryBuilder<AuthorCore>,
    query: InfluencerV3QueryDto,
  ): void {
    // ========== 关联必要的表 ==========
    
    // 私域数据表（用于计算业务价值分）
    queryBuilder.leftJoin(
      'kol_list',
      'kol',
      `kol.matched_author_id = author.author_id 
       AND kol.platform = '抖音' 
       AND kol.match_status = 'matched'`,
    );

    // 营销指标表（星图指数等）
    queryBuilder.leftJoin(
      'authors_marketing_indices',
      'marketing',
      'marketing.author_id = author.author_id',
    );

    // 互动指标表（互动率、完播率等）
    queryBuilder.leftJoin(
      'authors_engagement_metrics',
      'engage',
      'engage.author_id = author.author_id',
    );

    // 粉丝增长指标表
    queryBuilder.leftJoin(
      'authors_fans_metrics',
      'fans',
      'fans.author_id = author.author_id',
    );

    // 价格信息表
    queryBuilder.leftJoin(
      'authors_pricing',
      'pricing',
      'pricing.author_id = author.author_id',
    );

    // ========== 分层评分计算 ==========

    // 【1. 私域价值分 (0-100)】
    // 评估私域资源的商业价值
    const businessScoreSQL = `
      COALESCE(
        -- 1.1 机构价值 (0-40分)
        CASE 
          WHEN kol.org_name IN ('星链计划', '省广星媒') THEN 40
          ELSE 0
        END +
        -- 1.2 政策等级 (0-30分)
        CASE kol.policy_level
          WHEN 'S' THEN 30
          WHEN 'A' THEN 24
          WHEN 'B' THEN 18
          WHEN 'C' THEN 12
          WHEN 'D' THEN 6
          ELSE 0
        END +
        -- 1.3 独家资源 (0-15分)
        CASE WHEN kol.is_exclusive = 1 THEN 15 ELSE 0 END +
        -- 1.4 返点优惠 (0-10分)
        -- 从rebate_range提取平均返点率，如"25%-30%"取27.5%
        CASE 
          WHEN kol.rebate_range ~ '[0-9]+-[0-9]+%?' THEN
            LEAST(
              (
                CAST(SUBSTRING(kol.rebate_range FROM '[0-9]+') AS DECIMAL) +
                CAST(SUBSTRING(kol.rebate_range FROM '-([0-9]+)') AS DECIMAL)
              ) / 2 / 3,
              10
            )
          ELSE 0
        END +
        -- 1.5 年框合作 (0-5分)
        CASE WHEN kol.annual_contract_org IS NOT NULL THEN 5 ELSE 0 END,
        0
      )
    `;

    // 【2. 平台质量分 (0-100)】
    // 评估达人在抖音平台的综合质量
    const qualityScoreSQL = `
      (
        -- 2.1 官方认证 (0-25分)
        CASE 
          WHEN author.star_excellent_author = true THEN 25
          WHEN author.is_black_horse_author = true THEN 20
          WHEN author.star_qianchuan_high_potential = true THEN 15
          ELSE 0
        END +
        -- 2.2 粉丝规模 (0-30分) - 对数增长，避免大号碾压
        -- 10万粉=15分，100万粉=18分，1000万粉=21分，1亿粉=24分
        LEAST(LOG10(GREATEST(author.follower, 1)) * 3, 30) +
        -- 2.3 互动质量 (0-20分) - 互动率反映粉丝活跃度
        -- 5%互动率=10分，10%=20分（封顶）
        LEAST(COALESCE(engage.interact_rate_30d, 0) * 200, 20) +
        -- 2.4 粉丝增长 (0-15分) - 增长率代表上升潜力
        -- 10%增长=10分，15%+=15分（封顶）
        LEAST(GREATEST(COALESCE(fans.fans_increment_rate_30d, 0) * 100, 0), 15) +
        -- 2.5 星图指数 (0-10分) - 平台官方评分
        -- 假设星图指数0-100，标准化到0-10分
        LEAST(COALESCE(marketing.star_index, 0) / 10, 10)
      )
    `;

    // 【3. 用户偏好分 & 动态权重】
    // 根据用户选择的sortBy，动态计算偏好分和调整权重
    let userPreferenceSQL = '0';
    let businessWeight = 0.4; // 私域价值权重
    let qualityWeight = 0.6; // 平台质量权重
    let preferenceWeight = 0; // 用户偏好权重

    switch (query.sortBy) {
      case 'follower_desc':
        // 用户选择按粉丝数排序
        // 策略：大幅降低私域权重，提升粉丝数影响力
        userPreferenceSQL = 'LOG10(GREATEST(author.follower, 1)) * 10';
        businessWeight = 0.15;
        qualityWeight = 0.25;
        preferenceWeight = 0.6;
        break;

      case 'star_index_desc':
        // 用户选择按星图指数排序
        // 策略：星图指数NULL的达人得负分，排到最后
        userPreferenceSQL = `
          CASE 
            WHEN marketing.star_index IS NULL OR marketing.star_index = 0 THEN -1000
            ELSE marketing.star_index
          END
        `;
        businessWeight = 0.15;
        qualityWeight = 0.25;
        preferenceWeight = 0.6;
        break;

      case 'interact_rate_desc':
        // 用户选择按互动率排序
        // 互动率通常0-0.2，乘以500标准化到0-100
        userPreferenceSQL = 'COALESCE(engage.interact_rate_30d, 0) * 500';
        businessWeight = 0.15;
        qualityWeight = 0.25;
        preferenceWeight = 0.6;
        break;

      case 'price_asc':
        // 用户选择价格升序（低价优先）
        // 策略：价格越低得分越高
        userPreferenceSQL = `
          CASE 
            WHEN COALESCE(pricing.price_20_60, kol.star_quote_21_60s) IS NULL THEN 0
            ELSE GREATEST(
              100 - LEAST(
                COALESCE(pricing.price_20_60, kol.star_quote_21_60s, 999999) / 1000,
                100
              ),
              0
            )
          END
        `;
        businessWeight = 0.2;
        qualityWeight = 0.2;
        preferenceWeight = 0.6;
        break;

      case 'price_desc':
        // 用户选择价格降序（高价优先）
        // 策略：价格NULL的达人得负分，排到最后
        userPreferenceSQL = `
          CASE 
            WHEN COALESCE(pricing.price_20_60, kol.star_quote_21_60s) IS NULL THEN -1000
            ELSE LEAST(
              COALESCE(pricing.price_20_60, kol.star_quote_21_60s, 0) / 1000,
              100
            )
          END
        `;
        businessWeight = 0.2;
        qualityWeight = 0.2;
        preferenceWeight = 0.6;
        break;

      case 'recommended':
      default:
        // 综合推荐（默认）
        // 策略：平衡私域价值和平台质量，不额外加用户偏好分
        userPreferenceSQL = '0';
        businessWeight = 0.4;
        qualityWeight = 0.6;
        preferenceWeight = 0;
        break;
    }

    // ========== 计算综合得分 ==========
    const totalScoreSQL = `
      (
        (${businessScoreSQL}) * ${businessWeight} +
        (${qualityScoreSQL}) * ${qualityWeight} +
        (${userPreferenceSQL}) * ${preferenceWeight}
      )
    `;

    // 调试日志
    this.logger.debug(`=== 排序算法调试信息 ===`);
    this.logger.debug(`sortBy: ${query.sortBy}`);
    this.logger.debug(`权重: business=${businessWeight}, quality=${qualityWeight}, preference=${preferenceWeight}`);
    this.logger.debug(`userPreferenceSQL: ${userPreferenceSQL}`);

    // 添加计算字段（可用于调试）
    queryBuilder.addSelect(totalScoreSQL, 'total_score');
    queryBuilder.addSelect(businessScoreSQL, 'business_score');
    queryBuilder.addSelect(qualityScoreSQL, 'quality_score');
    queryBuilder.addSelect(userPreferenceSQL, 'user_preference_score');

    // ========== 排序逻辑 ==========
    
    // 主排序：按综合得分降序
    queryBuilder.orderBy('total_score', 'DESC');

    // 次级排序：相同得分时的稳定排序
    queryBuilder.addOrderBy('author.updated_at', 'DESC'); // 优先展示最近更新的
    queryBuilder.addOrderBy('author.author_id', 'ASC'); // 最终保证顺序稳定

    // 输出SQL调试（仅development环境）
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(`=== SQL预览 ===`);
      this.logger.debug(queryBuilder.getSql());
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

      // 爬虫数据字段
      mcn_name: author.mcn_name || '',
      unique_id: author.unique_id || '',
      sec_uid: author.sec_uid || '',
      short_id: author.short_id || '',
      has_phone: author.has_phone || false,
      self_intro: author.self_intro || '',
      platform: author.platform || [],
      platform_channel: author.platform_channel || [],

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
