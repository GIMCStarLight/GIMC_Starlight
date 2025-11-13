import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    name: 'AIAssistant',
    path: '/ai-assistant',
    component: () => import('#/views/ai-assistant/index.vue'),
    meta: {
      icon: 'lucide:bot',
      order: 1,
      title: 'AI助手',
      // 权限控制
      hideInMenu:true,
      requiresAuth: true,
      permissions: ['ai:assistant:view'],
    },
  },
];

export default routes;
