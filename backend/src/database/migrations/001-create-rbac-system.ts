import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRbacSystem1758090637001 implements MigrationInterface {
  name = 'CreateRbacSystem1758090637001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 创建用户认证表
    await queryRunner.query(`
      CREATE TABLE \`user_auth\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '用户ID',
        \`phone\` VARCHAR(20) NOT NULL UNIQUE COMMENT '手机号',
        \`password_hash\` VARCHAR(255) NOT NULL COMMENT '密码哈希值',
        \`status\` TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 1-启用, 0-禁用',
        \`last_login_at\` DATETIME NULL DEFAULT NULL COMMENT '最后登录时间',
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (\`id\`),
        INDEX \`idx_phone\` (\`phone\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户认证表';
    `);

    // 2. 创建用户资料表
    await queryRunner.query(`
      CREATE TABLE \`user_profile\` (
        \`user_id\` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
        \`name\` VARCHAR(50) NOT NULL DEFAULT '' COMMENT '真实姓名/昵称',
        \`avatar_url\` VARCHAR(512) NULL DEFAULT NULL COMMENT '头像URL',
        \`email\` VARCHAR(100) NULL DEFAULT NULL COMMENT '邮箱',
        \`department\` VARCHAR(100) NULL DEFAULT NULL COMMENT '部门',
        \`position\` VARCHAR(100) NULL DEFAULT NULL COMMENT '职位',
        \`settings\` JSON NULL COMMENT '用户个性化设置',
        \`metadata\` JSON NULL COMMENT '预留的元数据字段',
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (\`user_id\`),
        CONSTRAINT \`fk_profile_user_id\` FOREIGN KEY (\`user_id\`) REFERENCES \`user_auth\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户资料表';
    `);

    // 3. 创建权限点表
    await queryRunner.query(`
      CREATE TABLE \`permissions\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '权限ID',
        \`code\` VARCHAR(100) NOT NULL UNIQUE COMMENT '权限代码 (如: user:create, tag:delete, button:export_sensitive)',
        \`name\` VARCHAR(50) NOT NULL COMMENT '权限名称',
        \`type\` ENUM('API', 'BUTTON', 'MENU') NOT NULL DEFAULT 'API' COMMENT '权限类型',
        \`description\` VARCHAR(255) DEFAULT NULL COMMENT '权限描述',
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (\`id\`),
        INDEX \`idx_code\` (\`code\`),
        INDEX \`idx_type\` (\`type\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='权限点表';
    `);

    // 4. 创建角色表（支持层级）
    await queryRunner.query(`
      CREATE TABLE \`roles\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '角色ID',
        \`pid\` BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '上级角色ID (0 表示顶级角色)',
        \`name\` VARCHAR(100) NOT NULL COMMENT '角色名称 (如: "项目组", "媒介购买执行")',
        \`code\` VARCHAR(50) NOT NULL UNIQUE COMMENT '角色代码 (如: PROJECT_GROUP, MEDIA_BUYER)',
        \`description\` VARCHAR(255) DEFAULT NULL COMMENT '角色描述',
        \`status\` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '状态: 0=禁用, 1=启用',
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (\`id\`),
        INDEX \`idx_pid\` (\`pid\`),
        INDEX \`idx_code\` (\`code\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色表 (支持层级)';
    `);

    // 5. 创建角色-权限关联表
    await queryRunner.query(`
      CREATE TABLE \`role_permissions\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '关联ID',
        \`role_id\` BIGINT UNSIGNED NOT NULL COMMENT '角色ID',
        \`permission_id\` BIGINT UNSIGNED NOT NULL COMMENT '权限ID',
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uk_role_permission\` (\`role_id\`, \`permission_id\`),
        INDEX \`idx_role_id\` (\`role_id\`),
        INDEX \`idx_permission_id\` (\`permission_id\`),
        CONSTRAINT \`fk_rp_role_id\` FOREIGN KEY (\`role_id\`) REFERENCES \`roles\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`fk_rp_permission_id\` FOREIGN KEY (\`permission_id\`) REFERENCES \`permissions\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色权限关联表';
    `);

    // 6. 创建用户-角色关联表
    await queryRunner.query(`
      CREATE TABLE \`user_roles\` (
        \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '关联ID',
        \`user_id\` BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
        \`role_id\` BIGINT UNSIGNED NOT NULL COMMENT '角色ID',
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uk_user_role\` (\`user_id\`, \`role_id\`),
        INDEX \`idx_user_id\` (\`user_id\`),
        INDEX \`idx_role_id\` (\`role_id\`),
        CONSTRAINT \`fk_ur_user_id\` FOREIGN KEY (\`user_id\`) REFERENCES \`user_auth\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT \`fk_ur_role_id\` FOREIGN KEY (\`role_id\`) REFERENCES \`roles\` (\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户角色关联表';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 按照外键依赖关系逆序删除表
    await queryRunner.query('DROP TABLE IF EXISTS `user_roles`');
    await queryRunner.query('DROP TABLE IF EXISTS `role_permissions`');
    await queryRunner.query('DROP TABLE IF EXISTS `user_profile`');
    await queryRunner.query('DROP TABLE IF EXISTS `roles`');
    await queryRunner.query('DROP TABLE IF EXISTS `permissions`');
    await queryRunner.query('DROP TABLE IF EXISTS `user_auth`');
  }
}
