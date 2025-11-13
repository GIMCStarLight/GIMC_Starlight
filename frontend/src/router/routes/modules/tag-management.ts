import type { RouteRecordRaw } from 'vue-router';

// import { $t } from '#/locales'; // 临时隐藏菜单时不需要

const routes: RouteRecordRaw[] = [
  // 临时隐藏：标签管理菜单
  // {
  //   name: 'TagManagement',
  //   path: '/tag-management',
  //   component: () => import('#/views/tag-management/index.vue'),
  //   meta: {
  //     icon: 'lucide:tags',
  //     order: 2,
  //     title: $t('page.tagManagement.title'),
  //     // 权限控制
  //     requiresAuth: true,
  //     permissions: ['tag:manage'],
  //   },
  // },
];

export default routes;