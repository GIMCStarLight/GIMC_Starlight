import type { RouteRecordRaw } from 'vue-router';
import { h, defineComponent } from 'vue';
import { ElIcon } from 'element-plus';
import { User } from '@element-plus/icons-vue';

const ElUserIcon = defineComponent({
  name: 'ElUserIcon',
  setup() {
    return () => h(ElIcon, null, { default: () => h(User) });
  },
});

const routes: RouteRecordRaw[] = [
  {
    name: 'influencerManagement',
    path: '/influencer-management',
    component: () => import('#/views/influencer-management/index.vue'),
    meta: {
      icon: ElUserIcon,
      title: '临时数据校验',
      order: 15,
      requiresAuth: true,
      permissions: ['influencer:manage'],
      hideInMenu: true,
    },
  },
];

export default routes;
