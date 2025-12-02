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
    name: 'user_id',
    comment: '用户ID',
  })
  userId: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '昵称',
  })
  nickname: string;

  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: '头像URL',
  })
  avatar: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    comment: '邮箱',
  })
  email: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    name: 'real_name',
    comment: '真实姓名',
  })
  realName: string;

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
