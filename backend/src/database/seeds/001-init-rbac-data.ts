import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import {
  UserAuth,
  UserProfile,
  Role,
  Permission,
  UserRole,
  RolePermission,
} from '../entities';

/**
 * RBAC系统初始化种子数据
 * 创建基础的权限、角色和超级管理员用户
 */
export class InitRbacDataSeed {
  public async run(dataSource: DataSource): Promise<void> {
    const queryRunner = dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. 创建基础权限
      const permissions = await this.createPermissions(queryRunner.manager);
      console.log('✅ 权限数据初始化完成');

      // 2. 创建角色层级
      const roles = await this.createRoles(queryRunner.manager);
      console.log('✅ 角色数据初始化完成');

      // 3. 分配角色权限
      await this.assignRolePermissions(queryRunner.manager, roles, permissions);
      console.log('✅ 角色权限分配完成');

      // 4. 创建超级管理员用户
      await this.createSuperAdmin(queryRunner.manager, roles);
      console.log('✅ 超级管理员创建完成');

      await queryRunner.commitTransaction();
      console.log('🎉 RBAC系统初始化完成！');
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('❌ RBAC系统初始化失败:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * 创建基础权限
   */
  private async createPermissions(
    manager: any,
  ): Promise<Record<string, Permission>> {
    const permissionsData = [
      // 系统管理权限
      {
        code: 'admin:access',
        name: '系统管理',
        type: 'MENU',
        description: '访问系统管理模块',
      },
      {
        code: 'system:config',
        name: '系统配置',
        type: 'API',
        description: '系统配置管理',
      },

      // 用户管理权限
      {
        code: 'user:view',
        name: '查看用户',
        type: 'API',
        description: '查看用户列表和详情',
      },
      {
        code: 'user:create',
        name: '创建用户',
        type: 'API',
        description: '创建新用户',
      },
      {
        code: 'user:update',
        name: '更新用户',
        type: 'API',
        description: '更新用户信息',
      },
      {
        code: 'user:delete',
        name: '删除用户',
        type: 'API',
        description: '删除用户',
      },
      {
        code: 'user:manage',
        name: '用户管理',
        type: 'MENU',
        description: '用户管理模块权限',
      },

      // 角色权限管理
      {
        code: 'role:view',
        name: '查看角色',
        type: 'API',
        description: '查看角色列表和详情',
      },
      {
        code: 'role:create',
        name: '创建角色',
        type: 'API',
        description: '创建新角色',
      },
      {
        code: 'role:update',
        name: '更新角色',
        type: 'API',
        description: '更新角色信息',
      },
      {
        code: 'role:delete',
        name: '删除角色',
        type: 'API',
        description: '删除角色',
      },
      {
        code: 'role:assign',
        name: '分配角色',
        type: 'API',
        description: '为用户分配角色',
      },
      {
        code: 'role:manage',
        name: '角色管理',
        type: 'MENU',
        description: '角色管理模块权限',
      },

      // 权限管理
      {
        code: 'permission:view',
        name: '查看权限',
        type: 'API',
        description: '查看权限列表',
      },
      {
        code: 'permission:create',
        name: '创建权限',
        type: 'API',
        description: '创建新权限',
      },
      {
        code: 'permission:update',
        name: '更新权限',
        type: 'API',
        description: '更新权限信息',
      },
      {
        code: 'permission:delete',
        name: '删除权限',
        type: 'API',
        description: '删除权限',
      },
      {
        code: 'permission:assign',
        name: '分配权限',
        type: 'API',
        description: '为角色分配权限',
      },

      // 菜单权限
      {
        code: 'menu:read',
        name: '读取菜单',
        type: 'API',
        description: '获取用户可访问的菜单列表',
      },

      // 数据导出权限
      {
        code: 'data:export',
        name: '数据导出',
        type: 'BUTTON',
        description: '导出数据',
      },
      {
        code: 'data:export_sensitive',
        name: '敏感数据导出',
        type: 'BUTTON',
        description: '导出敏感数据',
      },

      // 项目管理权限
      {
        code: 'project:view',
        name: '查看项目',
        type: 'API',
        description: '查看项目信息',
      },
      {
        code: 'project:create',
        name: '创建项目',
        type: 'API',
        description: '创建新项目',
      },
      {
        code: 'project:update',
        name: '更新项目',
        type: 'API',
        description: '更新项目信息',
      },
      {
        code: 'project:delete',
        name: '删除项目',
        type: 'API',
        description: '删除项目',
      },
      {
        code: 'project:manage',
        name: '项目管理',
        type: 'MENU',
        description: '项目管理模块',
      },

      // 媒介购买权限
      {
        code: 'media:view',
        name: '查看媒介',
        type: 'API',
        description: '查看媒介信息',
      },
      {
        code: 'media:buy',
        name: '媒介购买',
        type: 'API',
        description: '执行媒介购买',
      },
      {
        code: 'media:report',
        name: '媒介报告',
        type: 'API',
        description: '生成媒介报告',
      },

      // 标签相关权限
      {
        code: 'tag:view',
        name: '查看标签',
        type: 'API',
        description: '查看标签列表与详情',
      },
      {
        code: 'tag:create',
        name: '创建标签',
        type: 'API',
        description: '创建新标签',
      },
      {
        code: 'tag:update',
        name: '更新标签',
        type: 'API',
        description: '更新标签信息',
      },
      {
        code: 'tag:delete',
        name: '删除标签',
        type: 'API',
        description: '删除标签',
      },
      {
        code: 'tag:manage',
        name: '标签管理',
        type: 'MENU',
        description: '标签管理模块访问',
      },
      {
        code: 'tag:filter:view',
        name: '查看标签筛选',
        type: 'API',
        description: '访问标签筛选页面（前端路由）',
      },

      // KOL管理权限
      {
        code: 'kol:view',
        name: '查看KOL',
        type: 'API',
        description: '查看KOL列表和详情',
      },
      {
        code: 'kol:create',
        name: '创建KOL',
        type: 'API',
        description: '创建新的KOL记录',
      },
      {
        code: 'kol:update',
        name: '更新KOL',
        type: 'API',
        description: '更新KOL信息',
      },
      {
        code: 'kol:delete',
        name: '删除KOL',
        type: 'API',
        description: '删除KOL记录',
      },
      {
        code: 'kol:batch:create',
        name: '批量创建KOL',
        type: 'API',
        description: '批量创建KOL',
      },
      {
        code: 'kol:batch:delete',
        name: '批量删除KOL',
        type: 'API',
        description: '批量删除KOL',
      },
      {
        code: 'kol:export',
        name: '导出KOL',
        type: 'BUTTON',
        description: '导出KOL数据',
      },
      {
        code: 'kol:match:view',
        name: '查看KOL匹配',
        type: 'API',
        description: '查看KOL匹配记录',
      },
      {
        code: 'kol:match:create',
        name: '创建KOL匹配',
        type: 'API',
        description: '创建KOL匹配',
      },
      {
        code: 'kol:match:update',
        name: '更新KOL匹配',
        type: 'API',
        description: '更新KOL匹配',
      },
      {
        code: 'kol:match:delete',
        name: '删除KOL匹配',
        type: 'API',
        description: '删除KOL匹配',
      },
      {
        code: 'kol:review:view',
        name: '查看KOL评审',
        type: 'API',
        description: '查看KOL评审记录',
      },
      {
        code: 'kol:review:create',
        name: '创建KOL评审',
        type: 'API',
        description: '创建KOL评审',
      },
      {
        code: 'kol:review:update',
        name: '更新KOL评审',
        type: 'API',
        description: '更新KOL评审',
      },
      {
        code: 'kol:review:approve',
        name: '审批KOL',
        type: 'API',
        description: 'KOL审批权限',
      },
      {
        code: 'kol:sync:trigger',
        name: '触发KOL同步',
        type: 'API',
        description: '手动触发KOL数据同步',
      },
      {
        code: 'kol:sync:status',
        name: '查看同步状态',
        type: 'API',
        description: '查看KOL同步状态',
      },
      {
        code: 'kol:sync:history',
        name: '查看同步历史',
        type: 'API',
        description: '查看KOL同步历史',
      },

      // 供应商管理权限
      {
        code: 'supplier:view',
        name: '查看供应商',
        type: 'API',
        description: '查看供应商列表',
      },
      {
        code: 'supplier:create',
        name: '创建供应商',
        type: 'API',
        description: '创建新供应商',
      },
      {
        code: 'supplier:update',
        name: '更新供应商',
        type: 'API',
        description: '更新供应商信息',
      },
      {
        code: 'supplier:delete',
        name: '删除供应商',
        type: 'API',
        description: '删除供应商',
      },
      {
        code: 'supplier:batch:create',
        name: '批量创建供应商',
        type: 'API',
        description: '批量创建供应商',
      },
      {
        code: 'supplier:batch:delete',
        name: '批量删除供应商',
        type: 'API',
        description: '批量删除供应商',
      },
      {
        code: 'supplier:template:download',
        name: '下载供应商模板',
        type: 'API',
        description: '下载供应商导入模板',
      },

      // 文件上传权限
      {
        code: 'upload:excel',
        name: 'Excel上传',
        type: 'API',
        description: '上传Excel文件',
      },
      {
        code: 'upload:validate',
        name: '验证数据',
        type: 'API',
        description: '验证导入数据',
      },
      {
        code: 'upload:import',
        name: '数据导入',
        type: 'API',
        description: '导入数据到数据库',
      },
      {
        code: 'upload:import:async',
        name: '异步数据导入',
        type: 'API',
        description: '异步导入大批量数据',
      },
      {
        code: 'upload:import:view',
        name: '查看导入历史',
        type: 'API',
        description: '查看数据导入历史',
      },

      // 达人筛选权限
      {
        code: 'influencer:filter:advanced',
        name: '高级筛选',
        type: 'API',
        description: '达人高级筛选',
      },
      {
        code: 'influencer:filter:quick',
        name: '快速筛选',
        type: 'API',
        description: '达人快速筛选',
      },
      {
        code: 'influencer:filter:stats',
        name: '筛选统计',
        type: 'API',
        description: '筛选统计数据',
      },

      // SQLBot权限
      {
        code: 'sqlbot:config:view',
        name: '查看SQLBot配置',
        type: 'API',
        description: '查看SQLBot配置',
      },
      {
        code: 'sqlbot:config:update',
        name: '更新SQLBot配置',
        type: 'API',
        description: '更新SQLBot配置',
      },
      {
        code: 'sqlbot:datasource:view',
        name: '查看数据源',
        type: 'API',
        description: '查看数据库连接信息(仅管理员)',
      },
      {
        code: 'sqlbot:token:generate',
        name: '生成Token',
        type: 'API',
        description: '生成SQLBot Token',
      },

      // 资源账号管理
      {
        code: 'source:account:view',
        name: '查看资源账号',
        type: 'API',
        description: '查看资源账号',
      },
      {
        code: 'source:account:create',
        name: '创建资源账号',
        type: 'API',
        description: '创建资源账号',
      },
      {
        code: 'source:account:update',
        name: '更新资源账号',
        type: 'API',
        description: '更新资源账号',
      },
      {
        code: 'source:account:delete',
        name: '删除资源账号',
        type: 'API',
        description: '删除资源账号',
      },

      // 达人数据相关权限
      {
        code: 'influencer:view',
        name: '查看达人数据',
        type: 'API',
        description: '查看达人数据列表与详情',
      },
      {
        code: 'influencer:create',
        name: '创建达人数据',
        type: 'API',
        description: '创建新的达人数据',
      },
      {
        code: 'influencer:update',
        name: '更新达人数据',
        type: 'API',
        description: '更新达人数据信息',
      },
      {
        code: 'influencer:delete',
        name: '删除达人数据',
        type: 'API',
        description: '删除达人数据',
      },
      {
        code: 'influencer:manage',
        name: '达人管理',
        type: 'MENU',
        description: '达人管理模块访问权限',
      },
      {
        code: 'influencer:export',
        name: '导出达人数据',
        type: 'BUTTON',
        description: '导出达人数据',
      },

      // AI选号相关权限
      {
        code: 'ai:number:selection:view',
        name: '查看AI选号',
        type: 'MENU',
        description: 'AI选号页面访问权限',
      },
      {
        code: 'ai:number:selection:use',
        name: '使用AI选号',
        type: 'API',
        description: '使用AI选号功能',
      },
      {
        code: 'ai:number:selection:history',
        name: '查看选号历史',
        type: 'API',
        description: '查看AI选号历史记录',
      },

      // 财务管理权限
      {
        code: 'finance:access',
        name: '财务管理',
        type: 'MENU',
        description: '访问财务管理模块',
      },
      {
        code: 'finance:rebate:view',
        name: '查看返点管理',
        type: 'API',
        description: '查看返点记录和统计',
      },
      {
        code: 'finance:rebate:export',
        name: '导出返点数据',
        type: 'BUTTON',
        description: '导出返点数据',
      },
      {
        code: 'finance:rebate:detail',
        name: '查看返点详情',
        type: 'API',
        description: '查看返点详细信息',
      },
      {
        code: 'finance:rebate:policy:view',
        name: '查看返点政策',
        type: 'API',
        description: '查看返点政策配置',
      },
      {
        code: 'finance:rebate:policy:create',
        name: '创建返点政策',
        type: 'API',
        description: '创建新的返点政策',
      },
      {
        code: 'finance:rebate:policy:update',
        name: '更新返点政策',
        type: 'API',
        description: '更新返点政策配置',
      },
      {
        code: 'finance:rebate:policy:delete',
        name: '删除返点政策',
        type: 'API',
        description: '删除返点政策',
      },
      {
        code: 'finance:rebate:policy:calculate',
        name: '计算返点',
        type: 'API',
        description: '使用政策计算返点金额',
      },

      // 政策管理权限
      {
        code: 'policy:access',
        name: '政策管理',
        type: 'MENU',
        description: '访问政策管理模块',
      },
      {
        code: 'policy:version:view',
        name: '查看政策版本',
        type: 'API',
        description: '查看政策版本列表',
      },
      {
        code: 'policy:version:create',
        name: '创建政策版本',
        type: 'API',
        description: '创建新的政策版本',
      },
      {
        code: 'policy:version:update',
        name: '更新政策版本',
        type: 'API',
        description: '更新政策版本内容',
      },
      {
        code: 'policy:version:delete',
        name: '删除政策版本',
        type: 'API',
        description: '删除政策版本',
      },
      {
        code: 'policy:version:activate',
        name: '激活政策版本',
        type: 'API',
        description: '激活指定的政策版本',
      },
      {
        code: 'policy:version:compare',
        name: '比较政策版本',
        type: 'API',
        description: '比较不同政策版本的差异',
      },
      {
        code: 'policy:version:history',
        name: '查看版本历史',
        type: 'API',
        description: '查看政策的版本历史记录',
      },

      // 资源管理权限
      {
        code: 'resource:access',
        name: '资源管理',
        type: 'MENU',
        description: '访问资源管理模块',
      },
      {
        code: 'resource:influencer:view',
        name: '查看达人管理',
        type: 'API',
        description: '查看达人列表和详情',
      },
      {
        code: 'resource:influencer:create',
        name: '创建达人',
        type: 'API',
        description: '创建新的达人记录',
      },
      {
        code: 'resource:influencer:update',
        name: '更新达人',
        type: 'API',
        description: '更新达人信息',
      },
      {
        code: 'resource:influencer:delete',
        name: '删除达人',
        type: 'API',
        description: '删除达人记录',
      },
      {
        code: 'resource:influencer:evaluation:view',
        name: '查看达人评价',
        type: 'API',
        description: '查看达人评价信息',
      },
      {
        code: 'resource:influencer:evaluation:create',
        name: '创建达人评价',
        type: 'API',
        description: '创建达人评价',
      },
      {
        code: 'resource:influencer:evaluation:update',
        name: '更新达人评价',
        type: 'API',
        description: '更新达人评价',
      },

      // 返点流程跟进权限
      {
        code: 'finance:rebate:flow:view',
        name: '查看返点流程',
        type: 'API',
        description: '查看返点流程跟进页面',
      },
      {
        code: 'finance:rebate:flow:update',
        name: '更新返点流程',
        type: 'API',
        description: '更新返点流程状态',
      },
      {
        code: 'finance:rebate:flow:export',
        name: '导出返点流程',
        type: 'BUTTON',
        description: '导出返点流程数据',
      },

      // 工单管理权限
      {
        code: 'work-order:access',
        name: '工单管理',
        type: 'MENU',
        description: '访问工单管理模块',
      },
      {
        code: 'work-order:view',
        name: '查看工单',
        type: 'API',
        description: '查看工单列表和详情',
      },
      {
        code: 'work-order:create',
        name: '创建工单',
        type: 'API',
        description: '创建新工单',
      },
      {
        code: 'work-order:update',
        name: '更新工单',
        type: 'API',
        description: '更新工单信息',
      },
      {
        code: 'work-order:delete',
        name: '删除工单',
        type: 'API',
        description: '删除工单',
      },
      {
        code: 'work-order:update-status',
        name: '更新工单状态',
        type: 'API',
        description: '更新工单状态',
      },
      {
        code: 'work-order:assign',
        name: '分配工单',
        type: 'API',
        description: '分配工单给处理人',
      },
    ];

    const permissions: Record<string, Permission> = {};

    for (const permData of permissionsData) {
      const permission = manager.create(Permission, permData);
      const saved = await manager.save(Permission, permission);
      permissions[permData.code] = saved;
    }

    return permissions;
  }

  /**
   * 创建角色层级
   */
  private async createRoles(manager: any): Promise<Record<string, Role>> {
    const rolesData = [
      // 顶级角色
      {
        pid: null,
        name: '超级管理员',
        code: 'SUPER_ADMIN',
        description: '系统超级管理员，拥有所有权限',
      },
      {
        pid: null,
        name: '系统管理员',
        code: 'SYSTEM_ADMIN',
        description: '系统管理员，负责系统配置和用户管理',
      },
      {
        pid: null,
        name: '项目组',
        code: 'PROJECT_GROUP',
        description: '项目组，负责项目管理和协调',
      },

      // 项目组下级角色
      {
        pid: '',
        name: '项目经理',
        code: 'PROJECT_MANAGER',
        description: '项目经理，负责具体项目的管理',
      },
      {
        pid: '',
        name: '媒介购买执行',
        code: 'MEDIA_BUYER',
        description: '媒介购买执行，负责具体的媒介购买工作',
      },
      {
        pid: '',
        name: '数据分析师',
        code: 'DATA_ANALYST',
        description: '数据分析师，负责数据分析和报告',
      },
      {
        pid: '',
        name: '财务专员',
        code: 'FINANCE_SPECIALIST',
        description: '财务专员，负责财务管理和返点政策配置',
      },
      {
        pid: '',
        name: '政策管理员',
        code: 'POLICY_ADMIN',
        description: '政策管理员，负责政策版本管理和维护',
      },
    ];

    const roles: Record<string, Role> = {};

    // 先创建顶级角色
    for (const roleData of rolesData.filter((r) => r.pid === null)) {
      const role = manager.create(Role, roleData);
      const saved = await manager.save(Role, role);
      roles[roleData.code] = saved;
    }

    // 再创建子角色，设置正确的父级ID
    const childRoles = rolesData.filter((r) => r.pid === '');
    const projectGroupId = roles['PROJECT_GROUP'].id;

    for (const roleData of childRoles) {
      const role = manager.create(Role, {
        ...roleData,
        pid: projectGroupId,
      });
      const saved = await manager.save(Role, role);
      roles[roleData.code] = saved;
    }

    return roles;
  }

  /**
   * 分配角色权限
   */
  private async assignRolePermissions(
    manager: any,
    roles: Record<string, Role>,
    permissions: Record<string, Permission>,
  ): Promise<void> {
    const rolePermissions = [
      // 超级管理员：拥有所有权限
      {
        role: 'SUPER_ADMIN',
        permissions: Object.keys(permissions),
      },

      // 系统管理员：用户和角色管理权限
      {
        role: 'SYSTEM_ADMIN',
        permissions: [
          'admin:access',
          'system:config',
          'user:view',
          'user:create',
          'user:update',
          'user:delete',
          'user:manage',
          'role:view',
          'role:create',
          'role:update',
          'role:delete',
          'role:assign',
          'role:manage',
          'permission:view',
          'permission:create',
          'permission:update',
          'permission:delete',
          'permission:assign',
          'menu:read',
          'tag:view',
          'tag:manage',
          'tag:filter:view',
          'influencer:view',
          'influencer:create',
          'influencer:update',
          'influencer:delete',
          'influencer:manage',
          'influencer:export',
          'ai:number:selection:view',
          'ai:number:selection:use',
          'ai:number:selection:history',
          'finance:access',
          'policy:access',
          'resource:access',
        ],
      },

      // 项目组：项目管理和团队管理权限
      {
        role: 'PROJECT_GROUP',
        permissions: [
          'project:view',
          'project:create',
          'project:update',
          'project:delete',
          'project:manage',
          'user:view',
          'role:view',
          'menu:read',
          'data:export',
          'tag:view',
          'tag:filter:view',
          'influencer:view',
          'influencer:manage',
          'influencer:export',
          'ai:number:selection:view',
          'ai:number:selection:use',
          'ai:number:selection:history',
          'finance:access',
          'finance:rebate:view',
          'finance:rebate:export',
          'finance:rebate:flow:view',
          'policy:access',
          'policy:version:view',
          'resource:access',
          'resource:influencer:view',
          'resource:influencer:evaluation:view',
        ],
      },

      // 项目经理：项目管理权限
      {
        role: 'PROJECT_MANAGER',
        permissions: [
          'project:view',
          'project:update',
          'project:manage',
          'media:view',
          'media:report',
          'menu:read',
          'data:export',
          'tag:view',
          'tag:filter:view',
          'influencer:view',
          'influencer:manage',
          'ai:number:selection:view',
          'ai:number:selection:use',
          'ai:number:selection:history',
          'finance:rebate:view',
          'finance:rebate:export',
          'finance:rebate:flow:view',
          'resource:influencer:view',
          'resource:influencer:evaluation:view',
        ],
      },

      // 媒介购买执行：媒介相关权限
      {
        role: 'MEDIA_BUYER',
        permissions: [
          'project:view',
          'media:view',
          'media:buy',
          'media:report',
          'tag:view',
          'tag:filter:view',
          'menu:read',
          'influencer:view',
          'resource:influencer:view',
        ],
      },

      // 数据分析师：数据查看和导出权限
      {
        role: 'DATA_ANALYST',
        permissions: [
          'project:view',
          'media:view',
          'media:report',
          'tag:view',
          'tag:filter:view',
          'menu:read',
          'data:export',
          'data:export_sensitive',
          'influencer:view',
          'influencer:export',
          'finance:rebate:view',
          'finance:rebate:export',
          'finance:rebate:detail',
          'finance:rebate:flow:view',
          'resource:influencer:view',
          'resource:influencer:evaluation:view',
        ],
      },

      // 财务专员：财务管理权限
      {
        role: 'FINANCE_SPECIALIST',
        permissions: [
          'finance:access',
          'finance:rebate:view',
          'finance:rebate:export',
          'finance:rebate:detail',
          'finance:rebate:policy:view',
          'finance:rebate:policy:create',
          'finance:rebate:policy:update',
          'finance:rebate:policy:delete',
          'finance:rebate:policy:calculate',
          'finance:rebate:flow:view',
          'finance:rebate:flow:update',
          'finance:rebate:flow:export',
          'menu:read',
          'project:view',
          'tag:view',
          'tag:filter:view',
        ],
      },

      // 政策管理员：政策管理权限
      {
        role: 'POLICY_ADMIN',
        permissions: [
          'policy:access',
          'policy:version:view',
          'policy:version:create',
          'policy:version:update',
          'policy:version:delete',
          'policy:version:activate',
          'policy:version:compare',
          'policy:version:history',
          'menu:read',
          'tag:view',
          'tag:filter:view',
        ],
      },

      // 资源管理员：资源管理权限
      {
        role: 'RESOURCE_ADMIN',
        permissions: [
          'resource:access',
          'resource:influencer:view',
          'resource:influencer:create',
          'resource:influencer:update',
          'resource:influencer:delete',
          'resource:influencer:evaluation:view',
          'resource:influencer:evaluation:create',
          'resource:influencer:evaluation:update',
          'menu:read',
          'tag:view',
          'tag:filter:view',
        ],
      },
    ];

    for (const rp of rolePermissions) {
      const role = roles[rp.role];
      if (!role) continue;

      for (const permCode of rp.permissions) {
        const permission = permissions[permCode];
        if (!permission) continue;

        const rolePermission = manager.create(RolePermission, {
          roleId: role.id,
          permissionId: permission.id,
        });

        await manager.save(RolePermission, rolePermission);
      }
    }
  }

  /**
   * 创建超级管理员用户和测试用户
   */
  private async createSuperAdmin(
    manager: any,
    roles: Record<string, Role>,
  ): Promise<void> {
    // 创建超级管理员
    await this.createUser(
      manager,
      {
        phone: '13800000000',
        password: 'admin123456',
        name: '超级管理员',
        department: '系统管理部',
        position: '超级管理员',
        email: 'admin@example.com',
        roleCode: 'SUPER_ADMIN',
      },
      roles,
    );

    // 创建系统管理员
    await this.createUser(
      manager,
      {
        phone: '13800000001',
        password: 'admin123456',
        name: '系统管理员',
        department: '系统管理部',
        position: '系统管理员',
        email: 'sysadmin@example.com',
        roleCode: 'SYSTEM_ADMIN',
      },
      roles,
    );

    // 创建项目经理
    await this.createUser(
      manager,
      {
        phone: '13800000002',
        password: 'admin123456',
        name: '张项目',
        department: '项目部',
        position: '项目经理',
        email: 'pm@example.com',
        roleCode: 'PROJECT_MANAGER',
      },
      roles,
    );

    // 创建媒介购买执行
    await this.createUser(
      manager,
      {
        phone: '13800000003',
        password: 'admin123456',
        name: '李媒介',
        department: '媒介部',
        position: '媒介购买执行',
        email: 'media@example.com',
        roleCode: 'MEDIA_BUYER',
      },
      roles,
    );

    // 创建数据分析师
    await this.createUser(
      manager,
      {
        phone: '13800000004',
        password: 'admin123456',
        name: '王分析',
        department: '数据部',
        position: '数据分析师',
        email: 'analyst@example.com',
        roleCode: 'DATA_ANALYST',
      },
      roles,
    );

    // 创建财务专员
    await this.createUser(
      manager,
      {
        phone: '13800000005',
        password: 'admin123456',
        name: '赵财务',
        department: '财务部',
        position: '财务专员',
        email: 'finance@example.com',
        roleCode: 'FINANCE_SPECIALIST',
      },
      roles,
    );

    // 创建政策管理员
    await this.createUser(
      manager,
      {
        phone: '13800000006',
        password: 'admin123456',
        name: '钱政策',
        department: '法务部',
        position: '政策管理员',
        email: 'policy@example.com',
        roleCode: 'POLICY_ADMIN',
      },
      roles,
    );

    console.log('🔑 测试账号信息:');
    console.log('   超级管理员: 13800000000 / admin123456');
    console.log('   系统管理员: 13800000001 / admin123456');
    console.log('   项目经理: 13800000002 / admin123456');
    console.log('   媒介购买: 13800000003 / admin123456');
    console.log('   数据分析: 13800000004 / admin123456');
    console.log('   财务专员: 13800000005 / admin123456');
    console.log('   政策管理: 13800000006 / admin123456');
    console.log('   请登录后及时修改密码！');
  }

  /**
   * 创建单个用户
   */
  private async createUser(
    manager: any,
    userData: {
      phone: string;
      password: string;
      name: string;
      department: string;
      position: string;
      email?: string;
      roleCode: string;
    },
    roles: Record<string, Role>,
  ): Promise<void> {
    // 检查用户是否已存在
    const existingUser = await manager.findOne(UserAuth, {
      where: { phone: userData.phone },
    });

    if (existingUser) {
      console.log(
        `⚠️  用户 ${userData.name} (${userData.phone}) 已存在，跳过创建`,
      );
      return;
    }

    // 创建用户认证信息
    const passwordHash = await bcrypt.hash(userData.password, 12);

    const userAuth = manager.create(UserAuth, {
      phone: userData.phone,
      passwordHash,
      status: 1,
    });

    const savedUser = await manager.save(UserAuth, userAuth);

    // 创建用户资料
    const userProfile = manager.create(UserProfile, {
      userId: savedUser.id,
      name: userData.name,
      department: userData.department,
      position: userData.position,
      email: userData.email,
    });

    await manager.save(UserProfile, userProfile);

    // 分配角色
    const role = roles[userData.roleCode];
    if (role) {
      const userRole = manager.create(UserRole, {
        userId: savedUser.id,
        roleId: role.id,
      });

      await manager.save(UserRole, userRole);
    }
  }
}
