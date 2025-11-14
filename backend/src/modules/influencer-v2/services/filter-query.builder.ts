import { Injectable, Logger } from '@nestjs/common';
import { SelectQueryBuilder } from 'typeorm';
import {
  AuthorFilterQueryDto,
  InfluencerTier,
} from '../dto/advanced-filter.dto';

/**
 * 筛选查询构建器
 * 负责根据DTO动态生成SQL WHERE条件
 * 使用物化视图 mv_authors_combined 提升性能
 */
@Injectable()
export class FilterQueryBuilder {
  private readonly logger = new Logger(FilterQueryBuilder.name);

  /**
   * 构建WHERE条件
   * @param queryBuilder TypeORM QueryBuilder
   * @param filters 筛选参数
   */
  buildFilters(
    queryBuilder: SelectQueryBuilder<any>,
    filters: AuthorFilterQueryDto,
  ): void {
    // ========== 快速筛选维度 ==========

    // 内容质量分层
    if (filters.qualityTier) {
      queryBuilder.andWhere('mv.quality_tier = :qualityTier', {
        qualityTier: filters.qualityTier,
      });
    }

    // 增长趋势
    if (filters.growthLevel) {
      queryBuilder.andWhere('mv.growth_level = :growthLevel', {
        growthLevel: filters.growthLevel,
      });
    }

    // 价格档位
    if (filters.priceTier) {
      queryBuilder.andWhere('mv.price_tier = :priceTier', {
        priceTier: filters.priceTier,
      });
    }

    // 达人规模档位
    if (filters.influencerTier) {
      const followerRange = this.getFollowerRangeByTier(filters.influencerTier);
      if (followerRange.min !== undefined) {
        queryBuilder.andWhere('mv.follower >= :tierMinFollowers', {
          tierMinFollowers: followerRange.min,
        });
      }
      if (followerRange.max !== undefined) {
        queryBuilder.andWhere('mv.follower < :tierMaxFollowers', {
          tierMaxFollowers: followerRange.max,
        });
      }
    }

    // 内容标签 (使用GIN索引)
    if (filters.primaryTags && filters.primaryTags.length > 0) {
      queryBuilder.andWhere('mv.primary_tags @> :primaryTags', {
        primaryTags: filters.primaryTags,
      });
    }

    // ========== 高级筛选维度 ==========

    // 基础维度
    if (filters.keyword) {
      queryBuilder.andWhere(
        '(mv.nick_name ILIKE :keyword OR mv.author_id = :keywordExact)',
        {
          keyword: `%${filters.keyword}%`,
          keywordExact: filters.keyword,
        },
      );
    }

    if (filters.province) {
      queryBuilder.andWhere('mv.province = :province', {
        province: filters.province,
      });
    }

    if (filters.city) {
      queryBuilder.andWhere('mv.city = :city', {
        city: filters.city,
      });
    }

    if (filters.gender) {
      // gender字段在数据库中是smallint类型，前端传递的是字符串'M'/'F'/'U'
      // 需要转换：'M'->1, 'F'->2, 'U'->NULL(或0)
      const genderMap = { M: 1, F: 2, U: null } as const;
      const genderValue = genderMap[filters.gender];
      if (genderValue !== undefined) {
        queryBuilder.andWhere('mv.gender = :gender', {
          gender: genderValue,
        });
      }
    }

    // 粉丝维度
    if (filters.minFollowers !== undefined) {
      queryBuilder.andWhere('mv.follower >= :minFollowers', {
        minFollowers: filters.minFollowers,
      });
    }

    if (filters.maxFollowers !== undefined) {
      queryBuilder.andWhere('mv.follower <= :maxFollowers', {
        maxFollowers: filters.maxFollowers,
      });
    }

    if (filters.minGrowthRate30d !== undefined) {
      queryBuilder.andWhere('mv.fans_increment_rate_30d >= :minGrowthRate', {
        minGrowthRate: filters.minGrowthRate30d,
      });
    }

    if (filters.maxGrowthRate30d !== undefined) {
      queryBuilder.andWhere('mv.fans_increment_rate_30d <= :maxGrowthRate', {
        maxGrowthRate: filters.maxGrowthRate30d,
      });
    }

    // 数据表现维度
    if (filters.minInteractRate !== undefined) {
      queryBuilder.andWhere('mv.interact_rate_30d >= :minInteractRate', {
        minInteractRate: filters.minInteractRate,
      });
    }

    if (filters.maxInteractRate !== undefined) {
      queryBuilder.andWhere('mv.interact_rate_30d <= :maxInteractRate', {
        maxInteractRate: filters.maxInteractRate,
      });
    }

    if (filters.minPlayOverRate !== undefined) {
      queryBuilder.andWhere('mv.play_over_rate_30d >= :minPlayOverRate', {
        minPlayOverRate: filters.minPlayOverRate,
      });
    }

    if (filters.maxPlayOverRate !== undefined) {
      queryBuilder.andWhere('mv.play_over_rate_30d <= :maxPlayOverRate', {
        maxPlayOverRate: filters.maxPlayOverRate,
      });
    }

    if (filters.minVvMedian !== undefined) {
      queryBuilder.andWhere('mv.vv_median_30d >= :minVvMedian', {
        minVvMedian: filters.minVvMedian,
      });
    }

    if (filters.maxVvMedian !== undefined) {
      queryBuilder.andWhere('mv.vv_median_30d <= :maxVvMedian', {
        maxVvMedian: filters.maxVvMedian,
      });
    }

    // 价格维度
    if (filters.minPrice20_60 !== undefined) {
      queryBuilder.andWhere('mv.price_20_60 >= :minPrice', {
        minPrice: filters.minPrice20_60,
      });
    }

    if (filters.maxPrice20_60 !== undefined) {
      queryBuilder.andWhere('mv.price_20_60 <= :maxPrice', {
        maxPrice: filters.maxPrice20_60,
      });
    }

    if (filters.minCpmEfficiency !== undefined) {
      queryBuilder.andWhere('mv.cpm_efficiency >= :minCpm', {
        minCpm: filters.minCpmEfficiency,
      });
    }

    if (filters.maxCpmEfficiency !== undefined) {
      queryBuilder.andWhere('mv.cpm_efficiency <= :maxCpm', {
        maxCpm: filters.maxCpmEfficiency,
      });
    }

    // 电商维度
    if (filters.ecommerceEnabled !== undefined) {
      queryBuilder.andWhere('mv.e_commerce_enable = :ecomEnabled', {
        ecomEnabled: filters.ecommerceEnabled,
      });
    }

    // 注意：物化视图中没有 is_ecomm_registered 字段，忽略该筛选条件
    // if (filters.ecommRegistered !== undefined) {
    //   queryBuilder.andWhere('mv.is_ecomm_registered = :ecommRegistered', {
    //     ecommRegistered: filters.ecommRegistered,
    //   });
    // }

    if (filters.ecomCapabilityTier) {
      queryBuilder.andWhere('mv.ecom_capability_tier = :ecomTier', {
        ecomTier: filters.ecomCapabilityTier,
      });
    }

    if (filters.minGmv30d !== undefined) {
      queryBuilder.andWhere('mv.gmv_30d >= :minGmv', {
        minGmv: filters.minGmv30d,
      });
    }

    if (filters.maxGmv30d !== undefined) {
      queryBuilder.andWhere('mv.gmv_30d <= :maxGmv', {
        maxGmv: filters.maxGmv30d,
      });
    }

    // 营销维度
    if (filters.minConvertIndex !== undefined) {
      queryBuilder.andWhere('mv.link_convert_index >= :minConvert', {
        minConvert: filters.minConvertIndex,
      });
    }

    if (filters.minShoppingIndex !== undefined) {
      queryBuilder.andWhere('mv.link_shopping_index >= :minShopping', {
        minShopping: filters.minShoppingIndex,
      });
    }

    if (filters.minSpreadIndex !== undefined) {
      queryBuilder.andWhere('mv.link_spread_index >= :minSpread', {
        minSpread: filters.minSpreadIndex,
      });
    }

    // 认证标签
    if (filters.excellentAuthor) {
      queryBuilder.andWhere('mv.star_excellent_author = true');
    }

    if (filters.blackHorse) {
      queryBuilder.andWhere('mv.is_black_horse_author = true');
    }

    if (filters.risingStart) {
      queryBuilder.andWhere('mv.is_rising_star = true');
    }

    if (filters.highPotential) {
      queryBuilder.andWhere('mv.star_qianchuan_high_potential = true');
    }
  }

  /**
   * 构建排序（智能算法版本）
   * 集成私域价值分 + 平台质量分 + 用户偏好分
   */
  buildSorting(
    queryBuilder: SelectQueryBuilder<any>,
    sortBy: string = 'follower',
    sortOrder: 'ASC' | 'DESC' = 'DESC',
  ): void {
    // ========== 关联私域数据表 ==========
    queryBuilder.leftJoin(
      'kol_list',
      'kol',
      `kol.matched_author_id = mv.author_id 
       AND kol.platform = '抖音' 
       AND kol.match_status = 'matched'`,
    );

    // ========== 分层评分计算 ==========

    // 【1. 私域价值分 (0-100)】
    const businessScoreSQL = `
      COALESCE(
        CASE 
          WHEN kol.org_name IN ('星链计划', '省广星媒') THEN 40
          ELSE 0
        END +
        CASE kol.policy_level
          WHEN 'S' THEN 30
          WHEN 'A' THEN 24
          WHEN 'B' THEN 18
          WHEN 'C' THEN 12
          WHEN 'D' THEN 6
          ELSE 0
        END +
        CASE WHEN kol.is_exclusive = 1 THEN 15 ELSE 0 END +
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
        CASE WHEN kol.annual_contract_org IS NOT NULL THEN 5 ELSE 0 END,
        0
      )
    `;

    // 【2. 平台质量分 (0-100)】
    const qualityScoreSQL = `
      (
        CASE 
          WHEN mv.star_excellent_author = true THEN 25
          WHEN mv.is_black_horse_author = true THEN 20
          WHEN mv.star_qianchuan_high_potential = true THEN 15
          ELSE 0
        END +
        LEAST(LOG10(GREATEST(mv.follower, 1)) * 3, 30) +
        LEAST(COALESCE(mv.interact_rate_30d, 0) * 200, 20) +
        LEAST(GREATEST(COALESCE(mv.fans_increment_rate_30d, 0) * 100, 0), 15) +
        LEAST(COALESCE(mv.star_index, 0) / 10, 10)
      )
    `;

    // 【3. 用户偏好分 & 动态权重】
    let userPreferenceSQL = '0';
    let businessWeight = 0.4;
    let qualityWeight = 0.6;
    let preferenceWeight = 0;

    // 根据sortBy调整偏好分和权重
    switch (sortBy) {
      case 'follower':
        userPreferenceSQL = 'LOG10(GREATEST(mv.follower, 1)) * 10';
        businessWeight = 0.15;
        qualityWeight = 0.25;
        preferenceWeight = 0.6;
        break;

      case 'star_index':
        // 星图指数NULL或0的得负分
        userPreferenceSQL = `
          CASE 
            WHEN mv.star_index IS NULL OR mv.star_index = 0 THEN -1000
            ELSE mv.star_index
          END
        `;
        businessWeight = 0.15;
        qualityWeight = 0.25;
        preferenceWeight = 0.6;
        break;

      case 'interact_rate':
        userPreferenceSQL = 'COALESCE(mv.interact_rate_30d, 0) * 500';
        businessWeight = 0.15;
        qualityWeight = 0.25;
        preferenceWeight = 0.6;
        break;

      case 'price':
        if (sortOrder === 'ASC') {
          // 价格升序：低价优先
          userPreferenceSQL = `
            CASE 
              WHEN COALESCE(mv.price_20_60, kol.star_quote_21_60s) IS NULL THEN 0
              ELSE GREATEST(
                100 - LEAST(
                  COALESCE(mv.price_20_60, kol.star_quote_21_60s, 999999) / 1000,
                  100
                ),
                0
              )
            END
          `;
        } else {
          // 价格降序：高价优先，NULL值得负分
          userPreferenceSQL = `
            CASE 
              WHEN COALESCE(mv.price_20_60, kol.star_quote_21_60s) IS NULL THEN -1000
              ELSE LEAST(
                COALESCE(mv.price_20_60, kol.star_quote_21_60s, 0) / 1000,
                100
              )
            END
          `;
        }
        businessWeight = 0.2;
        qualityWeight = 0.2;
        preferenceWeight = 0.6;
        break;

      case 'growth_rate':
        userPreferenceSQL = 'COALESCE(mv.fans_increment_rate_30d, 0) * 100';
        businessWeight = 0.15;
        qualityWeight = 0.25;
        preferenceWeight = 0.6;
        break;

      case 'gmv':
        userPreferenceSQL = 'COALESCE(mv.gmv_30d, 0) / 1000000';
        businessWeight = 0.15;
        qualityWeight = 0.25;
        preferenceWeight = 0.6;
        break;

      default:
        // 默认综合推荐
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

    // 添加计算字段
    queryBuilder.addSelect(totalScoreSQL, 'total_score');

    // 主排序：按综合得分降序
    queryBuilder.orderBy('total_score', 'DESC');

    // 次级排序：相同得分时的稳定排序
    queryBuilder.addOrderBy('mv.updated_at', 'DESC');
    queryBuilder.addOrderBy('mv.author_id', 'ASC');
  }

  /**
   * 根据达人档位获取粉丝数范围
   */
  private getFollowerRangeByTier(tier: InfluencerTier): {
    min?: number;
    max?: number;
  } {
    const ranges = {
      [InfluencerTier.MEGA]: { min: 10000000 }, // 1000万+
      [InfluencerTier.MACRO]: { min: 1000000, max: 10000000 }, // 100-1000万
      [InfluencerTier.MID]: { min: 100000, max: 1000000 }, // 10-100万
      [InfluencerTier.MICRO]: { min: 10000, max: 100000 }, // 1-10万
      [InfluencerTier.NANO]: { max: 10000 }, // 1万以下
    };

    return ranges[tier] || {};
  }

  /**
   * 生成缓存键
   */
  generateCacheKey(filters: AuthorFilterQueryDto): string {
    const keyObject: Record<string, unknown> = {
      ...filters,
      // 保留page参数，确保不同页码生成不同缓存键
      // page: filters.page,
    };

    // 排序后序列化确保相同参数生成相同key
    const sortedKeys = Object.keys(keyObject).sort();
    const sortedObject: Record<string, unknown> = {};
    sortedKeys.forEach((key) => {
      const value = keyObject[key];
      if (value !== undefined) {
        sortedObject[key] = value;
      }
    });

    return `author_filter:${JSON.stringify(sortedObject)}`;
  }

  /**
   * 判断是否为热门筛选
   * 热门筛选使用更长的缓存时间
   */
  isHotFilter(filters: AuthorFilterQueryDto): boolean {
    // 只有质量分层、增长趋势等快速筛选条件的视为热门
    const filterCount = Object.keys(filters)
      .filter((key) => {
        const value = (filters as Record<string, unknown>)[key];
        return value !== undefined && key !== 'page' && key !== 'limit';
      })
      .length;

    return filterCount <= 3;
  }
}
