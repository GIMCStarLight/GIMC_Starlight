import type { RouteRecordRaw } from 'vue-router';

import { BasicLayout } from '#/layouts';
import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    component: BasicLayout,
    meta: {
      authority: ['policy:access'],
      icon: 'lucide:file-text',
      order: 900,
      title: $t('page.policyManagement.title'),
      hideInMenu:true,
    },
    name: 'PolicyManagement',
    path: '/policy-management',
    children: [
      {
        name: 'PolicyVersionManagement',
        path: '/policy-management/policy-version-management',
        component: () => import('#/views/policy-management/policy-version-management/index.vue'),
        meta: {
          affixTab: false,
          icon: 'lucide:git-branch',
          title: $t('page.policyManagement.policyVersionManagement'),
          authority: ['policy:version:view'],
          requiresAuth: true,
          permissions: ['policy:version:view'],
        },
      },
    ],
  },
];

export default routes;
