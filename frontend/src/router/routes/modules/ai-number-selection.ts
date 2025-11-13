import type { RouteRecordRaw } from 'vue-router';

import { BasicLayout } from '#/layouts';
import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    // component: BasicLayout,
    component: () => import('#/views/ai-number-selection/index.vue'),
    meta: {
      authority: ['ai:number:selection:view'],
      icon: 'lucide:brain-circuit',
      order: 3,  // AI选号，排序第3
      title: $t('page.aiNumberSelection.title'),
      // hideInMenu:true,
    },
    name: 'AiNumberSelection',
    path: '/ai-number-selection',
    // children: [
    //   {
    //     name: 'AiNumberSelectionIndex',
    //     path: '/ai-number-selection/index',
    //     component: () => import('#/views/ai-number-selection/index.vue'),
    //     meta: {
    //       affixTab: false,
    //       icon: 'lucide:brain-circuit',
    //       title: $t('page.aiNumberSelection.title'),
    //       authority: ['ai:number:selection:view'],
    //       requiresAuth: true,
    //       permissions: ['ai:number:selection:view'],
    //     },
    //   },
    // ],
  },
];

export default routes;
