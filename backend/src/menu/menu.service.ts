import { Injectable } from '@nestjs/common';

export interface MenuItem {
  id: string;
  name: string;
  path: string;
  component: string;
  icon?: string;
  sort: number;
  parentId?: string;
  children?: MenuItem[];
  meta?: {
    title: string;
    icon?: string;
    requiresAuth?: boolean;
    permissions?: string[];
  };
}

@Injectable()
export class MenuService {
  /**
   * 获取所有菜单
   */
  getAllMenus(): MenuItem[] {
    // 这里返回系统管理相关的菜单结构
    const menus: MenuItem[] = [
      // 临时隐藏：概览（首页）菜单
      // {
      //   id: '1',
      //   name: '首页',
      //   path: '/dashboard',
      //   component: '/dashboard/index',
      //   icon: 'dashboard',
      //   sort: 0,
      //   meta: {
      //     title: '首页',
      //     icon: 'dashboard',
      //     requiresAuth: true,
      //   },
      // },
      {
        id: '2',
        name: '达人数据',
        path: '/authors',
        component: '/authors/index',
        icon: 'lucide:users',
        sort: 1,
        meta: {
          title: '达人数据',
          icon: 'lucide:users',
          requiresAuth: true,
          permissions: ['author:view'],
        },
      },
      {
        id: '3',
        name: '达人管理',
        path: '/author-management',
        component: '/authors/management',
        icon: 'lucide:user-cog',
        sort: 2,
        meta: {
          title: '达人管理',
          icon: 'lucide:user-cog',
          requiresAuth: true,
          permissions: ['author:manage'],
        },
      },
      // 临时隐藏：标签筛选菜单
      // {
      //   id: '4',
      //   name: '标签筛选',
      //   path: '/tag-filter',
      //   component: '/tag-filter/index',
      //   icon: 'lucide:filter',
      //   sort: 3,
      //   meta: {
      //     title: '标签筛选',
      //     icon: 'lucide:filter',
      //     requiresAuth: true,
      //     permissions: ['tag:filter:view'],
      //   },
      // },
      {
        id: '5',
        name: 'AI选号',
        path: '/ai-number-selection',
        component: '/ai-number-selection/index',
        icon: 'lucide:brain-circuit',
        sort: 4,
        meta: {
          title: 'AI选号',
          icon: 'lucide:brain-circuit',
          requiresAuth: true,
          permissions: ['ai:number:selection:view'],
        },
      },
      {
        id: '6',
        name: '财务管理',
        path: '/financial-management',
        component: 'Layout',
        icon: 'finance',
        sort: 5,
        meta: {
          title: '财务管理',
          icon: 'finance',
          requiresAuth: true,
          permissions: ['finance:access'],
        },
        children: [
          {
            id: '6-1',
            name: '返点管理',
            path: '/financial-management/rebate-management',
            component: '/financial-management/rebate-management/index',
            icon: 'rebate',
            sort: 1,
            parentId: '6',
            meta: {
              title: '返点管理',
              icon: 'rebate',
              requiresAuth: true,
              permissions: ['finance:rebate:view'],
            },
          },
          {
            id: '6-2',
            name: '返点政策配置',
            path: '/financial-management/rebate-policy-config',
            component: '/financial-management/rebate-policy-config/index',
            icon: 'policy',
            sort: 2,
            parentId: '6',
            meta: {
              title: '返点政策配置',
              icon: 'policy',
              requiresAuth: true,
              permissions: ['finance:rebate:policy:view'],
            },
          },
          {
            id: '6-3',
            name: '返点流程跟进',
            path: '/financial-management/rebate-flow',
            component: '/financial-management/rebate-flow/index',
            icon: 'workflow',
            sort: 3,
            parentId: '6',
            meta: {
              title: '返点流程跟进',
              icon: 'workflow',
              requiresAuth: true,
              permissions: ['finance:rebate:flow:view'],
            },
          },
        ],
      },
      {
        id: '7',
        name: '政策管理',
        path: '/policy-management',
        component: 'Layout',
        icon: 'policy-management',
        sort: 6,
        meta: {
          title: '政策管理',
          icon: 'policy-management',
          requiresAuth: true,
          permissions: ['policy:access'],
        },
        children: [
          {
            id: '7-1',
            name: '政策版本管理',
            path: '/policy-management/policy-version-management',
            component: '/policy-management/policy-version-management/index',
            icon: 'version',
            sort: 1,
            parentId: '7',
            meta: {
              title: '政策版本管理',
              icon: 'version',
              requiresAuth: true,
              permissions: ['policy:version:view'],
            },
          },
        ],
      },
      {
        id: '8',
        name: '资源管理',
        path: '/resource-management',
        component: 'Layout',
        icon: 'resource',
        sort: 7,
        meta: {
          title: '资源管理',
          icon: 'resource',
          requiresAuth: true,
          permissions: ['resource:access'],
        },
        children: [
          {
            id: '8-1',
            name: '达人管理',
            path: '/resource-management/influencer-management',
            component: '/resource-management/influencer-management/index',
            icon: 'user-star',
            sort: 1,
            parentId: '8',
            meta: {
              title: '达人管理',
              icon: 'user-star',
              requiresAuth: true,
              permissions: ['resource:influencer:view'],
            },
          },
          {
            id: '8-2',
            name: '达人评价',
            path: '/resource-management/influencer-evaluation',
            component: '/resource-management/influencer-evaluation/index',
            icon: 'star',
            sort: 2,
            parentId: '8',
            meta: {
              title: '达人评价',
              icon: 'star',
              requiresAuth: true,
              permissions: ['resource:influencer:evaluation:view'],
            },
          },
        ],
      },
      {
        id: '10',
        name: '工单管理',
        path: '/work-order',
        component: '/work-order/index',
        icon: 'lucide:clipboard-list',
        sort: 8,
        meta: {
          title: '工单管理',
          icon: 'lucide:clipboard-list',
          requiresAuth: true,
          permissions: ['work-order:access'],
        },
      },
      {
        id: '9',
        name: '系统管理',
        path: '/system',
        component: 'Layout',
        icon: 'system',
        sort: 10,
        meta: {
          title: '系统管理',
          icon: 'system',
          requiresAuth: true,
          permissions: ['system:read'],
        },
        children: [
          {
            id: '9-1',
            name: '用户管理',
            path: '/system/user',
            component: '/system/user/index',
            icon: 'user',
            sort: 1,
            parentId: '9',
            meta: {
              title: '用户管理',
              icon: 'user',
              requiresAuth: true,
              permissions: ['user:view'],
            },
          },
          {
            id: '9-2',
            name: '角色管理',
            path: '/system/role',
            component: '/system/role/index',
            icon: 'role',
            sort: 2,
            parentId: '9',
            meta: {
              title: '角色管理',
              icon: 'role',
              requiresAuth: true,
              permissions: ['role:read'],
            },
          },
          {
            id: '9-3',
            name: '权限管理',
            path: '/system/permission',
            component: '/system/permission/index',
            icon: 'permission',
            sort: 3,
            parentId: '9',
            meta: {
              title: '权限管理',
              icon: 'permission',
              requiresAuth: true,
              permissions: ['permission:read'],
            },
          },
          {
            id: '9-4',
            name: '账号管理',
            path: '/system/account',
            component: '/system/account/index',
            icon: 'account',
            sort: 4,
            parentId: '9',
            meta: {
              title: '账号管理',
              icon: 'account',
              requiresAuth: true,
              permissions: ['account:view'],
            },
          },
        ],
      },
    ];

    return menus;
  }
}
