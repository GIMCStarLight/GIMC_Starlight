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
import { UserAuth } from './user-auth.entity';
import { Role } from './role.entity';

/**
 * 用户角色关联实体
 * 多对多关系的中间表
 */
@Entity('user_roles')
@Unique('uk_user_role', ['userId', 'roleId'])
export class UserRole {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true, comment: '关联ID' })
  id: string;

  @Column({
    type: 'bigint',
    unsigned: true,
    name: 'user_id',
    comment: '用户ID',
  })
  @Index('idx_user_id')
  userId: string;

  @Column({
    type: 'bigint',
    unsigned: true,
    name: 'role_id',
    comment: '角色ID',
  })
  @Index('idx_role_id')
  roleId: string;

  @CreateDateColumn({
    type: 'timestamp',
    name: 'created_at',
    comment: '创建时间',
  })
  createdAt: Date;

  // 关联关系
  @ManyToOne(() => UserAuth, (user) => user.userRoles, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserAuth;

  @ManyToOne(() => Role, (role) => role.userRoles, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'role_id' })
  role: Role;
}
