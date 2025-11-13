import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Role } from './role.entity';
import { Permission } from './permission.entity';

/**
 * 角色权限关联实体
 * 多对多关系的中间表
 */
@Entity('role_permissions')
@Unique('uk_role_permission', ['roleId', 'permissionId'])
export class RolePermission {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true, comment: '关联ID' })
  id: string;

  @Column({
    type: 'bigint',
    unsigned: true,
    name: 'role_id',
    comment: '角色ID',
  })
  @Index('idx_role_id')
  roleId: string;

  @Column({
    type: 'bigint',
    unsigned: true,
    name: 'permission_id',
    comment: '权限ID',
  })
  @Index('idx_permission_id')
  permissionId: string;

  @CreateDateColumn({
    type: 'timestamp',
    name: 'created_at',
    comment: '创建时间',
  })
  createdAt: Date;

  // 关联关系
  @ManyToOne(() => Role, (role) => role.rolePermissions, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @ManyToOne(() => Permission, (permission) => permission.rolePermissions, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'permission_id' })
  permission: Permission;
}
