import type { RequestClient } from '@vben/request';
import { log } from '../utils/logger';
import { requestClient } from './request';

// 标签筛选相关的类型定义
export interface TagFilterResult {
  id: number;
  name: string;
  code?: string;
  description?: string;
  platform: string;
  level: number;
  parentId?: number;
  sort: number;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  parent?: TagFilterResult;
  children?: TagFilterResult[];
  fullPath?: string;
  isRoot?: boolean;
  isLeaf?: boolean;
}

export interface SearchParams {
  keyword?: string;
  searchType?: string;
  cooperationRequest?: any;
  matchingDegree?: any;
  costEffectiveness?: any;
  themeRecommendations?: any[];
}

/**
 * 标签筛选API类
 */
class TagFilterApi {
  private client: RequestClient;

  constructor(client: RequestClient) {
    this.client = client;
  }

  /**
   * 搜索标签（模拟数据）
   */
  search = async (params: SearchParams): Promise<TagFilterResult[]> => {
    // 模拟API调用延迟
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 返回模拟数据
    const mockResults: TagFilterResult[] = [
      {
        id: 1,
        name: '合作诉求',
        code: 'cooperation_request',
        description: '星图平台1级标签：合作诉求',
        platform: '星图',
        level: 1,
        sort: 0,
        isActive: true,
        createdAt: '2025-09-24T05:14:14.409Z',
        updatedAt: '2025-09-24T05:14:14.409Z',
        fullPath: '合作诉求',
        isRoot: true,
        isLeaf: true
      },
      {
        id: 2,
        name: '题材类型',
        code: 'content_type',
        description: '星图平台2级标签：题材类型',
        platform: '星图',
        level: 2,
        parentId: 1,
        sort: 0,
        isActive: true,
        createdAt: '2025-09-24T05:14:14.415Z',
        updatedAt: '2025-09-24T05:14:14.415Z',
        fullPath: '合作诉求 > 题材类型',
        isRoot: false,
        isLeaf: true
      },
      {
        id: 3,
        name: '短视频达人',
        code: 'short_video_talent',
        description: '星图平台3级标签：短视频达人',
        platform: '星图',
        level: 3,
        parentId: 2,
        sort: 0,
        isActive: true,
        createdAt: '2025-09-24T05:14:14.422Z',
        updatedAt: '2025-09-24T05:14:14.422Z',
        fullPath: '合作诉求 > 题材类型 > 短视频达人',
        isRoot: false,
        isLeaf: true
      },
      {
        id: 4,
        name: '定制短剧达人',
        code: 'custom_drama_talent',
        description: '星图平台3级标签：定制短剧达人',
        platform: '星图',
        level: 3,
        parentId: 2,
        sort: 0,
        isActive: true,
        createdAt: '2025-09-24T05:14:14.428Z',
        updatedAt: '2025-09-24T05:14:14.428Z',
        fullPath: '合作诉求 > 题材类型 > 定制短剧达人',
        isRoot: false,
        isLeaf: true
      },
      {
        id: 5,
        name: '甜宠',
        code: 'sweet_romance',
        description: '星图平台4级标签：甜宠',
        platform: '星图',
        level: 4,
        parentId: 4,
        sort: 0,
        isActive: true,
        createdAt: '2025-09-24T05:14:14.432Z',
        updatedAt: '2025-09-24T05:14:14.432Z',
        fullPath: '合作诉求 > 题材类型 > 定制短剧达人 > 甜宠',
        isRoot: false,
        isLeaf: true
      },
      {
        id: 6,
        name: '搞笑',
        code: 'comedy',
        description: '星图平台4级标签：搞笑',
        platform: '星图',
        level: 4,
        parentId: 4,
        sort: 0,
        isActive: true,
        createdAt: '2025-09-24T05:14:14.437Z',
        updatedAt: '2025-09-24T05:14:14.437Z',
        fullPath: '合作诉求 > 题材类型 > 定制短剧达人 > 搞笑',
        isRoot: false,
        isLeaf: true
      },
      {
        id: 7,
        name: '喜剧',
        code: 'comedy_genre',
        description: '星图平台4级标签：喜剧',
        platform: '星图',
        level: 4,
        parentId: 4,
        sort: 0,
        isActive: true,
        createdAt: '2025-09-24T05:14:14.443Z',
        updatedAt: '2025-09-24T05:14:14.443Z',
        fullPath: '合作诉求 > 题材类型 > 定制短剧达人 > 喜剧',
        isRoot: false,
        isLeaf: true
      },
      {
        id: 8,
        name: '正能量',
        code: 'positive_energy',
        description: '星图平台4级标签：正能量',
        platform: '星图',
        level: 4,
        parentId: 4,
        sort: 0,
        isActive: true,
        createdAt: '2025-09-24T05:14:14.449Z',
        updatedAt: '2025-09-24T05:14:14.449Z',
        fullPath: '合作诉求 > 题材类型 > 定制短剧达人 > 正能量',
        isRoot: false,
        isLeaf: true
      },
      {
        id: 9,
        name: '成长',
        code: 'growth',
        description: '星图平台4级标签：成长',
        platform: '星图',
        level: 4,
        parentId: 4,
        sort: 0,
        isActive: true,
        createdAt: '2025-09-24T05:14:14.454Z',
        updatedAt: '2025-09-24T05:14:14.454Z',
        fullPath: '合作诉求 > 题材类型 > 定制短剧达人 > 成长',
        isRoot: false,
        isLeaf: true
      },
      {
        id: 10,
        name: '悬疑推理',
        code: 'mystery_reasoning',
        description: '星图平台4级标签：悬疑推理',
        platform: '星图',
        level: 4,
        parentId: 4,
        sort: 0,
        isActive: true,
        createdAt: '2025-09-24T05:14:14.461Z',
        updatedAt: '2025-09-24T05:14:14.461Z',
        fullPath: '合作诉求 > 题材类型 > 定制短剧达人 > 悬疑推理',
        isRoot: false,
        isLeaf: true
      },
      {
        id: 11,
        name: '伦理',
        code: 'ethics',
        description: '星图平台4级标签：伦理',
        platform: '花火',
        level: 4,
        parentId: 4,
        sort: 0,
        isActive: false,
        createdAt: '2025-09-24T05:14:14.466Z',
        updatedAt: '2025-09-24T05:14:14.466Z',
        fullPath: '合作诉求 > 题材类型 > 定制短剧达人 > 伦理',
        isRoot: false,
        isLeaf: true
      },
      {
        id: 12,
        name: '爱情',
        code: 'love',
        description: '星图平台4级标签：爱情',
        platform: '蒲公英',
        level: 4,
        parentId: 4,
        sort: 0,
        isActive: true,
        createdAt: '2025-09-24T05:14:14.472Z',
        updatedAt: '2025-09-24T05:14:14.472Z',
        fullPath: '合作诉求 > 题材类型 > 定制短剧达人 > 爱情',
        isRoot: false,
        isLeaf: true
      }
    ];

    // 根据搜索关键词过滤结果
    let filteredResults = mockResults;
    
    if (params.keyword) {
      const keyword = params.keyword.toLowerCase();
      filteredResults = mockResults.filter(tag => 
        tag.name.toLowerCase().includes(keyword) ||
        tag.description?.toLowerCase().includes(keyword) ||
        tag.code?.toLowerCase().includes(keyword)
      );
    }

    // 根据筛选条件进一步过滤
    if (params.cooperationRequest?.contentType?.value) {
      // 这里可以根据实际需求添加更复杂的筛选逻辑
      log.debug('筛选条件 - 题材类型:', params.cooperationRequest.contentType.value);
    }

    if (params.matchingDegree) {
      // 这里可以根据实际需求添加更复杂的筛选逻辑
      log.debug('筛选条件 - 匹配度:', params.matchingDegree);
    }

    if (params.costEffectiveness) {
      // 这里可以根据实际需求添加更复杂的筛选逻辑
      log.debug('筛选条件 - 性价比:', params.costEffectiveness);
    }

    if (params.themeRecommendations && params.themeRecommendations.length > 0) {
      // 这里可以根据实际需求添加更复杂的筛选逻辑
      log.debug('筛选条件 - 主题推荐:', params.themeRecommendations);
    }

    // 模拟返回筛选后的结果
    return filteredResults.slice(0, 10); // 限制返回10个结果
  }
}

// 导出标签筛选API实例
export const tagFilterApi = new TagFilterApi(requestClient);

// 导出便捷方法
export const {
  search: searchTags,
} = tagFilterApi;
