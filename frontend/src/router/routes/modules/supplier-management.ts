import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    name: 'SupplierManagement',
    path: '/supplier-management',
    component: () => import('#/views/supplier-management/supplier-management/index.vue'),
    meta: {
      icon: 'lucide:user-pen',
      order: 5,
      title: '供应商管理',
      hideInMenu: false,
      requiresAuth: true,
      permissions: ['supplier:view'],
    },
    
  },
];

export default routes;