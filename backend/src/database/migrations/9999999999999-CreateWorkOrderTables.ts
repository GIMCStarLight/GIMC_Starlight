import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateWorkOrderTables1700000000000
  implements MigrationInterface
{
  name = 'CreateWorkOrderTables1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建工单状态枚举
    await queryRunner.query(`
      CREATE TYPE work_order_status AS ENUM (
        'pending',
        'received',
        'in_progress',
        'testing',
        'completed',
        'rejected',
        'cancelled'
      )
    `);

    // 创建工单类型枚举
    await queryRunner.query(`
      CREATE TYPE work_order_type AS ENUM (
        'new_feature',
        'system_refactor',
        'bug_fix',
        'optimization',
        'requirement_change',
        'other'
      )
    `);

    // 创建工单优先级枚举
    await queryRunner.query(`
      CREATE TYPE work_order_priority AS ENUM (
        'low',
        'medium',
        'high',
        'urgent'
      )
    `);

    // 创建工单日志操作类型枚举
    await queryRunner.query(`
      CREATE TYPE work_order_log_action AS ENUM (
        'create',
        'receive',
        'assign',
        'start',
        'update',
        'comment',
        'status_change',
        'complete',
        'reject',
        'cancel'
      )
    `);

    // 创建工单表
    await queryRunner.createTable(
      new Table({
        name: 'work_orders',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
            comment: '工单ID',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '100',
            isNullable: false,
            comment: '工单标题',
          },
          {
            name: 'type',
            type: 'work_order_type',
            isNullable: false,
            comment: '事务类型',
          },
          {
            name: 'priority',
            type: 'work_order_priority',
            default: "'medium'",
            isNullable: false,
            comment: '优先级',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: false,
            comment: '需求描述',
          },
          {
            name: 'modules',
            type: 'json',
            isNullable: true,
            comment: '涉及的功能模块',
          },
          {
            name: 'attachments',
            type: 'json',
            isNullable: true,
            comment: '附件信息',
          },
          {
            name: 'status',
            type: 'work_order_status',
            default: "'pending'",
            isNullable: false,
            comment: '工单状态',
          },
          {
            name: 'created_by',
            type: 'bigint',
            isNullable: false,
            comment: '创建人ID',
          },
          {
            name: 'assigned_to',
            type: 'bigint',
            isNullable: true,
            comment: '处理人ID',
          },
          {
            name: 'received_at',
            type: 'timestamp',
            isNullable: true,
            comment: '接收时间',
          },
          {
            name: 'started_at',
            type: 'timestamp',
            isNullable: true,
            comment: '开始处理时间',
          },
          {
            name: 'completed_at',
            type: 'timestamp',
            isNullable: true,
            comment: '完成时间',
          },
          {
            name: 'expected_completion_at',
            type: 'timestamp',
            isNullable: true,
            comment: '期望完成时间',
          },
          {
            name: 'result',
            type: 'text',
            isNullable: true,
            comment: '处理结果/备注',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
            comment: '创建时间',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
            comment: '更新时间',
          },
        ],
      }),
      true,
    );

    // 创建工单索引
    await queryRunner.createIndex(
      'work_orders',
      new TableIndex({
        name: 'idx_work_orders_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'work_orders',
      new TableIndex({
        name: 'idx_work_orders_created_by',
        columnNames: ['created_by'],
      }),
    );

    await queryRunner.createIndex(
      'work_orders',
      new TableIndex({
        name: 'idx_work_orders_assigned_to',
        columnNames: ['assigned_to'],
      }),
    );

    await queryRunner.createIndex(
      'work_orders',
      new TableIndex({
        name: 'idx_work_orders_created_at',
        columnNames: ['created_at'],
      }),
    );

    // 创建外键约束
    await queryRunner.createForeignKey(
      'work_orders',
      new TableForeignKey({
        name: 'fk_work_orders_created_by',
        columnNames: ['created_by'],
        referencedTableName: 'user_auth',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'work_orders',
      new TableForeignKey({
        name: 'fk_work_orders_assigned_to',
        columnNames: ['assigned_to'],
        referencedTableName: 'user_auth',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      }),
    );

    // 创建工单日志表
    await queryRunner.createTable(
      new Table({
        name: 'work_order_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
            comment: '日志ID',
          },
          {
            name: 'work_order_id',
            type: 'uuid',
            isNullable: false,
            comment: '工单ID',
          },
          {
            name: 'action',
            type: 'work_order_log_action',
            isNullable: false,
            comment: '操作类型',
          },
          {
            name: 'content',
            type: 'text',
            isNullable: true,
            comment: '操作说明/备注',
          },
          {
            name: 'old_status',
            type: 'work_order_status',
            isNullable: true,
            comment: '原状态',
          },
          {
            name: 'new_status',
            type: 'work_order_status',
            isNullable: true,
            comment: '新状态',
          },
          {
            name: 'old_assignee',
            type: 'bigint',
            isNullable: true,
            comment: '原处理人ID',
          },
          {
            name: 'new_assignee',
            type: 'bigint',
            isNullable: true,
            comment: '新处理人ID',
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
            comment: '额外数据',
          },
          {
            name: 'created_by',
            type: 'bigint',
            isNullable: false,
            comment: '操作人ID',
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
            comment: '操作时间',
          },
        ],
      }),
      true,
    );

    // 创建工单日志索引
    await queryRunner.createIndex(
      'work_order_logs',
      new TableIndex({
        name: 'idx_work_order_logs_work_order_id',
        columnNames: ['work_order_id'],
      }),
    );

    await queryRunner.createIndex(
      'work_order_logs',
      new TableIndex({
        name: 'idx_work_order_logs_created_at',
        columnNames: ['created_at'],
      }),
    );

    // 创建外键约束
    await queryRunner.createForeignKey(
      'work_order_logs',
      new TableForeignKey({
        name: 'fk_work_order_logs_work_order_id',
        columnNames: ['work_order_id'],
        referencedTableName: 'work_orders',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'work_order_logs',
      new TableForeignKey({
        name: 'fk_work_order_logs_created_by',
        columnNames: ['created_by'],
        referencedTableName: 'user_auth',
        referencedColumnNames: ['id'],
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      }),
    );

    // 添加表注释
    await queryRunner.query(
      `COMMENT ON TABLE work_orders IS '工单管理表'`,
    );
    await queryRunner.query(
      `COMMENT ON TABLE work_order_logs IS '工单处理日志表'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除外键
    await queryRunner.dropForeignKey(
      'work_order_logs',
      'fk_work_order_logs_created_by',
    );
    await queryRunner.dropForeignKey(
      'work_order_logs',
      'fk_work_order_logs_work_order_id',
    );
    await queryRunner.dropForeignKey(
      'work_orders',
      'fk_work_orders_assigned_to',
    );
    await queryRunner.dropForeignKey(
      'work_orders',
      'fk_work_orders_created_by',
    );

    // 删除索引
    await queryRunner.dropIndex(
      'work_order_logs',
      'idx_work_order_logs_created_at',
    );
    await queryRunner.dropIndex(
      'work_order_logs',
      'idx_work_order_logs_work_order_id',
    );
    await queryRunner.dropIndex('work_orders', 'idx_work_orders_created_at');
    await queryRunner.dropIndex('work_orders', 'idx_work_orders_assigned_to');
    await queryRunner.dropIndex('work_orders', 'idx_work_orders_created_by');
    await queryRunner.dropIndex('work_orders', 'idx_work_orders_status');

    // 删除表
    await queryRunner.dropTable('work_order_logs');
    await queryRunner.dropTable('work_orders');

    // 删除枚举类型
    await queryRunner.query('DROP TYPE work_order_log_action');
    await queryRunner.query('DROP TYPE work_order_priority');
    await queryRunner.query('DROP TYPE work_order_type');
    await queryRunner.query('DROP TYPE work_order_status');
  }
}
