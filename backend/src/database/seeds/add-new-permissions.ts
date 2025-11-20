import { DataSource } from 'typeorm';
import { Permission, Role, RolePermission, PermissionType, UserRole, UserAuth, UserProfile } from '../entities';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * 增量添加新权限脚本
 * 只添加缺失的权限，不重复添加已存在的权限
 */
async function addNewPermissions() {
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

    // 新增的权限定义
    const newPermissions = [
      // 标签管理完整权限
      { code: 'tag:create', name: '创建标签', type: PermissionType.API, description: '创建新标签' },
      { code: 'tag:update', name: '更新标签', type: PermissionType.API, description: '更新标签信息' },
      { code: 'tag:delete', name: '删除标签', type: PermissionType.API, description: '删除标签' },

      // KOL管理权限
      { code: 'kol:view', name: '查看KOL', type: PermissionType.API, description: '查看KOL列表和详情' },
      { code: 'kol:create', name: '创建KOL', type: PermissionType.API, description: '创建新的KOL记录' },
      { code: 'kol:update', name: '更新KOL', type: PermissionType.API, description: '更新KOL信息' },
      { code: 'kol:delete', name: '删除KOL', type: PermissionType.API, description: '删除KOL记录' },
      { code: 'kol:batch:create', name: '批量创建KOL', type: PermissionType.API, description: '批量创建KOL' },
      { code: 'kol:batch:delete', name: '批量删除KOL', type: PermissionType.API, description: '批量删除KOL' },
      { code: 'kol:export', name: '导出KOL', type: PermissionType.BUTTON, description: '导出KOL数据' },
      { code: 'kol:match:view', name: '查看KOL匹配', type: PermissionType.API, description: '查看KOL匹配记录' },
      { code: 'kol:match:create', name: '创建KOL匹配', type: PermissionType.API, description: '创建KOL匹配' },
      { code: 'kol:match:update', name: '更新KOL匹配', type: PermissionType.API, description: '更新KOL匹配' },
      { code: 'kol:match:delete', name: '删除KOL匹配', type: PermissionType.API, description: '删除KOL匹配' },
      { code: 'kol:review:view', name: '查看KOL评审', type: PermissionType.API, description: '查看KOL评审记录' },
      { code: 'kol:review:create', name: '创建KOL评审', type: PermissionType.API, description: '创建KOL评审' },
      { code: 'kol:review:update', name: '更新KOL评审', type: PermissionType.API, description: '更新KOL评审' },
      { code: 'kol:review:approve', name: '审批KOL', type: PermissionType.API, description: 'KOL审批权限' },
      { code: 'kol:sync:trigger', name: '触发KOL同步', type: PermissionType.API, description: '手动触发KOL数据同步' },
      { code: 'kol:sync:status', name: '查看同步状态', type: PermissionType.API, description: '查看KOL同步状态' },
      { code: 'kol:sync:history', name: '查看同步历史', type: PermissionType.API, description: '查看KOL同步历史' },

      // 供应商管理权限
      { code: 'supplier:view', name: '查看供应商', type: PermissionType.API, description: '查看供应商列表' },
      { code: 'supplier:create', name: '创建供应商', type: PermissionType.API, description: '创建新供应商' },
      { code: 'supplier:update', name: '更新供应商', type: PermissionType.API, description: '更新供应商信息' },
      { code: 'supplier:delete', name: '删除供应商', type: PermissionType.API, description: '删除供应商' },
      { code: 'supplier:batch:create', name: '批量创建供应商', type: PermissionType.API, description: '批量创建供应商' },
      { code: 'supplier:batch:delete', name: '批量删除供应商', type: PermissionType.API, description: '批量删除供应商' },
      { code: 'supplier:template:download', name: '下载供应商模板', type: PermissionType.API, description: '下载供应商导入模板' },

      // 文件上传权限
      { code: 'upload:excel', name: 'Excel上传', type: PermissionType.API, description: '上传Excel文件' },
      { code: 'upload:validate', name: '验证数据', type: PermissionType.API, description: '验证导入数据' },
      { code: 'upload:import', name: '数据导入', type: PermissionType.API, description: '导入数据到数据库' },
      { code: 'upload:import:async', name: '异步数据导入', type: PermissionType.API, description: '异步导入大批量数据' },
      { code: 'upload:import:view', name: '查看导入历史', type: PermissionType.API, description: '查看数据导入历史' },

      // 达人筛选权限
      { code: 'influencer:filter:advanced', name: '高级筛选', type: PermissionType.API, description: '达人高级筛选' },
      { code: 'influencer:filter:quick', name: '快速筛选', type: PermissionType.API, description: '达人快速筛选' },
      { code: 'influencer:filter:stats', name: '筛选统计', type: PermissionType.API, description: '筛选统计数据' },

      // SQLBot权限
      { code: 'sqlbot:config:view', name: '查看SQLBot配置', type: PermissionType.API, description: '查看SQLBot配置' },
      { code: 'sqlbot:config:update', name: '更新SQLBot配置', type: PermissionType.API, description: '更新SQLBot配置' },
      { code: 'sqlbot:datasource:view', name: '查看数据源', type: PermissionType.API, description: '查看数据库连接信息(仅管理员)' },
      { code: 'sqlbot:token:generate', name: '生成Token', type: PermissionType.API, description: '生成SQLBot Token' },

      // 资源账号管理
      { code: 'source:account:view', name: '查看资源账号', type: PermissionType.API, description: '查看资源账号' },
      { code: 'source:account:create', name: '创建资源账号', type: PermissionType.API, description: '创建资源账号' },
      { code: 'source:account:update', name: '更新资源账号', type: PermissionType.API, description: '更新资源账号' },
      { code: 'source:account:delete', name: '删除资源账号', type: PermissionType.API, description: '删除资源账号' },
    ];

    let addedCount = 0;
    let skippedCount = 0;

    for (const permData of newPermissions) {
      const existing = await permissionRepo.findOne({ where: { code: permData.code } });
      
      if (!existing) {
        const permission = permissionRepo.create(permData);
        await permissionRepo.save(permission);
        console.log(`✅ 添加权限: ${permData.code} - ${permData.name}`);
        addedCount++;
      } else {
        console.log(`⏭️  跳过已存在权限: ${permData.code}`);
        skippedCount++;
      }
    }

    console.log(`\n📊 权限添加完成统计:`);
    console.log(`   新增: ${addedCount} 个`);
    console.log(`   跳过: ${skippedCount} 个`);
    console.log(`   总计: ${newPermissions.length} 个`);

    // 为super_admin角色分配所有新权限
    const roleRepo = dataSource.getRepository(Role);
    const rolePermRepo = dataSource.getRepository(RolePermission);
    
    const superAdminRole = await roleRepo.findOne({ where: { code: 'SUPER_ADMIN' } });
    
    if (superAdminRole) {
      console.log(`\n🔧 为super_admin角色分配新权限...`);
      const allPermissions = await permissionRepo.find();
      
      for (const permission of allPermissions) {
        const existing = await rolePermRepo.findOne({
          where: {
            roleId: superAdminRole.id,
            permissionId: permission.id,
          },
        });
        
        if (!existing) {
          const rolePermission = rolePermRepo.create({
            roleId: superAdminRole.id,
            permissionId: permission.id,
          });
          await rolePermRepo.save(rolePermission);
        }
      }
      console.log(`✅ super_admin角色权限更新完成`);
    }

    console.log(`\n🎉 所有新权限添加完成！`);

  } catch (error) {
    console.error('❌ 添加权限失败:', error);
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
  addNewPermissions().catch((error) => {
    console.error('执行失败:', error);
    process.exit(1);
  });
}

export { addNewPermissions };
