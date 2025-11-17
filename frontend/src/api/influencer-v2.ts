import { requestClient, baseRequestClient } from './request';

export interface InfluencerQueryParams {
  page?: number;
  limit?: number;
  keyword?: string;
  minFollowers?: number;
  maxFollowers?: number;
  minEngagementRate?: number;
  maxEngagementRate?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface InfluencerBasic {
  authorId: string;
  starId: string;
  nickName: string;
  avatarUri: string;
  follower: number;
  influencerTier: string;
  gender: string;
  location: string;
  updatedAt: string;
  // 添加表格需要的额外字段
  starIndex?: number;
  province?: string;
  city?: string;
  price_1_20?: number;
  price_20_60?: number;
  price_60?: number;
  eCommerceEnable?: boolean;
  vv_median_30d?: number;
  interact_rate_within_30d?: number;
  star_video_cnt_90d?: number;
  // 为了兼容性，也添加驼峰命名的字段
  vvMedian30d?: number;
  interactRateWithin30d?: number;
  starVideoCnt90d?: number;
  taskPrice?: {
    price20To60?: number;
    video1_20s?: number;
    video21_60s?: number;
    video60sPlus?: number;
    liveStream?: number;
  };
  extraData?: {
    tags?: string[];
    category?: string;
    introduction?: string;
    priceNote?: string;
  };
}

export interface TaskPrice {
  task_type: string;
  price: number;
  price_unit: string;
}

export interface LastItem {
  vv: string;
  item_id: string;
  like_cnt: string;
  share_cnt: string;
  item_title: string;
  comment_cnt: string;
  item_create_time: string;
  item_publish_time: string;
  is_high_quality_item: string;
}

export interface ExtraData {
  content_theme_labels_180d?: string[];
  last_10_items?: LastItem[];
  tags_relation?: Record<string, string[]>;
  link_user_type_by_industry?: Record<string, unknown>;
  link_star_index_by_industry?: string;
  link_spread_index_by_industry?: string;
  link_convert_index_by_industry?: string;
  link_recommend_index_by_industry?: string;
}

export interface InfluencerDetail extends InfluencerBasic {
  city?: string;
  province?: string;
  price1To20?: number;
  price20To60?: number;
  price60Plus?: number;
  unifiedTaskPriceList?: TaskPrice[];
  extra?: ExtraData | null;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface InfluencerListResponse {
  data: InfluencerBasic[];
  pagination: PaginationInfo;
}

export interface InfluencerDetailResponse {
  data: InfluencerDetail;
}

/**
 * 获取影响者列表
 */
export async function getInfluencerList(params: InfluencerQueryParams = {}) {
  const res = await requestClient.get<InfluencerListResponse>('/influencer-manager', {
    params,
  });

  // 安全解析响应数据
  const response = res as unknown as InfluencerListResponse;
  const list = Array.isArray(response?.data) ? response.data : [];

  const normalizeBasic = (item: any): InfluencerBasic => {
    const follower = Number(item?.follower ?? 0) || 0;
    const gender = item?.gender || 'unknown';
    const province = item?.province || '';
    const city = item?.city || '';
    const location = item?.location || [province, city].filter(Boolean).join(' ');
    const updatedAt = item?.updatedAt || item?.updated_at || item?.created_at || '';

    const inferTier = (fans: number): string => {
      if (fans >= 10_000_000) return 'mega';
      if (fans >= 1_000_000) return 'macro';
      if (fans >= 100_000) return 'micro';
      return 'nano';
    };

    // 解析内容标签
    const parseContentTags = (tags: any): string[] => {
      if (Array.isArray(tags)) return tags;
      if (typeof tags === 'string') {
        try {
          return JSON.parse(tags);
        } catch {
          return [];
        }
      }
      return [];
    };

    return {
      authorId: item?.authorId || item?.id || item?.author_id || '',
      starId: item?.starId || item?.star_id || '',
      nickName: item?.nickName || item?.canonical_name || '',
      avatarUri: item?.avatarUri || item?.avatar_uri || item?.avatar_url || '',
      follower,
      influencerTier: item?.influencerTier || inferTier(follower),
      gender,
      location,
      updatedAt,
      // 添加表格需要的字段映射
      starIndex: Number(item?.star_index || item?.starIndex) || 0,  // 修改：0是有效值
      province,
      city,
      price_1_20: Number(item?.price_1_20) || 0,  // 修改：0是有效值
      price_20_60: Number(item?.price_20_60) || 0,  // 修改：0是有效值
      price_60: Number(item?.price_60) || 0,  // 修改：0是有效值
      eCommerceEnable: Boolean(item?.e_commerce_enable || item?.eCommerceEnable),
      vv_median_30d: Number(item?.vv_median_30d) || 0,  // 修改：0是有效值
      interact_rate_within_30d: Number(item?.interact_rate_within_30d) || 0,  // 修改：0是有效值
      star_video_cnt_90d: Number(item?.star_video_cnt_90d) || 0,  // 修改：0是有效值
      // 兼容性字段（驼峰命名）
      vvMedian30d: Number(item?.vv_median_30d) || 0,
      interactRateWithin30d: Number(item?.interact_rate_within_30d) || 0,
      starVideoCnt90d: Number(item?.star_video_cnt_90d) || 0,
      // 组装taskPrice对象
      taskPrice: {
        price20To60: Number(item?.price_20_60) || 0,
      },
      // 组装extraData对象
      extraData: {
        tags: parseContentTags(item?.content_tags_top3),
      },
    };
  };

  return {
    data: list.map(normalizeBasic),
    pagination: response?.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 },
  };
}

/**
 * 获取影响者详情
 */
export async function getInfluencerDetail(authorId: string): Promise<InfluencerDetailResponse> {
  const res = await requestClient.get<InfluencerDetailResponse>(`/influencer-manager/${authorId}`);

  const response = res as unknown as InfluencerDetailResponse;
  // 使用Record类型兼容后端的各种字段命名格式
  const src = (response?.data || {}) as Record<string, any>;

  const follower = Number(src?.follower ?? 0) || 0;
  const province = src?.province || '';
  const city = src?.city || '';
  const location = src?.location || [province, city].filter(Boolean).join(' ');
  const updatedAt = src?.updatedAt || src?.updated_at || src?.created_at || '';

  const detail: InfluencerDetail = {
    authorId: src?.authorId || src?.id || src?.author_id || '',
    starId: src?.starId || src?.star_id || '',
    nickName: src?.nickName || src?.canonical_name || '',
    avatarUri: src?.avatarUri || src?.avatar_uri || src?.avatar_url || '',
    follower,
    influencerTier: src?.influencerTier || (follower >= 10_000_000 ? 'mega' : follower >= 1_000_000 ? 'macro' : follower >= 100_000 ? 'micro' : 'nano'),
    gender: src?.gender || 'unknown',
    location,
    updatedAt,
    city: src?.city,
    province: src?.province,
    price1To20: src?.price1To20 ?? src?.price_1_20 ?? undefined,
    price20To60: src?.price20To60 ?? src?.price_20_60 ?? undefined,
    price60Plus: src?.price60Plus ?? src?.price_60 ?? undefined,
    unifiedTaskPriceList: src?.unifiedTaskPriceList ?? src?.unified_task_price_list ?? null,
    extra: src?.extra ?? null,
  };

  // 组装视图期望的 taskPrice
  detail.taskPrice = {
    video1_20s: detail.price1To20,
    video21_60s: detail.price20To60,
    video60sPlus: detail.price60Plus,
    // 尝试从统一任务价格中提取直播价格（若有）
    liveStream: Array.isArray(detail.unifiedTaskPriceList)
      ? (detail.unifiedTaskPriceList.find((p: any) => String(p?.task_category) === 'live' || String(p?.video_type) === 'live')?.price as number | undefined)
      : undefined,
  };

  // 组装视图期望的 extraData
  const extra = detail.extra as any;
  detail.extraData = extra
    ? {
        category: Array.isArray(extra.content_theme_labels_180d) && extra.content_theme_labels_180d.length > 0
          ? extra.content_theme_labels_180d[0]
          : undefined,
        tags: Array.isArray(extra.content_theme_labels_180d) ? extra.content_theme_labels_180d : undefined,
        introduction: undefined,
        priceNote: undefined,
      }
    : undefined;

  return { data: detail };
}

/**
 * 获取影响者完整数据（full-data）
 * 注意：该接口返回结构可能为 { code, message, data: { data: {...} } }
 * 因此做了兼容性解析，优先提取最内层的 data
 */
export async function getInfluencerFullData(authorId: string): Promise<Record<string, unknown>> {
  const res = await baseRequestClient.get(`/influencer-manager/${authorId}/full-data`);

  // 安全解析多层嵌套响应
  interface NestedData {
    data?: Record<string, unknown> | { data?: Record<string, unknown> | { data?: Record<string, unknown> } };
  }
  
  const response = res as NestedData;
  
  // 逐层解析
  if (response?.data && typeof response.data === 'object') {
    const level1 = response.data as { data?: Record<string, unknown> | { data?: Record<string, unknown> } };
    if (level1.data && typeof level1.data === 'object') {
      const level2 = level1.data as { data?: Record<string, unknown> };
      if (level2.data && typeof level2.data === 'object') {
        return level2.data; // 最内层
      }
      return level1.data as Record<string, unknown>; // 第二层
    }
    return response.data as Record<string, unknown>; // 第一层
  }
  
  return response as Record<string, unknown> || {};
}