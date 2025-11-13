import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    name: 'AIAssistantTest',
    path: '/ai-assistant-test',
    component: () => import('#/views/ai-assistant-test/index.vue'),
    meta: {
      icon: 'lucide:bot',
      order: 2,
      title: 'AI助手测试',
      hideInMenu:true,
      // 权限控制
    //   requiresAuth: true,
    //   permissions: ['ai:assistant:view'],
    },
  },
];

export default routes;
