import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { RolePermission } from './role-permission.entity';

/**
 * 权限类型枚举
 */
export enum PermissionType {
  API = 'API',
  BUTTON = 'BUTTON',
  MENU = 'MENU',
  FIELD = 'FIELD',  // 字段级权限
}

/**
 * 权限实体
 * 定义系统中的原子化权限点
 */
@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true, comment: '权限ID' })
  id: string;

  @Column({
    type: 'varchar',
    length: 100,
    unique: true,
    comment: '权限代码 (如: user:create, tag:delete, button:export_sensitive)',
  })
  @Index('idx_code')
  code: string;

  @Column({
    type: 'varchar',
    length: 50,
    comment: '权限名称',
  })
  name: string;

  @Column({
    type: 'enum',
    enum: PermissionType,
    default: PermissionType.API,
    comment: '权限类型',
  })
  @Index('idx_type')
  type: PermissionType;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '权限描述',
  })
  description: string;

  @Column({
    type: 'bigint',
    nullable: true,
    name: 'parent_id',
    comment: '上级权限ID (0 表示顶级权限)',
    transformer: {
      to: (value: string | null) => (value ? parseInt(value) : null),
      from: (value: number | null) => (value ? value.toString() : null),
    },
  })
  parentId: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '资源标识 (如: user, role, permission)',
  })
  resource: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '操作标识 (如: create, read, update, delete)',
  })
  action: string;

  @Column({
    type: 'int',
    unsigned: true,
    default: 0,
    comment: '排序权重',
  })
  sort: number;

  @Column({
    type: 'smallint',
    unsigned: true,
    default: 1,
    comment: '状态: 0=禁用, 1=启用',
  })
  status: number;

  @Column({
    type: 'jsonb',
    name: 'frontend_meta',
    nullable: true,
    comment: '前端映射元数据: {routePath, componentPath, elementLocator, pageLocation, businessModule}',
  })
  frontendMeta: {
    routePath?: string; // 前端路由路径 (如: /system/user)
    componentPath?: string; // 组件路径 (如: src/views/system/user/index.vue)
    elementLocator?: string; // UI元素定位 (如: #export-btn, .user-create-button)
    pageLocation?: string; // 页面位置描述 (如: 用户管理页面 > 顶部操作栏 > 导出按钮)
    businessModule?: string; // 业务模块 (如: 用户管理, KOL数据管理)
  };

  @CreateDateColumn({
    type: 'timestamp',
    name: 'created_at',
    comment: '创建时间',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    name: 'updated_at',
    comment: '更新时间',
  })
  updatedAt: Date;

  // 关联关系
  @OneToMany(
    () => RolePermission,
    (rolePermission) => rolePermission.permission,
    {
      cascade: true,
      onDelete: 'CASCADE',
    },
  )
  rolePermissions: RolePermission[];

  // 自关联：子权限
  @OneToMany(() => Permission, (permission) => permission.parent, {
    cascade: false,
  })
  children: Permission[];

  // 自关联：父权限
  @ManyToOne(() => Permission, (permission) => permission.children, {
    cascade: false,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_id' })
  parent: Permission;
}
