import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { UserProfile } from './user-profile.entity';
import { UserRole } from './user-role.entity';

/**
 * 用户认证实体
 * 负责用户的基础认证信息
 */
@Entity('user_auth')
export class UserAuth {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true, comment: '用户ID' })
  id: string;

  @Column({
    type: 'varchar',
    length: 20,
    unique: true,
    comment: '手机号',
  })
  @Index('idx_phone')
  phone: string;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'password_hash',
    comment: '密码哈希值',
  })
  passwordHash: string;

  @Column({
    type: 'smallint',
    default: 1,
    comment: '状态: 1-启用, 0-禁用',
  })
  status: number;

  @Column({
    type: 'timestamp',
    nullable: true,
    name: 'last_login_at',
    comment: '最后登录时间',
  })
  lastLoginAt: Date;

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
  @OneToOne(() => UserProfile, (profile) => profile.user, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  profile: UserProfile;

  @OneToMany(() => UserRole, (userRole) => userRole.user, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  userRoles: UserRole[];
}
