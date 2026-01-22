import type { RouteRecordRaw } from 'vue-router';

import { BasicLayout } from '#/layouts';
import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    component: BasicLayout,
    meta: {
      icon: 'lucide:truck',
      order: 3,
      title: $t('page.supplier.title'),
    },
    name: 'SupplierManagement',
    path: '/supplier-management',
    children: [
      {
        name: 'SupplierManagementIndex',
        path: '',
        component: () => import('#/views/supplier-management/supplier-management/index.vue'),
        meta: {
          icon: 'lucide:truck',
          title: $t('page.supplier.title'),
        },
      },
    ],
  },
];

export default routes;
