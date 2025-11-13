import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  // 旧路径重定向到新路径
  {
    path: '/influencer-authors',
    redirect: '/influencer-authors-v3',
  },
  // V3版达人广场（最新推荐）
  {
    name: 'InfluencerAuthorsV3',
    path: '/influencer-authors-v3',
    component: () => import('#/views/influencer-authors/index-v3.vue'),
    meta: {
      icon: 'lucide:sparkles',
      order: 1,  // 达人广场，排序第1
      title: '达人广场',
      requiresAuth: true,
      permissions: ['influencer:view'],
    },
  },
  // 达人详情页（不显示在菜单中）
  {
    name: 'InfluencerDetail',
    path: '/influencer-detail/:id',
    component: () => import('#/views/influencer-detail/index.vue'),
    meta: {
      icon: 'lucide:circle-ellipsis',
      order: 100,
      title: '达人详情',
      hideInMenu: true,  // 不在菜单中显示
      requiresAuth: true,  // 需要登录
      permissions: ['influencer:view'],  // 使用与达人广场相同的权限
    },
  },
];

export default routes;