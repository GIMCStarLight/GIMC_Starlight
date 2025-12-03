import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatePermissionsTable1758090637002 implements MigrationInterface {
  name = 'UpdatePermissionsTable1758090637002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. 修改权限类型枚举，将 MODULE 改为 MENU
    await queryRunner.query(`
      ALTER TABLE \`permissions\` 
      MODIFY COLUMN \`type\` ENUM('API', 'BUTTON', 'MENU') NOT NULL DEFAULT 'API' COMMENT '权限类型';
    `);

    // 2. 添加新的字段
    await queryRunner.query(`
      ALTER TABLE \`permissions\` 
      ADD COLUMN \`parent_id\` BIGINT UNSIGNED NULL DEFAULT NULL COMMENT '上级权限ID (0 表示顶级权限)' AFTER \`description\`,
      ADD COLUMN \`resource\` VARCHAR(100) NULL DEFAULT NULL COMMENT '资源标识 (如: user, role, permission)' AFTER \`parent_id\`,
      ADD COLUMN \`action\` VARCHAR(100) NULL DEFAULT NULL COMMENT '操作标识 (如: create, read, update, delete)' AFTER \`resource\`,
      ADD COLUMN \`sort\` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '排序权重' AFTER \`action\`,
      ADD COLUMN \`status\` TINYINT UNSIGNED NOT NULL DEFAULT 1 COMMENT '状态: 0=禁用, 1=启用' AFTER \`sort\`;
    `);

    // 3. 添加索引
    await queryRunner.query(`
      ALTER TABLE \`permissions\` 
      ADD INDEX \`idx_parent_id\` (\`parent_id\`),
      ADD INDEX \`idx_resource\` (\`resource\`),
      ADD INDEX \`idx_action\` (\`action\`),
      ADD INDEX \`idx_sort\` (\`sort\`),
      ADD INDEX \`idx_status\` (\`status\`);
    `);

    // 4. 添加外键约束（自关联）
    await queryRunner.query(`
      ALTER TABLE \`permissions\` 
      ADD CONSTRAINT \`fk_permission_parent_id\` 
      FOREIGN KEY (\`parent_id\`) REFERENCES \`permissions\` (\`id\`) 
      ON DELETE SET NULL ON UPDATE CASCADE;
    `);

    // 5. 更新现有数据，从 code 字段解析 resource 和 action
    await queryRunner.query(`
      UPDATE \`permissions\` 
      SET \`resource\` = SUBSTRING_INDEX(\`code\`, ':', 1),
          \`action\` = SUBSTRING_INDEX(\`code\`, ':', -1)
      WHERE \`code\` LIKE '%:%';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除外键约束
    await queryRunner.query(`
      ALTER TABLE \`permissions\` 
      DROP FOREIGN KEY \`fk_permission_parent_id\`;
    `);

    // 删除索引
    await queryRunner.query(`
      ALTER TABLE \`permissions\` 
      DROP INDEX \`idx_parent_id\`,
      DROP INDEX \`idx_resource\`,
      DROP INDEX \`idx_action\`,
      DROP INDEX \`idx_sort\`,
      DROP INDEX \`idx_status\`;
    `);

    // 删除新增的字段
    await queryRunner.query(`
      ALTER TABLE \`permissions\` 
      DROP COLUMN \`parent_id\`,
      DROP COLUMN \`resource\`,
      DROP COLUMN \`action\`,
      DROP COLUMN \`sort\`,
      DROP COLUMN \`status\`;
    `);

    // 恢复原来的权限类型枚举
    await queryRunner.query(`
      ALTER TABLE \`permissions\` 
      MODIFY COLUMN \`type\` ENUM('API', 'BUTTON', 'MODULE') NOT NULL DEFAULT 'API' COMMENT '权限类型';
    `);
  }
}
