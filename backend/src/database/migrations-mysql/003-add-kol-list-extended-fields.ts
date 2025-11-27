import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddKolListExtendedFields1761741400003
  implements MigrationInterface
{
  name = 'AddKolListExtendedFields1761741400003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 检查表是否存在，如果不存在则创建完整的 kol_list 表
    const tableExists = await queryRunner.hasTable('kol_list');

    if (!tableExists) {
      // 创建完整的 kol_list 表
      await queryRunner.query(`
        CREATE TABLE \`kol_list\` (
          \`id\` BIGINT NOT NULL AUTO_INCREMENT COMMENT '自增主键',
          \`platform\` VARCHAR(30) NOT NULL COMMENT '账号平台，如抖音/小红书/B站',
          \`account_name\` VARCHAR(100) NOT NULL COMMENT '账号名称',
          \`account_id\` VARCHAR(80) NOT NULL COMMENT '账号ID（各平台唯一标识）',
          \`home_link\` VARCHAR(500) NOT NULL COMMENT '主页链接',
          \`followers_w\` DECIMAL(8,2) NOT NULL COMMENT '粉丝量（万）',
          \`org_name\` VARCHAR(100) NULL COMMENT '所属机构名',
          \`category\` VARCHAR(30) NULL COMMENT '账号类型，如美妆/母婴/汽车等',
          \`star_quote_21_60s\` INT UNSIGNED NULL COMMENT '星图报价21-60s（人民币）',
          \`star_quote_60s_plus\` INT UNSIGNED NULL COMMENT '星图报价60s+（人民币）',
          \`is_exclusive\` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '达人属性 1独家 0非独家',
          \`rebate_policy\` TINYINT NOT NULL DEFAULT 0 COMMENT '返点政策 0无 1有',
          \`rebate_range\` VARCHAR(50) NULL COMMENT '返点区间，如10%-15%',
          \`policy_level\` VARCHAR(10) NULL COMMENT '政策等级 A/B/C',
          \`rebate_period\` VARCHAR(30) NULL COMMENT '返点账期，如月结/季度结',
          \`pay_period\` VARCHAR(30) NULL COMMENT '支付账期，如T+1/T+7',
          \`remark\` VARCHAR(500) NULL COMMENT '备注',
          \`cooperation_intro\` TEXT NULL COMMENT '合作简介',
          \`all_platforms\` JSON NULL COMMENT '全网平台信息',
          \`contact_info\` JSON NULL COMMENT '联系方式',
          \`cooperation_degree\` ENUM('high', 'medium', 'low') NOT NULL DEFAULT 'medium' COMMENT '配合度',
          \`source\` ENUM('manual', 'import', 'api') NOT NULL DEFAULT 'manual' COMMENT '数据来源',
          \`resource_attribute\` ENUM('sgxm', 'exclusive', 'other') NOT NULL DEFAULT 'other' COMMENT '资源属性',
          \`annual_contract_org\` VARCHAR(100) NULL COMMENT '年框机构',
          \`matched_author_id\` VARCHAR(64) NULL COMMENT '匹配的公海达人ID',
          \`match_confidence\` DECIMAL(4,3) NULL COMMENT '匹配置信度(0-1)',
          \`match_status\` ENUM('unmatched', 'pending', 'matched', 'rejected') NOT NULL DEFAULT 'unmatched' COMMENT '匹配状态',
          \`matched_snapshot\` JSON NULL COMMENT '公海数据快照',
          \`matched_at\` TIMESTAMP NULL COMMENT '匹配时间',
          \`created_by\` BIGINT NULL COMMENT '创建人ID',
          \`updated_by\` BIGINT NULL COMMENT '更新人ID',
          \`deleted_at\` TIMESTAMP NULL COMMENT '软删除时间',
          \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
          \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
          PRIMARY KEY (\`id\`),
          UNIQUE INDEX \`IDX_platform_account_id\` (\`platform\`, \`account_id\`),
          INDEX \`IDX_followers_w\` (\`followers_w\`),
          INDEX \`IDX_category\` (\`category\`),
          INDEX \`IDX_org_name\` (\`org_name\`),
          INDEX \`IDX_is_exclusive\` (\`is_exclusive\`),
          INDEX \`IDX_resource_attribute\` (\`resource_attribute\`),
          INDEX \`IDX_cooperation_degree\` (\`cooperation_degree\`),
          INDEX \`IDX_matched_author_id\` (\`matched_author_id\`),
          INDEX \`IDX_match_status\` (\`match_status\`),
          INDEX \`IDX_platform_account_name\` (\`platform\`, \`account_name\`),
          INDEX \`IDX_deleted_at\` (\`deleted_at\`),
          INDEX \`IDX_platform_match_status_deleted_at\` (\`platform\`, \`match_status\`, \`deleted_at\`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='KOL列表';
      `);
    } else {
      // 表已存在，检查并添加缺失的字段
      const columns = await queryRunner.getTable('kol_list');

      // 检查并添加 cooperation_intro 字段
      if (!columns?.findColumnByName('cooperation_intro')) {
        await queryRunner.query(`
          ALTER TABLE \`kol_list\` 
          ADD COLUMN \`cooperation_intro\` TEXT NULL COMMENT '合作简介'
        `);
      }

      // 检查并添加 all_platforms 字段
      if (!columns?.findColumnByName('all_platforms')) {
        await queryRunner.query(`
          ALTER TABLE \`kol_list\` 
          ADD COLUMN \`all_platforms\` JSON NULL COMMENT '全网平台信息'
        `);
      }

      // 检查并添加 contact_info 字段
      if (!columns?.findColumnByName('contact_info')) {
        await queryRunner.query(`
          ALTER TABLE \`kol_list\` 
          ADD COLUMN \`contact_info\` JSON NULL COMMENT '联系方式'
        `);
      }

      // 检查并添加 cooperation_degree 字段
      if (!columns?.findColumnByName('cooperation_degree')) {
        await queryRunner.query(`
          ALTER TABLE \`kol_list\` 
          ADD COLUMN \`cooperation_degree\` ENUM('high', 'medium', 'low') NOT NULL DEFAULT 'medium' COMMENT '配合度'
        `);
      }

      // 检查并添加 source 字段
      if (!columns?.findColumnByName('source')) {
        await queryRunner.query(`
          ALTER TABLE \`kol_list\` 
          ADD COLUMN \`source\` ENUM('manual', 'import', 'api') NOT NULL DEFAULT 'manual' COMMENT '数据来源'
        `);
      }

      // 检查并添加 resource_attribute 字段
      if (!columns?.findColumnByName('resource_attribute')) {
        await queryRunner.query(`
          ALTER TABLE \`kol_list\` 
          ADD COLUMN \`resource_attribute\` ENUM('sgxm', 'exclusive', 'other') NOT NULL DEFAULT 'other' COMMENT '资源属性'
        `);
      }

      // 检查并添加 annual_contract_org 字段
      if (!columns?.findColumnByName('annual_contract_org')) {
        await queryRunner.query(`
          ALTER TABLE \`kol_list\` 
          ADD COLUMN \`annual_contract_org\` VARCHAR(100) NULL COMMENT '年框机构'
        `);
      }

      // 检查并添加匹配相关字段
      if (!columns?.findColumnByName('matched_author_id')) {
        await queryRunner.query(`
          ALTER TABLE \`kol_list\` 
          ADD COLUMN \`matched_author_id\` VARCHAR(64) NULL COMMENT '匹配的公海达人ID'
        `);
      }

      if (!columns?.findColumnByName('match_confidence')) {
        await queryRunner.query(`
          ALTER TABLE \`kol_list\` 
          ADD COLUMN \`match_confidence\` DECIMAL(4,3) NULL COMMENT '匹配置信度(0-1)'
        `);
      }

      if (!columns?.findColumnByName('match_status')) {
        await queryRunner.query(`
          ALTER TABLE \`kol_list\` 
          ADD COLUMN \`match_status\` ENUM('unmatched', 'pending', 'matched', 'rejected') NOT NULL DEFAULT 'unmatched' COMMENT '匹配状态'
        `);
      }

      if (!columns?.findColumnByName('matched_snapshot')) {
        await queryRunner.query(`
          ALTER TABLE \`kol_list\` 
          ADD COLUMN \`matched_snapshot\` JSON NULL COMMENT '公海数据快照'
        `);
      }

      if (!columns?.findColumnByName('matched_at')) {
        await queryRunner.query(`
          ALTER TABLE \`kol_list\` 
          ADD COLUMN \`matched_at\` TIMESTAMP NULL COMMENT '匹配时间'
        `);
      }

      // 检查并添加审计字段
      if (!columns?.findColumnByName('created_by')) {
        await queryRunner.query(`
          ALTER TABLE \`kol_list\` 
          ADD COLUMN \`created_by\` BIGINT NULL COMMENT '创建人ID'
        `);
      }

      if (!columns?.findColumnByName('updated_by')) {
        await queryRunner.query(`
          ALTER TABLE \`kol_list\` 
          ADD COLUMN \`updated_by\` BIGINT NULL COMMENT '更新人ID'
        `);
      }

      if (!columns?.findColumnByName('deleted_at')) {
        await queryRunner.query(`
          ALTER TABLE \`kol_list\` 
          ADD COLUMN \`deleted_at\` TIMESTAMP NULL COMMENT '软删除时间'
        `);
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 回滚操作：删除添加的字段
    const tableExists = await queryRunner.hasTable('kol_list');

    if (tableExists) {
      const columns = await queryRunner.getTable('kol_list');

      // 删除扩展字段
      const fieldsToRemove = [
        'cooperation_intro',
        'all_platforms',
        'contact_info',
        'cooperation_degree',
        'source',
        'resource_attribute',
        'annual_contract_org',
        'matched_author_id',
        'match_confidence',
        'match_status',
        'matched_snapshot',
        'matched_at',
        'created_by',
        'updated_by',
        'deleted_at',
      ];

      for (const fieldName of fieldsToRemove) {
        if (columns?.findColumnByName(fieldName)) {
          await queryRunner.query(`
            ALTER TABLE \`kol_list\` DROP COLUMN \`${fieldName}\`
          `);
        }
      }
    }
  }
}
