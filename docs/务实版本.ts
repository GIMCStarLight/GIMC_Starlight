/**
 * 实用的加权评分算法
 * 特点：
 * 1. 无需训练数据
 * 2. 可解释性强
 * 3. 易于调优
 * 4. 性能优秀（纯SQL）
 */
private applySorting(
  queryBuilder: SelectQueryBuilder<AuthorCore>,
  query: InfluencerV3QueryDto,
): void {
  // LEFT JOIN 必要的表
  queryBuilder
    .leftJoin(
      KolList,
      'kol',
      `kol.matched_author_id = author.author_id 
       AND kol.platform = '抖音' 
       AND kol.match_status = 'matched'`
    )
    .leftJoin(
      AuthorMarketingIndices,
      'marketing',
      'marketing.author_id = author.author_id'
    )
    .leftJoin(
      AuthorEngagementMetrics,
      'engage',
      'engage.author_id = author.author_id'
    )
    .leftJoin(
      AuthorFansMetrics,
      'fans',
      'fans.author_id = author.author_id'
    )
    .leftJoin(
      AuthorPricing,
      'pricing',
      'pricing.author_id = author.author_id'
    );

  // === 分层评分 ===
  
  // 1. 私域价值分 (0-100)
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
      CASE WHEN kol.annual_contract_org IS NOT NULL THEN 5 ELSE 0 END,
      0
    )
  `;

  // 2. 平台质量分 (0-100)
  const qualityScoreSQL = `
    (
      CASE 
        WHEN author.star_excellent_author = true THEN 25
        WHEN author.is_black_horse_author = true THEN 20
        WHEN author.star_qianchuan_high_potential = true THEN 15
        ELSE 0
      END +
      LEAST(LOG10(GREATEST(author.follower, 1)) * 3, 30) +
      LEAST(COALESCE(engage.interact_rate_30d, 0) * 200, 20) +
      LEAST(GREATEST(COALESCE(fans.fans_increment_rate_30d, 0) * 100, 0), 15) +
      LEAST(COALESCE(marketing.star_index, 0) / 10, 10)
    )
  `;

  // 3. 用户偏好分 (根据sortBy动态计算)
  let userPreferenceSQL = '0';
  let businessWeight = 0.4;  // 默认权重
  let qualityWeight = 0.6;

  switch (query.sortBy) {
    case 'follower_desc':
      // 用户选择粉丝数：降低业务权重，提高粉丝数影响
      userPreferenceSQL = 'LOG10(GREATEST(author.follower, 1)) * 10';
      businessWeight = 0.2;
      qualityWeight = 0.3;
      break;
      
    case 'star_index_desc':
      userPreferenceSQL = 'COALESCE(marketing.star_index, 0)';
      businessWeight = 0.2;
      qualityWeight = 0.3;
      break;
      
    case 'interact_rate_desc':
      userPreferenceSQL = 'COALESCE(engage.interact_rate_30d, 0) * 1000';
      businessWeight = 0.2;
      qualityWeight = 0.3;
      break;
      
    case 'price_asc':
      // 价格升序：低价优先
      userPreferenceSQL = `
        100 - LEAST(
          COALESCE(pricing.price_20_60, kol.star_quote_21_60s, 999999) / 1000,
          100
        )
      `;
      businessWeight = 0.2;
      qualityWeight = 0.2;
      break;
      
    case 'price_desc':
      // 价格降序：高价优先
      userPreferenceSQL = `
        LEAST(
          COALESCE(pricing.price_20_60, kol.star_quote_21_60s, 0) / 1000,
          100
        )
      `;
      businessWeight = 0.2;
      qualityWeight = 0.2;
      break;
      
    case 'recommended':
    default:
      // 综合推荐：平衡各方
      businessWeight = 0.4;
      qualityWeight = 0.6;
      break;
  }

  // 计算综合得分
  const totalScoreSQL = `
    (
      (${businessScoreSQL}) * ${businessWeight} +
      (${qualityScoreSQL}) * ${qualityWeight} +
      (${userPreferenceSQL}) * ${query.sortBy === 'recommended' ? 0 : 0.5}
    )
  `;

  // 添加计算字段并排序
  queryBuilder.addSelect(totalScoreSQL, 'total_score');
  queryBuilder.orderBy('total_score', 'DESC');
  
  // 次级排序：保证稳定性
  queryBuilder.addOrderBy('author.updated_at', 'DESC');
  queryBuilder.addOrderBy('author.author_id', 'ASC');
}