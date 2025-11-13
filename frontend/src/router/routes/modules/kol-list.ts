// 达人评价
import type { RouteRecordRaw } from 'vue-router';
import { h, defineComponent } from 'vue';
import { ElIcon } from 'element-plus';
import { UserFilled, Clock } from '@element-plus/icons-vue';

// 使用 Element Plus 的 <el-icon><UserFilled /></el-icon> 作为路由图标
const ElUserFilledIcon = defineComponent({
  name: 'ElUserFilledIcon',
  setup() {
    return () => h(ElIcon, null, { default: () => h(UserFilled) });
  },
});

// 使用 Element Plus 的 <el-icon><Clock /></el-icon> 作为路由图标
const ElClockIcon = defineComponent({
  name: 'ElClockIcon',
  setup() {
    return () => h(ElIcon, null, { default: () => h(Clock) });
  },
});

const routes: RouteRecordRaw[] = [
  {
    name: 'kolListLegacy',
    path: '/kolList/legacy',
    component: () => import('#/views/kol/index.vue'),
    meta: {
      icon: ElUserFilledIcon,
      title: '机构达人',
      order: 2,  // 机构达人，排序第2
      // hideInMenu: true, // 显示在菜单中
      // permissions: ['resource:influencer:management:view'],
    },
  },
  {
    name: 'importHistory',
    path: '/import-history',
    component: () => import('#/views/import-history/index.vue'),
    meta: {
      icon: ElClockIcon,
      title: '导入历史',
      order: 12,
      hideInMenu: true, // 隐藏在菜单中，改为从自有达人界面访问
      // permissions: ['resource:influencer:import:view'],
    },
  },
];

export default routes;
