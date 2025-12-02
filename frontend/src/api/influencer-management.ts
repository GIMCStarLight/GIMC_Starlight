import { requestClient } from './request';

// 星链计划达人相关接口
export namespace StarlinkInfluencerApi {
  export interface Influencer {
    id: number;
    kolSerialNumber: number;
    nickname: string;
    profileUrl?: string;
    starPlatformUrl?: string;
    primaryPlatform?: string;
    accountCategory?: string;
    fansCount?: number;
    price1To20s?: number;
    price21To60s?: number;
    price60sPlus?: number;
    policyTiers?: string;
    policyTiersSummary?: string;
    hasGuaranteedMetrics?: boolean;
    minRebateRate?: number;
    maxRebateRate?: number;
    policyRemarks?: string;
    currentOrderCount?: number;
    kolIntroduction?: string;
    achievementHighlights?: string;
    rankingInfo?: string;
    collaborationPlatforms?: string;
    distributionPlatforms?: string;
    distributionRules?: string;
    specialBenefits?: string;
    pastCooperationBrands?: string;
    cooperationIndustries?: string;
    certifications?: string;
    awardsHonors?: string;
    contentStyle?: string;
    targetAudience?: string;
    contentAdvantages?: string;
    relatedAccounts?: string;
    accountMatrix?: string;
    allPlatforms?: string;
    secondHalfOrderCount?: number;
    remarks?: string;
    createdAt?: string;
    updatedAt?: string;
  }

  export interface ListResponse {
    data: Influencer[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }

  // 获取列表
  export function getList(params: { page?: number; limit?: number }) {
    return requestClient.get<ListResponse>('/starlink-influencers', {
      params,
    });
  }

  // 获取详情
  export function getDetail(id: number) {
    return requestClient.get<Influencer>(`/starlink-influencers/${id}`);
  }

  // 更新
  export function update(id: number, data: Partial<Influencer>) {
    return requestClient.put<Influencer>(`/starlink-influencers/${id}`, data);
  }

  // 删除
  export function remove(id: number) {
    return requestClient.delete(`/starlink-influencers/${id}`);
  }
}

// 省广星媒独家签约达人相关接口
export namespace StarmediaInfluencerApi {
  export interface Influencer {
    id: number;
    influencerSerialNumber: number;
    accountId: string;
    nickname: string;
    influencerOverview?: string;
    affiliatedOrganization?: string;
    influencerCategory?: string;
    totalFans?: number;
    contractStatus?: string;
    contractPeriod?: string;
    contractStartDate?: string;
    contractEndDate?: string;
    contractMonths?: number;
    contractRebateRate?: number;
    platformAccounts?: string;
    allPlatforms?: string;
    statusRemarks?: string;
    createdAt?: string;
    updatedAt?: string;
  }

  export interface ListResponse {
    data: Influencer[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }

  // 获取列表
  export function getList(params: { page?: number; limit?: number }) {
    return requestClient.get<ListResponse>('/starmedia-influencers', {
      params,
    });
  }

  // 获取详情
  export function getDetail(id: number) {
    return requestClient.get<Influencer>(`/starmedia-influencers/${id}`);
  }

  // 更新
  export function update(id: number, data: Partial<Influencer>) {
    return requestClient.put<Influencer>(`/starmedia-influencers/${id}`, data);
  }

  // 删除
  export function remove(id: number) {
    return requestClient.delete(`/starmedia-influencers/${id}`);
  }
}
