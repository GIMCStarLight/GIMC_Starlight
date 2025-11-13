import type { RouteRecordRaw } from 'vue-router';

// import { $t } from '#/locales'; // 临时隐藏菜单时不需要

const routes: RouteRecordRaw[] = [
  // 临时隐藏：标签筛选菜单
  // {
  //   name: 'TagFilter',
  //   path: '/tag-filter',
  //   component: () => import('#/views/tag-filter/index.vue'),
  //   meta: {
  //     icon: 'lucide:filter',
  //     order: 3,
  //     title: $t('page.tagFilter.title'),
  //     // 权限控制
  //     requiresAuth: true,
  //     permissions: ['tag:filter:view'],
  //   },
  // },
];

export default routes;
