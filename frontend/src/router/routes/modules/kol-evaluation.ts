// 达人评价
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    name: 'kolEvaluation',
    path: '/kolEvaluation',
    component: () => import('#/views/kol-evaluation/index.vue'),
    meta: {
      icon: 'lucide:star',
      title: '评价总览',
      order: 4,  // 评价总览，排序第4
      // hideInMenu: true,
      // permissions: ['resource:influencer:evaluation:view'],
    },
  },
];

export default routes;
