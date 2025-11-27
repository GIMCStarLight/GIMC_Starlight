import type { RouteRecordRaw } from 'vue-router';

import { BasicLayout } from '#/layouts';
import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    component: BasicLayout,
    meta: {
      authority: ['work-order:access'],
      icon: 'lucide:clipboard-list',
      order: 7,
      title: $t('page.workOrder.title'),
    },
    name: 'WorkOrder',
    path: '/work-order',
    children: [
      {
        name: 'WorkOrderList',
        path: '/work-order/list',
        component: () => import('#/views/work-order/index.vue'),
        meta: {
          affixTab: false,
          icon: 'lucide:list',
          title: $t('page.workOrder.list'),
        },
      },
    ],
  },
];

export default routes;
