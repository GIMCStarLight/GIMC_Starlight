import { baseRequestClient } from './request';

/**
 * 星链计划达人 API
 * 使用 baseRequestClient 获取完整响应（包括 pagination 信息）
 */
export const StarlinkInfluencerApi = {
  /**
   * 获取星链计划达人列表
   */
  getList: (params: { page: number; limit: number }) => {
    return baseRequestClient.get('/starlink-influencers', { params });
  },

  /**
   * 获取单个星链计划达人详情
   */
  getById: (id: number) => {
    return baseRequestClient.get(`/starlink-influencers/${id}`);
  },

  /**
   * 更新星链计划达人信息
   */
  update: (id: number, data: any) => {
    return baseRequestClient.put(`/starlink-influencers/${id}`, data);
  },

  /**
   * 删除星链计划达人
   */
  remove: (id: number) => {
    return baseRequestClient.delete(`/starlink-influencers/${id}`);
  },
};

/**
 * 省广星媒独家签约达人 API
 * 使用 baseRequestClient 获取完整响应（包括 pagination 信息）
 */
export const StarmediaInfluencerApi = {
  /**
   * 获取省广星媒独家签约达人列表
   */
  getList: (params: { page: number; limit: number }) => {
    return baseRequestClient.get('/starmedia-influencers', { params });
  },

  /**
   * 获取单个省广星媒独家签约达人详情
   */
  getById: (id: number) => {
    return baseRequestClient.get(`/starmedia-influencers/${id}`);
  },

  /**
   * 更新省广星媒独家签约达人信息
   */
  update: (id: number, data: any) => {
    return baseRequestClient.put(`/starmedia-influencers/${id}`, data);
  },

  /**
   * 删除省广星媒独家签约达人
   */
  remove: (id: number) => {
    return baseRequestClient.delete(`/starmedia-influencers/${id}`);
  },
};
