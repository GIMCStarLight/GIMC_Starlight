import { SetMetadata } from '@nestjs/common';

/**
 * 字段权限过滤装饰器
 * 用于标记需要进行字段级权限过滤的控制器方法
 * 
 * @param resource 资源类型: 'influencer' | 'kol'
 * @example
 * @FilterFields('influencer')
 * async getInfluencerList() { ... }
 */
export const FIELD_FILTER_KEY = 'field_filter_resource';
export const FilterFields = (resource: 'influencer' | 'kol') => 
  SetMetadata(FIELD_FILTER_KEY, resource);

/**
 * 跳过字段过滤装饰器
 * 用于标记不需要字段过滤的方法（如管理员专用接口）
 */
export const SKIP_FIELD_FILTER_KEY = 'skip_field_filter';
export const SkipFieldFilter = () => SetMetadata(SKIP_FIELD_FILTER_KEY, true);
