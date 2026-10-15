import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    component: () => import('#/views/ai-number-selection/index.vue'),
    meta: {
      icon: 'lucide:brain-circuit',
      order: 3,
      permissions: ['influencer:filter:quick'],
      requiresAuth: true,
      title: 'AI 选人',
    },
    name: 'AiNumberSelection',
    path: '/ai-number-selection',
  },
];

export default routes;
