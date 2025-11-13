import type { RouteRecordRaw } from 'vue-router';

import { BasicLayout } from '#/layouts';
import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    component: BasicLayout,
    meta: {
      authority: ['finance:access'],
      icon: 'lucide:calculator',
      order: 800,
      title: $t('page.financialManagement.title'),
      hideInMenu:true,
    },
    name: 'FinancialManagement',
    path: '/financial-management',
    children: [
      {
        name: 'RebateManagement',
        path: '/financial-management/rebate-management',
        component: () => import('#/views/financial-management/rebate-management/index.vue'),
        meta: {
          affixTab: false,
          icon: 'lucide:trending-up',
          title: $t('page.financialManagement.rebateManagement'),
          authority: ['finance:rebate:view'],
          requiresAuth: true,
          permissions: ['finance:rebate:view'],
        },
      },
      {
        name: 'RebatePolicyConfig',
        path: '/financial-management/rebate-policy-config',
        component: () => import('#/views/financial-management/rebate-policy-config/index.vue'),
        meta: {
          affixTab: false,
          icon: 'lucide:settings-2',
          title: $t('page.financialManagement.rebatePolicyConfig'),
          authority: ['finance:rebate:policy:view'],
          requiresAuth: true,
          permissions: ['finance:rebate:policy:view'],
        },
      },
      {
        name: 'RebateFlow',
        path: '/financial-management/rebate-flow',
        component: () => import('#/views/rebate-flow/index.vue'),
        meta: {
          affixTab: false,
          icon: 'lucide:workflow',
          title: '返点流程跟进',
          authority: ['finance:rebate:flow:view'],
          requiresAuth: true,
          permissions: ['finance:rebate:flow:view'],
        },
      },
    ],
  },
];

export default routes;
