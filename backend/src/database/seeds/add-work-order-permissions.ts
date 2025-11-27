import { config } from 'dotenv';
import PostgresDataSource from '../../../data-source-postgres';
import { Permission, PermissionType } from '../entities';

// 加载环境变量
config();

/**
 * 添加工单管理权限
 */
async function addWorkOrderPermissions() {
  console.log('🌱 开始添加工单管理权限...');

  try {
    // 初始化PostgreSQL数据源
    await PostgresDataSource.initialize();
    console.log('✅ PostgreSQL数据库连接成功');

    const permissionRepository = PostgresDataSource.getRepository(Permission);

    // 定义工单管理权限
    const workOrderPermissions = [
      {
        code: 'work-order:access',
        name: '工单管理',
        type: PermissionType.MENU,
        description: '访问工单管理模块',
      },
      {
        code: 'work-order:view',
        name: '查看工单',
        type: PermissionType.API,
        description: '查看工单列表和详情',
      },
      {
        code: 'work-order:create',
        name: '创建工单',
        type: PermissionType.API,
        description: '创建新工单',
      },
      {
        code: 'work-order:update',
        name: '更新工单',
        type: PermissionType.API,
        description: '更新工单信息',
      },
      {
        code: 'work-order:delete',
        name: '删除工单',
        type: PermissionType.API,
        description: '删除工单',
      },
      {
        code: 'work-order:update-status',
        name: '更新工单状态',
        type: PermissionType.API,
        description: '更新工单状态',
      },
      {
        code: 'work-order:assign',
        name: '分配工单',
        type: PermissionType.API,
        description: '分配工单给处理人',
      },
    ];

    let addedCount = 0;
    let skippedCount = 0;

    for (const permData of workOrderPermissions) {
      // 检查权限是否已存在
      const existing = await permissionRepository.findOne({
        where: { code: permData.code },
      });

      if (existing) {
        console.log(`⏩ 权限已存在，跳过: ${permData.code}`);
        skippedCount++;
        continue;
      }

      // 创建新权限
      const permission = permissionRepository.create(permData);
      await permissionRepository.save(permission);
      console.log(`✅ 权限添加成功: ${permData.code} - ${permData.name}`);
      addedCount++;
    }

    console.log(`\n🎉 工单管理权限处理完成！`);
    console.log(`   新增: ${addedCount} 个权限`);
    console.log(`   跳过: ${skippedCount} 个权限（已存在）`);
    console.log(`\n💡 提示: 请在角色管理界面为相应角色分配这些权限`);

  } catch (error) {
    console.error('❌ 添加工单权限失败:', error);
    throw error;
  } finally {
    // 关闭数据源
    await PostgresDataSource.destroy();
  }
}

// 运行脚本
addWorkOrderPermissions()
  .then(() => {
    console.log('\n✨ 脚本执行成功');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 脚本执行失败:', error);
    process.exit(1);
  });
