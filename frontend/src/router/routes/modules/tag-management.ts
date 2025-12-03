import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    name: 'TagManagement',
    path: '/tag-management',
    component: () => import('#/views/tag-management/index.vue'),
    meta: {
      hideInMenu: true, // 隐藏此菜单
      icon: 'lucide:tags',
      order: 2,
      title: $t('page.tagManagement.title'),
      requiresAuth: true,
      permissions: ['tag:view'],
    },
  },
];

export default routes;