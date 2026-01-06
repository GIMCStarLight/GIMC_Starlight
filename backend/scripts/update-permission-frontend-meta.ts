import 'reflect-metadata';
import { DataSource } from 'typeorm';
import PostgresDataSource from '../data-source-postgres';
import { Permission } from '../src/database/entities/permission.entity';

/**
 * 权限前端元数据批量更新工具
 * 用于为现有权限添加前端映射信息，解决权限管理认知不一致问题
 */

interface FrontendMeta {
  routePath?: string;
  componentPath?: string;
  elementLocator?: string;
  pageLocation?: string;
  businessModule?: string;
}

interface PermissionMetaMapping {
  code: string;
  frontendMeta: FrontendMeta;
}

/**
 * 权限元数据配置
 * 根据实际前端页面结构配置每个权限的前端映射信息
 */
const permissionMetaMappings: PermissionMetaMapping[] = [
  // ===== 用户管理模块 =====
  {
    code: 'user:view',
    frontendMeta: {
      routePath: '/system/user',
      componentPath: 'src/views/system/user/index.vue',
      pageLocation: '系统管理 > 用户管理 > 用户列表',
      businessModule: '用户管理',
    },
  },
  {
    code: 'user:create',
    frontendMeta: {
      routePath: '/system/user',
      componentPath: 'src/views/system/user/index.vue',
      elementLocator: '#create-user-btn',
      pageLocation: '系统管理 > 用户管理 > 顶部操作栏 > 新建用户按钮',
      businessModule: '用户管理',
    },
  },
  {
    code: 'user:update',
    frontendMeta: {
      routePath: '/system/user',
      componentPath: 'src/views/system/user/index.vue',
      elementLocator: '.edit-user-btn',
      pageLocation: '系统管理 > 用户管理 > 用户列表 > 操作列 > 编辑按钮',
      businessModule: '用户管理',
    },
  },
  {
    code: 'user:delete',
    frontendMeta: {
      routePath: '/system/user',
      componentPath: 'src/views/system/user/index.vue',
      elementLocator: '.delete-user-btn',
      pageLocation: '系统管理 > 用户管理 > 用户列表 > 操作列 > 删除按钮',
      businessModule: '用户管理',
    },
  },

  // ===== 角色管理模块 =====
  {
    code: 'role:view',
    frontendMeta: {
      routePath: '/system/role',
      componentPath: 'src/views/system/role/index.vue',
      pageLocation: '系统管理 > 角色管理 > 角色列表',
      businessModule: '角色管理',
    },
  },
  {
    code: 'role:create',
    frontendMeta: {
      routePath: '/system/role',
      componentPath: 'src/views/system/role/index.vue',
      elementLocator: '#create-role-btn',
      pageLocation: '系统管理 > 角色管理 > 顶部操作栏 > 新建角色按钮',
      businessModule: '角色管理',
    },
  },
  {
    code: 'role:assign-permissions',
    frontendMeta: {
      routePath: '/system/role',
      componentPath: 'src/views/system/role/index.vue',
      elementLocator: '.assign-permission-btn',
      pageLocation: '系统管理 > 角色管理 > 角色列表 > 操作列 > 分配权限按钮',
      businessModule: '角色管理',
    },
  },

  // ===== 权限管理模块 =====
  {
    code: 'permission:view',
    frontendMeta: {
      routePath: '/system/permission',
      componentPath: 'src/views/system/permission/index.vue',
      pageLocation: '系统管理 > 权限管理 > 权限列表',
      businessModule: '权限管理',
    },
  },

  // ===== KOL数据管理模块 =====
  {
    code: 'kol:view',
    frontendMeta: {
      routePath: '/kol',
      componentPath: 'src/views/kol/index.vue',
      pageLocation: 'KOL数据管理 > KOL列表',
      businessModule: 'KOL数据管理',
    },
  },
  {
    code: 'kol:import',
    frontendMeta: {
      routePath: '/kol',
      componentPath: 'src/views/kol/index.vue',
      elementLocator: '#import-btn',
      pageLocation: 'KOL数据管理 > 顶部操作栏 > 导入按钮',
      businessModule: 'KOL数据管理',
    },
  },
  {
    code: 'kol:export',
    frontendMeta: {
      routePath: '/kol',
      componentPath: 'src/views/kol/index.vue',
      elementLocator: '#export-btn',
      pageLocation: 'KOL数据管理 > 顶部操作栏 > 导出按钮',
      businessModule: 'KOL数据管理',
    },
  },

  // ===== 工单管理模块 =====
  {
    code: 'work-order:view',
    frontendMeta: {
      routePath: '/work-order',
      componentPath: 'src/views/work-order/index.vue',
      pageLocation: '工单管理 > 工单列表',
      businessModule: '工单管理',
    },
  },
  {
    code: 'work-order:create',
    frontendMeta: {
      routePath: '/work-order',
      componentPath: 'src/views/work-order/index.vue',
      elementLocator: '#create-work-order-btn',
      pageLocation: '工单管理 > 顶部操作栏 > 创建工单按钮',
      businessModule: '工单管理',
    },
  },

  // ===== 标签管理模块 =====
  {
    code: 'tag:view',
    frontendMeta: {
      routePath: '/tags',
      componentPath: 'src/views/tags/index.vue',
      pageLocation: '标签管理 > 标签列表',
      businessModule: '标签管理',
    },
  },

  // ===== 财务管理模块 =====
  {
    code: 'finance:access',
    frontendMeta: {
      routePath: '/financial-management',
      componentPath: 'src/views/financial-management/index.vue',
      pageLocation: '财务管理 > 返点政策管理',
      businessModule: '财务管理',
    },
  },
  {
    code: 'finance:rebate:view',
    frontendMeta: {
      routePath: '/financial-management',
      componentPath: 'src/views/financial-management/index.vue',
      pageLocation: '财务管理 > 返点政策管理 > 政策列表',
      businessModule: '财务管理',
    },
  },
  {
    code: 'finance:rebate:policy:create',
    frontendMeta: {
      routePath: '/financial-management',
      componentPath: 'src/views/financial-management/index.vue',
      elementLocator: '#create-policy-btn',
      pageLocation: '财务管理 > 返点政策管理 > 顶部操作栏 > 新建政策按钮',
      businessModule: '财务管理',
    },
  },
  {
    code: 'finance:rebate:flow:view',
    frontendMeta: {
      routePath: '/rebate-flow',
      componentPath: 'src/views/rebate-flow/index.vue',
      pageLocation: '财务管理 > 返点流水',
      businessModule: '财务管理',
    },
  },
  {
    code: 'finance:rebate:flow:export',
    frontendMeta: {
      routePath: '/rebate-flow',
      componentPath: 'src/views/rebate-flow/index.vue',
      elementLocator: '#export-flow-btn',
      pageLocation: '财务管理 > 返点流水 > 顶部操作栏 > 导出按钮',
      businessModule: '财务管理',
    },
  },

  // ===== 供应商管理模块 =====
  {
    code: 'supplier:view',
    frontendMeta: {
      routePath: '/supplier-management',
      componentPath: 'src/views/supplier-management/index.vue',
      pageLocation: '供应商管理 > 供应商列表',
      businessModule: '供应商管理',
    },
  },
  {
    code: 'supplier:create',
    frontendMeta: {
      routePath: '/supplier-management',
      componentPath: 'src/views/supplier-management/index.vue',
      elementLocator: '#create-supplier-btn',
      pageLocation: '供应商管理 > 顶部操作栏 > 新建供应商按钮',
      businessModule: '供应商管理',
    },
  },

  // ===== AI助手模块 =====
  {
    code: 'ai:assistant:view',
    frontendMeta: {
      routePath: '/ai-assistant',
      componentPath: 'src/views/ai-assistant/index.vue',
      pageLocation: 'AI助手 > AI对话界面',
      businessModule: 'AI助手',
    },
  },
  {
    code: 'ai:assistant:chat',
    frontendMeta: {
      routePath: '/ai-assistant',
      componentPath: 'src/views/ai-assistant/index.vue',
      elementLocator: '#chat-input',
      pageLocation: 'AI助手 > AI对话 > 输入框',
      businessModule: 'AI助手',
    },
  },
  {
    code: 'ai:number:selection:view',
    frontendMeta: {
      routePath: '/ai-number-selection',
      componentPath: 'src/views/ai-number-selection/index.vue',
      pageLocation: 'AI助手 > AI选号',
      businessModule: 'AI助手',
    },
  },

  // ===== 达人管理模块 =====
  {
    code: 'influencer:view',
    frontendMeta: {
      routePath: '/influencer-management',
      componentPath: 'src/views/influencer-management/index.vue',
      pageLocation: '达人管理 > 达人列表',
      businessModule: '达人管理',
    },
  },
  {
    code: 'influencer:create',
    frontendMeta: {
      routePath: '/influencer-management',
      componentPath: 'src/views/influencer-management/index.vue',
      elementLocator: '#create-influencer-btn',
      pageLocation: '达人管理 > 顶部操作栏 > 新建达人按钮',
      businessModule: '达人管理',
    },
  },
  {
    code: 'influencer:export',
    frontendMeta: {
      routePath: '/influencer-management',
      componentPath: 'src/views/influencer-management/index.vue',
      elementLocator: '#export-influencer-btn',
      pageLocation: '达人管理 > 顶部操作栏 > 导出按钮',
      businessModule: '达人管理',
    },
  },

  // ===== KOL额外权限 =====
  {
    code: 'kol:create',
    frontendMeta: {
      routePath: '/kol',
      componentPath: 'src/views/kol/index.vue',
      elementLocator: '#create-kol-btn',
      pageLocation: 'KOL数据管理 > 顶部操作栏 > 新建KOL按钮',
      businessModule: 'KOL数据管理',
    },
  },
  {
    code: 'kol:update',
    frontendMeta: {
      routePath: '/kol',
      componentPath: 'src/views/kol/index.vue',
      elementLocator: '.edit-kol-btn',
      pageLocation: 'KOL数据管理 > KOL列表 > 操作列 > 编辑按钮',
      businessModule: 'KOL数据管理',
    },
  },
  {
    code: 'kol:delete',
    frontendMeta: {
      routePath: '/kol',
      componentPath: 'src/views/kol/index.vue',
      elementLocator: '.delete-kol-btn',
      pageLocation: 'KOL数据管理 > KOL列表 > 操作列 > 删除按钮',
      businessModule: 'KOL数据管理',
    },
  },
  {
    code: 'kol:review:view',
    frontendMeta: {
      routePath: '/kol-evaluation',
      componentPath: 'src/views/kol-evaluation/index.vue',
      pageLocation: 'KOL数据管理 > KOL评估',
      businessModule: 'KOL数据管理',
    },
  },

  // ===== 数据导出权限 =====
  {
    code: 'data:export',
    frontendMeta: {
      pageLocation: '全局 > 数据导出功能',
      businessModule: '数据管理',
    },
  },
  {
    code: 'data:export_sensitive',
    frontendMeta: {
      pageLocation: '全局 > 敏感数据导出功能',
      businessModule: '数据管理',
    },
  },

  // 可以继续添加更多权限映射...
];

async function updatePermissionMetadata() {
  console.log('🔄 开始更新权限前端元数据...\n');

  try {
    await PostgresDataSource.initialize();
    console.log('✅ 数据库连接成功\n');

    const permissionRepository = PostgresDataSource.getRepository(Permission);

    let updatedCount = 0;
    let notFoundCount = 0;
    let skippedCount = 0;

    for (const mapping of permissionMetaMappings) {
      const permission = await permissionRepository.findOne({
        where: { code: mapping.code },
      });

      if (!permission) {
        console.log(`⚠️  权限不存在: ${mapping.code}`);
        notFoundCount++;
        continue;
      }

      // 检查是否已有元数据
      if (permission.frontendMeta) {
        console.log(`⏩ 权限已有元数据，跳过: ${mapping.code}`);
        skippedCount++;
        continue;
      }

      // 更新元数据
      permission.frontendMeta = mapping.frontendMeta;
      await permissionRepository.save(permission);

      console.log(`✅ 更新成功: ${mapping.code}`);
      console.log(`   页面位置: ${mapping.frontendMeta.pageLocation || '-'}`);
      console.log(`   业务模块: ${mapping.frontendMeta.businessModule || '-'}\n`);
      updatedCount++;
    }

    console.log('\n📊 更新统计:');
    console.log(`   ✅ 成功更新: ${updatedCount} 个权限`);
    console.log(`   ⏩ 已有数据跳过: ${skippedCount} 个权限`);
    console.log(`   ⚠️  权限不存在: ${notFoundCount} 个权限`);
    console.log(`   📝 总计处理: ${permissionMetaMappings.length} 个配置\n`);

    // 查询并展示更新结果
    const updatedPermissions = await permissionRepository.find({
      where: {},
      select: ['id', 'name', 'code', 'type', 'frontendMeta'],
      take: 10,
    });

    console.log('📋 示例权限元数据 (前10条):');
    updatedPermissions
      .filter((p) => p.frontendMeta)
      .forEach((p) => {
        console.log(`\n${p.name} (${p.code})`);
        console.log(JSON.stringify(p.frontendMeta, null, 2));
      });
  } catch (error) {
    console.error('❌ 更新权限元数据失败:', error);
    throw error;
  } finally {
    await PostgresDataSource.destroy();
    console.log('\n👋 数据库连接已关闭');
  }
}

// 执行更新
updatePermissionMetadata()
  .then(() => {
    console.log('\n✨ 权限元数据更新完成!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 更新失败:', error);
    process.exit(1);
  });
