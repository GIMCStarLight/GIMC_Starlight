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
import { UserRole } from './user-role.entity';

/**
 * 角色实体
 * 支持层级结构的角色管理
 */
@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn({ type: 'bigint', comment: '角色ID' })
  id: string;

  @Column({
    type: 'bigint',
    nullable: true,
    name: 'parent_id',
    comment: '上级角色ID (null 表示顶级角色)',
  })
  @Index('idx_roles_parent_id')
  parentId: string;

  @Column({
    type: 'varchar',
    length: 100,
    comment: '角色名称 (如: "项目组", "媒介购买执行")',
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 50,
    unique: true,
    comment: '角色代码 (如: PROJECT_GROUP, MEDIA_BUYER)',
  })
  @Index('idx_code')
  code: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    comment: '角色描述',
  })
  description: string;

  @Column({
    type: 'smallint',
    unsigned: true,
    default: 1,
    comment: '状态: 0=禁用, 1=启用',
  })
  status: number;

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
  @OneToMany(() => RolePermission, (rolePermission) => rolePermission.role, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  rolePermissions: RolePermission[];

  @OneToMany(() => UserRole, (userRole) => userRole.role, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  userRoles: UserRole[];

  // 自关联：父角色
  @ManyToOne(() => Role, (role) => role.children, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'parent_id' })
  parent: Role;

  // 自关联：子角色
  @OneToMany(() => Role, (role) => role.parent)
  children: Role[];
}
