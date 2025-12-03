import type { RouteRecordRaw } from 'vue-router';

import { BasicLayout } from '#/layouts';
import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    component: BasicLayout,
    meta: {
      authority: ['work-order:access'],
      icon: 'lucide:clipboard-list',
      order: 5.5, // 工单管理，排序在供应商管理和系统管理之间
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
