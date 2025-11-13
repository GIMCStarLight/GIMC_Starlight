import type { RouteRecordRaw } from 'vue-router';

import { BasicLayout } from '#/layouts';
import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    component: BasicLayout,
    meta: {
      authority: ['admin:access'],
      icon: 'lucide:settings',
      order: 6,  // 系统管理，排序第6
      title: $t('page.system.title'),
    },
    name: 'System',
    path: '/system',
    children: [
      {
        name: 'SystemRole',
        path: '/system/role',
        component: () => import('#/views/system/role/index.vue'),
        meta: {
          affixTab: false,
          icon: 'lucide:users',
          title: $t('page.system.role'),
        },
      },
      {
        name: 'SystemPermission',
        path: '/system/permission',
        component: () => import('#/views/system/permission/index.vue'),
        meta: {
          affixTab: false,
          icon: 'lucide:shield-check',
          title: $t('page.system.permission'),
        },
      },
      {
        name: 'SystemUser',
        path: '/system/user',
        component: () => import('#/views/system/user/index.vue'),
        meta: {
          affixTab: false,
          icon: 'lucide:user',
          title: $t('page.system.user.title'),
        },
      },
    ],
  },
];

export default routes;
