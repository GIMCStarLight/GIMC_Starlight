import { DataSource } from 'typeorm';
import { Permission, Role, RolePermission, UserRole, UserAuth, UserProfile } from '../entities';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * 为各角色分配权限脚本
 */
async function assignRolePermissions() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.POSTGRES_HOST || '192.168.102.168',
    port: parseInt(process.env.POSTGRES_PORT || '5432') || 5432,
    username: process.env.POSTGRES_USERNAME || 'postgres',
    password: process.env.POSTGRES_PASSWORD || '',
    database: process.env.POSTGRES_DATABASE || 'crawler_db_v2',
    entities: [Permission, Role, RolePermission, UserRole, UserAuth, UserProfile],
    synchronize: false,
    logging: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ 数据库连接成功');

    const permissionRepo = dataSource.getRepository(Permission);
    const roleRepo = dataSource.getRepository(Role);
    const rolePermRepo = dataSource.getRepository(RolePermission);

    // 定义各角色的权限配置
    const rolePermissions = {
      // 系统管理员：除了超级管理员的全部权限外，还能管理用户和权限
      SYSTEM_ADMIN: [
        'tag:view', 'tag:create', 'tag:update', 'tag:delete',
        'kol:view', 'kol:create', 'kol:update', 'kol:delete', 
        'kol:batch:create', 'kol:batch:delete', 'kol:export',
        'supplier:view', 'supplier:create', 'supplier:update', 'supplier:delete',
        'supplier:batch:create', 'supplier:batch:delete', 'supplier:template:download',
        'upload:excel', 'upload:validate', 'upload:import', 'upload:import:async', 'upload:import:view',
        'influencer:filter:advanced', 'influencer:filter:quick', 'influencer:filter:stats',
        'sqlbot:config:view', 'sqlbot:config:update', 'sqlbot:token:generate',
        'source:account:view', 'source:account:create', 'source:account:update', 'source:account:delete',
      ],

      // 项目组：KOL管理核心权限 + 供应商查看
      PROJECT_GROUP: [
        'tag:view',
        'kol:view', 'kol:create', 'kol:update', 'kol:delete',
        'kol:batch:create', 'kol:batch:delete', 'kol:export',
        'kol:match:view', 'kol:match:create', 'kol:match:update', 'kol:match:delete',
        'kol:review:view', 'kol:review:create', 'kol:review:update',
        'supplier:view',
        'upload:excel', 'upload:validate', 'upload:import', 'upload:import:view',
        'influencer:filter:advanced', 'influencer:filter:quick', 'influencer:filter:stats',
      ],

      // 项目经理：项目执行权限
      PROJECT_MANAGER: [
        'tag:view',
        'kol:view', 'kol:create', 'kol:update', 'kol:export',
        'kol:match:view', 'kol:match:create', 'kol:match:update',
        'kol:review:view', 'kol:review:create',
        'supplier:view',
        'upload:excel', 'upload:validate', 'upload:import', 'upload:import:view',
        'influencer:filter:advanced', 'influencer:filter:quick', 'influencer:filter:stats',
      ],

      // 媒介购买执行：基础执行权限
      MEDIA_BUYER: [
        'tag:view',
        'kol:view', 'kol:export',
        'kol:match:view',
        'supplier:view',
        'influencer:filter:quick', 'influencer:filter:stats',
      ],

      // 数据分析师：查看和统计权限
      DATA_ANALYST: [
        'tag:view',
        'kol:view', 'kol:export',
        'kol:match:view',
        'kol:review:view',
        'supplier:view',
        'influencer:filter:advanced', 'influencer:filter:quick', 'influencer:filter:stats',
        'sqlbot:config:view', 'sqlbot:token:generate',
      ],

      // 财务专员：供应商和返点相关权限
      FINANCE_SPECIALIST: [
        'tag:view',
        'kol:view',
        'supplier:view', 'supplier:create', 'supplier:update', 'supplier:delete',
        'supplier:batch:create', 'supplier:batch:delete', 'supplier:template:download',
        'upload:excel', 'upload:validate', 'upload:import', 'upload:import:view',
      ],

      // 政策管理员：供应商政策管理权限
      POLICY_ADMIN: [
        'tag:view',
        'supplier:view', 'supplier:create', 'supplier:update',
        'supplier:template:download',
        'upload:excel', 'upload:validate', 'upload:import', 'upload:import:view',
      ],
    };

    // 为每个角色分配权限
    for (const [roleCode, permCodes] of Object.entries(rolePermissions)) {
      console.log(`\n🔧 为角色 ${roleCode} 分配权限...`);
      
      const role = await roleRepo.findOne({ where: { code: roleCode } });
      if (!role) {
        console.log(`⚠️  角色 ${roleCode} 不存在，跳过`);
        continue;
      }

      let assignedCount = 0;
      let skippedCount = 0;

      for (const permCode of permCodes) {
        const permission = await permissionRepo.findOne({ where: { code: permCode } });
        if (!permission) {
          console.log(`⚠️  权限 ${permCode} 不存在，跳过`);
          continue;
        }

        // 检查是否已经分配
        const existing = await rolePermRepo.findOne({
          where: {
            roleId: role.id,
            permissionId: permission.id,
          },
        });

        if (!existing) {
          const rolePermission = rolePermRepo.create({
            roleId: role.id,
            permissionId: permission.id,
          });
          await rolePermRepo.save(rolePermission);
          assignedCount++;
        } else {
          skippedCount++;
        }
      }

      console.log(`✅ 角色 ${roleCode}: 新分配 ${assignedCount} 个权限，跳过 ${skippedCount} 个`);
    }

    console.log(`\n🎉 所有角色权限分配完成！`);

  } catch (error) {
    console.error('❌ 分配权限失败:', error);
    throw error;
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('🔌 数据库连接已关闭');
    }
  }
}

// 执行脚本
if (require.main === module) {
  assignRolePermissions().catch((error) => {
    console.error('执行失败:', error);
    process.exit(1);
  });
}

export { assignRolePermissions };
