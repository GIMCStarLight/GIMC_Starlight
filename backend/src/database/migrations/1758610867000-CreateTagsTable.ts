import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from 'typeorm';

export class CreateTagsTable1758610867000 implements MigrationInterface {
  name = 'CreateTagsTable1758610867000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建标签表
    await queryRunner.createTable(
      new Table({
        name: 'tags',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
            comment: '标签ID',
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false,
            comment: '标签名称',
          },
          {
            name: 'code',
            type: 'varchar',
            length: '50',
            isNullable: true,
            comment: '标签代码',
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
            comment: '标签描述',
          },
          {
            name: 'platform',
            type: 'varchar',
            length: '20',
            isNullable: false,
            comment: '所属平台',
          },
          {
            name: 'level',
            type: 'int',
            default: 1,
            isNullable: false,
            comment: '层级深度',
          },
          {
            name: 'parentId',
            type: 'int',
            isNullable: true,
            comment: '父级标签ID',
          },
          {
            name: 'sort',
            type: 'int',
            default: 0,
            isNullable: false,
            comment: '排序权重',
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
            isNullable: false,
            comment: '是否启用',
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
            comment: '扩展属性',
          },
          {
            name: 'createdAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
            comment: '创建时间',
          },
          {
            name: 'updatedAt',
            type: 'datetime',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
            isNullable: false,
            comment: '更新时间',
          },
        ],
      }),
      true,
    );

    // 创建索引
    await queryRunner.createIndex(
      'tags',
      new TableIndex({
        name: 'IDX_TAGS_PLATFORM_LEVEL',
        columnNames: ['platform', 'level'],
      }),
    );

    await queryRunner.createIndex(
      'tags',
      new TableIndex({
        name: 'IDX_TAGS_PARENT_ID',
        columnNames: ['parentId'],
      }),
    );

    await queryRunner.createIndex(
      'tags',
      new TableIndex({
        name: 'IDX_TAGS_PLATFORM',
        columnNames: ['platform'],
      }),
    );

    await queryRunner.createIndex(
      'tags',
      new TableIndex({
        name: 'IDX_TAGS_NAME',
        columnNames: ['name'],
      }),
    );

    await queryRunner.createIndex(
      'tags',
      new TableIndex({
        name: 'IDX_TAGS_SORT',
        columnNames: ['sort'],
      }),
    );

    await queryRunner.createIndex(
      'tags',
      new TableIndex({
        name: 'IDX_TAGS_IS_ACTIVE',
        columnNames: ['isActive'],
      }),
    );

    // 创建自引用外键约束
    await queryRunner.createForeignKey(
      'tags',
      new TableForeignKey({
        columnNames: ['parentId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tags',
        onDelete: 'CASCADE',
        name: 'FK_TAGS_PARENT_ID',
      }),
    );

    // 创建唯一约束：同一平台下同一父级的标签名称不能重复
    await queryRunner.createIndex(
      'tags',
      new TableIndex({
        name: 'UQ_TAGS_NAME_PLATFORM_PARENT',
        columnNames: ['name', 'platform', 'parentId'],
        isUnique: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 删除外键约束
    await queryRunner.dropForeignKey('tags', 'FK_TAGS_PARENT_ID');

    // 删除索引
    await queryRunner.dropIndex('tags', 'UQ_TAGS_NAME_PLATFORM_PARENT');
    await queryRunner.dropIndex('tags', 'IDX_TAGS_IS_ACTIVE');
    await queryRunner.dropIndex('tags', 'IDX_TAGS_SORT');
    await queryRunner.dropIndex('tags', 'IDX_TAGS_NAME');
    await queryRunner.dropIndex('tags', 'IDX_TAGS_PLATFORM');
    await queryRunner.dropIndex('tags', 'IDX_TAGS_PARENT_ID');
    await queryRunner.dropIndex('tags', 'IDX_TAGS_PLATFORM_LEVEL');

    // 删除表
    await queryRunner.dropTable('tags');
  }
}
