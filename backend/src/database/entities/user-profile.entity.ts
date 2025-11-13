import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  PrimaryColumn,
} from 'typeorm';
import { UserAuth } from './user-auth.entity';

/**
 * 用户资料实体
 * 存储用户的详细信息和个性化设置
 */
@Entity('user_profile')
export class UserProfile {
  @PrimaryColumn({
    type: 'bigint',
    unsigned: true,
    name: 'user_id',
    comment: '用户ID',
  })
  userId: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: '',
    comment: '真实姓名/昵称',
  })
  name: string;

  @Column({
    type: 'varchar',
    length: 512,
    nullable: true,
    name: 'avatar_url',
    comment: '头像URL',
  })
  avatarUrl: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '邮箱',
  })
  email: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '部门',
  })
  department: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '职位',
  })
  position: string;

  @Column({
    type: 'json',
    nullable: true,
    comment: '用户个性化设置',
  })
  settings: Record<string, any>;

  @Column({
    type: 'json',
    nullable: true,
    comment: '预留的元数据字段',
  })
  metadata: Record<string, any>;

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
  @OneToOne(() => UserAuth, (userAuth) => userAuth.profile, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: UserAuth;
}
