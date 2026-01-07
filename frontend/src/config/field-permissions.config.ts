/**
 * 字段级权限配置
 * 定义各资源的字段分组和对应的权限代码
 * 需与后端 field-permissions.config.ts 保持同步
 */

// 达人广场字段权限配置
export const INFLUENCER_FIELD_PERMISSIONS: Record<string, string[]> = {
  // 基础信息 - 默认所有人可见
  'influencer:field:basic': [
    'nick_name', 'nickName',
    'avatar_uri', 'avatarUri',
    'gender',
    'province',
    'city',
    'author_type', 'authorType',
    'account_status', 'accountStatus',
    'author_level', 'authorLevel',
    'author_id', 'authorId',
    'star_id', 'starId',
    'core_user_id', 'coreUserId',
  ],
  
  // 粉丝数据
  'influencer:field:follower': [
    'follower',
    'fans_increment_within_15d', 'fansIncrementWithin15d',
    'fans_increment_within_30d', 'fansIncrementWithin30d',
    'fans_increment_rate_within_15d', 'fansIncrementRateWithin15d',
  ],
  
  // 互动指标
  'influencer:field:interaction': [
    'interact_rate_within_30d', 'interactRateWithin30d',
    'interaction_median_30d', 'interactionMedian30d',
    'play_over_rate_within_30d', 'playOverRateWithin30d',
    'vv_median_30d', 'vvMedian30d',
  ],
  
  // 价格信息（敏感）
  'influencer:field:price': [
    'price_1_20', 'price120',
    'price_20_60', 'price2060',
    'price_60', 'price60',
    'assign_task_price_list', 'assignTaskPriceList',
    'taskPrice',
  ],
  
  // 联系方式（敏感）
  'influencer:field:contact': [
    'has_phone', 'hasPhone',
    'mcn_name', 'mcnName',
    'self_intro', 'selfIntro',
    'unique_id', 'uniqueId',
    'sec_uid', 'secUid',
    'short_id', 'shortId',
  ],
  
  // 电商数据
  'influencer:field:ecommerce': [
    'e_commerce_enable', 'eCommerceEnable',
    'author_ecom_level', 'authorEcomLevel',
    'ecom_gmv_30d_range', 'ecomGmv30dRange',
    'ecom_avg_order_value_30d_range', 'ecomAvgOrderValue30dRange',
    'ecom_gpm_30d_range', 'ecomGpm30dRange',
    'ecom_video_product_num_30d', 'ecomVideoProductNum30d',
    'star_ecom_video_num_30d', 'starEcomVideoNum30d',
  ],
  
  // 营销指数
  'influencer:field:marketing': [
    'star_index', 'starIndex',
    'link_convert_index', 'linkConvertIndex',
    'link_shopping_index', 'linkShoppingIndex',
    'link_spread_index', 'linkSpreadIndex',
    'link_star_index', 'linkStarIndex',
    'link_recommend_index_by_industry', 'linkRecommendIndexByIndustry',
    'expected_play_num', 'expectedPlayNum',
  ],
  
  // 星图视频数据
  'influencer:field:star_video': [
    'star_item_count_within_30d', 'starItemCountWithin30d',
    'star_video_cnt_90d', 'starVideoCnt90d',
    'star_video_interact_rate_90d', 'starVideoInteractRate90d',
    'star_video_finish_vv_rate_90d', 'starVideoFinishVvRate90d',
    'star_video_median_vv_90d', 'starVideoMedianVv90d',
  ],
  
  // CPM/CPE预估
  'influencer:field:prospective': [
    'prospective_1_20_cpm', 'prospective120Cpm',
    'prospective_20_60_cpm', 'prospective2060Cpm',
    'prospective_60_cpm', 'prospective60Cpm',
    'promotion_prospective_1_20_cpm', 'promotionProspective120Cpm',
    'promotion_prospective_20_60_cpm', 'promotionProspective2060Cpm',
    'promotion_prospective_60_cpm', 'promotionProspective60Cpm',
    'promotion_prospective_vv', 'promotionProspectiveVv',
    'expected_natural_play_num', 'expectedNaturalPlayNum',
  ],
  
  // 内容标签
  'influencer:field:tags': [
    'content_theme_labels_180d', 'contentThemeLabels180d',
    'tags_relation', 'tagsRelation',
    'primary_tags', 'primaryTags',
    'secondary_tags', 'secondaryTags',
  ],
}

// 省广达人库字段权限配置
export const KOL_FIELD_PERMISSIONS: Record<string, string[]> = {
  // 基础信息 - 默认所有人可见
  'kol:field:basic': [
    'platform',
    'account_name', 'accountName',
    'account_id', 'accountId',
    'home_link', 'homeLink',
    'followers_w', 'followersW',
    'org_name', 'orgName',
    'category',
    'id',
    'source',
    'created_at', 'createdAt',
    'updated_at', 'updatedAt',
  ],
  
  // 报价信息（敏感）
  'kol:field:price': [
    'star_quote_21_60s', 'starQuote2160s',
    'star_quote_60s_plus', 'starQuote60sPlus',
  ],
  
  // 返点政策（敏感）- 保留用于批量授权
  'kol:field:rebate': [
    'rebate_policy', 'rebatePolicy',
    'rebate_range', 'rebateRange',
    'policy_level', 'policyLevel',
    'rebate_period', 'rebatePeriod',
    'pay_period', 'payPeriod',
  ],
  
  // 联系方式（敏感）
  'kol:field:contact': [
    'contact_info', 'contactInfo',
  ],
  
  // 合作信息 - 保留用于批量授权
  'kol:field:cooperation': [
    'is_exclusive', 'isExclusive',
    'cooperation_degree', 'cooperationDegree',
    'resource_attribute', 'resourceAttribute',
    'annual_contract_org', 'annualContractOrg',
    'cooperation_intro', 'cooperationIntro',
    'remark',
  ],
  
  // === 细粒度合作信息字段权限 ===
  
  // 机构信息
  'kol:field:org_name': [
    'org_name', 'orgName',
  ],
  
  // 独家资源
  'kol:field:is_exclusive': [
    'is_exclusive', 'isExclusive',
  ],
  
  // 返点区间（高敏感）
  'kol:field:rebate_range': [
    'rebate_range', 'rebateRange',
  ],
  
  // 政策等级
  'kol:field:policy_level': [
    'policy_level', 'policyLevel',
  ],
  
  // 配合度
  'kol:field:cooperation_degree': [
    'cooperation_degree', 'cooperationDegree',
  ],
  
  // 账期
  'kol:field:rebate_period': [
    'rebate_period', 'rebatePeriod',
  ],
  
  // 年框机构
  'kol:field:annual_contract_org': [
    'annual_contract_org', 'annualContractOrg',
  ],
  
  // 合作简介
  'kol:field:cooperation_intro': [
    'cooperation_intro', 'cooperationIntro',
  ],
  
  // 备注
  'kol:field:remark': [
    'remark',
  ],
  
  // 匹配信息
  'kol:field:match': [
    'matched_author_id', 'matchedAuthorId',
    'match_confidence', 'matchConfidence',
    'match_status', 'matchStatus',
    'matched_snapshot', 'matchedSnapshot',
    'matched_at', 'matchedAt',
  ],
}

// 所有字段权限配置
export const ALL_FIELD_PERMISSIONS: Record<string, string[]> = {
  ...INFLUENCER_FIELD_PERMISSIONS,
  ...KOL_FIELD_PERMISSIONS,
}

// 获取权限对应的字段列表
export function getFieldsByPermission(permissionCode: string): string[] {
  return ALL_FIELD_PERMISSIONS[permissionCode] || []
}

// 获取资源类型的所有字段权限
export function getFieldPermissionsByResource(resource: 'influencer' | 'kol'): Record<string, string[]> {
  const prefix = `${resource}:field:`
  return Object.entries(ALL_FIELD_PERMISSIONS)
    .filter(([code]) => code.startsWith(prefix))
    .reduce((acc, [code, fields]) => {
      acc[code] = fields
      return acc
    }, {} as Record<string, string[]>)
}

// 根据用户权限获取允许的字段
export function getAllowedFields(
  userPermissions: string[],
  resource: 'influencer' | 'kol',
): string[] {
  const resourcePermissions = getFieldPermissionsByResource(resource)
  const allowedFields: Set<string> = new Set()
  
  for (const [permCode, fields] of Object.entries(resourcePermissions)) {
    if (userPermissions.includes(permCode)) {
      fields.forEach(field => allowedFields.add(field))
    }
  }
  
  return Array.from(allowedFields)
}

// 获取字段对应的权限代码
export function getPermissionForField(
  fieldName: string,
  resource: 'influencer' | 'kol',
): string | null {
  const resourcePermissions = getFieldPermissionsByResource(resource)
  
  for (const [permCode, fields] of Object.entries(resourcePermissions)) {
    if (fields.includes(fieldName)) {
      return permCode
    }
  }
  
  return null
}

// 检查用户是否有查看某字段的权限
export function canViewField(
  fieldName: string,
  resource: 'influencer' | 'kol',
  userPermissions: string[],
): boolean {
  const permCode = getPermissionForField(fieldName, resource)
  
  // 如果字段没有配置权限，默认可见
  if (!permCode) return true
  
  return userPermissions.includes(permCode)
}
